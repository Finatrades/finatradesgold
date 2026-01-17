import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({ children, onRefresh, disabled = false }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  
  const indicatorY = useTransform(pullDistance, [0, MAX_PULL], [0, MAX_PULL]);
  const indicatorOpacity = useTransform(pullDistance, [0, PULL_THRESHOLD / 2, PULL_THRESHOLD], [0, 0.5, 1]);
  const indicatorScale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, MAX_PULL], [0, 360]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) {
      pullDistance.set(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      const dampedPull = Math.min(diff * 0.5, MAX_PULL);
      pullDistance.set(dampedPull);
    }
  }, [disabled, isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;
    
    const currentPull = pullDistance.get();
    
    if (currentPull >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      animate(pullDistance, PULL_THRESHOLD * 0.7, { duration: 0.2 });
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        animate(pullDistance, 0, { duration: 0.3, ease: 'easeOut' });
      }
    } else {
      animate(pullDistance, 0, { duration: 0.3, ease: 'easeOut' });
    }
  }, [disabled, isRefreshing, onRefresh, pullDistance]);

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
        style={{ 
          y: indicatorY,
          opacity: indicatorOpacity,
          scale: indicatorScale,
          top: -40 
        }}
      >
        <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
          <motion.div
            style={{ rotate: isRefreshing ? undefined : indicatorRotation }}
            animate={isRefreshing ? { rotate: 360 } : undefined}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : undefined}
          >
            <RefreshCw className={`w-5 h-5 text-purple-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.div>
        </div>
      </motion.div>
      
      <div
        ref={containerRef}
        className="h-full overflow-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div style={{ y: indicatorY }}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
