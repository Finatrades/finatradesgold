import React from 'react';
import Layout from '@/components/Layout';
import { useCMSPage } from '@/context/CMSContext';
import { useBranding } from '@/context/BrandingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { Vault, Wallet, TrendingUp, Globe, ArrowRight, Shield, Zap, Clock } from 'lucide-react';

export default function Home() {
  const { getContent, isLoading } = useCMSPage('home');
  const { settings } = useBranding();

  const heroTitle = getContent('hero', 'title', 'Secure Your Wealth with Gold-Backed Digital Finance');
  const heroSubtitle = getContent('hero', 'subtitle', 'Experience the future of finance with Finatrades - where traditional gold meets modern technology');

  const features = [
    {
      icon: <Vault className="w-8 h-8" />,
      title: getContent('features', 'finavault_title', 'FinaVault'),
      description: getContent('features', 'finavault_description', 'Secure physical gold storage with digital ownership certificates'),
      link: '/finavault',
      color: 'from-amber-500 to-yellow-600'
    },
    {
      icon: <Wallet className="w-8 h-8" />,
      title: getContent('features', 'finapay_title', 'FinaPay'),
      description: getContent('features', 'finapay_description', 'Digital gold wallet for seamless transactions and payments'),
      link: '/finapay',
      color: 'from-orange-500 to-amber-600'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: getContent('features', 'bnsl_title', 'BNSL'),
      description: getContent('features', 'bnsl_description', 'Buy Now Sell Later - Lock in today\'s gold price'),
      link: '/bnsl',
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: getContent('features', 'finabridge_title', 'FinaBridge'),
      description: getContent('features', 'finabridge_description', 'Trade finance solutions for importers and exporters'),
      link: '/finabridge',
      color: 'from-blue-500 to-indigo-600'
    }
  ];

  const benefits = [
    {
      icon: <Shield className="w-6 h-6 text-orange-500" />,
      title: 'Secure & Insured',
      description: 'Your gold is stored in fully insured vaults with 24/7 security'
    },
    {
      icon: <Zap className="w-6 h-6 text-orange-500" />,
      title: 'Instant Transactions',
      description: 'Buy, sell, and transfer gold instantly with low fees'
    },
    {
      icon: <Clock className="w-6 h-6 text-orange-500" />,
      title: '24/7 Access',
      description: 'Manage your gold holdings anytime, anywhere'
    }
  ];

  return (
    <Layout>
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden" data-testid="section-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-orange-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
            data-testid="text-hero-title"
          >
            {heroTitle}
          </h1>
          <p 
            className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto"
            data-testid="text-hero-subtitle"
          >
            {heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-6 text-lg"
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/bnsl-explore">
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-6 text-lg border-2"
                data-testid="button-explore-bnsl"
              >
                Explore BNSL Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-gray-900" data-testid="section-features">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Products & Services
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Comprehensive gold-backed financial solutions designed for the modern investor
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Link href={feature.link} key={index}>
                <Card 
                  className="h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 overflow-hidden group"
                  data-testid={`card-feature-${index}`}
                >
                  <div className={`h-2 bg-gradient-to-r ${feature.color}`} />
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900" data-testid="section-benefits">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose {settings?.companyName || 'Finatrades'}?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="text-center p-6"
                data-testid={`benefit-${index}`}
              >
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-orange-500 to-amber-500" data-testid="section-cta">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Your Gold Journey?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of investors who trust us with their gold investments
          </p>
          <Link href="/register">
            <Button 
              size="lg" 
              className="bg-white text-orange-600 hover:bg-gray-100 px-10 py-6 text-lg font-semibold"
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
