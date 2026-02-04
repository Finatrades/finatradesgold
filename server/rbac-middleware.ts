import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const PERMISSION_CACHE_TTL = 5 * 60 * 1000;

export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  try {
    const assignments = await storage.getUserRoleAssignments(userId);
    if (!assignments || assignments.length === 0) return false;
    
    for (const assignment of assignments) {
      const role = await storage.getAdminRole(assignment.role_id);
      if (role && (role.is_system || role.name === 'Super Admin')) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking Super Admin status:', error);
    return false;
  }
}

export async function loadUserPermissions(userId: string): Promise<Record<string, Record<string, boolean>>> {
  const result = await storage.getUserEffectivePermissions(userId);
  const permissionMap: Record<string, Record<string, boolean>> = {};
  
  // Handle Super Admin - give full permissions
  if (result.isSuperAdmin) {
    return { '*': { view: true, create: true, edit: true, approve_l1: true, approve_final: true, reject: true, export: true, delete: true } };
  }
  
  // Use components array from the result for detailed permission mapping
  for (const perm of result.components) {
    permissionMap[perm.component_slug] = {
      view: perm.can_view,
      create: perm.can_create,
      edit: perm.can_edit,
      approve_l1: perm.can_approve_l1,
      approve_final: perm.can_approve_final,
      reject: perm.can_reject,
      export: perm.can_export,
      delete: perm.can_delete
    };
  }
  
  return permissionMap;
}

// Legacy permission string to RBAC component mapping
const LEGACY_PERM_TO_COMPONENT: Record<string, { component: string, action: 'view' | 'edit' }> = {
  'view_users': { component: 'user-management', action: 'view' },
  'manage_users': { component: 'user-management', action: 'edit' },
  'view_kyc': { component: 'kyc-reviews', action: 'view' },
  'manage_kyc': { component: 'kyc-reviews', action: 'edit' },
  'manage_employees': { component: 'employees', action: 'edit' },
  'view_reports': { component: 'financial-reports', action: 'view' },
  'generate_reports': { component: 'financial-reports', action: 'edit' },
  'view_vault': { component: 'vault-management', action: 'view' },
  'manage_vault': { component: 'vault-management', action: 'edit' },
  'view_transactions': { component: 'payment-operations', action: 'view' },
  'manage_transactions': { component: 'payment-operations', action: 'edit' },
  'manage_deposits': { component: 'payment-operations', action: 'edit' },
  'manage_withdrawals': { component: 'payment-operations', action: 'edit' },
  'manage_fees': { component: 'fee-management', action: 'edit' },
  'view_bnsl': { component: 'bnsl-management', action: 'view' },
  'manage_bnsl': { component: 'bnsl-management', action: 'edit' },
  'view_finabridge': { component: 'finabridge-management', action: 'view' },
  'manage_finabridge': { component: 'finabridge-management', action: 'edit' },
  'manage_settings': { component: 'platform-settings', action: 'edit' },
  'view_cms': { component: 'cms-management', action: 'view' },
  'manage_cms': { component: 'cms-management', action: 'edit' },
  'view_support': { component: 'support', action: 'view' },
  'manage_support': { component: 'support', action: 'edit' },
};

// Check if a string is a legacy permission format
function isLegacyPermission(str: string): boolean {
  return str.startsWith('view_') || str.startsWith('manage_') || str.startsWith('generate_');
}

export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.session?.userRole === 'admin') {
        const cachedAt = req.session.permissionsCachedAt || 0;
        const now = Date.now();
        
        // Check if user is Super Admin (bypass all permission checks)
        // Re-check periodically to pick up role assignment changes
        if (req.session.isSuperAdmin === undefined || now - cachedAt > PERMISSION_CACHE_TTL) {
          req.session.isSuperAdmin = await checkIsSuperAdmin(userId);
          req.session.permissionsCachedAt = now;
        }
        
        if (req.session.isSuperAdmin) {
          return next();
        }
        
        if (!req.session.permissions || now - cachedAt > PERMISSION_CACHE_TTL) {
          req.session.permissions = await loadUserPermissions(userId);
          req.session.permissionsCachedAt = now;
        }
        
        // Check for wildcard permissions (Super Admin)
        const wildcardPerms = req.session.permissions['*'];
        if (wildcardPerms) {
          return next();
        }
        
        // Handle legacy permission strings (e.g., 'view_users', 'manage_users')
        // User needs ANY of the specified permissions (OR logic)
        for (const perm of permissions) {
          if (isLegacyPermission(perm)) {
            const mapping = LEGACY_PERM_TO_COMPONENT[perm];
            if (mapping) {
              const componentPerms = req.session.permissions[mapping.component];
              if (componentPerms) {
                // For view_ permissions, check can_view
                // For manage_/generate_ permissions, check can_edit, can_create, can_delete, or can_approve
                if (mapping.action === 'view' && componentPerms.view) {
                  return next();
                }
                if (mapping.action === 'edit' && (componentPerms.edit || componentPerms.create || componentPerms.delete || componentPerms.approve_l1 || componentPerms.approve_final)) {
                  return next();
                }
              }
            }
          } else {
            // New format: componentSlug with optional action
            // Check if second arg is a valid action
            const validActions = ['view', 'create', 'edit', 'approve_l1', 'approve_final', 'reject', 'export', 'delete'];
            if (permissions.length === 2 && validActions.includes(permissions[1])) {
              const componentSlug = permissions[0];
              const action = permissions[1] as 'view' | 'create' | 'edit' | 'approve_l1' | 'approve_final' | 'reject' | 'export' | 'delete';
              const componentPerms = req.session.permissions[componentSlug];
              if (componentPerms && componentPerms[action]) {
                return next();
              }
            }
          }
        }
        
        return res.status(403).json({ 
          message: "Access Denied: You do not have the required permissions to access this page. Please contact your system administrator.",
          required: permissions,
          code: "RBAC_PERMISSION_DENIED"
        });
      }
      
      return res.status(403).json({ 
        message: "Admin access required",
        code: "ADMIN_ACCESS_REQUIRED"
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        message: "Failed to verify permissions. Please try again later.",
        code: "PERMISSION_VERIFICATION_FAILED"
      });
    }
  };
}

export function requireAnyPermission(...permissions: string[]) {
  // This function now supports both legacy permissions and new RBAC format
  // It checks if user has ANY of the specified permissions (OR logic)
  return requirePermission(...permissions);
}

export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.session?.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    return next();
  };
}

export function refreshPermissionsCache() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.session?.userId && req.session?.userRole === 'admin') {
      req.session.permissions = await loadUserPermissions(req.session.userId);
      req.session.permissionsCachedAt = Date.now();
    }
    next();
  };
}

export async function createApprovalWorkflow(
  taskSlug: string,
  initiatorId: string,
  entityType: string,
  entityId: string,
  taskData: Record<string, any>,
  reason?: string
): Promise<{ approvalRequired: boolean; approvalId?: string; error?: string }> {
  try {
    const taskDef = await storage.getTaskDefinitionBySlug(taskSlug);
    
    if (!taskDef || !taskDef.requires_approval) {
      return { approvalRequired: false };
    }
    
    const expiresAt = taskDef.auto_expire_hours 
      ? new Date(Date.now() + taskDef.auto_expire_hours * 60 * 60 * 1000)
      : undefined;
    
    const approval = await storage.createApprovalRequest({
      taskDefinitionId: taskDef.id,
      initiatorId,
      entityType,
      entityId,
      taskData,
      reason,
      expiresAt
    });
    
    await storage.createApprovalHistory({
      approvalQueueId: approval.id,
      action: 'created',
      actorId: initiatorId,
      newValue: taskData
    });
    
    return { approvalRequired: true, approvalId: approval.id };
  } catch (error) {
    console.error('Create approval workflow error:', error);
    return { approvalRequired: false, error: 'Failed to create approval workflow' };
  }
}

export async function processApproval(
  approvalId: string,
  approverId: string,
  action: 'approve_l1' | 'approve_final' | 'reject',
  comments?: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const approval = await storage.getApprovalQueueItem(approvalId);
    
    if (!approval) {
      return { success: false, error: 'Approval not found' };
    }
    
    if (approval.initiator_id === approverId) {
      return { success: false, error: 'Cannot approve your own request' };
    }
    
    let result;
    
    switch (action) {
      case 'approve_l1':
        if (approval.status !== 'pending_l1') {
          return { success: false, error: 'Invalid status for L1 approval' };
        }
        result = await storage.approveL1(approvalId, approverId, comments);
        break;
        
      case 'approve_final':
        if (approval.status !== 'pending_final') {
          return { success: false, error: 'Invalid status for final approval' };
        }
        result = await storage.approveFinal(approvalId, approverId, comments);
        break;
        
      case 'reject':
        if (!['pending_l1', 'pending_final'].includes(approval.status)) {
          return { success: false, error: 'Invalid status for rejection' };
        }
        result = await storage.rejectApproval(approvalId, approverId, comments || 'Rejected');
        break;
        
      default:
        return { success: false, error: 'Invalid action' };
    }
    
    if (!result) {
      return { success: false, error: 'Failed to process approval' };
    }
    
    await storage.createApprovalHistory({
      approvalQueueId: approvalId,
      action,
      actorId: approverId,
      comments,
      oldValue: { status: approval.status },
      newValue: { status: result.status }
    });
    
    return { success: true, status: result.status };
  } catch (error) {
    console.error('Process approval error:', error);
    return { success: false, error: 'Failed to process approval' };
  }
}
