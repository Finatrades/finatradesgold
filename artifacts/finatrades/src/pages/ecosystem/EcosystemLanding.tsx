import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'wouter';
import {
  ArrowRight, Shield, Globe, Warehouse, Package, Search,
  CreditCard, Handshake, Settings, CheckCircle2, Menu, X,
  Building2, Users, Truck, BarChart3, Lock, FileText,
  ChevronDown, MapPin, Layers, Zap, TrendingUp, Scale
} from 'lucide-react';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';
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
        scrolled ? 'bg-[#0F0F0F]/95 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/30' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <img src={finatradesLogo} alt="Finatrades" className="h-8 w-auto" />
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href}
              className="px-3 py-1.5 text-sm text-white/70 hover:text-white rounded-md hover:bg-white/5 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link href="/login">
            <button className="px-4 py-2 text-sm text-white/80 hover:text-white transition-colors">Sign In</button>
          </Link>
          <Link href="/register">
            <button className="px-4 py-2 text-sm font-semibold bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-lg transition-colors">
              Get Started
            </button>
          </Link>
        </div>

        <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-[#0F0F0F]/98 backdrop-blur-xl border-t border-white/5 px-6 py-4 space-y-1">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm text-white/70 hover:text-white rounded-md hover:bg-white/5 transition-colors">
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-white/10 flex gap-3">
            <Link href="/login" className="flex-1">
              <button className="w-full px-4 py-2 text-sm text-white/80 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">Sign In</button>
            </Link>
            <Link href="/register" className="flex-1">
              <button className="w-full px-4 py-2 text-sm font-semibold bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors">Get Started</button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0F0F0F]">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#22C55E]/12 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#E8EAE4]/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#052E16]/8 rounded-full blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#4ADE80] text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
            Digital Commodity Trade Platform · 14 African Hubs
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
          Digital Gateway for{' '}
          <span className="bg-gradient-to-r from-[#22C55E] via-[#4ADE80] to-[#D4D4C0] bg-clip-text text-transparent">
            Commodity Trade,
          </span>
          <br />Inventory & Settlement
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
          Finatrades connects verified commodities, warehouse inventory, buyer payments, trade finance, and
          settlement workflows through one secure digital trade platform — from seller consignment to final payout.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap gap-3 justify-center mb-16">
          <Link href="/register?role=seller">
            <button className="px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-[#22C55E]/30 flex items-center gap-2">
              Register as Seller <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/register?role=buyer">
            <button className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-2">
              Register as Buyer <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/register?role=government">
            <button className="px-6 py-3 bg-[#E8EAE4]/10 hover:bg-[#E8EAE4]/15 text-[#D8D8C8] font-semibold rounded-xl border border-[#E8EAE4]/20 transition-colors flex items-center gap-2">
              Government Access <ArrowRight size={16} />
            </button>
          </Link>
          <a href="#how-it-works">
            <button className="px-6 py-3 text-white/60 hover:text-white font-medium rounded-xl transition-colors flex items-center gap-2">
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
            <div key={stat.label} className="bg-white/4 border border-white/8 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-white/50">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <ChevronDown size={20} className="text-white/30" />
        </motion.div>
      </div>
    </section>
  );
}

function PositioningSection() {
  return (
    <section className="bg-[#141414] py-20 border-y border-white/5">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            One Platform. Multiple Trade Roles. Complete Transaction Visibility.
          </h2>
          <p className="text-white/55 max-w-3xl mx-auto text-lg">
            Finatrades acts as the central digital gateway where users register, complete KYC/KYB, access verified
            inventory, submit RFQs, place orders, track warehouse consignments, manage settlement flows, and monitor
            trade execution from beginning to end.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Users, title: 'Exporters & Sellers', desc: 'Submit commodities on consignment, upload documents, track inspection, and list verified inventory on the marketplace.' },
            { icon: Building2, title: 'Importers & Buyers', desc: 'Browse verified stock, submit RFQs, compare offers, place orders, and track deal execution until delivery.' },
            { icon: Shield, title: 'Government Entities', desc: 'Strategic commodity sourcing, sovereign barter workflows, counterparty matching, and settlement support.' },
            { icon: Warehouse, title: 'Warehouse Partners', desc: 'Receive pre-arrival documents, confirm shipments, manage inspection, issue digital receipts, and confirm releases.' },
            { icon: TrendingUp, title: 'Finance Partners', desc: 'Review inventory-backed requests, approve trade finance, monitor escrow-style settlement, and release seller payouts.' },
            { icon: Truck, title: 'Logistics Partners', desc: 'Track shipments, manage customs readiness, update delivery milestones, and confirm final delivery conditions.' },
          ].map(({ icon: Icon, title, desc }) => (
            <motion.div key={title} variants={fadeUp}
              className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:bg-white/5 hover:border-white/12 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 flex items-center justify-center mb-4 group-hover:bg-[#22C55E]/25 transition-colors">
                <Icon size={18} className="text-[#4ADE80]" />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>
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

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-[#0F0F0F] py-24">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/8 text-[#4ADE80] text-xs font-medium mb-5">
            9-Step Trade Workflow
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How Finatrades Works</h2>
          <p className="text-white/50 max-w-2xl mx-auto">
            From the moment a seller submits a consignment to when a buyer receives their goods and a seller
            receives their payout — every stage is digitally connected.
          </p>
        </motion.div>

        <div className="space-y-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.num} variants={fadeUp}
                className="group relative bg-white/3 border border-white/8 rounded-2xl p-6 sm:p-8 hover:bg-white/5 hover:border-[#22C55E]/20 transition-all overflow-hidden">
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-8xl font-black text-white/[0.025] select-none pointer-events-none">
                  {step.num}
                </div>
                <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">
                  <div className="flex-shrink-0 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#22C55E]/20 to-[#052E16]/20 border border-[#22C55E]/20 flex items-center justify-center">
                      <Icon size={20} className="text-[#4ADE80]" />
                    </div>
                    <span className="text-xs font-bold text-[#4ADE80]/60 sm:hidden">Step {step.num}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-white font-semibold text-lg leading-snug">{step.title}</h3>
                      <span className="hidden sm:block flex-shrink-0 text-xs font-bold text-[#4ADE80]/50 mt-1">Step {step.num}</span>
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed mb-4">{step.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {step.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 text-xs bg-white/5 border border-white/8 text-white/60 rounded-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatedSection>
    </section>
  );
}

const AFRICA_HUBS = [
  'Senegal', 'Togo', 'Ghana', 'Nigeria', 'Cameroon', 'Congo', 'Angola',
  'South Africa', 'Kenya', 'Tanzania', 'Djibouti', 'Ivory Coast', 'Morocco', 'Egypt',
];

function MarketplaceSection() {
  return (
    <section id="marketplace" className="bg-[#141414] py-24 border-y border-white/5">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E8EAE4]/20 bg-[#E8EAE4]/8 text-[#D8D8C8] text-xs font-medium mb-5">
              <Globe size={12} />
              14 Strategic Hubs
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
              Verified Commodity Discovery Across 14 African Trade Hubs
            </h2>
            <p className="text-white/55 text-base leading-relaxed mb-8">
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
                  <CheckCircle2 size={16} className="text-[#4ADE80] flex-shrink-0 mt-0.5" />
                  <span className="text-white/65 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <Link href="/register">
              <button className="px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold rounded-xl transition-all flex items-center gap-2">
                Explore Marketplace <ArrowRight size={16} />
              </button>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            {AFRICA_HUBS.map((hub, i) => (
              <div key={hub}
                className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/6 hover:border-[#22C55E]/20 transition-all">
                <div className="w-2 h-2 rounded-full bg-[#22C55E] flex-shrink-0" />
                <span className="text-white/75 text-sm font-medium">{hub}</span>
                <MapPin size={12} className="text-white/25 ml-auto" />
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
    accent: '#4ADE80',
    accentBg: 'bg-[#22C55E]/10',
    accentBorder: 'border-[#22C55E]/25',
    accentText: 'text-[#4ADE80]',
    tabActiveBg: 'bg-[#22C55E]',
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
    ctaStyle: 'bg-[#22C55E] hover:bg-[#16A34A] text-white',
  },
  {
    key: 'buyers',
    tab: 'Importers & Buyers',
    icon: Search,
    accent: '#E8EAE4',
    accentBg: 'bg-[#E8EAE4]/10',
    accentBorder: 'border-[#E8EAE4]/20',
    accentText: 'text-[#D8D8C8]',
    tabActiveBg: 'bg-[#555550]',
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
    ctaStyle: 'bg-[#E8EAE4] hover:bg-[#D0D0C4] text-[#0F0F0F]',
  },
  {
    key: 'government',
    tab: 'Sovereign Access',
    icon: Shield,
    accent: '#34D399',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/25',
    accentText: 'text-emerald-400',
    tabActiveBg: 'bg-emerald-600',
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
    ctaStyle: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
];

function RolesSection() {
  const [active, setActive] = useState(0);
  const role = ROLES[active];
  const Icon = role.icon;

  return (
    <section id="for-sellers" className="bg-[#0F0F0F] py-24">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/8 text-[#4ADE80] text-xs font-medium mb-5">
            Platform Access by Role
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Who Is Finatrades For?</h2>
          <p className="text-white/50 max-w-2xl mx-auto">
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
                    : 'bg-white/4 border-white/8 text-white/55 hover:text-white hover:bg-white/8'
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
              <h3 className="text-3xl font-bold text-white mb-3 leading-tight">{role.title}</h3>
              <p className={`${role.accentText} font-medium mb-4 text-sm`}>{role.subtitle}</p>
              <p className="text-white/55 leading-relaxed mb-8">{role.desc}</p>
              <Link href={role.ctaHref}>
                <button className={`px-6 py-3 font-semibold rounded-xl transition-all flex items-center gap-2 ${role.ctaStyle}`}>
                  {role.cta} <ArrowRight size={16} />
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {role.features.map(f => (
                <div key={f} className={`flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3`}>
                  <CheckCircle2 size={14} className={`${role.accentText} flex-shrink-0`} />
                  <span className="text-white/70 text-sm">{f}</span>
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
    <section id="trade-finance" className="bg-[#0F0F0F] py-24">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E8EAE4]/20 bg-[#E8EAE4]/8 text-[#D8D8C8] text-xs font-medium mb-5">
            <Lock size={12} />
            Trade Finance & Escrow
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Controlled Settlement from Inventory Lock to Seller Payout
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto">
            Finatrades connects buyer payment, escrow-style controls, warehouse release, logistics confirmation,
            and seller payout into one structured transaction flow with full audit visibility.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div variants={fadeUp} className="space-y-3">
            <h3 className="text-white font-semibold text-lg mb-5">Core Settlement Rules</h3>
            {rules.map(({ rule, consequence }) => (
              <div key={rule} className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500/70" />
                  <span className="text-white/65 text-sm">{rule}</span>
                </div>
                <span className="text-xs font-semibold text-white/40 bg-white/5 px-3 py-1 rounded-lg">→ {consequence}</span>
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
              <div key={title} className="flex gap-4 bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-[#E8EAE4]/10 border border-[#D4D4C0]/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-[#D8D8C8]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">{title}</h4>
                  <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>
    </section>
  );
}

function ComplianceSection() {
  return (
    <section id="compliance" className="bg-[#0F0F0F] py-24">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            {[
              'KYC / KYB Onboarding',
              'AML Screening',
              'Sanctions Checks',
              'Role-Based Access',
              'Document Verification',
              'Audit Trail Recording',
              'Inventory Traceability',
              'Transaction Monitoring',
              'Partner Reporting',
              'Approval Workflows',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                <Shield size={13} className="text-[#4ADE80] flex-shrink-0" />
                <span className="text-white/70 text-sm">{item}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/8 text-[#4ADE80] text-xs font-medium mb-5">
              <Shield size={12} />
              Compliance-First Infrastructure
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
              Built for Compliance, Traceability and Scalable Commodity Trade
            </h2>
            <p className="text-white/55 leading-relaxed mb-6">
              The Finatrades backend connects onboarding, inventory, marketplace, payments, trade finance,
              escrow, settlement, reporting, and partner integrations into one secure digital infrastructure —
              designed with compliance and auditability at the core.
            </p>
            <div className="p-5 bg-[#22C55E]/8 border border-[#22C55E]/15 rounded-2xl">
              <p className="text-white/50 text-sm leading-relaxed italic">
                "Access to platform services may be subject to user eligibility, jurisdictional requirements,
                partner approval, compliance checks, and applicable laws. Finatrades does not provide investment
                advice, public token issuance, deposit-taking services, or regulated financial services unless
                specifically authorized through the relevant licensed entity or approved partner arrangement."
              </p>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>
    </section>
  );
}

function BackendSection() {
  const layers = [
    { icon: Users, label: 'User Access Layer' },
    { icon: Shield, label: 'Identity & Compliance Layer' },
    { icon: FileText, label: 'Document Service' },
    { icon: Warehouse, label: 'Inventory & Consignment Engine' },
    { icon: Search, label: 'Marketplace Connector' },
    { icon: Package, label: 'Buyer Order Engine' },
    { icon: CreditCard, label: 'WINVESTNET Wallet Connector' },
    { icon: TrendingUp, label: 'Trade Finance Engine' },
    { icon: Lock, label: 'Escrow & Settlement Engine' },
    { icon: BarChart3, label: 'Audit & Reporting Layer' },
    { icon: Zap, label: 'Notifications & API Orchestration' },
    { icon: Layers, label: 'Infrastructure & Data Layer' },
  ];

  return (
    <section className="bg-[#141414] py-24 border-y border-white/5">
      <AnimatedSection className="max-w-7xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/8 text-[#4ADE80] text-xs font-medium mb-5">
            System Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            12-Layer Digital Trade Infrastructure
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto">
            Every user, document, inventory record, order, payment, warehouse release, logistics update,
            and settlement event is traceable and auditable across the full system stack.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {layers.map(({ icon: Icon, label }, i) => (
            <motion.div key={label} variants={fadeUp}
              className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col items-center gap-3 text-center hover:bg-white/5 hover:border-[#22C55E]/20 transition-all">
              <div className="w-9 h-9 rounded-lg bg-[#22C55E]/12 flex items-center justify-center">
                <Icon size={16} className="text-[#4ADE80]" />
              </div>
              <span className="text-white/65 text-xs font-medium leading-snug">{label}</span>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>
    </section>
  );
}

function CTASection() {
  return (
    <section id="contact" className="bg-[#0F0F0F] py-24">
      <AnimatedSection className="max-w-4xl mx-auto px-6 text-center">
        <motion.div variants={fadeUp}
          className="relative bg-gradient-to-br from-[#22C55E]/15 via-[#052E16]/10 to-[#D4D4C0]/8 border border-[#22C55E]/20 rounded-3xl p-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E]/5 to-transparent rounded-3xl" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Start Your Commodity Trade Journey
            </h2>
            <p className="text-white/55 text-lg mb-10 max-w-2xl mx-auto">
              Whether you are a seller submitting goods on consignment, a buyer sourcing verified inventory,
              a government entity managing strategic barter, or a partner supporting logistics, finance,
              or warehousing — Finatrades gives you a structured digital gateway for trusted commodity trade execution.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/register?role=seller">
                <button className="px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold rounded-xl transition-all flex items-center gap-2">
                  Register as Seller <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/register?role=buyer">
                <button className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-colors">
                  Register as Buyer
                </button>
              </Link>
              <Link href="/register?rfq=true">
                <button className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-colors">
                  Submit Import Expression
                </button>
              </Link>
              <Link href="/register?role=government">
                <button className="px-6 py-3 bg-[#E8EAE4]/10 hover:bg-[#E8EAE4]/15 text-[#D8D8C8] font-semibold rounded-xl border border-[#E8EAE4]/20 transition-colors">
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
    <footer className="bg-[#0A0A0A] border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 sm:col-span-1">
            <img src={finatradesLogo} alt="Finatrades" className="h-7 w-auto mb-3" />
            <p className="text-white/40 text-sm leading-relaxed">
              Digital gateway for commodity trade, inventory, settlement and trade finance.
            </p>
          </div>
          <div>
            <h4 className="text-white/70 font-semibold text-sm mb-3">Platform</h4>
            <div className="space-y-2">
              {['How It Works', 'Marketplace', 'Seller Consignment', 'Buyer Flow'].map(l => (
                <div key={l}><a href="#how-it-works" className="text-white/40 hover:text-white/70 text-sm transition-colors">{l}</a></div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white/70 font-semibold text-sm mb-3">Services</h4>
            <div className="space-y-2">
              {['Warehouse Inventory', 'Trade Finance', 'Government Barter', 'Compliance'].map(l => (
                <div key={l}><a href="#trade-finance" className="text-white/40 hover:text-white/70 text-sm transition-colors">{l}</a></div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white/70 font-semibold text-sm mb-3">Legal</h4>
            <div className="space-y-2">
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms & Conditions', href: '/terms' },
                { label: 'Disclaimer', href: '/disclaimer' },
                { label: 'Sign In', href: '/login' },
              ].map(({ label, href }) => (
                <div key={label}><Link href={href} className="text-white/40 hover:text-white/70 text-sm transition-colors">{label}</Link></div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} Finatrades. All rights reserved.</p>
          <p className="text-white/25 text-xs text-center">
            Finatrades connects verified commodities, warehouse inventory, buyer payments, trade finance, and settlement workflows through one secure digital trade platform.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function EcosystemLanding() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white antialiased overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <PositioningSection />
      <HowItWorksSection />
      <MarketplaceSection />
      <RolesSection />
      <SettlementSection />
      <BackendSection />
      <ComplianceSection />
      <CTASection />
      <Footer />
      <FloatingAgentChat />
    </div>
  );
}
