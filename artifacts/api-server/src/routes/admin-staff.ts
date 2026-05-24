/**
 * Task #175 — Admin Staff & Role Management routes.
 *
 * Layers on top of the existing /api/admin/rbac/* surface to add:
 *   - Bulk permission-matrix upsert (idempotent)
 *   - Staff invite flow (table + email + public accept endpoint)
 *   - RBAC audit log read endpoint
 *   - Suspend / unsuspend / force-logout for staff users
 *   - Atomic replacement of a user's role assignments
 *
 * Permission gate: `manage_employees` (same as the existing RBAC surface).
 * Public route: `POST /api/staff/accept-invite` (no auth required).
 *
 * Cache + session invalidation:
 *   - Role permission / assignment changes bump `permissionsCachedAt = 0`
 *     for every affected user via the `user_sessions` table (connect-pg-simple).
 *   - Suspend / force-logout deletes those rows outright.
 */

import type { Express, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db';
import { storage } from '../storage';
import { queueEmail } from '../email';

const INVITE_TTL_HOURS = 24 * 7; // 7 days
const SUPER_ADMIN_ROLE_NAME = 'Super Admin';

// ---------- helpers ----------------------------------------------------

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function buildAcceptUrl(token: string): string {
  const base =
    process.env.APP_URL?.replace(/\/$/, '') ||
    (process.env.REPLIT_DOMAINS?.split(',')[0]
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : '');
  return `${base}/staff/accept-invite?token=${encodeURIComponent(token)}`;
}

async function isSuperAdminRole(roleId: string): Promise<boolean> {
  const role = await storage.getAdminRole(roleId);
  return !!role && role.name === SUPER_ADMIN_ROLE_NAME && role.is_system === true;
}

/**
 * Bump `permissionsCachedAt = 0` for every session belonging to a set of users
 * so the next request reloads RBAC permissions. Falls back silently if the
 * session table is missing (e.g. tests).
 */
async function invalidatePermissionsForUsers(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(
      `UPDATE user_sessions
       SET sess = jsonb_set(sess::jsonb, '{permissionsCachedAt}', '0'::jsonb, true)
       WHERE (sess::jsonb ->> 'userId') IN (${placeholders})`,
      userIds,
    );
  } catch (err: any) {
    console.warn('[Staff] invalidatePermissionsForUsers failed:', err?.message || err);
  }
}

async function invalidatePermissionsForRole(roleId: string): Promise<void> {
  const { rows } = await pool.query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM user_role_assignments WHERE role_id = $1 AND is_active = true
     UNION
     SELECT DISTINCT user_id FROM employees WHERE rbac_role_id = $1 AND user_id IS NOT NULL`,
    [roleId],
  );
  await invalidatePermissionsForUsers(rows.map((r) => r.user_id));
}

async function destroySessionsForUser(userId: string): Promise<void> {
  try {
    await pool.query(`DELETE FROM user_sessions WHERE (sess::jsonb ->> 'userId') = $1`, [userId]);
  } catch (err: any) {
    console.warn('[Staff] destroySessionsForUser failed:', err?.message || err);
  }
}

async function writeRbacAudit(
  actor: string,
  actionType: string,
  entityType: string,
  entityId: string | null,
  details: string,
  oldValue?: unknown,
  newValue?: unknown,
): Promise<void> {
  await storage.createAuditLog({
    entityType: `rbac.${entityType}`,
    entityId: entityId || undefined,
    actionType,
    actor,
    actorRole: 'admin',
    details,
    oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : undefined,
    newValue: newValue !== undefined ? JSON.stringify(newValue) : undefined,
  } as any);
}

// ---------- registration ----------------------------------------------

export function registerAdminStaffRoutes(
  app: Express,
  ensureAdminAsync: any,
  requirePermission: any,
): void {
  // ----- Staff directory (admin users with their RBAC roles) -----
  app.get(
    '/api/admin/rbac/staff',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (_req: Request, res: Response) => {
      try {
        const { rows } = await pool.query(`
          SELECT
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.profile_photo,
            u.is_suspended,
            u.is_email_verified,
            u.last_login_at AS last_login,
            u.created_at,
            COALESCE(
              json_agg(
                json_build_object(
                  'roleId', ar.id,
                  'roleName', ar.name,
                  'riskLevel', ar.risk_level,
                  'department', ar.department,
                  'assignedAt', ura.assigned_at,
                  'expiresAt', ura.expires_at,
                  'approvalLevel', COALESCE(ura.approval_level, 'none')
                )
              ) FILTER (WHERE ar.id IS NOT NULL),
              '[]'
            ) AS roles
          FROM users u
          LEFT JOIN user_role_assignments ura
            ON ura.user_id = u.id AND ura.is_active = true
          LEFT JOIN admin_roles ar ON ar.id = ura.role_id
          WHERE u.role = 'admin'
          GROUP BY u.id
          ORDER BY u.created_at DESC
        `);
        return res.json({ staff: rows });
      } catch (err: any) {
        console.error('[Staff] list error', err);
        return res.status(500).json({ error: 'Failed to list staff' });
      }
    },
  );

  // ----- Replace user's role assignments atomically -----
  app.post(
    '/api/admin/rbac/staff/:userId/roles',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (req: Request, res: Response) => {
      const { userId } = req.params;
      const { roleIds } = req.body as { roleIds: string[] };
      const actor = req.session?.userId || '';

      if (!Array.isArray(roleIds)) {
        return res.status(400).json({ error: 'roleIds must be an array' });
      }

      // SECURITY: Super Admin can never be granted or revoked through this
      // endpoint. The role is reserved for seeded super-admins and must be
      // managed by direct database action. This blocks privilege escalation
      // by any admin who happens to hold `manage_employees`.
      const superFlags = await Promise.all(roleIds.map(isSuperAdminRole));
      if (superFlags.some(Boolean)) {
        return res.status(403).json({
          error: 'Super Admin cannot be assigned through this endpoint. It is reserved for seeded super-admins.',
        });
      }
      // Also block silent revocation of an existing Super Admin assignment
      // by omitting it from the payload — same reason.
      const currentAssignments = await storage.getUserRoleAssignments(userId);
      const currentSuperFlags = await Promise.all(
        currentAssignments.map((a: any) => isSuperAdminRole(a.role_id)),
      );
      if (currentSuperFlags.some(Boolean)) {
        return res.status(403).json({
          error: 'This user holds Super Admin. Revoke it via direct database action, not this endpoint.',
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const before = await client.query(
          `SELECT role_id FROM user_role_assignments WHERE user_id = $1 AND is_active = true`,
          [userId],
        );
        await client.query(
          `UPDATE user_role_assignments SET is_active = false WHERE user_id = $1 AND is_active = true`,
          [userId],
        );
        for (const rid of roleIds) {
          await client.query(
            `INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by, assigned_at, is_active)
             VALUES (gen_random_uuid(), $1, $2, $3, NOW(), true)`,
            [userId, rid, actor],
          );
        }
        await client.query(
          `INSERT INTO audit_logs (entity_type, entity_id, action_type, actor, actor_role, details, old_value, new_value)
           VALUES ('rbac.user_roles', $1, 'replace', $2, 'admin', $3, $4, $5)`,
          [
            userId,
            actor,
            `Replaced role assignments`,
            JSON.stringify(before.rows.map((r: any) => r.role_id)),
            JSON.stringify(roleIds),
          ],
        );
        await client.query('COMMIT');
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('[Staff] replace roles error', err);
        return res.status(500).json({ error: 'Failed to replace roles' });
      } finally {
        client.release();
      }

      await invalidatePermissionsForUsers([userId]);
      return res.json({ success: true });
    },
  );

  // ----- Suspend / Unsuspend / Force-logout -----
  app.post(
    '/api/admin/rbac/staff/:userId/suspend',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (req: Request, res: Response) => {
      const { userId } = req.params;
      const actor = req.session?.userId || '';
      if (userId === actor) {
        return res.status(400).json({ error: 'You cannot suspend yourself.' });
      }
      const target = await storage.getUser(userId);
      if (!target) return res.status(404).json({ error: 'User not found' });

      await storage.updateUser(userId, { isSuspended: true } as any);
      await destroySessionsForUser(userId);
      await writeRbacAudit(actor, 'suspend', 'staff', userId,
        `Suspended staff ${target.email}`,
        { isSuspended: target.isSuspended },
        { isSuspended: true });
      return res.json({ success: true });
    },
  );

  app.post(
    '/api/admin/rbac/staff/:userId/unsuspend',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (req: Request, res: Response) => {
      const { userId } = req.params;
      const actor = req.session?.userId || '';
      const target = await storage.getUser(userId);
      if (!target) return res.status(404).json({ error: 'User not found' });
      await storage.updateUser(userId, { isSuspended: false } as any);
      await writeRbacAudit(actor, 'unsuspend', 'staff', userId,
        `Unsuspended staff ${target.email}`,
        { isSuspended: true },
        { isSuspended: false });
      return res.json({ success: true });
    },
  );

  app.post(
    '/api/admin/rbac/staff/:userId/force-logout',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (req: Request, res: Response) => {
      const { userId } = req.params;
      const actor = req.session?.userId || '';
      const target = await storage.getUser(userId);
      if (!target) return res.status(404).json({ error: 'User not found' });
      await destroySessionsForUser(userId);
      await writeRbacAudit(actor, 'force_logout', 'staff', userId,
        `Forced logout of staff ${target.email}`);
      return res.json({ success: true });
    },
  );

  // ----- Deactivate role (with assignment safety check) -----
  // Replaces the existing DELETE flow so that a role with active staff
  // assignments cannot be removed without first reassigning those users.
  app.post(
    '/api/admin/rbac/roles/:roleId/deactivate',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (req: Request, res: Response) => {
      const { roleId } = req.params;
      const actor = req.session?.userId || '';
      const role = await storage.getAdminRole(roleId);
      if (!role) return res.status(404).json({ error: 'Role not found' });
      if (role.is_system) {
        return res.status(403).json({ error: 'System roles cannot be deactivated.' });
      }

      // Block if there are active assignments — surface affected users so the
      // UI can ask the admin to reassign them first.
      const { rows: affected } = await pool.query(
        `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
         FROM user_role_assignments ura
         JOIN users u ON u.id = ura.user_id
         WHERE ura.role_id = $1 AND ura.is_active = true`,
        [roleId],
      );
      if (affected.length > 0) {
        return res.status(409).json({
          error: 'Role still has active staff assignments. Reassign these users first.',
          affectedUsers: affected,
        });
      }

      await pool.query(
        `UPDATE admin_roles SET is_active = false, updated_at = NOW() WHERE id = $1`,
        [roleId],
      );
      await writeRbacAudit(actor, 'deactivate', 'role', roleId,
        `Deactivated role ${role.name}`,
        { isActive: true }, { isActive: false });
      return res.json({ success: true });
    },
  );

  // ----- Bulk permission-matrix PUT (idempotent) -----
  app.put(
    '/api/admin/rbac/roles/:roleId/permissions',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (req: Request, res: Response) => {
      const { roleId } = req.params;
      const { permissions } = req.body as {
        permissions: Array<{
          componentId: string;
          canView?: boolean;
          canCreate?: boolean;
          canEdit?: boolean;
          canApproveL1?: boolean;
          canApproveFinal?: boolean;
          canReject?: boolean;
          canExport?: boolean;
          canDelete?: boolean;
        }>;
      };
      const actor = req.session?.userId || '';

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: 'permissions must be an array' });
      }

      if (await isSuperAdminRole(roleId)) {
        return res.status(403).json({ error: 'Super Admin permissions are read-only.' });
      }

      const role = await storage.getAdminRole(roleId);
      if (!role) return res.status(404).json({ error: 'Role not found' });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const before = await client.query(
          `SELECT component_id, can_view, can_create, can_edit, can_approve_l1, can_approve_final, can_reject, can_export, can_delete
           FROM role_component_permissions WHERE role_id = $1`,
          [roleId],
        );
        for (const p of permissions) {
          await client.query(
            `INSERT INTO role_component_permissions
              (role_id, component_id, can_view, can_create, can_edit, can_approve_l1, can_approve_final, can_reject, can_export, can_delete)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (role_id, component_id) DO UPDATE SET
               can_view = EXCLUDED.can_view,
               can_create = EXCLUDED.can_create,
               can_edit = EXCLUDED.can_edit,
               can_approve_l1 = EXCLUDED.can_approve_l1,
               can_approve_final = EXCLUDED.can_approve_final,
               can_reject = EXCLUDED.can_reject,
               can_export = EXCLUDED.can_export,
               can_delete = EXCLUDED.can_delete,
               updated_at = NOW()`,
            [
              roleId, p.componentId,
              !!p.canView, !!p.canCreate, !!p.canEdit,
              !!p.canApproveL1, !!p.canApproveFinal, !!p.canReject,
              !!p.canExport, !!p.canDelete,
            ],
          );
        }
        await client.query(
          `INSERT INTO audit_logs (entity_type, entity_id, action_type, actor, actor_role, details, old_value, new_value)
           VALUES ('rbac.role_permissions', $1, 'replace', $2, 'admin', $3, $4, $5)`,
          [
            roleId, actor,
            `Updated permission matrix for role ${role.name}`,
            JSON.stringify(before.rows),
            JSON.stringify(permissions),
          ],
        );
        await client.query('COMMIT');
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('[Staff] bulk permissions error', err);
        return res.status(500).json({ error: 'Failed to update permissions' });
      } finally {
        client.release();
      }

      await invalidatePermissionsForRole(roleId);
      return res.json({ success: true, count: permissions.length });
    },
  );

  // ----- RBAC audit log -----
  app.get(
    '/api/admin/rbac/audit-log',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (req: Request, res: Response) => {
      try {
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const { rows } = await pool.query(
          `SELECT al.id, al.entity_type, al.entity_id, al.action_type, al.actor,
                  al.actor_role, al.details, al.old_value, al.new_value, al.timestamp,
                  u.email AS actor_email, u.first_name AS actor_first_name, u.last_name AS actor_last_name
           FROM audit_logs al
           LEFT JOIN users u ON u.id = al.actor
           WHERE al.entity_type LIKE 'rbac.%' OR al.entity_type = 'staff_invite'
           ORDER BY al.timestamp DESC
           LIMIT $1`,
          [limit],
        );
        return res.json({ entries: rows });
      } catch (err: any) {
        console.error('[Staff] audit-log error', err);
        return res.status(500).json({ error: 'Failed to load audit log' });
      }
    },
  );

  // ----- Invite Staff -----
  app.get(
    '/api/admin/rbac/staff/invites',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (_req: Request, res: Response) => {
      try {
        const { rows } = await pool.query(`
          SELECT si.id, si.email, si.first_name, si.last_name, si.role_ids,
                 si.invited_by, si.expires_at, si.accepted_at, si.revoked_at,
                 si.status, si.created_at,
                 u.email AS invited_by_email
          FROM staff_invites si
          LEFT JOIN users u ON u.id = si.invited_by
          ORDER BY si.created_at DESC
          LIMIT 200
        `);
        return res.json({ invites: rows });
      } catch (err: any) {
        console.error('[Staff] list invites error', err);
        return res.status(500).json({ error: 'Failed to load invites' });
      }
    },
  );

  app.post(
    '/api/admin/rbac/staff/invite',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (req: Request, res: Response) => {
      try {
        const { email, firstName, lastName, roleIds } = req.body as {
          email: string;
          firstName?: string;
          lastName?: string;
          roleIds: string[];
        };
        const actor = req.session?.userId || '';
        if (!email || !Array.isArray(roleIds) || roleIds.length === 0) {
          return res.status(400).json({ error: 'email and at least one roleId required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await storage.getUserByEmail(normalizedEmail);
        if (existing) {
          return res.status(409).json({ error: 'A user with that email already exists.' });
        }

        // Validate roles exist; block invites that grant Super Admin via this flow.
        for (const rid of roleIds) {
          const role = await storage.getAdminRole(rid);
          if (!role) return res.status(400).json({ error: `Unknown role: ${rid}` });
          if (role.name === SUPER_ADMIN_ROLE_NAME) {
            return res.status(403).json({
              error: 'Super Admin cannot be granted via invite. It is reserved for seeded super-admins.',
            });
          }
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000);

        const { rows: inserted } = await pool.query(
          `INSERT INTO staff_invites (email, first_name, last_name, role_ids, invited_by, token_hash, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [normalizedEmail, firstName || null, lastName || null, roleIds, actor, tokenHash, expiresAt],
        );

        await writeRbacAudit(actor, 'create', 'staff_invite', inserted[0].id,
          `Invited ${normalizedEmail} with ${roleIds.length} role(s)`,
          null, { email: normalizedEmail, roleIds });

        // Send invite email
        const link = buildAcceptUrl(rawToken);
        const html = `
          <p>Hello ${firstName ? firstName : 'there'},</p>
          <p>You have been invited to join <strong>Finatrades</strong> as a staff member.</p>
          <p style="margin: 24px 0;">
            <a href="${link}"
               style="background:#C73B22;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
              Accept invitation
            </a>
          </p>
          <p style="color:#666;font-size:13px;">This invitation expires in ${INVITE_TTL_HOURS} hours.
          If the button doesn't work, copy this link into your browser:<br/><code>${link}</code></p>
        `;
        await queueEmail(normalizedEmail, 'You have been invited to Finatrades Admin', html);

        return res.json({ success: true, inviteId: inserted[0].id });
      } catch (err: any) {
        console.error('[Staff] invite error', err);
        return res.status(500).json({ error: 'Failed to send invite' });
      }
    },
  );

  app.post(
    '/api/admin/rbac/staff/invites/:id/revoke',
    ensureAdminAsync,
    requirePermission('manage_employees'),
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const actor = req.session?.userId || '';
      const { rowCount } = await pool.query(
        `UPDATE staff_invites SET status='revoked', revoked_at=NOW()
         WHERE id=$1 AND status='pending'`,
        [id],
      );
      if (!rowCount) return res.status(404).json({ error: 'Invite not found or already used' });
      await writeRbacAudit(actor, 'revoke', 'staff_invite', id, `Revoked invite ${id}`);
      return res.json({ success: true });
    },
  );

  // ----- Public: look up invite by token -----
  app.get('/api/staff/invite-info', async (req: Request, res: Response) => {
    const token = (req.query.token as string) || '';
    if (!token) return res.status(400).json({ error: 'token required' });
    const { rows } = await pool.query(
      `SELECT email, first_name, last_name, role_ids, expires_at, status
       FROM staff_invites WHERE token_hash = $1`,
      [hashToken(token)],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Invalid invite' });
    const inv = rows[0];
    if (inv.status !== 'pending') return res.status(410).json({ error: `Invite ${inv.status}` });
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Invite expired' });
    }
    // Fetch role names so the UI can show what they're accepting
    const { rows: roleRows } = await pool.query(
      `SELECT name FROM admin_roles WHERE id = ANY($1::text[])`,
      [inv.role_ids],
    );
    return res.json({
      email: inv.email,
      firstName: inv.first_name,
      lastName: inv.last_name,
      roleNames: roleRows.map((r: any) => r.name),
      expiresAt: inv.expires_at,
    });
  });

  // ----- Public: accept invite -----
  app.post('/api/staff/accept-invite', async (req: Request, res: Response) => {
    const { token, password, firstName, lastName } = req.body as {
      token: string; password: string; firstName?: string; lastName?: string;
    };
    if (!token || !password) {
      return res.status(400).json({ error: 'token and password required' });
    }
    if (password.length < 10) {
      return res.status(400).json({ error: 'Password must be at least 10 characters' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: invRows } = await client.query(
        `SELECT id, email, first_name, last_name, role_ids, expires_at, status, invited_by
         FROM staff_invites WHERE token_hash = $1 FOR UPDATE`,
        [hashToken(token)],
      );
      if (invRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invalid invite' });
      }
      const inv = invRows[0];
      if (inv.status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(410).json({ error: `Invite ${inv.status}` });
      }
      if (new Date(inv.expires_at).getTime() < Date.now()) {
        await client.query('ROLLBACK');
        return res.status(410).json({ error: 'Invite expired' });
      }

      const existing = await storage.getUserByEmail(inv.email);
      if (existing) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'An account with that email already exists. Sign in instead.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const finatradesId = storage.generateFinatradesId();
      const { rows: userRows } = await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, role, is_email_verified, finatrades_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'admin', true, $5, NOW(), NOW())
         RETURNING id`,
        [
          inv.email,
          passwordHash,
          firstName || inv.first_name,
          lastName || inv.last_name,
          finatradesId,
        ],
      );
      const newUserId = userRows[0].id;
      for (const rid of inv.role_ids as string[]) {
        await client.query(
          `INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by, assigned_at, is_active)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW(), true)`,
          [newUserId, rid, inv.invited_by],
        );
      }
      await client.query(
        `UPDATE staff_invites SET status='accepted', accepted_at=NOW(), accepted_user_id=$1 WHERE id=$2`,
        [newUserId, inv.id],
      );
      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action_type, actor, actor_role, details, new_value)
         VALUES ('staff_invite', $1, 'accept', $2, 'admin', $3, $4)`,
        [inv.id, newUserId, `Invite accepted by ${inv.email}`, JSON.stringify({ userId: newUserId, roleIds: inv.role_ids })],
      );
      await client.query('COMMIT');

      // Auto-login: drop the new user straight onto the admin dashboard so
      // they don't have to type their just-set password again.
      if (req.session) {
        (req.session as any).userId = newUserId;
        (req.session as any).userRole = 'admin';
        (req.session as any).adminPortal = true;
        (req.session as any).permissions = undefined;
        (req.session as any).permissionsCachedAt = 0;
        (req.session as any).isSuperAdmin = undefined;
      }
      return res.json({
        success: true,
        autoLoggedIn: true,
        redirectTo: '/admin/dashboard',
        user: { id: newUserId, email: inv.email },
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[Staff] accept-invite error', err);
      return res.status(500).json({ error: 'Failed to accept invite' });
    } finally {
      client.release();
    }
  });
}
