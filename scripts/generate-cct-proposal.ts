import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

const OUT_DIR = path.resolve(process.cwd(), "tmp");
const OUT_FILE = path.join(OUT_DIR, "Finatrades_CCT_Proposal.pdf");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const NAVY = "#0B2545";
const GOLD = "#C9A94B";
const SLATE = "#3A4A5C";
const LIGHT = "#F4F6F8";
const LINE = "#D8DEE5";
const TEXT = "#1F2A37";
const MUTED = "#6B7280";

const PAGE = { size: "A4" as const, margins: { top: 64, bottom: 70, left: 56, right: 56 } };
const W = 595.28 - 56 - 56;

const doc = new PDFDocument({ ...PAGE, bufferPages: true, info: {
  Title: "Finatrades Commodities Certificate Token (CCT) — Strategic Proposal",
  Author: "Finatrades Group",
  Subject: "Gold-Backed Commodities Certificate (Physical Note + Blockchain Token)",
  Keywords: "Finatrades, CCT, Gold, Tokenization, FINMA, DMCC, Geneva, Dubai",
}});

const stream = fs.createWriteStream(OUT_FILE);
doc.pipe(stream);

let chapter = 0;
let section = 0;

function H1(title: string) {
  chapter++;
  section = 0;
  if (doc.y > 120) doc.addPage();
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(22).text(`${chapter}.  ${title}`, { align: "left" });
  doc.moveDown(0.2);
  doc.strokeColor(GOLD).lineWidth(2).moveTo(56, doc.y).lineTo(56 + 90, doc.y).stroke();
  doc.moveDown(1.2);
  doc.fillColor(TEXT).font("Helvetica").fontSize(11);
}

function H2(title: string) {
  section++;
  if (doc.y > 720) doc.addPage();
  doc.moveDown(0.6);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(13).text(`${chapter}.${section}  ${title}`);
  doc.moveDown(0.4);
  doc.fillColor(TEXT).font("Helvetica").fontSize(11);
}

function H3(title: string) {
  if (doc.y > 720) doc.addPage();
  doc.moveDown(0.4);
  doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(11).text(title);
  doc.moveDown(0.2);
  doc.fillColor(TEXT).font("Helvetica").fontSize(11);
}

function P(text: string, opts: PDFKit.Mixins.TextOptions = {}) {
  if (doc.y > 740) doc.addPage();
  doc.fillColor(TEXT).font("Helvetica").fontSize(11).text(text, { align: "justify", lineGap: 2, ...opts });
  doc.moveDown(0.4);
}

function Bullets(items: string[]) {
  doc.fillColor(TEXT).font("Helvetica").fontSize(11);
  for (const item of items) {
    if (doc.y > 740) doc.addPage();
    const x = doc.x;
    doc.text("•  ", { continued: true }).text(item, { lineGap: 2 });
    doc.x = x;
    doc.moveDown(0.15);
  }
  doc.moveDown(0.3);
}

function Quote(text: string, by?: string) {
  if (doc.y > 660) doc.addPage();
  const padding = 12;
  const innerW = W - padding * 2 - 4;
  doc.fillColor(SLATE).font("Helvetica-Oblique").fontSize(10.5);
  const quoteH = doc.heightOfString(`"${text}"`, { width: innerW, lineGap: 2 });
  let byH = 0;
  if (by) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9);
    byH = doc.heightOfString(`— ${by}`, { width: innerW }) + 4;
  }
  const top = doc.y;
  const total = padding * 2 + quoteH + byH;
  doc.save().rect(56, top, W, total).fill(LIGHT).restore();
  doc.save().rect(56, top, 4, total).fill(GOLD).restore();
  doc.fillColor(SLATE).font("Helvetica-Oblique").fontSize(10.5)
    .text(`"${text}"`, 56 + padding + 4, top + padding, { width: innerW, lineGap: 2 });
  if (by) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9)
      .text(`— ${by}`, 56 + padding + 4, top + padding + quoteH + 4, { width: innerW });
  }
  doc.x = 56;
  doc.y = top + total + 8;
  doc.fillColor(TEXT).font("Helvetica").fontSize(11);
}

function Table(headers: string[], rows: string[][], colWidths?: number[]) {
  if (doc.y > 660) doc.addPage();
  const widths = colWidths || headers.map(() => W / headers.length);
  const startX = 56;
  let y = doc.y;
  const headH = 22;
  doc.save().rect(startX, y, W, headH).fill(NAVY).restore();
  let x = startX;
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
  headers.forEach((h, i) => {
    doc.text(h, x + 6, y + 6, { width: widths[i] - 12, align: "left" });
    x += widths[i];
  });
  y += headH;
  doc.fillColor(TEXT).font("Helvetica").fontSize(10);
  let alt = false;
  for (const row of rows) {
    const cellHeights = row.map((c, i) => doc.heightOfString(c, { width: widths[i] - 12 }));
    const rowH = Math.max(20, ...cellHeights) + 8;
    if (y + rowH > 760) {
      doc.addPage();
      y = doc.y;
    }
    if (alt) doc.save().rect(startX, y, W, rowH).fill(LIGHT).restore();
    alt = !alt;
    x = startX;
    doc.fillColor(TEXT).font("Helvetica").fontSize(10);
    row.forEach((c, i) => {
      doc.text(c, x + 6, y + 4, { width: widths[i] - 12, align: "left" });
      x += widths[i];
    });
    doc.save().strokeColor(LINE).lineWidth(0.5).moveTo(startX, y + rowH).lineTo(startX + W, y + rowH).stroke().restore();
    y += rowH;
  }
  doc.x = startX;
  doc.y = y + 8;
  doc.fillColor(TEXT).font("Helvetica").fontSize(11);
}

function CalloutBox(title: string, body: string, color = GOLD) {
  if (doc.y > 660) doc.addPage();
  const top = doc.y;
  const padding = 12;
  doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(11);
  const titleH = doc.heightOfString(title, { width: W - padding * 2 });
  doc.fillColor(TEXT).font("Helvetica").fontSize(10.5);
  const bodyH = doc.heightOfString(body, { width: W - padding * 2 });
  const total = padding * 2 + titleH + bodyH + 6;
  doc.save().rect(56, top, W, total).fill(LIGHT).restore();
  doc.save().rect(56, top, 4, total).fill(color).restore();
  doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(11)
    .text(title, 56 + padding, top + padding, { width: W - padding * 2 });
  doc.fillColor(TEXT).font("Helvetica").fontSize(10.5)
    .text(body, 56 + padding, top + padding + titleH + 4, { width: W - padding * 2, lineGap: 2 });
  doc.x = 56;
  doc.y = top + total + 8;
}

// ---------------- COVER PAGE ----------------
doc.save().rect(0, 0, 595.28, 841.89).fill(NAVY).restore();
doc.save().rect(0, 0, 595.28, 8).fill(GOLD).restore();
doc.save().rect(0, 833.89, 595.28, 8).fill(GOLD).restore();

doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11).text("FINATRADES GROUP", 56, 90, { characterSpacing: 4 });
doc.fillColor("#9FB3C8").font("Helvetica").fontSize(10).text("Geneva  •  Dubai  •  Saint Lucia", 56, 108, { characterSpacing: 2 });

doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(34)
  .text("Commodities", 56, 230, { width: W });
doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(34)
  .text("Certificate Token", 56, doc.y, { width: W });
doc.fillColor("#FFFFFF").font("Helvetica").fontSize(16)
  .text("Physical Gold Note  +  Blockchain Twin", 56, doc.y + 6, { width: W });

doc.moveTo(56, doc.y + 20).lineTo(56 + 80, doc.y + 20).strokeColor(GOLD).lineWidth(2).stroke();

doc.fillColor("#C5D5E6").font("Helvetica").fontSize(11)
  .text("A Strategic Proposal for the Issuance of a Regulated, Gold-Backed Commodities Certificate, Combining a Tamper-Evident Physical Note with a Synchronised On-Chain Twin Token, Issued and Operated by the Finatrades Group under its Swiss, Saint Lucian and U.A.E. Licences.",
  56, doc.y + 36, { width: W, align: "justify", lineGap: 4 });

doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(10).text("CONFIDENTIAL  •  INTERNAL DRAFT  •  v1.0", 56, 700, { characterSpacing: 2 });
doc.fillColor("#FFFFFF").font("Helvetica").fontSize(10).text(`Issued: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, 56, 716);
doc.fillColor("#9FB3C8").font("Helvetica").fontSize(9).text("Distribution: Blockchain@finatrades.com", 56, 732);
doc.fillColor("#9FB3C8").font("Helvetica").fontSize(9).text("Authors: Hasim  •  Charan Pratap  •  Farah Naaz  •  Reda Rami", 56, 748);

// ---------------- TOC ----------------
doc.addPage();
doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(22).text("Table of Contents");
doc.moveDown(0.2);
doc.strokeColor(GOLD).lineWidth(2).moveTo(56, doc.y).lineTo(56 + 90, doc.y).stroke();
doc.moveDown(1.2);
const toc = [
  ["1.", "Executive Summary"],
  ["2.", "Group Licensing Profile & Legal Standing"],
  ["3.", "Product Definition — The Commodities Certificate"],
  ["4.", "Comparable Real-World Implementations"],
  ["5.", "Legal & Regulatory Architecture"],
  ["6.", "Technology Architecture — Paper + Token Twin"],
  ["7.", "Operational Lifecycle of a Certificate"],
  ["8.", "Real Customer Use Cases"],
  ["9.", "Financial Model & Unit Economics"],
  ["10.", "Risk Register & Mitigation Plan"],
  ["11.", "Implementation Roadmap (T-0 to T+18 months)"],
  ["12.", "Governance, Audit & Reporting"],
  ["13.", "Recommendations & Approval Request"],
  ["14.", "Appendix A — Regulatory Citations"],
  ["15.", "Appendix B — Technical Specifications Snapshot"],
];
doc.fillColor(TEXT).font("Helvetica").fontSize(11.5);
for (const [num, title] of toc) {
  const y = doc.y;
  doc.text(num, 56, y, { width: 30, continued: false });
  doc.text(title, 90, y, { width: W - 34 });
  doc.moveDown(0.5);
}

// ---------------- 1. EXECUTIVE SUMMARY ----------------
doc.addPage();
H1("Executive Summary");

P("This proposal sets out a structured plan for the Finatrades Group to issue a regulated, gold-backed instrument hereafter referred to as the Commodities Certificate (\"the Certificate\" or \"CCT\"). Each Certificate is materially represented by two synchronised forms: (a) a tamper-evident physical paper note, printed to bank-grade security standards; and (b) a corresponding on-chain twin token recorded on a public, audit-grade blockchain. Each pair is backed one-to-one by a defined weight of LBMA-grade physical gold held under bailment with a vaulting partner of the Group.");

P("The Certificate is intentionally not denominated in a fiat currency and is not promoted as electronic money or a payment token within the meaning of FINMA's published guidance. It is presented and marketed exclusively as a commodity ownership certificate evidencing fractional, allocated title to physical gold held in custody. This characterisation is decisive for the regulatory pathway, the tax treatment and the marketing narrative of the product.");

CalloutBox("Single-Sentence Thesis",
  "By combining the legal certainty of a Swiss-supervised commodities certificate with the verifiability of a public blockchain and the physical familiarity of a paper note, the Finatrades Group can offer the most accessible, fraud-resistant and globally portable representation of allocated gold available on the market today.",
  GOLD);

H2("Why now");
Bullets([
  "Global retail demand for gold reached multi-decade highs through 2024–2026, with central banks net-buyers for the seventeenth consecutive year.",
  "Tokenised gold has graduated from experiment to product: PAX Gold (PAXG) and Tether Gold (XAUT) together exceed USD 4 billion in market capitalisation.",
  "Switzerland's SO-FIT supervision under the Financial Institutions Act (FinIA) provides a stable, internationally recognised home for a non-payment commodities certificate issuer.",
  "FINMA's October 2025 consultation on dedicated payment-instrument and crypto-institution licences confirms that Switzerland will retain its first-mover advantage through 2027.",
  "The U.A.E.'s DMCC Free Zone now supports both physical bullion trading and tokenised commodity activity through a single regulated perimeter, in which the Group already operates two licensed entities."
]);

H2("What the Group brings to the table");
Table(
  ["Capability", "Provided by", "Status"],
  [
    ["Swiss financial-intermediary supervision", "Finatrades Finance SA, Geneva", "Active — SO-FIT affiliated"],
    ["Swiss VASP / virtual-asset operating capability", "Finatrades Finance SA, Geneva", "Active"],
    ["Offshore issuance and Treasury vehicle", "Saint Lucia licensed entity", "Active"],
    ["Physical gold sourcing, refining liaison, vault relationships", "Wingold DMCC, Dubai", "Active"],
    ["Bullion trading and inventory cycle", "Metals DMCC, Dubai", "Active"],
    ["Technology, IP, and platform operations", "Wincommodities Technology DMCC, Dubai", "Active"],
    ["Front-office digital platform, KYC, partner APIs", "Finatrades technology stack", "Production — live"],
  ],
  [180, 220, 121]
);

H2("Headline numbers (Year-1 base case)");
Table(
  ["Metric", "Value"],
  [
    ["Target gold under custody at end of Year 1", "250 kg (≈ USD 38.5 million at $154/g)"],
    ["Active Certificates issued (digital + paper, all denominations)", "1.4 million units"],
    ["Projected gross revenue (mint, redemption, custody, on-chain fees)", "USD 1.9 million"],
    ["Projected operating margin (after vault, audit, compliance)", "32 – 38 %"],
    ["Capital required to launch (vault inventory + tech + legal + insurance)", "USD 4.6 million"],
    ["Time-to-market from board approval to public issuance", "9 months (regulatory critical path)"],
  ],
  [330, 191]
);

// ---------------- 2. LICENSING ----------------
doc.addPage();
H1("Group Licensing Profile & Legal Standing");

P("The viability of a regulated commodities certificate depends almost entirely on the licensing footprint of the issuing group. The Finatrades Group has, over multiple years, deliberately assembled a complementary set of authorisations across three jurisdictions. This section sets out each licence, its scope, and its specific role in the Certificate programme.");

H2("Finatrades Finance SA — Geneva, Switzerland");
P("The Group's Swiss operating company is affiliated with SO-FIT (Organisme de Surveillance pour Intermédiaires Financiers et Trustees), one of the eleven supervisory organisations recognised by the Swiss Financial Market Supervisory Authority (FINMA) under the Financial Institutions Act (FinIA, in force since 1 January 2020). The affiliation qualifies the company as a financial intermediary under Article 2(3) of the Anti-Money Laundering Act (AMLA), enabling it lawfully to provide intermediation services involving precious metals, virtual assets and cross-border value transfer. The same vehicle holds the Group's recognised position as a Virtual Asset Service Provider, allowing it to operate exchange, custody-light and payment-token rails compliant with FINMA's published Token Classification (Payment / Utility / Asset).");

CalloutBox("Why this matters for the Certificate",
  "Because the Certificate is structured as a commodity ownership instrument and not as a payment token, the existing SO-FIT affiliation is — based on counsel's preliminary review — sufficient to support the issuance, on condition that the Certificate is not represented as a stable means of payment. The VASP capacity covers the on-chain twin and any secondary-market intermediation through the Group's platforms.",
  NAVY);

H2("Finatrades — Saint Lucia Licence");
P("The Group's Saint Lucian licensed entity provides the international issuance and treasury wrapper for non-Swiss-resident clientele, supporting the segregation of customer funds across jurisdictions and offering optionality for clients who prefer an offshore counterparty. Saint Lucia's regulatory framework recognises commodity-backed certificates and is increasingly used for tokenised real-world-asset programmes serving Latin American, African and South Asian markets.");

H2("Wingold DMCC — Dubai, United Arab Emirates");
P("Wingold DMCC operates within the Dubai Multi Commodities Centre Free Zone, a recognised global hub for precious-metals trading and a member of the LBMA-aligned community. Wingold provides the physical sourcing capacity for the Certificate programme — purchase of LBMA Good Delivery bars from accredited refiners, transport under armoured-carrier insurance, and bailment with the chosen vault operator. The DMCC licence permits both wholesale and retail bullion activity and the issuance of warehouse receipts, the legal cousin of a commodity certificate.");

H2("Metals DMCC — Dubai, United Arab Emirates");
P("Metals DMCC complements Wingold by holding the Group's day-to-day trading inventory and providing the price-discovery layer against the LBMA AM/PM fix. This separation between sourcing (Wingold) and trading (Metals) is a deliberate risk-management choice: it isolates inventory risk from sourcing risk and produces a clean audit trail for each gram of gold entering the Certificate programme.");

H2("Wincommodities Technology DMCC — Dubai");
P("This entity holds the intellectual property, runs the platform technology, and is the contractual counterparty for the smart-contract development, the printing-house relationship and the public verification portal. By housing technology in a DMCC entity, the Group also benefits from the favourable U.A.E. corporate-tax regime applicable to qualifying free-zone activities.");

H2("Combined regulatory perimeter");
Table(
  ["Function", "Lead entity", "Jurisdiction"],
  [
    ["Issuer of record (Certificate)", "Finatrades Finance SA", "Geneva, CH"],
    ["AML / KYC supervision", "Finatrades Finance SA via SO-FIT", "Geneva, CH"],
    ["Virtual asset rails (twin token)", "Finatrades Finance SA (VASP)", "Geneva, CH"],
    ["International issuance wrapper", "Finatrades Saint Lucia", "Saint Lucia"],
    ["Physical gold sourcing & vault bailment", "Wingold DMCC", "Dubai, U.A.E."],
    ["Bullion trading & inventory", "Metals DMCC", "Dubai, U.A.E."],
    ["Platform, IP and printing-house contracts", "Wincommodities Technology DMCC", "Dubai, U.A.E."],
  ],
  [220, 170, 131]
);

// ---------------- 3. PRODUCT ----------------
doc.addPage();
H1("Product Definition — The Commodities Certificate");

P("Every Certificate exists in two physical forms simultaneously. The first is a printed paper note carrying bank-grade security features and a unique Certificate Reference Number (CRN). The second is an on-chain ERC-1155 twin token whose token identifier is the same CRN. The two forms are not independent assets; they are two presentations of a single underlying claim on a defined weight of allocated gold held in vault.");

H2("Denominations");
Table(
  ["Code", "Gold backing", "Indicative value at $154/g", "Intended retail use"],
  [
    ["CCT-1G",   "1.000 g",   "USD 154.00", "Wholesale, B2B settlement"],
    ["CCT-100M", "0.100 g",   "USD 15.40",  "Mid-value daily payment"],
    ["CCT-10M",  "0.010 g",   "USD 1.54",   "Small daily transactions"],
    ["CCT-1M",   "0.001 g",   "USD 0.15",   "Micro-payments, change, pilot phase"],
  ],
  [80, 100, 150, 191]
);
P("All denominations are fungible within their class. The CCT-1M micro-denomination is reserved for a controlled second-phase rollout, after the unit-economics and printing-cost amortisation have been validated on the larger denominations. This staged release mirrors the approach taken by Kinesis Money in 2018–2020 with its KAU/KAG suite.");

H2("Legal characterisation");
Bullets([
  "The Certificate is a commodity ownership certificate evidencing a fractional, allocated, undivided interest in a pool of LBMA Good Delivery gold held under bailment for the benefit of Certificate holders.",
  "The Certificate is not a deposit, not a security in the sense of FinSA Article 3, not e-money, and not an investment fund.",
  "The on-chain twin token is a digital wrapper of the same legal claim and confers no additional rights beyond those already embedded in the Certificate.",
  "Title transfers when the on-chain token transfers; the paper note evidences the same title and remains valid only when the corresponding token is in the bearer-paper state (see Lifecycle, §7).",
]);

H2("Anti-double-spend mechanism");
P("At any moment in time, exactly one of the two forms of a given Certificate is the canonical bearer of value. When the paper note is in circulation, the twin token is held in a custodial address and is operationally frozen; the paper is the bearer. When the customer surrenders the paper to the Group through any of its channels, the Group destroys the note, records the destruction on-chain via a state transition (paperBurn), and the twin token is released to the customer's wallet. The reverse operation (issuePaper) burns the on-chain liquid token and prints a fresh paper note. This is the same architectural pattern used by Singapore's DigixGlobal in its 2016–2018 DGX gold programme.");

CalloutBox("Design Principle",
  "One Certificate. One ounce-equivalent of gold. Two presentations. Never both presentations spendable at the same time.",
  GOLD);

// ---------------- 4. COMPARABLES ----------------
doc.addPage();
H1("Comparable Real-World Implementations");

P("The Certificate does not require us to invent a new market. It places the Finatrades Group in a category that has already been validated by several billion dollars of real customer demand. This section reviews the most relevant comparables and extracts the lessons that have informed the proposed design.");

H2("PAX Gold (PAXG) — Paxos Trust Company, New York");
P("PAXG is the largest regulated gold-backed token by market capitalisation, with reserves exceeding USD 2.36 billion at the time of writing. Each PAXG token represents one fine troy ounce of London Good Delivery gold held in Brink's London vault. PAXG is supervised by the New York Department of Financial Services and the Office of the Comptroller of the Currency, and the reserves are subject to monthly attestations by an independent auditing firm. Token holders may look up the serial number of the underlying bar by entering their Ethereum address on the Paxos website. The total customer-facing fee is 0.02% per on-chain transaction plus standard gas, materially below the 0.5%–35% spread typical of traditional bullion dealers.");

H2("Tether Gold (XAUT) — TG Commodities, Switzerland");
P("XAUT operates with reserves of approximately USD 2 billion across more than 246,000 tokens, each representing one troy ounce held in Swiss vaults. Reserves are audited quarterly by BDO Italia. Redemption requires a holder to accumulate the equivalent of one 12.5-kg LBMA bar, and physical delivery is available only within Switzerland. The model proves that a Swiss vaulting jurisdiction is fully compatible with global token issuance.");

H2("Kinesis Money (KAU/KAG)");
P("Kinesis introduced the concept of yield-bearing gold and silver tokens in 2018, distributing transaction fees to holders. The Kinesis platform demonstrated that a tokenised precious-metals product can sustain its own merchant-payment ecosystem, including a debit card, in multiple jurisdictions.");

H2("Digix Global (DGX) — Singapore");
P("Although DGX wound down its retail offering in 2020, it is the most relevant historical comparable for a paper-plus-token model. Each DGX token represented one gram of London Good Delivery gold and could be redeemed in physical form at the Singapore vault. The lessons from DGX (insufficient demand for very-small physical denominations, importance of an active secondary market) are directly incorporated in this proposal.");

H2("LBMA-Aligned Gold-Backed Securities (paper-only)");
P("Outside the token world, paper-only equivalents include the Royal Mint's DigiGold, Perth Mint Certificates, and BullionVault's allocated-gold accounts. None of these combine a tamper-evident physical note with a public on-chain twin. The Finatrades Certificate would be the first fully integrated implementation operated under a Swiss licence.");

H2("Lessons synthesised into the Certificate design");
Bullets([
  "Begin issuance at gram-level denominations; introduce milligram denominations only after the printing economics are proven.",
  "Publish reserve attestations monthly, not quarterly — the market now expects monthly.",
  "Provide a public, free, cryptographically-verifiable lookup tool from day one.",
  "Accept that physical redemption will be rare, but its presence is decisive for trust.",
  "Build the secondary market and merchant acceptance in parallel, not after launch.",
]);

// ---------------- 5. LEGAL ----------------
doc.addPage();
H1("Legal & Regulatory Architecture");

P("The Certificate sits at the intersection of three regulated activities: (i) the issuance of a commodity ownership instrument, (ii) the operation of a virtual-asset rail, and (iii) the physical handling of bullion. Each of the Group's licences addresses one of these activities, and the proposed legal architecture aligns each licence with the activity for which it is the natural home.");

H2("Switzerland — primary regulatory anchor");
P("Finatrades Finance SA, Geneva, will act as the Issuer of the Certificate and the Operator of the on-chain twin token. The SO-FIT affiliation provides AMLA supervision; the VASP recognition supports the on-chain rails. Counsel will be instructed to confirm in writing, before public issuance, that the Certificate as designed does not constitute a security under FinSA Article 3 and is therefore exempt from the prospectus and key-information-document obligations applicable to securities offerings.");
Quote("In Switzerland, the substance of the instrument always prevails over its form. A commodity certificate that does not promise a fixed monetary return, that does not pool funds for collective investment, and that grants its holder a direct, traceable, allocated claim on a physical asset, falls outside the scope of FinSA's securities regime.",
  "Counsel's preliminary opinion, March 2026");

H2("United Arab Emirates — physical operations and technology");
P("The Group's three DMCC entities provide the operational spine of the programme. Wingold and Metals DMCC are responsible for sourcing, transport and inventory; Wincommodities Technology DMCC holds the platform IP, the smart-contract codebase, the printing-house relationship and the audit-portal infrastructure. The DMCC's recognition of warehouse receipts as legal title to bullion is the foundational source of title that the Certificate will reflect upstream.");

H2("Saint Lucia — international issuance optionality");
P("The Saint Lucia licence is reserved for the international segment, where it provides three benefits: (a) jurisdictional segregation for non-Swiss-resident clientele, (b) treasury optimisation for cross-border flows, and (c) an alternative issuance entity should any jurisdictional restriction emerge in a target market. The Saint Lucia entity does not duplicate the Swiss issuance — it complements it.");

H2("AML, KYC and sanctions");
P("All Certificate purchases above the cash-equivalent threshold of CHF 1,000 will be subject to full KYC under the existing Finatrades onboarding stack, which already implements identity verification, sanctions screening, PEP screening and adverse-media checks. Below this threshold, the Certificate is bearer-equivalent (paper note) but the underlying gold remains traceable through the on-chain ledger and the vault inventory system, providing a level of forensic transparency unavailable to traditional bearer instruments.");

CalloutBox("Important regulatory note",
  "Until written confirmation is received from external Swiss counsel and from FINMA where appropriate, no marketing of the Certificate to the public will be undertaken. This proposal authorises preparation, not public issuance.",
  "#B91C1C");

// ---------------- 6. TECHNOLOGY ----------------
doc.addPage();
H1("Technology Architecture — Paper + Token Twin");

H2("Chain selection");
P("The proposal recommends Polygon PoS as the primary issuance chain, with optional secondary issuance on BNB Chain. Both chains offer sub-cent transaction fees, EVM compatibility (preserving smart-contract talent flexibility), and mature wallet support. Ethereum mainnet is intentionally excluded for retail denominations because gas economics make it unviable for a CCT-10M (USD 1.54) transfer; the mainnet remains an option for wholesale CCT-1G transfers between institutional counterparties.");

H2("Smart-contract design");
P("The Certificate twin uses the ERC-1155 multi-token standard, in which a single contract supports multiple denominations distinguishable by token identifier. Each unit carries a Certificate Reference Number (CRN) embedded in its metadata. The contract exposes the following functions, all access-controlled to the Issuer's multi-signature governance wallet:");
Bullets([
  "mint(crn, denomination, to)  — invoked when gold is added to the vault and the Issuer creates a new Certificate.",
  "freeze(crn)  / unfreeze(crn)  — invoked when the corresponding paper note enters or leaves circulation.",
  "burn(crn)  — invoked on redemption for physical gold or for cash equivalent.",
  "verify(crn) view  — public, gas-free read returning denomination, vault location, audit reference and current state.",
  "totalReserves() view  — returns the aggregate gold backing across all outstanding Certificates, intended for use by oracles and auditors.",
]);

H2("Physical note specification");
Table(
  ["Feature", "Specification"],
  [
    ["Substrate", "Cotton-based banknote paper, 90 g/m², watermarked with Finatrades crest"],
    ["Print", "Intaglio + offset, four-colour with two security inks (UV, IR)"],
    ["Holographic stripe", "DOVID with denomination + gold weight"],
    ["Microprint", "Latin-text repetition of the CRN"],
    ["Serial / CRN", "Bichromatic laser-engraved, repeated in two distant zones of the note"],
    ["QR code", "Links to https://verify.finatrades.com/{crn}"],
    ["NFC chip", "Optional in higher denominations; signed challenge-response"],
    ["Tamper-evidence", "Substrate fluoresces and cracks if delaminated"],
  ],
  [150, 371]
);

H2("Verification portal");
P("A public, free, mobile-friendly portal at verify.finatrades.com will allow any holder, merchant or auditor to enter or scan a CRN and immediately retrieve: the gold weight backing the Certificate, the current state (paper-active / token-active / redeemed), the vault and audit reference, and a cryptographic signature attesting to the data. The portal is read-only, requires no login and is intentionally engineered to be cacheable at the CDN edge for global low-latency response.");

H2("Integration with the existing Finatrades platform");
P("The Certificate programme reuses the Group's existing technology investments wherever possible: the KYC stack, the partner API gateway already serving Wingold, the email infrastructure, the document and certificate ledger, the dual-wallet model, and the BullMQ job-queue system that handles asynchronous workflows. No new authentication, billing or notification infrastructure is required. New components are limited to the smart-contract suite, the printing-house integration, the verification portal and a small set of admin screens for the operations team.");

// ---------------- 7. LIFECYCLE ----------------
doc.addPage();
H1("Operational Lifecycle of a Certificate");

P("This section walks through the full lifecycle of a single Certificate from gold purchase to final redemption. Each step is deliberately mapped to a Group entity, a control owner and an audit artefact.");

H2("Step 1 — Sourcing");
P("Wingold DMCC purchases LBMA Good Delivery bars from accredited refiners against confirmed customer demand or against an internal inventory plan. Bars are transported by armoured carrier under insurance to the contracted vault.");

H2("Step 2 — Bailment & registration");
P("On vault arrival, the bar is weighed, photographed and registered with its serial number. The Group's vault-management system records the bar, its weight, its purity, its location coordinate and its bailment reference. This event triggers the system to mint a corresponding tranche of CCT tokens in the smart contract, all initially in the unallocated pool of the Issuer.");

H2("Step 3 — Issuance to a customer");
P("When a customer purchases a Certificate (digital or paper), the corresponding tokens move from the unallocated pool to either (a) the customer's wallet (digital purchase) or (b) the Issuer's paper-circulating address with the matching paper note printed and shipped to the customer (paper purchase).");

H2("Step 4 — Circulation");
P("The Certificate may be transferred between customers either by handing over the paper note (peer-to-peer, like cash) or by sending the on-chain token (peer-to-peer, like crypto). At all times, exactly one form is active. Merchants accepting the Certificate scan the QR code on the paper or read the on-chain state of the token.");

H2("Step 5 — Conversion between forms");
P("A holder of a paper note who wishes to switch to the digital token mails the note to a Group office; the note is destroyed on receipt under dual control, the paperBurn function is invoked, and the corresponding token is released to the customer's wallet. The reverse path is also supported.");

H2("Step 6 — Redemption");
P("A holder of any combination of forms aggregating to at least 100 g of gold may request physical delivery, which is fulfilled by Wingold DMCC against destruction of the underlying Certificates. Cash redemption against the prevailing LBMA fix is available at any volume.");

CalloutBox("Audit artefact at every step",
  "Each of the six lifecycle events writes to the on-chain ledger AND to the Group's internal audit log AND to the vault-management system. The reconciliation of all three sources is the basis of the monthly third-party attestation.",
  NAVY);

// ---------------- 8. USE CASES ----------------
doc.addPage();
H1("Real Customer Use Cases");

P("To illustrate how the Certificate behaves in the hands of real users, this section describes four representative scenarios drawn from the Group's current customer profile. The names are illustrative.");

H2("Use case 1 — Hasim, gold-savings customer in the U.A.E.");
P("Hasim is a long-standing Wingold retail customer in Dubai who buys small quantities of gold every month as a savings discipline. Today, he receives a paper invoice and a vault-allocation reference. With the Certificate programme, the same monthly purchase is delivered to him as a CCT-1G note shipped to his home address, plus the option to convert the note into a digital token whenever he wishes to send a portion to family abroad. The economic substance for Hasim is unchanged; the convenience and verifiability are transformed.");

H2("Use case 2 — Charan Pratap, jewellery-shop owner in India");
P("Charan operates a mid-sized jewellery shop and frequently transacts in physical gold. The CCT-1G note allows him to settle wholesale-to-retail gold transfers between his suppliers and his shop without moving physical bullion at every step. He scans the QR on each note received, confirms the on-chain state, and accepts the note as proof of allocated gold ownership. At month-end, he aggregates notes and digitally redeems the equivalent against his supplier's account.");

H2("Use case 3 — Farah Naaz, expatriate sending value to family");
P("Farah works in Geneva and supports her parents in South Asia. Today, she sends fiat through a money-transfer operator at a 4–6% effective cost. With the Certificate, she purchases CCT digital tokens at the LBMA fix plus 0.5%, transfers them on-chain to her parents' wallet for under one cent in network fees, and her parents convert them locally to either cash or paper notes through a Group office or partner. The all-in cost falls below 1% with the added benefit of holding gold rather than depreciating local currency between transmission and use.");

H2("Use case 4 — Reda Rami, merchant accepting CCT for business payments");
P("Reda runs a hospitality business in the U.A.E. and seeks to insulate part of his cash flow from regional currency volatility. He opts in to accept CCT at the point of sale through a simple verification widget. End-of-day, his accumulated CCT balance is automatically converted to AED through the Metals DMCC trading desk if he wishes, or held as gold against future expenditure. The on-chain auditability and the absence of chargeback risk are immediate operational benefits.");

CalloutBox("What these four cases share",
  "Each customer interacts with the Certificate in the form most natural to them — paper for Hasim and Charan, digital for Farah, hybrid for Reda — without any of them needing to understand the underlying blockchain. The technology is invisible; the trust is explicit.",
  GOLD);

// ---------------- 9. FINANCIAL ----------------
doc.addPage();
H1("Financial Model & Unit Economics");

H2("Per-Certificate cost structure (CCT-1G, indicative)");
Table(
  ["Cost item", "USD per Certificate"],
  [
    ["Gold cost (1 g LBMA fix at issuance)", "154.00"],
    ["Refining & transport allocated", "0.18"],
    ["Vaulting fee (annual, allocated to one year of holding)", "0.30"],
    ["Insurance (annual, allocated)", "0.08"],
    ["Paper printing & security features", "0.42"],
    ["Smart-contract gas (mint + freeze, Polygon)", "0.01"],
    ["Audit & compliance (allocated per Certificate)", "0.05"],
    ["Operations (KYC, customer service, allocated)", "0.20"],
    ["Total cost per Certificate", "155.24"],
  ],
  [330, 191]
);

H2("Revenue model");
Table(
  ["Revenue line", "Indicative bps", "Comment"],
  [
    ["Mint spread vs LBMA fix", "50 bps", "Single-side at issuance"],
    ["On-chain transfer fee", "2 bps", "Smart-contract fee per transfer"],
    ["Paper-to-digital conversion", "20 bps", "Per request, covers handling"],
    ["Custody fee (annual)", "30 bps", "On total CCT under custody"],
    ["Physical redemption", "75 bps", "Per redemption"],
  ],
  [180, 100, 241]
);

H2("Year-1 base case (already summarised in §1)");
Table(
  ["Line item", "Year 1", "Year 2", "Year 3"],
  [
    ["Gold under custody (kg)", "250", "1,100", "3,400"],
    ["Active Certificates (millions)", "1.4", "6.2", "19.5"],
    ["Gross revenue (USD m)", "1.9", "8.6", "27.4"],
    ["Operating margin", "32%", "41%", "47%"],
    ["EBITDA (USD m)", "0.6", "3.5", "12.9"],
  ],
  [220, 100, 100, 101]
);

H2("Capital requirement");
Bullets([
  "Initial vault inventory (250 kg gold): USD 38.5 million — funded through customer pre-orders and Group treasury.",
  "Technology build (smart contracts, portal, admin tools): USD 0.6 million.",
  "Legal opinions, regulatory consultation, FINMA dialogue: USD 0.4 million.",
  "Insurance, vault deposit, transport: USD 0.3 million.",
  "Printing-house tooling and first run: USD 0.2 million.",
  "Marketing, partner activation: USD 0.5 million.",
  "Working capital and contingency: USD 2.6 million.",
  "Total non-inventory capital required: USD 4.6 million.",
]);

// ---------------- 10. RISK ----------------
doc.addPage();
H1("Risk Register & Mitigation Plan");

Table(
  ["Risk", "Likelihood", "Impact", "Mitigation"],
  [
    ["Reclassification of Certificate as a security or e-money", "Low", "High",
      "Pre-issuance written counsel opinion; FINMA pre-consultation; design choices that exclude payment-token features."],
    ["Vault loss or counterparty failure", "Very Low", "Very High",
      "All-risks insurance to LBMA standard; dual-vault diversification from Year 2; quarterly physical inventory."],
    ["Counterfeit paper notes entering circulation", "Medium", "High",
      "Bank-grade security features; mandatory QR/NFC verification at point of acceptance; rapid blacklist via on-chain freeze."],
    ["Smart-contract exploit", "Low", "High",
      "Two independent audits before deployment; bug bounty; multi-signature governance; pause function."],
    ["Customer confusion between paper and digital state", "Medium", "Medium",
      "Verification portal as single source of truth; clear customer education; merchant onboarding playbook."],
    ["Sanctions or AML breach in secondary market", "Low", "High",
      "On-chain monitoring; address-screening at all Group on/off-ramps; suspicious-activity reporting under SO-FIT obligations."],
    ["Gold-price volatility eroding customer trust", "Medium", "Low",
      "Customer education that the Certificate is gold, not a stablecoin; prominent display of LBMA fix at all touchpoints."],
    ["Printing-house dependency", "Low", "Medium",
      "Two qualified printing partners from launch; dual-source supply chain documented in BCP."],
  ],
  [180, 70, 60, 211]
);

// ---------------- 11. ROADMAP ----------------
doc.addPage();
H1("Implementation Roadmap (T-0 to T+18 months)");

H2("Phase 1 — Foundations (T-0 to T+3 months)");
Bullets([
  "Board approval of this proposal and capital authorisation.",
  "Engagement of external Swiss counsel for written legal opinion.",
  "FINMA pre-consultation submission via SO-FIT.",
  "Vault partner selection (Switzerland and Dubai).",
  "Printing-house RFP and security-feature specification.",
  "Smart-contract architecture review and first development sprint.",
]);

H2("Phase 2 — Build (T+3 to T+6 months)");
Bullets([
  "Smart-contract development complete; first audit by independent firm.",
  "Verification portal live on staging; UX validated with 25 pilot users.",
  "Printing-house produces first proofs; security features validated.",
  "Vault contracts signed; insurance bound.",
  "AML procedures updated to cover Certificate-specific scenarios.",
]);

H2("Phase 3 — Pilot (T+6 to T+9 months)");
Bullets([
  "Closed pilot with 250 invited customers across U.A.E. and Switzerland.",
  "Issuance limited to CCT-1G; physical redemption tested at least once.",
  "Second smart-contract audit on the deployed code.",
  "First monthly attestation published.",
  "FINMA / SO-FIT briefing on pilot outcomes.",
]);

H2("Phase 4 — Public launch (T+9 to T+12 months)");
Bullets([
  "Public issuance of CCT-1G and CCT-100M denominations.",
  "Merchant-acceptance partner programme launched in U.A.E.",
  "International rollout via Saint Lucia entity to selected jurisdictions.",
  "Customer-support, KYC and operations team scaled to plan.",
]);

H2("Phase 5 — Scale (T+12 to T+18 months)");
Bullets([
  "Introduction of CCT-10M denomination after printing-cost amortisation review.",
  "Secondary-market activation with regulated exchanges.",
  "Year-1 financial review and Series-A capital raise if growth exceeds plan.",
  "Optional CCT-1M micro-denomination, subject to printing-cost review.",
]);

// ---------------- 12. GOVERNANCE ----------------
doc.addPage();
H1("Governance, Audit & Reporting");

H2("Governance structure");
Bullets([
  "Programme Steering Committee chaired by the Group CEO, meeting monthly.",
  "Risk & Compliance Committee, meeting monthly, reporting to the Group Audit Committee.",
  "Three-of-five multi-signature wallet for all on-chain Issuer functions, with signers drawn from CEO, CFO, CTO, Head of Compliance and an external trustee.",
  "Independent vault-inventory verification quarterly; full physical inventory annually.",
]);

H2("Reporting cadence");
Table(
  ["Report", "Frequency", "Recipient"],
  [
    ["Reserve attestation", "Monthly", "Public website + holders"],
    ["Operational KPI pack", "Monthly", "Steering Committee"],
    ["Compliance report", "Quarterly", "SO-FIT + Audit Committee"],
    ["Smart-contract security review", "Annual", "Audit Committee"],
    ["Financial statements", "Semi-annual", "Group Board"],
    ["Vault physical inventory", "Quarterly", "Independent auditor"],
  ],
  [220, 100, 201]
);

// ---------------- 13. RECOMMENDATIONS ----------------
doc.addPage();
H1("Recommendations & Approval Request");

P("Following the analysis presented in the preceding twelve sections, the authoring team requests the Group's approval of the following decisions, in the following sequence.");

H2("Decision 1 — In-principle approval");
P("That the Group Board approves, in principle, the launch of the Commodities Certificate programme as described in this proposal, subject to the satisfaction of the conditions set out in Decisions 2 to 5.");

H2("Decision 2 — Engagement of external counsel");
P("That external Swiss counsel of recognised standing is engaged to deliver, within 30 days, a written legal opinion confirming the regulatory characterisation set out in §3 and §5.");

H2("Decision 3 — FINMA pre-consultation");
P("That a structured pre-consultation is initiated with FINMA via SO-FIT to validate the regulatory pathway before any public issuance.");

H2("Decision 4 — Capital allocation");
P("That an initial non-inventory budget of USD 4.6 million is allocated to the programme for the period T-0 to T+9 months, drawn against the Group's existing treasury and recoverable from operating revenue from Year 2 onwards.");

H2("Decision 5 — Programme leadership");
P("That a Programme Director is appointed to lead the cross-jurisdictional execution, reporting to the Group CEO, with formal accountability for the milestones in §11.");

CalloutBox("Action requested",
  "The authoring team requests written approval of Decisions 1 to 5 from the Group Board, by no later than the next regular Board meeting. Subject to that approval, public issuance is targeted for T+9 months from the date of approval.",
  NAVY);

// ---------------- 14. APPENDIX A ----------------
doc.addPage();
H1("Appendix A — Regulatory Citations");

Bullets([
  "Swiss Federal Act on Financial Institutions (FinIA), in force 1 January 2020.",
  "Swiss Federal Act on Financial Services (FinSA), Article 3, security definitions.",
  "Swiss Federal Act on the Combating of Money Laundering and Terrorism Financing (AMLA), Article 2(3).",
  "FINMA Guidance on Initial Coin Offerings (16 February 2018) — token classification (Payment / Utility / Asset).",
  "FINMA Consultation on Payment Instrument and Crypto-Institution Licences, 22 October 2025 (consultation closed February 2026).",
  "SO-FIT — Statutes and supervisory regulations, current version, Geneva.",
  "DMCC Authority — Free-Zone Regulations, including the recognition of Warehouse Receipts as title to bullion.",
  "Saint Lucia Financial Services Regulatory Authority Act and subsidiary regulations.",
  "LBMA Good Delivery Rules for Gold and Silver Bars, current edition.",
  "UAE Federal Decree-Law No. 20 of 2018 on Anti-Money Laundering, as amended.",
]);

// ---------------- 15. APPENDIX B ----------------
doc.addPage();
H1("Appendix B — Technical Specifications Snapshot");

H2("Smart-contract suite");
Bullets([
  "Standard: ERC-1155 multi-token.",
  "Primary deployment chain: Polygon PoS (chain id 137).",
  "Secondary chain (optional): BNB Chain (chain id 56).",
  "Governance: 3-of-5 multi-signature (Gnosis Safe).",
  "Pause: Yes, time-delayed; pause can only be invoked by the Risk & Compliance Committee.",
  "Upgrade: Transparent proxy with 7-day timelock on every upgrade.",
  "Audits: Two independent audits before mainnet deployment; one re-audit on every upgrade.",
]);

H2("Verification portal");
Bullets([
  "URL: https://verify.finatrades.com/{crn}",
  "Read-only, requires no authentication.",
  "Edge-cached at three global regions; sub-200ms response target globally.",
  "Returns: denomination, gold weight, vault, audit reference, current state, cryptographic signature.",
]);

H2("Physical note printing");
Bullets([
  "Two qualified printing partners; one primary, one secondary.",
  "Substrate, inks and security features as listed in §6.",
  "Production batches numbered and tracked end-to-end against the on-chain mint events.",
  "Destroyed notes are physically shredded under dual control and the destruction event is logged on-chain via paperBurn.",
]);

H2("Customer-facing platform integration");
Bullets([
  "Existing Finatrades KYC, partner-API and notification stacks reused.",
  "New: Certificate purchase flow, CRN lookup, paper-mailing workflow, dual-state wallet.",
  "Mobile-first responsive design; offline QR scanning supported through Progressive Web App.",
]);

// ---------------- SIGN-OFF ----------------
doc.addPage();
doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(22).text("Authoring Team & Sign-Off");
doc.moveDown(0.2);
doc.strokeColor(GOLD).lineWidth(2).moveTo(56, doc.y).lineTo(56 + 90, doc.y).stroke();
doc.moveDown(1.4);

const team = [
  { name: "Hasim", role: "Lead Author — Product & Customer Experience" },
  { name: "Charan Pratap", role: "Co-Author — Operations & Physical Custody" },
  { name: "Farah Naaz", role: "Co-Author — Compliance & Regulatory Strategy" },
  { name: "Reda Rami", role: "Co-Author — Technology & Smart-Contract Architecture" },
];
for (const t of team) {
  if (doc.y > 700) doc.addPage();
  doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(13).text(t.name);
  doc.fillColor(MUTED).font("Helvetica").fontSize(10.5).text(t.role);
  doc.moveDown(0.4);
  doc.strokeColor(LINE).lineWidth(0.8).moveTo(56, doc.y + 30).lineTo(56 + 220, doc.y + 30).stroke();
  doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Signature & Date", 56, doc.y + 34);
  doc.moveDown(2.2);
}

doc.moveDown(1.5);
doc.fillColor(SLATE).font("Helvetica-Oblique").fontSize(10).text(
  "This document is confidential and intended solely for internal review by the Finatrades Group and its advisers. It does not constitute an offer to sell or a solicitation of an offer to buy any security, certificate or token in any jurisdiction. Any decision to proceed with the programme described herein is subject to the prior written approval of the Group Board, the receipt of external counsel's opinion, and any consultation outcome with FINMA via SO-FIT.",
  { align: "justify", lineGap: 2 }
);

// ---------------- PAGE NUMBERS & FOOTER ----------------
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  // skip cover footer
  if (i === 0) continue;
  doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
    .text(`Finatrades Group  •  Commodities Certificate Token  •  Confidential`, 56, 800, { width: W, align: "left" });
  doc.text(`Page ${i + 1} of ${range.count}`, 56, 800, { width: W, align: "right" });
}

doc.end();

stream.on("finish", async () => {
  const stats = fs.statSync(OUT_FILE);
  console.log(`\n[PDF] Generated: ${OUT_FILE}`);
  console.log(`[PDF] Size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`[PDF] Pages: ${range.count}`);

  // Send by email
  const SMTP_HOST = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_FROM = process.env.SMTP_FROM || "noreply@finatrades.com";
  const TO = "Blockchain@finatrades.com";

  if (!SMTP_USER || !SMTP_PASS) {
    console.log("[Email] SMTP_USER/SMTP_PASS not set — skipping email send. PDF is saved at the path above.");
    process.exit(0);
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });

  const subject = "Strategic Proposal — Finatrades Commodities Certificate Token (CCT) v1.0";
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#1F2A37; max-width:640px; margin:auto;">
      <div style="background:#0B2545; color:#FFFFFF; padding:24px; border-top:4px solid #C9A94B; border-bottom:4px solid #C9A94B;">
        <div style="color:#C9A94B; letter-spacing:3px; font-size:11px; font-weight:bold;">FINATRADES GROUP</div>
        <h1 style="margin:8px 0 0; font-size:22px;">Commodities Certificate Token — Strategic Proposal</h1>
        <div style="color:#9FB3C8; font-size:12px; margin-top:6px;">Geneva  •  Dubai  •  Saint Lucia</div>
      </div>
      <div style="padding:24px; line-height:1.6;">
        <p>Dear Blockchain Team,</p>
        <p>Please find attached the v1.0 strategic proposal for the launch of the <strong>Finatrades Commodities Certificate Token (CCT)</strong> — a regulated, gold-backed instrument combining a tamper-evident physical paper note with a synchronised on-chain twin token.</p>
        <p>The proposal covers, in detail:</p>
        <ul>
          <li>The Group's existing licensing footprint across Geneva (SO-FIT / VASP), Saint Lucia and Dubai (DMCC × 3) and how each licence maps to a programme function.</li>
          <li>Product definition, denominations (CCT-1G to CCT-1M) and the anti-double-spend mechanism between paper and token.</li>
          <li>Comparable real-world implementations (PAXG, XAUT, Kinesis, DGX) and the lessons incorporated into the design.</li>
          <li>Legal architecture, smart-contract design (ERC-1155 on Polygon), and physical note specification.</li>
          <li>Operational lifecycle, financial model, risk register and an 18-month implementation roadmap.</li>
        </ul>
        <p>The document concludes with a structured request for in-principle Board approval, the engagement of external Swiss counsel, FINMA pre-consultation via SO-FIT, capital allocation of USD 4.6 million for the first nine months, and the appointment of a Programme Director.</p>
        <p>Authoring team:<br/>
          <strong>Hasim</strong> — Product & Customer Experience<br/>
          <strong>Charan Pratap</strong> — Operations & Physical Custody<br/>
          <strong>Farah Naaz</strong> — Compliance & Regulatory Strategy<br/>
          <strong>Reda Rami</strong> — Technology & Smart-Contract Architecture
        </p>
        <p style="margin-top:24px; padding-top:16px; border-top:1px solid #D8DEE5; font-size:11px; color:#6B7280;">
          This document is confidential and intended solely for internal review by the Finatrades Group and its advisers. It does not constitute an offer to sell or a solicitation of an offer to buy any security, certificate or token in any jurisdiction.
        </p>
      </div>
    </div>`;

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: TO,
      subject,
      html,
      attachments: [{
        filename: "Finatrades_CCT_Proposal_v1.0.pdf",
        path: OUT_FILE,
        contentType: "application/pdf",
      }],
    });
    console.log(`[Email] Sent to ${TO}`);
    console.log(`[Email] messageId: ${info.messageId}`);
    console.log(`[Email] response : ${info.response}`);
    process.exit(0);
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    process.exit(1);
  }
});

stream.on("error", (e) => {
  console.error("[PDF] write error:", e);
  process.exit(1);
});
