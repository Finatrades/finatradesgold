import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { Copy, Building, CheckCircle2, ArrowRight, DollarSign, Loader2, CreditCard, Wallet, Upload, X, Image, Coins, Bitcoin, Check, Clock } from 'lucide-react';
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

interface CryptoWallet {
  id: string;
  network: string;
  networkLabel: string;
  currency: string;
  walletAddress: string;
  memo: string | null;
  instructions: string | null;
  isActive: boolean;
  qrCodeImage: string | null;
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = 'bank' | 'card' | 'crypto';
type Step = 'method' | 'select' | 'details' | 'submitted' | 'card-amount' | 'card-processing' | 'crypto-amount' | 'crypto-select-wallet' | 'crypto-address' | 'crypto-submit-proof' | 'crypto-submitted';

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
  
  // Crypto payment state
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [selectedCryptoWallet, setSelectedCryptoWallet] = useState<CryptoWallet | null>(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [cryptoPaymentRequestId, setCryptoPaymentRequestId] = useState<string | null>(null);
  const [cryptoReceipt, setCryptoReceipt] = useState<string | null>(null);
  const [cryptoReceiptFileName, setCryptoReceiptFileName] = useState<string>('');
  const cryptoReceiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      checkNgeniusStatus();
      fetchBankAccounts();
      fetchCryptoWallets();
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
    const goldGrams = goldPrice?.pricePerGram && netDeposit > 0 ? netDeposit / goldPrice.pricePerGram : 0;
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
    setSelectedCryptoWallet(null);
    setTransactionHash('');
    setCopiedAddress(false);
    setCryptoPaymentRequestId(null);
    setCryptoReceipt(null);
    setCryptoReceiptFileName('');
  };
  
  const handleCryptoReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCryptoReceipt(reader.result as string);
        setCryptoReceiptFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const fetchCryptoWallets = async () => {
    try {
      const response = await fetch('/api/crypto-wallets/active');
      const data = await response.json();
      setCryptoWallets(data.wallets || []);
    } catch (error) {
      console.error('Failed to load crypto wallets');
    }
  };
  
  const copyToClipboardCrypto = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    toast.success("Address copied to clipboard");
    setTimeout(() => setCopiedAddress(false), 2000);
  };
  
  const handleCryptoCreatePayment = async () => {
    if (!user || !selectedCryptoWallet || !amount) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 10) {
      toast.error("Minimum deposit amount is $10");
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/crypto-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          walletConfigId: selectedCryptoWallet.id,
          amountUsd: amountNum.toFixed(2),
          goldGrams: goldPrice ? (amountNum / goldPrice.pricePerGram).toFixed(6) : '0',
          goldPriceAtTime: goldPrice?.pricePerGram.toFixed(2) || '0',
          paymentType: 'deposit',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment request');
      }
      
      setCryptoPaymentRequestId(data.paymentRequest.id);
      setStep('crypto-address');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create payment request");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCryptoSubmitProof = async () => {
    if (!cryptoPaymentRequestId || !transactionHash.trim()) {
      toast.error("Please enter your transaction hash");
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/crypto-payments/${cryptoPaymentRequestId}/submit-proof`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionHash: transactionHash.trim(),
          proofImageUrl: cryptoReceipt,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit proof');
      }
      
      setStep('crypto-submitted');
      toast.success("Payment submitted for verification");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit proof");
    } finally {
      setSubmitting(false);
    }
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
    } else if (method === 'crypto') {
      setStep('crypto-amount');
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
    if (step === 'select' || step === 'card-amount' || step === 'crypto-amount') {
      setStep('method');
      setPaymentMethod(null);
    } else if (step === 'details') {
      setStep('select');
    } else if (step === 'crypto-select-wallet') {
      setStep('crypto-amount');
    } else if (step === 'crypto-address') {
      setStep('crypto-select-wallet');
      setSelectedCryptoWallet(null);
    } else if (step === 'crypto-submit-proof') {
      setStep('crypto-address');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto">
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
            {step === 'crypto-amount' && "Enter the amount to deposit via crypto"}
            {step === 'crypto-select-wallet' && "Select a cryptocurrency network"}
            {step === 'crypto-address' && "Send crypto to the wallet address below"}
            {step === 'crypto-submit-proof' && "Submit your transaction hash for verification"}
            {step === 'crypto-submitted' && "Payment submitted for verification"}
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

            {cryptoWallets.length > 0 && (
              <button
                onClick={() => handleSelectMethod('crypto')}
                className="w-full border border-border rounded-xl p-4 bg-muted/10 hover:bg-muted/30 transition-colors text-left"
                data-testid="button-select-crypto-payment"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Bitcoin className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground">Crypto Payment</h4>
                    <p className="text-sm text-muted-foreground">Pay with cryptocurrency (manual verification)</p>
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
                      {goldPrice?.pricePerGram && getDepositSummary().goldGrams > 0 && (
                        <div className="flex justify-between text-primary mt-2 pt-2 border-t border-primary/20">
                          <span className="flex items-center gap-1">
                            <Coins className="w-4 h-4" />
                            Gold Equivalent:
                          </span>
                          <span className="font-bold">{getDepositSummary().goldGrams.toFixed(4)}g</span>
                        </div>
                      )}
                      {goldPrice?.pricePerGram && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on current gold price: ${goldPrice.pricePerGram.toFixed(2)}/gram
                        </p>
                      )}
                      {goldPrice?.pricePerGram && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-2.5 mt-3">
                          <p className="font-medium text-amber-800 dark:text-amber-300 text-xs mb-1">Important Notice:</p>
                          <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
                            Gold price shown is tentative. Final rate will be recalculated upon fund receipt. 
                            After verification, gold will be deposited to your FinaPay wallet at the final confirmed rate.
                          </p>
                        </div>
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
                
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg">
                   <p className="font-semibold mb-1">Important Notice</p>
                   <p>Gold price shown is tentative. Final rate will be recalculated upon fund receipt. After verification, gold will be deposited to your FinaPay wallet at the final confirmed rate.</p>
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

              {parseFloat(amount) > 0 && goldPrice?.pricePerGram && (
                <div className="border border-green-200 rounded-lg p-3 bg-green-50/50 mt-3">
                  <div className="flex justify-between items-start">
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Coins className="w-4 h-4 text-primary" />
                      Gold Equivalent:
                    </span>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">
                        {(parseFloat(amount) / goldPrice.pricePerGram).toFixed(4)}g
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ≈ ${parseFloat(amount).toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-2">
               <div className="mt-0.5">ℹ️</div>
               <p>You will be redirected to a secure payment page to complete your card payment. Your wallet will be credited instantly upon successful payment.</p>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg">
               <p className="font-semibold mb-1">Important Notice</p>
               <p>Gold price shown is tentative. Final rate will be recalculated upon fund receipt. After verification, gold will be deposited to your FinaPay wallet at the final confirmed rate.</p>
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
        ) : step === 'crypto-amount' ? (
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  min="10"
                  data-testid="input-crypto-amount"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum: $10</p>
            </div>

            {parseFloat(amount) > 0 && goldPrice?.pricePerGram && (
              <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                <div className="flex justify-between items-start">
                  <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Coins className="w-4 h-4 text-primary" />
                    Gold Equivalent:
                  </span>
                  <div className="text-right">
                    <p className="font-bold text-primary text-lg">
                      {(parseFloat(amount) / goldPrice.pricePerGram).toFixed(4)}g
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ ${parseFloat(amount).toFixed(2)} USD
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-orange-50 text-orange-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <div className="mt-0.5">ℹ️</div>
              <p>After entering the amount, you'll select a crypto network and send payment to our wallet address.</p>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg">
               <p className="font-semibold mb-1">Important Notice</p>
               <p>Gold price shown is tentative. Final rate will be recalculated upon fund receipt. After verification, gold will be deposited to your FinaPay wallet at the final confirmed rate.</p>
            </div>
          </div>
        ) : step === 'crypto-select-wallet' ? (
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {cryptoWallets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bitcoin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No crypto wallets available at this time.</p>
              </div>
            ) : (
              cryptoWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={async () => {
                    setSelectedCryptoWallet(wallet);
                    if (!user || !amount) return;
                    const amountNum = parseFloat(amount);
                    if (isNaN(amountNum) || amountNum < 10) {
                      toast.error("Minimum deposit amount is $10");
                      return;
                    }
                    setSubmitting(true);
                    try {
                      const response = await fetch('/api/crypto-payments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: user.id,
                          walletConfigId: wallet.id,
                          amountUsd: amountNum.toFixed(2),
                          goldGrams: goldPrice ? (amountNum / goldPrice.pricePerGram).toFixed(6) : '0',
                          goldPriceAtTime: goldPrice?.pricePerGram?.toFixed(2) || '0',
                          paymentType: 'deposit',
                        }),
                      });
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data.message || 'Failed to create payment request');
                      }
                      setCryptoPaymentRequestId(data.paymentRequest.id);
                      setStep('crypto-address');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to create payment request");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  className={`w-full border rounded-xl p-4 transition-colors text-left ${
                    selectedCryptoWallet?.id === wallet.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-muted/10 hover:bg-muted/30'
                  }`}
                  data-testid={`button-select-crypto-${wallet.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground">{wallet.networkLabel}</h4>
                      <p className="text-sm text-muted-foreground">{wallet.currency}</p>
                    </div>
                    {submitting && selectedCryptoWallet?.id === wallet.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : step === 'crypto-address' && selectedCryptoWallet ? (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bitcoin className="w-5 h-5 text-orange-600" />
                <span className="font-semibold">{selectedCryptoWallet.networkLabel}</span>
              </div>
              
              <div className="space-y-3">
                {/* QR Code Display */}
                {selectedCryptoWallet.qrCodeImage && (
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-lg border">
                      <img 
                        src={selectedCryptoWallet.qrCodeImage} 
                        alt="Scan to pay" 
                        className="w-40 h-40 object-contain"
                        data-testid="img-crypto-qrcode"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs text-muted-foreground">Send to this address:</Label>
                  <div className="mt-1 p-3 bg-white rounded-lg border flex items-center gap-2">
                    <code className="text-sm font-mono flex-1 break-all">{selectedCryptoWallet.walletAddress}</code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboardCrypto(selectedCryptoWallet.walletAddress)}
                    >
                      {copiedAddress ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {selectedCryptoWallet.memo && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Memo/Tag (required):</Label>
                    <div className="mt-1 p-2 bg-white rounded-lg border text-sm font-mono">
                      {selectedCryptoWallet.memo}
                    </div>
                  </div>
                )}
                
                {selectedCryptoWallet.instructions && (
                  <p className="text-xs text-orange-700">{selectedCryptoWallet.instructions}</p>
                )}
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount to send:</span>
                <span className="font-bold text-secondary">${parseFloat(amount).toFixed(2)} worth</span>
              </div>
              {goldPrice?.pricePerGram && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gold to receive:</span>
                  <span className="font-medium">{(parseFloat(amount) / goldPrice.pricePerGram).toFixed(4)}g</span>
                </div>
              )}
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">After sending, click "I've Sent Payment" below</p>
              <p className="text-xs">You'll then enter your transaction hash for verification.</p>
            </div>
          </div>
        ) : step === 'crypto-submit-proof' ? (
          <div className="space-y-4 py-4">
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
            
            {/* Receipt Upload Section */}
            <div>
              <Label>Transaction Receipt (Optional)</Label>
              <input
                type="file"
                accept="image/*,.pdf"
                ref={cryptoReceiptInputRef}
                onChange={handleCryptoReceiptUpload}
                className="hidden"
                data-testid="input-crypto-receipt"
              />
              <div className="mt-2">
                {cryptoReceipt ? (
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm truncate max-w-[200px]">{cryptoReceiptFileName}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setCryptoReceipt(null);
                          setCryptoReceiptFileName('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => cryptoReceiptInputRef.current?.click()}
                    data-testid="button-upload-crypto-receipt"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Receipt Screenshot
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a screenshot of your transaction for faster verification.
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network:</span>
                <span className="font-medium">{selectedCryptoWallet?.networkLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">${parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : step === 'crypto-submitted' ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Payment Submitted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your payment is being reviewed. Your wallet will be credited once verified.
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Verification typically takes 1-24 hours depending on network confirmations.</span>
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
          {step === 'crypto-amount' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button 
                onClick={() => setStep('crypto-select-wallet')} 
                disabled={!amount || parseFloat(amount) < 10}
                data-testid="button-proceed-crypto-select"
              >
                <Bitcoin className="w-4 h-4 mr-2" />
                Select Crypto Network
              </Button>
            </>
          )}
          {step === 'crypto-select-wallet' && (
            <Button variant="outline" onClick={handleBack}>Back</Button>
          )}
          {step === 'crypto-address' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button 
                onClick={() => setStep('crypto-submit-proof')}
                data-testid="button-crypto-sent"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                I've Sent Payment
              </Button>
            </>
          )}
          {step === 'crypto-submit-proof' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button 
                onClick={handleCryptoSubmitProof}
                disabled={!transactionHash.trim() || submitting}
                data-testid="button-submit-crypto-proof"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Submit for Verification
              </Button>
            </>
          )}
          {(step === 'submitted' || step === 'crypto-submitted') && (
            <Button onClick={handleClose} data-testid="button-close-deposit">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
