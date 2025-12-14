import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Copy, Building, CheckCircle2, ArrowRight, DollarSign, Loader2, CreditCard, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface PlatformBankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string | null;
  swiftCode: string | null;
  iban: string | null;
  currency: string;
  country: string;
  status: 'Active' | 'Inactive';
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = 'bank' | 'card';
type Step = 'method' | 'select' | 'details' | 'submitted' | 'card-amount' | 'card-processing';

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { user } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<PlatformBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<PlatformBankAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [senderAccountName, setSenderAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [ngeniusEnabled, setNgeniusEnabled] = useState(false);
  const [checkingNgenius, setCheckingNgenius] = useState(true);

  useEffect(() => {
    if (isOpen) {
      checkNgeniusStatus();
      fetchBankAccounts();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setStep('method');
    setPaymentMethod(null);
    setSelectedAccount(null);
    setAmount('');
    setSenderBankName('');
    setSenderAccountName('');
    setReferenceNumber('');
  };

  const checkNgeniusStatus = async () => {
    setCheckingNgenius(true);
    try {
      const response = await fetch('/api/ngenius/status');
      const data = await response.json();
      setNgeniusEnabled(data.enabled);
    } catch (error) {
      setNgeniusEnabled(false);
    } finally {
      setCheckingNgenius(false);
    }
  };

  const fetchBankAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bank-accounts/active');
      const data = await response.json();
      setBankAccounts(data.accounts || []);
    } catch (error) {
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", {
      description: `${label} copied`
    });
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'bank') {
      setStep('select');
    } else if (method === 'card') {
      setStep('card-amount');
    }
  };

  const handleSelectAccount = (account: PlatformBankAccount) => {
    setSelectedAccount(account);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedAccount || !user || !amount) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('POST', '/api/deposit-requests', {
        userId: user.id,
        bankAccountId: selectedAccount.id,
        amountUsd: parseFloat(amount).toString(),
        senderBankName: senderBankName || null,
        senderAccountName: senderAccountName || null,
      });
      const data = await res.json();
      
      setReferenceNumber(data.request.referenceNumber);
      setStep('submitted');
      toast.success("Deposit request submitted");
    } catch (error) {
      toast.error("Failed to submit deposit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardPayment = async () => {
    if (!user || !amount) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 10) {
      toast.error("Minimum deposit amount is $10");
      return;
    }

    if (amountNum > 10000) {
      toast.error("Maximum card deposit is $10,000. For larger amounts, please use bank transfer.");
      return;
    }

    setSubmitting(true);
    setStep('card-processing');
    
    try {
      const returnUrl = `${window.location.origin}/finapay?deposit_callback=1`;
      const cancelUrl = `${window.location.origin}/finapay?deposit_cancelled=1`;
      
      const res = await apiRequest('POST', '/api/ngenius/create-order', {
        userId: user.id,
        amount: amountNum,
        currency: 'USD',
        returnUrl,
        cancelUrl,
        description: `FinaPay wallet deposit - $${amountNum.toFixed(2)}`,
      });
      
      const data = await res.json();
      
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate card payment");
      setStep('card-amount');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBack = () => {
    if (step === 'select' || step === 'card-amount') {
      setStep('method');
      setPaymentMethod(null);
    } else if (step === 'details') {
      setStep('select');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span>Deposit Funds</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 'method' && "Choose your preferred deposit method"}
            {step === 'select' && "Select a bank account to deposit to"}
            {step === 'details' && "Enter deposit details and make your transfer"}
            {step === 'submitted' && "Deposit request submitted successfully"}
            {step === 'card-amount' && "Enter the amount to deposit via card"}
            {step === 'card-processing' && "Redirecting to secure payment..."}
          </DialogDescription>
        </DialogHeader>

        {(loading || checkingNgenius) && step === 'method' ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : step === 'method' ? (
          <div className="space-y-4 py-4">
            <button
              onClick={() => handleSelectMethod('bank')}
              className="w-full border border-border rounded-xl p-4 bg-muted/10 hover:bg-muted/30 transition-colors text-left"
              data-testid="button-select-bank-transfer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground">Bank Transfer</h4>
                  <p className="text-sm text-muted-foreground">Transfer from your bank account (1-3 business days)</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>

            {ngeniusEnabled && (
              <button
                onClick={() => handleSelectMethod('card')}
                className="w-full border border-border rounded-xl p-4 bg-muted/10 hover:bg-muted/30 transition-colors text-left"
                data-testid="button-select-card-payment"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground">Card Payment</h4>
                    <p className="text-sm text-muted-foreground">Pay with Visa or Mastercard (instant)</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            )}
          </div>
        ) : step === 'select' ? (
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {bankAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No bank accounts available for deposit at this time.</p>
                <p className="text-sm">Please try again later or contact support.</p>
              </div>
            ) : (
              bankAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelectAccount(account)}
                  className="w-full border border-border rounded-xl p-4 bg-muted/10 hover:bg-muted/30 transition-colors text-left"
                  data-testid={`button-select-bank-${account.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground">{account.bankName}</h4>
                      <p className="text-sm text-muted-foreground">{account.accountName}</p>
                      <p className="text-xs text-muted-foreground">{account.country} | {account.currency}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </div>
        ) : step === 'details' && selectedAccount ? (
          <div className="space-y-6 py-4">
            <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                <h4 className="font-bold text-foreground">{selectedAccount.bankName}</h4>
                <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded">
                  {selectedAccount.currency}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase">Beneficiary Name</span>
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-border">
                    <span className="font-medium font-mono text-sm">{selectedAccount.accountName}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedAccount.accountName, 'Beneficiary')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase">Account Number</span>
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-border">
                    <span className="font-medium font-mono text-sm">{selectedAccount.accountNumber}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedAccount.accountNumber, 'Account Number')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {selectedAccount.swiftCode && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase">SWIFT Code</span>
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-border">
                      <span className="font-medium font-mono text-sm">{selectedAccount.swiftCode}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedAccount.swiftCode!, 'SWIFT')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedAccount.iban && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase">IBAN</span>
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-border">
                      <span className="font-medium font-mono text-sm">{selectedAccount.iban}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedAccount.iban!, 'IBAN')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedAccount.routingNumber && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase">Routing Number</span>
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-border">
                      <span className="font-medium font-mono text-sm">{selectedAccount.routingNumber}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedAccount.routingNumber!, 'Routing')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm">Amount (USD) *</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-9"
                    data-testid="input-deposit-amount"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Your Bank Name (Optional)</Label>
                  <Input 
                    value={senderBankName}
                    onChange={(e) => setSenderBankName(e.target.value)}
                    placeholder="e.g., Chase Bank"
                    className="mt-1"
                    data-testid="input-sender-bank"
                  />
                </div>
                <div>
                  <Label className="text-sm">Your Account Name (Optional)</Label>
                  <Input 
                    value={senderAccountName}
                    onChange={(e) => setSenderAccountName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="mt-1"
                    data-testid="input-sender-account"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg flex items-start gap-2">
               <div className="mt-0.5">⚠️</div>
               <p>After making your bank transfer, your deposit request will be reviewed by our team. Once the funds are received and verified, your wallet will be credited within 1-3 business days.</p>
            </div>
          </div>
        ) : step === 'card-amount' ? (
          <div className="space-y-6 py-4">
            <div className="border border-border rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Card Payment</h4>
                  <p className="text-xs text-muted-foreground">Visa, Mastercard accepted</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm">Amount (USD) *</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-9 bg-white"
                    min="10"
                    max="10000"
                    data-testid="input-card-amount"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Min: $10 | Max: $10,000</p>
              </div>
            </div>
            
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-2">
               <div className="mt-0.5">ℹ️</div>
               <p>You will be redirected to a secure payment page to complete your card payment. Your wallet will be credited instantly upon successful payment.</p>
            </div>
          </div>
        ) : step === 'card-processing' ? (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-foreground">Processing...</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Redirecting you to secure payment page
              </p>
            </div>
          </div>
        ) : step === 'submitted' ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Deposit Request Submitted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your deposit request has been submitted for review.
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 inline-block">
              <p className="text-xs text-muted-foreground">Reference Number</p>
              <p className="font-mono font-bold text-lg">{referenceNumber}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Please complete your bank transfer and include this reference number in your payment description.
              <br />Your wallet will be credited once the funds are received and verified.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {step === 'method' && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          {(step === 'select' || step === 'card-amount') && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              {step === 'card-amount' && (
                <Button 
                  onClick={handleCardPayment} 
                  disabled={!amount || submitting}
                  data-testid="button-proceed-card-payment"
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Proceed to Payment
                </Button>
              )}
            </>
          )}
          {step === 'details' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!amount || submitting}
                data-testid="button-submit-deposit"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Deposit Request
              </Button>
            </>
          )}
          {step === 'submitted' && (
            <Button onClick={handleClose} data-testid="button-close-deposit">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
