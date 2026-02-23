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

export async function seedDefaultRBACRoles() {
  try {
    const existing = await db.execute(sql`SELECT id FROM admin_roles LIMIT 1`);
    if (existing.rows.length > 0) {
      console.log('[RBAC] Default roles already exist, skipping seed');
      return;
    }

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
  } catch (error) {
    console.error('[RBAC] Error seeding default roles:', error);
  }
}
