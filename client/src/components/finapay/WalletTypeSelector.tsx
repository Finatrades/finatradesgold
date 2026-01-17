import React from 'react';
import { Label } from '@/components/ui/label';
import { TrendingUp, Lock, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type GoldWalletType = 'LGPW' | 'FGPW';

interface WalletTypeSelectorProps {
  value: GoldWalletType;
  onChange: (value: GoldWalletType) => void;
  disabled?: boolean;
  showDescription?: boolean;
  label?: string;
  className?: string;
}

export default function WalletTypeSelector({
  value,
  onChange,
  disabled = false,
  showDescription = true,
  label = "Select Wallet Type",
  className = ""
}: WalletTypeSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`} data-testid="wallet-type-selector">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium text-gray-700">{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                <strong>LGPW:</strong> Gold value follows live market price.<br/>
                <strong>FGPW:</strong> Gold value is locked at the price when you received it.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
        <button
          type="button"
          onClick={() => !disabled && onChange('LGPW')}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm
            transition-all duration-200 touch-target
            ${value === 'LGPW' 
              ? 'bg-white text-purple-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
          `}
          data-testid="select-mpgw"
        >
          <TrendingUp className="h-4 w-4" />
          <span>LGPW</span>
        </button>
        
        <button
          type="button"
          onClick={() => !disabled && onChange('FGPW')}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm
            transition-all duration-200 touch-target
            ${value === 'FGPW' 
              ? 'bg-white text-amber-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
          `}
          data-testid="select-fpgw"
        >
          <Lock className="h-4 w-4" />
          <span>FGPW</span>
        </button>
      </div>
      
      {showDescription && (
        <p className="text-xs text-gray-500 text-center">
          {value === 'LGPW' 
            ? 'Market Price - Value follows live market' 
            : 'Fixed Price - Value locked at purchase'
          }
        </p>
      )}
    </div>
  );
}
