import React, { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingAgentChat from './FloatingAgentChat';
import { useLocation } from 'wouter';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen bg-[#0D001E] text-white font-sans selection:bg-[#8A2BE2] selection:text-white overflow-x-hidden flex flex-col">
      <Navbar />
      <main className="flex-grow pt-20">
        {children}
      </main>
      <Footer />
      <FloatingAgentChat />
    </div>
  );
}
