import React from 'react';
import { motion } from 'framer-motion';
import { 
  Building, Lock, Shield, Eye, Wallet, TrendingUp,
  Globe, Users, FileText, GitBranch
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';

const getDifferentiators = (accountType: string) => {
  if (accountType === 'business') {
    return [
      { icon: Building, title: 'Enterprise Infrastructure', description: 'Multi-user access, role management, and corporate controls.' },
      { icon: GitBranch, title: 'Trade Finance Platform', description: 'End-to-end importer/exporter deal management with FinaBridge.' },
      { icon: Shield, title: 'Corporate Compliance', description: 'Full regulatory compliance with enterprise-grade KYC/AML.' },
      { icon: Globe, title: 'Global Settlement', description: 'Cross-border B2B payments with gold-backed guarantees.' },
      { icon: Users, title: 'Team Management', description: 'Invite team members with granular permission controls.' },
      { icon: FileText, title: 'Enterprise Reporting', description: 'Detailed analytics, audit trails, and financial reports.' }
    ];
  }
  return [
    { icon: Building, title: 'Swiss Operational Standards', description: 'Operating under strict Swiss regulatory framework.' },
    { icon: Lock, title: 'Real Vault-Backed Infrastructure', description: 'Every digital representation backed by physical gold.' },
    { icon: Shield, title: 'No Synthetic Assets', description: 'Real, physical gold only. No derivatives.' },
    { icon: Eye, title: 'Auditable Processes', description: 'Complete transparency with regular audits.' },
    { icon: Wallet, title: 'Easy Gold Management', description: 'Simple buy, sell, and transfer operations.' },
    { icon: TrendingUp, title: 'Wealth Growth Plans', description: 'Structured savings with guaranteed gold returns.' }
  ];
};

export default function WhyFinatrades() {
  const { t } = useLanguage();
  const { accountType } = useAccountType();
  const differentiators = getDifferentiators(accountType);

  return (
    <section id="about" className="py-24 bg-gradient-to-br from-[#0D001E] via-[#2A0055] to-[#4B0082] text-white overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">
            Why <span className="bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] bg-clip-text text-transparent">Finatrades</span>?
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            {accountType === 'personal' 
              ? 'Built for individuals who want secure, accessible gold ownership'
              : 'Enterprise solutions for corporate gold management'}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-[#D4AF37]/30 transition-all"
              data-testid={`card-differentiator-${index}`}
            >
              <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] w-fit group-hover:scale-110 transition-transform">
                <item.icon className="w-6 h-6 text-[#0D001E]" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white group-hover:text-[#D4AF37] transition-colors" data-testid={`text-differentiator-title-${index}`}>
                {item.title}
              </h3>
              <p className="text-sm text-white/60 leading-relaxed" data-testid={`text-differentiator-desc-${index}`}>
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid md:grid-cols-4 gap-6"
        >
          {[
            { value: '$2B+', label: 'Gold Under Management' },
            { value: '50K+', label: 'Active Users' },
            { value: '99.9%', label: 'Platform Uptime' },
            { value: '15+', label: 'Countries Served' }
          ].map((stat, i) => (
            <div key={i} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10" data-testid={`stat-about-${i}`}>
              <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] bg-clip-text text-transparent mb-2" data-testid={`text-about-stat-value-${i}`}>
                {stat.value}
              </div>
              <div className="text-sm text-white/60" data-testid={`text-about-stat-label-${i}`}>{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
