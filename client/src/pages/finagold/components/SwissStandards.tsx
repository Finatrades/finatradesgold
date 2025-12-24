import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SwissStandards() {
  return (
    <section className="py-28 bg-gradient-to-b from-[#F8FAFC] to-[#FAFBFF] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-50/50 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-pink-50/30 blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto"
        >
          <span className="inline-block text-base font-semibold text-purple-600 uppercase tracking-[0.25em] mb-8">
            BUILT ON
          </span>
          
          <h2 className="text-4xl lg:text-6xl font-bold mb-8 flex items-center justify-center gap-4 flex-wrap">
            <Plus className="w-12 h-12 text-red-500" strokeWidth={3} />
            <span className="text-gray-900">Swiss Financial </span>
            <span className="text-purple-600">Standards</span>
          </h2>
          
          <p className="text-gray-600 text-xl mb-10 max-w-3xl mx-auto leading-relaxed">
            Operating under strict Swiss regulations, Finatrades ensures security, compliance, and reliability for businesses worldwide.
          </p>
          
          <Button
            variant="outline"
            className="rounded-full px-10 py-4 text-lg border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300"
          >
            View Regulatory Information
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
