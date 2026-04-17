import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Bitcoin, AlertTriangle, CheckCircle2, Loader2, ArrowUpRight, ShieldCheck, ShieldAlert, Info, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTransactionPin } from '@/components/TransactionPinPrompt';
import { useDualWalletBalance } from '@/hooks/useDualWallet';
import { useFees, FEE_KEYS } from '@/context/FeeContext';

interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  iban?: string | null;
  swiftCode?: string | null;
  bankCountry?: string | null;
  label?: string | null;
  isPrimary?: boolean;
  status?: string;
  verifiedAt?: string | null;
}

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

  // Bank: selected saved account
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');

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

  // Saved bank accounts
  const { data: bankAccountsData, isLoading: bankAccountsLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/user/bank-accounts', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load bank accounts');
      return res.json() as Promise<BankAccount[]>;
    },
    enabled: !!user?.id && isOpen && tab === 'bank',
  });

  const bankAccounts: BankAccount[] = Array.isArray(bankAccountsData) ? bankAccountsData.filter(a => a.status !== 'Inactive' && !!a.verifiedAt) : [];
  const selectedBankAccount = bankAccounts.find(a => a.id === selectedBankAccountId) || null;

  // KYC name match for selected bank account
  const kycNameMatch = selectedBankAccount
    ? selectedBankAccount.accountHolderName.trim().toLowerCase() === kycFullName.toLowerCase()
    : false;

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setTab('bank');
      setInputMode('grams');
      setInputValue('');
      setSelectedBankAccountId('');
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
      if (!selectedBankAccountId) return 'Please select a saved bank account.';
      if (!selectedBankAccount) return 'Selected bank account not found.';
      if (!kycNameMatch) return `The account holder name "${selectedBankAccount.accountHolderName}" does not match your KYC name "${kycFullName}". Bank withdrawals require KYC name verification.`;
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

    let pinToken: string;
    try {
      pinToken = await requirePin({
        userId: user.id,
        action: 'withdraw_funds',
        title: 'Authorize Withdrawal',
        description: `Enter your 6-digit PIN to withdraw ${grams.toFixed(4)}g ($${grossUsd.toFixed(2)})`,
      });
    } catch {
      return;
    }

    setSubmitting(true);

    type WithdrawalBody = {
      goldGrams: string;
      goldPriceUsdPerGram: string;
      withdrawalMethod: string;
      notes?: string;
      bankAccountId?: string;
      cryptoNetwork?: string;
      cryptoCurrency?: string;
      walletAddress?: string;
    };

    try {
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-pin-token': pinToken,
      };

      const body: WithdrawalBody = {
        goldGrams: grams.toFixed(6),
        goldPriceUsdPerGram: goldPricePerGram.toFixed(4),
        withdrawalMethod: tab === 'bank' ? 'Bank Transfer' : 'Crypto',
        notes: notes || undefined,
      };

      if (tab === 'bank' && selectedBankAccount) {
        body.bankAccountId = selectedBankAccount.id;
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

      const data = await res.json() as { request?: { referenceNumber?: string }; message?: string };
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      setReferenceNumber(data.request?.referenceNumber || '');
      setStep('submitted');
      queryClient.invalidateQueries({ queryKey: ['vault-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['dual-wallet'] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit withdrawal request.';
      toast.error(message);
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
      <DialogContent className="bg-card border-border text-foreground w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
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
                {tab === 'bank' && selectedBankAccount && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{selectedBankAccount.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-medium">{selectedBankAccount.accountHolderName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account No.</span>
                      <span className="font-medium font-mono">{selectedBankAccount.accountNumber}</span>
                    </div>
                    {selectedBankAccount.iban && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IBAN</span>
                        <span className="font-medium font-mono">{selectedBankAccount.iban}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        <ShieldCheck className="w-3 h-3" /> KYC Name Verified
                      </span>
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
                <p className="text-xs text-muted-foreground">Available Gold Balance</p>
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
                {bankAccountsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading bank accounts...
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
                      <Building2 className="w-8 h-8 text-muted-foreground/40" />
                      <p className="font-medium">No verified bank accounts</p>
                      <p className="text-xs text-center">Bank withdrawals require a verified bank account. Add and verify a bank account in your profile before withdrawing.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => { handleClose(); window.location.href = '/profile?tab=bank'; }}
                    >
                      <PlusCircle className="w-4 h-4" /> Manage Bank Accounts
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Select Bank Account <span className="text-red-500">*</span></Label>
                      <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                        <SelectTrigger data-testid="select-bank-account">
                          <SelectValue placeholder="Choose a saved bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((acct) => (
                            <SelectItem key={acct.id} value={acct.id}>
                              <span className="flex flex-col">
                                <span className="font-medium">{acct.label || acct.bankName}</span>
                                <span className="text-xs text-muted-foreground">{acct.accountHolderName} · ···{acct.accountNumber.slice(-4)}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedBankAccount && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{selectedBankAccount.bankName}</span>
                          {kycNameMatch ? (
                            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                              <ShieldCheck className="w-3 h-3" /> KYC Match
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <ShieldAlert className="w-3 h-3" /> Name Mismatch
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Account Holder</span><span className="text-foreground">{selectedBankAccount.accountHolderName}</span>
                          <span>Account No.</span><span className="text-foreground font-mono">{selectedBankAccount.accountNumber}</span>
                          {selectedBankAccount.iban && <><span>IBAN</span><span className="text-foreground font-mono">{selectedBankAccount.iban}</span></>}
                          {selectedBankAccount.swiftCode && <><span>SWIFT</span><span className="text-foreground font-mono">{selectedBankAccount.swiftCode}</span></>}
                          {selectedBankAccount.bankCountry && <><span>Country</span><span className="text-foreground">{selectedBankAccount.bankCountry}</span></>}
                        </div>
                        {!kycNameMatch && (
                          <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800 mt-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              Account holder name <strong>"{selectedBankAccount.accountHolderName}"</strong> does not match your KYC name <strong>"{kycFullName}"</strong>. Bank withdrawals require an exact name match for AML compliance. Please use an account registered under your KYC name.
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Bank withdrawals require the account holder name to exactly match your KYC-verified name for AML compliance.</span>
                    </div>
                  </>
                )}
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
                    placeholder="0x... or destination address"
                    className="font-mono text-sm"
                    data-testid="input-wallet-address"
                  />
                </div>
                <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Crypto withdrawals are irreversible. Ensure the address and network are correct. Finatrades is not liable for lost funds due to incorrect wallet addresses or network selections.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="liability-accept"
                    checked={liabilityAccepted}
                    onChange={(e) => setLiabilityAccepted(e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                    data-testid="checkbox-liability"
                  />
                  <label htmlFor="liability-accept" className="text-xs text-muted-foreground cursor-pointer">
                    I understand and accept sole responsibility for this crypto withdrawal
                  </label>
                </div>
              </TabsContent>
            </Tabs>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Notes <span className="text-xs">(optional)</span></Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional instructions..."
                className="w-full min-h-[60px] text-sm border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                data-testid="input-notes"
              />
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleProceed}
              disabled={submitting || (tab === 'bank' && selectedBankAccount !== null && !kycNameMatch)}
              data-testid="button-proceed-withdraw"
            >
              Review Withdrawal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
