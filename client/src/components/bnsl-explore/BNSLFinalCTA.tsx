import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Shield,
  TrendingUp,
  Coins,
  BadgeCheck,
  Star,
  Gift,
  Zap,
} from 'lucide-react';
import { useLocation } from 'wouter';

const features = [
  { icon: Shield, label: 'Insured Storage' },
  { icon: TrendingUp, label: 'Monthly Bonuses' },
  { icon: Coins, label: '99.99% Pure Gold' },
  { icon: BadgeCheck, label: 'Certified Ownership' },
];

export default function BNSLFinalCTA() {
  const [, setLocation] = useLocation();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animated Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-3xl"
        />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-sm font-medium text-purple-200">
              Start Your Gold Journey Today
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-bold text-white mb-6"
          >
            Ready to Invest in{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 via-yellow-400 to-purple-500 bg-clip-text text-transparent">
              Your Future?
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-300 max-w-2xl mx-auto mb-12"
          >
            Join thousands of investors who are securing their wealth with gold-backed returns. 
            Start with as little as $100 today.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300"
              >
                <feature.icon className="w-4 h-4 text-fuchsia-400" />
                <span className="text-sm font-medium">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(245, 158, 11, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation('/register')}
              className="px-10 py-5 rounded-2xl bg-gradient-to-r from-purple-500 via-yellow-500 to-purple-500 text-slate-900 font-bold text-lg shadow-xl shadow-purple-500/30 flex items-center gap-3 group"
              data-testid="button-start-investing-final"
            >
              <Zap className="w-5 h-5" />
              Start Investing Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const calculatorSection = document.getElementById('calculator');
                if (calculatorSection) {
                  calculatorSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-10 py-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition-colors flex items-center gap-2"
              data-testid="button-calculate-returns-final"
            >
              <Gift className="w-5 h-5 text-fuchsia-400" />
              Calculate Your Returns
            </motion.button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 text-gray-400 text-sm"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400" />
              <span>4.9/5 Rating</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Fully Insured</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-blue-400" />
              <span>50,000+ Investors</span>
            </div>
          </motion.div>

          {/* Decorative Gold Coins */}
          <div className="absolute bottom-10 left-10 hidden lg:block">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
                className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-400 to-yellow-500 shadow-lg flex items-center justify-center"
                style={{
                  left: `${i * 25}px`,
                  bottom: `${i * 15}px`,
                }}
              >
                <Coins className="w-4 h-4 text-fuchsia-800" />
              </motion.div>
            ))}
          </div>

          <div className="absolute bottom-10 right-10 hidden lg:block">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -10, 0],
                  rotate: [360, 180, 0],
                }}
                transition={{
                  duration: 5 + i,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
                className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-purple-300 to-yellow-400 shadow-lg flex items-center justify-center"
                style={{
                  right: `${i * 20}px`,
                  bottom: `${i * 20}px`,
                }}
              >
                <Coins className="w-3 h-3 text-fuchsia-700" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
