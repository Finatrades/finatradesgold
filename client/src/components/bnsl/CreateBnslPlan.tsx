import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { BnslTenor, BnslPlan } from '@/types/bnsl';
import { ArrowRight, Wallet, ShieldCheck, AlertTriangle, CheckCircle2, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { generateBnslAgreement } from '@/utils/generateBnslPdf';

interface CreateBnslPlanProps {
  finaPayGoldBalance: number;
  currentGoldPrice: number;
  onSuccess: (plan: Partial<BnslPlan>) => void;
}

export default function CreateBnslPlan({ finaPayGoldBalance, currentGoldPrice, onSuccess }: CreateBnslPlanProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [goldAmount, setGoldAmount] = useState<string>('100');
  const [selectedTenor, setSelectedTenor] = useState<BnslTenor>(12);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasDownloadedDraft, setHasDownloadedDraft] = useState(false);

  // Derived Values
  const amount = parseFloat(goldAmount) || 0;
  const enrollmentPrice = currentGoldPrice;
  const basePriceComponent = amount * enrollmentPrice;
  
  const getMarginRate = (tenor: BnslTenor) => {
    switch(tenor) {
      case 12: return 0.08;
      case 24: return 0.10;
      case 36: return 0.12;
    }
  };

  const annualRate = getMarginRate(selectedTenor);
  const years = selectedTenor / 12;
  const totalMarginComponent = basePriceComponent * annualRate * years;
  const numDisbursements = selectedTenor / 3; // Quarterly
  const quarterlyMargin = totalMarginComponent / numDisbursements;

  const handleDownloadDraft = () => {
    if (amount <= 0) return;
    
    const draftPlan: Partial<BnslPlan> = {
      id: 'DRAFT-PREVIEW',
      tenorMonths: selectedTenor,
      marginRateAnnualPercent: annualRate,
      goldSoldGrams: amount,
      enrollmentPriceUsdPerGram: enrollmentPrice,
      basePriceComponentUsd: basePriceComponent,
      totalMarginComponentUsd: totalMarginComponent
    };

    const doc = generateBnslAgreement(draftPlan, user);
    doc.save(`BNSL_Agreement_Draft_${new Date().getTime()}.pdf`);
    setHasDownloadedDraft(true);
    toast({ title: "Draft Agreement Downloaded", description: "Review the full terms before confirming." });
  };

  const handleSubmit = () => {
    if (amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid gold amount.", variant: "destructive" });
      return;
    }
    if (amount > finaPayGoldBalance) {
      toast({ title: "Insufficient Funds", description: "You do not have enough gold in FinaPay.", variant: "destructive" });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: "Terms Required", description: "Please accept the Terms & Conditions.", variant: "destructive" });
      return;
    }
    if (!hasDownloadedDraft) {
      toast({ title: "Agreement Review Required", description: "Please download and review the draft agreement first.", variant: "destructive" });
      return;
    }

    const planData: Partial<BnslPlan> = {
      tenorMonths: selectedTenor,
      marginRateAnnualPercent: annualRate,
      goldSoldGrams: amount,
      enrollmentPriceUsdPerGram: enrollmentPrice,
      basePriceComponentUsd: basePriceComponent,
      totalMarginComponentUsd: totalMarginComponent,
      quarterlyMarginUsd: quarterlyMargin,
      startDate: new Date().toISOString(),
      // Maturity date calc would happen in parent or here
    };

    // Auto-generate and "store" PDF (in this mock, we just download it for the user as confirmation)
    const doc = generateBnslAgreement({ ...planData, id: `BNSL-2025-${Math.floor(Math.random() * 1000)}` }, user);
    doc.save(`BNSL_Agreement_Signed_${new Date().getTime()}.pdf`);

    onSuccess(planData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* 1. Sell Config */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-lg font-bold text-white">1. Configure Sale</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-[#8A2BE2]/10 rounded-lg text-[#8A2BE2]">
                 <Wallet className="w-5 h-5" />
               </div>
               <div>
                 <p className="text-sm text-white/60">Available in FinaPay</p>
                 <p className="font-bold text-white">{finaPayGoldBalance.toFixed(3)} g</p>
               </div>
             </div>
             <div className="text-right">
                <p className="text-sm text-white/60">Current Spot Price</p>
                <p className="font-bold text-[#D4AF37]">${currentGoldPrice.toFixed(2)}/g</p>
             </div>
          </div>

          <div className="space-y-4">
            <Label>Gold Amount to Sell (g)</Label>
            <div className="relative">
              <Input 
                type="number" 
                value={goldAmount}
                onChange={(e) => setGoldAmount(e.target.value)}
                className="bg-black/20 border-white/10 h-12 text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">g</span>
            </div>
            <p className="text-xs text-white/40">
              Enrollment Price locked at: <span className="text-white">${enrollmentPrice.toFixed(2)} / g</span>
            </p>
          </div>

        </CardContent>
      </Card>

      {/* 2. Plan Selection */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-lg font-bold text-white">2. Select Plan Tenure</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {[12, 24, 36].map((tenor) => (
               <div 
                 key={tenor}
                 onClick={() => setSelectedTenor(tenor as BnslTenor)}
                 className={`cursor-pointer relative p-6 rounded-xl border transition-all duration-200 ${
                   selectedTenor === tenor 
                     ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]' 
                     : 'bg-white/5 border-white/10 hover:bg-white/10'
                 }`}
               >
                 {selectedTenor === tenor && (
                   <div className="absolute top-3 right-3 text-[#D4AF37]">
                     <CheckCircle2 className="w-5 h-5" />
                   </div>
                 )}
                 <div className="text-center space-y-2">
                   <h3 className="text-2xl font-bold text-white">{tenor} Months</h3>
                   <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                     selectedTenor === tenor ? 'bg-[#D4AF37] text-black' : 'bg-white/10 text-white'
                   }`}>
                     {getMarginRate(tenor as BnslTenor) * 100}% p.a.
                   </div>
                 </div>
               </div>
             ))}
          </div>

          {/* Calculator Output */}
          <div className="mt-8 p-6 bg-black/30 rounded-xl border border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6">
             <div>
               <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Base Component</p>
               <p className="text-xl font-bold text-white">${basePriceComponent.toLocaleString()}</p>
               <p className="text-[10px] text-white/40">Deferred to Maturity</p>
             </div>
             <div>
               <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Margin</p>
               <p className="text-xl font-bold text-[#D4AF37]">${totalMarginComponent.toLocaleString()}</p>
               <p className="text-[10px] text-white/40">Over {selectedTenor} months</p>
             </div>
             <div>
               <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Quarterly Payout</p>
               <p className="text-xl font-bold text-[#D4AF37]">${quarterlyMargin.toLocaleString()}</p>
               <p className="text-[10px] text-white/40">Paid in Gold</p>
             </div>
             <div>
               <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Disbursements</p>
               <p className="text-xl font-bold text-white">{numDisbursements}</p>
               <p className="text-[10px] text-white/40">Total Payments</p>
             </div>
          </div>

        </CardContent>
      </Card>

      {/* 3. Terms */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-lg font-bold text-white">3. Terms & Risk Acknowledgement</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="h-40 overflow-y-auto bg-black/20 p-4 rounded-lg text-sm text-white/70 border border-white/5 space-y-3">
            <p className="font-bold text-white">Key Terms of Agreement:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You execute an immediate and irrevocable sale of physical gold to Wingold and Metals DMCC.</li>
              <li>You no longer own the sold gold; you only hold a contractual right to deferred payments.</li>
              <li>Base Price Component is paid at maturity in gold grams equivalent (or USD if elected at maturity).</li>
              <li>Margin Component is paid quarterly in gold grams based on current market price on payout date.</li>
              <li>Early termination is a breach and will incur significant fees (1% Admin) and penalties (5% of Proceeds), plus reimbursement of any margins already received.</li>
              <li>Market Price Risk: The quantity of gold received as margin fluctuates with the gold price. Higher price = fewer grams; Lower price = more grams.</li>
            </ul>
          </div>

          <div className="flex items-start gap-3 p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-lg cursor-pointer hover:bg-[#D4AF37]/10 transition-colors"
               onClick={() => setAgreedToTerms(!agreedToTerms)}>
            <Checkbox 
              checked={agreedToTerms} 
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black border-white/40"
            />
            <Label className="cursor-pointer text-white/80 leading-relaxed">
              I acknowledge that I am selling my gold to Wingold and agree to the deferred payment terms, risks, and early termination penalties outlined above.
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button 
          variant="outline" 
          onClick={handleDownloadDraft}
          className="border-white/10 hover:bg-white/5 text-white"
        >
          <Download className="w-4 h-4 mr-2" /> Download Draft Agreement
        </Button>

        <Button 
          size="lg" 
          className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold px-8"
          onClick={handleSubmit}
          disabled={!agreedToTerms || amount <= 0 || amount > finaPayGoldBalance || !hasDownloadedDraft}
        >
          Confirm & Start Plan
        </Button>
      </div>

    </div>
  );
}
