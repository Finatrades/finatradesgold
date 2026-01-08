import fs from 'fs';
import path from 'path';
import { sendEmailWithAttachment } from '../server/email';

async function sendDualWalletPDF() {
  const pdfPath = path.join(process.cwd(), 'public', 'Finatrades-DualWallet-Guide.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF file not found at:', pdfPath);
    process.exit(1);
  }
  
  const pdfContent = fs.readFileSync(pdfPath);
  
  const result = await sendEmailWithAttachment(
    'blockchain@finatrades.com',
    'Finatrades Dual-Wallet System Documentation',
    `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #8A2BE2;">Finatrades Dual-Wallet System Guide</h2>
      <p>Please find attached the comprehensive documentation for the Finatrades Dual-Wallet System.</p>
      <p>This guide covers:</p>
      <ul>
        <li>MPGW (Market Price Gold Wallet) - Value fluctuates with market</li>
        <li>FPGW (Fixed Price Gold Wallet) - Value locked at purchase price</li>
        <li>FIFO batch consumption for FPGW</li>
        <li>Balance buckets (Available, Pending, Locked_BNSL, Reserved_Trade)</li>
        <li>P2P transfer flows with Accept/Reject</li>
        <li>Database structure and storage</li>
      </ul>
      <p>Best regards,<br>Finatrades System</p>
    </div>
    `,
    {
      filename: 'Finatrades-DualWallet-Guide.pdf',
      content: pdfContent,
      contentType: 'application/pdf'
    }
  );
  
  if (result.success) {
    console.log('Email sent successfully! Message ID:', result.messageId);
  } else {
    console.error('Failed to send email:', result.error);
  }
  
  process.exit(0);
}

sendDualWalletPDF();
