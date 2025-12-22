import { motion } from 'framer-motion';
import { Lock, Wallet, TrendingUp, Building2, ArrowRight } from 'lucide-react';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    title: 'Your Tools to Manage Real Gold Digitally',
    products: [
      {
        icon: Lock,
        name: 'FinaVault',
        subtitle: 'Personal Gold Locker',
        description: 'A secure digital ledger showing your stored gold, certificates, and purity details.',
        features: ['View total gold in grams', 'See vault location & certificates', 'Track deposits & movements', 'Permanent history records'],
      },
      {
        icon: Wallet,
        name: 'FinaPay Wallet',
        subtitle: 'Gold Value View',
        description: 'Displays your gold in grams and estimated value. Helps plan expenses and savings.',
        features: ['Real-time gold value', 'Simple platform transfers', 'Clear balance separation', 'Planning for goals'],
      },
      {
        icon: TrendingUp,
        name: 'FinaEarn (BNSL)',
        subtitle: 'Holding Plans',
        description: 'Choose defined durations (12, 24, or 36 months) for structured holding.',
        features: ['12, 24, 36 month plans', 'Transparent terms', 'Dashboard tracking', 'Clear settlement conditions'],
      },
      {
        icon: Building2,
        name: 'FinaFinance',
        subtitle: 'View-Only',
        description: 'Understand how your gold participates in a broader real-world ecosystem.',
        features: ['Ecosystem visibility', 'Trade flow insights', 'Information access', 'Educational view'],
      },
    ],
  },
  business: {
    title: 'A Structured Ecosystem for Business Gold Operations',
    products: [
      {
        icon: Lock,
        name: 'FinaVault',
        subtitle: 'Corporate Gold Reserve Ledger',
        description: 'Complete visibility across bar numbers, batch origins, purity, and vault locations.',
        features: ['Multi-entity views', 'Project/client allocation', 'Audit-ready reports', 'Bar & batch traceability'],
      },
      {
        icon: Wallet,
        name: 'FinaPay Wallet',
        subtitle: 'Operational Gold Dashboard',
        description: 'Real-time value tracking for treasury, risk monitoring, and allocation.',
        features: ['Multi-user access', 'Business unit transfers', 'Finance team visibility', 'Configurable limits'],
      },
      {
        icon: TrendingUp,
        name: 'FinaEarn (BNSL)',
        subtitle: 'Programmatic Holding',
        description: 'Lock gold into structured terms aligned with business cycles.',
        features: ['Tranche allocation', 'Treasury alignment', 'Consolidated reporting', 'Defined maturity'],
      },
      {
        icon: Building2,
        name: 'FinaFinance',
        subtitle: 'Trade Support Layer',
        description: 'Documentation and workflows that support trade deals backed by gold value.',
        features: ['Trade settlements', 'Collateral structures', 'LC/SBLC support', 'Reserve-obligation linking'],
      },
    ],
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export default function Products() {
  const { mode } = useMode();
  const c = content[mode];

  return (
    <section id="products" className="relative py-24 bg-black" data-testid="products-section">
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#EAC26B]/3 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.h2
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            {c.title}
          </motion.h2>
        </motion.div>

        <motion.div
          key={mode}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-6"
        >
          {c.products.map((product, index) => (
            <motion.div
              key={`${mode}-${product.name}`}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              className="group p-8 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] hover:border-[#EAC26B]/30 transition-all duration-300 relative overflow-hidden"
              data-testid={`product-card-${product.name.toLowerCase()}`}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[#EAC26B]/5 to-transparent" />

              <div className="relative">
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#EAC26B]/10 flex items-center justify-center group-hover:bg-[#EAC26B]/20 transition-colors shrink-0">
                    <product.icon className="w-7 h-7 text-[#EAC26B]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white group-hover:text-[#EAC26B] transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-[#EAC26B]/70 text-sm font-medium">{product.subtitle}</p>
                  </div>
                </div>

                <p className="text-gray-400 mb-6 leading-relaxed">{product.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {product.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#EAC26B]/50" />
                      {feature}
                    </div>
                  ))}
                </div>

                <button className="flex items-center gap-2 text-[#EAC26B] text-sm font-medium group/btn">
                  Learn more
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
