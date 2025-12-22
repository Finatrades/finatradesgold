import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { UserPlus, Wallet, Zap } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Open Account',
    description: 'Sign up in minutes with a simple verification process.',
  },
  {
    icon: Wallet,
    number: '02',
    title: 'Add Funds / Balance',
    description: 'Fund your account securely via multiple payment methods.',
  },
  {
    icon: Zap,
    number: '03',
    title: 'Use Transfers, Payments, Card, and BNSL',
    description: 'Start sending, paying, and earning instantly.',
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" className="relative py-24 bg-[#0A0A0A]" data-testid="how-it-works-section">
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Get started in three simple steps
          </p>
        </motion.div>

        <div ref={ref} className="relative">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
            className="absolute top-24 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#EAC26B] to-transparent hidden md:block origin-left"
          />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                <div className="text-center p-8">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#EAC26B]/20 to-transparent border border-[#EAC26B]/30 flex items-center justify-center">
                      <step.icon className="w-8 h-8 text-[#EAC26B]" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#EAC26B] text-black text-sm font-bold flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
