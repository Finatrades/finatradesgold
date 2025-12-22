import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ToolsGrid from './components/ToolsGrid';
import HowItWorks from './components/HowItWorks';
import TrustStrip from './components/TrustStrip';
import CTA from './components/CTA';
import Footer from './components/Footer';

export default function FinagoldLanding() {
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
      `}</style>
      
      <Navbar />
      <main>
        <Hero />
        <ToolsGrid />
        <HowItWorks />
        <TrustStrip />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
