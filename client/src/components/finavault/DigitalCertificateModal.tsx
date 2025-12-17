import React, { useState } from 'react';
import { DepositRequest } from '@/types/finavault';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Award, ShieldCheck, Box, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

interface DigitalCertificateModalProps {
  request: DepositRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DigitalCertificateModal({ request, open, onOpenChange }: DigitalCertificateModalProps) {
  const { toast } = useToast();
  if (!request) return null;

  const certificateId = `CERT-${request.id.replace(/[^0-9]/g, '')}-${new Date().getFullYear()}`;
  const storageRef = `STR-${request.id.replace(/[^0-9]/g, '')}-WG`;
  const issueDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const [activeTab, setActiveTab] = useState('ownership');

  const handleDownloadPDF = () => {
    const certType = activeTab === 'ownership' ? 'Digital Ownership Certificate' : 'Storage Certificate';
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    if (activeTab === 'ownership') {
      doc.setFillColor(13, 5, 21);
      doc.rect(0, 0, pageWidth, 297, 'F');
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(28);
      doc.text('CERTIFICATE', pageWidth / 2, 40, { align: 'center' });
      doc.setFontSize(14);
      doc.text('of Digital Ownership', pageWidth / 2, 52, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`ID: ${certificateId}`, pageWidth / 2, 62, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`This certifies that User #${request.userId.substring(0, 8)}...`, pageWidth / 2, 85, { align: 'center' });
      doc.text(`is the beneficial owner of the following precious metal assets.`, pageWidth / 2, 93, { align: 'center' });
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(10);
      const detailsY = 115;
      doc.text('ASSET TYPE', 30, detailsY);
      doc.text('TOTAL WEIGHT', 70, detailsY);
      doc.text('PURITY', 120, detailsY);
      doc.text('VALUATION', 160, detailsY);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(request.depositType, 30, detailsY + 10);
      doc.text(`${request.totalDeclaredWeightGrams}g`, 70, detailsY + 10);
      doc.text('999.9', 120, detailsY + 10);
      doc.text(`$${(request.totalDeclaredWeightGrams * 85.22).toFixed(2)}`, 160, detailsY + 10);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text('Issued by Finatrades | Vault: ' + request.vaultLocation, pageWidth / 2, 250, { align: 'center' });
      doc.text(issueDate, pageWidth / 2, 258, { align: 'center' });
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 297, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.text('WinGold & Metals Vault', 20, 25);
      doc.setFontSize(10);
      doc.text('Secure Logistics & Storage', 20, 33);
      doc.setFontSize(16);
      doc.text('Certificate of Deposit', pageWidth - 20, 25, { align: 'right' });
      doc.setFontSize(10);
      doc.text(`REF: ${storageRef}`, pageWidth - 20, 33, { align: 'right' });
      doc.line(20, 45, pageWidth - 20, 45);
      doc.setFontSize(10);
      doc.text('Depositor / Owner', 20, 60);
      doc.setFontSize(12);
      doc.text(`FINATRADES CLIENT #${request.userId.substring(0, 8)}`, 20, 70);
      doc.setFontSize(10);
      doc.text('Via FinaTrades Custody Account', 20, 78);
      doc.text('Storage Location', pageWidth - 20, 60, { align: 'right' });
      doc.setFontSize(12);
      doc.text(request.vaultLocation.toUpperCase(), pageWidth - 20, 70, { align: 'right' });
      doc.setFontSize(11);
      let yPos = 100;
      doc.setFillColor(0, 0, 0);
      doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Description', 25, yPos + 2);
      doc.text('Brand', 70, yPos + 2);
      doc.text('Qty', 110, yPos + 2);
      doc.text('Weight', 135, yPos + 2);
      doc.text('Purity', 170, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;
      request.items.forEach((item) => {
        doc.text(item.itemType, 25, yPos);
        doc.text(item.brand || 'Standard', 70, yPos);
        doc.text(String(item.quantity), 110, yPos);
        doc.text(`${item.totalWeightGrams}g`, 135, yPos);
        doc.text(item.purity, 170, yPos);
        yPos += 10;
      });
      doc.setFontSize(8);
      doc.text('This certificate acknowledges receipt and storage of the above precious metals.', 20, 240);
      doc.text('Assets are held in a segregated account and fully insured.', 20, 247);
      doc.text(`Issued: ${issueDate}`, pageWidth - 20, 280, { align: 'right' });
    }
    
    doc.save(`${certType.replace(/\s+/g, '_')}_${certificateId}.pdf`);
    
    toast({
      title: "Certificate Downloaded",
      description: `${certType} has been saved as PDF.`
    });
  };

  const handleShare = async () => {
    const certType = activeTab === 'ownership' ? 'Digital Ownership Certificate' : 'Storage Certificate';
    const shareData = {
      title: certType,
      text: `${certType}\nCertificate ID: ${activeTab === 'ownership' ? certificateId : storageRef}\nWeight: ${request.totalDeclaredWeightGrams}g\nValue: $${(request.totalDeclaredWeightGrams * 85.22).toFixed(2)}\nIssued: ${issueDate}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({ title: "Shared Successfully" });
      } else {
        await navigator.clipboard.writeText(shareData.text);
        toast({ title: "Copied to Clipboard", description: "Certificate details copied." });
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      try {
        await navigator.clipboard.writeText(shareData.text);
        toast({ title: "Copied to Clipboard", description: "Certificate details copied." });
      } catch {
        toast({ title: "Share Failed", description: "Could not share or copy.", variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl bg-[#0D0515] border-white/10 p-0 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Tabs for switching certificates */}
        <div className="bg-black/40 border-b border-white/10 p-4 flex justify-center sticky top-0 z-20">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="ownership" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
                <Award className="w-4 h-4 mr-2" />
                Digital Ownership
              </TabsTrigger>
              <TabsTrigger value="storage" className="data-[state=active]:bg-[#C0C0C0] data-[state=active]:text-black">
                <Box className="w-4 h-4 mr-2" />
                Storage Certificate
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-y-auto p-4 md:p-8">
          
          {/* DIGITAL OWNERSHIP CERTIFICATE */}
          {activeTab === 'ownership' && (
            <div className="relative p-8 md:p-12 border-8 border-double border-[#D4AF37]/30 m-2 bg-[#0D0515] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
              
              {/* Watermark Background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                <Award className="w-96 h-96" />
              </div>

              {/* Header */}
              <div className="text-center space-y-4 mb-12 relative z-10">
                <div className="flex justify-center mb-4">
                   <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]">
                     <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
                   </div>
                </div>
                <h2 className="text-3xl md:text-5xl font-serif text-[#D4AF37] tracking-wider uppercase">Certificate</h2>
                <h3 className="text-lg md:text-xl text-white/80 font-serif tracking-widest uppercase">of Digital Ownership</h3>
                <p className="text-white/40 text-sm font-mono mt-2">ID: {certificateId}</p>
              </div>

              {/* Content */}
              <div className="space-y-8 text-center relative z-10">
                {request.pickupDetails?.address?.includes('Ownership Changed') ? (
                  <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-6 rounded-lg mb-8">
                     <h4 className="text-[#D4AF37] font-serif text-xl mb-2 uppercase tracking-widest">Transfer of Ownership</h4>
                     <p className="text-white/80 leading-relaxed mb-4">
                       This certifies that the digital ownership of the specified assets has been legally transferred and recorded in the FinaVault Ledger.
                     </p>
                     <div className="flex items-center justify-center gap-4 text-lg font-bold text-white">
                        <div className="text-right">
                          <p className="text-xs text-[#D4AF37] font-normal uppercase tracking-wider mb-1">Transferor</p>
                          {request.pickupDetails.address.split('->')[0].replace('Ownership Changed:', '').trim()}
                        </div>
                        <div className="text-[#D4AF37]">→</div>
                        <div className="text-left">
                          <p className="text-xs text-[#D4AF37] font-normal uppercase tracking-wider mb-1">Transferee</p>
                          {request.pickupDetails.address.split('->')[1].trim()}
                        </div>
                     </div>
                  </div>
                ) : (
                  <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
                    This certifies that <strong>User #{request.userId}</strong> is the beneficial owner of the following precious metal assets, securely stored and insured at <strong>{request.vaultLocation}</strong>.
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-[#D4AF37]/20 py-8 my-8">
                  <div>
                    <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Asset Type</p>
                    <p className="text-xl font-bold text-white">{request.depositType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Total Weight</p>
                    <p className="text-xl font-bold text-white">{request.totalDeclaredWeightGrams}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Purity</p>
                    <p className="text-xl font-bold text-white">999.9</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Valuation</p>
                    <p className="text-xl font-bold text-white">${(request.totalDeclaredWeightGrams * 85.22).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-center items-center md:items-end px-8 md:px-16 mt-16 gap-8">
                  <div className="text-center">
                     <p className="text-white font-medium mb-2">{issueDate}</p>
                     <Separator className="bg-[#D4AF37]/40 w-48 mb-2 mx-auto" />
                     <p className="text-xs text-[#D4AF37] uppercase tracking-wider">Date of Issue</p>
                     <p className="text-10 text-white/40">{request.vaultLocation}</p>
                  </div>
                </div>

                <div className="mt-8 text-[10px] text-white/30 text-justify leading-relaxed px-4 md:px-0">
                  <p>
                    “This Gold Ownership Certificate is valid solely until the occurrence of the next transaction affecting the Holder’s gold balance. Upon execution of any new purchase, sale, transfer, allocation, redemption, or adjustment, this Certificate shall automatically become null and void. The updated ownership, whether increased or reduced, shall be determined exclusively by the most recent Gold Ownership Certificate issued thereafter, which supersedes all prior certificates.”
                  </p>
                  <p className="mt-4 font-bold text-white/40">
                    This Certificate is electronically generated and verified through the Platform’s secure system. It does not require any physical signature or stamp to be valid, enforceable, or effective.
                  </p>
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="mt-12 flex justify-center gap-4 relative z-10 print:hidden">
                <Button className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold" onClick={handleDownloadPDF} data-testid="button-download-ownership-cert">
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
                <Button variant="outline" className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10" onClick={handleShare} data-testid="button-share-ownership-cert">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>
            </div>
          )}

          {/* STORAGE CERTIFICATE (WinGold Style) */}
          {activeTab === 'storage' && (
            <div className="relative p-8 md:p-12 border-[1px] border-white/20 m-2 bg-white text-black shadow-2xl animate-in fade-in zoom-in-95 duration-300">
              
              {/* Watermark Background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none">
                <Box className="w-96 h-96 text-black" />
              </div>

              {/* Header */}
              <div className="flex justify-between items-start mb-12 relative z-10 border-b-2 border-black pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-black text-white flex items-center justify-center">
                    <Box className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight uppercase">WinGold & Metals Vault</h2>
                    <p className="text-xs text-black/60 font-mono tracking-widest uppercase">Secure Logistics & Storage</p>
                  </div>
                </div>
                <div className="text-right">
                   <h3 className="text-xl font-bold uppercase tracking-widest text-black/80">Certificate of Deposit</h3>
                   <p className="text-sm font-mono mt-1">REF: {storageRef}</p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6 text-left relative z-10 font-mono text-sm">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <p className="text-xs uppercase text-black/50 mb-1">Depositor / Owner</p>
                    <p className="font-bold text-lg">FINATRADES CLIENT #{request.userId}</p>
                    <p>Via FinaTrades Custody Account</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase text-black/50 mb-1">Storage Location</p>
                    <p className="font-bold text-lg">{request.vaultLocation.toUpperCase()}</p>
                    <p>High Security Zone A-14</p>
                  </div>
                </div>

                <div className="border border-black p-0">
                  <table className="w-full text-left">
                    <thead className="bg-black text-white uppercase text-xs">
                      <tr>
                        <th className="p-3 border-r border-white/20">Description</th>
                        <th className="p-3 border-r border-white/20">Serial / Brand</th>
                        <th className="p-3 border-r border-white/20 text-right">Qty</th>
                        <th className="p-3 border-r border-white/20 text-right">Weight (g)</th>
                        <th className="p-3 text-right">Purity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {request.items.map((item, idx) => (
                         <tr key={idx}>
                           <td className="p-3 border-r border-black">{item.itemType}</td>
                           <td className="p-3 border-r border-black">{item.brand || 'Standard Mint'}</td>
                           <td className="p-3 border-r border-black text-right">{item.quantity}</td>
                           <td className="p-3 border-r border-black text-right">{item.totalWeightGrams.toFixed(3)}</td>
                           <td className="p-3 text-right">{item.purity}</td>
                         </tr>
                      ))}
                      <tr className="bg-black/5 font-bold">
                         <td className="p-3 border-r border-black" colSpan={3}>TOTAL NET WEIGHT</td>
                         <td className="p-3 border-r border-black text-right">{request.totalDeclaredWeightGrams.toFixed(3)}</td>
                         <td className="p-3 text-right">Au</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-black/60 leading-relaxed mt-8 text-justify">
                  This certificate acknowledges the receipt and storage of the above-mentioned precious metals. The assets are held in a segregated account and are fully insured against all risks. Release of the assets is subject to the standard withdrawal procedures and fee settlement. WinGold & Metals Vault guarantees the weight and purity as stated upon receipt.
                  <br /><br />
                  The Certificate does not constitute a negotiable instrument, pledge, transfer of title, or guarantee of future value. It is not independently tradable or assignable and cannot be relied upon as proof of ownership beyond the balance recorded in the Platform’s official ledger.
                  <br /><br />
                  The storage balance may change upon any subsequent transaction, withdrawal, deposit, allocation, or audit adjustment, and this Certificate shall automatically become null and void upon issuance of any updated Storage Certificate. The Vault and Platform records shall prevail over any earlier certificate in the event of discrepancy.
                  <br /><br />
                  Neither the Vault Operator nor the Platform assumes liability for loss, misinterpretation, or misuse of this Certificate outside the Platform’s authenticated environment.
                </div>

                <div className="flex justify-between items-end mt-16 pt-8 border-t border-black/20">
                  <div>
                     <div className="mb-4 h-12 flex items-end">
                       <span className="font-signature text-2xl italic text-black/70" style={{ fontFamily: 'cursive' }}>M. Al-Rashid</span>
                     </div>
                     <Separator className="bg-black/40 w-32 mb-2" />
                     <p className="font-bold uppercase">Vault Manager</p>
                     <p className="text-xs text-black/50">Authorized Officer</p>
                  </div>
                  <div className="text-right">
                     <p className="font-bold">{issueDate}</p>
                     <p className="text-xs text-black/50 uppercase">Date of Issue</p>
                  </div>
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="mt-12 flex justify-center gap-4 relative z-10 print:hidden">
                <Button className="bg-black text-white hover:bg-black/80 font-bold" onClick={handleDownloadPDF} data-testid="button-download-storage-cert">
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
                <Button variant="outline" className="border-black/20 text-black hover:bg-black/5" onClick={handleShare} data-testid="button-share-storage-cert">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>

            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
