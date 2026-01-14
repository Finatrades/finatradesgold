import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const doc = new PDFDocument({ margin: 50, size: 'A4' });
const outputPath = path.join(process.cwd(), 'docs', 'LGPW-FGPW-Complete-Guide.pdf');
doc.pipe(fs.createWriteStream(outputPath));

const purple = '#8A2BE2';
const darkPurple = '#5B1A99';
const lightPurple = '#E8D5F5';
const gray = '#666666';
const green = '#28a745';
const orange = '#fd7e14';

function resetTextFlow() {
  doc.x = 50;
}

function drawHeader(text: string, size = 18) {
  resetTextFlow();
  doc.fontSize(size).fillColor(purple).font('Helvetica-Bold').text(text, 50);
  doc.moveDown(0.5);
}

function drawSubHeader(text: string, size = 14) {
  resetTextFlow();
  doc.fontSize(size).fillColor(darkPurple).font('Helvetica-Bold').text(text, 50);
  doc.moveDown(0.3);
}

function drawBody(text: string) {
  resetTextFlow();
  doc.fontSize(10).fillColor(gray).font('Helvetica').text(text, 50);
  doc.moveDown(0.3);
}

function drawTable(headers: string[], rows: string[][], colWidths?: number[]) {
  resetTextFlow();
  const tableWidth = doc.page.width - 100;
  const defaultColWidth = tableWidth / headers.length;
  const widths = colWidths || headers.map(() => defaultColWidth);
  const startX = 50;
  let y = doc.y;

  doc.rect(startX, y, tableWidth, 18).fill(lightPurple);
  doc.fillColor(darkPurple).font('Helvetica-Bold').fontSize(9);
  let xPos = startX;
  headers.forEach((header, i) => {
    doc.text(header, xPos + 3, y + 4, { width: widths[i] - 6, align: 'center' });
    xPos += widths[i];
  });
  y += 18;

  rows.forEach((row, rowIndex) => {
    const bgColor = rowIndex % 2 === 0 ? '#FFFFFF' : '#F8F4FC';
    doc.rect(startX, y, tableWidth, 16).fill(bgColor);
    doc.fillColor(gray).font('Helvetica').fontSize(8);
    xPos = startX;
    row.forEach((cell, i) => {
      doc.text(cell, xPos + 3, y + 3, { width: widths[i] - 6, align: 'center' });
      xPos += widths[i];
    });
    y += 16;
  });

  doc.x = 50;
  doc.y = y + 10;
}

function drawDivider() {
  resetTextFlow();
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#E0E0E0');
  doc.moveDown(0.5);
}

function drawBox(x: number, y: number, w: number, h: number, fill: string, text: string, subtext?: string) {
  doc.rect(x, y, w, h).fill(fill);
  doc.fillColor(fill === purple || fill === darkPurple ? 'white' : darkPurple);
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text(text, x + 5, y + (subtext ? 8 : h/2 - 6), { width: w - 10, align: 'center' });
  if (subtext) {
    doc.font('Helvetica').fontSize(8).fillColor(fill === purple || fill === darkPurple ? lightPurple : gray);
    doc.text(subtext, x + 5, y + 22, { width: w - 10, align: 'center' });
  }
}

function drawArrow(fromX: number, fromY: number, toX: number, toY: number, label?: string) {
  doc.strokeColor(darkPurple).lineWidth(2);
  doc.moveTo(fromX, fromY).lineTo(toX, toY).stroke();
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = 8;
  doc.moveTo(toX, toY)
    .lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6))
    .lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6))
    .lineTo(toX, toY)
    .fill(darkPurple);
  if (label) {
    doc.font('Helvetica').fontSize(8).fillColor(gray);
    doc.text(label, (fromX + toX) / 2 - 25, (fromY + toY) / 2 - 12, { width: 50, align: 'center' });
  }
}

// === TITLE PAGE ===
doc.rect(0, 0, doc.page.width, 100).fill(purple);
doc.fontSize(24).fillColor('white').font('Helvetica-Bold');
doc.text('LGPW & FGPW Complete Guide', 0, 30, { align: 'center', width: doc.page.width });
doc.fontSize(12).fillColor(lightPurple).font('Helvetica');
doc.text('Finatrades Dual-Wallet Architecture with Certificates', 0, 60, { align: 'center', width: doc.page.width });
doc.x = 50;
doc.y = 120;

// === PART 1 ===
drawHeader('Part 1: System Overview');

const diagramY = doc.y;
drawBox(80, diagramY, 180, 60, lightPurple, 'LGPW', 'Live Gold Price Wallet\nPhysical gold backing');
drawBox(330, diagramY, 180, 60, lightPurple, 'FGPW', 'Fixed Gold Price Wallet\nCash reserve backing');
drawArrow(260, diagramY + 20, 330, diagramY + 20, 'Lock');
drawArrow(330, diagramY + 40, 260, diagramY + 40, 'Unlock');
doc.x = 50;
doc.y = diagramY + 80;

drawSubHeader('What Backs Each Wallet?');
drawTable(
  ['Wallet', 'Backed By', 'Value', 'User Sees'],
  [
    ['LGPW', 'Physical Gold', 'Fluctuates with market', '50g at market price'],
    ['FGPW', 'USD Cash Reserve', 'Fixed (protected)', '50g locked at $150/g'],
  ]
);

drawDivider();

// === PART 2 ===
drawHeader('Part 2: Certificate System');

const certY = doc.y;
doc.rect(50, certY, doc.page.width - 100, 100).fill('#F8F4FC');
doc.fillColor(darkPurple).font('Helvetica-Bold').fontSize(10);
doc.text('PHYSICAL STORAGE CERTIFICATE (PSC)', 60, certY + 10, { width: 400 });
doc.font('Helvetica').fontSize(9).fillColor(gray);
doc.text('Proves: "100g gold exists in Finatrades vault"', 60, certY + 25, { width: 400 });

drawBox(80, certY + 45, 140, 45, purple, 'DOC (LGPW)', 'Digital Ownership');
drawBox(280, certY + 45, 140, 45, darkPurple, 'DOC (FGPW)', 'Digital Ownership');
drawArrow(220, certY + 67, 280, certY + 67);

doc.x = 50;
doc.y = certY + 115;

drawTable(
  ['Certificate', 'Type', 'Purpose', 'Status Options'],
  [
    ['PSC', 'Physical Storage', 'Gold exists in vault', 'Active, Inactive'],
    ['DOC', 'Digital Ownership', 'User owns gold', 'Active, Partial, Redeemed'],
    ['CONV', 'Conversion', 'Wallet transfer record', 'Active'],
  ]
);

// === PAGE 2 - PART 3 ===
doc.addPage();
drawHeader('Part 3: LGPW to FGPW (Lock Gold)');
drawSubHeader('User Story: "Protect my gold at today\'s price"');

const lockY = doc.y + 10;
doc.rect(50, lockY, doc.page.width - 100, 160).fill('#F8F4FC');

drawBox(70, lockY + 15, 100, 35, purple, 'LGPW', '100g available');
drawArrow(170, lockY + 32, 210, lockY + 32, 'Lock 50g');
drawBox(220, lockY + 15, 120, 35, '#F0E6FA', 'Calculate', '50g x $150 = $7,500');
drawArrow(340, lockY + 32, 380, lockY + 32);
drawBox(390, lockY + 15, 100, 35, darkPurple, 'FGPW', '50g @ $150');

doc.font('Helvetica-Bold').fontSize(9).fillColor(darkPurple);
doc.text('Certificate Updates:', 70, lockY + 65, { width: 400 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('1. DOC-001 (LGPW): 100g -> 50g remaining', 70, lockY + 78, { width: 400 });
doc.text('2. DOC-002 (FGPW): NEW - 50g @ $150/g Active', 70, lockY + 90, { width: 400 });
doc.text('3. CONV-001: NEW - LGPW->FGPW 50g @ $150', 70, lockY + 102, { width: 400 });
doc.text('4. PSC-001: Event logged - WALLET_RECLASSIFICATION', 70, lockY + 114, { width: 400 });

doc.rect(70, lockY + 130, 420, 25).fill(lightPurple);
doc.font('Helvetica').fontSize(8).fillColor(darkPurple);
doc.text('User Notification: "Your gold value is now protected at $150/g. Protected Value: $7,500"', 80, lockY + 138, { width: 400 });

doc.x = 50;
doc.y = lockY + 175;
drawDivider();

// === PART 4 ===
drawHeader('Part 4: FGPW to LGPW (Unlock Gold)');
drawSubHeader('User Story: "Access my gold again"');

const unlockY = doc.y + 10;
doc.rect(50, unlockY, doc.page.width - 100, 170).fill('#F8F4FC');

drawBox(70, unlockY + 15, 90, 35, darkPurple, 'FGPW', '50g @ $150');
drawArrow(160, unlockY + 32, 195, unlockY + 32);
drawBox(205, unlockY + 15, 120, 35, '#F0E6FA', 'USD Value', '50g x $150 = $7,500');
drawArrow(325, unlockY + 32, 360, unlockY + 32);
drawBox(370, unlockY + 15, 120, 35, '#E6F4EA', 'Buy at Live', '$7,500 / $140 = 53.57g');

drawArrow(430, unlockY + 50, 430, unlockY + 70);
drawBox(370, unlockY + 75, 120, 30, purple, 'LGPW', '+53.57g credited');

doc.font('Helvetica-Bold').fontSize(9).fillColor(green);
doc.text('Price dropped: User gets MORE gold!', 70, unlockY + 70, { width: 280 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('Locked at $150/g, Live = $140/g', 70, unlockY + 83, { width: 280 });
doc.text('50g FGPW becomes 53.57g LGPW (+3.57g gain)', 70, unlockY + 95, { width: 280 });

doc.font('Helvetica-Bold').fontSize(9).fillColor(darkPurple);
doc.text('Certificate Updates:', 70, unlockY + 115, { width: 280 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('1. DOC-002 (FGPW): 50g -> 0g, Status: REDEEMED', 70, unlockY + 128, { width: 400 });
doc.text('2. DOC-001 (LGPW): 50g -> 103.57g (credited 53.57g)', 70, unlockY + 140, { width: 400 });
doc.text('3. CONV-002: NEW - FGPW->LGPW 50g -> 53.57g @ $140 live', 70, unlockY + 152, { width: 400 });

doc.x = 50;
doc.y = unlockY + 185;

// === PAGE 3 - PART 5 ===
doc.addPage();
drawHeader('Part 5: The Cash-Backed Formula');

const formulaY = doc.y;
doc.rect(80, formulaY, doc.page.width - 160, 50).fill(purple);
doc.fontSize(14).fillColor('white').font('Helvetica-Bold');
doc.text('LGPW Gold = USD Value / Live Price', 80, formulaY + 10, { width: doc.page.width - 160, align: 'center' });
doc.fontSize(10).fillColor(lightPurple).font('Helvetica');
doc.text('Where: USD Value = FGPW Grams x Locked Price', 80, formulaY + 30, { width: doc.page.width - 160, align: 'center' });
doc.x = 50;
doc.y = formulaY + 70;

drawSubHeader('Three Unlock Scenarios');
drawTable(
  ['Scenario', 'FGPW', 'Locked', 'USD Value', 'Live', 'LGPW Received', 'Result'],
  [
    ['Price DOWN', '50g', '$150/g', '$7,500', '$140/g', '53.57g', '+3.57g MORE'],
    ['Price SAME', '50g', '$150/g', '$7,500', '$150/g', '50g', 'Same'],
    ['Price UP', '50g', '$150/g', '$7,500', '$160/g', '46.88g', '-3.12g LESS'],
  ],
  [70, 50, 55, 70, 55, 85, 80]
);

drawBody('Key Point: Your USD value ($7,500) is ALWAYS protected. Only gold grams change based on market price.');

drawDivider();

// === PART 6 ===
drawHeader('Part 6: User-Facing Language');

drawSubHeader('What to Tell Users');
drawTable(
  ['Internal Term', 'User-Friendly Term'],
  [
    ['Cash reserve', 'Protected value'],
    ['USD backing', 'Value protection'],
    ['Batch consumption', 'Unlock processing'],
    ['FIFO', 'Oldest gold first'],
    ['Live price conversion', 'Current market value'],
  ]
);

drawSubHeader('User Messages');

const msgY = doc.y;
doc.rect(50, msgY, doc.page.width - 100, 70).fill('#E6F4EA');
doc.font('Helvetica-Bold').fontSize(9).fillColor(green);
doc.text('When Price Drops (User gains gold):', 60, msgY + 8, { width: doc.page.width - 120 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('"Great news! Gold price dropped since you locked. Your protected value of $7,500 now buys 53.57g!"', 60, msgY + 22, { width: doc.page.width - 120 });

doc.font('Helvetica-Bold').fontSize(9).fillColor(orange);
doc.text('When Price Rises (User gets less gold):', 60, msgY + 42, { width: doc.page.width - 120 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('"Gold price rose since you locked. Your protected value of $7,500 converts to 46.88g. Your dollar value is fully protected!"', 60, msgY + 56, { width: doc.page.width - 120 });

doc.x = 50;
doc.y = msgY + 85;

// === PAGE 4 - PART 7 ===
doc.addPage();
drawHeader('Part 7: Complete 5-Transaction Example');

drawSubHeader('Phase 1: User Locks Gold (5 Transactions)');
drawBody('Starting Balance: LGPW = 500g, FGPW = 0g');
drawTable(
  ['#', 'Action', 'Price', 'LGPW After', 'FGPW After', 'USD Reserved'],
  [
    ['1', 'Lock 100g', '$150/g', '400g', '100g', '$15,000'],
    ['2', 'Lock 100g', '$160/g', '300g', '200g', '$31,000'],
    ['3', 'Lock 50g', '$140/g', '250g', '250g', '$38,000'],
    ['4', 'Lock 100g', '$145/g', '150g', '350g', '$52,500'],
    ['5', 'Lock 50g', '$155/g', '100g', '400g', '$60,250'],
  ]
);

doc.moveDown(0.5);
drawSubHeader('Phase 2: User Unlocks Gold (5 Transactions with FIFO)');
drawBody('Starting: LGPW = 100g, FGPW = 400g ($60,250 reserved)');
drawTable(
  ['#', 'Unlock', 'Batch Used (FIFO)', 'USD Value', 'Live', 'Received', 'LGPW Total'],
  [
    ['1', '80g', 'Batch 1 (80g@$150)', '$12,000', '$155/g', '77.42g', '177.42g'],
    ['2', '50g', 'B1(20g)+B2(30g)', '$7,800', '$145/g', '53.79g', '231.21g'],
    ['3', '100g', 'B2(70g)+B3(30g)', '$15,400', '$150/g', '102.67g', '333.88g'],
    ['4', '120g', 'B3(20g)+B4(100g)', '$17,300', '$142/g', '121.83g', '455.71g'],
    ['5', '50g', 'Batch 5 (50g)', '$7,750', '$160/g', '48.44g', '504.15g'],
  ]
);

const resultY = doc.y;
doc.rect(50, resultY, doc.page.width - 100, 45).fill(lightPurple);
doc.font('Helvetica-Bold').fontSize(10).fillColor(darkPurple);
doc.text('Final Result:', 60, resultY + 8, { width: doc.page.width - 120 });
doc.font('Helvetica').fontSize(9).fillColor(gray);
doc.text('Started: 500g total  |  Ended: 504.15g total  |  Net Gain: +4.15g from price movements', 60, resultY + 22, { width: doc.page.width - 120 });
doc.text('All $60,250 USD value was preserved throughout!', 60, resultY + 34, { width: doc.page.width - 120 });
doc.x = 50;
doc.y = resultY + 55;

// === PAGE 5 - PART 8: P2P TRANSFERS ===
doc.addPage();
drawHeader('Part 8: P2P (Peer-to-Peer) Transfer Flow');

drawSubHeader('Key Rule: Receiver ALWAYS gets LGPW');
drawBody('All P2P transfers result in the receiver getting gold in their LGPW at live market price.');

const p2pRuleY = doc.y;
doc.rect(50, p2pRuleY, doc.page.width - 100, 55).fill('#E6F4EA');
doc.font('Helvetica-Bold').fontSize(9).fillColor(green);
doc.text('Why?', 60, p2pRuleY + 8, { width: doc.page.width - 120 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('- FGPW is a personal value protection tool, NOT transferable to others', 60, p2pRuleY + 20, { width: doc.page.width - 120 });
doc.text('- When sending from FGPW, system auto-unlocks to LGPW first, then sends', 60, p2pRuleY + 32, { width: doc.page.width - 120 });
doc.text('- Receiver gets real gold (LGPW) they can use, lock, or transfer again', 60, p2pRuleY + 44, { width: doc.page.width - 120 });
doc.x = 50;
doc.y = p2pRuleY + 65;

drawSubHeader('Transfer Types');
drawTable(
  ['From Wallet', 'Process', 'Receiver Gets'],
  [
    ['LGPW', 'Direct transfer at live price', 'LGPW (same grams)'],
    ['FGPW', 'Auto-unlock → then transfer', 'LGPW (converted grams)'],
  ]
);

drawDivider();

// P2P Example 1
drawSubHeader('Example 1: LGPW to LGPW (Simple Transfer)');
const ex1Y = doc.y;
doc.rect(50, ex1Y, doc.page.width - 100, 80).fill('#F8F4FC');

drawBox(70, ex1Y + 10, 100, 35, purple, 'Alice LGPW', '100g');
drawArrow(170, ex1Y + 27, 220, ex1Y + 27, 'Send 30g');
drawBox(230, ex1Y + 10, 100, 35, '#F0E6FA', 'Transfer', '30g @ $150 live');
drawArrow(330, ex1Y + 27, 380, ex1Y + 27);
drawBox(390, ex1Y + 10, 100, 35, purple, 'Bob LGPW', '+30g');

doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('Result: Alice LGPW: 100g → 70g  |  Bob LGPW: +30g  |  Live Price: $150/g', 60, ex1Y + 55, { width: doc.page.width - 120 });
doc.text('Certificates: Alice DOC partial surrender, Bob DOC credit, Transfer CONV created', 60, ex1Y + 67, { width: doc.page.width - 120 });
doc.x = 50;
doc.y = ex1Y + 90;

drawDivider();

// P2P Example 2
drawSubHeader('Example 2: FGPW to LGPW (Auto-Unlock Transfer)');
drawBody('Alice sends 50g from her FGPW (locked @ $160/g) to Bob. Live price = $150/g');

const ex2Y = doc.y;
doc.rect(50, ex2Y, doc.page.width - 100, 100).fill('#F8F4FC');

drawBox(60, ex2Y + 10, 80, 35, darkPurple, 'Alice FGPW', '50g@$160');
drawArrow(140, ex2Y + 27, 175, ex2Y + 27);
drawBox(180, ex2Y + 10, 90, 35, '#FFF8E6', 'Auto-Unlock', 'USD: $8,000');
drawArrow(270, ex2Y + 27, 305, ex2Y + 27);
drawBox(310, ex2Y + 10, 90, 35, '#E6F4EA', 'Buy @ Live', '53.33g');
drawArrow(400, ex2Y + 27, 435, ex2Y + 27);
drawBox(440, ex2Y + 10, 80, 35, purple, 'Bob LGPW', '+53.33g');

doc.font('Helvetica-Bold').fontSize(8).fillColor(darkPurple);
doc.text('Calculation:', 60, ex2Y + 55, { width: 400 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('1. Alice FGPW: 50g × $160 locked = $8,000 USD value', 60, ex2Y + 67, { width: 400 });
doc.text('2. Convert to live: $8,000 ÷ $150/g = 53.33g', 60, ex2Y + 79, { width: 400 });
doc.text('3. Bob receives: 53.33g in LGPW (more gold because price dropped!)', 60, ex2Y + 91, { width: 400 });
doc.x = 50;
doc.y = ex2Y + 110;

// === PAGE 6 - MORE P2P EXAMPLES ===
doc.addPage();
drawHeader('Part 8: P2P Transfer Examples (Continued)');

// P2P Example 3
drawSubHeader('Example 3: FGPW Transfer When Price Rose');
drawBody('Carol sends 100g from FGPW (locked @ $140/g) to Dave. Live price = $155/g');

const ex3Y = doc.y;
doc.rect(50, ex3Y, doc.page.width - 100, 95).fill('#F8F4FC');

drawBox(60, ex3Y + 10, 85, 35, darkPurple, 'Carol FGPW', '100g@$140');
drawArrow(145, ex3Y + 27, 180, ex3Y + 27);
drawBox(185, ex3Y + 10, 95, 35, '#FFF8E6', 'Auto-Unlock', 'USD: $14,000');
drawArrow(280, ex3Y + 27, 315, ex3Y + 27);
drawBox(320, ex3Y + 10, 90, 35, '#E6F4EA', 'Buy @ Live', '90.32g');
drawArrow(410, ex3Y + 27, 445, ex3Y + 27);
drawBox(450, ex3Y + 10, 80, 35, purple, 'Dave LGPW', '+90.32g');

doc.font('Helvetica-Bold').fontSize(8).fillColor(darkPurple);
doc.text('Calculation:', 60, ex3Y + 52, { width: 400 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('1. Carol FGPW: 100g × $140 = $14,000 USD value', 60, ex3Y + 64, { width: 400 });
doc.text('2. Convert to live: $14,000 ÷ $155/g = 90.32g', 60, ex3Y + 76, { width: 400 });
doc.text('3. Dave receives: 90.32g in LGPW (less gold because price rose)', 60, ex3Y + 88, { width: 400 });
doc.x = 50;
doc.y = ex3Y + 105;

drawDivider();

// P2P Example 4
drawSubHeader('Example 4: Mixed Wallet Transfer');
drawBody('Eve sends 80g total: 50g from LGPW + 30g from FGPW (locked @ $145/g). Live = $150/g');

const ex4Y = doc.y;
doc.rect(50, ex4Y, doc.page.width - 100, 120).fill('#F8F4FC');

doc.font('Helvetica-Bold').fontSize(9).fillColor(darkPurple);
doc.text('Step 1: LGPW portion (direct)', 60, ex4Y + 10, { width: 400 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('50g from LGPW → 50g to Frank (same grams, live transfer)', 60, ex4Y + 22, { width: 400 });

doc.font('Helvetica-Bold').fontSize(9).fillColor(darkPurple);
doc.text('Step 2: FGPW portion (auto-unlock)', 60, ex4Y + 40, { width: 400 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('30g × $145 = $4,350 USD → $4,350 ÷ $150 = 29g to Frank', 60, ex4Y + 52, { width: 400 });

doc.font('Helvetica-Bold').fontSize(9).fillColor(green);
doc.text('Final Result:', 60, ex4Y + 72, { width: 400 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('Eve sent: 50g LGPW + 30g FGPW = 80g equivalent', 60, ex4Y + 84, { width: 400 });
doc.text('Frank received: 50g + 29g = 79g in LGPW (1g less due to price rise on FGPW portion)', 60, ex4Y + 96, { width: 400 });
doc.text('Certificates: Eve DOC surrenders, Frank DOC credit, 2x Transfer CONV records', 60, ex4Y + 108, { width: 400 });
doc.x = 50;
doc.y = ex4Y + 130;

drawDivider();

// P2P Summary Table
drawSubHeader('P2P Transfer Summary');
drawTable(
  ['#', 'Sender', 'From Wallet', 'Locked Price', 'Live Price', 'Sent', 'Received'],
  [
    ['1', 'Alice', 'LGPW', '-', '$150/g', '30g', '30g'],
    ['2', 'Alice', 'FGPW', '$160/g', '$150/g', '50g', '53.33g'],
    ['3', 'Carol', 'FGPW', '$140/g', '$155/g', '100g', '90.32g'],
    ['4', 'Eve', 'Mixed', '$145/g (FGPW)', '$150/g', '80g', '79g'],
  ]
);

const p2pNoteY = doc.y;
doc.rect(50, p2pNoteY, doc.page.width - 100, 40).fill(lightPurple);
doc.font('Helvetica-Bold').fontSize(9).fillColor(darkPurple);
doc.text('Key Takeaway:', 60, p2pNoteY + 8, { width: doc.page.width - 120 });
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text('LGPW transfers are 1:1. FGPW transfers convert to live price first - receiver may get more or less gold depending on price movement since lock.', 60, p2pNoteY + 20, { width: doc.page.width - 120 });
doc.x = 50;
doc.y = p2pNoteY + 50;

// === PAGE 7 - PART 9 ===
doc.addPage();
drawHeader('Part 9: Certificate Trail After All Transactions');
drawTable(
  ['Certificate', 'Type', 'Final Status', 'Notes'],
  [
    ['DOC-001', 'LGPW Ownership', 'Active', '504.15g final balance'],
    ['DOC-002', 'FGPW Batch 1', 'Redeemed', 'Fully consumed in unlocks 1-2'],
    ['DOC-003', 'FGPW Batch 2', 'Redeemed', 'Fully consumed in unlocks 2-3'],
    ['DOC-004', 'FGPW Batch 3', 'Redeemed', 'Fully consumed in unlocks 3-4'],
    ['DOC-005', 'FGPW Batch 4', 'Redeemed', 'Fully consumed in unlock 4'],
    ['DOC-006', 'FGPW Batch 5', 'Redeemed', 'Fully consumed in unlock 5'],
    ['CONV-001 to 010', 'Conversion', 'Active', 'Complete audit trail'],
    ['PSC-001', 'Physical Storage', 'Active', '504.15g now fully in LGPW'],
  ]
);

drawDivider();

// === PART 10 ===
drawHeader('Part 10: Platform Disclaimer');

const disclaimerY = doc.y;
doc.rect(50, disclaimerY, doc.page.width - 100, 130).fill('#FFF8E6').stroke('#FFD700');
doc.font('Helvetica-Bold').fontSize(10).fillColor('#856404');
doc.text('FGPW (Fixed Gold Price Wallet) Protection Disclosure', 60, disclaimerY + 10, { width: doc.page.width - 120 });

doc.font('Helvetica').fontSize(9).fillColor('#856404');
const disclaimer = `When you transfer gold from LGPW to FGPW, your gold's dollar value is locked at the current market rate. The platform reserves the equivalent USD value to protect your investment.

When you unlock from FGPW to LGPW, you receive physical gold equivalent to your protected dollar value at the current market price. This means:

- If gold price drops: You receive MORE gold grams
- If gold price rises: You receive LESS gold grams
- Your USD value is ALWAYS preserved

FGPW is a value protection service, not a speculative instrument.`;
doc.text(disclaimer, 60, disclaimerY + 28, { width: doc.page.width - 120 });
doc.x = 50;
doc.y = disclaimerY + 145;

drawDivider();

// === SUMMARY ===
drawHeader('Summary');

const summaryY = doc.y;
doc.rect(50, summaryY, 220, 90).fill(purple);
doc.font('Helvetica-Bold').fontSize(10).fillColor('white');
doc.text('LGPW (Live Gold Price)', 60, summaryY + 10, { width: 200 });
doc.font('Helvetica').fontSize(8).fillColor(lightPurple);
doc.text('- Physical gold backing', 60, summaryY + 26, { width: 200 });
doc.text('- Value fluctuates with market', 60, summaryY + 38, { width: 200 });
doc.text('- DOC certificate = Active', 60, summaryY + 50, { width: 200 });
doc.text('- PSC certificate = Active', 60, summaryY + 62, { width: 200 });
doc.text('- User sees: "50g at market"', 60, summaryY + 74, { width: 200 });

doc.rect(290, summaryY, 220, 90).fill(darkPurple);
doc.font('Helvetica-Bold').fontSize(10).fillColor('white');
doc.text('FGPW (Fixed Gold Price)', 300, summaryY + 10, { width: 200 });
doc.font('Helvetica').fontSize(8).fillColor(lightPurple);
doc.text('- Cash reserve backing (USD)', 300, summaryY + 26, { width: 200 });
doc.text('- Value protected at lock rate', 300, summaryY + 38, { width: 200 });
doc.text('- DOC certificate = Active/Partial', 300, summaryY + 50, { width: 200 });
doc.text('- PSC event = Reclassification', 300, summaryY + 62, { width: 200 });
doc.text('- User sees: "50g @ $150"', 300, summaryY + 74, { width: 200 });

doc.x = 50;
doc.y = summaryY + 105;

doc.rect(50, doc.y, doc.page.width - 100, 30).fill('#F0F0F0');
doc.font('Helvetica').fontSize(8).fillColor(gray);
doc.text(`Generated: ${new Date().toISOString().split('T')[0]}  |  Finatrades Finance SA - Confidential`, 60, doc.y + 10, { width: doc.page.width - 120 });

doc.end();
console.log(`PDF generated: ${outputPath}`);

// Send email
async function sendEmail() {
  const pdfBuffer = fs.readFileSync(outputPath);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8A2BE2, #5B1A99); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Finatrades</h1>
        <p style="color: #E8D5F5; margin: 10px 0 0 0;">LGPW & FGPW Complete Guide</p>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #5B1A99;">Complete Dual-Wallet Documentation (Fixed Alignment)</h2>
        <p style="color: #666;">Please find attached the comprehensive guide including:</p>
        
        <ul style="color: #666;">
          <li><strong>Part 1-2:</strong> System Overview & Certificate System</li>
          <li><strong>Part 3-4:</strong> Lock & Unlock Flow with Diagrams</li>
          <li><strong>Part 5-6:</strong> Formula & User-Facing Language</li>
          <li><strong>Part 7:</strong> Complete 5-Transaction Example</li>
          <li><strong>Part 8-9:</strong> Certificate Trail & Disclaimer</li>
        </ul>
        
        <p style="color: #666; margin-top: 20px;">
          <strong>Attached:</strong> LGPW-FGPW-Complete-Guide.pdf
        </p>
      </div>
      
      <div style="background: #5B1A99; padding: 20px; text-align: center;">
        <p style="color: #E8D5F5; margin: 0; font-size: 12px;">
          Finatrades Finance SA - Confidential Documentation
        </p>
      </div>
    </div>
  `;

  const result = await transporter.sendMail({
    from: '"Finatrades System" <noreply@finatrades.com>',
    to: 'Blockchain@finatrades.com',
    subject: 'LGPW & FGPW Complete Guide - Fixed Alignment Version',
    html: htmlBody,
    attachments: [
      {
        filename: 'LGPW-FGPW-Complete-Guide.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  console.log('Email sent successfully!');
  console.log('Message ID:', result.messageId);
  console.log('Recipient: Blockchain@finatrades.com');
}

setTimeout(sendEmail, 1000);
