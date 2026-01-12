import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({ margin: 50, size: 'A4' });
const outputPath = path.join(process.cwd(), 'attached_assets', 'Wingold_API_Requirements.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

const primary = '#D4A574';
const dark = '#1a1a2e';
const gray = '#666666';

doc.rect(0, 0, 595, 120).fill(dark);
doc.fontSize(24).fillColor('#ffffff').text('Wingold & Metals', 50, 40);
doc.fontSize(14).text('API Integration Requirements', 50, 70);
doc.fontSize(10).fillColor(primary).text('For Finatrades Wallet Credit Integration', 50, 90);

doc.fillColor(dark);
doc.y = 140;

doc.fontSize(10).fillColor(gray);
doc.text('Document Version: 1.0', 50);
doc.text('Date: January 12, 2026');
doc.text('From: Finatrades Finance SA');
doc.text('To: Wingold & Metals DMCC Technical Team');
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('1. Overview', 50);
doc.moveDown(0.5);
doc.fontSize(10).fillColor(gray);
doc.text('This document outlines the technical requirements for integrating Wingold & Metals with the Finatrades platform. The integration enables automatic crediting of users\' Finatrades digital gold wallets when they purchase physical gold bars through Wingold.', { width: 495 });
doc.moveDown();
doc.fontSize(11).fillColor(dark).text('Integration Flow:', 50);
doc.fontSize(10).fillColor(gray).text('Customer -> Wingold Shop -> Payment -> Vault Storage -> Webhook -> Finatrades Wallet Credit', 50);
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('2. Webhook Configuration', 50);
doc.moveDown(0.5);
doc.fontSize(11).fillColor(dark).text('Webhook Endpoint:', 50);
doc.fontSize(10).fillColor(gray);
doc.text('POST https://[finatrades-domain]/api/wingold/webhooks', 50);
doc.moveDown();
doc.fontSize(11).fillColor(dark).text('Required Headers:', 50);
doc.fontSize(9).fillColor(gray);
doc.text('Content-Type: application/json', 60);
doc.text('X-Webhook-Signature: HMAC-SHA256 signature', 60);
doc.text('X-Webhook-Timestamp: ISO 8601 timestamp', 60);
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('3. Webhook Events (Required)', 50);
doc.moveDown(0.5);
doc.fontSize(10).fillColor(gray);
doc.text('1. order.confirmed - When payment is verified by admin', 60);
doc.text('2. bar.allocated - When physical bar is assigned with serial number', 60);
doc.text('3. certificate.issued - When storage/bar certificate is generated', 60);
doc.text('4. order.fulfilled - CRITICAL: When order is complete and gold is in vault', 60);
doc.text('5. order.cancelled - When order is cancelled or refunded', 60);
doc.moveDown();
doc.fontSize(10).fillColor('#cc0000').text('IMPORTANT: The order.fulfilled event triggers the automatic wallet credit. Do not send this event until the physical gold is securely stored in the vault.', 50, doc.y, { width: 495 });
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('4. Order Data Fields', 50);
doc.moveDown(0.5);
doc.fontSize(9).fillColor(gray);
doc.text('finatradesId (string) - User Finatrades ID - REQUIRED', 60);
doc.text('barSize (enum) - 1g, 10g, 100g, or 1kg - REQUIRED', 60);
doc.text('barCount (integer) - Number of bars - REQUIRED', 60);
doc.text('totalGrams (string) - Total weight with 6 decimals - REQUIRED', 60);
doc.text('usdAmount (string) - Total USD with 2 decimals - REQUIRED', 60);
doc.text('goldPricePerGram (string) - Price per gram - REQUIRED', 60);
doc.text('vaultLocationId (string) - Vault location code - REQUIRED', 60);
doc.text('wingoldReference (string) - Wingold order reference - REQUIRED', 60);
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('5. Bar Allocation Data Fields', 50);
doc.moveDown(0.5);
doc.fontSize(9).fillColor(gray);
doc.text('barId (string) - Unique bar identifier - REQUIRED', 60);
doc.text('serialNumber (string) - Bar serial number from mint - REQUIRED', 60);
doc.text('barSize (enum) - Bar size category - REQUIRED', 60);
doc.text('weightGrams (string) - Exact weight with 6 decimals - REQUIRED', 60);
doc.text('purity (string) - Gold purity e.g. 999.9 - REQUIRED', 60);
doc.text('mint (string) - Mint/refiner name - REQUIRED', 60);
doc.text('vaultLocationId (string) - Vault location code - REQUIRED', 60);
doc.text('vaultLocationName (string) - Human-readable vault name - REQUIRED', 60);
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('6. Certificate Data Fields', 50);
doc.moveDown(0.5);
doc.fontSize(9).fillColor(gray);
doc.text('certificateNumber (string) - Unique certificate number - REQUIRED', 60);
doc.text('certificateType (enum) - storage or bar - REQUIRED', 60);
doc.text('barId (string) - Linked bar ID - REQUIRED', 60);
doc.text('pdfUrl (string) - URL to download certificate PDF - REQUIRED', 60);
doc.text('jsonData (object) - Certificate data in JSON format - REQUIRED', 60);
doc.text('issuedAt (string) - ISO 8601 issue timestamp - REQUIRED', 60);

doc.addPage();

doc.fontSize(16).fillColor(dark).text('7. Vault Locations', 50, 50);
doc.moveDown(0.5);
doc.fontSize(10).fillColor(gray);
doc.text('DXB-1 - Dubai Gold Vault (UAE)', 60);
doc.text('SIN-1 - Singapore Vault (Singapore)', 60);
doc.text('ZRH-1 - Zurich Vault (Switzerland)', 60);
doc.text('LON-1 - London Vault (United Kingdom)', 60);
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('8. Security Requirements', 50);
doc.moveDown(0.5);
doc.fontSize(10).fillColor(gray);
doc.text('All webhooks must use HTTPS (TLS 1.2+)', 60);
doc.text('Webhook signature verification using HMAC-SHA256', 60);
doc.text('Shared secrets to exchange:', 60);
doc.fontSize(9);
doc.text('  - WINGOLD_API_KEY', 70);
doc.text('  - FINATRADES_API_KEY', 70);
doc.text('  - WINGOLD_WEBHOOK_SECRET', 70);
doc.text('  - SSO_JWT_SECRET', 70);
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('9. Retry Policy', 50);
doc.moveDown(0.5);
doc.fontSize(10).fillColor(gray);
doc.text('If Finatrades returns non-2xx, retry with exponential backoff:', 60);
doc.text('Retry 1: After 1 minute', 70);
doc.text('Retry 2: After 5 minutes', 70);
doc.text('Retry 3: After 15 minutes', 70);
doc.text('Retry 4: After 1 hour', 70);
doc.text('Retry 5: After 4 hours (final)', 70);
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('10. Integration Checklist', 50);
doc.moveDown(0.5);
doc.fontSize(10).fillColor(gray);
const checklist = [
  'Webhook endpoint configured',
  'Shared secrets exchanged',
  'SSO integration tested',
  'All 5 webhook events implemented',
  'Signature verification working',
  'Retry logic implemented',
  'finatradesId included in payloads',
  'Bar serial numbers included in bar.allocated',
  'Certificate PDFs accessible via provided URLs',
  'order.fulfilled only sent after physical storage confirmed'
];
checklist.forEach(item => {
  doc.text('[ ] ' + item, 60);
});
doc.moveDown(2);

doc.fontSize(16).fillColor(dark).text('11. Contact Information', 50);
doc.moveDown(0.5);
doc.fontSize(10).fillColor(gray);
doc.text('Technical Integration Support: integration@finatrades.com', 60);
doc.text('Response Time: Within 24 hours', 60);

doc.fontSize(8).fillColor(gray);
doc.text('Finatrades Finance SA - Confidential Technical Document', 50, 780, { align: 'center', width: 495 });

doc.end();

stream.on('finish', () => {
  console.log('PDF generated:', outputPath);
});
