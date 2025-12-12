import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { 
  Calculator, TrendingUp, Calendar, Coins, 
  Info, Shield, Clock, Wallet, HelpCircle,
  ArrowRight, FileText, ChevronDown
} from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Animated counter
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

// Input with tooltip
function InputWithTooltip({ label, tooltip, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#8A2BE2]" />
        <label className="text-sm text-[#4A4A4A]">{label}</label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-[#4A4A4A] hover:text-[#8A2BE2] transition-colors" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-white border-[#8A2BE2]/30 text-[#4A4A4A]">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {children}
    </div>
  );
}

// Quarterly timeline
function QuarterlyTimeline({ quarters }) {
  return (
    <div className="relative h-2 bg-[#8A2BE2]/10 rounded-full overflow-hidden mb-6">
      <motion.div 
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF]"
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <div className="absolute inset-0 flex justify-between items-center px-1">
        {[...Array(quarters)].map((_, i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-[#8A2BE2] border border-[#FF2FBF]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            style={{ boxShadow: '0 0 8px rgba(138,43,226,0.6)' }}
          />
        ))}
      </div>
    </div>
  );
}

export default function BNSLCalculatorNew() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  // Input states
  const [goldWorth, setGoldWorth] = useState(10000);
  const [lockedPrice, setLockedPrice] = useState(65);
  const [tenure, setTenure] = useState(24);
  const [rateAdjustment, setRateAdjustment] = useState(0);
  
  // Base rates
  const baseRates = { 12: 8, 24: 10, 36: 12 };
  const effectiveRate = baseRates[tenure] + rateAdjustment;
  
  // Calculations
  const calculations = useMemo(() => {
    const annualRate = effectiveRate / 100;
    const years = tenure / 12;
    const totalGrowth = goldWorth * annualRate * years;
    const totalAtMaturity = goldWorth + totalGrowth;
    const estimatedValue = totalAtMaturity; // Already in currency
    
    const quarters = tenure / 3;
    const quarterlyGrowth = totalGrowth / quarters;
    
    const payoutSchedule = [...Array(quarters)].map((_, i) => ({
      quarter: `Q${i + 1}`,
      growth: quarterlyGrowth,
      timing: i === 0 ? 'Plan Start' : `Month ${i * 3}`
    }));
    
    return {
      principal: goldWorth,
      totalGrowth,
      totalAtMaturity,
      estimatedValue,
      quarterlyGrowth,
      payoutSchedule,
      quarters
    };
  }, [goldWorth, lockedPrice, tenure, effectiveRate]);

  return (
    <section ref={ref} id="calculator" className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#FAFBFF] overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,_rgba(212,175,55,0.06)_0%,_transparent_50%)]" />
      
      {/* Floating particles */}
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#D4AF37]/40"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8A2BE2]/10 border border-[#8A2BE2]/30 mb-6">
            <Info className="w-4 h-4 text-[#8A2BE2]" />
            <span className="text-sm text-[#8A2BE2]">Indicative Projection • Not a Guarantee</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0D0D0D] mb-4">
            BNSL Projection <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] bg-clip-text text-transparent">Calculator</span>
          </h2>
          <p className="text-[#4A4A4A] max-w-2xl mx-auto">
            Estimate your expected gold growth under the Buy Now Sell Later Plan.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="bg-white backdrop-blur-sm rounded-3xl border border-[#8A2BE2]/20 p-8 space-y-8 shadow-[0_8px_32px_rgba(138,43,226,0.08)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8A2BE2]/20 to-[#FF2FBF]/10 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-[#8A2BE2]" />
                </div>
                <h3 className="text-xl font-light text-[#0D0D0D]">Investment Details</h3>
              </div>

              {/* Gold Worth Input */}
              <InputWithTooltip
                label="Investment Amount (Worth of Gold)"
                tooltip="Enter the total worth of the physical gold you are locking into the plan."
                icon={Coins}
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A2BE2]">$</span>
                  <Input
                    type="number"
                    value={goldWorth}
                    onChange={(e) => setGoldWorth(Math.max(1, Number(e.target.value)))}
                    className="bg-[#F4F6FC] border-[#8A2BE2]/30 focus:border-[#8A2BE2] text-[#0D0D0D] text-lg h-14 pl-8"
                    placeholder="10,000"
                  />
                </div>
                <Slider
                  value={[goldWorth]}
                  onValueChange={([val]) => setGoldWorth(val)}
                  min={1000}
                  max={100000}
                  step={500}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-[#4A4A4A]">
                  <span>$1,000</span>
                  <span>$100,000</span>
                </div>
              </InputWithTooltip>

              {/* Locked Price Display (Read-Only) */}
              <InputWithTooltip
                label="Live Gold Price (per gram)"
                tooltip="Current market price for gold. This price will be locked when you start your plan."
                icon={Shield}
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A2BE2]">$</span>
                  <Input
                    type="text"
                    value={lockedPrice.toFixed(2)}
                    readOnly
                    className="bg-[#8A2BE2]/5 border-[#8A2BE2]/30 text-[#0D0D0D] font-semibold h-14 pl-8 cursor-not-allowed"
                    placeholder="65.00"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4A4A4A] text-sm">/gram</span>
                </div>
                <p className="text-xs text-[#4A4A4A] mt-2">🔒 Live market price — locked at plan start</p>
              </InputWithTooltip>

              {/* Tenure Selection */}
              <InputWithTooltip
                label="Plan Tenure"
                tooltip="Longer plans offer higher indicative annual increases to your gold worth."
                icon={Calendar}
              >
                <div className="grid grid-cols-3 gap-3">
                  {[12, 24, 36].map((months) => (
                    <motion.button
                      key={months}
                      onClick={() => setTenure(months)}
                      className={`py-4 rounded-xl text-sm font-medium transition-all ${
                        tenure === months
                          ? 'bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white'
                          : 'bg-[#F4F6FC] border border-[#8A2BE2]/30 text-[#4A4A4A] hover:border-[#8A2BE2]/60'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {months} Months
                    </motion.button>
                  ))}
                </div>
              </InputWithTooltip>

              {/* Rate Adjustment */}
              <InputWithTooltip
                label="Indicative Annual Growth Rate"
                tooltip="Displayed for projection purposes; final rate is confirmed at activation."
                icon={TrendingUp}
              >
                <div className="bg-[#F4F6FC] rounded-xl p-5 border border-[#8A2BE2]/20">
                  <div className="text-center mb-4">
                    <span className="text-4xl font-light text-[#8A2BE2]">{effectiveRate}%</span>
                    <span className="text-[#4A4A4A] text-sm ml-2">p.a. in gold worth</span>
                  </div>
                  <Slider
                    value={[rateAdjustment]}
                    onValueChange={([val]) => setRateAdjustment(val)}
                    min={-2}
                    max={2}
                    step={0.5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-[#4A4A4A] mt-2">
                    <span>{baseRates[tenure] - 2}%</span>
                    <span>{baseRates[tenure] + 2}%</span>
                  </div>
                </div>
              </InputWithTooltip>
            </div>
          </motion.div>

          {/* Results Panel */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Output Cards */}
            <div className="bg-white backdrop-blur-sm rounded-3xl border border-[#8A2BE2]/20 p-8 shadow-[0_8px_32px_rgba(138,43,226,0.08)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8A2BE2]/20 to-[#FF2FBF]/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#8A2BE2]" />
                </div>
                <h3 className="text-xl font-light text-[#0D0D0D]">Projected Growth Overview</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-[#F4F6FC] rounded-2xl p-5 border border-[#8A2BE2]/10">
                  <p className="text-sm text-[#4A4A4A] mb-2">Principal Gold Worth</p>
                  <p className="text-2xl font-light text-[#0D0D0D]">
                    <AnimatedNumber value={calculations.principal} prefix="$" />
                  </p>
                  <p className="text-xs text-[#4A4A4A] mt-1">at Locked-In Price</p>
                </div>
                <div className="bg-[#F4F6FC] rounded-2xl p-5 border border-[#8A2BE2]/10">
                  <p className="text-sm text-[#4A4A4A] mb-2">Total Projected Growth</p>
                  <p className="text-2xl font-light text-[#8A2BE2]">
                    <AnimatedNumber value={calculations.totalGrowth} prefix="+$" />
                  </p>
                  <p className="text-xs text-[#4A4A4A] mt-1">added to gold worth</p>
                </div>
                <div className="bg-[#F4F6FC] rounded-2xl p-5 border border-[#8A2BE2]/10">
                  <p className="text-sm text-[#4A4A4A] mb-2">Total Gold Worth at Maturity</p>
                  <p className="text-2xl font-light text-[#0D0D0D]">
                    <AnimatedNumber value={calculations.totalAtMaturity} prefix="$" />
                  </p>
                </div>
                <div className="bg-gradient-to-br from-[#8A2BE2]/15 to-[#FF2FBF]/10 rounded-2xl p-5 border border-[#8A2BE2]/40">
                  <p className="text-sm text-[#8A2BE2] mb-2">Estimated Value</p>
                  <p className="text-2xl font-light text-[#8A2BE2]">
                    <AnimatedNumber value={calculations.estimatedValue} prefix="$" />
                  </p>
                  <p className="text-xs text-[#8A2BE2]/70 mt-1">at Locked-In Price</p>
                </div>
              </div>

              {/* Chart visualization */}
              <div className="mt-6 bg-[#F4F6FC] rounded-2xl p-5 border border-[#8A2BE2]/10">
                <p className="text-sm text-[#4A4A4A] mb-4">Growth Visualization</p>
                <div className="h-32 flex items-end gap-1">
                  {calculations.payoutSchedule.map((item, i) => {
                    const baseHeight = 30;
                    const growthHeight = ((i + 1) / calculations.quarters) * 70;
                    return (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-t-lg overflow-hidden"
                        initial={{ height: 0 }}
                        animate={{ height: `${baseHeight + growthHeight}%` }}
                        transition={{ delay: i * 0.05, duration: 0.6 }}
                      >
                        <div className="h-full bg-gradient-to-t from-[#8A2BE2] to-[#FF2FBF] relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  {calculations.payoutSchedule.filter((_, i) => i % Math.ceil(calculations.quarters / 6) === 0 || i === calculations.quarters - 1).map((item, i) => (
                    <span key={i} className="text-[10px] text-[#4A4A4A]">{item.quarter}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quarterly Table */}
            <div className="bg-white backdrop-blur-sm rounded-3xl border border-[#8A2BE2]/20 p-6 shadow-[0_8px_32px_rgba(138,43,226,0.08)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-[#8A2BE2]" />
                <h3 className="text-lg font-light text-[#0D0D0D]">Quarterly Growth Schedule</h3>
              </div>

              <QuarterlyTimeline quarters={calculations.quarters} />

              <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-[#8A2BE2]/30">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-[#8A2BE2]/20">
                      <th className="text-left py-3 text-sm text-[#4A4A4A] font-normal">Quarter</th>
                      <th className="text-right py-3 text-sm text-[#4A4A4A] font-normal">Growth Added</th>
                      <th className="text-right py-3 text-sm text-[#4A4A4A] font-normal">Timing</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="wait">
                      {calculations.payoutSchedule.map((item, i) => (
                        <motion.tr
                          key={`${tenure}-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-[#8A2BE2]/10 hover:bg-[#8A2BE2]/5 transition-colors"
                        >
                          <td className="py-3">
                            <span className="text-[#0D0D0D] font-medium">{item.quarter}</span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-[#8A2BE2]">+${item.growth.toFixed(2)}</span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-[#4A4A4A] text-sm">{item.timing}</span>
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
          className="mt-12 grid md:grid-cols-3 gap-4 text-sm text-[#4A4A4A]"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-start gap-2 p-4 rounded-xl bg-white border border-[#8A2BE2]/10 shadow-sm">
            <Info className="w-4 h-4 text-[#8A2BE2]/50 mt-0.5 flex-shrink-0" />
            <p>These projections are indicative and not guaranteed.</p>
          </div>
          <div className="flex items-start gap-2 p-4 rounded-xl bg-white border border-[#8A2BE2]/10 shadow-sm">
            <Wallet className="w-4 h-4 text-[#8A2BE2]/50 mt-0.5 flex-shrink-0" />
            <p>All settlements and credits are made as gold worth, not cash.</p>
          </div>
          <div className="flex items-start gap-2 p-4 rounded-xl bg-white border border-[#8A2BE2]/10 shadow-sm">
            <Shield className="w-4 h-4 text-[#8A2BE2]/50 mt-0.5 flex-shrink-0" />
            <p>Early exit reduces your returned gold worth.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}