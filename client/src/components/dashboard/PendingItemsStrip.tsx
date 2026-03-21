import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowDownLeft, DollarSign, Package, ChevronRight } from 'lucide-react';
import { usePendingItems } from '@/hooks/usePendingItems';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  transfers: <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />,
  payments:  <DollarSign   className="w-3.5 h-3.5 text-amber-700" />,
  deposits:  <Clock        className="w-3.5 h-3.5 text-amber-700" />,
  physical:  <Package      className="w-3.5 h-3.5 text-amber-700" />,
};

export default function PendingItemsStrip() {
  const { items, total } = usePendingItems();

  if (total === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="pending-strip"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[20px] overflow-hidden"
        style={{
          background: 'rgba(255,251,235,0.85)',
          border: '1px solid rgba(251,191,36,0.30)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 16px rgba(217,119,6,0.10)',
        }}
        data-testid="card-pending-items-strip"
      >
        {/* Amber top accent stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]"
          style={{ background: 'linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)' }}
        />

        {/* Subtle amber mesh */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 90% 0%, rgba(251,191,36,0.08) 0%, transparent 60%)' }}
        />

        <div className="relative z-10 p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}
            >
              <Clock className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <span className="text-[13px] font-bold text-gray-800">Pending Actions</span>
            <span
              className="fin-badge ml-1 text-white"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', minWidth: '20px', height: '20px', padding: '0 6px', fontSize: '11px' }}
              data-testid="badge-pending-total"
            >
              {total > 99 ? '99+' : total}
            </span>
          </div>

          {/* Category rows */}
          <div className="space-y-1.5">
            {items.map((item) => (
              <Link key={item.key} href={item.href}>
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-amber-50/70 transition-all cursor-pointer group"
                  style={{ border: '1px solid rgba(251,191,36,0.15)' }}
                  data-testid={`pending-row-${item.key}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(251,191,36,0.12)' }}
                    >
                      {CATEGORY_ICONS[item.key] ?? <Clock className="w-3.5 h-3.5 text-amber-700" />}
                    </div>
                    <span className="text-[12px] font-medium text-gray-700 truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span
                      className="fin-badge text-amber-800"
                      style={{ background: 'rgba(251,191,36,0.20)', border: '1px solid rgba(251,191,36,0.25)', minWidth: '20px', height: '20px', padding: '0 6px', fontSize: '11px' }}
                      data-testid={`badge-count-${item.key}`}
                    >
                      {item.count}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
