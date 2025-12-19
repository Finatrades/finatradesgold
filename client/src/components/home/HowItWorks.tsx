import React from 'react';
import { motion } from 'framer-motion';
import { 
  Building, ShieldCheck, Users, Vault, FileText, Globe, BarChart3,
  UserPlus, Wallet, TrendingUp, Coins, ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

const getSteps = (accountType: string) => {
  if (accountType === 'business') {
    return [
      { number: '01', icon: Building, title: 'Register Corporate Profile', description: 'Submit company details, authorized signatories, and compliance documents.', position: 'left' },
      { number: '02', icon: ShieldCheck, title: 'KYB & Compliance Review', description: 'Finatrades performs a Swiss-aligned corporate verification process.', position: 'right' },
      { number: '03', icon: Users, title: 'Establish Gold Reserve Account', description: 'Set user roles, permissions, and operational limits for your organization.', position: 'left' },
      { number: '04', icon: Vault, title: 'Buy / Deposit Physical Gold', description: 'Deposit existing bars through verified channels into accredited vaults.', position: 'right' },
      { number: '05', icon: FileText, title: 'Receive Holding Certificates', description: 'Each deposit generates standardized holding documentation.', position: 'left' },
      { number: '06', icon: Globe, title: 'Use Gold for Trade & Treasury', description: 'Integrate gold value into trade flows, settlements, or collateral structures.', position: 'right' },
      { number: '07', icon: BarChart3, title: 'Reporting & Audit Controls', description: 'Access detailed reports for accounting, governance, and external audits.', position: 'left' }
    ];
  }
  return [
    { number: '01', icon: UserPlus, title: 'Create Your Account', description: 'Quick personal registration in just a few minutes.', position: 'left' },
    { number: '02', icon: ShieldCheck, title: 'Verify Your Identity', description: 'Simple KYC verification for your security.', position: 'right' },
    { number: '03', icon: Coins, title: 'Buy or Deposit Gold', description: 'Purchase gold or deposit your existing holdings.', position: 'left' },
    { number: '04', icon: Vault, title: 'Secure Vault Storage', description: 'Your gold safely stored in certified Swiss vaults.', position: 'right' },
    { number: '05', icon: Wallet, title: 'Use Your Gold Digitally', description: 'Transfer, sell, or use for payments anytime.', position: 'left' },
    { number: '06', icon: TrendingUp, title: 'Grow Your Wealth', description: 'Earn returns with BNSL savings plans.', position: 'right' }
  ];
};

export default function HowItWorks() {
  const { t } = useLanguage();
  const { accountType } = useAccountType();
  const steps = getSteps(accountType);

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-br from-white via-purple-50/20 to-purple-50/20 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-purple-100/30 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-purple-100/30 blur-[120px] rounded-full" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 text-sm font-semibold text-purple-600 uppercase tracking-wider mb-6">
            {accountType === 'business' ? 'ENTERPRISE WORKFLOW' : 'PERSONAL WORKFLOW'}
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">
            <span className="text-gray-900">How It </span>
            <span className="bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">Works</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {accountType === 'business' 
              ? 'A structured, compliant pathway for corporate gold management.'
              : 'Start your gold journey in just a few simple steps.'}
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          <svg className="absolute left-1/2 top-0 h-full w-px hidden lg:block" style={{ transform: 'translateX(-50%)' }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="purple-500" stopOpacity="0.3" />
                <stop offset="50%" stopColor="purple-600" />
                <stop offset="100%" stopColor="purple-500" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              d={`M 0.5 0 ${steps.map((_, i) => {
                const y = (i + 1) * 180;
                const prevY = i * 180;
                const direction = i % 2 === 0 ? 100 : -100;
                return `Q ${direction} ${prevY + 90} 0.5 ${y}`;
              }).join(' ')}`}
              stroke="url(#lineGradient)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="8 4"
            />
          </svg>
          
          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: step.position === 'left' ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex items-center gap-8 lg:h-[180px] ${step.position === 'right' ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className={`flex-1 ${step.position === 'right' ? 'lg:text-left' : 'lg:text-right'}`}>
                  <div className={`p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all inline-block max-w-sm ${step.position === 'right' ? '' : 'lg:ml-auto'}`} data-testid={`card-step-${step.number}`}>
                    <h3 className="text-lg font-bold text-gray-900 mb-2" data-testid={`text-step-title-${step.number}`}>{step.title}</h3>
                    <p className="text-sm text-gray-500" data-testid={`text-step-desc-${step.number}`}>{step.description}</p>
                  </div>
                </div>
                
                <div className="relative z-10 hidden lg:flex items-center justify-center flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/10 to-purple-500/10 border border-purple-600/20 flex items-center justify-center relative">
                    <step.icon className="w-7 h-7 text-purple-600" strokeWidth={1.5} />
                    <span className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 text-white text-xs font-bold flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 hidden lg:block" />
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Link href="/register">
            <Button 
              size="lg"
              className="px-8 h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white rounded-full shadow-lg shadow-purple-200"
              data-testid="button-explore-platform"
            >
              {accountType === 'business' ? 'Explore Business Platform' : 'Get Started Today'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
