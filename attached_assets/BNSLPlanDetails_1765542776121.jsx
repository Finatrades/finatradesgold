import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Lock, Unlock, Calendar, Award, Info, AlertTriangle, 
  CheckCircle, Clock, DollarSign, TrendingUp, ExternalLink, XCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  completed: { label: 'Matured & Settled', color: 'bg-purple-500/20 text-purple-400', icon: Award },
  terminated: { label: 'Early Terminated', color: 'bg-red-500/20 text-red-400', icon: XCircle }
};

export default function BNSLPlanDetails({ plan, goldPrice, onBack, onTerminate }) {
  const [showTerminationModal, setShowTerminationModal] = useState(false);

  const StatusIcon = statusConfig[plan.status]?.icon || CheckCircle;
  const isMatured = plan.status === 'completed';
  const isActive = plan.status === 'active';

  // Calculate market value equivalent
  const marketValueEquivalent = plan.principalGold * goldPrice;
  const valueDifference = marketValueEquivalent - plan.lockedPrincipalValue;
  const valueDifferencePercent = ((valueDifference / plan.lockedPrincipalValue) * 100).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="bg-white border-2 border-[#8A2BE2]/30 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg bg-[#F4F6FC] text-[#8A2BE2] hover:bg-[#8A2BE2]/10 border border-[#8A2BE2]/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-amber-600 font-mono">{plan.id}</h1>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 border-2 ${
                plan.status === 'active' ? 'bg-green-100 text-green-700 border-green-400' :
                plan.status === 'completed' ? 'bg-purple-100 text-purple-700 border-purple-400' :
                'bg-red-100 text-red-700 border-red-400'
              }`}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig[plan.status]?.label}
              </span>
            </div>
            <p className="text-[#4A4A4A] font-medium text-sm">
              {plan.tenure}-Month Plan • {plan.rate}% p.a. • Started {plan.startDate}
            </p>
          </div>
        </div>
      </div>

      {/* Matured State Banner */}
      {isMatured && (
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-400 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-7 h-7 text-purple-600" />
            <h3 className="text-[#0D0D0D] font-bold text-lg">Plan Matured & Settled</h3>
          </div>
          <p className="text-[#4A4A4A] font-medium text-sm mb-4">
            Original principal gold in grams has been credited back to your FinaPay Wallet at the same Locked-In Price value. 
            All scheduled distributions have already been paid to your wallet during the term. This plan is now closed; no further payouts or obligations.
          </p>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90">
            <ExternalLink className="w-4 h-4 mr-2" />
            View in FinaPay Wallet
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Section A - Principal Overview */}
        <div className="bg-white border-2 border-[#8A2BE2]/30 rounded-2xl p-6 shadow-lg">
          <h3 className="text-[#0D0D0D] font-bold text-lg mb-5 flex items-center gap-2">
            <Lock className="w-6 h-6 text-amber-600" />
            Principal Overview
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b-2 border-[#8A2BE2]/10">
              <span className="text-[#4A4A4A] font-medium text-sm">Principal Gold Locked</span>
              <span className="text-2xl font-bold text-[#0D0D0D]">{plan.principalGold.toFixed(3)} g</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b-2 border-[#8A2BE2]/10">
              <span className="text-[#4A4A4A] font-medium text-sm">Locked-In Price</span>
              <span className="text-[#0D0D0D] font-bold text-lg">${plan.lockedInPrice.toFixed(2)}/g</span>
            </div>
            <div className="p-5 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-400/40 shadow-sm">
              <p className="text-[#0D0D0D] font-semibold text-sm mb-2">Locked Principal Value (USD) — Fixed</p>
              <p className="text-3xl font-bold text-amber-600">${plan.lockedPrincipalValue.toLocaleString()}</p>
            </div>
            <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-300/40">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[#0D0D0D] font-semibold text-sm">Current Market Value (USD) — Informational Only</p>
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">${marketValueEquivalent.toLocaleString()}</p>
              <p className={`text-sm font-bold mt-2 ${valueDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {valueDifference >= 0 ? '+' : ''}{valueDifferencePercent}% vs locked value
              </p>
            </div>
          </div>
        </div>

        {/* Section B - Distribution Status */}
        <div className="bg-white border-2 border-[#8A2BE2]/30 rounded-2xl p-6 shadow-lg">
          <h3 className="text-[#0D0D0D] font-bold text-lg mb-5 flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-600" />
            Distribution Status
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-400/40 shadow-sm">
                <p className="text-[#0D0D0D] font-semibold text-xs mb-2">Total Distributions Paid</p>
                <p className="text-3xl font-bold text-green-600">+{plan.totalDistributionsPaid.toFixed(3)} g</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-300/40">
                <p className="text-[#0D0D0D] font-semibold text-xs mb-2">Monetary Value Distributed</p>
                <p className="text-2xl font-bold text-purple-600">${plan.monetaryValueDistributed.toLocaleString()}</p>
              </div>
            </div>

            {isActive && (
              <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-400/40 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <p className="text-[#0D0D0D] font-semibold text-sm">Next Distribution Date</p>
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-2">{plan.nextDistributionDate}</p>
                <p className="text-[#4A4A4A] font-medium text-sm">
                  ${plan.quarterlyMonetaryValue.toFixed(2)} converted to grams at market price on distribution day
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Distribution History Table */}
      <div className="bg-white border-2 border-[#8A2BE2]/30 rounded-2xl p-6 shadow-lg">
        <h3 className="text-[#0D0D0D] font-bold text-lg mb-5">Distribution History</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[#4A4A4A] font-bold text-xs uppercase tracking-wider border-b-2 border-[#8A2BE2]/20">
                <th className="pb-4 pr-4">#</th>
                <th className="pb-4 pr-4">Date</th>
                <th className="pb-4 pr-4">Monetary Value (Fixed)</th>
                <th className="pb-4 pr-4">Market Price Used</th>
                <th className="pb-4 pr-4">Gold Credited</th>
                <th className="pb-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#8A2BE2]/10">
              {plan.distributionHistory.map((dist) => (
                <tr key={dist.number} className="text-[#0D0D0D] hover:bg-[#F4F6FC] transition-colors">
                  <td className="py-4 pr-4 font-bold text-[#8A2BE2]">Q{dist.number}</td>
                  <td className="py-4 pr-4 font-medium">{dist.date}</td>
                  <td className="py-4 pr-4 text-amber-600 font-bold">${dist.monetaryValue.toFixed(2)}</td>
                  <td className="py-4 pr-4 font-medium">${dist.marketPriceUsed.toFixed(2)}/g</td>
                  <td className="py-4 pr-4 text-green-600 font-bold text-lg">+{dist.goldCredited.toFixed(4)} g</td>
                  <td className="py-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                      dist.status === 'paid' 
                        ? 'bg-green-100 text-green-700 border-green-400' 
                        : 'bg-gray-100 text-gray-600 border-gray-300'
                    }`}>
                      {dist.status === 'paid' ? 'Paid' : 'Upcoming'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Early Termination Warning */}
      {isActive && (
        <div className="bg-gradient-to-br from-red-100 to-orange-100 border-2 border-red-400 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-7 h-7 text-red-600" />
            <h3 className="text-red-600 font-bold text-lg">Early Termination Warning</h3>
          </div>
          <div className="text-[#4A4A4A] font-medium text-sm space-y-2 mb-6">
            <p><strong className="text-red-600 font-bold">Early Termination will cause significant loss:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-[#4A4A4A]">
              <li>Principal value recalculated at current or locked price (whichever is less favorable)</li>
              <li>Administrative fee and early withdrawal penalty applied</li>
              <li>First quarterly payout reimbursed</li>
              <li>Remaining value converted back to gold at current price and credited to Fina wallet</li>
              <li>All future distributions are forfeited</li>
            </ul>
          </div>
          <Button 
            onClick={() => setShowTerminationModal(true)}
            variant="outline" 
            className="border-2 border-red-500 text-red-600 font-bold hover:bg-red-50"
          >
            <XCircle className="w-5 h-5 mr-2" />
            Request Early Termination
          </Button>
        </div>
      )}

      {/* Early Termination Confirmation Modal */}
      <Dialog open={showTerminationModal} onOpenChange={setShowTerminationModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-[#0a0a1a] to-[#1a0a2e] border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-red-400 text-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Early Termination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-white/70 text-sm">
              Are you sure you want to terminate this BNSL plan early? This action cannot be undone and will result in:
            </p>
            <ul className="list-disc list-inside space-y-1 text-red-400/80 text-sm">
              <li>Significant penalties and fees</li>
              <li>Reimbursement of previous payouts</li>
              <li>Loss of future distributions</li>
            </ul>
            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowTerminationModal(false)}
                className="flex-1 border border-white/20 text-white/70"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowTerminationModal(false);
                  onTerminate?.(plan.id);
                }}
                className="flex-1 bg-red-500 text-white hover:bg-red-600"
              >
                Confirm Termination
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}