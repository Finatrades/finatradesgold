import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/components/LanguageContext';

export default function BNSLFinalCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useLanguage();

  return (
    <section ref={ref} className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#FAFBFF] overflow-hidden">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.1) 0%, transparent 50%)'
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      {/* Gold halo */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 60%)'
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.6, 0.9, 0.6]
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Shimmer lines */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.05) 50%, transparent 100%)',
          backgroundSize: '200% 100%'
        }}
        animate={{ backgroundPosition: ['-100% 0', '200% 0'] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      {/* Floating particles */}
      {[...Array(40)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `radial-gradient(circle, rgba(247,216,120,${0.3 + Math.random() * 0.4}) 0%, transparent 70%)`
          }}
          animate={{
            y: [0, -60 - Math.random() * 40],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      ))}

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Headline */}
        <motion.h2
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#0D0D0D] mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          {t('bnslFinalCta.title1')}
          <motion.span
            className="block bg-gradient-to-r from-[#8A2BE2] via-[#FF66D8] to-[#FF2FBF] bg-clip-text text-transparent"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 5, repeat: Infinity }}
            style={{ backgroundSize: '200% 200%' }}
          >
            {t('bnslFinalCta.title2')}
          </motion.span>
        </motion.h2>

        {/* Subheadline */}
        <motion.p
          className="text-xl text-[#4A4A4A] mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {t('bnslFinalCta.subtitle')}
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link to={createPageUrl("Home")} onClick={() => window.scrollTo(0, 0)}>
            <motion.button
              className="group px-10 py-5 rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white text-lg font-medium flex items-center gap-3"
              whileHover={{ 
                scale: 1.03, 
                boxShadow: '0 0 50px rgba(212,175,55,0.5)' 
              }}
              whileTap={{ scale: 0.98 }}
            >
              {t('bnslFinalCta.startPlan')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
          
          <Link to={createPageUrl("Home") + "#contact"} onClick={() => window.scrollTo(0, 0)}>
            <motion.button
              className="px-10 py-5 rounded-full border border-[#8A2BE2]/40 text-[#8A2BE2] text-lg font-medium flex items-center gap-3 hover:bg-[#8A2BE2]/10 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle className="w-5 h-5" />
              {t('bnslFinalCta.support')}
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}