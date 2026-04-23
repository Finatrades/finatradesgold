/**
 * Security Alert Email - Domain Redirection Attack Warning
 * Sends a threatening security warning email about unauthorized server redirection attempts
 */

import { sendEmailDirect } from '../server/email';

const SECURITY_EMAILS = [
  'chairman@winvestnet.com',
  'legal@finatrades.com',
  'blockchain@finatrades.com'
];

async function sendSecurityAlert() {
  const timestamp = new Date().toISOString();
  const attackerInfo = {
    attemptedDomain: 'finagold.com',
    suspectedAction: 'Server redirection attempt',
    detectionTime: timestamp,
    threatLevel: 'CRITICAL',
    ipAddresses: ['Unknown - Investigation Required'],
    affectedSystems: ['DNS Records', 'Domain Configuration', 'Server Routing']
  };

  const subject = '🚨 CRITICAL SECURITY ALERT: Unauthorized Domain Redirection Attempt Detected';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #1a1a2e;">
      <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
        
        <!-- CRITICAL HEADER -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <div style="font-size: 60px; margin-bottom: 10px;">🛡️⚠️🔒</div>
          <h1 style="color: white; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">
            SECURITY BREACH DETECTED
          </h1>
          <p style="color: #fca5a5; margin: 10px 0 0 0; font-size: 16px;">
            Immediate Action Required
          </p>
        </div>
        
        <!-- THREAT LEVEL BANNER -->
        <div style="background: #450a0a; padding: 15px; text-align: center; border-left: 4px solid #dc2626; border-right: 4px solid #dc2626;">
          <span style="color: #fca5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Threat Level:</span>
          <span style="color: #ef4444; font-size: 24px; font-weight: bold; margin-left: 10px; animation: pulse 1s infinite;">
            ${attackerInfo.threatLevel}
          </span>
        </div>

        <!-- MAIN CONTENT -->
        <div style="background: #0f0f23; padding: 30px; border-left: 4px solid #dc2626; border-right: 4px solid #dc2626;">
          
          <!-- ALERT MESSAGE -->
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 10px; padding: 20px; margin-bottom: 25px; border: 1px solid #4c1d95;">
            <h2 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 18px;">
              ⚡ Unauthorized Server Redirection Attempt
            </h2>
            <p style="color: #e2e8f0; margin: 0; line-height: 1.8; font-size: 15px;">
              Our security monitoring systems have detected a <strong style="color: #ef4444;">malicious attempt</strong> to redirect server traffic on the <strong style="color: #f59e0b;">finagold.com</strong> domain. 
              This appears to be an unauthorized DNS manipulation or server hijacking attempt.
            </p>
          </div>

          <!-- ATTACK DETAILS TABLE -->
          <div style="background: #1e293b; border-radius: 10px; overflow: hidden; margin-bottom: 25px;">
            <div style="background: #334155; padding: 12px 20px;">
              <h3 style="color: #94a3b8; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
                📋 Attack Details
              </h3>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 15px 20px; color: #94a3b8; border-bottom: 1px solid #334155; width: 40%;">Target Domain</td>
                <td style="padding: 15px 20px; color: #f59e0b; border-bottom: 1px solid #334155; font-weight: bold;">${attackerInfo.attemptedDomain}</td>
              </tr>
              <tr>
                <td style="padding: 15px 20px; color: #94a3b8; border-bottom: 1px solid #334155;">Attack Type</td>
                <td style="padding: 15px 20px; color: #ef4444; border-bottom: 1px solid #334155; font-weight: bold;">${attackerInfo.suspectedAction}</td>
              </tr>
              <tr>
                <td style="padding: 15px 20px; color: #94a3b8; border-bottom: 1px solid #334155;">Detection Time</td>
                <td style="padding: 15px 20px; color: #e2e8f0; border-bottom: 1px solid #334155;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}</td>
              </tr>
              <tr>
                <td style="padding: 15px 20px; color: #94a3b8;">Affected Systems</td>
                <td style="padding: 15px 20px; color: #fbbf24;">${attackerInfo.affectedSystems.join(', ')}</td>
              </tr>
            </table>
          </div>

          <!-- WARNING MESSAGE -->
          <div style="background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); border-radius: 10px; padding: 20px; margin-bottom: 25px; border: 2px solid #ef4444;">
            <h3 style="color: #fca5a5; margin: 0 0 10px 0; font-size: 16px;">
              ⚠️ WARNING TO ATTACKER
            </h3>
            <p style="color: #fef2f2; margin: 0; line-height: 1.8; font-size: 14px;">
              Your unauthorized access attempt has been <strong>LOGGED and TRACED</strong>. All evidence has been preserved for potential legal action. 
              Continued unauthorized access attempts will be reported to:
            </p>
            <ul style="color: #fca5a5; margin: 15px 0 0 0; padding-left: 20px; line-height: 2;">
              <li>Local and International Law Enforcement Agencies</li>
              <li>Cybercrime Investigation Units</li>
              <li>Internet Crime Complaint Center (IC3)</li>
              <li>Domain Registrar Abuse Teams</li>
            </ul>
          </div>

          <!-- IMMEDIATE ACTIONS -->
          <div style="background: #1e3a5f; border-radius: 10px; padding: 20px; border-left: 4px solid #3b82f6;">
            <h3 style="color: #60a5fa; margin: 0 0 15px 0; font-size: 16px;">
              🔧 Recommended Immediate Actions
            </h3>
            <ol style="color: #bfdbfe; margin: 0; padding-left: 20px; line-height: 2.2;">
              <li>Lock all DNS records immediately</li>
              <li>Enable registrar lock on domain</li>
              <li>Rotate all API keys and credentials</li>
              <li>Review access logs for suspicious activity</li>
              <li>Enable enhanced monitoring on all endpoints</li>
              <li>Contact domain registrar security team</li>
              <li>Document all evidence for legal purposes</li>
            </ol>
          </div>

        </div>

        <!-- FOOTER -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 25px; border-radius: 0 0 12px 12px; text-align: center; border-top: 2px solid #dc2626;">
          <div style="margin-bottom: 15px;">
            <span style="color: #ef4444; font-size: 24px;">🔒</span>
          </div>
          <p style="color: #64748b; margin: 0; font-size: 12px;">
            This is an automated security alert from the Finatrades Security Operations Center
          </p>
          <p style="color: #475569; margin: 10px 0 0 0; font-size: 11px;">
            Generated: ${timestamp} | Reference: SEC-${Date.now().toString(36).toUpperCase()}
          </p>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #334155;">
            <p style="color: #94a3b8; margin: 0; font-size: 13px; font-weight: bold;">
              FINATRADES SECURITY TEAM
            </p>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 11px;">
              "Securing Your Digital Gold Assets 24/7"
            </p>
          </div>
        </div>
        
      </div>
    </body>
    </html>
  `;

  console.log('🚨 Sending security alert emails...');
  
  const results = [];
  for (const email of SECURITY_EMAILS) {
    try {
      console.log(`\n📧 Sending to: ${email}`);
      const result = await sendEmailDirect(
        email,
        subject,
        html
      );
      console.log(`✅ Sent successfully to ${email}`);
      results.push({ email, success: true, result });
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error);
      results.push({ email, success: false, error });
    }
  }
  
  console.log('\n📋 Subject:', subject);
  console.log('📊 Summary:', results.filter(r => r.success).length, 'of', SECURITY_EMAILS.length, 'emails sent');
  return results;
}

sendSecurityAlert()
  .then(() => {
    console.log('\n🛡️ Security alert dispatch complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
