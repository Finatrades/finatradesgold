import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BnslTenor, BnslPlan } from '@/types/bnsl';
import { 
  ArrowLeft, ArrowRight, Wallet, Shield, Clock, TrendingUp, 
  CheckCircle2, FileText, Download, Loader2, AlertTriangle,
  Coins, Calendar, PenLine, ChevronDown, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { generateBnslAgreement } from '@/utils/generateBnslPdf';
import { useLocation } from 'wouter';

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

interface MobileCreateBnslPlanProps {
  bnslWalletBalance: number;
  currentGoldPrice: number;
  onSuccess: (plan: Partial<BnslPlan>, signatureData: { signatureName: string; signedAt: string }) => void;
  onBack: () => void;
}

const STEPS = ['Amount', 'Plan', 'Terms', 'Confirm'];

export default function MobileCreateBnslPlan({ 
  bnslWalletBalance, 
  currentGoldPrice, 
  onSuccess,
  onBack 
}: MobileCreateBnslPlanProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [inputMode, setInputMode] = useState<'grams' | 'usd'>('grams');
  const [inputValue, setInputValue] = useState('');
  
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [hasDownloadedDraft, setHasDownloadedDraft] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

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
          const defaultVariant = activeTemplates[0].variants.find((v: TemplateVariant) => v.tenorMonths === 24) || activeTemplates[0].variants[0];
          if (defaultVariant) {
            setSelectedVariantId(defaultVariant.id);
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

  const numericInput = parseFloat(inputValue) || 0;
  const goldAmount = inputMode === 'grams' ? numericInput : (currentGoldPrice > 0 ? numericInput / currentGoldPrice : 0);
  const basePriceUsd = goldAmount * currentGoldPrice;
  
  const selectedTenor = currentVariant?.tenorMonths || 12;
  const annualRatePercent = currentVariant ? parseFloat(currentVariant.marginRatePercent) : 10;
  const years = selectedTenor / 12;
  const totalMarginUsd = basePriceUsd * (annualRatePercent / 100) * years;
  const quarterlyMarginUsd = totalMarginUsd / (selectedTenor / 3);
  const totalProceeds = basePriceUsd + totalMarginUsd;

  const isValidSignature = signatureName.trim().length >= 3;
  const canProceedStep0 = goldAmount > 0 && goldAmount <= bnslWalletBalance;
  const canProceedStep1 = selectedVariantId !== '';
  const canProceedStep2 = agreedToTerms && hasScrolledTerms;
  const canProceedStep3 = isValidSignature && hasDownloadedDraft;

  const canProceed = [canProceedStep0, canProceedStep1, canProceedStep2, canProceedStep3][currentStep];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleDownloadDraft = () => {
    if (goldAmount <= 0) return;
    
    const draftPlan: Partial<BnslPlan> = {
      id: 'DRAFT-PREVIEW',
      tenorMonths: selectedTenor as BnslTenor,
      agreedMarginAnnualPercent: annualRatePercent,
      goldSoldGrams: goldAmount,
      enrollmentPriceUsdPerGram: currentGoldPrice,
      basePriceComponentUsd: basePriceUsd,
      totalMarginComponentUsd: totalMarginUsd,
      quarterlyMarginUsd: quarterlyMarginUsd,
    };

    const doc = generateBnslAgreement(draftPlan, user);
    doc.save(`BNSL_Agreement_Draft_${new Date().getTime()}.pdf`);
    setHasDownloadedDraft(true);
    toast({ title: "Draft Downloaded", description: "Review the agreement before signing." });
  };

  const handleSubmit = () => {
    if (!canProceedStep3) return;

    const signedAt = new Date().toISOString();
    const planData: Partial<BnslPlan> = {
      tenorMonths: selectedTenor as BnslTenor,
      agreedMarginAnnualPercent: annualRatePercent,
      goldSoldGrams: goldAmount,
      enrollmentPriceUsdPerGram: currentGoldPrice,
      basePriceComponentUsd: basePriceUsd,
      totalMarginComponentUsd: totalMarginUsd,
      quarterlyMarginUsd: quarterlyMarginUsd,
    };

    onSuccess(planData, { signatureName: signatureName.trim(), signedAt });
  };

  const handleScrollTerms = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (scrolledToBottom) {
      setHasScrolledTerms(true);
    }
  };

  if (loadingTemplates) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-50 to-white">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Plans Available</h2>
        <p className="text-muted-foreground text-center mb-6">BNSL plans are not currently configured.</p>
        <Button onClick={onBack} variant="outline">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50/30 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-purple-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-purple-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-purple-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-purple-900">Join BNSL Plan</h1>
            <p className="text-xs text-muted-foreground">Step {currentStep + 1} of 4 · {STEPS[currentStep]}</p>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-purple-600' : i < currentStep ? 'bg-purple-400' : 'bg-purple-200'
                }`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-4 space-y-5"
            >
              {/* Wallet Card */}
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-1 opacity-80">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm">BNSL Wallet Balance</span>
                </div>
                <p className="text-3xl font-bold">{bnslWalletBalance.toFixed(3)}g</p>
                <p className="text-sm opacity-70 mt-1">≈ ${(bnslWalletBalance * currentGoldPrice).toFixed(2)}</p>
              </div>

              {/* Amount Input */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-gray-800">Gold to Sell</span>
                  <div className="flex bg-purple-100 rounded-lg p-1">
                    <button 
                      onClick={() => { setInputMode('grams'); setInputValue(''); }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        inputMode === 'grams' ? 'bg-purple-600 text-white shadow' : 'text-purple-700'
                      }`}
                    >
                      Grams
                    </button>
                    <button 
                      onClick={() => { setInputMode('usd'); setInputValue(''); }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        inputMode === 'usd' ? 'bg-purple-600 text-white shadow' : 'text-purple-700'
                      }`}
                    >
                      USD
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="0"
                    className={`text-center text-4xl font-bold h-20 border-2 rounded-xl ${
                      goldAmount > bnslWalletBalance ? 'border-red-400 bg-red-50' : 'border-purple-200 focus:border-purple-500'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-medium">
                    {inputMode === 'grams' ? 'g' : '$'}
                  </span>
                </div>

                <button 
                  onClick={() => setInputValue(inputMode === 'grams' ? bnslWalletBalance.toFixed(4) : (bnslWalletBalance * currentGoldPrice).toFixed(2))}
                  className="mt-3 text-sm text-purple-600 font-medium"
                >
                  Use Max: {inputMode === 'grams' ? `${bnslWalletBalance.toFixed(3)}g` : `$${(bnslWalletBalance * currentGoldPrice).toFixed(2)}`}
                </button>

                {goldAmount > bnslWalletBalance && (
                  <p className="text-red-500 text-sm mt-3 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Insufficient balance
                  </p>
                )}
              </div>

              {/* Conversion Display */}
              {numericInput > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-purple-50 rounded-2xl p-4 border border-purple-200"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700 font-medium">You're selling</span>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-900">{goldAmount.toFixed(4)}g</p>
                      <p className="text-sm text-purple-600">≈ ${basePriceUsd.toFixed(2)}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Price Lock Info */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 text-sm">Price Lock Protection</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Today's price ${currentGoldPrice.toFixed(2)}/g will be locked for your plan.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-4 space-y-4"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Choose Your Plan</h2>
                <p className="text-muted-foreground text-sm mt-1">Select duration for your gold sale</p>
              </div>

              {/* Plan Cards */}
              <div className="space-y-3">
                {availableVariants.map((variant, index) => {
                  const isSelected = selectedVariantId === variant.id;
                  const variantYears = variant.tenorMonths / 12;
                  const variantRate = parseFloat(variant.marginRatePercent) / 100;
                  const variantTotalMargin = basePriceUsd * variantRate * variantYears;
                  const variantQuarterly = variantTotalMargin / (variant.tenorMonths / 3);
                  const isRecommended = variant.tenorMonths === 24;
                  
                  return (
                    <motion.div 
                      key={variant.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`relative rounded-2xl overflow-hidden transition-all duration-200 ${
                        isSelected 
                          ? 'ring-2 ring-purple-600 shadow-lg shadow-purple-200' 
                          : 'border-2 border-gray-200'
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Popular
                        </div>
                      )}
                      
                      <div className={`p-4 ${isSelected ? 'bg-purple-50' : 'bg-white'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              <Clock className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-gray-900">{variant.tenorMonths} <span className="text-base font-normal text-gray-500">months</span></p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <TrendingUp className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-green-600'}`} />
                                <span className={`font-bold ${isSelected ? 'text-purple-600' : 'text-green-600'}`}>
                                  {variant.marginRatePercent}% p.a.
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                        </div>

                        {goldAmount > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Total Margin</p>
                              <p className="font-bold text-green-600">${variantTotalMargin.toFixed(0)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Quarterly</p>
                              <p className="font-bold text-gray-800">${variantQuarterly.toFixed(0)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Payouts</p>
                              <p className="font-bold text-gray-800">{variant.tenorMonths / 3}x</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Summary */}
              {goldAmount > 0 && currentVariant && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white mt-6"
                >
                  <p className="text-sm opacity-80 mb-2">Your Plan Summary</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs opacity-70">Selling</p>
                      <p className="text-lg font-bold">{goldAmount.toFixed(3)}g</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">Base Value</p>
                      <p className="text-lg font-bold">${basePriceUsd.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">Total Margin</p>
                      <p className="text-lg font-bold text-green-300">+${totalMarginUsd.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">Total Proceeds</p>
                      <p className="text-lg font-bold">${totalProceeds.toFixed(0)}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-4 space-y-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Key Terms</h2>
                <p className="text-muted-foreground text-sm mt-1">Review important information</p>
              </div>

              {/* Key Terms Cards */}
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Quarterly Payouts</p>
                    <p className="text-sm text-muted-foreground">Receive margin payments every 3 months in gold grams</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Base Price at Maturity</p>
                    <p className="text-sm text-muted-foreground">Your base value is returned in gold at end of term</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Early Termination: 2% Fee</p>
                    <p className="text-sm text-muted-foreground">Exiting early incurs penalties and margin reimbursement</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Admin Fee: 0.5%</p>
                    <p className="text-sm text-muted-foreground">One-time administrative fee on total proceeds</p>
                  </div>
                </div>
              </div>

              {/* Full Terms */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <button 
                  onClick={() => setShowFullTerms(!showFullTerms)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <span className="font-semibold text-gray-900">Full Terms & Conditions</span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showFullTerms ? 'rotate-180' : ''}`} />
                </button>
                
                {showFullTerms && (
                  <ScrollArea 
                    className="h-48 px-4 pb-4"
                    onScrollCapture={handleScrollTerms}
                  >
                    <div className="text-xs text-muted-foreground space-y-2 pr-4">
                      <p><strong>1. INTRODUCTION:</strong> These Terms govern your participation in the BNSL Plan. By enrolling, you sell physical gold to Wingold and Metals DMCC with deferred payment.</p>
                      <p><strong>2. PAYMENT STRUCTURE:</strong> Base Price Component paid at maturity; Margin Component paid quarterly in gold grams.</p>
                      <p><strong>3. EARLY TERMINATION:</strong> Exiting before maturity results in 2% penalty, 0.5% admin fee, and reimbursement of all margin received.</p>
                      <p><strong>4. RISKS:</strong> You accept counterparty risk, market price variability, and liquidity constraints.</p>
                      <p><strong>5. TITLE TRANSFER:</strong> Gold ownership transfers immediately to Wingold upon enrollment.</p>
                      <p className="pt-2 font-medium text-gray-700">Scroll to bottom to accept terms ↓</p>
                    </div>
                  </ScrollArea>
                )}
              </div>

              {hasScrolledTerms && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200"
                >
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 leading-tight">
                    I have read, understood, and agree to the Terms & Conditions
                  </label>
                </motion.div>
              )}

              {!hasScrolledTerms && showFullTerms && (
                <p className="text-center text-sm text-muted-foreground">
                  Scroll through terms to continue
                </p>
              )}
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-4 space-y-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Confirm & Sign</h2>
                <p className="text-muted-foreground text-sm mt-1">Review your plan and sign digitally</p>
              </div>

              {/* Plan Review */}
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-4 opacity-80">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Plan Summary</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="opacity-80">Gold Amount</span>
                    <span className="font-bold">{goldAmount.toFixed(4)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Duration</span>
                    <span className="font-bold">{selectedTenor} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Annual Rate</span>
                    <span className="font-bold">{annualRatePercent}% p.a.</span>
                  </div>
                  <div className="border-t border-white/20 pt-3 flex justify-between">
                    <span className="opacity-80">Base Value</span>
                    <span className="font-bold">${basePriceUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Total Margin</span>
                    <span className="font-bold text-green-300">+${totalMarginUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>Total Proceeds</span>
                    <span className="font-bold">${totalProceeds.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Download Draft */}
              <Button 
                variant="outline" 
                className="w-full h-14 rounded-xl border-2" 
                onClick={handleDownloadDraft}
              >
                <Download className="w-5 h-5 mr-2" />
                {hasDownloadedDraft ? 'Download Again' : 'Download Agreement PDF'}
                {hasDownloadedDraft && <CheckCircle2 className="w-5 h-5 ml-2 text-green-600" />}
              </Button>

              {/* Signature */}
              <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <PenLine className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold">Digital Signature</span>
                </div>
                <Input
                  placeholder="Type your full name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="h-14 text-lg text-center font-signature italic border-2 border-dashed border-purple-300 focus:border-purple-500 rounded-xl"
                />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  By signing, you agree to the terms and authorize this transaction
                </p>
              </div>

              {!hasDownloadedDraft && (
                <p className="text-center text-sm text-amber-600">
                  Please download and review the agreement first
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 pb-6 safe-area-inset-bottom">
        <Button 
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full h-14 rounded-xl text-lg font-semibold transition-all ${
            canProceed 
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-300' 
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          {currentStep === 3 ? (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Create Plan
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
