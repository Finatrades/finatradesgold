import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, TrendingUp, ArrowRight, Info, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface PlanTenure {
  months: number;
  label: string;
  rate: number;
}

const planTenures: PlanTenure[] = [
  { months: 12, label: '12 Months', rate: 10 },
  { months: 24, label: '24 Months', rate: 11 },
  { months: 36, label: '36 Months', rate: 12 },
];

export default function BNSLGoldPlanner() {
  const [, setLocation] = useLocation();
  const [planValue, setPlanValue] = useState(10000);
  const [selectedTenure, setSelectedTenure] = useState(planTenures[1]);

  const { data: goldPriceData } = useQuery({
    queryKey: ['/api/gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return { price: 144.05, currency: 'USD' };
      return res.json();
    },
    staleTime: 60000,
  });

  const goldPrice = goldPriceData?.price || 144.05;

  const calculations = useMemo(() => {
    const totalYears = selectedTenure.months / 12;
    const annualRate = selectedTenure.rate / 100;
    
    const totalGoldAddition = planValue * annualRate * totalYears;
    const totalValueAtMaturity = planValue + totalGoldAddition;
    const guaranteedMargin = totalGoldAddition;
    const quarterlyMargin = totalGoldAddition / (selectedTenure.months / 3);

    return {
      planValue: planValue,
      guaranteedMargin: guaranteedMargin,
      totalValueAtMaturity: totalValueAtMaturity,
      quarterlyMargin: quarterlyMargin,
      annualRate: selectedTenure.rate,
    };
  }, [planValue, selectedTenure]);

  const handleValueChange = (value: number) => {
    setPlanValue(Math.min(Math.max(value, 500), 500000));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <section id="calculator" className="py-24 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-purple-100/30 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-pink-100/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #8A2BE2 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200/50 mb-6"
          >
            <Lock className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-800">BNSL Gold Buy Back Planner</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            BNSL Gold Buy Back{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Planner
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Plan your gold buy back and projected margins over time.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">BNSL Gold Buy Back Planner</h3>
                  <p className="text-sm text-gray-500">Plan your gold buy back and projected margins over time.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">BNSL Plan Value</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={planValue}
                      onChange={(e) => handleValueChange(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-gray-900 bg-gray-50 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                      data-testid="input-plan-value"
                    />
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="500000"
                    step="500"
                    value={planValue}
                    onChange={(e) => handleValueChange(Number(e.target.value))}
                    className="w-full h-2 mt-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    data-testid="slider-plan-value"
                  />
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                    <Info className="w-3.5 h-3.5" />
                    <span>Total value of physical gold you buy and store in our vault.</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Locked-In Gold Price (per gram)</span>
                    <span className="text-xs font-medium text-purple-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Live Price
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="p-2 rounded-lg bg-gray-200/70">
                      <Lock className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-2xl font-bold text-gray-900">{goldPrice.toFixed(2)}</span>
                      <span className="text-gray-500 ml-1">/gram</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <span className="text-yellow-600">Live market price — locked at plan start</span>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Plan Tenure</label>
                  <div className="grid grid-cols-3 gap-3">
                    {planTenures.map((tenure) => (
                      <motion.button
                        key={tenure.months}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTenure(tenure)}
                        className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                          selectedTenure.months === tenure.months
                            ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                        }`}
                        data-testid={`button-tenure-${tenure.months}`}
                      >
                        {tenure.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Estimated Gold Addition Rate</label>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                        {calculations.annualRate}%
                      </span>
                      <span className="text-gray-600 font-medium">per annum</span>
                    </div>
                    <p className="text-sm text-purple-700 mt-1">
                      Fixed rate for {selectedTenure.months}-month plan
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Gold Buy Back Projection</h3>
                  <p className="text-sm text-gray-500">Based on your selected parameters</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">BNSL Plan Value</span>
                    <div className="p-1.5 rounded-lg bg-purple-100">
                      <Lock className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{formatCurrency(calculations.planValue)}</p>
                  <p className="text-xs text-gray-500 mt-1">Value of your BNSL plan</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guaranteed Buy Back Margin *</span>
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                  </div>
                  <p className="text-3xl font-black text-green-600">+{formatCurrency(calculations.guaranteedMargin)}</p>
                  <p className="text-xs text-gray-500 mt-1">Guaranteed margin on buy back</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Gold Value at Maturity *</span>
                    <div className="p-1.5 rounded-lg bg-blue-100">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{formatCurrency(calculations.totalValueAtMaturity)}</p>
                  <p className="text-xs text-gray-500 mt-1">Combined purchased and additional gold</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quarterly Paid Margin *</span>
                    <div className="p-1.5 rounded-lg bg-orange-100">
                      <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{formatCurrency(calculations.quarterlyMargin)}</p>
                  <p className="text-xs text-gray-500 mt-1">Margin paid every quarter + Principal paid after locking period.</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 italic flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                *Terms and Conditions
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocation('/dashboard/bnsl/create')}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transition-all flex items-center justify-center gap-2"
                data-testid="button-start-bnsl-plan"
              >
                Start BNSL Plan
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
