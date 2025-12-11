import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Shield, Globe, Zap, Check, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FinaCard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12 pb-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-medium mb-4"
          >
            <Sparkles className="w-4 h-4" /> Coming Soon to Your Region
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-foreground"
          >
            FinaCard Metal
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground"
          >
            Spend your gold anywhere in the world. Real-time conversion at the point of sale. No hidden fees.
          </motion.p>
        </div>

        {/* Card Visual & Features Split */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          {/* Card Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="relative perspective-1000"
          >
            <div className="relative w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-zinc-900 shadow-2xl p-8 flex flex-col justify-between overflow-hidden border border-white/10 group hover:scale-[1.02] transition-transform duration-500">
              
              {/* Metallic Sheen Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex justify-between items-start">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-secondary" />
                    <span className="text-white font-bold tracking-tight">Finatrades</span>
                 </div>
                 <CreditCard className="w-8 h-8 text-white/80" />
              </div>

              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-yellow-200 to-yellow-500 rounded-md opacity-80" /> {/* Chip */}
                  <Zap className="w-6 h-6 text-white/50 rotate-90" /> {/* Contactless */}
                </div>
                
                <div>
                   <p className="font-mono text-xl md:text-2xl text-white tracking-widest shadow-black drop-shadow-md">
                     •••• •••• •••• 9012
                   </p>
                </div>

                <div className="flex justify-between items-end text-white/90">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Card Holder</p>
                    <p className="font-medium tracking-wide uppercase">{user.firstName} {user.lastName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Expires</p>
                    <p className="font-medium tracking-wide">12/28</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Shadow Reflection */}
            <div className="absolute -bottom-10 left-4 right-4 h-8 bg-black/20 blur-xl rounded-full" />
          </motion.div>

          {/* Features List */}
          <div className="space-y-8">
            <div className="space-y-6">
              <FeatureRow 
                icon={<Globe className="w-5 h-5 text-blue-500" />}
                title="Global Acceptance"
                desc="Accepted at 40M+ merchants worldwide. Withdraw cash from any ATM."
              />
              <FeatureRow 
                icon={<Zap className="w-5 h-5 text-yellow-500" />}
                title="Instant Gold Liquidity"
                desc="Spend directly from your FinaPay gold balance. We sell the exact amount needed at spot price."
              />
              <FeatureRow 
                icon={<Shield className="w-5 h-5 text-green-500" />}
                title="Bank-Grade Security"
                desc="Freeze card instantly in-app. 24/7 fraud monitoring and purchase protection."
              />
            </div>

            <div className="pt-6 border-t border-border">
              <Card className="bg-secondary/5 border-secondary/20 p-6">
                 <h3 className="text-lg font-bold text-foreground mb-2">Join the Waitlist</h3>
                 <p className="text-muted-foreground text-sm mb-4">
                   Be the first to know when FinaCard launches in your region. Early access members get a free Metal card upgrade.
                 </p>
                 <div className="flex gap-3">
                   <Button className="flex-1 bg-secondary text-white hover:bg-secondary/90">
                     Join Waitlist
                   </Button>
                   <Button variant="outline" className="flex-1">
                     Learn More
                   </Button>
                 </div>
              </Card>
            </div>
          </div>

        </div>

        {/* Comparison Table */}
        <div className="pt-12">
           <h3 className="text-2xl font-bold text-center mb-8">Why Choose FinaCard?</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-border">
                   <th className="py-4 px-6 text-muted-foreground font-medium w-1/3">Feature</th>
                   <th className="py-4 px-6 text-secondary font-bold w-1/3 bg-secondary/5 rounded-t-xl text-center">FinaCard Metal</th>
                   <th className="py-4 px-6 text-muted-foreground font-medium w-1/3 text-center">Traditional Bank</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 <tr>
                   <td className="py-4 px-6 font-medium">Monthly Fee</td>
                   <td className="py-4 px-6 text-center font-bold bg-secondary/5">$0.00</td>
                   <td className="py-4 px-6 text-center text-muted-foreground">$15 - $50</td>
                 </tr>
                 <tr>
                   <td className="py-4 px-6 font-medium">Foreign Transaction Fee</td>
                   <td className="py-4 px-6 text-center font-bold bg-secondary/5">0%</td>
                   <td className="py-4 px-6 text-center text-muted-foreground">3%</td>
                 </tr>
                 <tr>
                   <td className="py-4 px-6 font-medium">Cashback Rewards</td>
                   <td className="py-4 px-6 text-center font-bold bg-secondary/5">Up to 2% in Gold</td>
                   <td className="py-4 px-6 text-center text-muted-foreground">Points / Miles</td>
                 </tr>
                 <tr>
                   <td className="py-4 px-6 font-medium">Material</td>
                   <td className="py-4 px-6 text-center font-bold bg-secondary/5">18g Stainless Steel</td>
                   <td className="py-4 px-6 text-center text-muted-foreground">Plastic</td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex gap-4"
    >
      <div className="w-12 h-12 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-lg text-foreground mb-1">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}
