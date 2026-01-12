import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendWingoldDoc() {
  const recipients = [
    'blockchain@finatrades.com',
    'legal@finatrades.com',
    'chairman@winvestnet.com'
  ];
  
  const pdfPath = path.join(process.cwd(), 'attached_assets', 'Wingold_API_Requirements.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  for (const email of recipients) {
    try {
      const info = await transporter.sendMail({
        from: '"Finatrades Technical Team" <noreply@finatrades.com>',
        to: email,
        subject: 'Wingold & Metals API Integration Requirements - Finatrades',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a1a2e; padding: 30px; text-align: center;">
              <h1 style="color: #D4A574; margin: 0;">Finatrades</h1>
              <p style="color: #ffffff; margin-top: 10px;">Technical Documentation</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <h2 style="color: #1a1a2e;">Wingold & Metals API Integration Requirements</h2>
              
              <p>Please find attached the technical specification document for integrating Wingold & Metals with the Finatrades platform.</p>
              
              <h3 style="color: #1a1a2e;">Document Overview:</h3>
              <ul>
                <li>Webhook endpoint configuration</li>
                <li>5 required webhook events</li>
                <li>Payload specifications for each event</li>
                <li>User identification requirements</li>
                <li>Security and authentication requirements</li>
                <li>Retry policy for failed webhooks</li>
                <li>Integration checklist</li>
              </ul>
              
              <h3 style="color: #1a1a2e;">Key Integration Points:</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Webhook Endpoint</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">POST /api/wingold/webhooks</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Critical Event</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">order.fulfilled (triggers wallet credit)</td>
                </tr>
                <tr style="background: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Authentication</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">HMAC-SHA256 signature</td>
                </tr>
              </table>
              
              <p style="color: #cc0000;"><strong>Important:</strong> The order.fulfilled webhook should only be sent after physical gold is securely stored in the vault.</p>
              
              <p>Please review the attached PDF document and contact us if you have any questions.</p>
              
              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>Finatrades Technical Team</strong><br>
                integration@finatrades.com
              </p>
            </div>
            
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>Finatrades Finance SA - Confidential Technical Document</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: 'Wingold_API_Requirements.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      console.log('✓ Sent to:', email, '(' + info.messageId + ')');
    } catch (error: any) {
      console.error('✗ Failed to send to', email + ':', error.message);
    }
  }
  
  console.log('\nDone! Document sent to 3 recipients.');
  process.exit(0);
}

sendWingoldDoc();
