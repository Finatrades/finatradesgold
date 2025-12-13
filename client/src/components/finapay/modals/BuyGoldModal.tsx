import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Wallet, Building, Loader2, CheckCircle2, ArrowRightLeft, ExternalLink, AlertCircle, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethods {
  stripe: { enabled: boolean; publishableKey?: string | null };
  paypal: { enabled: boolean; clientId?: string | null; mode?: string | null };
  bankTransfer: {
    enabled: boolean;
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    routingNumber?: string | null;
    swiftCode?: string | null;
    iban?: string | null;
    instructions?: string | null;
  };
  binancePay: { enabled: boolean };
  minDeposit: number;
  maxDeposit: number;
}

interface BuyGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  goldPrice: number;
  spreadPercent: number;
  onConfirm: (grams: number, cost: number) => void;
}

export default function BuyGoldModal({ isOpen, onClose, goldPrice, spreadPercent, onConfirm }: BuyGoldModalProps) {
  const [method, setMethod] = useState('');
  const [grams, setGrams] = useState('');
  const [usd, setUsd] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods | null>(null);
  const [binanceCheckoutUrl, setBinanceCheckoutUrl] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setGrams('');
      setUsd('');
      setMethod('');
      setIsLoading(false);
      setIsLoadingMethods(true);
      setBinanceCheckoutUrl(null);
      
      fetch('/api/payment-methods')
        .then(res => res.json())
        .then(data => {
          setPaymentMethods(data);
          // Set default method to first enabled one
          if (data.stripe?.enabled) setMethod('card');
          else if (data.binancePay?.enabled) setMethod('crypto');
          else if (data.bankTransfer?.enabled) setMethod('bank');
        })
        .catch(() => setPaymentMethods(null))
        .finally(() => setIsLoadingMethods(false));
    }
  }, [isOpen]);

  const handleGramsChange = (val: string) => {
    setGrams(val);
    if (!val) {
      setUsd('');
      return;
    }
    const numGrams = parseFloat(val);
    if (!isNaN(numGrams)) {
      setUsd((numGrams * goldPrice).toFixed(2));
    }
  };

  const handleUsdChange = (val: string) => {
    setUsd(val);
    if (!val) {
      setGrams('');
      return;
    }
    const numUsd = parseFloat(val);
    if (!isNaN(numUsd)) {
      setGrams((numUsd / goldPrice).toFixed(4));
    }
  };

  const numericGrams = parseFloat(grams) || 0;
  const numericUsd = parseFloat(usd) || 0;
  const fee = numericUsd * (spreadPercent / 100);
  const totalCost = numericUsd + fee;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  const handleConfirm = async () => {
    // Guard: require a valid payment method
    if (!method || isLoadingMethods) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method before continuing.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    if (method === 'crypto') {
      try {
        const response = await fetch('/api/binance-pay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            amountUsd: totalCost.toFixed(2),
            goldGrams: numericGrams.toFixed(6),
            goldPriceUsdPerGram: goldPrice.toFixed(2),
            returnUrl: `${window.location.origin}/finapay?payment=success`,
            cancelUrl: `${window.location.origin}/finapay?payment=cancelled`,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create payment');
        }
        
        if (data.success && data.transaction?.checkoutUrl) {
          setBinanceCheckoutUrl(data.transaction.checkoutUrl);
          toast({
            title: "Payment Ready",
            description: "Click the button below to complete payment with Binance Pay",
          });
        } else {
          throw new Error('Failed to create Binance Pay order');
        }
      } catch (error) {
        toast({
          title: "Payment Error",
          description: error instanceof Error ? error.message : "Failed to initiate payment",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else if (method === 'bank') {
      setIsLoading(false);
      toast({
        title: "Bank Transfer Instructions",
        description: "Please transfer the exact amount to our bank account. Your gold will be credited once payment is confirmed.",
      });
    } else {
      setTimeout(() => {
        setIsLoading(false);
        onConfirm(numericGrams, numericUsd);
      }, 1500);
    }
  };

  const handleOpenBinanceCheckout = () => {
    if (binanceCheckoutUrl) {
      window.open(binanceCheckoutUrl, '_blank');
      onClose();
      toast({
        title: "Payment Started",
        description: "Complete your payment in the Binance Pay window. Your gold will be credited once confirmed.",
      });
    }
  };

  const enabledMethodsCount = paymentMethods ? 
    [paymentMethods.stripe?.enabled, paymentMethods.binancePay?.enabled, paymentMethods.bankTransfer?.enabled].filter(Boolean).length : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-secondary">Buy Gold</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Convert fiat or crypto to digital gold instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          {/* Method Selection */}
          {isLoadingMethods ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading payment methods...</span>
            </div>
          ) : enabledMethodsCount > 0 ? (
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup 
                value={method} 
                onValueChange={setMethod} 
                className={`grid gap-2 ${enabledMethodsCount === 1 ? 'grid-cols-1' : enabledMethodsCount === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
              >
                {paymentMethods?.stripe?.enabled && (
                  <div>
                    <RadioGroupItem value="card" id="card" className="peer sr-only" />
                    <Label htmlFor="card" className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/50 cursor-pointer peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary transition-all text-xs text-center h-20 text-muted-foreground">
                      <CreditCard className="w-5 h-5 mb-1" />
                      Card
                    </Label>
                  </div>
                )}
                {paymentMethods?.binancePay?.enabled && (
                  <div>
                    <RadioGroupItem value="crypto" id="crypto" className="peer sr-only" />
                    <Label htmlFor="crypto" className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/50 cursor-pointer peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary transition-all text-xs text-center h-20 text-muted-foreground relative">
                      <Wallet className="w-5 h-5 mb-1" />
                      Crypto
                      <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                    </Label>
                  </div>
                )}
                {paymentMethods?.bankTransfer?.enabled && (
                  <div>
                    <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
                    <Label htmlFor="bank" className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/50 cursor-pointer peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary transition-all text-xs text-center h-20 text-muted-foreground">
                      <Building className="w-5 h-5 mb-1" />
                      Bank
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">No payment methods available</p>
                  <p className="text-xs mt-0.5 opacity-80">Please contact support or try again later.</p>
                </div>
              </div>
            </div>
          )}

          {/* Crypto Payment Info */}
          {method === 'crypto' && paymentMethods?.binancePay?.enabled && (
            <div className="p-3 rounded-lg border bg-green-50 border-green-200 text-green-800 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Pay with Binance Pay</p>
                  <p className="text-xs mt-0.5 opacity-80">Use USDT, BTC, ETH, or 50+ cryptocurrencies</p>
                </div>
              </div>
            </div>
          )}

          {/* Bank Transfer Details */}
          {method === 'bank' && paymentMethods?.bankTransfer?.enabled && (
            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 text-sm space-y-3">
              <p className="font-medium">Bank Transfer Details</p>
              <div className="space-y-2 text-xs">
                {paymentMethods.bankTransfer.bankName && (
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">Bank:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{paymentMethods.bankTransfer.bankName}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(paymentMethods.bankTransfer.bankName!)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {paymentMethods.bankTransfer.accountName && (
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">Account Name:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{paymentMethods.bankTransfer.accountName}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(paymentMethods.bankTransfer.accountName!)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {paymentMethods.bankTransfer.accountNumber && (
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">Account Number:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{paymentMethods.bankTransfer.accountNumber}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(paymentMethods.bankTransfer.accountNumber!)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {paymentMethods.bankTransfer.iban && (
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">IBAN:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{paymentMethods.bankTransfer.iban}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(paymentMethods.bankTransfer.iban!)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {paymentMethods.bankTransfer.swiftCode && (
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">SWIFT:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{paymentMethods.bankTransfer.swiftCode}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(paymentMethods.bankTransfer.swiftCode!)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {paymentMethods.bankTransfer.instructions && (
                  <div className="pt-2 border-t border-blue-200">
                    <p className="opacity-70 mb-1">Instructions:</p>
                    <p className="font-medium">{paymentMethods.bankTransfer.instructions}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dual Inputs */}
          <div className="space-y-4">
            <div className="relative">
              <Label className="mb-2 block">Amount (Gold Grams)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.0000" 
                  className="h-12 text-lg font-bold bg-background border-input pr-16"
                  value={grams}
                  onChange={(e) => handleGramsChange(e.target.value)}
                  data-testid="input-gold-grams"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary font-medium">
                  g
                </div>
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
               <div className="bg-white border border-border p-1.5 rounded-full text-muted-foreground shadow-sm">
                  <ArrowRightLeft className="w-4 h-4 rotate-90" />
               </div>
            </div>

            <div className="relative">
              <Label className="mb-2 block">Amount (USD Equivalent)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  className="h-12 text-lg font-bold bg-background border-input pr-16"
                  value={usd}
                  onChange={(e) => handleUsdChange(e.target.value)}
                  data-testid="input-usd-amount"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 font-medium">
                  USD
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section Inline */}
          {numericGrams > 0 && (
             <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price / g</span>
                  <span className="text-foreground font-medium">${goldPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee ({spreadPercent}%)</span>
                  <span className="text-foreground font-medium">${fee.toFixed(2)}</span>
                </div>
                <Separator className="bg-border my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-medium">Total Cost</span>
                  <span className="text-xl font-bold text-secondary">
                    ${totalCost.toFixed(2)}
                    {method === 'crypto' && <span className="text-xs font-normal ml-1">USDT</span>}
                  </span>
                </div>
             </div>
          )}

          {/* Binance Checkout Button */}
          {binanceCheckoutUrl ? (
            <Button 
              className="w-full h-12 bg-[#F0B90B] text-black hover:bg-[#F0B90B]/90 font-bold"
              onClick={handleOpenBinanceCheckout}
              data-testid="button-binance-checkout"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Binance Pay
            </Button>
          ) : (
            <Button 
              className="w-full h-12 bg-secondary text-white hover:bg-secondary/90 font-bold"
              disabled={numericGrams <= 0 || isLoading || isLoadingMethods || !method || enabledMethodsCount === 0}
              onClick={handleConfirm}
              data-testid="button-confirm-purchase"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
              ) : method === 'crypto' ? (
                <><Wallet className="w-4 h-4 mr-2" /> Pay with Crypto</>
              ) : method === 'bank' ? (
                <><Building className="w-4 h-4 mr-2" /> Confirm Bank Transfer</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Purchase</>
              )}
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
