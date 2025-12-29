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
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
      frameSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
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
  
  // ONE-TIME FIX: Repair corrupted wallet for user 8e293290-ac1b-4a0b-9b0a-d977e03a3df6
  try {
    const corruptedUserId = '8e293290-ac1b-4a0b-9b0a-d977e03a3df6';
    const wallet = await storage.getWallet(corruptedUserId);
    if (wallet) {
      const currentValue = wallet.goldGrams;
      const isCorrupted = currentValue === null || currentValue === undefined || 
                          (typeof currentValue === 'string' && (currentValue === 'NaN' || currentValue === 'null')) ||
                          (typeof currentValue === 'number' && isNaN(currentValue)) ||
                          parseFloat(String(currentValue)) === 0 || isNaN(parseFloat(String(currentValue)));
      
      if (isCorrupted) {
        // Recalculate from transactions
        const transactions = await storage.getUserTransactions(corruptedUserId);
        let calculatedBalance = 0;
        
        for (const tx of transactions) {
          if (tx.status !== 'Completed') continue;
          const goldAmount = parseFloat(tx.amountGold || '0');
          if (isNaN(goldAmount)) continue;
          
          switch (tx.type) {
            case 'Buy':
            case 'Receive':
            case 'Deposit':
              calculatedBalance += goldAmount;
              break;
            case 'Sell':
            case 'Send':
            case 'Withdrawal':
              calculatedBalance -= goldAmount;
              break;
          }
        }
        
        calculatedBalance = Math.max(0, calculatedBalance);
        await storage.updateWallet(wallet.id, { goldGrams: calculatedBalance.toFixed(6) });
        console.log(`[Wallet Repair] Fixed corrupted wallet: ${currentValue} -> ${calculatedBalance.toFixed(6)}g`);
      }
    }
  } catch (error) {
    console.warn('[Wallet Repair] One-time fix failed:', error);
  }
  
  // Setup Socket.IO for real-time chat
  setupSocketIO(httpServer);
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
