import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { storage } from "./storage";

// ============================================================================
// CSRF TOKEN PROTECTION
// ============================================================================

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';

// Routes exempt from CSRF protection (webhooks only - external services need to POST without our tokens)
const CSRF_EXEMPT_ROUTES = [
  '/api/webhooks/',
  '/api/binance-pay/webhook',
  '/api/ngenius/webhook',
  '/api/stripe/webhook',
  '/api/wingold/webhooks',
  '/api/unified/callback/wingold-order', // Wingold order webhooks
  '/api/certificates/verify',
  '/api/verify-certificate',
  '/api/sso/verify-token',
];

// Generate secure CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// CSRF token middleware - sets token cookie and validates on state-changing requests
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Check if route is exempt
  const isExempt = CSRF_EXEMPT_ROUTES.some(route => req.path.startsWith(route));
  
  // Generate token for GET requests or if not present
  if (req.method === 'GET' || !req.cookies?.[CSRF_COOKIE]) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    (req as any).csrfToken = token;
  }
  
  // Skip validation for safe methods and exempt routes
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || isExempt) {
    return next();
  }
  
  // Validate CSRF token for state-changing requests
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string;
  
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    console.warn(`[CSRF] Token mismatch - Path: ${req.path}, IP: ${req.ip}`);
    return res.status(403).json({ 
      message: 'Invalid or missing CSRF token',
      code: 'CSRF_VALIDATION_FAILED'
    });
  }
  
  next();
}

// Get CSRF token endpoint
export function getCsrfTokenHandler(req: Request, res: Response) {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ csrfToken: token });
}

// ============================================================================
// SESSION SECURITY HARDENING
// ============================================================================

// Session rotation after sensitive operations
export async function rotateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    const oldSession = { ...req.session };
    req.session.regenerate((err) => {
      if (err) {
        console.error('[Session] Rotation failed:', err);
        reject(err);
        return;
      }
      // Restore session data
      Object.assign(req.session, oldSession);
      resolve();
    });
  });
}

// Middleware to check session age and rotate if needed
export function sessionAgeCheck(maxAgeMinutes: number = 30) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return next();
    }
    
    const sessionCreated = (req.session as any).createdAt;
    const now = Date.now();
    
    if (!sessionCreated) {
      (req.session as any).createdAt = now;
      return next();
    }
    
    const ageMinutes = (now - sessionCreated) / (1000 * 60);
    
    if (ageMinutes > maxAgeMinutes) {
      rotateSession(req)
        .then(() => {
          (req.session as any).createdAt = now;
          next();
        })
        .catch(() => next());
    } else {
      next();
    }
  };
}

// ============================================================================
// RBAC MIDDLEWARE (Enhanced)
// ============================================================================

export type PermissionCheck = string | string[] | ((req: Request) => boolean | Promise<boolean>);

// Enhanced permission middleware with logging
export function requirePermissions(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUser = (req as any).adminUser;
      const adminEmployee = (req as any).adminEmployee;
      
      if (!adminUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const employee = adminEmployee || await storage.getEmployeeByUserId(adminUser.id);
      
      // Super admins and original admins have all permissions
      if (!employee || employee.role === 'super_admin') {
        return next();
      }
      
      // Check employee status
      if (employee.status !== 'active') {
        return res.status(403).json({ message: "Account deactivated" });
      }
      
      // Check permissions
      const employeePermissions = employee.permissions || [];
      const hasPermission = permissions.length === 0 || 
        permissions.some(perm => employeePermissions.includes(perm));
      
      if (!hasPermission) {
        // Log unauthorized access attempt
        await logSecurityEvent(req, 'PERMISSION_DENIED', {
          requiredPermissions: permissions,
          userPermissions: employeePermissions,
          path: req.path,
          method: req.method,
        });
        
        return res.status(403).json({ 
          message: `Permission denied. Required: ${permissions.join(' or ')}`
        });
      }
      
      next();
    } catch (error) {
      console.error('[RBAC] Permission check error:', error);
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
}

// ============================================================================
// SECURITY LOGGING
// ============================================================================

interface SecurityEvent {
  type: string;
  details: Record<string, any>;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  timestamp: Date;
}

export async function logSecurityEvent(
  req: Request, 
  eventType: string, 
  details: Record<string, any> = {}
): Promise<void> {
  const event: SecurityEvent = {
    type: eventType,
    details,
    userId: req.session?.userId || (req as any).adminUser?.id,
    ip: req.ip || req.headers['x-forwarded-for'] as string,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    timestamp: new Date(),
  };
  
  try {
    await storage.createAuditLog({
      entityType: 'security_event',
      entityId: event.userId || undefined,
      actor: event.userId || 'system',
      actorRole: 'system',
      actionType: `SECURITY_${eventType}`,
      details: JSON.stringify(event),
    });
  } catch (error) {
    console.error('[Security] Failed to log security event:', error);
  }
}

// ============================================================================
// STEP-UP AUTHENTICATION (MFA for sensitive operations)
// ============================================================================

interface StepUpConfig {
  action: string;
  maxAgeMinutes?: number;
}

// Middleware requiring step-up authentication for sensitive operations
export function requireStepUpAuth(config: StepUpConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Check for step-up verification token
      const stepUpToken = req.headers['x-step-up-token'] as string;
      
      if (!stepUpToken) {
        return res.status(403).json({
          message: "Step-up authentication required for this operation",
          code: 'STEP_UP_REQUIRED',
          action: config.action,
          methods: user.mfaEnabled ? ['mfa'] : ['email_otp'],
        });
      }
      
      // Validate step-up token
      const isValid = await validateStepUpToken(userId, stepUpToken, config.action);
      
      if (!isValid) {
        return res.status(403).json({
          message: "Invalid or expired step-up token",
          code: 'STEP_UP_INVALID',
        });
      }
      
      next();
    } catch (error) {
      console.error('[StepUp] Authentication error:', error);
      return res.status(500).json({ message: "Step-up authentication failed" });
    }
  };
}

// In-memory step-up token store (should be Redis in production)
const stepUpTokens = new Map<string, { userId: string; action: string; expiresAt: Date }>();

export function generateStepUpToken(userId: string, action: string, expiryMinutes: number = 5): string {
  const token = crypto.randomBytes(32).toString('hex');
  const key = `${userId}:${token}`;
  
  stepUpTokens.set(key, {
    userId,
    action,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
  });
  
  // Cleanup expired tokens
  setTimeout(() => stepUpTokens.delete(key), expiryMinutes * 60 * 1000);
  
  return token;
}

async function validateStepUpToken(userId: string, token: string, action: string): Promise<boolean> {
  const key = `${userId}:${token}`;
  const stored = stepUpTokens.get(key);
  
  if (!stored) return false;
  if (stored.userId !== userId) return false;
  if (stored.action !== action) return false;
  if (new Date() > stored.expiresAt) {
    stepUpTokens.delete(key);
    return false;
  }
  
  // Token is single-use
  stepUpTokens.delete(key);
  return true;
}

// ============================================================================
// ADMIN ACTION LOGGING (Immutable Audit Trail)
// ============================================================================

export interface AdminAction {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  reason?: string;
}

export async function logAdminAction(action: AdminAction): Promise<void> {
  try {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(action) + Date.now())
      .digest('hex');
    
    await storage.createAuditLog({
      entityType: action.targetType,
      entityId: action.targetId,
      actor: action.adminId,
      actorRole: 'admin',
      actionType: `ADMIN_${action.action}`,
      details: JSON.stringify({
        previousValue: action.previousValue,
        newValue: action.newValue,
        reason: action.reason,
        ipAddress: action.ipAddress,
        userAgent: action.userAgent,
        hash,
      }),
      oldValue: action.previousValue ? JSON.stringify(action.previousValue) : undefined,
      newValue: action.newValue ? JSON.stringify(action.newValue) : undefined,
    });
  } catch (error) {
    console.error('[AdminAction] Failed to log action:', error);
    throw error; // Fail the operation if we can't log it
  }
}

// ============================================================================
// REQUEST SANITIZATION
// ============================================================================

// Sanitize request body to prevent prototype pollution
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    const forbidden = ['__proto__', 'constructor', 'prototype'];
    
    const hasForbidden = (obj: any): boolean => {
      if (typeof obj !== 'object' || obj === null) return false;
      for (const key of Object.keys(obj)) {
        if (forbidden.includes(key)) return true;
        if (hasForbidden(obj[key])) return true;
      }
      return false;
    };
    
    if (hasForbidden(req.body)) {
      return res.status(400).json({ message: 'Invalid request body' });
    }
  }
  next();
}

// ============================================================================
// HIGH-VALUE TRANSACTION CHECK
// ============================================================================

const HIGH_VALUE_THRESHOLD_USD = 10000;

export function requireHighValueApproval(thresholdUsd: number = HIGH_VALUE_THRESHOLD_USD) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const amountUsd = req.body.amountUsd || req.body.amount || 0;
    
    if (amountUsd >= thresholdUsd) {
      // Log high-value transaction attempt
      await logSecurityEvent(req, 'HIGH_VALUE_TRANSACTION', {
        amountUsd,
        threshold: thresholdUsd,
      });
      
      // Check for MFA/step-up token
      const stepUpToken = req.headers['x-step-up-token'] as string;
      if (!stepUpToken) {
        return res.status(403).json({
          message: `Transactions over $${thresholdUsd.toLocaleString()} require additional verification`,
          code: 'HIGH_VALUE_VERIFICATION_REQUIRED',
          amountUsd,
          threshold: thresholdUsd,
        });
      }
    }
    
    next();
  };
}
