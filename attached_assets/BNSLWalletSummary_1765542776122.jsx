import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Lock, TrendingUp, Calendar, Clock, Award, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function BNSLWalletSummary({ 
  principalLocked, 
  lockedPrincipalValue, 
  marketValueEquivalent,
  accumulatedDistributions,
  activePlans,
  nextDistributionDate,
  upcomingDistributionValue,
  averageTenure,
  goldPrice
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#8A2BE2]/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] flex items-center justify-center">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-[#0D0D0D]">BNSL Wallet Summary</h2>
            <p className="text-[#4A4A4A] text-[10px] sm:text-sm">Structured Gold Holding Overview</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {/* Principal Locked */}
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-[#8A2BE2]" />
              <span className="text-[#4A4A4A] text-[10px] sm:text-sm">Principal Locked</span>
            </div>
            <p className="text-xl sm:text-3xl font-bold text-[#0D0D0D]">{principalLocked.toFixed(3)} <span className="text-sm sm:text-lg text-amber-600">g</span></p>
          </div>

          {/* Locked Principal Value */}
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[#4A4A4A] text-[10px] sm:text-sm">Locked Value (USD)</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#4A4A4A]" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-[#8A2BE2]/30 text-[#0D0D0D] max-w-xs">
                    <p className="text-xs">Fixed value calculated at the Locked-In Price when each plan was created.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xl sm:text-3xl font-bold text-amber-600">${lockedPrincipalValue.toLocaleString()}</p>
            <p className="text-[#4A4A4A] text-[10px] sm:text-xs">Fixed at Locked-In Price</p>
          </div>

          {/* Market Value Equivalent */}
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[#4A4A4A] text-[10px] sm:text-sm">Market Value</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#4A4A4A]" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-[#8A2BE2]/30 text-[#0D0D0D] max-w-xs">
                    <p className="text-xs">For information only.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xl sm:text-3xl font-bold text-[#0D0D0D]">${marketValueEquivalent.toLocaleString()}</p>
            <p className="text-[#4A4A4A] text-[10px] sm:text-xs">@ ${goldPrice.toFixed(2)}/g (current)</p>
          </div>

          {/* Accumulated Distributions */}
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Award className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
              <span className="text-[#4A4A4A] text-[10px] sm:text-sm">Total Gold Received</span>
            </div>
            <p className="text-xl sm:text-3xl font-bold text-green-400">+{accumulatedDistributions.toFixed(3)} <span className="text-sm sm:text-lg">g</span></p>
            <p className="text-[#4A4A4A] text-[10px] sm:text-xs">From quarterly distributions</p>
          </div>
        </div>

        {/* Value Breakdown */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-[#8A2BE2]/10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#F4F6FC] rounded-lg sm:rounded-xl">
              <p className="text-[#4A4A4A] text-[10px] sm:text-xs mb-1">Principal Value (fixed)</p>
              <p className="text-[#0D0D0D] font-semibold text-sm sm:text-base">${lockedPrincipalValue.toLocaleString()}</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-[#F4F6FC] rounded-lg sm:rounded-xl">
              <p className="text-[#4A4A4A] text-[10px] sm:text-xs mb-1">Current Market Value</p>
              <p className="text-[#0D0D0D] font-semibold text-sm sm:text-base">${marketValueEquivalent.toLocaleString()}</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-green-500/10 rounded-lg sm:rounded-xl border border-green-500/20">
              <p className="text-[#4A4A4A] text-[10px] sm:text-xs mb-1">Total Additional Gold Received (g)</p>
              <p className="text-green-600 font-semibold text-sm sm:text-base">+{accumulatedDistributions.toFixed(3)} g</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Secondary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: 'Active Plans', value: activePlans.toString(), icon: Lock, color: 'text-[#D1A954]' },
          { label: 'Next Distribution', value: nextDistributionDate, icon: Calendar, color: 'text-blue-400' },
          { label: 'Upcoming Distribution', value: `$${upcomingDistributionValue.toLocaleString()}`, subtext: '(estimated)', icon: TrendingUp, color: 'text-green-400' },
          { label: 'Avg Plan Tenure', value: `${averageTenure} months`, icon: Clock, color: 'text-purple-400' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-white border border-[#8A2BE2]/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm"
          >
            <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
              <stat.icon className={`w-3 h-3 sm:w-4 sm:h-4 ${stat.color}`} />
              <span className="text-[#4A4A4A] text-[10px] sm:text-xs">{stat.label}</span>
            </div>
            <p className={`text-base sm:text-xl font-bold ${stat.color}`}>{stat.value}</p>
            {stat.subtext && <p className="text-[#4A4A4A] text-[10px] sm:text-xs">{stat.subtext}</p>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}