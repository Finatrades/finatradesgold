import { motion } from 'framer-motion';
import { Lock, Wallet, TrendingUp, Building2, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    title: 'Your Tools to Manage Real Gold Digitally',
    products: [
      {
        icon: Lock,
        name: 'FinaVault',
        subtitle: 'Deposit / Buy Gold',
        description: 'Get instant value and turn into a settlement financial instrument with your choice of hedging or floating strategies as your business grows.',
        cta: 'Explore FinaVault',
        href: '/finavault-landing',
      },
      {
        icon: Wallet,
        name: 'FinaPay Wallet',
        subtitle: 'Payments & Transfers',
        description: 'Send and receive payments through the platform, manage your wallet and spend anywhere using your gold-backed debit card.',
        cta: 'Explore FinaPay Wallet',
        href: '/finapay-landing',
      },
      {
        icon: TrendingUp,
        name: 'BNSL',
        subtitle: "Buy 'N' Sell Gold Plans",
        description: 'Get substantial margins and guaranteed returns thanks to our BNSL Plans.',
        cta: 'Explore BNSL',
        href: '/bnsl-landing',
      },
    ],
  },
  business: {
    title: 'A Structured Ecosystem for High-Trust Business Transactions',
    products: [
      {
        icon: Lock,
        name: 'FinaVault',
        subtitle: 'Deposit / Buy Gold',
        description: 'Get instant value and turn into a settlement financial instrument with your choice of hedging or floating strategies as your business grows.',
        cta: 'Explore FinaVault',
        href: '/finavault-landing',
      },
      {
        icon: Wallet,
        name: 'FinaPay Wallet',
        subtitle: 'Payments & Transfers',
        description: 'Send and receive payments through the platform, manage your wallet and spend anywhere using your gold-backed debit card.',
        cta: 'Explore FinaPay Wallet',
        href: '/finapay-landing',
      },
      {
        icon: Building2,
        name: 'FinaBridge',
        subtitle: 'Global Trade Monitoring',
        description: 'Monitor your imports and exports in real time, track gold-backed settlements and streamline every step of your cross-border business operations.',
        cta: 'Explore FinaBridge',
        href: '/finabridge-landing',
      },
      {
        icon: TrendingUp,
        name: 'BNSL',
        subtitle: "Buy 'N' Sell Gold Plans",
        description: 'Get substantial margins and guaranteed returns thanks to our BNSL Plans.',
        cta: 'Explore BNSL',
        href: '/bnsl-landing',
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
    <section id="products" className="relative py-24 bg-gradient-to-b from-[#EDE9FE] to-[#F4F6FC]" data-testid="products-section">
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#8A2BE2]/5 to-transparent" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#FF2FBF]/5 rounded-full blur-[120px]" />

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
            className="text-4xl md:text-5xl font-bold text-[#0D0D0D] mb-4"
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
              className="group p-8 rounded-3xl bg-white border-2 border-[#8A2BE2]/10 hover:border-[#8A2BE2]/40 shadow-lg shadow-[#8A2BE2]/5 hover:shadow-xl hover:shadow-[#8A2BE2]/10 transition-all duration-300 relative overflow-hidden"
              data-testid={`product-card-${product.name.toLowerCase()}`}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[#8A2BE2]/5 to-transparent" />

              <div className="relative">
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8A2BE2]/10 to-[#FF2FBF]/10 flex items-center justify-center group-hover:from-[#8A2BE2]/20 group-hover:to-[#FF2FBF]/20 transition-colors shrink-0">
                    <product.icon className="w-7 h-7 text-[#8A2BE2]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#0D0D0D] group-hover:text-[#8A2BE2] transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-[#8A2BE2]/70 text-sm font-medium">{product.subtitle}</p>
                  </div>
                </div>

                <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>

                <Link href={product.href}>
                  <a className="inline-flex items-center gap-2 text-[#F97316] text-sm font-semibold group/btn hover:text-[#EA580C]">
                    {product.cta}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </a>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
