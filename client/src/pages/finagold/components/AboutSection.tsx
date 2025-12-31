import { motion } from 'framer-motion';
import { Building2, FileCheck, Globe, Users, BarChart3, Briefcase, Shield, Vault, Gem, Eye, Coins, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useMode } from '../context/ModeContext';

const personalData = {
  title: 'About Finatrades',
  subtitle: 'Swiss-based fintech for personal gold-backed wealth management.',
  topCards: [
    {
      icon: Eye,
      title: 'Our Vision',
      description: 'Build a new financial system where <strong>real assets</strong> drive stability.',
      benefits: null
    },
    {
      icon: CheckCircle2,
      title: 'Our Mission',
      description: null,
      benefits: [
        'Transparent access to gold',
        'Reliable storage and certification',
        'Modern, secure financial tools',
        'Personal wealth protection'
      ]
    }
  ],
  features: [
    {
      icon: Building2,
      title: 'Swiss Operational Standards',
      description: 'Operating under strict Swiss regulatory framework.'
    },
    {
      icon: Vault,
      title: 'Real Vault-Backed Infrastructure',
      description: 'Every digital representation backed by physical gold.'
    },
    {
      icon: Gem,
      title: 'No Synthetic Assets',
      description: 'Real, physical gold only. No derivatives.'
    },
    {
      icon: Eye,
      title: 'Auditable Processes',
      description: 'Complete transparency with regular audits.'
    },
    {
      icon: Coins,
      title: 'Easy Gold Management',
      description: 'Simple buy, sell, and transfer operations.'
    },
    {
      icon: TrendingUp,
      title: 'Wealth Growth Plans',
      description: 'Structured savings with guaranteed gold returns.'
    }
  ]
};

const businessData = {
  title: 'Enterprise Solutions',
  subtitle: 'Institutional-grade gold infrastructure for modern businesses.',
  topCards: [
    {
      icon: Building2,
      title: 'For Enterprise',
      description: 'Build your <strong>corporate treasury</strong> on gold-backed infrastructure with enterprise controls.',
      benefits: null
    },
    {
      icon: CheckCircle2,
      title: 'Key Benefits',
      description: null,
      benefits: [
        'Enterprise-grade infrastructure',
        'Corporate compliance & governance',
        'Global trade finance solutions',
        'Multi-user corporate access'
      ]
    }
  ],
  features: [
    {
      icon: Building2,
      title: 'Enterprise Infrastructure',
      description: 'Multi-user access, role management, and corporate controls.'
    },
    {
      icon: Briefcase,
      title: 'Trade Finance Platform',
      description: 'End-to-end importer/exporter deal management with FinaBridge.'
    },
    {
      icon: FileCheck,
      title: 'Corporate Compliance',
      description: 'Full regulatory compliance with enterprise-grade KYC/AML.'
    },
    {
      icon: Globe,
      title: 'Global Settlement',
      description: 'Cross-border B2B payments with gold-backed guarantees.'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Invite team members with granular permission controls.'
    },
    {
      icon: BarChart3,
      title: 'Enterprise Reporting',
      description: 'Detailed analytics, audit trails, and financial reports.'
    }
  ]
};

export default function AboutSection() {
  const { mode } = useMode();
  const data = mode === 'business' ? businessData : personalData;

  return (
    <section className="py-12 lg:py-24 bg-gradient-to-br from-[#FAFBFF] via-purple-50/20 to-pink-50/10 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-purple-100/30 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] bg-pink-100/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
            {data.title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            {data.subtitle}
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-pink-500 mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
          {data.topCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-purple-100/50"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <card.icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{card.title}</h3>
              </div>
              {card.description && (
                <p 
                  className="text-gray-600"
                  dangerouslySetInnerHTML={{ __html: card.description }}
                />
              )}
              {card.benefits && (
                <ul className="space-y-3 mt-2">
                  {card.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-600">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {data.features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (index + 2) * 0.1, duration: 0.5 }}
              className="group"
            >
              <div className="bg-white rounded-2xl p-6 h-full shadow-sm hover:shadow-xl transition-all duration-300 border border-purple-100/50 hover:border-purple-200">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
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
