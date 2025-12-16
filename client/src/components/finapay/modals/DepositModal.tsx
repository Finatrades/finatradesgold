import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Copy, Building, CheckCircle2, ArrowRight, DollarSign, Loader2, CreditCard, Wallet, Upload, X, Image, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface FeeInfo {
  feeKey: string;
  feeName: string;
  feeType: string;
  feeValue: string;
  minAmount: string | null;
  maxAmount: string | null;
}

interface GoldPriceInfo {
  pricePerGram: number;
  currency: string;
}

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
  const [proofOfPayment, setProofOfPayment] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [ngeniusEnabled, setNgeniusEnabled] = useState(false);
  const [checkingNgenius, setCheckingNgenius] = useState(true);
  const [depositFee, setDepositFee] = useState<FeeInfo | null>(null);
  const [goldPrice, setGoldPrice] = useState<GoldPriceInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkNgeniusStatus();
      fetchBankAccounts();
      fetchFees();
      fetchGoldPrice();
      resetForm();
    }
  }, [isOpen]);

  const fetchFees = async () => {
    try {
      const response = await fetch('/api/fees/FinaPay');
      const data = await response.json();
      const fee = (data.fees || []).find((f: FeeInfo) => f.feeKey === 'deposit_fee');
      setDepositFee(fee || null);
    } catch (error) {
      console.error('Failed to load fees');
    }
  };

  const fetchGoldPrice = async () => {
    try {
      const response = await fetch('/api/gold-price');
      const data = await response.json();
      setGoldPrice({ pricePerGram: data.pricePerGram, currency: data.currency });
    } catch (error) {
      console.error('Failed to load gold price');
    }
  };

  const calculateFee = (amountValue: number): number => {
    if (!depositFee || amountValue <= 0) return 0;
    let fee = 0;
    if (depositFee.feeType === 'percentage') {
      fee = amountValue * (parseFloat(depositFee.feeValue) / 100);
    } else {
      fee = parseFloat(depositFee.feeValue);
    }
    if (depositFee.minAmount) fee = Math.max(fee, parseFloat(depositFee.minAmount));
    if (depositFee.maxAmount) fee = Math.min(fee, parseFloat(depositFee.maxAmount));
    return fee;
  };

  const getDepositSummary = () => {
    const amountNum = parseFloat(amount) || 0;
    const feeAmount = calculateFee(amountNum);
    const netDeposit = amountNum - feeAmount;
    const goldGrams = goldPrice && netDeposit > 0 ? netDeposit / goldPrice.pricePerGram : 0;
    return { amountNum, feeAmount, netDeposit, goldGrams };
  };

  const resetForm = () => {
    setStep('method');
    setPaymentMethod(null);
    setSelectedAccount(null);
    setAmount('');
    setSenderBankName('');
    setSenderAccountName('');
    setProofOfPayment(null);
    setProofFileName('');
    setReferenceNumber('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error("Please upload an image or PDF file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setProofFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setProofOfPayment(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeProof = () => {
    setProofOfPayment(null);
    setProofFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

    if (!proofOfPayment) {
      toast.error("Please upload proof of payment");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('POST', '/api/deposit-requests', {
        userId: user.id,
        bankAccountId: selectedAccount.id,
        amountUsd: parseFloat(amount).toString(),
        targetBankName: selectedAccount.bankName,
        targetAccountName: selectedAccount.accountName,
        targetAccountNumber: selectedAccount.accountNumber,
        targetSwiftCode: selectedAccount.swiftCode || null,
        targetIban: selectedAccount.iban || null,
        targetCurrency: selectedAccount.currency,
        senderBankName: senderBankName || null,
        senderAccountName: senderAccountName || null,
        proofOfPayment: proofOfPayment,
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
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
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
          <div className="py-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Panel - Bank Account Details */}
              <div className="border border-border rounded-xl p-4 bg-muted/10 h-fit">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-foreground">Bank Details</h4>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded">
                    {selectedAccount.currency}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">{selectedAccount.bankName}</p>
                
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase">Beneficiary Name</span>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded border border-border">
                      <span className="font-medium font-mono text-sm truncate mr-2">{selectedAccount.accountName}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(selectedAccount.accountName, 'Beneficiary')}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase">Account Number</span>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded border border-border">
                      <span className="font-medium font-mono text-sm truncate mr-2">{selectedAccount.accountNumber}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(selectedAccount.accountNumber, 'Account Number')}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {selectedAccount.swiftCode && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs uppercase">SWIFT Code</span>
                      <div className="flex items-center justify-between bg-white p-2.5 rounded border border-border">
                        <span className="font-medium font-mono text-sm">{selectedAccount.swiftCode}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(selectedAccount.swiftCode!, 'SWIFT')}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedAccount.iban && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs uppercase">IBAN</span>
                      <div className="flex items-center justify-between bg-white p-2.5 rounded border border-border">
                        <span className="font-medium font-mono text-sm truncate mr-2">{selectedAccount.iban}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(selectedAccount.iban!, 'IBAN')}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedAccount.routingNumber && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs uppercase">Routing Number</span>
                      <div className="flex items-center justify-between bg-white p-2.5 rounded border border-border">
                        <span className="font-medium font-mono text-sm">{selectedAccount.routingNumber}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(selectedAccount.routingNumber!, 'Routing')}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Deposit Information */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Amount (USD) *</Label>
                  <div className="relative mt-1.5">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-9 h-11"
                      data-testid="input-deposit-amount"
                    />
                  </div>
                </div>

                {parseFloat(amount) > 0 && (
                  <div className="border border-primary/20 rounded-xl p-4 bg-gradient-to-br from-orange-50 to-amber-50">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-foreground">Deposit Summary</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposit Amount:</span>
                        <span className="font-medium">${getDepositSummary().amountNum.toFixed(2)}</span>
                      </div>
                      {depositFee && getDepositSummary().feeAmount > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>Processing Fee ({depositFee.feeType === 'percentage' ? `${depositFee.feeValue}%` : `$${depositFee.feeValue}`}):</span>
                          <span>-${getDepositSummary().feeAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-primary/20 pt-2 flex justify-between font-semibold">
                        <span>Net Credit to Wallet:</span>
                        <span className="text-green-600">${getDepositSummary().netDeposit.toFixed(2)}</span>
                      </div>
                      {goldPrice && getDepositSummary().goldGrams > 0 && (
                        <div className="flex justify-between text-primary mt-2 pt-2 border-t border-primary/20">
                          <span className="flex items-center gap-1">
                            <Coins className="w-4 h-4" />
                            Gold Equivalent:
                          </span>
                          <span className="font-bold">{getDepositSummary().goldGrams.toFixed(4)}g</span>
                        </div>
                      )}
                      {goldPrice && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on current gold price: ${goldPrice.pricePerGram.toFixed(2)}/gram
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Your Bank Name</Label>
                    <Input 
                      value={senderBankName}
                      onChange={(e) => setSenderBankName(e.target.value)}
                      placeholder="e.g., Chase Bank"
                      className="mt-1.5"
                      data-testid="input-sender-bank"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Your Account Name</Label>
                    <Input 
                      value={senderAccountName}
                      onChange={(e) => setSenderAccountName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="mt-1.5"
                      data-testid="input-sender-account"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Proof of Payment *</Label>
                  <p className="text-xs text-muted-foreground mb-2">Upload transfer confirmation</p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-proof-file"
                  />
                  
                  {!proofOfPayment ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors text-center"
                      data-testid="button-upload-proof"
                    >
                      <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF (max 5MB)</p>
                    </button>
                  ) : (
                    <div className="border border-border rounded-lg p-3 bg-green-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <Image className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground truncate max-w-[150px]">{proofFileName}</p>
                            <p className="text-xs text-green-600">Uploaded</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={removeProof}
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid="button-remove-proof"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg flex items-start gap-2">
                   <div className="mt-0.5">⚠️</div>
                   <p>Your deposit will be reviewed and credited within 1-3 business days after verification.</p>
                </div>
              </div>
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

              {parseFloat(amount) > 0 && goldPrice && (
                <div className="border border-green-200 rounded-lg p-3 bg-green-50/50 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Coins className="w-4 h-4 text-primary" />
                      Gold Equivalent:
                    </span>
                    <span className="font-bold text-primary">
                      {(parseFloat(amount) / goldPrice.pricePerGram).toFixed(4)}g
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on ${goldPrice.pricePerGram.toFixed(2)}/gram
                  </p>
                </div>
              )}
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
