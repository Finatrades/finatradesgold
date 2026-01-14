import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({ margin: 50 });
const outputPath = path.join(process.cwd(), 'docs', 'LGPW-FGPW-Wallet-Guide.pdf');
doc.pipe(fs.createWriteStream(outputPath));

const purple = '#8A2BE2';
const darkPurple = '#5B1A99';
const gray = '#666666';
const lightGray = '#F5F5F5';

function addHeader(text: string, size = 18) {
  doc.fontSize(size).fillColor(purple).font('Helvetica-Bold').text(text);
  doc.moveDown(0.5);
}

function addSubHeader(text: string, size = 14) {
  doc.fontSize(size).fillColor(darkPurple).font('Helvetica-Bold').text(text);
  doc.moveDown(0.3);
}

function addBody(text: string) {
  doc.fontSize(11).fillColor(gray).font('Helvetica').text(text);
  doc.moveDown(0.3);
}

function addBullet(text: string) {
  doc.fontSize(11).fillColor(gray).font('Helvetica').text(`• ${text}`, { indent: 20 });
}

function addTable(headers: string[], rows: string[][]) {
  const colWidth = (doc.page.width - 100) / headers.length;
  const startX = 50;
  let y = doc.y;
  
  doc.rect(startX, y, doc.page.width - 100, 20).fill('#E8D5F5');
  doc.fillColor(darkPurple).font('Helvetica-Bold').fontSize(10);
  headers.forEach((header, i) => {
    doc.text(header, startX + i * colWidth + 5, y + 5, { width: colWidth - 10, align: 'center' });
  });
  y += 20;
  
  rows.forEach((row, rowIndex) => {
    const bgColor = rowIndex % 2 === 0 ? '#FFFFFF' : '#F8F4FC';
    doc.rect(startX, y, doc.page.width - 100, 18).fill(bgColor);
    doc.fillColor(gray).font('Helvetica').fontSize(9);
    row.forEach((cell, i) => {
      doc.text(cell, startX + i * colWidth + 5, y + 4, { width: colWidth - 10, align: 'center' });
    });
    y += 18;
  });
  
  doc.y = y + 10;
}

function addDivider() {
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#E0E0E0');
  doc.moveDown(0.5);
}

doc.rect(0, 0, doc.page.width, 120).fill(purple);
doc.fontSize(28).fillColor('white').font('Helvetica-Bold');
doc.text('LGPW ↔ FGPW Wallet Guide', 50, 40, { align: 'center' });
doc.fontSize(14).fillColor('#E8D5F5').font('Helvetica');
doc.text('Finatrades Dual-Wallet Architecture Documentation', 50, 80, { align: 'center' });
doc.y = 140;

addHeader('1. Overview', 18);
addBody('Finatrades uses a dual-wallet architecture to give users flexibility in how they hold gold:');
doc.moveDown(0.3);
addBullet('LGPW (Live Gold Price Wallet): Gold held at current market price - value fluctuates');
addBullet('FGPW (Fixed Gold Price Wallet): Gold locked at a specific price - value protected');
doc.moveDown(0.5);

addSubHeader('Key Principle: Cash-Backed FGPW');
addBody('FGPW is NOT backed by physical gold. It is backed by a USD cash reserve. Users see "gold grams" for simplicity, but internally the platform holds the equivalent USD value. This protects users from price drops.');
doc.moveDown(0.5);
addDivider();

addHeader('2. LGPW → FGPW (Lock Gold at Fixed Price)', 18);
addBody('When a user locks gold from LGPW to FGPW, the following happens:');
doc.moveDown(0.3);
addBullet('Gold is removed from LGPW at the current market price');
addBullet('USD value is calculated and locked (goldGrams × currentPrice)');
addBullet('FGPW batch is created recording: grams, locked price, USD value');
addBullet('Physical Storage Certificate event logged (WALLET_RECLASSIFICATION)');
addBullet('New Digital Ownership Certificate created for FGPW');
doc.moveDown(0.5);

addSubHeader('Example: Lock 50g @ $150/g');
addTable(
  ['Action', 'LGPW', 'FGPW', 'USD Value'],
  [
    ['Before', '100g', '0g', '-'],
    ['Lock 50g @ $150', '-50g', '+50g', '$7,500 locked'],
    ['After', '50g', '50g @ $150', '$7,500 protected'],
  ]
);
doc.moveDown(0.5);
addDivider();

addHeader('3. FGPW → LGPW (Unlock to Live Price)', 18);
addBody('When a user unlocks gold from FGPW to LGPW, the critical conversion happens:');
doc.moveDown(0.3);
addBullet('FGPW gold is consumed using FIFO (oldest batches first)');
addBullet('USD value is calculated from locked price: lockedGrams × lockedPrice');
addBullet('New LGPW gold calculated: USD value ÷ currentLivePrice');
addBullet('User receives NEW gold amount based on current price');
doc.moveDown(0.5);

addSubHeader('The Cash-Backed Formula');
doc.fontSize(12).fillColor(darkPurple).font('Helvetica-Bold');
doc.text('LGPW Gold = (FGPW Grams × Locked Price) ÷ Current Live Price', { align: 'center' });
doc.moveDown(0.5);

addSubHeader('Example: Unlock 50g locked @ $150, Live Price = $140');
addTable(
  ['Step', 'Calculation', 'Result'],
  [
    ['1. USD Value', '50g × $150/g', '$7,500'],
    ['2. Buy at Live', '$7,500 ÷ $140/g', '53.57g'],
    ['3. LGPW Credit', 'User receives', '53.57g'],
  ]
);
addBody('Because price dropped ($150 → $140), user gets MORE gold (50g → 53.57g).');
doc.moveDown(0.5);
addDivider();

doc.addPage();
addHeader('4. Complete 5-Transaction Example', 18);
addBody('User starts with 500g in LGPW and makes 5 locks at different prices:');
doc.moveDown(0.5);

addSubHeader('Transaction 1: Lock 100g @ $150/g');
addTable(
  ['Wallet', 'Before', 'Action', 'After'],
  [
    ['LGPW', '500g', '-100g', '400g'],
    ['FGPW', '0g', '+100g @ $150', '100g ($15,000)'],
  ]
);

addSubHeader('Transaction 2: Lock 100g @ $160/g (price rose)');
addTable(
  ['Wallet', 'Before', 'Action', 'After'],
  [
    ['LGPW', '400g', '-100g', '300g'],
    ['FGPW', '100g', '+100g @ $160', '200g ($31,000)'],
  ]
);

addSubHeader('Transaction 3: Lock 50g @ $140/g (price dropped)');
addTable(
  ['Wallet', 'Before', 'Action', 'After'],
  [
    ['LGPW', '300g', '-50g', '250g'],
    ['FGPW', '200g', '+50g @ $140', '250g ($38,000)'],
  ]
);

addSubHeader('Transaction 4: Lock 100g @ $145/g');
addTable(
  ['Wallet', 'Before', 'Action', 'After'],
  [
    ['LGPW', '250g', '-100g', '150g'],
    ['FGPW', '250g', '+100g @ $145', '350g ($52,500)'],
  ]
);

addSubHeader('Transaction 5: Lock 50g @ $155/g');
addTable(
  ['Wallet', 'Before', 'Action', 'After'],
  [
    ['LGPW', '150g', '-50g', '100g'],
    ['FGPW', '350g', '+50g @ $155', '400g ($60,250)'],
  ]
);
doc.moveDown(0.5);
addDivider();

addHeader('5. Final State After 5 Transactions', 18);
addTable(
  ['Wallet', 'Gold Grams', 'Value', 'Notes'],
  [
    ['LGPW', '100g', '≈ $15,500', 'At live $155/g'],
    ['FGPW', '400g', '$60,250 (locked)', 'Avg $150.63/g'],
    ['Total', '500g', '≈ $75,750', ''],
  ]
);

addSubHeader('FGPW Batches (Internal Tracking)');
addTable(
  ['Batch', 'Grams', 'Locked Price', 'USD Value'],
  [
    ['Batch 1', '100g', '$150/g', '$15,000'],
    ['Batch 2', '100g', '$160/g', '$16,000'],
    ['Batch 3', '50g', '$140/g', '$7,000'],
    ['Batch 4', '100g', '$145/g', '$14,500'],
    ['Batch 5', '50g', '$155/g', '$7,750'],
    ['TOTAL', '400g', 'Avg $150.63/g', '$60,250'],
  ]
);
doc.moveDown(0.5);
addDivider();

doc.addPage();
addHeader('6. Certificate Flow Summary', 18);
addBody('Each LGPW→FGPW transaction creates/updates the following certificates:');
doc.moveDown(0.3);

addSubHeader('Certificates Created (After 5 Transactions)');
addTable(
  ['Certificate', 'Type', 'Wallet', 'Grams', 'Status'],
  [
    ['DOC-001', 'Digital Ownership', 'LGPW', '500g→100g remain', 'Active'],
    ['DOC-002', 'Digital Ownership', 'FGPW', '100g @ $150', 'Active'],
    ['DOC-003', 'Digital Ownership', 'FGPW', '100g @ $160', 'Active'],
    ['DOC-004', 'Digital Ownership', 'FGPW', '50g @ $140', 'Active'],
    ['DOC-005', 'Digital Ownership', 'FGPW', '100g @ $145', 'Active'],
    ['DOC-006', 'Digital Ownership', 'FGPW', '50g @ $155', 'Active'],
    ['CONV-001 to 005', 'Conversion', 'LGPW→FGPW', 'Various', 'Active'],
    ['PSC-001', 'Physical Storage', '-', '500g', '5 RECLASS events'],
  ]
);
doc.moveDown(0.5);
addDivider();

addHeader('7. Unlock Scenarios (FGPW → LGPW)', 18);
addBody('When user unlocks FGPW, the result depends on current market price:');
doc.moveDown(0.3);

addTable(
  ['Scenario', 'FGPW Unlock', 'Locked Price', 'Live Price', 'LGPW Received'],
  [
    ['Price dropped', '50g', '$150/g', '$140/g', '53.57g (+3.57g)'],
    ['Price same', '50g', '$150/g', '$150/g', '50g (same)'],
    ['Price rose', '50g', '$150/g', '$160/g', '46.88g (-3.12g)'],
  ]
);

addBody('The user\'s USD value is ALWAYS protected. Only the gold gram amount changes.');
doc.moveDown(0.5);
addDivider();

addHeader('8. Key Takeaways', 18);
addBullet('LGPW = Physical gold at market price (value fluctuates)');
addBullet('FGPW = Cash-backed reserve displayed as gold (value protected)');
addBullet('Lock: LGPW gold sold internally, USD held in reserve');
addBullet('Unlock: USD used to buy gold at current live price');
addBullet('User sees gold grams for simple UX, platform manages USD hedge');
addBullet('All operations create certificate audit trail');
doc.moveDown(1);

doc.rect(50, doc.y, doc.page.width - 100, 60).fill('#F8F4FC');
doc.fontSize(10).fillColor(gray).font('Helvetica-Oblique');
doc.text('This document was auto-generated by Finatrades Platform.', 60, doc.y + 10);
doc.text('For questions, contact: support@finatrades.com', 60, doc.y + 5);
doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, 60, doc.y + 5);

doc.end();
console.log(`PDF generated: ${outputPath}`);
