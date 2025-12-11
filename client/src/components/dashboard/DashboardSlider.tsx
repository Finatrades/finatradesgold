import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Database, TrendingUp, BarChart3, User, Settings, ArrowRight } from 'lucide-react';

const sliderItems = [
  {
    id: 'finapay',
    title: 'FinaPay Wallet',
    desc: 'Buy, sell, send, and receive digital gold value.',
    icon: <Wallet className="w-6 h-6" />,
    color: 'text-[#8A2BE2]',
    bg: 'bg-[#8A2BE2]/10',
    border: 'border-[#8A2BE2]/20'
  },
  {
    id: 'finavault',
    title: 'FinaVault',
    desc: 'Track and manage your stored physical gold.',
    icon: <Database className="w-6 h-6" />,
    color: 'text-[#D4AF37]',
    bg: 'bg-[#D4AF37]/10',
    border: 'border-[#D4AF37]/20'
  },
  {
    id: 'bnsl',
    title: 'BNSL',
    desc: 'Lock gold to earn structured rewards over time.',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'text-[#FF2FBF]',
    bg: 'bg-[#FF2FBF]/10',
    border: 'border-[#FF2FBF]/20'
  },
  {
    id: 'margins',
    title: 'BNSL Margins',
    desc: 'View margins and projections on your BNSL positions.',
    icon: <BarChart3 className="w-6 h-6" />,
    color: 'text-[#4CAF50]',
    bg: 'bg-[#4CAF50]/10',
    border: 'border-[#4CAF50]/20'
  },
  {
    id: 'profile',
    title: 'Profile',
    desc: 'Manage your personal information and KYC status.',
    icon: <User className="w-6 h-6" />,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20'
  },
  {
    id: 'settings',
    title: 'Settings',
    desc: 'Configure security, notifications, and preferences.',
    icon: <Settings className="w-6 h-6" />,
    color: 'text-white',
    bg: 'bg-white/10',
    border: 'border-white/20'
  }
];

export default function DashboardSlider() {
  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 custom-scrollbar">
      <div className="flex gap-4 min-w-max px-1">
        {sliderItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`w-[280px] p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm cursor-pointer hover:border-[#D4AF37]/50 transition-colors group`}
            onClick={() => console.log(`Navigating to ${item.title}`)}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${item.bg} ${item.color}`}>
              {item.icon}
            </div>
            <h4 className="text-lg font-bold text-white mb-2 group-hover:text-[#D4AF37] transition-colors">{item.title}</h4>
            <p className="text-sm text-white/50 leading-relaxed mb-4 min-h-[40px]">
              {item.desc}
            </p>
            <div className="flex items-center text-xs font-medium text-white/40 group-hover:text-white transition-colors">
              Access Module <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
