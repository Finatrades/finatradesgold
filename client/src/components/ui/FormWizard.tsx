import React from 'react';
import { Check } from 'lucide-react';

export interface WizardStep {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  isComplete?: boolean;
  isLocked?: boolean;
}

interface FormWizardProps {
  steps: WizardStep[];
  currentStep: string;
  onStepChange?: (stepId: string) => void;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  'data-testid'?: string;
}

export function FormWizard({
  steps,
  currentStep,
  onStepChange,
  orientation = 'vertical',
  className = '',
  'data-testid': dataTestId,
}: FormWizardProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  if (orientation === 'horizontal') {
    return (
      <div className={`flex items-center gap-0 ${className}`} data-testid={dataTestId ?? "form-wizard-horizontal"}>
        {steps.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.isComplete || idx < currentIndex;
          const isClickable = !step.isLocked && (isCompleted || isActive) && !!onStepChange;

          return (
            <React.Fragment key={step.id}>
              <div
                className="flex flex-col items-center gap-1.5"
                data-testid={`wizard-step-${step.id}`}
              >
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepChange?.(step.id)}
                  className={`
                    w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all
                    ${isActive
                      ? 'bg-primary border-primary text-white shadow-md shadow-primary/30'
                      : isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-background border-muted-foreground/30 text-muted-foreground'}
                    ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                  `}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted && !isActive ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </button>
                <span
                  className={`text-xs font-medium text-center max-w-[72px] leading-tight
                    ${isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mb-5 mx-1 transition-colors ${
                    idx < currentIndex ? 'bg-green-500' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <nav className={`flex flex-col gap-1 ${className}`} data-testid={dataTestId ?? "form-wizard-vertical"}>
      {steps.map((step, idx) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.isComplete || idx < currentIndex;
        const isClickable = !step.isLocked && (isCompleted || isActive) && !!onStepChange;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onStepChange?.(step.id)}
            data-testid={`wizard-step-${step.id}`}
            aria-current={isActive ? 'step' : undefined}
            className={`
              relative flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all
              ${isActive
                ? 'bg-primary/10 border border-primary/30'
                : isCompleted
                  ? 'hover:bg-muted/50'
                  : 'opacity-60'}
              ${isClickable ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            <div
              className={`
                mt-0.5 w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors
                ${isActive
                  ? 'bg-primary border-primary text-white'
                  : isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-background border-muted-foreground/30 text-muted-foreground'}
              `}
            >
              {isCompleted && !isActive ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <span>{idx + 1}</span>
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{step.description}</p>
              )}
            </div>
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default FormWizard;
