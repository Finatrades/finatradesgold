import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';

const WINGOLD_WEBHOOK_SECRET = process.env.WINGOLD_WEBHOOK_SECRET;
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const WINGOLD_PRODUCTION_IPS = process.env.WINGOLD_ALLOWED_IPS 
  ? process.env.WINGOLD_ALLOWED_IPS.split(',').map(ip => ip.trim())
  : [];

const WINGOLD_ALLOWED_IPS = IS_PRODUCTION 
  ? WINGOLD_PRODUCTION_IPS
  : ['127.0.0.1', '::1', '::ffff:127.0.0.1', '0.0.0.0/0'];

const processedWebhooks = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

const webhookRequestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 100;

export interface SecurityAuditEntry {
  timestamp: Date;
  eventType: string;
  orderId?: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  signatureValid: boolean;
  blocked: boolean;
  blockReason?: string;
  payload?: object;
}

const auditLog: SecurityAuditEntry[] = [];

export class WingoldSecurityService {
  static verifySignature(rawBody: string, signature: string, timestamp: string): { valid: boolean; reason?: string } {
    if (!WINGOLD_WEBHOOK_SECRET) {
      console.warn('[Security] WINGOLD_WEBHOOK_SECRET not configured - allowing in dev mode');
      return { valid: true, reason: 'dev_mode_no_secret' };
    }

    if (!signature) {
      return { valid: false, reason: 'missing_signature' };
    }

    if (!timestamp) {
      return { valid: false, reason: 'missing_timestamp' };
    }

    const timestampMs = new Date(timestamp).getTime();
    const now = Date.now();
    const drift = Math.abs(now - timestampMs);

    if (drift > TIMESTAMP_TOLERANCE_MS) {
      console.warn(`[Security] Timestamp drift too large: ${drift}ms (max: ${TIMESTAMP_TOLERANCE_MS}ms)`);
      return { valid: false, reason: `timestamp_expired_drift_${drift}ms` };
    }

    const data = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', WINGOLD_WEBHOOK_SECRET)
      .update(data)
      .digest('hex');

    const signatureValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!signatureValid) {
      return { valid: false, reason: 'invalid_signature' };
    }

    return { valid: true };
  }

  static checkIpWhitelist(ip: string): { allowed: boolean; reason?: string } {
    if (WINGOLD_ALLOWED_IPS.includes('0.0.0.0/0')) {
      return { allowed: true, reason: 'dev_mode_all_ips' };
    }

    const normalizedIp = ip.replace('::ffff:', '');
    
    for (const allowedIp of WINGOLD_ALLOWED_IPS) {
      if (allowedIp.includes('/')) {
        if (this.isIpInCidr(normalizedIp, allowedIp)) {
          return { allowed: true };
        }
      } else if (normalizedIp === allowedIp || ip === allowedIp) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: `ip_not_whitelisted_${ip}` };
  }

  private static isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    
    const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    const rangeNum = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    
    return (ipNum & mask) === (rangeNum & mask);
  }

  static checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const key = `webhook_${ip}`;
    
    let record = webhookRequestCounts.get(key);
    
    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      webhookRequestCounts.set(key, record);
    }
    
    record.count++;
    
    if (record.count > MAX_REQUESTS_PER_WINDOW) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }
    
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetAt: record.resetAt };
  }

  static checkIdempotency(orderId: string, eventType: string): { isDuplicate: boolean; processedAt?: number } {
    const key = `${orderId}_${eventType}`;
    const processedAt = processedWebhooks.get(key);
    
    if (processedAt) {
      if (Date.now() - processedAt < IDEMPOTENCY_WINDOW_MS) {
        return { isDuplicate: true, processedAt };
      }
      processedWebhooks.delete(key);
    }
    
    return { isDuplicate: false };
  }

  static markAsProcessed(orderId: string, eventType: string): void {
    const key = `${orderId}_${eventType}`;
    processedWebhooks.set(key, Date.now());
    
    if (processedWebhooks.size > 10000) {
      const cutoff = Date.now() - IDEMPOTENCY_WINDOW_MS;
      for (const [k, v] of processedWebhooks.entries()) {
        if (v < cutoff) {
          processedWebhooks.delete(k);
        }
      }
    }
  }

  static checkTransactionLimits(grams: number, usdAmount: number): { allowed: boolean; reason?: string } {
    const MAX_SINGLE_TRANSACTION_GRAMS = 10000;
    const MAX_SINGLE_TRANSACTION_USD = 1500000;
    
    if (grams > MAX_SINGLE_TRANSACTION_GRAMS) {
      return { allowed: false, reason: `exceeds_max_grams_${grams}_limit_${MAX_SINGLE_TRANSACTION_GRAMS}` };
    }
    
    if (usdAmount > MAX_SINGLE_TRANSACTION_USD) {
      return { allowed: false, reason: `exceeds_max_usd_${usdAmount}_limit_${MAX_SINGLE_TRANSACTION_USD}` };
    }
    
    return { allowed: true };
  }

  static logAuditEvent(entry: SecurityAuditEntry): void {
    auditLog.push(entry);
    
    if (auditLog.length > 10000) {
      auditLog.splice(0, 1000);
    }
    
    const level = entry.blocked ? 'SECURITY_ALERT' : 'AUDIT';
    console.log(`[${level}] Wingold Webhook: ${entry.eventType} from ${entry.ipAddress} - ${entry.blocked ? `BLOCKED: ${entry.blockReason}` : 'ALLOWED'}`);
  }

  static getAuditLog(limit: number = 100): SecurityAuditEntry[] {
    return auditLog.slice(-limit);
  }

  static getSecurityStats(): object {
    const blockedCount = auditLog.filter(e => e.blocked).length;
    const totalCount = auditLog.length;
    const last24h = auditLog.filter(e => Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000);
    
    return {
      totalWebhooks: totalCount,
      blockedWebhooks: blockedCount,
      blockRate: totalCount > 0 ? (blockedCount / totalCount * 100).toFixed(2) + '%' : '0%',
      last24hTotal: last24h.length,
      last24hBlocked: last24h.filter(e => e.blocked).length,
      activeIdempotencyKeys: processedWebhooks.size,
      rateLimitBuckets: webhookRequestCounts.size
    };
  }
}

export function wingoldSecurityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'];
  const signature = (req.headers['x-wingold-signature'] || req.headers['x-webhook-signature'] || '') as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string || '';
  
  let payload: any = {};
  let rawBody = '';
  
  try {
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
      payload = JSON.parse(rawBody);
    } else if (typeof req.body === 'object') {
      rawBody = JSON.stringify(req.body);
      payload = req.body;
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
      payload = JSON.parse(req.body);
    }
  } catch (e) {
    WingoldSecurityService.logAuditEvent({
      timestamp: new Date(),
      eventType: 'parse_error',
      ipAddress: ip,
      userAgent,
      signatureValid: false,
      blocked: true,
      blockReason: 'invalid_json_payload'
    });
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  const ipCheck = WingoldSecurityService.checkIpWhitelist(ip);
  if (!ipCheck.allowed) {
    WingoldSecurityService.logAuditEvent({
      timestamp: new Date(),
      eventType: payload.event || 'unknown',
      orderId: payload.orderId,
      ipAddress: ip,
      userAgent,
      signatureValid: false,
      blocked: true,
      blockReason: ipCheck.reason
    });
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const rateCheck = WingoldSecurityService.checkRateLimit(ip);
  if (!rateCheck.allowed) {
    WingoldSecurityService.logAuditEvent({
      timestamp: new Date(),
      eventType: payload.event || 'unknown',
      orderId: payload.orderId,
      ipAddress: ip,
      userAgent,
      signatureValid: false,
      blocked: true,
      blockReason: 'rate_limit_exceeded'
    });
    res.status(429).json({ 
      error: 'Rate limit exceeded', 
      retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) 
    });
    return;
  }

  const signatureCheck = WingoldSecurityService.verifySignature(rawBody, signature, timestamp);
  if (!signatureCheck.valid) {
    WingoldSecurityService.logAuditEvent({
      timestamp: new Date(),
      eventType: payload.event || 'unknown',
      orderId: payload.orderId,
      ipAddress: ip,
      userAgent,
      signatureValid: false,
      blocked: true,
      blockReason: signatureCheck.reason
    });
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  if (payload.orderId && payload.event) {
    const idempotencyCheck = WingoldSecurityService.checkIdempotency(payload.orderId, payload.event);
    if (idempotencyCheck.isDuplicate) {
      WingoldSecurityService.logAuditEvent({
        timestamp: new Date(),
        eventType: payload.event,
        orderId: payload.orderId,
        ipAddress: ip,
        userAgent,
        signatureValid: true,
        blocked: true,
        blockReason: `duplicate_webhook_processed_at_${idempotencyCheck.processedAt}`
      });
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
  }

  if (payload.data?.totalGrams && payload.data?.usdAmount) {
    const limitCheck = WingoldSecurityService.checkTransactionLimits(
      parseFloat(payload.data.totalGrams),
      parseFloat(payload.data.usdAmount)
    );
    if (!limitCheck.allowed) {
      WingoldSecurityService.logAuditEvent({
        timestamp: new Date(),
        eventType: payload.event || 'unknown',
        orderId: payload.orderId,
        userId: payload.data?.userId,
        ipAddress: ip,
        userAgent,
        signatureValid: true,
        blocked: true,
        blockReason: limitCheck.reason,
        payload: { grams: payload.data.totalGrams, usd: payload.data.usdAmount }
      });
      res.status(400).json({ error: 'Transaction exceeds limits' });
      return;
    }
  }

  WingoldSecurityService.logAuditEvent({
    timestamp: new Date(),
    eventType: payload.event || 'unknown',
    orderId: payload.orderId,
    userId: payload.data?.userId,
    ipAddress: ip,
    userAgent,
    signatureValid: true,
    blocked: false
  });

  (req as any).wingoldPayload = payload;
  (req as any).wingoldRawBody = rawBody;

  next();
}

export function wingoldSecurityPostProcessor(orderId: string, eventType: string): void {
  WingoldSecurityService.markAsProcessed(orderId, eventType);
}
