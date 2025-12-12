import React from 'react';
import { motion } from 'framer-motion';
import { Lock, ChevronRight, CheckCircle, Clock, XCircle } from 'lucide-react';

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-purple-500/20 text-purple-400', icon: Lock },
  terminated: { label: 'Early Terminated', color: 'bg-red-500/20 text-red-400', icon: XCircle }
};

export default function BNSLPlansTable({ plans, onViewPlan }) {
  if (plans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#8A2BE2]/20 rounded-2xl p-12 text-center shadow-sm"
      >
        <Lock className="w-12 h-12 mx-auto text-[#8A2BE2]/30 mb-4" />
        <p className="text-[#4A4A4A] mb-2">No BNSL plans yet</p>
        <p className="text-[#4A4A4A] text-sm">Create your first structured gold holding plan to get started</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#8A2BE2]/20 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm"
    >
      <div className="p-3 sm:p-6 border-b border-[#8A2BE2]/10">
        <h2 className="text-sm sm:text-lg font-bold text-[#0D0D0D]">Active Plans</h2>
      </div>
      
      {/* Desktop Table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full">
          <thead className="bg-[#F4F6FC]">
            <tr className="text-left text-[#4A4A4A] text-xs uppercase tracking-wider">
              <th className="px-6 py-4">Plan ID</th>
              <th className="px-6 py-4">Tenure</th>
              <th className="px-6 py-4">Locked Principal (g)</th>
              <th className="px-6 py-4">Locked-In Price</th>
              <th className="px-6 py-4">Plan Rate</th>
              <th className="px-6 py-4">Start Date</th>
              <th className="px-6 py-4">Maturity Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#8A2BE2]/10">
            {plans.map(plan => {
              const StatusIcon = statusConfig[plan.status]?.icon || Clock;
              return (
                <tr 
                  key={plan.id} 
                  className="text-[#0D0D0D] hover:bg-[#F4F6FC] transition-colors cursor-pointer group"
                  onClick={() => onViewPlan(plan)}
                >
                  <td className="px-6 py-4 font-mono text-[#8A2BE2]">{plan.id}</td>
                  <td className="px-6 py-4">{plan.tenure} Months</td>
                  <td className="px-6 py-4 font-medium">{plan.principalGold.toFixed(3)} g</td>
                  <td className="px-6 py-4">${plan.lockedInPrice.toFixed(2)}/g</td>
                  <td className="px-6 py-4">
                    <span className="text-[#FF2FBF] font-bold">{plan.rate}%</span>
                    <span className="text-[#4A4A4A] text-xs ml-1">p.a.</span>
                  </td>
                  <td className="px-6 py-4 text-[#4A4A4A]">{plan.startDate}</td>
                  <td className="px-6 py-4 text-[#4A4A4A]">{plan.maturityDate}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit ${statusConfig[plan.status]?.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig[plan.status]?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[#FF2FBF] text-sm font-medium">
                      View Plan <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-2 p-3">
        {plans.map(plan => {
          const StatusIcon = statusConfig[plan.status]?.icon || Clock;
          return (
            <div 
              key={plan.id} 
              className="bg-[#F4F6FC] rounded-xl p-3 cursor-pointer active:bg-[#8A2BE2]/10"
              onClick={() => onViewPlan(plan)}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[#8A2BE2] font-mono text-xs">{plan.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${statusConfig[plan.status]?.color}`}>
                  <StatusIcon className="w-2.5 h-2.5" />
                  {statusConfig[plan.status]?.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-[#4A4A4A]">Tenure</p>
                  <p className="text-[#0D0D0D] font-medium">{plan.tenure}M</p>
                </div>
                <div>
                  <p className="text-[#4A4A4A]">Principal</p>
                  <p className="text-[#0D0D0D] font-medium">{plan.principalGold.toFixed(3)} g</p>
                </div>
                <div>
                  <p className="text-[#4A4A4A]">Rate</p>
                  <p className="text-[#FF2FBF] font-bold">{plan.rate}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}