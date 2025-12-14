import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useAccountType } from '@/context/AccountTypeContext';

export default function FinalCTA() {
  const { accountType } = useAccountType();

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-br from-orange-50/50 via-white to-amber-50/30">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-orange-100/50 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-amber-100/50 blur-[120px] rounded-full" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-orange-600/20 mb-8">
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-600">Start Today</span>
          </div>
          
          <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-gray-900">
            Ready to Start Your <br />
            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
              Gold Journey?
            </span>
          </h2>
          
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            {accountType === 'personal'
              ? 'Join thousands of individuals who trust Finatrades for secure gold ownership and wealth preservation.'
              : 'Partner with Finatrades for enterprise-grade gold management, trade finance, and treasury solutions.'}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button 
                size="lg" 
                className="h-14 px-10 bg-gradient-to-r from-[#FF6B2F] to-[#FF8F5F] hover:opacity-90 text-white rounded-full text-base shadow-lg shadow-orange-200"
                data-testid="button-cta-register"
              >
                {accountType === 'personal' ? 'Create Free Account' : 'Get Enterprise Demo'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 px-10 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-full text-base"
                data-testid="button-cta-signin"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
