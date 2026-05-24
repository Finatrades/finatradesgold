import { Router, type Request, type Response } from "express";
import type { Queue, Job } from "bullmq";
import { getTradeEmailsQueue, type TradeEmailJobData } from "../jobs/trade-emails.job";
import { getVerifyDocumentQueue } from "../jobs/verify-document.job";
import { logger } from "../lib/logger";

const router = Router();

type QueueKey = "trade-emails" | "verify-document";
const QUEUE_LABELS: Record<QueueKey, string> = {
  "trade-emails": "Trade case emails",
  "verify-document": "AI document verification",
};
const QUEUE_KEYS: QueueKey[] = ["trade-emails", "verify-document"];

function getQueueByKey(key: QueueKey): Queue | null {
  if (key === "trade-emails") return getTradeEmailsQueue() as Queue | null;
  if (key === "verify-document") return getVerifyDocumentQueue();
  return null;
}

function deriveTradeEmailTargets(data: TradeEmailJobData): {
  kind: string;
  targetLabel: string;
  targetCaseId: string | null;
  targetDocumentId: string | null;
} {
  if (data.kind === "trade_case_status") {
    return {
      kind: data.kind,
      targetLabel: `Trade case ${data.caseRef}`,
      targetCaseId: data.caseId,
      targetDocumentId: null,
    };
  }
  return {
    kind: data.kind,
    targetLabel: `Document ${data.documentType || "upload"} on case ${data.caseId}`,
    targetCaseId: data.caseId,
    targetDocumentId: data.documentId,
  };
}

function deriveVerifyDocTargets(data: { documentId?: string; documentType?: string; caseId?: string }): {
  kind: string;
  targetLabel: string;
  targetCaseId: string | null;
  targetDocumentId: string | null;
} {
  return {
    kind: "verify_document",
    targetLabel: `${data.documentType || "Document"} on case ${data.caseId || "?"}`,
    targetCaseId: data.caseId ?? null,
    targetDocumentId: data.documentId ?? null,
  };
}

function serializeFailedJob(queueKey: QueueKey, job: Job) {
  const data = (job.data ?? {}) as Record<string, unknown>;
  const targets =
    queueKey === "trade-emails"
      ? deriveTradeEmailTargets(data as TradeEmailJobData)
      : deriveVerifyDocTargets(data as { documentId?: string; documentType?: string; caseId?: string });

  return {
    id: String(job.id ?? ""),
    name: job.name,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts?.attempts ?? 3,
    failedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
    failedReason: job.failedReason || "Unknown error",
    stacktrace: Array.isArray(job.stacktrace) && job.stacktrace.length > 0 ? job.stacktrace[0] : null,
    kind: targets.kind,
    targetLabel: targets.targetLabel,
    targetCaseId: targets.targetCaseId,
    targetDocumentId: targets.targetDocumentId,
    data,
  };
}

async function summarizeQueue(queueKey: QueueKey) {
  const queue = getQueueByKey(queueKey);
  const label = QUEUE_LABELS[queueKey];
  if (!queue) {
    return {
      queue: queueKey,
      label,
      available: false,
      unavailableReason: "Redis-backed queue is not configured — sends run inline with no failed-job tracking.",
      counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      failed: [],
    };
  }
  try {
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    const failedJobs = await queue.getJobs(["failed"], 0, 49, false);
    return {
      queue: queueKey,
      label,
      available: true,
      unavailableReason: null,
      counts: {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
      },
      failed: failedJobs.map((j) => serializeFailedJob(queueKey, j)),
    };
  } catch (err) {
    return {
      queue: queueKey,
      label,
      available: false,
      unavailableReason: `Failed to read queue: ${(err as Error).message}`,
      counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      failed: [],
    };
  }
}

router.get("/", async (_req: Request, res: Response) => {
  const queues = await Promise.all(QUEUE_KEYS.map(summarizeQueue));
  res.json({ queues });
});

router.post("/:queue/jobs/:jobId/retry", async (req: Request, res: Response) => {
  const queueParam = req.params.queue as QueueKey;
  const jobId = req.params.jobId;
  if (!QUEUE_KEYS.includes(queueParam)) {
    res.status(400).json({ message: "Unknown queue" });
    return;
  }
  const queue = getQueueByKey(queueParam);
  if (!queue) {
    res.status(503).json({ message: "Queue is not available (Redis not configured)" });
    return;
  }
  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }
    const state = await job.getState();
    if (state !== "failed") {
      res.status(409).json({ message: `Job is in state '${state}' and cannot be retried` });
      return;
    }
    await job.retry();
    logger.info({ queue: queueParam, jobId }, "[AdminEmailQueues] Retried failed job");
    res.json({ message: "Job re-queued" });
  } catch (err) {
    logger.error({ err, queue: queueParam, jobId }, "[AdminEmailQueues] Retry failed");
    res.status(500).json({ message: `Retry failed: ${(err as Error).message}` });
  }
});

export default router;
