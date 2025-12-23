import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    title: 'Made for People Who Value Stability & Simplicity',
    items: [
      'Individuals who prefer real-world assets over high-risk products',
      'Salaried users and professionals building long-term reserves',
      'Families consolidating their gold into one secure, trackable place',
      'People receiving gold through gifts, marriage, or inheritance',
      'Anyone who wants a Swiss-regulated, modern gold account',
    ],
  },
  business: {
    title: 'Created for Serious Gold-Using Enterprises',
    items: [
      'Gold traders and commodity brokers',
      'Import–export houses dealing in precious metals',
      'Family offices and holding companies managing reserves',
      'Mining companies or exporters requiring gold-backed flows',
      'Businesses using gold as treasury or collateral',
    ],
  },
};

export default function WhoItsFor() {
  const { mode, isPersonal } = useMode();
  const c = content[mode];

  return (
    <section id="who-its-for" className="relative py-24 bg-gradient-to-b from-[#F4F6FC] to-[#FAFBFF]" data-testid="who-its-for-section">
      <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-[#8A2BE2]/5 to-transparent" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-[#8A2BE2]/5 rounded-full blur-[100px]" />
      
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.h2
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-3xl md:text-4xl font-bold text-[#0D0D0D] mb-8 leading-tight"
            >
              {c.title}
            </motion.h2>
            
            <motion.div
              key={`items-${mode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {c.items.map((item, index) => (
                <motion.div
                  key={`${mode}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-6 h-6 rounded-full bg-[#8A2BE2]/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#8A2BE2]/20 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-[#8A2BE2]" />
                  </div>
                  <p className="text-gray-700 leading-relaxed">{item}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className={`p-10 rounded-3xl bg-white border-2 border-[#8A2BE2]/20 shadow-xl shadow-[#8A2BE2]/10 relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#8A2BE2]/5 to-transparent opacity-50" />
              
              <div className="relative space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8A2BE2]/10 to-[#FF2FBF]/10 flex items-center justify-center">
                    <span className="text-3xl">🪙</span>
                  </div>
                  <div>
                    <p className="text-[#0D0D0D] font-semibold text-lg">{isPersonal ? 'Personal Gold Account' : 'Corporate Reserve Account'}</p>
                    <p className="text-gray-500 text-sm">Swiss-regulated infrastructure</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 rounded-xl bg-[#8A2BE2]/5 border border-[#8A2BE2]/10">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Gold Held</p>
                    <p className="text-[#0D0D0D] font-bold text-xl">{isPersonal ? '142.85g' : '2,450 kg'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#8A2BE2]/5 border border-[#8A2BE2]/10">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Est. Value</p>
                    <p className="text-[#8A2BE2] font-bold text-xl">{isPersonal ? '$10,247' : '$156.2M'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#8A2BE2]/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-gray-600 text-sm">Vault Verified</span>
                  </div>
                  <span className="text-[#8A2BE2] text-sm font-medium">View Certificates →</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
