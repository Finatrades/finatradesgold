import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { generateBnslAgreement } from '@/utils/generateBnslPdf';
import { FULL_TERMS_AND_CONDITIONS } from '@/components/bnsl/CreateBnslPlan';
import { BnslPlan, BnslTenor } from '@/types/bnsl';
import {
  Loader2, ChevronRight, ChevronLeft, CheckCircle2,
  Download, PenLine, Wallet, Shield, Calendar,
  TrendingUp, AlertTriangle, Zap
} from 'lucide-react';

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

interface QuickBnslModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bnslWalletBalance: number;
  currentGoldPrice: number;
}

const STEPS = ['Select Plan', 'Gold Amount', 'Review & Sign'];

export default function QuickBnslModal({
  open,
  onOpenChange,
  bnslWalletBalance,
  currentGoldPrice,
}: QuickBnslModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  const [goldGramsInput, setGoldGramsInput] = useState<string>('');

  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [hasDownloadedDraft, setHasDownloadedDraft] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  const termsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setGoldGramsInput('');
    setHasScrolledTerms(false);
    setHasDownloadedDraft(false);
    setAgreedToTerms(false);
    setSignatureName('');
    fetchTemplates();
  }, [open]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('GET', '/api/bnsl/templates');
      const data = await res.json();
      const active = (data.templates || []).filter(
        (t: PlanTemplate) => t.variants && t.variants.length > 0
      );
      setTemplates(active);
      if (active.length > 0) {
        setSelectedTemplateId(active[0].id);
        setSelectedVariantId(active[0].variants[0]?.id || '');
      }
    } catch {
      toast({ title: 'Failed to load plans', variant: 'destructive' });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const currentTemplate = templates.find(t => t.id === selectedTemplateId);
  const currentVariant =
    currentTemplate?.variants.find(v => v.id === selectedVariantId) ||
    currentTemplate?.variants[0];

  const tenorMonths = currentVariant?.tenorMonths || 12;
  const annualRatePercent = currentVariant ? parseFloat(currentVariant.marginRatePercent) : 0;
  const goldGrams = parseFloat(goldGramsInput) || 0;
  const enrollmentPrice = currentGoldPrice;
  const basePriceUsd = goldGrams * enrollmentPrice;
  const years = tenorMonths / 12;
  const totalMarginUsd = basePriceUsd * (annualRatePercent / 100) * years;
  const numDisbursements = tenorMonths / 3;
  const quarterlyMarginUsd = numDisbursements > 0 ? totalMarginUsd / numDisbursements : 0;
  const totalProceedsUsd = basePriceUsd + totalMarginUsd;

  const startDate = new Date();
  const maturityDate = new Date(startDate);
  maturityDate.setMonth(maturityDate.getMonth() + tenorMonths);

  const fmtUsd = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 60) {
      setHasScrolledTerms(true);
    }
  };

  const handleDownloadDraft = async () => {
    if (goldGrams <= 0) {
      toast({ title: 'Enter gold amount first', variant: 'destructive' });
      return;
    }
    const draftPlan: Partial<BnslPlan> = {
      id: 'DRAFT-PREVIEW',
      tenorMonths: tenorMonths as BnslTenor,
      agreedMarginAnnualPercent: annualRatePercent,
      goldSoldGrams: goldGrams,
      enrollmentPriceUsdPerGram: enrollmentPrice,
      basePriceComponentUsd: basePriceUsd,
      totalMarginComponentUsd: totalMarginUsd,
      quarterlyMarginUsd,
    };
    const doc = await generateBnslAgreement(draftPlan, user);
    doc.save(`BNSL_Agreement_Draft_${Date.now()}.pdf`);
    setHasDownloadedDraft(true);
    toast({ title: 'Draft downloaded', description: 'Review the agreement before signing.' });
  };

  const canProceedStep1 = !!currentTemplate && !!currentVariant;
  const canProceedStep2 =
    goldGrams > 0 &&
    goldGrams <= bnslWalletBalance &&
    goldGrams >= parseFloat(currentTemplate?.minGoldGrams || '0') &&
    goldGrams <= parseFloat(currentTemplate?.maxGoldGrams || '999999');

  const isValidSignature = signatureName.trim().length >= 3;
  const canSubmit =
    canProceedStep2 && agreedToTerms && hasDownloadedDraft && isValidSignature && hasScrolledTerms;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const planPayload = {
        userId: user?.id,
        templateId: selectedTemplateId,
        variantId: currentVariant?.id,
        templateName: currentTemplate?.name,
        tenorMonths,
        agreedMarginAnnualPercent: annualRatePercent.toString(),
        goldSoldGrams: goldGrams.toString(),
        enrollmentPriceUsdPerGram: enrollmentPrice.toString(),
        basePriceComponentUsd: basePriceUsd.toFixed(2),
        totalMarginComponentUsd: totalMarginUsd.toFixed(2),
        quarterlyMarginUsd: quarterlyMarginUsd.toFixed(2),
        totalSaleProceedsUsd: totalProceedsUsd.toFixed(2),
        remainingMarginUsd: totalMarginUsd.toFixed(2),
        startDate: startDate.toISOString(),
        maturityDate: maturityDate.toISOString(),
        goldWalletType: 'LGPW',
        earlyTerminationFeePercent: currentTemplate?.earlyTerminationFeePercent || '2.00',
        adminFeePercent: currentTemplate?.adminFeePercent || '0.50',
      };
      const res = await apiRequest('POST', '/api/bnsl/plans', planPayload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Enrollment failed' }));
        throw new Error(err.message || 'Enrollment failed');
      }
      toast({
        title: 'Plan Enrolled!',
        description: `Your Gold Yield Plan (${tenorMonths}mo @ ${annualRatePercent}%) is now active.`,
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['bnsl-plans'] });
      onOpenChange(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Enrollment failed';
      toast({ title: 'Enrollment Failed', description: errMsg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #0f766e 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <DialogTitle className="text-white text-[16px] font-extrabold leading-tight">
                Gold Yield Plan
              </DialogTitle>
              <p className="text-[11px] text-white/50 mt-0.5">Earn passive income on your gold — BNSL</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-0 mt-4">
            {STEPS.map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${
                      i < step
                        ? 'bg-teal-400 border-teal-400 text-white'
                        : i === step
                        ? 'bg-amber-400 border-amber-400 text-white'
                        : 'bg-white/10 border-white/20 text-white/40'
                    }`}
                  >
                    {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`text-[9px] mt-1 font-semibold ${
                      i === step ? 'text-amber-300' : i < step ? 'text-teal-300' : 'text-white/30'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-1 mb-4 transition-all ${
                      i < step ? 'bg-teal-400' : 'bg-white/15'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">

          {/* ── STEP 0: Select Plan ── */}
          {step === 0 && (
            <div className="space-y-4">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">
                  No plans available at this time.
                </div>
              ) : (
                templates.map(template => (
                  <div key={template.id} className="space-y-2">
                    <p className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                      {template.name}
                    </p>
                    {template.description && (
                      <p className="text-[10px] text-white/40">{template.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {template.variants.map(variant => {
                        const selected =
                          selectedTemplateId === template.id && selectedVariantId === variant.id;
                        return (
                          <button
                            key={variant.id}
                            data-testid={`variant-card-${variant.id}`}
                            onClick={() => {
                              setSelectedTemplateId(template.id);
                              setSelectedVariantId(variant.id);
                            }}
                            className={`relative rounded-xl p-3.5 text-left border transition-all ${
                              selected
                                ? 'border-amber-400/80 bg-amber-400/10'
                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            {selected && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 mb-2">
                              <Calendar className="w-3.5 h-3.5 text-teal-300" />
                              <span className="text-[12px] font-bold text-white">
                                {variant.tenorMonths} months
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                              <span className="text-[14px] font-extrabold text-amber-300">
                                {parseFloat(variant.marginRatePercent).toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-white/50">p.a.</span>
                            </div>
                            <p className="text-[9px] text-white/40 mt-1">
                              Quarterly disbursements
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {currentTemplate && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[10px] text-white/50 space-y-0.5">
                  <p>Min: {currentTemplate.minGoldGrams}g &nbsp;·&nbsp; Max: {currentTemplate.maxGoldGrams}g</p>
                  <p>Early exit fee: {currentTemplate.earlyTerminationFeePercent}% &nbsp;·&nbsp; Admin fee: {currentTemplate.adminFeePercent}%</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Gold Amount ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* BNSL wallet balance */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-300" />
                  <span className="text-[12px] text-white/70">BNSL Wallet Balance</span>
                </div>
                <span className="text-[14px] font-extrabold text-white">
                  {bnslWalletBalance.toFixed(3)}g
                </span>
              </div>

              {/* Selected plan summary */}
              <div className="rounded-xl bg-teal-600/20 border border-teal-400/20 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-white/60">{currentTemplate?.name}</p>
                  <p className="text-[13px] font-bold text-white">
                    {tenorMonths} months &nbsp;·&nbsp;
                    <span className="text-amber-300">{annualRatePercent.toFixed(1)}% p.a.</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-white/40">Maturity</p>
                  <p className="text-[11px] font-semibold text-white/80">
                    {maturityDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Gold grams input */}
              <div>
                <Label className="text-[11px] text-white/60 mb-1.5 block">
                  Gold amount to lock (grams)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.001"
                    min={currentTemplate?.minGoldGrams || '0'}
                    max={currentTemplate?.maxGoldGrams || '9999'}
                    value={goldGramsInput}
                    onChange={e => setGoldGramsInput(e.target.value)}
                    placeholder={`Min ${currentTemplate?.minGoldGrams || 10}g`}
                    data-testid="input-gold-grams"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 pr-10 text-[14px] font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/40 font-semibold">
                    g
                  </span>
                </div>
                {goldGrams > 0 && goldGrams > bnslWalletBalance && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Exceeds available balance ({bnslWalletBalance.toFixed(3)}g)
                  </p>
                )}
                {goldGrams > 0 && currentTemplate && goldGrams < parseFloat(currentTemplate.minGoldGrams) && (
                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Minimum is {currentTemplate.minGoldGrams}g
                  </p>
                )}
              </div>

              {/* Live calculations */}
              {goldGrams > 0 && enrollmentPrice > 0 && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2.5">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Plan Projections
                  </p>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/60">Gold price at enrollment</span>
                    <span className="text-white font-semibold">{fmtUsd(enrollmentPrice)}/g</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/60">Base value (deferred at maturity)</span>
                    <span className="text-white font-semibold">{fmtUsd(basePriceUsd)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/60">Quarterly margin disbursement</span>
                    <span className="text-teal-300 font-bold">{fmtUsd(quarterlyMarginUsd)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between text-[13px]">
                    <span className="text-white/80 font-semibold">Total proceeds</span>
                    <span className="text-amber-300 font-extrabold">{fmtUsd(totalProceedsUsd)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Review & Sign ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-xl bg-teal-600/20 border border-teal-400/20 p-4 space-y-2">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
                  Enrollment Summary
                </p>
                {[
                  ['Plan', `${currentTemplate?.name || ''}`],
                  ['Tenor', `${tenorMonths} months`],
                  ['Margin Rate', `${annualRatePercent.toFixed(1)}% p.a.`],
                  ['Gold to Lock', `${goldGrams.toFixed(3)}g`],
                  ['Base Value', fmtUsd(basePriceUsd)],
                  ['Quarterly Margin', fmtUsd(quarterlyMarginUsd)],
                  ['Total Proceeds', fmtUsd(totalProceedsUsd)],
                  ['Maturity', maturityDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-white/50">{k}</span>
                    <span className="text-white font-semibold">{v}</span>
                  </div>
                ))}
              </div>

              {/* Terms & Conditions */}
              <div>
                <p className="text-[11px] font-bold text-white/60 mb-1.5">
                  Terms & Conditions{' '}
                  <span className="text-[10px] font-normal text-white/30">(scroll to bottom to continue)</span>
                </p>
                <div
                  ref={termsRef}
                  onScroll={handleTermsScroll}
                  className="h-36 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-3 text-[9.5px] text-white/50 leading-relaxed whitespace-pre-line"
                  data-testid="terms-scroll-area"
                >
                  {FULL_TERMS_AND_CONDITIONS}
                </div>
                {hasScrolledTerms && (
                  <p className="text-[10px] text-teal-300 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Terms reviewed
                  </p>
                )}
              </div>

              {/* T&C checkbox */}
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="agree-terms"
                  checked={agreedToTerms}
                  onCheckedChange={v => {
                    setAgreedToTerms(v === true);
                    if (v === true) handleDownloadDraft();
                  }}
                  disabled={!hasScrolledTerms}
                  data-testid="checkbox-agree-terms"
                  className="mt-0.5 border-white/30 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                />
                <Label htmlFor="agree-terms" className="text-[10.5px] text-white/60 leading-snug cursor-pointer">
                  I have read and agree to the BNSL Terms & Conditions. I understand this is an irrevocable sale of gold and agree to the deferred payment structure and early termination penalties.
                </Label>
              </div>

              {/* Download draft */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadDraft}
                  disabled={goldGrams <= 0}
                  data-testid="button-download-draft"
                  className="w-full border-white/20 text-white/80 hover:bg-white/10 hover:text-white bg-transparent text-[11px]"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {hasDownloadedDraft ? 'Draft Downloaded ✓' : 'Download Draft Agreement'}
                </Button>
              </div>

              {/* Digital signature — only shown after draft is downloaded */}
              {hasDownloadedDraft && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-white/60 mb-0.5 flex items-center gap-1.5 block">
                    <PenLine className="w-3.5 h-3.5" />
                    Digital Signature — type your full name
                  </Label>
                  <p className="text-[9.5px] text-white/35 -mt-0.5">
                    Your name will be recorded as your digital signature on the agreement.
                  </p>
                  <Input
                    value={signatureName}
                    onChange={e => setSignatureName(e.target.value)}
                    placeholder="Your full legal name"
                    data-testid="input-signature"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                    autoFocus
                  />
                  {signatureName.trim().length > 0 && !isValidSignature && (
                    <p className="text-[10px] text-amber-400">At least 3 characters required</p>
                  )}
                </div>
              )}

              {/* Security note */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-300 flex-shrink-0" />
                <p className="text-[9.5px] text-white/40 leading-snug">
                  By confirming, you irrevocably sell your gold. Title transfers to Wingold & Metals DMCC immediately. Your contractual entitlement to proceeds is protected.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              disabled={submitting}
              data-testid="button-back"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 0 && !canProceedStep1) ||
                (step === 1 && !canProceedStep2) ||
                loadingTemplates
              }
              data-testid="button-next"
              className="ml-auto bg-amber-400 hover:bg-amber-300 text-amber-900 font-bold text-[12px] px-5"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              data-testid="button-confirm-enroll"
              className="ml-auto bg-teal-500 hover:bg-teal-400 text-white font-bold text-[12px] px-5 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Enrolling…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Confirm & Enroll
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
