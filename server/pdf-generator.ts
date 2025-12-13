import PDFDocument from 'pdfkit';
import { Certificate, Invoice, User } from '@shared/schema';

const FINATRADES_ORANGE = '#f97316';
const WINGOLD_GOLD = '#D4AF37';
const BNSL_BLUE = '#3b82f6';
const TRADE_GREEN = '#10b981';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatCurrency(amount: string | number | null | undefined): string {
  if (!amount) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(num);
}

function formatGrams(grams: string | number | null | undefined): string {
  if (!grams) return '0.0000g';
  const num = typeof grams === 'string' ? parseFloat(grams) : grams;
  return `${num.toFixed(4)}g`;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ];
  }
  return [0, 0, 0];
}

interface CertificateConfig {
  title: string;
  subtitle: string;
  primaryColor: string;
  issuerName: string;
  certificationText: string;
  footerText: string;
}

function getCertificateConfig(certificate: Certificate): CertificateConfig {
  switch (certificate.type) {
    case 'Digital Ownership':
      return {
        title: 'DIGITAL OWNERSHIP CERTIFICATE',
        subtitle: 'Gold Ownership Verification',
        primaryColor: FINATRADES_ORANGE,
        issuerName: 'Finatrades',
        certificationText: 'is the verified digital owner of the following gold holdings:',
        footerText: 'This certificate verifies digital ownership rights to the specified gold holdings on the Finatrades platform.'
      };
    
    case 'Physical Storage':
      return {
        title: 'PHYSICAL STORAGE CERTIFICATE',
        subtitle: 'Vault Custody Confirmation',
        primaryColor: WINGOLD_GOLD,
        issuerName: 'Wingold & Metals DMCC',
        certificationText: 'has the following gold holdings in secure physical storage:',
        footerText: 'This certificate confirms physical storage of the specified gold in secure vault facilities managed by Wingold & Metals DMCC.'
      };
    
    case 'Transfer':
      return {
        title: 'GOLD TRANSFER CERTIFICATE',
        subtitle: 'Digital Ownership Transfer',
        primaryColor: FINATRADES_ORANGE,
        issuerName: 'Finatrades',
        certificationText: 'has received the following gold transfer:',
        footerText: 'This certificate documents the transfer of digital gold ownership between users on the Finatrades platform.'
      };
    
    case 'BNSL Lock':
      return {
        title: 'BNSL GOLD LOCK CERTIFICATE',
        subtitle: 'Buy Now Sell Later - Gold Lockup',
        primaryColor: BNSL_BLUE,
        issuerName: 'Finatrades',
        certificationText: 'has locked the following gold holdings under a BNSL plan:',
        footerText: 'This certificate confirms that the specified gold is locked under a Buy Now Sell Later agreement. The gold will be released according to the plan terms.'
      };
    
    case 'Trade Lock':
      return {
        title: 'TRADE SETTLEMENT LOCK CERTIFICATE',
        subtitle: 'FinaBridge Trade Reserve',
        primaryColor: TRADE_GREEN,
        issuerName: 'Finatrades',
        certificationText: 'has reserved the following gold as collateral for trade settlement:',
        footerText: 'This certificate confirms that the specified gold is held as reserve for a trade finance transaction through FinaBridge.'
      };
    
    case 'Trade Release':
      return {
        title: 'TRADE SETTLEMENT RELEASE CERTIFICATE',
        subtitle: 'FinaBridge Trade Completion',
        primaryColor: TRADE_GREEN,
        issuerName: 'Finatrades',
        certificationText: 'has completed settlement and released the following gold holdings:',
        footerText: 'This certificate confirms the successful settlement and release of gold from a FinaBridge trade finance transaction.'
      };
    
    default:
      return {
        title: 'GOLD CERTIFICATE',
        subtitle: 'Certificate of Holdings',
        primaryColor: FINATRADES_ORANGE,
        issuerName: 'Finatrades',
        certificationText: 'holds the following gold:',
        footerText: 'This certificate verifies the gold holdings on the Finatrades platform.'
      };
  }
}

export interface TransferParties {
  fromUser?: User | null;
  toUser?: User | null;
}

export function generateCertificatePDF(
  certificate: Certificate, 
  user: User,
  transferParties?: TransferParties
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 50;
      
      const config = getCertificateConfig(certificate);
      const rgb = hexToRgb(config.primaryColor);

      doc.rect(0, 0, pageWidth, 120).fill(config.primaryColor);

      doc.fillColor('white')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(config.title, 0, 35, { align: 'center', width: pageWidth });

      doc.fontSize(11)
         .font('Helvetica')
         .text(config.subtitle, 0, 65, { align: 'center', width: pageWidth });
      
      doc.fontSize(10)
         .text(config.issuerName, 0, 85, { align: 'center', width: pageWidth });

      doc.fillColor('#666666')
         .fontSize(10)
         .text(`Certificate No: ${certificate.certificateNumber}`, margin, 140);
      
      doc.text(`Issue Date: ${formatDate(certificate.issuedAt)}`, pageWidth - margin - 150, 140, { width: 150, align: 'right' });

      doc.strokeColor(config.primaryColor)
         .lineWidth(1)
         .moveTo(margin, 160)
         .lineTo(pageWidth - margin, 160)
         .stroke();

      let yPos = 190;

      doc.fillColor('#404040')
         .fontSize(12)
         .font('Helvetica')
         .text('This is to certify that', 0, yPos, { align: 'center', width: pageWidth });

      yPos += 25;
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#282828')
         .text(`${user.firstName} ${user.lastName}`, 0, yPos, { align: 'center', width: pageWidth });

      yPos += 25;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text(user.email, 0, yPos, { align: 'center', width: pageWidth });

      yPos += 30;
      doc.fontSize(12)
         .fillColor('#404040')
         .text(config.certificationText, 0, yPos, { align: 'center', width: pageWidth });

      yPos += 30;
      const boxWidth = 250;
      const boxHeight = 80;
      const boxX = (pageWidth - boxWidth) / 2;

      doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 8)
         .fillAndStroke('#FBF6DC', config.primaryColor);

      doc.fillColor(config.primaryColor)
         .fontSize(28)
         .font('Helvetica-Bold')
         .text(formatGrams(certificate.goldGrams), boxX, yPos + 20, { width: boxWidth, align: 'center' });

      doc.fillColor('#505050')
         .fontSize(11)
         .font('Helvetica')
         .text('of 24K Fine Gold (999.9 Purity)', boxX, yPos + 50, { width: boxWidth, align: 'center' });

      yPos += boxHeight + 20;
      if (certificate.totalValueUsd) {
        doc.fillColor('#666666')
           .fontSize(10)
           .text(`Valued at ${formatCurrency(certificate.totalValueUsd)}`, 0, yPos, { align: 'center', width: pageWidth });
        yPos += 20;
      }

      yPos += 30;
      doc.fillColor('#505050').fontSize(11);

      const details: [string, string][] = [
        ['Certificate Type:', certificate.type],
        ['Status:', certificate.status],
        ['Issued By:', certificate.issuer],
      ];

      if (certificate.type === 'Transfer' && transferParties) {
        if (transferParties.fromUser) {
          details.push(['From:', `${transferParties.fromUser.firstName} ${transferParties.fromUser.lastName}`]);
        }
        if (transferParties.toUser) {
          details.push(['To:', `${transferParties.toUser.firstName} ${transferParties.toUser.lastName}`]);
        }
      }

      if (certificate.vaultLocation) {
        details.push(['Storage Location:', certificate.vaultLocation]);
      }
      if (certificate.wingoldStorageRef) {
        details.push(['Storage Reference:', certificate.wingoldStorageRef]);
      }
      if (certificate.goldPriceUsdPerGram) {
        details.push(['Gold Price (per gram):', formatCurrency(certificate.goldPriceUsdPerGram)]);
      }
      if (certificate.bnslPlanId) {
        details.push(['BNSL Plan ID:', certificate.bnslPlanId]);
      }
      if (certificate.tradeCaseId) {
        details.push(['Trade Case ID:', certificate.tradeCaseId]);
      }
      if (certificate.relatedCertificateId) {
        details.push(['Related Certificate:', certificate.relatedCertificateId]);
      }

      const detailsStartX = margin + 80;
      const detailsValueX = pageWidth / 2 + 20;

      details.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(label, detailsStartX, yPos);
        doc.font('Helvetica').text(String(value), detailsValueX, yPos);
        yPos += 20;
      });

      const footerY = doc.page.height - 80;

      doc.strokeColor(config.primaryColor)
         .lineWidth(0.5)
         .moveTo(margin, footerY)
         .lineTo(pageWidth - margin, footerY)
         .stroke();

      doc.fillColor('#787878')
         .fontSize(9)
         .text(config.footerText, margin, footerY + 10, { align: 'center', width: pageWidth - 2 * margin });

      doc.fontSize(8)
         .text('This document is electronically generated and does not require a physical signature.', margin, footerY + 35, { align: 'center', width: pageWidth - 2 * margin });
      doc.text(`Generated: ${new Date().toISOString()}`, margin, footerY + 50, { align: 'center', width: pageWidth - 2 * margin });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generateInvoicePDF(
  invoice: Invoice,
  user: User
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 50;
      const rgb = hexToRgb(FINATRADES_ORANGE);

      const customerName = invoice.customerName || `${user.firstName} ${user.lastName}`;
      const customerEmail = invoice.customerEmail || user.email;
      const issuerName = invoice.issuer || 'Wingold and Metals DMCC';

      doc.rect(0, 0, pageWidth, 100).fill(FINATRADES_ORANGE);

      doc.fillColor('white')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('INVOICE', 0, 35, { align: 'center', width: pageWidth });

      doc.fontSize(10)
         .font('Helvetica')
         .text('Gold Purchase Invoice', 0, 65, { align: 'center', width: pageWidth });

      let yPos = 120;

      doc.fillColor('#404040')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(`Invoice No: ${invoice.invoiceNumber}`, margin, yPos);

      doc.text(`Date: ${formatDate(invoice.issuedAt)}`, pageWidth - margin - 150, yPos, { width: 150, align: 'right' });

      yPos += 15;
      doc.strokeColor(FINATRADES_ORANGE)
         .lineWidth(0.5)
         .moveTo(margin, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      yPos += 25;
      const colWidth = (pageWidth - 2 * margin - 40) / 2;

      doc.fillColor(FINATRADES_ORANGE)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('FROM:', margin, yPos);

      yPos += 15;
      doc.fillColor('#282828')
         .font('Helvetica-Bold')
         .text(issuerName, margin, yPos);

      yPos += 15;
      doc.fillColor('#505050')
         .fontSize(9)
         .font('Helvetica');

      if (invoice.issuerAddress) {
        const addressLines = invoice.issuerAddress.split('\n');
        addressLines.forEach(line => {
          doc.text(line, margin, yPos);
          yPos += 12;
        });
      } else {
        doc.text('Dubai, United Arab Emirates', margin, yPos);
        yPos += 12;
      }

      if (invoice.issuerTaxId) {
        doc.text(`Tax ID: ${invoice.issuerTaxId}`, margin, yPos);
      }

      let toYPos = 160;
      doc.fillColor(FINATRADES_ORANGE)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('BILL TO:', margin + colWidth + 40, toYPos);

      toYPos += 15;
      doc.fillColor('#282828')
         .font('Helvetica-Bold')
         .text(customerName, margin + colWidth + 40, toYPos);

      toYPos += 15;
      doc.fillColor('#505050')
         .fontSize(9)
         .font('Helvetica')
         .text(customerEmail, margin + colWidth + 40, toYPos);

      if (invoice.customerAddress) {
        toYPos += 12;
        const addressLines = invoice.customerAddress.split('\n');
        addressLines.forEach(line => {
          doc.text(line, margin + colWidth + 40, toYPos);
          toYPos += 12;
        });
      }

      yPos = Math.max(yPos, toYPos) + 30;

      doc.rect(margin, yPos, pageWidth - 2 * margin, 25).fill('#F5F5F5');

      doc.fillColor('#404040')
         .fontSize(10)
         .font('Helvetica-Bold');

      const tableY = yPos + 8;
      doc.text('Description', margin + 10, tableY);
      doc.text('Qty', margin + 220, tableY);
      doc.text('Rate', margin + 300, tableY);
      doc.text('Amount', pageWidth - margin - 60, tableY);

      yPos += 35;
      doc.fillColor('#282828')
         .font('Helvetica')
         .text('24K Fine Gold (999.9 Purity)', margin + 10, yPos);
      doc.text(formatGrams(invoice.goldGrams), margin + 210, yPos);
      doc.text(formatCurrency(invoice.goldPriceUsdPerGram) + '/g', margin + 280, yPos);
      doc.text(formatCurrency(invoice.subtotalUsd), pageWidth - margin - 80, yPos);

      yPos += 30;
      doc.strokeColor('#C8C8C8')
         .lineWidth(0.3)
         .moveTo(margin + 200, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      yPos += 15;
      const totalsX = margin + 280;
      const totalsValueX = pageWidth - margin - 60;

      doc.fontSize(10)
         .text('Subtotal:', totalsX, yPos);
      doc.text(formatCurrency(invoice.subtotalUsd), totalsValueX, yPos);

      if (invoice.feesUsd && parseFloat(invoice.feesUsd) > 0) {
        yPos += 18;
        doc.text('Fees:', totalsX, yPos);
        doc.text(formatCurrency(invoice.feesUsd), totalsValueX, yPos);
      }

      yPos += 15;
      doc.strokeColor(FINATRADES_ORANGE)
         .lineWidth(0.5)
         .moveTo(totalsX - 20, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      yPos += 15;
      doc.fillColor(FINATRADES_ORANGE)
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('Total:', totalsX, yPos);
      doc.text(formatCurrency(invoice.totalUsd), totalsValueX, yPos);

      if (invoice.paymentMethod || invoice.paymentReference) {
        yPos += 40;
        doc.fillColor('#404040')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('Payment Information', margin, yPos);

        yPos += 15;
        doc.fillColor('#505050')
           .font('Helvetica')
           .fontSize(9);

        if (invoice.paymentMethod) {
          doc.text(`Method: ${invoice.paymentMethod}`, margin, yPos);
          yPos += 12;
        }
        if (invoice.paymentReference) {
          doc.text(`Reference: ${invoice.paymentReference}`, margin, yPos);
        }
      }

      const footerY = doc.page.height - 70;

      doc.strokeColor('#C8C8C8')
         .lineWidth(0.3)
         .moveTo(margin, footerY)
         .lineTo(pageWidth - margin, footerY)
         .stroke();

      doc.fillColor('#787878')
         .fontSize(8)
         .text('This invoice is issued for the purchase of gold through the Finatrades platform.', margin, footerY + 10, { align: 'center', width: pageWidth - 2 * margin });
      doc.text('For questions, please contact support@finatrades.com', margin, footerY + 22, { align: 'center', width: pageWidth - 2 * margin });
      doc.text('This document is electronically generated and does not require a physical signature.', margin, footerY + 34, { align: 'center', width: pageWidth - 2 * margin });
      doc.text(`Generated: ${new Date().toISOString()}`, margin, footerY + 46, { align: 'center', width: pageWidth - 2 * margin });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generateInvoiceNumber(): string {
  const prefix = 'INV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateCertificateNumber(type: string): string {
  const prefixes: Record<string, string> = {
    'Digital Ownership': 'DOC',
    'Physical Storage': 'PSC',
    'Transfer': 'TRC',
    'BNSL Lock': 'BLC',
    'Trade Lock': 'TLC',
    'Trade Release': 'TRR'
  };
  const prefix = prefixes[type] || 'CRT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
