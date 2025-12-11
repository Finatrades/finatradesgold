import { jsPDF } from 'jspdf';
import { BnslPlan } from '@/types/bnsl';

export const generateBnslAgreement = (plan: Partial<BnslPlan>, user: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
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

  // Helper for wrapped text
  const addWrappedText = (text: string, yPos: number, fontSize = 10, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, yPos);
    return lines.length * (fontSize * 0.5) + 2; // Return height added
  };

  // --- HEADER ---
  centerText("Terms and Conditions for BNSL - Buy Now Sell Later Plan", y, 16, true);
  y += 10;
  centerText(`Plan ID: ${plan.id || 'DRAFT'}`, y, 12, false);
  y += 8;
  centerText(`Date: ${new Date().toLocaleDateString()}`, y, 12, false);
  y += 15;

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

  doc.text(`Margin Rate: ${(plan.marginRateAnnualPercent || 0) * 100}% p.a.`, rightCol, y + 15);
  doc.text(`Base Price (Deferred): $${plan.basePriceComponentUsd?.toLocaleString()}`, rightCol, y + 22);
  doc.text(`Total Margin: $${plan.totalMarginComponentUsd?.toLocaleString()}`, rightCol, y + 29);
  
  y += 50;

  // --- AGREEMENT CONTENT ---
  y += addWrappedText("1. Introduction and Acceptance", y, 12, true);
  y += addWrappedText("These Terms and Conditions govern your participation in the BNSL - Buy Now Sell Later Plan ('the Plan'), administered on the Finatrades platform. Under this Plan, you execute an immediate and irrevocable sale of physical gold to Wingold and Metals DMCC ('Wingold').", y);
  y += 5;

  y += addWrappedText("2. Plan Overview & Transaction Structure", y, 12, true);
  y += addWrappedText("2.1. The BNSL Plan is a Deferred Price Sale Agreement. Upon your enrollment and confirmation, you sell, and Wingold purchases, a specific quantity of physical gold. Legal title transfers immediately.", y);
  y += 5;
  y += addWrappedText("2.3. Pricing Mechanism:", y, 10, true);
  y += addWrappedText("a) Base Price Component: Market value at sale, deferred until maturity.", y);
  y += addWrappedText("b) Margin Component: Additional amount paid quarterly in gold grams.", y);
  y += 5;

  y += addWrappedText("3. Payment Structure", y, 12, true);
  y += addWrappedText(`You sell ${plan.goldSoldGrams?.toFixed(2)} grams. The Base Price Component is $${plan.basePriceComponentUsd?.toLocaleString()}. An annual margin of ${(plan.marginRateAnnualPercent || 0) * 100}% applies.`, y);
  y += 5;

  y += addWrappedText("4. Maturity", y, 12, true);
  y += addWrappedText("At the end of the Plan term, Wingold will settle the Base Price Component by crediting your Fina wallet with gold grams equivalent to the Base Price Component Value divided by the Current Market Gold Price at Maturity.", y);
  y += 5;

  y += addWrappedText("5. Early Termination & Breach of Contract", y, 12, true);
  y += addWrappedText("Early termination is a breach of these Terms and will result in significant financial penalties, including:", y);
  y += addWrappedText("- Administrative Fee: 1% of Total Sale Proceeds", y);
  y += addWrappedText("- Early Withdrawal Penalty: 5% of Total Sale Proceeds", y);
  y += addWrappedText("- Reimbursement of all Margin Component disbursements received.", y);
  y += 5;

  y += addWrappedText("6. Participant Representations", y, 12, true);
  y += addWrappedText("You fully understand and accept that this is an immediate sale of your gold. You acknowledge the deferred payment structure and accept all risks associated with the Plan, including market price variability.", y);
  y += 10;

  // --- SIGNATURE SECTION ---
  y += 10;
  doc.line(margin, y, margin + 80, y); // User line
  doc.line(pageWidth - margin - 80, y, pageWidth - margin, y); // Wingold line

  doc.text("Participant Signature", margin, y + 5);
  doc.text("Wingold & Metals DMCC", pageWidth - margin - 80, y + 5);
  
  doc.setFontSize(8);
  doc.text("Digitally Generated and Accepted via Finatrades Platform", margin, y + 15);
  doc.text(`Timestamp: ${new Date().toISOString()}`, margin, y + 20);

  return doc;
};
