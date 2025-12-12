import React, { useRef } from 'react';
import Layout from '@/components/Layout';
import BNSLHeroVault from '@/components/bnsl-explore/BNSLHeroVault';
import BNSLHowItWorks from '@/components/bnsl-explore/BNSLHowItWorks';
import BNSLGoldPlanner from '@/components/bnsl-explore/BNSLGoldPlanner';
import BNSLPlanComparison from '@/components/bnsl-explore/BNSLPlanComparison';
import BNSLBenefits from '@/components/bnsl-explore/BNSLBenefits';
import BNSLFAQ from '@/components/bnsl-explore/BNSLFAQ';
import BNSLRiskDisclosure from '@/components/bnsl-explore/BNSLRiskDisclosure';
import BNSLFinalCTA from '@/components/bnsl-explore/BNSLFinalCTA';

export default function BNSLExplore() {
  const scrollToCalculator = () => {
    const calculatorSection = document.getElementById('calculator');
    if (calculatorSection) {
      calculatorSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Layout>
      <main className="bg-gradient-to-br from-[#FAFBFF] via-[#F4F6FC] to-[#FFFFFF] min-h-screen">
        <BNSLHeroVault />
        
        <div id="how-it-works">
          <BNSLHowItWorks onOpenCalculator={scrollToCalculator} />
        </div>
        
        <BNSLGoldPlanner />
        
        <BNSLPlanComparison />
        
        <BNSLBenefits />
        
        <BNSLFAQ />
        
        <BNSLRiskDisclosure />
        
        <BNSLFinalCTA />
      </main>
    </Layout>
  );
}
