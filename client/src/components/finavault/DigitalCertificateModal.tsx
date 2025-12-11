import React, { useState } from 'react';
import { DepositRequest } from '@/types/finavault';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Award, ShieldCheck, Box, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface DigitalCertificateModalProps {
  request: DepositRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DigitalCertificateModal({ request, open, onOpenChange }: DigitalCertificateModalProps) {
  if (!request) return null;

  const certificateId = `CERT-${request.id.replace(/[^0-9]/g, '')}-${new Date().getFullYear()}`;
  const storageRef = `STR-${request.id.replace(/[^0-9]/g, '')}-WG`;
  const issueDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const [activeTab, setActiveTab] = useState('ownership');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0D0515] border-white/10 p-0 overflow-hidden flex flex-col max-h-[90vh]">
        
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

                <div className="flex flex-col md:flex-row justify-between items-center md:items-end px-8 md:px-16 mt-16 gap-8">
                  <div className="text-center">
                    <div className="h-16 flex items-end justify-center pb-2">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png" className="h-10 opacity-60 invert" alt="Signature" />
                    </div>
                    <Separator className="bg-[#D4AF37]/40 w-48 mb-2 mx-auto" />
                    <p className="text-xs text-[#D4AF37] uppercase tracking-wider">Authorized Signature</p>
                    <p className="text-[10px] text-white/40">FinaTrades Vault Operations</p>
                  </div>
                  <div className="text-center">
                     <p className="text-white font-medium mb-2">{issueDate}</p>
                     <Separator className="bg-[#D4AF37]/40 w-48 mb-2 mx-auto" />
                     <p className="text-xs text-[#D4AF37] uppercase tracking-wider">Date of Issue</p>
                     <p className="text-[10px] text-white/40">{request.vaultLocation}</p>
                  </div>
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="mt-12 flex justify-center gap-4 relative z-10 print:hidden">
                <Button className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
                <Button variant="outline" className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10">
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
                </div>

                <div className="flex justify-between items-end mt-16 pt-8 border-t border-black/20">
                  <div>
                     <div className="mb-4">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Signature_sample_2.svg/1200px-Signature_sample_2.svg.png" className="h-12 opacity-80" alt="Vault Manager Signature" />
                     </div>
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
                <Button className="bg-black text-white hover:bg-black/80 font-bold">
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
                <Button variant="outline" className="border-black/20 text-black hover:bg-black/5">
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
