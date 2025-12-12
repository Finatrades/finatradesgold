import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

const plans = [
  {
    name: '3-Month Plan',
    rate: '9%',
    minGold: '10g',
    payouts: '1',
    features: ['Quarterly margin payout', 'Early exit with penalty', 'Standard support'],
    popular: false
  },
  {
    name: '6-Month Plan',
    rate: '12%',
    minGold: '25g',
    payouts: '2',
    features: ['Quarterly margin payouts', 'Flexible rollover options', 'Priority support', 'Lower exit fees'],
    popular: true
  },
  {
    name: '9-Month Plan',
    rate: '15%',
    minGold: '50g',
    payouts: '3',
    features: ['Quarterly margin payouts', 'Enhanced rollover bonus', 'Dedicated account manager', 'Lowest exit fees'],
    popular: false
  },
  {
    name: '12-Month Plan',
    rate: '18%',
    minGold: '100g',
    payouts: '4',
    features: ['Quarterly margin payouts', 'Premium rollover bonus', 'VIP account manager', 'No exit fees after 9 months'],
    popular: false
  }
];

export default function BNSLPlanComparison() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold tracking-widest text-[#9333EA] uppercase mb-4 block">
            PLAN COMPARISON
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
            Choose Your BNSL Plan
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Compare our plans and select the one that best fits your investment goals.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-6 rounded-3xl border-2 transition-all ${
                plan.popular 
                  ? 'border-[#9333EA] bg-gradient-to-b from-[#9333EA]/5 to-white shadow-xl' 
                  : 'border-gray-200 bg-white hover:border-[#9333EA]/50'
              }`}
              data-testid={`card-plan-${index}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-xs font-semibold text-white flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Most Popular
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-[#9333EA] mb-1">{plan.rate}</div>
                <p className="text-sm text-gray-500">Annual Return</p>
              </div>

              <div className="space-y-3 mb-6 pb-6 border-b border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Min. Gold</span>
                  <span className="font-medium text-gray-900">{plan.minGold}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payouts</span>
                  <span className="font-medium text-gray-900">{plan.payouts}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button 
                  className={`w-full rounded-full ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  data-testid={`button-select-plan-${index}`}
                >
                  Select Plan
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
