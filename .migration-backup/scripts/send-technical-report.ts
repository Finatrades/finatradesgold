import { sendEmailDirect } from "../server/email";
import { readFileSync } from "fs";
import { join } from "path";

async function sendTechnicalReport() {
  const recipients = [
    "legal@finatrades.com",
    "blockchain@finatrades.com"
  ];

  const reportPath = join(process.cwd(), "docs/TECHNICAL_DETAILS.md");
  const reportContent = readFileSync(reportPath, "utf-8");

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8A2BE2 0%, #4B0082 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { background: #f9f9f9; padding: 25px; border-radius: 10px; border: 1px solid #e0e0e0; }
    .section { margin-bottom: 20px; }
    .section h2 { color: #4B0082; border-bottom: 2px solid #8A2BE2; padding-bottom: 10px; }
    .highlight { background: #f0e6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #8A2BE2; margin: 15px 0; }
    .stats { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
    .stat-box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex: 1; min-width: 150px; text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; color: #8A2BE2; }
    .stat-label { color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #8A2BE2; color: white; }
    tr:hover { background: #f5f0ff; }
    .footer { margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 10px; text-align: center; color: #666; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .badge-purple { background: #e6d5ff; color: #4B0082; }
    .badge-green { background: #d5f5e3; color: #1e8449; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Finatrades Technical Details Report</h1>
    <p>Comprehensive Platform Documentation</p>
    <p style="font-size: 12px; margin-top: 15px;">Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="content">
    <div class="section">
      <h2>Executive Summary</h2>
      <p>This report provides comprehensive technical documentation for the Finatrades gold-backed digital financial platform. It covers all major systems including notifications, payments, security, and trading features.</p>
      
      <div class="stats">
        <div class="stat-box">
          <div class="stat-number">55</div>
          <div class="stat-label">Email Templates</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">25+</div>
          <div class="stat-label">Bell Notification Types</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">10</div>
          <div class="stat-label">Push Events</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">13</div>
          <div class="stat-label">Config Categories</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Documentation Sections</h2>
      <table>
        <tr>
          <th>Section</th>
          <th>Description</th>
          <th>Status</th>
        </tr>
        <tr>
          <td>Notification System</td>
          <td>Email, Bell, and Push notification documentation</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>Platform Configuration</td>
          <td>All configurable settings and parameters</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>User Preferences</td>
          <td>User preference fields and controls</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>KYC Verification</td>
          <td>KYC tiers, modes, and document requirements</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>FinaPay - Wallet System</td>
          <td>Wallet structure, transactions, P2P transfers</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>FinaVault - Gold Storage</td>
          <td>Vault holdings and storage types</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>BNSL</td>
          <td>Buy Now Sell Later plans and payouts</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>FinaBridge</td>
          <td>Trade finance, deal rooms, settlements</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>Payment Integrations</td>
          <td>Binance Pay, NGenius, Stripe, Bank Transfer</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>Security Features</td>
          <td>MFA, biometrics, CSRF, headers</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>Certificate System</td>
          <td>Certificate types and verification</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
        <tr>
          <td>Database Schema</td>
          <td>All tables and API architecture</td>
          <td><span class="badge badge-green">Complete</span></td>
        </tr>
      </table>
    </div>

    <div class="highlight">
      <strong>Full Documentation:</strong> The complete technical documentation (831 lines) is available in the repository at <code>docs/TECHNICAL_DETAILS.md</code>
    </div>

    <div class="section">
      <h2>Key Highlights</h2>
      
      <h3>Notification System</h3>
      <ul>
        <li><strong>55 Email Templates</strong> across 8 categories (Auth, KYC, Transactions, P2P, BNSL, FinaBridge, Certificates, Marketing)</li>
        <li><strong>25+ Bell Notification Types</strong> for in-app alerts</li>
        <li><strong>10 Push Events</strong> for FinaBridge trade finance</li>
        <li><strong>3-Level Control</strong>: Global admin toggle, per-type admin toggle, user preferences</li>
      </ul>

      <h3>BNSL Returns Structure</h3>
      <table>
        <tr><th>Term</th><th>Annual Margin</th></tr>
        <tr><td>12 months</td><td>10%</td></tr>
        <tr><td>24 months</td><td>11%</td></tr>
        <tr><td>36 months</td><td>12%</td></tr>
      </table>

      <h3>Payment Methods</h3>
      <ul>
        <li><strong>Binance Pay</strong> - Cryptocurrency payments</li>
        <li><strong>NGenius</strong> - Credit/Debit card processing</li>
        <li><strong>Stripe</strong> - Card payments</li>
        <li><strong>Bank Transfer</strong> - Manual fiat deposits</li>
        <li><strong>Crypto Deposits</strong> - Direct crypto transfers</li>
      </ul>

      <h3>Security Features</h3>
      <ul>
        <li>Multi-Factor Authentication (TOTP, SMS, Email)</li>
        <li>Biometric Authentication</li>
        <li>Transaction PIN</li>
        <li>CSRF Protection with custom headers</li>
        <li>Idempotency middleware for payment routes</li>
        <li>Helmet.js security headers</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <p><strong>Finatrades Platform</strong></p>
    <p>Author: Charan Pratap Singh | Contact: +971568474843</p>
    <p style="font-size: 12px;">This is an automated system report. For questions, contact the development team.</p>
  </div>
</body>
</html>
  `;

  console.log("Sending Technical Details Report...\n");

  for (const recipient of recipients) {
    try {
      const result = await sendEmailDirect(
        recipient,
        "Finatrades Technical Details Report - Comprehensive Platform Documentation",
        htmlBody
      );
      
      if (result.success) {
        console.log(`✓ Sent successfully to: ${recipient}`);
      } else {
        console.log(`✗ Failed to send to ${recipient}: ${result.error}`);
      }
    } catch (error) {
      console.log(`✗ Error sending to ${recipient}:`, error);
    }
  }

  console.log("\nDone!");
}

sendTechnicalReport().catch(console.error);
