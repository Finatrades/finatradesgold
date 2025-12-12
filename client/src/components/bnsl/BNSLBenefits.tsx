import React from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, Clock, Wallet, Lock, BarChart3 } from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Guaranteed Returns',
    description: 'Lock in your margin rate at the start. No surprises, no market fluctuations affecting your returns.'
  },
  {
    icon: Shield,
    title: '100% Gold Backed',
    description: 'Your gold remains safely stored in certified vaults throughout the plan duration.'
  },
  {
    icon: Clock,
    title: 'Quarterly Payouts',
    description: 'Receive your margin earnings every quarter, providing regular cash flow.'
  },
  {
    icon: Wallet,
    title: 'Flexible Exit Options',
    description: 'Exit early if needed with transparent penalty structures clearly defined upfront.'
  },
  {
    icon: Lock,
    title: 'Price Protection',
    description: "Lock today's gold price. You're protected from price drops during your plan."
  },
  {
    icon: BarChart3,
    title: 'Rollover Bonuses',
    description: 'Extend your plan at maturity and receive bonus margin rates on renewals.'
  }
];

export default function BNSLBenefits() {
  return (
    <section className="py-24 bg-[#1a1a2e] text-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Why Choose <span className="bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] bg-clip-text text-transparent">BNSL Plans</span>?
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Discover the advantages of our Buy Now, Sell Later gold investment plans.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#D4AF37]/30 transition-all"
              data-testid={`card-benefit-${index}`}
            >
              <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] w-fit group-hover:scale-110 transition-transform">
                <benefit.icon className="w-6 h-6 text-[#1a1a2e]" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white group-hover:text-[#D4AF37] transition-colors">
                {benefit.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
