import { useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Building2, Shield, Globe, ArrowRight, Briefcase, TrendingUp, Lock, Users, CheckCircle } from 'lucide-react';
import FloatingAgentChat from '@/components/FloatingAgentChat';

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
          --blue-deep: #1E3A5F;
          --blue-light: #3B82F6;
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
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A1B]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold text-white">FINATRADES</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:text-amber-400">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-amber-900/10" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full mb-8">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">Enterprise Gold Solutions</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">Gold-Backed</span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                Trade Finance
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl">
              Enterprise-grade gold storage, trade finance solutions, and B2B payment infrastructure 
              for businesses worldwide. Secure, compliant, and built for scale.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-lg px-8">
                  Start Your Business Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="#solutions">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  View Solutions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Trust Indicators */}
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
      
      {/* Solutions Section */}
      <section id="solutions" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Enterprise Solutions</h2>
            <p className="text-xl text-gray-400">Comprehensive gold-backed financial services for your business</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
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
            ].map((solution, index) => (
              <div key={index} className="bg-[#12122B] rounded-2xl p-8 border border-white/10 hover:border-amber-500/30 transition-all group">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center mb-6 group-hover:from-amber-500/30 group-hover:to-amber-600/30 transition-all">
                  <solution.icon className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{solution.title}</h3>
                <p className="text-gray-400 leading-relaxed">{solution.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Why Finatrades */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#12122B] to-[#0A0A1B]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">Why Choose Finatrades?</h2>
              <p className="text-xl text-gray-400 mb-8">
                Built for enterprises that demand security, compliance, and reliability in their gold operations.
              </p>
              
              <div className="space-y-6">
                {[
                  "100% allocated physical gold storage",
                  "LBMA-accredited vault partners globally",
                  "Full regulatory compliance (AML/KYC)",
                  "24/7 enterprise support",
                  "API access for integration",
                  "Quarterly independent audits"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-white">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[#12122B] rounded-3xl p-8 border border-white/10">
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
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
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
              © 2026 Finatrades. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      <FloatingAgentChat />
    </div>
  );
}
