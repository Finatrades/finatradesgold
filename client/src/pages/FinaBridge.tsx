import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Globe, FileCheck, Anchor, TrendingUp, Users } from 'lucide-react';
import Layout from '@/components/Layout';

export default function FinaBridge() {
  const { t } = useLanguage();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden bg-[#0D001E]">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-[#1A002F] skew-x-12 translate-x-32 z-0" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
              <Globe className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-sm font-medium text-[#D4AF37]">{t('finabridge.hero.badge')}</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
              {t('finabridge.hero.title')} <br/>
              <span className="text-[#D4AF37]">{t('finabridge.hero.titleHighlight')}</span>
            </h1>
            
            <h2 className="text-2xl text-white/80 mb-6 font-medium">
              {t('finabridge.hero.subtitle')}
            </h2>
            
            <p className="text-lg text-white/60 mb-8 max-w-2xl leading-relaxed">
              {t('finabridge.hero.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="h-12 px-8 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 rounded-full text-base font-semibold">
                {t('finabridge.hero.cta1')}
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 border-white/20 hover:bg-white/10 text-white rounded-full text-base bg-transparent">
                {t('finabridge.hero.cta2')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Badges Section */}
      <section className="py-12 border-y border-white/5 bg-[#0A0018]">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <p className="font-medium text-white">{t('finabridge.badges.1')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                <Anchor className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <p className="font-medium text-white">{t('finabridge.badges.2')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <p className="font-medium text-white">{t('finabridge.badges.3')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div>
               <h2 className="text-3xl lg:text-4xl font-bold mb-6">{t('productSuite.business.bridge.headline')}</h2>
               <p className="text-lg text-white/60 mb-8 leading-relaxed">
                 {t('productSuite.business.bridge.description')}
               </p>
               <ul className="space-y-6">
                 <ListItem title="Importer / Exporter Verification" desc="Full KYC/KYB checks for all trade participants." />
                 <ListItem title="Gold-Backed Guarantee" desc="Use vault-stored gold as collateral for trade finance." />
                 <ListItem title="Smart Documentation" desc="Automated generation of trade documents and contracts." />
                 <ListItem title="Real-Time Tracking" desc="Monitor shipment and settlement status live." />
               </ul>
             </div>
             
             <div className="relative">
               <div className="absolute inset-0 bg-[#D4AF37]/10 blur-[100px] rounded-full" />
               <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                 {/* Mock Dashboard UI */}
                 <div className="flex justify-between items-center mb-8">
                   <h3 className="text-lg font-bold text-white">Active Shipments</h3>
                   <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">Live</div>
                 </div>
                 
                 <div className="space-y-4">
                   <TradeRow id="TRD-9921" from="Geneva, CH" to="Dubai, UAE" status="In Transit" value="$450,000" />
                   <TradeRow id="TRD-9922" from="London, UK" to="Singapore, SG" status="Customs" value="$1,200,000" />
                   <TradeRow id="TRD-9923" from="Zurich, CH" to="Mumbai, IN" status="Delivered" value="$850,000" />
                 </div>

                 <div className="mt-8 pt-8 border-t border-white/10">
                   <div className="flex justify-between text-sm">
                     <span className="text-white/60">Total Trade Volume</span>
                     <span className="text-[#D4AF37] font-bold">$2,500,000</span>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}

function ListItem({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-1">
        <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
      </div>
      <div>
        <h4 className="font-bold text-white mb-1">{title}</h4>
        <p className="text-white/60 text-sm">{desc}</p>
      </div>
    </div>
  );
}

function TradeRow({ id, from, to, status, value }: { id: string, from: string, to: string, status: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
      <div>
        <div className="text-xs text-white/40 mb-1">{id}</div>
        <div className="text-sm text-white font-medium">{from} → {to}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-[#D4AF37] mb-1">{status}</div>
        <div className="text-sm text-white font-bold">{value}</div>
      </div>
    </div>
  );
}

function ShieldCheckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
