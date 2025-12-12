import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function BNSLHeroVault() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-purple-200/30 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-pink-200/20 blur-[120px] rounded-full" />
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-orange-100/30 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#EC4899]/10 to-[#9333EA]/10 border border-[#9333EA]/20 mb-6">
              <TrendingUp className="w-4 h-4 text-[#9333EA]" />
              <span className="text-sm font-semibold text-[#9333EA]">BNSL GOLD PLANS</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              <span className="text-gray-900">Buy Now, </span>
              <span className="bg-gradient-to-r from-[#9333EA] to-[#EC4899] bg-clip-text text-transparent">
                Sell Later
              </span>
              <br />
              <span className="text-gray-900">Gold Plans</span>
            </h1>

            <p className="text-lg text-gray-600 mb-8 max-w-xl leading-relaxed">
              Lock in today's gold price and sell at a future date with guaranteed margins. 
              Earn substantial returns through our structured gold investment plans.
            </p>

            <div className="flex flex-wrap gap-6 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">12-18%</p>
                  <p className="text-xs text-gray-500">Annual Returns</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#9333EA]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">100%</p>
                  <p className="text-xs text-gray-500">Gold Backed</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="h-12 px-8 bg-gradient-to-r from-[#FF6B2F] to-[#FF8F5F] hover:opacity-90 text-white rounded-full shadow-lg shadow-orange-200"
                  data-testid="button-bnsl-start"
                >
                  Start a Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button 
                  variant="outline"
                  size="lg" 
                  className="h-12 px-8 rounded-full border-gray-300 text-gray-700"
                  data-testid="button-bnsl-learn"
                >
                  Learn How It Works
                </Button>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#3d2066] rounded-3xl p-8 shadow-2xl">
              <div className="absolute -top-4 -right-4 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Active Plans
              </div>
              
              <div className="mb-6 text-center">
                <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Your BNSL Portfolio</p>
                <p className="text-4xl font-bold text-white">125.50 g</p>
                <p className="text-gray-400 text-sm">Total Gold Locked</p>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/10 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">12-Month Plan</span>
                    <span className="text-green-400 text-sm">+15% APY</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] h-2 rounded-full" style={{ width: '65%' }} />
                  </div>
                  <p className="text-gray-400 text-xs mt-2">65% Complete • 4 months remaining</p>
                </div>
                
                <div className="p-4 rounded-xl bg-white/10 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">6-Month Plan</span>
                    <span className="text-green-400 text-sm">+12% APY</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] h-2 rounded-full" style={{ width: '30%' }} />
                  </div>
                  <p className="text-gray-400 text-xs mt-2">30% Complete • 4 months remaining</p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/10 flex justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Total Earned</p>
                  <p className="text-[#D4AF37] font-bold text-xl">$2,450.00</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Next Payout</p>
                  <p className="text-white font-bold text-xl">15 Jan</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
