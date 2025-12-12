import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const getFaqs = (t) => [
  {
    question: t('bnslFaq.q1'),
    answer: t('bnslFaq.a1')
  },
  {
    question: t('bnslFaq.q2'),
    answer: t('bnslFaq.a2')
  },
  {
    question: t('bnslFaq.q3'),
    answer: t('bnslFaq.a3')
  },
  {
    question: t('bnslFaq.q4'),
    answer: t('bnslFaq.a4')
  },
  {
    question: t('bnslFaq.q5'),
    answer: t('bnslFaq.a5')
  }
];

function FAQItem({ faq, index, isOpen, onToggle, isInView }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <motion.button
        onClick={onToggle}
        className={`w-full p-6 rounded-2xl border text-left transition-all duration-300 ${
          isOpen 
            ? 'bg-white border-[#8A2BE2]/50 shadow-[0_8px_32px_rgba(138,43,226,0.1)]' 
            : 'bg-white border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40'
        }`}
        style={isOpen ? { boxShadow: '0 0 30px rgba(212,175,55,0.1)' } : {}}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isOpen 
                ? 'bg-gradient-to-br from-[#8A2BE2] to-[#FF2FBF]' 
                : 'bg-[#8A2BE2]/10'
            }`}>
              <HelpCircle className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-[#8A2BE2]'}`} />
            </div>
            <span className="text-lg font-light text-[#0D0D0D]">{faq.question}</span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className={`w-5 h-5 ${isOpen ? 'text-[#8A2BE2]' : 'text-[#4A4A4A]'}`} />
          </motion.div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-4 pl-14">
                <p className="text-[#4A4A4A] leading-relaxed">{faq.answer}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

export default function BNSLFAQ() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState(null);
  const { t } = useLanguage();
  const faqs = getFaqs(t);

  return (
    <section ref={ref} className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#FAFBFF] overflow-hidden">
      <div className="relative z-10 max-w-3xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[#8A2BE2] text-sm tracking-[0.3em] uppercase mb-4">{t('bnslFaq.badge')}</p>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0D0D0D] mb-4">
            {t('bnslFaq.title')} <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] bg-clip-text text-transparent">{t('bnslFaq.titleHighlight')}</span>
          </h2>
          <div className="w-24 h-0.5 bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] mx-auto" />
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}