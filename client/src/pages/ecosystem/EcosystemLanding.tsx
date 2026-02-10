import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Shield, Globe, Building2, Gem, Ship, 
  BarChart3, Banknote, Lock, TrendingUp, ChevronDown,
  Menu, X, ExternalLink, Truck, Factory, Leaf,
  Users, Award, MapPin, Mail, Phone
} from 'lucide-react';
import { Link } from 'wouter';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

function EcosystemNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Ecosystem', href: '#ecosystem' },
    { label: 'Raminvest', href: '#raminvest' },
    { label: 'Finatrades', href: '#finatrades' },
    { label: 'WinGold', href: '#wingold' },
    { label: 'WinCommodities', href: '#wincommodities' },
    { label: 'Win Logistics', href: '#winlogistics' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#0A0A1A]/95 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/5' 
          : 'bg-transparent'
      }`}
      data-testid="ecosystem-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <a href="#" className="flex items-center gap-3">
            <img 
              src={finatradesLogo} 
              alt="Finatrades Ecosystem" 
              className="h-10 w-auto brightness-0 invert"
              data-testid="logo-ecosystem"
            />
            <span className="text-white/60 text-xs font-medium tracking-widest uppercase hidden sm:block">Ecosystem</span>
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link 
              href="/finagold"
              className="group flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white px-5 py-2 rounded-full text-sm font-semibold hover:from-[#B8860B] hover:to-[#8B6914] transition-all shadow-lg shadow-[#D4AF37]/20"
              data-testid="btn-enter-platform"
            >
              Enter Platform
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-white p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:bg-white/10 transition-colors"
            data-testid="mobile-menu-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mt-4 pb-6 border-t border-white/10 pt-4"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="px-4 py-3 min-h-[48px] rounded-lg text-base font-medium text-white/80 hover:text-white active:bg-white/10 transition-all flex items-center"
                    onClick={() => setMobileOpen(false)}
                    data-testid={`mobile-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </a>
                ))}
                <Link 
                  href="/finagold"
                  className="mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white px-6 py-4 min-h-[52px] rounded-full text-base font-semibold"
                  data-testid="mobile-btn-enter-platform"
                >
                  Enter Platform
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden" data-testid="ecosystem-hero">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A1A] via-[#0D001E] to-[#1A002F]" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/6 w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#8A2BE2]/8 rounded-full blur-[180px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#D4AF37]/3 rounded-full blur-[250px]" />
      </div>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(212, 175, 55, 0.15) 1px, transparent 0)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative max-w-7xl mx-auto px-6 w-full">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center max-w-5xl mx-auto"
        >
          <motion.div variants={fadeIn} className="mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
              <span className="text-[#D4AF37] text-sm font-semibold tracking-wide">INTEGRATED TRADE & FINANCE ECOSYSTEM</span>
            </div>
          </motion.div>

          <motion.h1 variants={fadeIn} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6">
            <span className="text-white">FINATRADES</span>
            <br />
            <span className="bg-gradient-to-r from-[#D4AF37] via-[#F7D878] to-[#D4AF37] bg-clip-text text-transparent">ECOSYSTEM</span>
          </motion.h1>

          <motion.p variants={fadeIn} className="text-white/60 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-10">
            Securing international commodities transactions through an integrated ecosystem of trade finance, precious metals, 
            commodity sourcing, and logistics — all backed by physical gold within an institutionally governed framework.
          </motion.p>

          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#ecosystem"
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white px-8 py-4 min-h-[52px] rounded-full text-base font-semibold hover:from-[#B8860B] hover:to-[#8B6914] active:scale-[0.98] transition-all shadow-lg shadow-[#D4AF37]/25"
              data-testid="btn-discover"
            >
              Discover Our Ecosystem
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <Link 
              href="/finagold"
              className="group flex items-center justify-center gap-2 border border-white/20 text-white px-8 py-4 min-h-[52px] rounded-full text-base font-semibold hover:bg-white/5 hover:border-white/40 active:scale-[0.98] transition-all"
              data-testid="btn-platform-hero"
            >
              Access Finatrades Platform
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Shield, label: 'Swiss Regulated', sub: 'FINMA / SO-FIT' },
              { icon: Gem, label: 'Gold Backed', sub: 'Physical Collateral' },
              { icon: Globe, label: 'Global Reach', sub: 'Dubai & Geneva' },
              { icon: Building2, label: 'Institutional', sub: 'DIFC Governed' },
            ].map((item) => (
              <div key={item.label} className="text-center" data-testid={`stat-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{item.sub}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-6 h-6 text-white/30" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function EcosystemOverview() {
  return (
    <section id="ecosystem" className="relative py-24 bg-[#0D001E]" data-testid="ecosystem-overview">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A1A] to-[#0D001E]" />
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="text-[#D4AF37] text-xs font-semibold tracking-widest uppercase">Our Ecosystem</span>
          </motion.div>
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            An Integrated Trade & Finance{' '}
            <span className="bg-gradient-to-r from-[#D4AF37] to-[#F7D878] bg-clip-text text-transparent">Ecosystem</span>
          </motion.h2>
          <motion.p variants={fadeIn} className="text-white/50 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            International commodity trade — particularly along the Global South — faces persistent structural challenges: 
            counterparty risk, limited trade finance access, unstable exchange rates and logistical complexity. 
            Finatrades addresses these through a dedicated Ecosystem specifically designed to secure international commodities transactions.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="relative"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Banknote,
                color: '#8A2BE2',
                title: 'FINATRADES',
                subtitle: 'Trade & Finance Platform',
                desc: 'Swiss-regulated digital platform for trade finance and gold-backed payments',
                href: '#finatrades',
              },
              {
                icon: Gem,
                color: '#D4AF37',
                title: 'WINGOLD & METALS',
                subtitle: 'Precious Metals Trading',
                desc: 'Strategic precious metals trading, storage and collateralization solutions',
                href: '#wingold',
              },
              {
                icon: Factory,
                color: '#22C55E',
                title: 'WINCOMMODITIES',
                subtitle: 'Commodity Sourcing',
                desc: 'Physical commodities platform with innovative barter trade solutions',
                href: '#wincommodities',
              },
              {
                icon: Truck,
                color: '#3B82F6',
                title: 'WIN LOGISTICS',
                subtitle: 'Global Logistics',
                desc: 'End-to-end air, sea, road logistics and warehousing solutions',
                href: '#winlogistics',
              },
            ].map((item, i) => (
              <motion.a
                key={item.title}
                href={item.href}
                variants={fadeIn}
                className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer"
                data-testid={`card-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-sm font-medium mb-3" style={{ color: item.color }}>{item.subtitle}</p>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: item.color }}>
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.a>
            ))}
          </div>

          <motion.div
            variants={fadeIn}
            className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-[#D4AF37]/5 via-transparent to-[#8A2BE2]/5 border border-white/10 text-center"
          >
            <p className="text-white/70 text-base leading-relaxed max-w-4xl mx-auto">
              By integrating trade finance solutions backed by <span className="text-[#D4AF37] font-semibold">physical gold</span> as operational collateral, 
              within an institutionally governed framework, Finatrades mitigates counterparty risk and provides trusted third-party facilitation for cross-border trade. 
              All companies operate under <span className="text-white font-semibold">RAMINVEST HOLDING</span> based in DIFC.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function RaminvestSection() {
  return (
    <section id="raminvest" className="relative py-24 bg-[#0A0A1A]" data-testid="raminvest-section">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeIn} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 mb-6">
              <Building2 className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[#D4AF37] text-xs font-semibold tracking-widest uppercase">Holding Company</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              RAMINVEST{' '}
              <span className="bg-gradient-to-r from-[#D4AF37] to-[#F7D878] bg-clip-text text-transparent">HOLDING</span>
            </h2>
            <p className="text-white/40 text-sm font-medium tracking-wider">SHAPING FUTURES. BUILDING LEGACIES.</p>
          </motion.div>

          <motion.div variants={fadeIn} className="max-w-4xl mx-auto mb-16">
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="text-white/70 text-base leading-relaxed mb-6">
                Headquartered in the prestigious <span className="text-white font-semibold">Dubai International Financial Centre (DIFC)</span>, with a legacy rooted in 
                delivering sophisticated financial instruments and smart trade facilitation. Raminvest Holding has built a resilient network of specialized subsidiaries, 
                each focused on solving real-world trade and financial challenges.
              </p>
              <p className="text-white/60 text-base leading-relaxed">
                From addressing hard currency shortages with innovative barter systems to enabling direct access to global commodities markets, 
                Raminvest Holding is more than a holding company — it is a catalyst for sustainable economic growth and financial empowerment.
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: 'Diversified Ecosystem',
                desc: 'Seamlessly connects finance, trade, and commodities through a strategic portfolio of specialized companies.',
              },
              {
                icon: Globe,
                title: 'Trusted Global Presence',
                desc: 'Operating from Dubai and Geneva with deep ties across African markets and emerging economies.',
              },
              {
                icon: TrendingUp,
                title: 'Innovative Financial Solutions',
                desc: 'Pioneers of digital platforms and alternative trade and finance mechanisms tailored for emerging economies.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-2xl bg-gradient-to-b from-[#D4AF37]/5 to-transparent border border-[#D4AF37]/10"
                data-testid={`strength-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FinatradesSection() {
  return (
    <section id="finatrades" className="relative py-24 bg-[#0D001E]" data-testid="finatrades-section">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8A2BE2]/30 to-transparent" />
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[#8A2BE2]/5 rounded-full blur-[150px]" />
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={fadeIn}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8A2BE2]/10 border border-[#8A2BE2]/20 mb-6">
                <Banknote className="w-4 h-4 text-[#8A2BE2]" />
                <span className="text-[#8A2BE2] text-xs font-semibold tracking-widest uppercase">Swiss Regulated Platform</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                FINATRADES
              </h2>
              <p className="text-[#8A2BE2] font-semibold text-lg mb-6">Swiss Regulated Trade & Finance Platform Backed by Gold</p>
              <p className="text-white/60 text-base leading-relaxed mb-6">
                A next-generation digital platform designed to streamline international trade, payments, and financial operations 
                with unmatched efficiency. Operating as a Swiss-licensed financial institution, Finatrades delivers advanced financial services.
              </p>
              <p className="text-white/50 text-sm leading-relaxed mb-8">
                By leveraging gold-backed solutions and a regulated barter transaction framework, Finatrades helps mitigate currency risk 
                and simplifies complex cross-border transactions. This enables businesses and governments to trade more efficiently, 
                optimize financing structures, and access global markets with enhanced security, transparency, and confidence.
              </p>
              <Link 
                href="/finagold"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#8A2BE2] to-[#A342FF] text-white px-8 py-4 rounded-full text-base font-semibold hover:from-[#7B27CC] hover:to-[#9338EE] active:scale-[0.98] transition-all shadow-lg shadow-[#8A2BE2]/25"
                data-testid="btn-access-finatrades"
              >
                Access Finatrades Platform
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Shield, label: 'Trade Finance', desc: 'Structured trade solutions for international commerce' },
                { icon: Gem, label: 'Gold-Backed System', desc: 'Physical gold collateral for transaction security' },
                { icon: Globe, label: 'Global Payments', desc: 'Multi-currency accounts and settlement' },
                { icon: Lock, label: 'FINMA Regulated', desc: 'Swiss regulatory compliance & SO-FIT membership' },
                { icon: BarChart3, label: 'FinaPay', desc: 'Digital gold wallet for seamless payments' },
                { icon: TrendingUp, label: 'FinaBridge', desc: 'Trade finance facilitation and deal rooms' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#8A2BE2]/30 transition-colors" data-testid={`feature-finatrades-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-10 h-10 rounded-lg bg-[#8A2BE2]/10 border border-[#8A2BE2]/20 flex items-center justify-center mb-3">
                    <item.icon className="w-4 h-4 text-[#8A2BE2]" />
                  </div>
                  <h4 className="text-white font-semibold text-sm mb-1">{item.label}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WingoldSection() {
  return (
    <section id="wingold" className="relative py-24 bg-[#0A0A1A]" data-testid="wingold-section">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
      <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[150px]" />
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={fadeIn} className="order-2 lg:order-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: BarChart3, label: 'Asset Liquidity', desc: 'Unlocking value from precious metal holdings' },
                { icon: Lock, label: 'Collateral Solutions', desc: 'Metal-backed financial instruments' },
                { icon: Shield, label: 'Secure Trading', desc: 'Certified storage and transparent management' },
                { icon: TrendingUp, label: 'Market Access', desc: 'Direct access to global precious metals markets' },
                { icon: Leaf, label: 'Boudadya & Baraka', desc: 'Responsible mineral extraction operations' },
                { icon: Award, label: 'Institutional Grade', desc: 'Solutions for governments and institutions' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 transition-colors" data-testid={`feature-wingold-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-3">
                    <item.icon className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <h4 className="text-white font-semibold text-sm mb-1">{item.label}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeIn} className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 mb-6">
                <Gem className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[#D4AF37] text-xs font-semibold tracking-widest uppercase">Precious Metals — DMCC</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                WINGOLD & METALS
              </h2>
              <p className="text-[#D4AF37] font-semibold text-lg mb-6">Empowering Wealth. Securing Futures.</p>
              <p className="text-white/60 text-base leading-relaxed mb-6">
                Wingold & Metals specializes in the trading and management of precious metals, providing strategic financial solutions 
                for governments, institutions, and corporate clients. Through proprietary financial instruments and innovative structured solutions, 
                we unlock liquidity and optimize asset value.
              </p>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Our expertise covers secure storage, collateralization, and market access, ensuring that every metal-backed transaction 
                delivers both financial security and profitability. With a global network and deep market insight, we help clients maximize 
                the value of their precious metal assets.
              </p>
              <a 
                href="https://wingoldandmetals.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white px-6 py-3 rounded-full text-sm font-semibold hover:from-[#B8860B] hover:to-[#8B6914] active:scale-[0.98] transition-all shadow-lg shadow-[#D4AF37]/20 mb-4"
                data-testid="btn-visit-wingold"
              >
                Visit wingoldandmetals.com
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/5 border border-[#D4AF37]/20">
                <span className="text-[#D4AF37]/60 text-xs">TRANSFORMING PRECIOUS METALS INTO STRATEGIC FINANCIAL ASSETS</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WinCommoditiesSection() {
  return (
    <section id="wincommodities" className="relative py-24 bg-[#0D001E]" data-testid="wincommodities-section">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#22C55E]/30 to-transparent" />
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[#22C55E]/5 rounded-full blur-[150px]" />
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={fadeIn}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 mb-6">
                <Factory className="w-4 h-4 text-[#22C55E]" />
                <span className="text-[#22C55E] text-xs font-semibold tracking-widest uppercase">Commodities — DMCC</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                WINCOMMODITIES
              </h2>
              <p className="text-[#22C55E] font-semibold text-lg mb-6">Breaking Barriers. Building Trade.</p>
              <p className="text-white/60 text-base leading-relaxed mb-6">
                As the largest physical commodities platform, WinCommodities is dedicated to providing substantial advantages through 
                economies of scale on the sourcing, logistics and financial optimization. We focus on global transactions related to:
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {['Oil & Fuels', 'Metals', 'Green Energy', 'Soft Commodities'].map((item) => (
                  <div key={item} className="px-4 py-3 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/10 text-white/70 text-sm font-medium text-center" data-testid={`commodity-${item.toLowerCase().replace(/\s+/g, '-')}`}>
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                WinCommodities offers an innovative platform enabling governments and businesses to trade essential goods through 
                a secure and fully compliant barter system. By providing real-time transaction transparency, our platform reduces 
                reliance on foreign currencies and mitigates exchange rate risks.
              </p>
              <a 
                href="https://wincommodities.finatrades.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white px-6 py-3 rounded-full text-sm font-semibold hover:from-[#16A34A] hover:to-[#15803D] active:scale-[0.98] transition-all shadow-lg shadow-[#22C55E]/20"
                data-testid="btn-visit-wincommodities"
              >
                Visit wincommodities.finatrades.com
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>

            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Banknote, label: 'Barter Solutions', desc: 'Innovative commodity exchange mechanisms' },
                { icon: Shield, label: 'Currency Independence', desc: 'Reducing foreign currency reliance' },
                { icon: Lock, label: 'Trade Security', desc: 'Fully compliant and transparent transactions' },
                { icon: Globe, label: 'Emerging Markets', desc: 'Tailored solutions for developing economies' },
                { icon: TrendingUp, label: 'Scale Advantages', desc: 'Economies of scale in sourcing and logistics' },
                { icon: Award, label: 'Expert Team', desc: 'Industry-specific expertise across geographies' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#22C55E]/30 transition-colors" data-testid={`feature-wincommodities-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-10 h-10 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center mb-3">
                    <item.icon className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  <h4 className="text-white font-semibold text-sm mb-1">{item.label}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WinLogisticsSection() {
  return (
    <section id="winlogistics" className="relative py-24 bg-[#0A0A1A]" data-testid="winlogistics-section">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent" />
      <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] bg-[#3B82F6]/5 rounded-full blur-[150px]" />
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={fadeIn} className="order-2 lg:order-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Ship, label: 'Smart Freight', desc: 'Optimized air, sea, and road logistics' },
                { icon: Building2, label: 'Warehousing', desc: 'Strategic warehouse partnerships in key trade zones' },
                { icon: Globe, label: 'Trade Infrastructure', desc: 'Structured documentation and process handling' },
                { icon: BarChart3, label: 'Real-Time Tracking', desc: 'Technology-enabled visibility and monitoring' },
                { icon: Users, label: 'Strategic Partners', desc: 'Network of trusted global logistics providers' },
                { icon: Award, label: 'Operational Integrity', desc: 'Precision, security, and transparency at every stage' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#3B82F6]/30 transition-colors" data-testid={`feature-winlogistics-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center mb-3">
                    <item.icon className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <h4 className="text-white font-semibold text-sm mb-1">{item.label}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeIn} className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 mb-6">
                <Truck className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-[#3B82F6] text-xs font-semibold tracking-widest uppercase">Logistics — DMCC</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                WIN LOGISTICS
              </h2>
              <p className="text-[#3B82F6] font-semibold text-lg mb-6">Comprehensive Logistics Solutions Built for Global Trade</p>
              <p className="text-white/60 text-base leading-relaxed mb-6">
                Win Logistics acts as a strategic coordination and facilitation layer, seamlessly connecting shippers, warehouses, 
                and service providers to optimize global trade. Our core mission is to enable fluid trade flows through highly structured 
                processes and expert professional handling at every stage of the supply chain.
              </p>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                We provide practical logistics execution across air, sea, and road, supported by professional warehousing partnerships 
                in key trade zones. By combining structured documentation handling with technology-enabled visibility and tracking, 
                we ensure every shipment is managed with precision, security, and real-time transparency.
              </p>
              <a 
                href="https://winlogistics.finatrades.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white px-6 py-3 rounded-full text-sm font-semibold hover:from-[#2563EB] hover:to-[#1D4ED8] active:scale-[0.98] transition-all shadow-lg shadow-[#3B82F6]/20 mb-4"
                data-testid="btn-visit-winlogistics"
              >
                Visit winlogistics.finatrades.com
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B82F6]/5 border border-[#3B82F6]/20">
                <span className="text-[#3B82F6]/60 text-xs">BUILDING THE NEXT GENERATION OF GLOBAL LOGISTICS INFRASTRUCTURE</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative py-24 bg-[#0D001E] overflow-hidden" data-testid="ecosystem-cta">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#D4AF37]/3 rounded-full blur-[250px]" />
      </div>
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Powering Efficient Trade,{' '}
            <span className="bg-gradient-to-r from-[#D4AF37] to-[#F7D878] bg-clip-text text-transparent">One Transaction at a Time</span>
          </motion.h2>
          <motion.p variants={fadeIn} className="text-white/50 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Whether supporting large-scale international trade operations or ongoing financial activities, 
            Finatrades empowers its partners to operate confidently in global markets.
          </motion.p>
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/finagold"
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white px-10 py-4 min-h-[52px] rounded-full text-lg font-semibold hover:from-[#B8860B] hover:to-[#8B6914] active:scale-[0.98] transition-all shadow-lg shadow-[#D4AF37]/25"
              data-testid="btn-cta-platform"
            >
              Enter Finatrades Platform
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function EcosystemFooter() {
  return (
    <footer id="contact" className="relative py-16 bg-[#050510]" data-testid="ecosystem-footer">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="mb-6">
              <img 
                src={finatradesLogo} 
                alt="Finatrades Ecosystem" 
                className="h-14 w-auto mb-3 brightness-0 invert"
              />
              <p className="text-white/40 text-sm">Integrated Trade & Finance Ecosystem</p>
            </div>
            <div className="space-y-2 text-white/50 text-sm mb-6">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-[#D4AF37]/60 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white/60">Dubai</p>
                  <p>Burj Daman Office 802 Waldorf Astoria, DIFC, UAE</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-[#D4AF37]/60 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white/60">Geneva</p>
                  <p>Rue Robert-CÉARD, 1204 Genève</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Mail className="w-4 h-4 text-[#D4AF37]/60 flex-shrink-0" />
                <a href="mailto:admin@raminvestholding.com" className="text-white/60 hover:text-white transition-colors" data-testid="footer-link-email">
                  admin@raminvestholding.com
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Ecosystem</h4>
            <ul className="space-y-3">
              {[
                { label: 'Raminvest Holding', href: '#raminvest' },
                { label: 'Finatrades Platform', href: '#finatrades' },
                { label: 'WinGold & Metals', href: '#wingold' },
                { label: 'WinCommodities', href: '#wincommodities' },
                { label: 'Win Logistics', href: '#winlogistics' },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-white/50 text-sm hover:text-white transition-colors" data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Platform</h4>
            <ul className="space-y-3">
              {[
                { label: 'FinaPay Wallet', href: '/finagold/finapay' },
                { label: 'FinaVault', href: '/finagold/finavault' },
                { label: 'BNSL', href: '/finagold/bnsl' },
                { label: 'FinaBridge', href: '/finagold/finabridge' },
                { label: 'Sign In', href: '/sign-in' },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-white/50 text-sm hover:text-white transition-colors" data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/40 text-sm">
              &copy; {new Date().getFullYear()} Raminvest Holding. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/terms" className="text-white/40 text-xs hover:text-white/60 transition-colors" data-testid="footer-link-terms-of-service">Terms of Service</Link>
              <Link href="/privacy" className="text-white/40 text-xs hover:text-white/60 transition-colors" data-testid="footer-link-privacy-policy">Privacy Policy</Link>
              <Link href="/disclaimer" className="text-white/40 text-xs hover:text-white/60 transition-colors" data-testid="footer-link-disclaimer">Disclaimer</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function EcosystemLanding() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.documentElement.style.setProperty('--motion-duration', '0.01ms');
    }
  }, []);

  return (
    <div className="ecosystem-landing min-h-screen bg-[#0A0A1A] text-white antialiased selection:bg-[#D4AF37] selection:text-black overflow-x-hidden">
      <style>{`
        .ecosystem-landing {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .ecosystem-landing::-webkit-scrollbar {
          display: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .ecosystem-landing *,
          .ecosystem-landing *::before,
          .ecosystem-landing *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <EcosystemNavbar />
      <main>
        <HeroSection />
        <EcosystemOverview />
        <RaminvestSection />
        <FinatradesSection />
        <WingoldSection />
        <WinCommoditiesSection />
        <WinLogisticsSection />
        <CTASection />
      </main>
      <EcosystemFooter />
    </div>
  );
}
