import Queue from 'bull';
import { getRedisClient } from './redis-client';

const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

interface JobQueues {
  email: Queue.Queue | null;
  pdf: Queue.Queue | null;
  fileUpload: Queue.Queue | null;
  notification: Queue.Queue | null;
  certificate: Queue.Queue | null;
}

const queues: JobQueues = {
  email: null,
  pdf: null,
  fileUpload: null,
  notification: null,
  certificate: null,
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

function createQueue(name: string): Queue.Queue | null {
  if (!REDIS_URL) {
    console.log(`[JobQueue] No Redis URL configured, ${name} queue disabled`);
    return null;
  }

  try {
    const cleanUrl = cleanRedisUrl(REDIS_URL);
    const isUpstash = cleanUrl.includes('upstash.io');
    
    const queue = new Queue(name, cleanUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
      redis: isUpstash ? { tls: {} } : undefined,
    });

    queue.on('error', (error) => {
      console.error(`[JobQueue] ${name} queue error:`, error.message);
    });

    queue.on('failed', (job, error) => {
      console.error(`[JobQueue] Job ${job.id} in ${name} failed:`, error.message);
    });

    console.log(`[JobQueue] ${name} queue initialized`);
    return queue;
  } catch (error) {
    console.error(`[JobQueue] Failed to create ${name} queue:`, error);
    return null;
  }
}

export function initializeJobQueues(): void {
  console.log('[JobQueue] Initializing enterprise job queue system...');
  
  queues.email = createQueue('finatrades:email');
  queues.pdf = createQueue('finatrades:pdf');
  queues.fileUpload = createQueue('finatrades:file-upload');
  queues.notification = createQueue('finatrades:notification');
  queues.certificate = createQueue('finatrades:certificate');
  
  console.log('[JobQueue] Job queue system ready');
}

export function getQueue(name: keyof JobQueues): Queue.Queue | null {
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

export async function addEmailJob(data: EmailJobData): Promise<string | null> {
  const queue = queues.email;
  if (!queue) {
    console.log('[JobQueue] Email queue not available, processing synchronously');
    return null;
  }

  const priority = data.priority === 'high' ? 1 : data.priority === 'low' ? 10 : 5;
  const job = await queue.add(data, { priority });
  console.log(`[JobQueue] Email job ${job.id} added for ${data.to}`);
  return job.id.toString();
}

export async function addPdfJob(data: PdfJobData): Promise<string | null> {
  const queue = queues.pdf;
  if (!queue) {
    console.log('[JobQueue] PDF queue not available, processing synchronously');
    return null;
  }

  const job = await queue.add(data, { priority: 5 });
  console.log(`[JobQueue] PDF job ${job.id} added for ${data.type}`);
  return job.id.toString();
}

export async function addNotificationJob(data: NotificationJobData): Promise<string | null> {
  const queue = queues.notification;
  if (!queue) {
    return null;
  }

  const job = await queue.add(data, { priority: 3 });
  return job.id.toString();
}

export async function addCertificateJob(data: CertificateJobData): Promise<string | null> {
  const queue = queues.certificate;
  if (!queue) {
    return null;
  }

  const job = await queue.add(data, { priority: 5 });
  console.log(`[JobQueue] Certificate job ${job.id} added for ${data.type}`);
  return job.id.toString();
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
    progress: job.progress() as number,
    result: job.returnvalue,
    error: job.failedReason,
  };
}

export async function getQueueStats(): Promise<Record<string, any>> {
  const stats: Record<string, any> = {};
  
  for (const [name, queue] of Object.entries(queues)) {
    if (queue) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      
      stats[name] = { waiting, active, completed, failed };
    } else {
      stats[name] = { status: 'disabled' };
    }
  }
  
  return stats;
}

export async function closeAllQueues(): Promise<void> {
  console.log('[JobQueue] Closing all queues...');
  
  for (const [name, queue] of Object.entries(queues)) {
    if (queue) {
      await queue.close();
      console.log(`[JobQueue] ${name} queue closed`);
    }
  }
}
