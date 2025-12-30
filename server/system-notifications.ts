/**
 * System Notifications Service
 * Sends platform activity updates and error notifications to System@finatrades.com
 */

import { sendEmailDirect } from './email';

const SYSTEM_EMAIL = 'System@finatrades.com';

interface ActivityEvent {
  type: 'user_registration' | 'kyc_submission' | 'kyc_approval' | 'kyc_rejection' |
        'deposit' | 'withdrawal' | 'p2p_transfer' | 'vault_purchase' | 'vault_withdrawal' |
        'bnsl_plan_created' | 'bnsl_payout' | 'finabridge_case' | 'admin_action' |
        'security_event' | 'system_event';
  title: string;
  description: string;
  details?: Record<string, any>;
  severity?: 'info' | 'warning' | 'critical';
  timestamp?: Date;
}

interface ErrorEvent {
  error: Error | string;
  context: string;
  route?: string;
  userId?: string;
  requestData?: Record<string, any>;
  timestamp?: Date;
}

// Activity notification aggregation (batch notifications)
let activityBuffer: ActivityEvent[] = [];
let activityFlushTimeout: NodeJS.Timeout | null = null;
const ACTIVITY_BATCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Error notification throttling
const errorThrottle: Map<string, number> = new Map();
const ERROR_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes per unique error

function generateActivityEmailHtml(events: ActivityEvent[]): string {
  const eventsByType = events.reduce((acc, event) => {
    if (!acc[event.type]) acc[event.type] = [];
    acc[event.type].push(event);
    return acc;
  }, {} as Record<string, ActivityEvent[]>);

  const sections = Object.entries(eventsByType).map(([type, typeEvents]) => {
    const rows = typeEvents.map(event => {
      const time = event.timestamp ? new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '';
      const severityColor = event.severity === 'critical' ? '#dc2626' : 
                           event.severity === 'warning' ? '#f59e0b' : '#22c55e';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${time}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${severityColor}; margin-right: 6px;"></span>
            ${event.title}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${event.description}</td>
        </tr>
      `;
    }).join('');

    const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #4B0082; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${typeLabel} (${typeEvents.length})
        </h3>
        <table style="width: 100%; border-collapse: collapse; background: #fafafa; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; width: 80px;">Time</th>
              <th style="padding: 10px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase;">Event</th>
              <th style="padding: 10px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase;">Details</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6;">
      <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0D001E 0%, #4B0082 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Platform Activity Report</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">
            ${events.length} events • ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${sections}
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              This is an automated system report from Finatrades Platform
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateErrorEmailHtml(event: ErrorEvent): string {
  const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
  const errorStack = event.error instanceof Error ? event.error.stack : undefined;
  const timestamp = event.timestamp || new Date();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6;">
      <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ System Error Alert</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
            ${timestamp.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}
          </p>
        </div>
        
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin: 0 0 8px 0; font-size: 16px;">Error Message</h3>
            <p style="margin: 0; font-family: monospace; font-size: 14px; color: #7f1d1d; word-break: break-word;">
              ${errorMessage}
            </p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 12px; background: #f9fafb; font-weight: 600; width: 120px; border: 1px solid #e5e7eb;">Context</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${event.context}</td>
            </tr>
            ${event.route ? `
            <tr>
              <td style="padding: 12px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Route</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-family: monospace;">${event.route}</td>
            </tr>
            ` : ''}
            ${event.userId ? `
            <tr>
              <td style="padding: 12px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">User ID</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">${event.userId}</td>
            </tr>
            ` : ''}
          </table>
          
          ${errorStack ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 14px;">Stack Trace</h3>
            <pre style="background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 11px; line-height: 1.5; margin: 0;">
${errorStack}
            </pre>
          </div>
          ` : ''}
          
          ${event.requestData ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 14px;">Request Data</h3>
            <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 0;">
${JSON.stringify(event.requestData, null, 2)}
            </pre>
          </div>
          ` : ''}
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              Automated error notification from Finatrades Platform
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function flushActivityBuffer(): Promise<void> {
  if (activityBuffer.length === 0) return;

  const events = [...activityBuffer];
  activityBuffer = [];

  try {
    const html = generateActivityEmailHtml(events);
    const subject = `[Finatrades] Platform Activity Report - ${events.length} events`;
    
    await sendEmailDirect(SYSTEM_EMAIL, subject, html);
    console.log(`[System Notifications] Sent activity report with ${events.length} events to ${SYSTEM_EMAIL}`);
  } catch (error) {
    console.error('[System Notifications] Failed to send activity report:', error);
    // Re-queue events on failure
    activityBuffer = [...events, ...activityBuffer];
  }
}

/**
 * Log a platform activity event
 * Events are batched and sent every 5 minutes to avoid email flooding
 */
export function logActivity(event: ActivityEvent): void {
  event.timestamp = event.timestamp || new Date();
  event.severity = event.severity || 'info';
  activityBuffer.push(event);

  // Schedule flush if not already scheduled
  if (!activityFlushTimeout) {
    activityFlushTimeout = setTimeout(() => {
      activityFlushTimeout = null;
      flushActivityBuffer().catch(console.error);
    }, ACTIVITY_BATCH_INTERVAL);
  }

  // Immediate flush for critical events
  if (event.severity === 'critical') {
    if (activityFlushTimeout) {
      clearTimeout(activityFlushTimeout);
      activityFlushTimeout = null;
    }
    flushActivityBuffer().catch(console.error);
  }
}

/**
 * Send an immediate error notification
 * Throttled to prevent spam - same error only sent once per 15 minutes
 */
export async function notifyError(event: ErrorEvent): Promise<void> {
  event.timestamp = event.timestamp || new Date();
  
  // Create throttle key from error message and context
  const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
  const throttleKey = `${event.context}:${errorMessage.substring(0, 100)}`;
  
  // Check throttle
  const lastSent = errorThrottle.get(throttleKey);
  if (lastSent && Date.now() - lastSent < ERROR_THROTTLE_MS) {
    console.log(`[System Notifications] Error throttled (sent ${Math.round((Date.now() - lastSent) / 1000 / 60)}min ago): ${throttleKey.substring(0, 50)}`);
    return;
  }

  try {
    const html = generateErrorEmailHtml(event);
    const subject = `[Finatrades ERROR] ${event.context}: ${errorMessage.substring(0, 50)}`;
    
    await sendEmailDirect(SYSTEM_EMAIL, subject, html);
    errorThrottle.set(throttleKey, Date.now());
    
    console.log(`[System Notifications] Error notification sent to ${SYSTEM_EMAIL}: ${event.context}`);
  } catch (error) {
    console.error('[System Notifications] Failed to send error notification:', error);
  }
}

/**
 * Flush pending activity notifications immediately
 * Call this on server shutdown or for testing
 */
export async function flushPendingNotifications(): Promise<void> {
  if (activityFlushTimeout) {
    clearTimeout(activityFlushTimeout);
    activityFlushTimeout = null;
  }
  await flushActivityBuffer();
}

/**
 * Get notification statistics
 */
export function getNotificationStats(): {
  pendingActivities: number;
  throttledErrors: number;
  nextFlushIn: number | null;
} {
  return {
    pendingActivities: activityBuffer.length,
    throttledErrors: errorThrottle.size,
    nextFlushIn: activityFlushTimeout ? ACTIVITY_BATCH_INTERVAL : null,
  };
}

// Cleanup old throttle entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, time] of errorThrottle.entries()) {
    if (now - time > ERROR_THROTTLE_MS) {
      errorThrottle.delete(key);
    }
  }
}, 60 * 1000); // Check every minute
