import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, QrCode, Scan, User, Search, CheckCircle2, AlertCircle, Mail, Hash, UserPlus, ExternalLink, ArrowRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import QRScanner from '../QRScanner';

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
  const [amount, setAmount] = useState('');
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
      setAmount('');
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
    }
  }, [isOpen]);

  const numericAmount = parseFloat(amount) || 0;

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
    if (!notFoundEmail || !user) return;
    
    setIsSendingInvite(true);
    
    try {
      const res = await apiRequest('POST', '/api/users/check-and-invite', {
        email: notFoundEmail,
        senderName: `${user.firstName} ${user.lastName}`,
        amount: amount || '0',
        type: 'send'
      });
      
      const data = await res.json();
      
      if (data.invitationSent) {
        setInviteSent(true);
        toast.success(`Invitation sent to ${notFoundEmail}!`);
      } else {
        toast.error(data.message || 'Failed to send invitation');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
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
    
    setIsLoading(true);
    
    try {
      const goldAmountToSend = numericAmount / currentGoldPrice;
      const res = await apiRequest('POST', '/api/finapay/send', {
        senderId: user.id,
        recipientIdentifier: activeTab === 'email' ? foundUser.email : foundUser.finatradesId,
        amountGold: goldAmountToSend.toFixed(6),
        assetType: 'GOLD',
        channel: activeTab === 'qr_code' ? 'finatrades_id' : activeTab,
        memo: memo || null,
        paymentReason: paymentReason,
        sourceOfFunds: sourceOfFunds,
      });
      
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

  return (
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
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-purple-700">
                  <UserPlus className="w-5 h-5" />
                  <span className="font-medium">User not on Finatrades yet</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>{notFoundEmail}</strong> is not registered on Finatrades. 
                  Send them an invitation to join so they can receive funds from you!
                </p>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={handleSendInvitation}
                  disabled={isSendingInvite}
                  data-testid="button-send-invitation"
                >
                  {isSendingInvite ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation to Join Finatrades
                    </>
                  )}
                </Button>
              </div>
            )}

            {inviteSent && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Invitation Sent!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  We've sent an email to <strong>{notFoundEmail}</strong> inviting them to join Finatrades. 
                  Once they register, you'll be able to send funds to them.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setNotFoundEmail('');
                      setInviteSent(false);
                      setIdentifier('');
                    }}
                    data-testid="button-try-another"
                  >
                    Try Another Email
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
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

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Amount (USD) <span className="text-red-500">*</span></Label>
                      <span className="text-xs text-muted-foreground">Balance: ${availableGoldValueUsd.toFixed(2)} ({goldBalance.toFixed(4)}g)</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className={`bg-background pl-8 text-lg font-medium ${numericAmount > availableGoldValueUsd ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'}`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs text-primary"
                        onClick={() => setAmount(availableGoldValueUsd.toFixed(2))}
                      >
                        MAX
                      </Button>
                    </div>
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

                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
                    disabled={numericAmount <= 0 || numericAmount > availableGoldValueUsd || !paymentReason || !sourceOfFunds}
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
  );
}
