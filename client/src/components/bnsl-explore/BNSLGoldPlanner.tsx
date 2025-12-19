import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  Wallet,
  Calendar,
  Coins,
  ArrowRight,
  Info,
  Sparkles,
  BadgeCheck,
  Shield,
  Clock,
  Gift,
  ChevronDown,
} from 'lucide-react';
import { useLocation } from 'wouter';

interface PlanTier {
  duration: number;
  label: string;
  bonusRate: number;
  description: string;
  popular?: boolean;
}

const planTiers: PlanTier[] = [
  { duration: 3, label: '3 Months', bonusRate: 1.0, description: 'Quick returns' },
  { duration: 6, label: '6 Months', bonusRate: 1.5, description: 'Balanced growth' },
  { duration: 9, label: '9 Months', bonusRate: 2.0, description: 'Higher rewards', popular: true },
  { duration: 12, label: '12 Months', bonusRate: 2.5, description: 'Maximum bonus' },
];

const presetAmounts = [500, 1000, 2500, 5000, 10000, 25000];

const GOLD_PRICE_PER_GRAM = 95.5;

export default function BNSLGoldPlanner() {
  const [, setLocation] = useLocation();
  const [investmentAmount, setInvestmentAmount] = useState(5000);
  const [selectedPlan, setSelectedPlan] = useState(planTiers[2]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const calculations = useMemo(() => {
    const goldGrams = investmentAmount / GOLD_PRICE_PER_GRAM;
    const monthlyBonusGrams = (goldGrams * selectedPlan.bonusRate) / 100;
    const totalBonusGrams = monthlyBonusGrams * selectedPlan.duration;
    const totalGoldGrams = goldGrams + totalBonusGrams;
    const estimatedValue = totalGoldGrams * GOLD_PRICE_PER_GRAM;
    const totalReturn = estimatedValue - investmentAmount;
    const returnPercentage = (totalReturn / investmentAmount) * 100;

    return {
      goldGrams: goldGrams.toFixed(2),
      monthlyBonusGrams: monthlyBonusGrams.toFixed(3),
      totalBonusGrams: totalBonusGrams.toFixed(2),
      totalGoldGrams: totalGoldGrams.toFixed(2),
      estimatedValue: estimatedValue.toFixed(2),
      totalReturn: totalReturn.toFixed(2),
      returnPercentage: returnPercentage.toFixed(1),
    };
  }, [investmentAmount, selectedPlan]);

  useEffect(() => {
    setIsCalculating(true);
    const timer = setTimeout(() => setIsCalculating(false), 300);
    return () => clearTimeout(timer);
  }, [investmentAmount, selectedPlan]);

  const handleAmountChange = (value: number) => {
    setInvestmentAmount(Math.min(Math.max(value, 100), 100000));
  };

  const monthlyBreakdown = useMemo(() => {
    const breakdown = [];
    let currentGold = parseFloat(calculations.goldGrams);
    const monthlyBonus = parseFloat(calculations.monthlyBonusGrams);

    for (let month = 1; month <= selectedPlan.duration; month++) {
      currentGold += monthlyBonus;
      breakdown.push({
        month,
        totalGold: currentGold.toFixed(2),
        bonusEarned: (monthlyBonus * month).toFixed(2),
        value: (currentGold * GOLD_PRICE_PER_GRAM).toFixed(2),
      });
    }
    return breakdown;
  }, [calculations, selectedPlan]);

  return (
    <section id="calculator" className="py-24 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-purple-100/40 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-purple-100/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-yellow-50 border border-purple-200/50 mb-6"
          >
            <Calculator className="w-4 h-4 text-fuchsia-600" />
            <span className="text-sm font-medium text-fuchsia-800">Investment Calculator</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Plan Your{' '}
            <span className="bg-gradient-to-r from-purple-500 to-yellow-500 bg-clip-text text-transparent">
              Gold Returns
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See exactly how your investment grows with our interactive calculator
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left Panel - Input Controls */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Investment Amount */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-100 to-yellow-100">
                    <Wallet className="w-5 h-5 text-fuchsia-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Investment Amount</h3>
                    <p className="text-sm text-gray-500">Choose your starting investment</p>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-4 text-3xl font-bold text-gray-900 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                    data-testid="input-investment-amount"
                  />
                </div>

                {/* Slider */}
                <div className="mb-6">
                  <input
                    type="range"
                    min="100"
                    max="100000"
                    step="100"
                    value={investmentAmount}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    data-testid="slider-investment-amount"
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>$100</span>
                    <span>$100,000</span>
                  </div>
                </div>

                {/* Preset Amounts */}
                <div className="grid grid-cols-3 gap-2">
                  {presetAmounts.map((amount) => (
                    <motion.button
                      key={amount}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAmountChange(amount)}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                        investmentAmount === amount
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      data-testid={`button-preset-${amount}`}
                    >
                      ${amount.toLocaleString()}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Plan Selection */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-100 to-purple-100">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Select Plan Duration</h3>
                    <p className="text-sm text-gray-500">Longer terms = Higher bonuses</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {planTiers.map((plan) => (
                    <motion.button
                      key={plan.duration}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full p-4 rounded-xl border-2 transition-all relative ${
                        selectedPlan.duration === plan.duration
                          ? 'border-purple-400 bg-purple-50'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                      data-testid={`button-plan-${plan.duration}`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2 right-4 px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-purple-500 to-yellow-500 text-white rounded-full">
                          POPULAR
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="font-bold text-gray-900">{plan.label}</div>
                          <div className="text-sm text-gray-500">{plan.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">{plan.bonusRate}%</div>
                          <div className="text-xs text-gray-500">Monthly bonus</div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right Panel - Results */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3"
            >
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                      backgroundSize: '30px 30px',
                    }}
                  />
                </div>

                {/* Decorative Gold Coins */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -5, 0], rotate: [0, 180, 360] }}
                      transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-400 to-yellow-500 flex items-center justify-center shadow-lg"
                    >
                      <Coins className="w-4 h-4 text-fuchsia-800" />
                    </motion.div>
                  ))}
                </div>

                {/* Header */}
                <div className="relative z-10 mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-fuchsia-400" />
                    <span className="text-sm font-medium text-fuchsia-400">Your Projected Returns</span>
                  </div>
                  <h3 className="text-3xl font-bold">
                    Investment Summary
                  </h3>
                </div>

                {/* Main Result */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${investmentAmount}-${selectedPlan.duration}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative z-10"
                  >
                    {/* Total Value Card */}
                    <div className="bg-gradient-to-r from-purple-500/20 to-yellow-500/20 rounded-2xl p-6 mb-6 border border-purple-500/30">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-purple-300 text-sm mb-1">Estimated Total Value</p>
                          <motion.p
                            key={calculations.estimatedValue}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-5xl font-bold text-white"
                          >
                            ${parseFloat(calculations.estimatedValue).toLocaleString()}
                          </motion.p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-emerald-400 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="font-bold">+{calculations.returnPercentage}%</span>
                          </div>
                          <p className="text-sm text-gray-400">
                            +${parseFloat(calculations.totalReturn).toLocaleString()} return
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="w-4 h-4 text-fuchsia-400" />
                          <span className="text-sm text-gray-400">Initial Gold</span>
                        </div>
                        <p className="text-2xl font-bold">{calculations.goldGrams}g</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Gift className="w-4 h-4 text-purple-400" />
                          <span className="text-sm text-gray-400">Total Bonus</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">+{calculations.totalBonusGrams}g</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-gray-400">Duration</span>
                        </div>
                        <p className="text-2xl font-bold">{selectedPlan.duration} months</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-gray-400">Monthly Bonus</span>
                        </div>
                        <p className="text-2xl font-bold">{calculations.monthlyBonusGrams}g</p>
                      </div>
                    </div>

                    {/* Breakdown Toggle */}
                    <motion.button
                      onClick={() => setShowBreakdown(!showBreakdown)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-white transition-colors"
                      data-testid="button-toggle-breakdown"
                    >
                      <span>View Monthly Breakdown</span>
                      <motion.div animate={{ rotate: showBreakdown ? 180 : 0 }}>
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </motion.button>

                    <AnimatePresence>
                      {showBreakdown && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-white/5 rounded-xl p-4 border border-white/10 max-h-48 overflow-y-auto">
                            <div className="space-y-2">
                              {monthlyBreakdown.map((row) => (
                                <div
                                  key={row.month}
                                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                                >
                                  <span className="text-gray-400">Month {row.month}</span>
                                  <div className="text-right">
                                    <span className="font-medium">{row.totalGold}g</span>
                                    <span className="text-emerald-400 text-sm ml-2">
                                      (+{row.bonusEarned}g)
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* CTA */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setLocation('/register')}
                      className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-yellow-500 text-slate-900 font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
                      data-testid="button-start-investing-cta"
                    >
                      Start Investing Now
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </motion.div>
                </AnimatePresence>

                {/* Disclaimer */}
                <div className="relative z-10 mt-4 flex items-start gap-2 text-xs text-gray-500">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    Returns are estimates based on current gold price of ${GOLD_PRICE_PER_GRAM}/gram. 
                    Actual returns may vary based on market conditions.
                  </p>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                {[
                  { icon: Shield, label: 'Insured Storage', color: 'amber' },
                  { icon: BadgeCheck, label: 'Certified Gold', color: 'emerald' },
                  { icon: Clock, label: 'Instant Withdrawals', color: 'blue' },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-100 shadow-sm"
                  >
                    <item.icon className={`w-6 h-6 text-${item.color}-500`} />
                    <span className="text-sm font-medium text-gray-700 text-center">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
