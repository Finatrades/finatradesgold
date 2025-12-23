import { jsPDF } from 'jspdf';
import { BnslPlan } from '@/types/bnsl';

interface SignatureData {
  signatureName: string;
  signedAt: string;
}

export const generateBnslAgreement = (plan: Partial<BnslPlan>, user: any, signatureData?: SignatureData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 20;

  // Helper for centered text
  const centerText = (text: string, yPos: number, fontSize = 12, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
  };

  // Helper for wrapped text with page break handling
  const addWrappedText = (text: string, yPos: number, fontSize = 10, isBold = false, indent = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    
    // Check if we need a page break
    const lineHeight = fontSize * 0.5;
    const requiredHeight = lines.length * lineHeight;
    
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.text(lines, margin + indent, yPos);
    return {
      newY: yPos + requiredHeight + 2, // Return new Y position
      addedHeight: requiredHeight + 2
    }; 
  };

  // --- HEADER ---
  centerText("Terms and Conditions for BNSL - Buy Now Sell Later Plan", y, 16, true);
  y += 10;
  centerText("Last Updated: [09/12/2025], V3", y, 10, false);
  y += 10;
  
  centerText(`Plan ID: ${plan.id || 'DRAFT'}`, y, 12, false);
  y += 6;
  centerText(`Date: ${new Date().toLocaleDateString()}`, y, 12, false);
  y += 10;

  // --- PARTICIPANT DETAILS ---
  doc.setDrawColor(0);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, contentWidth, 25, 'F');
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PARTICIPANT DETAILS", margin + 5, y + 8);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${user?.name || 'Valued Client'}`, margin + 5, y + 15);
  doc.text(`Email: ${user?.email || 'N/A'}`, margin + 5, y + 20);
  y += 35;

  // --- PLAN SUMMARY ---
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, contentWidth, 40, 'F');

  doc.setFont("helvetica", "bold");
  doc.text("PLAN SUMMARY", margin + 5, y + 8);

  doc.setFont("helvetica", "normal");
  const leftCol = margin + 5;
  const rightCol = pageWidth / 2 + 5;
  
  doc.text(`Tenure: ${plan.tenorMonths} Months`, leftCol, y + 15);
  doc.text(`Gold Sold: ${plan.goldSoldGrams?.toFixed(2)} g`, leftCol, y + 22);
  doc.text(`Enrollment Price: $${plan.enrollmentPriceUsdPerGram?.toFixed(2)} / g`, leftCol, y + 29);

  doc.text(`Margin Rate: ${plan.agreedMarginAnnualPercent || 0}% p.a.`, rightCol, y + 15);
  doc.text(`Base Price (Deferred): $${plan.basePriceComponentUsd?.toLocaleString()}`, rightCol, y + 22);
  doc.text(`Total Margin: $${plan.totalMarginComponentUsd?.toLocaleString()}`, rightCol, y + 29);
  
  y += 50;

  // --- AGREEMENT CONTENT ---
  let res;

  // 1. Introduction
  res = addWrappedText("1. Introduction and Acceptance", y, 12, true);
  y = res.newY;
  res = addWrappedText("These Terms and Conditions (\"Terms\") govern your participation in the BNSL - Buy Now Sell Later Plan (\"the Plan\"), administered on the Finatrades platform (\"the Platform\"). Under this Plan, you execute an immediate and irrevocable sale of physical gold to Wingold and Metals DMCC (\"Wingold\"). Payment is made in two components: (a) a deferred Base Price Component payable at maturity, and (b) a Margin Component disbursed quarterly during the Plan term.", y);
  y = res.newY;
  res = addWrappedText("By enrolling in the Plan, you (\"the Participant,\" \"you,\" \"your\") irrevocably agree to be bound by these Terms.", y);
  y = res.newY + 5;

  // 2. Plan Overview
  res = addWrappedText("2. Plan Overview & Transaction Structure", y, 12, true);
  y = res.newY;
  res = addWrappedText("2.1. The BNSL Plan is a Deferred Price Sale Agreement. Upon your enrollment and confirmation, you sell, and Wingold purchases, a specific quantity of physical gold. Legal title and all ownership rights to the gold transfer to Wingold immediately.", y);
  y = res.newY;
  res = addWrappedText("2.2. Immediate Sale and Title Transfer: The sale is effective upon Plan confirmation. You no longer own, possess, or have any claim to the specific gold sold. Your rights are strictly contractual, limited to receiving the payments outlined in these Terms.", y);
  y = res.newY;
  res = addWrappedText("2.3. Pricing Mechanism:", y, 10, true);
  y = res.newY;
  res = addWrappedText("a) Base Price Component: This is the market value of the gold at the time of sale, calculated as: (Quantity of Gold Sold in grams) x (Current Market Gold Price Fixed at Enrollment). Payment of this component is deferred until maturity.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("b) Margin Component: This is the additional amount paid to you by Wingold, representing a pre-agreed percentage of the Base Price Component. It is calculated as: Base Price Component x (Agreed Margin Percentage). This Margin Component is paid out during the Plan term.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("c) Total Sale Proceeds: The sum of the Base Price Component and the Margin Component. This is the total amount Wingold agrees to pay you for your gold.", y, 10, false, 5);
  y = res.newY;
  
  res = addWrappedText("2.4. Value Display: Your Platform account will display:", y, 10, true);
  y = res.newY;
  res = addWrappedText("- Contractual Entitlement: The monetary value of the Base Price Component payable at maturity.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("- Margin Disbursement Schedule: The timeline and monetary value of each quarterly Margin Component disbursement.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("- Accumulated Margin Gold: The total physical gold received from Margin Component disbursements.", y, 10, false, 5);
  y = res.newY;
  
  res = addWrappedText("2.5. No Banking Relationship: The Plan does not constitute a deposit, savings account, or banking product. You are purchasing Gold and selling the Gold with a guaranteed Margin, not making a financial deposit.", y);
  y = res.newY + 5;

  // 3. Payment Structure
  res = addWrappedText("3. Payment Structure: Margin & Base Price", y, 12, true);
  y = res.newY;
  res = addWrappedText(`3.1. Sale Transaction: You sell a specified quantity of physical gold, which is ${plan.goldSoldGrams?.toFixed(3)} grams. The market value of this gold at the time of your enrollment is based on the Current Market Gold Price, which is $${plan.enrollmentPriceUsdPerGram?.toFixed(2)} per gram.`, y);
  y = res.newY;
  res = addWrappedText(`3.2. Base Price Component: The core value of your sale, known as the Base Price Component, is calculated by multiplying the quantity of gold sold by the Current Market Gold Price at enrollment. This results in an amount of $${plan.basePriceComponentUsd?.toLocaleString()}. This entire sum represents the deferred portion of your payment and will be settled in full upon the Plan's maturity.`, y);
  y = res.newY;
  res = addWrappedText(`3.3. Margin Component & Quarterly Disbursements: An additional amount, the Margin Component, is added to your total proceeds. For your selected ${plan.tenorMonths}-Month Plan, an annual margin of ${plan.agreedMarginAnnualPercent || 0}% applies to the Base Price Component. The total value of this Margin Component is $${plan.totalMarginComponentUsd?.toLocaleString()}. This amount is not paid as a lump sum; instead, it is distributed to you in equal instalments, known as Quarterly Disbursements. Each fixed monetary disbursement ($${plan.quarterlyMarginUsd?.toLocaleString()}) is automatically converted into physical gold based on the prevailing market price on the disbursement date.`, y);
  y = res.newY;
  res = addWrappedText("3.4. Base Price Payment at Maturity: At the end of the Plan term, Wingold will settle the Base Price Component. Settlement will be made by crediting your Fina wallet with a quantity of gold grams equivalent to the Base Price Component Value divided by the Current Market Gold Price at Maturity. This credit will be completed within three (3) business days of the Maturity Date.", y);
  y = res.newY + 5;

  // 4. Maturity
  res = addWrappedText("4. Maturity", y, 12, true);
  y = res.newY;
  res = addWrappedText(`4.1. Maturity Definition: The Plan reaches maturity at the end of the selected term (${plan.tenorMonths} months from the start date).`, y);
  y = res.newY;
  res = addWrappedText("4.2. Automatic Settlement Process: Upon maturity, settlement of your Base Price Component occurs automatically without requiring any action from you.", y);
  y = res.newY;
  res = addWrappedText("4.3. Base Price Settlement: Your Base Price Component (valued at the Current Market Gold Price established at your enrollment) will be delivered to you. Wingold will credit your Fina wallet with the quantity of gold grams equal in monetary value to this Base Price Component.", y);
  y = res.newY;
  res = addWrappedText("4.4. Timing of Settlement: The credit of these gold grams to your Fina wallet will be completed within three (3) business days of the Maturity Date. You will receive notification confirming the settlement.", y);
  y = res.newY;
  res = addWrappedText("4.5. Post-Maturity Status: After maturity and settlement, your relationship under this Plan terminates. You may continue to hold the gold grams in your Fina wallet subject to the Platform's general terms and conditions, or you may choose to sell, transfer, or utilize them according to Platform functionalities.", y);
  y = res.newY + 5;

  // 5. Early Termination
  res = addWrappedText("5. Early Termination & Breach of Contract", y, 12, true);
  y = res.newY;
  res = addWrappedText("5.1. The Plan is a fixed-term commitment. Early termination by the Participant before the Maturity Date is a breach of these Terms and will result in significant financial penalties.", y);
  y = res.newY;
  res = addWrappedText("5.2. Settlement Calculation upon Early Termination: The final settlement in gold in grams is determined as follows:", y, 10, true);
  y = res.newY;
  
  res = addWrappedText("Step 1: Base Price Component Valuation. The value of your original Base Price Component is calculated based on the current market price.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("- If current market price < Enrollment Price: Base Price Component is valued at current lower market price.", y, 10, false, 10);
  y = res.newY;
  res = addWrappedText("- If current market price >= Enrollment Price: Base Price Component is valued at original face value.", y, 10, false, 10);
  y = res.newY;

  res = addWrappedText("Step 2: Deduction of Fees. The total value from Step 1 has the following deductions applied:", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("- Administrative Fee: 1% of Total Sale Proceeds", y, 10, false, 10);
  y = res.newY;
  res = addWrappedText("- Early Withdrawal Penalty: 5% of Total Sale Proceeds", y, 10, false, 10);
  y = res.newY;
  res = addWrappedText("- Reimbursement of Quarterly Disbursements: The gross monetary value of all Margin Component disbursements received to date.", y, 10, false, 10);
  y = res.newY;

  res = addWrappedText("Step 3: Final In-Kind Settlement.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("The remaining value after deductions is used to purchase gold at the current market price and credited to your Fina wallet.", y, 10, false, 10);
  y = res.newY;
  res = addWrappedText("Final Gold Grams = (Base Price Component Value - Sum of All Deductions) / Current Market Price of Gold.", y, 10, true, 10);
  y = res.newY;

  res = addWrappedText("5.3. Forfeiture of Rights: Upon early termination, all accrued but unpaid future Quarterly Disbursements are immediately forfeited, and you lose entitlement to the deferred Base Price Component payment for the remaining term.", y);
  y = res.newY;

  res = addWrappedText("5.4. Comprehensive Early Termination Example:", y, 10, true);
  y = res.newY;
  res = addWrappedText("Original Sale: 100 Gold Grams at $1,000/gram = $100,000 Base Price (deferred). Agreed Margin: 10% p.a. Total Margin: $10,000. Total Sale Proceeds: $110,000. Admin Fee: 1%, Penalty: 5%. Received: 2 Quarterly Disbursements totaling $2,500.", y, 9, false, 5);
  y = res.newY;
  res = addWrappedText("Scenario A (Market Price Lower): Current price $900/gram. Base Value = $90,000. Deductions = $9,100. Net = $80,900. Final Gold = 89.89g.", y, 9, false, 5);
  y = res.newY;
  res = addWrappedText("Scenario B (Market Price Higher): Current price $1,100/gram. Base Value = $100,000 (original). Deductions = $9,100. Net = $90,900. Final Gold = 82.64g.", y, 9, false, 5);
  y = res.newY;

  res = addWrappedText("5.5. Market Conditions Impact: Early termination typically results in substantial financial loss due to penalties and fee deductions, regardless of market price movements.", y);
  y = res.newY + 5;

  // 6. Representations
  res = addWrappedText("6. Participant Representations and Warranties", y, 12, true);
  y = res.newY;
  res = addWrappedText("By participating, you represent, warrant, and acknowledge that:", y);
  y = res.newY;
  res = addWrappedText("6.1. Understanding of Transaction Structure: You fully understand that this is an immediate sale of your gold to Wingold. You acknowledge the deferred payment structure and accept that early termination results in severe penalties.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("6.2. Risk Acceptance: You accept all risks associated with the Plan, including variability in physical quantity of margin gold and counterparty performance risk.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("6.3. No Guarantee of Value: You understand that while the monetary value of the Margin Component disbursements is fixed, the quantity of physical gold delivered varies with market prices.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("6.4. Independent Decision: Your participation is based on your own independent assessment and is not made in reliance on any guarantee regarding future gold prices.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("6.5. Financial Capacity: You have the financial capacity to sustain the entire Plan term without requiring early access to the proceeds of the sale.", y, 10, false, 5);
  y = res.newY;
  res = addWrappedText("6.6. Tax Responsibilities: You are solely responsible for understanding and complying with all tax obligations arising from this transaction.", y, 10, false, 5);
  y = res.newY + 5;

  // 7. Risks
  res = addWrappedText("7. Risks and Disclaimer", y, 12, true);
  y = res.newY;
  res = addWrappedText("7.1. Early Termination Financial Risk: Exiting before maturity constitutes a breach and will result in substantial financial loss.", y);
  y = res.newY;
  res = addWrappedText("7.2. Margin Component Quantity Variability Risk: The physical quantity of gold received from disbursements varies inversely with market price.", y);
  y = res.newY;
  res = addWrappedText("7.3. Market Price Divergence Risk: If market prices rise significantly, you will not benefit from appreciation on the deferred portion of your sale proceeds.", y);
  y = res.newY;
  res = addWrappedText("7.4. Counterparty and Performance Risk: Your entitlement represents an unsecured contractual obligation of Wingold and Metals DMCC.", y);
  y = res.newY;
  res = addWrappedText("7.5. Platform and Operational Risk: The Plan's administration depends on the continued operation of the Finatrades Platform.", y);
  y = res.newY;
  res = addWrappedText("7.6. Regulatory and Legal Risk: Changes in laws or regulations could affect the Plan's structure or availability.", y);
  y = res.newY;
  res = addWrappedText("7.7. Liquidity Risk: The Base Price Component is deferred and illiquid for the duration of the Plan term.", y);
  y = res.newY;
  res = addWrappedText("7.8. Inflation and Purchasing Power Risk: Inflation during the Plan term will erode the real purchasing power of fixed monetary values.", y);
  y = res.newY;
  res = addWrappedText("7.9. No Fiduciary Relationship: Neither Finatrades nor Wingold acts as your fiduciary or investment advisor.", y);
  y = res.newY;
  res = addWrappedText("7.10. No Deposit Insurance: The Plan is not covered by any deposit insurance scheme or government guarantee.", y);
  y = res.newY + 5;

  // 8. Governing Law
  res = addWrappedText("8. Governing Law and Dispute Resolution", y, 12, true);
  y = res.newY;
  res = addWrappedText("8.1. These Terms shall be governed by the substantive laws of Switzerland.", y);
  y = res.newY;
  res = addWrappedText("8.2. Any dispute shall be subject to the exclusive jurisdiction of the competent courts of Geneva, Switzerland.", y);
  y = res.newY;
  res = addWrappedText("8.3. Finatrades and Wingold reserve the right to submit any dispute to binding ICC arbitration in Geneva.", y);
  y = res.newY;
  res = addWrappedText("8.4. Class Action Waiver: You waive any right to participate in a class, collective, or representative action.", y);
  y = res.newY;
  res = addWrappedText("8.5. Limitation Period: Any claim must be filed within one (1) year after it arose.", y);
  y = res.newY + 5;

  // 9. General Provisions
  res = addWrappedText("9. General Provisions", y, 12, true);
  y = res.newY;
  res = addWrappedText("9.1. Entire Agreement: These Terms constitute the entire agreement.", y);
  y = res.newY;
  res = addWrappedText("9.2. Amendment Right: Finatrades reserves the right to amend these Terms with 30 days notice.", y);
  y = res.newY;
  res = addWrappedText("9.3. Severability: If any provision is unenforceable, it will be limited to the minimum extent necessary.", y);
  y = res.newY;
  res = addWrappedText("9.4. Assignment: You may not assign your rights. Finatrades and Wingold may assign their rights without consent.", y);
  y = res.newY;
  res = addWrappedText("9.5. Force Majeure: Neither party is liable for failure to perform due to circumstances beyond reasonable control.", y);
  y = res.newY + 5;

  // 10. Settlement Assurance
  res = addWrappedText("10. Settlement Assurance", y, 12, true);
  y = res.newY;
  res = addWrappedText("Raminvest Holding Ltd (DIFC Registration No. 7030), as the governing entity of the Group ecosystem that includes Wingold & Metals DMCC, provides a limited settlement assurance mechanism supported by verified geological gold reserves held through Boudadiya Services SARL under Mining Permit No. 2265 B2-WOMPOU. According to the independent MKDG Geological Audit Report, the in-situ value of these Proven Reserves was estimated at USD 42.134 Billion as of 15 July 2025. This assurance, formally recognized under DIFC procedures (SR Reference No. SR-646772), serves solely as an internal group mechanism. It is not a banking guarantee, financial insurance, or customer protection product. Your sole contractual counterparty remains Wingold & Metals DMCC.", y, 9);
  y = res.newY + 5;

  // 11. Contact Information
  res = addWrappedText("11. Contact Information", y, 12, true);
  y = res.newY;
  res = addWrappedText("For questions: Finatrades Platform Support | Email: admin@finatrades.com | Website: www.finatrades.com/contact | Address: Rue Robert-Céard 6, 1204 Geneva, Switzerland", y, 9);
  y = res.newY + 15;

  // --- SIGNATURE SECTION ---
  if (y + 60 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

  // Signature box
  doc.setDrawColor(0);
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, y, contentWidth, 50, 'F');
  doc.rect(margin, y, contentWidth, 50, 'S');
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DIGITAL SIGNATURE", margin + 5, y + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  if (signatureData) {
    // Signed agreement - show signature details
    doc.text("Participant Signature:", margin + 5, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(signatureData.signatureName, margin + 5, y + 28);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const signedDate = new Date(signatureData.signedAt);
    doc.text(`Signed on: ${signedDate.toLocaleString()}`, margin + 5, y + 36);
    doc.text(`Timestamp: ${signatureData.signedAt}`, margin + 5, y + 42);
    
    // Wingold side
    doc.setFontSize(10);
    doc.text("Wingold & Metals DMCC", pageWidth - margin - 70, y + 18);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Auto-accepted upon enrollment", pageWidth - margin - 70, y + 26);
  } else {
    // Draft - show signature line
    doc.line(margin + 5, y + 28, margin + 85, y + 28);
    doc.text("Participant Signature", margin + 5, y + 35);
    
    doc.line(pageWidth - margin - 85, y + 28, pageWidth - margin - 5, y + 28);
    doc.text("Wingold & Metals DMCC", pageWidth - margin - 85, y + 35);
  }
  
  y += 55;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("This document was digitally generated and accepted via the Finatrades Platform.", margin, y);
  doc.text(`Document generated: ${new Date().toISOString()}`, margin, y + 5);
  doc.text("Agreement Version: V3-2025-12-09", margin, y + 10);

  return doc;
};
