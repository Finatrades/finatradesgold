import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { Copy, Building, CheckCircle2, ArrowRight, DollarSign, Loader2, CreditCard, Wallet, Upload, X, Image, Coins, Bitcoin, Check, Clock, FileText, Sparkles, Shield, Zap, Globe, TrendingUp, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { preloadNGeniusSDK } from '@/lib/ngenius-sdk-loader';
import HybridCardPayment from '../HybridCardPayment';
import { type GoldWalletType } from '../WalletTypeSelector';
import { useFinaPay } from '@/context/FinaPayContext';

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
type Step = 'amount' | 'method' | 'select' | 'details' | 'submitted' | 'card-amount' | 'card-processing' | 'card-embedded' | 'card-success' | 'crypto-amount' | 'crypto-select-wallet' | 'crypto-address' | 'crypto-submit-proof' | 'crypto-submitted';

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { user } = useAuth();
  const { settings: platformSettings } = usePlatform();
  const { refreshTransactions } = useFinaPay();
  const [bankAccounts, setBankAccounts] = useState<PlatformBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('amount');
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
  
  // Gold-first input mode state (GOLD-ONLY COMPLIANCE)
  const [inputMode, setInputMode] = useState<'gold' | 'usd'>('gold');
  const [goldAmount, setGoldAmount] = useState('');
  
  // MPGW/FPGW wallet type selection
  const [selectedWalletType, setSelectedWalletType] = useState<GoldWalletType>('MPGW');
  
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
      fetchExchangeRates();
      
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

  // Exchange rates state (fetched from API)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ AED: 3.6725 });
  const [rateSource, setRateSource] = useState<string>('default');
  
  // Fetch live exchange rates
  const fetchExchangeRates = async () => {
    try {
      const response = await fetch('/api/exchange-rates');
      const data = await response.json();
      if (data.rates) {
        setExchangeRates(data.rates);
        setRateSource('live');
        console.log('[Currency] Live rates loaded:', data.rates.AED);
      }
    } catch (error) {
      console.warn('[Currency] Failed to fetch rates, using defaults');
    }
  };
  
  // Get exchange rate for a currency (from USD base)
  const getRate = (currency: string): number => {
    const curr = currency?.toUpperCase();
    if (!curr || curr === 'USD') return 1;
    return exchangeRates[curr] || 1;
  };
  
  // Get currency symbol for display
  const getCurrencySymbol = (currency: string): string => {
    switch (currency?.toUpperCase()) {
      case 'AED': return 'AED ';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'SAR': return 'SAR ';
      case 'QAR': return 'QAR ';
      default: return '$';
    }
  };
  
  // Convert amount to USD for internal calculations
  const convertToUsd = (amount: number, currency: string): number => {
    if (!currency || currency.toUpperCase() === 'USD') return amount;
    const rate = getRate(currency);
    return amount / rate;
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
    const feeInOriginalCurrency = accountCurrency.toUpperCase() !== 'USD' ? feeAmount * getRate(accountCurrency) : feeAmount;
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
    setStep('amount');
    setPaymentMethod(null);
    setSelectedAccount(null);
    setAmount('');
    setGoldAmount('');
    setInputMode('gold');
    setSenderBankName('');
    setSenderAccountName('');
    setProofOfPayment(null);
    setProofFileName('');
    setReferenceNumber('');
    setSelectedCryptoWallet(null);
    setTransactionHash('');
    setCopiedAddress(false);
    setCryptoPaymentRequestId(null);
    setSelectedWalletType('MPGW');
    setCryptoReceipt(null);
    setCryptoReceiptFileName('');
    setTermsAccepted(false);
  };
  
  // Get effective USD amount from gold or USD input (GOLD-ONLY COMPLIANCE)
  const getEffectiveUsdAmount = (): number => {
    if (inputMode === 'gold' && goldPrice?.pricePerGram) {
      const goldGrams = parseFloat(goldAmount) || 0;
      return goldGrams * goldPrice.pricePerGram;
    }
    return parseFloat(amount) || 0;
  };
  
  // Get effective gold grams from gold or USD input
  const getEffectiveGoldGrams = (): number => {
    if (inputMode === 'gold') {
      return parseFloat(goldAmount) || 0;
    }
    if (goldPrice?.pricePerGram) {
      return (parseFloat(amount) || 0) / goldPrice.pricePerGram;
    }
    return 0;
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
      const response = await apiRequest('POST', '/api/crypto-payments', {
        userId: user.id,
        walletConfigId: selectedCryptoWallet.id,
        amountUsd: amountNum.toFixed(2),
        goldGrams: goldPrice ? (amountNum / goldPrice.pricePerGram).toFixed(6) : '0',
        goldPriceAtTime: goldPrice?.pricePerGram.toFixed(2) || '0',
        paymentType: 'deposit',
      });
      
      const data = await response.json();
      
      setCryptoPaymentRequestId(data.paymentRequest.id);
      setStep('crypto-address');
      refreshTransactions();
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
      const response = await apiRequest('PATCH', `/api/crypto-payments/${cryptoPaymentRequestId}/submit-proof`, {
        transactionHash: transactionHash.trim(),
        proofImageUrl: cryptoReceipt,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit proof');
      }
      
      setStep('crypto-submitted');
      toast.success("Payment submitted for verification");
      refreshTransactions();
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
      // Amount already entered in first step, go directly to payment
      // Sync USD amount from gold input if needed
      if (inputMode === 'gold' && goldPrice?.pricePerGram) {
        const usdValue = getEffectiveUsdAmount();
        setAmount(usdValue.toFixed(2));
      }
      handleCardPayment();
    } else if (method === 'crypto') {
      // Amount already entered, go to crypto wallet selection
      if (inputMode === 'gold' && goldPrice?.pricePerGram) {
        const usdValue = getEffectiveUsdAmount();
        setAmount(usdValue.toFixed(2));
      }
      setStep('crypto-select-wallet');
    }
  };
  
  const handleAmountContinue = () => {
    const minDeposit = platformSettings.minDeposit || 50;
    const effectiveUsd = getEffectiveUsdAmount();
    
    if (effectiveUsd < minDeposit) {
      toast.error(`Minimum deposit amount is $${minDeposit}`);
      return;
    }
    
    // Sync the USD amount for downstream use
    if (inputMode === 'gold' && goldPrice?.pricePerGram) {
      setAmount(effectiveUsd.toFixed(2));
    }
    
    setStep('method');
  };

  const handleSelectAccount = (account: PlatformBankAccount) => {
    setSelectedAccount(account);
    
    // Convert the amount entered in step 1 to the bank's currency
    // If user entered in gold mode, we already have goldAmount set
    // If user entered in USD mode, convert to the bank's currency
    if (account.currency !== 'USD' && parseFloat(amount) > 0) {
      const rate = exchangeRates[account.currency] || 1;
      const convertedAmount = (parseFloat(amount) * rate).toFixed(2);
      setAmount(convertedAmount);
      setInputMode('usd'); // Show in local currency mode
    }
    
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
        goldWalletType: selectedWalletType,
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
    if (step === 'method') {
      setStep('amount');
      setPaymentMethod(null);
    } else if (step === 'select' || step === 'card-amount' || step === 'crypto-amount' || step === 'crypto-select-wallet') {
      setStep('method');
      setPaymentMethod(null);
      setSelectedCryptoWallet(null);
    } else if (step === 'details') {
      setStep('select');
    } else if (step === 'crypto-address') {
      setStep('crypto-select-wallet');
      setSelectedCryptoWallet(null);
      setTransactionHash('');
      setCryptoReceipt(null);
      setCryptoReceiptFileName('');
    }
  };

  const handleCryptoConfirm = async () => {
    if (!user || !selectedCryptoWallet) return;
    
    const amountNum = parseFloat(amount);
    const minDepositForCrypto = platformSettings.minDeposit || 50;
    if (isNaN(amountNum) || amountNum < minDepositForCrypto) {
      toast.error(`Minimum deposit amount is $${minDepositForCrypto}`);
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/crypto-payments', {
        userId: user.id,
        walletConfigId: selectedCryptoWallet.id,
        amountUsd: amountNum.toFixed(2),
        goldGrams: goldPrice ? (amountNum / goldPrice.pricePerGram).toFixed(6) : '0',
        goldPriceAtTime: goldPrice?.pricePerGram?.toFixed(2) || '0',
        paymentType: 'deposit',
      });
      const data = await response.json();
      setCryptoPaymentRequestId(data.paymentRequest.id);
      setStep('crypto-address');
      refreshTransactions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create payment request");
    } finally {
      setSubmitting(false);
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
            {step === 'amount' && "Fund your account through buying equivalent amount of gold"}
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
            {step === 'crypto-address' && "Send crypto and submit your transaction hash for verification"}
            {step === 'crypto-submitted' && "Payment submitted for verification"}
          </DialogDescription>
        </DialogHeader>

        {step === 'amount' ? (
          <div className="space-y-6 py-4">
            {/* Progress Stepper */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                <span className="text-sm font-medium text-foreground hidden sm:inline">Amount</span>
              </div>
              <div className="w-8 h-0.5 bg-muted"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Method</span>
              </div>
              <div className="w-8 h-0.5 bg-muted"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Confirm</span>
              </div>
            </div>
            
            {/* Hero Section */}
            <div className="text-center space-y-3 pb-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">How much gold would you like?</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">Enter amount in gold grams or USD. We'll convert it at live market rates.</p>
            </div>
            
            {/* Input Mode Toggle - Premium Design */}
            <div className="flex items-center justify-center p-1.5 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
              <button
                onClick={() => setInputMode('gold')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  inputMode === 'gold' 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md transform scale-[1.02]' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                }`}
                data-testid="button-input-gold-mode"
              >
                <Coins className="w-4 h-4 inline mr-2" />
                Gold (grams)
              </button>
              <button
                onClick={() => setInputMode('usd')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  inputMode === 'usd' 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md transform scale-[1.02]' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                }`}
                data-testid="button-input-usd-mode"
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                USD Amount
              </button>
            </div>

            {/* Amount Input - Enhanced */}
            <div className="space-y-2">
              {inputMode === 'gold' ? (
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-white rounded-lg border-2 border-amber-200 focus-within:border-amber-400 transition-colors">
                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-amber-500" />
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="0.0000"
                      value={goldAmount}
                      onChange={(e) => setGoldAmount(e.target.value)}
                      className="pl-14 pr-14 h-16 text-2xl font-bold border-0 focus-visible:ring-0 bg-transparent"
                      data-testid="input-gold-amount"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-amber-600">g</span>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-white rounded-lg border-2 border-emerald-200 focus-within:border-emerald-400 transition-colors">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-14 pr-16 h-16 text-2xl font-bold border-0 focus-visible:ring-0 bg-transparent"
                      data-testid="input-usd-amount"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-emerald-600">USD</span>
                  </div>
                </div>
              )}
            </div>

            {/* Deposit Summary Preview - Step 1 */}
            {goldPrice && ((inputMode === 'gold' && goldAmount && parseFloat(goldAmount) > 0) || 
              (inputMode === 'usd' && amount && parseFloat(amount) > 0)) && (
              <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-xl p-5 border border-amber-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-bold text-amber-800">Deposit Summary</h4>
                </div>
                
                <div className="space-y-3">
                  {/* Gold You'll Receive - Primary */}
                  <div className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-amber-200">
                    <span className="flex items-center gap-2 text-amber-700 font-medium">
                      <Coins className="w-4 h-4" />
                      Gold You'll Receive:
                    </span>
                    <span className="text-xl font-bold text-amber-700">
                      {inputMode === 'gold' 
                        ? parseFloat(goldAmount).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                        : ((parseFloat(amount) || 0) / goldPrice.pricePerGram).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}g
                    </span>
                  </div>
                  
                  {/* Gold Value */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Gold Value:</span>
                    <span className="font-medium">
                      ${inputMode === 'gold' 
                        ? (parseFloat(goldAmount) * goldPrice.pricePerGram).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {/* Processing Fee (if applicable) - Show in both modes */}
                  {depositFee && ((inputMode === 'usd' && parseFloat(amount) > 0) || (inputMode === 'gold' && parseFloat(goldAmount) > 0)) && (
                    <div className="flex items-center justify-between text-sm text-orange-600">
                      <span>Processing Fee ({depositFee.feeValue}%):</span>
                      <span className="font-medium">
                        +${(inputMode === 'gold' 
                          ? calculateFee(parseFloat(goldAmount) * (goldPrice?.pricePerGram || 0))
                          : calculateFee(parseFloat(amount) || 0)
                        ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  
                  {/* Total Amount to Pay - New clear display */}
                  {depositFee && ((inputMode === 'usd' && parseFloat(amount) > 0) || (inputMode === 'gold' && parseFloat(goldAmount) > 0)) && (
                    <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-200 mt-2">
                      <span className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        Total to Pay:
                      </span>
                      <span className="text-lg font-bold text-emerald-700">
                        ${(inputMode === 'gold' 
                          ? (parseFloat(goldAmount) * goldPrice.pricePerGram) + calculateFee(parseFloat(goldAmount) * goldPrice.pricePerGram)
                          : parseFloat(amount) + calculateFee(parseFloat(amount) || 0)
                        ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  
                  {/* Live Price */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-amber-200">
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      Live gold price:
                    </span>
                    <span className="font-medium">${goldPrice.pricePerGram.toFixed(2)}/gram</span>
                  </div>
                  
                  {/* Important Notice */}
                  <div className="bg-gradient-to-r from-amber-100 to-orange-50 border border-amber-300 rounded-lg p-4 mt-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-amber-800 text-sm mb-1">Important Notice</p>
                        <p className="text-xs text-amber-700 leading-relaxed">
                          Gold price shown is tentative. Final rate will be recalculated upon fund receipt. 
                          After verification, gold will be deposited to your <strong>Market Price Gold Wallet (MPGW)</strong> at the final confirmed rate.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Live Price Display when no amount entered */}
            {goldPrice && !((inputMode === 'gold' && goldAmount && parseFloat(goldAmount) > 0) || 
              (inputMode === 'usd' && amount && parseFloat(amount) > 0)) && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live Gold Price</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-amber-700">${goldPrice.pricePerGram.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/gram</span></span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Legacy Conversion Display - kept for compatibility */}
            {goldPrice && false && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                {/* Conversion Result */}
                {((inputMode === 'gold' && goldAmount && parseFloat(goldAmount) > 0) || 
                  (inputMode === 'usd' && amount && parseFloat(amount) > 0)) && (
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {inputMode === 'gold' ? (
                          <>
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <Coins className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">You're buying</p>
                              <p className="text-lg font-bold text-foreground">{parseFloat(goldAmount).toFixed(4)}g gold</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">You're depositing</p>
                              <p className="text-lg font-bold text-foreground">${parseFloat(amount).toFixed(2)} USD</p>
                            </div>
                          </>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      <div className="text-right">
                        {inputMode === 'gold' ? (
                          <>
                            <p className="text-xs text-muted-foreground">Estimated cost</p>
                            <p className="text-lg font-bold text-emerald-600">≈ ${(parseFloat(goldAmount) * (goldPrice?.pricePerGram || 0)).toFixed(2)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">You'll receive</p>
                            <p className="text-lg font-bold text-amber-600">≈ {(parseFloat(amount) / (goldPrice?.pricePerGram || 1)).toFixed(4)}g</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Wallet Destination Badge */}
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/5 rounded-lg border border-primary/10">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary">Gold will be credited to your Market Price Gold Wallet (MPGW)</span>
                </div>
              </div>
            )}

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-green-600" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Instant Processing</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Live Rates</span>
              </div>
            </div>

            {/* Minimum Deposit Notice */}
            <p className="text-xs text-center text-muted-foreground pt-2">
              Minimum deposit: <span className="font-semibold">${platformSettings.minDeposit || 50} USD</span>
            </p>
          </div>
        ) : (loading || checkingNgenius) && step === 'method' ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : step === 'method' ? (
          <div className="space-y-6 py-4">
            {/* Progress Stepper */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-primary hidden sm:inline">Amount</span>
              </div>
              <div className="w-8 h-0.5 bg-primary"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-sm font-medium text-foreground hidden sm:inline">Method</span>
              </div>
              <div className="w-8 h-0.5 bg-muted"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Confirm</span>
              </div>
            </div>

            {/* Amount Summary Card */}
            <div className="bg-gradient-to-r from-primary/5 to-amber-50 rounded-xl p-4 border border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deposit Amount</p>
                    <p className="text-lg font-bold text-foreground">
                      {inputMode === 'gold' ? `${parseFloat(goldAmount || '0').toFixed(4)}g gold` : `$${parseFloat(amount || '0').toFixed(2)} USD`}
                    </p>
                  </div>
                </div>
                {goldPrice && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">≈ Equivalent</p>
                    <p className="text-sm font-semibold text-primary">
                      {inputMode === 'gold' 
                        ? `$${(parseFloat(goldAmount || '0') * goldPrice.pricePerGram).toFixed(2)} USD`
                        : `${(parseFloat(amount || '0') / goldPrice.pricePerGram).toFixed(4)}g gold`
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-sm font-semibold text-foreground text-center">Choose your payment method</h3>
            
            {/* Payment Method Cards - Premium Design */}
            <div className="space-y-3">
              {/* Bank Transfer */}
              <button
                onClick={() => handleSelectMethod('bank')}
                className="w-full group border-2 border-border rounded-xl p-5 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200 text-left relative overflow-hidden"
                data-testid="button-select-bank-transfer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 group-hover:shadow-blue-300 transition-shadow">
                    <Building className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-lg">Bank Transfer</h4>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full uppercase">Recommended</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">Transfer from your bank account</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>1-3 business days</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Check className="w-3 h-3" />
                        <span>No fees</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </button>

              {/* Card Payment */}
              {ngeniusEnabled && (
                <button
                  onClick={() => handleSelectMethod('card')}
                  className="w-full group border-2 border-border rounded-xl p-5 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 transition-all duration-200 text-left relative overflow-hidden"
                  data-testid="button-select-card-payment"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:shadow-emerald-300 transition-shadow">
                      <CreditCard className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-lg">Card Payment</h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />
                          Instant
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">Pay with Visa or Mastercard</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Instant credit</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Shield className="w-3 h-3" />
                          <span>3D Secure</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              )}

              {/* Crypto Payment */}
              {cryptoWallets.length > 0 && (
                <button
                  onClick={() => handleSelectMethod('crypto')}
                  className="w-full group border-2 border-border rounded-xl p-5 bg-white hover:border-orange-400 hover:bg-orange-50/30 transition-all duration-200 text-left relative overflow-hidden"
                  data-testid="button-select-crypto-payment"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200 group-hover:shadow-orange-300 transition-shadow">
                      <Bitcoin className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-lg">Cryptocurrency</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">Bitcoin, Ethereum, USDT & more</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Manual verification</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="w-3 h-3" />
                          <span>Multiple networks</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              )}
            </div>

            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-2 pt-3 text-xs text-muted-foreground">
              <Shield className="w-4 h-4 text-green-600" />
              <span>All transactions are secured with industry-standard encryption</span>
            </div>
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
              {/* Left Panel - Premium Bank Details Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 shadow-xl">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-2xl -translate-y-8 translate-x-8"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-xl translate-y-4 -translate-x-4"></div>
                
                {/* Header */}
                <div className="relative flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                      <Building className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Transfer To</h4>
                      <p className="text-xs text-slate-400">{selectedAccount.bankName}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold rounded-full shadow-lg">
                    {selectedAccount.currency}
                  </span>
                </div>
                
                {/* Bank Details */}
                <div className="relative space-y-3">
                  <div className="group">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Beneficiary</span>
                    <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10 mt-1 hover:bg-white/10 transition-colors">
                      <span className="font-mono text-sm text-white truncate mr-2">{selectedAccount.accountName}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(selectedAccount.accountName, 'Beneficiary')}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="group">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Account Number</span>
                    <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10 mt-1 hover:bg-white/10 transition-colors">
                      <span className="font-mono text-sm text-white">{selectedAccount.accountNumber}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(selectedAccount.accountNumber, 'Account Number')}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {selectedAccount.swiftCode && (
                    <div className="group">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">SWIFT Code</span>
                      <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10 mt-1 hover:bg-white/10 transition-colors">
                        <span className="font-mono text-sm text-white">{selectedAccount.swiftCode}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(selectedAccount.swiftCode!, 'SWIFT')}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedAccount.iban && (
                    <div className="group">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">IBAN</span>
                      <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10 mt-1 hover:bg-white/10 transition-colors">
                        <span className="font-mono text-xs text-white truncate mr-2">{selectedAccount.iban}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(selectedAccount.iban!, 'IBAN')}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedAccount.routingNumber && (
                    <div className="group">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Routing Number</span>
                      <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10 mt-1 hover:bg-white/10 transition-colors">
                        <span className="font-mono text-sm text-white">{selectedAccount.routingNumber}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => copyToClipboard(selectedAccount.routingNumber!, 'Routing')}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Deposit Information */}
              <div className="space-y-4">
                {/* Read-Only Amount Display - Pre-filled from Step 1 */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold text-amber-800">Amount to Transfer</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('amount')}
                      className="text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 h-7 px-2"
                      data-testid="button-edit-amount"
                    >
                      Edit Amount
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-amber-200">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                      {inputMode === 'gold' ? (
                        <Coins className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white font-bold text-sm">{getCurrencySymbol(selectedAccount?.currency || 'USD').trim()}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-amber-800">
                        {inputMode === 'gold' 
                          ? `${parseFloat(goldAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}g`
                          : `${getCurrencySymbol(selectedAccount?.currency || 'USD')}${parseFloat(amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                      </p>
                      <p className="text-xs text-amber-600">
                        {inputMode === 'gold' 
                          ? `≈ $${goldPrice ? (parseFloat(goldAmount || '0') * goldPrice.pricePerGram).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} USD`
                          : selectedAccount?.currency !== 'USD' 
                            ? `≈ $${convertToUsd(parseFloat(amount) || 0, selectedAccount?.currency || 'USD').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                            : ''
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deposit Summary - GOLD-FIRST */}
                {((inputMode === 'gold' && parseFloat(goldAmount) > 0) || (inputMode === 'usd' && parseFloat(amount) > 0)) && (
                  <div className="border border-amber-300 rounded-xl p-4 bg-gradient-to-r from-amber-50 to-yellow-50">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins className="w-5 h-5 text-amber-600" />
                      <h4 className="font-semibold text-amber-800">Deposit Summary</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      {/* Gold You'll Receive - Primary */}
                      <div className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-amber-200">
                        <span className="flex items-center gap-2 text-amber-700 font-medium">
                          <Coins className="w-4 h-4" />
                          Gold You'll Receive:
                        </span>
                        <span className="text-xl font-bold text-amber-700">
                          {(inputMode === 'gold' 
                            ? parseFloat(goldAmount) 
                            : getEffectiveGoldGrams()).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}g
                        </span>
                      </div>
                      
                      {/* Gold Value */}
                      <div className="flex justify-between text-muted-foreground">
                        <span>Gold Value:</span>
                        <span className="font-medium">
                          ${(inputMode === 'gold' 
                            ? getEffectiveUsdAmount()
                            : (selectedAccount?.currency !== 'USD' 
                                ? getDepositSummary().amountInUsd
                                : parseFloat(amount) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {inputMode === 'usd' && selectedAccount?.currency !== 'USD' && (
                        <div className="flex justify-between text-muted-foreground text-xs">
                          <span>{selectedAccount?.currency} Amount:</span>
                          <span>{getDepositSummary().currencySymbol}{getDepositSummary().amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      
                      {/* Processing Fee - Show in both modes */}
                      {depositFee && ((inputMode === 'usd' && parseFloat(amount) > 0) || (inputMode === 'gold' && parseFloat(goldAmount) > 0)) && (
                        <div className="flex justify-between text-orange-600">
                          <span>Processing Fee ({depositFee.feeValue}%):</span>
                          <span className="font-medium">
                            +${(inputMode === 'gold' 
                              ? calculateFee(parseFloat(goldAmount) * (goldPrice?.pricePerGram || 0))
                              : calculateFee(selectedAccount?.currency !== 'USD' ? getDepositSummary().amountInUsd : parseFloat(amount) || 0)
                            ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      
                      {/* Total to Pay */}
                      {depositFee && ((inputMode === 'usd' && parseFloat(amount) > 0) || (inputMode === 'gold' && parseFloat(goldAmount) > 0)) && (
                        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-200">
                          <span className="flex items-center gap-2 text-emerald-700 font-semibold">
                            <DollarSign className="w-4 h-4" />
                            Total to Pay:
                          </span>
                          <span className="text-lg font-bold text-emerald-700">
                            ${(inputMode === 'gold' 
                              ? (parseFloat(goldAmount) * (goldPrice?.pricePerGram || 0)) + calculateFee(parseFloat(goldAmount) * (goldPrice?.pricePerGram || 0))
                              : (selectedAccount?.currency !== 'USD' ? getDepositSummary().amountInUsd : parseFloat(amount) || 0) + calculateFee(selectedAccount?.currency !== 'USD' ? getDepositSummary().amountInUsd : parseFloat(amount) || 0)
                            ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      
                      {goldPrice?.pricePerGram && (
                        <p className="text-xs text-muted-foreground pt-2 border-t border-amber-200">
                          Live gold price: ${goldPrice.pricePerGram.toFixed(2)}/gram
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
                   <p>Gold price shown is tentative. Final rate will be recalculated upon fund receipt. After verification, gold will be deposited to your Market Price Gold Wallet (MPGW) at the final confirmed rate.</p>
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
              
              {/* Input Mode Toggle - GOLD-ONLY COMPLIANCE */}
              {/* Deposits always go to MPGW - user can transfer to FPGW later */}
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  size="sm"
                  variant={inputMode === 'gold' ? 'default' : 'outline'}
                  onClick={() => setInputMode('gold')}
                  className={`flex-1 ${inputMode === 'gold' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                  data-testid="button-card-input-mode-gold"
                >
                  <Coins className="w-4 h-4 mr-1" /> Enter in Gold (g)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inputMode === 'usd' ? 'default' : 'outline'}
                  onClick={() => setInputMode('usd')}
                  className="flex-1"
                  data-testid="button-card-input-mode-usd"
                >
                  <DollarSign className="w-4 h-4 mr-1" /> Enter in USD
                </Button>
              </div>
              
              {inputMode === 'gold' ? (
                <div>
                  <Label className="text-sm text-amber-700 font-semibold">Amount (Gold Grams) *</Label>
                  <div className="relative mt-1">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                    <Input 
                      type="number"
                      value={goldAmount}
                      onChange={(e) => setGoldAmount(e.target.value)}
                      placeholder="0.000"
                      className="pl-9 bg-white border-amber-300 focus:border-amber-500"
                      step="0.001"
                      min="0.001"
                      data-testid="input-card-gold-amount"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current price: ${goldPrice?.pricePerGram?.toFixed(2) || '—'}/gram
                  </p>
                </div>
              ) : (
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
              )}

              {/* Equivalent Display */}
              {((inputMode === 'gold' && parseFloat(goldAmount) > 0) || (inputMode === 'usd' && parseFloat(amount) > 0)) && goldPrice?.pricePerGram && (
                <div className="border border-amber-300 rounded-lg p-3 bg-gradient-to-r from-amber-50 to-yellow-50 mt-3">
                  <div className="flex justify-between items-start">
                    <span className="flex items-center gap-1 text-amber-700 text-sm font-medium">
                      {inputMode === 'gold' ? (
                        <><DollarSign className="w-4 h-4" /> USD Equivalent:</>
                      ) : (
                        <><Coins className="w-4 h-4" /> Gold You'll Receive:</>
                      )}
                    </span>
                    <div className="text-right">
                      {inputMode === 'gold' ? (
                        <>
                          <p className="font-bold text-amber-700 text-lg">
                            {parseFloat(goldAmount).toFixed(4)}g gold
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ≈ ${getEffectiveUsdAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-amber-700 text-lg">
                            {getEffectiveGoldGrams().toFixed(4)}g gold
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ≈ ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <Coins className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
              <p>Your real balance is gold. USD is an equivalent value calculated at current market price.</p>
            </div>
            
            <div className="bg-info-muted text-info-muted-foreground text-xs p-3 rounded-lg flex items-start gap-2">
               <div className="mt-0.5">ℹ️</div>
               <p>Enter your card details securely on the next screen. Your wallet will be credited instantly upon successful payment.</p>
            </div>
            
            <div className="bg-warning-muted border border-warning/30 text-warning-muted-foreground text-xs p-3 rounded-lg">
               <p className="font-semibold mb-1">Important Notice</p>
               <p>Gold price shown is tentative. Final rate will be recalculated upon fund receipt. After verification, gold will be deposited to your Market Price Gold Wallet (MPGW) at the final confirmed rate.</p>
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
              goldWalletType={selectedWalletType}
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
                Your gold has been credited to your Market Price Gold Wallet (MPGW).
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
            {/* Input Mode Toggle - GOLD-ONLY COMPLIANCE */}
            {/* Deposits always go to MPGW - user can transfer to FPGW later */}

            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                size="sm"
                variant={inputMode === 'gold' ? 'default' : 'outline'}
                onClick={() => setInputMode('gold')}
                className={`flex-1 ${inputMode === 'gold' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                data-testid="button-input-mode-gold"
              >
                <Coins className="w-4 h-4 mr-1" /> Enter in Gold (g)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={inputMode === 'usd' ? 'default' : 'outline'}
                onClick={() => setInputMode('usd')}
                className="flex-1"
                data-testid="button-input-mode-usd"
              >
                <DollarSign className="w-4 h-4 mr-1" /> Enter in USD
              </Button>
            </div>
            
            {inputMode === 'gold' ? (
              <div>
                <Label className="text-amber-700 font-semibold">Amount (Gold Grams)</Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                  <Input
                    type="number"
                    placeholder="Enter gold grams"
                    value={goldAmount}
                    onChange={(e) => setGoldAmount(e.target.value)}
                    className="pl-10 border-amber-300 focus:border-amber-500"
                    step="0.001"
                    min="0.001"
                    data-testid="input-crypto-gold-amount"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Current price: ${goldPrice?.pricePerGram?.toFixed(2) || '—'}/gram
                </p>
              </div>
            ) : (
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
            )}

            {/* Equivalent Display - shows opposite of input mode */}
            {((inputMode === 'gold' && parseFloat(goldAmount) > 0) || (inputMode === 'usd' && parseFloat(amount) > 0)) && goldPrice?.pricePerGram && (
              <div className="border border-amber-300 rounded-lg p-3 bg-gradient-to-r from-amber-50 to-yellow-50">
                <div className="flex justify-between items-start">
                  <span className="flex items-center gap-1 text-amber-700 text-sm font-medium">
                    {inputMode === 'gold' ? (
                      <><DollarSign className="w-4 h-4" /> USD Equivalent:</>
                    ) : (
                      <><Coins className="w-4 h-4" /> Gold You'll Receive:</>
                    )}
                  </span>
                  <div className="text-right">
                    {inputMode === 'gold' ? (
                      <>
                        <p className="font-bold text-amber-700 text-lg">
                          {parseFloat(goldAmount).toFixed(4)}g gold
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ≈ ${getEffectiveUsdAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-amber-700 text-lg">
                          {getEffectiveGoldGrams().toFixed(4)}g gold
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ≈ ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <Coins className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
              <p>Your real balance is gold. USD is an equivalent value calculated at current market price.</p>
            </div>
            
            <div className="bg-warning-muted text-warning-muted-foreground text-xs p-3 rounded-lg flex items-start gap-2">
              <div className="mt-0.5">ℹ️</div>
              <p>After entering the amount, you'll select a crypto network and send payment to our wallet address.</p>
            </div>
            
            <div className="bg-warning-muted border border-warning/30 text-warning-muted-foreground text-xs p-3 rounded-lg">
               <p className="font-semibold mb-1">Important Notice</p>
               <p>Gold price shown is tentative. Final rate will be recalculated upon fund receipt. After verification, gold will be deposited to your Market Price Gold Wallet (MPGW) at the final confirmed rate.</p>
            </div>
          </div>
        ) : step === 'crypto-select-wallet' ? (
          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Progress Stepper */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-primary hidden sm:inline">Amount</span>
              </div>
              <div className="w-8 h-0.5 bg-primary"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-primary hidden sm:inline">Method</span>
              </div>
              <div className="w-8 h-0.5 bg-primary"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-sm font-medium text-foreground hidden sm:inline">Network</span>
              </div>
            </div>

            {/* Amount Summary */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deposit Amount</p>
                    <p className="text-lg font-bold text-foreground">
                      {inputMode === 'gold' ? `${parseFloat(goldAmount || '0').toFixed(4)}g gold` : `$${parseFloat(amount || '0').toFixed(2)} USD`}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-orange-100 rounded-full">
                  <span className="text-xs font-semibold text-orange-700">Crypto Payment</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Select Cryptocurrency Network</h3>
              <p className="text-sm text-muted-foreground">Choose your preferred network to make the payment</p>
            </div>

            {cryptoWallets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bitcoin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No crypto wallets available at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {cryptoWallets.map((wallet) => {
                  const getCryptoStyle = (network: string | undefined | null, currency: string | undefined | null) => {
                    const n = (network || '').toLowerCase();
                    const c = (currency || '').toLowerCase();
                    if (n.includes('bitcoin') || c === 'btc') {
                      return { 
                        bg: 'from-orange-500 to-orange-600', 
                        border: 'border-orange-300 hover:border-orange-400',
                        hoverBg: 'hover:bg-orange-50',
                        icon: '₿',
                        color: 'text-orange-600'
                      };
                    }
                    if (n.includes('ethereum') || c === 'eth') {
                      return { 
                        bg: 'from-indigo-500 to-indigo-600', 
                        border: 'border-indigo-300 hover:border-indigo-400',
                        hoverBg: 'hover:bg-indigo-50',
                        icon: 'Ξ',
                        color: 'text-indigo-600'
                      };
                    }
                    if (c === 'usdt' || c.includes('tether')) {
                      return { 
                        bg: 'from-teal-500 to-teal-600', 
                        border: 'border-teal-300 hover:border-teal-400',
                        hoverBg: 'hover:bg-teal-50',
                        icon: '₮',
                        color: 'text-teal-600'
                      };
                    }
                    if (c === 'usdc') {
                      return { 
                        bg: 'from-blue-500 to-blue-600', 
                        border: 'border-blue-300 hover:border-blue-400',
                        hoverBg: 'hover:bg-blue-50',
                        icon: '$',
                        color: 'text-blue-600'
                      };
                    }
                    if (n.includes('binance') || n.includes('bep20') || n.includes('bnb')) {
                      return { 
                        bg: 'from-yellow-500 to-yellow-600', 
                        border: 'border-yellow-300 hover:border-yellow-400',
                        hoverBg: 'hover:bg-yellow-50',
                        icon: 'B',
                        color: 'text-yellow-600'
                      };
                    }
                    if (n.includes('tron') || n.includes('trc')) {
                      return { 
                        bg: 'from-red-500 to-red-600', 
                        border: 'border-red-300 hover:border-red-400',
                        hoverBg: 'hover:bg-red-50',
                        icon: 'T',
                        color: 'text-red-600'
                      };
                    }
                    return { 
                      bg: 'from-gray-500 to-gray-600', 
                      border: 'border-gray-300 hover:border-gray-400',
                      hoverBg: 'hover:bg-gray-50',
                      icon: '◇',
                      color: 'text-gray-600'
                    };
                  };
                  
                  const style = getCryptoStyle(wallet.network, wallet.currency);
                  
                  return (
                    <button
                      key={wallet.id}
                      onClick={() => setSelectedCryptoWallet(wallet)}
                      disabled={submitting}
                      className={`group relative border-2 rounded-xl p-4 transition-all duration-200 text-left bg-white ${style.border} ${style.hoverBg} ${
                        selectedCryptoWallet?.id === wallet.id ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
                      }`}
                      data-testid={`button-select-crypto-${wallet.id}`}
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${style.bg} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                          <span className="text-2xl font-bold text-white">{style.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{wallet.networkLabel}</h4>
                          <p className={`text-xs font-medium ${style.color}`}>{wallet.currency}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>~10-30 min</span>
                        </div>
                        {selectedCryptoWallet?.id === wallet.id && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : step === 'crypto-address' && selectedCryptoWallet ? (
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* Wallet Address Section */}
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
                        className="w-32 h-32 object-contain"
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

            {/* Transaction Hash Section */}
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
            
            {/* Amount Summary */}
            <div className="bg-muted/30 rounded-lg border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network:</span>
                <span className="font-medium">{selectedCryptoWallet.networkLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-primary">${parseFloat(amount).toFixed(2)}</span>
              </div>
              {goldPrice?.pricePerGram && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gold to receive:</span>
                  <span className="font-bold text-amber-600">{(parseFloat(amount) / goldPrice.pricePerGram).toFixed(4)}g</span>
                </div>
              )}
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
          {step === 'amount' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleAmountContinue}
                disabled={
                  inputMode === 'gold' 
                    ? !goldAmount || parseFloat(goldAmount) <= 0
                    : !amount || parseFloat(amount) <= 0
                }
                data-testid="button-continue-deposit"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
          {step === 'method' && (
            <>
              <Button variant="outline" onClick={() => setStep('amount')}>Back</Button>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </>
          )}
          {(step === 'select' || step === 'card-amount') && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              {step === 'card-amount' && (
                <Button 
                  onClick={() => {
                    // Sync USD amount from gold input for downstream use
                    if (inputMode === 'gold' && goldPrice?.pricePerGram) {
                      const usdValue = getEffectiveUsdAmount();
                      setAmount(usdValue.toFixed(2));
                    }
                    handleCardPayment();
                  }} 
                  disabled={
                    inputMode === 'gold'
                      ? !goldAmount || getEffectiveUsdAmount() < (platformSettings.minDeposit || 50)
                      : !amount || submitting
                  }
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
                onClick={() => {
                  // Sync USD amount from gold input for downstream use
                  if (inputMode === 'gold' && goldPrice?.pricePerGram) {
                    const usdValue = getEffectiveUsdAmount();
                    setAmount(usdValue.toFixed(2));
                  }
                  handleSubmit();
                }} 
                disabled={
                  inputMode === 'gold'
                    ? !goldAmount || submitting || (termsContent?.enabled && !termsAccepted)
                    : !amount || submitting || (termsContent?.enabled && !termsAccepted)
                }
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
                onClick={() => {
                  // Sync USD amount from gold input for downstream use
                  if (inputMode === 'gold' && goldPrice?.pricePerGram) {
                    const usdValue = getEffectiveUsdAmount();
                    setAmount(usdValue.toFixed(2));
                  }
                  setStep('crypto-select-wallet');
                }} 
                disabled={
                  inputMode === 'gold' 
                    ? !goldAmount || getEffectiveUsdAmount() < (platformSettings.minDeposit || 50)
                    : !amount || parseFloat(amount) < (platformSettings.minDeposit || 50)
                }
                data-testid="button-proceed-crypto-select"
              >
                <Bitcoin className="w-4 h-4 mr-2" />
                Select Crypto Network
              </Button>
            </>
          )}
          {step === 'crypto-select-wallet' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button 
                onClick={handleCryptoConfirm}
                disabled={!selectedCryptoWallet || submitting}
                data-testid="button-continue-crypto"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Continue
              </Button>
            </>
          )}
          {step === 'crypto-address' && (
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
