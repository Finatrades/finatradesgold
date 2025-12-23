import { motion } from 'framer-motion';
import { ArrowRight, Phone, MessageCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    headline: 'Start Your Personal Gold Journey Today',
    primaryCta: 'Open Personal Account',
    secondaryCta: 'Talk to Support',
    secondaryIcon: MessageCircle,
  },
  business: {
    headline: 'Strengthen Your Business with Real, Verified Gold Infrastructure',
    primaryCta: 'Open Corporate Account',
    secondaryCta: 'Schedule a Business Call',
    secondaryIcon: Phone,
  },
};

export default function CTA() {
  const { mode, isPersonal } = useMode();
  const c = content[mode];

  return (
    <section className="relative py-32 overflow-hidden bg-gradient-to-b from-[#F4F6FC] to-[#EDE9FE]" data-testid="cta-section">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-[700px] h-[700px] bg-[#8A2BE2]/8 rounded-full blur-[150px]" />
      </motion.div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="p-12 md:p-16 rounded-[32px] bg-gradient-to-br from-[#2A0055] to-[#0D001E] border-2 border-[#8A2BE2]/40 shadow-2xl shadow-[#8A2BE2]/20 relative overflow-hidden"
        >
          <motion.div
            animate={{ 
              background: [
                'radial-gradient(circle at 0% 0%, rgba(234, 194, 107, 0.12) 0%, transparent 50%)',
                'radial-gradient(circle at 100% 100%, rgba(234, 194, 107, 0.12) 0%, transparent 50%)',
                'radial-gradient(circle at 0% 0%, rgba(234, 194, 107, 0.12) 0%, transparent 50%)',
              ]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
          />

          <div className="relative">
            <motion.h2
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight"
            >
              {c.headline.includes('Gold') ? (
                <>
                  {c.headline.split('Gold')[0]}
                  <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">Gold</span>
                  {c.headline.split('Gold')[1]}
                </>
              ) : (
                c.headline
              )}
            </motion.h2>
            
            <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
              {isPersonal 
                ? 'Open your personal account and start saving in real, physical gold today.'
                : 'Partner with Finatrades to strengthen your treasury and trade operations.'}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group flex items-center gap-2 bg-[#F97316] text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-[#EA580C] transition-all shadow-lg shadow-[#F97316]/25 cursor-pointer"
                  data-testid="cta-primary"
                >
                  {c.primaryCta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.a>
              </Link>
              <Link href="/login">
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group flex items-center gap-2 border border-white/30 text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-white/10 hover:border-white/50 transition-all cursor-pointer"
                  data-testid="cta-secondary"
                >
                  <c.secondaryIcon className="w-4 h-4" />
                  {c.secondaryCta}
                </motion.a>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
