import PDFDocument from 'pdfkit';
import { Certificate, Invoice, User, Template } from '@shared/schema';

const FINATRADES_ORANGE = '#f97316';
const WINGOLD_GOLD = '#D4AF37';
const BNSL_BLUE = '#3b82f6';
const TRADE_GREEN = '#10b981';

// Template config extracted from CMS templates
export interface CMSTemplateConfig {
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  issuerName?: string;
  certificationText?: string;
  footerText?: string;
  // Invoice-specific
  invoiceTitle?: string;
  invoiceSubtitle?: string;
  invoiceFooterLine1?: string;
  invoiceFooterLine2?: string;
  productDescription?: string;
}

// Parse CMS template body to extract configuration
// Template body can contain JSON config or use variable markers like {{title}}
function parseTemplateConfig(template: Template): CMSTemplateConfig {
  const config: CMSTemplateConfig = {};
  
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(template.body);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as CMSTemplateConfig;
    }
  } catch {
    // Not JSON, try to extract from preview data or variables
  }
  
  // Check previewData for configuration
  if (template.previewData && typeof template.previewData === 'object') {
    const previewData = template.previewData as Record<string, unknown>;
    if (previewData.title) config.title = String(previewData.title);
    if (previewData.subtitle) config.subtitle = String(previewData.subtitle);
    if (previewData.primaryColor) config.primaryColor = String(previewData.primaryColor);
    if (previewData.issuerName) config.issuerName = String(previewData.issuerName);
    if (previewData.certificationText) config.certificationText = String(previewData.certificationText);
    if (previewData.footerText) config.footerText = String(previewData.footerText);
    if (previewData.invoiceTitle) config.invoiceTitle = String(previewData.invoiceTitle);
    if (previewData.invoiceSubtitle) config.invoiceSubtitle = String(previewData.invoiceSubtitle);
    if (previewData.invoiceFooterLine1) config.invoiceFooterLine1 = String(previewData.invoiceFooterLine1);
    if (previewData.invoiceFooterLine2) config.invoiceFooterLine2 = String(previewData.invoiceFooterLine2);
    if (previewData.productDescription) config.productDescription = String(previewData.productDescription);
  }
  
  return config;
}

// Get certificate template slug based on certificate type
function getCertificateTemplateSlug(type: string): string {
  const slugMap: Record<string, string> = {
    'Digital Ownership': 'certificate_digital_ownership',
    'Physical Storage': 'certificate_physical_storage',
    'Transfer': 'certificate_transfer',
    'BNSL Lock': 'certificate_bnsl_lock',
    'Trade Lock': 'certificate_trade_lock',
    'Trade Release': 'certificate_trade_release'
  };
  return slugMap[type] || 'certificate_default';
}

// Merge CMS config with defaults (CMS overrides defaults)
function mergeCertificateConfig(defaults: CertificateConfig, cmsConfig: CMSTemplateConfig): CertificateConfig {
  return {
    title: cmsConfig.title || defaults.title,
    subtitle: cmsConfig.subtitle || defaults.subtitle,
    primaryColor: cmsConfig.primaryColor || defaults.primaryColor,
    issuerName: cmsConfig.issuerName || defaults.issuerName,
    certificationText: cmsConfig.certificationText || defaults.certificationText,
    footerText: cmsConfig.footerText || defaults.footerText
  };
}

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
        issuerName: 'Finatrades SA',
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
        issuerName: 'Finatrades SA',
        certificationText: 'has received the following gold transfer:',
        footerText: 'This certificate documents the transfer of digital gold ownership between users on the Finatrades platform.'
      };
    
    case 'BNSL Lock':
      return {
        title: 'BNSL GOLD LOCK CERTIFICATE',
        subtitle: 'Buy Now Sell Later - Gold Lockup',
        primaryColor: BNSL_BLUE,
        issuerName: 'Finatrades SA',
        certificationText: 'has locked the following gold holdings under a BNSL plan:',
        footerText: 'This certificate confirms that the specified gold is locked under a Buy Now Sell Later agreement. The gold will be released according to the plan terms.'
      };
    
    case 'Trade Lock':
      return {
        title: 'TRADE SETTLEMENT LOCK CERTIFICATE',
        subtitle: 'FinaBridge Trade Reserve',
        primaryColor: TRADE_GREEN,
        issuerName: 'Finatrades SA',
        certificationText: 'has reserved the following gold as collateral for trade settlement:',
        footerText: 'This certificate confirms that the specified gold is held as reserve for a trade finance transaction through FinaBridge.'
      };
    
    case 'Trade Release':
      return {
        title: 'TRADE SETTLEMENT RELEASE CERTIFICATE',
        subtitle: 'FinaBridge Trade Completion',
        primaryColor: TRADE_GREEN,
        issuerName: 'Finatrades SA',
        certificationText: 'has completed settlement and released the following gold holdings:',
        footerText: 'This certificate confirms the successful settlement and release of gold from a FinaBridge trade finance transaction.'
      };
    
    default:
      return {
        title: 'GOLD CERTIFICATE',
        subtitle: 'Certificate of Holdings',
        primaryColor: FINATRADES_ORANGE,
        issuerName: 'Finatrades SA',
        certificationText: 'holds the following gold:',
        footerText: 'This certificate verifies the gold holdings on the Finatrades platform.'
      };
  }
}

export interface TransferParties {
  fromUser?: User | null;
  toUser?: User | null;
}

export interface PDFGenerationOptions {
  cmsTemplate?: Template | null;
}

export function generateCertificatePDF(
  certificate: Certificate, 
  user: User,
  transferParties?: TransferParties,
  options?: PDFGenerationOptions
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
      
      // Get default config, then merge with CMS template if available
      let config = getCertificateConfig(certificate);
      if (options?.cmsTemplate) {
        const cmsConfig = parseTemplateConfig(options.cmsTemplate);
        config = mergeCertificateConfig(config, cmsConfig);
      }
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

      if (certificate.type === 'Transfer') {
        // Use stored names from certificate first, fall back to transferParties if available
        const fromName = (certificate as any).fromUserName || 
          (transferParties?.fromUser ? `${transferParties.fromUser.firstName} ${transferParties.fromUser.lastName}` : null);
        const toName = (certificate as any).toUserName || 
          (transferParties?.toUser ? `${transferParties.toUser.firstName} ${transferParties.toUser.lastName}` : null);
        
        if (fromName) {
          details.push(['From:', fromName]);
        }
        if (toName) {
          details.push(['To:', toName]);
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
  user: User,
  options?: PDFGenerationOptions
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

      // Parse CMS template config if available
      let cmsConfig: CMSTemplateConfig = {};
      if (options?.cmsTemplate) {
        cmsConfig = parseTemplateConfig(options.cmsTemplate);
      }

      const customerName = invoice.customerName || `${user.firstName} ${user.lastName}`;
      const customerEmail = invoice.customerEmail || user.email;
      const issuerName = cmsConfig.issuerName || invoice.issuer || 'Wingold and Metals DMCC';
      
      // Apply CMS customizations with defaults
      const invoiceTitle = cmsConfig.invoiceTitle || 'INVOICE';
      const invoiceSubtitle = cmsConfig.invoiceSubtitle || 'Gold Purchase Invoice';
      const productDescription = cmsConfig.productDescription || '24K Fine Gold (999.9 Purity)';
      const primaryColor = cmsConfig.primaryColor || FINATRADES_ORANGE;

      doc.rect(0, 0, pageWidth, 100).fill(primaryColor);

      doc.fillColor('white')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(invoiceTitle, 0, 35, { align: 'center', width: pageWidth });

      doc.fontSize(10)
         .font('Helvetica')
         .text(invoiceSubtitle, 0, 65, { align: 'center', width: pageWidth });

      let yPos = 120;

      doc.fillColor('#404040')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(`Invoice No: ${invoice.invoiceNumber}`, margin, yPos);

      doc.text(`Date: ${formatDate(invoice.issuedAt)}`, pageWidth - margin - 150, yPos, { width: 150, align: 'right' });

      yPos += 15;
      doc.strokeColor(primaryColor)
         .lineWidth(0.5)
         .moveTo(margin, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      yPos += 25;
      const colWidth = (pageWidth - 2 * margin - 40) / 2;

      doc.fillColor(primaryColor)
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
      doc.fillColor(primaryColor)
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
         .text(productDescription, margin + 10, yPos);
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
      doc.strokeColor(primaryColor)
         .lineWidth(0.5)
         .moveTo(totalsX - 20, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      yPos += 15;
      doc.fillColor(primaryColor)
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

      // Apply CMS footer text or use defaults
      const footerLine1 = cmsConfig.invoiceFooterLine1 || 'This invoice is issued for the purchase of gold through the Finatrades platform.';
      const footerLine2 = cmsConfig.invoiceFooterLine2 || 'For questions, please contact support@finatrades.com';

      doc.fillColor('#787878')
         .fontSize(8)
         .text(footerLine1, margin, footerY + 10, { align: 'center', width: pageWidth - 2 * margin });
      doc.text(footerLine2, margin, footerY + 22, { align: 'center', width: pageWidth - 2 * margin });
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

// Export helper function for routes to get template slug
export { getCertificateTemplateSlug };

// Invoice template slug constant
export const INVOICE_TEMPLATE_SLUG = 'invoice_gold_purchase';

// ============================================
// TRANSACTION RECEIPT PDF GENERATOR
// ============================================

export interface TransactionReceiptData {
  referenceNumber: string;
  transactionType: string;
  amountUsd: number;
  goldGrams: number;
  goldPricePerGram: number;
  userName: string;
  userEmail: string;
  transactionDate: Date;
  status: string;
  description?: string;
}

export function generateTransactionReceiptPDF(data: TransactionReceiptData): Promise<Buffer> {
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

      // Header
      doc.rect(0, 0, pageWidth, 100).fill(FINATRADES_ORANGE);

      doc.fillColor('white')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('TRANSACTION RECEIPT', 0, 35, { align: 'center', width: pageWidth });

      doc.fontSize(10)
         .font('Helvetica')
         .text('Finatrades - Gold-Backed Digital Finance', 0, 65, { align: 'center', width: pageWidth });

      let yPos = 120;

      // Reference and Date
      doc.fillColor('#404040')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(`Reference: ${data.referenceNumber}`, margin, yPos);

      doc.text(`Date: ${formatDate(data.transactionDate)}`, pageWidth - margin - 150, yPos, { width: 150, align: 'right' });

      yPos += 15;
      doc.strokeColor(FINATRADES_ORANGE)
         .lineWidth(0.5)
         .moveTo(margin, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      // Customer Details
      yPos += 25;
      doc.fillColor(FINATRADES_ORANGE)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('CUSTOMER DETAILS', margin, yPos);

      yPos += 18;
      doc.fillColor('#282828')
         .font('Helvetica-Bold')
         .text(data.userName, margin, yPos);

      yPos += 15;
      doc.fillColor('#505050')
         .fontSize(9)
         .font('Helvetica')
         .text(data.userEmail, margin, yPos);

      // Transaction Details Box
      yPos += 40;
      doc.rect(margin, yPos, pageWidth - 2 * margin, 120).fill('#FBF6DC');
      doc.strokeColor(FINATRADES_ORANGE).lineWidth(1).rect(margin, yPos, pageWidth - 2 * margin, 120).stroke();

      yPos += 15;
      doc.fillColor(FINATRADES_ORANGE)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('TRANSACTION SUMMARY', 0, yPos, { align: 'center', width: pageWidth });

      yPos += 25;
      doc.fillColor('#282828')
         .fontSize(10)
         .font('Helvetica');

      const detailsX = margin + 30;
      const valuesX = pageWidth / 2 + 20;

      const details: [string, string][] = [
        ['Transaction Type:', data.transactionType],
        ['Amount (USD):', formatCurrency(data.amountUsd)],
        ['Gold Amount:', formatGrams(data.goldGrams)],
        ['Gold Price:', `${formatCurrency(data.goldPricePerGram)} / gram`],
        ['Status:', data.status],
      ];

      details.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(label, detailsX, yPos);
        doc.font('Helvetica').text(value, valuesX, yPos);
        yPos += 18;
      });

      // Highlights box
      yPos += 30;
      const highlightWidth = 200;
      const highlightX = (pageWidth - highlightWidth) / 2;

      doc.roundedRect(highlightX, yPos, highlightWidth, 70, 8)
         .fillAndStroke('#ffffff', FINATRADES_ORANGE);

      doc.fillColor(FINATRADES_ORANGE)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text(formatCurrency(data.amountUsd), highlightX, yPos + 15, { width: highlightWidth, align: 'center' });

      doc.fillColor('#505050')
         .fontSize(12)
         .font('Helvetica')
         .text(formatGrams(data.goldGrams) + ' Gold', highlightX, yPos + 45, { width: highlightWidth, align: 'center' });

      // Description if provided
      if (data.description) {
        yPos += 100;
        doc.fillColor('#505050')
           .fontSize(9)
           .font('Helvetica')
           .text(`Note: ${data.description}`, margin, yPos, { width: pageWidth - 2 * margin });
      }

      // Footer
      const footerY = doc.page.height - 70;

      doc.strokeColor('#C8C8C8')
         .lineWidth(0.3)
         .moveTo(margin, footerY)
         .lineTo(pageWidth - margin, footerY)
         .stroke();

      doc.fillColor('#787878')
         .fontSize(8)
         .text('This receipt is issued for the transaction through the Finatrades platform.', margin, footerY + 10, { align: 'center', width: pageWidth - 2 * margin });
      doc.text('For questions, please contact support@finatrades.com', margin, footerY + 22, { align: 'center', width: pageWidth - 2 * margin });
      doc.text('This document is electronically generated and does not require a physical signature.', margin, footerY + 34, { align: 'center', width: pageWidth - 2 * margin });
      doc.text(`Generated: ${new Date().toISOString()}`, margin, footerY + 46, { align: 'center', width: pageWidth - 2 * margin });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// USER MANUAL PDF GENERATOR
// ============================================

export function generateUserManualPDF(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 50, right: 50 },
        bufferPages: true
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 50;
      const contentWidth = pageWidth - 2 * margin;

      // Helper functions
      const addHeader = (title: string, isMainTitle = false) => {
        if (isMainTitle) {
          doc.fillColor(FINATRADES_ORANGE)
             .fontSize(28)
             .font('Helvetica-Bold')
             .text(title, { align: 'center' });
          doc.moveDown(0.5);
        } else {
          doc.fillColor(FINATRADES_ORANGE)
             .fontSize(18)
             .font('Helvetica-Bold')
             .text(title);
          doc.moveDown(0.3);
        }
      };

      const addSubheader = (title: string) => {
        doc.fillColor('#1f2937')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(title);
        doc.moveDown(0.2);
      };

      const addParagraph = (text: string) => {
        doc.fillColor('#374151')
           .fontSize(11)
           .font('Helvetica')
           .text(text, { align: 'justify', lineGap: 2 });
        doc.moveDown(0.5);
      };

      const addBulletPoint = (text: string) => {
        doc.fillColor('#374151')
           .fontSize(11)
           .font('Helvetica')
           .text(`  •  ${text}`, { indent: 10 });
        doc.moveDown(0.2);
      };

      const addPageBreak = () => {
        doc.addPage();
      };

      const addFooter = () => {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fillColor('#9ca3af')
             .fontSize(9)
             .text(
               `Finatrades User Manual  |  Page ${i + 1} of ${pages.count}`,
               margin,
               doc.page.height - 40,
               { align: 'center', width: contentWidth }
             );
        }
      };

      // ============================================
      // COVER PAGE
      // ============================================
      doc.rect(0, 0, pageWidth, 200).fill(FINATRADES_ORANGE);
      
      doc.fillColor('white')
         .fontSize(36)
         .font('Helvetica-Bold')
         .text('FINATRADES', 0, 70, { align: 'center', width: pageWidth });
      
      doc.fontSize(16)
         .font('Helvetica')
         .text('User Manual', 0, 120, { align: 'center', width: pageWidth });

      doc.fontSize(12)
         .text('Gold-Backed Digital Finance Platform', 0, 145, { align: 'center', width: pageWidth });

      doc.fillColor('#374151')
         .fontSize(12)
         .text('Version 1.0', margin, 250, { align: 'center', width: contentWidth });
      
      doc.text(`Published: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`, margin, 270, { align: 'center', width: contentWidth });

      // ============================================
      // TABLE OF CONTENTS
      // ============================================
      addPageBreak();
      addHeader('Table of Contents', true);
      doc.moveDown(1);

      const tocItems = [
        { title: '1. Introduction', page: 3 },
        { title: '2. Getting Started', page: 4 },
        { title: '3. FinaVault - Gold Storage', page: 6 },
        { title: '4. FinaPay - Digital Wallet', page: 8 },
        { title: '5. BNSL - Buy Now Sell Later', page: 10 },
        { title: '6. FinaBridge - Trade Finance', page: 12 },
        { title: '7. Security & Compliance', page: 14 },
        { title: '8. Support & FAQ', page: 16 },
      ];

      tocItems.forEach(item => {
        doc.fillColor('#374151')
           .fontSize(12)
           .font('Helvetica')
           .text(item.title, margin, doc.y, { continued: true })
           .text(` ...................................... ${item.page}`, { align: 'right' });
        doc.moveDown(0.5);
      });

      // ============================================
      // SECTION 1: INTRODUCTION
      // ============================================
      addPageBreak();
      addHeader('1. Introduction', true);
      
      addParagraph('Welcome to Finatrades, the premier gold-backed digital finance platform. This user manual provides comprehensive guidance on using all features of our platform to manage your gold holdings, conduct transactions, and access trade finance services.');
      
      addSubheader('About Finatrades');
      addParagraph('Finatrades combines the timeless value of physical gold with modern digital technology. Our platform enables you to buy, sell, store, and trade gold through an intuitive digital interface while maintaining the security and tangibility of physical gold ownership.');

      addSubheader('Platform Features');
      addBulletPoint('FinaVault: Secure physical gold storage with digital certificates');
      addBulletPoint('FinaPay: Digital gold wallet for transactions and payments');
      addBulletPoint('BNSL: Buy Now Sell Later deferred sale agreements');
      addBulletPoint('FinaBridge: Trade finance solutions for businesses');
      addBulletPoint('FinaCard: Upcoming debit card for gold-backed spending');

      addSubheader('System Requirements');
      addBulletPoint('Modern web browser (Chrome, Firefox, Safari, Edge)');
      addBulletPoint('Stable internet connection');
      addBulletPoint('Valid email address for account verification');
      addBulletPoint('Mobile device for two-factor authentication (recommended)');

      // ============================================
      // SECTION 2: GETTING STARTED
      // ============================================
      addPageBreak();
      addHeader('2. Getting Started', true);

      addSubheader('2.1 Creating Your Account');
      addParagraph('To create a Finatrades account:');
      addBulletPoint('Visit the Finatrades website and click "Register"');
      addBulletPoint('Enter your email address and create a secure password');
      addBulletPoint('Provide your personal details (name, phone number, country)');
      addBulletPoint('Check your email for a verification code');
      addBulletPoint('Enter the 6-digit code to verify your email');

      addSubheader('2.2 KYC Verification');
      addParagraph('Know Your Customer (KYC) verification is required to access all platform features. The verification process includes:');
      addBulletPoint('Personal Information: Full name, date of birth, nationality');
      addBulletPoint('Address Verification: Current residential address');
      addBulletPoint('Identity Documents: Government-issued ID (passport, national ID)');
      addBulletPoint('Proof of Address: Utility bill or bank statement (within 3 months)');
      
      addParagraph('KYC Status Levels:');
      addBulletPoint('Not Started: No documents submitted');
      addBulletPoint('In Progress: Documents under review');
      addBulletPoint('Approved: Full access to all features');
      addBulletPoint('Rejected: Documents require resubmission');

      addPageBreak();
      addSubheader('2.3 Setting Up Two-Factor Authentication (2FA)');
      addParagraph('We strongly recommend enabling 2FA for enhanced account security:');
      addBulletPoint('Go to Settings > Security');
      addBulletPoint('Click "Enable Two-Factor Authentication"');
      addBulletPoint('Download an authenticator app (Google Authenticator, Authy)');
      addBulletPoint('Scan the QR code with your authenticator app');
      addBulletPoint('Enter the 6-digit code to confirm setup');
      addBulletPoint('Save your backup codes in a secure location');

      addSubheader('2.4 Dashboard Overview');
      addParagraph('Your dashboard provides a quick overview of:');
      addBulletPoint('Total gold holdings (in grams)');
      addBulletPoint('Current gold price and portfolio value');
      addBulletPoint('Recent transactions');
      addBulletPoint('Active BNSL plans');
      addBulletPoint('Quick action buttons for common tasks');

      // ============================================
      // SECTION 3: FINAVAULT
      // ============================================
      addPageBreak();
      addHeader('3. FinaVault - Gold Storage', true);

      addSubheader('3.1 Overview');
      addParagraph('FinaVault is our secure gold storage service, providing custody of physical gold in partnership with Wingold & Metals DMCC in Dubai. Your gold is stored in DMCC-certified vaults with full insurance coverage.');

      addSubheader('3.2 Storage Features');
      addBulletPoint('Allocated Storage: Your gold is individually identified and segregated');
      addBulletPoint('Dual Certificates: Digital ownership certificate from Finatrades + Physical storage certificate from Wingold');
      addBulletPoint('Real-time Tracking: View your holdings and certificates anytime');
      addBulletPoint('Competitive Fees: Annual storage fee of 0.5%');

      addSubheader('3.3 Certificates');
      addParagraph('When you store gold with FinaVault, you receive:');
      addBulletPoint('Digital Ownership Certificate: Confirms your digital ownership rights');
      addBulletPoint('Physical Storage Certificate: Issued by Wingold & Metals DMCC confirming physical custody');
      addBulletPoint('Transfer Certificates: Issued when gold is transferred between users');

      addPageBreak();
      addSubheader('3.4 Viewing Your Holdings');
      addParagraph('To view your vault holdings:');
      addBulletPoint('Navigate to the FinaVault section from the main menu');
      addBulletPoint('View your total gold in storage');
      addBulletPoint('Access and download your certificates');
      addBulletPoint('Review storage history and transactions');

      addSubheader('3.5 Storage Fees');
      addParagraph('FinaVault charges an annual storage fee of 0.5% of the gold value. Fees are calculated daily and deducted monthly from your gold balance.');

      // ============================================
      // SECTION 4: FINAPAY
      // ============================================
      addPageBreak();
      addHeader('4. FinaPay - Digital Wallet', true);

      addSubheader('4.1 Overview');
      addParagraph('FinaPay is your digital gold wallet, enabling you to buy, sell, send, and receive gold instantly. Your wallet displays your gold balance in grams along with the current USD equivalent.');

      addSubheader('4.2 Buying Gold');
      addParagraph('To purchase gold:');
      addBulletPoint('Click "Buy Gold" from your dashboard or FinaPay section');
      addBulletPoint('Enter the amount in grams or USD value');
      addBulletPoint('Review the current gold price and total cost');
      addBulletPoint('Select your payment method (bank transfer or crypto)');
      addBulletPoint('Confirm the transaction');
      addBulletPoint('Your gold balance updates once payment is confirmed');

      addSubheader('4.3 Selling Gold');
      addParagraph('To sell your gold:');
      addBulletPoint('Click "Sell Gold" from your wallet');
      addBulletPoint('Enter the amount to sell (in grams or USD)');
      addBulletPoint('Review the sell price and proceeds');
      addBulletPoint('Confirm the sale');
      addBulletPoint('Funds will be credited to your wallet balance');

      addPageBreak();
      addSubheader('4.4 Sending Gold');
      addParagraph('To send gold to another Finatrades user:');
      addBulletPoint('Click "Send Gold" from your wallet');
      addBulletPoint('Enter the recipient\'s Finatrades ID or email');
      addBulletPoint('Enter the amount to send');
      addBulletPoint('Add a note (optional)');
      addBulletPoint('Confirm with your 2FA code if enabled');
      addBulletPoint('Both parties receive a transfer certificate');

      addSubheader('4.5 Deposits & Withdrawals');
      addParagraph('Depositing funds:');
      addBulletPoint('Navigate to Deposits in FinaPay');
      addBulletPoint('Select the platform bank account for your region');
      addBulletPoint('Transfer funds with the provided reference number');
      addBulletPoint('Upload proof of payment');
      addBulletPoint('Funds are credited after admin confirmation');

      addParagraph('Withdrawing funds:');
      addBulletPoint('Navigate to Withdrawals in FinaPay');
      addBulletPoint('Enter your bank account details');
      addBulletPoint('Specify the amount to withdraw');
      addBulletPoint('Confirm with OTP if required');
      addBulletPoint('Funds are processed within 1-3 business days');

      // ============================================
      // SECTION 5: BNSL
      // ============================================
      addPageBreak();
      addHeader('5. BNSL - Buy Now Sell Later', true);

      addSubheader('5.1 Overview');
      addParagraph('BNSL (Buy Now Sell Later) allows you to lock in today\'s gold price and receive guaranteed payouts over time. This feature is ideal for those seeking predictable returns on their gold holdings.');

      addSubheader('5.2 How BNSL Works');
      addBulletPoint('Choose a BNSL plan (3, 6, or 12 months)');
      addBulletPoint('Lock your gold at the current price');
      addBulletPoint('Receive scheduled payouts throughout the term');
      addBulletPoint('Earn returns based on the plan terms');

      addSubheader('5.3 Creating a BNSL Plan');
      addParagraph('To create a new BNSL plan:');
      addBulletPoint('Navigate to the BNSL section');
      addBulletPoint('Review available plan options');
      addBulletPoint('Select your preferred term and gold amount');
      addBulletPoint('Review the payout schedule');
      addBulletPoint('Confirm to lock your gold');
      addBulletPoint('You will receive a BNSL Lock Certificate');

      addPageBreak();
      addSubheader('5.4 Viewing Your Plans');
      addParagraph('Your BNSL dashboard shows:');
      addBulletPoint('Active plans with remaining term');
      addBulletPoint('Total gold locked');
      addBulletPoint('Upcoming payouts');
      addBulletPoint('Historical payouts received');
      addBulletPoint('Plan performance metrics');

      addSubheader('5.5 Early Termination');
      addParagraph('If you need to exit a BNSL plan early:');
      addBulletPoint('Request early termination from your plan details');
      addBulletPoint('Review the termination terms (may include penalties)');
      addBulletPoint('Submit the request for admin review');
      addBulletPoint('Upon approval, gold is released to your wallet');

      // ============================================
      // SECTION 6: FINABRIDGE
      // ============================================
      addPageBreak();
      addHeader('6. FinaBridge - Trade Finance', true);

      addSubheader('6.1 Overview');
      addParagraph('FinaBridge provides gold-backed trade finance solutions for importers and exporters. Use your gold holdings as collateral to facilitate international trade transactions.');

      addSubheader('6.2 Who Can Use FinaBridge');
      addBulletPoint('Business accounts with completed KYC');
      addBulletPoint('Importers seeking credit facilities');
      addBulletPoint('Exporters requiring trade guarantees');
      addBulletPoint('Companies in commodity trading');

      addSubheader('6.3 Creating a Trade Case');
      addParagraph('To initiate a trade finance case:');
      addBulletPoint('Navigate to FinaBridge section');
      addBulletPoint('Click "Create Trade Case"');
      addBulletPoint('Select trade type (Import/Export)');
      addBulletPoint('Enter trade details and commodity information');
      addBulletPoint('Specify the gold amount for collateral');
      addBulletPoint('Upload required documents');
      addBulletPoint('Submit for review');

      addPageBreak();
      addSubheader('6.4 Document Requirements');
      addParagraph('Typical documents required for trade finance:');
      addBulletPoint('Commercial Invoice');
      addBulletPoint('Bill of Lading or Airway Bill');
      addBulletPoint('Certificate of Origin');
      addBulletPoint('Packing List');
      addBulletPoint('Insurance Certificate');
      addBulletPoint('Letter of Credit (if applicable)');

      addSubheader('6.5 Trade Case Status');
      addParagraph('Track your trade case through these stages:');
      addBulletPoint('Draft: Case created but not submitted');
      addBulletPoint('Submitted: Under initial review');
      addBulletPoint('Under Review: Documents being verified');
      addBulletPoint('Approved: Ready for activation');
      addBulletPoint('Active: Gold locked, trade in progress');
      addBulletPoint('Settled: Trade completed, gold released');

      // ============================================
      // SECTION 7: SECURITY
      // ============================================
      addPageBreak();
      addHeader('7. Security & Compliance', true);

      addSubheader('7.1 Account Security');
      addParagraph('Finatrades employs multiple security measures:');
      addBulletPoint('Password hashing using industry-standard encryption');
      addBulletPoint('Two-factor authentication (TOTP)');
      addBulletPoint('Email verification for new accounts');
      addBulletPoint('OTP verification for sensitive transactions');
      addBulletPoint('Session management and automatic logout');

      addSubheader('7.2 Protecting Your Account');
      addParagraph('Best practices for account security:');
      addBulletPoint('Use a strong, unique password');
      addBulletPoint('Enable two-factor authentication');
      addBulletPoint('Never share your login credentials');
      addBulletPoint('Verify the website URL before logging in');
      addBulletPoint('Keep your backup codes in a secure location');
      addBulletPoint('Report suspicious activity immediately');

      addPageBreak();
      addSubheader('7.3 KYC/AML Compliance');
      addParagraph('Finatrades adheres to international anti-money laundering standards:');
      addBulletPoint('Know Your Customer (KYC) verification for all users');
      addBulletPoint('Transaction monitoring and reporting');
      addBulletPoint('Sanctions screening');
      addBulletPoint('Regular compliance audits');

      addSubheader('7.4 Data Privacy');
      addParagraph('Your data is protected through:');
      addBulletPoint('Encrypted data storage');
      addBulletPoint('Secure data transmission (HTTPS)');
      addBulletPoint('Limited access to personal information');
      addBulletPoint('Compliance with privacy regulations');

      // ============================================
      // SECTION 8: SUPPORT
      // ============================================
      addPageBreak();
      addHeader('8. Support & FAQ', true);

      addSubheader('8.1 Getting Help');
      addParagraph('Multiple support channels are available:');
      addBulletPoint('Live Chat: Available from your dashboard');
      addBulletPoint('Email: support@finatrades.com');
      addBulletPoint('Help Center: Comprehensive knowledge base');

      addSubheader('8.2 Frequently Asked Questions');
      
      doc.moveDown(0.5);
      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold')
         .text('Q: How long does KYC verification take?');
      doc.fillColor('#374151').fontSize(11).font('Helvetica')
         .text('A: Most KYC submissions are reviewed within 24-48 hours. Complex cases may take longer.');
      doc.moveDown(0.5);

      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold')
         .text('Q: What is the minimum gold purchase?');
      doc.fillColor('#374151').fontSize(11).font('Helvetica')
         .text('A: The minimum gold purchase is 0.1 grams.');
      doc.moveDown(0.5);

      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold')
         .text('Q: Can I withdraw physical gold?');
      doc.fillColor('#374151').fontSize(11).font('Helvetica')
         .text('A: Physical gold withdrawals are available for holdings above 100 grams. Contact support for arrangements.');
      doc.moveDown(0.5);

      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold')
         .text('Q: What happens if I lose my 2FA device?');
      doc.fillColor('#374151').fontSize(11).font('Helvetica')
         .text('A: Use your backup codes to log in, then contact support to reset your 2FA settings.');
      doc.moveDown(0.5);

      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold')
         .text('Q: How are gold prices determined?');
      doc.fillColor('#374151').fontSize(11).font('Helvetica')
         .text('A: Gold prices are based on international spot prices with a small spread for trading.');

      // Add page numbers
      addFooter();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// ADMIN PANEL MANUAL PDF GENERATOR
// ============================================

export function generateAdminManualPDF(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Finatrades Admin Panel Manual',
          Author: 'Finatrades',
          Subject: 'Administrator Guide',
          Keywords: 'admin, management, finatrades, gold, platform'
        }
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100;
      let pageNumber = 0;

      // Helper functions
      const addHeader = (text: string, isChapterTitle = false) => {
        if (isChapterTitle) {
          doc.fillColor(FINATRADES_ORANGE).fontSize(22).font('Helvetica-Bold').text(text, { align: 'left' });
          doc.moveDown(0.3);
          doc.strokeColor(FINATRADES_ORANGE).lineWidth(2)
             .moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).stroke();
          doc.moveDown(1);
        } else {
          doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold').text(text);
          doc.moveDown(0.5);
        }
      };

      const addSubheader = (text: string) => {
        doc.fillColor('#374151').fontSize(13).font('Helvetica-Bold').text(text);
        doc.moveDown(0.3);
      };

      const addParagraph = (text: string) => {
        doc.fillColor('#4b5563').fontSize(11).font('Helvetica').text(text, { align: 'justify', lineGap: 2 });
        doc.moveDown(0.6);
      };

      const addBulletPoint = (text: string, indent = 0) => {
        const x = 60 + indent;
        doc.fillColor(FINATRADES_ORANGE).fontSize(11).text('•', x - 10, doc.y, { continued: true });
        doc.fillColor('#4b5563').font('Helvetica').text(' ' + text, { width: pageWidth - indent - 20, lineGap: 2 });
        doc.moveDown(0.2);
      };

      const addNumberedStep = (number: number, text: string) => {
        const stepY = doc.y;
        doc.fillColor(FINATRADES_ORANGE).fontSize(11).font('Helvetica-Bold')
           .text(`${number}.`, 60, stepY);
        doc.fillColor('#4b5563').font('Helvetica').text(text, 80, stepY, { width: pageWidth - 40, lineGap: 2 });
        doc.moveDown(0.3);
      };

      const addTip = (text: string) => {
        const tipY = doc.y;
        doc.roundedRect(50, tipY, pageWidth, 40, 5).fillColor('#fef3c7').fill();
        doc.fillColor('#92400e').fontSize(10).font('Helvetica-Bold')
           .text('TIP:', 60, tipY + 10, { continued: true });
        doc.font('Helvetica').text(' ' + text, { width: pageWidth - 30 });
        doc.y = tipY + 50;
      };

      const addWarning = (text: string) => {
        const warnY = doc.y;
        doc.roundedRect(50, warnY, pageWidth, 45, 5).fillColor('#fee2e2').fill();
        doc.fillColor('#991b1b').fontSize(10).font('Helvetica-Bold')
           .text('IMPORTANT:', 60, warnY + 10, { continued: true });
        doc.font('Helvetica').text(' ' + text, { width: pageWidth - 40 });
        doc.y = warnY + 55;
      };

      const addPageBreak = () => {
        doc.addPage();
        pageNumber++;
      };

      const addFooter = () => {
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.fillColor('#9ca3af').fontSize(9).font('Helvetica')
             .text(`Finatrades Admin Manual | Page ${i + 1} of ${range.start + range.count}`, 50, doc.page.height - 40, { align: 'center', width: pageWidth });
        }
      };

      // ============================================
      // COVER PAGE
      // ============================================
      doc.rect(0, 0, doc.page.width, doc.page.height).fillColor('#1f2937').fill();
      
      doc.fillColor('#ffffff').fontSize(40).font('Helvetica-Bold')
         .text('FINATRADES', 50, 180, { align: 'center' });
      doc.fillColor(FINATRADES_ORANGE).fontSize(28)
         .text('Administrator Manual', { align: 'center' });
      doc.moveDown(2);
      doc.fillColor('#d1d5db').fontSize(14).font('Helvetica')
         .text('Complete Guide for Platform Administrators', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(12).text('Version 1.0 | ' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), { align: 'center' });

      doc.fillColor('#9ca3af').fontSize(10)
         .text('This manual provides step-by-step instructions for managing the Finatrades platform.', 50, doc.page.height - 120, { align: 'center', width: pageWidth });
      doc.text('Written for administrators with any level of technical experience.', { align: 'center', width: pageWidth });

      // ============================================
      // TABLE OF CONTENTS
      // ============================================
      addPageBreak();
      doc.fillColor('#1f2937').fontSize(24).font('Helvetica-Bold').text('Table of Contents', 50, 60);
      doc.moveDown(1.5);

      const tocItems = [
        { num: '1', title: 'Getting Started', page: '3' },
        { num: '2', title: 'Dashboard Overview', page: '4' },
        { num: '3', title: 'User Management', page: '6' },
        { num: '4', title: 'KYC Review Process', page: '9' },
        { num: '5', title: 'Transaction Monitoring', page: '12' },
        { num: '6', title: 'FinaVault Management', page: '14' },
        { num: '7', title: 'FinaPay Operations', page: '16' },
        { num: '8', title: 'BNSL Management', page: '18' },
        { num: '9', title: 'FinaBridge Trade Finance', page: '20' },
        { num: '10', title: 'Fee Management', page: '23' },
        { num: '11', title: 'Document Management', page: '25' },
        { num: '12', title: 'CMS & Content', page: '27' },
        { num: '13', title: 'Employee Management', page: '29' },
        { num: '14', title: 'Payment Gateway Settings', page: '31' },
        { num: '15', title: 'Security Settings', page: '33' },
        { num: '16', title: 'Reports & Analytics', page: '35' },
        { num: '17', title: 'Admin Chat & Support', page: '37' },
        { num: '18', title: 'Troubleshooting Guide', page: '39' }
      ];

      tocItems.forEach(item => {
        const startX = 50;
        const currentY = doc.y;
        const numWidth = 30;
        const pageNumWidth = 30;
        const titleWidth = 200;
        const dotStartX = startX + numWidth + titleWidth;
        const dotEndX = pageWidth + 20;
        
        doc.fillColor(FINATRADES_ORANGE).fontSize(11).font('Helvetica-Bold')
           .text(item.num + '.', startX, currentY);
        doc.fillColor('#374151').font('Helvetica')
           .text(item.title, startX + numWidth, currentY);
        doc.fillColor('#374151').font('Helvetica')
           .text(item.page, dotEndX, currentY, { align: 'right', width: pageNumWidth });
        
        doc.strokeColor('#d1d5db').lineWidth(0.5)
           .moveTo(dotStartX, currentY + 6).lineTo(dotEndX - 5, currentY + 6).dash(2, { space: 2 }).stroke().undash();
        
        doc.moveDown(0.6);
      });

      // ============================================
      // CHAPTER 1: GETTING STARTED
      // ============================================
      addPageBreak();
      addHeader('1. Getting Started', true);

      addSubheader('1.1 What is the Admin Panel?');
      addParagraph('The Admin Panel is your control center for managing the entire Finatrades platform. From here, you can manage users, review KYC applications, monitor transactions, configure fees, and much more.');

      addSubheader('1.2 Accessing the Admin Panel');
      addParagraph('To access the admin panel:');
      addNumberedStep(1, 'Go to the Finatrades website and log in with your admin credentials');
      addNumberedStep(2, 'Click on your profile icon in the top right corner');
      addNumberedStep(3, 'Select "Admin Panel" from the dropdown menu');
      addNumberedStep(4, 'You will be taken to the Admin Dashboard');

      addTip('Bookmark the admin panel URL for quick access: /admin');

      addSubheader('1.3 Admin Roles and Permissions');
      addParagraph('There are different levels of admin access:');
      addBulletPoint('Super Admin: Full access to all features including system settings');
      addBulletPoint('Admin: Can manage users, KYC, transactions, and day-to-day operations');
      addBulletPoint('Support Staff: Can view user information and handle support requests');

      addWarning('Never share your admin login credentials. If you suspect unauthorized access, change your password immediately and notify the security team.');

      addSubheader('1.4 Navigation Overview');
      addParagraph('The admin panel has a sidebar menu on the left with the following sections:');
      addBulletPoint('Dashboard - Overview of platform statistics');
      addBulletPoint('Users - Manage user accounts and profiles');
      addBulletPoint('KYC Review - Review identity verification requests');
      addBulletPoint('Transactions - Monitor all platform transactions');
      addBulletPoint('FinaVault - Manage vault storage and certificates');
      addBulletPoint('FinaPay - Payment operations and wallet management');
      addBulletPoint('BNSL - Buy Now Sell Later plan management');
      addBulletPoint('FinaBridge - Trade finance case management');
      addBulletPoint('Settings - Platform configuration and preferences');

      // ============================================
      // CHAPTER 2: DASHBOARD OVERVIEW
      // ============================================
      addPageBreak();
      addHeader('2. Dashboard Overview', true);

      addSubheader('2.1 Understanding the Dashboard');
      addParagraph('The dashboard is the first screen you see when logging into the admin panel. It provides a quick snapshot of platform health and key metrics.');

      addSubheader('2.2 Key Statistics Cards');
      addParagraph('At the top of the dashboard, you will see four main statistics:');

      addBulletPoint('Total Users: The total number of registered accounts on the platform');
      addBulletPoint('Total Volume: The all-time transaction volume in USD');
      addBulletPoint('Pending KYC: Number of KYC applications waiting for your review');
      addBulletPoint('Revenue: Platform earnings from fees and transactions');

      addSubheader('2.3 Pending KYC Requests Panel');
      addParagraph('This panel shows the most recent KYC applications that need review:');
      addBulletPoint('Each row shows the applicant name, account type, and time submitted');
      addBulletPoint('Click "Review" to open the full application details');
      addBulletPoint('Click "View All" to go to the complete KYC review page');

      addTip('Check the pending KYC queue at least twice daily to ensure timely user verification.');

      addSubheader('2.4 System Status Panel');
      addParagraph('The system status panel shows the health of key platform services:');
      addBulletPoint('FinaVault Storage: Status of the vault storage system');
      addBulletPoint('Payment Gateway: Status of payment processing');
      addBulletPoint('KYC Verification API: Status of the identity verification service');

      addParagraph('Status indicators:');
      addBulletPoint('Green (Operational): Service is working normally', 10);
      addBulletPoint('Yellow (Degraded): Service has minor issues', 10);
      addBulletPoint('Red (Down): Service is unavailable - escalate immediately', 10);

      addSubheader('2.5 Dashboard Actions');
      addParagraph('From the dashboard, you can quickly:');
      addBulletPoint('Jump to any pending KYC application for review');
      addBulletPoint('See live data updates (refreshed every 30 seconds)');
      addBulletPoint('Navigate to detailed management sections');

      // ============================================
      // CHAPTER 3: USER MANAGEMENT
      // ============================================
      addPageBreak();
      addHeader('3. User Management', true);

      addSubheader('3.1 Accessing User Management');
      addParagraph('Click "Users" in the left sidebar to access the user management page. This is where you manage all platform users.');

      addSubheader('3.2 User Statistics');
      addParagraph('At the top of the page, you will see user breakdown:');
      addBulletPoint('Total: All registered users');
      addBulletPoint('Personal: Individual account holders');
      addBulletPoint('Corporate: Business/company accounts');
      addBulletPoint('Verified: Users with verified email addresses');
      addBulletPoint('Admins: Users with administrative privileges');

      addSubheader('3.3 Searching for Users');
      addParagraph('Use the search bar to find specific users by:');
      addBulletPoint('Email address');
      addBulletPoint('Name (first or last name)');
      addBulletPoint('Finatrades ID (unique user identifier)');

      addSubheader('3.4 User List');
      addParagraph('The user table shows:');
      addBulletPoint('User avatar and name');
      addBulletPoint('Finatrades ID');
      addBulletPoint('Email address and verification status');
      addBulletPoint('Account type (Personal/Business)');
      addBulletPoint('KYC status badge');
      addBulletPoint('Join date');
      addBulletPoint('Actions menu (three dots button)');

      addPageBreak();
      addSubheader('3.5 User Actions');
      addParagraph('Click the three-dot menu next to any user to access these actions:');

      addBulletPoint('View Details: Opens the full user profile with all information');
      addBulletPoint('Verify Email: Manually verify the user\'s email address');
      addBulletPoint('Suspend User: Temporarily block the user from accessing the platform');
      addBulletPoint('Activate User: Re-enable a suspended user account');

      addSubheader('3.6 Viewing User Details');
      addParagraph('The user details page shows comprehensive information:');

      addBulletPoint('Personal Information: Name, email, phone, address');
      addBulletPoint('Account Status: Verification status, account type, role');
      addBulletPoint('Wallet Information: Gold balance, cash balance, wallet ID');
      addBulletPoint('Transaction History: Recent transactions for this user');
      addBulletPoint('KYC Documents: Submitted identity documents');
      addBulletPoint('Audit Log: History of all actions on this account');

      addWarning('Suspending a user will immediately log them out and prevent all platform access. Only suspend users for valid security or compliance reasons.');

      addSubheader('3.7 Manual Email Verification');
      addParagraph('Sometimes users cannot receive verification emails. To manually verify:');
      addNumberedStep(1, 'Find the user in the user list');
      addNumberedStep(2, 'Click the three-dot menu');
      addNumberedStep(3, 'Select "Verify Email"');
      addNumberedStep(4, 'Confirm the action');
      addNumberedStep(5, 'The user\'s email is now verified');

      addTip('Before manually verifying email, confirm the user\'s identity through other means (phone call, support ticket, etc.).');

      // ============================================
      // CHAPTER 4: KYC REVIEW PROCESS
      // ============================================
      addPageBreak();
      addHeader('4. KYC Review Process', true);

      addSubheader('4.1 What is KYC?');
      addParagraph('KYC (Know Your Customer) is the process of verifying the identity of users. This is required by regulations to prevent fraud, money laundering, and other financial crimes. All users must complete KYC to fully use the platform.');

      addSubheader('4.2 Accessing KYC Review');
      addParagraph('Click "KYC" in the sidebar to access the KYC review page. You will see:');
      addBulletPoint('Summary statistics (Pending, Approved, Rejected counts)');
      addBulletPoint('List of pending applications requiring your review');
      addBulletPoint('Tabs to filter by status');

      addSubheader('4.3 KYC Application Details');
      addParagraph('When you click on an application, you will see:');
      addBulletPoint('Personal Information: Name, date of birth, nationality');
      addBulletPoint('Address Information: Residential address details');
      addBulletPoint('Identity Documents: Uploaded ID photos');
      addBulletPoint('Document Type: Passport, ID Card, or Driver\'s License');
      addBulletPoint('Submission Date: When the user submitted the application');

      addSubheader('4.4 Reviewing Documents');
      addParagraph('Check the following when reviewing identity documents:');
      addNumberedStep(1, 'Document is clear and readable');
      addNumberedStep(2, 'Name matches the account name');
      addNumberedStep(3, 'Document is not expired');
      addNumberedStep(4, 'Photo matches the document (if selfie provided)');
      addNumberedStep(5, 'No signs of tampering or editing');
      addNumberedStep(6, 'Document type matches what was selected');

      addPageBreak();
      addSubheader('4.5 Approving an Application');
      addParagraph('If all documents are valid and information matches:');
      addNumberedStep(1, 'Review all submitted documents carefully');
      addNumberedStep(2, 'Click the green "Approve" button');
      addNumberedStep(3, 'Confirm the approval');
      addNumberedStep(4, 'The user is notified and gains full platform access');

      addSubheader('4.6 Rejecting an Application');
      addParagraph('If there are issues with the application:');
      addNumberedStep(1, 'Click the red "Reject" button');
      addNumberedStep(2, 'Enter a clear rejection reason (this is shown to the user)');
      addNumberedStep(3, 'Common reasons: "Document expired", "Image not readable", "Information mismatch"');
      addNumberedStep(4, 'Click "Confirm Rejection"');
      addNumberedStep(5, 'The user is notified and can resubmit');

      addWarning('Always provide a clear rejection reason so the user understands what needs to be corrected. Vague rejections create support burden.');

      addSubheader('4.7 KYC Status Meanings');
      addBulletPoint('Not Started: User has not begun KYC process');
      addBulletPoint('In Progress: User has submitted and is awaiting review');
      addBulletPoint('Approved: Identity verified, full platform access granted');
      addBulletPoint('Rejected: Application denied, user can resubmit');

      addTip('Process KYC applications in the order they were received (oldest first) to be fair to all users.');

      // ============================================
      // CHAPTER 5: TRANSACTION MONITORING
      // ============================================
      addPageBreak();
      addHeader('5. Transaction Monitoring', true);

      addSubheader('5.1 Accessing Transactions');
      addParagraph('Click "Transactions" in the sidebar to view all platform transactions. This page shows real-time transaction activity across the platform.');

      addSubheader('5.2 Transaction Types');
      addParagraph('The platform has several transaction types:');
      addBulletPoint('Buy: User purchased gold');
      addBulletPoint('Sell: User sold gold for cash');
      addBulletPoint('Transfer: Gold transferred between users');
      addBulletPoint('Deposit: User added funds to their wallet');
      addBulletPoint('Withdrawal: User withdrew funds from their wallet');
      addBulletPoint('BNSL Payout: Scheduled payout from a BNSL plan');
      addBulletPoint('Trade Lock: Gold locked for trade finance');
      addBulletPoint('Trade Release: Gold released after trade completion');

      addSubheader('5.3 Transaction List');
      addParagraph('Each transaction row shows:');
      addBulletPoint('Transaction ID: Unique identifier');
      addBulletPoint('User: The account holder');
      addBulletPoint('Type: The transaction category');
      addBulletPoint('Amount: Value in grams or USD');
      addBulletPoint('Status: Pending, Completed, Failed, or Cancelled');
      addBulletPoint('Date/Time: When the transaction occurred');

      addSubheader('5.4 Filtering Transactions');
      addParagraph('Use filters to narrow down the transaction list:');
      addBulletPoint('Date range: View transactions from specific periods');
      addBulletPoint('Transaction type: Filter by buy, sell, transfer, etc.');
      addBulletPoint('Status: Show only pending, completed, or failed');
      addBulletPoint('User search: Find transactions for a specific user');

      addSubheader('5.5 Transaction Details');
      addParagraph('Click on any transaction to see full details including:');
      addBulletPoint('Complete transaction metadata');
      addBulletPoint('Associated wallet balances before and after');
      addBulletPoint('Related certificates or documents');
      addBulletPoint('Transaction fee breakdown');

      addWarning('If you notice suspicious transaction patterns (many small transactions, unusual timing, unknown recipients), report to the compliance team immediately.');

      // ============================================
      // CHAPTER 6: FINAVAULT MANAGEMENT
      // ============================================
      addPageBreak();
      addHeader('6. FinaVault Management', true);

      addSubheader('6.1 What is FinaVault?');
      addParagraph('FinaVault is the secure gold storage service. Users can store their gold in allocated vaults and receive ownership certificates. Administrators manage vault operations and certificates.');

      addSubheader('6.2 Vault Overview');
      addParagraph('The FinaVault management page shows:');
      addBulletPoint('Total gold held in vaults');
      addBulletPoint('Number of active vault holdings');
      addBulletPoint('Recent vault activity');
      addBulletPoint('Certificate management');

      addSubheader('6.3 Vault Holdings');
      addParagraph('View all vault holdings with details:');
      addBulletPoint('Holding ID and certificate number');
      addBulletPoint('Owner information');
      addBulletPoint('Gold amount and purity');
      addBulletPoint('Storage location');
      addBulletPoint('Status (Active, Locked, Released)');

      addSubheader('6.4 Certificate Management');
      addParagraph('Each vault holding has an associated certificate. You can:');
      addBulletPoint('View certificate details');
      addBulletPoint('Download certificate PDF');
      addBulletPoint('Verify certificate authenticity');
      addBulletPoint('Reissue certificates if needed');

      addSubheader('6.5 Vault Operations');
      addParagraph('Common vault operations you may perform:');
      addBulletPoint('Approve physical withdrawal requests');
      addBulletPoint('Process vault-to-vault transfers');
      addBulletPoint('Update storage location information');
      addBulletPoint('Generate audit reports');

      addTip('Run weekly vault reconciliation reports to ensure physical gold matches digital records.');

      // ============================================
      // CHAPTER 7: FINAPAY OPERATIONS
      // ============================================
      addPageBreak();
      addHeader('7. FinaPay Operations', true);

      addSubheader('7.1 What is FinaPay?');
      addParagraph('FinaPay is the digital wallet system for gold transactions. Users can buy, sell, and transfer gold through their FinaPay wallet. Administrators manage wallet operations and payments.');

      addSubheader('7.2 Payment Operations');
      addParagraph('The FinaPay Operations page allows you to:');
      addBulletPoint('View all wallet balances');
      addBulletPoint('Process pending deposits and withdrawals');
      addBulletPoint('Review failed transactions');
      addBulletPoint('Handle refund requests');

      addSubheader('7.3 Deposit Processing');
      addParagraph('When users deposit funds:');
      addNumberedStep(1, 'Check the deposit request details');
      addNumberedStep(2, 'Verify payment receipt (bank transfer, card payment, crypto)');
      addNumberedStep(3, 'Approve the deposit to credit user\'s wallet');
      addNumberedStep(4, 'Or reject with reason if payment not confirmed');

      addSubheader('7.4 Withdrawal Processing');
      addParagraph('When users request withdrawals:');
      addNumberedStep(1, 'Verify user has sufficient balance');
      addNumberedStep(2, 'Check withdrawal destination (bank account, crypto wallet)');
      addNumberedStep(3, 'Process the payment through appropriate channel');
      addNumberedStep(4, 'Mark as completed once funds are sent');

      addWarning('Always verify large withdrawals (over $10,000) through additional verification steps as per compliance procedures.');

      addSubheader('7.5 Wallet Adjustments');
      addParagraph('In special cases, you may need to manually adjust wallets:');
      addBulletPoint('Corrections for processing errors');
      addBulletPoint('Promotional credits');
      addBulletPoint('Refunds for failed transactions');

      addParagraph('All manual adjustments are logged in the audit trail with the admin who made them.');

      // ============================================
      // CHAPTER 8: BNSL MANAGEMENT
      // ============================================
      addPageBreak();
      addHeader('8. BNSL Management', true);

      addSubheader('8.1 What is BNSL?');
      addParagraph('BNSL (Buy Now Sell Later) is a savings product where users lock their gold at a fixed price and receive scheduled payouts over a term period. Administrators manage plan approvals and payouts.');

      addSubheader('8.2 BNSL Overview Dashboard');
      addParagraph('The BNSL management page shows:');
      addBulletPoint('Total active BNSL plans');
      addBulletPoint('Total gold locked in BNSL');
      addBulletPoint('Upcoming payouts this week');
      addBulletPoint('Plans awaiting approval');

      addSubheader('8.3 Plan Statuses');
      addBulletPoint('Pending: User created plan, awaiting approval');
      addBulletPoint('Active: Plan approved and running');
      addBulletPoint('Completed: All payouts made, term finished');
      addBulletPoint('Terminated: Plan ended early by user or admin');

      addSubheader('8.4 Approving BNSL Plans');
      addParagraph('To approve a new BNSL plan:');
      addNumberedStep(1, 'Review the plan details (term, gold amount, payout schedule)');
      addNumberedStep(2, 'Verify user has sufficient gold in wallet');
      addNumberedStep(3, 'Click "Approve" to activate the plan');
      addNumberedStep(4, 'Gold is locked and payout schedule begins');

      addSubheader('8.5 Managing Payouts');
      addParagraph('BNSL payouts are processed automatically, but you can:');
      addBulletPoint('View all scheduled payouts');
      addBulletPoint('See payout history for each plan');
      addBulletPoint('Manually trigger missed payouts');
      addBulletPoint('Pause payouts if there are issues');

      addSubheader('8.6 Early Termination');
      addParagraph('If a user requests early termination:');
      addNumberedStep(1, 'Review the termination request');
      addNumberedStep(2, 'Check applicable penalties per terms');
      addNumberedStep(3, 'Approve or reject the request');
      addNumberedStep(4, 'If approved, gold is released to user\'s wallet');

      // ============================================
      // CHAPTER 9: FINABRIDGE TRADE FINANCE
      // ============================================
      addPageBreak();
      addHeader('9. FinaBridge Trade Finance', true);

      addSubheader('9.1 What is FinaBridge?');
      addParagraph('FinaBridge provides gold-backed trade finance for importers and exporters. Business users can use their gold as collateral for trade transactions. Administrators review and manage trade cases.');

      addSubheader('9.2 Trade Case Overview');
      addParagraph('The FinaBridge management page shows:');
      addBulletPoint('Active trade cases');
      addBulletPoint('Pending cases awaiting review');
      addBulletPoint('Settlement queue');
      addBulletPoint('Total trade volume');

      addSubheader('9.3 Trade Case Statuses');
      addBulletPoint('Draft: User started case but not submitted');
      addBulletPoint('Submitted: Waiting for initial review');
      addBulletPoint('Under Review: Documents being verified');
      addBulletPoint('Approved: Ready for gold lock and activation');
      addBulletPoint('Active: Trade in progress, gold locked');
      addBulletPoint('Pending Settlement: Trade complete, awaiting settlement');
      addBulletPoint('Settled: All complete, gold released');
      addBulletPoint('Rejected: Case denied');

      addSubheader('9.4 Reviewing Trade Cases');
      addParagraph('When reviewing a trade case, check:');
      addNumberedStep(1, 'Business verification - is the company legitimate?');
      addNumberedStep(2, 'Trade details - are the values reasonable?');
      addNumberedStep(3, 'Documents - are all required documents uploaded?');
      addNumberedStep(4, 'Collateral - does user have sufficient gold?');

      addPageBreak();
      addSubheader('9.5 Document Verification');
      addParagraph('Verify these documents for trade cases:');
      addBulletPoint('Commercial Invoice - matches trade details');
      addBulletPoint('Bill of Lading - shipping documentation');
      addBulletPoint('Certificate of Origin - source country verification');
      addBulletPoint('Packing List - item details match invoice');
      addBulletPoint('Insurance Certificate - coverage is adequate');
      addBulletPoint('Letter of Credit - if applicable, verify with bank');

      addSubheader('9.6 Approving Trade Cases');
      addParagraph('To approve a trade case:');
      addNumberedStep(1, 'Complete document verification');
      addNumberedStep(2, 'Verify gold collateral is available');
      addNumberedStep(3, 'Click "Approve" to change status');
      addNumberedStep(4, 'User can then activate and lock gold');

      addSubheader('9.7 Settlement Process');
      addParagraph('When a trade is complete:');
      addNumberedStep(1, 'User submits settlement request with proof');
      addNumberedStep(2, 'Verify trade was completed successfully');
      addNumberedStep(3, 'Process the settlement');
      addNumberedStep(4, 'Gold collateral is released to user');

      addWarning('Trade finance involves significant amounts. Always follow the four-eyes principle - have a second admin verify before approving large trade cases.');

      // ============================================
      // CHAPTER 10: FEE MANAGEMENT
      // ============================================
      addPageBreak();
      addHeader('10. Fee Management', true);

      addSubheader('10.1 Accessing Fee Settings');
      addParagraph('Click "Fees" in the sidebar to manage platform fees. This is where you configure all transaction and service fees.');

      addSubheader('10.2 Fee Types');
      addParagraph('The platform has several fee categories:');
      addBulletPoint('Trading Fees: Applied to buy and sell transactions');
      addBulletPoint('Transfer Fees: For gold transfers between users');
      addBulletPoint('Withdrawal Fees: For cash withdrawals');
      addBulletPoint('Storage Fees: Monthly vault storage charges');
      addBulletPoint('BNSL Fees: Fees for BNSL plan services');
      addBulletPoint('Trade Finance Fees: FinaBridge service charges');

      addSubheader('10.3 Viewing Current Fees');
      addParagraph('The fee table shows:');
      addBulletPoint('Fee name and type');
      addBulletPoint('Current percentage or fixed amount');
      addBulletPoint('Minimum and maximum limits');
      addBulletPoint('When the fee was last updated');
      addBulletPoint('Who updated it');

      addSubheader('10.4 Updating Fees');
      addParagraph('To change a fee:');
      addNumberedStep(1, 'Click "Edit" next to the fee');
      addNumberedStep(2, 'Enter the new fee value');
      addNumberedStep(3, 'Set effective date (can be immediate or future)');
      addNumberedStep(4, 'Add a reason for the change');
      addNumberedStep(5, 'Click "Save" to apply');

      addWarning('Fee changes affect all users immediately (or from effective date). Communicate significant fee changes to users in advance.');

      addSubheader('10.5 Fee Audit Trail');
      addParagraph('All fee changes are logged. You can view the history to see:');
      addBulletPoint('Previous fee values');
      addBulletPoint('When changes were made');
      addBulletPoint('Which admin made the change');
      addBulletPoint('Reason provided for the change');

      // ============================================
      // CHAPTER 11: DOCUMENT MANAGEMENT
      // ============================================
      addPageBreak();
      addHeader('11. Document Management', true);

      addSubheader('11.1 Document Types');
      addParagraph('The platform generates and stores various documents:');
      addBulletPoint('Certificates: Ownership, storage, transfer certificates');
      addBulletPoint('Invoices: Transaction invoices for purchases');
      addBulletPoint('Statements: Account statements');
      addBulletPoint('Reports: System and compliance reports');
      addBulletPoint('User Documents: KYC uploads and trade documents');

      addSubheader('11.2 Certificate Management');
      addParagraph('View and manage all certificates:');
      addBulletPoint('Search certificates by number or user');
      addBulletPoint('Verify certificate authenticity');
      addBulletPoint('Download certificate PDFs');
      addBulletPoint('Reissue certificates if needed');

      addSubheader('11.3 Invoice Management');
      addParagraph('Manage transaction invoices:');
      addBulletPoint('View all generated invoices');
      addBulletPoint('Search by invoice number or user');
      addBulletPoint('Download invoice PDFs');
      addBulletPoint('Resend invoices to users');

      addSubheader('11.4 Document Templates');
      addParagraph('Configure document templates through the CMS (see Chapter 12). Templates control:');
      addBulletPoint('Certificate appearance and text');
      addBulletPoint('Invoice format and details');
      addBulletPoint('Company branding elements');
      addBulletPoint('Legal disclaimers and footers');

      addTip('Regularly verify that document templates comply with current regulations and company policies.');

      // ============================================
      // CHAPTER 12: CMS & CONTENT
      // ============================================
      addPageBreak();
      addHeader('12. CMS & Content Management', true);

      addSubheader('12.1 What is the CMS?');
      addParagraph('The Content Management System (CMS) allows you to edit website content, email templates, and document templates without developer involvement.');

      addSubheader('12.2 Content Types');
      addParagraph('The CMS manages:');
      addBulletPoint('Website Pages: Home page, about, FAQ, terms, privacy');
      addBulletPoint('Email Templates: Verification, notifications, alerts');
      addBulletPoint('Document Templates: Certificates, invoices, statements');
      addBulletPoint('System Messages: Error messages, confirmations');

      addSubheader('12.3 Editing Content');
      addParagraph('To edit content:');
      addNumberedStep(1, 'Select the content category');
      addNumberedStep(2, 'Find the specific template or page');
      addNumberedStep(3, 'Click "Edit" to open the editor');
      addNumberedStep(4, 'Make your changes');
      addNumberedStep(5, 'Preview the changes');
      addNumberedStep(6, 'Click "Publish" to make live');

      addSubheader('12.4 Template Variables');
      addParagraph('Templates can include dynamic variables:');
      addBulletPoint('{{user_name}}: Replaced with actual user name');
      addBulletPoint('{{amount}}: Transaction or balance amount');
      addBulletPoint('{{date}}: Current or transaction date');
      addBulletPoint('{{certificate_number}}: Certificate identifier');

      addSubheader('12.5 Version History');
      addParagraph('The CMS keeps history of all changes:');
      addBulletPoint('View previous versions of any content');
      addBulletPoint('Compare versions to see what changed');
      addBulletPoint('Restore previous versions if needed');
      addBulletPoint('See who made each change and when');

      addWarning('Always preview content before publishing. Broken templates can affect user experience and system emails.');

      // ============================================
      // CHAPTER 13: EMPLOYEE MANAGEMENT
      // ============================================
      addPageBreak();
      addHeader('13. Employee Management', true);

      addSubheader('13.1 Managing Admin Users');
      addParagraph('The Employee Management section allows you to manage other administrators and staff with platform access.');

      addSubheader('13.2 Employee List');
      addParagraph('View all employees with their:');
      addBulletPoint('Name and email');
      addBulletPoint('Role (Super Admin, Admin, Support)');
      addBulletPoint('Status (Active, Inactive)');
      addBulletPoint('Last login time');
      addBulletPoint('Date added');

      addSubheader('13.3 Adding New Employees');
      addParagraph('To add a new admin user:');
      addNumberedStep(1, 'Click "Add Employee"');
      addNumberedStep(2, 'Enter their email address');
      addNumberedStep(3, 'Set their name');
      addNumberedStep(4, 'Select their role');
      addNumberedStep(5, 'Click "Create"');
      addNumberedStep(6, 'They will receive an email to set their password');

      addSubheader('13.4 Managing Permissions');
      addParagraph('Each role has different permissions:');
      addBulletPoint('Super Admin: Full access to everything');
      addBulletPoint('Admin: All operations except security settings');
      addBulletPoint('Support: View-only plus chat support access');

      addSubheader('13.5 Deactivating Employees');
      addParagraph('When an employee leaves:');
      addNumberedStep(1, 'Find them in the employee list');
      addNumberedStep(2, 'Click "Deactivate"');
      addNumberedStep(3, 'Their access is immediately revoked');
      addNumberedStep(4, 'Their actions remain in audit logs');

      addWarning('Always deactivate departing employees promptly. Delayed deactivation is a security risk.');

      // ============================================
      // CHAPTER 14: PAYMENT GATEWAY SETTINGS
      // ============================================
      addPageBreak();
      addHeader('14. Payment Gateway Settings', true);

      addSubheader('14.1 Available Payment Methods');
      addParagraph('The platform supports multiple payment methods:');
      addBulletPoint('Bank Transfer: Traditional wire transfers');
      addBulletPoint('Card Payments: Credit and debit cards');
      addBulletPoint('Cryptocurrency: Bitcoin, USDT, and other crypto via Binance Pay');

      addSubheader('14.2 Payment Gateway Configuration');
      addParagraph('Each payment gateway needs configuration:');
      addBulletPoint('API Keys: Authentication credentials');
      addBulletPoint('Webhook URLs: For payment notifications');
      addBulletPoint('Merchant IDs: Provider identifiers');
      addBulletPoint('Test/Live Mode: Switch between test and production');

      addSubheader('14.3 Binance Pay Setup');
      addParagraph('To configure Binance Pay:');
      addNumberedStep(1, 'Get your Merchant ID from Binance Merchant Portal');
      addNumberedStep(2, 'Generate API Key and Secret Key');
      addNumberedStep(3, 'Enter credentials in the payment settings');
      addNumberedStep(4, 'Configure webhook URL for payment callbacks');
      addNumberedStep(5, 'Test with a small transaction');

      addSubheader('14.4 Testing Payments');
      addParagraph('Before going live:');
      addBulletPoint('Use test mode credentials');
      addBulletPoint('Process test transactions');
      addBulletPoint('Verify webhooks are working');
      addBulletPoint('Check that wallets are credited correctly');

      addWarning('Never share payment gateway API keys. Compromised keys can lead to financial losses.');

      // ============================================
      // CHAPTER 15: SECURITY SETTINGS
      // ============================================
      addPageBreak();
      addHeader('15. Security Settings', true);

      addSubheader('15.1 Access Security Settings');
      addParagraph('Only Super Admins can access security settings. This section controls platform-wide security configurations.');

      addSubheader('15.2 Two-Factor Authentication');
      addParagraph('Manage 2FA settings for the platform:');
      addBulletPoint('Require 2FA for all admin users');
      addBulletPoint('Set 2FA requirements for users based on activity');
      addBulletPoint('Configure backup code generation');
      addBulletPoint('View 2FA adoption statistics');

      addSubheader('15.3 Session Settings');
      addParagraph('Configure user session behavior:');
      addBulletPoint('Session timeout duration');
      addBulletPoint('Maximum concurrent sessions');
      addBulletPoint('IP-based session restrictions');
      addBulletPoint('Force logout after password change');

      addSubheader('15.4 Password Policy');
      addParagraph('Set password requirements:');
      addBulletPoint('Minimum password length');
      addBulletPoint('Required character types (uppercase, numbers, symbols)');
      addBulletPoint('Password expiry period');
      addBulletPoint('Password reuse restrictions');

      addSubheader('15.5 Security Audit Log');
      addParagraph('The security log tracks:');
      addBulletPoint('All admin login attempts');
      addBulletPoint('Security setting changes');
      addBulletPoint('Failed login attempts');
      addBulletPoint('Suspicious activity alerts');

      addTip('Review the security audit log weekly to identify potential security threats early.');

      // ============================================
      // CHAPTER 16: REPORTS & ANALYTICS
      // ============================================
      addPageBreak();
      addHeader('16. Reports & Analytics', true);

      addSubheader('16.1 Available Reports');
      addParagraph('The reports section offers various analytics:');
      addBulletPoint('Transaction Reports: Volume, fees, types breakdown');
      addBulletPoint('User Reports: Registration trends, KYC statistics');
      addBulletPoint('Financial Reports: Revenue, fees collected');
      addBulletPoint('Vault Reports: Gold holdings, storage utilization');
      addBulletPoint('Compliance Reports: AML monitoring, suspicious activity');

      addSubheader('16.2 Generating Reports');
      addParagraph('To generate a report:');
      addNumberedStep(1, 'Select the report type');
      addNumberedStep(2, 'Choose the date range');
      addNumberedStep(3, 'Apply any filters (user type, transaction type, etc.)');
      addNumberedStep(4, 'Click "Generate Report"');
      addNumberedStep(5, 'Download as PDF or Excel');

      addSubheader('16.3 Scheduled Reports');
      addParagraph('Set up automatic report generation:');
      addBulletPoint('Daily transaction summaries');
      addBulletPoint('Weekly KYC status reports');
      addBulletPoint('Monthly financial reports');
      addBulletPoint('Reports delivered to email');

      addSubheader('16.4 Dashboard Analytics');
      addParagraph('The analytics dashboard shows:');
      addBulletPoint('Real-time transaction charts');
      addBulletPoint('User growth over time');
      addBulletPoint('Gold price trends');
      addBulletPoint('Platform health metrics');

      // ============================================
      // CHAPTER 17: ADMIN CHAT & SUPPORT
      // ============================================
      addPageBreak();
      addHeader('17. Admin Chat & Support', true);

      addSubheader('17.1 Live Chat System');
      addParagraph('The admin chat allows real-time communication with users who need support. Users can initiate chats from their dashboard.');

      addSubheader('17.2 Chat Interface');
      addParagraph('The chat interface shows:');
      addBulletPoint('Active chat sessions on the left');
      addBulletPoint('Chat messages in the center');
      addBulletPoint('User information on the right');
      addBulletPoint('New message notifications');

      addSubheader('17.3 Managing Chats');
      addParagraph('For each chat session, you can:');
      addBulletPoint('View the user\'s account information');
      addBulletPoint('See their recent transactions');
      addBulletPoint('Access their KYC status');
      addBulletPoint('Review their support history');

      addSubheader('17.4 Chat Best Practices');
      addBulletPoint('Respond promptly - aim for under 2 minutes');
      addBulletPoint('Be professional and helpful');
      addBulletPoint('Never share admin-only information');
      addBulletPoint('Escalate complex issues appropriately');
      addBulletPoint('Close chats properly when resolved');

      addSubheader('17.5 Support Tickets');
      addParagraph('For issues requiring follow-up:');
      addNumberedStep(1, 'Create a support ticket from the chat');
      addNumberedStep(2, 'Assign to the appropriate team');
      addNumberedStep(3, 'Track resolution progress');
      addNumberedStep(4, 'Notify user when resolved');

      addTip('Use canned responses for common questions to speed up support while maintaining quality.');

      // ============================================
      // CHAPTER 18: TROUBLESHOOTING
      // ============================================
      addPageBreak();
      addHeader('18. Troubleshooting Guide', true);

      addSubheader('18.1 Common Issues');

      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold')
         .text('User cannot log in');
      doc.fillColor('#4b5563').fontSize(11).font('Helvetica')
         .text('Possible causes: Wrong password, account suspended, email not verified.');
      doc.moveDown(0.2);
      addBulletPoint('Check if user exists in User Management', 10);
      addBulletPoint('Verify email verification status', 10);
      addBulletPoint('Check if account is suspended', 10);
      addBulletPoint('Have user reset password if needed', 10);
      doc.moveDown(0.5);

      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold')
         .text('Transaction stuck as pending');
      doc.fillColor('#4b5563').fontSize(11).font('Helvetica')
         .text('Possible causes: Payment not confirmed, system error.');
      doc.moveDown(0.2);
      addBulletPoint('Check payment gateway for confirmation', 10);
      addBulletPoint('Verify user\'s payment proof', 10);
      addBulletPoint('Contact tech support if system issue', 10);
      doc.moveDown(0.5);

      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold')
         .text('KYC documents not loading');
      doc.fillColor('#4b5563').fontSize(11).font('Helvetica')
         .text('Possible causes: Upload failed, storage issue.');
      doc.moveDown(0.2);
      addBulletPoint('Ask user to re-upload documents', 10);
      addBulletPoint('Check storage service status', 10);
      addBulletPoint('Try a different browser', 10);
      doc.moveDown(0.5);

      addPageBreak();
      addSubheader('18.2 When to Escalate');
      addParagraph('Escalate to technical support when:');
      addBulletPoint('System-wide issues affecting multiple users');
      addBulletPoint('Payment gateway errors');
      addBulletPoint('Security incidents');
      addBulletPoint('Data discrepancies');

      addSubheader('18.3 Emergency Contacts');
      addParagraph('For urgent issues:');
      addBulletPoint('Technical Support: tech-support@finatrades.com');
      addBulletPoint('Security Team: security@finatrades.com');
      addBulletPoint('Compliance: compliance@finatrades.com');

      addSubheader('18.4 System Health Checks');
      addParagraph('Regularly verify:');
      addBulletPoint('All system status indicators are green');
      addBulletPoint('No unusual error rates in logs');
      addBulletPoint('Payment webhooks are being received');
      addBulletPoint('Scheduled tasks are running');

      // Final page - Quick Reference
      addPageBreak();
      addHeader('Quick Reference Card', true);

      addSubheader('Daily Tasks');
      addBulletPoint('Check pending KYC applications');
      addBulletPoint('Review pending transactions');
      addBulletPoint('Respond to support chats');
      addBulletPoint('Monitor dashboard statistics');

      addSubheader('Weekly Tasks');
      addBulletPoint('Run reconciliation reports');
      addBulletPoint('Review security audit logs');
      addBulletPoint('Check system status trends');
      addBulletPoint('Team sync on pending issues');

      addSubheader('Monthly Tasks');
      addBulletPoint('Generate financial reports');
      addBulletPoint('Review fee structures');
      addBulletPoint('Update CMS content if needed');
      addBulletPoint('Compliance documentation review');

      addSubheader('Keyboard Shortcuts');
      addBulletPoint('Ctrl + / : Open search');
      addBulletPoint('Escape : Close dialogs');
      addBulletPoint('R : Refresh current page');

      // Add page numbers
      addFooter();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Gold Backing Report PDF Generator
interface GoldBackingReportData {
  summary: {
    physicalGoldGrams: number;
    customerLiabilitiesGrams: number;
    backingRatio: number;
    surplus: number;
    generatedAt: string;
  };
  physicalGold: {
    totalGrams: number;
    holdings: Array<{
      vaultLocation: string;
      goldGrams: number;
      holdingsCount: number;
    }>;
  };
  customerLiabilities: {
    totalGrams: number;
    finapay: {
      count: number;
      totalGrams: number;
      users: Array<{ name: string; email: string; goldGrams: number }>;
    };
    bnsl: {
      count: number;
      availableGrams: number;
      lockedGrams: number;
      users: Array<{ name: string; email: string; availableGrams: number; lockedGrams: number }>;
    };
  };
  certificates: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export async function generateGoldBackingReportPDF(data: GoldBackingReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Gold Backing Report',
          Author: 'Finatrades',
          Subject: 'Gold Backing Verification Report',
          Creator: 'Finatrades Platform'
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PURPLE = '#8A2BE2';
      const DARK_PURPLE = '#4B0082';
      let currentPage = 1;

      const addPageHeader = () => {
        doc.rect(0, 0, doc.page.width, 80).fill(DARK_PURPLE);
        doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold')
           .text('FINATRADES', 50, 25);
        doc.fontSize(12).font('Helvetica')
           .text('Gold Backing Report', 50, 52);
        doc.moveDown(3);
      };

      const addPageFooter = () => {
        const y = doc.page.height - 40;
        doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
           .text(`Generated: ${formatDate(new Date())}`, 50, y)
           .text(`Page ${currentPage}`, doc.page.width - 100, y);
      };

      const addNewPage = () => {
        addPageFooter();
        doc.addPage();
        currentPage++;
        addPageHeader();
      };

      const drawTable = (headers: string[], rows: string[][], startY: number, columnWidths: number[]) => {
        const rowHeight = 25;
        const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
        let y = startY;

        doc.rect(50, y, tableWidth, rowHeight).fill('#f3f4f6');
        let x = 50;
        headers.forEach((header, i) => {
          doc.fillColor('#1f2937').fontSize(9).font('Helvetica-Bold')
             .text(header, x + 5, y + 8, { width: columnWidths[i] - 10 });
          x += columnWidths[i];
        });
        y += rowHeight;

        rows.forEach((row, rowIndex) => {
          if (y > doc.page.height - 100) {
            addNewPage();
            y = 100;
          }

          if (rowIndex % 2 === 0) {
            doc.rect(50, y, tableWidth, rowHeight).fill('#fafafa');
          }

          x = 50;
          row.forEach((cell, i) => {
            doc.fillColor('#374151').fontSize(9).font('Helvetica')
               .text(cell, x + 5, y + 8, { width: columnWidths[i] - 10 });
            x += columnWidths[i];
          });
          y += rowHeight;
        });

        return y;
      };

      addPageHeader();

      const statusColor = data.summary.backingRatio >= 100 ? '#22c55e' : 
                          data.summary.backingRatio >= 90 ? '#f59e0b' : '#ef4444';
      const statusText = data.summary.backingRatio >= 100 ? 'FULLY BACKED' : 
                         data.summary.backingRatio >= 90 ? 'MOSTLY BACKED' : 'UNDER-BACKED';

      doc.rect(50, 100, doc.page.width - 100, 80).fill(statusColor);
      doc.fillColor('#FFFFFF').fontSize(28).font('Helvetica-Bold')
         .text(statusText, 60, 120);
      doc.fontSize(14).font('Helvetica')
         .text(`${data.summary.backingRatio.toFixed(2)}% of customer gold is backed by physical holdings`, 60, 152);

      doc.fillColor('#1f2937').fontSize(18).font('Helvetica-Bold')
         .text('Summary Overview', 50, 200);

      doc.rect(50, 230, 240, 100).stroke('#e5e7eb');
      doc.fillColor(PURPLE).fontSize(11).font('Helvetica-Bold')
         .text('Physical Gold in Vault', 60, 245);
      doc.fillColor('#1f2937').fontSize(24).font('Helvetica-Bold')
         .text(`${formatGrams(data.summary.physicalGoldGrams)}`, 60, 270);
      doc.fillColor('#6b7280').fontSize(10).font('Helvetica')
         .text('Total physical gold stored', 60, 300);

      doc.rect(305, 230, 240, 100).stroke('#e5e7eb');
      doc.fillColor('#3b82f6').fontSize(11).font('Helvetica-Bold')
         .text('Customer Liabilities', 315, 245);
      doc.fillColor('#1f2937').fontSize(24).font('Helvetica-Bold')
         .text(`${formatGrams(data.summary.customerLiabilitiesGrams)}`, 315, 270);
      doc.fillColor('#6b7280').fontSize(10).font('Helvetica')
         .text('Total gold owed to customers', 315, 300);

      doc.rect(50, 345, 495, 60).stroke('#e5e7eb');
      doc.fillColor(data.summary.surplus >= 0 ? '#22c55e' : '#ef4444')
         .fontSize(11).font('Helvetica-Bold')
         .text(data.summary.surplus >= 0 ? 'SURPLUS' : 'DEFICIT', 60, 360);
      doc.fillColor('#1f2937').fontSize(20).font('Helvetica-Bold')
         .text(`${data.summary.surplus >= 0 ? '+' : ''}${formatGrams(data.summary.surplus)}`, 60, 380);

      doc.fillColor('#1f2937').fontSize(14).font('Helvetica-Bold')
         .text('Certificates Overview', 50, 430);
      doc.fillColor('#374151').fontSize(11).font('Helvetica')
         .text(`Total Certificates: ${data.certificates.total}`, 50, 450);
      
      let certY = 470;
      Object.entries(data.certificates.byStatus).forEach(([status, count]) => {
        doc.text(`${status}: ${count}`, 60, certY);
        certY += 15;
      });

      addNewPage();
      
      doc.fillColor('#1f2937').fontSize(18).font('Helvetica-Bold')
         .text('Physical Gold Holdings by Vault Location', 50, 100);

      const vaultHeaders = ['Vault Location', 'Gold (grams)', 'Holdings Count'];
      const vaultRows = data.physicalGold.holdings.map(h => [
        h.vaultLocation,
        formatGrams(h.goldGrams),
        h.holdingsCount.toString()
      ]);
      let tableY = drawTable(vaultHeaders, vaultRows, 130, [280, 120, 95]);

      addNewPage();
      
      doc.fillColor('#1f2937').fontSize(18).font('Helvetica-Bold')
         .text('FinaPay Wallet Holdings', 50, 100);
      doc.fillColor('#6b7280').fontSize(11).font('Helvetica')
         .text(`${data.customerLiabilities.finapay.count} accounts | Total: ${formatGrams(data.customerLiabilities.finapay.totalGrams)}`, 50, 125);

      if (data.customerLiabilities.finapay.users.length > 0) {
        const finapayHeaders = ['Name', 'Email', 'Gold (grams)'];
        const finapayRows = data.customerLiabilities.finapay.users.map(u => [
          u.name,
          u.email,
          formatGrams(u.goldGrams)
        ]);
        tableY = drawTable(finapayHeaders, finapayRows, 150, [180, 200, 115]);
      }

      if (tableY > doc.page.height - 200) {
        addNewPage();
        tableY = 100;
      } else {
        tableY += 40;
      }

      doc.fillColor('#1f2937').fontSize(18).font('Helvetica-Bold')
         .text('BNSL Account Holdings', 50, tableY);
      doc.fillColor('#6b7280').fontSize(11).font('Helvetica')
         .text(`${data.customerLiabilities.bnsl.count} accounts | Available: ${formatGrams(data.customerLiabilities.bnsl.availableGrams)} | Locked: ${formatGrams(data.customerLiabilities.bnsl.lockedGrams)}`, 50, tableY + 25);

      if (data.customerLiabilities.bnsl.users.length > 0) {
        const bnslHeaders = ['Name', 'Email', 'Available (g)', 'Locked (g)'];
        const bnslRows = data.customerLiabilities.bnsl.users.map(u => [
          u.name,
          u.email,
          formatGrams(u.availableGrams),
          formatGrams(u.lockedGrams)
        ]);
        drawTable(bnslHeaders, bnslRows, tableY + 50, [150, 180, 85, 80]);
      }

      addPageFooter();
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
