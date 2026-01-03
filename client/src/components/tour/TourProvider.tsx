import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  spotlightPadding?: number;
}

interface TourContextType {
  isRunning: boolean;
  currentStep: number;
  startTour: (tourId: string) => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  registerTour: (tourId: string, steps: TourStep[]) => void;
  hasCompletedTour: (tourId: string) => boolean;
  markTourComplete: (tourId: string) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [tours, setTours] = useState<Record<string, TourStep[]>>({});
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [completedTours, setCompletedTours] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('finatrades_completed_tours');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const isRunning = activeTourId !== null;
  const activeSteps = activeTourId ? tours[activeTourId] || [] : [];
  const currentStepData = activeSteps[currentStep];

  const registerTour = useCallback((tourId: string, steps: TourStep[]) => {
    setTours(prev => ({ ...prev, [tourId]: steps }));
  }, []);

  const hasCompletedTour = useCallback((tourId: string) => {
    return completedTours.has(tourId);
  }, [completedTours]);

  const markTourComplete = useCallback((tourId: string) => {
    setCompletedTours(prev => {
      const next = new Set(prev);
      next.add(tourId);
      localStorage.setItem('finatrades_completed_tours', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const startTour = useCallback((tourId: string) => {
    if (tours[tourId] && tours[tourId].length > 0) {
      setActiveTourId(tourId);
      setCurrentStep(0);
    }
  }, [tours]);

  const endTour = useCallback(() => {
    if (activeTourId) {
      markTourComplete(activeTourId);
    }
    setActiveTourId(null);
    setCurrentStep(0);
    setTargetElement(null);
  }, [activeTourId, markTourComplete]);

  const nextStep = useCallback(() => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTour();
    }
  }, [currentStep, activeSteps.length, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStepData?.target) {
      const findElement = () => {
        const element = document.querySelector(currentStepData.target) as HTMLElement;
        if (element) {
          setTargetElement(element);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          setTargetElement(null);
        }
      };
      
      const timer = setTimeout(findElement, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStepData]);

  return (
    <TourContext.Provider value={{
      isRunning,
      currentStep,
      startTour,
      endTour,
      nextStep,
      prevStep,
      registerTour,
      hasCompletedTour,
      markTourComplete,
    }}>
      {children}
      {isRunning && currentStepData && createPortal(
        <TourOverlay
          step={currentStepData}
          stepNumber={currentStep + 1}
          totalSteps={activeSteps.length}
          targetElement={targetElement}
          onNext={nextStep}
          onPrev={prevStep}
          onClose={endTour}
          isFirst={currentStep === 0}
          isLast={currentStep === activeSteps.length - 1}
        />,
        document.body
      )}
    </TourContext.Provider>
  );
}

interface TourOverlayProps {
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  targetElement: HTMLElement | null;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function TourOverlay({
  step,
  stepNumber,
  totalSteps,
  targetElement,
  onNext,
  onPrev,
  onClose,
  isFirst,
  isLast,
}: TourOverlayProps) {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [spotlightRect, setSpotlightRect] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const padding = step.spotlightPadding || 8;

  useEffect(() => {
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      setSpotlightRect({
        top: rect.top + scrollY - padding,
        left: rect.left + scrollX - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      const placement = step.placement || 'bottom';
      let top = 0;
      let left = 0;
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const margin = 16;

      switch (placement) {
        case 'top':
          top = rect.top + scrollY - tooltipHeight - margin;
          left = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + scrollY + margin;
          left = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2;
          left = rect.left + scrollX - tooltipWidth - margin;
          break;
        case 'right':
          top = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + scrollX + margin;
          break;
      }

      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      top = Math.max(16, top);

      setTooltipPosition({ top, left });
    }
  }, [targetElement, step.placement, padding]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        style={{ pointerEvents: 'none' }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'auto' }}
          onClick={onClose}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetElement && (
                <rect
                  x={spotlightRect.left}
                  y={spotlightRect.top}
                  width={spotlightRect.width}
                  height={spotlightRect.height}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {targetElement && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="absolute bg-white rounded-xl shadow-2xl border border-purple-200 overflow-hidden"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              width: 320,
              pointerEvents: 'auto',
              zIndex: 10000,
            }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-white" />
                <span className="text-white font-semibold">{step.title}</span>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-gray-600 text-sm leading-relaxed">{step.content}</p>
            </div>
            
            <div className="px-4 pb-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Step {stepNumber} of {totalSteps}
              </span>
              <div className="flex gap-2">
                {!isFirst && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrev}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onNext}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isLast ? 'Finish' : 'Next'}
                  {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
            
            <div className="h-1 bg-gray-100">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
                style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function TourButton({ tourId, className }: { tourId: string; className?: string }) {
  const { startTour, hasCompletedTour } = useTour();
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => startTour(tourId)}
      className={`gap-2 ${className}`}
      data-testid="button-start-tour"
    >
      <HelpCircle className="w-4 h-4" />
      {hasCompletedTour(tourId) ? 'Replay Tour' : 'Take a Tour'}
    </Button>
  );
}
