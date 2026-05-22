import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useSpring, useMotionTemplate } from 'framer-motion';
import { Link } from 'wouter';
import {
  ArrowRight, Shield, Globe, Warehouse, Package, Search,
  CreditCard, Handshake, Settings, CheckCircle2, Menu, X,
  Building2, Users, Truck, BarChart3, Lock, FileText,
  ChevronDown, MapPin, Layers, Zap, TrendingUp, Scale,
  AlertTriangle, ShieldCheck
} from 'lucide-react';
import finatradesLogo from '@/assets/finatrades-logo-ecosystem.png';
import africaTradeMap from '@/assets/africa-trade-map.png';
import heroBg from '@/assets/hero-bg.png';
import section2Bg from '@/assets/section2-bg.png';
import cardSellers from '@/assets/card-sellers.png';
import cardBuyers from '@/assets/card-buyers.png';
import cardGovernment from '@/assets/card-government.png';
import cardWarehouse from '@/assets/card-warehouse.png';
import cardFinance from '@/assets/card-finance.png';
import cardLogistics from '@/assets/card-logistics.png';
import hubsBg from '@/assets/hubs-bg.png';
import logoRaminvest from '@/assets/logo-raminvest.webp';
import logoFinatradesP from '@/assets/logo-finatrades-purple.png';
import logoWinvestnet from '@/assets/logo-winvestnet2.png';
import logoWinlogistics from '@/assets/logo-winlogistics.png';
import logoWincommodities from '@/assets/logo-wincommodities.png';
import layer1 from '@/assets/layer-1.png';
import layer2 from '@/assets/layer-2.png';
import layer3 from '@/assets/layer-3.png';
import layer4 from '@/assets/layer-4.png';
import layer5 from '@/assets/layer-5.png';
import layer6 from '@/assets/layer-6.png';
import layer7 from '@/assets/layer-7.png';
import layer8 from '@/assets/layer-8.png';
import layer9 from '@/assets/layer-9.png';
import layer10 from '@/assets/layer-10.png';
import layer11 from '@/assets/layer-11.png';
import layer12 from '@/assets/layer-12.png';
import backendBg from '@/assets/backend-bg.png';
import compliance3d from '@/assets/compliance-3d.png';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return scrolled;
}

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={stagger} className={className}>
      {children}
    </motion.div>
  );
}

function Card3D({
  children, className = '', style = {}, accent = '#C73B22', tiltStrength = 10, glass = true,
}: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
  accent?: string; tiltStrength?: number; glass?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    setTilt({ x: (y - 0.5) * -tiltStrength, y: (x - 0.5) * tiltStrength });
    setShine({ x: x * 100, y: y * 100 });
  };
  const onLeave = () => { setTilt({ x: 0, y: 0 }); setShine({ x: 50, y: 50 }); setHovered(false); };
  return (
    <div style={{ perspective: '900px' }}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onLeave}
        animate={{
          rotateX: tilt.x, rotateY: tilt.y, scale: hovered ? 1.025 : 1,
          boxShadow: hovered
            ? `0 22px 44px -8px ${accent}30, 0 0 0 1px ${accent}22`
            : '0 4px 20px -4px rgba(0,0,0,0.09)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className={`relative overflow-hidden ${className}`}
        style={{
          transformStyle: 'preserve-3d',
          ...(glass ? {
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(18px) saturate(180%)',
            WebkitBackdropFilter: 'blur(18px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.55)',
          } : {}),
          ...style,
        }}
      >
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.25s',
            background: `radial-gradient(ellipse 65% 55% at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.52) 0%, transparent 72%)`,
          }}
        />
        <div className="relative z-10 h-full">{children}</div>
      </motion.div>
    </div>
  );
}

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Marketplace', href: '#marketplace' },
  { label: 'Seller', href: '#for-sellers' },
  { label: 'Buyer', href: '#for-buyers' },
  { label: 'Trade Finance', href: '#trade-finance' },
  { label: 'Government', href: '#government' },
  { label: 'Compliance', href: '#compliance' },
  { label: 'Contact', href: '#contact' },
];

function Navbar() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-xl shadow-gray-300/60' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <img src={finatradesLogo} alt="Finatrades" className="h-11 w-auto" style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(82%) saturate(1800%) hue-rotate(355deg) brightness(105%)' }} />
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href}
              className="px-3 py-1.5 text-sm text-[#444440] hover:text-[#1A1A1A] rounded-md hover:bg-gray-100 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link href="/login">
            <button className="px-4 py-2 text-sm text-[#333330] hover:text-[#1A1A1A] transition-colors">Sign In</button>
          </Link>
          <Link href="/register">
            <button className="px-4 py-2 text-sm font-semibold bg-[#C73B22] hover:bg-[#A82D16] text-white rounded-lg transition-colors">
              Get Started
            </button>
          </Link>
        </div>

        <button className="lg:hidden text-[#444440] hover:text-[#1A1A1A]" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-white/98 backdrop-blur-xl border-t border-gray-200 px-6 py-4 space-y-1">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm text-[#444440] hover:text-[#1A1A1A] rounded-md hover:bg-gray-100 transition-colors">
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-gray-300 flex gap-3">
            <Link href="/login" className="flex-1">
              <button className="w-full px-4 py-2 text-sm text-[#333330] border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Sign In</button>
            </Link>
            <Link href="/register" className="flex-1">
              <button className="w-full px-4 py-2 text-sm font-semibold bg-[#C73B22] text-white rounded-lg hover:bg-[#A82D16] transition-colors">Get Started</button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-white/10 to-white/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/30 bg-[#C73B22]/10 text-[#A82D16] text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A82D16] animate-pulse" />
            Institutional Commodity Trade Platform · Raminvest Holding DIFC · 14 African Hubs
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1A1A] leading-[1.1] tracking-tight mb-6">
          The Institutional Infrastructure for{' '}
          <span className="bg-gradient-to-r from-[#C73B22] via-[#E5602A] to-[#F08050] bg-clip-text text-transparent">
            Verified Commodity Trade
          </span>
          <br />Across Africa & Global Markets
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-[#555550] max-w-3xl mx-auto mb-10 leading-relaxed">
          Finatrades eliminates the structural risks of African commodity trade — counterparty default, 
          document fraud, unverified inventory, and unsettled payments — by connecting sellers, buyers, 
          government entities, warehouses, logistics providers, and finance partners into one 
          compliance-governed, escrow-backed digital trade execution platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap gap-3 justify-center mb-16">
          <Link href="/register?role=seller">
            <button className="px-6 py-3 bg-[#C73B22] hover:bg-[#A82D16] text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-[#C73B22]/30 flex items-center gap-2">
              Register as Exporter <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/register?role=buyer">
            <button className="px-6 py-3 bg-[#1B2E40] hover:bg-[#152436] text-white font-semibold rounded-xl border border-transparent transition-colors flex items-center gap-2">
              Register as Importer <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/register?role=government">
            <button className="px-6 py-3 bg-white hover:bg-gray-50 text-[#444440] font-semibold rounded-xl border border-gray-300 transition-colors flex items-center gap-2">
              Government & Sovereign Access <ArrowRight size={16} />
            </button>
          </Link>
          <a href="#how-it-works">
            <button className="px-6 py-3 text-[#555550] hover:text-[#1A1A1A] font-medium rounded-xl transition-colors flex items-center gap-2">
              See Full Platform <ChevronDown size={16} />
            </button>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { value: '14', label: 'African Trade Hubs' },
            { value: 'Zero', label: 'Counterparty Risk' },
            { value: '100%', label: 'Inventory-Verified Listings' },
            { value: 'Escrow', label: 'Governed Settlement' },
          ].map(stat => (
            <Card3D key={stat.label} className="rounded-xl p-4 text-center" tiltStrength={8}>
              <div className="text-2xl font-bold text-[#C73B22] mb-1">{stat.value}</div>
              <div className="text-xs text-[#666660]">{stat.label}</div>
            </Card3D>
          ))}
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <ChevronDown size={20} className="text-[#999990]" />
        </motion.div>
      </div>
    </section>
  );
}

function RoleCard3D({ title, desc, img, accent, delay }: { title: string; desc: string; img: string; accent: string; delay: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    setTilt({ x: (y - 0.5) * -18, y: (x - 0.5) * 18 });
    setShine({ x: x * 100, y: y * 100 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setShine({ x: 50, y: 50 });
    setHovered(false);
  };

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay }}
      style={{ perspective: '1000px' }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          scale: hovered ? 1.04 : 1,
          boxShadow: hovered
            ? '0 32px 64px -12px rgba(199,59,34,0.25), 0 0 0 1px rgba(199,59,34,0.15)'
            : '0 4px 24px -4px rgba(0,0,0,0.10)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="relative h-52 overflow-hidden">
          <motion.img
            src={img}
            alt={title}
            animate={{ scale: hovered ? 1.08 : 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-300"
            style={{
              opacity: hovered ? 0.12 : 0,
              background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.9) 0%, transparent 65%)`,
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span
              className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-2"
              style={{ background: accent, color: '#fff', letterSpacing: '0.04em' }}
            >
              {title}
            </span>
          </div>
        </div>

        <div className="relative p-5 bg-white">
          <div
            className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: hovered ? 1 : 0 }}
          />
          <p className="text-[#555550] text-sm leading-relaxed">{desc}</p>
          <motion.div
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
            transition={{ duration: 0.25 }}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: accent }}
          >
            Learn more <ArrowRight size={12} />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const ROLE_CARDS = [
  { title: 'Exporters & Sellers', desc: 'List compliant, warehouse-receipted inventory on a verified B2B marketplace. Submit commodities on structured consignment, upload origin and ownership documentation, pass AI-powered inspection workflows, and access trade finance eligibility from day one.', img: cardSellers, accent: '#C73B22' },
  { title: 'Importers & Buyers', desc: 'Source verified commodity positions with full documentation transparency — no blind purchasing. Submit RFQs or Import Expressions of Interest, compare authenticated supplier offers, execute structured purchase orders, and track every fulfilment milestone through to delivery confirmation.', img: cardBuyers, accent: '#1B2E40' },
  { title: 'Government & Sovereign Entities', desc: 'A dedicated, access-controlled branch for ministries, state trading enterprises, and sovereign funds. Conduct strategic commodity procurement and government-to-government barter arrangements — crude oil, grain, fertilizers, minerals, gold — with full compliance oversight and settlement governance.', img: cardGovernment, accent: '#E5602A' },
  { title: 'Warehouse Operators', desc: 'Become an accredited Finatrades Warehouse Partner. Receive pre-arrival consignment documentation, coordinate quality inspection at intake, issue tamper-evident digital warehouse receipts, and execute release instructions exclusively against verified settlement conditions.', img: cardWarehouse, accent: '#C73B22' },
  { title: 'Trade Finance Partners', desc: 'Deploy capital against verified, warehouse-backed inventory. Review structured finance requests tied to confirmed purchase orders, approve instruments including pre-shipment finance and invoice discounting, monitor escrow-governed disbursement, and access immutable settlement ledgers for risk management.', img: cardFinance, accent: '#1B2E40' },
  { title: 'Logistics & Freight Partners', desc: 'Integrate directly into the Finatrades settlement workflow as a verified logistics provider. Track shipment milestones, coordinate customs documentation and clearance readiness, update delivery confirmation events, and trigger final fulfilment sign-off — all within the governed trade execution chain.', img: cardLogistics, accent: '#E5602A' },
];

function PositioningSection() {
  return (
    <section className="relative py-24 border-y border-gray-200 overflow-hidden">
      <div className="absolute inset-0">
        <img src={section2Bg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/10 to-white/25" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase text-[#C73B22] mb-3">The Finatrades Ecosystem</motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            Built for Every Participant in the Commodity Trade Chain
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#555550] max-w-2xl mx-auto text-lg">
            From exporters submitting goods on consignment to sovereign entities conducting strategic barter — every participant operates within a dedicated, compliance-gated workflow with full transaction visibility from intake to settlement.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {ROLE_CARDS.map((card, i) => (
            <RoleCard3D key={card.title} {...card} delay={i * 0.07} />
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    num: '01',
    title: 'User Registration, KYC / KYB & Compliance Onboarding',
    subtitle: 'Secure onboarding for Exporters, Importers and Government users before platform access.',
    icon: FileText,
    color: '#C73B22',
    tags: ['Account Creation', 'Document Upload', 'AML Screening', 'Admin Approval'],
    substeps: [
      { n: 1, label: 'Account Creation', detail: 'User signs up on FINATRADES — provides basic details and accepts terms & conditions.' },
      { n: 2, label: 'Role Selection', detail: 'Select user type: Exporter / Importer / Government. Choose role: Admin / Manager / User.' },
      { n: 3, label: 'Email / OTP Verification', detail: 'Verify email address, enter OTP to confirm, secure account activation.' },
      { n: 4, label: 'Company Profile Setup', detail: 'Enter company / entity details, business address & contact information, upload logo (optional).' },
      { n: 5, label: 'KYC / KYB Document Upload', detail: 'Upload identity & business documents, provide beneficial ownership details, ensure document clarity & validity.' },
      { n: 6, label: 'AML / Sanctions Screening', detail: 'Automated AML screening, sanctions & watchlist verification, PEP (Politically Exposed Persons) check.' },
      { n: 7, label: 'Risk Review & Compliance Checks', detail: 'Risk scoring & profile assessment, document authenticity verification, compliance requirement validation.' },
      { n: 8, label: 'Admin Approval', detail: 'Internal review by FINATRADES team, additional info requested (if any), approval or rejection decision.' },
      { n: 9, label: 'Wallet & Module Activation', detail: 'Create B2B wallet, activate allowed modules, set transaction limits (if any).' },
      { n: 10, label: 'Dashboard Access', detail: 'Access granted to user dashboard — view announcements & tasks, start using platform modules.' },
    ],
    highlights: [
      { label: 'Approval Timeline', value: '2–5 Business Days' },
      { label: 'User Types', value: 'Exporter · Importer · Government' },
      { label: 'Screening Standard', value: 'AML/CFT · PEP · Sanctions' },
      { label: 'Access Control', value: 'RBAC · Module-wise permissions' },
    ],
    benefits: ['Secure onboarding', 'Faster approval', 'Compliance-ready', 'Role-based access', 'Audit trail', 'Global trade access'],
  },
  {
    num: '02',
    title: 'Seller Consignment Creation & Warehouse Submission',
    subtitle: 'Sellers send goods on consignment basis to the warehouse network for verification, storage and trade readiness.',
    icon: Package,
    color: '#1B2E40',
    tags: ['Commodity Details', 'Document Validation', 'Warehouse Selection', 'Finance Eligibility'],
    substeps: [
      { n: 1, label: 'Seller Creates Consignment Request', detail: 'Log in to Finatrades Seller Portal, click "Create Consignment", enter basic seller & contact details.' },
      { n: 2, label: 'Select Commodity & Quantity', detail: 'Select commodity type, enter quantity, unit & packaging, add product grade/specification.' },
      { n: 3, label: 'Choose Destination Warehouse', detail: 'Select preferred warehouse hub, view warehouse capacity & availability, confirm delivery location.' },
      { n: 4, label: 'Upload Shipping & Ownership Documents', detail: 'Commercial documents, quality & compliance certificates, ownership & export authorizations.' },
      { n: 5, label: 'Submit Pre-Arrival Details', detail: 'Incoterms & port of loading, expected arrival date, transport mode (planned).' },
      { n: 6, label: 'Warehouse Pre-Check', detail: 'Warehouse reviews submission, preliminary document & data check, capacity & suitability assessment.' },
      { n: 7, label: 'Compliance Validation', detail: 'Documents verified for authenticity, export & import compliance check, quality certificate validation.' },
      { n: 8, label: 'Booking Confirmation', detail: 'Warehouse slot reserved, consignment ID generated, confirmation sent to seller.' },
      { n: 9, label: 'Transport Scheduling', detail: 'Arrange pickup / cargo drop-off, select carrier & transport mode, share tracking & ETA updates.' },
      { n: 10, label: 'Consignment Accepted for Arrival', detail: 'Goods en route to warehouse, arrival expected as scheduled, ready for verification on arrival.' },
    ],
    highlights: [
      { label: 'Transport Modes', value: 'Sea · Air · Road · Rail' },
      { label: 'Warehouse Partner', value: 'WinLogistics Pan-Africa' },
      { label: 'Document Check', value: 'Commercial Invoice · CoO · CoQ' },
      { label: 'Status', value: 'Submitted / Awaiting Verification' },
    ],
    benefits: ['Structured Intake', 'Verified Ownership', 'Better Visibility', 'Storage Readiness', 'Trade Readiness', 'Finance Eligibility'],
  },
  {
    num: '03',
    title: 'Pre-Arrival Logistics, Warehouse Reception & Inventory Hub',
    subtitle: 'Track commodities from origin to warehouse. Prepare before arrival. Control every step.',
    icon: Truck,
    color: '#E5602A',
    tags: ['Shipment Tracking', 'Warehouse Booking', 'Customs Readiness', 'Inspection Prep'],
    substeps: [
      { n: 1, label: 'Shipment Creation', detail: 'Buyer creates shipment and selects destination warehouse — commodity, quantity, origin, incoterms, buyer.' },
      { n: 2, label: 'Pre-Arrival Document Management', detail: 'Upload & verify all required documents, compliance & authenticity check, documents shared with all parties.' },
      { n: 3, label: 'Transport & Logistics Tracking', detail: 'Track shipment in real-time, monitor location, ETA, delays, end-to-end visibility.' },
      { n: 4, label: 'Destination Warehouse Booking', detail: 'Select & book warehouse, check capacity & conditions, confirm reservation.' },
      { n: 5, label: 'ETA Alerts & Preparation', detail: 'Automated notifications, prepare warehouse, labor, equipment & inspection.' },
      { n: 6, label: 'Goods Arrival', detail: 'Shipment arrives at port / border, gate entry & container verification, seal verification.' },
      { n: 7, label: 'Inspection & Receiving', detail: 'Quantity, weight & quality check, moisture, damage & packaging check, sampling & SGS verification.' },
      { n: 8, label: 'Inventory Registration', detail: 'Inventory ID generated, owner, warehouse, quantity recorded, status updated.' },
      { n: 9, label: 'Digital Warehouse Receipt', detail: 'Warehouse receipt issued, ownership & storage proof, QR code / blockchain hash.' },
      { n: 10, label: 'Inventory Management', detail: 'Manage stock status: Available, Reserved, Pledged, Released, Sold.' },
      { n: 11, label: 'Trade / Finance / Settlement', detail: 'Trade execution, financing / pledge, payment & settlement.' },
    ],
    highlights: [
      { label: 'Hub Network', value: '8 Warehouse Hubs Across Africa' },
      { label: 'Inspection', value: 'SGS Verification · Quality & Quantity' },
      { label: 'Receipt', value: 'Digital Warehouse Receipt + QR Code' },
      { label: 'Powered By', value: 'WinLogistics' },
    ],
    benefits: ['End-to-End Visibility', 'Document Control', 'Faster Reception', 'Quality & Compliance', 'Secure & Traceable', 'Better Decisions'],
  },
  {
    num: '04',
    title: 'Warehouse Consignment Inventory Module',
    subtitle: 'Verified warehouse inventory is recorded as consignments with quantity, status, documents and FUSD reference visibility.',
    icon: Warehouse,
    color: '#C73B22',
    tags: ['Inventory ID', 'Quality Inspection', 'Digital Receipt', 'FUSD Valuation'],
    substeps: [
      { n: 1, label: 'Arrival Registered', detail: 'Shipment arrived at warehouse, gate entry & seal verification, arrival recorded in system.' },
      { n: 2, label: 'Documents Matched', detail: 'Bill of Lading / Commercial Invoice, Packing List / Certificate of Origin, documents verified & matched.' },
      { n: 3, label: 'Inspection Scheduled', detail: 'Inspection appointment set, inspector notified, inspection workflow initiated.' },
      { n: 4, label: 'Quantity & Quality Check', detail: 'Physical count in real-time, sampling & grade verification, measurement captured.' },
      { n: 5, label: 'Moisture / Damage Review', detail: 'Moisture level measured, damage & foreign matter check, results recorded.' },
      { n: 6, label: 'Inventory ID Generated', detail: 'Unique Inventory ID created, system generated reference, linked to consignment.' },
      { n: 7, label: 'Owner Assignment', detail: 'Owner / seller confirmed, ownership linked to inventory, authorization recorded.' },
      { n: 8, label: 'FUSD Reference Value Created', detail: 'Fair & transparent valuation, FUSD reference value generated, visible for owner & partners.' },
      { n: 9, label: 'Digital Warehouse Receipt Issued', detail: 'e-Warehouse Receipt generated, QR code / blockchain hash, secure digital issuance.' },
      { n: 10, label: 'Inventory Status Updated', detail: 'Stock status set to Available, real-time visibility updated, accessible to all authorized parties.' },
      { n: 11, label: 'Ready for Marketplace / Finance / Escrow', detail: 'Inventory visible on marketplace, eligible for financing & escrow, ready for trade execution.' },
    ],
    highlights: [
      { label: 'Inventory Status', value: 'Available · Reserved · Pledged · Released · Sold' },
      { label: 'Valuation', value: 'FUSD Reference (USD/MT)' },
      { label: 'Receipt Format', value: 'Digital + QR Code / Blockchain Hash' },
      { label: 'Inspection By', value: 'SGS Ghana Ltd.' },
    ],
    benefits: ['Full Inventory Control', 'Transparent Valuation', 'Audit-Ready Records', 'Finance Eligibility', 'Marketplace Ready', 'Owner Visibility'],
  },
  {
    num: '05',
    title: '14-Hub Marketplace Discovery, RFQ & Matching',
    subtitle: 'Trade opportunities across Africa and global markets through the marketplace network.',
    icon: Search,
    color: '#1B2E40',
    tags: ['14 African Hubs', 'RFQ Submission', 'Buyer-Seller Matching', 'Offer Comparison'],
    substeps: [
      { n: 1, label: 'Browse Commodity Listings', detail: 'Explore available commodities, view prices, specs & locations.' },
      { n: 2, label: 'Filter by Hub / Commodity', detail: 'Select hub(s) across Africa, refine by quality, qty, price & terms.' },
      { n: 3, label: 'View Verified Consignments', detail: 'Check seller profiles & ratings, review documents & certifications.' },
      { n: 4, label: 'Create RFQ', detail: 'Define quantity, specs & terms, set target price & delivery terms.' },
      { n: 5, label: 'Send Inquiry to Sellers', detail: 'RFQ sent to relevant suppliers, confidential & secure outreach.' },
      { n: 6, label: 'Receive Offers', detail: 'Sellers submit competitive offers, compare price, terms & lead time.' },
      { n: 7, label: 'Compare Terms', detail: 'Evaluate price, quality & logistics, check credibility & past performance.' },
      { n: 8, label: 'Negotiate & Confirm Deal', detail: 'Negotiate terms with preferred seller, confirm deal & lock in conditions.' },
      { n: 9, label: 'Convert to Order', detail: 'Generate Purchase Order, share documents & timelines.' },
      { n: 10, label: 'Send to Settlement / Finance', detail: 'Route to settlement or financing, track until completion.' },
    ],
    highlights: [
      { label: 'Network', value: '14 Hubs · Senegal to Egypt' },
      { label: 'Active Buyers', value: '1,250+' },
      { label: 'Verified Sellers', value: '3,800+' },
      { label: 'Deals Matched', value: '8,600+' },
    ],
    benefits: ['Wider Reach', 'Faster Discovery', 'Verified Supply', 'Better Matching', 'RFQ Workflow', 'Cross-Border Visibility'],
  },
  {
    num: '06',
    title: 'Buyer Flow, Order Placement & Payment to WINVESTNET',
    subtitle: 'Buyers browse inventory, place orders, secure funds and move deals toward execution.',
    icon: CreditCard,
    color: '#E5602A',
    tags: ['Purchase Order', 'Payment to WINVESTNET', 'Escrow Ready', 'FUSD Balance'],
    substeps: [
      { n: 1, label: 'Buyer Registration', detail: 'Create buyer account, complete company profile, KYC verification, approval by WINVESTNET.' },
      { n: 2, label: 'Browse Inventory & Marketplace', detail: 'Search commodities by type, origin, location — filter by quantity, price, warehouse — view live availability.' },
      { n: 3, label: 'Review Verified Stock', detail: 'View stock details and certifications, check warehouse, availability & docs, review pricing and terms.' },
      { n: 4, label: 'Send RFQ / Inquiry', detail: 'Send RFQ to supplier, specify quantity, target price & terms, attach requirements (if any).' },
      { n: 5, label: 'Negotiate & Confirm Terms', detail: 'Discuss price, incoterms, delivery — confirm documents & quality — agree on payment & timeline.' },
      { n: 6, label: 'Place Order', detail: 'Submit Purchase Order (PO), upload signed contract, confirm final order details.' },
      { n: 7, label: 'Choose Funding Method', detail: 'Select preferred funding option — Bank Transfer, Stablecoin (USDC/USDT), Corporate Account, or Escrow Deposit.' },
      { n: 8, label: 'Payment to WINVESTNET B2B Wallet', detail: 'Transfer funds to WINVESTNET B2B Wallet, payment verified in real-time, automatic receipt issued.' },
      { n: 9, label: 'FUSD Balance / Reference Created', detail: 'FUSD reference generated, balance reflected in buyer wallet, funds ring-fenced for the order.' },
      { n: 10, label: 'Ready for Escrow & Deal Execution', detail: 'Supplier notified of funded order, escrow process initiated, move to inventory reserve & release.' },
    ],
    highlights: [
      { label: 'Payment Options', value: 'Bank · Stablecoin · Corporate · Escrow' },
      { label: 'Wallet', value: 'WINVESTNET B2B Wallet' },
      { label: 'Settlement Unit', value: 'FUSD Reference Value' },
      { label: 'Order Flow', value: 'Inquiry → PO → Payment → Escrow' },
    ],
    benefits: ['Escrow Lock', 'Inventory Reserve', 'Warehouse Release', 'Delivery Milestone', 'Secure Settlement', 'Full Audit Trail'],
  },
  {
    num: '07',
    title: 'Government Commodities Barter Workflow',
    subtitle: 'Optional parallel branch for sovereign entities — strategic commodity exchange with marketplace support and structured settlement.',
    icon: Scale,
    color: '#C73B22',
    tags: ['Sovereign Verification', 'Barter Valuation', 'Counterparty Matching', 'Settlement Gap Support'],
    substeps: [
      { n: 1, label: 'Government Onboarding', detail: 'Register government entity, provide mandate & authority, KYC & compliance screening.' },
      { n: 2, label: 'Sovereign Verification', detail: 'Validate mandate & authority, verify legal documentation, assign government account.' },
      { n: 3, label: 'Create Barter Request', detail: 'Select barter type, provide overview & objectives, submit for internal review.' },
      { n: 4, label: 'Define Offered Commodity', detail: 'Select commodity, specify quantity & quality, define delivery terms & location.' },
      { n: 5, label: 'Define Required Commodity', detail: 'Select required commodity, specify quantity & quality, define delivery terms & location.' },
      { n: 6, label: 'Valuation in FUSD Reference Terms', detail: 'Market price benchmarking, convert to FUSD (Reference Unit), determine value parity & gap.' },
      { n: 7, label: 'Counterparty Matching', detail: 'Identify qualified counterparties, match supply & demand, evaluate track record & reliability.' },
      { n: 8, label: 'Negotiate Terms & Delivery', detail: 'Negotiate quantities & quality, agree on logistics & timelines, sign Terms Sheet / MOU.' },
      { n: 9, label: 'Settlement Difference Support', detail: 'Determine settlement gap, select settlement support option, arrange funding / support instrument.' },
      { n: 10, label: 'Execution & Monitoring', detail: 'Execute barter agreement, monitor deliveries & milestones, close & record transaction.' },
    ],
    highlights: [
      { label: 'Commodities', value: 'Oil · Gold · Food · Minerals · Fertilizer' },
      { label: 'Valuation Unit', value: 'FUSD Reference Terms' },
      { label: 'Settlement', value: 'Fiat · Trade Finance · Additional Commodity' },
      { label: 'Compliance', value: 'National regulations · Internal approvals' },
    ],
    benefits: ['Strategic Sourcing', 'Reduced Cash Reliance', 'Valuation Clarity', 'Structured Monitoring', 'Sovereign Workflow', 'Audit Readiness'],
  },
  {
    num: '08',
    title: 'Trade Finance, Escrow, Settlement & Deal Completion',
    subtitle: 'From approved funding to inventory lock, warehouse release, delivery milestone and seller payout.',
    icon: Lock,
    color: '#1B2E40',
    tags: ['Escrow Lock', 'Warehouse Release', 'Delivery Milestones', 'Seller Payout'],
    substeps: [
      { n: 1, label: 'Deal Confirmation', detail: 'Buyer & seller agree on final terms, all commercial terms locked, deal ID generated.' },
      { n: 2, label: 'Trade Finance Review / Funding', detail: 'Buyer credit & KYC verification, facility approval & limit allocation, funds arranged by approved financiers.' },
      { n: 3, label: 'Payment Confirmation', detail: 'Buyer funds transferred to Finatrades escrow account, payment receipt verified.' },
      { n: 4, label: 'FUSD Lock in Escrow', detail: 'Funds locked in secure escrow, held until release conditions are met, escrow protected & monitored.' },
      { n: 5, label: 'Inventory Reserved', detail: 'Seller reserves inventory, inventory tagged against Deal ID, stock held in bonded warehouse.' },
      { n: 6, label: 'Order Confirmation', detail: 'Sale contract signed, all commercial documents finalized, stakeholders notified.' },
      { n: 7, label: 'Warehouse Release Instruction', detail: 'Buyer requests release, release conditions verified, approval issued to warehouse via WinLogistics.' },
      { n: 8, label: 'Shipment / Delivery Milestone', detail: 'Goods released & dispatched, in-transit tracking initiated, delivery milestone recorded.' },
      { n: 9, label: 'Condition Verification', detail: 'Buyer inspects upon receipt, quality & quantity verified, inspection report uploaded.' },
      { n: 10, label: 'Seller Payout via WINVESTNET', detail: 'Payout approved by buyer, escrow funds released, seller credited via WINVESTNET.' },
      { n: 11, label: 'Deal Closed & Audit Trail Completed', detail: 'Deal marked as completed, all records & documents archived, audit trail secured on blockchain.' },
    ],
    highlights: [
      { label: 'Finance Partner', value: 'FinaCredit Partners' },
      { label: 'Escrow', value: 'FinaTrades Escrow Account' },
      { label: 'Warehouse Release', value: 'WinLogistics · Approval Required' },
      { label: 'Payout Method', value: 'WINVESTNET B2B Wallet' },
    ],
    benefits: ['Secure Settlement', 'Controlled Release', 'Finance Support', 'Traceability', 'Reduced Risk', 'Faster Closure'],
  },
  {
    num: '09',
    title: 'Complete Backend Flow & System Architecture',
    subtitle: 'How registration, inventory, marketplace, payments, trade finance, escrow and reporting connect behind the scenes.',
    icon: Settings,
    color: '#E5602A',
    tags: ['Audit Trail', 'Compliance Layer', 'Partner APIs', 'Full Traceability'],
    substeps: [
      { n: 1, label: 'User Access Layer', detail: 'Web Portal · Mobile App · Partner Portal — Secure Login · MFA · Role-Based Access.' },
      { n: 2, label: 'Identity & Compliance Layer', detail: 'KYC · KYB · AML Screening · Sanctions — Identity Verification · Compliance Checks · Ongoing Monitoring.' },
      { n: 3, label: 'Document Service', detail: 'Document Upload · Validation · eSign · Document Vault · Version Control — Smart Validation · OCR & Data Extraction · Secure Storage.' },
      { n: 4, label: 'Inventory / Consignment Engine', detail: 'Inventory Creation · Grading · Tagging · Stock Allocation · Real-time Updates — Inventory Verification · Quality & Quantity Check · Availability Management.' },
      { n: 5, label: 'Marketplace Connector', detail: 'Publish Listings · Match Buyers · Offers · Negotiation · Confirmation — Listing Sync · Buyer Discovery · Deal Confirmation.' },
      { n: 6, label: 'Buyer Order Engine', detail: 'Order Creation · Terms Agreement · Lock Inventory · Order Tracking — Order Validation · Inventory Lock · Order Status Updates.' },
      { n: 7, label: 'WINVESTNET Wallet Connector', detail: 'Wallet Creation · Balance Check · Hold / Reserve Funds · Wallet Sync — Balance Verification · Fund Reservation · Wallet Reconciliation.' },
      { n: 8, label: 'Trade Finance Engine', detail: 'LC · PO Finance · Invoice Discounting · Credit Scoring · Approval Workflow — Finance Request · Credit Assessment · Funding Disbursement.' },
      { n: 9, label: 'Escrow / Settlement Engine', detail: 'Escrow Hold · Milestone Control · Release Conditions · Settlement Rules — Condition Monitoring · Secure Release.' },
      { n: 10, label: 'Audit Trail & Reporting', detail: 'Activity Logging · Reports · Dashboards · Performance Analytics · Compliance Reports — Audit Trail Logging · Real-time Dashboards · Exportable Reports.' },
      { n: 11, label: 'Notifications & API Orchestration', detail: 'Event Triggers · Alerts · Email / SMS · API Gateway · Webhooks · Integrations — Event Notifications · API Orchestration · Third-party Integrations.' },
    ],
    highlights: [
      { label: 'Infrastructure', value: 'Cloud · Microservices · Load Balancer' },
      { label: 'Data Security', value: 'Encrypted · Backup & DR · Security Layer' },
      { label: 'System Rules', value: 'No verified inventory = no sale' },
      { label: 'Integration', value: 'Finatrades + WinLogistics + Marketplace' },
    ],
    benefits: ['Secure', 'Compliant', 'Transparent', 'Integrated', 'Audit-Ready', 'Scalable'],
  },
];

function HowItWorksStepExplorer() {
  const [activeIdx, setActiveIdx] = useState(0);
  const step = STEPS[activeIdx];

  return (
    <div className="relative">
      {/* Step number navigation */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {STEPS.map((s, i) => (
          <button
            key={s.num}
            onClick={() => setActiveIdx(i)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 border ${
              i === activeIdx
                ? 'text-white shadow-lg border-transparent'
                : 'bg-white text-[#555550] border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            style={i === activeIdx ? { background: s.color, borderColor: s.color } : {}}
          >
            <span className="font-bold">{s.num}</span>
            <span className="hidden sm:inline max-w-[120px] truncate leading-tight text-xs">{s.title.split(' ').slice(0, 3).join(' ')}…</span>
          </button>
        ))}
      </div>

      {/* Active step panel */}
      <motion.div
        key={activeIdx}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.65)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {/* Panel header */}
        <div className="px-8 py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start gap-4"
          style={{ background: `linear-gradient(135deg, ${step.color}08 0%, transparent 60%)` }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${step.color}18` }}>
            <step.icon size={22} style={{ color: step.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: step.color }}>Step {step.num}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{step.substeps.length} stages</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] leading-snug mb-1">{step.title}</h3>
            <p className="text-[#666660] text-sm leading-relaxed">{step.subtitle}</p>
          </div>
          {/* Nav arrows */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
              disabled={activeIdx === 0}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 disabled:opacity-30 transition-all"
            >
              <ChevronDown size={16} className="rotate-90" />
            </button>
            <button
              onClick={() => setActiveIdx(Math.min(STEPS.length - 1, activeIdx + 1))}
              disabled={activeIdx === STEPS.length - 1}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 disabled:opacity-30 transition-all"
            >
              <ChevronDown size={16} className="-rotate-90" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
          {/* Sub-steps list */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {step.substeps.map((sub) => (
                <Card3D key={sub.n} className="flex items-start gap-3 p-4 rounded-xl cursor-default" accent={step.color} tiltStrength={6}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs transition-colors"
                    style={{ background: `${step.color}15`, color: step.color }}>
                    {sub.n}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[#1A1A1A] font-semibold text-sm leading-snug mb-1">{sub.label}</div>
                    <div className="text-[#888880] text-xs leading-relaxed">{sub.detail}</div>
                  </div>
                </Card3D>
              ))}
            </div>
          </div>

          {/* Right highlights panel */}
          <div className="border-t lg:border-t-0 lg:border-l border-gray-100 p-6 flex flex-col gap-6"
            style={{ background: `${step.color}04` }}>
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-[#999990] mb-3">Key Details</div>
              <div className="space-y-3">
                {step.highlights.map(h => (
                  <div key={h.label} className="flex flex-col gap-0.5">
                    <span className="text-[#AAAAAA] text-xs">{h.label}</span>
                    <span className="text-[#1A1A1A] text-sm font-semibold leading-snug">{h.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-[#999990] mb-3">Key Benefits</div>
              <div className="flex flex-wrap gap-1.5">
                {step.benefits.map(b => (
                  <span key={b} className="px-2.5 py-1 text-xs font-medium rounded-lg"
                    style={{ background: `${step.color}12`, color: step.color }}>
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-[#999990] mb-3">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {step.tags.map(t => (
                  <span key={t} className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 bg-white text-[#555550]">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-auto pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#AAAAAA]">Protocol Progress</span>
                <span className="text-xs font-bold" style={{ color: step.color }}>{activeIdx + 1} / {STEPS.length}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${((activeIdx + 1) / STEPS.length) * 100}%`, background: step.color }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom CTA row */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#888880]">
          Every transaction must complete all 9 stages in sequence — no shortcuts, no unverified counterparties.
        </p>
        <Link href="/register">
          <button className="px-5 py-2.5 bg-[#C73B22] hover:bg-[#A82D16] text-white font-semibold rounded-xl transition-all text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-[#C73B22]/25">
            Start Onboarding <ArrowRight size={14} />
          </button>
        </Link>
      </div>
    </div>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 overflow-hidden" style={{ background: 'linear-gradient(160deg, #FFF4F0 0%, #FFFFFF 40%, #F0F4FF 70%, #FFF8F0 100%)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={stagger}
          className="text-center mb-12"
        >
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/30 bg-[#C73B22]/8 text-[#A82D16] text-xs font-medium mb-5">
            End-to-End Trade Execution · 9-Stage Protocol · Up to 11 Sub-Steps Each
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            A Fully Governed Trade Execution Protocol
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#666660] max-w-2xl mx-auto">
            Unlike peer-to-peer commodity brokers or fragmented export channels, Finatrades enforces a mandatory, sequenced 9-stage protocol — every transaction must pass through compliance onboarding, warehouse verification, document authentication, escrow payment control, and audited settlement before completion.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <HowItWorksStepExplorer />
        </motion.div>
      </div>
    </section>
  );
}

const COMMODITIES = [
  { label: 'Gold', color: '#D97706' },
  { label: 'Crude Oil', color: '#1B2E40' },
  { label: 'Cocoa', color: '#7B3F00' },
  { label: 'Wheat & Grain', color: '#92400E' },
  { label: 'Cotton', color: '#2D6A4F' },
  { label: 'Iron Ore', color: '#374151' },
  { label: 'Fertilizers', color: '#065F46' },
  { label: 'LNG', color: '#1D4ED8' },
];


function MarketplaceSection() {
  return (
    <section id="marketplace" className="relative py-24 overflow-hidden bg-white">
      {/* Subtle warm background gradient */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 70% 50%, rgba(199,59,34,0.04) 0%, transparent 70%)' }} />

      <AnimatedSection className="relative z-10 max-w-7xl mx-auto px-6">

        {/* Section header — centred */}
        <motion.div variants={fadeUp} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/20 bg-[#C73B22]/5 text-[#A82D16] text-xs font-medium mb-5">
            <Globe size={12} />
            14 Verified African Trade Hubs · Institutional Access Only
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4 leading-tight">
            Africa's First Institutional-Grade<br className="hidden sm:block" /> B2B Commodity Marketplace
          </h2>
          <p className="text-[#555550] max-w-2xl mx-auto text-base leading-relaxed">
            Every listing is anchored to a confirmed warehouse inventory position, authenticated trade documentation,
            and a compliance-cleared counterparty. Buyers access audited, actionable commodity positions — not unverified offers.
          </p>
        </motion.div>

        {/* Two-column: map left, content right */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 xl:gap-20 items-center">

          {/* LEFT — Africa map with hub overlays */}
          <motion.div
            variants={fadeUp}
            className="relative flex items-center justify-center order-2 lg:order-1"
          >
            {/* Map wrapper — relative for badge overlays */}
            <div className="relative w-full flex items-center justify-center" style={{ minHeight: '700px' }}>
              {/* Glow halo behind map */}
              <div className="absolute inset-8 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(199,59,34,0.09) 0%, transparent 68%)', filter: 'blur(40px)' }} />

              {/* Map image — 3D perspective tilt */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-full"
                style={{
                  perspective: '1200px',
                  height: '700px',
                }}
              >
                <img
                  src={africaTradeMap}
                  alt="Finatrades African Trade Hub Network"
                  className="w-full h-full select-none"
                  style={{
                    objectFit: 'contain',
                    transform: 'rotateY(-6deg) rotateX(3deg) scale(1.04)',
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'center center',
                    filter: 'drop-shadow(-12px 24px 48px rgba(199,59,34,0.18)) drop-shadow(0 8px 24px rgba(0,0,0,0.12))',
                    transition: 'transform 0.4s ease',
                  }}
                  draggable={false}
                />
              </motion.div>

              {/* TOP-RIGHT badge — 100% Verified Listings */}
              <motion.div
                initial={{ opacity: 0, scale: 0.75, x: 16, y: -8 }}
                whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45, type: 'spring', stiffness: 240, damping: 20 }}
                className="absolute top-6 right-2 flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,253,244,0.95) 100%)',
                  border: '1px solid rgba(5,150,105,0.2)',
                  boxShadow: '0 8px 32px rgba(5,150,105,0.15), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(12px)',
                  transform: 'translateZ(20px)',
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)', boxShadow: '0 2px 8px rgba(5,150,105,0.25)' }}>
                  <CheckCircle2 size={16} className="text-[#059669]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A] leading-tight">100% Verified</p>
                  <p className="text-[11px] font-medium" style={{ color: '#059669' }}>Listings</p>
                </div>
              </motion.div>

              {/* BOTTOM-LEFT badge — 14 Active Hubs */}
              <motion.div
                initial={{ opacity: 0, scale: 0.75, x: -16, y: 8 }}
                whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 240, damping: 20 }}
                className="absolute bottom-10 left-2 flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(254,240,236,0.95) 100%)',
                  border: '1px solid rgba(199,59,34,0.2)',
                  boxShadow: '0 8px 32px rgba(199,59,34,0.15), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(12px)',
                  transform: 'translateZ(20px)',
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FEE2D5 0%, #FECBB5 100%)', boxShadow: '0 2px 8px rgba(199,59,34,0.25)' }}>
                  <MapPin size={16} className="text-[#C73B22]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A] leading-tight">14 Active Hubs</p>
                  <p className="text-[11px] font-medium" style={{ color: '#C73B22' }}>Across Africa</p>
                </div>
              </motion.div>

              {/* Map legend — bottom centre */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.75, duration: 0.4 }}
                className="absolute bottom-0 left-0 right-0 flex justify-center"
              >
                <div className="flex items-center gap-5 px-5 py-2.5 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(10px)',
                  }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: '#C73B22', boxShadow: '0 0 0 3px rgba(199,59,34,0.22), 0 2px 6px rgba(199,59,34,0.4)' }} />
                    <span className="text-[11.5px] text-[#444440] font-medium tracking-wide">Entry points</span>
                  </div>
                  <div className="w-px h-3.5 bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: '#1D4ED8', boxShadow: '0 0 0 3px rgba(29,78,216,0.22), 0 2px 6px rgba(29,78,216,0.4)' }} />
                    <span className="text-[11.5px] text-[#444440] font-medium tracking-wide">Trade &amp; logistics nodes</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* RIGHT — content */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="order-1 lg:order-2"
          >
            {/* Feature list */}
            <motion.div variants={stagger} className="space-y-3 mb-8">
              {[
                { icon: Search,      text: 'Filter by commodity type, specification grade, lot quantity, incoterms, and hub location' },
                { icon: FileText,    text: 'Submit formal RFQ or Import Expression of Interest — tracked and responded to on-platform' },
                { icon: BarChart3,   text: 'Evaluate competing offers with verified documentation side-by-side before committing' },
                { icon: Lock,        text: 'Convert accepted offers to purchase orders with escrow-governed payment in one click' },
              ].map(({ icon: Icon, text }) => (
                <motion.div key={text} variants={fadeUp} className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-[#C73B22]/20 hover:bg-[#C73B22]/3 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-white border border-[#C73B22]/15 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Icon size={13} className="text-[#C73B22]" />
                  </div>
                  <span className="text-[#444440] text-sm leading-relaxed">{text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Commodity chips */}
            <motion.div variants={fadeUp} className="mb-8">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Traded Commodities</p>
              <div className="flex flex-wrap gap-2">
                {COMMODITIES.map(({ label, color }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
                    style={{ color, borderColor: color + '40', background: color + '0D' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={fadeUp} className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
              {[
                { value: '14', label: 'African Hubs' },
                { value: '100%', label: 'Inventory-Verified' },
                { value: 'Zero', label: 'Blind Purchasing' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-xl font-bold text-[#C73B22]">{value}</p>
                  <p className="text-[11px] text-[#888880] font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link href="/register">
                <button className="px-6 py-3 bg-[#C73B22] hover:bg-[#A82D16] text-white font-semibold rounded-xl transition-all flex items-center gap-2 hover:shadow-lg hover:shadow-[#C73B22]/25">
                  Access the Marketplace <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/register?role=seller">
                <button className="px-6 py-3 bg-white hover:bg-gray-50 text-[#444440] font-semibold rounded-xl border border-gray-300 transition-all flex items-center gap-2">
                  List Your Inventory <ArrowRight size={16} />
                </button>
              </Link>
            </motion.div>
          </motion.div>

        </div>
      </AnimatedSection>
    </section>
  );
}

const ROLES = [
  {
    key: 'sellers',
    tab: 'Exporters & Sellers',
    icon: Package,
    accent: '#C73B22',
    accentBg: 'bg-[#C73B22]/10',
    accentBorder: 'border-[#C73B22]/25',
    accentText: 'text-[#C73B22]',
    tabActiveBg: 'bg-[#C73B22]',
    title: 'List Compliant, Warehouse-Receipted Inventory on an Institutional B2B Marketplace',
    subtitle: 'Transform verified physical commodity positions into tradeable digital assets with full documentation governance.',
    desc: 'Finatrades gives exporters and producers a structured consignment pathway — from warehouse intake and AI-driven document validation through quality inspection, digital receipt issuance, and live marketplace listing. Trade finance eligibility is assessed as part of the workflow, giving sellers access to pre-shipment finance instruments against confirmed inventory without separate applications.',
    features: [
      { label: 'Structured Consignment Creation', color: '#C73B22' },
      { label: 'AI Document Validation',           color: '#E5602A' },
      { label: 'Approved Warehouse Selection',     color: '#2563EB' },
      { label: 'Quality Inspection Workflow',      color: '#0891B2' },
      { label: 'Digital Inventory ID & Receipt',   color: '#7C3AED' },
      { label: 'Live Marketplace Listing',         color: '#059669' },
      { label: 'Trade Finance Eligibility',        color: '#D97706' },
      { label: 'Settlement Milestone Tracking',    color: '#1B2E40' },
    ],
    cta: 'Register as Exporter',
    ctaHref: '/register?role=seller',
    ctaStyle: 'bg-[#C73B22] hover:bg-[#A82D16] text-white',
  },
  {
    key: 'buyers',
    tab: 'Importers & Buyers',
    icon: Search,
    accent: '#1B2E40',
    accentBg: 'bg-[#1B2E40]/10',
    accentBorder: 'border-[#1B2E40]/20',
    accentText: 'text-[#1B2E40]',
    tabActiveBg: 'bg-[#1B2E40]',
    title: 'Source Authenticated Commodity Positions and Execute Risk-Governed Purchase Orders',
    subtitle: 'Every listing is inventory-backed, document-verified, and counterparty-screened before you engage.',
    desc: 'Importers and commodity buyers access a marketplace where every offer is anchored in confirmed warehouse inventory, authenticated trade documentation, and a KYC/KYB-verified seller. Submit RFQs or Import Expressions of Interest, evaluate and compare authenticated offers across 14 African hubs, convert to formal purchase orders with escrow-governed payment, and track all fulfilment milestones to delivery confirmation — with zero counterparty exposure.',
    features: [
      { label: 'Verified Inventory Discovery',        color: '#2563EB' },
      { label: 'Multi-Hub Supplier Access',           color: '#0891B2' },
      { label: 'RFQ & IOI Submission',               color: '#7C3AED' },
      { label: 'Authenticated Offer Comparison',      color: '#059669' },
      { label: 'Formal Purchase Order Execution',     color: '#C73B22' },
      { label: 'Escrow-Backed Payment Flow',          color: '#E5602A' },
      { label: 'Inventory Reservation Confirmation',  color: '#D97706' },
      { label: 'Delivery Milestone Visibility',       color: '#1B2E40' },
    ],
    cta: 'Register as Importer',
    ctaHref: '/register?role=buyer',
    ctaStyle: 'bg-[#1B2E40] hover:bg-[#152436] text-white',
  },
  {
    key: 'government',
    tab: 'Government & Sovereign',
    icon: Shield,
    accent: '#E5602A',
    accentBg: 'bg-[#E5602A]/10',
    accentBorder: 'border-[#E5602A]/25',
    accentText: 'text-[#E5602A]',
    tabActiveBg: 'bg-[#E5602A]',
    title: 'Sovereign Commodity Procurement and Government-to-Government Barter Execution',
    subtitle: 'A restricted, access-controlled trade branch exclusively for verified government ministries, state-owned enterprises, and sovereign funds.',
    desc: 'Finatrades operates a dedicated sovereign access module for strategic commodity exchange — crude oil, refined petroleum products, grain, wheat, fertilizers, gold, and industrial minerals. Ministries and state trading entities submit structured barter mandates or direct procurement requirements, which are matched against vetted counterparties across the Finatrades network. Settlement gap management, independent valuation oversight, and compliance reporting are embedded throughout the execution process.',
    features: [
      { label: 'Restricted Government Onboarding',    color: '#C73B22' },
      { label: 'Sovereign Entity Verification',        color: '#2563EB' },
      { label: 'Strategic Barter Mandate Submission',  color: '#7C3AED' },
      { label: 'Independent Commodity Valuation',      color: '#0891B2' },
      { label: 'Vetted Counterparty Matching',         color: '#059669' },
      { label: 'Settlement Gap Management',            color: '#D97706' },
      { label: 'Mandate Review & Authorisation',       color: '#E5602A' },
      { label: 'Execution & Compliance Monitoring',    color: '#1B2E40' },
    ],
    cta: 'Request Sovereign Access',
    ctaHref: '/register?role=government',
    ctaStyle: 'bg-[#E5602A] hover:bg-[#C94E1C] text-white',
  },
];

function RolesSection() {
  const [active, setActive] = useState(0);
  const role = ROLES[active];
  const Icon = role.icon;

  return (
    <section id="for-sellers" className="bg-white py-24">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/30 bg-[#C73B22]/8 text-[#A82D16] text-xs font-medium mb-5">
            Role-Based Platform Access
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">A Dedicated Trade Workflow for Every Counterparty</h2>
          <p className="text-[#666660] max-w-2xl mx-auto">
            Finatrades is not a generic marketplace. Each participant category — exporter, importer, sovereign entity, warehouse, finance, or logistics partner — is onboarded through a compliance-gated pathway and assigned a role-specific module with purpose-built workflow controls.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2 mb-10">
          {ROLES.map((r, i) => {
            const TabIcon = r.icon;
            const isActive = i === active;
            return (
              <button
                key={r.key}
                onClick={() => setActive(i)}
                style={isActive ? { background: r.accent, borderColor: 'transparent' } : { borderColor: r.accent + '55', color: r.accent }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  isActive ? 'text-white shadow-lg' : 'bg-white hover:opacity-80'
                }`}
              >
                <TabIcon size={14} />
                {r.tab}
              </button>
            );
          })}
        </motion.div>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl p-8 sm:p-12"
          style={{
            background: 'rgba(255,255,255,0.80)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `1.5px solid ${role.accent}30`,
            boxShadow: `0 8px 40px 0 ${role.accent}14, inset 0 1px 0 rgba(255,255,255,0.85)`,
          }}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-5"
                style={{ border: `1px solid ${role.accent}44`, background: role.accent + '14', color: role.accent }}
              >
                <Icon size={12} />
                {role.tab}
              </div>
              <h3 className="text-3xl font-bold text-[#1A1A1A] mb-3 leading-tight">{role.title}</h3>
              <p className="font-medium mb-4 text-sm" style={{ color: role.accent }}>{role.subtitle}</p>
              <p className="text-[#555550] leading-relaxed mb-8">{role.desc}</p>
              <Link href={role.ctaHref}>
                <button
                  className="px-6 py-3 font-semibold rounded-xl transition-all flex items-center gap-2 text-white hover:opacity-90"
                  style={{ background: role.accent }}
                >
                  {role.cta} <ArrowRight size={16} />
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {role.features.map(f => (
                <div
                  key={f.label}
                  className="flex items-center gap-3 rounded-2xl px-4 py-4 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(14px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(14px) saturate(160%)',
                    border: '1px solid rgba(255,255,255,0.55)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: f.color + '70' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: f.color }} />
                  </div>
                  <span className="text-[#2A2A2A] text-sm font-medium leading-snug">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatedSection>
    </section>
  );
}

function SettlementSection() {
  const actors = [
    { id: 'buyer',    name: 'Buyer',         color: '#1B4FDB', icon: Users },
    { id: 'escrow',   name: 'Escrow System', color: '#C73B22', icon: ShieldCheck },
    { id: 'warehouse',name: 'Warehouse',     color: '#2D6A4F', icon: Warehouse },
    { id: 'seller',   name: 'Seller',        color: '#7B3F00', icon: Building2 },
  ];

  const phases = ['Pre-Trade', 'Payment', 'Lock', 'Release', 'Payout'];

  const conditions = [
    { id: 1, name: 'Unverified inventory position',              consequence: 'Transaction suspended — no sale initiated',    impact: 'Buyer blocked from starting transaction' },
    { id: 2, name: 'Unconfirmed or insufficient buyer funds',    consequence: 'Inventory lock withheld — no reservation',     impact: 'Escrow system denies inventory lock' },
    { id: 3, name: 'Escrow conditions not satisfied',            consequence: 'Warehouse release blocked — no dispatch',      impact: 'Warehouse release authorisation withheld' },
    { id: 4, name: 'Delivery milestone unverified',              consequence: 'Final payout deferred — funds held in escrow', impact: 'Seller payout delayed in escrow' },
    { id: 5, name: 'Incomplete or unsigned trade documentation', consequence: 'Audit trail void — settlement rejected',       impact: 'Entire settlement rejected' },
  ];

  const actions: Record<string, (string | React.ReactNode | null)[]> = {
    buyer: [
      'Submit Purchase Order & KYC',
      <div key="b-pay" className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#1B4FDB]"><CreditCard className="w-3 h-3" /> PAYMENT</div>
        <span>Initiate Fund Transfer</span>
      </div>,
      'Receive Lock Confirmation',
      'Verify Shipping Docs',
      'Final Acceptance',
    ],
    escrow: [
      'Verify Inventory Availability',
      'Validate Buyer Funds',
      <div key="e-lock" className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#C73B22]"><Lock className="w-3 h-3" /> CUSTODY</div>
        <span>Enforce Bilateral Lock</span>
      </div>,
      'Validate Release Conditions',
      <div key="e-pay" className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#C73B22]"><Handshake className="w-3 h-3" /> PAYOUT</div>
        <span>Execute Seller Payout</span>
      </div>,
    ],
    warehouse: [
      'Confirm Physical Stock',
      null,
      'Segment & Secure Batch',
      <div key="w-rel" className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#2D6A4F]"><Warehouse className="w-3 h-3" /> RELEASE</div>
        <span>Authorise Goods Release</span>
      </div>,
      'Update Inventory Ledger',
    ],
    seller: [
      'Upload Batch Certificate',
      'Review Escrow Deposit',
      'Sign Allocation Agreement',
      'Approve Release',
      'Receive Verified Funds',
    ],
  };

  const phaseColors = [
    { bg: '#EFF6FF', border: '#1B4FDB', text: '#1B4FDB', label: 'blue' },
    { bg: '#FFFBEB', border: '#D97706', text: '#D97706', label: 'amber' },
    { bg: '#FEF2F2', border: '#C73B22', text: '#C73B22', label: 'red' },
    { bg: '#F0FDF4', border: '#2D6A4F', text: '#2D6A4F', label: 'green' },
    { bg: '#F5F3FF', border: '#7C3AED', text: '#7C3AED', label: 'purple' },
  ];

  return (
    <section id="trade-finance" className="bg-[#FAFAFA] py-24">
      <AnimatedSection className="max-w-7xl mx-auto px-6">

        {/* Section header */}
        <motion.div variants={fadeUp} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/20 bg-white text-[#555550] text-xs font-medium mb-5 shadow-sm">
            <Lock size={12} />
            Structured Trade Finance & Escrow Governance
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            End-to-End Settlement — Inventory Lock to Verified Payout
          </h2>
          <p className="text-[#666660] max-w-2xl mx-auto">
            Every phase is condition-gated. Buyer, Escrow, Warehouse and Seller each play a defined role
            — no step advances until the previous one is confirmed.
          </p>
        </motion.div>

        {/* Stats strip */}
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: Users,      label: '4 Verified Parties' },
            { icon: ArrowRight, label: '9 Governed Handoffs' },
            { icon: Shield,     label: 'Zero Counterparty Risk' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-semibold text-[#444440] shadow-sm">
              <Icon size={13} className="text-[#C73B22]" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Swimlane map */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px] relative">

              {/* Phase headers — each column animates in left-to-right */}
              <div className="grid grid-cols-[180px_repeat(5,1fr)] bg-gray-50 border-b border-gray-200">
                <div className="p-4 border-r border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-400 self-center">
                  Stakeholders
                </div>
                {phases.map((phase, pIdx) => (
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: -12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: pIdx * 0.15, duration: 0.4, ease: 'easeOut' }}
                    className="p-4 text-center border-r border-gray-200 last:border-r-0"
                    style={{ borderTop: `3px solid ${phaseColors[pIdx].border}` }}
                  >
                    <div
                      className="text-xs font-black uppercase tracking-[0.18em] mb-2"
                      style={{ color: phaseColors[pIdx].text }}
                    >
                      {phase}
                    </div>
                    <div className="flex justify-center">
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: phaseColors[pIdx].bg, color: phaseColors[pIdx].text }}
                      >
                        Step {pIdx + 1}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Actor lanes */}
              {actors.map((actor, aIdx) => (
                <div key={actor.id} className="grid grid-cols-[180px_repeat(5,1fr)] border-b border-gray-100 last:border-b-0 group">

                  {/* Actor label */}
                  <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: aIdx * 0.1, duration: 0.35, ease: 'easeOut' }}
                    className="p-5 border-r border-gray-200 flex items-center gap-3 relative overflow-hidden bg-gray-50/30 group-hover:bg-gray-50 transition-colors"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: actor.color }} />
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: actor.color }}>
                      <actor.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#1A1A1A] leading-tight">{actor.name}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-mono mt-0.5">Authorized</div>
                    </div>
                  </motion.div>

                  {/* Cells — each column reveals after its phase header */}
                  {phases.map((_, pIdx) => (
                    <div key={pIdx} className="p-3 border-r border-gray-100 last:border-r-0 relative flex items-center justify-center min-h-[110px]">
                      {actions[actor.id][pIdx] != null ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.88, y: 10 }}
                          whileInView={{ opacity: 1, scale: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{
                            delay: pIdx * 0.18 + aIdx * 0.07,
                            duration: 0.38,
                            ease: 'easeOut',
                          }}
                          className="w-full h-full p-3 rounded-lg border shadow-sm hover:shadow-md transition-all flex flex-col justify-center"
                          style={{
                            borderColor: `${phaseColors[pIdx].border}30`,
                            borderLeftWidth: '3px',
                            borderLeftColor: phaseColors[pIdx].border,
                            background: phaseColors[pIdx].bg,
                          }}
                        >
                          <div className="text-xs font-medium leading-relaxed text-gray-700">
                            {actions[actor.id][pIdx]}
                          </div>
                        </motion.div>
                      ) : (
                        <div className="w-6 h-px bg-gray-200" />
                      )}
                      {pIdx < phases.length - 1 && actions[actor.id][pIdx] != null && actions[actor.id][pIdx + 1] != null && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: pIdx * 0.18 + aIdx * 0.07 + 0.3 }}
                          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm"
                        >
                          <ArrowRight className="w-3 h-3" style={{ color: phaseColors[pIdx].border }} />
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Condition gate overlays */}
              <div className="absolute top-[64px] bottom-0 left-[180px] right-0 pointer-events-none grid grid-cols-5">
                {[0, 1, 2, 3, 4].map(idx => (
                  <div key={idx} className="relative h-full">
                    {idx < 4 && (
                      <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-200 flex flex-col items-center justify-center z-20">
                        <div className="group/gate pointer-events-auto cursor-help bg-white border-2 rounded-full p-1.5 shadow-lg transform -translate-x-1/2 hover:scale-125 transition-transform"
                          style={{ borderColor: phaseColors[idx].border }}>
                          <AlertTriangle className="w-3.5 h-3.5" style={{ color: phaseColors[idx].border }} />
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-52 bg-[#1A1A1A] text-white p-3 rounded-xl text-[11px] opacity-0 group-hover/gate:opacity-100 transition-opacity pointer-events-none z-30 shadow-2xl">
                            <div className="font-bold mb-1" style={{ color: phaseColors[idx].border }}>CONDITION GATE #{idx + 1}</div>
                            <div className="font-medium text-gray-200 mb-1">{conditions[idx].name}</div>
                            <div className="text-gray-400 leading-normal">{conditions[idx].consequence}</div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#1A1A1A]" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Phase legend strip */}
        <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-3">
          {phases.map((phase, pIdx) => (
            <div
              key={phase}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border"
              style={{ background: phaseColors[pIdx].bg, color: phaseColors[pIdx].text, borderColor: `${phaseColors[pIdx].border}40` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: phaseColors[pIdx].border }} />
              {phase}
            </div>
          ))}
        </motion.div>

      </AnimatedSection>
    </section>
  );
}

function LayerCard3D({ img, icon: Icon, label, num, desc, delay }: {
  img: string | null; icon: React.ElementType; label: string; num: string; desc: string; delay: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rotX = useSpring(0, { stiffness: 300, damping: 22 });
  const rotY = useSpring(0, { stiffness: 300, damping: 22 });
  const glowX = useSpring(50, { stiffness: 200, damping: 20 });
  const glowY = useSpring(50, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (flipped || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    rotX.set((cy - 0.5) * -16);
    rotY.set((cx - 0.5) * 16);
    glowX.set(cx * 100);
    glowY.set(cy * 100);
  };

  const handleMouseLeave = () => {
    rotX.set(0); rotY.set(0);
    glowX.set(50); glowY.set(50);
  };

  return (
    <motion.div
      ref={cardRef}
      variants={fadeUp}
      style={{ perspective: '1000px', height: '340px', rotateX: flipped ? 0 : rotX, rotateY: flipped ? undefined : rotY }}
      className="cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setFlipped(f => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0.0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
      >
        {/* ── FRONT: full-bleed image + bottom headline ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Full-cover image */}
          {img ? (
            <img src={img} alt={label} className="w-full h-full object-contain object-center" style={{ background: '#FBF0E8' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1B2E40 0%, #243d55 60%, #C73B22 140%)' }}>
              <Icon size={52} className="text-white/30" />
            </div>
          )}

          {/* Light gradient overlay — subtle shadow only at bottom for text legibility */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(10,10,14,0.58) 0%, rgba(10,10,14,0.08) 40%, transparent 100%)' }} />

          {/* Gloss shine follows mouse */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: useMotionTemplate`radial-gradient(ellipse 70% 60% at ${glowX}% ${glowY}%, rgba(255,255,255,0.22) 0%, transparent 70%)`,
            }}
          />

          {/* Layer badge — top left */}
          <span
            className="absolute top-3 left-3 text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(245,230,220,0.96)', color: '#7A3520' }}
          >
            LAYER {num}
          </span>

          {/* Flip hint — top right */}
          <div className="absolute top-3 right-3 flex items-center gap-0.5 text-[9px] font-medium text-white/50">
            flip <ArrowRight size={8} />
          </div>

          {/* Headline at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <h3 className="text-white text-[13px] font-semibold leading-snug">{label}</h3>
          </div>
        </div>

        {/* ── BACK: details ── */}
        <div
          className="absolute inset-0 rounded-2xl border border-[#C73B22]/25 flex flex-col p-5 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(160deg, #fff8f5 0%, #fff1eb 100%)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg, #C73B22, #E5602A)' }} />

          {/* Header — fixed */}
          <div className="flex-shrink-0 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: '#F5E6DC', color: '#7A3520' }}>
                LAYER {num}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(199,59,34,0.12)' }}>
                <Icon size={15} className="text-[#C73B22]" />
              </div>
              <h3 className="text-[#1A1A1A] text-[14px] font-bold leading-snug pt-1">{label}</h3>
            </div>
          </div>

          {/* Scrollable description */}
          <div className="flex-1 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'none' }}>
            <p className="text-[#444440] text-[13px] leading-relaxed">{desc}</p>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-medium text-[#C73B22] opacity-70 mt-3 flex-shrink-0">
            flip back <ArrowRight size={10} style={{ transform: 'rotate(180deg)' }} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BackendSection() {
  const layers = [
    { img: layer1, icon: Users, label: 'User Access Layer', num: '01', desc: 'Provides structured, role-differentiated onboarding pathways for sellers, buyers, warehouse operators, logistics providers, and financial partners. Each participant is provisioned with permission-scoped access controls, enforced session governance, and a dedicated dashboard calibrated to their operational mandate within the trade lifecycle.' },
    { img: layer2, icon: Shield, label: 'Identity & Compliance Layer', num: '02', desc: 'Executes multi-jurisdictional KYC, KYB, and AML screening against global sanctions databases, PEP registries, and adverse media sources. Document authenticity verification, biometric identity checks, and jurisdictional eligibility assessments are applied at onboarding and continuously monitored throughout the trading relationship.' },
    { img: layer3, icon: FileText, label: 'Document Service', num: '03', desc: 'Issues, validates, and archives the full spectrum of international trade documentation — including digital sales contracts, certificates of origin, phytosanitary certificates, warehouse receipts, inspection reports, and bills of lading. All documents are cryptographically signed, version-controlled, and linked to their corresponding trade record.' },
    { img: layer4, icon: Warehouse, label: 'Inventory & Consignment Engine', num: '04', desc: 'Manages real-time stock positioning across certified warehouse facilities, generating tamper-evident digital warehouse receipts upon consignment intake. Supports dynamic inventory allocation, partial-lot releases, quality-grade segregation, and full chain-of-custody tracking from deposit through final delivery authorisation.' },
    { img: layer5, icon: Search, label: 'Marketplace Connector', num: '05', desc: 'Powers a live, regulated commodity marketplace with structured listings, transparent price discovery mechanisms, and verified counterparty profiles. Facilitates bid-offer matching, negotiation workflows, and pre-trade compliance checks — ensuring every transaction is anchored in verified inventory and eligible, screened participants.' },
    { img: layer6, icon: Package, label: 'Buyer Order Engine', num: '06', desc: 'Orchestrates the end-to-end order lifecycle from placement through fulfilment confirmation — including inventory reservation, trade confirmation routing, logistics assignment, quality inspection triggers, and delivery milestone acknowledgement. Integrates with warehouse and logistics partners to enforce contractual obligations at each fulfilment stage.' },
    { img: layer7, icon: CreditCard, label: 'WINVESTNET Wallet Connector', num: '07', desc: 'Interfaces with WINVESTNET digital wallet infrastructure to enable secure fund locking, multi-currency ledger management, and atomic payment release. Supports escrow-aligned fund segregation, real-time balance visibility, and settlement finalisation across USD, EUR, GBP, and AED denominations with full transactional auditability.' },
    { img: layer8, icon: TrendingUp, label: 'Trade Finance Engine', num: '08', desc: 'Facilitates structured trade finance instruments including invoice discounting, pre-shipment finance, warehouse receipt financing, letters of credit, and receivables factoring. Integrates accredited finance partners into the trade flow, enabling capital deployment against verified inventory and confirmed purchase orders with risk-tiered approval workflows.' },
    { img: layer9, icon: Lock, label: 'Escrow & Settlement Engine', num: '09', desc: 'Administers smart escrow custody with programmatic release conditions tied to verified fulfilment events — delivery confirmation, quality sign-off, inspection clearance, and document acceptance. Incorporates a structured dispute resolution protocol with independent arbitration triggers and an immutable settlement ledger for final payment reconciliation.' },
    { img: layer10, icon: BarChart3, label: 'Audit & Reporting Layer', num: '10', desc: 'Maintains immutable, timestamped audit trails across every platform event — user actions, document issuances, payment instructions, and status transitions. Delivers real-time regulatory reporting outputs, compliance dashboards, trade analytics, and exportable data packages aligned with African trade authority and financial regulator requirements.' },
    { img: layer11, icon: Zap, label: 'Notifications & API Orchestration', num: '11', desc: 'Provides a secure, versioned API gateway enabling certified partners, government portals, and institutional integrators to connect programmatically. Manages real-time event streams, webhook delivery, push notifications, and SLA-governed alert routing — ensuring all ecosystem participants receive timely, role-relevant operational intelligence throughout the trade cycle.' },
    { img: layer12, icon: Layers, label: 'Infrastructure & Data Layer', num: '12', desc: 'Underpins the entire platform on enterprise-grade, multi-region cloud infrastructure with end-to-end encryption at rest and in transit. Incorporates automated failover, geo-redundant data replication, CDN-accelerated content delivery, and continuous security monitoring — built to satisfy institutional-grade uptime, data residency, and cyber-resilience requirements.' },
  ];

  return (
    <section className="relative py-24 border-y border-gray-200 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={backendBg} alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-white/70" />
      </div>
      <AnimatedSection className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/30 bg-[#C73B22]/8 text-[#A82D16] text-xs font-medium mb-5">
            Enterprise-Grade System Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            12 Integrated Layers. One Unbreakable Trade Infrastructure.
          </h2>
          <p className="text-[#666660] max-w-2xl mx-auto">
            Finatrades is not a lightweight SaaS tool layered on top of spreadsheets. It is a purpose-built, 
            institutional-grade trade operating system — with dedicated, interconnected layers for identity, 
            document governance, inventory management, order execution, trade finance, escrow settlement, 
            and regulatory audit. Click any layer to see what it does.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {layers.map((layer, i) => (
            <LayerCard3D key={layer.label} {...layer} delay={0} />
          ))}
        </motion.div>

        {/* Backend CTA */}
        <motion.div
          variants={fadeUp}
          className="mt-16 text-center"
        >
          <p className="text-[#666660] text-sm mb-5 max-w-xl mx-auto">
            Every layer is production-deployed, interconnected, and available to verified institutional partners, government bodies, and accredited trade participants.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="#contact">
              <button className="px-6 py-3 bg-[#C73B22] hover:bg-[#A82D16] text-white font-semibold rounded-xl transition-all flex items-center gap-2 hover:shadow-lg hover:shadow-[#C73B22]/25">
                Request Platform Access <ArrowRight size={16} />
              </button>
            </a>
            <a href="#compliance">
              <button className="px-6 py-3 bg-white hover:bg-gray-50 text-[#444440] font-semibold rounded-xl border border-gray-300 transition-all flex items-center gap-2">
                View Compliance Architecture <ArrowRight size={16} />
              </button>
            </a>
          </div>
        </motion.div>
      </AnimatedSection>
    </section>
  );
}

function ComplianceSection() {
  const features = [
    {
      icon: Shield,
      title: 'KYC / KYB Identity Verification',
      desc: 'Every participant — seller, buyer, warehouse operator, logistics provider, and finance partner — undergoes institutional-grade identity and business verification before platform access is granted. Biometric checks, document validation, and beneficial ownership screening are applied at onboarding.',
    },
    {
      icon: FileText,
      title: 'AI-Powered Document Authenticity Checks',
      desc: 'Certificates of origin, phytosanitary certificates, warehouse receipts, inspection reports, and trade contracts are subjected to AI-driven document scanning, MRZ validation, and cross-reference verification against issuing authority databases — eliminating document fraud at source.',
    },
    {
      icon: Globe,
      title: 'Multi-Jurisdictional Eligibility & Sanctions Screening',
      desc: 'AML/CFT screening, PEP checks, and real-time sanctions list monitoring run automatically against all registered participants and counterparties across all 14 African trade hubs. Jurisdictional eligibility is assessed continuously throughout the trading relationship, not only at onboarding.',
    },
    {
      icon: Lock,
      title: 'Immutable Audit Trail on Every Platform Event',
      desc: 'From initial consignment intake through final settlement closure, every user action, document state change, payment event, and status transition is logged with an immutable, cryptographically timestamped record — fully exportable for regulatory review, external audit, or dispute resolution.',
    },
    {
      icon: Scale,
      title: 'Escrow-Governed Settlement with Zero Counterparty Exposure',
      desc: 'All trade funds are held in independently administered escrow custody and are released exclusively upon verified fulfilment milestones — delivery confirmation, quality sign-off, and document completion. No unilateral disbursement is possible, eliminating counterparty and settlement risk at the structural level.',
    },
  ];

  const stats = [
    { value: '14', label: 'African Trade Hubs' },
    { value: '100%', label: 'Audit Coverage' },
    { value: '0', label: 'Counterparty Risk' },
  ];

  return (
    <section className="relative py-28 overflow-hidden" style={{ background: 'linear-gradient(160deg, #fff 0%, #FFF4F0 55%, #fff 100%)' }}>
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #C73B22 0%, transparent 70%)' }} />
        <div className="absolute right-0 top-0 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #1B2E40 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-center">

          {/* ── LEFT: 3D illustration + floating badges ── */}
          <motion.div
            initial={{ opacity: 0, x: -64 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative flex items-center justify-center order-2 lg:order-1"
          >
            {/* Soft glow halo */}
            <div className="absolute inset-8 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(229,96,42,0.12) 0%, transparent 70%)', filter: 'blur(32px)' }} />

            {/* Main image */}
            <motion.img
              src={compliance3d}
              alt="Compliance Infrastructure"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-full max-w-[500px]"
              style={{ filter: 'drop-shadow(0 24px 40px rgba(199,59,34,0.13))' }}
            />

            {/* Badge — AML/CFT — top right */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.85 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 260, damping: 22 }}
              className="absolute top-4 right-2 lg:right-0 bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3"
              style={{ boxShadow: '0 8px 28px -4px rgba(0,0,0,0.10)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF0EC' }}>
                <Shield size={17} className="text-[#C73B22]" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#1A1A1A] leading-tight">AML / CFT Cleared</p>
                <p className="text-[11px] text-[#888880]">All participants screened</p>
              </div>
            </motion.div>

            {/* Badge — Audit Trail — bottom left */}
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.85 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.75, type: 'spring', stiffness: 260, damping: 22 }}
              className="absolute bottom-6 left-0 lg:-left-4 bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3"
              style={{ boxShadow: '0 8px 28px -4px rgba(0,0,0,0.10)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EEF4FF' }}>
                <CheckCircle2 size={17} className="text-[#1B2E40]" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#1A1A1A] leading-tight">100% Audit Trail</p>
                <p className="text-[11px] text-[#888880]">Every event logged</p>
              </div>
            </motion.div>
          </motion.div>

          {/* ── RIGHT: Content ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="order-1 lg:order-2"
          >
            {/* Badge */}
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/30 mb-6"
              style={{ background: 'rgba(199,59,34,0.06)', color: '#A82D16', fontSize: '11px', fontWeight: 600 }}
            >
              <Shield size={12} /> Compliance-Grade Infrastructure
            </motion.div>

            {/* Headline */}
            <motion.h2 variants={fadeUp}
              className="text-3xl sm:text-4xl xl:text-[2.75rem] font-bold text-[#1A1A1A] mb-5 leading-tight"
            >
              Compliance-First<br />
              <span style={{ color: '#C73B22' }}>Infrastructure</span>
            </motion.h2>

            {/* Subtext */}
            <motion.p variants={fadeUp} className="text-[#555550] text-[15px] sm:text-base mb-8 leading-relaxed max-w-xl">
              Every transaction, participant, and document processed on Finatrades passes through a mandatory, sequenced compliance stack — spanning identity verification, document authentication, sanctions screening, and jurisdictional eligibility assessment — before any trade position is activated or settlement initiated.
            </motion.p>

            {/* Stat row */}
            <motion.div variants={fadeUp} className="flex items-center gap-8 mb-10 pb-8 border-b border-gray-100">
              {stats.map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-[#C73B22]">{value}</p>
                  <p className="text-[11px] text-[#888880] font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* Feature list */}
            <motion.div variants={stagger} className="space-y-3">
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  className="flex items-start gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group cursor-default"
                  whileHover={{ x: 3 }}
                  style={{
                    background: 'rgba(255,255,255,0.76)',
                    backdropFilter: 'blur(16px) saturate(170%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(170%)',
                    border: '1px solid rgba(255,255,255,0.58)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.85)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105"
                    style={{ background: 'rgba(199,59,34,0.09)', border: '1px solid rgba(199,59,34,0.10)' }}
                  >
                    <f.icon size={16} className="text-[#C73B22]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">{f.title}</p>
                    <p className="text-[13px] text-[#666660] leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <a href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #C73B22 0%, #E5602A 100%)', boxShadow: '0 4px 16px rgba(199,59,34,0.28)' }}
              >
                Talk to Compliance Team <ArrowRight size={14} />
              </a>
              <a href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#444440] hover:text-[#C73B22] transition-colors"
              >
                View full workflow <ArrowRight size={13} />
              </a>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

function EcoCard3D({ logo, label, role, desc, highlight, delay, width }: {
  logo: React.ReactNode; label: string; role: string; desc: string;
  highlight: boolean; delay: number; width: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width: w, height: h } = card.getBoundingClientRect();
    const x = (e.clientX - left) / w;
    const y = (e.clientY - top) / h;
    setTilt({ x: (y - 0.5) * -14, y: (x - 0.5) * 14 });
    setShine({ x: x * 100, y: y * 100 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, type: 'spring', stiffness: 220, damping: 22 }}
      style={{ perspective: '900px', width }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setShine({ x: 50, y: 50 }); setHovered(false); }}
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          scale: hovered ? 1.07 : 1,
          boxShadow: hovered
            ? '0 24px 48px -8px rgba(199,59,34,0.28), 0 0 0 1.5px rgba(199,59,34,0.18)'
            : highlight
              ? '0 8px 28px -4px rgba(199,59,34,0.22)'
              : '0 4px 18px -4px rgba(0,0,0,0.12)',
        }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className={`relative rounded-2xl p-5 text-center cursor-pointer overflow-hidden ${
          highlight
            ? 'ring-2 ring-[#C73B22] ring-offset-2 ring-offset-[#F5E8E4]'
            : 'border border-[#F0E8E4]'
        }`}
        style={{ transformStyle: 'preserve-3d', background: highlight ? '#FFF6F2' : '#FFFAF8' }}
      >
        {/* Warm radial light — always visible, brightens on hover */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity: hovered ? 1 : 0.55,
            background: `radial-gradient(ellipse 80% 70% at ${shine.x}% ${shine.y}%, rgba(255,240,230,0.72) 0%, transparent 70%)`,
          }}
        />
        <div className="relative z-10">
          <div className="flex justify-center mb-3" style={{ filter: 'brightness(1.08) saturate(1.05)' }}>{logo}</div>
          {highlight && <div className="w-8 h-0.5 bg-[#C73B22] mx-auto mb-2.5 rounded" />}
          <p className="text-[10px] font-semibold text-[#C73B22] uppercase tracking-widest mb-2">{role}</p>
          <p className="text-[10px] text-[#666660] leading-relaxed">{desc}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConnectedEcosystemSection() {
  // Fixed 680×680px orbital hub. Center=(340,340). Orbit radius=240px.
  // Satellite positions: top=(340,100), right=(580,340), bottom=(340,580), left=(100,340)
  const C = 340; // center px
  const R = 240; // orbit radius px

  const orbitDots = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * 2 * Math.PI;
    return { cx: C + R * Math.cos(angle), cy: C + R * Math.sin(angle), big: i % 2 === 0 };
  });

  const nodes = [
    {
      key: 'raminvest', px: C, py: C - R, w: 182, delay: 0.15,
      label: 'RAMINVEST', role: 'Group Governance',
      desc: 'Strategic oversight and governance across all Raminvest Holding DIFC group entities.',
      highlight: false,
      logo: (
        <div className="inline-flex items-center bg-black rounded-lg px-2.5 py-1.5">
          <img src={logoRaminvest} alt="Raminvest" className="h-[50px] w-auto object-contain" />
        </div>
      ),
    },
    {
      key: 'winlogistics', px: C - R, py: C, w: 172, delay: 0.25,
      label: 'WINLOGISTICS', role: 'Logistics & Transport',
      desc: 'International logistics coordination, transport structuring and routing.',
      highlight: false,
      logo: <img src={logoWinlogistics} alt="WinLogistics" className="h-11 w-auto object-contain" />,
    },
    {
      key: 'finatrades', px: C, py: C, w: 215, delay: 0,
      label: 'FINATRADES', role: 'Trade & Settlement Hub',
      desc: 'Digital trade finance, settlement, FX coordination, and gold-backed clearing.',
      highlight: true,
      logo: (
        <img src={logoFinatradesP} alt="Finatrades" className="h-[72px] w-auto object-contain"
          style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(82%) saturate(700%) hue-rotate(340deg) brightness(85%) contrast(110%)' }} />
      ),
    },
    {
      key: 'wincommodities', px: C + R, py: C, w: 172, delay: 0.3,
      label: 'WINCOMMODITIES', role: 'Commodity Operations',
      desc: 'Commodity sourcing, execution activities and trade operations support.',
      highlight: false,
      logo: <img src={logoWincommodities} alt="WinCommodities" className="h-11 w-auto object-contain" />,
    },
    {
      key: 'winvestnet', px: C, py: C + R, w: 182, delay: 0.4,
      label: 'WINVESTNET', role: 'Investment Network',
      desc: 'Investment connectivity, strategic capital alignment and network integration.',
      highlight: false,
      logo: <img src={logoWinvestnet} alt="WinvestNet" className="h-11 w-auto object-contain" />,
    },
  ];

  return (
    <section className="py-24 overflow-hidden" style={{ background: '#FDF0EB' }}>
      <div className="max-w-5xl mx-auto px-6">

        {/* ── Header ── */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={stagger} className="text-center mb-14"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase text-[#C73B22] mb-3">Institutional Backing</motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            Part of a Fully Integrated Institutional Trade Group
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#666660] max-w-xl mx-auto">
            Finatrades is not a standalone startup. It operates as the digital trade execution hub within the Raminvest Holding DIFC group — backed by dedicated commodity, logistics, investment, and compliance entities that form a complete, vertically integrated trade infrastructure.
          </motion.p>
        </motion.div>

        {/* ── Desktop orbital hub (hidden on mobile) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative mx-auto hidden md:block"
          style={{ width: '680px', height: '680px' }}
        >
          {/* Layer 1 – static dashed orbit ring + axis-aligned connector lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" width="680" height="680" viewBox="0 0 680 680" style={{ zIndex: 1 }}>
            {/* Outer orbit ring */}
            <circle cx={C} cy={C} r={R} fill="none" stroke="#C73B22" strokeWidth="1.4" strokeDasharray="6 9" opacity="0.22" />
            {/* Inner pulse ring */}
            <circle cx={C} cy={C} r={R * 0.48} fill="none" stroke="#C73B22" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.15" />
            {/* Axis connector lines */}
            <line x1={C} y1={C - R} x2={C} y2={C} stroke="#C73B22" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
            <line x1={C + R} y1={C} x2={C} y2={C} stroke="#C73B22" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
            <line x1={C} y1={C + R} x2={C} y2={C} stroke="#C73B22" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
            <line x1={C - R} y1={C} x2={C} y2={C} stroke="#C73B22" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
            {/* End dots on connector lines */}
            {[[C, C - R], [C + R, C], [C, C + R], [C - R, C]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="4" fill="#C73B22" opacity="0.5" />
            ))}
            <circle cx={C} cy={C} r="5" fill="#C73B22" opacity="0.35" />
          </svg>

          {/* Layer 2 – rotating orbital dots */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            style={{ zIndex: 2 }}
          >
            <svg width="680" height="680" viewBox="0 0 680 680">
              {orbitDots.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={d.big ? 5.5 : 3.5}
                  fill="#C73B22" opacity={d.big ? 0.75 : 0.38} />
              ))}
            </svg>
          </motion.div>

          {/* Layer 3 – counter-rotating inner ring (opposite direction, slower) */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ rotate: -360 }}
            transition={{ duration: 44, repeat: Infinity, ease: 'linear' }}
            style={{ zIndex: 2 }}
          >
            <svg width="680" height="680" viewBox="0 0 680 680">
              {Array.from({ length: 6 }, (_, i) => {
                const angle = (i / 6) * 2 * Math.PI;
                const r2 = R * 0.48;
                return (
                  <circle key={i} cx={C + r2 * Math.cos(angle)} cy={C + r2 * Math.sin(angle)}
                    r="3" fill="#E5602A" opacity="0.5" />
                );
              })}
            </svg>
          </motion.div>

          {/* Layer 4 – 3D partner cards */}
          {nodes.map((node) => (
            <div
              key={node.key}
              className="absolute"
              style={{ left: node.px, top: node.py, transform: 'translate(-50%, -50%)', zIndex: 10 }}
            >
              <EcoCard3D
                logo={node.logo}
                label={node.label}
                role={node.role}
                desc={node.desc}
                highlight={node.highlight}
                delay={node.delay}
                width={node.w}
              />
            </div>
          ))}
        </motion.div>

        {/* ── Mobile fallback – stacked card grid ── */}
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
          {nodes.map((node, i) => (
            <motion.div
              key={node.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={`bg-white rounded-2xl p-5 text-center ${
                node.highlight ? 'shadow-xl ring-2 ring-[#C73B22]' : 'shadow-md border border-gray-200'
              }`}
            >
              <div className="flex justify-center mb-3">{node.logo}</div>
              {node.highlight && <div className="w-8 h-0.5 bg-[#C73B22] mx-auto mb-2 rounded" />}
              <p className="text-xs font-semibold text-[#C73B22] uppercase tracking-widest mb-2">{node.role}</p>
              <p className="text-xs text-[#666660] leading-relaxed">{node.desc}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

function CTASection() {
  const paths = [
    {
      icon: Package,
      label: 'Exporters & Producers',
      desc: 'List warehouse-verified inventory on Africa\'s institutional B2B commodity marketplace.',
      cta: 'Register as Exporter',
      href: '/register?role=seller',
      primary: true,
    },
    {
      icon: Search,
      label: 'Importers & Buyers',
      desc: 'Source authenticated commodity positions with full documentation transparency and escrow-backed settlement.',
      cta: 'Register as Importer',
      href: '/register?role=buyer',
      primary: false,
    },
    {
      icon: Building2,
      label: 'Government & Sovereign Entities',
      desc: 'Access the restricted sovereign barter and strategic procurement module — for ministries, SOEs, and sovereign funds only.',
      cta: 'Request Sovereign Access',
      href: '/register?role=government',
      primary: false,
    },
    {
      icon: Handshake,
      label: 'Finance, Warehouse & Logistics Partners',
      desc: 'Join the Finatrades accredited partner network — deploy capital, offer warehousing, or provide logistics within the governed trade chain.',
      cta: 'Apply as Partner',
      href: '/register?role=partner',
      primary: false,
    },
  ];

  return (
    <section id="contact" className="bg-white py-24">
      <AnimatedSection className="max-w-5xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/30 bg-[#C73B22]/8 text-[#A82D16] text-xs font-medium mb-5">
            Institutional Onboarding — Apply for Access
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            Ready to Trade on Verified,<br />
            <span style={{ color: '#C73B22' }}>Governed Infrastructure?</span>
          </h2>
          <p className="text-[#555550] text-lg max-w-2xl mx-auto">
            Finatrades onboards participants through a compliance-gated process. Select your entry path below — 
            all registrations undergo KYC/KYB review before platform access is granted.
          </p>
        </motion.div>

        <motion.div variants={stagger} className="grid sm:grid-cols-2 gap-5 mb-10">
          {paths.map(({ icon: Icon, label, desc, cta, href, primary }) => (
            <motion.div
              key={label}
              variants={fadeUp}
              className={`rounded-2xl p-6 border transition-all duration-300 group ${
                primary
                  ? 'border-[#C73B22]/30 bg-gradient-to-br from-[#FFF4F0] to-white'
                  : 'border-gray-200 bg-white hover:border-[#C73B22]/20 hover:bg-[#FFF8F6]'
              }`}
              style={{ boxShadow: primary ? '0 4px 20px rgba(199,59,34,0.10)' : '0 1px 6px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${primary ? 'bg-[#C73B22]' : 'bg-[#C73B22]/10'}`}>
                  <Icon size={18} className={primary ? 'text-white' : 'text-[#C73B22]'} />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-[15px] leading-snug">{label}</p>
                  {primary && <span className="text-[10px] font-semibold text-[#C73B22] uppercase tracking-wider">Primary Access Path</span>}
                </div>
              </div>
              <p className="text-[#555550] text-sm leading-relaxed mb-5">{desc}</p>
              <Link href={href}>
                <button className={`w-full px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  primary
                    ? 'bg-[#C73B22] hover:bg-[#A82D16] text-white hover:shadow-lg hover:shadow-[#C73B22]/25'
                    : 'bg-gray-100 hover:bg-gray-200 text-[#333330] border border-gray-200'
                }`}>
                  {cta} <ArrowRight size={14} />
                </button>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="text-center">
          <p className="text-[#888880] text-sm">
            All registrations are subject to compliance review. Platform access is granted upon successful KYC/KYB verification and admin approval.
          </p>
          <p className="text-[#AAAAAA] text-xs mt-2">
            Finatrades operates under Raminvest Holding DIFC · Member of the UAE & African Trade Ecosystem
          </p>
        </motion.div>
      </AnimatedSection>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 sm:col-span-1">
            <img src={finatradesLogo} alt="Finatrades" className="h-9 w-auto mb-3" style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(82%) saturate(1800%) hue-rotate(355deg) brightness(105%)' }} />
            <p className="text-[#888880] text-sm leading-relaxed">
              Institutional commodity trade platform — compliance-governed, escrow-backed, and built for verified B2B and sovereign trade execution across Africa.
            </p>
            <p className="text-[#666660] text-xs mt-2">
              A Raminvest Holding DIFC Group Company
            </p>
          </div>
          <div>
            <h4 className="text-[#444440] font-semibold text-sm mb-3">Platform</h4>
            <div className="space-y-2">
              {['How It Works', 'Marketplace', 'Seller Consignment', 'Buyer Flow'].map(l => (
                <div key={l}><a href="#how-it-works" className="text-[#888880] hover:text-[#444440] text-sm transition-colors">{l}</a></div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[#444440] font-semibold text-sm mb-3">Services</h4>
            <div className="space-y-2">
              {['Warehouse Inventory', 'Trade Finance', 'Government Barter', 'Compliance'].map(l => (
                <div key={l}><a href="#trade-finance" className="text-[#888880] hover:text-[#444440] text-sm transition-colors">{l}</a></div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[#444440] font-semibold text-sm mb-3">Legal</h4>
            <div className="space-y-2">
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms & Conditions', href: '/terms' },
                { label: 'Disclaimer', href: '/disclaimer' },
                { label: 'Sign In', href: '/login' },
              ].map(({ label, href }) => (
                <div key={label}><Link href={href} className="text-[#888880] hover:text-[#444440] text-sm transition-colors">{label}</Link></div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[#999990] text-xs">© {new Date().getFullYear()} Finatrades. All rights reserved.</p>
          <p className="text-[#AAAAAA] text-xs text-center">
            Finatrades connects verified commodities, warehouse inventory, buyer payments, trade finance, and settlement workflows through one secure digital trade platform.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function EcosystemLanding() {
  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] antialiased overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <PositioningSection />
      <RolesSection />
      <MarketplaceSection />
      <SettlementSection />
      <ConnectedEcosystemSection />
      <CTASection />
      <Footer />
    </div>
  );
}
