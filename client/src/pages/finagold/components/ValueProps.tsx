import { motion } from 'framer-motion';
import { Gem, Sparkles, Eye, Target, Shield, Settings, FileCheck, BarChart3 } from 'lucide-react';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    title: 'Why Individuals Choose Finatrades',
    cards: [
      {
        icon: Gem,
        title: 'Real Gold, Fully Backed',
        description: 'Your balance represents real, physical gold held securely in certified vaults.',
      },
      {
        icon: Sparkles,
        title: 'Easy to Start, Easy to Manage',
        description: 'Open your account, verify your identity, and manage your gold in just a few steps.',
      },
      {
        icon: Eye,
        title: 'Transparent & Real-Time',
        description: 'See your gold holdings, certificates, and estimated value updated instantly.',
      },
      {
        icon: Target,
        title: 'Built for Everyday Planning',
        description: 'Use your gold for long-term savings, family goals, or as an extra financial reserve.',
      },
    ],
  },
  business: {
    title: 'Why Businesses Choose Finatrades',
    cards: [
      {
        icon: Shield,
        title: 'Verified Gold Reserves',
        description: 'Maintain documented holdings with full traceability across bars, batches, and vaults.',
      },
      {
        icon: BarChart3,
        title: 'Built for Trade & Settlement',
        description: 'Use gold value as a reference in commercial agreements, collateral, or structured flows.',
      },
      {
        icon: Settings,
        title: 'Institutional Governance Controls',
        description: 'Role-based access, approval workflows, and multi-user corporate environments.',
      },
      {
        icon: FileCheck,
        title: 'Compliance-Ready Documentation',
        description: 'Standardized certificates and reports that support regulators, auditors, and banking partners.',
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

export default function ValueProps() {
  const { mode } = useMode();
  const c = content[mode];

  return (
    <section className="relative py-12 lg:py-24 bg-gradient-to-b from-[#FAFBFF] to-[#EDE9FE]" data-testid="value-props-section">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(138, 43, 226, 0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#8A2BE2]/5 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.h2 
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-5xl font-bold text-[#0D0D0D]"
          >
            {c.title}
          </motion.h2>
        </motion.div>

        <motion.div
          key={mode}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {c.cards.map((card, index) => (
            <motion.div
              key={`${mode}-${index}`}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group relative p-8 rounded-3xl bg-white border-2 border-[#8A2BE2]/10 hover:border-[#8A2BE2]/40 shadow-lg shadow-[#8A2BE2]/5 hover:shadow-xl hover:shadow-[#8A2BE2]/10 transition-all duration-300"
              data-testid={`value-card-${index}`}
            >
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#8A2BE2]/5 to-transparent pointer-events-none" />
              
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8A2BE2]/10 to-[#FF2FBF]/10 flex items-center justify-center mb-6 group-hover:from-[#8A2BE2]/20 group-hover:to-[#FF2FBF]/20 transition-colors">
                  <card.icon className="w-7 h-7 text-[#8A2BE2]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0D0D0D] mb-3 group-hover:text-[#8A2BE2] transition-colors">
                  {card.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
