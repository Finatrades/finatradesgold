import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getDomainMode } from '@/context/AccountTypeContext';

interface MetalCardProps {
  className?: string;
}

export default function MetalCard({ className = '' }: MetalCardProps) {
  const { user } = useAuth();
  const domainMode = getDomainMode();
  const isPersonal = user?.accountType ? user.accountType !== 'business' : domainMode === 'personal';
  const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim().toUpperCase() || 'CARD HOLDER';
  
  const lastFour = user?.finatradesId?.slice(-4) || '0001';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className={`${className}`}
    >
      <div className="w-[340px] h-[220px] rounded-2xl bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] p-5 shadow-2xl relative overflow-hidden border border-gray-700/50">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 100% 0%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
                              radial-gradient(circle at 0% 100%, rgba(234, 179, 8, 0.2) 0%, transparent 50%)`
          }}
        />
        
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-12 h-9 rounded bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-md relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-center gap-[2px] py-2">
                <div className="h-[1.5px] bg-yellow-700/40 mx-1.5" />
                <div className="h-[1.5px] bg-yellow-700/40 mx-1.5" />
                <div className="h-[1.5px] bg-yellow-700/40 mx-1.5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md">
                <div className="w-4 h-4 bg-white/90 rounded-sm" />
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-base tracking-wide">
                  {isPersonal ? 'FINAGOLD' : 'FINATRADES'}
                </p>
                <p className="text-yellow-500 text-xs font-medium">GOLD MEMBER</p>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-white text-xl tracking-[0.2em] font-medium mb-4">
              4532 <span className="text-gray-400">••••</span> <span className="text-gray-400">••••</span> {lastFour}
            </p>
          </div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">Card Holder</p>
              <p className="text-white text-sm font-semibold tracking-wide">{userName}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">Expires</p>
              <p className="text-white text-sm font-semibold">12/28</p>
            </div>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-red-500" />
              <div className="w-6 h-6 rounded-full bg-orange-400" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
