import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpRight, CheckCircle2, DollarSign, Loader2, Building2, CreditCard, Coins, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTransactionPin } from '@/components/TransactionPinPrompt';
import { usdToGold, goldToUsd, roundGold, roundUsd, GOLD_INPUT_HELPER } from '@/lib/goldConversion';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
  goldBalance?: number;
}

export default function WithdrawalModal({ isOpen, onClose, walletBalance, goldBalance = 0 }: WithdrawalModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'submitted'>('form');
  const [amount, setAmount] = useState('');
  const [goldAmount, setGoldAmount] = useState('');
  const [inputMode, setInputMode] = useState<'usd' | 'gold'>('usd');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [goldPrice, setGoldPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState(false);
  
  const { requirePin, TransactionPinPromptComponent } = useTransactionPin();

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setAmount('');
      setGoldAmount('');
      setInputMode('usd');
      setBankName('');
      setAccountName('');
      setAccountNumber('');
      setRoutingNumber('');
      setSwiftCode('');
      setPriceError(false);
      
      fetchGoldPrice();
    }
  }, [isOpen]);

  const fetchGoldPrice = async () => {
    setPriceLoading(true);
    setPriceError(false);
    try {
      const response = await fetch('/api/gold-price');
      if (!response.ok) throw new Error('Failed to fetch price');
      const data = await response.json();
      if (data.pricePerGram && data.pricePerGram > 0) {
        setGoldPrice(data.pricePerGram);
      } else {
        throw new Error('Invalid price data');
      }
    } catch (error) {
      console.error('Failed to load gold price');
      setPriceError(true);
      toast.error("Failed to load current gold price. Please try again.");
    } finally {
      setPriceLoading(false);
    }
  };

  const handleUsdChange = (val: string) => {
    setAmount(val);
    if (!val) {
      setGoldAmount('');
      return;
    }
    const numUsd = parseFloat(val);
    if (!isNaN(numUsd) && goldPrice > 0) {
      setGoldAmount(usdToGold(numUsd, goldPrice).toFixed(6));
    }
  };

  const handleGoldChange = (val: string) => {
    setGoldAmount(val);
    if (!val) {
      setAmount('');
      return;
    }
    const numGold = parseFloat(val);
    if (!isNaN(numGold) && goldPrice > 0) {
      setAmount(goldToUsd(numGold, goldPrice).toFixed(2));
    }
  };

  const toggleInputMode = () => {
    setInputMode(inputMode === 'usd' ? 'gold' : 'usd');
  };

  const numericAmount = parseFloat(amount) || 0;
  const numericGold = parseFloat(goldAmount) || 0;
  
  // Calculate effective balances - gold is the primary balance
  const effectiveGoldBalance = goldBalance > 0 ? goldBalance : (goldPrice > 0 ? walletBalance / goldPrice : 0);
  const effectiveBalance = goldPrice > 0 ? effectiveGoldBalance * goldPrice : walletBalance;
  
  // Check if gold balance is sufficient
  const hasInsufficientGold = numericGold > effectiveGoldBalance;
  const hasInsufficientBalance = numericAmount > effectiveBalance;

  const handleSubmit = async () => {
    if (!user || !amount || !bankName || !accountName || !accountNumber) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (priceError || goldPrice <= 0) {
      toast.error("Cannot proceed without valid gold price. Please try again.");
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check both USD and gold balance
    if (hasInsufficientGold || hasInsufficientBalance) {
      toast.error("Insufficient balance");
      return;
    }

    let pinToken: string;
    try {
      pinToken = await requirePin({
        userId: user.id,
        action: 'withdraw_funds',
        title: 'Authorize Withdrawal',
        description: `Enter your 6-digit PIN to withdraw $${amountNum.toFixed(2)} (${numericGold.toFixed(4)}g gold)`,
      });
    } catch (error) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/withdrawal-requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'x-pin-token': pinToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          amountUsd: parseFloat(amount).toString(),
          goldGrams: numericGold.toFixed(6),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          bankName,
          accountName,
          accountNumber,
          routingNumber: routingNumber || null,
          swiftCode: swiftCode || null,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit withdrawal request');
      }
      
      const data = await res.json();
      
      setReferenceNumber(data.request.referenceNumber);
      setStep('submitted');
      toast.success("Withdrawal request submitted");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to submit withdrawal request";
      toast.error(errorMessage, {
        description: errorMessage.includes('balance') 
          ? 'Please check your available balance and try again.'
          : 'Please try again or contact support if the problem persists.',
        action: {
          label: 'Retry',
          onClick: () => handleSubmit(),
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    onClose();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-purple-500" />
            <span>Withdraw Funds</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 'form' && "Enter your bank details and withdrawal amount"}
            {step === 'submitted' && "Withdrawal request submitted successfully"}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Panel - Balance & Amount */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-50 rounded-xl p-5 border border-purple-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Available Balance</p>
                    <p className="text-2xl font-bold text-gray-900">${effectiveBalance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{effectiveGoldBalance.toFixed(4)}g gold</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-purple-200">
                  {/* Input Mode Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Amount to Withdraw ({inputMode === 'usd' ? 'USD' : 'Gold'}) *
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      onClick={toggleInputMode}
                    >
                      <ArrowRightLeft className="w-3 h-3 mr-1" />
                      Switch to {inputMode === 'usd' ? 'Gold' : 'USD'}
                    </Button>
                  </div>
                  
                  {inputMode === 'usd' ? (
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        type="number"
                        value={amount}
                        onChange={(e) => handleUsdChange(e.target.value)}
                        placeholder="0.00"
                        className="pl-9 bg-white border-gray-200 text-lg font-semibold"
                        max={effectiveBalance}
                        data-testid="input-withdrawal-amount"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                      <Input 
                        type="number"
                        value={goldAmount}
                        onChange={(e) => handleGoldChange(e.target.value)}
                        placeholder="0.0000"
                        step="0.0001"
                        className="pl-9 pr-10 bg-white border-gray-200 text-lg font-semibold"
                        max={effectiveGoldBalance}
                        data-testid="input-withdrawal-gold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">g</span>
                    </div>
                  )}
                  
                  {/* Equivalent display */}
                  {(numericAmount > 0 || numericGold > 0) && (
                    <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                      <ArrowRightLeft className="w-3 h-3" />
                      {inputMode === 'usd' 
                        ? `≈ ${numericGold.toFixed(4)}g gold` 
                        : `≈ $${numericAmount.toFixed(2)} USD`
                      }
                      <span className="text-xs">@ ${goldPrice.toFixed(2)}/g</span>
                    </div>
                  )}
                  
                  {priceError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-md mt-2">
                      <span className="text-red-500">⚠️</span>
                      <span>Failed to load gold price. <button className="underline" onClick={fetchGoldPrice}>Retry</button></span>
                    </div>
                  )}
                  
                  {(hasInsufficientBalance || hasInsufficientGold) && !priceError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-md mt-2">
                      <span className="text-red-500">⚠️</span>
                      <span>Insufficient funds. Your balance is ${effectiveBalance.toFixed(2)} ({effectiveGoldBalance.toFixed(4)}g)</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-purple-50 text-purple-800 text-xs p-4 rounded-lg flex items-start gap-2 border border-purple-200">
                <div className="mt-0.5 text-purple-500">⚠️</div>
                <p className="leading-relaxed">Once submitted, the withdrawal amount will be held from your balance. Funds will be transferred to your bank account within 2-5 business days after admin approval.</p>
              </div>
              
              <p className="text-xs text-muted-foreground">{GOLD_INPUT_HELPER}</p>
            </div>

            {/* Right Panel - Bank Details */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Bank Account Details</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">Bank Name *</Label>
                  <Input 
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., Chase Bank"
                    className="mt-1 bg-white"
                    data-testid="input-bank-name"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Account Holder Name *</Label>
                  <Input 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="mt-1 bg-white"
                    data-testid="input-account-name"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Account Number / IBAN *</Label>
                  <Input 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Account number or IBAN"
                    className="mt-1 bg-white"
                    data-testid="input-account-number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-gray-600">Routing Number</Label>
                    <Input 
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      placeholder="Optional"
                      className="mt-1 bg-white"
                      data-testid="input-routing-number"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">SWIFT Code</Label>
                    <Input 
                      value={swiftCode}
                      onChange={(e) => setSwiftCode(e.target.value)}
                      placeholder="Optional"
                      className="mt-1 bg-white"
                      data-testid="input-swift-code"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : step === 'submitted' ? (
          <div className="py-6 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-success-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Withdrawal Request Submitted!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your request is now being reviewed by our team.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
                <p className="font-mono font-bold text-lg text-primary">{referenceNumber}</p>
              </div>
              <div className="bg-success-muted border border-success/20 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="font-mono font-bold text-lg text-success">${parseFloat(amount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{numericGold.toFixed(4)}g gold</p>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> What Happens Next?
              </h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Our team will review and verify your withdrawal request</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Once approved, funds will be sent to your bank account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>You'll receive an email and notification when completed (2-5 business days)</span>
                </li>
              </ol>
            </div>
            
            <div className="bg-info-muted text-info-muted-foreground text-xs p-3 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>You can track your withdrawal status in the Transaction History section of your dashboard.</p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {step === 'form' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={
                  !amount || 
                  !bankName || 
                  !accountName || 
                  !accountNumber || 
                  submitting || 
                  priceLoading ||
                  priceError ||
                  hasInsufficientBalance || 
                  hasInsufficientGold ||
                  numericAmount <= 0
                }
                className="bg-purple-500 hover:bg-purple-600"
                data-testid="button-submit-withdrawal"
              >
                {(submitting || priceLoading) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {priceLoading ? 'Loading...' : 'Submit Withdrawal'}
              </Button>
            </>
          )}
          {step === 'submitted' && (
            <Button onClick={handleClose} data-testid="button-close-withdrawal">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {TransactionPinPromptComponent}
    </>
  );
}
