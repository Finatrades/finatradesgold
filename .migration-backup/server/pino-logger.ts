/**
 * Pino Logger - Banking-Grade High-Performance Logging
 * 
 * Pino is 10x faster than Winston and provides:
 * - Low overhead structured JSON logging
 * - Async logging to prevent blocking
 * - Child loggers for request context
 * - Redaction of sensitive data
 * - Pretty printing for development
 */

import pino, { Logger, LoggerOptions, DestinationStream } from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const sensitiveFields = [
  'password',
  'hashedPassword',
  'pin',
  'hashedPin',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secretKey',
  'privateKey',
  'cardNumber',
  'cvv',
  'ssn',
  'taxId',
  'backupCodes',
  'secret',
  'otp',
  'verificationCode',
];

function createRedactionPaths(): string[] {
  const paths: string[] = [];
  
  sensitiveFields.forEach(field => {
    paths.push(field);
    paths.push(`*.${field}`);
    paths.push(`*.*.${field}`);
    paths.push(`req.body.${field}`);
    paths.push(`req.headers.authorization`);
    paths.push(`req.headers.cookie`);
  });
  
  return paths;
}

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  
  redact: {
    paths: createRedactionPaths(),
    censor: '[REDACTED]',
  },
  
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      service: 'finatrades',
      version: process.env.npm_package_version || '1.0.0',
    }),
  },
  
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  
  base: {
    env: process.env.NODE_ENV,
  },
  
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      remoteAddress: req.ip || req.remoteAddress,
      userAgent: req.headers?.['user-agent'],
      requestId: req.id,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      responseTime: res.responseTime,
    }),
    err: pino.stdSerializers.err,
    user: (user) => ({
      id: user?.id,
      email: user?.email ? `${user.email.slice(0, 3)}***` : undefined,
      role: user?.role,
    }),
  },
};

let transport: DestinationStream | undefined;

if (!isProduction) {
  try {
    transport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname,service,version,env',
        messageFormat: '{msg}',
        errorLikeObjectKeys: ['err', 'error'],
      },
    });
  } catch (error) {
    console.warn('[Pino] pino-pretty not available, using JSON output');
  }
}

const rootLogger: Logger = transport 
  ? pino(baseOptions, transport)
  : pino(baseOptions);

export function createRequestLogger(requestId: string, userId?: string): Logger {
  return rootLogger.child({
    requestId,
    userId,
    context: 'request',
  });
}

export function createServiceLogger(serviceName: string): Logger {
  return rootLogger.child({
    service: serviceName,
    context: 'service',
  });
}

export function createAuditLogger(): Logger {
  return rootLogger.child({
    context: 'audit',
    type: 'audit_log',
  });
}

export interface AuditLogEntry {
  action: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

const auditLogger = createAuditLogger();

export function logAudit(entry: AuditLogEntry): void {
  const logMethod = entry.success ? auditLogger.info : auditLogger.warn;
  
  logMethod.call(auditLogger, {
    audit: true,
    ...entry,
    timestamp: new Date().toISOString(),
  }, `AUDIT: ${entry.action} on ${entry.resourceType}${entry.resourceId ? ` (${entry.resourceId})` : ''}`);
}

export function logTransaction(details: {
  txId: string;
  type: string;
  fromUserId?: string;
  toUserId?: string;
  amount: string;
  currency: string;
  status: 'initiated' | 'pending' | 'completed' | 'failed' | 'reversed';
  metadata?: Record<string, any>;
}): void {
  rootLogger.info({
    transaction: true,
    ...details,
    timestamp: new Date().toISOString(),
  }, `TX: ${details.type} ${details.amount} ${details.currency} - ${details.status}`);
}

export function logSecurity(details: {
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}): void {
  const logMethod = details.severity === 'critical' || details.severity === 'high'
    ? rootLogger.error
    : details.severity === 'medium'
    ? rootLogger.warn
    : rootLogger.info;
  
  logMethod.call(rootLogger, {
    security: true,
    ...details,
    timestamp: new Date().toISOString(),
  }, `SECURITY [${details.severity.toUpperCase()}]: ${details.event}`);
}

export function logPerformance(details: {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}): void {
  if (details.duration > 1000) {
    rootLogger.warn({
      performance: true,
      ...details,
      slow: true,
    }, `SLOW: ${details.operation} took ${details.duration}ms`);
  } else {
    rootLogger.debug({
      performance: true,
      ...details,
    }, `PERF: ${details.operation} completed in ${details.duration}ms`);
  }
}

export { rootLogger as logger };
export default rootLogger;
