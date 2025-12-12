import React from 'react';
import { motion } from 'framer-motion';
import { Vault, Wallet, TrendingUp, GitBranch, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';

const getProducts = (accountType: string, t: (key: string) => string) => {
  if (accountType === 'business') {
    return [
      {
        id: 'finavault',
        icon: Vault,
        name: t('products.business.finavault.name'),
        tagline: t('products.business.finavault.tagline'),
        description: t('products.business.finavault.description'),
        href: '/finavault',
        color: 'from-[#D4AF37] to-[#F4E4BC]'
      },
      {
        id: 'finapay',
        icon: Wallet,
        name: t('products.business.finapay.name'),
        tagline: t('products.business.finapay.tagline'),
        description: t('products.business.finapay.description'),
        href: '/finapay',
        color: 'from-[#FF6B2F] to-[#FF8F5F]'
      },
      {
        id: 'finabridge',
        icon: GitBranch,
        name: t('products.business.finabridge.name'),
        tagline: t('products.business.finabridge.tagline'),
        description: t('products.business.finabridge.description'),
        href: '/finabridge',
        featured: true,
        color: 'from-[#6B21A8] to-[#9333EA]'
      },
      {
        id: 'bnsl',
        icon: TrendingUp,
        name: t('products.business.bnsl.name'),
        tagline: t('products.business.bnsl.tagline'),
        description: t('products.business.bnsl.description'),
        href: '/bnsl',
        color: 'from-[#059669] to-[#34D399]'
      }
    ];
  }

  return [
    {
      id: 'finavault',
      icon: Vault,
      name: t('products.personal.finavault.name'),
      tagline: t('products.personal.finavault.tagline'),
      description: t('products.personal.finavault.description'),
      href: '/finavault',
      color: 'from-[#D4AF37] to-[#F4E4BC]'
    },
    {
      id: 'finapay',
      icon: Wallet,
      name: t('products.personal.finapay.name'),
      tagline: t('products.personal.finapay.tagline'),
      description: t('products.personal.finapay.description'),
      href: '/finapay',
      color: 'from-[#FF6B2F] to-[#FF8F5F]'
    },
    {
      id: 'bnsl',
      icon: TrendingUp,
      name: t('products.personal.bnsl.name'),
      tagline: t('products.personal.bnsl.tagline'),
      description: t('products.personal.bnsl.description'),
      href: '/bnsl',
      color: 'from-[#059669] to-[#34D399]'
    }
  ];
};

export default function ProductSuite() {
  const { t } = useLanguage();
  const { accountType } = useAccountType();
  const products = getProducts(accountType, t);

  return (
    <section id="products" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-gray-900">
            {t('products.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('products.subtitle')}
          </p>
        </motion.div>

        <div className={`grid gap-6 ${accountType === 'business' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={product.href} data-testid={`link-product-${product.id}`}>
                <div className={`group relative h-full p-8 rounded-3xl bg-white border transition-all duration-300 hover:shadow-xl cursor-pointer ${product.featured ? 'border-[#6B21A8] shadow-[0_0_20px_rgba(107,33,168,0.15)]' : 'border-gray-200 hover:border-[#6B21A8]/30'}`} data-testid={`card-product-${product.id}`}>
                  {product.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-xs font-semibold text-white">
                      Featured
                    </div>
                  )}
                  
                  <div className={`mb-6 p-4 rounded-2xl bg-gradient-to-br ${product.color} w-fit group-hover:scale-110 transition-transform duration-300`}>
                    <product.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-[#6B21A8] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm font-medium text-[#6B21A8] mb-4">
                    {product.tagline}
                  </p>
                  <p className="text-gray-600 leading-relaxed mb-6 text-sm">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center text-sm font-medium text-gray-700 group-hover:text-[#6B21A8] transition-colors">
                    Learn more 
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
