import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Vault, Wallet, TrendingUp, Globe, ArrowRight, Shield, Zap, Clock, 
  Building2, User, FileCheck, Award, BarChart3, Lock,
  Users, FileText, Landmark, CheckCircle2
} from 'lucide-react';
import FinatradesLogo from '@/components/FinatradesLogo';

export default function Home() {
  const { accountType, setAccountType } = useAccountType();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    accountType: 'business',
    message: ''
  });

  const personalProducts = [
    {
      icon: <Vault className="w-8 h-8" />,
      title: 'Deposit / Buy Gold',
      description: 'Get instant value and turn into a settlement financial instrument with your choice of hedging or floating strategies as your business grows.',
      link: '/finavault',
      cta: 'Explore FinaVault'
    },
    {
      icon: <Wallet className="w-8 h-8" />,
      title: 'Payments & Transfers',
      description: 'Send and receive payments through the platform, manage your wallet and spend anywhere using your gold-backed debit card.',
      link: '/finapay',
      cta: 'Explore FinaPay Wallet'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Buy 'N' SeLL Gold Plans",
      description: 'Get substantial margins and guaranteed returns thanks to our BNSL Plans.',
      link: '/bnsl',
      cta: 'Explore BNSL'
    }
  ];

  const businessProducts = [
    {
      icon: <Vault className="w-8 h-8" />,
      title: 'Deposit/Buy Gold',
      description: 'Secure physical gold storage with digital ownership certificates',
      link: '/finavault',
      cta: 'Explore FinaVault'
    },
    {
      icon: <Wallet className="w-8 h-8" />,
      title: 'Payments & Transfers',
      description: 'Digital gold wallet for seamless transactions and payments',
      link: '/finapay',
      cta: 'Explore FinaPay Wallet'
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'Global Trade Monitoring',
      description: 'Trade finance solutions for importers and exporters',
      link: '/finabridge',
      cta: 'Explore FinaBridge'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Buy 'N' Sell Gold Plans",
      description: 'Lock in today\'s gold price with structured BNSL plans',
      link: '/bnsl',
      cta: 'Explore BNSL'
    }
  ];

  const products = accountType === 'personal' ? personalProducts : businessProducts;

  const personalWorkflowSteps = [
    { number: 1, title: 'Create Your Account', description: 'Register as an Individual and start your personal gold account.' },
    { number: 2, title: 'Verify Your Identity', description: 'Complete Swiss-aligned KYC verification securely.' },
    { number: 3, title: 'Deposit or Buy Gold', description: 'Deposit physical gold via partners or buy new gold on-platform (where available).' },
    { number: 4, title: 'Secure Vault Storage', description: 'Your gold is stored in approved, regulated vaults with full documentation.' },
    { number: 5, title: 'Track Your Gold 24/7', description: 'See grams, estimated value, and certificates in real time.' },
    { number: 6, title: 'Optional: Join Holding Plans', description: 'Lock gold into structured holding plans for defined durations.' },
  ];

  const businessWorkflowSteps = [
    { number: 1, title: 'Register Corporate Profile', description: 'Set up your business account' },
    { number: 2, title: 'KYB & Compliance Review', description: 'Complete business verification' },
    { number: 3, title: 'Establish Gold Reserve Account', description: 'Create your gold reserve' },
    { number: 4, title: 'Buy/Deposit Physical Gold', description: 'Add gold to your account' },
    { number: 5, title: 'Receive Holding Certificates', description: 'Get certified documentation' },
    { number: 6, title: 'Use Gold for Trade & Treasury', description: 'Utilize gold for operations' },
    { number: 7, title: 'Reporting & Audit Controls', description: 'Access full reporting' },
  ];

  const workflowSteps = accountType === 'personal' ? personalWorkflowSteps : businessWorkflowSteps;

  const bnslPlans = [
    { duration: 12, returns: '~10%', price: '5,000', minInvestment: '5,000 CHF' },
    { duration: 24, returns: '~11%', price: '10,000', minInvestment: '10,000 CHF' },
    { duration: 36, returns: '~12%', price: '25,000', minInvestment: '25,000 CHF' },
  ];

  const advantages = [
    { icon: <Shield className="w-6 h-6" />, title: 'Swiss Regulation', description: 'Fully compliant with Swiss financial regulations and standards' },
    { icon: <Lock className="w-6 h-6" />, title: 'Secure Storage', description: 'Physical gold stored in fully insured Swiss vaults' },
    { icon: <Zap className="w-6 h-6" />, title: 'Instant Transactions', description: 'Buy, sell, and transfer gold instantly with low fees' },
    { icon: <Clock className="w-6 h-6" />, title: '24/7 Access', description: 'Manage your gold holdings anytime, anywhere' },
    { icon: <Users className="w-6 h-6" />, title: 'Dedicated Support', description: 'Enterprise-grade support for all your needs' },
    { icon: <BarChart3 className="w-6 h-6" />, title: 'Transparent Reporting', description: 'Real-time reporting and audit controls' },
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form submitted:', formData);
  };

  return (
    <Layout>
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-white via-purple-50/30 to-white" data-testid="section-hero">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-40 left-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-pink-300 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 container mx-auto px-6 py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E91E8C]/10 to-[#9333EA]/10 border border-[#E91E8C]/20 rounded-full px-4 py-2 mb-6">
                <CheckCircle2 className="w-4 h-4 text-[#E91E8C]" />
                <span className="text-sm font-medium text-[#7C3AED]">Swiss-Regulated Platform</span>
              </div>

              <div className="flex items-center p-1 rounded-full border border-gray-200 bg-white w-fit mb-8">
                <button
                  onClick={() => setAccountType('personal')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                    accountType === 'personal' 
                      ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  data-testid="hero-toggle-personal"
                >
                  <User className="w-4 h-4" />
                  Personal
                </button>
                <button
                  onClick={() => setAccountType('business')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                    accountType === 'business' 
                      ? 'bg-gradient-to-r from-[#E91E8C] to-[#9333EA] text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  data-testid="hero-toggle-business"
                >
                  <Building2 className="w-4 h-4" />
                  Business
                </button>
              </div>

              <h1 
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight"
                data-testid="text-hero-title"
              >
                Finatrades
              </h1>
              <h2 
                className="text-2xl md:text-3xl font-semibold text-gray-700 mb-6"
                data-testid="text-hero-subtitle"
              >
                {accountType === 'business' 
                  ? 'Regulated Gold-Backed Financial Infrastructure'
                  : 'Digital Gold, Designed for Everyday People'}
              </h2>
              <p 
                className="text-lg md:text-xl text-gray-600 mb-4 max-w-xl"
                data-testid="text-hero-description"
              >
                {accountType === 'business' 
                  ? 'Designed for corporates, importers, exporters, trading houses, and institutional partners.'
                  : 'Save, store, and use real gold value through a secure, modern online account.'}
              </p>
              <p 
                className="text-base text-gray-500 mb-10 max-w-xl"
                data-testid="text-hero-partnership"
              >
                {accountType === 'business' 
                  ? <>Thanks to a strategic partnership with <span className="font-semibold text-[#7C3AED]">Wingold and Metals DMCC</span>, Finatrades transforms physical gold into settlement-ready financial instruments.</>
                  : <>Finatrades gives you the power of gold — send, receive, spend anywhere, and earn more through <span className="font-semibold text-[#7C3AED]">BNSL</span>. Join structured plans — lock gold into structured buy back plans for defined durations.</>}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button 
                    variant="outline"
                    size="lg" 
                    className="rounded-full border-gray-300 px-8"
                    data-testid="button-hero-signin"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-[#E91E8C] to-[#9333EA] hover:opacity-90 text-white px-8 rounded-full"
                    data-testid="button-get-started"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <motion.div
                initial={{ opacity: 0, y: 20, rotateY: -15 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ duration: 1, delay: 0.2, type: "spring" }}
                className="relative perspective-1000"
              >
                <div className="relative w-full max-w-md mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E91E8C]/30 to-[#9333EA]/30 rounded-3xl blur-3xl animate-pulse" />
                  
                  <motion.div
                    animate={{ 
                      rotateY: [0, 5, 0, -5, 0],
                      rotateX: [0, 2, 0, -2, 0]
                    }}
                    transition={{ 
                      duration: 6, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="relative"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="relative aspect-[1.586/1] bg-gradient-to-br from-[#1a0a2e] via-[#2d1a4a] to-[#0D001E] rounded-2xl p-6 shadow-2xl overflow-hidden border border-[#E91E8C]/20">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNFOTFFOEMiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
                      
                      <motion.div 
                        className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-[#E91E8C]/20 to-transparent rounded-full blur-2xl"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      />
                      <motion.div 
                        className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-[#9333EA]/20 to-transparent rounded-full blur-2xl"
                        animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      />

                      <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <FinatradesLogo variant="white" size="sm" />
                          <div className="flex flex-col items-end">
                            <span className="text-[#D4A020] text-xs font-semibold">GOLD CARD</span>
                            <span className="text-gray-400 text-[10px]">PREMIUM</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <motion.div 
                            className="w-12 h-10 bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] rounded-md flex items-center justify-center"
                            animate={{ opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <div className="w-8 h-6 border-2 border-[#B8860B] rounded-sm" />
                          </motion.div>
                          <div className="flex gap-1">
                            <motion.div 
                              className="w-6 h-6 rounded-full border-2 border-white/30"
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="text-white/60 text-xs mb-1 tracking-widest">CARD NUMBER</div>
                          <div className="text-white font-mono text-lg tracking-[0.3em]">
                            •••• •••• •••• 4582
                          </div>
                        </div>

                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-white/60 text-[10px] mb-0.5">CARD HOLDER</div>
                            <div className="text-white font-medium text-sm">GOLD MEMBER</div>
                          </div>
                          <div className="text-right">
                            <div className="text-white/60 text-[10px] mb-0.5">VALID THRU</div>
                            <div className="text-white font-medium text-sm">12/28</div>
                          </div>
                          <div className="flex">
                            <div className="w-8 h-8 rounded-full bg-[#EB001B] opacity-80" />
                            <div className="w-8 h-8 rounded-full bg-[#F79E1B] opacity-80 -ml-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 bg-[#1a0a2e]/80 backdrop-blur-sm rounded-2xl p-4 border border-[#E91E8C]/10"
                  >
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Vault Balance</div>
                        <div className="text-white font-bold text-lg">100g</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Wallet</div>
                        <div className="text-white font-bold text-lg">25.5g</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">BNSL Plans</div>
                        <div className="text-white font-bold text-lg">2 Active</div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="py-24 bg-white" data-testid="section-products">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-[#E91E8C] text-sm font-semibold tracking-wider uppercase mb-4">
              {accountType === 'business' ? 'BUSINESS ECOSYSTEM' : 'OUR PRODUCTS'}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {accountType === 'business' 
                ? 'A Structured Ecosystem for High-Trust Business Transactions'
                : 'Gold-Backed Financial Solutions'}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Comprehensive solutions designed for the modern investor and enterprise
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white"
                  data-testid={`card-product-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E91E8C]/10 to-[#9333EA]/10 flex items-center justify-center mb-6 group-hover:from-[#E91E8C]/20 group-hover:to-[#9333EA]/20 transition-colors">
                      <div className="text-[#E91E8C]">{product.icon}</div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.title}</h3>
                    <p className="text-gray-500 text-sm mb-4">{product.description}</p>
                    <Link href={product.link}>
                      <Button variant="ghost" className="p-0 h-auto text-[#E91E8C] hover:text-[#9333EA] font-medium group/btn">
                        {product.cta}
                        <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 bg-gradient-to-b from-purple-50/50 to-white" data-testid="section-how-it-works">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-[#E91E8C] text-sm font-semibold tracking-wider uppercase mb-4">
              ENTERPRISE WORKFLOW
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              A streamlined process designed for enterprise compliance and efficiency
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-[#E91E8C] to-[#9333EA] -translate-y-1/2 rounded-full" style={{ top: '40px' }} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center relative"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#E91E8C] to-[#9333EA] flex items-center justify-center mb-4 relative z-10 shadow-lg">
                    <div className="text-white font-bold text-xl">{step.number}</div>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">{step.title}</h4>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/register">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-[#E91E8C] to-[#9333EA] hover:opacity-90 text-white rounded-full px-8"
                data-testid="button-explore-business"
              >
                Explore Business Platform
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white" data-testid="section-bnsl">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-[#E91E8C] text-sm font-semibold tracking-wider uppercase mb-4">
              STRUCTURED BNSL PLANS
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Buy Now, Sell Later
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Lock in today's gold price and benefit from structured returns
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {bnslPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`h-full border-2 transition-all duration-300 hover:shadow-xl ${
                    index === 1 ? 'border-[#E91E8C] shadow-lg scale-105' : 'border-gray-200'
                  }`}
                  data-testid={`card-bnsl-${plan.duration}`}
                >
                  <CardContent className="p-8 text-center">
                    {index === 1 && (
                      <div className="inline-block bg-gradient-to-r from-[#E91E8C] to-[#9333EA] text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                        MOST POPULAR
                      </div>
                    )}
                    <div className="text-4xl font-bold text-gray-900 mb-2">{plan.duration}</div>
                    <div className="text-gray-500 text-sm mb-6">Months</div>
                    <div className="text-3xl font-bold text-[#E91E8C] mb-2">{plan.returns}</div>
                    <div className="text-gray-500 text-sm mb-6">Expected Returns</div>
                    <div className="text-sm text-gray-600 mb-6">Min. Investment: {plan.minInvestment}</div>
                    <Link href="/bnsl">
                      <Button 
                        className={`w-full rounded-full ${
                          index === 1 
                            ? 'bg-gradient-to-r from-[#E91E8C] to-[#9333EA] text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Learn More
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-24 bg-gradient-to-b from-purple-50/50 to-white" data-testid="section-about">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-[#E91E8C] text-sm font-semibold tracking-wider uppercase mb-4">
              WHY CHOOSE US
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The Finatrades Advantage
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Swiss-regulated, secure, and designed for enterprise excellence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {advantages.map((advantage, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6"
                data-testid={`advantage-${index}`}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E91E8C]/10 to-[#9333EA]/10 flex items-center justify-center mx-auto mb-4">
                  <div className="text-[#E91E8C]">{advantage.icon}</div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {advantage.title}
                </h3>
                <p className="text-gray-600">
                  {advantage.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 bg-white" data-testid="section-contact">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-[#E91E8C] text-sm font-semibold tracking-wider uppercase mb-4">
                CONTACT US
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Get in Touch
              </h2>
              <p className="text-gray-600 text-lg">
                Have questions? We'd love to hear from you.
              </p>
            </div>

            <Card className="border-0 shadow-xl">
              <CardContent className="p-8">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <Input 
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="rounded-lg"
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <Input 
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="rounded-lg"
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                      <Input 
                        placeholder="Company Name"
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        className="rounded-lg"
                        data-testid="input-contact-company"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                      <select 
                        value={formData.accountType}
                        onChange={(e) => setFormData({...formData, accountType: e.target.value})}
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                        data-testid="select-contact-account-type"
                      >
                        <option value="personal">Personal</option>
                        <option value="business">Business</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <Textarea 
                      placeholder="How can we help you?"
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      rows={4}
                      className="rounded-lg"
                      data-testid="textarea-contact-message"
                    />
                  </div>
                  <Button 
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-[#E91E8C] to-[#9333EA] hover:opacity-90 text-white rounded-full"
                    data-testid="button-contact-submit"
                  >
                    Send Message
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#E91E8C] to-[#9333EA]" data-testid="section-cta">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Your Gold Journey?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of investors and enterprises who trust us with their gold investments
          </p>
          <Link href="/register">
            <Button 
              size="lg" 
              className="bg-white text-[#E91E8C] hover:bg-gray-100 px-10 py-6 text-lg font-semibold rounded-full"
              data-testid="button-cta-register"
            >
              Create Your Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
