/**
 * Send VC Proposal PDF to stakeholders
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_KEY;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@finatrades.com';

async function sendEmail() {
  const pdfPath = path.join(process.cwd(), 'attached_assets', 'VC-System-Proposal-Finatrades-Wingold.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF file not found at:', pdfPath);
    process.exit(1);
  }
  
  const recipients = [
    'chairman@winvestnet.com',
    'legal@finatrades.com',
    'blockchain@finatrades.com'
  ];
  
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER && SMTP_PASS ? {
      user: SMTP_USER,
      pass: SMTP_PASS,
    } : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  } as any);
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { padding: 30px; max-width: 600px; margin: 0 auto; }
    .highlight { background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; }
    .cta { background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Verifiable Credentials System Proposal</h1>
    <p style="color: #fed7aa; margin: 10px 0 0 0;">Finatrades ↔ Wingold & Metals Integration</p>
  </div>
  
  <div class="content">
    <p>Dear Stakeholder,</p>
    
    <p>Please find attached the comprehensive technical proposal for implementing <strong>Verifiable Credentials (W3C VC 2.0)</strong> to enable seamless, compliant KYC data sharing between Finatrades and Wingold & Metals platforms.</p>
    
    <div class="highlight">
      <strong>Key Highlights:</strong>
      <ul>
        <li>Users complete KYC once on Finatrades, reuse instantly on Wingold</li>
        <li>Cryptographically signed credentials ensure tamper-proof verification</li>
        <li>Compliant with W3C VC 2.0, eIDAS 2.0, and FATF guidelines</li>
        <li>User-controlled data with selective disclosure capability</li>
        <li>Estimated 40-60% reduction in KYC processing costs</li>
      </ul>
    </div>
    
    <p><strong>Document Contents:</strong></p>
    <ul>
      <li>Executive Summary & Current State Analysis</li>
      <li>Technical Architecture & System Components</li>
      <li>Data Flow & Process Diagrams</li>
      <li>Credential Structure (W3C VC 2.0)</li>
      <li>Security Architecture & Multi-Layer Protection</li>
      <li>Implementation Phases (8-week roadmap)</li>
      <li>Compliance & Regulatory Alignment</li>
      <li>Benefits & ROI Analysis</li>
      <li>Technical Specifications & API Endpoints</li>
    </ul>
    
    <p>Please review the attached proposal and share your feedback. We recommend scheduling a technical deep-dive session to discuss the implementation details.</p>
    
    <p>Best regards,<br>
    <strong>Finatrades Technology Team</strong></p>
  </div>
  
  <div class="footer">
    <p>This is a confidential document intended for authorized recipients only.</p>
    <p>© ${new Date().getFullYear()} Finatrades. All rights reserved.</p>
  </div>
</body>
</html>
  `;
  
  const mailOptions = {
    from: SMTP_FROM,
    to: recipients.join(', '),
    subject: 'Verifiable Credentials System Proposal - Finatrades ↔ Wingold Integration',
    html: htmlBody,
    attachments: [
      {
        filename: 'VC-System-Proposal-Finatrades-Wingold.pdf',
        path: pdfPath,
        contentType: 'application/pdf'
      }
    ]
  };
  
  try {
    console.log('Sending email to:', recipients.join(', '));
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Recipients:', recipients.join(', '));
  } catch (error) {
    console.error('Failed to send email:', error);
    process.exit(1);
  }
}

sendEmail();
