import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Database, Shield, Lock, CheckCircle2, FileText, Server } from 'lucide-react';
import Layout from '@/components/Layout';

export default function FinaVault() {
  const { t } = useLanguage();
  const { accountType } = useAccountType();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#D4AF37]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
                <Database className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-sm font-medium text-[#D4AF37]">{t('finavault.hero.badge')}</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
                {t('finavault.hero.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#FFE5B4]">{t('finavault.hero.titleHighlight')}</span>
              </h1>
              
              <h2 className="text-2xl text-white/80 mb-6 font-medium">
                {t('finavault.hero.subtitle')}
              </h2>
              
              <p className="text-lg text-white/60 mb-8 max-w-2xl leading-relaxed">
                {t('finavault.hero.description')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-12 px-8 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 rounded-full text-base font-semibold">
                  {t('finavault.hero.cta1')}
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 border-white/20 hover:bg-white/10 text-white rounded-full text-base bg-transparent">
                  {t('finavault.hero.cta2')}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pillars Grid */}
      <section className="py-24 bg-[#0A0018]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              {t('finavault.pillars.title')} <span className="text-[#D4AF37]">{t('finavault.pillars.titleHighlight')}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-[#D4AF37]" />}
              title={t('finavault.pillars.1.title')}
              desc={t('finavault.pillars.1.desc')}
              delay={0}
            />
            <FeatureCard 
              icon={<Server className="w-8 h-8 text-[#8A2BE2]" />}
              title={t('finavault.pillars.2.title')}
              desc={t('finavault.pillars.2.desc')}
              delay={0.1}
            />
            <FeatureCard 
              icon={<CheckCircle2 className="w-8 h-8 text-[#FF2FBF]" />}
              title={t('finavault.pillars.3.title')}
              desc={t('finavault.pillars.3.desc')}
              delay={0.2}
            />
            <FeatureCard 
              icon={<Lock className="w-8 h-8 text-white" />}
              title={t('finavault.pillars.4.title')}
              desc={t('finavault.pillars.4.desc')}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Certificate Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-gradient-to-br from-[#1A002F] to-[#0D001E] p-8 shadow-2xl">
                {/* Mock Certificate UI */}
                <div className="h-full border border-[#D4AF37]/20 p-6 flex flex-col justify-between relative bg-white/5 backdrop-blur-sm">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/10 rounded-bl-full" />
                   
                   <div>
                     <div className="flex items-center gap-2 mb-8">
                        <div className="w-6 h-6 bg-[#D4AF37] rounded" />
                        <span className="text-[#D4AF37] font-serif font-bold tracking-widest uppercase">Finatrades</span>
                     </div>
                     <h3 className="text-2xl font-serif text-white mb-2">Gold Ownership Certificate</h3>
                     <p className="text-white/40 text-sm font-mono">ID: FT-8829-XJ-2025</p>
                   </div>

                   <div className="space-y-4 my-8">
                     <div className="flex justify-between border-b border-white/10 pb-2">
                       <span className="text-white/60 text-sm">Owner</span>
                       <span className="text-white font-medium">{accountType === 'personal' ? 'John Doe' : 'Acme Corp Ltd.'}</span>
                     </div>
                     <div className="flex justify-between border-b border-white/10 pb-2">
                       <span className="text-white/60 text-sm">Weight</span>
                       <span className="text-[#D4AF37] font-bold">1,000.00g</span>
                     </div>
                     <div className="flex justify-between border-b border-white/10 pb-2">
                       <span className="text-white/60 text-sm">Purity</span>
                       <span className="text-white font-medium">999.9 Fine Gold</span>
                     </div>
                     <div className="flex justify-between border-b border-white/10 pb-2">
                       <span className="text-white/60 text-sm">Vault Location</span>
                       <span className="text-white font-medium">Zurich, CH</span>
                     </div>
                   </div>

                   <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-white p-1">
                       <div className="w-full h-full bg-black" />
                     </div>
                     <div className="flex-1">
                       <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Digitally Signed</p>
                       <div className="h-px w-full bg-[#D4AF37]/30" />
                     </div>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/2">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6">
                {t('finavault.cert.title')} <br />
                <span className="text-[#D4AF37]">{t('finavault.cert.titleHighlight')}</span>
              </h2>
              <p className="text-lg text-white/60 mb-8 leading-relaxed">
                {t('finavault.cert.description')}
              </p>
              
              <div className="flex items-center gap-4 mb-8">
                 <div className="flex -space-x-4">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-12 h-12 rounded-full border-2 border-[#0D001E] bg-[#2A2A2A] flex items-center justify-center text-xs font-bold">
                        GLD
                     </div>
                   ))}
                 </div>
                 <p className="text-sm text-white/60">Verified by independent auditors</p>
              </div>

              <Button variant="outline" className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                <FileText className="w-4 h-4 mr-2" />
                Sample Audit Report
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-[#0D001E] to-[#1A002F] border-t border-white/5">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            {t('finavault.cta.title')} <span className="text-[#D4AF37]">{t('finavault.cta.titleHighlight')}</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8">
            {t('finavault.cta.description')}
          </p>
          <Button size="lg" className="h-12 px-8 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 rounded-full font-bold">
            {t('finavault.cta.button')}
          </Button>
        </div>
      </section>
    </Layout>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      viewport={{ once: true }}
      className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/30 transition-all hover:-translate-y-1"
    >
      <div className="mb-6 p-4 rounded-2xl bg-white/5 w-fit">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-white/60 leading-relaxed text-sm">{desc}</p>
    </motion.div>
  );
}
