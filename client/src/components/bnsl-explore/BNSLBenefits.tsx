import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  Wallet,
  Clock,
  Lock,
  Coins,
  BadgeCheck,
  RefreshCw,
  Gift,
  LineChart,
  Smartphone,
  Users,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useLocation } from 'wouter';

interface Benefit {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  details: string[];
  gradient: string;
  color: string;
}

const benefits: Benefit[] = [
  {
    id: 'security',
    icon: Shield,
    title: 'Bank-Grade Security',
    description: 'Your gold is stored in fully insured, world-class vaults with 24/7 monitoring.',
    details: [
      'Fully insured storage facilities',
      'Regular third-party audits',
      'Military-grade encryption',
      'Multi-signature access controls',
    ],
    gradient: 'from-blue-500 to-indigo-600',
    color: 'blue',
  },
  {
    id: 'returns',
    icon: TrendingUp,
    title: 'Guaranteed Monthly Bonuses',
    description: 'Earn consistent monthly bonuses on your gold holdings, paid in pure gold.',
    details: [
      'Up to 2.5% monthly bonus rate',
      'Bonuses paid in gold grams',
      'Compound bonus options',
      'Transparent tracking',
    ],
    gradient: 'from-emerald-500 to-teal-600',
    color: 'emerald',
  },
  {
    id: 'flexibility',
    icon: RefreshCw,
    title: 'Flexible Terms',
    description: 'Choose from multiple plan durations to match your investment timeline.',
    details: [
      '3 to 12 month options',
      'Early exit after 50% term',
      'Plan upgrade options',
      'Partial withdrawal support',
    ],
    gradient: 'from-orange-500 to-amber-600',
    color: 'orange',
  },
  {
    id: 'liquidity',
    icon: Wallet,
    title: 'Instant Liquidity',
    description: 'Convert your gold to cash instantly when your plan matures.',
    details: [
      'Same-day withdrawals',
      'No hidden selling fees',
      'Market rate selling',
      'Multiple payout options',
    ],
    gradient: 'from-amber-500 to-yellow-600',
    color: 'amber',
  },
  {
    id: 'ownership',
    icon: BadgeCheck,
    title: 'Full Ownership',
    description: 'You own 100% of your gold with certified digital ownership documents.',
    details: [
      'Legal ownership rights',
      'Serialized gold bars',
      'Certified documentation',
      'Physical delivery option',
    ],
    gradient: 'from-rose-500 to-pink-600',
    color: 'rose',
  },
  {
    id: 'transparency',
    icon: LineChart,
    title: 'Real-Time Tracking',
    description: 'Monitor your gold value and bonus earnings with live dashboards.',
    details: [
      'Live gold price updates',
      'Bonus accrual tracking',
      'Performance analytics',
      'Transaction history',
    ],
    gradient: 'from-cyan-500 to-blue-600',
    color: 'cyan',
  },
];

const quickStats = [
  { value: '$50M+', label: 'Gold in Custody' },
  { value: '99.99%', label: 'Gold Purity' },
  { value: '50,000+', label: 'Happy Investors' },
  { value: '0%', label: 'Hidden Fees' },
];

export default function BNSLBenefits() {
  const [, setLocation] = useLocation();
  const [activeBenefit, setActiveBenefit] = useState<string>('security');
  const activeBenefitData = benefits.find((b) => b.id === activeBenefit)!;

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 -left-20 w-96 h-96 rounded-full bg-blue-100/30 blur-3xl" />
        <div className="absolute bottom-20 right-0 w-80 h-80 rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 mb-6"
          >
            <Gift className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">Why Choose BNSL</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Unmatched{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Benefits
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the gold standard of digital gold investment
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16"
        >
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm"
            >
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Benefits Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Benefit Selector */}
            <div className="lg:col-span-1 space-y-3">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                const isActive = activeBenefit === benefit.id;

                return (
                  <motion.button
                    key={benefit.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4 }}
                    onClick={() => setActiveBenefit(benefit.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center gap-4 ${
                      isActive
                        ? 'bg-white shadow-lg border-2 border-gray-200'
                        : 'bg-white/60 hover:bg-white border-2 border-transparent hover:border-gray-100'
                    }`}
                    data-testid={`button-benefit-${benefit.id}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${benefit.gradient}`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-semibold truncate ${isActive ? 'text-gray-900' : 'text-gray-700'}`}
                      >
                        {benefit.title}
                      </h4>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-gray-900' : 'text-gray-300'
                      }`}
                    />
                  </motion.button>
                );
              })}
            </div>

            {/* Right - Active Benefit Details */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeBenefit}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <div
                    className={`h-full rounded-3xl p-8 bg-gradient-to-br ${activeBenefitData.gradient} text-white relative overflow-hidden`}
                  >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.5) 1px, transparent 0)`,
                          backgroundSize: '24px 24px',
                        }}
                      />
                    </div>

                    <div className="relative z-10">
                      {/* Icon */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6"
                      >
                        {React.createElement(activeBenefitData.icon, {
                          className: 'w-8 h-8 text-white',
                        })}
                      </motion.div>

                      {/* Title & Description */}
                      <h3 className="text-3xl font-bold mb-4">{activeBenefitData.title}</h3>
                      <p className="text-lg text-white/90 mb-8 max-w-lg">
                        {activeBenefitData.description}
                      </p>

                      {/* Details List */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        {activeBenefitData.details.map((detail, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-3 bg-white/10 rounded-lg p-3"
                          >
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                              <BadgeCheck className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-white/95">{detail}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation('/register')}
            className="px-10 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold text-lg shadow-lg shadow-amber-200/50 inline-flex items-center gap-2"
            data-testid="button-experience-benefits"
          >
            <Sparkles className="w-5 h-5" />
            Experience These Benefits
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
