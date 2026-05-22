import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useSpring, useMotionTemplate } from 'framer-motion';
import { Link } from 'wouter';
import {
  ArrowRight, Shield, Globe, Warehouse, Package, Search,
  CreditCard, Handshake, Settings, CheckCircle2, Menu, X,
  Building2, Users, Truck, BarChart3, Lock, FileText,
  ChevronDown, MapPin, Layers, Zap, TrendingUp, Scale
} from 'lucide-react';
import finatradesLogo from '@/assets/finatrades-logo-ecosystem.png';
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
import layer10 from '@assets/edc4f2fa-7b74-4a7b-b341-2f659925981c_1779449646522.png';
import layer11 from '@assets/6ca8f13c-7850-4a05-9620-dadac3a54cae_1779449450685.png';
import layer12 from '@assets/17caea42-27f6-4c15-ad8b-eb19a8f7d809_1779449639917.png';
import backendBg from '@/assets/backend-bg.png';
import compliance3d from '@/assets/compliance-3d.png';
import FloatingAgentChat from '@/components/FloatingAgentChat';

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
          <br />Across Africa
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
            <div key={stat.label} className="bg-white/4 border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#C73B22] mb-1">{stat.value}</div>
              <div className="text-xs text-[#666660]">{stat.label}</div>
            </div>
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
    desc: 'Every user completes secure onboarding with account creation, role selection, email verification, document upload, KYC/KYB review, AML screening, and admin approval before accessing role-specific modules.',
    icon: FileText,
    tags: ['Account Creation', 'Document Upload', 'AML Screening', 'Admin Approval'],
  },
  {
    num: '02',
    title: 'Seller Consignment Creation & Warehouse Submission',
    desc: 'Sellers submit commodity details, quantity, origin, ownership documents, commercial invoices, certificates, and transport info. The system validates documents, checks warehouse capacity, and prepares inventory for marketplace listing.',
    icon: Package,
    tags: ['Commodity Details', 'Document Validation', 'Warehouse Selection', 'Finance Eligibility'],
  },
  {
    num: '03',
    title: 'Pre-Arrival Logistics, Warehouse Reception & Inventory Hub',
    desc: 'Shipment tracking, ETA alerts, warehouse booking, customs readiness, and inspection preparation before goods arrive — ensuring nothing lands blindly at the destination warehouse.',
    icon: Truck,
    tags: ['Shipment Tracking', 'Warehouse Booking', 'Customs Readiness', 'Inspection Prep'],
  },
  {
    num: '04',
    title: 'Warehouse Consignment Inventory Module',
    desc: 'After arrival, inventory is recorded with owner, warehouse location, commodity type, grade, inspection status, and quantity tracking (available, reserved, pledged, released, sold). A digital warehouse receipt is generated.',
    icon: Warehouse,
    tags: ['Inventory ID', 'Quality Inspection', 'Digital Receipt', 'Ownership Confirmation'],
  },
  {
    num: '05',
    title: '14-Hub Marketplace Discovery, RFQ & Matching',
    desc: 'Buyers browse verified commodity listings across the 14-hub African network, filter by commodity, grade, quantity, and pricing, submit RFQs or Import Expressions of Interest, and convert inquiries into formal orders.',
    icon: Search,
    tags: ['14 African Hubs', 'RFQ Submission', 'Buyer-Seller Matching', 'Offer Comparison'],
  },
  {
    num: '06',
    title: 'Buyer Flow, Order Placement & Payment to WINVESTNET',
    desc: 'Buyers register, complete compliance, browse inventory, negotiate terms, and place purchase orders. After order confirmation, payment is made to the WINVESTNET B2B Wallet, triggering escrow and inventory reservation.',
    icon: CreditCard,
    tags: ['Purchase Order', 'Payment to WINVESTNET', 'Escrow Ready', 'Inventory Reserve'],
  },
  {
    num: '07',
    title: 'Government Commodities Barter Workflow',
    desc: 'A dedicated optional branch for sovereign entities to exchange strategic commodities (oil, food, minerals, gold). Includes government onboarding, barter request creation, valuation comparison, counterparty matching, and settlement.',
    icon: Scale,
    tags: ['Sovereign Verification', 'Barter Valuation', 'Counterparty Matching', 'Settlement Gap Support'],
  },
  {
    num: '08',
    title: 'Trade Finance, Escrow, Settlement & Deal Completion',
    desc: 'Buyer payment, inventory lock, warehouse release instruction, shipment milestone tracking, and seller payout are all connected. No goods are released until conditions are met. Every step is auditable.',
    icon: Lock,
    tags: ['Escrow Lock', 'Warehouse Release', 'Delivery Milestones', 'Seller Payout'],
  },
  {
    num: '09',
    title: 'Complete Backend Flow & System Architecture',
    desc: 'Identity, compliance, document service, inventory engine, marketplace connector, buyer order engine, WINVESTNET wallet connector, trade finance, escrow, settlement, and audit layers — all connected into one secure infrastructure.',
    icon: Settings,
    tags: ['Audit Trail', 'Compliance Layer', 'Partner APIs', 'Full Traceability'],
  },
];

function TimelineStep({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const isLeft = index % 2 === 0;
  const Icon = step.icon;

  const accentColor = index % 3 === 0 ? '#C73B22' : index % 3 === 1 ? '#1B2E40' : '#E5602A';

  return (
    <div ref={ref} className="relative grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] items-center gap-0 min-h-[140px]">
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        className={`${isLeft ? 'block' : 'hidden md:block'} md:pr-8`}
      >
        {isLeft && (
          <div className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-transparent transition-all duration-300"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <StepCardContent step={step} accentColor={accentColor} />
          </div>
        )}
      </motion.div>

      <div className="hidden md:flex flex-col items-center relative z-10">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          className="w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
        >
          <Icon size={20} color="#fff" />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-2 text-xs font-bold tracking-wider"
          style={{ color: accentColor }}
        >
          {step.num}
        </motion.span>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        className={`${!isLeft ? 'block' : 'hidden md:block'} md:pl-8`}
      >
        {!isLeft && (
          <div className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-transparent transition-all duration-300"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <StepCardContent step={step} accentColor={accentColor} />
          </div>
        )}
        {isLeft && (
          <div className="hidden md:block" />
        )}
      </motion.div>

      <div className="block md:hidden px-2 py-2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white border border-gray-200 rounded-2xl p-5"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}18` }}>
              <Icon size={18} style={{ color: accentColor }} />
            </div>
            <span className="text-xs font-bold tracking-wider" style={{ color: accentColor }}>Step {step.num}</span>
          </div>
          <StepCardContent step={step} accentColor={accentColor} />
        </motion.div>
      </div>
    </div>
  );
}

function StepCardContent({ step, accentColor }: { step: typeof STEPS[0]; accentColor: string }) {
  return (
    <>
      <div className="flex items-start gap-2 mb-2">
        <div className="w-1 h-full rounded-full flex-shrink-0 self-stretch min-h-[20px]"
          style={{ background: accentColor, minWidth: 3 }} />
        <h3 className="text-[#1A1A1A] font-semibold text-base leading-snug">{step.title}</h3>
      </div>
      <p className="text-[#666660] text-sm leading-relaxed mb-4 pl-3">{step.desc}</p>
      <div className="flex flex-wrap gap-2 pl-3">
        {step.tags.map(tag => (
          <span key={tag} className="px-2.5 py-1 text-xs font-medium rounded-lg border"
            style={{ background: `${accentColor}0f`, borderColor: `${accentColor}30`, color: accentColor }}>
            {tag}
          </span>
        ))}
      </div>
    </>
  );
}

function HowItWorksSection() {
  const lineRef = useRef<HTMLDivElement>(null);
  const isLineInView = useInView(lineRef, { once: true });

  return (
    <section id="how-it-works" className="py-24 overflow-hidden" style={{ background: 'linear-gradient(160deg, #FFF4F0 0%, #FFFFFF 40%, #F0F4FF 70%, #FFF8F0 100%)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={stagger}
          className="text-center mb-20"
        >
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/30 bg-[#C73B22]/8 text-[#A82D16] text-xs font-medium mb-5">
            End-to-End Trade Execution · 9-Stage Protocol
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            A Fully Governed Trade Execution Protocol
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#666660] max-w-2xl mx-auto">
            Unlike peer-to-peer commodity brokers or fragmented export channels, Finatrades enforces a mandatory, sequenced 9-stage protocol — every transaction must pass through compliance onboarding, warehouse verification, document authentication, escrow payment control, and audited settlement before completion.
          </motion.p>
        </motion.div>

        <div className="relative">
          <div ref={lineRef} className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gray-200 overflow-hidden">
            <motion.div
              className="w-full origin-top"
              style={{ background: 'linear-gradient(180deg, #C73B22, #E5602A, #1B2E40)' }}
              initial={{ scaleY: 0 }}
              animate={isLineInView ? { scaleY: 1 } : {}}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
            />
          </div>

          <div className="space-y-8 md:space-y-6">
            {STEPS.map((step, i) => (
              <TimelineStep key={step.num} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const AFRICA_HUBS = [
  'Senegal', 'Togo', 'Ghana', 'Nigeria', 'Cameroon', 'Congo', 'Angola',
  'South Africa', 'Kenya', 'Tanzania', 'Djibouti', 'Ivory Coast', 'Morocco', 'Egypt',
];

function MarketplaceSection() {
  return (
    <section id="marketplace" className="relative py-24 border-y border-gray-200 overflow-hidden">
      <div className="absolute inset-0">
        <img src={hubsBg} alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-white/30" />
      </div>
      <AnimatedSection className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/20 bg-gray-100 text-[#555550] text-xs font-medium mb-5">
              <Globe size={12} />
              14 Verified African Trade Hubs
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-5 leading-tight">
              Africa's First Institutional-Grade B2B Commodity Marketplace
            </h2>
            <p className="text-[#555550] text-base leading-relaxed mb-8">
              Every listing on the Finatrades marketplace is anchored to a confirmed warehouse inventory position, 
              authenticated trade documentation, and a compliance-cleared counterparty. 
              Buyers don't browse unverified offers — they access audited, actionable commodity positions 
              ready for structured execution across 14 African trade hubs.
            </p>
            <div className="space-y-3 mb-8">
              {[
                'Filter by commodity type, specification grade, lot quantity, incoterms, and hub location',
                'Submit formal RFQ or Import Expression of Interest — tracked and responded to on-platform',
                'Evaluate competing offers with verified documentation side-by-side before committing',
                'Convert accepted offers to purchase orders with escrow-governed payment in one click',
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-[#A82D16] flex-shrink-0 mt-0.5" />
                  <span className="text-[#444440] text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
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
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            {AFRICA_HUBS.map((hub, i) => (
              <div key={hub}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-gray-100 hover:border-[#C73B22]/20 transition-all">
                <div className="w-2 h-2 rounded-full bg-[#C73B22] flex-shrink-0" />
                <span className="text-[#333330] text-sm font-medium">{hub}</span>
                <MapPin size={12} className="text-[#AAAAAA] ml-auto" />
              </div>
            ))}
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
      'Structured Consignment Creation', 'AI Document Validation', 'Approved Warehouse Selection',
      'Quality Inspection Workflow', 'Digital Inventory ID & Receipt', 'Live Marketplace Listing',
      'Trade Finance Eligibility Assessment', 'Settlement Milestone Tracking',
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
      'Verified Inventory Discovery', 'Multi-Hub Supplier Access', 'RFQ & IOI Submission',
      'Authenticated Offer Comparison', 'Formal Purchase Order Execution', 'Escrow-Backed Payment Flow',
      'Inventory Reservation Confirmation', 'Delivery Milestone Visibility',
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
      'Restricted Government Onboarding', 'Sovereign Entity Verification', 'Strategic Barter Mandate Submission',
      'Independent Commodity Valuation', 'Vetted Counterparty Matching', 'Settlement Gap Management',
      'Mandate Review & Authorisation', 'Execution & Compliance Monitoring',
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
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  isActive
                    ? `${r.tabActiveBg} text-white border-transparent shadow-lg`
                    : 'bg-white/4 border-gray-200 text-[#555550] hover:text-[#1A1A1A] hover:bg-white/8'
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
          className={`bg-white/2 border ${role.accentBorder} rounded-3xl p-8 sm:p-12`}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${role.accentBorder} ${role.accentBg} ${role.accentText} text-xs font-medium mb-5`}>
                <Icon size={12} />
                {role.tab}
              </div>
              <h3 className="text-3xl font-bold text-[#1A1A1A] mb-3 leading-tight">{role.title}</h3>
              <p className={`${role.accentText} font-medium mb-4 text-sm`}>{role.subtitle}</p>
              <p className="text-[#555550] leading-relaxed mb-8">{role.desc}</p>
              <Link href={role.ctaHref}>
                <button className={`px-6 py-3 font-semibold rounded-xl transition-all flex items-center gap-2 ${role.ctaStyle}`}>
                  {role.cta} <ArrowRight size={16} />
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {role.features.map(f => (
                <div key={f} className={`flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3`}>
                  <CheckCircle2 size={14} className={`${role.accentText} flex-shrink-0`} />
                  <span className="text-[#444440] text-sm">{f}</span>
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
  const rules = [
    { rule: 'Unverified inventory position', consequence: 'Transaction suspended — no sale initiated' },
    { rule: 'Unconfirmed or insufficient buyer funds', consequence: 'Inventory lock withheld — no reservation' },
    { rule: 'Escrow conditions not satisfied', consequence: 'Warehouse release blocked — no dispatch' },
    { rule: 'Delivery milestone unverified', consequence: 'Final payout deferred — funds held in escrow' },
    { rule: 'Incomplete or unsigned trade documentation', consequence: 'Audit trail void — settlement rejected' },
  ];

  return (
    <section id="trade-finance" className="bg-white py-24">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/20 bg-gray-100 text-[#555550] text-xs font-medium mb-5">
            <Lock size={12} />
            Structured Trade Finance & Escrow Governance
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            End-to-End Settlement Integrity from Inventory Lock to Verified Seller Payout
          </h2>
          <p className="text-[#666660] max-w-2xl mx-auto">
            Finatrades enforces a sequenced, condition-based settlement protocol that binds buyer payment confirmation,
            escrow custody, warehouse release authorisation, logistics verification, and final seller disbursement
            into a single governed transaction flow — with immutable audit visibility at every stage.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div variants={fadeUp} className="space-y-3">
            <h3 className="text-[#1A1A1A] font-semibold text-lg mb-5">Non-Negotiable Settlement Conditions</h3>
            {rules.map(({ rule, consequence }) => (
              <div key={rule} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-[#C73B22]/70 flex-shrink-0" />
                  <span className="text-[#444440] text-sm">{rule}</span>
                </div>
                <span className="text-xs font-semibold text-[#888880] bg-gray-100 px-3 py-1 rounded-lg whitespace-nowrap flex-shrink-0">→ {consequence}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-5">
            {[
              {
                icon: CreditCard,
                title: 'Buyer Fund Verification & Payment Confirmation',
                desc: 'Prior to any inventory reservation, buyer funds undergo institutional-grade verification and are confirmed as available, cleared, and allocated against the specific trade order. No inventory position may be locked until payment confirmation is received and recorded on the settlement ledger.',
              },
              {
                icon: Lock,
                title: 'Escrow Custody & Bilateral Lock Enforcement',
                desc: 'Upon payment confirmation, the corresponding inventory is placed under escrow custody and locked against the purchase order. Neither the seller nor the buyer may unilaterally alter, release, or reassign the position — all release conditions must be independently satisfied and verified.',
              },
              {
                icon: Warehouse,
                title: 'Conditional Warehouse Release Authorisation',
                desc: 'Warehouse release instructions are issued exclusively upon verification of delivery milestones, logistics handover documentation, quality inspection sign-off, and completion of all contractually mandated trade documents. No physical dispatch occurs outside this governed release protocol.',
              },
              {
                icon: Handshake,
                title: 'Seller Disbursement & Immutable Audit Closure',
                desc: 'Once all settlement conditions are independently verified and confirmed, escrowed funds are released to the seller\'s designated account. The transaction is simultaneously closed with an immutable, timestamped audit trail — capturing every event, counterparty action, and document state throughout the trade lifecycle.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-[#C73B22]/10 border border-[#C73B22]/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-[#C73B22]" />
                </div>
                <div>
                  <h4 className="text-[#1A1A1A] font-semibold mb-1.5">{title}</h4>
                  <p className="text-[#666660] text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
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
                  className="flex items-start gap-4 px-4 py-4 rounded-2xl border border-gray-100 bg-white/60 transition-all duration-300 group cursor-default"
                  whileHover={{ borderColor: 'rgba(199,59,34,0.20)', backgroundColor: 'rgba(255,248,245,0.9)', x: 3 }}
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
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
      <HowItWorksSection />
      <MarketplaceSection />
      <SettlementSection />
      <BackendSection />
      <ComplianceSection />
      <ConnectedEcosystemSection />
      <CTASection />
      <Footer />
      <FloatingAgentChat />
    </div>
  );
}
