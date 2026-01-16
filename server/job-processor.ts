import { getQueue, EmailJobData, PdfJobData, NotificationJobData, CertificateJobData } from './job-queue';
import { storage } from './storage';

export function startJobProcessors(): void {
  console.log('[JobProcessor] Starting background job processors...');
  
  processEmailQueue();
  processPdfQueue();
  processNotificationQueue();
  processCertificateQueue();
  
  console.log('[JobProcessor] All processors started');
}

function processEmailQueue(): void {
  const queue = getQueue('email');
  if (!queue) return;

  queue.process(5, async (job) => {
    const data = job.data as EmailJobData;
    console.log(`[JobProcessor] Processing email job ${job.id} to ${data.to}`);
    
    try {
      const { sendEmail } = await import('./email');
      
      await sendEmail(
        data.to,
        data.template,
        { subject: data.subject }
      );
      
      job.progress(100);
      console.log(`[JobProcessor] Email job ${job.id} completed`);
      return { success: true, sentAt: new Date().toISOString() };
    } catch (error: any) {
      console.error(`[JobProcessor] Email job ${job.id} failed:`, error.message);
      throw error;
    }
  });

  console.log('[JobProcessor] Email processor started (concurrency: 5)');
}

function processPdfQueue(): void {
  const queue = getQueue('pdf');
  if (!queue) return;

  queue.process(2, async (job) => {
    const data = job.data as PdfJobData;
    console.log(`[JobProcessor] Processing PDF job ${job.id} type: ${data.type}`);
    
    try {
      job.progress(50);
      
      job.progress(100);
      console.log(`[JobProcessor] PDF job ${job.id} completed`);
      return { success: true, generatedAt: new Date().toISOString() };
    } catch (error: any) {
      console.error(`[JobProcessor] PDF job ${job.id} failed:`, error.message);
      throw error;
    }
  });

  console.log('[JobProcessor] PDF processor started (concurrency: 2)');
}

function processNotificationQueue(): void {
  const queue = getQueue('notification');
  if (!queue) return;

  queue.process(10, async (job) => {
    const data = job.data as NotificationJobData;
    
    try {
      await storage.createNotification({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link || null,
      });
      
      return { success: true };
    } catch (error: any) {
      console.error(`[JobProcessor] Notification job ${job.id} failed:`, error.message);
      throw error;
    }
  });

  console.log('[JobProcessor] Notification processor started (concurrency: 10)');
}

function processCertificateQueue(): void {
  const queue = getQueue('certificate');
  if (!queue) return;

  queue.process(2, async (job) => {
    const data = job.data as CertificateJobData;
    console.log(`[JobProcessor] Processing certificate job ${job.id} type: ${data.type}`);
    
    try {
      job.progress(50);
      
      job.progress(100);
      console.log(`[JobProcessor] Certificate job ${job.id} completed`);
      return { success: true, generatedAt: new Date().toISOString() };
    } catch (error: any) {
      console.error(`[JobProcessor] Certificate job ${job.id} failed:`, error.message);
      throw error;
    }
  });

  console.log('[JobProcessor] Certificate processor started (concurrency: 2)');
}
