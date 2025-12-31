import { sendEmailDirect } from '../server/email';
import * as fs from 'fs';
import * as path from 'path';

async function sendTestEmail() {
  const to = process.argv[2] || 'cps2050@gmail.com';
  const subject = '🌟 Happy New Year 2026 - A New Chapter for Finatrades';
  
  const templatePath = path.join(process.cwd(), 'docs/email-templates/new-year-2026-launch.html');
  const htmlBody = fs.readFileSync(templatePath, 'utf-8');
  
  console.log(`Sending New Year 2026 email to: ${to}`);
  
  const result = await sendEmailDirect(to, subject, htmlBody);
  
  if (result.success) {
    console.log(`✅ Email sent successfully! Message ID: ${result.messageId}`);
  } else {
    console.error(`❌ Failed to send email: ${result.error}`);
  }
  
  process.exit(result.success ? 0 : 1);
}

sendTestEmail().catch(console.error);
