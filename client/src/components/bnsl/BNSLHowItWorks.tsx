import React from 'react';
import { motion } from 'framer-motion';
import { Coins, Clock, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BNSLHowItWorksProps {
  onOpenCalculator?: () => void;
}

const steps = [
  {
    number: '01',
    icon: Coins,
    title: 'Lock Your Gold',
    description: 'Transfer gold from your FinaPay wallet to a BNSL plan at the current market price.',
    position: 'left'
  },
  {
    number: '02',
    icon: Clock,
    title: 'Choose Your Tenor',
    description: 'Select a plan duration: 3, 6, 9, or 12 months with corresponding margin rates.',
    position: 'right'
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Earn Quarterly Margins',
    description: 'Receive guaranteed margin payouts every quarter directly to your wallet.',
    position: 'left'
  },
  {
    number: '04',
    icon: Wallet,
    title: 'Receive Settlement',
    description: 'At maturity, receive the locked base price in USD or roll over into a new plan.',
    position: 'right'
  }
];

export default function BNSLHowItWorks({ onOpenCalculator }: BNSLHowItWorksProps) {
  return (
    <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-purple-100/30 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-pink-100/30 blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-[#EC4899]/10 to-[#9333EA]/10 border border-[#9333EA]/20 text-sm font-semibold text-[#9333EA] uppercase tracking-wider mb-6">
            HOW BNSL WORKS
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">
            <span className="text-gray-900">Simple Steps to </span>
            <span className="bg-gradient-to-r from-[#9333EA] to-[#EC4899] bg-clip-text text-transparent">Guaranteed Returns</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Lock your gold at today's price and earn quarterly margin payouts with our structured deferred sale agreements.
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#EC4899]/20 via-[#9333EA] to-[#EC4899]/20 hidden lg:block" style={{ transform: 'translateX(-50%)' }} />
          
          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: step.position === 'left' ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className={`relative flex items-center gap-8 lg:h-[200px] ${step.position === 'right' ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className={`flex-1 ${step.position === 'right' ? 'lg:text-left' : 'lg:text-right'}`}>
                  <div className={`p-6 rounded-2xl bg-white border border-gray-100 shadow-md hover:shadow-lg transition-all inline-block max-w-sm ${step.position === 'right' ? '' : 'lg:ml-auto'}`}>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                
                <div className="relative z-10 hidden lg:flex items-center justify-center flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9333EA]/10 to-[#EC4899]/10 border border-[#9333EA]/20 flex items-center justify-center relative">
                    <step.icon className="w-7 h-7 text-[#9333EA]" strokeWidth={1.5} />
                    <span className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-[#9333EA] to-[#EC4899] text-white text-xs font-bold flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 hidden lg:block" />
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <a href="#calculator">
            <Button 
              size="lg"
              className="px-8 h-12 bg-gradient-to-r from-[#EC4899] to-[#9333EA] hover:opacity-90 text-white rounded-full shadow-lg shadow-purple-200"
              onClick={onOpenCalculator}
              data-testid="button-bnsl-calculator"
            >
              Try the Calculator
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
