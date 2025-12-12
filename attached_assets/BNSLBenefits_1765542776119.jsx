import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Shield, Lock, Calendar, Vault } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const getBenefits = (t) => [
  {
    icon: Shield,
    title: t('bnslBenefits.benefit1.title'),
    description: t('bnslBenefits.benefit1.desc')
  },
  {
    icon: Lock,
    title: t('bnslBenefits.benefit2.title'),
    description: t('bnslBenefits.benefit2.desc')
  },
  {
    icon: Calendar,
    title: t('bnslBenefits.benefit3.title'),
    description: t('bnslBenefits.benefit3.desc')
  },
  {
    icon: Vault,
    title: t('bnslBenefits.benefit4.title'),
    description: t('bnslBenefits.benefit4.desc')
  }
];

function BenefitCard({ benefit, index, isInView }) {
  const Icon = benefit.icon;
  
  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <motion.div
        className="h-full p-8 rounded-3xl bg-white backdrop-blur-sm border border-[#8A2BE2]/20 group-hover:border-[#8A2BE2]/50 transition-all duration-500 shadow-[0_8px_32px_rgba(138,43,226,0.08)]"
        whileHover={{ 
          y: -5,
          boxShadow: '0 20px 50px rgba(212,175,55,0.1)'
        }}
      >
        {/* Icon */}
        <motion.div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8A2BE2]/20 to-[#FF2FBF]/10 border border-[#8A2BE2]/30 flex items-center justify-center mb-6"
          animate={isInView ? {
            boxShadow: ['0 0 0px rgba(212,175,55,0)', '0 0 25px rgba(212,175,55,0.4)', '0 0 0px rgba(212,175,55,0)']
          } : {}}
          transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
        >
          <Icon className="w-7 h-7 text-[#8A2BE2]" />
        </motion.div>

        {/* Content */}
        <h3 className="text-xl font-light text-[#0D0D0D] mb-3">{benefit.title}</h3>
        <p className="text-[#4A4A4A] leading-relaxed">{benefit.description}</p>

        {/* Hover glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </motion.div>
    </motion.div>
  );
}

export default function BNSLBenefits() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useLanguage();
  const benefits = getBenefits(t);

  return (
    <section ref={ref} className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#FAFBFF] overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#D4AF37]/30"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[#8A2BE2] text-sm tracking-[0.3em] uppercase mb-4">{t('bnslBenefits.badge')}</p>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0D0D0D] mb-4">
            {t('bnslBenefits.title')} <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] bg-clip-text text-transparent">{t('bnslBenefits.titleHighlight')}</span>
          </h2>
          <div className="w-24 h-0.5 bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] mx-auto" />
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, i) => (
            <BenefitCard key={i} benefit={benefit} index={i} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  );
}