import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";
import { sql, eq } from "drizzle-orm";

const { Pool } = pg;

const ADMIN_ROLES_DATA = [
  { id: 'role-super-admin', name: 'Super Admin', description: 'Full system access with all permissions', department: 'Administration', riskLevel: 'Critical', isSystem: true, isActive: true },
  { id: 'role-admin', name: 'Admin', description: 'Administrative access with most permissions', department: 'Administration', riskLevel: 'High', isSystem: true, isActive: true },
  { id: 'role-manager', name: 'Manager', description: 'Managerial access for team oversight', department: 'Operations', riskLevel: 'Medium', isSystem: true, isActive: true },
  { id: 'role-finance', name: 'Finance Reviewer', description: 'Financial transactions review and approval', department: 'Finance', riskLevel: 'High', isSystem: true, isActive: true },
  { id: 'role-compliance', name: 'Compliance Officer', description: 'Compliance and KYC management', department: 'Compliance', riskLevel: 'High', isSystem: true, isActive: true },
  { id: 'role-vault-manager', name: 'Vault Manager', description: 'Gold vault operations management', department: 'Operations', riskLevel: 'High', isSystem: true, isActive: true },
  { id: 'role-support', name: 'Support Agent', description: 'Customer support and basic operations', department: 'Support', riskLevel: 'Low', isSystem: true, isActive: true },
  { id: 'role-auditor', name: 'Read-Only Auditor', description: 'View-only access for audit purposes', department: 'Audit', riskLevel: 'Low', isSystem: true, isActive: true },
];

const ADMIN_COMPONENTS_DATA = [
  { id: 'comp-dashboard', name: 'Dashboard', slug: 'dashboard', category: 'dashboard', description: 'Main admin dashboard', path: '/admin', icon: 'LayoutDashboard', sortOrder: 1, isActive: true },
  { id: 'comp-users', name: 'User Management', slug: 'users', category: 'users', description: 'Manage platform users', path: '/admin/users', icon: 'Users', sortOrder: 10, isActive: true },
  { id: 'comp-employees', name: 'Employee Management', slug: 'employees', category: 'users', description: 'Manage admin employees', path: '/admin/employees', icon: 'UserCog', sortOrder: 11, isActive: true },
  { id: 'comp-kyc', name: 'KYC Reviews', slug: 'kyc', category: 'users', description: 'Review KYC submissions', path: '/admin/kyc', icon: 'FileCheck', sortOrder: 12, isActive: true },
  { id: 'comp-wallets', name: 'Wallets', slug: 'wallets', category: 'finance', description: 'User wallet management', path: '/admin/wallets', icon: 'Wallet', sortOrder: 20, isActive: true },
  { id: 'comp-transactions', name: 'Transactions', slug: 'transactions', category: 'finance', description: 'Transaction management', path: '/admin/transactions', icon: 'ArrowLeftRight', sortOrder: 21, isActive: true },
  { id: 'comp-deposits', name: 'Deposits', slug: 'deposits', category: 'finance', description: 'Deposit request management', path: '/admin/deposits', icon: 'Download', sortOrder: 22, isActive: true },
  { id: 'comp-withdrawals', name: 'Withdrawals', slug: 'withdrawals', category: 'finance', description: 'Withdrawal request management', path: '/admin/withdrawals', icon: 'Upload', sortOrder: 23, isActive: true },
  { id: 'comp-vault', name: 'Vault Ledger', slug: 'vault', category: 'products', description: 'Gold vault management', path: '/admin/vault', icon: 'Lock', sortOrder: 30, isActive: true },
  { id: 'comp-bnsl', name: 'BNSL', slug: 'bnsl', category: 'products', description: 'Buy Now Sell Later management', path: '/admin/bnsl', icon: 'TrendingUp', sortOrder: 31, isActive: true },
  { id: 'comp-finabridge', name: 'FinaBridge', slug: 'finabridge', category: 'products', description: 'Trade finance management', path: '/admin/finabridge', icon: 'Building2', sortOrder: 32, isActive: true },
  { id: 'comp-cms', name: 'CMS', slug: 'cms', category: 'system', description: 'Content management', path: '/admin/cms', icon: 'FileText', sortOrder: 40, isActive: true },
  { id: 'comp-settings', name: 'System Settings', slug: 'settings', category: 'system', description: 'Platform configuration', path: '/admin/settings', icon: 'Settings', sortOrder: 41, isActive: true },
  { id: 'comp-security', name: 'Security', slug: 'security', category: 'system', description: 'Security settings', path: '/admin/security', icon: 'Shield', sortOrder: 42, isActive: true },
  { id: 'comp-reports', name: 'Reports', slug: 'reports', category: 'reports', description: 'Financial reports', path: '/admin/reports', icon: 'BarChart3', sortOrder: 50, isActive: true },
  { id: 'comp-audit', name: 'Audit Logs', slug: 'audit', category: 'reports', description: 'System audit logs', path: '/admin/audit', icon: 'ScrollText', sortOrder: 51, isActive: true },
  { id: 'comp-approvals', name: 'Approval Queue', slug: 'approvals', category: 'system', description: 'Pending approvals management', path: '/admin/approvals', icon: 'CheckCircle', sortOrder: 5, isActive: true },
];

const ALL_COMPONENT_IDS = ADMIN_COMPONENTS_DATA.map(c => c.id);

function generateRoleComponentPermissions() {
  const permissions: any[] = [];
  
  for (const role of ADMIN_ROLES_DATA) {
    for (const compId of ALL_COMPONENT_IDS) {
      let perm = { roleId: role.id, componentId: compId, canView: true, canCreate: false, canEdit: false, canApproveL1: false, canApproveFinal: false, canReject: false, canExport: false, canDelete: false };
      
      if (role.id === 'role-super-admin') {
        perm = { ...perm, canView: true, canCreate: true, canEdit: true, canApproveL1: true, canApproveFinal: true, canReject: true, canExport: true, canDelete: true };
      } else if (role.id === 'role-admin') {
        perm = { ...perm, canView: true, canCreate: true, canEdit: true, canApproveL1: true, canApproveFinal: compId === 'comp-dashboard', canReject: true, canExport: true, canDelete: false };
      } else if (role.id === 'role-manager') {
        const managerComps = ['comp-dashboard', 'comp-users', 'comp-employees', 'comp-kyc', 'comp-wallets', 'comp-transactions', 'comp-deposits', 'comp-withdrawals', 'comp-vault', 'comp-bnsl', 'comp-finabridge'];
        if (managerComps.includes(compId)) {
          perm = { ...perm, canView: true, canCreate: false, canEdit: false, canApproveL1: true, canApproveFinal: false, canReject: true, canExport: true, canDelete: false };
        } else {
          perm = { ...perm, canView: false };
        }
      } else if (role.id === 'role-finance') {
        const financeComps = ['comp-wallets', 'comp-transactions', 'comp-deposits', 'comp-withdrawals', 'comp-reports', 'comp-audit'];
        if (financeComps.includes(compId)) {
          perm = { ...perm, canView: true, canCreate: false, canEdit: true, canApproveL1: true, canApproveFinal: false, canReject: true, canExport: true, canDelete: false };
        } else {
          perm = { ...perm, canView: false };
        }
      } else if (role.id === 'role-compliance') {
        const complianceComps = ['comp-kyc', 'comp-users', 'comp-audit', 'comp-reports'];
        if (complianceComps.includes(compId)) {
          perm = { ...perm, canView: true, canCreate: false, canEdit: true, canApproveL1: true, canApproveFinal: false, canReject: true, canExport: true, canDelete: false };
        } else {
          perm = { ...perm, canView: false };
        }
      } else if (role.id === 'role-vault-manager') {
        const vaultComps = ['comp-dashboard', 'comp-vault', 'comp-transactions'];
        if (vaultComps.includes(compId)) {
          perm = { ...perm, canView: true, canCreate: true, canEdit: true, canApproveL1: true, canApproveFinal: false, canReject: true, canExport: true, canDelete: false };
        } else {
          perm = { ...perm, canView: false };
        }
      } else if (role.id === 'role-support') {
        const supportComps = ['comp-dashboard', 'comp-users', 'comp-employees', 'comp-kyc'];
        if (supportComps.includes(compId)) {
          perm = { ...perm, canView: true, canCreate: false, canEdit: false, canApproveL1: false, canApproveFinal: false, canReject: false, canExport: false, canDelete: false };
        } else {
          perm = { ...perm, canView: false };
        }
      } else if (role.id === 'role-auditor') {
        perm = { ...perm, canView: true, canCreate: false, canEdit: false, canApproveL1: false, canApproveFinal: false, canReject: false, canExport: true, canDelete: false };
      }
      
      if (perm.canView) {
        permissions.push(perm);
      }
    }
  }
  
  return permissions;
}

async function syncToDatabase(connectionString: string, dbName: string) {
  console.log(`\n[${dbName}] Connecting...`);
  
  const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  const db = drizzle(pool, { schema });
  
  try {
    console.log(`[${dbName}] Clearing role_component_permissions...`);
    await db.execute(sql`DELETE FROM role_component_permissions`);
    
    console.log(`[${dbName}] Upserting admin_roles...`);
    for (const role of ADMIN_ROLES_DATA) {
      await db.execute(sql`
        INSERT INTO admin_roles (id, name, description, department, risk_level, is_system, is_active)
        VALUES (${role.id}, ${role.name}, ${role.description}, ${role.department}, ${role.riskLevel}, ${role.isSystem}, ${role.isActive})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          department = EXCLUDED.department,
          risk_level = EXCLUDED.risk_level,
          is_system = EXCLUDED.is_system,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `);
    }
    console.log(`[${dbName}] Upserted ${ADMIN_ROLES_DATA.length} roles`);
    
    console.log(`[${dbName}] Upserting admin_components...`);
    for (const comp of ADMIN_COMPONENTS_DATA) {
      await db.execute(sql`
        INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active)
        VALUES (${comp.id}, ${comp.name}, ${comp.slug}, ${comp.category}, ${comp.description}, ${comp.path}, ${comp.icon}, ${comp.sortOrder}, ${comp.isActive})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          path = EXCLUDED.path,
          icon = EXCLUDED.icon,
          sort_order = EXCLUDED.sort_order,
          is_active = EXCLUDED.is_active
      `);
    }
    console.log(`[${dbName}] Upserted ${ADMIN_COMPONENTS_DATA.length} components`);
    
    console.log(`[${dbName}] Inserting role_component_permissions...`);
    const permissions = generateRoleComponentPermissions();
    for (const perm of permissions) {
      await db.execute(sql`
        INSERT INTO role_component_permissions (role_id, component_id, can_view, can_create, can_edit, can_approve_l1, can_approve_final, can_reject, can_export, can_delete)
        VALUES (${perm.roleId}, ${perm.componentId}, ${perm.canView}, ${perm.canCreate}, ${perm.canEdit}, ${perm.canApproveL1}, ${perm.canApproveFinal}, ${perm.canReject}, ${perm.canExport}, ${perm.canDelete})
        ON CONFLICT (role_id, component_id) DO UPDATE SET
          can_view = EXCLUDED.can_view,
          can_create = EXCLUDED.can_create,
          can_edit = EXCLUDED.can_edit,
          can_approve_l1 = EXCLUDED.can_approve_l1,
          can_approve_final = EXCLUDED.can_approve_final,
          can_reject = EXCLUDED.can_reject,
          can_export = EXCLUDED.can_export,
          can_delete = EXCLUDED.can_delete,
          updated_at = NOW()
      `);
    }
    console.log(`[${dbName}] Inserted ${permissions.length} permissions`);
    
    console.log(`[${dbName}] RBAC sync complete!`);
  } catch (error) {
    console.error(`[${dbName}] Error:`, error);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('=== RBAC Data Sync Tool ===\n');
  
  const prodUrl = process.env.AWS_PROD_DATABASE_URL;
  const devUrl = process.env.DATABASE_URL;
  
  if (!prodUrl) {
    console.error('ERROR: AWS_PROD_DATABASE_URL not set');
    process.exit(1);
  }
  
  if (!devUrl) {
    console.error('ERROR: DATABASE_URL not set');
    process.exit(1);
  }
  
  await syncToDatabase(prodUrl, 'Production');
  await syncToDatabase(devUrl, 'Development');
  
  console.log('\n=== All databases synced! ===');
}

main().catch(console.error);
