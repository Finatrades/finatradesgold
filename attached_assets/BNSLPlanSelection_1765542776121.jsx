import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, Award, Info, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const plans = [
  {
    id: '12m',
    tenure: 12,
    rate: 10,
    distributions: 4,
    tag: 'Short-Term Holding',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10'
  },
  {
    id: '24m',
    tenure: 24,
    rate: 11,
    distributions: 8,
    tag: 'Balanced Holding',
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    featured: true
  },
  {
    id: '36m',
    tenure: 36,
    rate: 12,
    distributions: 12,
    tag: 'Long-Term Holding',
    color: 'from-[#D1A954] to-[#B8963E]',
    borderColor: 'border-[#D1A954]/30',
    bgColor: 'bg-[#D1A954]/10'
  }
];

export default function BNSLPlanSelection({ initialAmount, bnslWalletBalance, goldPrice, onBack, onSelectPlan }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [goldToLock, setGoldToLock] = useState(initialAmount?.toString() || '');

  const goldAmount = parseFloat(goldToLock) || 0;
  const maxAvailable = bnslWalletBalance + (initialAmount || 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-lg bg-[#F4F6FC] border border-[#8A2BE2]/20 text-[#4A4A4A] hover:text-[#0D0D0D] hover:bg-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">Choose Your BNSL Plan</h1>
          <p className="text-[#4A4A4A] text-sm">Select a structured gold holding plan with quarterly distributions</p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <motion.button
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => setSelectedPlan(plan.id)}
            className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
              selectedPlan === plan.id
                ? `${plan.borderColor} ${plan.bgColor} shadow-lg`
                : 'border-[#8A2BE2]/10 bg-white hover:border-[#8A2BE2]/30'
            }`}
          >
            {plan.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold">
                Most Popular
              </div>
            )}

            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${plan.color} flex items-center justify-center mb-4`}>
              <Clock className="w-6 h-6 text-white" />
            </div>

            <h3 className="text-xl font-bold text-[#0D0D0D] mb-1">{plan.tenure}-Month Plan</h3>
            <span className={`inline-block px-2 py-0.5 rounded text-xs ${plan.bgColor} ${plan.borderColor} border mb-4 text-[#4A4A4A]`}>
              {plan.tag}
            </span>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#4A4A4A] text-sm">Rate</span>
                <span className="text-2xl font-bold text-[#D1A954]">{plan.rate}% <span className="text-sm text-[#4A4A4A]">p.a.</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#4A4A4A] text-sm">Term</span>
                <span className="text-[#0D0D0D] font-medium">{plan.tenure} months</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#4A4A4A] text-sm">Distributions</span>
                <span className="text-[#0D0D0D] font-medium">{plan.distributions} quarterly payouts</span>
              </div>
            </div>

            <p className="mt-4 pt-4 border-t border-[#8A2BE2]/10 text-[#4A4A4A] text-xs">
              Quarterly additional gold credited based on {plan.rate}% p.a. of your principal value.
            </p>

            {selectedPlan === plan.id && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-r from-[#D1A954] to-[#B8963E] flex items-center justify-center">
                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Dual Price Mechanism Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-[#8A2BE2]/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-5 h-5 text-[#8A2BE2]" />
          <h3 className="text-[#0D0D0D] font-semibold">How BNSL Works (Dual Price Mechanism)</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D1A954]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#D1A954] font-bold text-sm">1</span>
            </div>
            <p className="text-[#4A4A4A] text-sm">
              Your principal gold in grams is locked at a <strong className="text-[#0D0D0D]">fixed Locked-In Price</strong> on plan start date.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D1A954]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#D1A954] font-bold text-sm">2</span>
            </div>
            <p className="text-[#4A4A4A] text-sm">
              Quarterly distributions are calculated as a <strong className="text-[#0D0D0D]">fixed monetary amount</strong> (e.g. 10%/11%/12% p.a. of your principal value) and then converted to gold grams at the market price on each distribution date.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D1A954]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#D1A954] font-bold text-sm">3</span>
            </div>
            <div className="text-[#4A4A4A] text-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-green-400" />
                <span>When gold prices are low → <strong className="text-green-600">more grams</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>When gold prices are high → <strong className="text-amber-600">fewer grams</strong></span>
              </div>
              <p className="mt-1 text-[#4A4A4A] text-xs">but the monetary value of each payout is fixed.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Gold Amount Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white border border-[#8A2BE2]/20 rounded-2xl p-6"
      >
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <div className="flex-1">
            <label className="text-[#D1A954] text-sm mb-2 block font-medium">Gold to Lock (g)</label>
            <Input
              type="number"
              placeholder="0.000"
              max={maxAvailable}
              step="0.001"
              className="h-14 bg-[#F4F6FC] border-[#8A2BE2]/20 text-[#0D0D0D] text-xl font-bold rounded-xl focus:border-[#8A2BE2]"
              value={goldToLock}
              onChange={(e) => setGoldToLock(e.target.value)}
            />
            <p className="text-[#4A4A4A] text-xs mt-2">Available in BNSL Wallet: {maxAvailable.toFixed(3)} g</p>
          </div>

          {goldAmount > 0 && selectedPlan && (
            <div className="flex-1 p-4 bg-[#D1A954]/10 rounded-xl border border-[#D1A954]/20">
              <p className="text-[#4A4A4A] text-sm mb-1">Estimated Plan Value</p>
              <p className="text-2xl font-bold text-[#D1A954]">${(goldAmount * goldPrice).toLocaleString()}</p>
              <p className="text-[#4A4A4A] text-xs">@ ${goldPrice.toFixed(2)}/g (current market price)</p>
            </div>
          )}

          <Button
            onClick={() => {
              const plan = plans.find(p => p.id === selectedPlan);
              onSelectPlan(plan, goldAmount);
            }}
            disabled={!selectedPlan || goldAmount <= 0 || goldAmount > maxAvailable}
            className="h-14 px-8 bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white font-bold hover:opacity-90"
          >
            Review Plan & Lock Gold
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}