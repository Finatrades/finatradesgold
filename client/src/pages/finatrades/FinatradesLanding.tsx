import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Building2, Shield, Globe, ArrowRight, Briefcase, TrendingUp, Lock, Users, CheckCircle, 
  Menu, X, Phone, Vault, CreditCard, BarChart3, FileCheck, Truck, Scale, ChevronRight,
  Mail, MapPin, Clock, Award, Zap, Target, DollarSign, Layers
} from 'lucide-react';
import FloatingAgentChat from '@/components/FloatingAgentChat';
import finatradesLogo from '@/assets/finatrades-logo.png';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Solutions', href: '#solutions' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#0A0A1B]/95 backdrop-blur-xl shadow-lg shadow-amber-900/10' 
          : 'bg-[#0A0A1B]/90 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <a href="#home" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold text-white">FINATRADES</span>
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link 
              href="/login"
              className="text-white hover:text-white/80 px-4 py-2 text-sm font-medium transition-colors border border-white/30 rounded-full hover:bg-white/10"
            >
              Sign In
            </Link>
            <Link 
              href="/register"
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-black px-5 py-2 rounded-full text-sm font-semibold hover:from-amber-600 hover:to-amber-700 transition-all"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-white p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:bg-white/10 transition-colors"
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
                    className="px-4 py-4 min-h-[48px] rounded-lg text-base font-medium text-white/80 hover:text-white active:bg-white/10 transition-all flex items-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <Link 
                  href="/login"
                  className="block border border-white/30 text-white px-6 py-4 min-h-[52px] rounded-full text-base font-semibold w-full mt-3 text-center"
                >
                  Sign In
                </Link>
                <Link 
                  href="/register"
                  className="block bg-gradient-to-r from-amber-500 to-amber-600 text-black px-6 py-4 min-h-[52px] rounded-full text-base font-semibold w-full text-center"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

function Hero() {
  const [showRegulatory, setShowRegulatory] = useState(false);

  return (
    <>
      <AnimatePresence>
        {showRegulatory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRegulatory(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Trusted & Regulated</h3>
                    <p className="text-xs text-gray-500">Complete Regulatory Information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegulatory(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-base">About Finatrades Finance SA</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Full Legal Name</p>
                        <p className="text-gray-900 font-medium">Finatrades Finance SA</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Website</p>
                        <p className="text-gray-900 font-medium">finatrades.com</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs">Registered Office</p>
                        <p className="text-gray-900 font-medium">Rue Robert-CÉARD 6, 1204, GENEVA</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Company Number (UID)</p>
                        <p className="text-gray-900 font-medium">CHE-422.960.092</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">SO-FIT Member No.</p>
                        <p className="text-gray-900 font-medium">1186</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Finatrades Finance SA is an authorized member of SO-FIT, subject to supervision by FINMA. 
                    All activities comply with Swiss Federal Anti-Money Laundering Act (AMLA) and international regulations.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section id="home" className="relative min-h-screen pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A1B] via-[#0D0D1F] to-[#12122B]" />
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-200px)]">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.div variants={itemVariants}>
                <button 
                  onClick={() => setShowRegulatory(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 text-sm font-medium">Enterprise Gold Solutions</span>
                </button>
              </motion.div>

              <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="text-white">Gold-Backed</span>
                <br />
                <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                  Trade Finance
                </span>
              </motion.h1>

              <motion.p variants={itemVariants} className="text-xl text-gray-400 leading-relaxed max-w-2xl">
                Enterprise-grade gold storage, trade finance solutions, and B2B payment infrastructure 
                for businesses worldwide. Secure, compliant, and built for scale.
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/register">
                  <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-lg px-8">
                    Start Your Business Account
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <a href="#solutions">
                  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    View Solutions
                  </Button>
                </a>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="relative"
              >
                <div className="w-[400px] h-[260px] mx-auto rounded-3xl bg-gradient-to-br from-[#1a1a30] via-[#0f0f1f] to-[#0a0a15] border-2 border-amber-500/40 p-5 shadow-2xl shadow-amber-500/20 relative overflow-hidden">
                  <motion.div
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
                    className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                  />
                  
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-lg">✦</span>
                      <span className="text-white font-bold text-lg tracking-wide">FINA<span className="text-amber-400">TRADES</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-green-400 font-bold uppercase px-3 py-1 bg-green-400/15 rounded-full border border-green-400/30">Active</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-5 relative z-10">
                    <div className="w-12 h-9 rounded-md bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 flex flex-col justify-center gap-[2px] py-2">
                        <div className="h-[2px] bg-amber-700/60 mx-1.5" />
                        <div className="h-[2px] bg-amber-700/60 mx-1.5" />
                        <div className="h-[2px] bg-amber-700/60 mx-1.5" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-white font-semibold text-sm tracking-wide">ENTERPRISE GOLD</span>
                      </div>
                      <p className="text-gray-400 text-[10px] tracking-wider mt-0.5">GOLD-BACKED DIGITAL</p>
                    </div>
                  </div>
                  
                  <div className="mb-5 relative z-10">
                    <p className="text-white text-2xl tracking-[0.15em] font-medium">
                      5892 <span className="text-white/60">••••</span> <span className="text-white/60">••••</span> 7821
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-end relative z-10">
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Account Holder</p>
                      <p className="text-white text-sm font-semibold">FINATRADES CORPORATE</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Valid Thru</p>
                      <p className="text-white text-sm font-semibold">12/28</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}

function TrustStrip() {
  return (
    <section className="py-12 px-6 border-y border-white/10 bg-[#12122B]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-amber-400">$2B+</p>
            <p className="text-sm text-gray-400 mt-1">Trade Volume</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-400">500+</p>
            <p className="text-sm text-gray-400 mt-1">Enterprise Clients</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-400">15+</p>
            <p className="text-sm text-gray-400 mt-1">Countries</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-400">99.9%</p>
            <p className="text-sm text-gray-400 mt-1">Uptime SLA</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Solutions() {
  const solutions = [
    {
      icon: Vault,
      title: "FinaVault Business",
      description: "Institutional-grade gold storage with full insurance, audit trails, and allocated storage in LBMA-accredited vaults worldwide."
    },
    {
      icon: Briefcase,
      title: "FinaBridge Trade Finance",
      description: "Gold-backed trade finance solutions including Letters of Credit, invoice financing, and supply chain funding."
    },
    {
      icon: Globe,
      title: "B2B Gold Payments",
      description: "Send and receive gold payments globally with instant settlement, competitive fees, and full compliance."
    },
    {
      icon: TrendingUp,
      title: "Corporate Treasury",
      description: "Diversify your corporate treasury with physical gold holdings managed through our secure digital platform."
    },
    {
      icon: Lock,
      title: "Collateral Management",
      description: "Use your gold holdings as collateral for credit facilities, trading margins, and business financing."
    },
    {
      icon: Users,
      title: "Multi-User Access",
      description: "Enterprise account management with role-based permissions, approval workflows, and comprehensive audit logs."
    }
  ];

  return (
    <section id="solutions" className="py-24 px-6 bg-[#0A0A1B]">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">Enterprise Solutions</h2>
          <p className="text-xl text-gray-400">Comprehensive gold-backed financial services for your business</p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {solutions.map((solution, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#12122B] rounded-2xl p-8 border border-white/10 hover:border-amber-500/30 transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center mb-6 group-hover:from-amber-500/30 group-hover:to-amber-600/30 transition-all">
                <solution.icon className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{solution.title}</h3>
              <p className="text-gray-400 leading-relaxed">{solution.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: FileCheck,
      title: "Apply & Verify",
      description: "Complete your business KYC with our streamlined onboarding process. Get verified within 48 hours."
    },
    {
      icon: DollarSign,
      title: "Fund Your Account",
      description: "Deposit funds via bank transfer or crypto. Convert to gold at live market rates."
    },
    {
      icon: Vault,
      title: "Store & Trade",
      description: "Your gold is securely stored in LBMA vaults. Trade, transfer, or use as collateral anytime."
    },
    {
      icon: BarChart3,
      title: "Grow & Scale",
      description: "Access trade finance, earn with BNSL plans, and scale your gold-backed operations globally."
    }
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 bg-gradient-to-b from-[#0A0A1B] to-[#12122B]">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-xl text-gray-400">Get started with enterprise gold solutions in four simple steps</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
                  <step.icon className="w-8 h-8 text-black" />
                </div>
                <div className="absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-amber-500/50 to-transparent hidden lg:block" style={{ display: index === 3 ? 'none' : undefined }} />
                <span className="text-amber-400 text-sm font-bold mb-2">Step {index + 1}</span>
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyFinatrades() {
  const features = [
    "100% allocated physical gold storage",
    "LBMA-accredited vault partners globally",
    "Full regulatory compliance (AML/KYC)",
    "24/7 enterprise support",
    "API access for integration",
    "Quarterly independent audits"
  ];

  return (
    <section id="about" className="py-24 px-6 bg-[#12122B]">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">Why Choose Finatrades?</h2>
            <p className="text-xl text-gray-400 mb-8">
              Built for enterprises that demand security, compliance, and reliability in their gold operations.
            </p>
            
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-white">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#0A0A1B] rounded-3xl p-8 border border-white/10"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Request a Demo</h3>
            <p className="text-gray-400 mb-8">
              Schedule a personalized demo with our enterprise team to learn how Finatrades can transform your business.
            </p>
            <Link href="/register">
              <Button size="lg" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold">
                Get Started Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="py-24 px-6 bg-[#0A0A1B]">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">Get in Touch</h2>
          <p className="text-xl text-gray-400">Our enterprise team is ready to help you get started</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Mail, title: "Email", value: "enterprise@finatrades.com", href: "mailto:enterprise@finatrades.com" },
            { icon: Phone, title: "Phone", value: "+41 22 123 4567", href: "tel:+41221234567" },
            { icon: MapPin, title: "Office", value: "Geneva, Switzerland", href: "#" }
          ].map((contact, index) => (
            <motion.a
              key={index}
              href={contact.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#12122B] rounded-2xl p-8 border border-white/10 hover:border-amber-500/30 transition-all text-center group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center mx-auto mb-4 group-hover:from-amber-500/30 group-hover:to-amber-600/30 transition-all">
                <contact.icon className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{contact.title}</h3>
              <p className="text-gray-400">{contact.value}</p>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/10 bg-[#0A0A1B]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold text-white">FINATRADES</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link>
          </div>
          
          <p className="text-sm text-gray-500">
            © 2026 Finatrades Finance SA. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function FinatradesLanding() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.documentElement.style.setProperty('--motion-duration', '0.01ms');
    }
  }, []);

  return (
    <div className="finatrades-landing min-h-screen bg-[#0A0A1B] text-white antialiased selection:bg-amber-500 selection:text-black overflow-x-hidden">
      <style>{`
        .finatrades-landing {
          --gold: #D4AF37;
          --gold-bright: #FFD700;
          --amber: #F59E0B;
          --amber-dark: #D97706;
          --dark-bg: #0A0A1B;
          --dark-card: #12122B;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        
        .finatrades-landing::-webkit-scrollbar {
          display: none;
        }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>
      
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <Solutions />
        <HowItWorks />
        <WhyFinatrades />
        <ContactSection />
      </main>
      <Footer />
      <FloatingAgentChat />
    </div>
  );
}
