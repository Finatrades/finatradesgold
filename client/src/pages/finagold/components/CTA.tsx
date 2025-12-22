import { motion } from 'framer-motion';
import { ArrowRight, Phone } from 'lucide-react';

export default function CTA() {
  return (
    <section className="relative py-32 overflow-hidden" data-testid="cta-section">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0A0A0A] to-black" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-[600px] h-[600px] bg-[#EAC26B]/10 rounded-full blur-[120px]" />
      </motion.div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="p-12 md:p-16 rounded-[32px] bg-gradient-to-br from-white/5 to-transparent border border-[#EAC26B]/20 backdrop-blur-sm relative overflow-hidden"
        >
          <motion.div
            animate={{ 
              background: [
                'radial-gradient(circle at 0% 0%, rgba(234, 194, 107, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 100% 100%, rgba(234, 194, 107, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 0% 0%, rgba(234, 194, 107, 0.15) 0%, transparent 50%)',
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
          />

          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to use{' '}
              <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">
                Finagold
              </span>
              ?
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Open your personal account and start sending, paying, and earning—instantly.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-2 bg-[#EAC26B] text-black px-8 py-4 rounded-full text-sm font-semibold hover:bg-[#d4af5a] transition-all shadow-lg shadow-[#EAC26B]/20"
                data-testid="cta-open-account"
              >
                Open Account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-2 border border-white/20 text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-white/5 transition-all"
                data-testid="cta-schedule-call"
              >
                <Phone className="w-4 h-4" />
                Schedule a Call
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
