import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Shield, Globe, Building2, Gem, Ship, 
  BarChart3, Banknote, Lock, TrendingUp, ChevronDown,
  Menu, X, ExternalLink, Truck, Factory, Leaf,
  Users, Award, MapPin, Mail, CheckCircle2
} from 'lucide-react';
import { Link } from 'wouter';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';
import FloatingAgentChat from '@/components/FloatingAgentChat';
import finatradesLogoEcosystem from '@/assets/finatrades-logo-ecosystem.png';
import raminvestLogo from '@/assets/raminvest-logo.webp';
import wingoldLogo from '@/assets/wingold-logo.png';
import wincommoditiesLogo from '@/assets/wincommodities-logo.png';
import winlogisticsLogo from '@/assets/winlogistics-logo.png';

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
          ? 'bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082] shadow-lg shadow-purple-900/20' 
          : 'bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082]'
      }`}
      data-testid="ecosystem-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img 
              src={finatradesLogo} 
              alt="Finatrades Ecosystem" 
              className="h-12 w-auto brightness-0 invert"
              data-testid="logo-ecosystem"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link 
              href="/sign-in"
              className="text-white hover:text-white/80 px-4 py-2 text-sm font-medium transition-colors border border-white/30 rounded-full hover:bg-white/10"
              data-testid="btn-sign-in"
            >
              Sign In
            </Link>
            <Link 
              href="/finagold"
              className="group flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
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
              className="lg:hidden mt-4 pb-6 border-t border-white/20 pt-4"
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
                  href="/sign-in"
                  className="block border border-white/30 text-white px-6 py-4 min-h-[52px] rounded-full text-base font-semibold w-full mt-3 text-center active:bg-white/10 transition-all flex items-center justify-center"
                >
                  Sign In
                </Link>
                <Link 
                  href="/finagold"
                  className="mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 min-h-[52px] rounded-full text-base font-semibold"
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
    <section className="relative min-h-[auto] lg:min-h-screen pt-20 lg:pt-28 pb-12 lg:pb-20 overflow-x-hidden" data-testid="ecosystem-hero">
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#EDE9FE] pointer-events-none" />
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(138, 43, 226, 0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#8A2BE2]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#FF2FBF]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center max-w-5xl mx-auto lg:min-h-[calc(100vh-200px)] flex flex-col justify-center"
        >
          <motion.div variants={fadeIn} className="mb-6 mt-6 sm:mt-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 border border-red-700">
              <span className="text-white text-sm font-bold">+</span>
              <span className="text-white text-sm font-medium">Integrated Trade & Finance Ecosystem</span>
              <span className="text-white/70 text-xs">○</span>
            </div>
          </motion.div>

          <motion.h1 variants={fadeIn} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-4">
            <span className="bg-gradient-to-r from-[#8A2BE2] via-[#FF2FBF] to-[#FF2FBF] bg-clip-text text-transparent">FINATRADES</span>
            <br />
            <span className="text-[#0D0D0D]">ECOSYSTEM</span>
          </motion.h1>

          <motion.h2 variants={fadeIn} className="text-xl sm:text-2xl md:text-3xl text-[#0D0D0D] font-semibold leading-tight mb-6">
            Securing International Commodities Transactions
          </motion.h2>

          <motion.p variants={fadeIn} className="text-[#4A4A4A] text-sm sm:text-base leading-relaxed max-w-3xl mx-auto mb-8">
            International commodity trade — particularly along the Global South — faces persistent structural challenges: counterparty risk, limited trade finance access, unstable exchange rates and logistical complexity. Finatrades addresses these through a dedicated Ecosystem.
          </motion.p>

          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12">
            <a 
              href="#raminvest"
              className="group flex items-center justify-center gap-2 border border-gray-300 text-[#0D0D0D] bg-white px-8 py-4 min-h-[52px] rounded-full text-base font-semibold hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] transition-all w-full sm:w-auto"
              data-testid="btn-discover"
            >
              Discover Our Ecosystem
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <Link 
              href="/finagold"
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-8 py-4 min-h-[52px] rounded-full text-base font-semibold hover:from-[#EA580C] hover:to-[#DC2626] active:scale-[0.98] transition-all shadow-lg shadow-[#F97316]/25 w-full sm:w-auto"
              data-testid="btn-platform-hero"
            >
              Access Finatrades Platform
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <motion.div variants={fadeIn} className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Shield, label: 'Swiss Regulated', sub: 'FINMA / SO-FIT' },
              { icon: Gem, label: 'Gold Backed', sub: 'Physical Collateral' },
              { icon: Globe, label: 'Global Reach', sub: 'Dubai & Geneva' },
              { icon: Building2, label: 'Institutional', sub: 'DIFC Governed' },
            ].map((item) => (
              <div key={item.label} className="text-center" data-testid={`stat-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-100 to-pink-50 border border-purple-100/50 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[#8A2BE2]" />
                </div>
                <p className="text-[#0D0D0D] font-semibold text-sm">{item.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.sub}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function EcosystemDiagram({ testId }: { testId: string }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-2xl"
      data-testid={testId}
      style={{ background: 'linear-gradient(145deg, #2D0840 0%, #4A1259 35%, #5A1868 55%, #4A1259 75%, #2D0840 100%)' }}
    >
      <div className="relative w-full">
        <svg
          className="w-full h-auto"
          viewBox="0 0 600 450"
          fill="none"
        >
          <circle cx="300" cy="225" r="70" stroke="white" strokeWidth="1.2" fill="none" opacity="0.2" />
          <circle cx="300" cy="225" r="48" stroke="white" strokeWidth="0.6" fill="none" opacity="0.1" />

          <path d="M 345 50 C 460 55, 540 140, 555 210" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M 555 240 C 540 330, 420 395, 345 405" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M 255 405 C 180 395, 60 330, 45 240" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M 45 210 C 60 140, 140 55, 255 50" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.9" />

          <foreignObject x="200" y="10" width="200" height="70">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', justifyContent: 'center' }}>
              <img src={raminvestLogo} alt="Raminvest Holding DIFC" style={{ height: '55px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>
          </foreignObject>

          <foreignObject x="190" y="195" width="220" height="60">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <img src={finatradesLogoEcosystem} alt="Finatrades" style={{ height: '50px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>
          </foreignObject>

          <foreignObject x="5" y="200" width="140" height="50">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <img src={wincommoditiesLogo} alt="WinCommodities" style={{ width: '100%', height: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>
          </foreignObject>

          <foreignObject x="455" y="200" width="140" height="50">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <img src={wingoldLogo} alt="WinGold & Metals DMCC" style={{ width: '100%', height: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>
          </foreignObject>

          <foreignObject x="215" y="385" width="170" height="45">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <img src={winlogisticsLogo} alt="WinLogistics" style={{ width: '100%', height: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>
          </foreignObject>
        </svg>
      </div>
    </div>
  );
}

function EcosystemOverview() {
  return (
    <section id="ecosystem" className="relative py-12 lg:py-24 bg-gradient-to-b from-[#F8F4FF] to-[#F4F6FC]" data-testid="ecosystem-overview">
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#8A2BE2]/5 to-transparent" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#FF2FBF]/5 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.span variants={fadeIn} className="inline-block text-sm font-semibold tracking-[0.2em] text-[#8A2BE2] mb-4">
            OUR ECOSYSTEM
          </motion.span>
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0D0D0D] mb-6">
            An Integrated Trade & Finance Ecosystem
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-500 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            International commodity trade — particularly along the Global South — faces persistent structural challenges: 
            counterparty risk, limited trade finance access, unstable exchange rates and logistical complexity. 
            Finatrades addresses these through a dedicated Ecosystem.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeIn}
          className="mb-12"
        >
          <div className="max-w-3xl mx-auto">
            <EcosystemDiagram testId="ecosystem-overview-diagram" />
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="p-8 rounded-2xl bg-white border border-purple-100/50 shadow-sm text-center"
        >
          <p className="text-gray-600 text-base leading-relaxed max-w-4xl mx-auto">
            By integrating trade finance solutions backed by <span className="text-[#8A2BE2] font-semibold">physical gold</span> as operational collateral, 
            within an institutionally governed framework, Finatrades mitigates counterparty risk and provides trusted third-party facilitation for cross-border trade. 
            All companies operate under <span className="text-[#0D0D0D] font-semibold">RAMINVEST HOLDING</span> based in DIFC.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function RaminvestSection() {
  return (
    <section id="raminvest" className="relative py-12 lg:py-24 bg-gradient-to-br from-[#FAFBFF] via-purple-50/20 to-pink-50/10 overflow-hidden" data-testid="raminvest-section">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-purple-100/30 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] bg-pink-100/20 blur-[120px] rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeIn} className="text-center mb-16">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1A002F] to-[#2A0055] shadow-lg">
                <img src={raminvestLogo} alt="Raminvest Holding" className="h-16 md:h-20 w-auto" data-testid="logo-raminvest" />
              </div>
            </div>
            <p className="text-gray-400 text-sm font-medium tracking-wider">SHAPING FUTURES. BUILDING LEGACIES.</p>
            <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-pink-500 mx-auto rounded-full mt-6" />
          </motion.div>

          <motion.div variants={fadeIn} className="max-w-3xl mx-auto mb-16">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-purple-100/50">
              <p className="text-gray-600 text-base leading-relaxed mb-4">
                Headquartered in the prestigious <span className="text-[#0D0D0D] font-semibold">Dubai International Financial Centre (DIFC)</span>, with a legacy rooted in 
                delivering sophisticated financial instruments and smart trade facilitation. Raminvest Holding has built a resilient network of specialized subsidiaries, 
                each focused on solving real-world trade and financial challenges.
              </p>
              <p className="text-gray-500 text-base leading-relaxed">
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
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-purple-100/50 hover:border-purple-200 group"
                data-testid={`strength-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-[#0D0D0D] font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
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
    <section id="finatrades" className="relative py-12 lg:py-24 bg-gradient-to-b from-[#F8F4FF] to-[#F4F6FC]" data-testid="finatrades-section">
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#8A2BE2]/5 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={fadeIn}>
              <div className="mb-6">
                <img src={finatradesLogoEcosystem} alt="Finatrades" className="h-14 md:h-16 w-auto" data-testid="logo-finatrades-section" />
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 border border-red-700 mb-6">
                <span className="text-white text-sm font-bold">+</span>
                <span className="text-white text-sm font-medium">Swiss Regulated Platform</span>
                <span className="text-white/70 text-xs">○</span>
              </div>
              <p className="text-[#0D0D0D] font-semibold text-xl mb-6">Swiss Regulated Trade & Finance Platform Backed by Gold</p>
              <p className="text-gray-600 text-base leading-relaxed mb-4">
                A next-generation digital platform designed to streamline international trade, payments, and financial operations 
                with unmatched efficiency. Operating as a Swiss-licensed financial institution, Finatrades delivers advanced financial services.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                By leveraging gold-backed solutions and a regulated barter transaction framework, Finatrades helps mitigate currency risk 
                and simplifies complex cross-border transactions. This enables businesses and governments to trade more efficiently, 
                optimize financing structures, and access global markets with enhanced security, transparency, and confidence.
              </p>
              <Link 
                href="/finagold"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#FF2FBF] to-[#8A2BE2] text-white px-8 py-4 rounded-full text-base font-semibold hover:from-[#E91E9D] hover:to-[#7B27CC] active:scale-[0.98] transition-all shadow-md shadow-[#FF2FBF]/20"
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
                <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100/50 hover:shadow-lg hover:border-purple-200 transition-all duration-300 group" data-testid={`feature-finatrades-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="w-4 h-4 text-purple-600" />
                  </div>
                  <h4 className="text-[#0D0D0D] font-semibold text-sm mb-1">{item.label}</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
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
    <section id="wingold" className="relative py-12 lg:py-24 bg-gradient-to-br from-[#FAFBFF] via-purple-50/20 to-pink-50/10 overflow-hidden" data-testid="wingold-section">
      <div className="absolute inset-0">
        <div className="absolute bottom-1/3 left-0 w-[500px] h-[500px] bg-amber-100/20 blur-[150px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-purple-100/20 blur-[120px] rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
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
                <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100/50 hover:shadow-lg hover:border-amber-200 transition-all duration-300 group" data-testid={`feature-wingold-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="w-4 h-4 text-amber-600" />
                  </div>
                  <h4 className="text-[#0D0D0D] font-semibold text-sm mb-1">{item.label}</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeIn} className="order-1 lg:order-2">
              <div className="mb-5 inline-flex items-center justify-start">
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#1A1A2E] to-[#16213E] shadow-lg">
                  <img src={wingoldLogo} alt="WinGold & Metals" className="h-10 md:h-12 w-auto" data-testid="logo-wingold" />
                </div>
              </div>
              <p className="text-amber-600 font-semibold text-lg mb-6">Empowering Wealth. Securing Futures.</p>
              <p className="text-gray-600 text-base leading-relaxed mb-4">
                Wingold & Metals specializes in the trading and management of precious metals, providing strategic financial solutions 
                for governments, institutions, and corporate clients. Through proprietary financial instruments and innovative structured solutions, 
                we unlock liquidity and optimize asset value.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Our expertise covers secure storage, collateralization, and market access, ensuring that every metal-backed transaction 
                delivers both financial security and profitability. With a global network and deep market insight, we help clients maximize 
                the value of their precious metal assets.
              </p>
              <a 
                href="https://wingoldandmetals.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#FF2FBF] to-[#8A2BE2] text-white px-6 py-3 rounded-full text-sm font-semibold hover:from-[#E91E9D] hover:to-[#7B27CC] active:scale-[0.98] transition-all shadow-md shadow-[#FF2FBF]/20"
                data-testid="btn-visit-wingold"
              >
                Visit Website
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WinCommoditiesSection() {
  return (
    <section id="wincommodities" className="relative py-12 lg:py-24 bg-gradient-to-b from-[#F8F4FF] to-[#F4F6FC]" data-testid="wincommodities-section">
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#8A2BE2]/5 to-transparent" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-green-100/20 rounded-full blur-[120px]" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={fadeIn}>
              <div className="mb-5">
                <img src={wincommoditiesLogo} alt="WinCommodities" className="h-10 md:h-12 w-auto" data-testid="logo-wincommodities" />
              </div>
              <p className="text-[#DC2626] font-semibold text-lg mb-6">Breaking Barriers. Building Trade.</p>
              <p className="text-gray-600 text-base leading-relaxed mb-6">
                As the largest physical commodities platform, WinCommodities is dedicated to providing substantial advantages through 
                economies of scale on the sourcing, logistics and financial optimization. We focus on global transactions related to:
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['Oil & Fuels', 'Metals', 'Green Energy', 'Soft Commodities'].map((item) => (
                  <div key={item} className="px-4 py-3 rounded-xl bg-white border border-red-100 text-gray-700 text-sm font-medium text-center shadow-sm" data-testid={`commodity-${item.toLowerCase().replace(/\s+/g, '-')}`}>
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                WinCommodities offers an innovative platform enabling governments and businesses to trade essential goods through 
                a secure and fully compliant barter system. By providing real-time transaction transparency, our platform reduces 
                reliance on foreign currencies and mitigates exchange rate risks.
              </p>
              <a 
                href="https://wincommodities.finatrades.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#FF2FBF] to-[#8A2BE2] text-white px-6 py-3 rounded-full text-sm font-semibold hover:from-[#E91E9D] hover:to-[#7B27CC] active:scale-[0.98] transition-all shadow-md shadow-[#FF2FBF]/20"
                data-testid="btn-visit-wincommodities"
              >
                Access Here
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
                <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100/50 hover:shadow-lg hover:border-red-200 transition-all duration-300 group" data-testid={`feature-wincommodities-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="w-4 h-4 text-[#DC2626]" />
                  </div>
                  <h4 className="text-[#0D0D0D] font-semibold text-sm mb-1">{item.label}</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
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
    <section id="winlogistics" className="relative py-12 lg:py-24 bg-gradient-to-br from-[#FAFBFF] via-purple-50/20 to-pink-50/10 overflow-hidden" data-testid="winlogistics-section">
      <div className="absolute inset-0">
        <div className="absolute bottom-1/3 left-0 w-[500px] h-[500px] bg-blue-100/20 blur-[150px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-purple-100/20 blur-[120px] rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
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
                <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100/50 hover:shadow-lg hover:border-red-200 transition-all duration-300 group" data-testid={`feature-winlogistics-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="w-4 h-4 text-[#DC2626]" />
                  </div>
                  <h4 className="text-[#0D0D0D] font-semibold text-sm mb-1">{item.label}</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeIn} className="order-1 lg:order-2">
              <div className="mb-5">
                <img src={winlogisticsLogo} alt="Win Logistics" className="h-10 md:h-12 w-auto" data-testid="logo-winlogistics" />
              </div>
              <p className="text-[#DC2626] font-semibold text-lg mb-6">Comprehensive Logistics Solutions Built for Global Trade</p>
              <p className="text-gray-600 text-base leading-relaxed mb-4">
                Win Logistics acts as a strategic coordination and facilitation layer, seamlessly connecting shippers, warehouses, 
                and service providers to optimize global trade. Our core mission is to enable fluid trade flows through highly structured 
                processes and expert professional handling at every stage of the supply chain.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                We provide practical logistics execution across air, sea, and road, supported by professional warehousing partnerships 
                in key trade zones. By combining structured documentation handling with technology-enabled visibility and tracking, 
                we ensure every shipment is managed with precision, security, and real-time transparency.
              </p>
              <a 
                href="https://winlogistics.finatrades.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#FF2FBF] to-[#8A2BE2] text-white px-6 py-3 rounded-full text-sm font-semibold hover:from-[#E91E9D] hover:to-[#7B27CC] active:scale-[0.98] transition-all shadow-md shadow-[#FF2FBF]/20"
                data-testid="btn-visit-winlogistics"
              >
                Access Here
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative py-12 lg:py-24 bg-gradient-to-b from-[#F8F4FF] to-[#EDE9FE] overflow-hidden" data-testid="ecosystem-cta">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#8A2BE2]/5 rounded-full blur-[250px]" />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0D0D0D] mb-6">
            Powering Efficient Trade,{' '}
            <span className="bg-gradient-to-r from-[#8A2BE2] via-[#FF2FBF] to-[#FF2FBF] bg-clip-text text-transparent">One Transaction at a Time</span>
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-500 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Whether supporting large-scale international trade operations or ongoing financial activities, 
            Finatrades empowers its partners to operate confidently in global markets.
          </motion.p>
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/finagold"
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-10 py-4 min-h-[52px] rounded-full text-lg font-semibold hover:from-[#EA580C] hover:to-[#DC2626] active:scale-[0.98] transition-all shadow-lg shadow-[#F97316]/25"
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
    <footer id="contact" className="relative py-16 pb-[calc(4rem+env(safe-area-inset-bottom))] bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082]" data-testid="ecosystem-footer">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="mb-6">
              <img 
                src={finatradesLogo} 
                alt="Finatrades Ecosystem" 
                className="h-14 w-auto mb-2 brightness-0 invert"
              />
              <p className="text-white/60 text-sm">Integrated Trade & Finance Ecosystem</p>
            </div>
            <div className="space-y-2 text-white/70 text-xs mb-6">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-purple-400/60 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white/80">Dubai</p>
                  <p>Burj Daman Office 802 Waldorf Astoria, DIFC, UAE</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-purple-400/60 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white/80">Geneva</p>
                  <p>Rue Robert-CÉARD, 1204 Genève</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Mail className="w-4 h-4 text-purple-400/60 flex-shrink-0" />
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
                  <a href={link.href} className="text-white/60 text-sm hover:text-white transition-colors" data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
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
                  <Link href={link.href} className="text-white/60 text-sm hover:text-white transition-colors" data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-sm">
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
    <>
    <div className="finagold-landing min-h-screen bg-[#FAFBFF] text-[#0D0D0D] antialiased selection:bg-[#8A2BE2] selection:text-white overflow-x-hidden">
      <style>{`
        .finagold-landing {
          --gold: #D4AF37;
          --gold-bright: #FFD500;
          --gold-light: #F7D878;
          --gold-dark: #B8860B;
          --purple-deep: #8A2BE2;
          --purple-magenta: #FF2FBF;
          --purple-light: #A342FF;
          --purple-pink: #FF4CD6;
          --purple-violet: #4B0082;
          --bg-darkest: #0D001E;
          --bg-dark: #1A002F;
          --bg-medium: #2A0055;
          --bg-indigo: #4B0082;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          --primary: #8A2BE2;
          --primary-foreground: #ffffff;
          --ring: #8A2BE2;
          --accent: #D4AF37;
          --accent-foreground: #000000;
        }
        .finagold-landing {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .finagold-landing::-webkit-scrollbar {
          display: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .finagold-landing *,
          .finagold-landing *::before,
          .finagold-landing *::after {
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
        <RaminvestSection />
        <EcosystemOverview />
        <FinatradesSection />
        <WingoldSection />
        <WinCommoditiesSection />
        <WinLogisticsSection />
        <CTASection />
      </main>
      <EcosystemFooter />
    </div>
    <FloatingAgentChat />
  </>
  );
}
