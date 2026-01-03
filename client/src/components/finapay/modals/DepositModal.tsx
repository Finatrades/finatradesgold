import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { Copy, Building, CheckCircle2, ArrowRight, DollarSign, Loader2, CreditCard, Wallet, Upload, X, Image, Coins, Bitcoin, Check, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { preloadNGeniusSDK } from '@/lib/ngenius-sdk-loader';
import HybridCardPayment from '../HybridCardPayment';

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
type Step = 'method' | 'select' | 'details' | 'submitted' | 'card-amount' | 'card-processing' | 'card-embedded' | 'card-success' | 'crypto-amount' | 'crypto-select-wallet' | 'crypto-address' | 'crypto-submit-proof' | 'crypto-submitted';

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { user } = useAuth();
  const { settings: platformSettings } = usePlatform();
  const [bankAccounts, setBankAccounts] = useState<PlatformBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('method');
  const [cardFormKey, setCardFormKey] = useState(0);
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
  
  // Terms and conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState<{ title: string; terms: string; enabled: boolean } | null>(null);

  const fetchTerms = async () => {
    try {
      const response = await fetch('/api/terms/deposit');
      const data = await response.json();
      setTermsContent(data);
    } catch (error) {
      console.error('Failed to load terms');
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form state first before fetching data
      resetForm();
      
      checkNgeniusStatus();
      fetchBankAccounts();
      fetchCryptoWallets();
      fetchFees();
      fetchGoldPrice();
      fetchTerms();
      
      // Preload NGenius SDK in background when modal opens
      preloadNGeniusSDK().catch(() => {
        // Silently fail - SDK will be loaded when needed
      });
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

  // Currency conversion rate (AED to USD)
  const AED_TO_USD_RATE = 3.67;
  
  // Get currency symbol for display
  const getCurrencySymbol = (currency: string): string => {
    switch (currency?.toUpperCase()) {
      case 'AED': return 'AED ';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };
  
  // Convert amount to USD for internal calculations
  const convertToUsd = (amount: number, currency: string): number => {
    if (!currency || currency.toUpperCase() === 'USD') return amount;
    if (currency.toUpperCase() === 'AED') return amount / AED_TO_USD_RATE;
    return amount; // Default to 1:1 for unknown currencies
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
    const accountCurrency = selectedAccount?.currency || 'USD';
    const amountInUsd = convertToUsd(amountNum, accountCurrency);
    const feeAmount = calculateFee(amountInUsd); // Fee calculated in USD
    const netDepositUsd = amountInUsd - feeAmount;
    const goldGrams = goldPrice?.pricePerGram && netDepositUsd > 0 ? netDepositUsd / goldPrice.pricePerGram : 0;
    
    // Convert fee back to original currency for display
    const feeInOriginalCurrency = accountCurrency.toUpperCase() === 'AED' ? feeAmount * AED_TO_USD_RATE : feeAmount;
    const netDepositOriginal = amountNum - feeInOriginalCurrency;
    
    return { 
      amountNum, 
      amountInUsd,
      feeAmount, 
      feeInOriginalCurrency,
      netDeposit: netDepositOriginal, 
      netDepositUsd,
      goldGrams,
      currency: accountCurrency,
      currencySymbol: getCurrencySymbol(accountCurrency)
    };
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
    setTermsAccepted(false);
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
    const minDeposit = platformSettings.minDeposit || 50;
    if (isNaN(amountNum) || amountNum < minDeposit) {
      toast.error(`Minimum deposit amount is $${minDeposit}`);
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/crypto-payments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
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
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
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
    } catch (error: any) {
      // Check if this is a KYC error
      if (error?.code === 'KYC_REQUIRED' || error?.message?.includes('KYC')) {
        toast.error('Identity Verification Required', {
          description: 'Please complete your identity verification to access this feature.',
          action: {
            label: 'Verify Now',
            onClick: () => window.location.href = '/kyc',
          },
        });
        onClose();
      } else {
        const errorMessage = error?.message || "Failed to submit deposit request";
        toast.error(errorMessage, {
          description: 'Please check your details and try again.',
          action: {
            label: 'Retry',
            onClick: () => handleSubmit(),
          },
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardPayment = async () => {
    if (!user || !amount) return;
    
    const amountNum = parseFloat(amount);
    const minDeposit = platformSettings.minDeposit || 50;
    if (isNaN(amountNum) || amountNum < minDeposit) {
      toast.error(`Minimum deposit amount is $${minDeposit}`);
      return;
    }

    const maxCardDeposit = Math.min(platformSettings.maxDepositSingle || 100000, 10000);
    if (amountNum > maxCardDeposit) {
      toast.error(`Maximum card deposit is $${maxCardDeposit.toLocaleString()}. For larger amounts, please use bank transfer.`);
      return;
    }

    // Use embedded card form (SDK is preloaded when modal opened)
    setCardFormKey(prev => prev + 1); // Force remount to clear NGenius SDK state
    setStep('card-embedded');
  };
  
  const handleCardSuccess = (result: { goldGrams: string; amountUsd: number }) => {
    toast.success(`Successfully deposited $${result.amountUsd.toFixed(2)} (${result.goldGrams}g gold)`);
    setStep('card-success');
  };
  
  const handleCardError = (error: string) => {
    toast.error(error || "Card payment failed");
    setStep('card-amount');
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

  const isCardPayment = step === 'card-embedded';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`bg-white border-border text-foreground overflow-x-hidden ${
        isCardPayment 
          ? 'w-[95vw] max-w-xl overflow-hidden' 
          : 'w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto'
      }`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span>Deposit Funds</span>
          </DialogTitle>
          <p className="font-bold text-foreground text-sm">(Fund your account through buying equivalent amount of gold)</p>
          <DialogDescription className="text-muted-foreground">
            {step === 'method' && "Choose your preferred deposit method"}
            {step === 'select' && "Select a bank account to deposit to"}
            {step === 'details' && "Enter deposit details and make your transfer"}
            {step === 'submitted' && "Deposit request submitted successfully"}
            {step === 'card-amount' && "Enter the amount to deposit via card"}
            {step === 'card-processing' && "Redirecting to secure payment..."}
            {step === 'card-embedded' && "Enter your card details securely"}
            {step === 'card-success' && "Payment completed successfully"}
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
                <div className="w-12 h-12 bg-info-muted rounded-full flex items-center justify-center">
                  <Building className="w-6 h-6 text-info" />
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
                  <div className="w-12 h-12 bg-success-muted rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-success" />
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
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Bitcoin className="w-6 h-6 text-primary" />
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
                  <Label className="text-sm font-medium">Amount ({selectedAccount?.currency || 'USD'}) *</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      {getCurrencySymbol(selectedAccount?.currency || 'USD').trim()}
                    </span>
                    <Input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={selectedAccount?.currency === 'AED' ? 'pl-12 h-11' : 'pl-7 h-11'}
                      data-testid="input-deposit-amount"
                    />
                  </div>
                  {selectedAccount?.currency !== 'USD' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${convertToUsd(parseFloat(amount) || 0, selectedAccount?.currency || 'USD').toFixed(2)} USD (rate: 1 USD = {AED_TO_USD_RATE} AED)
                    </p>
                  )}
                </div>

                {parseFloat(amount) > 0 && (
                  <div className="border border-primary/20 rounded-xl p-4 bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-foreground">Deposit Summary</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposit Amount:</span>
                        <span className="font-medium">{getDepositSummary().currencySymbol}{getDepositSummary().amountNum.toFixed(2)}</span>
                      </div>
                      {selectedAccount?.currency !== 'USD' && (
                        <div className="flex justify-between text-muted-foreground text-xs">
                          <span>USD Equivalent:</span>
                          <span>${getDepositSummary().amountInUsd.toFixed(2)}</span>
                        </div>
                      )}
                      {depositFee && getDepositSummary().feeAmount > 0 && (
                        <div className="flex justify-between text-warning">
                          <span>Processing Fee ({depositFee.feeType === 'percentage' ? `${depositFee.feeValue}%` : `$${depositFee.feeValue}`}):</span>
                          <span>-{getDepositSummary().currencySymbol}{getDepositSummary().feeInOriginalCurrency.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-primary/20 pt-2 flex justify-between font-semibold">
                        <span>Net Credit to Wallet (USD):</span>
                        <span className="text-success">${getDepositSummary().netDepositUsd.toFixed(2)}</span>
                      </div>
                      {selectedAccount?.currency !== 'USD' && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>({selectedAccount?.currency} equivalent):</span>
                          <span>{getDepositSummary().currencySymbol}{getDepositSummary().netDeposit.toFixed(2)}</span>
                        </div>
                      )}
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
                        <div className="bg-warning-muted border border-warning/30 rounded-lg p-2.5 mt-3">
                          <p className="font-medium text-warning-muted-foreground text-xs mb-1">Important Notice:</p>
                          <p className="text-warning-muted-foreground text-xs leading-relaxed">
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
                    accept=".pdf,.jpg,.jpeg,.png"
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
                    <div className="border border-success/30 rounded-lg p-3 bg-success-muted">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                            <Image className="w-4 h-4 text-success" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground truncate max-w-[150px]">{proofFileName}</p>
                            <p className="text-xs text-success">Uploaded</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={removeProof}
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          data-testid="button-remove-proof"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-warning-muted text-warning-muted-foreground text-xs p-3 rounded-lg flex items-start gap-2">
                   <div className="mt-0.5">⚠️</div>
                   <p>Your deposit will be reviewed and credited within 1-3 business days after verification.</p>
                </div>
                
                <div className="bg-warning-muted border border-warning/30 text-warning-muted-foreground text-xs p-3 rounded-lg">
                   <p className="font-semibold mb-1">Important Notice</p>
                   <p>Gold price shown is tentative. Final rate will be recalculated upon fund receipt. After verification, gold will be deposited to your FinaPay wallet at the final confirmed rate.</p>
                </div>
                
                {/* Terms and Conditions Checkbox */}
                {termsContent?.enabled && (
                  <div className="border border-border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        id="deposit-terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                        className="mt-0.5"
                        data-testid="checkbox-deposit-terms"
                      />
                      <div className="flex-1">
                        <label htmlFor="deposit-terms" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          I accept the Terms & Conditions
                        </label>
                        <details className="mt-2">
                          <summary className="text-xs text-primary cursor-pointer hover:underline">View Terms</summary>
                          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-line bg-white p-2 rounded border max-h-32 overflow-y-auto">
                            {termsContent.terms}
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : step === 'card-amount' ? (
          <div className="space-y-6 py-4">
            <div className="border border-border rounded-xl p-4 bg-success-muted/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-success-muted rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-success" />
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
                    min={platformSettings.minDeposit || 50}
                    max={Math.min(platformSettings.maxDepositSingle || 100000, 10000)}
                    data-testid="input-card-amount"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Min: ${platformSettings.minDeposit || 50} | Max: ${Math.min(platformSettings.maxDepositSingle || 100000, 10000).toLocaleString()}</p>
              </div>

              {parseFloat(amount) > 0 && goldPrice?.pricePerGram && (
                <div className="border border-success/30 rounded-lg p-3 bg-success-muted/50 mt-3">
                  <div className="flex justify-between items-start">
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Coins className="w-4 h-4 text-primary" />
                      Gold Equivalent:
                    </span>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">
                        ${parseFloat(amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-primary font-medium">
                        ~{(parseFloat(amount) / goldPrice.pricePerGram).toFixed(4)}g gold
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-info-muted text-info-muted-foreground text-xs p-3 rounded-lg flex items-start gap-2">
               <div className="mt-0.5">ℹ️</div>
               <p>Enter your card details securely on the next screen. Your wallet will be credited instantly upon successful payment.</p>
            </div>
            
            <div className="bg-warning-muted border border-warning/30 text-warning-muted-foreground text-xs p-3 rounded-lg">
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
        ) : step === 'card-embedded' ? (
          <div className="py-2 w-full max-w-full overflow-hidden">
            <HybridCardPayment
              key={`card-form-${cardFormKey}`}
              amount={parseFloat(amount) || 0}
              onSuccess={handleCardSuccess}
              onError={handleCardError}
              onCancel={() => setStep('card-amount')}
            />
          </div>
        ) : step === 'card-success' ? (
          <div className="py-12 text-center space-y-6">
            <CheckCircle2 className="w-20 h-20 text-success mx-auto" />
            <div>
              <h3 className="text-2xl font-bold text-foreground">Payment Successful!</h3>
              <p className="text-muted-foreground mt-2">
                Your gold has been credited to your FinaPay wallet.
              </p>
            </div>
            <Button 
              onClick={handleClose}
              className="bg-primary"
            >
              Done
            </Button>
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
                  min={platformSettings.minDeposit || 50}
                  data-testid="input-crypto-amount"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum: ${platformSettings.minDeposit || 50}</p>
            </div>

            {parseFloat(amount) > 0 && goldPrice?.pricePerGram && (
              <div className="border border-success/30 rounded-lg p-3 bg-success-muted/50">
                <div className="flex justify-between items-start">
                  <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Coins className="w-4 h-4 text-primary" />
                    Gold Equivalent:
                  </span>
                  <div className="text-right">
                    <p className="font-bold text-primary text-lg">
                      ${parseFloat(amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-primary font-medium">
                      ~{(parseFloat(amount) / goldPrice.pricePerGram).toFixed(4)}g gold
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-warning-muted text-warning-muted-foreground text-xs p-3 rounded-lg flex items-start gap-2">
              <div className="mt-0.5">ℹ️</div>
              <p>After entering the amount, you'll select a crypto network and send payment to our wallet address.</p>
            </div>
            
            <div className="bg-warning-muted border border-warning/30 text-warning-muted-foreground text-xs p-3 rounded-lg">
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
                    const minDepositForCrypto = platformSettings.minDeposit || 50;
                    if (isNaN(amountNum) || amountNum < minDepositForCrypto) {
                      toast.error(`Minimum deposit amount is $${minDepositForCrypto}`);
                      return;
                    }
                    setSubmitting(true);
                    try {
                      const response = await fetch('/api/crypto-payments', {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'X-Requested-With': 'XMLHttpRequest'
                        },
                        credentials: 'include',
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
            <div className="p-4 bg-warning-muted border border-warning/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bitcoin className="w-5 h-5 text-primary" />
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
                        <Check className="w-4 h-4 text-success" />
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
                  <p className="text-xs text-warning-muted-foreground">{selectedCryptoWallet.instructions}</p>
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
            
            <div className="bg-warning-muted border border-warning/30 rounded-lg p-3 text-sm text-warning-muted-foreground">
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
                accept=".pdf,.jpg,.jpeg,.png"
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
                        <CheckCircle2 className="w-4 h-4 text-success" />
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
            <div className="w-16 h-16 mx-auto bg-success-muted rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Payment Submitted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your payment is being reviewed. Your wallet will be credited once verified.
              </p>
            </div>
            <div className="p-3 bg-warning-muted border border-warning/30 rounded-lg text-sm text-warning-muted-foreground flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Verification typically takes 1-24 hours depending on network confirmations.</span>
            </div>
          </div>
        ) : step === 'submitted' ? (
          <div className="py-6 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-success-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Request Submitted Successfully!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your deposit is now being processed by our team.
              </p>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Your Reference Number</p>
              <p className="font-mono font-bold text-xl text-primary">{referenceNumber}</p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(referenceNumber);
                  toast.success("Reference copied!");
                }}
                className="text-xs text-primary hover:underline mt-2 flex items-center justify-center gap-1 mx-auto"
              >
                <Copy className="w-3 h-3" /> Copy Reference
              </button>
            </div>
            
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> What Happens Next?
              </h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Complete your bank transfer with the reference number in the description</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Our team will verify your payment (1-3 business days)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>You'll receive a notification when your gold is credited</span>
                </li>
              </ol>
            </div>
            
            <div className="bg-info-muted text-info-muted-foreground text-xs p-3 rounded-lg flex items-start gap-2">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>You can track your deposit status in the Transaction History section of your dashboard.</p>
            </div>
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
                disabled={!amount || submitting || (termsContent?.enabled && !termsAccepted)}
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
                disabled={!amount || parseFloat(amount) < (platformSettings.minDeposit || 50)}
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
