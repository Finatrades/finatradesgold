import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Sparkles, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';

export default function PremiumHeroSection() {
  const { t } = useLanguage();
  const { accountType, setAccountType } = useAccountType();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-white via-purple-50/50 to-pink-50/30">
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-purple-200 shadow-sm mb-6">
              <Sparkles className="w-4 h-4 text-[#FF6B2F]" />
              <span className="text-sm font-medium text-purple-700">{t('hero.swissRegulated')}</span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>

            <div className="inline-flex items-center p-1 rounded-full bg-white border border-gray-200 shadow-sm mb-8">
              <button
                onClick={() => setAccountType('personal')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  accountType === 'personal' 
                    ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                data-testid="hero-button-personal"
              >
                <User className="w-4 h-4" />
                Personal
              </button>
              <button
                onClick={() => setAccountType('business')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  accountType === 'business' 
                    ? 'bg-[#6B21A8] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                data-testid="hero-button-business"
              >
                <Building2 className="w-4 h-4" />
                Business
              </button>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              <span className="bg-gradient-to-r from-[#6B21A8] to-[#9333EA] bg-clip-text text-transparent">
                Finatrades
              </span>
              <br />
              <span className="text-gray-900">
                {accountType === 'personal' 
                  ? 'Personal Gold-Backed Financial Infrastructure'
                  : 'Regulated Gold-Backed Financial Infrastructure'}
              </span>
            </h1>

            <p className="text-lg text-gray-600 mb-8 max-w-xl leading-relaxed">
              {accountType === 'personal' 
                ? 'Designed for individuals seeking secure gold storage, digital payments, and wealth growth through our regulated platform.'
                : 'Designed for corporates, importers, exporters, trading houses, and institutional partners.'}
            </p>
            
            <p className="text-sm text-gray-500 mb-8 max-w-lg">
              Thanks to a strategic partnership with Wingold and Metals DMCC, Finatrades transforms physical gold into a settlement-ready financial instruments.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/login">
                <Button 
                  variant="outline"
                  size="lg" 
                  className="h-12 px-8 rounded-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  data-testid="button-hero-signin"
                >
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="h-12 px-8 bg-gradient-to-r from-[#FF6B2F] to-[#FF8F5F] hover:opacity-90 text-white rounded-full shadow-lg shadow-orange-200"
                  data-testid="button-hero-register"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="absolute -top-4 right-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-purple-200 shadow-sm z-10">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs font-medium text-purple-700">Swiss-Regulated Platform</span>
            </div>
            
            <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#3d2066] rounded-3xl p-8 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-2xl rounded-full" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] rounded-lg" />
                  <span className="text-white font-semibold text-sm">FINATRADES</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-green-400 text-xs">ACTIVE</span>
                </div>
              </div>
              
              <div className="mb-4">
                <span className="text-purple-300 text-xs uppercase tracking-wide">Enterprise Gold</span>
                <p className="text-gray-400 text-xs">Gold-Backed Digital</p>
              </div>
              
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-white/10 rounded-xl p-4">
                  <span className="text-3xl font-bold text-white">5892</span>
                </div>
                <div className="flex-1 bg-white/10 rounded-xl p-4">
                  <span className="text-3xl font-bold text-white">7821</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs uppercase">Card Holder</p>
                  <p className="text-white font-medium">FINATRADES CORPORATE</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs uppercase">Valid Thru</p>
                  <p className="text-white font-medium">12/28</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-full">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span className="text-green-400 text-xs">SECURED</span>
                </div>
              </div>
              
              <div className="absolute bottom-4 left-4 w-12 h-10 bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] rounded-md" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
