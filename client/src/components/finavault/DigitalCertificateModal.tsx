import React from 'react';
import { DepositRequest } from '@/types/finavault';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Award, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface DigitalCertificateModalProps {
  request: DepositRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DigitalCertificateModal({ request, open, onOpenChange }: DigitalCertificateModalProps) {
  if (!request) return null;

  const certificateId = `CERT-${request.id.replace(/[^0-9]/g, '')}-${new Date().getFullYear()}`;
  const issueDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#0D0515] border-white/10 p-0 overflow-hidden">
        <div className="relative p-8 md:p-12 border-8 border-double border-[#D4AF37]/30 m-2">
          
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
            <h2 className="text-4xl md:text-5xl font-serif text-[#D4AF37] tracking-wider uppercase">Certificate</h2>
            <h3 className="text-xl text-white/80 font-serif tracking-widest uppercase">of Digital Ownership</h3>
            <p className="text-white/40 text-sm font-mono mt-2">ID: {certificateId}</p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-center relative z-10">
            <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
              This certifies that <strong>User #{request.userId}</strong> is the beneficial owner of the following precious metal assets, securely stored and insured at <strong>{request.vaultLocation}</strong>.
            </p>

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

            <div className="flex justify-between items-end px-8 md:px-16 mt-16">
              <div className="text-center">
                <div className="h-16 flex items-end justify-center pb-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png" className="h-10 opacity-60 invert" alt="Signature" />
                </div>
                <Separator className="bg-[#D4AF37]/40 w-48 mb-2" />
                <p className="text-xs text-[#D4AF37] uppercase tracking-wider">Authorized Signature</p>
                <p className="text-[10px] text-white/40">FinaTrades Vault Operations</p>
              </div>
              <div className="text-center">
                 <p className="text-white font-medium mb-2">{issueDate}</p>
                 <Separator className="bg-[#D4AF37]/40 w-48 mb-2" />
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
      </DialogContent>
    </Dialog>
  );
}
