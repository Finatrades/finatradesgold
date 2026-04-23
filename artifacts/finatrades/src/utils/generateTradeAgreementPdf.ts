import { jsPDF } from 'jspdf';

const LOGO_URL = 'https://pub-37061337f46b4aeca26cb47a9ab5190b.r2.dev/branding/finatrades-logo-purple.png';

async function loadLogoBase64(): Promise<string | null> {
  const sources = [
    `${window.location.origin}/finatrades-logo-purple.png`,
    LOGO_URL,
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const b64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      if (b64) return b64;
    } catch { continue; }
  }
  return null;
}

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

export const generateTradeAgreementPdf = async (
  tradeData: TradeAgreementData,
  signatureData?: SignatureData
) => {
  const logoBase64 = await loadLogoBase64();

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

  doc.setDrawColor(138, 43, 226);
  doc.setFillColor(138, 43, 226);
  doc.rect(0, 0, pageWidth, 28, 'F');

  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', margin, 4, 44, 16); } catch {}
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text('FinaTrades Finance SA · Rue Robert-Céard 6, 1204 Geneva', pageWidth - margin, 15, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  const tw1 = doc.getTextWidth("FINABRIDGE TRADE AGREEMENT");
  doc.text("FINABRIDGE TRADE AGREEMENT", (pageWidth - tw1) / 2, 20);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const tw2 = doc.getTextWidth("Gold-Backed Trade Finance Contract");
  doc.text("Gold-Backed Trade Finance Contract", (pageWidth - tw2) / 2, 26);

  doc.setTextColor(0, 0, 0);
  y = 38;

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

  // --- PER-PAGE FOOTER ---
  const totalPages = doc.getNumberOfPages();
  const docId = `${tradeData.tradeRef}-AGR-${Date.now().toString(36).toUpperCase()}`;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(138, 43, 226);
    doc.setFillColor(138, 43, 226);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const ft = `FinaTrades FinaBridge — Gold-Backed Trade Finance | Rue Robert-Céard 6, 1204 Geneva | Page ${i} of ${totalPages}`;
    const ftw = doc.getTextWidth(ft);
    doc.text(ft, (pageWidth - ftw) / 2, pageHeight - 7);
    const dt = `Document ID: ${docId}`;
    const dtw = doc.getTextWidth(dt);
    doc.text(dt, (pageWidth - dtw) / 2, pageHeight - 2);
    doc.setTextColor(0, 0, 0);
  }

  return doc;
};

export const downloadTradeAgreement = async (
  tradeData: TradeAgreementData,
  signatureData?: SignatureData
) => {
  const doc = await generateTradeAgreementPdf(tradeData, signatureData);
  doc.save(`FinaBridge_Agreement_${tradeData.tradeRef}.pdf`);
};
