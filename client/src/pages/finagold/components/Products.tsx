import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { Lock, Wallet, TrendingUp, Building2, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';
import { useRef } from 'react';

// Public folder paths (served from client/public/images)
const goldBarsImage = '/images/deposit-gold.png';
const finaPayImage = '/images/finapay-transfers.png';
const globalTradeImage = '/images/global-trade.png';
const bnslImage = '/images/bnsl-plans.png';

const content = {
  personal: {
    badge: 'PERSONAL TOOLS',
    title: 'Your Tools to Manage Real Gold Digitally',
    products: [
      {
        icon: Lock,
        title: 'Deposit / Buy Gold',
        description: 'Securely deposit your gold into the FinaVault or purchase gold directly through our platform.',
        cta: 'Explore FinaVault',
        href: '/finavault-landing',
        image: goldBarsImage,
      },
      {
        icon: Wallet,
        title: 'Payments & Transfers',
        description: 'Send and receive payments through the platform, manage your wallet and spend anywhere using your gold-backed debit card.',
        cta: 'Explore FinaPay',
        href: '/finapay-landing',
        image: finaPayImage,
      },
      {
        icon: TrendingUp,
        title: "Buy 'N' Sell Gold Plans",
        description: 'Earn substantial margins and guaranteed returns with our secure gold savings plans.',
        cta: 'Explore BNSL',
        href: '/bnsl-landing',
        image: bnslImage,
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
        description: 'Securely deposit your gold into the FinaVault or purchase gold directly through our platform.',
        cta: 'Explore FinaVault',
        href: '/finavault-landing',
        image: goldBarsImage,
      },
      {
        icon: Wallet,
        title: 'Payments & Transfers',
        description: 'Send and receive payments through the platform, manage your wallet and spend anywhere using your gold-backed debit card.',
        cta: 'Explore FinaPay',
        href: '/finapay-landing',
        image: finaPayImage,
      },
      {
        icon: Building2,
        title: 'Global Trade Monitoring',
        description: 'Monitor your imports and exports in real time, track gold-backed settlements and streamline every step of your cross-border business operations.',
        cta: 'Explore FinaBridge',
        href: '/finabridge-landing',
        image: globalTradeImage,
      },
      {
        icon: TrendingUp,
        title: "Buy 'N' Sell Gold Plans",
        description: 'Earn substantial margins and guaranteed returns with our secure gold savings plans.',
        cta: 'Explore BNSL',
        href: '/bnsl-landing',
        image: bnslImage,
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

function ProductCard({ product, index }: { product: { icon: any; title: string; description: string; cta: string; href: string; image: string }; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });
  const glowX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%']);
  const glowY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%']);
  const glowBackground = useMotionTemplate`radial-gradient(circle at ${glowX} ${glowY}, rgba(138, 43, 226, 0.08), transparent 60%)`;

  const handleMouse = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className="group flex flex-col items-center text-center p-8 rounded-3xl bg-card border border-border/60 shadow-lg shadow-[#8A2BE2]/5 hover:shadow-2xl hover:shadow-[#8A2BE2]/15 transition-all duration-300 relative overflow-hidden cursor-pointer"
      data-testid={`product-card-${index}`}
    >
      <motion.div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: glowBackground }}
      />
      <div className="w-full h-48 mb-6 flex items-center justify-center overflow-hidden relative z-10">
        <motion.img 
          src={product.image} 
          alt={product.title} 
          className="max-w-full max-h-full object-contain p-2"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://placehold.co/400x300/8A2BE2/FFFFFF/png?text=' + encodeURIComponent(product.title);
          }}
        />
      </div>

      <h3 className="text-lg font-bold text-[#0D0D0D] mb-3 relative z-10 group-hover:text-[#8A2BE2] transition-colors duration-300">
        {product.title}
      </h3>

      <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow relative z-10">
        {product.description}
      </p>

      <Link href={product.href} className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#FF2FBF] to-[#8A2BE2] text-white px-6 py-3 rounded-full text-sm font-semibold hover:from-[#E91E9D] hover:to-[#7B27CC] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-[#FF2FBF]/20 cursor-pointer relative z-10">
        {product.cta}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
}

export default function Products() {
  const { mode, isPersonal } = useMode();
  const c = content[mode];

  return (
    <section id="products" className="relative py-12 lg:py-24 bg-gradient-to-b from-[#F8F4FF] to-[#F4F6FC]" data-testid="products-section">
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
            <ProductCard key={`${mode}-${product.title}`} product={product} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
