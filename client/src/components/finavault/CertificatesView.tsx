import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useBranding } from '@/context/BrandingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Award, Box, ShieldCheck, Download, FileText, ChevronRight, ArrowRight, Send, Printer, ChevronDown, ChevronUp, Info, Lock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

interface BnslPlanSummary {
  id: string;
  templateName: string | null;
  tenorMonths: number;
  agreedMarginAnnualPercent: string;
  maturityDate: string;
  goldSoldGrams: string;
  totalMarginComponentUsd: string;
  status: string;
}

interface TradeCaseSummary {
  id: string;
  caseNumber: string;
  commodityType: string;
  companyName: string;
  status: string;
}

interface Certificate {
  id: string;
  certificateNumber: string;
  userId: string;
  transactionId: string | null;
  vaultHoldingId: string | null;
  type: string;
  status: 'Active' | 'Updated' | 'Cancelled' | 'Transferred' | 'Locked' | 'Released' | 'Superseded';
  goldGrams: string;
  remainingGrams: string | null;
  goldPriceUsdPerGram: string | null;
  totalValueUsd: string | null;
  issuer: string;
  vaultLocation: string | null;
  wingoldStorageRef: string | null;
  goldWalletType: 'LGPW' | 'FGPW' | null;
  fromGoldWalletType: 'LGPW' | 'FGPW' | null;
  toGoldWalletType: 'LGPW' | 'FGPW' | null;
  fromUserId: string | null;
  toUserId: string | null;
  fromUserName: string | null;
  toUserName: string | null;
  issuedAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  parentCertificateId: string | null;
  bnslPlan?: BnslPlanSummary;
  tradeCase?: TradeCaseSummary;
}

export interface CertificateDetailModalProps {
  certificate: Certificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CertificateDetailModal({ certificate, open, onOpenChange }: CertificateDetailModalProps) {
  const { toast } = useToast();
  const { settings: brandingSettings } = useBranding();
  const logoUrl = brandingSettings?.logoUrl || 'https://pub-37061337f46b4aeca26cb47a9ab5190b.r2.dev/branding/finatrades-logo-purple.png';
  const [isGenerating, setIsGenerating] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  
  if (!certificate) return null;

  const isBnslLock = certificate.type === 'BNSL Lock';
  const isPhysicalStorage = certificate.type === 'Physical Storage';
  const isDigitalOwnership = !isPhysicalStorage; // All non-physical use dark cert style
  const isOwnershipCert = certificate.type === 'Digital Ownership' || isPhysicalStorage;
  const isConversion = certificate.type === 'Conversion';
  const isTransfer = certificate.type === 'Transfer';

  const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // BLC: days remaining to maturity
  const maturityDate = certificate.expiresAt ? new Date(certificate.expiresAt) : null;
  const daysToMaturity = maturityDate ? Math.max(0, Math.ceil((maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  const maturityFormatted = maturityDate ? maturityDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  // Cert theme: indigo for BLC, gold for ownership/activity, silver for physical
  const certTheme = isBnslLock
    ? { accent: '#6366f1', accentMid: '#818cf8', border: 'rgba(99,102,241,0.4)', borderHover: 'rgba(99,102,241,0.6)', bg: '#0d0a2e' }
    : isPhysicalStorage
    ? { accent: '#C0C0C0', accentMid: '#d4d4d4', border: 'rgba(192,192,192,0.3)', borderHover: 'rgba(192,192,192,0.5)', bg: '#0D0515' }
    : { accent: '#D4AF37', accentMid: '#e8c84a', border: 'rgba(212,175,55,0.3)', borderHover: 'rgba(212,175,55,0.5)', bg: '#0D0515' };
  const originalGrams = parseFloat(certificate.goldGrams || '0');
  const remainingGrams = parseFloat(certificate.remainingGrams || certificate.goldGrams || '0');
  const goldGrams = remainingGrams; // Use remaining grams for display
  const hasPartialSurrender = remainingGrams < originalGrams;
  const totalValue = parseFloat(certificate.totalValueUsd || '0');
  
  // Fallback jsPDF-based generation (matches on-screen design)
  const generatePDFWithJsPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Dark background
    doc.setFillColor(13, 5, 21);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Border color based on type
    const borderColor = isDigitalOwnership ? [212, 175, 55] : [192, 192, 192];
    
    // Double border frame
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(2);
    doc.rect(margin - 8, margin - 8, contentWidth + 16, pageHeight - (margin * 2) + 16, 'S');
    doc.setLineWidth(0.5);
    doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin * 2) + 8, 'S');
    
    let y = margin + 15;
    
    // Shield icon (circle with checkmark)
    const shieldCenterX = pageWidth / 2;
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(1.5);
    doc.circle(shieldCenterX, y + 8, 10, 'S');
    // Checkmark
    doc.setLineWidth(1.2);
    doc.line(shieldCenterX - 4, y + 8, shieldCenterX - 1, y + 11);
    doc.line(shieldCenterX - 1, y + 11, shieldCenterX + 5, y + 4);
    y += 28;
    
    // Title
    doc.setTextColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE', pageWidth / 2, y, { align: 'center' });
    y += 12;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(isDigitalOwnership ? 'OF DIGITAL OWNERSHIP' : 'OF PHYSICAL STORAGE', pageWidth / 2, y, { align: 'center' });
    y += 12;
    
    // Certificate Number
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(9);
    doc.text(certificate.certificateNumber, pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // Status Badge
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(pageWidth / 2 - 15, y - 4, 30, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(certificate.status, pageWidth / 2, y + 2, { align: 'center' });
    y += 14;
    
    // Gold Wallet Type Badge
    if (certificate.goldWalletType) {
      const walletLabel = certificate.goldWalletType === 'LGPW' ? 'LGPW - Live Gold Price' : 'FGPW - Fixed Price Gold';
      doc.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.roundedRect(pageWidth / 2 - 35, y - 4, 70, 9, 2, 2, 'F');
      doc.setTextColor(20, 10, 30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(walletLabel, pageWidth / 2, y + 2, { align: 'center' });
      y += 10;
      
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Value follows live gold price • Backed by physical gold', pageWidth / 2, y, { align: 'center' });
      y += 14;
    }
    
    // Main certification text
    doc.setTextColor(220, 220, 220);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const mainText = `This certifies that the holder is the beneficial owner of ${goldGrams.toFixed(4)}g of fine gold, secured and recorded in the Finatrades digital ledger.`;
    const splitText = doc.splitTextToSize(mainText, contentWidth - 20);
    doc.text(splitText, pageWidth / 2, y, { align: 'center' });
    y += splitText.length * 6 + 15;
    
    // Details grid
    const detailsY = y;
    
    // Column headers
    doc.setTextColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const pdfCol4Label = certificate.type === 'Physical Storage'
      ? 'STORAGE REF'
      : certificate.goldPriceUsdPerGram ? 'GOLD PRICE' : null;
    const pdfCol4Val = certificate.type === 'Physical Storage'
      ? (certificate.wingoldStorageRef || 'N/A')
      : certificate.goldPriceUsdPerGram
      ? `$${parseFloat(certificate.goldPriceUsdPerGram).toFixed(2)}/g`
      : null;
    const numCols = pdfCol4Label ? 4 : 3;
    const colW = contentWidth / numCols;

    doc.text('GOLD WEIGHT', margin + colW * 0.5, detailsY, { align: 'center' });
    doc.text('PURITY', margin + colW * 1.5, detailsY, { align: 'center' });
    doc.text('VALUE (USD)', margin + colW * 2.5, detailsY, { align: 'center' });
    if (pdfCol4Label) doc.text(pdfCol4Label, margin + colW * 3.5, detailsY, { align: 'center' });
    
    // Column values
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${goldGrams.toFixed(4)}g`, margin + colW * 0.5, detailsY + 10, { align: 'center' });
    doc.text('999.9', margin + colW * 1.5, detailsY + 10, { align: 'center' });
    doc.text(`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + colW * 2.5, detailsY + 10, { align: 'center' });
    if (pdfCol4Val) {
      doc.setFontSize(14);
      doc.text(pdfCol4Val, margin + colW * 3.5, detailsY + 10, { align: 'center' });
    }
    y = detailsY + 25;
    
    // Separator line
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin + 20, y, pageWidth - margin - 20, y);
    y += 15;
    
    // Date and Authority
    const footerY = y;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(issueDate, margin + contentWidth * 0.25, footerY, { align: 'center' });
    doc.text(certificate.issuer || 'Finatrades Finance SA', margin + contentWidth * 0.75, footerY, { align: 'center' });
    
    doc.setTextColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('DATE OF ISSUE', margin + contentWidth * 0.25, footerY + 6, { align: 'center' });
    doc.text('ISSUING AUTHORITY', margin + contentWidth * 0.75, footerY + 6, { align: 'center' });
    y = footerY + 20;
    
    // Disclaimer
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    const disclaimer = 'This Certificate is electronically generated and verified through the Platform\'s secure system. It does not require any physical signature or stamp to be valid.';
    const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 20);
    doc.text(disclaimerLines, pageWidth / 2, y, { align: 'center' });
    
    return doc;
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      let doc: jsPDF;
      
      // Try html2canvas first for exact screen capture
      if (certificateRef.current) {
        try {
          const element = certificateRef.current;
          const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#0D0515',
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
          });
          
          const imgData = canvas.toDataURL('image/png');
          doc = new jsPDF('p', 'mm', 'a4');
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          const margin = 10;
          const maxWidth = pageWidth - (margin * 2);
          const maxHeight = pageHeight - (margin * 2);
          
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = Math.min(maxWidth / (imgWidth / 2), maxHeight / (imgHeight / 2));
          
          const finalWidth = (imgWidth / 2) * ratio;
          const finalHeight = (imgHeight / 2) * ratio;
          const x = (pageWidth - finalWidth) / 2;
          const y = (pageHeight - finalHeight) / 2;
          
          doc.setFillColor(13, 5, 21);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          doc.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
        } catch (canvasError) {
          console.warn('html2canvas failed, using jsPDF fallback:', canvasError);
          doc = generatePDFWithJsPDF();
        }
      } else {
        doc = generatePDFWithJsPDF();
      }
      
      const filename = `${certificate.type.replace(/\s+/g, '_')}_${certificate.certificateNumber}.pdf`;
      doc.save(filename);
      
      toast({
        title: "Certificate Downloaded",
        description: `${certificate.type} certificate has been saved as PDF.`
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      let doc: jsPDF;
      
      // Try html2canvas first for exact screen capture
      if (certificateRef.current) {
        try {
          const element = certificateRef.current;
          const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#0D0515',
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
          });
          
          const imgData = canvas.toDataURL('image/png');
          doc = new jsPDF('p', 'mm', 'a4');
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          const margin = 10;
          const maxWidth = pageWidth - (margin * 2);
          const maxHeight = pageHeight - (margin * 2);
          
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = Math.min(maxWidth / (imgWidth / 2), maxHeight / (imgHeight / 2));
          
          const finalWidth = (imgWidth / 2) * ratio;
          const finalHeight = (imgHeight / 2) * ratio;
          const x = (pageWidth - finalWidth) / 2;
          const y = (pageHeight - finalHeight) / 2;
          
          doc.setFillColor(13, 5, 21);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          doc.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
        } catch (canvasError) {
          console.warn('html2canvas failed for print, using jsPDF fallback:', canvasError);
          doc = generatePDFWithJsPDF();
        }
      } else {
        doc = generatePDFWithJsPDF();
      }
      
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
      
      toast({
        title: "Print Dialog Opened",
        description: "Your certificate is ready to print."
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print Failed",
        description: "Unable to generate print document.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] border-white/10 p-0 overflow-y-auto" style={{ backgroundColor: certTheme.bg }}>
        {/* Certificate content for capture - ref attached here */}
        <div 
          ref={certificateRef}
          className="relative p-8 md:p-12 border-8 border-double m-2 shadow-2xl"
          style={{ borderColor: certTheme.border, backgroundColor: certTheme.bg }}
        >
          
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            {isBnslLock ? <Lock className="w-96 h-96" /> : isDigitalOwnership ? (
              <Award className="w-96 h-96" />
            ) : (
              <Box className="w-96 h-96" />
            )}
          </div>

          <div className="text-center space-y-4 mb-10 relative z-10">
            {/* Finatrades Logo — center-top on all certificates */}
            <div className="flex justify-center mb-2 pt-2">
              <img
                src={logoUrl}
                alt="Finatrades"
                className="h-7 w-auto object-contain"
                style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border"
                style={{ backgroundColor: `${certTheme.accent}15`, borderColor: certTheme.accent }}
              >
                {isBnslLock ? (
                  <Lock className="w-8 h-8" style={{ color: certTheme.accent }} />
                ) : isDigitalOwnership ? (
                  <ShieldCheck className="w-8 h-8" style={{ color: certTheme.accent }} />
                ) : (
                  <Box className="w-8 h-8" style={{ color: certTheme.accent }} />
                )}
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif tracking-wider uppercase" style={{ color: certTheme.accent }}>
              {isBnslLock ? 'BNSL Lock' : 'Certificate'}
            </h2>
            <h3 className="text-lg text-white/80 font-serif tracking-widest uppercase">
              {isBnslLock
                ? 'BNSL Lock Certificate'
                : certificate.type === 'Trade Lock'
                ? 'Trade Lock Record'
                : certificate.type === 'Trade Release'
                ? 'Trade Release Record'
                : certificate.type === 'Conversion'
                ? (certificate.toGoldWalletType === 'FGPW' ? 'Price Protection Activated' : 'Price Protection Removed')
                : certificate.type === 'Transfer'
                ? 'Gold Transfer Record'
                : isPhysicalStorage
                ? 'of Physical Storage'
                : 'of Digital Ownership'}
            </h3>
            <p className="text-white/40 text-sm font-mono">{certificate.certificateNumber}</p>

            {/* BLC maturity panel */}
            {isBnslLock && (
              <div className="mt-4 mx-auto max-w-sm rounded-xl border p-4 text-left space-y-2" style={{ borderColor: certTheme.border, backgroundColor: `${certTheme.accent}10` }}>
                {certificate.bnslPlan?.templateName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Plan</span>
                    <span className="font-semibold text-right" style={{ color: certTheme.accentMid }}>{certificate.bnslPlan.templateName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Locked On</span>
                  <span className="font-semibold" style={{ color: certTheme.accentMid }}>
                    {new Date(certificate.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {certificate.goldPriceUsdPerGram && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Lock Price</span>
                    <span className="font-semibold" style={{ color: certTheme.accentMid }}>${parseFloat(certificate.goldPriceUsdPerGram).toFixed(2)}/g</span>
                  </div>
                )}
                {maturityFormatted && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Matures On</span>
                    <span className="font-semibold" style={{ color: certTheme.accentMid }}>{maturityFormatted}</span>
                  </div>
                )}
                {daysToMaturity !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Days Remaining</span>
                    <span className="font-bold" style={{ color: daysToMaturity <= 30 ? '#f87171' : certTheme.accentMid }}>
                      {daysToMaturity === 0 ? 'Matured' : `${daysToMaturity} days`}
                    </span>
                  </div>
                )}
                {certificate.bnslPlan?.agreedMarginAnnualPercent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Annual Return</span>
                    <span className="font-semibold" style={{ color: '#4ade80' }}>
                      +{parseFloat(certificate.bnslPlan.agreedMarginAnnualPercent).toFixed(1)}% p.a.
                      {certificate.bnslPlan.tenorMonths && ` (${certificate.bnslPlan.tenorMonths}mo plan)`}
                    </span>
                  </div>
                )}
                {(() => {
                  const plan = certificate.bnslPlan;
                  if (!plan?.goldSoldGrams || !plan?.agreedMarginAnnualPercent || !plan?.tenorMonths) return null;
                  const returnGrams = parseFloat(plan.goldSoldGrams) * (parseFloat(plan.agreedMarginAnnualPercent) / 100) * (plan.tenorMonths / 12);
                  const returnUsd = plan.totalMarginComponentUsd ? parseFloat(plan.totalMarginComponentUsd) : 0;
                  return (
                    <div className="flex justify-between text-sm border-t pt-2" style={{ borderColor: certTheme.border }}>
                      <span className="text-white/50">Expected Return</span>
                      <div className="text-right">
                        <span className="font-bold block" style={{ color: '#4ade80' }}>
                          +{returnGrams.toFixed(4)}g gold
                        </span>
                        {returnUsd > 0 && (
                          <span className="text-xs" style={{ color: '#86efac' }}>
                            ≈ +${returnUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TLC trade context panel */}
            {(certificate.type === 'Trade Lock' || certificate.type === 'Trade Release') && (
              <div className="mt-4 mx-auto max-w-sm rounded-xl border p-4 text-left space-y-2" style={{ borderColor: certTheme.border, backgroundColor: `${certTheme.accent}10` }}>
                {certificate.tradeCase?.caseNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Case #</span>
                    <span className="font-semibold" style={{ color: certTheme.accentMid }}>{certificate.tradeCase.caseNumber}</span>
                  </div>
                )}
                {certificate.tradeCase?.commodityType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Commodity</span>
                    <span className="font-semibold" style={{ color: certTheme.accentMid }}>{certificate.tradeCase.commodityType}</span>
                  </div>
                )}
                {certificate.tradeCase?.companyName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Counterparty</span>
                    <span className="font-semibold" style={{ color: certTheme.accentMid }}>{certificate.tradeCase.companyName}</span>
                  </div>
                )}
                {certificate.tradeCase?.status && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Case Status</span>
                    <span className="font-semibold" style={{ color: certTheme.accentMid }}>{certificate.tradeCase.status}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{certificate.type === 'Trade Lock' ? 'Reserved On' : 'Released On'}</span>
                  <span className="font-semibold" style={{ color: certTheme.accentMid }}>
                    {new Date(certificate.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {certificate.type === 'Trade Lock' && certificate.expiresAt && (
                  <div className="flex justify-between text-sm border-t pt-2" style={{ borderColor: certTheme.border }}>
                    <span className="text-white/50">Est. Release</span>
                    <span className="font-semibold" style={{ color: '#4ade80' }}>
                      {new Date(certificate.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <Badge variant={certificate.status === 'Active' ? 'default' : 'secondary'} className={
                certificate.status === 'Active' ? 'bg-green-600' : ''
              }>
                {certificate.status}
              </Badge>
              
              {isConversion && certificate.fromGoldWalletType && certificate.toGoldWalletType ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`px-3 py-1 ${
                      certificate.fromGoldWalletType === 'FGPW' 
                        ? 'border-blue-500 text-blue-400 bg-blue-500/10' 
                        : 'border-amber-500 text-amber-400 bg-amber-500/10'
                    }`}>
                      {certificate.fromGoldWalletType === 'FGPW' ? '🔒 Fixed' : '📈 Market'}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-white/60" />
                    <Badge variant="outline" className={`px-3 py-1 ${
                      certificate.toGoldWalletType === 'FGPW' 
                        ? 'border-blue-500 text-blue-400 bg-blue-500/10' 
                        : 'border-amber-500 text-amber-400 bg-amber-500/10'
                    }`}>
                      {certificate.toGoldWalletType === 'FGPW' ? '🔒 Fixed' : '📈 Market'}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/50 max-w-xs text-center">
                    {certificate.toGoldWalletType === 'FGPW' 
                      ? 'Converted to fixed price • Value locked at conversion rate' 
                      : 'Converted to market price • Value now follows live gold price'}
                  </p>
                </div>
              ) : certificate.goldWalletType ? (
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="outline" className={`px-3 py-1 ${
                    certificate.goldWalletType === 'FGPW' 
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10' 
                      : 'border-amber-500 text-amber-400 bg-amber-500/10'
                  }`}>
                    {certificate.goldWalletType === 'FGPW' ? '🔒 FGPW - Fixed Price Gold' : '📈 LGPW - Live Gold Price'}
                  </Badge>
                  <p className="text-xs text-white/50 max-w-xs text-center">
                    {certificate.goldWalletType === 'FGPW' 
                      ? 'Value locked at purchase price • Backed by cash reserve' 
                      : 'Value follows live gold price • Backed by physical gold'}
                  </p>
                </div>
              ) : null}
            </div>
            
            {hasPartialSurrender && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-4 text-sm">
                <p className="text-amber-400">
                  Partial Surrender: {(originalGrams - remainingGrams).toFixed(4)}g converted to FGPW
                </p>
                <p className="text-white/60 text-xs mt-1">
                  Original: {originalGrams.toFixed(4)}g → Current: {remainingGrams.toFixed(4)}g
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6 text-center relative z-10">
            {/* Show transfer parties for Transfer certificates */}
            {isTransfer && (certificate.fromUserName || certificate.toUserName) && (
              <div className="bg-white/5 rounded-lg p-4 mb-4 border" style={{ borderColor: certTheme.border }}>
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: certTheme.accent }}>Transfer of Ownership</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-white/50 mb-1">From</p>
                    <p className="font-semibold text-white">{certificate.fromUserName || 'Unknown'}</p>
                  </div>
                  <div className="text-xl" style={{ color: certTheme.accent }}>→</div>
                  <div className="text-left">
                    <p className="text-xs text-white/50 mb-1">To</p>
                    <p className="font-semibold text-white">{certificate.toUserName || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-lg text-white/80 leading-relaxed max-w-xl mx-auto">
              {isBnslLock ? (
                <>This certifies that <strong>{goldGrams.toFixed(4)}g</strong> of gold is locked in a BNSL savings plan, accumulating returns until the maturity date.</>
              ) : isConversion ? (
                <>This certifies the {certificate.toGoldWalletType === 'FGPW' ? 'activation of price protection' : 'removal of price protection'} for <strong>{goldGrams.toFixed(4)}g</strong> of gold in the Finatrades ledger.</>
              ) : isTransfer ? (
                <>This certifies the transfer of <strong>{goldGrams.toFixed(4)}g</strong> of fine gold between Finatrades users.</>
              ) : isPhysicalStorage ? (
                <>This certifies that <strong>{goldGrams.toFixed(4)}g</strong> of physical gold is securely stored at <strong>{certificate.vaultLocation}</strong> under custody of <strong>{certificate.issuer}</strong>.</>
              ) : (
                <>This certifies that the holder is the beneficial owner of <strong>{goldGrams.toFixed(4)}g</strong> of fine gold, secured and recorded in the Finatrades digital ledger.</>
              )}
            </p>

            {(() => {
              const col4Label = isPhysicalStorage
                ? 'Storage Ref'
                : (isConversion || isBnslLock || certificate.goldPriceUsdPerGram)
                ? (isBnslLock ? 'Maturity' : 'Gold Price')
                : null;
              const col4Value = isPhysicalStorage
                ? certificate.wingoldStorageRef || 'N/A'
                : isBnslLock
                ? (maturityFormatted || 'N/A')
                : certificate.goldPriceUsdPerGram
                ? `$${parseFloat(certificate.goldPriceUsdPerGram).toFixed(2)}/g`
                : null;
              const labelStyle = { color: certTheme.accent };
              return (
                <div className={`grid gap-4 border-y py-6 my-6 ${
                  col4Label ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'
                }`} style={{ borderColor: certTheme.border }}>
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={labelStyle}>Gold Weight</p>
                    <p className="text-xl font-bold text-white">{goldGrams.toFixed(4)}g</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={labelStyle}>Purity</p>
                    <p className="text-xl font-bold text-white">999.9</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={labelStyle}>Value (USD)</p>
                    <p className="text-xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  {col4Label && (
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={labelStyle}>{col4Label}</p>
                      <p className={`font-bold text-white ${isPhysicalStorage ? 'text-sm font-mono' : isBnslLock ? 'text-sm' : 'text-xl'}`}>
                        {col4Value}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-8 mt-8">
              <div className="text-center">
                <p className="text-white font-medium mb-1">{issueDate}</p>
                <Separator className="w-32 mb-1 mx-auto" style={{ backgroundColor: `${certTheme.accent}50` }} />
                <p className="text-xs uppercase tracking-wider" style={{ color: certTheme.accent }}>Date of Issue</p>
              </div>
              <div className="text-center">
                <p className="text-white font-medium mb-1">{certificate.issuer}</p>
                <Separator className="w-32 mb-1 mx-auto" style={{ backgroundColor: `${certTheme.accent}50` }} />
                <p className="text-xs uppercase tracking-wider" style={{ color: certTheme.accent }}>Issuing Authority</p>
              </div>
            </div>

            <div className="mt-8 text-[10px] text-white/30 text-center leading-relaxed">
              <p>
                This Certificate is electronically generated and verified through the Platform's secure system. 
                It does not require any physical signature or stamp to be valid.
              </p>
            </div>
          </div>
        </div>
        
        {/* Buttons outside ref so they don't appear in PDF */}
        <div className="flex justify-center gap-4 pb-6" style={{ backgroundColor: certTheme.bg }}>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-white/20 text-white hover:bg-white/10"
            disabled={isGenerating}
            onClick={handleDownloadPDF}
            data-testid="button-download-certificate-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-white/20 text-white hover:bg-white/10"
            disabled={isGenerating}
            onClick={handlePrint}
            data-testid="button-print-certificate"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CertificatesView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return { certificates: [], activeCertificates: [] };
      const res = await fetch(`/api/certificates/${user.id}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch certificates');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const certificates: Certificate[] = data?.certificates || [];
  const activeCertificates: Certificate[] = data?.activeCertificates || [];

  const [showSupersededOwnership, setShowSupersededOwnership] = useState(false);

  const OWNERSHIP_TYPES = ['Digital Ownership', 'Physical Storage'];
  const ownershipCerts = certificates.filter(c => OWNERSHIP_TYPES.includes(c.type));
  const activityRecords = certificates.filter(c => !OWNERSHIP_TYPES.includes(c.type));

  // "Current" = Active leaf nodes in the ownership lineage chain.
  // A cert is a leaf if no other Active cert lists it as a parent (i.e. it hasn't been superseded).
  const activeOwnershipParentIds = new Set(
    ownershipCerts
      .filter(c => c.status === 'Active' && c.parentCertificateId)
      .map(c => c.parentCertificateId as string)
  );
  const currentOwnershipCerts = ownershipCerts.filter(
    c => c.status === 'Active' && !activeOwnershipParentIds.has(c.id)
  );
  const historicalOwnershipCerts = ownershipCerts.filter(
    c => c.status !== 'Active' || activeOwnershipParentIds.has(c.id)
  );

  const openCertificate = (cert: Certificate) => {
    setSelectedCertificate(cert);
    setModalOpen(true);
  };

  const handlePrintAllCertificates = async () => {
    const activeCerts = certificates.filter(c => c.status === 'Active');
    if (activeCerts.length === 0) {
      toast({
        title: "No Certificates",
        description: "No active certificates to print.",
        variant: "destructive"
      });
      return;
    }

    setIsPrinting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      activeCerts.forEach((cert, index) => {
        if (index > 0) doc.addPage();
        
        const isDigital = cert.type !== 'Physical Storage';
        const goldGrams = parseFloat(cert.remainingGrams || cert.goldGrams || '0');
        const totalValue = parseFloat(cert.totalValueUsd || '0');
        const issueDate = new Date(cert.issuedAt).toLocaleDateString('en-US', { 
          day: 'numeric', month: 'long', year: 'numeric' 
        });

        if (isDigital) {
          doc.setFillColor(13, 5, 21);
          doc.rect(0, 0, pageWidth, 297, 'F');
          
          doc.setTextColor(212, 175, 55);
          doc.setFontSize(28);
          doc.text('CERTIFICATE', pageWidth / 2, 40, { align: 'center' });
          doc.setFontSize(14);
          doc.text('of Digital Ownership', pageWidth / 2, 52, { align: 'center' });
          
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.text(cert.certificateNumber, pageWidth / 2, 62, { align: 'center' });
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.text(`This certifies that the holder is the beneficial owner of`, pageWidth / 2, 85, { align: 'center' });
          doc.text(`${goldGrams.toFixed(4)}g of fine gold, secured in the Finatrades ledger.`, pageWidth / 2, 93, { align: 'center' });
          
          doc.setTextColor(212, 175, 55);
          doc.setFontSize(10);
          const detailsY = 115;
          doc.text('GOLD WEIGHT', 30, detailsY);
          doc.text('PURITY', 75, detailsY);
          doc.text('VALUE (USD)', 120, detailsY);
          doc.text('ISSUER', 165, detailsY);
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.text(`${goldGrams.toFixed(4)}g`, 30, detailsY + 10);
          doc.text('999.9', 75, detailsY + 10);
          doc.text(`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 120, detailsY + 10);
          doc.text(cert.issuer, 165, detailsY + 10);
          
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(8);
          doc.text(`Issued: ${issueDate}`, pageWidth / 2, 250, { align: 'center' });
        } else {
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageWidth, 297, 'F');
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(20);
          doc.text('CERTIFICATE', pageWidth / 2, 30, { align: 'center' });
          doc.setFontSize(14);
          doc.text('of Physical Storage', pageWidth / 2, 40, { align: 'center' });
          
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(cert.certificateNumber, pageWidth / 2, 50, { align: 'center' });
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);
          doc.text(`This certifies that ${goldGrams.toFixed(4)}g of physical gold is securely stored at`, pageWidth / 2, 75, { align: 'center' });
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(cert.vaultLocation || 'N/A', pageWidth / 2, 85, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          
          doc.setDrawColor(0, 0, 0);
          doc.rect(30, 110, pageWidth - 60, 50);
          
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text('GOLD WEIGHT', 40, 125);
          doc.text('PURITY', 80, 125);
          doc.text('VALUE (USD)', 120, 125);
          doc.text('STORAGE REF', 160, 125);
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);
          doc.text(`${goldGrams.toFixed(4)}g`, 40, 140);
          doc.text('999.9', 80, 140);
          doc.text(`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 120, 140);
          doc.text(cert.wingoldStorageRef || 'N/A', 160, 140);
          
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Issued: ${issueDate}`, 40, 200);
        }
      });

      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');

      toast({
        title: "Print Dialog Opened",
        description: `${activeCerts.length} certificate(s) ready to print.`
      });
    } catch (error) {
      toast({
        title: "Print Failed",
        description: "Unable to generate print document.",
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // Show loading if user auth is pending OR initial query load (no data yet)
  const isInitialLoading = !user?.id || (isLoading && !data);
  
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'active') return <Badge className="text-[10px] bg-green-600 text-white border-0">Active</Badge>;
    if (s === 'locked') return <Badge className="text-[10px] bg-amber-500 text-white border-0">Locked</Badge>;
    if (s === 'released') return <Badge variant="secondary" className="text-[10px] bg-gray-200 text-gray-600 border-0">Released</Badge>;
    if (s === 'transferred') return <Badge className="text-[10px] bg-blue-500 text-white border-0">Transferred</Badge>;
    if (s === 'superseded' || s === 'updated') return <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-600 border-0">Superseded</Badge>;
    if (s === 'cancelled') return <Badge variant="secondary" className="text-[10px] bg-gray-200 text-gray-500 border-0">Cancelled</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  };

  const renderCertRow = (cert: Certificate, isCurrent?: boolean, compact?: boolean) => {
    const isStorage = cert.type === 'Physical Storage';
    const isBnsl = cert.type === 'BNSL Lock';
    const isConv = cert.type === 'Conversion';
    const isTrans = cert.type === 'Transfer';
    const isTrade = cert.type === 'Trade Lock' || cert.type === 'Trade Release';
    const goldGrams = parseFloat(cert.remainingGrams || cert.goldGrams || '0');
    const originalGrams = parseFloat(cert.goldGrams || '0');
    const hasPartialSurrender = goldGrams < originalGrams;
    const totalValue = parseFloat(cert.totalValueUsd || '0');

    const label = isConv && cert.toGoldWalletType
      ? (cert.toGoldWalletType === 'FGPW' ? 'Price Protection Activated' : 'Price Protection Removed')
      : isBnsl ? 'BNSL Lock Certificate'
      : isTrans ? 'Gold Transfer'
      : cert.type === 'Trade Lock' ? 'Trade Lock'
      : cert.type === 'Trade Release' ? 'Trade Release'
      : cert.type;

    const iconBg = isBnsl ? 'bg-indigo-100' : isStorage ? 'bg-gray-100' : isConv ? 'bg-amber-100' : isTrans ? 'bg-orange-100' : isTrade ? 'bg-teal-100' : 'bg-purple-100';
    const iconColor = isBnsl ? 'text-indigo-600' : isStorage ? 'text-gray-500' : isConv ? 'text-amber-600' : isTrans ? 'text-orange-600' : isTrade ? 'text-teal-600' : 'text-fuchsia-600';
    const labelColor = isBnsl ? 'text-indigo-700' : isStorage ? 'text-gray-600' : isConv ? 'text-amber-700' : isTrans ? 'text-orange-600' : isTrade ? 'text-teal-700' : 'text-fuchsia-600';

    const expiresAt = cert.expiresAt ? new Date(cert.expiresAt) : null;
    const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

    const planName = cert.bnslPlan?.templateName;
    const expectedReturn = cert.bnslPlan?.totalMarginComponentUsd
      ? `+$${parseFloat(cert.bnslPlan.totalMarginComponentUsd).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD return`
      : null;

    return (
      <div
        key={cert.id}
        className={`${compact ? 'p-3' : 'p-4'} rounded-xl border hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 ${isCurrent ? 'bg-white border-purple-200 ring-1 ring-purple-100' : cert.status === 'Active' ? 'bg-white' : 'opacity-70 bg-gray-50'} ${compact ? 'border-gray-100' : ''}`}
        onClick={() => openCertificate(cert)}
        data-testid={`certificate-card-${cert.id}`}
      >
        <div className={`${compact ? 'w-8 h-8' : 'w-11 h-11'} rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          {isBnsl ? <Lock className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${iconColor}`} /> :
           isStorage ? <Box className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${iconColor}`} /> :
           isTrans ? <Send className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${iconColor}`} /> :
           <Award className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${iconColor}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'} ${compact ? 'text-gray-600' : labelColor}`}>{label}</span>
            {statusBadge(cert.status)}
            {isCurrent && (
              <Badge className="text-[10px] bg-purple-100 text-purple-700 border border-purple-300">Current</Badge>
            )}
            {isBnsl && daysLeft !== null && daysLeft <= 30 && (
              <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600 bg-orange-50">
                {daysLeft === 0 ? 'Matured' : `${daysLeft}d left`}
              </Badge>
            )}
          </div>
          {isTrans && (cert.fromUserName || cert.toUserName) ? (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {cert.fromUserName || 'Unknown'} <ArrowRight className="w-3 h-3 inline" /> {cert.toUserName || 'Unknown'}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs truncate mt-0.5">{cert.certificateNumber}</p>
          )}
          {isBnsl && planName && (
            <p className="text-xs text-indigo-600 mt-0.5 font-medium">{planName}{expectedReturn && <span className="text-green-600 ml-2">{expectedReturn}</span>}</p>
          )}
          {isBnsl && expiresAt && (
            <p className="text-xs text-indigo-400 mt-0.5">
              Matures {expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {isTrade && cert.tradeCase && (
            <p className="text-xs text-teal-600 mt-0.5">Case #{cert.tradeCase.caseNumber} · {cert.tradeCase.commodityType}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-sm text-foreground">{goldGrams.toFixed(4)}g</p>
          {hasPartialSurrender && <p className="text-amber-500 text-[10px]">of {originalGrams.toFixed(4)}g</p>}
          <p className="text-muted-foreground text-xs">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="certificates-view">

      {/* Plain-English Explainer */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          onClick={() => setShowExplainer(!showExplainer)}
          data-testid="btn-toggle-explainer"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info className="w-4 h-4 text-amber-500" />
            What are certificates and why do I have them?
          </span>
          {showExplainer ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showExplainer && (
          <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-3 border-t border-border pt-4">
            <p><strong className="text-foreground">Ownership Certificates</strong> are permanent proof that you own gold. Every time you buy or deposit gold, you receive a <em>Digital Ownership Certificate</em> (your right to the gold) and a <em>Physical Storage Certificate</em> (confirming your gold sits in a real vault).</p>
            <p><strong className="text-foreground">Activity Records</strong> are receipts for actions you take on your gold — locking it in a BNSL savings plan, activating price protection, sending gold to another user, or engaging in a trade. They are not proof of current ownership but form an auditable history of every movement.</p>
            <p>Certificates can be downloaded as PDFs and are legally verifiable through the Finatrades platform.</p>
          </div>
        )}
      </div>

      {/* Section 1: Ownership Certificates */}
      <Card className="bg-white border">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" /> Ownership Certificates
              </CardTitle>
              <p className="text-muted-foreground text-xs mt-0.5">Proof of gold ownership — Digital and Physical</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintAllCertificates}
                disabled={isPrinting || activeCertificates.length === 0}
                data-testid="button-print-all-certificates"
              >
                <Printer className="w-4 h-4 mr-2" />
                {isPrinting ? 'Generating...' : 'Print All'}
              </Button>
              <Badge variant="outline" className="text-fuchsia-600 border-purple-500">
                {activeCertificates.length} Active
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {ownershipCerts.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No ownership certificates yet. They are issued when you buy or deposit gold.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentOwnershipCerts.map(cert => renderCertRow(cert, true))}
              {historicalOwnershipCerts.length > 0 && (
                <>
                  <button
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-gray-700 transition-colors"
                    onClick={() => setShowSupersededOwnership(v => !v)}
                    data-testid="btn-toggle-ownership-history"
                  >
                    {showSupersededOwnership ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showSupersededOwnership ? 'Hide' : 'Show'} previous versions ({historicalOwnershipCerts.length})
                  </button>
                  {showSupersededOwnership && historicalOwnershipCerts.map(cert => renderCertRow(cert, false))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Activity Records */}
      <Card className="bg-white border">
        <CardHeader className="border-b pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" /> Activity Records
            </CardTitle>
            <p className="text-muted-foreground text-xs mt-0.5">BNSL locks, price protection, transfers, and trade activity</p>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {activityRecords.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No activity records yet. Records are created when you lock gold, activate price protection, or transfer gold.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activityRecords.map(cert => renderCertRow(cert, false, true))}
            </div>
          )}
        </CardContent>
      </Card>

      <CertificateDetailModal
        certificate={selectedCertificate}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
