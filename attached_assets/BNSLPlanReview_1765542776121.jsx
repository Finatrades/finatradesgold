import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Calendar, Award, Info, CheckSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function BNSLPlanReview({ plan, goldAmount, goldPrice, onBack, onConfirm }) {
  const [isLoading, setIsLoading] = useState(false);
  const [consents, setConsents] = useState({
    lockedPrice: false,
    variableGrams: false,
    notDeposit: false,
    earlyTermination: false
  });

  const lockedPrincipalValue = goldAmount * goldPrice;
  const quarterlyMonetaryValue = (lockedPrincipalValue * (plan.rate / 100)) / 4;
  const annualMonetaryValue = lockedPrincipalValue * (plan.rate / 100);

  const startDate = new Date();
  const maturityDate = new Date();
  maturityDate.setMonth(maturityDate.getMonth() + plan.tenure);

  const allConsented = Object.values(consents).every(v => v);

  const handleConfirm = async () => {
    if (!allConsented) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    onConfirm();
    setIsLoading(false);
  };

  // Generate distribution schedule
  const distributions = [];
  for (let i = 1; i <= plan.distributions; i++) {
    const distDate = new Date(startDate);
    distDate.setMonth(distDate.getMonth() + (i * 3));
    distributions.push({
      number: i,
      month: i * 3,
      date: distDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Review BNSL Plan Before Locking</h1>
          <p className="text-white/50 text-sm">Please review all details carefully before confirming</p>
        </div>
      </div>

      {/* Section A - Principal & Pricing */}
      <div className="bg-white/5 backdrop-blur-xl border border-[#D1A954]/20 rounded-2xl p-6">
        <h3 className="text-[#D1A954] font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          A. Principal & Pricing
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-black/30 rounded-xl">
            <p className="text-white/50 text-sm">Gold to Lock</p>
            <p className="text-2xl font-bold text-white">{goldAmount.toFixed(3)} g</p>
          </div>
          <div className="p-4 bg-black/30 rounded-xl">
            <p className="text-white/50 text-sm">Locked-In Price (USD per gram)</p>
            <p className="text-2xl font-bold text-[#D1A954]">${goldPrice.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gradient-to-r from-[#D1A954]/20 to-transparent rounded-xl border border-[#D1A954]/30 md:col-span-2">
            <p className="text-white/50 text-sm">Locked Principal Value (USD)</p>
            <p className="text-3xl font-bold text-[#D1A954]">${lockedPrincipalValue.toLocaleString()}</p>
            <p className="text-white/40 text-xs mt-1">= {goldAmount.toFixed(3)} g × ${goldPrice.toFixed(2)}/g</p>
          </div>
        </div>
      </div>

      {/* Section B - Plan Details */}
      <div className="bg-white/5 backdrop-blur-xl border border-[#D1A954]/20 rounded-2xl p-6">
        <h3 className="text-[#D1A954] font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          B. Plan Details
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-white/50">Tenure</span>
              <span className="text-white font-medium">{plan.tenure} months</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-white/50">Plan Rate</span>
              <span className="text-[#D1A954] font-bold">{plan.rate}% p.a.</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-white/50">Quarterly Distributions</span>
              <span className="text-white font-medium">{plan.distributions} payouts</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-white/50">Annual Distribution Value</span>
              <span className="text-green-400 font-medium">${annualMonetaryValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-white/50">Start Date</span>
              <span className="text-white font-medium">{startDate.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-white/50">Maturity Date</span>
              <span className="text-white font-medium">{maturityDate.toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
          <p className="text-white/70 text-sm">
            <strong className="text-green-400">Quarterly monetary distribution:</strong> ${quarterlyMonetaryValue.toFixed(2)} USD equivalent (converted to grams at each payout date)
          </p>
        </div>
      </div>

      {/* Section C - Schedule */}
      <div className="bg-white/5 backdrop-blur-xl border border-[#D1A954]/20 rounded-2xl p-6">
        <h3 className="text-[#D1A954] font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5" />
          C. Distribution Schedule
        </h3>
        
        {/* Timeline */}
        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-1 bg-white/10 rounded-full" />
          <div className="relative flex justify-between">
            {/* Start */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#D1A954] flex items-center justify-center z-10">
                <span className="text-black text-xs font-bold">0</span>
              </div>
              <p className="text-white/50 text-xs mt-2">Start</p>
              <p className="text-white text-xs">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>

            {/* Distribution markers (show first 4 or fewer) */}
            {distributions.slice(0, Math.min(4, distributions.length)).map((dist, i) => (
              <div key={dist.number} className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center z-10">
                  <span className="text-green-400 text-xs font-bold">{dist.month}</span>
                </div>
                <p className="text-white/50 text-xs mt-2">Q{dist.number}</p>
                <p className="text-white text-xs">{dist.date}</p>
              </div>
            ))}

            {/* More indicator if needed */}
            {distributions.length > 4 && (
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center z-10">
                  <span className="text-white/50 text-xs">...</span>
                </div>
                <p className="text-white/50 text-xs mt-2">+{distributions.length - 4}</p>
              </div>
            )}

            {/* Maturity */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center z-10">
                <span className="text-white text-xs font-bold">{plan.tenure}</span>
              </div>
              <p className="text-white/50 text-xs mt-2">Maturity</p>
              <p className="text-white text-xs">{maturityDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section D - Consents */}
      <div className="bg-gradient-to-br from-amber-500/10 to-transparent backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6">
        <h3 className="text-amber-400 font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          D. Understanding & Consent
        </h3>
        
        <div className="space-y-4">
          {[
            { key: 'lockedPrice', text: 'I understand that my principal gold in grams is locked at a fixed Locked-In Price for the full term.' },
            { key: 'variableGrams', text: 'I understand that quarterly gold payouts are based on a fixed monetary value but the grams I receive will vary with market price.' },
            { key: 'notDeposit', text: 'I understand this is not a deposit, savings account, or investment product, and there is no deposit insurance.' },
            { key: 'earlyTermination', text: 'I understand that early termination will result in significant fees, penalties, reimbursement of payouts, and possible loss of value as described in the BNSL Terms & Conditions.' }
          ].map((consent) => (
            <div key={consent.key} className="flex items-start gap-3">
              <Checkbox
                id={consent.key}
                checked={consents[consent.key]}
                onCheckedChange={(checked) => setConsents({ ...consents, [consent.key]: checked })}
                className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black mt-0.5"
              />
              <label htmlFor={consent.key} className="text-white/80 text-sm cursor-pointer leading-relaxed">
                {consent.text}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Button */}
      <div className="flex gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex-1 border border-white/20 text-white/70 hover:bg-white/5"
        >
          Back to Plan Selection
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isLoading || !allConsented}
          className="flex-1 bg-gradient-to-r from-[#D1A954] to-[#B8963E] text-black font-bold hover:opacity-90 h-14"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Locking Gold...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 mr-2" />
              Confirm & Lock Gold in BNSL
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}