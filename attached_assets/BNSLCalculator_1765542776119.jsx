import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Calculator, TrendingUp, Calendar, Coins, 
  ChevronRight, Info, Shield, Clock, Wallet,
  ArrowRight, FileText
} from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Animated counter component
function AnimatedNumber({ value, decimals = 2, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = (value - displayValue) / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(prev => prev + increment);
      }
    }, stepDuration);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return (
    <span>
      {prefix}{displayValue.toLocaleString('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      })}{suffix}
    </span>
  );
}

// Timeline visualization
function QuarterlyTimeline({ quarters, currentQuarter }) {
  return (
    <div className="relative h-2 bg-[#1A1A1A] rounded-full overflow-hidden mb-6">
      <motion.div 
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#D4AF37] to-[#F7D878]"
        initial={{ width: 0 }}
        animate={{ width: `${(currentQuarter / quarters) * 100}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <div className="absolute inset-0 flex justify-between items-center px-1">
        {[...Array(quarters)].map((_, i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full ${i < currentQuarter ? 'bg-[#D4AF37]' : 'bg-[#333]'}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
          />
        ))}
      </div>
    </div>
  );
}

export default function BNSLCalculator() {
  // Input states
  const [goldUnits, setGoldUnits] = useState(100);
  const [lockedPrice, setLockedPrice] = useState(1000);
  const [currency, setCurrency] = useState('USD');
  const [tenure, setTenure] = useState(12);
  const [rateAdjustment, setRateAdjustment] = useState(0);
  
  // Base rates by tenure
  const baseRates = { 12: 8, 24: 10, 36: 12 };
  const effectiveRate = baseRates[tenure] + rateAdjustment;
  
  // Calculations
  const calculations = useMemo(() => {
    const annualRate = effectiveRate / 100;
    const years = tenure / 12;
    const totalReturn = goldUnits * annualRate * years;
    const totalAtMaturity = goldUnits + totalReturn;
    const estimatedValue = totalAtMaturity * lockedPrice;
    
    // Quarterly payouts
    const quarters = tenure / 3;
    const quarterlyPayout = totalReturn / quarters;
    
    const payoutSchedule = [...Array(quarters)].map((_, i) => ({
      quarter: `Q${i + 1}`,
      payout: quarterlyPayout,
      timing: i === 0 ? 'On Start Date' : `End of Month ${i * 3}`
    }));
    
    return {
      principal: goldUnits,
      totalReturn,
      totalAtMaturity,
      estimatedValue,
      quarterlyPayout,
      payoutSchedule,
      quarters
    };
  }, [goldUnits, lockedPrice, tenure, effectiveRate]);

  const currencySymbols = { USD: '$', EUR: '€', CHF: 'CHF ', GBP: '£' };

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0F0F0F] to-[#0A0A0A]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(212,175,55,0.05)_0%,_transparent_50%)]" />
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#D4AF37]/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 mb-6">
            <Info className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-sm text-[#D4AF37]">Indicative Projection • Not a Guarantee</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight text-white mb-4">
            BNSL Projection <span className="text-[#D4AF37]">Calculator</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Estimate your expected gold returns under the Buy Now Sell Later Plan.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-3xl border border-[#D4AF37]/20 p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B8860B]/10 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-light text-white">Investment Details</h3>
              </div>

              {/* Gold Units Input */}
              <div className="space-y-3">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#D4AF37]" />
                  Investment Amount (Gold Units)
                </label>
                <Input
                  type="number"
                  value={goldUnits}
                  onChange={(e) => setGoldUnits(Math.max(1, Number(e.target.value)))}
                  className="bg-[#0A0A0A] border-[#D4AF37]/30 focus:border-[#D4AF37] text-white text-lg h-12"
                  placeholder="Enter gold units"
                />
                <Slider
                  value={[goldUnits]}
                  onValueChange={([val]) => setGoldUnits(val)}
                  min={10}
                  max={1000}
                  step={10}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>10 units</span>
                  <span>1,000 units</span>
                </div>
              </div>

              {/* Locked Price Display (Read-Only) */}
              <div className="space-y-3">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#D4AF37]" />
                  Live Gold Price (per unit)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={lockedPrice.toFixed(2)}
                    readOnly
                    className="bg-[#D4AF37]/10 border-[#D4AF37]/30 text-white font-semibold flex-1 h-12 cursor-not-allowed"
                    placeholder="1000.00"
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-24 bg-[#0A0A0A] border-[#D4AF37]/30 text-white h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#D4AF37]/30">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CHF">CHF</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500">🔒 Live market price — locked at plan start</p>
              </div>

              {/* Tenure Selection */}
              <div className="space-y-3">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  Choose Plan Tenure
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[12, 24, 36].map((months) => (
                    <motion.button
                      key={months}
                      onClick={() => setTenure(months)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        tenure === months
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black'
                          : 'bg-[#0A0A0A] border border-[#D4AF37]/30 text-gray-400 hover:border-[#D4AF37]/60'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {months} Months
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Rate Adjustment */}
              <div className="space-y-3">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                  Indicative Annual Profit Rate (p.a.)
                </label>
                <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#D4AF37]/20">
                  <div className="text-center mb-3">
                    <span className="text-3xl font-light text-[#D4AF37]">{effectiveRate}%</span>
                    <span className="text-gray-500 text-sm ml-2">p.a.</span>
                  </div>
                  <Slider
                    value={[rateAdjustment]}
                    onValueChange={([val]) => setRateAdjustment(val)}
                    min={-2}
                    max={2}
                    step={0.5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{baseRates[tenure] - 2}%</span>
                    <span>{baseRates[tenure] + 2}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic">
                  Final applicable rate will be confirmed at plan purchase.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Projection Summary & Chart */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-3xl border border-[#D4AF37]/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B8860B]/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-light text-white">Projected Return Overview</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0A0A0A]/50 rounded-2xl p-4 border border-[#D4AF37]/10">
                  <p className="text-sm text-gray-400 mb-1">Locked-In Principal</p>
                  <p className="text-2xl font-light text-white">
                    <AnimatedNumber value={calculations.principal} decimals={2} suffix=" Gold Units" />
                  </p>
                </div>
                <div className="bg-[#0A0A0A]/50 rounded-2xl p-4 border border-[#D4AF37]/10">
                  <p className="text-sm text-gray-400 mb-1">Total Projected Return</p>
                  <p className="text-2xl font-light text-[#D4AF37]">
                    <AnimatedNumber value={calculations.totalReturn} decimals={4} prefix="+" suffix=" Gold Units" />
                  </p>
                </div>
                <div className="bg-[#0A0A0A]/50 rounded-2xl p-4 border border-[#D4AF37]/10">
                  <p className="text-sm text-gray-400 mb-1">Total Gold at Maturity</p>
                  <p className="text-2xl font-light text-white">
                    <AnimatedNumber value={calculations.totalAtMaturity} decimals={4} suffix=" Gold Units" />
                  </p>
                </div>
                <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#B8860B]/5 rounded-2xl p-4 border border-[#D4AF37]/30">
                  <p className="text-sm text-[#D4AF37] mb-1">Estimated Value at Locked-In Price</p>
                  <p className="text-2xl font-light text-[#D4AF37]">
                    <AnimatedNumber 
                      value={calculations.estimatedValue} 
                      decimals={2} 
                      prefix={currencySymbols[currency]} 
                    />
                  </p>
                </div>
              </div>

              {/* Visual Chart */}
              <div className="bg-[#0A0A0A]/50 rounded-2xl p-4 border border-[#D4AF37]/10">
                <p className="text-sm text-gray-400 mb-4">Growth Visualization</p>
                <div className="h-40 flex items-end gap-2">
                  {calculations.payoutSchedule.map((item, i) => {
                    const height = ((calculations.principal / calculations.quarters) + item.payout) / 
                                   (calculations.totalAtMaturity / calculations.quarters) * 100;
                    return (
                      <motion.div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                      >
                        <motion.div
                          className="w-full rounded-t-lg bg-gradient-to-t from-[#D4AF37] to-[#F7D878] relative overflow-hidden"
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: i * 0.05, duration: 0.5 }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </motion.div>
                        <span className="text-[10px] text-gray-500">{item.quarter}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quarterly Payout Schedule */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-3xl border border-[#D4AF37]/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B8860B]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-light text-white">Quarterly Payout Schedule</h3>
              </div>

              <QuarterlyTimeline quarters={calculations.quarters} currentQuarter={calculations.quarters} />

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#D4AF37]/20">
                      <th className="text-left py-3 px-4 text-sm text-gray-400 font-normal">Quarter</th>
                      <th className="text-right py-3 px-4 text-sm text-gray-400 font-normal">Payout (Gold Units)</th>
                      <th className="text-right py-3 px-4 text-sm text-gray-400 font-normal">Timing</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="wait">
                      {calculations.payoutSchedule.map((item, i) => (
                        <motion.tr
                          key={`${tenure}-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-[#D4AF37]/10 hover:bg-[#D4AF37]/5 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="text-white font-medium">{item.quarter}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[#D4AF37]">+{item.payout.toFixed(4)}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-gray-400 text-sm">{item.timing}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Disclaimers */}
        <motion.div
          className="mt-12 pt-8 border-t border-[#D4AF37]/10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-500">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-[#D4AF37]/50 mt-0.5 flex-shrink-0" />
              <p>All projections are indicative and for illustration only.</p>
            </div>
            <div className="flex items-start gap-2">
              <Wallet className="w-4 h-4 text-[#D4AF37]/50 mt-0.5 flex-shrink-0" />
              <p>All payouts and settlements are made in gold units to your Fina wallet.</p>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#D4AF37]/50 mt-0.5 flex-shrink-0" />
              <p>Early termination may result in financial loss and reduction in returned gold units.</p>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-[#D4AF37]/50 mt-0.5 flex-shrink-0" />
              <p>Please refer to the full BNSL Terms & Conditions before committing.</p>
            </div>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <motion.button
            className="group px-8 py-4 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-medium flex items-center gap-2"
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(212,175,55,0.4)' }}
            whileTap={{ scale: 0.98 }}
          >
            Proceed to BNSL Plan
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <Link to={createPageUrl("TermsAndConditions")}>
            <motion.button
              className="px-8 py-4 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] font-medium flex items-center gap-2 hover:bg-[#D4AF37]/10 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FileText className="w-4 h-4" />
              View Full Terms & Conditions
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}