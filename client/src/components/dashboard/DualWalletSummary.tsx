import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BalanceBadge } from "@/components/ui/wallet-selector";
import { TrendingUp, Lock, Wallet, Info, AlertCircle } from "lucide-react";
import { useDualWalletBalance } from "@/hooks/useDualWallet";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DualWalletSummaryProps {
  userId: string;
  className?: string;
}

export function DualWalletSummary({ userId, className }: DualWalletSummaryProps) {
  const { data: balance, isLoading, error } = useDualWalletBalance(userId);

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !balance) {
    return (
      <Card className={cn("bg-destructive/10 border-destructive/20", className)}>
        <CardContent className="flex items-center gap-2 py-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-sm text-destructive">Failed to load wallet balances</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Gold Wallet Summary
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-help">
                <Info className="h-3 w-3 mr-1" />
                Gold-Only Balance
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Your real balance is gold grams. USD values shown are approximate references based on current prices.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WalletCard
          type="LGPW"
          title="Live Gold Price Wallet"
          description="Value follows live gold price"
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          available={balance.mpgw.availableGrams}
          pending={balance.mpgw.pendingGrams}
          lockedBnsl={balance.mpgw.lockedBnslGrams}
          lockedTrade={balance.mpgw.reservedTradeGrams}
          total={balance.mpgw.totalGrams}
          pricePerGram={balance.goldPricePerGram}
          valueUsd={balance.mpgwValueUsd}
        />

        <WalletCard
          type="FPGW"
          title="Fixed Price Gold Wallet"
          description="Value locked at purchase price"
          icon={<Lock className="h-5 w-5 text-amber-500" />}
          available={balance.fpgw.availableGrams}
          pending={balance.fpgw.pendingGrams}
          lockedBnsl={balance.fpgw.lockedBnslGrams}
          lockedTrade={balance.fpgw.reservedTradeGrams}
          total={balance.fpgw.totalGrams}
          pricePerGram={balance.fpgw.weightedAvgPrice}
          valueUsd={balance.fpgwValueUsd}
          isFPGW
        />
      </div>

      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Gold Holdings</span>
            <div className="text-right">
              <div className="text-xl font-bold text-amber-600" data-testid="total-gold-grams">
                {balance.total.totalGrams.toFixed(4)}g
              </div>
              <div className="text-xs text-muted-foreground">
                ≈ ${balance.totalValueUsd.toFixed(2)} <span className="text-[10px]">(Reference)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface WalletCardProps {
  type: 'LGPW' | 'FPGW';
  title: string;
  description: string;
  icon: React.ReactNode;
  available: number;
  pending: number;
  lockedBnsl: number;
  lockedTrade: number;
  total: number;
  pricePerGram: number;
  valueUsd: number;
  isFPGW?: boolean;
}

function WalletCard({
  type,
  title,
  description,
  icon,
  available,
  pending,
  lockedBnsl,
  lockedTrade,
  total,
  pricePerGram,
  valueUsd,
  isFPGW
}: WalletCardProps) {
  return (
    <Card className="relative overflow-hidden" data-testid={`wallet-card-${type.toLowerCase()}`}>
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full",
        type === 'LGPW' ? "bg-emerald-500" : "bg-amber-500"
      )} />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <CardTitle className="text-base">{type}</CardTitle>
              <p className="text-xs text-muted-foreground">{title}</p>
            </div>
          </div>
          {isFPGW && pricePerGram > 0 && (
            <Badge variant="secondary" className="text-xs">
              Avg: ${pricePerGram.toFixed(2)}/g
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-amber-600" data-testid={`${type.toLowerCase()}-total`}>
            {total.toFixed(4)}g
          </span>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">
              ≈ ${valueUsd.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">(Reference)</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <BucketRow 
            label="Available" 
            grams={available} 
            status="available"
            testId={`${type.toLowerCase()}-available`}
          />
          {pending > 0 && (
            <BucketRow 
              label="Pending" 
              grams={pending} 
              status="pending"
              tooltip="Not usable yet - awaiting approval"
              testId={`${type.toLowerCase()}-pending`}
            />
          )}
          {lockedBnsl > 0 && (
            <BucketRow 
              label="Locked (BNSL)" 
              grams={lockedBnsl} 
              status="locked_bnsl"
              tooltip="Locked in BNSL investment plan"
              testId={`${type.toLowerCase()}-locked-bnsl`}
            />
          )}
          {lockedTrade > 0 && (
            <BucketRow 
              label="Reserved (Trade)" 
              grams={lockedTrade} 
              status="locked_trade"
              tooltip="Reserved for FinaBridge trade"
              testId={`${type.toLowerCase()}-locked-trade`}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface BucketRowProps {
  label: string;
  grams: number;
  status: 'available' | 'pending' | 'locked_bnsl' | 'locked_trade';
  tooltip?: string;
  testId?: string;
}

function BucketRow({ label, grams, status, tooltip, testId }: BucketRowProps) {
  const statusColors = {
    available: 'text-emerald-600',
    pending: 'text-amber-600',
    locked_bnsl: 'text-purple-600',
    locked_trade: 'text-blue-600'
  };

  const statusIcons = {
    available: null,
    pending: <Info className="h-3 w-3" />,
    locked_bnsl: <Lock className="h-3 w-3" />,
    locked_trade: <Lock className="h-3 w-3" />
  };

  const row = (
    <div className="flex items-center justify-between text-sm" data-testid={testId}>
      <span className="flex items-center gap-1 text-muted-foreground">
        {statusIcons[status]}
        {label}
      </span>
      <span className={cn("font-medium", statusColors[status])}>
        {grams.toFixed(4)}g
      </span>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{row}</div>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return row;
}
