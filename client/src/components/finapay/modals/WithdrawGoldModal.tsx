import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Bitcoin, AlertTriangle, CheckCircle2, Loader2, ArrowUpRight, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useTransactionPin } from '@/components/TransactionPinPrompt';
import { useDualWalletBalance } from '@/hooks/useDualWallet';
import { useFees, FEE_KEYS } from '@/context/FeeContext';

interface WithdrawGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CRYPTO_NETWORKS = ['Ethereum (ERC-20)', 'Binance Smart Chain (BEP-20)', 'Tron (TRC-20)', 'Solana', 'Polygon', 'Avalanche'];
const CRYPTO_CURRENCIES = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB'];

export default function WithdrawGoldModal({ isOpen, onClose }: WithdrawGoldModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { requirePin, TransactionPinPromptComponent } = useTransactionPin();
  const { getFeeValue } = useFees();

  const [tab, setTab] = useState<'bank' | 'crypto'>('bank');
  const [step, setStep] = useState<'form' | 'confirm' | 'submitted'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');

  // Amount
  const [inputMode, setInputMode] = useState<'grams' | 'usd'>('grams');
  const [inputValue, setInputValue] = useState('');

  // Bank fields
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [bankCountry, setBankCountry] = useState('');

  // Crypto fields
  const [cryptoNetwork, setCryptoNetwork] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const [notes, setNotes] = useState('');
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);

  // Dual wallet balance
  const { data: dualBalance, isLoading: balanceLoading } = useDualWalletBalance(user?.id);
  const goldPricePerGram = dualBalance?.goldPricePerGram || 0;
  const availableGrams = (dualBalance?.mpgw?.availableGrams || 0) + (dualBalance?.fpgw?.availableGrams || 0);

  // Fee
  const cashoutFeePercent = getFeeValue(FEE_KEYS.FINAVAULT_CASHOUT, 1.5);

  const numericInput = parseFloat(inputValue) || 0;
  const grams = inputMode === 'grams' ? numericInput : (goldPricePerGram > 0 ? numericInput / goldPricePerGram : 0);
  const grossUsd = grams * goldPricePerGram;
  const feeUsd = grossUsd * (cashoutFeePercent / 100);
  const netUsd = grossUsd - feeUsd;

  // KYC data for name match
  const { data: kycData } = useQuery({
    queryKey: ['kyc', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/kyc/${user?.id}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id && isOpen,
  });

  const kycFullName: string = kycData?.fullName || kycData?.submission?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  // KYC name match check
  const kycNameMatch = accountName.trim().length > 0 &&
    accountName.trim().toLowerCase() === kycFullName.toLowerCase();

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setTab('bank');
      setInputMode('grams');
      setInputValue('');
      setBankName('');
      setAccountName('');
      setAccountNumber('');
      setIban('');
      setSwiftCode('');
      setBankCountry('');
      setCryptoNetwork('');
      setCryptoCurrency('');
      setWalletAddress('');
      setNotes('');
      setLiabilityAccepted(false);
      setReferenceNumber('');
    }
  }, [isOpen]);

  const validateForm = (): string | null => {
    if (grams <= 0) return 'Please enter a valid gold amount.';
    if (grams > availableGrams) return `Insufficient balance. You have ${availableGrams.toFixed(4)}g available.`;

    if (tab === 'bank') {
      if (!bankName.trim()) return 'Please enter the bank name.';
      if (!accountName.trim()) return 'Please enter the account holder name.';
      if (!accountNumber.trim()) return 'Please enter the account number.';
    } else {
      if (!cryptoNetwork) return 'Please select a crypto network.';
      if (!cryptoCurrency) return 'Please select a crypto currency.';
      if (!walletAddress.trim()) return 'Please enter a wallet address.';
      if (!liabilityAccepted) return 'You must accept the crypto liability disclaimer.';
    }

    return null;
  };

  const handleProceed = () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!user) return;

    let pinToken: string | null = null;
    try {
      pinToken = await requirePin();
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (pinToken) headers['x-pin-token'] = pinToken;

      const body: Record<string, any> = {
        userId: user.id,
        goldGrams: grams.toFixed(6),
        goldPriceUsdPerGram: goldPricePerGram.toFixed(4),
        withdrawalMethod: tab === 'bank' ? 'Bank Transfer' : 'Crypto',
        notes: notes || undefined,
      };

      if (tab === 'bank') {
        body.bankName = bankName;
        body.accountName = accountName;
        body.accountNumber = accountNumber;
        body.iban = iban || undefined;
        body.swiftCode = swiftCode || undefined;
        body.bankCountry = bankCountry || undefined;
      } else {
        body.cryptoNetwork = cryptoNetwork;
        body.cryptoCurrency = cryptoCurrency;
        body.walletAddress = walletAddress;
      }

      const res = await fetch('/api/vault/withdrawal', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      setReferenceNumber(data.request?.referenceNumber || '');
      setStep('submitted');
      queryClient.invalidateQueries({ queryKey: ['vault-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['dual-wallet'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep('form');
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-orange-500" />
            Withdraw Gold
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Convert your gold to bank transfer or crypto. Processed within 1–3 business days.
          </DialogDescription>
        </DialogHeader>

        {TransactionPinPromptComponent}

        {step === 'submitted' ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-green-700">Withdrawal Request Submitted</h3>
            {referenceNumber && (
              <p className="text-sm text-muted-foreground font-mono">Ref: {referenceNumber}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Your withdrawal request is under review. You'll be notified once it's processed.
            </p>
            <Button onClick={handleClose} className="bg-orange-500 hover:bg-orange-600 text-white w-full">
              Done
            </Button>
          </div>
        ) : step === 'confirm' ? (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-orange-800">Confirm Withdrawal</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gold Amount</span>
                  <span className="font-medium">{grams.toFixed(4)} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gold Price</span>
                  <span className="font-medium">${goldPricePerGram.toFixed(2)}/g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Value</span>
                  <span className="font-medium">${grossUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-orange-700">
                  <span>Fee ({cashoutFeePercent}%)</span>
                  <span>−${feeUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-base">
                  <span>Net Payout</span>
                  <span className="text-green-700">${netUsd.toFixed(2)}</span>
                </div>
              </div>
              <div className="pt-2 border-t space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">{tab === 'bank' ? 'Bank Transfer' : 'Crypto'}</span>
                </div>
                {tab === 'bank' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-medium">{accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account No.</span>
                      <span className="font-medium font-mono">{accountNumber}</span>
                    </div>
                    {iban && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IBAN</span>
                        <span className="font-medium font-mono">{iban}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {kycNameMatch ? (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                          <ShieldCheck className="w-3 h-3" /> KYC Name Match
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <ShieldAlert className="w-3 h-3" /> Name Mismatch with KYC
                        </span>
                      )}
                    </div>
                  </>
                )}
                {tab === 'crypto' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network</span>
                      <span className="font-medium">{cryptoNetwork}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="font-medium">{cryptoCurrency}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground">Wallet Address</span>
                      <span className="font-mono text-xs break-all">{walletAddress}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {tab === 'bank' && !kycNameMatch && (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  The account holder name does not match your KYC name (<strong>{kycFullName}</strong>). Your request will still be submitted but may require additional verification.
                </span>
              </div>
            )}
            {tab === 'crypto' && (
              <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Crypto withdrawals are sent at your own risk. Finatrades is not liable for incorrect wallet addresses or network mismatches. Double-check all details before confirming.
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('form')}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleSubmit}
                disabled={submitting}
                data-testid="button-confirm-withdraw"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {submitting ? 'Submitting...' : 'Confirm Withdrawal'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Balance info */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-lg font-bold text-orange-700">
                  {balanceLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `${availableGrams.toFixed(4)} g`}
                </p>
                <p className="text-xs text-muted-foreground">≈ ${(availableGrams * goldPricePerGram).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Gold Price</p>
                <p className="text-sm font-semibold">${goldPricePerGram.toFixed(2)}/g</p>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Amount to Withdraw</Label>
                <div className="flex gap-1 text-xs">
                  <button
                    type="button"
                    className={`px-2 py-0.5 rounded border ${inputMode === 'grams' ? 'bg-orange-500 text-white border-orange-500' : 'border-border text-muted-foreground'}`}
                    onClick={() => { setInputMode('grams'); setInputValue(''); }}
                  >
                    Grams
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-0.5 rounded border ${inputMode === 'usd' ? 'bg-orange-500 text-white border-orange-500' : 'border-border text-muted-foreground'}`}
                    onClick={() => { setInputMode('usd'); setInputValue(''); }}
                  >
                    USD
                  </button>
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder={inputMode === 'grams' ? 'e.g. 1.5' : 'e.g. 200'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="pr-16"
                  min="0"
                  step={inputMode === 'grams' ? '0.0001' : '1'}
                  data-testid="input-withdraw-amount"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                  {inputMode === 'grams' ? 'g' : 'USD'}
                </span>
              </div>
              {grams > 0 && (
                <p className="text-xs text-muted-foreground">
                  ≈ {inputMode === 'grams' ? `$${grossUsd.toFixed(2)} USD` : `${grams.toFixed(4)} g`} &nbsp;·&nbsp; Net after {cashoutFeePercent}% fee: <span className="text-green-600 font-medium">${netUsd.toFixed(2)}</span>
                </p>
              )}
              <button
                type="button"
                className="text-xs text-orange-600 hover:underline"
                onClick={() => {
                  setInputMode('grams');
                  setInputValue(availableGrams.toFixed(4));
                }}
              >
                Max: {availableGrams.toFixed(4)} g
              </button>
            </div>

            {/* Method tabs */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'bank' | 'crypto')}>
              <TabsList className="w-full">
                <TabsTrigger value="bank" className="flex-1 gap-1.5" data-testid="tab-bank-transfer">
                  <Building2 className="w-4 h-4" /> Bank Transfer
                </TabsTrigger>
                <TabsTrigger value="crypto" className="flex-1 gap-1.5" data-testid="tab-crypto">
                  <Bitcoin className="w-4 h-4" /> Crypto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label>Bank Name <span className="text-red-500">*</span></Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Emirates NBD" data-testid="input-bank-name" />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full name as per bank"
                    data-testid="input-account-name"
                  />
                  {accountName.trim().length > 0 && (
                    <p className={`text-xs flex items-center gap-1 ${kycNameMatch ? 'text-green-600' : 'text-amber-600'}`}>
                      {kycNameMatch
                        ? <><ShieldCheck className="w-3 h-3" /> Matches your KYC name</>
                        : <><ShieldAlert className="w-3 h-3" /> Does not match KYC name ({kycFullName})</>
                      }
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Account Number <span className="text-red-500">*</span></Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" data-testid="input-account-number" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>IBAN <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IBAN" data-testid="input-iban" />
                  </div>
                  <div className="space-y-2">
                    <Label>SWIFT / BIC <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} placeholder="SWIFT code" data-testid="input-swift" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bank Country <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input value={bankCountry} onChange={(e) => setBankCountry(e.target.value)} placeholder="e.g. UAE" data-testid="input-bank-country" />
                </div>
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>The account holder name must match your KYC-verified name for AML compliance. Mismatches may cause delays.</span>
                </div>
              </TabsContent>

              <TabsContent value="crypto" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label>Blockchain Network <span className="text-red-500">*</span></Label>
                  <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                    <SelectTrigger data-testid="select-crypto-network">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRYPTO_NETWORKS.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency <span className="text-red-500">*</span></Label>
                  <Select value={cryptoCurrency} onValueChange={setCryptoCurrency}>
                    <SelectTrigger data-testid="select-crypto-currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRYPTO_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Wallet Address <span className="text-red-500">*</span></Label>
                  <Input
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x... or wallet address"
                    className="font-mono text-sm"
                    data-testid="input-wallet-address"
                  />
                </div>
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-semibold mb-1">User Liability Disclaimer</p>
                    <p>Crypto withdrawals are executed at your sole risk. Finatrades accepts no responsibility for lost funds due to incorrect wallet addresses, wrong networks, or unsupported tokens. Always double-check your wallet address and network before submitting.</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={liabilityAccepted}
                    onChange={(e) => setLiabilityAccepted(e.target.checked)}
                    className="rounded"
                    data-testid="checkbox-liability"
                  />
                  <span className="text-xs text-muted-foreground">
                    I understand and accept full liability for this crypto withdrawal.
                  </span>
                </label>
              </TabsContent>
            </Tabs>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Additional Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={2}
                className="text-sm"
                data-testid="input-withdraw-notes"
              />
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleProceed}
              disabled={balanceLoading}
              data-testid="button-proceed-withdraw"
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Review Withdrawal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
