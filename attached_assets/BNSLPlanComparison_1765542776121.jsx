import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Clock, TrendingUp, Calendar, Lock, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const getPlans = (t) => [
  {
    months: 12,
    rate: 10,
    cycles: 4,
    label: t('bnslPlan.shortTerm'),
    description: t('bnslPlan.shortDesc'),
    features: [
      t('bnslPlan.feature1.12'),
      t('bnslPlan.feature2.12'),
      t('bnslPlan.feature3.12'),
      t('bnslPlan.feature4.12')
    ]
  },
  {
    months: 24,
    rate: 11,
    cycles: 8,
    label: t('bnslPlan.balanced'),
    description: t('bnslPlan.balancedDesc'),
    featured: true,
    features: [
      t('bnslPlan.feature1.24'),
      t('bnslPlan.feature2.24'),
      t('bnslPlan.feature3.24'),
      t('bnslPlan.feature4.24')
    ]
  },
  {
    months: 36,
    rate: 12,
    cycles: 12,
    label: t('bnslPlan.longTerm'),
    description: t('bnslPlan.longDesc'),
    features: [
      t('bnslPlan.feature1.36'),
      t('bnslPlan.feature2.36'),
      t('bnslPlan.feature3.36'),
      t('bnslPlan.feature4.36')
    ]
  }
];

function PlanCard({ plan, index, isInView, t }) {
  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
    >
      {/* Featured badge */}
      {plan.featured && (
        <motion.div
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white text-xs font-medium"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {t('bnslPlan.mostPopular')}
        </motion.div>
      )}

      {/* Card */}
      <motion.div
        className={`relative h-full p-8 rounded-3xl bg-white backdrop-blur-sm border overflow-hidden transition-all duration-500 shadow-[0_8px_32px_rgba(138,43,226,0.08)] ${
          plan.featured ? 'border-[#8A2BE2]/60' : 'border-[#8A2BE2]/20 group-hover:border-[#8A2BE2]/50'
        }`}
        whileHover={{ 
          y: -8,
          boxShadow: '0 20px 60px rgba(212,175,55,0.15)'
        }}
      >
        {/* Glow effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />

        {/* Inner glow */}
        {plan.featured && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent" />
        )}

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-[#8A2BE2] text-sm tracking-widest uppercase">{plan.label}</span>
            <motion.div
              className="w-24 h-24 mx-auto my-6 rounded-full bg-gradient-to-br from-[#8A2BE2]/20 to-[#FF2FBF]/10 border border-[#8A2BE2]/30 flex items-center justify-center"
              animate={isInView ? {
                boxShadow: ['0 0 0px rgba(212,175,55,0)', '0 0 30px rgba(212,175,55,0.4)', '0 0 0px rgba(212,175,55,0)']
              } : {}}
              transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
            >
              <span className="text-4xl font-light text-[#8A2BE2]">{plan.months}</span>
            </motion.div>
            <p className="text-[#4A4A4A]">{plan.description}</p>
          </div>

          {/* Rate */}
          <div className="text-center mb-8 py-6 border-y border-[#8A2BE2]/10">
            <div className="text-5xl font-extralight text-[#0D0D0D] mb-2">
              ~{plan.rate}%
            </div>
            <div className="text-[#8A2BE2] text-sm">{t('bnslPlan.growthRate')}</div>
          </div>

          {/* Growth cycles visualization */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-[#4A4A4A]">{t('bnslPlan.growthCycles')}</span>
                            <span className="text-sm text-[#8A2BE2]">{plan.cycles} {t('bnslPlan.quarters')}</span>
                          </div>
            <div className="flex gap-1">
              {[...Array(plan.cycles)].map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 h-2 rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF]"
                  initial={{ scaleX: 0 }}
                  animate={isInView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
                  style={{ originX: 0 }}
                />
              ))}
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-3 text-[#4A4A4A] text-sm"
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#8A2BE2] mt-2 flex-shrink-0" />
                {feature}
              </motion.li>
            ))}
          </ul>

          {/* CTA */}
          <motion.button
            className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              plan.featured
                ? 'bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white'
                : 'border border-[#8A2BE2]/40 text-[#8A2BE2] hover:bg-[#8A2BE2]/10'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('bnslPlan.select')} {plan.months}-{t('bnslPlan.months')}
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Corner accents */}
        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-[#D4AF37]/30 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-[#D4AF37]/30 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-[#D4AF37]/30 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-[#D4AF37]/30 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    </motion.div>
  );
}

export default function BNSLPlanComparison() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useLanguage();
  const plans = getPlans(t);

  return (
    <section ref={ref} className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#FAFBFF] overflow-hidden">
      {/* Background glow */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 60%)' }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[#8A2BE2] text-sm tracking-[0.3em] uppercase mb-4">{t('bnslPlan.badge')}</p>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0D0D0D] mb-4">
            {t('bnslPlan.title')} <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] bg-clip-text text-transparent">{t('bnslPlan.titleHighlight')}</span>
          </h2>
          <p className="text-[#4A4A4A] max-w-2xl mx-auto">
            {t('bnslPlan.subtitle')}
          </p>
        </motion.div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <PlanCard key={plan.months} plan={plan} index={i} isInView={isInView} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}