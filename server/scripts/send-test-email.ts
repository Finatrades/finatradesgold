import { sendEmail } from '../email';

async function sendTestEmail() {
  const email = process.argv[2] || 'System@finatrades.com';
  const templateType = process.argv[3] || 'email_verification';
  
  console.log(`Sending test email to ${email} using template: ${templateType}`);
  
  const testData = {
    user_name: 'Test User',
    otp_code: '123456',
    amount: '1.5g',
    transaction_id: 'TEST-' + Date.now(),
    dashboard_url: process.env.APP_URL ? `${process.env.APP_URL}/dashboard` : 'https://finatrades.com/dashboard',
    gold_amount: '1.5g',
    usd_value: '$225.00',
    certificate_id: 'CERT-TEST-001',
    status: 'Approved',
    date: new Date().toLocaleDateString()
  };
  
  try {
    const result = await sendEmail(
      email,
      templateType,
      testData,
      { recipientName: 'Test User' }
    );
    
    if (result.success) {
      console.log('Test email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.error('Failed to send:', result.error);
    }
  } catch (error) {
    console.error('Failed to send test email:', error);
    process.exit(1);
  }
}

sendTestEmail();
