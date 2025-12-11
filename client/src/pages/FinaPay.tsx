import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Wallet, ArrowRightLeft, Globe, ShieldCheck, CreditCard } from 'lucide-react';
import Layout from '@/components/Layout';

export default function FinaPay() {
  const { t } = useLanguage();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-[#8A2BE2]/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
              <Wallet className="w-4 h-4 text-[#8A2BE2]" />
              <span className="text-sm font-medium text-[#8A2BE2]">{t('finapay.hero.badge')}</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
              {t('finapay.hero.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF]">{t('finapay.hero.titleHighlight')}</span>
            </h1>
            
            <h2 className="text-2xl text-white/80 mb-6 font-medium">
              {t('finapay.hero.subtitle')} <span className="text-white">{t('finapay.hero.subtitleHighlight')}</span>
            </h2>
            
            <p className="text-lg text-white/60 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('finapay.hero.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white hover:opacity-90 rounded-full text-base font-semibold">
                {t('finapay.hero.cta1')}
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 border-white/20 hover:bg-white/10 text-white rounded-full text-base bg-transparent">
                {t('finapay.hero.cta2')}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-[#0A0018]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              {t('finapay.features.title')} <span className="text-[#8A2BE2]">{t('finapay.features.titleHighlight')}</span>
            </h2>
            <p className="text-white/60">{t('finapay.features.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <FeatureBlock 
              icon={<Wallet className="w-6 h-6 text-[#8A2BE2]" />}
              title={t('finapay.wallet.title') + " " + t('finapay.wallet.titleHighlight')}
              desc={t('finapay.wallet.subtitle')}
              image="https://images.unsplash.com/photo-1620714223084-87bd6c26e133?q=80&w=1000&auto=format&fit=crop"
            />
            <FeatureBlock 
              icon={<ArrowRightLeft className="w-6 h-6 text-[#FF2FBF]" />}
              title={t('finapay.transfer.title') + " " + t('finapay.transfer.titleHighlight')}
              desc={t('finapay.transfer.subtitle')}
              image="https://images.unsplash.com/photo-1642104704074-907c0698cbd9?q=80&w=1000&auto=format&fit=crop"
            />
            <FeatureBlock 
              icon={<Globe className="w-6 h-6 text-[#D4AF37]" />}
              title={t('finapay.network.title') + " " + t('finapay.network.titleHighlight')}
              desc={t('finapay.network.subtitle')}
              image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop"
            />
            <FeatureBlock 
              icon={<ShieldCheck className="w-6 h-6 text-white" />}
              title={t('finapay.security.title') + " " + t('finapay.security.titleHighlight')}
              desc={t('finapay.security.subtitle')}
              image="https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1000&auto=format&fit=crop"
            />
          </div>
        </div>
      </section>

      {/* Card Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16 p-12 rounded-[3rem] bg-gradient-to-br from-[#1A002F] to-[#0D001E] border border-[#8A2BE2]/30 relative overflow-hidden">
             {/* Decorative circles */}
             <div className="absolute top-0 right-0 w-96 h-96 bg-[#8A2BE2]/20 blur-[100px] rounded-full pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FF2FBF]/10 blur-[100px] rounded-full pointer-events-none" />

             <div className="md:w-1/2 relative z-10">
               <div className="inline-block px-3 py-1 rounded-full bg-[#8A2BE2]/20 text-[#8A2BE2] text-xs font-bold mb-6 border border-[#8A2BE2]/30">
                 {t('finapay.card.badge')}
               </div>
               <h2 className="text-4xl font-bold mb-6">
                 {t('finapay.card.title')} <br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF]">{t('finapay.card.titleHighlight')}</span>
               </h2>
               <p className="text-white/60 text-lg mb-8">
                 {t('finapay.card.description')}
               </p>
               <Button className="bg-white text-black hover:bg-gray-200 rounded-full font-bold px-8 h-12">
                 {t('finapay.card.cta')}
               </Button>
             </div>

             <div className="md:w-1/2 flex justify-center relative z-10 perspective-1000">
               <motion.div 
                  initial={{ rotateY: -10, rotateX: 5 }}
                  animate={{ rotateY: 10, rotateX: -5 }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatType: "reverse", 
                    duration: 5,
                    ease: "easeInOut"
                  }}
                  className="w-96 h-60 rounded-3xl bg-black border border-white/10 relative shadow-2xl overflow-hidden backdrop-blur-xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(20,0,30,0.9) 0%, rgba(10,0,20,0.95) 100%)"
                  }}
               >
                 {/* Card Content */}
                 <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/20 to-transparent opacity-50" />
                 <div className="p-8 h-full flex flex-col justify-between relative z-10">
                   <div className="flex justify-between items-start">
                     <CreditCard className="w-8 h-8 text-[#D4AF37]" />
                     <span className="font-bold text-white tracking-widest">FINATRADES</span>
                   </div>
                   <div className="space-y-4">
                     <div className="flex gap-4">
                        <div className="w-12 h-8 bg-[#D4AF37]/20 rounded-md" />
                        <div className="flex-1 space-y-2">
                           <div className="h-2 w-full bg-white/10 rounded-full" />
                           <div className="h-2 w-2/3 bg-white/10 rounded-full" />
                        </div>
                     </div>
                     <div className="flex justify-between items-end">
                       <div>
                         <p className="text-[10px] text-white/40 uppercase">Card Holder</p>
                         <p className="text-white font-medium tracking-wide">JOHN DOE</p>
                       </div>
                       <div className="w-12 h-8 bg-white/20 rounded flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-red-500 opacity-80" />
                          <div className="w-4 h-4 rounded-full bg-yellow-500 opacity-80 -ml-2" />
                       </div>
                     </div>
                   </div>
                 </div>
               </motion.div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-[#0D001E] to-[#1A002F] border-t border-white/5">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            {t('finapay.cta.title')} <br/>
            <span className="text-[#8A2BE2]">{t('finapay.cta.titleHighlight')}</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8">
            {t('finapay.cta.subtitle')}
          </p>
          <Button size="lg" className="h-12 px-8 bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white hover:opacity-90 rounded-full font-bold">
            {t('finapay.cta.button')}
          </Button>
        </div>
      </section>
    </Layout>
  );
}

function FeatureBlock({ icon, title, desc, image }: { icon: React.ReactNode, title: string, desc: string, image: string }) {
  return (
    <div className="group rounded-3xl overflow-hidden border border-white/10 bg-white/5 hover:border-[#8A2BE2]/50 transition-colors">
      <div className="h-48 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D001E] to-transparent z-10" />
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-8 relative z-20 -mt-12">
        <div className="w-12 h-12 rounded-xl bg-[#0D001E] border border-white/10 flex items-center justify-center mb-4 shadow-lg">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/60 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
