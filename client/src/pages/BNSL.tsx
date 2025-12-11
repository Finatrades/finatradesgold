import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';
import { TrendingUp, Lock, RefreshCw, BarChart3, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';

export default function BNSL() {
  const { t } = useLanguage();
  const [tenure, setTenure] = useState(12);
  const [investment, setInvestment] = useState(10000);

  // Mock data generation for chart
  const generateChartData = (months: number, initialValue: number) => {
    const data = [];
    const monthlyRate = 0.008; // 0.8% monthly growth approx
    for (let i = 0; i <= months; i++) {
      data.push({
        month: i,
        value: Math.round(initialValue * Math.pow(1 + monthlyRate, i)),
        principal: initialValue
      });
    }
    return data;
  };

  const chartData = generateChartData(tenure, investment);
  const finalValue = chartData[chartData.length - 1].value;
  const growth = finalValue - investment;

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-[800px] h-[600px] bg-[#FF2FBF]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
              <TrendingUp className="w-4 h-4 text-[#FF2FBF]" />
              <span className="text-sm font-medium text-[#FF2FBF]">{t('bnsl.badge')}</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
              {t('bnsl.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2FBF] to-[#D4AF37]">{t('bnsl.titleHighlight')}</span>
            </h1>
            
            <p className="text-lg text-white/60 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('bnsl.description')}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-white/80 mb-10">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <ShieldCheckIcon className="w-4 h-4 text-[#D4AF37]" />
                {t('bnsl.badge1')}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <Lock className="w-4 h-4 text-[#D4AF37]" />
                {t('bnsl.badge2')}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                {t('bnsl.badge3')}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 bg-[#FF2FBF] text-white hover:bg-[#FF2FBF]/90 rounded-full text-base font-semibold shadow-[0_0_20px_rgba(255,47,191,0.3)]">
                {t('bnsl.startPlan')}
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 border-white/20 hover:bg-white/10 text-white rounded-full text-base bg-transparent">
                {t('bnsl.viewHow')}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-24 bg-[#0A0018]">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12">
            {/* Input Side */}
            <div className="lg:col-span-4 space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">{t('bnsl.planner.title')}</h2>
                <p className="text-white/60">{t('bnsl.planner.subtitle')}</p>
              </div>

              <Card className="p-6 bg-white/5 border-white/10">
                <div className="space-y-6">
                  {/* Amount Input */}
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">
                      {t('bnsl.planner.purchaseValue')} (USD)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={investment}
                        onChange={(e) => setInvestment(Number(e.target.value))}
                        className="w-full bg-[#0D001E] border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF2FBF] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Tenure Selection */}
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-4 block">
                      {t('bnsl.planner.tenure')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[12, 24, 36].map((m) => (
                        <button
                          key={m}
                          onClick={() => setTenure(m)}
                          className={`py-2 rounded-lg text-sm font-medium transition-all ${
                            tenure === m 
                              ? 'bg-[#FF2FBF] text-white shadow-lg' 
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {m} Months
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 rounded-xl bg-[#0D001E] border border-[#FF2FBF]/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/60 text-sm">Addition Rate</span>
                      <span className="text-[#FF2FBF] font-bold">~10% p.a.</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Locked Price</span>
                      <span className="text-white font-medium">$85.40 /g</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Output Side */}
            <div className="lg:col-span-8">
              <Card className="p-8 bg-white/5 border-white/10 h-full flex flex-col">
                <div className="flex flex-wrap gap-8 mb-8">
                  <div>
                    <p className="text-white/40 text-sm uppercase tracking-wide mb-1">Total Gold Value</p>
                    <p className="text-4xl font-bold text-white">${finalValue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-sm uppercase tracking-wide mb-1">Projected Growth</p>
                    <p className="text-4xl font-bold text-[#FF2FBF]">
                      +${growth.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex-1 min-h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF2FBF" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FF2FBF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="month" 
                        stroke="rgba(255,255,255,0.2)" 
                        tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.2)" 
                        tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}}
                        tickFormatter={(val) => `$${val/1000}k`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#1A002F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px'}}
                        itemStyle={{color: '#fff'}}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#FF2FBF" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="principal" 
                        stroke="#ffffff" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        fill="transparent" 
                        opacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <p className="text-white/30 text-xs mt-4">
                  {t('bnsl.planner.disclaimer')}
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Grid */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('bnslHowItWorks.title')}</h2>
            <p className="text-white/60">{t('bnslHowItWorks.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="relative group">
                <div className="w-12 h-12 rounded-full bg-[#FF2FBF]/10 border border-[#FF2FBF]/30 flex items-center justify-center text-[#FF2FBF] font-bold text-xl mb-6 group-hover:scale-110 transition-transform">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t(`bnslHowItWorks.step${step}.title`)}
                </h3>
                <p className="text-white/60 text-sm">
                  {t(`bnslHowItWorks.step${step}.desc`)}
                </p>
                {step < 4 && (
                  <div className="hidden md:block absolute top-6 left-12 w-[calc(100%-3rem)] h-px bg-gradient-to-r from-[#FF2FBF]/30 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-b from-[#0D001E] to-[#1A002F] border-t border-white/5">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            {t('bnslFinalCta.title1')} <br/>
            <span className="text-[#FF2FBF]">{t('bnslFinalCta.title2')}</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8">
            {t('bnslFinalCta.subtitle')}
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="h-12 px-8 bg-[#FF2FBF] text-white hover:bg-[#FF2FBF]/90 rounded-full font-bold">
              {t('bnslFinalCta.startPlan')}
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 border-white/20 hover:bg-white/10 text-white rounded-full bg-transparent">
              {t('bnslFinalCta.support')}
            </Button>
          </div>
        </div>
      </section>
    </Layout>
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
