import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';

export default function PremiumHeroSection() {
  const { t } = useLanguage();
  const { accountType } = useAccountType();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#0D001E] via-[#2A0055] to-[#4B0082]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#D4AF37]/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#FF2FBF]/15 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#4B0082]/30 blur-[100px] rounded-full" />
      </div>

      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(212,175,55,0.1) 1px, transparent 0)',
        backgroundSize: '50px 50px'
      }} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-[#D4AF37]/30 backdrop-blur-sm mb-8">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-sm font-medium text-white/90">{t('hero.swissRegulated')}</span>
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
              <span className="text-white">
                {accountType === 'personal' ? 'Your Gold.' : 'Corporate Gold.'}
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent">
                {accountType === 'personal' ? 'Your Future.' : 'Your Advantage.'}
              </span>
            </h1>

            <p className="text-lg lg:text-xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
              {accountType === 'personal' 
                ? t('hero.personal.description')
                : t('hero.business.description')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="h-14 px-10 bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] hover:opacity-90 text-[#0D001E] font-semibold rounded-full text-base shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_40px_rgba(212,175,55,0.6)] transition-all"
                  data-testid="button-hero-register"
                >
                  {accountType === 'personal' ? 'Start Your Journey' : 'Get Started'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href={accountType === 'personal' ? '/finapay' : '/finabridge'}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-14 px-10 border-white/30 hover:bg-white/10 text-white rounded-full text-base bg-transparent backdrop-blur-sm"
                  data-testid="button-hero-explore"
                >
                  Explore Products
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { value: '99.99%', label: 'Gold Purity' },
              { value: '100%', label: 'Asset Backed' },
              { value: '24/7', label: 'Access' },
              { value: 'DMCC', label: 'Certified' }
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm" data-testid={`stat-hero-${i}`}>
                <div className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] bg-clip-text text-transparent" data-testid={`text-stat-value-${i}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-white/60 mt-1" data-testid={`text-stat-label-${i}`}>{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
