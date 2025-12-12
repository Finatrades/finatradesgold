import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const getRisks = (t) => [
  t('bnslRisk.risk1'),
  t('bnslRisk.risk2'),
  t('bnslRisk.risk3'),
  t('bnslRisk.risk4'),
  t('bnslRisk.risk5')
];

export default function BNSLRiskDisclosure() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useLanguage();
  const risks = getRisks(t);

  return (
    <section ref={ref} className="relative py-20 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#FAFBFF] overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <motion.div
          className="p-8 rounded-3xl bg-white backdrop-blur-sm border border-amber-500/20 shadow-[0_8px_32px_rgba(245,158,11,0.08)]"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ boxShadow: '0 0 40px rgba(245,158,11,0.05)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-light text-[#0D0D0D]">{t('bnslRisk.title')}</h3>
              <p className="text-sm text-amber-500/80">{t('bnslRisk.subtitle')}</p>
            </div>
          </div>

          {/* Risk items */}
          <div className="space-y-3">
            {risks.map((risk, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-500/20"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <ChevronRight className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[#4A4A4A]">{risk}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}