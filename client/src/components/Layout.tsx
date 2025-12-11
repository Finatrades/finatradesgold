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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white overflow-x-hidden flex flex-col">
      <Navbar />
      <main className="flex-grow pt-20">
        {children}
      </main>
      <Footer />
      <FloatingAgentChat />
    </div>
  );
}
