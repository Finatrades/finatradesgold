import React from 'react';
import Layout from '@/components/Layout';
import {
  PremiumHeroSection,
  ProductSuite,
  HowItWorks,
  WhyFinatrades,
  ContactSection,
  FinalCTA
} from '@/components/home';

export default function Home() {
  return (
    <Layout>
      <div className="-mt-20">
        <PremiumHeroSection />
      </div>
      <ProductSuite />
      <HowItWorks />
      <WhyFinatrades />
      <ContactSection />
      <FinalCTA />
    </Layout>
  );
}
