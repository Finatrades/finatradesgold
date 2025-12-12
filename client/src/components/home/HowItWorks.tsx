import React from 'react';
import { motion } from 'framer-motion';
import { 
  UserPlus, ShieldCheck, LayoutDashboard, Coins, Vault, Wallet, TrendingUp,
  Building, Users, GitBranch
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';

const getSteps = (accountType: string) => {
  if (accountType === 'business') {
    return [
      { number: '01', icon: Building, title: 'Register Your Company', description: 'Complete corporate onboarding with business documents.' },
      { number: '02', icon: ShieldCheck, title: 'Corporate KYC/AML', description: 'Full compliance verification for your organization.' },
      { number: '03', icon: Users, title: 'Setup Team Access', description: 'Invite team members and assign roles & permissions.' },
      { number: '04', icon: LayoutDashboard, title: 'Corporate Dashboard', description: 'Access enterprise analytics and treasury management.' },
      { number: '05', icon: Vault, title: 'Manage Corporate Gold', description: 'Deposit, custody, and manage company gold reserves.' },
      { number: '06', icon: GitBranch, title: 'Trade with FinaBridge', description: 'Connect with partners for gold-backed trade deals.' },
      { number: '07', icon: TrendingUp, title: 'Treasury Optimization', description: 'Enterprise BNSL plans for corporate treasury growth.' }
    ];
  }
  return [
    { number: '01', icon: UserPlus, title: 'Create Your Account', description: 'Quick personal registration in minutes.' },
    { number: '02', icon: ShieldCheck, title: 'Verify Your Identity', description: 'Simple KYC verification process.' },
    { number: '03', icon: LayoutDashboard, title: 'Access Your Dashboard', description: 'View your gold balance and transactions.' },
    { number: '04', icon: Coins, title: 'Buy or Deposit Gold', description: 'Purchase gold or deposit your existing holdings.' },
    { number: '05', icon: Vault, title: 'Secure Storage', description: 'Your gold safely stored in DMCC certified vaults.' },
    { number: '06', icon: Wallet, title: 'Use Your Gold', description: 'Transfer, sell, or use for payments.' },
    { number: '07', icon: TrendingUp, title: 'Grow Your Wealth', description: 'Earn returns with BNSL savings plans.' }
  ];
};

export default function HowItWorks() {
  const { t } = useLanguage();
  const { accountType } = useAccountType();
  const steps = getSteps(accountType);

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-br from-purple-50/50 via-white to-pink-50/30 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-100/50 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-100/50 blur-[120px] rounded-full" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-gray-900">
            {t('howItWorks.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {accountType === 'personal' 
              ? 'Start your gold journey in just a few simple steps'
              : 'Enterprise-grade gold management for your business'}
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#6B21A8]/20 via-[#6B21A8] to-[#6B21A8]/20 hidden lg:block" />
          
          <div className="space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-8 ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                  <div className={`p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${index % 2 === 0 ? 'lg:ml-auto' : 'lg:mr-auto'} max-w-md`} data-testid={`card-step-${step.number}`}>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#6B21A8] to-[#9333EA]">
                        <step.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-3xl font-bold text-[#6B21A8]/20" data-testid={`text-step-number-${step.number}`}>{step.number}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2" data-testid={`text-step-title-${step.number}`}>{step.title}</h3>
                    <p className="text-sm text-gray-600" data-testid={`text-step-desc-${step.number}`}>{step.description}</p>
                  </div>
                </div>
                
                <div className="relative z-10 hidden lg:flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-[#6B21A8] shadow-[0_0_10px_rgba(107,33,168,0.5)]" />
                </div>
                
                <div className="flex-1 hidden lg:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
