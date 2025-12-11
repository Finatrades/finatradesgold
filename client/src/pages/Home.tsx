import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Globe, Database, Wallet, TrendingUp } from 'lucide-react';
import FloatingAgentChat from '@/components/FloatingAgentChat';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
  const { t } = useLanguage();
  const { accountType, toggleAccountType } = useAccountType();

  return (
    <div className="min-h-screen bg-[#0D001E] text-white font-sans selection:bg-[#8A2BE2] selection:text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-40 bg-[#0D001E]/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#D4AF37] to-[#8A2BE2] rounded-lg" />
            <span className="text-xl font-bold tracking-tight">Finatrades</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium hover:text-[#D4AF37] transition-colors">{t('nav.home')}</a>
            <a href="#" className="text-sm font-medium hover:text-[#D4AF37] transition-colors">{t('nav.finavault')}</a>
            <a href="#" className="text-sm font-medium hover:text-[#D4AF37] transition-colors">{t('nav.finapay')}</a>
            <a href="#" className="text-sm font-medium hover:text-[#D4AF37] transition-colors">{t('nav.bnsl')}</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleAccountType}
              className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
            >
              {accountType === 'personal' ? t('nav.personal') : t('nav.business')}
            </button>
            <LanguageSwitcher />
            <Button className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-semibold">
              {t('common.getStarted')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[#8A2BE2]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-sm font-medium text-[#D4AF37]">{t('hero.swissRegulated')}</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
              {accountType === 'personal' ? t('hero.personal.title') : t('hero.business.title')}
            </h1>
            
            <p className="text-lg text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              {accountType === 'personal' ? t('hero.personal.description') : t('hero.business.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] hover:opacity-90 text-white rounded-full text-base">
                {accountType === 'personal' ? t('hero.personal.cta2') : t('hero.business.cta2')}
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 border-white/20 hover:bg-white/10 text-white rounded-full text-base bg-transparent">
                {t('common.learnMore')}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-24 bg-[#0A0018]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('products.title')}</h2>
            <p className="text-white/60">{t('products.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* FinaVault */}
            <ProductCard 
              icon={<Database className="w-8 h-8 text-[#D4AF37]" />}
              title={accountType === 'personal' ? t('products.personal.finavault.name') : t('products.business.finavault.name')}
              tagline={accountType === 'personal' ? t('products.personal.finavault.tagline') : t('products.business.finavault.tagline')}
              description={accountType === 'personal' ? t('products.personal.finavault.description') : t('products.business.finavault.description')}
            />
            
            {/* FinaPay */}
            <ProductCard 
              icon={<Wallet className="w-8 h-8 text-[#8A2BE2]" />}
              title={accountType === 'personal' ? t('products.personal.finapay.name') : t('products.business.finapay.name')}
              tagline={accountType === 'personal' ? t('products.personal.finapay.tagline') : t('products.business.finapay.tagline')}
              description={accountType === 'personal' ? t('products.personal.finapay.description') : t('products.business.finapay.description')}
            />

            {/* BNSL / FinaBridge */}
            <ProductCard 
              icon={accountType === 'personal' ? <TrendingUp className="w-8 h-8 text-[#FF2FBF]" /> : <Globe className="w-8 h-8 text-[#FF2FBF]" />}
              title={accountType === 'personal' ? t('products.personal.bnsl.name') : t('products.business.finabridge.name')}
              tagline={accountType === 'personal' ? t('products.personal.bnsl.tagline') : t('products.business.finabridge.tagline')}
              description={accountType === 'personal' ? t('products.personal.bnsl.description') : t('products.business.finabridge.description')}
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                {accountType === 'personal' ? t('about.title') : t('about.titleBusiness')}
              </h2>
              <p className="text-lg text-white/60 mb-8 leading-relaxed">
                {accountType === 'personal' ? t('about.subtitle') : t('about.subtitleBusiness')}
              </p>
              
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    </div>
                    <p className="text-white/80">
                      {t(`about.${accountType === 'personal' ? 'personal' : 'business'}.point${i}`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] blur-[100px] opacity-20 rounded-full" />
              <div className="relative z-10 rounded-3xl overflow-hidden border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h4 className="text-[#D4AF37] font-bold text-2xl mb-1">99.99%</h4>
                    <p className="text-xs text-white/60">Gold Purity</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h4 className="text-[#8A2BE2] font-bold text-2xl mb-1">100%</h4>
                    <p className="text-xs text-white/60">Backed</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h4 className="text-[#FF2FBF] font-bold text-2xl mb-1">24/7</h4>
                    <p className="text-xs text-white/60">Access</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h4 className="text-white font-bold text-2xl mb-1">CH</h4>
                    <p className="text-xs text-white/60">Regulated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Agent */}
      <FloatingAgentChat />
    </div>
  );
}

function ProductCard({ icon, title, tagline, description }: { icon: React.ReactNode, title: string, tagline: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 transition-colors group"
    >
      <div className="mb-6 p-4 rounded-2xl bg-white/5 w-fit group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-sm font-medium text-[#D4AF37] mb-4">{tagline}</p>
      <p className="text-white/60 leading-relaxed mb-6">{description}</p>
      <div className="flex items-center text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">
        Learn more <ArrowRight className="w-4 h-4 ml-2" />
      </div>
    </motion.div>
  );
}
