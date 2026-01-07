import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TrendingUp, Lock, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type GoldWalletType = 'MPGW' | 'FPGW';

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
        <Label className="text-sm font-medium">{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                <strong>MPGW:</strong> Gold value follows live market price.<br/>
                <strong>FPGW:</strong> Gold value is locked at the price when you received it.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as GoldWalletType)}
        disabled={disabled}
        className="grid grid-cols-2 gap-3"
      >
        <div className="relative">
          <RadioGroupItem
            value="MPGW"
            id="wallet-mpgw"
            className="peer sr-only"
          />
          <Label
            htmlFor="wallet-mpgw"
            className={`
              flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer
              transition-all duration-200
              ${value === 'MPGW' 
                ? 'border-primary bg-primary/5 shadow-sm' 
                : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            data-testid="select-mpgw"
          >
            <TrendingUp className={`h-6 w-6 mb-2 ${value === 'MPGW' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`font-semibold text-sm ${value === 'MPGW' ? 'text-primary' : ''}`}>
              Market Price
            </span>
            <span className="text-xs text-muted-foreground text-center">MPGW</span>
            {showDescription && (
              <span className="text-xs text-muted-foreground text-center mt-1">
                Value follows market
              </span>
            )}
          </Label>
        </div>
        
        <div className="relative">
          <RadioGroupItem
            value="FPGW"
            id="wallet-fpgw"
            className="peer sr-only"
          />
          <Label
            htmlFor="wallet-fpgw"
            className={`
              flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer
              transition-all duration-200
              ${value === 'FPGW' 
                ? 'border-amber-500 bg-amber-500/5 shadow-sm' 
                : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            data-testid="select-fpgw"
          >
            <Lock className={`h-6 w-6 mb-2 ${value === 'FPGW' ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <span className={`font-semibold text-sm ${value === 'FPGW' ? 'text-amber-600' : ''}`}>
              Fixed Price
            </span>
            <span className="text-xs text-muted-foreground text-center">FPGW</span>
            {showDescription && (
              <span className="text-xs text-muted-foreground text-center mt-1">
                Price locked at purchase
              </span>
            )}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
