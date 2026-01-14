import { sendEmailDirect } from './email';

const recipients = [
  'legal@finatrades.com',
  'chairman@winvestnet.com', 
  'blockchain@finatrades.com'
];

const subject = 'Wingold & Metals DMCC - API Integration Requirements for Finatrades Platform';

const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #8A2BE2, #DA70D6); color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; max-width: 700px; margin: 0 auto; }
    h2 { color: #8A2BE2; border-bottom: 2px solid #8A2BE2; padding-bottom: 10px; }
    h3 { color: #555; margin-top: 25px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #8A2BE2; color: white; }
    .highlight { background: #f8f4ff; padding: 15px; border-left: 4px solid #8A2BE2; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    ul { margin: 10px 0; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Finatrades Platform</h1>
    <p>Wingold & Metals DMCC Integration Request</p>
  </div>
  
  <div class="content">
    <p>Dear Wingold & Metals DMCC Team,</p>
    
    <p>We are integrating your gold products into the Finatrades digital platform and need the following API specifications to complete our integration:</p>

    <h2>1. Pricing & Charges API</h2>
    <p>We need API endpoints that return:</p>
    <ul>
      <li><strong>VAT percentage</strong> (currently 5% in UAE)</li>
      <li><strong>Making charges</strong> per bar size (1g, 10g, 100g, 1kg)</li>
      <li><strong>Handling/Storage fees</strong> (if applicable)</li>
      <li><strong>Final price breakdown</strong> showing:</li>
    </ul>
    
    <table>
      <tr><th>Component</th><th>Description</th></tr>
      <tr><td>Base Gold Price</td><td>Spot price × weight in grams</td></tr>
      <tr><td>Making Charges</td><td>Manufacturing cost per bar</td></tr>
      <tr><td>VAT Amount</td><td>5% on total</td></tr>
      <tr><td>Total Price</td><td>AED & USD equivalent</td></tr>
    </table>

    <h2>2. Product Catalog API</h2>
    <ul>
      <li>Complete product list with images, weights, and purity</li>
      <li>Stock availability (real-time or cached)</li>
      <li>Bar serial numbers format</li>
      <li>Certification documents per bar</li>
    </ul>

    <h2>3. Order Management API</h2>
    <ul>
      <li><strong>Order submission endpoint</strong> - Create order</li>
      <li><strong>Order status webhook</strong> - Notify Finatrades of approval/rejection</li>
      <li><strong>Approval callback URL</strong> - Wingold admin approves → sends callback to Finatrades</li>
      <li><strong>Bar allocation details</strong> - Serial numbers, vault location, storage certificate</li>
    </ul>

    <h2>4. Authentication</h2>
    <ul>
      <li>API key or OAuth credentials</li>
      <li>Webhook secret for verifying callbacks</li>
      <li>Sandbox/test environment access</li>
    </ul>

    <h2>5. Business Information</h2>
    <ul>
      <li>DMCC trade license number</li>
      <li>Vault partner details (for certificates)</li>
      <li>Supported payment methods</li>
    </ul>

    <div class="highlight">
      <strong>Current Integration Status:</strong><br>
      We have implemented the dual-approval workflow where:
      <ol>
        <li>User places order on Finatrades</li>
        <li>Order sent to Wingold API for approval</li>
        <li>Wingold admin approves and allocates physical gold</li>
        <li>Finatrades admin reviews in UFM (Unified Funds Management)</li>
        <li>UTT (Unified Tally Tracker) credits gold to user's wallet</li>
      </ol>
      <p>We are using real product images from wingoldandmetals.com. However, we need VAT and making charges data to display accurate pricing in the cart.</p>
    </div>

    <p>Please provide API documentation or a technical specification document at your earliest convenience.</p>

    <p>Best regards,<br>
    <strong>Finatrades Technical Team</strong><br>
    Finatrades Finance SA</p>
  </div>
  
  <div class="footer">
    <p>This email was sent from the Finatrades Platform</p>
    <p>© 2026 Finatrades Finance SA. All rights reserved.</p>
  </div>
</body>
</html>
`;

async function sendEmails() {
  console.log('Sending Wingold API Integration Requirements emails...');
  console.log('Recipients:', recipients.join(', '));
  console.log('---');
  
  for (const recipient of recipients) {
    try {
      const result = await sendEmailDirect(recipient, subject, htmlBody);
      if (result.success) {
        console.log(`✓ Email to ${recipient}: SUCCESS (ID: ${result.messageId})`);
      } else {
        console.log(`✗ Email to ${recipient}: FAILED - ${result.error}`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to send to ${recipient}:`, error.message);
    }
  }
  
  console.log('---');
  console.log('All emails processed!');
  process.exit(0);
}

sendEmails();
