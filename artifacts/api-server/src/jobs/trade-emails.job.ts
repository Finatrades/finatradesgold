import { Queue, Worker, Job } from 'bullmq';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import { storage } from '../storage';

const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
const QUEUE_NAME = 'trade-emails';

export type TradeEmailJobData =
  | {
      kind: 'trade_case_status';
      caseId: string;
      caseRef: string;
      ownerUserId: string;
      newStatus: string | null;
      previousStatus: string | null;
      tradeValueUsd: string;
      notes: string;
      requestDocuments: boolean;
      appBaseUrl: string;
    }
  | {
      kind: 'trade_document_uploaded';
      documentId: string;
      caseId: string;
      documentType: string;
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

function getRedisConnection(): { host: string; port: number; password?: string; tls?: object } | null {
  if (!REDIS_URL) return null;
  try {
    const cleanUrl = cleanRedisUrl(REDIS_URL);
    const parsed = new URL(cleanUrl);
    const isUpstash = cleanUrl.includes('upstash.io');
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      ...(isUpstash ? { tls: {} } : {}),
    };
  } catch {
    return null;
  }
}

// Backoff delays: attempt 1 = 30s, attempt 2 = 2min, attempt 3 = 5min
const BACKOFF_DELAYS_MS = [30_000, 120_000, 300_000];

let tradeEmailsQueue: Queue<TradeEmailJobData> | null = null;
let tradeEmailsWorker: Worker<TradeEmailJobData> | null = null;

export function getTradeEmailsQueue(): Queue<TradeEmailJobData> | null {
  return tradeEmailsQueue;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function handleTradeCaseStatus(data: Extract<TradeEmailJobData, { kind: 'trade_case_status' }>): Promise<void> {
  const caseUser = await storage.getUser(data.ownerUserId);
  if (!caseUser?.email) {
    console.log(`[TradeEmails] No email for user ${data.ownerUserId} — skipping`);
    return;
  }
  const userName = `${caseUser.firstName || ''} ${caseUser.lastName || ''}`.trim() || 'Valued Client';
  const statusChanged = data.previousStatus !== data.newStatus;

  if (data.requestDocuments) {
    await sendEmail(caseUser.email, EMAIL_TEMPLATES.TRADE_DOCUMENT_REQUEST, {
      user_name: userName,
      case_id: data.caseRef,
      required_documents: data.notes || 'Please log in to view the required documents.',
      upload_url: `${data.appBaseUrl}/trade-finance`,
    }, { userId: caseUser.id });
    await storage.createNotification({
      userId: caseUser.id,
      title: 'Documents Required',
      message: `Additional documents are required for your trade finance case ${data.caseRef}. Please upload them promptly.`,
      type: 'trade',
      link: '/trade-finance',
      read: false,
    }).catch(() => {});
  }

  if (statusChanged) {
    const newStatus = data.newStatus;
    if (newStatus === 'Approved') {
      await sendEmail(caseUser.email, EMAIL_TEMPLATES.TRADE_CASE_APPROVED, {
        user_name: userName,
        case_id: data.caseRef,
        credit_limit: data.tradeValueUsd,
        valid_until: 'As per agreement',
      }, { userId: caseUser.id });
    } else if (newStatus === 'Rejected' || newStatus === 'Cancelled') {
      await sendEmail(caseUser.email, EMAIL_TEMPLATES.TRADE_CASE_REJECTED, {
        user_name: userName,
        trade_ref: data.caseRef,
        rejection_reason: data.notes || 'Does not meet current eligibility requirements.',
        rejection_date: formatDate(),
      }, { userId: caseUser.id });
    } else if (newStatus === 'Settled') {
      await sendEmail(caseUser.email, EMAIL_TEMPLATES.TRADE_CASE_COMPLETED, {
        user_name: userName,
        case_id: data.caseRef,
        total_value: data.tradeValueUsd,
        completion_date: formatDate(),
      }, { userId: caseUser.id });
    } else {
      await sendEmail(caseUser.email, EMAIL_TEMPLATES.TRADE_CASE_STATUS_UPDATE, {
        user_name: userName,
        case_id: data.caseRef,
        new_status: newStatus || 'Updated',
        update_date: formatDate(),
        status_notes: data.notes || 'Please log in to your account for more details.',
      }, { userId: caseUser.id });
    }
  }
}

async function handleTradeDocumentUploaded(data: Extract<TradeEmailJobData, { kind: 'trade_document_uploaded' }>): Promise<void> {
  const tradeCase = await storage.getTradeCase(data.caseId);
  if (!tradeCase) {
    console.log(`[TradeEmails] Trade case ${data.caseId} not found — skipping admin notification`);
    return;
  }
  const uploaderUser = await storage.getUser(tradeCase.userId);
  const uploaderName = uploaderUser
    ? `${uploaderUser.firstName || ''} ${uploaderUser.lastName || ''}`.trim() || uploaderUser.email
    : 'User';
  const adminEmails = await storage.getTradeOpsNotificationEmails();
  if (adminEmails.length === 0) {
    console.log('[TradeEmails] No trade ops notification recipients configured — skipping admin notification');
    return;
  }
  for (const adminEmail of adminEmails) {
    await sendEmail(adminEmail, EMAIL_TEMPLATES.TRADE_DOCUMENT_UPLOADED, {
      user_name: uploaderName,
      trade_ref: tradeCase.caseNumber,
      document_type: data.documentType || 'Document',
      uploaded_by: uploaderName,
      upload_date: formatDate(),
    });
  }
}

async function processTradeEmail(job: Job<TradeEmailJobData>): Promise<void> {
  const data = job.data;
  console.log(`[TradeEmails] Processing job ${job.id} kind=${data.kind} attempt=${job.attemptsMade + 1}`);
  switch (data.kind) {
    case 'trade_case_status':
      await handleTradeCaseStatus(data);
      return;
    case 'trade_document_uploaded':
      await handleTradeDocumentUploaded(data);
      return;
  }
}

export function initializeTradeEmailsWorker(): void {
  const connection = getRedisConnection();
  if (!connection) {
    console.log('[TradeEmails] No Redis connection — trade-emails queue disabled (will fall back to inline send)');
    return;
  }

  tradeEmailsQueue = new Queue<TradeEmailJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'custom' },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });

  tradeEmailsQueue.on('error', (err) => {
    console.error('[TradeEmails] Queue error:', err.message);
  });

  tradeEmailsWorker = new Worker<TradeEmailJobData>(
    QUEUE_NAME,
    processTradeEmail,
    {
      connection,
      concurrency: 4,
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          return BACKOFF_DELAYS_MS[Math.min(attemptsMade, BACKOFF_DELAYS_MS.length - 1)];
        },
      },
    }
  );

  tradeEmailsWorker.on('completed', (job) => {
    console.log(`[TradeEmails] Job ${job.id} completed`);
  });

  tradeEmailsWorker.on('failed', (job, err) => {
    console.error(`[TradeEmails] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  tradeEmailsWorker.on('error', (err) => {
    console.error('[TradeEmails] Worker error:', err.message);
  });

  console.log('[TradeEmails] Worker initialized');
}

async function runInlineWithRetry(data: TradeEmailJobData): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const mockJob = { data, attemptsMade: attempt, id: `inline-${Date.now()}` } as Job<TradeEmailJobData>;
    try {
      await processTradeEmail(mockJob);
      return;
    } catch (err) {
      console.error(`[TradeEmails] Inline attempt ${attempt + 1} failed:`, err);
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_DELAYS_MS[attempt]));
      }
    }
  }
  console.error('[TradeEmails] Inline send exhausted all retries');
}

export async function queueTradeEmail(data: TradeEmailJobData): Promise<string | null> {
  if (!tradeEmailsQueue) {
    console.log(`[TradeEmails] Queue not available — running inline with retry (kind=${data.kind})`);
    runInlineWithRetry(data).catch((err) => {
      console.error('[TradeEmails] Inline runner crashed:', err);
    });
    return null;
  }
  const job = await tradeEmailsQueue.add(data.kind, data, {
    attempts: 3,
    backoff: { type: 'custom' },
  });
  console.log(`[TradeEmails] Job ${job.id} queued (kind=${data.kind})`);
  return job.id || null;
}

export async function closeTradeEmailsWorker(): Promise<void> {
  if (tradeEmailsWorker) {
    await tradeEmailsWorker.close();
    console.log('[TradeEmails] Worker closed');
  }
  if (tradeEmailsQueue) {
    await tradeEmailsQueue.close();
    console.log('[TradeEmails] Queue closed');
  }
}
