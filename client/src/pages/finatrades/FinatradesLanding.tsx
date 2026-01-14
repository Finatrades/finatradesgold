import { useEffect } from 'react';
import { ModeProvider } from '../finagold/context/ModeContext';
import Navbar from '../finagold/components/Navbar';
import Hero from '../finagold/components/Hero';
import ValueProps from '../finagold/components/ValueProps';
import WhoItsFor from '../finagold/components/WhoItsFor';
import HowItWorks from '../finagold/components/HowItWorks';
import AboutSection from '../finagold/components/AboutSection';
import SwissStandards from '../finagold/components/SwissStandards';
import Products from '../finagold/components/Products';
import CTA from '../finagold/components/CTA';
import ContactForm from '../finagold/components/ContactForm';
import Footer from '../finagold/components/Footer';
import CookieConsent from '../finagold/components/CookieConsent';
import GeoRestrictionNotice from '../finagold/components/GeoRestrictionNotice';
import FloatingAgentChat from '@/components/FloatingAgentChat';

function FinatradesContent() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.documentElement.style.setProperty('--motion-duration', '0.01ms');
    }
  }, []);

  return (
    <div className="finagold-landing min-h-screen bg-[#FAFBFF] text-[#0D0D0D] antialiased selection:bg-[#8A2BE2] selection:text-white overflow-x-hidden">
      <style>{`
        .finagold-landing {
          /* Gold accent colors */
          --gold: #D4AF37;
          --gold-bright: #FFD500;
          --gold-light: #F7D878;
          --gold-dark: #B8860B;
          
          /* Purple primary colors */
          --purple-deep: #8A2BE2;
          --purple-magenta: #FF2FBF;
          --purple-light: #A342FF;
          --purple-pink: #FF4CD6;
          --purple-violet: #4B0082;
          
          /* Dark backgrounds */
          --bg-darkest: #0D001E;
          --bg-dark: #1A002F;
          --bg-medium: #2A0055;
          --bg-indigo: #4B0082;
          
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          
          /* Theme overrides for landing pages - Purple primary with gold accents */
          --primary: #8A2BE2;
          --primary-foreground: #ffffff;
          --ring: #8A2BE2;
          --accent: #D4AF37;
          --accent-foreground: #000000;
          --muted: #1A002F;
          --muted-foreground: rgba(255,255,255,0.7);
          --input: #2A0055;
          --border: #4B0082;
          --background: #0D001E;
          --foreground: #ffffff;
          --card: #1A002F;
          --card-foreground: #ffffff;
          --popover: #1A002F;
          --popover-foreground: #ffffff;
        }
        
        .finagold-landing {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .finagold-landing::-webkit-scrollbar {
          display: none;
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
        <Products />
        <HowItWorks />
        <AboutSection />
        <SwissStandards />
        <WhoItsFor />
        <ValueProps />
        <CTA />
        <ContactForm />
      </main>
      <Footer />
      <GeoRestrictionNotice />
      <CookieConsent />
      <FloatingAgentChat />
    </div>
  );
}

export default function FinatradesLanding() {
  return (
    <ModeProvider>
      <FinatradesContent />
    </ModeProvider>
  );
}
