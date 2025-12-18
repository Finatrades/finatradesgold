import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BnslTenor, BnslPlan } from '@/types/bnsl';
import { ArrowRight, Wallet, ShieldCheck, AlertTriangle, CheckCircle2, FileText, Download, Loader2, Clock, TrendingUp, Calendar, PenLine, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { generateBnslAgreement } from '@/utils/generateBnslPdf';

interface TemplateVariant {
  id: string;
  tenorMonths: number;
  marginRatePercent: string;
}

interface PlanTemplate {
  id: string;
  name: string;
  description?: string;
  minGoldGrams: string;
  maxGoldGrams: string;
  earlyTerminationFeePercent: string;
  adminFeePercent: string;
  variants: TemplateVariant[];
}

interface CreateBnslPlanProps {
  bnslWalletBalance: number;
  currentGoldPrice: number;
  onSuccess: (plan: Partial<BnslPlan>, signatureData: { signatureName: string; signedAt: string }) => void;
}

const FULL_TERMS_AND_CONDITIONS = `
TERMS AND CONDITIONS FOR BNSL - BUY NOW SELL LATER PLAN
Last Updated: 09/12/2025, V3

1. INTRODUCTION AND ACCEPTANCE

These Terms and Conditions ("Terms") govern your participation in the BNSL - Buy Now Sell Later Plan ("the Plan"), administered on the Finatrades platform ("the Platform"). Under this Plan, you execute an immediate and irrevocable sale of physical gold to Wingold and Metals DMCC ("Wingold"). Payment is made in two components: (a) a deferred Base Price Component payable at maturity, and (b) a Margin Component disbursed quarterly during the Plan term.

By enrolling in the Plan, you ("the Participant," "you," "your") irrevocably agree to be bound by these Terms.

2. PLAN OVERVIEW & TRANSACTION STRUCTURE

2.1. The BNSL Plan is a Deferred Price Sale Agreement. Upon your enrollment and confirmation, you sell, and Wingold purchases, a specific quantity of physical gold. Legal title and all ownership rights to the gold transfer to Wingold immediately.

2.2. Immediate Sale and Title Transfer: The sale is effective upon Plan confirmation. You no longer own, possess, or have any claim to the specific gold sold. Your rights are strictly contractual, limited to receiving the payments outlined in these Terms.

2.3. Pricing Mechanism:
a) Base Price Component: This is the market value of the gold at the time of sale, calculated as: (Quantity of Gold Sold in grams) x (Current Market Gold Price Fixed at Enrollment). Payment of this component is deferred until maturity.
b) Margin Component: This is the additional amount paid to you by Wingold, representing a pre-agreed percentage of the Base Price Component. It is calculated as: Base Price Component x (Agreed Margin Percentage). This Margin Component is paid out during the Plan term.
c) Total Sale Proceeds: The sum of the Base Price Component and the Margin Component. This is the total amount Wingold agrees to pay you for your gold.

2.4. Value Display: Your Platform account will display:
- Contractual Entitlement: The monetary value of the Base Price Component payable at maturity.
- Margin Disbursement Schedule: The timeline and monetary value of each quarterly Margin Component disbursement.
- Accumulated Margin Gold: The total physical gold received from Margin Component disbursements.

2.5. No Banking Relationship: The Plan does not constitute a deposit, savings account, or banking product. You are purchasing Gold and selling the Gold with a guaranteed Margin, not making a financial deposit.

3. PAYMENT STRUCTURE: MARGIN & BASE PRICE

3.1. Sale Transaction: You sell a specified quantity of physical gold. The market value of this gold at the time of your enrollment is based on the Current Market Gold Price.

3.2. Base Price Component: The core value of your sale, known as the Base Price Component, is calculated by multiplying the quantity of gold sold by the Current Market Gold Price at enrollment. This entire sum represents the deferred portion of your payment and will be settled in full upon the Plan's maturity.

3.3. Margin Component & Quarterly Disbursements: An additional amount, the Margin Component, is added to your total proceeds. The annual margin applies to the Base Price Component. This amount is not paid as a lump sum; instead, it is distributed to you in equal instalments, known as Quarterly Disbursements. Each fixed monetary disbursement is automatically converted into physical gold based on the prevailing market price on the disbursement date.

3.4. Base Price Payment at Maturity: At the end of the Plan term, Wingold will settle the Base Price Component. Settlement will be made by crediting your Fina wallet with a quantity of gold grams equivalent to the Base Price Component Value divided by the Current Market Gold Price at Maturity. This credit will be completed within three (3) business days of the Maturity Date.

4. MATURITY

4.1. Maturity Definition: The Plan reaches maturity at the end of the selected term.

4.2. Automatic Settlement Process: Upon maturity, settlement of your Base Price Component occurs automatically without requiring any action from you.

4.3. Base Price Settlement: Your Base Price Component (valued at the Current Market Gold Price established at your enrollment) will be delivered to you. Wingold will credit your Fina wallet with the quantity of gold grams equal in monetary value to this Base Price Component.

4.4. Timing of Settlement: The credit of these gold grams to your Fina wallet will be completed within three (3) business days of the Maturity Date. You will receive notification confirming the settlement.

4.5. Post-Maturity Status: After maturity and settlement, your relationship under this Plan terminates. You may continue to hold the gold grams in your Fina wallet subject to the Platform's general terms and conditions.

5. EARLY TERMINATION & BREACH OF CONTRACT

5.1. The Plan is a fixed-term commitment. Early termination by the Participant before the Maturity Date is a breach of these Terms and will result in significant financial penalties.

5.2. Settlement Calculation upon Early Termination: The final settlement in gold in grams is determined as follows:

Step 1: Base Price Component Valuation. The value of your original Base Price Component is calculated based on the current market price.
- If current market price < Enrollment Price: Base Price Component is valued at current lower market price.
- If current market price >= Enrollment Price: Base Price Component is valued at original face value.

Step 2: Deduction of Fees. The total value from Step 1 has the following deductions applied:
- Administrative Fee: 1% of Total Sale Proceeds
- Early Withdrawal Penalty: 5% of Total Sale Proceeds
- Reimbursement of Quarterly Disbursements: The gross monetary value of all Margin Component disbursements received to date.

Step 3: Final In-Kind Settlement.
The remaining value after deductions is used to purchase gold at the current market price and credited to your Fina wallet.
Final Gold Grams = (Base Price Component Value - Sum of All Deductions) / Current Market Price of Gold.

5.3. Forfeiture of Rights: Upon early termination, all accrued but unpaid future Quarterly Disbursements are immediately forfeited, and you lose entitlement to the deferred Base Price Component payment for the remaining term.

5.4. Market Conditions Impact: Early termination typically results in substantial financial loss due to penalties and fee deductions, regardless of market price movements.

6. PARTICIPANT REPRESENTATIONS AND WARRANTIES

By participating, you represent, warrant, and acknowledge that:

6.1. Understanding of Transaction Structure: You fully understand that this is an immediate sale of your gold. You acknowledge the deferred payment structure and accept that early termination results in severe penalties.

6.2. Risk Acceptance: You accept all risks associated with the Plan, including variability in physical quantity of margin gold and counterparty performance risk.

6.3. No Guarantee of Value: You understand that future market value of gold received cannot be guaranteed.

6.4. Independent Decision: Your participation is based on your own independent assessment.

6.5. Financial Capacity: You have the financial capacity to sustain the entire Plan term without requiring early access to funds.

6.6. Tax Responsibilities: You are solely responsible for all tax obligations arising from this transaction.

7. RISKS AND DISCLAIMER

7.1. Early Termination Financial Risk: Exiting before maturity constitutes a breach and will result in substantial financial loss.

7.2. Margin Component Quantity Variability Risk: The physical quantity of gold received from disbursements varies inversely with market price.

7.3. Market Price Divergence Risk: If market prices rise significantly, you will not benefit from appreciation on the deferred portion of your sale proceeds.

7.4. Counterparty Risk: Your contractual claims are against Wingold. In the event of Wingold's insolvency, your ability to receive payments may be impaired.

7.5. Regulatory Risk: Changes in laws or regulations may affect the Plan or your ability to participate.
`;

export default function CreateBnslPlan({ bnslWalletBalance, currentGoldPrice, onSuccess }: CreateBnslPlanProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [goldAmount, setGoldAmount] = useState<string>('100');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasDownloadedDraft, setHasDownloadedDraft] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  
  const noTemplatesConfigured = !loadingTemplates && templates.length === 0;
  
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { apiRequest } = await import('@/lib/queryClient');
        const res = await apiRequest('GET', '/api/bnsl/templates');
        const data = await res.json();
        const activeTemplates = (data.templates || []).filter((t: PlanTemplate) => t.variants && t.variants.length > 0);
        setTemplates(activeTemplates);
        
        if (activeTemplates.length > 0) {
          setSelectedTemplateId(activeTemplates[0].id);
          if (activeTemplates[0].variants.length > 0) {
            setSelectedVariantId(activeTemplates[0].variants[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  const currentTemplate = templates.find(t => t.id === selectedTemplateId);
  const availableVariants = currentTemplate?.variants || [];
  const currentVariant = availableVariants.find(v => v.id === selectedVariantId) || availableVariants[0];

  const amount = parseFloat(goldAmount) || 0;
  const enrollmentPrice = currentGoldPrice;
  const basePriceComponent = amount * enrollmentPrice;
  
  const selectedTenor = currentVariant?.tenorMonths || 12;
  const annualRate = currentVariant ? parseFloat(currentVariant.marginRatePercent) / 100 : 0.08;
  const years = selectedTenor / 12;
  const totalMarginComponent = basePriceComponent * annualRate * years;
  const numDisbursements = selectedTenor / 3;
  const quarterlyMargin = totalMarginComponent / numDisbursements;
  const totalProceeds = basePriceComponent + totalMarginComponent;

  const handleScrollTerms = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (scrolledToBottom) {
      setHasScrolledTerms(true);
    }
  };

  const handleDownloadDraft = () => {
    if (amount <= 0) return;
    
    const draftPlan: Partial<BnslPlan> = {
      id: 'DRAFT-PREVIEW',
      tenorMonths: selectedTenor as BnslTenor,
      agreedMarginAnnualPercent: annualRate,
      goldSoldGrams: amount,
      enrollmentPriceUsdPerGram: enrollmentPrice,
      basePriceComponentUsd: basePriceComponent,
      totalMarginComponentUsd: totalMarginComponent,
      quarterlyMarginUsd: quarterlyMargin,
    };

    const doc = generateBnslAgreement(draftPlan, user);
    doc.save(`BNSL_Agreement_Draft_${new Date().getTime()}.pdf`);
    setHasDownloadedDraft(true);
    toast({ title: "Draft Agreement Downloaded", description: "Review the full terms before signing." });
  };

  const isValidSignature = signatureName.trim().length >= 3;
  const canSubmit = agreedToTerms && amount > 0 && amount <= bnslWalletBalance && hasDownloadedDraft && isValidSignature && hasScrolledTerms;

  const handleSubmit = () => {
    if (amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid gold amount.", variant: "destructive" });
      return;
    }
    if (amount > bnslWalletBalance) {
      toast({ title: "Insufficient Funds", description: "You do not have enough gold in your BNSL Wallet. Please transfer funds first.", variant: "destructive" });
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
    if (!isValidSignature) {
      toast({ title: "Signature Required", description: "Please type your full name as a digital signature.", variant: "destructive" });
      return;
    }
    if (!hasScrolledTerms) {
      toast({ title: "Please Read Terms", description: "Please scroll through and read the full Terms & Conditions.", variant: "destructive" });
      return;
    }

    const signedAt = new Date().toISOString();
    const planData: Partial<BnslPlan> = {
      tenorMonths: selectedTenor as BnslTenor,
      agreedMarginAnnualPercent: annualRate,
      goldSoldGrams: amount,
      enrollmentPriceUsdPerGram: enrollmentPrice,
      basePriceComponentUsd: basePriceComponent,
      totalMarginComponentUsd: totalMarginComponent,
      quarterlyMarginUsd: quarterlyMargin,
      startDate: new Date().toISOString(),
      earlyTerminationFeePercent: currentTemplate ? parseFloat(currentTemplate.earlyTerminationFeePercent) : 2.00,
      adminFeePercent: currentTemplate ? parseFloat(currentTemplate.adminFeePercent) : 0.50,
    };

    onSuccess(planData, { signatureName: signatureName.trim(), signedAt });
  };

  const getTenorDescription = (months: number) => {
    if (months === 12) return "Short-term plan ideal for testing the waters";
    if (months === 24) return "Balanced duration with moderate returns";
    if (months === 36) return "Maximum returns for long-term commitment";
    return `${months} month commitment`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Step 1: Configure Sale */}
      <Card className="bg-white shadow-sm border border-border" data-testid="card-configure-sale">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#8A2BE2] text-white text-sm font-bold">1</span>
            Configure Your Sale
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#8A2BE2]/5 to-[#8A2BE2]/10 rounded-lg border border-[#8A2BE2]/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#8A2BE2]/10 rounded-lg text-[#8A2BE2]">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available in BNSL Wallet</p>
                <p className="font-bold text-foreground" data-testid="text-bnsl-balance">{bnslWalletBalance.toFixed(3)} g</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Spot Price</p>
              <p className="font-bold text-[#8A2BE2]" data-testid="text-gold-price">${currentGoldPrice.toFixed(2)}/g</p>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Gold Amount to Sell</Label>
            <div className="relative">
              <Input 
                type="number" 
                value={goldAmount}
                onChange={(e) => setGoldAmount(e.target.value)}
                className={`bg-background h-14 text-xl font-bold pr-12 ${amount > bnslWalletBalance ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'}`}
                data-testid="input-gold-amount"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">g</span>
            </div>
            {amount > bnslWalletBalance && (
              <div className="flex items-center gap-2 text-sm text-red-500 font-medium" data-testid="error-insufficient-balance">
                <AlertTriangle className="w-4 h-4" />
                <span>Insufficient balance. You only have {bnslWalletBalance.toFixed(3)}g available in your BNSL Wallet.</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Your gold will be sold at the locked enrollment price of <span className="font-bold text-foreground">${enrollmentPrice.toFixed(2)}/g</span></span>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Step 2: Select Plan */}
      <Card className="bg-white shadow-sm border border-border" data-testid="card-select-plan">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#8A2BE2] text-white text-sm font-bold">2</span>
            Choose Your Plan Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading plan options...</span>
            </div>
          ) : noTemplatesConfigured ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Plans Available</h3>
              <p className="text-muted-foreground max-w-md">
                BNSL plans are not currently configured. Please contact the administrator to set up plan options.
              </p>
            </div>
          ) : (
            <>
              {templates.length > 1 && (
                <div className="mb-6">
                  <Label className="mb-2 block font-semibold">Plan Type</Label>
                  <Select value={selectedTemplateId} onValueChange={(v) => {
                    setSelectedTemplateId(v);
                    const template = templates.find(t => t.id === v);
                    if (template?.variants?.length) {
                      setSelectedVariantId(template.variants[0].id);
                    }
                  }}>
                    <SelectTrigger data-testid="select-plan-type">
                      <SelectValue placeholder="Select plan type" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentTemplate?.description && (
                    <p className="text-sm text-muted-foreground mt-2">{currentTemplate.description}</p>
                  )}
                </div>
              )}
              
              {/* Enhanced Plan Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableVariants.map((variant) => {
                  const isSelected = selectedVariantId === variant.id;
                  const variantYears = variant.tenorMonths / 12;
                  const variantRate = parseFloat(variant.marginRatePercent) / 100;
                  const variantTotalMargin = basePriceComponent * variantRate * variantYears;
                  const variantQuarterly = variantTotalMargin / (variant.tenorMonths / 3);
                  
                  return (
                    <div 
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      data-testid={`card-plan-${variant.tenorMonths}`}
                      className={`cursor-pointer relative rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                        isSelected 
                          ? 'border-[#8A2BE2] shadow-lg shadow-[#8A2BE2]/20' 
                          : 'border-border hover:border-[#8A2BE2]/50 hover:shadow-md'
                      }`}
                    >
                      {/* Header */}
                      <div className={`p-4 ${isSelected ? 'bg-[#8A2BE2]' : 'bg-muted/50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                            <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                              {variant.tenorMonths}
                            </span>
                            <span className={`text-sm ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>months</span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-6 h-6 text-white" />
                          )}
                        </div>
                      </div>
                      
                      {/* Body */}
                      <div className="p-4 space-y-4">
                        <div className="text-center">
                          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
                            isSelected ? 'bg-[#8A2BE2]/10 text-[#8A2BE2]' : 'bg-muted text-muted-foreground'
                          }`}>
                            <TrendingUp className="w-4 h-4" />
                            {variant.marginRatePercent}% p.a.
                          </div>
                        </div>
                        
                        <p className="text-xs text-center text-muted-foreground">
                          {getTenorDescription(variant.tenorMonths)}
                        </p>
                        
                        <div className="border-t border-border pt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Margin</span>
                            <span className="font-bold text-green-600">${variantTotalMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Quarterly</span>
                            <span className="font-semibold">${variantQuarterly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Payments</span>
                            <span className="font-semibold">{variant.tenorMonths / 3}x</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Summary Box - only show when plans are configured */}
          {!noTemplatesConfigured && !loadingTemplates && (
            <div className="mt-8 p-6 bg-gradient-to-br from-[#8A2BE2]/5 to-[#8A2BE2]/10 rounded-xl border border-[#8A2BE2]/20">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8A2BE2]" />
                Plan Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Base Price</p>
                  <p className="text-xl font-bold text-foreground" data-testid="text-base-price">${basePriceComponent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[10px] text-muted-foreground">Paid at maturity</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Margin</p>
                  <p className="text-xl font-bold text-green-600" data-testid="text-total-margin">${totalMarginComponent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[10px] text-muted-foreground">Over {selectedTenor} months</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Quarterly Payout</p>
                  <p className="text-xl font-bold text-[#8A2BE2]" data-testid="text-quarterly-payout">${quarterlyMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[10px] text-muted-foreground">Paid in gold</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Proceeds</p>
                  <p className="text-xl font-bold text-foreground" data-testid="text-total-proceeds">${totalProceeds.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[10px] text-muted-foreground">{numDisbursements} payments</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Terms & Conditions */}
      <Card className="bg-white shadow-sm border border-border" data-testid="card-terms">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#8A2BE2] text-white text-sm font-bold">3</span>
            Terms & Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Please read the complete terms carefully. Scroll to the bottom to continue.</span>
          </div>
          
          <div 
            className="h-64 overflow-y-auto bg-muted/30 p-4 rounded-lg text-sm text-foreground/80 border border-border font-mono whitespace-pre-wrap"
            onScroll={handleScrollTerms}
            data-testid="scroll-terms"
          >
            {FULL_TERMS_AND_CONDITIONS}
          </div>

          {hasScrolledTerms && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>You have reviewed the terms</span>
            </div>
          )}

          <div 
            className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
              agreedToTerms 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-muted/50 border border-border hover:bg-muted'
            }`}
            onClick={() => setAgreedToTerms(!agreedToTerms)}
          >
            <Checkbox 
              checked={agreedToTerms} 
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-0.5 data-[state=checked]:bg-green-600 data-[state=checked]:text-white border-muted-foreground/40"
              data-testid="checkbox-agree-terms"
            />
            <Label className="cursor-pointer text-foreground/90 leading-relaxed">
              I have read and understand the Terms & Conditions. I acknowledge that I am irrevocably selling my gold to Wingold and Metals DMCC, and I accept the deferred payment terms, risks, and early termination penalties.
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Digital Signature */}
      <Card className="bg-white shadow-sm border border-border" data-testid="card-signature">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#8A2BE2] text-white text-sm font-bold">4</span>
            Digital Signature
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <PenLine className="w-4 h-4" />
            <span>Type your full legal name below to digitally sign this agreement</span>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signature" className="font-semibold">Full Legal Name</Label>
            <Input
              id="signature"
              type="text"
              placeholder="Enter your full name as it appears on your ID"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className={`h-14 text-lg ${signatureName.length >= 3 ? 'font-signature italic' : ''}`}
              data-testid="input-signature-name"
            />
            {signatureName.length > 0 && signatureName.length < 3 && (
              <p className="text-sm text-red-500">Please enter at least 3 characters</p>
            )}
          </div>

          {isValidSignature && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-2">Signature Preview:</p>
              <p className="text-2xl italic font-serif text-foreground" data-testid="text-signature-preview">
                {signatureName}
              </p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Signed on: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
        <Button 
          variant="outline" 
          onClick={handleDownloadDraft}
          className="border-border hover:bg-muted text-foreground"
          disabled={amount <= 0}
          data-testid="button-download-draft"
        >
          <Download className="w-4 h-4 mr-2" /> 
          {hasDownloadedDraft ? 'Re-download Draft' : 'Download Draft Agreement'}
        </Button>

        <Button 
          size="lg" 
          className="bg-[#8A2BE2] text-white hover:bg-[#8A2BE2]/90 font-bold px-8"
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="button-confirm-plan"
        >
          <ShieldCheck className="w-5 h-5 mr-2" />
          Confirm & Sign Agreement
        </Button>
      </div>

      {/* Validation hints */}
      {!canSubmit && (
        <div className="text-sm text-muted-foreground space-y-1 pb-4">
          <p className="font-medium">To proceed, please complete the following:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            {amount <= 0 && <li>Enter a valid gold amount</li>}
            {amount > bnslWalletBalance && <li>Reduce amount or add more gold to your BNSL wallet</li>}
            {!hasDownloadedDraft && <li>Download and review the draft agreement</li>}
            {!hasScrolledTerms && <li>Read through the full Terms & Conditions</li>}
            {!agreedToTerms && <li>Agree to the Terms & Conditions</li>}
            {!isValidSignature && <li>Provide your digital signature</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
