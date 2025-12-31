import { motion } from 'framer-motion';
import { Shield, Zap, Gem, Building2, Globe, Monitor } from 'lucide-react';
import { useMode } from '../context/ModeContext';

const personalFeatures = [
  {
    icon: Shield,
    title: 'Trust & Compliance',
    description: 'Swiss regulatory standards'
  },
  {
    icon: Zap,
    title: 'Instant Gold Liquidity',
    description: 'Convert and transfer instantly'
  },
  {
    icon: Gem,
    title: 'Real Physical Assets',
    description: 'No synthetic derivatives'
  },
  {
    icon: Building2,
    title: 'Secure Vault Storage',
    description: 'Grade-A insured vaults'
  },
  {
    icon: Globe,
    title: 'Global Accessibility',
    description: 'Access your gold anywhere'
  },
  {
    icon: Monitor,
    title: 'User-Friendly Platform',
    description: 'Simple, intuitive experience'
  }
];

const businessFeatures = [
  {
    icon: Shield,
    title: 'Trust & Compliance',
    description: 'Swiss regulatory standards'
  },
  {
    icon: Zap,
    title: 'Instant Gold Liquidity',
    description: 'Convert and transfer instantly'
  },
  {
    icon: Gem,
    title: 'Real Physical Assets',
    description: 'No synthetic derivatives'
  },
  {
    icon: Building2,
    title: 'Corporate Trade Solutions',
    description: 'B2B gold settlements'
  },
  {
    icon: Globe,
    title: 'Secure Cross-Border Utility',
    description: 'Global gold transfers'
  },
  {
    icon: Monitor,
    title: 'Enterprise-Grade UI',
    description: 'Institutional experience'
  }
];

export default function FinatradesAdvantage() {
  const { mode } = useMode();
  const features = mode === 'business' ? businessFeatures : personalFeatures;

  return (
    <section className="py-12 lg:py-24 bg-gradient-to-br from-[#FAFBFF] via-purple-50/30 to-pink-50/20 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-purple-100/40 to-pink-100/30 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-purple-100/40 to-pink-100/30 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-sm font-semibold text-purple-600 uppercase tracking-[0.2em] mb-6">
            WHY CHOOSE US
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
            The Finatrades Advantage
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-pink-500 mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group"
            >
              <div className="bg-white rounded-2xl p-8 h-full shadow-sm hover:shadow-xl transition-all duration-300 border border-purple-100/50 hover:border-purple-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-purple-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
