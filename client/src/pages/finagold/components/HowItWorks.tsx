import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { UserPlus, ShieldCheck, Coins, Lock, BarChart3, Clock, FileText, ArrowRightLeft } from 'lucide-react';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    title: 'How Your Personal Gold Account Works',
    steps: [
      { icon: UserPlus, number: '01', title: 'Create Your Account', description: 'Register as an individual user with basic information.' },
      { icon: ShieldCheck, number: '02', title: 'Complete Identity Verification', description: 'Our Swiss-regulated compliance process verifies your documents securely.' },
      { icon: Coins, number: '03', title: 'Deposit or Buy Gold', description: 'Deposit existing physical gold via approved partners, or buy new gold (where available).' },
      { icon: Lock, number: '04', title: 'Vault Storage Confirmation', description: 'Your gold is securely stored in approved vaults with full documentation.' },
      { icon: BarChart3, number: '05', title: 'Track Your Gold 24/7', description: 'View grams, certificates, and estimated value directly in your dashboard.' },
      { icon: Clock, number: '06', title: 'Optional: Join Holding Plans', description: 'Lock gold into structured holding plans like BNSL for defined terms and visibility.' },
    ],
  },
  business: {
    title: 'How Finatrades Works for Your Business',
    steps: [
      { icon: UserPlus, number: '01', title: 'Register a Corporate Profile', description: 'Submit company details, documents, and authorized signatories.' },
      { icon: ShieldCheck, number: '02', title: 'KYB & Compliance Review', description: 'We verify corporate identity, structure, and compliance requirements.' },
      { icon: Lock, number: '03', title: 'Create Your Gold Reserve Account', description: 'Set user roles, permissions, and operational limits.' },
      { icon: Coins, number: '04', title: 'Deposit Physical Gold', description: 'Move existing bars into approved vaults via secure procedures.' },
      { icon: FileText, number: '05', title: 'Receive Vault Certificates', description: 'Each deposit generates a standardized certificate for internal and external use.' },
      { icon: ArrowRightLeft, number: '06', title: 'Use Gold Value for Trade & Treasury', description: 'Integrate gold value into settlement terms, collateral needs, or internal treasury planning.' },
      { icon: BarChart3, number: '07', title: 'Reporting & Audit Tools', description: 'Export reports for internal audit, financial statements, or stakeholders.' },
    ],
  },
};

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const { mode } = useMode();
  const c = content[mode];

  return (
    <section id="how-it-works" className="relative py-24 bg-[#050505]" data-testid="how-it-works-section">
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.h2
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            {c.title}
          </motion.h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A clear, step-by-step journey to managing real gold
          </p>
        </motion.div>

        <div ref={ref} className="relative">
          <motion.div
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
            className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#EAC26B] via-[#EAC26B]/50 to-transparent hidden lg:block origin-top -translate-x-1/2"
          />

          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-8 lg:space-y-0"
          >
            {c.steps.map((step, index) => (
              <motion.div
                key={`${mode}-${step.number}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative flex items-center gap-8 lg:gap-16 ${
                  index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                  <div className={`p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#EAC26B]/20 transition-colors inline-block ${index % 2 === 0 ? 'lg:ml-auto' : ''}`}>
                    <div className={`flex items-center gap-4 mb-3 ${index % 2 === 0 ? 'lg:flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 rounded-xl bg-[#EAC26B]/10 flex items-center justify-center">
                        <step.icon className="w-6 h-6 text-[#EAC26B]" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-sm">{step.description}</p>
                  </div>
                </div>

                <div className="hidden lg:flex items-center justify-center relative z-10">
                  <div className="w-14 h-14 rounded-full bg-black border-2 border-[#EAC26B] flex items-center justify-center">
                    <span className="text-[#EAC26B] font-bold text-sm">{step.number}</span>
                  </div>
                </div>

                <div className="flex-1 hidden lg:block" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
