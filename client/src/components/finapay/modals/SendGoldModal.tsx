import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, QrCode, Scan, User, Search, CheckCircle2, AlertCircle, Mail, Hash, UserPlus, ExternalLink, ArrowRight, FileText, Paperclip, X, Upload } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import QRScanner from '../QRScanner';
import { useTransactionPin } from '@/components/TransactionPinPrompt';
import MobileFullScreenPage from '@/components/mobile/MobileFullScreenPage';
import { useMediaQuery } from '@/hooks/use-media-query';

const PAYMENT_REASONS = [
  'Buying Gold / Precious Metals',
  'Family Maintenance / Support',
  'Investment in Commodities',
  'Gift',
  'Education Expenses',
  'Medical Expenses',
  'Salary / Consulting Fee',
  'Transfer to Own Account (Savings)',
  'Property Purchase / Real Estate Payment',
  'Inheritance'
];

const SOURCE_OF_FUNDS = [
  'Salary / Employment Income',
  'Business Income',
  'Savings',
  'Investment Returns',
  'Gift / Inheritance',
  'Sale of Property',
  'Loan / Credit',
  'Other'
];

// Get CSRF token from cookie
const getCsrfToken = (): string | null => {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
};

// Fetch CSRF token if not present
const ensureCsrfToken = async (): Promise<string | null> => {
  let token = getCsrfToken();
  if (!token) {
    try {
      const res = await fetch('/api/csrf-token', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        token = data.csrfToken;
      }
    } catch (e) {
      console.warn('[SendGoldModal] Failed to fetch CSRF token:', e);
    }
  }
  return token;
};

interface SendGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
  goldBalance: number;
  onConfirm: (recipient: string, amount: number, asset: 'USD' | 'GOLD') => void;
}

interface FoundUser {
  id: string;
  finatradesId: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePhotoUrl?: string;
}

export default function SendGoldModal({ isOpen, onClose, walletBalance, goldBalance, onConfirm }: SendGoldModalProps) {
  const { user } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [inputMode, setInputMode] = useState<'usd' | 'grams'>('usd');
  const [inputValue, setInputValue] = useState('');
  const [memo, setMemo] = useState('');
  const [step, setStep] = useState<'search' | 'confirm' | 'success'>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'finatrades_id' | 'qr_code'>('email');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [paymentReason, setPaymentReason] = useState('');
  const [sourceOfFunds, setSourceOfFunds] = useState('');
  const [notFoundEmail, setNotFoundEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  
  // Invoice attachment
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  
  // Terms and conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState<{ title: string; terms: string; enabled: boolean } | null>(null);
  
  
  // Transaction PIN verification
  const { requirePin, TransactionPinPromptComponent } = useTransactionPin();
  
  // Mobile detection
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { data: goldPrice } = useQuery<{ pricePerGram: number }>({
    queryKey: ['/api/gold-price'],
    staleTime: 60000,
  });

  const currentGoldPrice = goldPrice?.pricePerGram || 85;
  
  // Calculate available balance from gold holdings (P2P transfers use gold, not USD wallet)
  const availableGoldValueUsd = goldBalance * currentGoldPrice;

  useEffect(() => {
    if (isOpen) {
      setStep('search');
      setIdentifier('');
      setInputMode('usd');
      setInputValue('');
      setMemo('');
      setIsLoading(false);
      setIsSearching(false);
      setActiveTab('email');
      setFoundUser(null);
      setSearchError('');
      setTransferRef('');
      setPaymentReason('');
      setSourceOfFunds('');
      setNotFoundEmail('');
      setIsSendingInvite(false);
      setInviteSent(false);
      setTermsAccepted(false);
      setInvoiceFile(null);
      setInvoicePreview(null);
      setIsUploadingInvoice(false);
      
      // Fetch terms
      fetch('/api/terms/transfer')
        .then(res => res.json())
        .then(data => setTermsContent(data))
        .catch(() => console.error('Failed to load terms'));
    }
  }, [isOpen]);

  const numericInput = parseFloat(inputValue) || 0;
  const numericAmount = inputMode === 'usd' ? numericInput : numericInput * currentGoldPrice;
  const gramsAmount = inputMode === 'grams' ? numericInput : (currentGoldPrice > 0 ? numericInput / currentGoldPrice : 0);

  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, PNG, or JPG file');
      return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    setInvoiceFile(file);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setInvoicePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setInvoicePreview(null);
    }
  };

  const removeInvoice = () => {
    setInvoiceFile(null);
    setInvoicePreview(null);
  };

  const handleSearch = async (searchIdentifier?: string) => {
    const searchValue = searchIdentifier || identifier;
    if (!searchValue.trim()) return;
    
    setIsSearching(true);
    setSearchError('');
    setFoundUser(null);
    setNotFoundEmail('');
    setInviteSent(false);
    
    try {
      const res = await apiRequest('GET', `/api/finapay/search-user?identifier=${encodeURIComponent(searchValue.trim())}`);
      const data = await res.json();
      
      if (data.user) {
        if (data.user.id === user?.id) {
          setSearchError("You cannot send money to yourself");
        } else {
          setFoundUser(data.user);
          toast.success(`Found user: ${data.user.firstName} ${data.user.lastName}`);
        }
      }
    } catch (error) {
      // Check if it's an email format - if so, offer invitation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (activeTab === 'email' && emailRegex.test(searchValue.trim())) {
        setNotFoundEmail(searchValue.trim());
        setSearchError('');
      } else {
        setSearchError("User not found. Check the email or Finatrades ID.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!notFoundEmail || !user || numericAmount <= 0) return;
    
    // Require PIN for invitation transfers
    let pinToken: string;
    try {
      pinToken = await requirePin({
        userId: user.id,
        action: 'send_funds',
        title: 'Authorize Invitation Transfer',
        description: `Enter your 6-digit PIN to send $${numericAmount.toFixed(2)} worth of gold to ${notFoundEmail}`,
      });
    } catch (error) {
      return;
    }
    
    setIsSendingInvite(true);
    
    try {
      const goldAmountToSend = numericAmount / currentGoldPrice;
      const csrfToken = await ensureCsrfToken();
      
      const res = await fetch('/api/finapay/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'x-pin-token': pinToken,
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          senderId: user.id,
          recipientIdentifier: notFoundEmail,
          amountGold: goldAmountToSend.toFixed(6),
          assetType: 'GOLD',
          channel: 'email',
          paymentReason,
          sourceOfFunds,
          memo,
          goldWalletType: 'LGPW',
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send invitation transfer');
      }
      
      if (data.isInvite || data.pending) {
        setInviteSent(true);
        toast.success(`Gold sent! Invitation delivered to ${notFoundEmail}`);
        // Invalidate queries to refresh wallet balance
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      } else {
        toast.error(data.message || 'Unexpected response');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation transfer');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleQRScan = useCallback((scannedData: string) => {
    setIdentifier(scannedData);
    toast.info(`Scanned: ${scannedData}`, { duration: 2000 });
    handleSearch(scannedData);
  }, [user]);

  const handleConfirmSend = async () => {
    if (!user || !foundUser || numericAmount <= 0) return;
    
    let pinToken: string;
    try {
      pinToken = await requirePin({
        userId: user.id,
        action: 'send_funds',
        title: 'Authorize Transfer',
        description: `Enter your 6-digit PIN to send $${numericAmount.toFixed(2)} to ${foundUser.firstName} ${foundUser.lastName}`,
      });
    } catch (error) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const goldAmountToSend = numericAmount / currentGoldPrice;
      const csrfToken = await ensureCsrfToken();
      const res = await fetch('/api/finapay/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'x-pin-token': pinToken,
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          senderId: user.id,
          recipientIdentifier: activeTab === 'email' ? foundUser.email : foundUser.finatradesId,
          amountGold: goldAmountToSend.toFixed(6),
          assetType: 'GOLD',
          channel: activeTab === 'qr_code' ? 'finatrades_id' : activeTab,
          memo: memo || null,
          paymentReason: paymentReason,
          sourceOfFunds: sourceOfFunds,
          goldWalletType: 'LGPW',
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Transfer failed');
      }
      
      const data = await res.json();
      setTransferRef(data.transfer.referenceNumber);
      setStep('success');
      toast.success("Transfer successful!");
      onConfirm(foundUser.email, numericAmount, 'USD');
    } catch (error: any) {
      toast.error(error.message || "Transfer failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('search');
    onClose();
  };

  const goldEquivalent = numericAmount > 0 ? (numericAmount / currentGoldPrice).toFixed(4) : '0.0000';

  const searchContent = (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setFoundUser(null); setSearchError(''); setIdentifier(''); }}>
        <TabsList className={`grid w-full grid-cols-3 bg-muted border border-border ${isMobile ? 'h-12' : ''}`}>
          <TabsTrigger value="email" className={`text-xs ${isMobile ? 'h-10' : ''}`}>
            <Mail className="w-3 h-3 mr-1" />
            Email
          </TabsTrigger>
          <TabsTrigger value="finatrades_id" className={`text-xs ${isMobile ? 'h-10' : ''}`}>
            <Hash className="w-3 h-3 mr-1" />
            Finatrades ID
          </TabsTrigger>
          <TabsTrigger value="qr_code" className={`text-xs ${isMobile ? 'h-10' : ''}`}>
            <QrCode className="w-3 h-3 mr-1" />
            QR Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Recipient Email</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="recipient@email.com" 
                  className={`bg-background border-input pl-9 ${isMobile ? 'h-14 rounded-xl text-base' : ''}`}
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setFoundUser(null); setSearchError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={() => handleSearch()} disabled={isSearching || !identifier.trim()} className={isMobile ? 'h-14 w-14 rounded-xl' : ''}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="finatrades_id" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Finatrades ID</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="FT12345678" 
                  className={`bg-background border-input pl-9 uppercase ${isMobile ? 'h-14 rounded-xl text-base' : ''}`}
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value.toUpperCase()); setFoundUser(null); setSearchError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={() => handleSearch()} disabled={isSearching || !identifier.trim()} className={isMobile ? 'h-14 w-14 rounded-xl' : ''}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="qr_code" className="space-y-4 mt-4">
          <QRScanner 
            onScan={handleQRScan} 
            isActive={isOpen && activeTab === 'qr_code'}
          />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Or enter Finatrades ID from QR</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="FT12345678" 
                className={`bg-background border-input uppercase ${isMobile ? 'h-14 rounded-xl text-base' : ''}`}
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value.toUpperCase()); setFoundUser(null); setSearchError(''); }}
                data-testid="input-qr-finatrades-id"
              />
              <Button onClick={() => handleSearch()} disabled={isSearching || !identifier.trim()} data-testid="button-search-qr-id" className={isMobile ? 'h-14 w-14 rounded-xl' : ''}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {searchError && (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {searchError}
        </div>
      )}

      {notFoundEmail && !inviteSent && (
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-300 flex-shrink-0">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">New User</p>
                <p className="text-xs text-muted-foreground truncate">{notFoundEmail}</p>
              </div>
              <Mail className="w-4 h-4 text-purple-500" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Amount <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Bal: ${availableGoldValueUsd.toFixed(2)}</span>
                <div className="flex bg-gray-100 rounded-md p-0.5">
                  <button type="button" onClick={() => { setInputMode('usd'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'usd' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>USD</button>
                  <button type="button" onClick={() => { setInputMode('grams'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'grams' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>Grams</button>
                </div>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{inputMode === 'usd' ? '$' : 'g'}</span>
              <Input 
                type="number" 
                placeholder={inputMode === 'usd' ? '0.00' : '0.0000'}
                step={inputMode === 'usd' ? '0.01' : '0.0001'}
                className={`bg-background pl-7 font-medium ${numericAmount > availableGoldValueUsd ? 'border-red-500' : 'border-input'} ${isMobile ? 'h-14 rounded-xl text-base' : ''}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                data-testid="input-invite-amount"
              />
              <Button 
                size="sm" 
                variant="ghost" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 text-xs text-primary px-2"
                onClick={() => setInputValue(inputMode === 'usd' ? availableGoldValueUsd.toFixed(2) : goldBalance.toFixed(4))}
              >
                MAX
              </Button>
            </div>
            {numericInput > 0 && (
              <p className="text-xs text-purple-600">{inputMode === 'usd' ? `≈ ${gramsAmount.toFixed(4)}g` : `≈ $${numericAmount.toFixed(2)}`}</p>
            )}
            {numericAmount > availableGoldValueUsd && (
              <p className="text-xs text-red-500">Insufficient funds</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Payment Reason <span className="text-red-500">*</span></Label>
            <Select value={paymentReason} onValueChange={setPaymentReason}>
              <SelectTrigger className={`bg-background border-input text-xs ${isMobile ? 'h-14 rounded-xl' : 'h-9'}`} data-testid="select-invite-payment-reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason} className="text-xs">
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Source of Funds <span className="text-red-500">*</span></Label>
            <Select value={sourceOfFunds} onValueChange={setSourceOfFunds}>
              <SelectTrigger className={`bg-background border-input text-xs ${isMobile ? 'h-14 rounded-xl' : 'h-9'}`} data-testid="select-invite-source-of-funds">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OF_FUNDS.map((source) => (
                  <SelectItem key={source} value={source} className="text-xs">
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Note (Optional)</Label>
            <Input 
              placeholder="What's this for?" 
              className={`bg-background border-input text-sm ${isMobile ? 'h-14 rounded-xl text-base' : 'h-9'}`}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              data-testid="input-invite-memo"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Attach Invoice (Optional)</Label>
            <div className="relative">
              {!invoiceFile ? (
                <label className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors ${isMobile ? 'rounded-xl' : ''}`}>
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Attach PDF or Image</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleInvoiceChange}
                    className="hidden"
                    data-testid="input-invite-invoice-file"
                  />
                </label>
              ) : (
                <div className={`flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg ${isMobile ? 'rounded-xl' : ''}`}>
                  {invoicePreview ? (
                    <img src={invoicePreview} alt="Invoice preview" className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{invoiceFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(invoiceFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeInvoice}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Max 5MB. Accepted: PDF, PNG, JPG</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-700 text-sm mb-3">Transfer Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium text-xs truncate max-w-[140px]">{notFoundEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-purple-700">${numericAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gold:</span>
                <span className="font-medium">{(numericAmount / currentGoldPrice).toFixed(4)}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-purple-600 font-medium">Pending Claim</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-700 text-xs">24-Hour Window</p>
                <p className="text-amber-600 text-xs mt-0.5">
                  Gold debited now. Refunded if unclaimed.
                </p>
              </div>
            </div>
          </div>

          {termsContent?.enabled && (
            <div className="flex items-start gap-2">
              <Checkbox 
                id="invite-terms-mobile" 
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                data-testid="checkbox-invite-terms"
                className="mt-0.5"
              />
              <Label htmlFor="invite-terms-mobile" className="text-xs text-muted-foreground cursor-pointer leading-tight">
                I agree to the terms and conditions for this transfer
              </Label>
            </div>
          )}
        </div>
      )}

      {inviteSent && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-green-700 text-lg">Gold Sent!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {(numericAmount / currentGoldPrice).toFixed(4)}g (${numericAmount.toFixed(2)}) sent to
            </p>
            <p className="font-medium text-foreground">{notFoundEmail}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-center">
            <p className="text-amber-700">
              They have <strong>24 hours</strong> to register and claim. If unclaimed, gold refunds automatically.
            </p>
          </div>
        </div>
      )}

      {foundUser && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-green-300">
                {foundUser.profilePhotoUrl && (
                  <AvatarImage src={foundUser.profilePhotoUrl} alt={`${foundUser.firstName} ${foundUser.lastName}`} />
                )}
                <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                  {foundUser.firstName[0]}{foundUser.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{foundUser.firstName} {foundUser.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{foundUser.email}</p>
                <p className="text-xs text-green-600 font-mono">{foundUser.finatradesId}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Amount <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Bal: ${availableGoldValueUsd.toFixed(2)}</span>
                <div className="flex bg-gray-100 rounded-md p-0.5">
                  <button type="button" onClick={() => { setInputMode('usd'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'usd' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>USD</button>
                  <button type="button" onClick={() => { setInputMode('grams'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'grams' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>Grams</button>
                </div>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{inputMode === 'usd' ? '$' : 'g'}</span>
              <Input 
                type="number" 
                placeholder={inputMode === 'usd' ? '0.00' : '0.0000'}
                step={inputMode === 'usd' ? '0.01' : '0.0001'}
                className={`bg-background pl-8 font-medium ${numericAmount > availableGoldValueUsd ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'} ${isMobile ? 'h-14 rounded-xl text-base' : 'text-lg'}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Button 
                size="sm" 
                variant="ghost" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs text-primary"
                onClick={() => setInputValue(inputMode === 'usd' ? availableGoldValueUsd.toFixed(2) : goldBalance.toFixed(4))}
              >
                MAX
              </Button>
            </div>
            {numericInput > 0 && (
              <p className="text-xs text-purple-600">{inputMode === 'usd' ? `≈ ${gramsAmount.toFixed(4)}g` : `≈ $${numericAmount.toFixed(2)}`}</p>
            )}
            {numericAmount > availableGoldValueUsd && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Insufficient funds. Your gold balance is ${availableGoldValueUsd.toFixed(2)} ({goldBalance.toFixed(4)}g)</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Reason <span className="text-red-500">*</span></Label>
            <Select value={paymentReason} onValueChange={setPaymentReason}>
              <SelectTrigger className={`bg-background border-input ${isMobile ? 'h-14 rounded-xl' : ''}`} data-testid="select-payment-reason">
                <SelectValue placeholder="Select payment reason" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason} data-testid={`option-reason-${reason.replace(/\s/g, '-').toLowerCase()}`}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Source of Funds <span className="text-red-500">*</span></Label>
            <Select value={sourceOfFunds} onValueChange={setSourceOfFunds}>
              <SelectTrigger className={`bg-background border-input ${isMobile ? 'h-14 rounded-xl' : ''}`} data-testid="select-source-of-funds">
                <SelectValue placeholder="Select source of funds" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OF_FUNDS.map((source) => (
                  <SelectItem key={source} value={source} data-testid={`option-source-${source.replace(/\s/g, '-').toLowerCase()}`}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Note (Optional)</Label>
            <Textarea 
              placeholder="What's this for?" 
              className={`bg-background border-input resize-none ${isMobile ? 'rounded-xl' : 'h-16'}`}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Attach Invoice (Optional)</Label>
            <div className="relative">
              {!invoiceFile ? (
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Attach PDF or Image</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleInvoiceChange}
                    className="hidden"
                    data-testid="input-invoice-file"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg">
                  {invoicePreview ? (
                    <img src={invoicePreview} alt="Invoice preview" className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{invoiceFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(invoiceFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeInvoice}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                    data-testid="button-remove-invoice"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Max 5MB. Accepted: PDF, PNG, JPG</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-purple-700 font-semibold">
              <Send className="w-4 h-4" />
              <span>Send Summary</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                <span className="text-muted-foreground">Send Amount:</span>
                <span className="font-semibold text-foreground">${numericAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                <span className="text-muted-foreground">Transaction Fee:</span>
                <span className="font-semibold text-green-600">$0.00</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                <span className="text-muted-foreground font-medium">Recipient Receives:</span>
                <span className="font-bold text-foreground">${numericAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Gold Equivalent:</span>
                <span className="font-bold text-primary">{goldEquivalent}g</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded-md">
              Based on current gold price: ${currentGoldPrice.toFixed(2)}/gram
            </div>
          </div>

          {termsContent?.enabled && (
            <div className="border border-border rounded-lg p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="transfer-terms-mobile"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5"
                  data-testid="checkbox-transfer-terms"
                />
                <div className="flex-1">
                  <label htmlFor="transfer-terms-mobile" className="text-sm font-medium cursor-pointer flex items-center gap-2">
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
      )}
    </div>
  );

  const confirmContent = foundUser && (
    <div className="space-y-6 py-4">
      <div className="bg-muted/30 p-6 rounded-xl border border-border text-center space-y-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm uppercase tracking-wider">Sending To</p>
          <div className="flex items-center justify-center gap-3">
            <Avatar className="w-12 h-12 border border-border">
              {foundUser.profilePhotoUrl && (
                <AvatarImage src={foundUser.profilePhotoUrl} alt={`${foundUser.firstName} ${foundUser.lastName}`} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {foundUser.firstName[0]}{foundUser.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-semibold">{foundUser.firstName} {foundUser.lastName}</p>
              <p className="text-xs text-muted-foreground font-mono">{foundUser.finatradesId}</p>
            </div>
          </div>
        </div>
        
        <div>
          <p className="text-4xl font-bold text-primary">${numericAmount.toFixed(2)}</p>
          {memo && <p className="text-muted-foreground text-sm mt-2">"{memo}"</p>}
        </div>

        <div className="border-t border-border pt-3 text-left text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Reason:</span>
            <span className="font-medium" data-testid="text-confirm-payment-reason">{paymentReason}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Source of Funds:</span>
            <span className="font-medium" data-testid="text-confirm-source-of-funds">{sourceOfFunds}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const successContent = foundUser && (
    <div className="space-y-6 py-4 text-center">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
      </div>
      
      <div>
        <p className="text-2xl font-bold text-foreground">Transfer Complete!</p>
        <p className="text-muted-foreground mt-1">
          ${numericAmount.toFixed(2)} sent to {foundUser.firstName}
        </p>
      </div>

      <div className="bg-muted/30 p-4 rounded-lg text-sm">
        <p className="text-muted-foreground">Reference Number</p>
        <p className="font-mono font-bold text-foreground">{transferRef}</p>
      </div>
    </div>
  );

  const getMobileFooterButton = () => {
    if (step === 'search') {
      if (inviteSent) {
        return (
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="flex-1 h-14 rounded-xl"
              onClick={() => {
                setNotFoundEmail('');
                setInviteSent(false);
                setIdentifier('');
                setInputValue('');
                setPaymentReason('');
                setSourceOfFunds('');
                setMemo('');
              }}
              data-testid="button-try-another"
            >
              Send More
            </Button>
            <Button 
              className="flex-1 h-14 rounded-xl bg-primary"
              onClick={handleClose}
              data-testid="button-done-invite"
            >
              Done
            </Button>
          </div>
        );
      }
      if (notFoundEmail && !inviteSent) {
        return (
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="flex-1 h-14 rounded-xl"
              onClick={() => {
                setNotFoundEmail('');
                setIdentifier('');
                setInputValue('');
                setPaymentReason('');
                setSourceOfFunds('');
                setMemo('');
              }}
              data-testid="button-cancel-invite"
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 h-14 rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSendInvitation}
              disabled={
                isSendingInvite || 
                numericAmount <= 0 || 
                numericAmount > availableGoldValueUsd ||
                !paymentReason ||
                !sourceOfFunds ||
                (termsContent?.enabled && !termsAccepted)
              }
              data-testid="button-send-invitation-transfer"
            >
              {isSendingInvite ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Send Gold
                </>
              )}
            </Button>
          </div>
        );
      }
      if (foundUser) {
        return (
          <Button 
            className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
            disabled={numericAmount <= 0 || numericAmount > availableGoldValueUsd || !paymentReason || !sourceOfFunds || (termsContent?.enabled && !termsAccepted)}
            onClick={() => setStep('confirm')}
          >
            Continue to Review
          </Button>
        );
      }
      return null;
    }
    if (step === 'confirm') {
      return (
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-14 rounded-xl" onClick={() => setStep('search')}>
            Back
          </Button>
          <Button 
            className="flex-1 h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
            disabled={isLoading}
            onClick={handleConfirmSend}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
            Send Now
          </Button>
        </div>
      );
    }
    if (step === 'success') {
      return (
        <Button className="w-full h-14 rounded-xl" onClick={handleClose}>
          Done
        </Button>
      );
    }
    return null;
  };

  if (isMobile) {
    return (
      <>
        <MobileFullScreenPage
          isOpen={isOpen}
          onClose={handleClose}
          title="Send Gold"
          subtitle="Transfer gold to another user"
          headerColor="purple"
          footer={getMobileFooterButton()}
        >
          <div className="p-4">
            {step === 'search' && searchContent}
            {step === 'confirm' && confirmContent}
            {step === 'success' && successContent}
          </div>
        </MobileFullScreenPage>
        {TransactionPinPromptComponent}
      </>
    );
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`bg-white border-border text-foreground w-[95vw] max-h-[85vh] overflow-y-auto ${foundUser && step === 'search' ? 'max-w-2xl' : 'max-w-md'}`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <span>Send Funds</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 'search' && "Send funds instantly to any Finatrades user via Email, ID, or QR Code"}
            {step === 'confirm' && "Review and confirm your transfer"}
            {step === 'success' && "Transfer completed successfully"}
          </DialogDescription>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-4 py-2">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setFoundUser(null); setSearchError(''); setIdentifier(''); }}>
              <TabsList className="grid w-full grid-cols-3 bg-muted border border-border">
                <TabsTrigger value="email" className="text-xs">
                  <Mail className="w-3 h-3 mr-1" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="finatrades_id" className="text-xs">
                  <Hash className="w-3 h-3 mr-1" />
                  Finatrades ID
                </TabsTrigger>
                <TabsTrigger value="qr_code" className="text-xs">
                  <QrCode className="w-3 h-3 mr-1" />
                  QR Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="recipient@email.com" 
                        className="bg-background border-input pl-9"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setFoundUser(null); setSearchError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <Button onClick={() => handleSearch()} disabled={isSearching || !identifier.trim()}>
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="finatrades_id" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Finatrades ID</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="FT12345678" 
                        className="bg-background border-input pl-9 uppercase"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value.toUpperCase()); setFoundUser(null); setSearchError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <Button onClick={() => handleSearch()} disabled={isSearching || !identifier.trim()}>
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="qr_code" className="space-y-4 mt-4">
                <QRScanner 
                  onScan={handleQRScan} 
                  isActive={isOpen && activeTab === 'qr_code'}
                />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Or enter Finatrades ID from QR</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="FT12345678" 
                      className="bg-background border-input uppercase"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value.toUpperCase()); setFoundUser(null); setSearchError(''); }}
                      data-testid="input-qr-finatrades-id"
                    />
                    <Button onClick={() => handleSearch()} disabled={isSearching || !identifier.trim()} data-testid="button-search-qr-id">
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {searchError && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {searchError}
              </div>
            )}

            {notFoundEmail && !inviteSent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Panel - Form */}
                <div className="space-y-3">
                  {/* Recipient Info */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-300 flex-shrink-0">
                        <UserPlus className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">New User</p>
                        <p className="text-xs text-muted-foreground truncate">{notFoundEmail}</p>
                      </div>
                      <Mail className="w-4 h-4 text-purple-500" />
                    </div>
                  </div>

                  {/* Amount Input with Toggle */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Amount <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Bal: ${availableGoldValueUsd.toFixed(2)}</span>
                        <div className="flex bg-gray-100 rounded-md p-0.5">
                          <button type="button" onClick={() => { setInputMode('usd'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'usd' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>USD</button>
                          <button type="button" onClick={() => { setInputMode('grams'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'grams' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>Grams</button>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{inputMode === 'usd' ? '$' : 'g'}</span>
                      <Input 
                        type="number" 
                        placeholder={inputMode === 'usd' ? '0.00' : '0.0000'}
                        step={inputMode === 'usd' ? '0.01' : '0.0001'}
                        className={`bg-background pl-7 font-medium ${numericAmount > availableGoldValueUsd ? 'border-red-500' : 'border-input'}`}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        data-testid="input-invite-amount"
                      />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 text-xs text-primary px-2"
                        onClick={() => setInputValue(inputMode === 'usd' ? availableGoldValueUsd.toFixed(2) : goldBalance.toFixed(4))}
                      >
                        MAX
                      </Button>
                    </div>
                    {numericInput > 0 && (
                      <p className="text-xs text-purple-600">{inputMode === 'usd' ? `≈ ${gramsAmount.toFixed(4)}g` : `≈ $${numericAmount.toFixed(2)}`}</p>
                    )}
                    {numericAmount > availableGoldValueUsd && (
                      <p className="text-xs text-red-500">Insufficient funds</p>
                    )}
                  </div>

                  {/* Payment Reason */}
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Reason <span className="text-red-500">*</span></Label>
                    <Select value={paymentReason} onValueChange={setPaymentReason}>
                      <SelectTrigger className="bg-background border-input h-9 text-xs" data-testid="select-invite-payment-reason">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason} className="text-xs">
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Source of Funds */}
                  <div className="space-y-1">
                    <Label className="text-xs">Source of Funds <span className="text-red-500">*</span></Label>
                    <Select value={sourceOfFunds} onValueChange={setSourceOfFunds}>
                      <SelectTrigger className="bg-background border-input h-9 text-xs" data-testid="select-invite-source-of-funds">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OF_FUNDS.map((source) => (
                          <SelectItem key={source} value={source} className="text-xs">
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Note */}
                  <div className="space-y-1">
                    <Label className="text-xs">Note (Optional)</Label>
                    <Input 
                      placeholder="What's this for?" 
                      className="bg-background border-input h-9 text-sm"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      data-testid="input-invite-memo"
                    />
                  </div>
                </div>

                {/* Right Panel - Summary */}
                <div className="space-y-3">
                  {/* Summary Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-700 text-sm mb-3">Transfer Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To:</span>
                        <span className="font-medium text-xs truncate max-w-[140px]">{notFoundEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-bold text-purple-700">${numericAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gold:</span>
                        <span className="font-medium">{(numericAmount / currentGoldPrice).toFixed(4)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="text-purple-600 font-medium">Pending Claim</span>
                      </div>
                    </div>
                  </div>

                  {/* 24h Notice */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-700 text-xs">24-Hour Window</p>
                        <p className="text-amber-600 text-xs mt-0.5">
                          Gold debited now. Refunded if unclaimed.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terms */}
                  {termsContent?.enabled && (
                    <div className="flex items-start gap-2">
                      <Checkbox 
                        id="invite-terms" 
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                        data-testid="checkbox-invite-terms"
                        className="mt-0.5"
                      />
                      <Label htmlFor="invite-terms" className="text-xs text-muted-foreground cursor-pointer leading-tight">
                        I agree to the terms and conditions for this transfer
                      </Label>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setNotFoundEmail('');
                        setIdentifier('');
                        setInputValue('');
                        setPaymentReason('');
                        setSourceOfFunds('');
                        setMemo('');
                      }}
                      data-testid="button-cancel-invite"
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={handleSendInvitation}
                      disabled={
                        isSendingInvite || 
                        numericAmount <= 0 || 
                        numericAmount > availableGoldValueUsd ||
                        !paymentReason ||
                        !sourceOfFunds ||
                        (termsContent?.enabled && !termsAccepted)
                      }
                      data-testid="button-send-invitation-transfer"
                    >
                      {isSendingInvite ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Send Gold
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {inviteSent && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-700 text-lg">Gold Sent!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(numericAmount / currentGoldPrice).toFixed(4)}g (${numericAmount.toFixed(2)}) sent to
                  </p>
                  <p className="font-medium text-foreground">{notFoundEmail}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-center">
                  <p className="text-amber-700">
                    They have <strong>24 hours</strong> to register and claim. If unclaimed, gold refunds automatically.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setNotFoundEmail('');
                      setInviteSent(false);
                      setIdentifier('');
                      setInputValue('');
                      setPaymentReason('');
                      setSourceOfFunds('');
                      setMemo('');
                    }}
                    data-testid="button-try-another"
                  >
                    Send More
                  </Button>
                  <Button 
                    className="flex-1 bg-primary"
                    onClick={handleClose}
                    data-testid="button-done-invite"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}

            {foundUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Panel - Recipient & Payment Details */}
                <div className="space-y-4">
                  {/* Recipient Info */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-green-300">
                        {foundUser.profilePhotoUrl && (
                          <AvatarImage src={foundUser.profilePhotoUrl} alt={`${foundUser.firstName} ${foundUser.lastName}`} />
                        )}
                        <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                          {foundUser.firstName[0]}{foundUser.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{foundUser.firstName} {foundUser.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{foundUser.email}</p>
                        <p className="text-xs text-green-600 font-mono">{foundUser.finatradesId}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    </div>
                  </div>
                  {/* Amount Input with Toggle */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Amount <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Bal: ${availableGoldValueUsd.toFixed(2)}</span>
                        <div className="flex bg-gray-100 rounded-md p-0.5">
                          <button type="button" onClick={() => { setInputMode('usd'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'usd' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>USD</button>
                          <button type="button" onClick={() => { setInputMode('grams'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'grams' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>Grams</button>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{inputMode === 'usd' ? '$' : 'g'}</span>
                      <Input 
                        type="number" 
                        placeholder={inputMode === 'usd' ? '0.00' : '0.0000'}
                        step={inputMode === 'usd' ? '0.01' : '0.0001'}
                        className={`bg-background pl-8 text-lg font-medium ${numericAmount > availableGoldValueUsd ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'}`}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs text-primary"
                        onClick={() => setInputValue(inputMode === 'usd' ? availableGoldValueUsd.toFixed(2) : goldBalance.toFixed(4))}
                      >
                        MAX
                      </Button>
                    </div>
                    {numericInput > 0 && (
                      <p className="text-xs text-purple-600">{inputMode === 'usd' ? `≈ ${gramsAmount.toFixed(4)}g` : `≈ $${numericAmount.toFixed(2)}`}</p>
                    )}
                    {numericAmount > availableGoldValueUsd && (
                      <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-md">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Insufficient funds. Your gold balance is ${availableGoldValueUsd.toFixed(2)} ({goldBalance.toFixed(4)}g)</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Reason */}
                  <div className="space-y-2">
                    <Label>Payment Reason <span className="text-red-500">*</span></Label>
                    <Select value={paymentReason} onValueChange={setPaymentReason}>
                      <SelectTrigger className="bg-background border-input" data-testid="select-payment-reason">
                        <SelectValue placeholder="Select payment reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason} data-testid={`option-reason-${reason.replace(/\s/g, '-').toLowerCase()}`}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Source of Funds */}
                  <div className="space-y-2">
                    <Label>Source of Funds <span className="text-red-500">*</span></Label>
                    <Select value={sourceOfFunds} onValueChange={setSourceOfFunds}>
                      <SelectTrigger className="bg-background border-input" data-testid="select-source-of-funds">
                        <SelectValue placeholder="Select source of funds" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OF_FUNDS.map((source) => (
                          <SelectItem key={source} value={source} data-testid={`option-source-${source.replace(/\s/g, '-').toLowerCase()}`}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Note */}
                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Textarea 
                      placeholder="What's this for?" 
                      className="bg-background border-input resize-none h-16"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
                  </div>

                  {/* Invoice Attachment */}
                  <div className="space-y-2">
                    <Label>Attach Invoice (Optional)</Label>
                    <div className="relative">
                      {!invoiceFile ? (
                        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Attach PDF or Image</span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleInvoiceChange}
                            className="hidden"
                            data-testid="input-desktop-invoice-file"
                          />
                        </label>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg">
                          {invoicePreview ? (
                            <img src={invoicePreview} alt="Invoice preview" className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                              <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{invoiceFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(invoiceFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeInvoice}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                            data-testid="button-desktop-remove-invoice"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Max 5MB. Accepted: PDF, PNG, JPG</p>
                  </div>
                </div>

                {/* Right Panel - Send Summary */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 text-purple-700 font-semibold">
                      <Send className="w-4 h-4" />
                      <span>Send Summary</span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="text-muted-foreground">Send Amount:</span>
                        <span className="font-semibold text-foreground">${numericAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="text-muted-foreground">Transaction Fee:</span>
                        <span className="font-semibold text-green-600">$0.00</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="text-muted-foreground font-medium">Recipient Receives:</span>
                        <span className="font-bold text-foreground">${numericAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Gold Equivalent:</span>
                        <span className="font-bold text-primary">{goldEquivalent}g</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded-md">
                      Based on current gold price: ${currentGoldPrice.toFixed(2)}/gram
                    </div>
                  </div>

                  {/* Sending To Visual */}
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-10 h-10 border-2 border-primary">
                          {user?.profilePhoto && (
                            <AvatarImage src={user.profilePhoto} alt="You" />
                          )}
                          <AvatarFallback className="bg-primary text-white text-xs font-bold">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">You</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="h-px flex-1 bg-border"></div>
                        <ArrowRight className="w-5 h-5 text-primary mx-2" />
                        <div className="h-px flex-1 bg-border"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{foundUser.firstName}</span>
                        <Avatar className="w-10 h-10 border-2 border-green-500">
                          {foundUser.profilePhotoUrl && (
                            <AvatarImage src={foundUser.profilePhotoUrl} alt={foundUser.firstName} />
                          )}
                          <AvatarFallback className="bg-green-100 text-green-700 text-xs font-bold">
                            {foundUser.firstName[0]}{foundUser.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions Checkbox */}
                  {termsContent?.enabled && (
                    <div className="border border-border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          id="transfer-terms"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                          className="mt-0.5"
                          data-testid="checkbox-transfer-terms"
                        />
                        <div className="flex-1">
                          <label htmlFor="transfer-terms" className="text-sm font-medium cursor-pointer flex items-center gap-2">
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

                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
                    disabled={numericAmount <= 0 || numericAmount > availableGoldValueUsd || !paymentReason || !sourceOfFunds || (termsContent?.enabled && !termsAccepted)}
                    onClick={() => setStep('confirm')}
                  >
                    Continue to Review
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && foundUser && (
          <div className="space-y-6 py-4">
            <div className="bg-muted/30 p-6 rounded-xl border border-border text-center space-y-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm uppercase tracking-wider">Sending To</p>
                <div className="flex items-center justify-center gap-3">
                  <Avatar className="w-12 h-12 border border-border">
                    {foundUser.profilePhotoUrl && (
                      <AvatarImage src={foundUser.profilePhotoUrl} alt={`${foundUser.firstName} ${foundUser.lastName}`} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {foundUser.firstName[0]}{foundUser.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-semibold">{foundUser.firstName} {foundUser.lastName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{foundUser.finatradesId}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-4xl font-bold text-primary">${numericAmount.toFixed(2)}</p>
                {memo && <p className="text-muted-foreground text-sm mt-2">"{memo}"</p>}
              </div>

              <div className="border-t border-border pt-3 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Reason:</span>
                  <span className="font-medium" data-testid="text-confirm-payment-reason">{paymentReason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source of Funds:</span>
                  <span className="font-medium" data-testid="text-confirm-source-of-funds">{sourceOfFunds}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('search')}>
                Back
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold"
                disabled={isLoading}
                onClick={handleConfirmSend}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                Send Now
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && foundUser && (
          <div className="space-y-6 py-4 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-foreground">Transfer Complete!</p>
              <p className="text-muted-foreground mt-1">
                ${numericAmount.toFixed(2)} sent to {foundUser.firstName}
              </p>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg text-sm">
              <p className="text-muted-foreground">Reference Number</p>
              <p className="font-mono font-bold text-foreground">{transferRef}</p>
            </div>

            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    {TransactionPinPromptComponent}
  </>
  );
}
