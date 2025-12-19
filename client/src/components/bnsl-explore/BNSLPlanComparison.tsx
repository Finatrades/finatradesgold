import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  Star,
  Sparkles,
  Clock,
  TrendingUp,
  Shield,
  Coins,
  Crown,
  Zap,
  ChevronDown,
  BadgeCheck,
} from 'lucide-react';
import { useLocation } from 'wouter';

interface PlanFeature {
  name: string;
  starter: boolean | string;
  growth: boolean | string;
  premium: boolean | string;
  elite: boolean | string;
}

interface Plan {
  id: string;
  name: string;
  duration: string;
  months: number;
  monthlyBonus: string;
  totalBonus: string;
  minInvestment: string;
  icon: React.ElementType;
  gradient: string;
  popular?: boolean;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    duration: '3 Months',
    months: 3,
    monthlyBonus: '1.0%',
    totalBonus: '3.0%',
    minInvestment: '$100',
    icon: Clock,
    gradient: 'from-gray-500 to-slate-600',
    features: [
      'Basic gold allocation',
      'Monthly bonus payouts',
      'Standard support',
      'Mobile app access',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    duration: '6 Months',
    months: 6,
    monthlyBonus: '1.5%',
    totalBonus: '9.0%',
    minInvestment: '$500',
    icon: TrendingUp,
    gradient: 'from-blue-500 to-indigo-600',
    features: [
      'Priority gold allocation',
      'Monthly bonus payouts',
      'Priority support',
      'Mobile + Desktop access',
      'Price alerts',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    duration: '9 Months',
    months: 9,
    monthlyBonus: '2.0%',
    totalBonus: '18.0%',
    minInvestment: '$1,000',
    icon: Crown,
    gradient: 'from-purple-500 to-fuchsia-600',
    popular: true,
    features: [
      'Premium gold allocation',
      'Monthly bonus payouts',
      '24/7 VIP support',
      'All platform access',
      'Price alerts + Analytics',
      'Early sell option',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    duration: '12 Months',
    months: 12,
    monthlyBonus: '2.5%',
    totalBonus: '30.0%',
    minInvestment: '$5,000',
    icon: Zap,
    gradient: 'from-purple-500 to-yellow-600',
    features: [
      'Elite gold allocation',
      'Monthly + Compound options',
      'Dedicated account manager',
      'All platform access',
      'Full analytics suite',
      'Flexible sell options',
      'Exclusive member benefits',
    ],
  },
];

const comparisonFeatures: PlanFeature[] = [
  { name: 'Monthly Bonus Rate', starter: '1.0%', growth: '1.5%', premium: '2.0%', elite: '2.5%' },
  { name: 'Minimum Investment', starter: '$100', growth: '$500', premium: '$1,000', elite: '$5,000' },
  { name: 'Lock Period', starter: '3 months', growth: '6 months', premium: '9 months', elite: '12 months' },
  { name: 'Compound Option', starter: false, growth: false, premium: true, elite: true },
  { name: 'Early Sell (after 50%)', starter: false, growth: false, premium: true, elite: true },
  { name: 'Priority Support', starter: false, growth: true, premium: true, elite: true },
  { name: 'Dedicated Manager', starter: false, growth: false, premium: false, elite: true },
  { name: 'Price Alerts', starter: false, growth: true, premium: true, elite: true },
  { name: 'Analytics Dashboard', starter: false, growth: false, premium: true, elite: true },
  { name: 'Exclusive Benefits', starter: false, growth: false, premium: false, elite: true },
];

export default function BNSLPlanComparison() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [showFullComparison, setShowFullComparison] = useState(false);

  return (
    <section className="py-24 bg-gradient-to-b from-white via-gray-50/30 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full border border-dashed border-purple-100/50"
        />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-purple-100/20 blur-3xl" />
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-purple-50 border border-purple-200/50 mb-6"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Choose Your Plan</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Investment{' '}
            <span className="bg-gradient-to-r from-purple-500 to-purple-500 bg-clip-text text-transparent">
              Plans
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the plan that matches your investment goals
          </p>
        </motion.div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
                  >
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-yellow-500 text-white text-xs font-bold shadow-lg">
                      <Star className="w-3 h-3" />
                      MOST POPULAR
                    </div>
                  </motion.div>
                )}

                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`h-full p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? `border-transparent bg-gradient-to-br ${plan.gradient} text-white shadow-xl`
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg'
                  }`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                      isSelected ? 'bg-white/20' : `bg-gradient-to-br ${plan.gradient}`
                    }`}
                  >
                    <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-white'}`} />
                  </div>

                  {/* Plan Info */}
                  <h3 className={`text-xl font-bold mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mb-4 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                    {plan.duration}
                  </p>

                  {/* Bonus Rate */}
                  <div className="mb-4">
                    <div className={`text-4xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {plan.monthlyBonus}
                    </div>
                    <div className={`text-sm ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                      monthly bonus
                    </div>
                  </div>

                  {/* Total Bonus Badge */}
                  <div
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200/50'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Up to {plan.totalBonus} total
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check
                          className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-emerald-500'}`}
                        />
                        <span
                          className={`text-sm ${isSelected ? 'text-white/90' : 'text-gray-600'}`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Min Investment */}
                  <div
                    className={`pt-4 border-t ${isSelected ? 'border-white/20' : 'border-gray-100'}`}
                  >
                    <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                      Minimum investment
                    </div>
                    <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {plan.minInvestment}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation('/register')}
            className="px-10 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-yellow-500 text-white font-semibold text-lg shadow-lg shadow-purple-200/50 inline-flex items-center gap-2"
            data-testid="button-get-started-plan"
          >
            Get Started with {plans.find((p) => p.id === selectedPlan)?.name}
            <BadgeCheck className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Full Comparison Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.button
            onClick={() => setShowFullComparison(!showFullComparison)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            data-testid="button-toggle-comparison"
          >
            <span>{showFullComparison ? 'Hide' : 'Show'} Full Comparison</span>
            <motion.div animate={{ rotate: showFullComparison ? 180 : 0 }}>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Full Comparison Table */}
        {showFullComparison && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-12 overflow-hidden"
          >
            <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left p-4 font-semibold text-gray-700">Feature</th>
                      {plans.map((plan) => (
                        <th key={plan.id} className="p-4 text-center">
                          <div className="font-bold text-gray-900">{plan.name}</div>
                          <div className="text-xs text-gray-500">{plan.duration}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feature, index) => (
                      <tr
                        key={feature.name}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                      >
                        <td className="p-4 text-gray-700 font-medium">{feature.name}</td>
                        {['starter', 'growth', 'premium', 'elite'].map((planId) => {
                          const value = feature[planId as keyof PlanFeature];
                          return (
                            <td key={planId} className="p-4 text-center">
                              {typeof value === 'boolean' ? (
                                value ? (
                                  <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-gray-300 mx-auto" />
                                )
                              ) : (
                                <span className="font-medium text-gray-900">{value}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
