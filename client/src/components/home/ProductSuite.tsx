import React from 'react';
import { motion } from 'framer-motion';
import { Vault, Wallet, TrendingUp, Globe, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';

const getProducts = (accountType: string) => {
  if (accountType === 'business') {
    return [
      {
        id: 'finavault',
        icon: Vault,
        name: 'Deposit / Buy Gold',
        description: 'Get instant value and turn into a settlement financial instrument with your choice of hedging or floating strategies as your business grows.',
        cta: 'Explore FinaVault',
        href: '/finavault'
      },
      {
        id: 'finapay',
        icon: Wallet,
        name: 'Payments & Transfers',
        description: 'Send and receive payments through the platform, manage your wallet and spend anywhere using your gold-backed debit card.',
        cta: 'Explore FinaPay',
        href: '/finapay'
      },
      {
        id: 'finabridge',
        icon: Globe,
        name: 'Global Trade Monitoring',
        description: 'Monitor your imports and exports in real time, track gold-backed settlements and streamline every step of your cross-border business operations.',
        cta: 'Explore FinaBridge',
        href: '/finabridge'
      },
      {
        id: 'bnsl',
        icon: TrendingUp,
        name: "Buy 'N' SeLL Gold Plans",
        description: 'Get substantial margins and guaranteed returns thanks to our BNSL Plans.',
        cta: 'Explore BNSL',
        href: '/bnsl-explore'
      }
    ];
  }

  return [
    {
      id: 'finavault',
      icon: Vault,
      name: 'Secure Gold Storage',
      description: 'Store your physical gold in certified Swiss vaults with full insurance and regular audits.',
      cta: 'Explore FinaVault',
      href: '/finavault'
    },
    {
      id: 'finapay',
      icon: Wallet,
      name: 'Digital Gold Wallet',
      description: 'Buy, sell, and transfer gold digitally with instant settlement and low fees.',
      cta: 'Explore FinaPay',
      href: '/finapay'
    },
    {
      id: 'bnsl',
      icon: TrendingUp,
      name: 'Gold Savings Plans',
      description: 'Earn guaranteed returns on your gold holdings with structured BNSL plans.',
      cta: 'Explore BNSL',
      href: '/bnsl-explore'
    }
  ];
};

export default function ProductSuite() {
  const { t } = useLanguage();
  const { accountType } = useAccountType();
  const products = getProducts(accountType);

  return (
    <section id="products" className="py-24 bg-gradient-to-br from-purple-50/30 via-white to-purple-50/20 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-purple-100/40 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-100/40 blur-[100px] rounded-full" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold tracking-widest text-purple-600 uppercase mb-4 block">
            {accountType === 'business' ? 'BUSINESS ECOSYSTEM' : 'PERSONAL ECOSYSTEM'}
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-gray-900">
            {accountType === 'business' 
              ? 'A Structured Ecosystem for High-Trust Business Transactions'
              : 'Your Complete Gold Management Platform'}
          </h2>
        </motion.div>

        <div className={`grid gap-6 ${accountType === 'business' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="h-full p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300" data-testid={`card-product-${product.id}`}>
                <div className="mb-6 relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/10 to-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <product.icon className="w-8 h-8 text-purple-600" strokeWidth={1.5} />
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-3 text-gray-900">
                  {product.name}
                </h3>
                <p className="text-gray-500 leading-relaxed mb-6 text-sm min-h-[80px]">
                  {product.description}
                </p>
                
                <Link href={product.href}>
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white rounded-full"
                    data-testid={`button-explore-${product.id}`}
                  >
                    {product.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
