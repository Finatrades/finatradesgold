import { jsPDF } from 'jspdf';

interface TradeAgreementData {
  tradeRef: string;
  importerName: string;
  importerEmail: string;
  exporterName: string;
  exporterEmail: string;
  tradeValue: number;
  goldGrams: number;
  goldPricePerGram: number;
  deliveryTerms: string;
  paymentTerms: string;
  shippingOrigin: string;
  shippingDestination: string;
  estimatedDeliveryDays: number;
  createdAt: string;
}

interface SignatureData {
  importerSignature?: string;
  importerSignedAt?: string;
  exporterSignature?: string;
  exporterSignedAt?: string;
}

export const generateTradeAgreementPdf = (
  tradeData: TradeAgreementData,
  signatureData?: SignatureData
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 20;

  const centerText = (text: string, yPos: number, fontSize = 12, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
  };

  const addWrappedText = (text: string, yPos: number, fontSize = 10, isBold = false, indent = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    
    const lineHeight = fontSize * 0.5;
    const requiredHeight = lines.length * lineHeight;
    
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.text(lines, margin + indent, yPos);
    return {
      newY: yPos + requiredHeight + 2,
      addedHeight: requiredHeight + 2
    }; 
  };

  doc.setDrawColor(139, 92, 246);
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  centerText("FINABRIDGE TRADE AGREEMENT", 18, 18, true);
  centerText("Gold-Backed Trade Finance Contract", 28, 11, false);
  
  doc.setTextColor(0, 0, 0);
  y = 45;

  centerText(`Trade Reference: ${tradeData.tradeRef}`, y, 12, true);
  y += 6;
  centerText(`Agreement Date: ${new Date(tradeData.createdAt).toLocaleDateString()}`, y, 10, false);
  y += 12;

  doc.setDrawColor(0);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 35, 'F');
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PARTIES TO THIS AGREEMENT", margin + 5, y + 8);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("IMPORTER (Buyer):", margin + 5, y + 16);
  doc.setFont("helvetica", "normal");
  doc.text(`${tradeData.importerName} (${tradeData.importerEmail})`, margin + 45, y + 16);
  
  doc.setFont("helvetica", "bold");
  doc.text("EXPORTER (Seller):", margin + 5, y + 24);
  doc.setFont("helvetica", "normal");
  doc.text(`${tradeData.exporterName} (${tradeData.exporterEmail})`, margin + 45, y + 24);
  
  y += 45;

  doc.setFillColor(250, 245, 255);
  doc.rect(margin, y, contentWidth, 45, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TRADE DETAILS", margin + 5, y + 8);
  
  doc.setFontSize(9);
  const leftCol = margin + 5;
  const rightCol = pageWidth / 2 + 5;
  
  doc.setFont("helvetica", "normal");
  doc.text(`Trade Value: $${tradeData.tradeValue.toLocaleString()}`, leftCol, y + 18);
  doc.text(`Gold Quantity: ${tradeData.goldGrams.toFixed(4)}g`, leftCol, y + 26);
  doc.text(`Gold Price: $${tradeData.goldPricePerGram.toFixed(2)}/g`, leftCol, y + 34);
  
  doc.text(`Delivery Terms: ${tradeData.deliveryTerms}`, rightCol, y + 18);
  doc.text(`Payment Terms: ${tradeData.paymentTerms}`, rightCol, y + 26);
  doc.text(`Est. Delivery: ${tradeData.estimatedDeliveryDays} days`, rightCol, y + 34);
  
  y += 55;

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 20, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.text("SHIPPING ROUTE", margin + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text(`Origin: ${tradeData.shippingOrigin}`, margin + 5, y + 15);
  doc.text(`Destination: ${tradeData.shippingDestination}`, rightCol, y + 15);
  
  y += 30;

  let res;
  
  res = addWrappedText("1. DEFINITIONS AND INTERPRETATION", y, 11, true);
  y = res.newY;
  res = addWrappedText("1.1 \"Agreement\" means this Trade Agreement and all schedules and annexures hereto.", y);
  y = res.newY;
  res = addWrappedText("1.2 \"Trade Value\" means the total monetary value of goods traded as specified above.", y);
  y = res.newY;
  res = addWrappedText("1.3 \"Settlement\" means the release of escrowed gold to the Exporter upon confirmed delivery.", y);
  y = res.newY + 3;

  res = addWrappedText("2. GOLD-BACKED ESCROW MECHANISM", y, 11, true);
  y = res.newY;
  res = addWrappedText("2.1 Upon execution of this Agreement, the Importer shall deposit gold equivalent to the Trade Value into the FinaBridge escrow account managed by Wingold and Metals DMCC.", y);
  y = res.newY;
  res = addWrappedText("2.2 The escrowed gold shall remain locked until: (a) confirmed delivery of goods; (b) mutual agreement of parties; or (c) dispute resolution completion.", y);
  y = res.newY;
  res = addWrappedText("2.3 Neither party may withdraw, transfer, or encumber the escrowed gold during the lock period except as provided herein.", y);
  y = res.newY + 3;

  res = addWrappedText("3. DELIVERY OBLIGATIONS", y, 11, true);
  y = res.newY;
  res = addWrappedText("3.1 The Exporter shall ship goods in accordance with the delivery terms specified above.", y);
  y = res.newY;
  res = addWrappedText("3.2 The Exporter shall provide valid shipping documentation including: Bill of Lading, Commercial Invoice, Packing List, and Certificate of Origin.", y);
  y = res.newY;
  res = addWrappedText("3.3 Shipment tracking information shall be updated in the FinaBridge platform within 24 hours of each status change.", y);
  y = res.newY + 3;

  res = addWrappedText("4. SETTLEMENT AND RELEASE", y, 11, true);
  y = res.newY;
  res = addWrappedText("4.1 Upon confirmed delivery and Importer acceptance, escrowed gold shall be released to the Exporter within 3 business days.", y);
  y = res.newY;
  res = addWrappedText("4.2 Partial settlements are permitted where goods are delivered in installments, with proportional gold release.", y);
  y = res.newY;
  res = addWrappedText("4.3 If the Importer fails to confirm delivery within 7 days of documented delivery, automatic release may be triggered.", y);
  y = res.newY + 3;

  res = addWrappedText("5. DISPUTE RESOLUTION", y, 11, true);
  y = res.newY;
  res = addWrappedText("5.1 Either party may raise a dispute within 14 days of delivery through the FinaBridge platform.", y);
  y = res.newY;
  res = addWrappedText("5.2 Disputes shall first be subject to mediation through FinaBridge arbitration services.", y);
  y = res.newY;
  res = addWrappedText("5.3 Unresolved disputes shall be referred to binding arbitration under the rules of the Dubai International Arbitration Centre.", y);
  y = res.newY + 3;

  res = addWrappedText("6. FEES AND CHARGES", y, 11, true);
  y = res.newY;
  res = addWrappedText("6.1 FinaBridge Platform Fee: As per the prevailing fee schedule published on the platform.", y);
  y = res.newY;
  res = addWrappedText("6.2 Escrow Fee: A percentage of the Trade Value as agreed at trade initiation.", y);
  y = res.newY;
  res = addWrappedText("6.3 All fees are deducted from the escrowed gold at settlement.", y);
  y = res.newY + 3;

  res = addWrappedText("7. REPRESENTATIONS AND WARRANTIES", y, 11, true);
  y = res.newY;
  res = addWrappedText("7.1 Each party represents that it has full authority to enter into this Agreement.", y);
  y = res.newY;
  res = addWrappedText("7.2 The Exporter warrants that goods conform to specifications and are free from encumbrances.", y);
  y = res.newY;
  res = addWrappedText("7.3 The Importer warrants that funds/gold deposited are legitimately sourced and compliant with AML regulations.", y);
  y = res.newY + 3;

  res = addWrappedText("8. LIMITATION OF LIABILITY", y, 11, true);
  y = res.newY;
  res = addWrappedText("8.1 Neither FinaBridge nor Wingold shall be liable for delays, losses, or damages arising from: (a) force majeure events; (b) acts or omissions of third-party carriers; (c) regulatory actions.", y);
  y = res.newY;
  res = addWrappedText("8.2 Maximum liability of any party shall be limited to the Trade Value.", y);
  y = res.newY + 3;

  res = addWrappedText("9. GOVERNING LAW", y, 11, true);
  y = res.newY;
  res = addWrappedText("9.1 This Agreement shall be governed by and construed in accordance with the laws of the United Arab Emirates.", y);
  y = res.newY;
  res = addWrappedText("9.2 The courts of Dubai shall have exclusive jurisdiction over any disputes not resolved through arbitration.", y);
  y = res.newY + 5;

  doc.addPage();
  y = margin;

  res = addWrappedText("10. DIGITAL SIGNATURES AND ACCEPTANCE", y, 11, true);
  y = res.newY;
  res = addWrappedText("10.1 Electronic signatures applied through the FinaBridge platform constitute valid and binding signatures under applicable electronic commerce laws.", y);
  y = res.newY;
  res = addWrappedText("10.2 By digitally signing this Agreement, each party confirms understanding and acceptance of all terms herein.", y);
  y = res.newY + 10;

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 50, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DIGITAL SIGNATURES", margin + 5, y + 10);
  
  doc.setFontSize(9);
  const signatureBoxWidth = (contentWidth - 20) / 2;
  
  doc.setFont("helvetica", "bold");
  doc.text("IMPORTER SIGNATURE", margin + 5, y + 20);
  if (signatureData?.importerSignature) {
    doc.setFont("helvetica", "normal");
    doc.text(`Signed by: ${signatureData.importerSignature}`, margin + 5, y + 28);
    doc.text(`Date: ${signatureData.importerSignedAt ? new Date(signatureData.importerSignedAt).toLocaleString() : 'N/A'}`, margin + 5, y + 35);
    doc.text("Status: ACCEPTED", margin + 5, y + 42);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("[Pending Signature]", margin + 5, y + 32);
    doc.setTextColor(0, 0, 0);
  }
  
  doc.setFont("helvetica", "bold");
  doc.text("EXPORTER SIGNATURE", margin + signatureBoxWidth + 15, y + 20);
  if (signatureData?.exporterSignature) {
    doc.setFont("helvetica", "normal");
    doc.text(`Signed by: ${signatureData.exporterSignature}`, margin + signatureBoxWidth + 15, y + 28);
    doc.text(`Date: ${signatureData.exporterSignedAt ? new Date(signatureData.exporterSignedAt).toLocaleString() : 'N/A'}`, margin + signatureBoxWidth + 15, y + 35);
    doc.text("Status: ACCEPTED", margin + signatureBoxWidth + 15, y + 42);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("[Pending Signature]", margin + signatureBoxWidth + 15, y + 32);
    doc.setTextColor(0, 0, 0);
  }
  
  y += 60;

  doc.setDrawColor(139, 92, 246);
  doc.setFillColor(139, 92, 246);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerText = "Finatrades FinaBridge - Gold-Backed Trade Finance | Powered by Wingold and Metals DMCC";
  const footerWidth = doc.getTextWidth(footerText);
  doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 12);
  
  doc.setFontSize(7);
  const docIdText = `Document ID: ${tradeData.tradeRef}-AGR-${Date.now().toString(36).toUpperCase()}`;
  const docIdWidth = doc.getTextWidth(docIdText);
  doc.text(docIdText, (pageWidth - docIdWidth) / 2, pageHeight - 6);

  return doc;
};

export const downloadTradeAgreement = (
  tradeData: TradeAgreementData,
  signatureData?: SignatureData
) => {
  const doc = generateTradeAgreementPdf(tradeData, signatureData);
  doc.save(`FinaBridge_Agreement_${tradeData.tradeRef}.pdf`);
};
