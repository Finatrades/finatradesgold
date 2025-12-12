import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { FileText, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function BNSLTermsModule() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section ref={ref} className="relative py-20 bg-black overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <motion.div
            className="p-8 rounded-3xl bg-[#0A0A0A]/80 backdrop-blur-sm border border-[#D4AF37]/20 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            style={{ boxShadow: '0 0 50px rgba(212,175,55,0.05)' }}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B8860B]/10 border border-[#D4AF37]/30 flex items-center justify-center mb-6">
              <FileText className="w-8 h-8 text-[#D4AF37]" />
            </div>
            
            <h3 className="text-2xl font-light text-white mb-3">
              Full BNSL Terms & Conditions
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Review the complete terms and conditions governing the Buy Back at Payment Plan.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-medium flex items-center gap-2"
                whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(212,175,55,0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                <FileText className="w-4 h-4" />
                View Terms & Conditions
              </motion.button>
              
              <Link to={createPageUrl("TermsAndConditions")}>
                <motion.button
                  className="px-8 py-4 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] font-medium flex items-center gap-2 hover:bg-[#D4AF37]/10 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Full Legal Documents
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal content */}
            <motion.div
              className="relative w-full max-w-3xl max-h-[80vh] bg-[#0A0A0A] border border-[#D4AF37]/30 rounded-3xl overflow-hidden"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              style={{ boxShadow: '0 0 80px rgba(212,175,55,0.15)' }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#D4AF37]/20 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-[#D4AF37]" />
                  <h3 className="text-xl font-light text-white">BNSL Terms & Conditions</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#D4AF37] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] text-gray-300 space-y-6 scrollbar-thin scrollbar-thumb-[#D4AF37]/30 scrollbar-track-transparent">
                <section>
                  <h4 className="text-[#D4AF37] font-medium mb-3">1. Plan Overview</h4>
                  <p className="leading-relaxed">
                    The BNSL (Buy Now Sell Later) Plan is a structured gold holding program offered by Finatrades Finance SA. 
                    Participants purchase physical gold at a Locked-In Price, which remains fixed throughout the plan tenure.
                  </p>
                </section>

                <section>
                  <h4 className="text-[#D4AF37] font-medium mb-3">2. Locked-In Price</h4>
                  <p className="leading-relaxed">
                    The Locked-In Price is established at the time of plan activation and applies to all calculations 
                    including principal valuation, quarterly growth credits, and final settlement.
                  </p>
                </section>

                <section>
                  <h4 className="text-[#D4AF37] font-medium mb-3">3. Growth Credits</h4>
                  <p className="leading-relaxed">
                    Quarterly growth credits are calculated based on the principal gold worth and credited to the 
                    participant's account every 3 months. The indicative annual growth rate varies by tenure:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                    <li>12-month plan: ~8% p.a.</li>
                    <li>24-month plan: ~10% p.a.</li>
                    <li>36-month plan: ~12% p.a.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-[#D4AF37] font-medium mb-3">4. Settlement</h4>
                  <p className="leading-relaxed">
                    At maturity, the full principal gold worth plus accumulated growth credits are settled 
                    in-kind to the participant's FinaWallet within 3 business days. No cash settlements are offered.
                  </p>
                </section>

                <section>
                  <h4 className="text-[#D4AF37] font-medium mb-3">5. Early Termination</h4>
                  <p className="leading-relaxed">
                    Early termination is permitted but subject to penalties. The settlement price for early 
                    termination uses the lower of the current market price or the Locked-In Price. 
                    Accrued growth credits may be forfeited.
                  </p>
                </section>

                <section>
                  <h4 className="text-[#D4AF37] font-medium mb-3">6. Risk Factors</h4>
                  <p className="leading-relaxed">
                    Participants acknowledge that the Locked-In Price may limit potential gains if gold 
                    prices rise significantly. The plan is subject to counterparty risk and market conditions.
                  </p>
                </section>

                <section>
                  <h4 className="text-[#D4AF37] font-medium mb-3">7. Governing Law</h4>
                  <p className="leading-relaxed">
                    These terms are governed by Swiss law. Any disputes shall be resolved through 
                    arbitration in Geneva, Switzerland.
                  </p>
                </section>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-[#0A0A0A] border-t border-[#D4AF37]/20 p-6">
                <motion.button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-medium"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  I Understand
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}