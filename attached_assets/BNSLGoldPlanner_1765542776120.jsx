import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vault, Calendar, TrendingUp, Info, ChevronRight, Lock, Shield, Sparkles } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useLanguage } from '@/components/LanguageContext';

// Animated number counter
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 800;
    const startTime = Date.now();
    const startValue = displayValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * eased;
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return (
    <span>
      {prefix}{displayValue.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
};

// Glass card component
const GlassCard = ({ children, className = '', glow = false }) => (
  <motion.div
    className={`relative bg-white backdrop-blur-xl border border-[#8A2BE2]/20 rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(138,43,226,0.08)] ${className}`}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
  >
    {glow && (
      <div className="absolute inset-0 bg-gradient-to-br from-[#8A2BE2]/5 via-transparent to-[#FF2FBF]/5 pointer-events-none" />
    )}
    <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
    {children}
  </motion.div>
);

// Metric card component
const MetricCard = ({ title, value, subtitle, highlight = false, icon: Icon }) => (
  <GlassCard glow={highlight} className="p-5">
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs uppercase tracking-wider text-[#4A4A4A] font-medium">{title}</span>
      {Icon && <Icon className={`w-4 h-4 ${highlight ? 'text-[#8A2BE2]' : 'text-[#4A4A4A]/50'}`} />}
    </div>
    <div className={`text-2xl md:text-3xl font-bold mb-1 ${highlight ? 'bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] bg-clip-text text-transparent' : 'text-[#0D0D0D]'}`}>
      {value}
    </div>
    <p className="text-xs text-[#4A4A4A]">{subtitle}</p>
  </GlassCard>
);

// Bar chart component
const GrowthChart = ({ data, tenure }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="h-64 flex items-end justify-between gap-2 md:gap-3 px-2">
      {data.map((item, index) => (
        <motion.div
          key={index}
          className="flex-1 flex flex-col items-center gap-2"
          initial={{ opacity: 0, scaleY: 0 }}
          whileInView={{ opacity: 1, scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.08 }}
          style={{ originY: 1 }}
        >
          <div className="relative w-full flex-1 flex items-end">
            <motion.div
              className="w-full rounded-t-lg bg-gradient-to-t from-[#8A2BE2] via-[#A342FF] to-[#FF2FBF] relative overflow-hidden shadow-lg"
              style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: 20 }}
              whileHover={{ scale: 1.05 }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            </motion.div>
          </div>
          <span className="text-[10px] md:text-xs text-[#4A4A4A] font-medium">{item.label}</span>
        </motion.div>
      ))}
    </div>
  );
};

// Timeline component
const QuarterlyTimeline = ({ quarters, goldPerQuarter }) => (
  <div className="relative py-4">
    {/* Timeline line */}
    <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8A2BE2]/30 to-transparent" />
    
    <div className="flex justify-between relative">
      {quarters.map((q, index) => (
        <motion.div
          key={index}
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
        >
          {/* Dot */}
          <motion.div
            className="w-3 h-3 rounded-full bg-gradient-to-br from-[#8A2BE2] to-[#FF2FBF] border-2 border-white relative z-10 shadow-md"
            whileHover={{ scale: 1.3 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-[#8A2BE2]"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
            />
          </motion.div>
          
          {/* Label */}
          <div className="mt-3 text-center">
            <div className="text-xs font-medium text-[#4A4A4A]">{q}</div>
            <div className="text-[10px] text-[#8A2BE2]">+{goldPerQuarter.toFixed(1)}g</div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// Vault animation hero
const VaultHeroAnimation = () => (
  <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-30">
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Gold bar */}
      <motion.div
        className="absolute w-12 h-6 bg-gradient-to-br from-[#8A2BE2] to-[#FF2FBF] rounded-sm shadow-lg"
        animate={{
          x: [0, 30, 30],
          y: [0, 0, 20],
          opacity: [1, 1, 0],
          scale: [1, 1, 0.8]
        }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
      />
      
      {/* Vault slot */}
      <motion.div
        className="w-16 h-20 border-2 border-[#8A2BE2]/30 rounded-lg bg-white/80"
        style={{ transform: 'translateX(30px) translateY(20px)' }}
      >
        <motion.div
          className="absolute inset-0 bg-[#8A2BE2]/20 rounded-lg"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, delay: 2 }}
        />
      </motion.div>
    </motion.div>
  </div>
);

export default function BNSLGoldPlanner() {
  const { t } = useLanguage();
  const [purchaseValue, setPurchaseValue] = useState(10000);
  const [goldPrice, setGoldPrice] = useState(65);
  const [tenure, setTenure] = useState(24);
  const [loadingPrice, setLoadingPrice] = useState(true);

  // Fetch real-time gold price
  useEffect(() => {
    const fetchGoldPrice = async () => {
      try {
        const response = await fetch('https://api.gold-api.com/price/XAU');
        const data = await response.json();
        if (data && data.price) {
          // Convert price per troy ounce to price per gram (1 troy oz = 31.1035 grams)
          const pricePerGram = data.price / 31.1035;
          setGoldPrice(Math.round(pricePerGram * 100) / 100);
        }
      } catch (error) {
        console.log('Using default gold price');
      } finally {
        setLoadingPrice(false);
      }
    };
    fetchGoldPrice();
  }, []);
  
  // Fixed rates based on BNSL plan tenure
  const additionRate = tenure === 12 ? 10 : tenure === 24 ? 11 : 12;
  
  // Calculations
  const purchasedGrams = purchaseValue / goldPrice;
  const totalAdditionRate = (additionRate / 100) * (tenure / 12);
  const additionalGrams = purchasedGrams * totalAdditionRate;
  const additionalValue = additionalGrams * goldPrice;
  const totalValue = purchaseValue + additionalValue;
  const totalGrams = purchasedGrams + additionalGrams;
  
  // Chart data
  const quarters = tenure / 3;
  const chartData = Array.from({ length: quarters }, (_, i) => {
    const quarterProgress = (i + 1) / quarters;
    const currentAdditional = purchaseValue * (additionRate / 100) * (tenure / 12) * quarterProgress;
    return {
      label: `Q${i + 1}`,
      value: purchaseValue + currentAdditional
    };
  });
  
  // Timeline quarters
  const timelineQuarters = Array.from({ length: Math.min(quarters, 8) }, (_, i) => `Q${i + 1}`);
  const goldPerQuarter = additionalGrams / quarters;
  
  const tenureOptions = [
    { value: 12, label: '12 Months' },
    { value: 24, label: '24 Months' },
    { value: 36, label: '36 Months' }
  ];

  return (
    <section className="relative py-24 overflow-hidden" id="gold-planner">
      {/* Background - Light theme matching frontend */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FAFBFF] via-[#F4F6FC] to-[#FFFFFF]" />
      
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8A2BE2]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF2FBF]/5 rounded-full blur-3xl" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#8A2BE2" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8A2BE2]/10 border border-[#8A2BE2]/30 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Vault className="w-4 h-4 text-[#8A2BE2]" />
            <span className="text-sm text-[#8A2BE2] font-medium">{t('bnsl.planner.badge')}</span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0D0D0D] mb-4">
            {t('bnsl.planner.title')} <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] bg-clip-text text-transparent">{t('bnsl.planner.titleHighlight')}</span>
          </h2>
          <p className="text-[#4A4A4A] text-lg max-w-2xl mx-auto">
            {t('bnsl.planner.subtitle')}
          </p>
        </motion.div>
        
        {/* Main Content - Two Columns */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel: Calculator */}
          <GlassCard className="p-8" glow>
            <VaultHeroAnimation />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8A2BE2] to-[#FF2FBF] flex items-center justify-center shadow-lg shadow-[#8A2BE2]/30">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0D0D0D]">{t('bnsl.planner.badge')}</h3>
                  <p className="text-xs text-[#4A4A4A]">{t('bnsl.planner.subtitle')}</p>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-[#8A2BE2]/20 to-transparent my-6" />
              
              {/* Gold Purchase Value */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-[#4A4A4A] mb-3">{t('bnsl.planner.purchaseValue')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#8A2BE2]">$</span>
                  <Input
                    type="number"
                    value={purchaseValue}
                    onChange={(e) => setPurchaseValue(Number(e.target.value))}
                    className="w-full h-16 pl-10 text-3xl font-bold bg-white border-[#8A2BE2]/20 text-[#0D0D0D] rounded-xl focus:border-[#8A2BE2] focus:ring-[#8A2BE2]/20"
                  />
                </div>
                <Slider
                  value={[purchaseValue]}
                  onValueChange={([val]) => setPurchaseValue(val)}
                  min={1000}
                  max={100000}
                  step={1000}
                  className="mt-4"
                />
                <p className="text-xs text-[#4A4A4A] mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {t('bnsl.planner.purchaseInfo')}
                </p>
              </div>
              
              {/* Locked-In Gold Price (Read-Only) */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-[#4A4A4A]">{t('bnsl.planner.lockedPrice')}</label>
                  {!loadingPrice && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Live Price
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8A2BE2]" />
                  <Input
                    type="text"
                    value={goldPrice.toFixed(2)}
                    readOnly
                    className="w-full h-12 pl-12 pr-16 text-xl font-bold bg-[#8A2BE2]/5 border-[#8A2BE2]/30 text-[#0D0D0D] rounded-xl cursor-not-allowed"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#4A4A4A] font-medium">/gram</span>
                </div>
                <p className="text-xs text-[#4A4A4A] mt-2 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#8A2BE2]" />
                  🔒 Live market price — locked at plan start
                </p>
              </div>
              
              {/* Plan Tenure */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-[#4A4A4A] mb-3">{t('bnsl.planner.tenure')}</label>
                <div className="flex gap-3">
                  {tenureOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      onClick={() => setTenure(option.value)}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        tenure === option.value
                          ? 'bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white shadow-lg shadow-[#8A2BE2]/30'
                          : 'bg-white text-[#4A4A4A] border border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Fixed Gold Addition Rate based on Plan */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#4A4A4A] mb-3">{t('bnsl.planner.additionRate')}</label>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[#8A2BE2]/10 to-[#FF2FBF]/10 border border-[#8A2BE2]/20">
                  <span className="text-5xl font-bold bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] bg-clip-text text-transparent">
                    {additionRate}%
                  </span>
                  <div>
                    <span className="text-sm text-[#4A4A4A] block">{t('bnsl.planner.perAnnum')}</span>
                    <span className="text-xs text-[#8A2BE2]">Fixed rate for {tenure}-month plan</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
          
          {/* Right Panel: Projection Overview */}
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8A2BE2] to-[#FF2FBF] flex items-center justify-center shadow-lg shadow-[#8A2BE2]/30">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#0D0D0D]">{t('bnsl.planner.projectionTitle')}</h3>
                <p className="text-xs text-[#4A4A4A]">{t('bnsl.planner.projectionSubtitle')}</p>
              </div>
            </div>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                title="BNSL Plan Value"
                value={<AnimatedNumber value={purchaseValue} prefix="$" decimals={2} />}
                subtitle="Value of your BNSL plan"
                icon={Lock}
              />
              <MetricCard
                title="Guaranteed Buy Back Margin *"
                value={<AnimatedNumber value={additionalValue} prefix="+$" decimals={2} />}
                subtitle="Guaranteed margin on buy back"
                highlight
                icon={Sparkles}
              />
              <MetricCard
                title="Total Gold Value at Maturity *"
                value={<AnimatedNumber value={totalValue} prefix="$" decimals={2} />}
                subtitle="Combined purchased and additional gold"
                icon={Vault}
              />
              <MetricCard
                title="Quarterly Paid Margin *"
                value={<AnimatedNumber value={additionalValue / (tenure / 3)} prefix="$" decimals={2} />}
                subtitle="Margin paid every quarter + Principal paid after locking period"
                icon={Calendar}
              />
            </div>
            
            {/* Terms and Conditions note */}
            <p className="text-xs text-[#4A4A4A] mt-4">*Terms and Conditions</p>
            

            

          </div>
        </div>
      </div>
    </section>
  );
}