import path from 'path';
import fs from 'fs';
import { sendEmailWithAttachment } from '../email';

async function generatePdfAndSendEmails() {
  console.log('[Clawd Email] Starting PDF generation...');
  
  const puppeteer = await import('puppeteer');
  
  const htmlPath = path.join(process.cwd(), 'public', 'clawd-integration-guide.html');
  
  if (!fs.existsSync(htmlPath)) {
    console.error('Guide not found at:', htmlPath);
    process.exit(1);
  }
  
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  
  const baseUrl = 'https://e7e55994-7ffa-4458-b8c4-25893d03b997-00-2vejvte8hikcx.riker.replit.dev';
  
  const htmlWithAbsoluteUrls = htmlContent
    .replace(/src="\//g, `src="${baseUrl}/`)
    .replace(/href="\//g, `href="${baseUrl}/`);
  
  await page.setContent(htmlWithAbsoluteUrls, { 
    waitUntil: 'networkidle0',
    timeout: 60000 
  });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  
  await browser.close();
  console.log('[Clawd Email] PDF generated successfully!');
  
  const clawdEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.7; color: #333; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 680px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 45px 35px; text-align: center; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 50%); }
    .header-icon { font-size: 56px; margin-bottom: 12px; position: relative; z-index: 1; }
    .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 700; position: relative; z-index: 1; }
    .header .subtitle { color: #8B5CF6; margin: 10px 0 0; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; position: relative; z-index: 1; }
    .progress-badge { display: inline-flex; align-items: center; gap: 10px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 10px 24px; border-radius: 25px; font-size: 12px; font-weight: 700; margin-top: 20px; position: relative; z-index: 1; letter-spacing: 0.5px; }
    .content { padding: 45px 40px; }
    .greeting { font-size: 20px; color: #1a1a2e; margin-bottom: 25px; font-weight: 500; }
    .message-box { background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-radius: 14px; padding: 28px; margin: 28px 0; border-left: 5px solid #f59e0b; }
    .message-box p { margin: 0 0 12px; }
    .message-box p:last-child { margin-bottom: 0; }
    
    .progress-section { background: #1a1a2e; border-radius: 16px; padding: 30px; margin: 30px 0; }
    .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .progress-title { color: white; font-size: 18px; font-weight: 600; }
    .progress-percent { color: #8B5CF6; font-size: 24px; font-weight: 700; }
    .progress-bar-container { background: rgba(255,255,255,0.1); border-radius: 10px; height: 12px; overflow: hidden; margin-bottom: 25px; }
    .progress-bar { background: linear-gradient(90deg, #8B5CF6, #EC4899); height: 100%; width: 90%; border-radius: 10px; }
    
    .approval-grid { display: flex; flex-direction: column; gap: 12px; }
    .approval-item { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 14px 18px; border-radius: 10px; }
    .approval-left { display: flex; align-items: center; gap: 12px; }
    .approval-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .approval-icon.completed { background: rgba(34, 197, 94, 0.2); }
    .approval-icon.pending { background: rgba(245, 158, 11, 0.2); }
    .approval-text { color: white; font-size: 14px; }
    .approval-status { font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 15px; }
    .status-completed { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .status-pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .status-awaiting { background: rgba(139, 92, 246, 0.2); color: #8B5CF6; }
    
    .timeline { margin: 30px 0; padding-left: 30px; border-left: 3px solid #e5e7eb; }
    .timeline-item { position: relative; padding-bottom: 25px; }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-dot { position: absolute; left: -38px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; }
    .timeline-dot.done { background: #22c55e; }
    .timeline-dot.current { background: #f59e0b; }
    .timeline-dot.waiting { background: #d1d5db; }
    .timeline-content h4 { margin: 0 0 5px; font-size: 15px; color: #1a1a2e; }
    .timeline-content p { margin: 0; font-size: 13px; color: #6b7280; }
    .timeline-date { font-size: 11px; color: #9ca3af; margin-top: 5px; }
    
    .attachment-card { background: linear-gradient(135deg, #f8f9fa, #f1f5f9); border: 2px dashed #cbd5e1; border-radius: 14px; padding: 25px; text-align: center; margin: 30px 0; }
    .attachment-icon { font-size: 42px; margin-bottom: 12px; }
    .attachment-name { font-weight: 700; color: #1a1a2e; font-size: 15px; }
    .attachment-size { font-size: 12px; color: #64748b; margin-top: 6px; }
    
    .next-steps { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 14px; padding: 25px; margin: 25px 0; }
    .next-steps h3 { margin: 0 0 15px; color: #166534; font-size: 16px; display: flex; align-items: center; gap: 8px; }
    .next-steps ul { margin: 0; padding-left: 20px; }
    .next-steps li { margin: 8px 0; color: #15803d; font-size: 14px; }
    
    .signature { margin-top: 35px; padding-top: 30px; border-top: 2px solid #f1f5f9; }
    .signature-name { font-weight: 700; color: #8B5CF6; font-size: 18px; }
    .signature-title { color: #64748b; font-size: 13px; margin-top: 4px; }
    .footer { background: linear-gradient(135deg, #1a1a2e 0%, #0f172a 100%); color: #94a3b8; padding: 30px; text-align: center; font-size: 11px; }
    .footer-logo { color: white; font-weight: 700; font-size: 15px; margin-bottom: 12px; letter-spacing: 1px; }
    .footer-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 15px 50px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">🦀</div>
      <h1>CLAWD.BOT</h1>
      <div class="subtitle">AI Operations Assistant</div>
      <div class="progress-badge">
        ⏳ PENDING FINAL APPROVAL
      </div>
    </div>
    
    <div class="content">
      <div class="greeting">Dear Finatrades Management Team,</div>
      
      <div class="message-box">
        <p>🎉 <strong>Great news!</strong> The technical integration of Clawd.bot with the Finatrades platform has been successfully completed by the Technology Team.</p>
        <p>We are now at <strong>90% completion</strong> and awaiting final approvals from the Board Advisory, Chairman, and Legal Team before full deployment.</p>
      </div>
      
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-title">Integration Progress</span>
          <span class="progress-percent">90%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar"></div>
        </div>
        
        <div class="approval-grid">
          <div class="approval-item">
            <div class="approval-left">
              <div class="approval-icon completed">✓</div>
              <span class="approval-text">Technical Integration</span>
            </div>
            <span class="approval-status status-completed">COMPLETED</span>
          </div>
          <div class="approval-item">
            <div class="approval-left">
              <div class="approval-icon completed">✓</div>
              <span class="approval-text">Security Audit</span>
            </div>
            <span class="approval-status status-completed">COMPLETED</span>
          </div>
          <div class="approval-item">
            <div class="approval-left">
              <div class="approval-icon completed">✓</div>
              <span class="approval-text">API Connection & Testing</span>
            </div>
            <span class="approval-status status-completed">COMPLETED</span>
          </div>
          <div class="approval-item">
            <div class="approval-left">
              <div class="approval-icon pending">⏳</div>
              <span class="approval-text">Legal Team Review</span>
            </div>
            <span class="approval-status status-pending">PENDING</span>
          </div>
          <div class="approval-item">
            <div class="approval-left">
              <div class="approval-icon pending">⏳</div>
              <span class="approval-text">Chairman Approval</span>
            </div>
            <span class="approval-status status-awaiting">AWAITING</span>
          </div>
          <div class="approval-item">
            <div class="approval-left">
              <div class="approval-icon pending">⏳</div>
              <span class="approval-text">Board Advisory Sign-off</span>
            </div>
            <span class="approval-status status-awaiting">AWAITING</span>
          </div>
        </div>
      </div>
      
      <h3 style="color: #1a1a2e; margin-bottom: 20px;">📋 Approval Timeline</h3>
      
      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="timeline-content">
            <h4>Technical Integration Complete</h4>
            <p>All API endpoints connected, skills configured, and automation tested</p>
            <div class="timeline-date">✓ Completed - January 28, 2026</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="timeline-content">
            <h4>Security & Compliance Audit</h4>
            <p>Data protection, access controls, and encryption verified</p>
            <div class="timeline-date">✓ Completed - January 28, 2026</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot current"></div>
          <div class="timeline-content">
            <h4>Legal Team Review</h4>
            <p>Contract terms, liability, and regulatory compliance review</p>
            <div class="timeline-date">⏳ In Progress - Estimated 3-5 business days</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot waiting"></div>
          <div class="timeline-content">
            <h4>Chairman & Board Advisory Approval</h4>
            <p>Final strategic approval and budget authorization</p>
            <div class="timeline-date">📅 Scheduled after Legal Review</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot waiting"></div>
          <div class="timeline-content">
            <h4>Production Deployment</h4>
            <p>Full system activation and 24/7 operations begin</p>
            <div class="timeline-date">🚀 Ready upon final approval</div>
          </div>
        </div>
      </div>
      
      <div class="attachment-card">
        <div class="attachment-icon">📎</div>
        <div class="attachment-name">Finatrades-Clawd-Integration-Guide.pdf</div>
        <div class="attachment-size">Complete Technical Blueprint • 12 Pages • For Board Review</div>
      </div>
      
      <div class="next-steps">
        <h3>📌 Next Steps Required</h3>
        <ul>
          <li>Legal Team to complete compliance review</li>
          <li>Chairman to schedule Board Advisory meeting</li>
          <li>Final budget approval for operational costs</li>
          <li>Tech Team to complete remaining 10% (production configuration)</li>
        </ul>
      </div>
      
      <p>Once all approvals are received, Clawd.bot will be fully operational and ready to automate vault operations, payment monitoring, KYC compliance, and intelligent reporting across all Finatrades products.</p>
      
      <p><em>We are excited to bring this AI-powered transformation to Finatrades!</em></p>
      
      <div class="signature">
        <div class="signature-name">🦀 Clawd.bot Integration Team</div>
        <div class="signature-title">Finatrades Technology Division</div>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-logo">FINATRADES × CLAWD.BOT</div>
      <div class="footer-divider"></div>
      <p>This is an automated status update from the Clawd.bot Integration Project</p>
      <p>© 2026 Finatrades. All rights reserved. | Powered by Claude AI</p>
    </div>
  </div>
</body>
</html>`;

  const recipients = [
    { email: 'chairman@winvestnet.com', name: 'Chairman' },
    { email: 'legal@finatrades.com', name: 'Legal Team' }
  ];
  
  for (const recipient of recipients) {
    console.log(`[Clawd Email] Sending to ${recipient.email}...`);
    
    const result = await sendEmailWithAttachment(
      recipient.email,
      '🦀 Clawd.bot Integration Status: 90% Complete - Awaiting Board & Legal Approval',
      clawdEmailHtml,
      [{
        filename: 'Finatrades-Clawd-Integration-Guide.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    );
    
    if (result.success) {
      console.log(`[Clawd Email] ✓ Successfully sent to ${recipient.email}`);
    } else {
      console.error(`[Clawd Email] ✗ Failed to send to ${recipient.email}`);
    }
  }
  
  console.log('[Clawd Email] All emails sent!');
  process.exit(0);
}

generatePdfAndSendEmails().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
