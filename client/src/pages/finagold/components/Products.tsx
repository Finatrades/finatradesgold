import { motion } from 'framer-motion';
import { Lock, Wallet, TrendingUp, Building2, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    badge: 'PERSONAL TOOLS',
    title: 'Your Tools to Manage Real Gold Digitally',
    products: [
      {
        icon: Lock,
        title: 'Deposit / Buy Gold',
        description: 'Get instant value and turn into a settlement financial instrument with your choice of hedging or floating strategies as your business grows.',
        cta: 'Explore FinaVault',
        href: '/finavault-landing',
      },
      {
        icon: Wallet,
        title: 'Payments & Transfers',
        description: 'Send and receive payments through the platform, manage your wallet and spend anywhere using your gold-backed debit card.',
        cta: 'Explore FinaPay',
        href: '/finapay-landing',
      },
      {
        icon: TrendingUp,
        title: "Buy 'N' Sell Gold Plans",
        description: 'Get substantial margins and guaranteed returns thanks to our BNSL Plans.',
        cta: 'Explore BNSL',
        href: '/bnsl-landing',
      },
    ],
  },
  business: {
    badge: 'BUSINESS TOOLS',
    title: 'A Structured Ecosystem for High-Trust Business Transactions',
    products: [
      {
        icon: Lock,
        title: 'Deposit / Buy Gold',
        description: 'Get instant value and turn into a settlement financial instrument with your choice of hedging or floating strategies as your business grows.',
        cta: 'Explore FinaVault',
        href: '/finavault-landing',
      },
      {
        icon: Wallet,
        title: 'Payments & Transfers',
        description: 'Send and receive payments through the platform, manage your wallet and spend anywhere using your gold-backed debit card.',
        cta: 'Explore FinaPay',
        href: '/finapay-landing',
      },
      {
        icon: Building2,
        title: 'Global Trade Monitoring',
        description: 'Monitor your imports and exports in real time, track gold-backed settlements and streamline every step of your cross-border business operations.',
        cta: 'Explore FinaBridge',
        href: '/finabridge-landing',
      },
      {
        icon: TrendingUp,
        title: "Buy 'N' Sell Gold Plans",
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
    transition: { staggerChildren: 0.15 }
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
  const { mode, isPersonal } = useMode();
  const c = content[mode];

  return (
    <section id="products" className="relative py-24 bg-gradient-to-b from-[#F8F4FF] to-[#F4F6FC]" data-testid="products-section">
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
          <motion.span
            key={`badge-${mode}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block text-sm font-semibold tracking-[0.2em] text-[#8A2BE2] mb-4"
          >
            {c.badge}
          </motion.span>
          
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
          viewport={{ once: true }}
          className={`grid gap-6 ${isPersonal ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}
        >
          {c.products.map((product, index) => (
            <motion.div
              key={`${mode}-${product.title}`}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group flex flex-col items-center text-center p-8 rounded-3xl bg-white border border-gray-100 shadow-lg shadow-[#8A2BE2]/5 hover:shadow-xl hover:shadow-[#8A2BE2]/10 transition-all duration-300"
              data-testid={`product-card-${index}`}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8A2BE2]/10 to-[#FF2FBF]/15 flex items-center justify-center mb-6 group-hover:from-[#8A2BE2]/20 group-hover:to-[#FF2FBF]/25 transition-all duration-300">
                <product.icon className="w-8 h-8 text-[#8A2BE2]" strokeWidth={1.5} />
              </div>

              <h3 className="text-lg font-bold text-[#0D0D0D] mb-3">
                {product.title}
              </h3>

              <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-grow">
                {product.description}
              </p>

              <Link href={product.href} className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#FF2FBF] to-[#8A2BE2] text-white px-6 py-3 rounded-full text-sm font-semibold hover:from-[#E91E9D] hover:to-[#7B27CC] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-[#FF2FBF]/20 cursor-pointer">
                {product.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
