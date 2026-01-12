/**
 * BullMQ Job Queue - Banking-Grade Reliability
 * 
 * BullMQ is the next generation of Bull with:
 * - Better performance and reliability
 * - Native support for TypeScript
 * - Improved job lifecycle management
 * - Better rate limiting
 * - Sandboxed processors
 * - Job batching
 */

import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';

const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

interface JobQueues {
  email: Queue | null;
  pdf: Queue | null;
  fileUpload: Queue | null;
  notification: Queue | null;
  certificate: Queue | null;
  settlement: Queue | null;
  reconciliation: Queue | null;
}

interface Workers {
  email: Worker | null;
  pdf: Worker | null;
  fileUpload: Worker | null;
  notification: Worker | null;
  certificate: Worker | null;
  settlement: Worker | null;
  reconciliation: Worker | null;
}

const queues: JobQueues = {
  email: null,
  pdf: null,
  fileUpload: null,
  notification: null,
  certificate: null,
  settlement: null,
  reconciliation: null,
};

const workers: Workers = {
  email: null,
  pdf: null,
  fileUpload: null,
  notification: null,
  certificate: null,
  settlement: null,
  reconciliation: null,
};

function cleanRedisUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  while (url.startsWith('REDIS_URL=')) {
    url = url.substring('REDIS_URL='.length);
  }
  url = url.replace(/^["']|["']$/g, '');
  while (url.startsWith('REDIS_URL=')) {
    url = url.substring('REDIS_URL='.length);
  }
  return url.replace(/^["']|["']$/g, '');
}

function getRedisConnection(): { host: string; port: number; password?: string; tls?: {} } | null {
  if (!REDIS_URL) {
    return null;
  }

  try {
    const cleanUrl = cleanRedisUrl(REDIS_URL);
    const url = new URL(cleanUrl);
    const isUpstash = cleanUrl.includes('upstash.io');
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      ...(isUpstash ? { tls: {} } : {}),
    };
  } catch (error) {
    console.error('[BullMQ] Failed to parse Redis URL:', error);
    return null;
  }
}

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

function createQueue(name: string): Queue | null {
  const connection = getRedisConnection();
  if (!connection) {
    console.log(`[BullMQ] No Redis connection, ${name} queue disabled`);
    return null;
  }

  try {
    const queue = new Queue(`finatrades:${name}`, {
      connection,
      defaultJobOptions,
    });

    queue.on('error', (error) => {
      console.error(`[BullMQ] ${name} queue error:`, error.message);
    });

    console.log(`[BullMQ] ${name} queue initialized`);
    return queue;
  } catch (error) {
    console.error(`[BullMQ] Failed to create ${name} queue:`, error);
    return null;
  }
}

export function initializeJobQueues(): void {
  console.log('[BullMQ] Initializing enterprise job queue system...');
  
  queues.email = createQueue('email');
  queues.pdf = createQueue('pdf');
  queues.fileUpload = createQueue('file-upload');
  queues.notification = createQueue('notification');
  queues.certificate = createQueue('certificate');
  queues.settlement = createQueue('settlement');
  queues.reconciliation = createQueue('reconciliation');
  
  console.log('[BullMQ] Job queue system ready');
}

export function getQueue(name: keyof JobQueues): Queue | null {
  return queues[name];
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}

export interface PdfJobData {
  type: 'invoice' | 'certificate' | 'report' | 'statement';
  userId: string;
  data: Record<string, any>;
  callbackUrl?: string;
}

export interface FileUploadJobData {
  userId: string;
  fileBuffer: string;
  fileName: string;
  mimeType: string;
  destination: string;
}

export interface NotificationJobData {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'transaction';
  link?: string;
}

export interface CertificateJobData {
  userId: string;
  type: 'vault' | 'ownership' | 'transaction';
  data: Record<string, any>;
}

export interface SettlementJobData {
  settlementId: string;
  type: 'T+0' | 'T+1' | 'T+2';
  amount: string;
  currency: string;
  parties: {
    from: string;
    to: string;
  };
}

export interface ReconciliationJobData {
  type: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  accounts: string[];
}

function getPriority(priority?: 'high' | 'normal' | 'low'): number {
  switch (priority) {
    case 'high': return 1;
    case 'low': return 10;
    default: return 5;
  }
}

export async function addEmailJob(data: EmailJobData): Promise<string | null> {
  const queue = queues.email;
  if (!queue) {
    console.log('[BullMQ] Email queue not available, processing synchronously');
    return null;
  }

  const job = await queue.add('send-email', data, { 
    priority: getPriority(data.priority),
    attempts: 5,
  });
  console.log(`[BullMQ] Email job ${job.id} added for ${data.to}`);
  return job.id || null;
}

export async function addPdfJob(data: PdfJobData): Promise<string | null> {
  const queue = queues.pdf;
  if (!queue) {
    console.log('[BullMQ] PDF queue not available, processing synchronously');
    return null;
  }

  const job = await queue.add('generate-pdf', data, { priority: 5 });
  console.log(`[BullMQ] PDF job ${job.id} added for ${data.type}`);
  return job.id || null;
}

export async function addNotificationJob(data: NotificationJobData): Promise<string | null> {
  const queue = queues.notification;
  if (!queue) {
    return null;
  }

  const job = await queue.add('send-notification', data, { priority: 3 });
  return job.id || null;
}

export async function addCertificateJob(data: CertificateJobData): Promise<string | null> {
  const queue = queues.certificate;
  if (!queue) {
    return null;
  }

  const job = await queue.add('generate-certificate', data, { priority: 5 });
  console.log(`[BullMQ] Certificate job ${job.id} added for ${data.type}`);
  return job.id || null;
}

export async function addSettlementJob(data: SettlementJobData): Promise<string | null> {
  const queue = queues.settlement;
  if (!queue) {
    console.log('[BullMQ] Settlement queue not available');
    return null;
  }

  const job = await queue.add('process-settlement', data, { 
    priority: 1,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
  console.log(`[BullMQ] Settlement job ${job.id} added for ${data.settlementId}`);
  return job.id || null;
}

export async function addReconciliationJob(data: ReconciliationJobData): Promise<string | null> {
  const queue = queues.reconciliation;
  if (!queue) {
    console.log('[BullMQ] Reconciliation queue not available');
    return null;
  }

  const job = await queue.add('run-reconciliation', data, { priority: 5 });
  console.log(`[BullMQ] Reconciliation job ${job.id} added for ${data.type}`);
  return job.id || null;
}

export async function getJobStatus(queueName: keyof JobQueues, jobId: string): Promise<{
  status: string;
  progress: number;
  result?: any;
  error?: string;
} | null> {
  const queue = queues[queueName];
  if (!queue) return null;

  const job = await queue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  return {
    status: state,
    progress: job.progress as number || 0,
    result: job.returnvalue,
    error: job.failedReason,
  };
}

export async function getQueueStats(): Promise<Record<string, any>> {
  const stats: Record<string, any> = {};
  
  for (const [name, queue] of Object.entries(queues)) {
    if (queue) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);
      
      stats[name] = { waiting, active, completed, failed, delayed };
    } else {
      stats[name] = { status: 'disabled' };
    }
  }
  
  return stats;
}

export async function pauseQueue(queueName: keyof JobQueues): Promise<boolean> {
  const queue = queues[queueName];
  if (!queue) return false;
  
  await queue.pause();
  console.log(`[BullMQ] ${queueName} queue paused`);
  return true;
}

export async function resumeQueue(queueName: keyof JobQueues): Promise<boolean> {
  const queue = queues[queueName];
  if (!queue) return false;
  
  await queue.resume();
  console.log(`[BullMQ] ${queueName} queue resumed`);
  return true;
}

export async function drainQueue(queueName: keyof JobQueues): Promise<boolean> {
  const queue = queues[queueName];
  if (!queue) return false;
  
  await queue.drain();
  console.log(`[BullMQ] ${queueName} queue drained`);
  return true;
}

export async function closeAllQueues(): Promise<void> {
  console.log('[BullMQ] Closing all queues...');
  
  for (const [name, worker] of Object.entries(workers)) {
    if (worker) {
      await worker.close();
      console.log(`[BullMQ] ${name} worker closed`);
    }
  }
  
  for (const [name, queue] of Object.entries(queues)) {
    if (queue) {
      await queue.close();
      console.log(`[BullMQ] ${name} queue closed`);
    }
  }
}

export { queues, workers };
