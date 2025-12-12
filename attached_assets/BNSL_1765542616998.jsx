import React, { useRef } from 'react';

// Import all BNSL components
import BNSLHeroVault from '../components/bnsl/BNSLHeroVault';
import BNSLHowItWorks from '../components/bnsl/BNSLHowItWorks';
import BNSLGoldPlanner from '../components/bnsl/BNSLGoldPlanner';
import BNSLPlanComparison from '../components/bnsl/BNSLPlanComparison';
import BNSLBenefits from '../components/bnsl/BNSLBenefits';
import BNSLFAQ from '../components/bnsl/BNSLFAQ';
import BNSLRiskDisclosure from '../components/bnsl/BNSLRiskDisclosure';


import BNSLFinalCTA from '../components/bnsl/BNSLFinalCTA';

export default function BNSL() {
  const calculatorRef = useRef(null);

  const scrollToCalculator = () => {
    const calculatorSection = document.getElementById('calculator');
    if (calculatorSection) {
      calculatorSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="bg-gradient-to-br from-[#FAFBFF] via-[#F4F6FC] to-[#FFFFFF] min-h-screen">
      {/* Section 1: Hero with Animated Vault */}
      <BNSLHeroVault />
      
      {/* Section 2: How It Works (Snake Animation) */}
      <div id="how-it-works">
        <BNSLHowItWorks onOpenCalculator={scrollToCalculator} />
      </div>
      
      {/* Section 3: Interactive Gold Holding Planner */}
      <BNSLGoldPlanner />
      
      {/* Section 4: Plan Comparison */}
      <BNSLPlanComparison />
      
      {/* Section 5: Key Benefits */}
      <BNSLBenefits />
      
      {/* Section 6: FAQ */}
      <BNSLFAQ />
      
      {/* Section 7: Risk Disclosure */}
      <BNSLRiskDisclosure />
      

      

      
      {/* Section 10: Final CTA Banner */}
      <BNSLFinalCTA />
    </main>
  );
}