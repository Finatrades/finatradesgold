import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export async function generateDualWalletGuide(): Promise<string> {
  const doc = new PDFDocument({ margin: 50 });
  const outputPath = path.join(process.cwd(), 'public', 'Finatrades-DualWallet-Guide.pdf');
  
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Title
  doc.fontSize(24).fillColor('#8A2BE2').text('Finatrades Dual-Wallet System', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).fillColor('#666').text('Technical Documentation', { align: 'center' });
  doc.moveDown(2);

  // Section 1: Overview
  doc.fontSize(16).fillColor('#4B0082').text('1. Why Two Wallet Types?');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Gold prices change constantly. Some users want price exposure, others want stability.');
  doc.text('Finatrades provides two wallet types to address both needs:');
  doc.moveDown();

  // LGPW
  doc.fontSize(13).fillColor('#D4AF37').text('LGPW - Live Gold Price Wallet');
  doc.fontSize(10).fillColor('#333');
  doc.text('• Value fluctuates with live gold market prices');
  doc.text('• If gold price rises, your value increases');
  doc.text('• If gold price falls, your value decreases');
  doc.text('• Best for: Investment and trading');
  doc.moveDown();

  // FPGW
  doc.fontSize(13).fillColor('#D4AF37').text('FPGW - Fixed Price Gold Wallet');
  doc.fontSize(10).fillColor('#333');
  doc.text('• Value is locked at the price you purchased');
  doc.text('• Uses FIFO (First-In-First-Out) batch consumption');
  doc.text('• Each batch remembers its purchase price');
  doc.text('• Best for: Savings and stability');
  doc.moveDown(2);

  // Section 2: FPGW Batches
  doc.fontSize(16).fillColor('#4B0082').text('2. How FPGW Batches Work (FIFO)');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#333');
  doc.text('When you buy gold into FPGW, it creates a "batch" with the locked price:');
  doc.moveDown(0.5);
  doc.font('Courier').fontSize(9);
  doc.text('  Batch 1: 50g @ $140/g (Jan 1)');
  doc.text('  Batch 2: 30g @ $145/g (Jan 5)');
  doc.text('  Batch 3: 20g @ $143/g (Jan 7)');
  doc.text('  Total: 100g');
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10);
  doc.text('When you spend 60g, FIFO means oldest gold is used first:');
  doc.text('• First 50g comes from Batch 1 @ $140');
  doc.text('• Next 10g comes from Batch 2 @ $145');
  doc.text('• Batch 3 remains untouched');
  doc.moveDown(2);

  // Section 3: Four Buckets
  doc.fontSize(16).fillColor('#4B0082').text('3. The Four Balance Buckets');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#333');
  doc.text('Each wallet type (LGPW and FPGW) has four separate buckets:');
  doc.moveDown(0.5);

  const buckets = [
    { name: 'AVAILABLE', desc: 'Can spend, send, or withdraw freely' },
    { name: 'PENDING', desc: 'Waiting for confirmation (deposits being verified)' },
    { name: 'LOCKED_BNSL', desc: 'Committed to Buy Now Sell Later plans' },
    { name: 'RESERVED_TRADE', desc: 'Reserved for FinaBridge trade finance' }
  ];

  buckets.forEach(b => {
    doc.fontSize(11).fillColor('#8A2BE2').text(`• ${b.name}`, { continued: true });
    doc.fillColor('#333').text(` - ${b.desc}`);
  });

  doc.moveDown();
  doc.fontSize(10).fillColor('#D4AF37').text('IMPORTANT: Only "Available" gold can be spent!', { underline: true });
  doc.moveDown(2);

  // Section 4: P2P Transfers
  doc.fontSize(16).fillColor('#4B0082').text('4. P2P Transfer Flow');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#333');
  doc.text('When sending gold to another user:');
  doc.moveDown(0.5);
  doc.text('1. Sender chooses wallet type (LGPW or FPGW) and amount');
  doc.text('2. Sender\'s Available → Reserved (gold is held)');
  doc.text('3. Receiver sees request with [Accept] [Reject] + 24hr timer');
  doc.text('4. If Accept: Receiver\'s Available increases (same wallet type)');
  doc.text('5. If Reject/Expire: Sender\'s gold returns to Available');
  doc.moveDown();
  doc.fontSize(10).fillColor('#D4AF37').text('KEY RULE: Market→Market, Fixed→Fixed (no mixing allowed)');
  doc.moveDown(2);

  // Section 5: Database Structure
  doc.fontSize(16).fillColor('#4B0082').text('5. Data Storage Structure');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#333');

  const tables = [
    { name: 'wallets', purpose: 'Legacy total gold balance' },
    { name: 'vaultOwnershipSummary', purpose: 'Dual-wallet buckets (LGPW/FPGW × 4 statuses)' },
    { name: 'fpgw_batches', purpose: 'Individual FPGW batches with locked prices' },
    { name: 'vaultLedgerEntries', purpose: 'Audit trail of all movements' },
    { name: 'transactions', purpose: 'Transaction history' },
    { name: 'certificates', purpose: 'Digital ownership certificates' }
  ];

  tables.forEach(t => {
    doc.fontSize(10).fillColor('#8A2BE2').text(`• ${t.name}`, { continued: true });
    doc.fillColor('#333').text(` - ${t.purpose}`);
  });

  doc.moveDown(2);

  // Section 6: Gold-Only Compliance
  doc.fontSize(16).fillColor('#4B0082').text('6. Gold-Only Compliance Rule');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#333');
  doc.text('Single Source of Truth: Gold grams is the ONLY authoritative balance.');
  doc.moveDown(0.5);
  doc.text('• Storage: All ledgers, wallets, locks store gold grams ONLY');
  doc.text('• Display: UI shows gold as primary, USD as "≈ equivalent"');
  doc.text('• Disclaimer: "USD is an equivalent value. Your real balance is gold."');
  doc.text('• LGPW: USD = gold grams × current market price');
  doc.text('• FPGW: USD = gold grams × locked purchase price');

  doc.moveDown(3);

  // Footer
  doc.fontSize(10).fillColor('#666').text('© 2026 Finatrades - Gold-Backed Digital Finance', { align: 'center' });
  doc.text('Author: Charan Pratap Singh', { align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDualWalletGuide()
    .then(path => console.log('PDF generated:', path))
    .catch(err => console.error('Error:', err));
}
