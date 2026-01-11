import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

interface MetalCardProps {
  className?: string;
}

export default function MetalCard({ className = '' }: MetalCardProps) {
  const { user } = useAuth();
  const isPersonal = user?.accountType !== 'business';
  const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim().toUpperCase() || 'CARD HOLDER';
  
  const lastFour = user?.finatradesId?.slice(-4) || '0001';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className={`${className}`}
    >
      <div className="w-[280px] h-[180px] rounded-xl bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] p-4 shadow-2xl relative overflow-hidden border border-gray-700/50">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 100% 0%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
                              radial-gradient(circle at 0% 100%, rgba(234, 179, 8, 0.2) 0%, transparent 50%)`
          }}
        />
        
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-md relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-center gap-[1.5px] py-1.5">
                <div className="h-[1px] bg-yellow-700/40 mx-1" />
                <div className="h-[1px] bg-yellow-700/40 mx-1" />
                <div className="h-[1px] bg-yellow-700/40 mx-1" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-sm tracking-wide">
                {isPersonal ? 'FINAGOLD' : 'FINATRADES'}
              </p>
              <p className="text-yellow-500 text-[10px] font-medium">GOLD MEMBER</p>
            </div>
          </div>
          
          <div>
            <p className="text-white text-lg tracking-[0.2em] font-medium mb-3">
              4532 <span className="text-gray-400">••••</span> <span className="text-gray-400">••••</span> {lastFour}
            </p>
          </div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-gray-500 text-[8px] uppercase tracking-wider mb-0.5">Card Holder</p>
              <p className="text-white text-xs font-semibold tracking-wide">{userName}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-[8px] uppercase tracking-wider mb-0.5">Expires</p>
              <p className="text-white text-xs font-semibold">12/28</p>
            </div>
            <div className="flex -space-x-2">
              <div className="w-5 h-5 rounded-full bg-red-500" />
              <div className="w-5 h-5 rounded-full bg-orange-400" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
