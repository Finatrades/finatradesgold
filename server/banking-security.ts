/**
 * Banking-Grade Security Module
 * 
 * Centralized exports for all banking-grade security libraries:
 * - PASETO tokens (replaces JWT for internal auth)
 * - Argon2 password hashing (OWASP recommended)
 * - BullMQ job queues (reliable settlements)
 * - Pino structured logging (compliance audit trails)
 * - OpenTelemetry distributed tracing
 * 
 * Usage:
 *   import { hashPassword, verifyPassword, logger } from './banking-security';
 */

export * from './password-utils';

export * from './paseto-auth';

export { 
  logger,
  createRequestLogger,
  createServiceLogger,
  createAuditLogger,
  logAudit,
  logTransaction,
  logSecurity,
  logPerformance,
} from './pino-logger';

export { initializeOpenTelemetry, shutdownOpenTelemetry } from './opentelemetry';

export {
  initializeJobQueues as initializeBullMQ,
  getQueue as getBullMQQueue,
  addEmailJob,
  addPdfJob,
  addNotificationJob,
  addCertificateJob,
  addSettlementJob,
  addReconciliationJob,
  getJobStatus,
  getQueueStats,
  closeAllQueues,
} from './job-queue-bullmq';

export const SECURITY_LIBRARIES = {
  passwordHashing: 'argon2id',
  tokenAuth: 'paseto-v4',
  jobQueue: 'bullmq',
  logging: 'pino',
  tracing: 'opentelemetry',
};

export function getBankingSecurityInfo() {
  return {
    version: '1.0.0',
    libraries: SECURITY_LIBRARIES,
    features: [
      'OWASP-compliant password hashing (Argon2id)',
      'Banking-grade tokens (PASETO v4)',
      'Reliable job processing (BullMQ)',
      'High-performance structured logging (Pino)',
      'Distributed tracing (OpenTelemetry)',
      'Automatic password migration from bcrypt',
      'Sensitive data redaction in logs',
    ],
  };
}
