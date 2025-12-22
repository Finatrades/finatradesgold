import { useEffect } from 'react';
import { ModeProvider } from './context/ModeContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ValueProps from './components/ValueProps';
import WhoItsFor from './components/WhoItsFor';
import HowItWorks from './components/HowItWorks';
import Products from './components/Products';
import Certificates from './components/Certificates';
import TrustStrip from './components/TrustStrip';
import CTA from './components/CTA';
import Footer from './components/Footer';
import FloatingAgentChat from '@/components/FloatingAgentChat';

function FinagoldContent() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.documentElement.style.setProperty('--motion-duration', '0.01ms');
    }
  }, []);

  return (
    <div className="finagold-landing min-h-screen bg-black text-white antialiased selection:bg-[#EAC26B] selection:text-black">
      <style>{`
        .finagold-landing {
          --gold: #EAC26B;
          --gold-dark: #d4af5a;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          
          /* Override app theme colors to gold for landing pages */
          --primary: #EAC26B;
          --primary-foreground: #000000;
          --ring: #EAC26B;
          --accent: #d4af5a;
          --accent-foreground: #000000;
          --muted: #1a1a1a;
          --muted-foreground: #9ca3af;
          --input: #333333;
          --border: #333333;
          --background: #000000;
          --foreground: #ffffff;
          --card: #111111;
          --card-foreground: #ffffff;
          --popover: #111111;
          --popover-foreground: #ffffff;
        }
        
        .finagold-landing * {
          scrollbar-width: thin;
          scrollbar-color: rgba(234, 194, 107, 0.3) transparent;
        }
        
        .finagold-landing ::-webkit-scrollbar {
          width: 6px;
        }
        
        .finagold-landing ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .finagold-landing ::-webkit-scrollbar-thumb {
          background: rgba(234, 194, 107, 0.3);
          border-radius: 3px;
        }
        
        .finagold-landing ::-webkit-scrollbar-thumb:hover {
          background: rgba(234, 194, 107, 0.5);
        }

        @media (prefers-reduced-motion: reduce) {
          .finagold-landing *,
          .finagold-landing *::before,
          .finagold-landing *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>
      
      <Navbar />
      <main>
        <Hero />
        <ValueProps />
        <WhoItsFor />
        <HowItWorks />
        <Products />
        <Certificates />
        <TrustStrip />
        <CTA />
      </main>
      <Footer />
      <FloatingAgentChat />
    </div>
  );
}

export default function FinagoldLanding() {
  return (
    <ModeProvider>
      <FinagoldContent />
    </ModeProvider>
  );
}
