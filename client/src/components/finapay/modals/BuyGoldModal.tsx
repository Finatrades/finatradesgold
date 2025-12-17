import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Wallet, Building, Loader2, CheckCircle2, ArrowRightLeft, AlertCircle, Copy, Check, Bitcoin, ArrowLeft, Clock, Upload } from 'lucide-react';
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

interface CryptoWallet {
  id: string;
  network: string;
  networkLabel: string;
  walletAddress: string;
  memo?: string | null;
  instructions?: string | null;
  isActive: boolean;
}

interface BuyGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  goldPrice: number;
  spreadPercent: number;
  onConfirm: (grams: number, cost: number) => void;
}

type CryptoStep = 'select_wallet' | 'show_address' | 'submit_proof' | 'submitted';

export default function BuyGoldModal({ isOpen, onClose, goldPrice, spreadPercent, onConfirm }: BuyGoldModalProps) {
  const [method, setMethod] = useState('');
  const [grams, setGrams] = useState('');
  const [usd, setUsd] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods | null>(null);
  
  // Crypto payment state
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<CryptoWallet | null>(null);
  const [cryptoStep, setCryptoStep] = useState<CryptoStep>('select_wallet');
  const [transactionHash, setTransactionHash] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setGrams('');
      setUsd('');
      setMethod('');
      setIsLoading(false);
      setIsLoadingMethods(true);
      setCryptoStep('select_wallet');
      setSelectedWallet(null);
      setTransactionHash('');
      setPaymentRequestId(null);
      
      // Fetch payment methods and crypto wallets
      Promise.all([
        fetch('/api/payment-methods').then(res => res.json()),
        fetch('/api/crypto-wallets/active').then(res => res.json())
      ]).then(([methodsData, walletsData]) => {
        setPaymentMethods(methodsData);
        setCryptoWallets(walletsData.wallets || []);
        
        // Set default method - prefer crypto if wallets available
        if (walletsData.wallets?.length > 0) setMethod('crypto');
        else if (methodsData.stripe?.enabled) setMethod('card');
        else if (methodsData.bankTransfer?.enabled) setMethod('bank');
      }).catch(() => {
        setPaymentMethods(null);
        setCryptoWallets([]);
      }).finally(() => setIsLoadingMethods(false));
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
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
    toast({ title: "Copied", description: "Address copied to clipboard" });
  };

  const handleSelectCryptoWallet = (wallet: CryptoWallet) => {
    setSelectedWallet(wallet);
  };

  const handleProceedToAddress = async () => {
    if (!selectedWallet || numericGrams <= 0) return;
    
    setIsLoading(true);
    try {
      // Create the payment request
      const response = await fetch('/api/crypto-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          walletConfigId: selectedWallet.id,
          amountUsd: totalCost.toFixed(2),
          goldGrams: numericGrams.toFixed(6),
          goldPriceAtTime: goldPrice.toFixed(2),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment request');
      }
      
      setPaymentRequestId(data.paymentRequest.id);
      setCryptoStep('show_address');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create payment request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!paymentRequestId || !transactionHash.trim()) {
      toast({
        title: "Transaction Hash Required",
        description: "Please enter your transaction hash to submit proof of payment.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/crypto-payments/${paymentRequestId}/submit-proof`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionHash: transactionHash.trim(),
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit proof');
      }
      
      setCryptoStep('submitted');
      toast({
        title: "Payment Submitted",
        description: "Your payment is under review. Gold will be credited once verified.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit proof",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
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
      // For crypto, we handle it with the step-based flow
      if (cryptoStep === 'select_wallet' && selectedWallet) {
        await handleProceedToAddress();
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

  const hasCryptoWallets = cryptoWallets.length > 0;
  const enabledMethodsCount = 
    (paymentMethods?.stripe?.enabled ? 1 : 0) + 
    (hasCryptoWallets ? 1 : 0) + 
    (paymentMethods?.bankTransfer?.enabled ? 1 : 0);

  const handleBack = () => {
    if (cryptoStep === 'show_address') {
      setCryptoStep('select_wallet');
    } else if (cryptoStep === 'submit_proof') {
      setCryptoStep('show_address');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {method === 'crypto' && cryptoStep !== 'select_wallet' && (
              <Button variant="ghost" size="sm" className="mr-1 -ml-2 h-8 w-8 p-0" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <span className="text-secondary">Buy Gold</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {method === 'crypto' && cryptoStep === 'show_address' 
              ? 'Send crypto to the wallet address below'
              : method === 'crypto' && cryptoStep === 'submit_proof'
              ? 'Submit your transaction hash as proof'
              : method === 'crypto' && cryptoStep === 'submitted'
              ? 'Payment submitted for review'
              : 'Convert fiat or crypto to digital gold instantly.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          {/* Crypto Payment - Submitted State */}
          {method === 'crypto' && cryptoStep === 'submitted' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Payment Submitted</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your payment is being reviewed. Once verified, {numericGrams.toFixed(4)}g of gold will be credited to your wallet.
                </p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Verification typically takes 1-24 hours depending on network confirmations.</span>
              </div>
              <Button className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          )}

          {/* Crypto Payment - Show Address */}
          {method === 'crypto' && cryptoStep === 'show_address' && selectedWallet && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Bitcoin className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold">{selectedWallet.networkLabel}</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Send to this address:</Label>
                    <div className="mt-1 p-3 bg-white rounded-lg border flex items-center gap-2">
                      <code className="text-sm font-mono flex-1 break-all">{selectedWallet.walletAddress}</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(selectedWallet.walletAddress)}
                      >
                        {copiedAddress ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {selectedWallet.memo && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Memo/Tag (required):</Label>
                      <div className="mt-1 p-2 bg-white rounded-lg border text-sm font-mono">
                        {selectedWallet.memo}
                      </div>
                    </div>
                  )}
                  
                  {selectedWallet.instructions && (
                    <p className="text-xs text-orange-700">{selectedWallet.instructions}</p>
                  )}
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-lg border p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount to send:</span>
                  <span className="font-bold text-secondary">${totalCost.toFixed(2)} worth</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gold to receive:</span>
                  <span className="font-medium">{numericGrams.toFixed(4)}g</span>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>Send the exact amount shown above</li>
                  <li>Only use the {selectedWallet.networkLabel} network</li>
                  <li>Save your transaction hash for the next step</li>
                </ul>
              </div>
              
              <Button className="w-full" onClick={() => setCryptoStep('submit_proof')}>
                <Upload className="w-4 h-4 mr-2" />
                I've Sent the Payment
              </Button>
            </div>
          )}

          {/* Crypto Payment - Submit Proof */}
          {method === 'crypto' && cryptoStep === 'submit_proof' && (
            <div className="space-y-4">
              <div>
                <Label>Transaction Hash / TX ID</Label>
                <Textarea 
                  placeholder="Enter your transaction hash..."
                  className="mt-2 font-mono text-sm"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  rows={2}
                  data-testid="input-transaction-hash"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is the unique ID of your transaction on the blockchain.
                </p>
              </div>
              
              <div className="bg-muted/30 rounded-lg border p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium">{selectedWallet?.networkLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">${totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gold:</span>
                  <span className="font-medium">{numericGrams.toFixed(4)}g</span>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleSubmitProof}
                disabled={!transactionHash.trim() || isLoading}
                data-testid="button-submit-proof"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Submit for Verification</>
                )}
              </Button>
            </div>
          )}

          {/* Normal Flow - Method Selection & Amount Input */}
          {!(method === 'crypto' && cryptoStep !== 'select_wallet') && (
            <>
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
                    onValueChange={(val) => {
                      setMethod(val);
                      if (val !== 'crypto') {
                        setCryptoStep('select_wallet');
                        setSelectedWallet(null);
                      }
                    }} 
                    className={`grid gap-2 ${enabledMethodsCount === 1 ? 'grid-cols-1' : enabledMethodsCount === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
                  >
                    {paymentMethods?.stripe?.enabled && (
                      <div>
                        <RadioGroupItem value="card" id="card" className="peer sr-only" />
                        <Label htmlFor="card" className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/50 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all text-xs text-center h-20 text-foreground">
                          <CreditCard className="w-5 h-5 mb-1" />
                          Card
                        </Label>
                      </div>
                    )}
                    {hasCryptoWallets && (
                      <div>
                        <RadioGroupItem value="crypto" id="crypto" className="peer sr-only" />
                        <Label htmlFor="crypto" className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/50 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all text-xs text-center h-20 text-foreground relative">
                          <Wallet className="w-5 h-5 mb-1" />
                          Crypto
                        </Label>
                      </div>
                    )}
                    {paymentMethods?.bankTransfer?.enabled && (
                      <div>
                        <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
                        <Label htmlFor="bank" className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/50 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all text-xs text-center h-20 text-foreground">
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

              {/* Crypto Wallet Selection */}
              {method === 'crypto' && cryptoStep === 'select_wallet' && (
                <div className="space-y-3">
                  <Label>Select Cryptocurrency</Label>
                  <div className="grid gap-2">
                    {cryptoWallets.map((wallet) => (
                      <div 
                        key={wallet.id}
                        onClick={() => handleSelectCryptoWallet(wallet)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3 ${
                          selectedWallet?.id === wallet.id 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        data-testid={`crypto-wallet-${wallet.network}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          selectedWallet?.id === wallet.id ? 'bg-orange-500 text-white' : 'bg-gray-100'
                        }`}>
                          <Bitcoin className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{wallet.networkLabel}</p>
                          <p className="text-xs text-muted-foreground truncate">{wallet.walletAddress.slice(0, 20)}...</p>
                        </div>
                        {selectedWallet?.id === wallet.id && (
                          <CheckCircle2 className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                    ))}
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
                        <span className="font-medium">{paymentMethods.bankTransfer.bankName}</span>
                      </div>
                    )}
                    {paymentMethods.bankTransfer.accountName && (
                      <div className="flex justify-between items-center">
                        <span className="opacity-70">Account Name:</span>
                        <span className="font-medium">{paymentMethods.bankTransfer.accountName}</span>
                      </div>
                    )}
                    {paymentMethods.bankTransfer.iban && (
                      <div className="flex justify-between items-center">
                        <span className="opacity-70">IBAN:</span>
                        <span className="font-medium">{paymentMethods.bankTransfer.iban}</span>
                      </div>
                    )}
                    {paymentMethods.bankTransfer.swiftCode && (
                      <div className="flex justify-between items-center">
                        <span className="opacity-70">SWIFT:</span>
                        <span className="font-medium">{paymentMethods.bankTransfer.swiftCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Amount Inputs */}
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

              {/* Summary Section */}
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
                      </span>
                    </div>
                 </div>
              )}

              {/* Confirm Button */}
              <Button 
                className="w-full h-12 bg-primary text-white hover:bg-primary/90 font-bold"
                disabled={numericGrams <= 0 || isLoading || isLoadingMethods || !method || enabledMethodsCount === 0 || (method === 'crypto' && !selectedWallet)}
                onClick={handleConfirm}
                data-testid="button-confirm-purchase"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                ) : method === 'crypto' ? (
                  <><Wallet className="w-4 h-4 mr-2" /> Continue with Crypto</>
                ) : method === 'bank' ? (
                  <><Building className="w-4 h-4 mr-2" /> Confirm Bank Transfer</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Purchase</>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
