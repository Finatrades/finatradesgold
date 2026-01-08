import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupSocketIO } from "./socket";
import path from "path";
import crypto from "crypto";
import { storage } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { RedisStore } from "connect-redis";
import { pool } from "./db";
import { getRedisClient } from "./redis-client";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Rate limiting configurations for different security levels
// Uses default IP-based key generator which properly handles IPv6
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per window
  message: { message: "Too many OTP attempts. Please try again after 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: { message: "Too many password reset requests. Please try again after 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const withdrawalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 withdrawal requests per hour
  message: { message: "Too many withdrawal requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for general API
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: "user" | "admin";
    adminPortal?: boolean;
  }
}

const app = express();

// Trust proxy for production (required for secure cookies behind Replit's reverse proxy)
app.set('trust proxy', 1);

// Security headers with helmet
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "'unsafe-eval'",
        "https://paypage.ngenius-payments.com",
        "https://paypage-uat.ngenius-payments.com",
        "https://static.cloudflareinsights.com",
        "https://cdn.jsdelivr.net",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: [
        "'self'", 
        "wss:", 
        "ws:", 
        "https:",
        "https://api-gateway.ngenius-payments.com",
        "https://api-gateway-uat.ngenius-payments.com",
      ],
      frameSrc: [
        "'self'", 
        "https:",
        "https://paypage.ngenius-payments.com",
        "https://paypage-uat.ngenius-payments.com",
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", "https://paypage.ngenius-payments.com", "https://paypage-uat.ngenius-payments.com"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xContentTypeOptions: true,
  xFrameOptions: { action: "sameorigin" },
}));

// Session configuration with Redis (primary) or PostgreSQL (fallback)
const PgSession = connectPgSimple(session);

// Create session store - PostgreSQL for reliability
function createSessionStore() {
  console.log('[Session] Using PostgreSQL session store');
  return new PgSession({
    pool: pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  });
}

app.use(
  session({
    store: createSessionStore(),
    secret: (() => {
      const secret = process.env.SESSION_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('SECURITY CRITICAL: SESSION_SECRET environment variable must be set in production');
      }
      // Use a strong default for development only, warn if not set
      if (!secret) {
        console.warn('[SECURITY WARNING] SESSION_SECRET not set - using development fallback. DO NOT deploy without setting SESSION_SECRET.');
      }
      return secret || crypto.randomBytes(32).toString('hex');
    })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
    },
  })
);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve attached_assets for product images
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// System Settings Cache (in-memory with short TTL)
interface SystemSettingsCache {
  maintenanceMode: boolean;
  registrationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  sessionTimeoutMinutes: number;
  require2fa: boolean;
  lastFetch: number;
}

let systemSettingsCache: SystemSettingsCache | null = null;
const SYSTEM_SETTINGS_CACHE_TTL = 30000; // 30 seconds

export async function getSystemSettings(): Promise<SystemSettingsCache> {
  const now = Date.now();
  if (systemSettingsCache && (now - systemSettingsCache.lastFetch) < SYSTEM_SETTINGS_CACHE_TTL) {
    return systemSettingsCache;
  }

  try {
    const configs = await storage.getPlatformConfigsByCategory('system_settings');
    const settingsMap = new Map<string, string>();
    for (const config of configs) {
      settingsMap.set(config.configKey, config.configValue);
    }

    systemSettingsCache = {
      maintenanceMode: settingsMap.get('maintenance_mode') === 'true',
      registrationsEnabled: settingsMap.get('registrations_enabled') !== 'false',
      emailNotificationsEnabled: settingsMap.get('email_notifications_enabled') !== 'false',
      sessionTimeoutMinutes: parseInt(settingsMap.get('session_timeout_minutes') || '30', 10),
      require2fa: settingsMap.get('require_2fa') === 'true',
      lastFetch: now,
    };
  } catch (error) {
    console.error('[SystemSettings] Failed to fetch settings:', error);
    if (!systemSettingsCache) {
      systemSettingsCache = {
        maintenanceMode: false,
        registrationsEnabled: true,
        emailNotificationsEnabled: true,
        sessionTimeoutMinutes: 30,
        require2fa: false,
        lastFetch: now,
      };
    }
  }

  return systemSettingsCache;
}

// Clear cache when settings change (call this from admin update endpoints)
export function invalidateSystemSettingsCache() {
  systemSettingsCache = null;
}

// Maintenance Mode Middleware - Block non-admin users when enabled
app.use(async (req, res, next) => {
  // Skip for static assets and certain paths
  const skipPaths = [
    '/api/system/status',
    '/api/auth/login',
    '/api/admin/login',
    '/api/gold-price',
    '/api/platform-config/public',
    '/api/branding',
    '/uploads/',
    '/assets/',
    '/@',
    '/node_modules/',
  ];
  
  if (skipPaths.some(p => req.path.startsWith(p)) || !req.path.startsWith('/api/')) {
    return next();
  }

  try {
    const settings = await getSystemSettings();
    
    if (settings.maintenanceMode) {
      // Allow admin users through
      if (req.session?.userRole === 'admin') {
        return next();
      }
      
      // Block all other API requests during maintenance
      return res.status(503).json({
        message: 'Platform is currently under maintenance. Please try again later.',
        maintenanceMode: true,
      });
    }
    
    // Apply session timeout from settings
    if (req.session?.cookie && settings.sessionTimeoutMinutes > 0) {
      req.session.cookie.maxAge = settings.sessionTimeoutMinutes * 60 * 1000;
    }
  } catch (error) {
    console.error('[MaintenanceMiddleware] Error:', error);
  }

  next();
});

// System status endpoint (always accessible)
app.get('/api/system/status', async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json({
      maintenanceMode: settings.maintenanceMode,
      registrationsEnabled: settings.registrationsEnabled,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
      isAdmin: req.session?.userRole === 'admin',
    });
  } catch (error) {
    res.json({ maintenanceMode: false, registrationsEnabled: true, sessionTimeoutMinutes: 30 });
  }
});

// CSRF Protection: Require custom header for state-changing requests
// This prevents CSRF attacks since browsers won't add custom headers to cross-origin requests
app.use((req, res, next) => {
  const isStateChangingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isApiRoute = req.path.startsWith('/api/');
  
  // Endpoints that don't require CSRF header (webhooks, public auth, external callbacks)
  const csrfExemptPaths = [
    // Authentication (public endpoints)
    '/api/auth/login',
    '/api/auth/register', 
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/send-verification',
    '/api/auth/verify-email',
    '/api/admin/login',
    // MFA verification (stateless with challenge token)
    '/api/mfa/verify',
    // Public/read-like endpoints
    '/api/contact',
    '/api/gold-price',
    '/api/geo-restriction/check',
    '/api/platform-config/public',
    '/api/cms/pages',
    '/api/branding',
    '/api/fees',
    '/api/verify-certificate',
    '/api/certificates/verify',
    // External webhooks (no browser context)
    '/api/webhooks',
    '/api/binancepay/webhook',
    '/api/ngenius/webhook',
    '/api/stripe/webhook',
    // B2B API (uses API key authentication)
    '/api/b2b/',
    '/api/wingold/webhooks',
  ];
  
  const isExempt = csrfExemptPaths.some(path => req.path.startsWith(path));
  
  if (isStateChangingMethod && isApiRoute && !isExempt) {
    const csrfHeader = req.headers['x-requested-with'];
    if (csrfHeader !== 'XMLHttpRequest') {
      return res.status(403).json({ 
        message: 'CSRF validation failed. Please refresh the page and try again.' 
      });
    }
  }
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Redis connection
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      console.log('[Redis] Connected and ready');
    } else {
      console.log('[Redis] Using in-memory fallback');
    }
  } catch (error) {
    console.warn('[Redis] Connection failed, using in-memory fallback:', error);
  }

  // Seed default platform configuration
  try {
    await storage.seedDefaultPlatformConfig();
  } catch (error) {
    console.error('[Platform Config] Failed to seed defaults:', error);
  }
  
  // Seed default chat agents
  try {
    await storage.seedDefaultChatAgents();
    console.log('[Chat Agents] Default agents seeded successfully');
  } catch (error) {
    console.error('[Chat Agents] Failed to seed defaults:', error);
  }

  // Seed knowledge base categories
  try {
    await storage.seedDefaultKnowledgeBase();
  } catch (error) {
    console.error('[Knowledge Base] Failed to seed defaults:', error);
  }
  
  // Initialize enterprise job queue system
  try {
    const { initializeJobQueues } = await import('./job-queue');
    const { startJobProcessors } = await import('./job-processor');
    initializeJobQueues();
    startJobProcessors();
    console.log('[Enterprise] Background job processing enabled');
  } catch (error) {
    console.warn('[Enterprise] Job queue initialization skipped:', error);
  }
  
  // AUTO-REPAIR: Fix all corrupted wallets and orphaned transfers on startup
  try {
    const { runAllRepairs, startExpiryScheduler } = await import('./repair-wallet');
    await runAllRepairs();
    // Start the periodic scheduler for expiring unclaimed invitation transfers
    startExpiryScheduler();
  } catch (error) {
    console.warn('[Data Repair] Automatic repair failed:', error);
  }
  
  // Start database sync scheduler (AWS RDS → Replit every 6 hours)
  try {
    const { startSyncScheduler } = await import('./database-sync-scheduler');
    startSyncScheduler();
  } catch (error) {
    console.warn('[DB Sync] Scheduler initialization failed:', error);
  }
  
  // Setup Socket.IO for real-time chat
  setupSocketIO(httpServer);
  
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Send error notification for server errors (5xx)
    if (status >= 500) {
      import('./system-notifications').then(({ notifyError }) => {
        notifyError({
          error: err,
          context: 'Express Global Error Handler',
          route: `${req.method} ${req.path}`,
          userId: (req as any).user?.id,
          requestData: {
            contentType: req.get('content-type'),
            userAgent: req.get('user-agent')?.substring(0, 100),
            queryKeys: Object.keys(req.query || {}),
            bodyKeys: req.body ? Object.keys(req.body) : [],
          },
        }).catch(console.error);
      }).catch(console.error);
    }

    res.status(status).json({ message });
    console.error(`[Error] ${req.method} ${req.path}:`, message);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
