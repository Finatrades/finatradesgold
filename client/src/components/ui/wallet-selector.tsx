import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Lock, Info, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type GoldWalletType = 'LGPW' | 'FGPW';

interface WalletSelectorProps {
  value: GoldWalletType;
  onChange: (wallet: GoldWalletType) => void;
  mpgwBalance?: number;
  fpgwBalance?: number;
  fpgwAvgPrice?: number;
  currentGoldPrice?: number;
  disabled?: boolean;
  showBalances?: boolean;
  className?: string;
}

export function WalletSelector({
  value,
  onChange,
  mpgwBalance = 0,
  fpgwBalance = 0,
  fpgwAvgPrice = 0,
  currentGoldPrice = 0,
  disabled = false,
  showBalances = true,
  className
}: WalletSelectorProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-sm font-medium text-muted-foreground">Select Gold Wallet</label>
      <div className="grid grid-cols-2 gap-3">
        <WalletCard
          type="LGPW"
          selected={value === 'LGPW'}
          onClick={() => !disabled && onChange('LGPW')}
          balance={mpgwBalance}
          price={currentGoldPrice}
          disabled={disabled}
          showBalance={showBalances}
        />
        <WalletCard
          type="FGPW"
          selected={value === 'FGPW'}
          onClick={() => !disabled && onChange('FGPW')}
          balance={fpgwBalance}
          price={fpgwAvgPrice}
          disabled={disabled}
          showBalance={showBalances}
        />
      </div>
    </div>
  );
}

interface WalletCardProps {
  type: GoldWalletType;
  selected: boolean;
  onClick: () => void;
  balance: number;
  price: number;
  disabled: boolean;
  showBalance: boolean;
}

function WalletCard({ type, selected, onClick, balance, price, disabled, showBalance }: WalletCardProps) {
  const isLGPW = type === 'LGPW';
  const title = isLGPW ? 'Market Price' : 'Fixed Price';
  const description = isLGPW 
    ? 'Value follows live gold price' 
    : 'Value locked at purchase price';
  const usdValue = balance * price;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            data-testid={`wallet-select-${type.toLowerCase()}`}
            className={cn(
              "relative flex flex-col p-4 rounded-xl border-2 transition-all text-left",
              "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50",
              selected 
                ? "border-primary bg-primary/5 shadow-sm" 
                : "border-border bg-card hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {selected && (
              <div className="absolute top-2 right-2">
                <Badge variant="default" className="text-xs">Selected</Badge>
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              {isLGPW ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <Lock className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-semibold text-base">{type}</span>
            </div>
            
            <span className="text-xs text-muted-foreground mb-3">{title}</span>
            
            {showBalance && (
              <div className="mt-auto pt-2 border-t border-border/50">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-amber-600">{balance.toFixed(4)}g</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>≈ ${usdValue.toFixed(2)}</span>
                  <span className="text-[10px]">(Reference)</span>
                </div>
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium">{title} Gold Wallet ({type})</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          {isLGPW ? (
            <p className="text-xs mt-1">Your gold's USD value changes with the live market price.</p>
          ) : (
            <p className="text-xs mt-1">Your gold's USD value is locked at the price you paid (FIFO).</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface WalletDropdownProps {
  value: GoldWalletType;
  onChange: (wallet: GoldWalletType) => void;
  disabled?: boolean;
  className?: string;
}

export function WalletDropdown({ value, onChange, disabled, className }: WalletDropdownProps) {
  const isLGPW = value === 'LGPW';
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className={cn("justify-between min-w-[140px]", className)}
          data-testid="wallet-dropdown-trigger"
        >
          <span className="flex items-center gap-2">
            {isLGPW ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <Lock className="h-4 w-4 text-amber-500" />
            )}
            {value}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem 
          onClick={() => onChange('LGPW')}
          data-testid="wallet-option-mpgw"
        >
          <TrendingUp className="h-4 w-4 mr-2 text-emerald-500" />
          <div className="flex flex-col">
            <span className="font-medium">LGPW</span>
            <span className="text-xs text-muted-foreground">Market Price Wallet</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onChange('FGPW')}
          data-testid="wallet-option-fpgw"
        >
          <Lock className="h-4 w-4 mr-2 text-amber-500" />
          <div className="flex flex-col">
            <span className="font-medium">FGPW</span>
            <span className="text-xs text-muted-foreground">Fixed Price Wallet</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BalanceBadgeProps {
  status: 'available' | 'pending' | 'locked_bnsl' | 'locked_trade';
  grams: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function BalanceBadge({ status, grams, showLabel = true, size = 'md' }: BalanceBadgeProps) {
  const config = {
    available: { 
      label: 'Available', 
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: null
    },
    pending: { 
      label: 'Pending', 
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      icon: <Info className="h-3 w-3" />,
      tooltip: 'Not usable yet - awaiting approval'
    },
    locked_bnsl: { 
      label: 'BNSL Locked', 
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      icon: <Lock className="h-3 w-3" />,
      tooltip: 'Locked in BNSL plan'
    },
    locked_trade: { 
      label: 'Trade Locked', 
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: <Lock className="h-3 w-3" />,
      tooltip: 'Reserved for FinaBridge trade'
    }
  };

  const { label, className, icon, tooltip } = config[status] as any;
  
  if (grams <= 0) return null;

  const badge = (
    <Badge 
      variant="outline" 
      className={cn(
        className, 
        "border-0",
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
      )}
      data-testid={`balance-badge-${status}`}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {showLabel && <span className="mr-1">{label}:</span>}
      <span className="font-semibold">{grams.toFixed(4)}g</span>
    </Badge>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
