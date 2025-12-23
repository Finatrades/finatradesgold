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
    <section id="certificates" className="relative py-24 bg-gradient-to-b from-[#EDE9FE] to-[#F4F6FC]" data-testid="certificates-section">
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
              className="text-3xl md:text-4xl font-bold text-[#0D0D0D] mb-6"
            >
              {c.title}
            </motion.h2>
            
            <motion.p
              key={`desc-${mode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-600 leading-relaxed mb-8"
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
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#8A2BE2]/10 hover:border-[#8A2BE2]/30 shadow-sm transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8A2BE2]/10 to-[#FF2FBF]/10 flex items-center justify-center group-hover:from-[#8A2BE2]/20 group-hover:to-[#FF2FBF]/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-[#8A2BE2]" />
                  </div>
                  <span className="text-[#0D0D0D] font-medium">{feature.label}</span>
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
            <div className="p-8 rounded-3xl bg-white border-2 border-[#8A2BE2]/20 shadow-xl shadow-[#8A2BE2]/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8A2BE2]/10 rounded-full blur-[60px]" />
              
              <div className="relative space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#8A2BE2]/10">
                  <div>
                    <p className="text-[#8A2BE2] font-bold text-sm tracking-wider">VAULT CERTIFICATE</p>
                    <p className="text-gray-500 text-xs mt-1">{isPersonal ? 'Personal Holding' : 'Corporate Reserve'}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-600 text-xs font-medium">Verified</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Weight</p>
                    <p className="text-[#0D0D0D] font-semibold">{isPersonal ? '142.85 grams' : '1,000 kg'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Purity</p>
                    <p className="text-[#0D0D0D] font-semibold">999.9 Fine Gold</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Refinery</p>
                    <p className="text-[#0D0D0D] font-semibold">PAMP Suisse</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Serial</p>
                    <p className="text-[#0D0D0D] font-semibold">FT-2024-{isPersonal ? '00142' : '98765'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#8A2BE2]/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Vault Location</p>
                      <p className="text-[#0D0D0D] font-semibold">Zurich, Switzerland</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F97316] text-white text-sm font-medium hover:bg-[#EA580C] transition-colors">
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
