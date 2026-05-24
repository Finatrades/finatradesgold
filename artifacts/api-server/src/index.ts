import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerR2ProxyRoutes } from "./r2-proxy";

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
import cookieParser from "cookie-parser";
import { csrfProtection, getCsrfTokenHandler, sanitizeRequest } from "./security-middleware";
import { runMigrations } from "./migrate";

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

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: "user" | "admin";
    adminPortal?: boolean;
    permissions?: Record<string, Record<string, boolean>>;
    permissionsCachedAt?: number;
    isSuperAdmin?: boolean;
  }
}

const app = express();

// Trust proxy for production (required for secure cookies behind Replit's reverse proxy)
app.set('trust proxy', 1);

// Fast healthcheck endpoints registered FIRST, before any middleware,
// so platform health probes always get an immediate response even during
// heavy boot (job queues, redis, schedulers, route registration, etc).
// NOTE: paths are NOT rewritten by the proxy — server receives the full path.
// artifact.toml health probe hits /api/healthz, so we must register that path.
app.get('/health', (_req, res) => res.status(200).send('ok'));
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get('/api/health', (_req, res) => res.status(200).json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  version: '1.0.0',
}));
app.get('/api/healthz', (_req, res) => res.status(200).send('ok'));

// HTTPS enforcement in production - redirect HTTP to HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Skip redirect for healthcheck paths so platform probes never get a 301
    if (req.path === '/health' || req.path === '/healthz' || req.path === '/api/health') {
      return next();
    }
    // Only redirect when the proxy explicitly tells us the request was over http.
    // Internal platform probes (autoscale healthchecks, deployment promote checks)
    // bypass the public proxy and so do NOT set x-forwarded-proto. Redirecting
    // those probes returns a 301 which the platform treats as a failed healthcheck.
    const proto = req.headers['x-forwarded-proto'];
    if (typeof proto === 'string' && proto.toLowerCase() === 'http') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security headers with helmet
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Nonces preferred but payment providers require inline scripts
        "'unsafe-inline'",
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
      upgradeInsecureRequests: [],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xContentTypeOptions: true,
  xFrameOptions: false,
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

// Serve uploaded files with authentication - protects sensitive documents
app.use('/uploads', (req, res, next) => {
  // Check if user is authenticated
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Authentication required to access documents' });
  }
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// Serve attached_assets for product images (public assets only, no sensitive data)
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Serve public folder for static documents (PDFs, guides, etc.)
app.use('/docs', express.static(path.join(process.cwd(), 'public')));
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

// Cookie parser for CSRF tokens
app.use(cookieParser());

// Request sanitization (prototype pollution protection)
app.use(sanitizeRequest);

// CSRF protection - applied globally to all state-changing requests
app.use(csrfProtection);

// CSRF token endpoint - frontend fetches this on load
app.get('/api/csrf-token', getCsrfTokenHandler);

// General API rate limiting - protect against abuse (100 requests/minute)
// Note: Specific endpoints have stricter limits (auth, OTP, password reset, withdrawals)
app.use('/api', apiRateLimiter);

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
    '/api/unified/callback/wingold-order', // Wingold order webhooks
    '/api/wingold/webhooks',
    // SSO token verification (server-to-server debug endpoint)
    '/api/sso/verify-token',
    // Admin-authenticated file uploads and testing
    '/api/admin/branding/logo',
    '/api/admin/email-test',
    '/api/documents/upload',
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
        const jsonStr = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure FINABRIDGE_AI_CALLBACK_SECRET is set — auto-generate if not configured
  // as a Replit Secret (so it's never committed to source control)
  if (!process.env.FINABRIDGE_AI_CALLBACK_SECRET) {
    process.env.FINABRIDGE_AI_CALLBACK_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('[Security] FINABRIDGE_AI_CALLBACK_SECRET auto-generated (ephemeral, changes on each restart).');
    console.warn('[Security] ACTION REQUIRED for production: add FINABRIDGE_AI_CALLBACK_SECRET to Replit Secrets panel for a stable persistent value.');
  }

  // Setup Socket.IO for real-time chat
  setupSocketIO(httpServer);

  // Register all HTTP routes (this also kicks off background email-template seeding internally)
  await registerRoutes(httpServer, app);


  registerR2ProxyRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.too.large') {
      console.error(`[BodyParser] Payload too large on ${req.method} ${req.path} - limit exceeded`);
      return res.status(413).json({ message: 'Request payload is too large. Please reduce the size of uploaded files.' });
    }
    if (err.type === 'entity.parse.failed') {
      console.error(`[BodyParser] JSON parse failed on ${req.method} ${req.path}`);
      return res.status(400).json({ message: 'Invalid request format.' });
    }
    const status = err.status || err.statusCode || 500;
    const isServerError = status >= 500;
    const isProd = process.env.NODE_ENV === 'production';
    
    // In production, don't expose internal error messages for 5xx errors
    const clientMessage = isServerError && isProd 
      ? "An unexpected error occurred. Please try again later."
      : (err.message || "Internal Server Error");

    // Send error notification for server errors (5xx)
    if (isServerError) {
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

    res.status(status).json({ message: clientMessage });
    // Log full error details on server (never sent to client in production)
    console.error(`[Error] ${req.method} ${req.path}:`, isProd ? err.message : err);
  });

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
      // Kick off all heavy background initialization AFTER the server is listening.
      // This guarantees the platform's promote/healthcheck probe always finds an open
      // port and a fast-responding /health endpoint, even though full warm-up may
      // take another 30-60 seconds in the background.
      void initializeBackgroundServices();
    },
  );
})();

/**
 * Background initialization: migrations, Redis, seed data, job queues, schedulers,
 * and the AI document verification worker. Runs after the HTTP server is already
 * listening so it cannot delay the platform's healthcheck/promote probe.
 */
async function initializeBackgroundServices(): Promise<void> {
  // Run pending database migrations first — after port is bound so deploy never
  // times out waiting for a large migration file with many already-existing objects.
  try {
    await runMigrations();
  } catch (err) {
    console.error('[Migrations] Background migration failed:', err);
    // Non-fatal: production schema is already applied; log and continue.
  }

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
    initializeJobQueues();
    const { startEmailQueueProcessor } = await import('./email');
    startEmailQueueProcessor();
    console.log('[Enterprise] Background job processing enabled');
  } catch (error) {
    console.warn('[Enterprise] Job queue initialization skipped:', error);
  }

  // Initialize AI document verification worker
  try {
    const { initializeVerifyDocumentWorker } = await import('./jobs/verify-document.job');
    initializeVerifyDocumentWorker();
    console.log('[Enterprise] AI document verification worker enabled');
  } catch (error) {
    console.warn('[Enterprise] AI document verification worker skipped:', error);
  }

  // Initialize Warehouse Receipt PDF generation worker
  try {
    const { initializeIssueWrWorker } = await import('./jobs/issue-wr.job');
    initializeIssueWrWorker();
    console.log('[Enterprise] Warehouse Receipt PDF worker enabled');
  } catch (error) {
    console.warn('[Enterprise] Warehouse Receipt PDF worker skipped:', error);
  }
}
