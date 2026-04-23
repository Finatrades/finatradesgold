import React, { useRef } from 'react';
import PageSeo from '@/components/PageSeo';
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
    <div className="min-h-screen bg-background text-foreground">
      <PageSeo
        title="BNSL Gold Plans — Explore & Compare Structured Gold Savings"
        description="Compare BNSL structured gold savings plans by FinaGold. Use our gold calculator to find the right plan for your goals — from 3-month starter plans to 36-month premium options."
        canonical="/bnsl-explore"
      />
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
    </div>
  );
}
