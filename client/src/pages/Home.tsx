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
    { icon: <Vault className="w-6 h-6" />, title: 'Deposit / Buy Gold', description: 'Secure physical gold storage with digital ownership.', link: '/finavault', cta: 'FinaVault' },
    { icon: <Wallet className="w-6 h-6" />, title: 'Payments & Transfers', description: 'Send, receive, and spend using your gold-backed wallet.', link: '/finapay', cta: 'FinaPay' },
    { icon: <TrendingUp className="w-6 h-6" />, title: "Buy 'N' Sell Plans", description: 'Structured BNSL plans with guaranteed returns.', link: '/bnsl', cta: 'BNSL' }
  ];

  const businessProducts = [
    { icon: <Vault className="w-6 h-6" />, title: 'Deposit/Buy Gold', description: 'Secure physical gold storage with certificates.', link: '/finavault', cta: 'FinaVault' },
    { icon: <Wallet className="w-6 h-6" />, title: 'Payments & Transfers', description: 'Digital gold wallet for seamless transactions.', link: '/finapay', cta: 'FinaPay' },
    { icon: <Globe className="w-6 h-6" />, title: 'Trade Finance', description: 'Solutions for importers and exporters.', link: '/finabridge', cta: 'FinaBridge' },
    { icon: <TrendingUp className="w-6 h-6" />, title: "BNSL Plans", description: 'Lock in gold price with structured plans.', link: '/bnsl', cta: 'BNSL' }
  ];

  const products = accountType === 'personal' ? personalProducts : businessProducts;

  const workflowSteps = accountType === 'personal' 
    ? [
        { icon: <User className="w-5 h-5" />, title: 'Create Account', desc: 'Register as an individual' },
        { icon: <FileCheck className="w-5 h-5" />, title: 'Verify Identity', desc: 'Complete KYC verification' },
        { icon: <Vault className="w-5 h-5" />, title: 'Buy/Deposit Gold', desc: 'Add gold to your account' },
        { icon: <Wallet className="w-5 h-5" />, title: 'Use Your Gold', desc: 'Send, spend, or invest' },
      ]
    : [
        { icon: <Building2 className="w-5 h-5" />, title: 'Register Business', desc: 'Set up corporate profile' },
        { icon: <FileCheck className="w-5 h-5" />, title: 'KYB Verification', desc: 'Complete compliance review' },
        { icon: <Vault className="w-5 h-5" />, title: 'Establish Reserve', desc: 'Create gold reserve account' },
        { icon: <Globe className="w-5 h-5" />, title: 'Trade & Treasury', desc: 'Use gold for operations' },
      ];

  const bnslPlans = [
    { duration: 12, returns: '10%', minInvestment: '5,000 CHF' },
    { duration: 24, returns: '11%', minInvestment: '10,000 CHF' },
    { duration: 36, returns: '12%', minInvestment: '25,000 CHF' },
  ];

  const advantages = [
    { icon: <Shield className="w-5 h-5" />, title: 'Swiss Regulation', description: 'Fully compliant standards' },
    { icon: <Lock className="w-5 h-5" />, title: 'Secure Storage', description: 'Insured vault storage' },
    { icon: <Zap className="w-5 h-5" />, title: 'Instant Transactions', description: 'Low fees, fast transfers' },
    { icon: <Clock className="w-5 h-5" />, title: '24/7 Access', description: 'Manage anytime, anywhere' },
    { icon: <Users className="w-5 h-5" />, title: 'Dedicated Support', description: 'Enterprise-grade help' },
    { icon: <BarChart3 className="w-5 h-5" />, title: 'Transparent Reports', description: 'Real-time reporting' },
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form submitted:', formData);
  };

  return (
    <Layout>
      {/* Hero Section - Compact */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden bg-gradient-to-br from-[#FAFBFF] via-[#F4F6FC] to-[#FFFFFF]" data-testid="section-hero">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-pink-300 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#8A2BE2]/10 to-[#4B0082]/10 border border-[#8A2BE2]/20 rounded-full px-3 py-1.5 mb-4">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#8A2BE2]" />
                <span className="text-xs font-medium text-[#4B0082]">Swiss-Regulated Platform</span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight" data-testid="text-hero-title">
                Finatrades
              </h1>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-700 mb-4" data-testid="text-hero-subtitle">
                {accountType === 'business' 
                  ? 'Regulated Gold-Backed Financial Infrastructure'
                  : 'Digital Gold, Designed for Everyday People'}
              </h2>
              <p className="text-base text-gray-600 mb-3 max-w-lg" data-testid="text-hero-description">
                {accountType === 'business' 
                  ? 'Designed for corporates, importers, exporters, and institutional partners.'
                  : 'Save, store, and use real gold value through a secure, modern account.'}
              </p>
              <p className="text-sm text-gray-500 mb-6 max-w-lg" data-testid="text-hero-partnership">
                {accountType === 'business' 
                  ? <>Partnership with <span className="font-semibold text-[#8A2BE2]">Wingold and Metals DMCC</span> for settlement-ready financial instruments.</>
                  : <>Send, receive, spend anywhere, and earn through <span className="font-semibold text-[#8A2BE2]">BNSL</span> structured plans.</>}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login">
                  <Button variant="outline" size="default" className="rounded-full border-gray-300 px-6" data-testid="button-hero-signin">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="default" className="bg-gradient-to-r from-[#8A2BE2] to-[#4B0082] hover:opacity-90 text-white px-6 rounded-full" data-testid="button-get-started">
                    Get Started <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card Visual - Compact */}
            <div className="relative hidden lg:block">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="relative w-full max-w-sm mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8A2BE2]/30 to-[#FF2FBF]/30 rounded-2xl blur-2xl" />
                  
                  <div className="relative aspect-[1.6/1] bg-gradient-to-br from-[#0D001E] via-[#2A0055] to-[#4B0082] rounded-xl p-4 shadow-xl overflow-hidden border border-[#8A2BE2]/20">
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <FinatradesLogo variant="white" size="sm" />
                        <span className="text-[#D4A020] text-xs font-semibold">GOLD CARD</span>
                      </div>
                      <div className="text-white font-mono text-base tracking-[0.2em]">•••• •••• •••• 4582</div>
                      <div className="flex justify-between items-end text-xs">
                        <div>
                          <div className="text-white/60 text-[10px]">CARD HOLDER</div>
                          <div className="text-white font-medium">GOLD MEMBER</div>
                        </div>
                        <div className="flex">
                          <div className="w-6 h-6 rounded-full bg-[#EB001B] opacity-80" />
                          <div className="w-6 h-6 rounded-full bg-[#F79E1B] opacity-80 -ml-2" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-[#0D001E]/80 backdrop-blur-sm rounded-xl p-3 border border-[#8A2BE2]/10">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-gray-400 text-[10px]">Vault</div>
                        <div className="text-white font-bold text-sm">100g</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-[10px]">Wallet</div>
                        <div className="text-white font-bold text-sm">25.5g</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-[10px]">BNSL</div>
                        <div className="text-white font-bold text-sm">2 Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section - Compact */}
      <section id="products" className="py-12 bg-white" data-testid="section-products">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <span className="inline-block text-[#8A2BE2] text-xs font-semibold tracking-wider uppercase mb-2">
              {accountType === 'business' ? 'BUSINESS ECOSYSTEM' : 'OUR PRODUCTS'}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {accountType === 'business' ? 'High-Trust Business Solutions' : 'Gold-Backed Financial Solutions'}
            </h2>
            <p className="text-gray-600 text-sm max-w-xl mx-auto">
              Comprehensive solutions designed for the modern investor
            </p>
          </div>

          <div className={`grid md:grid-cols-2 gap-4 ${accountType === 'personal' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
            {products.map((product, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full border-0 shadow-md hover:shadow-lg transition-all duration-300 group bg-white" data-testid={`card-product-${index}`}>
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8A2BE2]/10 to-[#4B0082]/10 flex items-center justify-center mb-3 group-hover:from-[#8A2BE2]/20 group-hover:to-[#4B0082]/20 transition-colors">
                      <div className="text-[#8A2BE2]">{product.icon}</div>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{product.title}</h3>
                    <p className="text-gray-500 text-xs mb-3">{product.description}</p>
                    <Link href={product.link}>
                      <Button variant="ghost" className="p-0 h-auto text-[#8A2BE2] hover:text-[#4B0082] font-medium text-sm">
                        {product.cta} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Compact Horizontal */}
      <section id="how-it-works" className="py-12 bg-gradient-to-b from-purple-50/30 to-white" data-testid="section-how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <span className="inline-block bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600 text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full mb-2">
              {accountType === 'personal' ? 'YOUR JOURNEY' : 'ENTERPRISE WORKFLOW'}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Works</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {workflowSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-md text-white">
                  {step.icon}
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{step.title}</h4>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/register">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-6">
                Start Your Journey <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* BNSL Plans - Compact */}
      <section className="py-12 bg-white" data-testid="section-bnsl">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <span className="inline-block text-[#8A2BE2] text-xs font-semibold tracking-wider uppercase mb-2">
              STRUCTURED BNSL PLANS
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Buy Now, Sell Later</h2>
            <p className="text-gray-600 text-sm">Lock in today's gold price with structured returns</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {bnslPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`h-full border-2 transition-all duration-300 hover:shadow-lg ${
                    index === 1 ? 'border-[#8A2BE2] shadow-md scale-105' : 'border-gray-200'
                  }`}
                  data-testid={`card-bnsl-${plan.duration}`}
                >
                  <CardContent className="p-5 text-center">
                    {index === 1 && (
                      <div className="inline-block bg-gradient-to-r from-[#8A2BE2] to-[#4B0082] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2">
                        POPULAR
                      </div>
                    )}
                    <div className="text-3xl font-bold text-gray-900 mb-1">{plan.duration}</div>
                    <div className="text-gray-500 text-xs mb-3">Months</div>
                    <div className="text-2xl font-bold text-[#8A2BE2] mb-1">{plan.returns}</div>
                    <div className="text-gray-500 text-xs mb-3">Expected Returns</div>
                    <div className="text-xs text-gray-600 mb-4">Min: {plan.minInvestment}</div>
                    <Link href="/bnsl">
                      <Button 
                        size="sm"
                        className={`w-full rounded-full ${
                          index === 1 
                            ? 'bg-gradient-to-r from-[#8A2BE2] to-[#4B0082] text-white' 
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

      {/* Advantages - Compact */}
      <section id="about" className="py-12 bg-gradient-to-b from-purple-50/50 to-white" data-testid="section-about">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <span className="inline-block text-[#8A2BE2] text-xs font-semibold tracking-wider uppercase mb-2">
              WHY CHOOSE US
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">The Finatrades Advantage</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {advantages.map((advantage, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="text-center p-3"
                data-testid={`advantage-${index}`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8A2BE2]/10 to-[#4B0082]/10 flex items-center justify-center mx-auto mb-2">
                  <div className="text-[#8A2BE2]">{advantage.icon}</div>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{advantage.title}</h3>
                <p className="text-xs text-gray-600">{advantage.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form - Compact */}
      <section id="contact" className="py-12 bg-white" data-testid="section-contact">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6">
              <span className="inline-block text-[#8A2BE2] text-xs font-semibold tracking-wider uppercase mb-2">
                CONTACT US
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Get in Touch</h2>
              <p className="text-gray-600 text-sm">Have questions? We'd love to hear from you.</p>
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                      <Input 
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="rounded-lg text-sm"
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                      <Input 
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="rounded-lg text-sm"
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
                    <Textarea 
                      placeholder="Your message..."
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="rounded-lg text-sm"
                      data-testid="input-contact-message"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-[#8A2BE2] to-[#4B0082] text-white rounded-full"
                    data-testid="button-contact-submit"
                  >
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Compact */}
      <section className="py-12 bg-gradient-to-r from-[#8A2BE2] to-[#4B0082]" data-testid="section-cta">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to Start Your Gold Journey?
          </h2>
          <p className="text-base text-white/90 mb-6 max-w-xl mx-auto">
            Join thousands who trust us with their gold investments
          </p>
          <Link href="/register">
            <Button 
              size="lg" 
              className="bg-white text-[#8A2BE2] hover:bg-gray-100 px-8 font-semibold rounded-full"
              data-testid="button-cta-register"
            >
              Create Your Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
