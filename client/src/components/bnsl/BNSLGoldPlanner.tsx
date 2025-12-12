import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

const PLANS = [
  { months: 3, rate: 9, label: '3 Months' },
  { months: 6, rate: 12, label: '6 Months' },
  { months: 9, rate: 15, label: '9 Months' },
  { months: 12, rate: 18, label: '12 Months' }
];

const GOLD_PRICE_PER_GRAM = 85.22;

export default function BNSLGoldPlanner() {
  const [goldGrams, setGoldGrams] = useState(50);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]);

  const calculations = useMemo(() => {
    const baseValue = goldGrams * GOLD_PRICE_PER_GRAM;
    const annualMargin = baseValue * (selectedPlan.rate / 100);
    const totalMargin = annualMargin * (selectedPlan.months / 12);
    const quarterlyPayout = totalMargin / (selectedPlan.months / 3);
    const totalReturn = baseValue + totalMargin;

    return {
      baseValue,
      annualMargin,
      totalMargin,
      quarterlyPayout,
      totalReturn
    };
  }, [goldGrams, selectedPlan]);

  return (
    <section id="calculator" className="py-24 bg-gradient-to-br from-purple-50/30 via-white to-pink-50/20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#EC4899]/10 to-[#9333EA]/10 border border-[#9333EA]/20 text-sm font-semibold text-[#9333EA] uppercase tracking-wider mb-6">
            <Calculator className="w-4 h-4" />
            BNSL CALCULATOR
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
            Plan Your Gold Returns
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Adjust the sliders to see your potential earnings with BNSL plans.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-white border border-gray-100 shadow-lg"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">Configure Your Plan</h3>
              
              <div className="mb-8">
                <div className="flex justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Gold Amount</label>
                  <span className="text-lg font-bold text-[#9333EA]">{goldGrams}g</span>
                </div>
                <Slider
                  value={[goldGrams]}
                  onValueChange={(value) => setGoldGrams(value[0])}
                  min={10}
                  max={500}
                  step={5}
                  className="mb-2"
                  data-testid="slider-gold-amount"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>10g</span>
                  <span>500g</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-3 block">Select Tenor</label>
                <div className="grid grid-cols-2 gap-3">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.months}
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedPlan.months === plan.months
                          ? 'border-[#9333EA] bg-[#9333EA]/5'
                          : 'border-gray-200 hover:border-[#9333EA]/50'
                      }`}
                      data-testid={`button-plan-${plan.months}`}
                    >
                      <p className="font-bold text-gray-900">{plan.label}</p>
                      <p className="text-sm text-green-600 font-medium">{plan.rate}% APY</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Gold Price: ${GOLD_PRICE_PER_GRAM}/gram</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#3d2066] text-white"
            >
              <h3 className="text-xl font-bold mb-6">Your Projected Returns</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/10">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                    <span className="text-gray-300">Base Value</span>
                  </div>
                  <span className="text-xl font-bold">${calculations.baseValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-white/10">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#D4AF37]" />
                    <span className="text-gray-300">Quarterly Payout</span>
                  </div>
                  <span className="text-xl font-bold text-green-400">${calculations.quarterlyPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-white/10">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                    <span className="text-gray-300">Total Margin Earned</span>
                  </div>
                  <span className="text-xl font-bold text-green-400">${calculations.totalMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-r from-[#D4AF37]/20 to-[#F4E4BC]/20 border border-[#D4AF37]/30 mb-6">
                <p className="text-sm text-gray-300 mb-1">Total at Maturity</p>
                <p className="text-3xl font-bold text-[#D4AF37]">${calculations.totalReturn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>

              <Link href="/register">
                <Button 
                  className="w-full h-12 bg-gradient-to-r from-[#FF6B2F] to-[#FF8F5F] hover:opacity-90 text-white rounded-full"
                  data-testid="button-start-bnsl-plan"
                >
                  Start This Plan
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
