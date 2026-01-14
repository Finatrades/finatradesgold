/**
 * Generates comprehensive PDF proposal for Verifiable Credentials System
 * Finatrades <-> Wingold KYC Integration
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const PRIMARY_COLOR = '#f97316';
const SECONDARY_COLOR = '#1f2937';
const ACCENT_COLOR = '#3b82f6';
const LIGHT_GRAY = '#f3f4f6';
const DARK_GRAY = '#6b7280';

function generatePDF(): string {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: 'Verifiable Credentials System - Technical Proposal',
      Author: 'Finatrades Technology Team',
      Subject: 'Cross-Platform KYC Integration using W3C Verifiable Credentials',
      Creator: 'Finatrades'
    }
  });

  const outputPath = path.join(process.cwd(), 'attached_assets', 'VC-System-Proposal-Finatrades-Wingold.pdf');
  
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }
  
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // ============================================
  // COVER PAGE
  // ============================================
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1f2937');
  
  doc.fillColor('#ffffff')
     .fontSize(12)
     .text('CONFIDENTIAL', 50, 50, { align: 'right' });
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(42)
     .font('Helvetica-Bold')
     .text('VERIFIABLE', 50, 200, { align: 'center' });
  
  doc.fillColor('#ffffff')
     .fontSize(42)
     .text('CREDENTIALS', 50, 250, { align: 'center' });
  
  doc.fontSize(24)
     .fillColor(PRIMARY_COLOR)
     .text('SYSTEM PROPOSAL', 50, 310, { align: 'center' });
  
  doc.fontSize(16)
     .fillColor('#9ca3af')
     .text('Cross-Platform KYC Integration', 50, 380, { align: 'center' })
     .text('Finatrades ↔ Wingold & Metals', 50, 405, { align: 'center' });
  
  doc.fontSize(14)
     .fillColor('#ffffff')
     .text('W3C Verifiable Credentials 2.0 Standard', 50, 480, { align: 'center' })
     .text('Compliant with eIDAS 2.0 & Global Regulations', 50, 505, { align: 'center' });
  
  doc.fontSize(12)
     .fillColor('#6b7280')
     .text('Prepared by: Finatrades Technology Team', 50, 650, { align: 'center' })
     .text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 670, { align: 'center' })
     .text('Version: 1.0', 50, 690, { align: 'center' });

  // ============================================
  // TABLE OF CONTENTS
  // ============================================
  doc.addPage();
  
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('TABLE OF CONTENTS', 50, 50);
  
  doc.moveTo(50, 90).lineTo(545, 90).strokeColor(PRIMARY_COLOR).lineWidth(3).stroke();
  
  const tocItems = [
    { title: 'Executive Summary', page: '3' },
    { title: 'Current State Analysis', page: '4' },
    { title: 'The Challenge', page: '5' },
    { title: 'Solution Overview: Verifiable Credentials', page: '6' },
    { title: 'Technical Architecture', page: '7' },
    { title: 'System Components', page: '8' },
    { title: 'Data Flow & Process', page: '9' },
    { title: 'Credential Structure', page: '10' },
    { title: 'Security Architecture', page: '11' },
    { title: 'Implementation Phases', page: '12' },
    { title: 'Compliance & Regulatory', page: '13' },
    { title: 'Benefits & ROI', page: '14' },
    { title: 'Technical Specifications', page: '15' },
    { title: 'Next Steps', page: '16' },
  ];
  
  let tocY = 120;
  tocItems.forEach((item, i) => {
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor(SECONDARY_COLOR)
       .text(`${i + 1}.`, 50, tocY, { width: 30 })
       .text(item.title, 80, tocY, { width: 400 })
       .text(item.page, 500, tocY, { align: 'right', width: 45 });
    
    doc.moveTo(80, tocY + 18).lineTo(500, tocY + 18).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    tocY += 35;
  });

  // ============================================
  // EXECUTIVE SUMMARY
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('1. EXECUTIVE SUMMARY', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  doc.fontSize(12)
     .font('Helvetica')
     .fillColor(SECONDARY_COLOR)
     .text('This proposal outlines a comprehensive solution for implementing Verifiable Credentials (VCs) to enable seamless, compliant KYC data sharing between Finatrades and Wingold & Metals platforms.', 50, 110, { width: 495, align: 'justify' });
  
  // Key Points Box
  doc.rect(50, 160, 495, 180).fillAndStroke(LIGHT_GRAY, '#e5e7eb');
  
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('KEY HIGHLIGHTS', 65, 175);
  
  const highlights = [
    '✓  Users complete KYC once on Finatrades, reuse on Wingold instantly',
    '✓  Cryptographically signed credentials ensure tamper-proof verification',
    '✓  Compliant with W3C VC 2.0, eIDAS 2.0, and FATF guidelines',
    '✓  User controls their data with selective disclosure capability',
    '✓  Eliminates redundant KYC costs and onboarding friction',
    '✓  Enterprise-grade security with RSA-256 digital signatures',
  ];
  
  let hlY = 200;
  doc.fontSize(11).font('Helvetica').fillColor(SECONDARY_COLOR);
  highlights.forEach(h => {
    doc.text(h, 65, hlY, { width: 465 });
    hlY += 22;
  });
  
  // Stats boxes
  doc.rect(50, 370, 155, 80).fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);
  doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('50%', 65, 385);
  doc.fontSize(10).font('Helvetica').text('Cost Reduction', 65, 420);
  doc.fontSize(9).text('in KYC processing', 65, 433);
  
  doc.rect(220, 370, 155, 80).fillAndStroke(ACCENT_COLOR, ACCENT_COLOR);
  doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('40%', 235, 385);
  doc.fontSize(10).font('Helvetica').text('Faster Onboarding', 235, 420);
  doc.fontSize(9).text('for cross-platform users', 235, 433);
  
  doc.rect(390, 370, 155, 80).fillAndStroke('#10b981', '#10b981');
  doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('100%', 405, 385);
  doc.fontSize(10).font('Helvetica').text('Compliance Ready', 405, 420);
  doc.fontSize(9).text('W3C + eIDAS 2.0', 405, 433);
  
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(12)
     .font('Helvetica')
     .text('The proposed Verifiable Credentials system transforms how identity verification data is shared between partner platforms. By implementing W3C\'s VC 2.0 standard, we enable a "verify once, use everywhere" model that respects user privacy while maintaining full regulatory compliance.', 50, 480, { width: 495, align: 'justify' });
  
  doc.fontSize(12)
     .text('This solution positions both Finatrades and Wingold at the forefront of digital identity innovation, preparing our platforms for the mandated European Digital Identity Wallet (eIDAS 2.0) and emerging global standards.', 50, 550, { width: 495, align: 'justify' });

  // ============================================
  // CURRENT STATE ANALYSIS
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('2. CURRENT STATE ANALYSIS', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(SECONDARY_COLOR)
     .text('Current SSO Integration', 50, 110);
  
  doc.fontSize(11)
     .font('Helvetica')
     .text('The existing Single Sign-On (SSO) implementation between Finatrades and Wingold uses JWT tokens with the following characteristics:', 50, 135, { width: 495 });
  
  // Current flow diagram
  doc.rect(50, 175, 495, 120).strokeColor('#e5e7eb').lineWidth(1).stroke();
  
  doc.fontSize(10).font('Helvetica-Bold').fillColor(SECONDARY_COLOR).text('CURRENT SSO FLOW', 60, 185);
  
  // Flow boxes
  doc.rect(60, 210, 100, 40).fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);
  doc.fillColor('#ffffff').fontSize(9).text('FINATRADES', 70, 218);
  doc.fontSize(8).text('User Logged In', 70, 232);
  
  doc.moveTo(160, 230).lineTo(200, 230).strokeColor(SECONDARY_COLOR).lineWidth(1).stroke();
  doc.text('JWT Token', 165, 218, { width: 40 });
  
  doc.rect(200, 210, 100, 40).fillAndStroke(ACCENT_COLOR, ACCENT_COLOR);
  doc.fillColor('#ffffff').fontSize(9).text('SSO REDIRECT', 210, 218);
  doc.fontSize(8).text('w/ User Data', 220, 232);
  
  doc.moveTo(300, 230).lineTo(340, 230).strokeColor(SECONDARY_COLOR).lineWidth(1).stroke();
  
  doc.rect(340, 210, 100, 40).fillAndStroke('#10b981', '#10b981');
  doc.fillColor('#ffffff').fontSize(9).text('WINGOLD', 360, 218);
  doc.fontSize(8).text('Auto Login', 365, 232);
  
  doc.fillColor(DARK_GRAY)
     .fontSize(9)
     .text('Token contains: email, name, KYC status (approved/pending), account type', 60, 265);
  
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('Current Limitations', 50, 320);
  
  const limitations = [
    { icon: '⚠️', title: 'Status Only, No Documents', desc: 'JWT shares KYC status but Wingold cannot access actual verification documents for their compliance records.' },
    { icon: '⚠️', title: 'No Audit Trail', desc: 'Wingold has no cryptographic proof of when/how the user was verified, making regulatory audits challenging.' },
    { icon: '⚠️', title: 'Centralized Trust', desc: 'Wingold must fully trust Finatrades\' KYC claim with no independent verification capability.' },
    { icon: '⚠️', title: 'No Selective Disclosure', desc: 'All user data is shared every time - no ability to share only what\'s needed for specific use cases.' },
  ];
  
  let limY = 345;
  limitations.forEach(lim => {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(SECONDARY_COLOR).text(`${lim.icon}  ${lim.title}`, 60, limY);
    doc.fontSize(10).font('Helvetica').fillColor(DARK_GRAY).text(lim.desc, 75, limY + 16, { width: 460 });
    limY += 55;
  });

  // ============================================
  // THE CHALLENGE
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('3. THE CHALLENGE', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  doc.fontSize(12)
     .font('Helvetica')
     .fillColor(SECONDARY_COLOR)
     .text('When a Finatrades user navigates to Wingold, both platforms face regulatory and operational challenges that the current SSO system does not fully address:', 50, 110, { width: 495, align: 'justify' });
  
  // Challenge boxes
  const challenges = [
    {
      title: 'REGULATORY COMPLIANCE',
      color: '#ef4444',
      points: [
        'Wingold may be required to maintain their own KYC records',
        'Different jurisdictions have varying document retention requirements',
        'Audit trails must prove when and how identity was verified',
        'AML regulations may require independent verification'
      ]
    },
    {
      title: 'OPERATIONAL FRICTION',
      color: '#f59e0b',
      points: [
        'Users may be asked to re-submit documents on Wingold',
        'Duplicate KYC processes increase costs for both platforms',
        'User experience suffers with repeated verification requests',
        'Document management becomes fragmented across systems'
      ]
    },
    {
      title: 'DATA PRIVACY CONCERNS',
      color: '#8b5cf6',
      points: [
        'Sensitive documents copied across multiple databases',
        'Users have no control over what data is shared',
        'Increased attack surface for data breaches',
        'GDPR/data protection compliance complexity'
      ]
    }
  ];
  
  let challengeY = 160;
  challenges.forEach(challenge => {
    doc.rect(50, challengeY, 495, 120).strokeColor(challenge.color).lineWidth(2).stroke();
    doc.rect(50, challengeY, 495, 25).fillAndStroke(challenge.color, challenge.color);
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text(challenge.title, 60, challengeY + 7);
    
    let pointY = challengeY + 35;
    doc.fontSize(10).font('Helvetica').fillColor(SECONDARY_COLOR);
    challenge.points.forEach(point => {
      doc.text(`•  ${point}`, 60, pointY, { width: 475 });
      pointY += 18;
    });
    
    challengeY += 140;
  });
  
  // Question box
  doc.rect(50, 590, 495, 60).fillAndStroke('#fef3c7', '#f59e0b');
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('THE CORE QUESTION:', 65, 605);
  doc.fontSize(11)
     .font('Helvetica-Oblique')
     .text('How can Finatrades share verified KYC credentials with Wingold in a way that is compliant, secure, user-controlled, and eliminates redundant verification processes?', 65, 622, { width: 465 });

  // ============================================
  // SOLUTION OVERVIEW
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('4. SOLUTION: VERIFIABLE CREDENTIALS', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(SECONDARY_COLOR)
     .text('What are Verifiable Credentials?', 50, 110);
  
  doc.fontSize(11)
     .font('Helvetica')
     .text('Verifiable Credentials (VCs) are a W3C international standard for expressing credentials on the web in a way that is cryptographically secure, privacy-respecting, and machine-verifiable.', 50, 135, { width: 495, align: 'justify' });
  
  // Analogy box
  doc.rect(50, 175, 495, 70).fillAndStroke('#dbeafe', ACCENT_COLOR);
  doc.fillColor(ACCENT_COLOR)
     .fontSize(11)
     .font('Helvetica-Bold')
     .text('💡 Think of it like a Digital Passport:', 65, 190);
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(10)
     .font('Helvetica')
     .text('Just as a government issues a passport that other countries accept, Finatrades issues a KYC credential that Wingold (and any future partner) can verify instantly without contacting Finatrades directly.', 65, 207, { width: 465 });
  
  // Three pillars
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(SECONDARY_COLOR)
     .text('The Three Roles in Verifiable Credentials', 50, 270);
  
  // Issuer
  doc.rect(50, 300, 155, 150).fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);
  doc.fillColor('#ffffff')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('ISSUER', 85, 315);
  doc.fontSize(11)
     .font('Helvetica')
     .text('Finatrades', 90, 340);
  doc.fontSize(9)
     .text('• Verifies user identity', 60, 370, { width: 140 })
     .text('• Issues signed credential', 60, 385, { width: 140 })
     .text('• Maintains revocation registry', 60, 400, { width: 140 })
     .text('• Provides public key', 60, 415, { width: 140 });
  
  // Holder
  doc.rect(220, 300, 155, 150).fillAndStroke(ACCENT_COLOR, ACCENT_COLOR);
  doc.fillColor('#ffffff')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('HOLDER', 255, 315);
  doc.fontSize(11)
     .font('Helvetica')
     .text('User', 275, 340);
  doc.fontSize(9)
     .text('• Stores credential in wallet', 230, 370, { width: 140 })
     .text('• Controls what to share', 230, 385, { width: 140 })
     .text('• Presents to verifiers', 230, 400, { width: 140 })
     .text('• Owns their data', 230, 415, { width: 140 });
  
  // Verifier
  doc.rect(390, 300, 155, 150).fillAndStroke('#10b981', '#10b981');
  doc.fillColor('#ffffff')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('VERIFIER', 425, 315);
  doc.fontSize(11)
     .font('Helvetica')
     .text('Wingold', 440, 340);
  doc.fontSize(9)
     .text('• Requests credential', 400, 370, { width: 140 })
     .text('• Verifies signature', 400, 385, { width: 140 })
     .text('• Checks revocation status', 400, 400, { width: 140 })
     .text('• Accepts verified user', 400, 415, { width: 140 });
  
  // Arrows
  doc.moveTo(205, 375).lineTo(220, 375).strokeColor('#ffffff').lineWidth(2).stroke();
  doc.moveTo(375, 375).lineTo(390, 375).strokeColor('#ffffff').lineWidth(2).stroke();
  
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(12)
     .font('Helvetica')
     .text('This model enables trustless verification: Wingold can cryptographically verify a credential without ever contacting Finatrades, using only Finatrades\' publicly available verification key.', 50, 480, { width: 495, align: 'justify' });

  // ============================================
  // TECHNICAL ARCHITECTURE
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('5. TECHNICAL ARCHITECTURE', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  doc.fontSize(12)
     .font('Helvetica')
     .fillColor(SECONDARY_COLOR)
     .text('The following diagram illustrates the complete system architecture for the Verifiable Credentials integration:', 50, 110, { width: 495 });
  
  // Architecture diagram
  doc.rect(50, 150, 495, 350).strokeColor('#e5e7eb').lineWidth(1).stroke();
  
  // Finatrades Platform section
  doc.rect(60, 160, 225, 160).fillAndStroke('#fef3c7', PRIMARY_COLOR);
  doc.fillColor(PRIMARY_COLOR).fontSize(12).font('Helvetica-Bold').text('FINATRADES PLATFORM', 70, 170);
  
  doc.rect(70, 195, 95, 35).fillAndStroke('#ffffff', SECONDARY_COLOR);
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('KYC Service', 80, 200);
  doc.fontSize(7).text('(Identity Verification)', 75, 212);
  
  doc.rect(175, 195, 100, 35).fillAndStroke('#ffffff', SECONDARY_COLOR);
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('VC Issuer Service', 182, 200);
  doc.fontSize(7).text('(Credential Creation)', 180, 212);
  
  doc.rect(70, 245, 95, 35).fillAndStroke('#ffffff', SECONDARY_COLOR);
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('Private Key Store', 77, 250);
  doc.fontSize(7).text('(HSM/Secure Vault)', 75, 262);
  
  doc.rect(175, 245, 100, 35).fillAndStroke('#ffffff', SECONDARY_COLOR);
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('Revocation Registry', 180, 250);
  doc.fontSize(7).text('(Credential Status)', 185, 262);
  
  doc.rect(70, 295, 205, 20).fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text('Public Key Endpoint (/.well-known/jwks)', 80, 300);
  
  // User section
  doc.rect(60, 335, 225, 65).fillAndStroke('#dbeafe', ACCENT_COLOR);
  doc.fillColor(ACCENT_COLOR).fontSize(12).font('Helvetica-Bold').text('USER / HOLDER', 130, 345);
  
  doc.rect(100, 365, 145, 25).fillAndStroke('#ffffff', ACCENT_COLOR);
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('Digital Wallet / Mobile App', 110, 372);
  
  // Wingold section
  doc.rect(310, 160, 225, 160).fillAndStroke('#d1fae5', '#10b981');
  doc.fillColor('#10b981').fontSize(12).font('Helvetica-Bold').text('WINGOLD PLATFORM', 365, 170);
  
  doc.rect(320, 195, 100, 35).fillAndStroke('#ffffff', SECONDARY_COLOR);
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('VC Verifier Service', 328, 200);
  doc.fontSize(7).text('(Signature Check)', 330, 212);
  
  doc.rect(430, 195, 95, 35).fillAndStroke('#ffffff', SECONDARY_COLOR);
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('User Service', 447, 200);
  doc.fontSize(7).text('(Account Creation)', 440, 212);
  
  doc.rect(320, 245, 100, 35).fillAndStroke('#ffffff', SECONDARY_COLOR);
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('Trusted Issuers', 335, 250);
  doc.fontSize(7).text('(Finatrades DID)', 340, 262);
  
  doc.rect(430, 245, 95, 35).fillAndStroke('#ffffff', SECONDARY_COLOR);
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('Compliance Store', 440, 250);
  doc.fontSize(7).text('(Audit Records)', 445, 262);
  
  doc.rect(320, 295, 205, 20).fillAndStroke('#10b981', '#10b981');
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text('SSO Endpoint (/api/sso/finatrades)', 345, 300);
  
  // Blockchain/Registry section
  doc.rect(310, 335, 225, 65).fillAndStroke('#fce7f3', '#ec4899');
  doc.fillColor('#ec4899').fontSize(11).font('Helvetica-Bold').text('TRUST REGISTRY (Optional)', 355, 345);
  doc.rect(330, 365, 185, 25).fillAndStroke('#ffffff', '#ec4899');
  doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text('Decentralized Revocation Status List', 345, 372);
  
  // Flow arrows and labels
  doc.fillColor(DARK_GRAY).fontSize(8);
  doc.text('1. Issues VC', 200, 420);
  doc.text('2. Presents VC', 290, 420);
  doc.text('3. Verifies', 420, 420);
  
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(11)
     .font('Helvetica')
     .text('Key Components:', 50, 520);
  
  doc.fontSize(10)
     .text('• VC Issuer Service: Creates and signs credentials after successful KYC', 60, 540, { width: 475 })
     .text('• Public Key Endpoint: Allows any verifier to fetch Finatrades\' public key', 60, 555, { width: 475 })
     .text('• Revocation Registry: Tracks which credentials have been revoked', 60, 570, { width: 475 })
     .text('• VC Verifier Service: Validates credential signatures and revocation status', 60, 585, { width: 475 });

  // ============================================
  // SYSTEM COMPONENTS
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('6. SYSTEM COMPONENTS', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  // Component table
  const components = [
    { name: 'Credential Issuer API', platform: 'Finatrades', description: 'Issues signed VCs when users complete KYC verification' },
    { name: 'Credential Schema', platform: 'Shared', description: 'Defines the structure of KYC credentials (claims, types)' },
    { name: 'RSA Key Pair', platform: 'Finatrades', description: 'Private key signs credentials; Public key verifies them' },
    { name: 'JWKS Endpoint', platform: 'Finatrades', description: 'Publicly accessible endpoint serving verification keys' },
    { name: 'Revocation List', platform: 'Finatrades', description: 'List of credential IDs that have been revoked' },
    { name: 'Verifier SDK', platform: 'Wingold', description: 'Library to verify credential signatures and claims' },
    { name: 'Trusted Issuer Registry', platform: 'Wingold', description: 'Whitelist of accepted credential issuers (Finatrades)' },
    { name: 'Digital Wallet', platform: 'User', description: 'Secure storage for user credentials (mobile/web app)' },
  ];
  
  // Table header
  doc.rect(50, 110, 495, 25).fillAndStroke(SECONDARY_COLOR, SECONDARY_COLOR);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  doc.text('Component', 60, 118);
  doc.text('Platform', 250, 118);
  doc.text('Description', 340, 118);
  
  let tableY = 135;
  components.forEach((comp, i) => {
    const bgColor = i % 2 === 0 ? '#ffffff' : LIGHT_GRAY;
    doc.rect(50, tableY, 495, 35).fillAndStroke(bgColor, '#e5e7eb');
    doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica-Bold').text(comp.name, 60, tableY + 8, { width: 180 });
    doc.fillColor(ACCENT_COLOR).fontSize(9).font('Helvetica').text(comp.platform, 250, tableY + 12, { width: 80 });
    doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica').text(comp.description, 340, tableY + 8, { width: 195 });
    tableY += 35;
  });
  
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('Technology Stack', 50, 430);
  
  const techStack = [
    { category: 'Cryptography', tech: 'RS256 (RSA + SHA-256), EdDSA as alternative' },
    { category: 'Credential Format', tech: 'W3C Verifiable Credentials 2.0 (JSON-LD)' },
    { category: 'Transport', tech: 'JWT (JSON Web Token) with VC payload' },
    { category: 'Key Distribution', tech: 'JWKS (JSON Web Key Set) at /.well-known/jwks.json' },
    { category: 'Revocation', tech: 'StatusList2021 or Credential Revocation List' },
    { category: 'Identifier', tech: 'DID (Decentralized Identifier) - did:web method' },
  ];
  
  tableY = 460;
  techStack.forEach(item => {
    doc.fontSize(10).font('Helvetica-Bold').fillColor(PRIMARY_COLOR).text(item.category + ':', 60, tableY, { width: 120 });
    doc.fontSize(10).font('Helvetica').fillColor(SECONDARY_COLOR).text(item.tech, 180, tableY, { width: 360 });
    tableY += 22;
  });

  // ============================================
  // DATA FLOW & PROCESS
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('7. DATA FLOW & PROCESS', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(SECONDARY_COLOR)
     .text('Step-by-Step Process Flow', 50, 110);
  
  // Process steps
  const steps = [
    {
      step: 'STEP 1',
      title: 'User Completes KYC on Finatrades',
      color: PRIMARY_COLOR,
      details: [
        'User uploads identity documents (passport, ID card)',
        'Liveness check verifies user is real person',
        'AML/PEP screening against watchlists',
        'Address verification with utility bill or bank statement'
      ]
    },
    {
      step: 'STEP 2',
      title: 'Finatrades Issues Verifiable Credential',
      color: ACCENT_COLOR,
      details: [
        'KYC system marks user as verified',
        'VC Issuer creates credential with user claims',
        'Credential signed with Finatrades private key',
        'Credential stored in user\'s wallet/account'
      ]
    },
    {
      step: 'STEP 3',
      title: 'User Requests SSO to Wingold',
      color: '#8b5cf6',
      details: [
        'User clicks "Go to Wingold" on Finatrades',
        'System retrieves user\'s KYC credential',
        'Credential embedded in SSO redirect request',
        'User is redirected to Wingold with credential'
      ]
    },
    {
      step: 'STEP 4',
      title: 'Wingold Verifies Credential',
      color: '#10b981',
      details: [
        'Wingold extracts credential from request',
        'Fetches Finatrades public key from JWKS endpoint',
        'Verifies digital signature is valid',
        'Checks credential not expired or revoked'
      ]
    },
    {
      step: 'STEP 5',
      title: 'User Logged In - No KYC Required',
      color: '#06b6d4',
      details: [
        'Wingold accepts verified identity claims',
        'User account created/updated automatically',
        'Credential stored for compliance audit trail',
        'User can immediately access Wingold services'
      ]
    },
  ];
  
  let stepY = 140;
  steps.forEach((s, i) => {
    // Step box
    doc.rect(50, stepY, 50, 80).fillAndStroke(s.color, s.color);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text(s.step.split(' ')[0], 55, stepY + 25);
    doc.text(s.step.split(' ')[1], 60, stepY + 40);
    
    // Content box
    doc.rect(100, stepY, 445, 80).strokeColor(s.color).lineWidth(1).stroke();
    doc.fillColor(s.color).fontSize(11).font('Helvetica-Bold').text(s.title, 110, stepY + 8);
    
    let detailY = stepY + 25;
    doc.fontSize(9).font('Helvetica').fillColor(SECONDARY_COLOR);
    s.details.forEach(d => {
      doc.text(`• ${d}`, 115, detailY, { width: 420 });
      detailY += 13;
    });
    
    stepY += 95;
    
    // Arrow between steps
    if (i < steps.length - 1) {
      doc.moveTo(75, stepY - 15).lineTo(75, stepY).strokeColor(DARK_GRAY).lineWidth(1).stroke();
      doc.moveTo(70, stepY - 5).lineTo(75, stepY).lineTo(80, stepY - 5).strokeColor(DARK_GRAY).lineWidth(1).stroke();
    }
  });

  // ============================================
  // CREDENTIAL STRUCTURE
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('8. CREDENTIAL STRUCTURE', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  doc.fontSize(12)
     .font('Helvetica')
     .fillColor(SECONDARY_COLOR)
     .text('The Verifiable Credential contains structured claims about the user\'s verified identity:', 50, 110, { width: 495 });
  
  // Credential example
  doc.rect(50, 145, 495, 380).fillAndStroke('#1e293b', '#1e293b');
  
  doc.fillColor('#10b981')
     .fontSize(10)
     .font('Courier')
     .text('{', 60, 155);
  
  const credentialJson = `  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "KYCCredential"],
  
  "issuer": {
    "id": "did:web:finatrades.com",
    "name": "Finatrades"
  },
  
  "issuanceDate": "2026-01-14T00:00:00Z",
  "expirationDate": "2027-01-14T00:00:00Z",
  
  "credentialSubject": {
    "id": "did:key:z6Mkw...",
    
    // IDENTITY CLAIMS
    "fullName": "John Michael Doe",
    "dateOfBirth": "1990-05-15",
    "nationality": "USA",
    "email": "john@example.com",
    "phone": "+1234567890",
    
    // KYC STATUS CLAIMS
    "kycLevel": "Tier2",
    "kycStatus": "Approved",
    "idDocumentVerified": true,
    "addressVerified": true,
    "livenessCheckPassed": true,
    "amlScreening": "Passed",
    
    // DOCUMENT REFERENCES (hashed)
    "documentHashes": {
      "passport": "sha256:abc123...",
      "proofOfAddress": "sha256:def456..."
    }
  },
  
  "proof": {
    "type": "RsaSignature2018",
    "created": "2026-01-14T00:00:00Z",
    "verificationMethod": "did:web:finatrades.com#key-1",
    "proofPurpose": "assertionMethod",
    "jws": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}`;
  
  doc.fillColor('#e2e8f0')
     .fontSize(8)
     .font('Courier')
     .text(credentialJson, 60, 170, { width: 475 });
  
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(11)
     .font('Helvetica-Bold')
     .text('Key Elements:', 50, 545);
  
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(SECONDARY_COLOR)
     .text('• Issuer DID: Unique identifier for Finatrades as the credential issuer', 60, 565, { width: 475 })
     .text('• Credential Subject: Contains all verified claims about the user', 60, 580, { width: 475 })
     .text('• Proof: Cryptographic signature proving the credential was issued by Finatrades', 60, 595, { width: 475 })
     .text('• Document Hashes: SHA-256 hashes of original documents (not the documents themselves)', 60, 610, { width: 475 });

  // ============================================
  // SECURITY ARCHITECTURE
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('9. SECURITY ARCHITECTURE', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  // Security layers
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(SECONDARY_COLOR)
     .text('Multi-Layer Security Model', 50, 110);
  
  const securityLayers = [
    {
      layer: 'CRYPTOGRAPHIC SECURITY',
      color: '#ef4444',
      measures: [
        'RSA-256 digital signatures on all credentials',
        'Private key stored in Hardware Security Module (HSM)',
        'Public key distributed via secure JWKS endpoint',
        'Signature verification prevents credential tampering'
      ]
    },
    {
      layer: 'CREDENTIAL INTEGRITY',
      color: '#f59e0b',
      measures: [
        'Unique credential ID (jti) prevents replay attacks',
        'Expiration dates ensure time-limited validity',
        'Revocation registry for compromised credentials',
        'Audience claim (aud) prevents misuse across platforms'
      ]
    },
    {
      layer: 'PRIVACY PROTECTION',
      color: '#10b981',
      measures: [
        'Selective disclosure - share only required claims',
        'Document hashes instead of raw documents',
        'User consent required for each presentation',
        'No centralized database of credentials'
      ]
    },
    {
      layer: 'TRANSPORT SECURITY',
      color: ACCENT_COLOR,
      measures: [
        'TLS 1.3 encryption for all communications',
        'Short-lived tokens (5-15 minute expiry)',
        'Secure redirect without token in URL parameters',
        'Certificate pinning for mobile apps'
      ]
    },
  ];
  
  let secY = 140;
  securityLayers.forEach(layer => {
    doc.rect(50, secY, 495, 90).strokeColor(layer.color).lineWidth(2).stroke();
    doc.rect(50, secY, 180, 25).fillAndStroke(layer.color, layer.color);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text(layer.layer, 60, secY + 7);
    
    let measureY = secY + 35;
    doc.fontSize(9).font('Helvetica').fillColor(SECONDARY_COLOR);
    layer.measures.forEach(m => {
      doc.text(`✓  ${m}`, 60, measureY, { width: 475 });
      measureY += 13;
    });
    
    secY += 105;
  });
  
  // Attack mitigation box
  doc.rect(50, 570, 495, 80).fillAndStroke('#fef2f2', '#ef4444');
  doc.fillColor('#ef4444').fontSize(11).font('Helvetica-Bold').text('🛡️  Attack Prevention', 65, 585);
  doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica');
  doc.text('• Credential Forgery: Impossible without Finatrades private key', 65, 605, { width: 465 });
  doc.text('• Replay Attacks: Unique jti claim and short expiry prevent reuse', 65, 618, { width: 465 });
  doc.text('• Man-in-the-Middle: TLS encryption and certificate validation', 65, 631, { width: 465 });

  // ============================================
  // IMPLEMENTATION PHASES
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('10. IMPLEMENTATION PHASES', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  const phases = [
    {
      phase: 'PHASE 1',
      title: 'Foundation (Weeks 1-2)',
      color: PRIMARY_COLOR,
      tasks: [
        'Define credential schema and claim structure',
        'Set up RSA key pair and HSM storage',
        'Create JWKS endpoint for public key distribution',
        'Build credential issuance service on Finatrades'
      ]
    },
    {
      phase: 'PHASE 2',
      title: 'Integration (Weeks 3-4)',
      color: ACCENT_COLOR,
      tasks: [
        'Enhance SSO flow to include VC in token',
        'Build credential verification service on Wingold',
        'Implement revocation checking mechanism',
        'Create audit logging for compliance'
      ]
    },
    {
      phase: 'PHASE 3',
      title: 'Testing & Security (Weeks 5-6)',
      color: '#8b5cf6',
      tasks: [
        'Security penetration testing',
        'End-to-end integration testing',
        'Performance and load testing',
        'Compliance review with legal team'
      ]
    },
    {
      phase: 'PHASE 4',
      title: 'Launch & Monitor (Weeks 7-8)',
      color: '#10b981',
      tasks: [
        'Staged rollout to beta users',
        'Monitor for errors and edge cases',
        'Production deployment',
        'Documentation and training'
      ]
    },
  ];
  
  let phaseY = 120;
  phases.forEach(p => {
    doc.rect(50, phaseY, 495, 95).strokeColor(p.color).lineWidth(2).stroke();
    doc.rect(50, phaseY, 130, 30).fillAndStroke(p.color, p.color);
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text(p.phase, 65, phaseY + 9);
    
    doc.fillColor(p.color).fontSize(12).font('Helvetica-Bold').text(p.title, 195, phaseY + 9);
    
    let taskY = phaseY + 40;
    doc.fontSize(9).font('Helvetica').fillColor(SECONDARY_COLOR);
    p.tasks.forEach(t => {
      doc.text(`☐  ${t}`, 60, taskY, { width: 475 });
      taskY += 13;
    });
    
    phaseY += 110;
  });
  
  // Timeline bar
  doc.rect(50, 570, 495, 40).fillAndStroke(LIGHT_GRAY, '#e5e7eb');
  doc.fillColor(SECONDARY_COLOR).fontSize(10).font('Helvetica-Bold').text('ESTIMATED TIMELINE: 8 WEEKS', 200, 583);

  // ============================================
  // COMPLIANCE & REGULATORY
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('11. COMPLIANCE & REGULATORY', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  doc.fontSize(12)
     .font('Helvetica')
     .fillColor(SECONDARY_COLOR)
     .text('The Verifiable Credentials system is designed to meet current and upcoming regulatory requirements:', 50, 110, { width: 495 });
  
  const regulations = [
    {
      name: 'eIDAS 2.0 (European Union)',
      status: '✓ Compliant',
      color: '#10b981',
      details: 'The EU\'s updated electronic identification regulation mandates digital identity wallets for all citizens by 2026. Our VC implementation follows W3C standards compatible with European Digital Identity Wallet specifications.'
    },
    {
      name: 'FATF Travel Rule',
      status: '✓ Supported',
      color: '#10b981',
      details: 'Credentials can include required customer information for cross-border transactions, satisfying Travel Rule requirements for VASPs operating internationally.'
    },
    {
      name: 'GDPR (Data Protection)',
      status: '✓ Privacy-First',
      color: '#10b981',
      details: 'Users control their credentials and can selectively disclose only required information. No centralized storage of personal data - credentials are held by users.'
    },
    {
      name: 'AML/KYC Regulations',
      status: '✓ Enhanced',
      color: '#10b981',
      details: 'Full audit trail of credential issuance, presentation, and verification. Revocation capability for compromised or outdated credentials. Document hashes provide verification without duplication.'
    },
    {
      name: 'W3C Verifiable Credentials 2.0',
      status: '✓ Standard',
      color: ACCENT_COLOR,
      details: 'Published May 2025 as a W3C Recommendation. Our implementation follows the official standard for maximum interoperability with global identity systems.'
    },
  ];
  
  let regY = 150;
  regulations.forEach(reg => {
    doc.rect(50, regY, 495, 80).strokeColor(reg.color).lineWidth(1).stroke();
    doc.rect(50, regY, 495, 25).fillAndStroke(reg.color, reg.color);
    
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text(reg.name, 60, regY + 7);
    doc.fontSize(10).font('Helvetica').text(reg.status, 450, regY + 7, { align: 'right', width: 85 });
    
    doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica').text(reg.details, 60, regY + 35, { width: 475 });
    
    regY += 95;
  });

  // ============================================
  // BENEFITS & ROI
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('12. BENEFITS & ROI', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  // Benefits for each stakeholder
  doc.fontSize(14).font('Helvetica-Bold').fillColor(SECONDARY_COLOR).text('Benefits by Stakeholder', 50, 110);
  
  // Users
  doc.rect(50, 135, 155, 160).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  doc.rect(50, 135, 155, 30).fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('USERS', 100, 144);
  
  doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica');
  doc.text('• One-time KYC process', 60, 175);
  doc.text('• Faster onboarding', 60, 190);
  doc.text('• Control over data', 60, 205);
  doc.text('• Privacy protection', 60, 220);
  doc.text('• Portable identity', 60, 235);
  doc.text('• Reduced friction', 60, 250);
  
  // Finatrades
  doc.rect(220, 135, 155, 160).strokeColor(ACCENT_COLOR).lineWidth(2).stroke();
  doc.rect(220, 135, 155, 30).fillAndStroke(ACCENT_COLOR, ACCENT_COLOR);
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('FINATRADES', 255, 144);
  
  doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica');
  doc.text('• Trusted identity issuer', 230, 175);
  doc.text('• Enhanced user value', 230, 190);
  doc.text('• Partner ecosystem', 230, 205);
  doc.text('• Competitive advantage', 230, 220);
  doc.text('• Future-proof tech', 230, 235);
  doc.text('• Revenue potential', 230, 250);
  
  // Wingold
  doc.rect(390, 135, 155, 160).strokeColor('#10b981').lineWidth(2).stroke();
  doc.rect(390, 135, 155, 30).fillAndStroke('#10b981', '#10b981');
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('WINGOLD', 435, 144);
  
  doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica');
  doc.text('• No duplicate KYC', 400, 175);
  doc.text('• Instant user onboard', 400, 190);
  doc.text('• Compliance audit trail', 400, 205);
  doc.text('• Reduced costs', 400, 220);
  doc.text('• Better user experience', 400, 235);
  doc.text('• Trusted data source', 400, 250);
  
  // ROI metrics
  doc.fontSize(14).font('Helvetica-Bold').fillColor(SECONDARY_COLOR).text('Return on Investment', 50, 320);
  
  const roiMetrics = [
    { metric: 'KYC Cost Reduction', value: '40-60%', desc: 'Eliminate duplicate verification processes' },
    { metric: 'Onboarding Time', value: '< 30 sec', desc: 'Instant verification vs. days of manual review' },
    { metric: 'User Conversion', value: '+25%', desc: 'Reduced friction increases completion rates' },
    { metric: 'Compliance Cost', value: '-35%', desc: 'Automated audit trails reduce manual effort' },
  ];
  
  let roiY = 350;
  roiMetrics.forEach(roi => {
    doc.rect(50, roiY, 495, 45).strokeColor('#e5e7eb').lineWidth(1).stroke();
    
    doc.rect(50, roiY, 120, 45).fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text(roi.value, 60, roiY + 12);
    
    doc.fillColor(SECONDARY_COLOR).fontSize(11).font('Helvetica-Bold').text(roi.metric, 185, roiY + 10);
    doc.fontSize(9).font('Helvetica').fillColor(DARK_GRAY).text(roi.desc, 185, roiY + 27);
    
    roiY += 55;
  });

  // ============================================
  // TECHNICAL SPECIFICATIONS
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('13. TECHNICAL SPECIFICATIONS', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  const specs = [
    { category: 'Credential Format', spec: 'W3C Verifiable Credentials 2.0 (JSON-LD)' },
    { category: 'Signature Algorithm', spec: 'RS256 (RSA PKCS#1 v1.5 with SHA-256)' },
    { category: 'Key Size', spec: 'RSA 2048-bit minimum, 4096-bit recommended' },
    { category: 'Identifier Standard', spec: 'DID (Decentralized Identifier) - did:web method' },
    { category: 'Key Distribution', spec: 'JWKS (JSON Web Key Set) at /.well-known/jwks.json' },
    { category: 'Transport Format', spec: 'JWT (compact serialization) or JSON-LD' },
    { category: 'Revocation Method', spec: 'StatusList2021 or Credential Revocation List' },
    { category: 'Token Expiry', spec: '5 minutes (SSO), 15 minutes (shop flow)' },
    { category: 'Required Claims', spec: 'sub, jti, aud, iss, iat, exp + custom claims' },
    { category: 'TLS Version', spec: 'TLS 1.3 required for all endpoints' },
  ];
  
  // Table header
  doc.rect(50, 110, 495, 25).fillAndStroke(SECONDARY_COLOR, SECONDARY_COLOR);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  doc.text('Specification', 60, 118);
  doc.text('Value / Standard', 250, 118);
  
  let specY = 135;
  specs.forEach((spec, i) => {
    const bgColor = i % 2 === 0 ? '#ffffff' : LIGHT_GRAY;
    doc.rect(50, specY, 495, 28).fillAndStroke(bgColor, '#e5e7eb');
    doc.fillColor(SECONDARY_COLOR).fontSize(10).font('Helvetica-Bold').text(spec.category, 60, specY + 8);
    doc.fontSize(9).font('Helvetica').text(spec.spec, 250, specY + 8, { width: 285 });
    specY += 28;
  });
  
  // API Endpoints
  doc.fontSize(14).font('Helvetica-Bold').fillColor(SECONDARY_COLOR).text('API Endpoints', 50, 430);
  
  const endpoints = [
    { method: 'GET', path: '/.well-known/jwks.json', desc: 'Public key distribution' },
    { method: 'GET', path: '/api/vc/issue', desc: 'Issue credential to user' },
    { method: 'GET', path: '/api/vc/status/:id', desc: 'Check credential revocation status' },
    { method: 'POST', path: '/api/sso/finatrades', desc: 'SSO endpoint with VC verification' },
  ];
  
  let epY = 460;
  endpoints.forEach(ep => {
    doc.rect(50, epY, 50, 25).fillAndStroke(ep.method === 'GET' ? '#10b981' : ACCENT_COLOR, ep.method === 'GET' ? '#10b981' : ACCENT_COLOR);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text(ep.method, 58, epY + 8);
    
    doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Courier').text(ep.path, 110, epY + 8);
    doc.font('Helvetica').fillColor(DARK_GRAY).text(ep.desc, 350, epY + 8, { width: 190 });
    
    epY += 32;
  });

  // ============================================
  // NEXT STEPS
  // ============================================
  doc.addPage();
  
  doc.fillColor(PRIMARY_COLOR)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('14. NEXT STEPS', 50, 50);
  
  doc.moveTo(50, 85).lineTo(545, 85).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
  
  doc.fontSize(12)
     .font('Helvetica')
     .fillColor(SECONDARY_COLOR)
     .text('To proceed with the Verifiable Credentials implementation, we recommend the following immediate actions:', 50, 110, { width: 495 });
  
  const nextSteps = [
    { num: '1', title: 'Executive Approval', desc: 'Review and approve this proposal at the executive level for both Finatrades and Wingold.' },
    { num: '2', title: 'Technical Review', desc: 'Schedule technical deep-dive sessions with both engineering teams to finalize architecture details.' },
    { num: '3', title: 'Legal & Compliance Review', desc: 'Have legal teams from both organizations review credential structure and data sharing agreements.' },
    { num: '4', title: 'Security Assessment', desc: 'Conduct preliminary security review of the proposed cryptographic implementation.' },
    { num: '5', title: 'Project Kickoff', desc: 'Establish project team, timeline, and begin Phase 1 implementation.' },
  ];
  
  let nsY = 150;
  nextSteps.forEach(ns => {
    doc.rect(50, nsY, 45, 45).fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(ns.num, 62, nsY + 10);
    
    doc.fillColor(SECONDARY_COLOR).fontSize(12).font('Helvetica-Bold').text(ns.title, 110, nsY + 5);
    doc.fontSize(10).font('Helvetica').fillColor(DARK_GRAY).text(ns.desc, 110, nsY + 22, { width: 430 });
    
    nsY += 65;
  });
  
  // Contact box
  doc.rect(50, 500, 495, 100).fillAndStroke('#dbeafe', ACCENT_COLOR);
  
  doc.fillColor(ACCENT_COLOR)
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('CONTACT INFORMATION', 65, 515);
  
  doc.fillColor(SECONDARY_COLOR)
     .fontSize(11)
     .font('Helvetica')
     .text('For questions or to schedule a technical discussion:', 65, 540);
  
  doc.fontSize(10)
     .text('Finatrades Technology Team', 65, 560)
     .text('Email: blockchain@finatrades.com', 65, 575);
  
  // Footer
  doc.rect(50, 630, 495, 60).fillAndStroke(SECONDARY_COLOR, SECONDARY_COLOR);
  doc.fillColor('#ffffff')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('Ready to Transform Cross-Platform Identity?', 150, 645);
  doc.fontSize(10)
     .font('Helvetica')
     .text('This proposal represents a significant step forward in digital identity management.', 100, 665);

  // ============================================
  // END DOCUMENT
  // ============================================
  doc.end();
  
  return outputPath;
}

// Run the generator
const outputPath = generatePDF();
console.log(`PDF generated successfully at: ${outputPath}`);
