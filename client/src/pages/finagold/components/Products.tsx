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

                <Link href={product.href}>
                  <a className="inline-flex items-center gap-2 text-[#EAC26B] text-sm font-medium group/btn hover:underline">
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
