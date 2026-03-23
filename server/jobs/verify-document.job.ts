import { Queue, Worker, Job } from 'bullmq';
import { extractDocumentData, calculateFraudScore } from '../services/ocr-service';
import { db } from '../db';
import { tradeDocuments } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
const QUEUE_NAME = 'verify-document';

export interface VerifyDocumentJobData {
  documentId: string;
  documentUrl: string;
  documentType: string;
  caseId: string;
  tradeValueUsd?: string;
  buyerName?: string | null;
  sellerName?: string | null;
  companyName?: string | null;
}

type DocumentStatus = 'Pending' | 'Approved' | 'Rejected' | 'AI Review' | 'Tier 1 Review' | 'AI Rejected';

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

let verifyDocumentQueue: Queue | null = null;
let verifyDocumentWorker: Worker | null = null;

export function getVerifyDocumentQueue(): Queue | null {
  return verifyDocumentQueue;
}

async function processVerifyDocument(job: Job<VerifyDocumentJobData>): Promise<void> {
  const { documentId, documentUrl, documentType, tradeValueUsd, buyerName, sellerName, companyName } = job.data;
  console.log(`[VerifyDoc] Processing document ${documentId} (type: ${documentType}, attempt: ${job.attemptsMade + 1})`);

  await db.update(tradeDocuments)
    .set({ aiVerificationStatus: 'processing' })
    .where(eq(tradeDocuments.id, documentId));

  try {
    const extracted = await extractDocumentData(documentUrl, documentType);
    console.log(`[VerifyDoc] Extraction complete for ${documentId}`);

    const tradeData = {
      tradeValueUsd: tradeValueUsd || '0',
      buyerName: buyerName || null,
      sellerName: sellerName || null,
      companyName: companyName || null,
    };

    const fraudResult = calculateFraudScore(extracted, tradeData);
    console.log(`[VerifyDoc] Fraud score: ${fraudResult.totalScore} for ${documentId}`);

    const newDocStatus: DocumentStatus = fraudResult.recommendation === 'reject' ? 'AI Rejected' : 'Tier 1 Review';

    await db.update(tradeDocuments)
      .set({
        aiVerificationStatus: 'completed',
        aiFraudScore: fraudResult.totalScore,
        aiExtractedData: { extracted, fraudResult },
        aiRejectionReason: fraudResult.recommendation === 'reject' ? fraudResult.summary : null,
        aiVerifiedAt: new Date(),
        status: newDocStatus,
        aiRetryCount: job.attemptsMade,
      })
      .where(eq(tradeDocuments.id, documentId));

    console.log(`[VerifyDoc] Document ${documentId} status → ${newDocStatus}`);
  } catch (error) {
    const attemptNumber = job.attemptsMade + 1;
    console.error(`[VerifyDoc] Attempt ${attemptNumber} failed for ${documentId}:`, error);

    if (attemptNumber >= 3) {
      await db.update(tradeDocuments)
        .set({
          aiVerificationStatus: 'failed',
          aiRejectionReason: 'AI verification failed after 3 attempts — flagged for manual review',
          status: 'Tier 1 Review',
          aiRetryCount: attemptNumber,
        })
        .where(eq(tradeDocuments.id, documentId));
      console.log(`[VerifyDoc] Document ${documentId} flagged for manual review after max retries`);
    } else {
      await db.update(tradeDocuments)
        .set({ aiRetryCount: attemptNumber })
        .where(eq(tradeDocuments.id, documentId));
    }
    throw error;
  }
}

export function initializeVerifyDocumentWorker(): void {
  const connection = getRedisConnection();
  if (!connection) {
    console.log('[VerifyDoc] No Redis connection — verify-document queue disabled');
    return;
  }

  verifyDocumentQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'custom',
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  verifyDocumentQueue.on('error', (err) => {
    console.error('[VerifyDoc] Queue error:', err.message);
  });

  verifyDocumentWorker = new Worker(
    QUEUE_NAME,
    processVerifyDocument,
    {
      connection,
      concurrency: 2,
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          return BACKOFF_DELAYS_MS[Math.min(attemptsMade, BACKOFF_DELAYS_MS.length - 1)];
        },
      },
    }
  );

  verifyDocumentWorker.on('completed', (job) => {
    console.log(`[VerifyDoc] Job ${job.id} completed successfully`);
  });

  verifyDocumentWorker.on('failed', (job, err) => {
    console.error(`[VerifyDoc] Job ${job?.id} failed:`, err.message);
  });

  verifyDocumentWorker.on('error', (err) => {
    console.error('[VerifyDoc] Worker error:', err.message);
  });

  console.log('[VerifyDoc] Worker initialized');
}

export async function queueDocumentVerification(data: VerifyDocumentJobData): Promise<string | null> {
  if (!verifyDocumentQueue) {
    console.log('[VerifyDoc] Queue not available — running inline verification with retry');
    runVerificationWithRetry(data).catch(err => {
      console.error('[VerifyDoc] Inline verification exhausted all retries:', err);
    });
    return null;
  }

  const job = await verifyDocumentQueue.add('verify-document', data, {
    attempts: 3,
    backoff: { type: 'custom' },
  });

  console.log(`[VerifyDoc] Job ${job.id} queued for document ${data.documentId}`);
  return job.id || null;
}

async function runVerificationWithRetry(data: VerifyDocumentJobData): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const mockJob = {
      data,
      attemptsMade: attempt,
    } as Job<VerifyDocumentJobData>;

    try {
      await processVerifyDocument(mockJob);
      return;
    } catch (err) {
      if (attempt < 2) {
        const delayMs = BACKOFF_DELAYS_MS[attempt];
        console.log(`[VerifyDoc] Inline retry ${attempt + 1} failed, retrying in ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
}

export async function closeVerifyDocumentWorker(): Promise<void> {
  if (verifyDocumentWorker) {
    await verifyDocumentWorker.close();
    console.log('[VerifyDoc] Worker closed');
  }
  if (verifyDocumentQueue) {
    await verifyDocumentQueue.close();
    console.log('[VerifyDoc] Queue closed');
  }
}
