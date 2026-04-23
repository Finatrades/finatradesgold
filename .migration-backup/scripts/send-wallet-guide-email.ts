import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const pdfPath = path.join(process.cwd(), 'docs', 'LGPW-FGPW-Wallet-Guide.pdf');
const recipientEmail = 'blockchain@finatrades.com';

async function sendEmail() {
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8A2BE2, #5B1A99); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Finatrades</h1>
        <p style="color: #E8D5F5; margin: 10px 0 0 0;">Dual-Wallet Documentation</p>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #5B1A99;">LGPW ↔ FGPW Wallet Guide</h2>
        <p style="color: #666;">Please find attached the comprehensive documentation explaining the Finatrades dual-wallet architecture:</p>
        
        <ul style="color: #666;">
          <li>LGPW (Live Gold Price Wallet) overview</li>
          <li>FGPW (Fixed Gold Price Wallet) mechanics</li>
          <li>Lock and Unlock flow diagrams</li>
          <li>5-transaction example with certificates</li>
          <li>FIFO batch consumption</li>
          <li>Cash-backed formula explanation</li>
        </ul>
        
        <p style="color: #666; margin-top: 20px;">
          <strong>File attached:</strong> LGPW-FGPW-Wallet-Guide.pdf
        </p>
      </div>
      
      <div style="background: #5B1A99; padding: 20px; text-align: center;">
        <p style="color: #E8D5F5; margin: 0; font-size: 12px;">
          © ${new Date().getFullYear()} Finatrades Finance SA. All rights reserved.
        </p>
      </div>
    </div>
  `;

  const result = await transporter.sendMail({
    from: '"Finatrades System" <noreply@finatrades.com>',
    to: recipientEmail,
    subject: 'LGPW ↔ FGPW Wallet Guide - Dual-Wallet Documentation',
    html: htmlBody,
    attachments: [
      {
        filename: 'LGPW-FGPW-Wallet-Guide.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  console.log('Email sent successfully!');
  console.log('Message ID:', result.messageId);
  console.log('Recipient:', recipientEmail);
}

sendEmail().catch(console.error);
