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
