import { db } from './db';
import { sql } from 'drizzle-orm';

const DEFAULT_ROLES = [
  { id: 'role-super-admin', name: 'Super Admin', description: 'Full system access with all permissions', department: 'Administration', riskLevel: 'Critical', isSystem: true },
  { id: 'role-admin', name: 'Admin', description: 'Administrative access with most permissions', department: 'Administration', riskLevel: 'High', isSystem: true },
  { id: 'role-manager', name: 'Manager', description: 'Managerial access for team oversight', department: 'Operations', riskLevel: 'Medium', isSystem: true },
  { id: 'role-finance', name: 'Finance Reviewer', description: 'Financial operations and reporting access', department: 'Finance', riskLevel: 'High', isSystem: true },
  { id: 'role-compliance', name: 'Compliance Officer', description: 'Compliance and audit access', department: 'Compliance', riskLevel: 'High', isSystem: true },
  { id: 'role-support', name: 'Support Agent', description: 'Customer support access', department: 'Support', riskLevel: 'Low', isSystem: true },
  { id: 'role-auditor', name: 'Read-Only Auditor', description: 'Read-only access for auditing purposes', department: 'Audit', riskLevel: 'Low', isSystem: true },
  { id: 'role-vault-manager', name: 'Vault Manager', description: 'Vault and storage management access', department: 'Operations', riskLevel: 'High', isSystem: true },
];

async function ensureAdminActionEnumValues() {
  const requiredValues = [
    'vault_deposit_approval', 'vault_deposit_rejection',
    'vault_withdrawal_approval', 'vault_withdrawal_rejection',
    'transaction_approval', 'transaction_rejection',
    'database_sync'
  ];
  
  try {
    const existing = await db.execute(sql`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_action_type')
    `);
    const existingLabels = new Set(existing.rows.map((r: any) => r.enumlabel));
    
    for (const val of requiredValues) {
      if (!existingLabels.has(val)) {
        await db.execute(sql.raw(`ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS '${val}'`));
        console.log(`[RBAC] Added enum value '${val}' to admin_action_type`);
      }
    }
  } catch (error) {
    console.error('[RBAC] Error ensuring admin_action_type enum values:', error);
  }
}

export async function seedDefaultRBACRoles() {
  await ensureAdminActionEnumValues();
  
  try {
    const existing = await db.execute(sql`SELECT id FROM admin_roles LIMIT 1`);
    if (existing.rows.length > 0) {
      console.log('[RBAC] Default roles already exist, skipping seed');
    } else {
      console.log('[RBAC] Seeding default admin roles...');
      for (const role of DEFAULT_ROLES) {
        await db.execute(sql`
          INSERT INTO admin_roles (id, name, description, department, risk_level, is_system, is_active)
          VALUES (${role.id}, ${role.name}, ${role.description}, ${role.department}, ${role.riskLevel}, ${role.isSystem}, true)
          ON CONFLICT (id) DO NOTHING
        `);
      }
      console.log('[RBAC] Successfully seeded', DEFAULT_ROLES.length, 'default admin roles');

      const admins = await db.execute(sql`SELECT id FROM users WHERE role = 'admin' LIMIT 5`);
      for (const admin of admins.rows) {
        const userId = (admin as any).id;
        const existingAssignment = await db.execute(sql`
          SELECT id FROM user_role_assignments WHERE user_id = ${userId} LIMIT 1
        `);
        if (existingAssignment.rows.length === 0) {
          await db.execute(sql`
            INSERT INTO user_role_assignments (user_id, role_id, assigned_by, is_active)
            VALUES (${userId}, 'role-super-admin', ${userId}, true)
            ON CONFLICT DO NOTHING
          `);
          console.log('[RBAC] Auto-assigned Super Admin role to admin user:', userId);
        }
      }
    }
    await syncEmployeeRoleAssignments();
  } catch (error) {
    console.error('[RBAC] Error seeding default roles:', error);
  }
}

const LEGACY_ROLE_MAP: Record<string, string> = {
  'super_admin': 'role-super-admin',
  'admin': 'role-admin',
  'manager': 'role-manager',
  'finance': 'role-finance',
  'finance_reviewer': 'role-finance',
  'compliance': 'role-compliance',
  'compliance_officer': 'role-compliance',
  'support': 'role-support',
  'support_agent': 'role-support',
  'auditor': 'role-auditor',
  'vault_manager': 'role-vault-manager',
};

async function syncEmployeeRoleAssignments() {
  try {
    const employees = await db.execute(sql`
      SELECT e.user_id, e.rbac_role_id, e.status, e.role, e.employee_id
      FROM employees e
      WHERE e.user_id IS NOT NULL AND e.status = 'active'
    `);

    for (const emp of employees.rows) {
      const userId = (emp as any).user_id;
      let rbacRoleId = (emp as any).rbac_role_id;
      const legacyRole = (emp as any).role;
      const empId = (emp as any).employee_id;

      if (!rbacRoleId && legacyRole) {
        rbacRoleId = LEGACY_ROLE_MAP[legacyRole];
      }

      if (rbacRoleId && !rbacRoleId.startsWith('role-')) {
        rbacRoleId = LEGACY_ROLE_MAP[rbacRoleId] || `role-${rbacRoleId}`;
      }

      if (!rbacRoleId) continue;

      const roleExists = await db.execute(sql`
        SELECT id FROM admin_roles WHERE id = ${rbacRoleId}
      `);
      if (roleExists.rows.length === 0) {
        console.warn(`[RBAC] Role ${rbacRoleId} not found for employee ${empId}, skipping`);
        continue;
      }

      const existing = await db.execute(sql`
        SELECT id FROM user_role_assignments
        WHERE user_id = ${userId} AND role_id = ${rbacRoleId} AND is_active = true
      `);

      if (existing.rows.length === 0) {
        await db.execute(sql`
          INSERT INTO user_role_assignments (id, user_id, role_id, assigned_at, is_active)
          VALUES (gen_random_uuid(), ${userId}, ${rbacRoleId}, NOW(), true)
        `);
        console.log(`[RBAC] Synced role assignment for employee ${empId}: user ${userId} -> role ${rbacRoleId}`);
      }

      if ((emp as any).rbac_role_id !== rbacRoleId) {
        await db.execute(sql`
          UPDATE employees SET rbac_role_id = ${rbacRoleId} WHERE user_id = ${userId}
        `);
      }
    }
  } catch (error) {
    console.error('[RBAC] Error syncing employee role assignments:', error);
  }
}
