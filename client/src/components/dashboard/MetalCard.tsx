import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

interface MetalCardProps {
  className?: string;
}

export default function MetalCard({ className = '' }: MetalCardProps) {
  const { user } = useAuth();
  const isPersonal = user?.accountType !== 'business';
  const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim().toUpperCase() || 'CARD HOLDER';
  
  const lastFour = user?.finatradesId?.slice(-4) || '0000';
  const firstFour = user?.finatradesId?.slice(0, 4) || '4789';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={`cursor-pointer ${className}`}
    >
      <div className={`w-full max-w-[380px] h-[220px] rounded-2xl bg-gradient-to-br from-[#3D1A5C] via-[#2A0055] to-[#1a0a30] border-2 ${isPersonal ? 'border-[#8A2BE2]/60 hover:border-[#A342FF]' : 'border-[#A342FF]/70 hover:border-[#FF2FBF]'} p-5 shadow-2xl shadow-[#8A2BE2]/30 hover:shadow-[#8A2BE2]/50 relative overflow-hidden transition-all duration-300`}>
        <motion.div
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
          className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/8 to-transparent skew-x-12"
        />
        
        <div className="flex justify-between items-center mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[#A342FF] text-base">✦</span>
            <span className="text-white font-bold text-base tracking-wide">
              {isPersonal ? (
                <>FINA<span className="text-[#FFD700]">GOLD</span></>
              ) : (
                <>FINA<span className="text-[#A342FF]">TRADES</span></>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-green-400 font-bold uppercase px-2 py-0.5 bg-green-400/15 rounded-full border border-green-400/30">Active</span>
            <span className="text-[#A342FF] text-sm">📶</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-11 h-8 rounded-md bg-gradient-to-br from-purple-400 via-purple-500 to-pink-500 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 flex flex-col justify-center gap-[2px] py-1.5">
              <div className="h-[1.5px] bg-purple-700/60 mx-1" />
              <div className="h-[1.5px] bg-purple-700/60 mx-1" />
              <div className="h-[1.5px] bg-purple-700/60 mx-1" />
              <div className="h-[1.5px] bg-purple-700/60 mx-1" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#A342FF]" />
              <span className="text-white font-semibold text-xs tracking-wide">
                {isPersonal ? 'PERSONAL GOLD' : 'ENTERPRISE GOLD'}
              </span>
            </div>
            <p className="text-gray-400 text-[9px] tracking-wider mt-0.5">GOLD-BACKED DIGITAL</p>
          </div>
        </div>
        
        <div className="mb-4 relative z-10">
          <p className="text-white text-xl tracking-[0.12em] font-medium">
            {firstFour} <span className="text-white/60">••••</span> <span className="text-white/60">••••</span> {lastFour}
          </p>
        </div>
        
        <div className="flex justify-between items-end relative z-10">
          <div className="flex gap-6">
            <div>
              <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-0.5">Card Holder</p>
              <p className="text-white text-xs font-semibold">{userName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-0.5">Valid Thru</p>
              <p className="text-white text-xs font-semibold">12/28</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-red-500/80" />
            <div className="w-6 h-6 rounded-full bg-orange-400/80 -ml-3" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
