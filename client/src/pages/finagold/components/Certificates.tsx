import { motion } from 'framer-motion';
import { FileText, Download, Shield, CheckCircle } from 'lucide-react';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    title: 'Your Gold Certificates, Digitally Organized',
    description: 'Every eligible gold deposit comes with formal documentation showing refinery details, purity, weight, serial numbers, and vault information. You can access and download these certificates anytime.',
    features: [
      { icon: FileText, label: 'Assay & Refinery Details' },
      { icon: Shield, label: 'Vault & Storage Confirmation' },
      { icon: Download, label: 'Download for Your Records' },
    ],
  },
  business: {
    title: 'Documentation & Certificates for Professional Use',
    description: 'Finatrades provides standardized certificates and documentation designed to integrate into your internal processes. These documents support board reporting, audit trails, and relationships with banks, insurers, and trade partners.',
    features: [
      { icon: FileText, label: 'Standardized Certificate Formats' },
      { icon: CheckCircle, label: 'Batch-Level & Bar-Level Details' },
      { icon: Shield, label: 'Integration with Audits' },
      { icon: Download, label: 'Document Export (PDF)' },
    ],
  },
};

export default function Certificates() {
  const { mode, isPersonal } = useMode();
  const c = content[mode];

  return (
    <section id="certificates" className="relative py-24 bg-[#050505]" data-testid="certificates-section">
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
              className="text-3xl md:text-4xl font-bold text-white mb-6"
            >
              {c.title}
            </motion.h2>
            
            <motion.p
              key={`desc-${mode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-400 leading-relaxed mb-8"
            >
              {c.description}
            </motion.p>

            <motion.div
              key={`features-${mode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {c.features.map((feature, index) => (
                <motion.div
                  key={`${mode}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#EAC26B]/20 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#EAC26B]/10 flex items-center justify-center group-hover:bg-[#EAC26B]/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-[#EAC26B]" />
                  </div>
                  <span className="text-white font-medium">{feature.label}</span>
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
            <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent border border-[#EAC26B]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#EAC26B]/10 rounded-full blur-[60px]" />
              
              <div className="relative space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <p className="text-[#EAC26B] font-bold text-sm tracking-wider">VAULT CERTIFICATE</p>
                    <p className="text-gray-500 text-xs mt-1">{isPersonal ? 'Personal Holding' : 'Corporate Reserve'}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-400 text-xs font-medium">Verified</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Weight</p>
                    <p className="text-white font-semibold">{isPersonal ? '142.85 grams' : '1,000 kg'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Purity</p>
                    <p className="text-white font-semibold">999.9 Fine Gold</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Refinery</p>
                    <p className="text-white font-semibold">PAMP Suisse</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Serial</p>
                    <p className="text-white font-semibold">FT-2024-{isPersonal ? '00142' : '98765'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Vault Location</p>
                      <p className="text-white font-semibold">Zurich, Switzerland</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EAC26B]/10 text-[#EAC26B] text-sm font-medium hover:bg-[#EAC26B]/20 transition-colors">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
