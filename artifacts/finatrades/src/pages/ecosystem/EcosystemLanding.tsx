import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
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
import layer10 from '@/assets/layer-10.png';
import layer11 from '@/assets/layer-11.png';
import layer12 from '@/assets/layer-12.png';
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
            Digital Commodity Trade Platform · 14 African Hubs
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1A1A] leading-[1.1] tracking-tight mb-6">
          Digital Gateway for{' '}
          <span className="bg-gradient-to-r from-[#C73B22] via-[#E5602A] to-[#F08050] bg-clip-text text-transparent">
            Commodity Trade,
          </span>
          <br />Inventory & Settlement
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-[#555550] max-w-3xl mx-auto mb-10 leading-relaxed">
          Finatrades connects verified commodities, warehouse inventory, buyer payments, trade finance, and
          settlement workflows through one secure digital trade platform — from seller consignment to final payout.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap gap-3 justify-center mb-16">
          <Link href="/register?role=seller">
            <button className="px-6 py-3 bg-[#C73B22] hover:bg-[#A82D16] text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-[#C73B22]/30 flex items-center gap-2">
              Register as Seller <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/register?role=buyer">
            <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] font-semibold rounded-xl border border-gray-300 transition-colors flex items-center gap-2">
              Register as Buyer <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/register?role=government">
            <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-[#444440] font-semibold rounded-xl border border-gray-300 transition-colors flex items-center gap-2">
              Government Access <ArrowRight size={16} />
            </button>
          </Link>
          <a href="#how-it-works">
            <button className="px-6 py-3 text-[#555550] hover:text-[#1A1A1A] font-medium rounded-xl transition-colors flex items-center gap-2">
              Explore Platform <ChevronDown size={16} />
            </button>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { value: '14', label: 'African Trade Hubs' },
            { value: 'KYC/KYB', label: 'Verified Onboarding' },
            { value: '9-Step', label: 'Trade Workflow' },
            { value: 'Escrow', label: 'Settlement Control' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/4 border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#1A1A1A] mb-1">{stat.value}</div>
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
  { title: 'Exporters & Sellers', desc: 'Submit commodities on consignment, upload documents, track inspection, and list verified inventory on the marketplace.', img: cardSellers, accent: '#C73B22' },
  { title: 'Importers & Buyers', desc: 'Browse verified stock, submit RFQs, compare offers, place orders, and track deal execution until delivery.', img: cardBuyers, accent: '#1B2E40' },
  { title: 'Government Entities', desc: 'Strategic commodity sourcing, sovereign barter workflows, counterparty matching, and settlement support.', img: cardGovernment, accent: '#E5602A' },
  { title: 'Warehouse Partners', desc: 'Receive pre-arrival documents, confirm shipments, manage inspection, issue digital receipts, and confirm releases.', img: cardWarehouse, accent: '#C73B22' },
  { title: 'Finance Partners', desc: 'Review inventory-backed requests, approve trade finance, monitor escrow-style settlement, and release seller payouts.', img: cardFinance, accent: '#1B2E40' },
  { title: 'Logistics Partners', desc: 'Track shipments, manage customs readiness, update delivery milestones, and confirm final delivery conditions.', img: cardLogistics, accent: '#E5602A' },
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
          <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase text-[#C73B22] mb-3">Trade Ecosystem</motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            One Platform. Multiple Trade Roles.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#555550] max-w-2xl mx-auto text-lg">
            Every participant in the commodity trade lifecycle has a dedicated workflow, verified onboarding, and real-time visibility from consignment to settlement.
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
            9-Step Trade Workflow
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            How Finatrades Works
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#666660] max-w-2xl mx-auto">
            From the moment a seller submits a consignment to when a buyer receives their goods and a seller receives their payout — every stage is digitally connected.
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
              14 Strategic Hubs
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-5 leading-tight">
              Verified Commodity Discovery Across 14 African Trade Hubs
            </h2>
            <p className="text-[#555550] text-base leading-relaxed mb-8">
              Finatrades enables buyers to discover verified commodity opportunities, compare supplier offers,
              submit RFQs, and move from inquiry to structured trade execution through a transparent digital workflow.
            </p>
            <div className="space-y-3 mb-8">
              {[
                'Filter by commodity, grade, quantity, pricing, and delivery terms',
                'Submit RFQ or Import Expression of Interest directly to sellers',
                'Buyer-seller matching, offer comparison, and formal order conversion',
                'Warehouse-backed inventory — every listing is verified',
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-[#A82D16] flex-shrink-0 mt-0.5" />
                  <span className="text-[#444440] text-sm">{item}</span>
                </div>
              ))}
            </div>
            <Link href="/register">
              <button className="px-6 py-3 bg-[#C73B22] hover:bg-[#A82D16] text-white font-semibold rounded-xl transition-all flex items-center gap-2">
                Explore Marketplace <ArrowRight size={16} />
              </button>
            </Link>
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
    title: 'Convert Physical Commodities into Verified Digital Inventory',
    subtitle: 'Submit goods on consignment. Get listed on the marketplace.',
    desc: 'Sellers submit commodities to approved warehouses, upload ownership and export documents, track inspection status, and list verified inventory on the marketplace. Trade finance eligibility is built into the workflow from day one.',
    features: [
      'Consignment Creation', 'Document Upload', 'Warehouse Selection',
      'Inspection Workflow', 'Inventory ID Generation', 'Marketplace Listing',
      'Finance Eligibility', 'Release Tracking',
    ],
    cta: 'Register as Seller',
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
    title: 'Source Verified Commodities and Execute Structured Orders',
    subtitle: 'Browse, match, order, pay, and track — all in one flow.',
    desc: 'Buyers browse verified stock, send RFQs or Import Expressions of Interest, compare supplier offers, place orders, make payment through approved channels, and track deal execution until delivery milestones are confirmed.',
    features: [
      'Marketplace Discovery', 'Verified Inventory Access', 'RFQ Submission',
      'Supplier Matching', 'Purchase Order Creation', 'Payment Tracking',
      'Inventory Reserve', 'Delivery Milestone Visibility',
    ],
    cta: 'Register as Buyer',
    ctaHref: '/register?role=buyer',
    ctaStyle: 'bg-[#1B2E40] hover:bg-[#152436] text-white',
  },
  {
    key: 'government',
    tab: 'Sovereign Access',
    icon: Shield,
    accent: '#E5602A',
    accentBg: 'bg-[#E5602A]/10',
    accentBorder: 'border-[#E5602A]/25',
    accentText: 'text-[#E5602A]',
    tabActiveBg: 'bg-[#E5602A]',
    title: 'Strategic Commodity Barter for Government Users',
    subtitle: 'A dedicated parallel branch for approved sovereign entities only.',
    desc: 'Finatrades supports structured government commodity barter workflows — crude oil, fuel, food, wheat, gold, fertilizer, minerals, and more. Sovereign users submit strategic exchange requirements and monitor execution through a controlled digital process.',
    features: [
      'Government Onboarding', 'Sovereign Verification', 'Barter Request Creation',
      'Valuation Comparison', 'Counterparty Matching', 'Settlement Gap Support',
      'Mandate Review', 'Execution Monitoring',
    ],
    cta: 'Request Government Access',
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
            Platform Access by Role
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">Who Is Finatrades For?</h2>
          <p className="text-[#666660] max-w-2xl mx-auto">
            Each role has a dedicated workflow, module access, and onboarding path tailored to their position in the trade lifecycle.
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
    { rule: 'No verified inventory', consequence: 'No sale' },
    { rule: 'No funded buyer', consequence: 'No lock' },
    { rule: 'No escrow confirmation', consequence: 'No release' },
    { rule: 'No delivery milestone', consequence: 'No final payout' },
    { rule: 'No documents', consequence: 'No audit trail' },
  ];

  return (
    <section id="trade-finance" className="bg-white py-24">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/20 bg-gray-100 text-[#555550] text-xs font-medium mb-5">
            <Lock size={12} />
            Trade Finance & Escrow
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            Controlled Settlement from Inventory Lock to Seller Payout
          </h2>
          <p className="text-[#666660] max-w-2xl mx-auto">
            Finatrades connects buyer payment, escrow-style controls, warehouse release, logistics confirmation,
            and seller payout into one structured transaction flow with full audit visibility.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div variants={fadeUp} className="space-y-3">
            <h3 className="text-[#1A1A1A] font-semibold text-lg mb-5">Core Settlement Rules</h3>
            {rules.map(({ rule, consequence }) => (
              <div key={rule} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500/70" />
                  <span className="text-[#444440] text-sm">{rule}</span>
                </div>
                <span className="text-xs font-semibold text-[#888880] bg-gray-100 px-3 py-1 rounded-lg">→ {consequence}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-5">
            {[
              { icon: CreditCard, title: 'Payment Confirmation', desc: 'Buyer funds are verified and confirmed before any inventory is locked or reserved in the system.' },
              { icon: Lock, title: 'Escrow-Style Control', desc: 'Inventory is reserved and locked against the order. Neither party can unilaterally release without conditions being met.' },
              { icon: Warehouse, title: 'Warehouse Release Instruction', desc: 'Release is only triggered after verified delivery milestones and document completion are confirmed.' },
              { icon: Handshake, title: 'Seller Payout & Audit', desc: 'Once conditions are fully satisfied, the seller receives payment and a complete audit trail is sealed.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-[#C73B22]/10 border border-[#C73B22]/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-[#555550]" />
                </div>
                <div>
                  <h4 className="text-[#1A1A1A] font-semibold mb-1">{title}</h4>
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

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay }}
      style={{ perspective: '1000px', height: '280px' }}
      className="cursor-pointer"
      onClick={() => setFlipped(f => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0.0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
      >
        {/* ── FRONT: image ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden border border-gray-200"
          style={{ backfaceVisibility: 'hidden', background: '#FFF0E8' }}
        >
          {img ? (
            <img
              src={img}
              alt={label}
              className="w-full h-full object-contain object-center"
              style={{ padding: '20px 24px 14px' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1B2E40 0%, #243d55 60%, #C73B22 140%)' }}>
              <Icon size={52} className="text-white/30" />
            </div>
          )}
          {/* Layer badge */}
          <span
            className="absolute top-3 left-3 text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: '#F5E6DC', color: '#7A3520' }}
          >
            LAYER {num}
          </span>
          {/* Flip hint */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] font-medium text-[#C73B22] opacity-60">
            tap to flip <ArrowRight size={9} />
          </div>
        </div>

        {/* ── BACK: details ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden border border-[#C73B22]/25 flex flex-col justify-between p-5"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(160deg, #fff8f5 0%, #fff1eb 100%)',
          }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg, #C73B22, #E5602A)' }} />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: '#F5E6DC', color: '#7A3520' }}
              >
                LAYER {num}
              </span>
            </div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(199,59,34,0.12)' }}>
                <Icon size={15} className="text-[#C73B22]" />
              </div>
              <h3 className="text-[#1A1A1A] text-sm font-bold leading-snug pt-1">{label}</h3>
            </div>
            <p className="text-[#666660] text-xs leading-relaxed">{desc}</p>
          </div>

          {/* Flip back hint */}
          <div className="flex items-center gap-1 text-[10px] font-medium text-[#C73B22] opacity-60 self-end">
            tap to flip back <ArrowRight size={9} style={{ transform: 'rotate(180deg)' }} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BackendSection() {
  const layers = [
    { img: layer1, icon: Users,       label: 'User Access Layer',               num: '01', desc: 'Role-based onboarding for sellers, buyers, warehouses, logistics & finance partners.' },
    { img: layer2, icon: Shield,      label: 'Identity & Compliance Layer',     num: '02', desc: 'KYC/AML verification, document checks, and jurisdictional eligibility screening.' },
    { img: layer3, icon: FileText,    label: 'Document Service',                num: '03', desc: 'Digital contracts, certificates of origin, phytosanitary, inspection & trade docs.' },
    { img: layer4, icon: Warehouse,   label: 'Inventory & Consignment Engine',  num: '04', desc: 'Warehouse receipts, stock records, consignment tracking and release workflows.' },
    { img: layer5, icon: Search,      label: 'Marketplace Connector',           num: '05', desc: 'Live commodity listings, price discovery, offer matching and bid management.' },
    { img: layer6, icon: Package,     label: 'Buyer Order Engine',              num: '06', desc: 'Order placement, confirmation routing, allocation, and fulfilment orchestration.' },
    { img: layer7, icon: CreditCard,  label: 'WINVESTNET Wallet Connector',     num: '07', desc: 'Digital wallet integration, fund locking, multi-currency settlement ledger.' },
    { img: layer8, icon: TrendingUp,  label: 'Trade Finance Engine',            num: '08', desc: 'Invoice financing, letters of credit, receivables factoring and capital facilitation.' },
    { img: layer9, icon: Lock,        label: 'Escrow & Settlement Engine',      num: '09', desc: 'Smart escrow release on verified fulfilment milestones and dispute resolution.' },
    { img: layer10, icon: BarChart3,   label: 'Audit & Reporting Layer',         num: '10', desc: 'Full audit trails, regulatory reporting, analytics dashboards and compliance exports.' },
    { img: layer11, icon: Zap,         label: 'Notifications & API Orchestration', num: '11', desc: 'Real-time webhooks, partner API gateway, event streams and alert management.' },
    { img: layer12, icon: Layers,      label: 'Infrastructure & Data Layer',     num: '12', desc: 'Cloud-native storage, encrypted databases, CDN delivery, and disaster recovery.' },
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
            System Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            12-Layer Digital Trade Infrastructure
          </h2>
          <p className="text-[#666660] max-w-2xl mx-auto">
            Every user, document, inventory record, order, payment, warehouse release, logistics update,
            and settlement event is traceable and auditable across the full system stack.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {layers.map((layer, i) => (
            <LayerCard3D key={layer.label} {...layer} delay={i * 0.06} />
          ))}
        </div>
      </AnimatedSection>
    </section>
  );
}

function ComplianceSection() {
  const features = [
    {
      icon: Shield,
      title: 'KYC / KYB Verification',
      desc: 'Every seller, buyer, warehouse, and logistics partner is identity-verified before accessing the platform.',
    },
    {
      icon: FileText,
      title: 'Document Authenticity Checks',
      desc: 'Certificates of origin, phytosanitary documents, and trade contracts are verified via AI-powered document scanning.',
    },
    {
      icon: Globe,
      title: 'Jurisdictional Eligibility Screening',
      desc: 'AML/CFT screening and sanctions list checks run automatically on all participants across 14 African hubs.',
    },
    {
      icon: Lock,
      title: 'Audit Trail on Every Event',
      desc: 'From consignment entry to final settlement, every action is logged, timestamped, and exportable for regulatory review.',
    },
    {
      icon: Scale,
      title: 'Escrow-Backed Settlement',
      desc: 'Funds are held in verified escrow and only released upon confirmed fulfilment milestones — zero counterparty risk.',
    },
  ];

  return (
    <section className="relative py-28 overflow-hidden" style={{ background: 'linear-gradient(160deg, #fff 0%, #FFF4F0 60%, #fff 100%)' }}>
      {/* Subtle background rings */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #C73B22 0%, transparent 70%)' }} />
        <div className="absolute right-0 bottom-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #1B2E40 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-center">

          {/* ── LEFT: 3D illustration ── */}
          <motion.div
            initial={{ opacity: 0, x: -64 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative flex items-center justify-center order-2 lg:order-1"
          >
            {/* Glow halo behind image */}
            <div className="absolute inset-10 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #E5602A 0%, transparent 70%)' }} />

            {/* Floating 3D image */}
            <motion.img
              src={compliance3d}
              alt="Compliance Infrastructure"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-full max-w-[520px] drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 32px 48px rgba(199,59,34,0.15))' }}
            />

            {/* Floating badge — top right */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.5, type: 'spring', stiffness: 240, damping: 20 }}
              className="absolute top-6 right-4 lg:right-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-gray-100 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#FEF0EC' }}>
                <Shield size={18} className="text-[#C73B22]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#1A1A1A] leading-tight">AML / CFT Cleared</p>
                <p className="text-[10px] text-[#888880]">All participants screened</p>
              </div>
            </motion.div>

            {/* Floating badge — bottom left */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: -20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.5, type: 'spring', stiffness: 240, damping: 20 }}
              className="absolute bottom-8 left-0 lg:-left-6 bg-white rounded-2xl shadow-xl px-4 py-3 border border-gray-100 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#EFF6FF' }}>
                <CheckCircle2 size={18} className="text-[#1B2E40]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#1A1A1A] leading-tight">100% Audit Trail</p>
                <p className="text-[10px] text-[#888880]">Every event logged</p>
              </div>
            </motion.div>
          </motion.div>

          {/* ── RIGHT: Text content ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="order-1 lg:order-2"
          >
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C73B22]/30 mb-6"
              style={{ background: 'rgba(199,59,34,0.06)', color: '#A82D16', fontSize: '11px', fontWeight: 600 }}
            >
              <Shield size={12} /> Compliance Layer
            </motion.div>

            <motion.h2 variants={fadeUp}
              className="text-3xl sm:text-4xl xl:text-[2.6rem] font-bold text-[#1A1A1A] mb-5 leading-tight"
            >
              Compliance-First<br />
              <span style={{ color: '#C73B22' }}>Infrastructure</span>
            </motion.h2>

            <motion.p variants={fadeUp} className="text-[#666660] text-base sm:text-lg mb-10 leading-relaxed max-w-lg">
              Every transaction, participant, and document on Finatrades passes through multi-layer compliance checks — from identity verification to jurisdictional screening — before any trade is executed.
            </motion.p>

            <motion.div variants={stagger} className="space-y-4">
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-transparent transition-all duration-300 group cursor-default"
                  whileHover={{ borderColor: 'rgba(199,59,34,0.18)', backgroundColor: 'rgba(199,59,34,0.03)', x: 4 }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200 group-hover:bg-[#C73B22]"
                    style={{ background: 'rgba(199,59,34,0.1)' }}>
                    <f.icon size={16} className="text-[#C73B22] group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A] mb-1">{f.title}</p>
                    <p className="text-xs text-[#777770] leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-10 flex items-center gap-4">
              <a href="#contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
                style={{ background: 'linear-gradient(135deg, #C73B22, #E5602A)' }}
              >
                Talk to Compliance Team <ArrowRight size={14} />
              </a>
              <a href="#how-it-works"
                className="text-sm font-medium text-[#555550] hover:text-[#C73B22] transition-colors flex items-center gap-1.5"
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
        className={`relative bg-white rounded-2xl p-5 text-center cursor-pointer overflow-hidden ${
          highlight
            ? 'ring-2 ring-[#C73B22] ring-offset-2 ring-offset-[#F5E8E4]'
            : 'border border-gray-200'
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Gloss shine overlay */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity: hovered ? 1 : 0,
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.28) 0%, transparent 65%)`,
          }}
        />
        <div className="relative z-10">
          <div className="flex justify-center mb-3">{logo}</div>
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
          <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase text-[#C73B22] mb-3">The Ecosystem</motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
            A Connected Commodity Trade Ecosystem
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#666660] max-w-xl mx-auto">
            Finatrades operates as part of a broader institutional ecosystem under Raminvest Holding DIFC.
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
  return (
    <section id="contact" className="bg-white py-24">
      <AnimatedSection className="max-w-4xl mx-auto px-6 text-center">
        <motion.div variants={fadeUp}
          className="relative bg-gradient-to-br from-[#C73B22]/15 via-[#3D0E05]/10 to-[#E5602A]/8 border border-[#C73B22]/20 rounded-3xl p-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#C73B22]/5 to-transparent rounded-3xl" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
              Start Your Commodity Trade Journey
            </h2>
            <p className="text-[#555550] text-lg mb-10 max-w-2xl mx-auto">
              Whether you are a seller submitting goods on consignment, a buyer sourcing verified inventory,
              a government entity managing strategic barter, or a partner supporting logistics, finance,
              or warehousing — Finatrades gives you a structured digital gateway for trusted commodity trade execution.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/register?role=seller">
                <button className="px-6 py-3 bg-[#C73B22] hover:bg-[#A82D16] text-white font-semibold rounded-xl transition-all flex items-center gap-2">
                  Register as Seller <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/register?role=buyer">
                <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] font-semibold rounded-xl border border-gray-300 transition-colors">
                  Register as Buyer
                </button>
              </Link>
              <Link href="/register?rfq=true">
                <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] font-semibold rounded-xl border border-gray-300 transition-colors">
                  Submit Import Expression
                </button>
              </Link>
              <Link href="/register?role=government">
                <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-[#444440] font-semibold rounded-xl border border-gray-300 transition-colors">
                  Request Government Access
                </button>
              </Link>
            </div>
          </div>
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
              Digital gateway for commodity trade, inventory, settlement and trade finance.
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
