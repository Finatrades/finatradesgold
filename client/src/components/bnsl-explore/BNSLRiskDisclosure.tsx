import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  Shield,
  Scale,
  FileText,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface RiskItem {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

const riskItems: RiskItem[] = [
  {
    id: 'market-risk',
    title: 'Market Price Fluctuation',
    description:
      "Gold prices can fluctuate based on global economic conditions, geopolitical events, currency movements, and market sentiment. While gold is historically stable, short-term volatility can affect your investment's value.",
    severity: 'medium',
    mitigation:
      "BNSL's lock-in mechanism and monthly bonuses help offset short-term volatility. Consider longer holding periods for better returns.",
  },
  {
    id: 'liquidity-risk',
    title: 'Liquidity Constraints',
    description:
      'During your plan term, your gold is locked and cannot be sold. Early exit options are limited to certain plan tiers and may result in bonus forfeiture.',
    severity: 'low',
    mitigation:
      'Choose a plan duration that matches your financial timeline. Premium plans offer early exit options after 50% term completion.',
  },
  {
    id: 'regulatory-risk',
    title: 'Regulatory Changes',
    description:
      'Changes in government regulations, tax policies, or financial laws could affect gold trading, storage, or your investment returns.',
    severity: 'low',
    mitigation:
      'We maintain full regulatory compliance and work with legal experts to adapt to any regulatory changes. Your ownership rights are protected.',
  },
  {
    id: 'counterparty-risk',
    title: 'Counterparty Risk',
    description:
      "There is a risk associated with the platform's ability to fulfill its obligations, including bonus payments and gold redemption.",
    severity: 'low',
    mitigation:
      'We maintain 100% gold reserves, are fully insured, and undergo regular third-party audits. Your gold is legally yours and segregated from company assets.',
  },
];

const legalPoints = [
  'Past performance is not indicative of future results',
  'Bonus rates are subject to change with 30 days notice',
  'Investment carries inherent risks and may result in loss',
  'Read all terms and conditions before investing',
  'Seek independent financial advice if needed',
  'This product may not be suitable for all investors',
];

export default function BNSLRiskDisclosure() {
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 via-slate-50 to-gray-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #64748b 0, #64748b 1px, transparent 0, transparent 50%)`,
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 mb-6"
          >
            <Scale className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Transparency First</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Risk{' '}
            <span className="bg-gradient-to-r from-slate-600 to-slate-800 bg-clip-text text-transparent">
              Disclosure
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We believe in complete transparency. Understand the risks before you invest.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {/* Risk Warning Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 p-6 rounded-2xl bg-amber-50 border border-amber-200"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 mb-2">Important Investment Notice</h3>
                <p className="text-amber-800 text-sm leading-relaxed">
                  All investments carry risk. The value of your gold can go down as well as up, and
                  you may get back less than you invest. Please read this disclosure carefully and
                  consider seeking independent financial advice before making investment decisions.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Risk Items */}
          <div className="space-y-4 mb-8">
            {riskItems.map((risk, index) => (
              <motion.div
                key={risk.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  data-testid={`button-risk-${risk.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <AlertCircle className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{risk.title}</h4>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(risk.severity)}`}
                      >
                        {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)} Risk
                      </span>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedRisk === risk.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {expandedRisk === risk.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5">
                        <div className="p-4 rounded-lg bg-gray-50 space-y-4">
                          <div>
                            <h5 className="text-sm font-medium text-gray-500 mb-2">Description</h5>
                            <p className="text-gray-700">{risk.description}</p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                              <Shield className="w-4 h-4 text-emerald-500" />
                              How We Mitigate This
                            </h5>
                            <p className="text-gray-700">{risk.mitigation}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Legal Points */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold text-gray-900">Legal Disclaimers</h3>
            </div>
            <ul className="grid md:grid-cols-2 gap-3">
              {legalPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 text-sm">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Acknowledgment Checkbox */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-slate-900 text-white"
          >
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                data-testid="checkbox-risk-acknowledgment"
              />
              <div>
                <span className="font-medium">I understand and acknowledge the risks</span>
                <p className="text-sm text-gray-400 mt-1">
                  By checking this box, I confirm that I have read and understood the risk
                  disclosure, and I accept that investments in gold carry inherent risks including
                  potential loss of capital.
                </p>
              </div>
            </label>

            {acknowledged && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 text-emerald-400"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Risk disclosure acknowledged</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
