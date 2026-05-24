import { Queue, Worker, Job } from 'bullmq';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { warehouseReceipts, consignments, users, consignmentTallies } from '../shared/schema';
import { uploadToR2, isR2Configured } from '../r2-storage';
import { EMAIL_TEMPLATES, queueEmailWithTemplate, getEmailTemplate, sendEmail } from '../email';

const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
const QUEUE_NAME = 'issue-warehouse-receipt';

export interface IssueWrJobData {
  warehouseReceiptId: string;
}

function cleanRedisUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  while (url.startsWith('REDIS_URL=')) url = url.substring('REDIS_URL='.length);
  url = url.replace(/^["']|["']$/g, '');
  while (url.startsWith('REDIS_URL=')) url = url.substring('REDIS_URL='.length);
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

let wrQueue: Queue | null = null;
let wrWorker: Worker | null = null;

async function renderWrPdf(opts: {
  wrNumber: string;
  commodityName: string;
  quantity: string;
  unit: string;
  grade: string | null;
  hubCode: string;
  exporterName: string;
  inspectorName: string;
  issuedAt: Date;
  verificationUrl: string;
  originCountry: string;
  variancePct: string | null;
  moisturePct: string | null;
}): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const qrPngDataUrl = await QRCode.toDataURL(opts.verificationUrl, { width: 220, margin: 1 });
      const qrPng = Buffer.from(qrPngDataUrl.split(',')[1], 'base64');

      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fillColor('#C73B22').fontSize(22).text('FINATRADES', { continued: true })
        .fillColor('#1A1A1A').fontSize(12).text('  · Electronic Warehouse Receipt');
      doc.moveDown(0.3);
      doc.strokeColor('#C73B22').lineWidth(2).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
      doc.moveDown(0.8);

      // WR number + QR (right)
      const yStart = doc.y;
      doc.fillColor('#888').fontSize(9).text('RECEIPT NUMBER');
      doc.fillColor('#1A1A1A').fontSize(18).font('Helvetica-Bold').text(opts.wrNumber);
      doc.font('Helvetica').fontSize(9).fillColor('#888')
        .text(`Issued: ${opts.issuedAt.toISOString().slice(0, 19).replace('T', ' ')} UTC`);
      doc.text(`Hub: ${opts.hubCode}`);
      doc.text(`Status: ACTIVE — Collateral grade`);

      // QR on the right
      doc.image(qrPng, 410, yStart, { width: 140 });
      doc.fillColor('#888').fontSize(8).text('Scan to verify authenticity', 410, yStart + 145, { width: 140, align: 'center' });

      doc.moveDown(2);
      doc.y = Math.max(doc.y, yStart + 175);
      doc.moveDown(1);

      // Section: Commodity
      const sectionHeader = (label: string) => {
        doc.fillColor('#888').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), { characterSpacing: 1 });
        doc.strokeColor('#E5E5E0').lineWidth(0.5).moveTo(48, doc.y + 2).lineTo(547, doc.y + 2).stroke();
        doc.moveDown(0.4);
        doc.font('Helvetica').fillColor('#1A1A1A').fontSize(11);
      };

      const kv = (k: string, v: string) => {
        const yk = doc.y;
        doc.fillColor('#666').fontSize(10).text(k, 48, yk, { width: 180 });
        doc.fillColor('#1A1A1A').fontSize(11).font('Helvetica-Bold').text(v, 230, yk, { width: 317 });
        doc.font('Helvetica');
      };

      sectionHeader('Commodity & Quantity');
      kv('Commodity', opts.commodityName);
      kv('Quantity received', `${opts.quantity} ${opts.unit}`);
      kv('Quality grade', opts.grade ?? '—');
      kv('Country of origin', opts.originCountry);
      if (opts.moisturePct) kv('Moisture', `${opts.moisturePct}%`);
      if (opts.variancePct) kv('Variance vs declared', `${opts.variancePct}%`);
      doc.moveDown(0.8);

      sectionHeader('Parties');
      kv('Depositor (Exporter)', opts.exporterName);
      kv('Warehouse operator', 'Finatrades — Hub ' + opts.hubCode);
      kv('Inspector', opts.inspectorName);
      doc.moveDown(0.8);

      sectionHeader('Verification');
      kv('Public verify URL', opts.verificationUrl);
      doc.moveDown(2);

      // Footer terms
      doc.fillColor('#888').fontSize(8).text(
        'This Electronic Warehouse Receipt (eWR) is the authoritative record of goods received at the named Finatrades hub. ' +
        'It may be used as collateral while its status is ACTIVE. Authenticity may be confirmed at any time by scanning the QR ' +
        'code or visiting the verification URL above. Tampering with this document is a criminal offence under applicable warehouse law.',
        48, 760, { width: 499, align: 'justify' }
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function processIssueWr(job: Job<IssueWrJobData>): Promise<void> {
  const { warehouseReceiptId } = job.data;
  console.log(`[IssueWR] Processing ${warehouseReceiptId} (attempt ${job.attemptsMade + 1})`);

  await db.update(warehouseReceipts)
    .set({ pdfStatus: 'generating', updatedAt: new Date() })
    .where(eq(warehouseReceipts.id, warehouseReceiptId));

  try {
    const [wr] = await db.select().from(warehouseReceipts).where(eq(warehouseReceipts.id, warehouseReceiptId));
    if (!wr) throw new Error('WR not found');

    const [c] = await db.select().from(consignments).where(eq(consignments.id, wr.consignmentId));
    if (!c) throw new Error('Consignment not found');

    const [exporter] = await db.select({
      firstName: users.firstName, lastName: users.lastName, email: users.email, companyName: users.companyName,
    }).from(users).where(eq(users.id, c.userId));

    let tally: typeof consignmentTallies.$inferSelect | undefined;
    if (wr.tallyId) {
      const [t] = await db.select().from(consignmentTallies).where(eq(consignmentTallies.id, wr.tallyId));
      tally = t;
    }

    const exporterName = exporter?.companyName
      || `${exporter?.firstName ?? ''} ${exporter?.lastName ?? ''}`.trim()
      || exporter?.email
      || 'Unknown';

    const pdfBuffer = await renderWrPdf({
      wrNumber: wr.wrNumber,
      commodityName: wr.commodityName,
      quantity: String(wr.quantity),
      unit: wr.unit,
      grade: wr.grade,
      hubCode: wr.hubCode,
      exporterName,
      inspectorName: tally?.inspectorName ?? '—',
      issuedAt: wr.issuedAt,
      verificationUrl: wr.qrPayload,
      originCountry: c.originCountry,
      variancePct: tally?.variancePct ? String(tally.variancePct) : null,
      moisturePct: tally?.moisturePct ? String(tally.moisturePct) : null,
    });

    let objectKey: string | null = null;
    if (isR2Configured()) {
      const key = `warehouse-receipts/${wr.wrNumber}.pdf`;
      const out = await uploadToR2(key, pdfBuffer, 'application/pdf');
      objectKey = out.key;
    } else {
      console.warn('[IssueWR] R2 not configured — PDF generated but not uploaded');
    }

    await db.update(warehouseReceipts)
      .set({
        pdfStatus: objectKey ? 'ready' : 'failed',
        pdfObjectKey: objectKey,
        pdfError: objectKey ? null : 'R2 not configured',
        updatedAt: new Date(),
      })
      .where(eq(warehouseReceipts.id, warehouseReceiptId));

    console.log(`[IssueWR] ${wr.wrNumber} PDF ${objectKey ? 'uploaded' : 'generated (no upload)'}`);

    // Email exporter
    if (exporter?.email) {
      const baseUrl = process.env.PUBLIC_APP_URL || '';
      const downloadUrl = `${baseUrl}/consignments/${c.id}`;
      const slug = EMAIL_TEMPLATES.CONSIGNMENT_WR_ISSUED;
      try {
        const tpl = await getEmailTemplate(slug);
        if (tpl) {
          await queueEmailWithTemplate(exporter.email, slug, {
            user_name: exporterName,
            wr_number: wr.wrNumber,
            commodity_name: wr.commodityName,
            quantity: String(wr.quantity),
            unit: wr.unit,
            hub_code: wr.hubCode,
            verification_url: wr.qrPayload,
            download_url: downloadUrl,
          }, { userId: c.userId, notificationType: slug, metadata: { wrId: wr.id } });
        } else {
          // Fallback raw send: use a generic notification slug if available, else log
          console.log(`[IssueWR] Template ${slug} not in DB — falling back to direct send`);
          const html = `
            <p>Hello ${exporterName},</p>
            <p>An Electronic Warehouse Receipt has been issued for your consignment.</p>
            <ul>
              <li><strong>WR Number:</strong> ${wr.wrNumber}</li>
              <li><strong>Commodity:</strong> ${wr.commodityName}</li>
              <li><strong>Quantity:</strong> ${wr.quantity} ${wr.unit}</li>
              <li><strong>Hub:</strong> ${wr.hubCode}</li>
            </ul>
            <p>Verify at: <a href="${wr.qrPayload}">${wr.qrPayload}</a></p>
            <p>Download from: <a href="${downloadUrl}">${downloadUrl}</a></p>
          `;
          await sendEmail(exporter.email, 'consignment_wr_issued_fallback', { html_body: html }).catch((e) => {
            console.warn('[IssueWR] Fallback email failed:', (e as any)?.message);
          });
        }
      } catch (e: any) {
        console.warn('[IssueWR] Email enqueue failed:', e?.message || e);
      }
    }
  } catch (err: any) {
    console.error('[IssueWR] Failed:', err?.message || err);
    await db.update(warehouseReceipts)
      .set({ pdfStatus: 'failed', pdfError: String(err?.message || err), updatedAt: new Date() })
      .where(eq(warehouseReceipts.id, warehouseReceiptId));
    throw err;
  }
}

export function initializeIssueWrWorker(): void {
  const connection = getRedisConnection();
  if (!connection) {
    console.log('[IssueWR] No Redis — queue disabled (will fall back to inline processing on enqueue)');
    return;
  }

  wrQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 30 },
    },
  });

  wrQueue.on('error', (err) => console.error('[IssueWR] Queue error:', err.message));

  wrWorker = new Worker(QUEUE_NAME, processIssueWr, { connection, concurrency: 2 });

  wrWorker.on('completed', (job) => console.log(`[IssueWR] Job ${job.id} completed`));
  wrWorker.on('failed', (job, err) => console.error(`[IssueWR] Job ${job?.id} failed:`, err.message));
  wrWorker.on('error', (err) => console.error('[IssueWR] Worker error:', err.message));

  console.log('[IssueWR] Worker initialized');
}

export async function queueIssueWr(data: IssueWrJobData): Promise<string | null> {
  if (!wrQueue) {
    console.log('[IssueWR] No queue — running inline');
    setImmediate(() => {
      processIssueWr({ data, attemptsMade: 0 } as Job<IssueWrJobData>).catch((e) =>
        console.error('[IssueWR] Inline run failed:', e?.message || e),
      );
    });
    return null;
  }
  const job = await wrQueue.add('issue-wr', data);
  return job.id ?? null;
}

export async function closeIssueWrWorker(): Promise<void> {
  if (wrWorker) await wrWorker.close();
  if (wrQueue) await wrQueue.close();
}
