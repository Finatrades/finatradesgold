export function generateDPREmailHTML(): { subject: string; html: string } {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const baseUrl = process.env.APP_URL || 
    (process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'https://finatrades.com');
  
  const logoUrl = `${baseUrl}/finatrades-logo-purple.png`;

  const subject = `Finatrades Platform - Detailed Platform Report (DPR) - ${currentDate}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finatrades DPR</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e8e8e8;">
          
          <!-- Light Header with Logo -->
          <tr>
            <td style="background: #ffffff; padding: 40px; text-align: center; border-bottom: 3px solid #8A2BE2;">
              <img src="${logoUrl}" alt="Finatrades" style="height: 60px; max-width: 200px; margin-bottom: 15px;" />
              <p style="color: #8A2BE2; margin: 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                Gold-Backed Digital Financial Platform
              </p>
            </td>
          </tr>

          <!-- Report Title -->
          <tr>
            <td style="padding: 30px 40px 20px; background: #fafafa; border-bottom: 1px solid #eee;">
              <h2 style="color: #8A2BE2; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">
                📋 Detailed Platform Report (DPR)
              </h2>
              <p style="color: #666; margin: 0; font-size: 14px;">
                Generated: ${currentDate}
              </p>
            </td>
          </tr>

          <!-- Platform Overview -->
          <tr>
            <td style="padding: 30px 40px; background: #fff;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px; border-left: 4px solid #8A2BE2; padding-left: 12px;">
                🏢 Platform Overview
              </h3>
              <p style="color: #555; line-height: 1.7; margin: 0;">
                Finatrades is a bank-grade, gold-backed digital financial platform offering integrated services for personal and business users. The platform enables users to buy, sell, store, and trade physical gold through digital wallets with complete regulatory compliance.
              </p>
            </td>
          </tr>

          <!-- Core Modules Section -->
          <tr>
            <td style="padding: 0 40px 30px; background: #fff;">
              <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; border-left: 4px solid #8A2BE2; padding-left: 12px;">
                💎 Core Platform Modules
              </h3>
              
              <!-- Module Cards -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <!-- FinaPay -->
                <tr>
                  <td style="padding: 15px; background: #f8f4ff; border-radius: 12px; border: 1px solid #e8dff5;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50" style="vertical-align: top;">
                          <div style="width: 40px; height: 40px; background: #8A2BE2; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">💳</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <h4 style="color: #8A2BE2; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">FinaPay - Digital Gold Wallet</h4>
                          <p style="color: #555; margin: 0; font-size: 13px; line-height: 1.6;">
                            • Buy, sell, send & receive digital gold<br>
                            • Dual wallet system (LGPW + FGPW)<br>
                            • Live gold price tracking<br>
                            • QR code payments<br>
                            • Binance Pay & card integration
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 15px;"></td></tr>
                
                <!-- FinaVault -->
                <tr>
                  <td style="padding: 15px; background: #fffbf0; border-radius: 12px; border: 1px solid #f5e6c3;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50" style="vertical-align: top;">
                          <div style="width: 40px; height: 40px; background: #D4AF37; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">🏦</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <h4 style="color: #B8962E; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">FinaVault - Physical Gold Storage</h4>
                          <p style="color: #555; margin: 0; font-size: 13px; line-height: 1.6;">
                            • Secure vault storage at certified locations<br>
                            • Physical deposit with inspection workflow<br>
                            • Digital ownership certificates<br>
                            • Certificate verification system<br>
                            • Physical delivery requests
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 15px;"></td></tr>
                
                <!-- FinaBridge -->
                <tr>
                  <td style="padding: 15px; background: #f0f8ff; border-radius: 12px; border: 1px solid #c3e6f5;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50" style="vertical-align: top;">
                          <div style="width: 40px; height: 40px; background: #1890ff; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">🌉</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <h4 style="color: #0050b3; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">FinaBridge - Trade Finance</h4>
                          <p style="color: #555; margin: 0; font-size: 13px; line-height: 1.6;">
                            • Gold-backed trade financing<br>
                            • Secure deal room messaging<br>
                            • Multi-party approval workflow<br>
                            • Document management<br>
                            • Settlement hold processing
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 15px;"></td></tr>
                
                <!-- BNSL -->
                <tr>
                  <td style="padding: 15px; background: #f0fff4; border-radius: 12px; border: 1px solid #c3f5d3;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50" style="vertical-align: top;">
                          <div style="width: 40px; height: 40px; background: #52c41a; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">📈</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <h4 style="color: #389e0d; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">BNSL - Buy Now, Settle Later</h4>
                          <p style="color: #555; margin: 0; font-size: 13px; line-height: 1.6;">
                            • Gold accumulation savings plans<br>
                            • DCA (Dollar-Cost Averaging) auto-buy<br>
                            • Flexible plan durations (3-12 months)<br>
                            • BNSL wallet with lock periods<br>
                            • Payout at maturity
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security Features -->
          <tr>
            <td style="padding: 0 40px 30px; background: #fff;">
              <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; border-left: 4px solid #8A2BE2; padding-left: 12px;">
                🔐 Security & Compliance Features
              </h3>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fff5f5; border-radius: 12px; border: 1px solid #ffd6d6;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="vertical-align: top; padding-right: 15px;">
                          <h5 style="color: #cf1322; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">🛡️ Authentication & Access</h5>
                          <ul style="color: #555; margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.8;">
                            <li>Argon2id password hashing (OWASP)</li>
                            <li>Email OTP verification</li>
                            <li>Session management (PostgreSQL)</li>
                            <li>Role-Based Access Control (RBAC)</li>
                            <li>Transaction PIN protection</li>
                            <li>Passkeys (WebAuthn) support</li>
                          </ul>
                        </td>
                        <td width="50%" style="vertical-align: top; padding-left: 15px;">
                          <h5 style="color: #cf1322; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">🔒 API & Data Security</h5>
                          <ul style="color: #555; margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.8;">
                            <li>CSRF protection (double-submit)</li>
                            <li>Rate limiting on all endpoints</li>
                            <li>Request sanitization</li>
                            <li>HTTPS enforcement</li>
                            <li>Helmet.js security headers</li>
                            <li>PASETO v4 token auth</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Compliance Features -->
          <tr>
            <td style="padding: 0 40px 30px; background: #fff;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fffbe6; border-radius: 12px; border: 1px solid #ffe58f;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="vertical-align: top; padding-right: 15px;">
                          <h5 style="color: #d48806; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">📋 KYC System</h5>
                          <ul style="color: #555; margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.8;">
                            <li>Multi-mode KYC verification</li>
                            <li>Document upload & validation</li>
                            <li>Liveness detection</li>
                            <li>Admin review workflow</li>
                            <li>Resubmission support</li>
                          </ul>
                        </td>
                        <td width="50%" style="vertical-align: top; padding-left: 15px;">
                          <h5 style="color: #d48806; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">⚖️ AML & Fraud Prevention</h5>
                          <ul style="color: #555; margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.8;">
                            <li>Transaction monitoring rules</li>
                            <li>User risk scoring</li>
                            <li>AML case management</li>
                            <li>SAR report generation</li>
                            <li>Fraud alert system</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Verifiable Credentials -->
          <tr>
            <td style="padding: 0 40px 30px; background: #fff;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #e6f4ff; border-radius: 12px; border: 1px solid #91caff;">
                <tr>
                  <td style="padding: 20px;">
                    <h5 style="color: #0958d9; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">🎫 W3C Verifiable Credentials (VC 2.0)</h5>
                    <p style="color: #555; margin: 0; font-size: 12px; line-height: 1.8;">
                      • Cryptographically signed digital identity credentials<br>
                      • RS256 JWT signing with JWKS public key distribution<br>
                      • Auto-issuance on KYC approval<br>
                      • Partner verification API<br>
                      • Revocation & status check endpoints<br>
                      • FATF/eIDAS 2.0 regulatory compliance
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- User Features -->
          <tr>
            <td style="padding: 0 40px 30px; background: #fff;">
              <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; border-left: 4px solid #8A2BE2; padding-left: 12px;">
                👤 User Features
              </h3>
              <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 12px; color: #555; border: 1px solid #eee; border-radius: 8px;">
                <tr style="background: #fafafa;">
                  <td style="padding: 10px; border-radius: 6px 0 0 0;">✅ Account registration & verification</td>
                  <td style="padding: 10px;">✅ Profile management</td>
                  <td style="padding: 10px; border-radius: 0 6px 0 0;">✅ Beneficiary designation</td>
                </tr>
                <tr>
                  <td style="padding: 10px;">✅ Referral program</td>
                  <td style="padding: 10px;">✅ Savings goals tracking</td>
                  <td style="padding: 10px;">✅ Price alerts</td>
                </tr>
                <tr style="background: #fafafa;">
                  <td style="padding: 10px;">✅ Activity log</td>
                  <td style="padding: 10px;">✅ In-app notifications</td>
                  <td style="padding: 10px;">✅ Monthly summary emails</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-radius: 0 0 0 6px;">✅ Help center & chatbot</td>
                  <td style="padding: 10px;">✅ Account statements</td>
                  <td style="padding: 10px; border-radius: 0 0 6px 0;">✅ Push notifications</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Admin Features -->
          <tr>
            <td style="padding: 0 40px 30px; background: #fff;">
              <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; border-left: 4px solid #8A2BE2; padding-left: 12px;">
                ⚙️ Admin & Operations
              </h3>
              <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 12px; color: #555; border: 1px solid #eee; border-radius: 8px;">
                <tr style="background: #fafafa;">
                  <td style="padding: 10px; width: 25%; border-radius: 6px 0 0 0;">Dashboard & analytics</td>
                  <td style="padding: 10px; width: 25%;">User management</td>
                  <td style="padding: 10px; width: 25%;">KYC review queue</td>
                  <td style="padding: 10px; width: 25%; border-radius: 0 6px 0 0;">Compliance dashboard</td>
                </tr>
                <tr>
                  <td style="padding: 10px;">Financial reports</td>
                  <td style="padding: 10px;">Treasury overview</td>
                  <td style="padding: 10px;">Vault operations</td>
                  <td style="padding: 10px;">Gold backing report</td>
                </tr>
                <tr style="background: #fafafa;">
                  <td style="padding: 10px;">Fee management</td>
                  <td style="padding: 10px;">Platform config</td>
                  <td style="padding: 10px;">Payment gateways</td>
                  <td style="padding: 10px;">Geo restrictions</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-radius: 0 0 0 6px;">Audit logs</td>
                  <td style="padding: 10px;">Database backups</td>
                  <td style="padding: 10px;">CMS management</td>
                  <td style="padding: 10px; border-radius: 0 0 6px 0;">Announcements</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Technical Stack -->
          <tr>
            <td style="padding: 0 40px 30px; background: #fff;">
              <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; border-left: 4px solid #8A2BE2; padding-left: 12px;">
                🛠️ Technical Architecture
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="vertical-align: top; padding-right: 10px;">
                    <table width="100%" style="background: #fafafa; border-radius: 8px; border: 1px solid #eee;">
                      <tr>
                        <td style="padding: 15px;">
                          <h6 style="color: #8A2BE2; margin: 0 0 10px 0; font-size: 13px; font-weight: 600;">Frontend</h6>
                          <p style="color: #555; margin: 0; font-size: 11px; line-height: 1.7;">
                            React 18 • TypeScript • Vite<br>
                            Tailwind CSS v4 • shadcn/ui<br>
                            TanStack Query • Framer Motion<br>
                            Socket.IO (real-time)
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="vertical-align: top; padding-left: 10px;">
                    <table width="100%" style="background: #fafafa; border-radius: 8px; border: 1px solid #eee;">
                      <tr>
                        <td style="padding: 15px;">
                          <h6 style="color: #8A2BE2; margin: 0 0 10px 0; font-size: 13px; font-weight: 600;">Backend</h6>
                          <p style="color: #555; margin: 0; font-size: 11px; line-height: 1.7;">
                            Node.js • Express • TypeScript<br>
                            PostgreSQL • Drizzle ORM<br>
                            BullMQ • Redis (Upstash)<br>
                            Pino logging • OpenTelemetry
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Integrations -->
          <tr>
            <td style="padding: 0 40px 30px; background: #fff;">
              <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; border-left: 4px solid #8A2BE2; padding-left: 12px;">
                🔗 Integrations
              </h3>
              <table width="100%" cellpadding="6" cellspacing="8" style="font-size: 12px;">
                <tr>
                  <td style="background: #f0f5ff; padding: 8px 12px; border-radius: 6px;">💰 Binance Pay</td>
                  <td style="background: #f0fff4; padding: 8px 12px; border-radius: 6px;">💳 NGenius</td>
                  <td style="background: #fffbe6; padding: 8px 12px; border-radius: 6px;">📊 Metals-API</td>
                  <td style="background: #fff0f6; padding: 8px 12px; border-radius: 6px;">📧 Brevo SMTP</td>
                </tr>
                <tr>
                  <td style="background: #f6ffed; padding: 8px 12px; border-radius: 6px;">☁️ Cloudflare R2</td>
                  <td style="background: #e6f4ff; padding: 8px 12px; border-radius: 6px;">🗄️ AWS RDS</td>
                  <td style="background: #fff7e6; padding: 8px 12px; border-radius: 6px;">⚡ Upstash Redis</td>
                  <td style="background: #f9f0ff; padding: 8px 12px; border-radius: 6px;">🤝 Wingold Partner</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Mobile App -->
          <tr>
            <td style="padding: 0 40px 30px; background: #fff;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f0f5ff; border-radius: 12px; border: 1px solid #d6e4ff;">
                <tr>
                  <td style="padding: 20px;">
                    <h5 style="color: #1d39c4; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">📱 Mobile App (Capacitor)</h5>
                    <p style="color: #555; margin: 0; font-size: 12px; line-height: 1.8;">
                      iOS & Android builds configured • Camera for KYC scanning • Push notifications • Biometric authentication • Haptic feedback
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Light Footer -->
          <tr>
            <td style="background: #fafafa; padding: 30px 40px; text-align: center; border-top: 3px solid #8A2BE2;">
              <img src="${logoUrl}" alt="Finatrades" style="height: 40px; margin-bottom: 15px;" />
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
                This is an automated Detailed Platform Report from Finatrades
              </p>
              <p style="color: #999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} Finatrades. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}
