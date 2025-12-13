import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useFinaPay } from '@/context/FinaPayContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Lock, TrendingUp, ShoppingCart, Send, ArrowDownLeft, Plus, ArrowUpRight, Coins, BarChart3, PlusCircle, RefreshCw, AlertCircle, QrCode, Copy, Download, Upload, Link2, FileText, Share2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export default function FinaPayDashboard() {
  const { wallet: rawWallet, transactions, currentGoldPriceUsdPerGram, createTransaction, refreshWallet, loading } = useFinaPay();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const goldGrams = rawWallet ? parseFloat(rawWallet.goldGrams as string) || 0 : 0;
  const usdBalance = rawWallet ? parseFloat(rawWallet.usdBalance as string) || 0 : 0;
  const goldValueUsd = goldGrams * currentGoldPriceUsdPerGram;
  const totalAvailableUsd = usdBalance + goldValueUsd;

  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const [buyAmountUsd, setBuyAmountUsd] = useState('');
  const [sellGrams, setSellGrams] = useState('');
  const [sendGrams, setSendGrams] = useState('');
  const [recipient, setRecipient] = useState('');
  const [requestGrams, setRequestGrams] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [sendInvoice, setSendInvoice] = useState<File | null>(null);
  const [requestInvoice, setRequestInvoice] = useState<File | null>(null);
  const [sendQrDataUrl, setSendQrDataUrl] = useState('');
  const [requestQrDataUrl, setRequestQrDataUrl] = useState('');
  const [sendLinkGenerated, setSendLinkGenerated] = useState(false);
  const [requestLinkGenerated, setRequestLinkGenerated] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);

  useEffect(() => {
    if (qrOpen && user) {
      const qrData = JSON.stringify({
        platform: 'Finatrades',
        type: 'wallet',
        email: user.email,
        finatradesId: user.finatradesId || user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      });
      QRCode.toDataURL(qrData, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then(setQrDataUrl)
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [qrOpen, user]);

  const handleCopyWalletId = () => {
    const walletId = user?.finatradesId || user?.email || '';
    navigator.clipboard.writeText(walletId);
    toast.success('Wallet ID copied to clipboard');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `finapay-qr-${user?.finatradesId || 'wallet'}.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success('QR code downloaded');
  };

  const generateRequestLink = () => {
    const grams = parseFloat(requestGrams);
    if (!grams || grams <= 0) {
      toast.error('Please enter amount first');
      return;
    }
    const baseUrl = window.location.origin;
    const requestData = {
      platform: 'Finatrades',
      type: 'request',
      from: user?.email,
      finatradesId: user?.finatradesId || user?.id,
      amount: grams,
      note: requestNote,
    };
    const encodedData = btoa(JSON.stringify(requestData));
    const shareLink = `${baseUrl}/pay?r=${encodedData}`;
    
    QRCode.toDataURL(shareLink, { width: 200, margin: 2 })
      .then(setRequestQrDataUrl)
      .catch(console.error);
    setRequestLinkGenerated(true);
  };

  const generateSendLink = () => {
    const grams = parseFloat(sendGrams);
    if (!grams || grams <= 0) {
      toast.error('Please enter amount first');
      return;
    }
    const baseUrl = window.location.origin;
    const sendData = {
      platform: 'Finatrades',
      type: 'send',
      to: recipient,
      from: user?.email,
      amount: grams,
      note: sendNote,
    };
    const encodedData = btoa(JSON.stringify(sendData));
    const shareLink = `${baseUrl}/pay?s=${encodedData}`;
    
    QRCode.toDataURL(shareLink, { width: 200, margin: 2 })
      .then(setSendQrDataUrl)
      .catch(console.error);
    setSendLinkGenerated(true);
  };

  const copyRequestLink = () => {
    const grams = parseFloat(requestGrams);
    if (!grams) return;
    const baseUrl = window.location.origin;
    const requestData = {
      platform: 'Finatrades',
      type: 'request',
      from: user?.email,
      finatradesId: user?.finatradesId || user?.id,
      amount: grams,
      note: requestNote,
    };
    const encodedData = btoa(JSON.stringify(requestData));
    const shareLink = `${baseUrl}/pay?r=${encodedData}`;
    navigator.clipboard.writeText(shareLink);
    toast.success('Request link copied to clipboard');
  };

  const copySendLink = () => {
    const grams = parseFloat(sendGrams);
    if (!grams || !recipient) return;
    const baseUrl = window.location.origin;
    const sendData = {
      platform: 'Finatrades',
      type: 'send',
      to: recipient,
      from: user?.email,
      amount: grams,
      note: sendNote,
    };
    const encodedData = btoa(JSON.stringify(sendData));
    const shareLink = `${baseUrl}/pay?s=${encodedData}`;
    navigator.clipboard.writeText(shareLink);
    toast.success('Send link copied to clipboard');
  };

  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'send' | 'request') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'send') {
        setSendInvoice(file);
      } else {
        setRequestInvoice(file);
      }
      toast.success(`Invoice "${file.name}" attached`);
    }
  };

  const handleBuyGold = () => {
    const usd = parseFloat(buyAmountUsd);
    if (!usd || usd <= 0) return;
    const grams = usd / currentGoldPriceUsdPerGram;
    createTransaction({
      type: 'Buy',
      amountUsd: usd.toFixed(2),
      amountGold: grams.toFixed(6),
      description: 'Purchase via Card'
    });
    setBuyOpen(false);
    setBuyAmountUsd('');
    toast.success(`Buy order for ${grams.toFixed(4)}g Gold submitted`);
  };

  const handleSellGold = () => {
    const grams = parseFloat(sellGrams);
    if (!grams || grams <= 0 || grams > goldGrams) {
      toast.error('Invalid amount or insufficient balance');
      return;
    }
    const usd = grams * currentGoldPriceUsdPerGram;
    createTransaction({
      type: 'Sell',
      amountUsd: usd.toFixed(2),
      amountGold: grams.toFixed(6),
      description: 'Sell to Bank Account'
    });
    setSellOpen(false);
    setSellGrams('');
    toast.success(`Sell order for ${grams.toFixed(4)}g Gold submitted`);
  };

  const handleSendGold = async () => {
    const grams = parseFloat(sendGrams);
    if (!grams || grams <= 0 || grams > goldGrams) {
      toast.error('Invalid amount or insufficient balance');
      return;
    }
    if (!recipient) {
      toast.error('Please enter recipient email');
      return;
    }
    
    setCheckingUser(true);
    try {
      const response = await fetch('/api/users/check-and-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: recipient, 
          senderName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email,
          amount: grams,
          type: 'send'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to validate recipient');
        return;
      }
      
      const data = await response.json();
      
      if (!data.userExists) {
        toast.info(`${recipient} is not a Finatrades user yet. An invitation has been sent!`);
      }
      
      createTransaction({
        type: 'Send',
        amountGold: grams.toFixed(6),
        amountUsd: (grams * currentGoldPriceUsdPerGram).toFixed(2),
        recipientEmail: recipient,
        description: sendNote || 'Internal Transfer'
      });
      
      setSendOpen(false);
      setSendGrams('');
      setRecipient('');
      setSendNote('');
      setSendInvoice(null);
      setSendQrDataUrl('');
      setSendLinkGenerated(false);
      toast.success(`Send request for ${grams.toFixed(4)}g submitted`);
    } catch (error) {
      toast.error('Failed to process request');
    } finally {
      setCheckingUser(false);
    }
  };

  const handleRequestGold = async () => {
    const grams = parseFloat(requestGrams);
    if (!grams || grams <= 0) {
      toast.error('Please enter amount');
      return;
    }
    if (!recipient) {
      toast.error('Please enter email address');
      return;
    }
    
    setCheckingUser(true);
    try {
      const response = await fetch('/api/users/check-and-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: recipient, 
          senderName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email,
          amount: grams,
          type: 'request'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to validate recipient');
        return;
      }
      
      const data = await response.json();
      
      if (!data.userExists) {
        toast.info(`${recipient} is not a Finatrades user yet. An invitation has been sent!`);
      }
      
      createTransaction({
        type: 'Receive',
        amountGold: grams.toFixed(6),
        amountUsd: (grams * currentGoldPriceUsdPerGram).toFixed(2),
        counterparty: recipient,
        description: requestNote || 'Request Sent'
      });
      
      setRequestOpen(false);
      setRequestGrams('');
      setRecipient('');
      setRequestNote('');
      setRequestInvoice(null);
      setRequestQrDataUrl('');
      setRequestLinkGenerated(false);
      toast.success('Request submitted');
    } catch (error) {
      toast.error('Failed to process request');
    } finally {
      setCheckingUser(false);
    }
  };

  const handleRefresh = () => {
    refreshWallet();
    toast.success('Refreshing wallet data...');
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        
        {/* FinaPay Wallet Card */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">FinaPay Wallet</h2>
            </div>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setDepositOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Deposit Funds
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
              <div className="absolute right-2 bottom-2 opacity-5">
                <Wallet className="w-20 h-20 text-amber-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Balance</p>
                <p className="text-3xl font-bold text-foreground mb-1">
                  ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">{goldGrams.toFixed(3)} g</p>
                <p className="text-xs text-muted-foreground mt-3">Funds available for trading and transfers.</p>
              </div>
            </div>

            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
              <div className="absolute right-2 bottom-2 opacity-5">
                <Lock className="w-20 h-20 text-amber-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked Assets</p>
                <p className="text-3xl font-bold text-amber-500 mb-1">$0.00</p>
                <p className="text-sm text-amber-500/70">0.000 g</p>
                <p className="text-xs text-muted-foreground mt-3">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Assets locked in active plans and trades.
                </p>
              </div>
            </div>

            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
              <div className="absolute right-2 bottom-2 opacity-5">
                <TrendingUp className="w-20 h-20 text-amber-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Wallet Value</p>
                <p className="text-3xl font-bold text-amber-500 mb-1">
                  ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">{goldGrams.toFixed(3)} g Total</p>
              </div>
            </div>

          </div>

          <div className="mt-4 text-center">
            <button onClick={handleRefresh} className="text-sm text-amber-600 hover:text-amber-700 hover:underline">
              {loading ? 'Refreshing...' : 'Refresh Balance'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() => setBuyOpen(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
            data-testid="button-buy"
          >
            <div className="p-3 bg-green-100 rounded-full">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium">Buy Gold</span>
          </button>

          <button
            onClick={() => setSellOpen(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
            data-testid="button-sell"
          >
            <div className="p-3 bg-orange-100 rounded-full">
              <Coins className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium">Sell Gold</span>
          </button>

          <button
            onClick={() => setSendOpen(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
            data-testid="button-send"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium">Send</span>
          </button>

          <button
            onClick={() => setRequestOpen(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
            data-testid="button-request"
          >
            <div className="p-3 bg-purple-100 rounded-full">
              <ArrowDownLeft className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium">Request</span>
          </button>

          <button
            onClick={() => setQrOpen(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
            data-testid="button-qrcode"
          >
            <div className="p-3 bg-amber-100 rounded-full">
              <QrCode className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium">QR Code</span>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={() => setDepositOpen(true)} className="px-4 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors">
            <Plus className="w-4 h-4 inline mr-1" /> Deposit USD
          </button>
          <button className="px-4 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors">
            <ArrowUpRight className="w-4 h-4 inline mr-1" /> Withdraw
          </button>
          <button onClick={() => setLocation('/bnsl')} className="px-4 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors">
            <TrendingUp className="w-4 h-4 inline mr-1" /> BNSL Plans
          </button>
          <button onClick={() => setLocation('/finabridge')} className="px-4 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors">
            <BarChart3 className="w-4 h-4 inline mr-1" /> Trade Finance
          </button>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Recent Transactions</h3>
            <Link href="/finapay/transactions">
              <span className="text-sm text-amber-600 hover:underline cursor-pointer">View All</span>
            </Link>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h4 className="text-lg font-semibold mb-2">No Transactions Yet</h4>
              <p className="text-muted-foreground mb-4">Your transaction history will appear here.</p>
              <Button onClick={() => setBuyOpen(true)} className="bg-amber-500 hover:bg-amber-600">
                Make Your First Purchase
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.type === 'Buy' || tx.type === 'Receive' || tx.type === 'Deposit' ? 'bg-green-100 text-green-600' :
                      tx.type === 'Sell' || tx.type === 'Send' || tx.type === 'Withdrawal' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {tx.type === 'Buy' || tx.type === 'Deposit' ? <PlusCircle className="w-4 h-4" /> : 
                       tx.type === 'Send' || tx.type === 'Sell' ? <ArrowUpRight className="w-4 h-4" /> : 
                       <RefreshCw className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${
                      tx.type === 'Buy' || tx.type === 'Receive' || tx.type === 'Deposit' ? 'text-green-600' : 'text-foreground'
                    }`}>
                      {tx.amountGold ? parseFloat(tx.amountGold).toFixed(4) : '0.00'} g
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buy Gold</DialogTitle>
              <DialogDescription>Convert fiat to vaulted gold.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Funding Method</Label>
                <Select defaultValue="card">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
                <Input type="number" placeholder="0.00" value={buyAmountUsd} onChange={(e) => setBuyAmountUsd(e.target.value)} />
              </div>
              {buyAmountUsd && (
                <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-800">
                  <div className="flex justify-between mb-1">
                    <span>Est. Gold:</span>
                    <span className="font-bold">{(parseFloat(buyAmountUsd) / currentGoldPriceUsdPerGram).toFixed(4)} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span>${currentGoldPriceUsdPerGram.toFixed(2)} / g</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBuyOpen(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleBuyGold}>Confirm Purchase</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={sellOpen} onOpenChange={setSellOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sell Gold</DialogTitle>
              <DialogDescription>Convert gold to fiat.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Amount (Grams)</Label>
                <Input type="number" placeholder="0.00" value={sellGrams} onChange={(e) => setSellGrams(e.target.value)} />
                <p className="text-xs text-muted-foreground">Available: {goldGrams.toFixed(4)} g</p>
              </div>
              {sellGrams && (
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span>Est. Payout:</span>
                    <span className="font-bold">${(parseFloat(sellGrams) * currentGoldPriceUsdPerGram).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSellOpen(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSellGold}>Confirm Sell</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={sendOpen} onOpenChange={(open) => {
          setSendOpen(open);
          if (!open) {
            setSendGrams('');
            setRecipient('');
            setSendNote('');
            setSendInvoice(null);
            setSendQrDataUrl('');
            setSendLinkGenerated(false);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Gold</DialogTitle>
              <DialogDescription>Transfer gold to another wallet.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Recipient (Email)</Label>
                <Input placeholder="Enter email..." value={recipient} onChange={(e) => setRecipient(e.target.value)} data-testid="input-send-recipient" />
              </div>
              <div className="space-y-2">
                <Label>Amount (Grams)</Label>
                <Input type="number" placeholder="0.00" value={sendGrams} onChange={(e) => setSendGrams(e.target.value)} data-testid="input-send-amount" />
                <p className="text-xs text-muted-foreground">Available: {goldGrams.toFixed(4)} g</p>
              </div>
              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Input placeholder="Add a note..." value={sendNote} onChange={(e) => setSendNote(e.target.value)} data-testid="input-send-note" />
              </div>
              
              <div className="space-y-2">
                <Label>Attach Invoice (Optional)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors flex-1">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {sendInvoice ? sendInvoice.name : 'Upload invoice'}
                    </span>
                    <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleInvoiceUpload(e, 'send')} data-testid="input-send-invoice" />
                  </label>
                  {sendInvoice && (
                    <Button variant="ghost" size="sm" onClick={() => setSendInvoice(null)}>
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Share Link & QR Code</Label>
                  <Button variant="outline" size="sm" onClick={generateSendLink} disabled={!sendGrams || !recipient} data-testid="button-generate-send-link">
                    <QrCode className="w-4 h-4 mr-1" />
                    Generate
                  </Button>
                </div>
                
                {sendLinkGenerated && (
                  <div className="space-y-3">
                    {sendQrDataUrl && (
                      <div className="flex justify-center">
                        <div className="p-2 bg-white rounded-lg border border-border">
                          <img src={sendQrDataUrl} alt="Send QR Code" className="w-40 h-40" data-testid="img-send-qrcode" />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={copySendLink} data-testid="button-copy-send-link">
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Link
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                        if (navigator.share) {
                          navigator.share({ title: 'Send Gold', text: `Send ${sendGrams}g gold`, url: '' });
                        } else {
                          copySendLink();
                        }
                      }} data-testid="button-share-send">
                        <Share2 className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSendGold} disabled={checkingUser} data-testid="button-confirm-send">
                {checkingUser ? 'Processing...' : 'Send'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={requestOpen} onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) {
            setRequestGrams('');
            setRecipient('');
            setRequestNote('');
            setRequestInvoice(null);
            setRequestQrDataUrl('');
            setRequestLinkGenerated(false);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Gold</DialogTitle>
              <DialogDescription>Request gold from another user.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>From (Email)</Label>
                <Input placeholder="Enter email..." value={recipient} onChange={(e) => setRecipient(e.target.value)} data-testid="input-request-recipient" />
              </div>
              <div className="space-y-2">
                <Label>Amount (Grams)</Label>
                <Input type="number" placeholder="0.00" value={requestGrams} onChange={(e) => setRequestGrams(e.target.value)} data-testid="input-request-amount" />
              </div>
              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Input placeholder="Add a note..." value={requestNote} onChange={(e) => setRequestNote(e.target.value)} data-testid="input-request-note" />
              </div>
              
              <div className="space-y-2">
                <Label>Attach Invoice (Optional)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors flex-1">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {requestInvoice ? requestInvoice.name : 'Upload invoice'}
                    </span>
                    <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleInvoiceUpload(e, 'request')} data-testid="input-request-invoice" />
                  </label>
                  {requestInvoice && (
                    <Button variant="ghost" size="sm" onClick={() => setRequestInvoice(null)}>
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Share Link & QR Code</Label>
                  <Button variant="outline" size="sm" onClick={generateRequestLink} disabled={!requestGrams} data-testid="button-generate-request-link">
                    <QrCode className="w-4 h-4 mr-1" />
                    Generate
                  </Button>
                </div>
                
                {requestLinkGenerated && (
                  <div className="space-y-3">
                    {requestQrDataUrl && (
                      <div className="flex justify-center">
                        <div className="p-2 bg-white rounded-lg border border-border">
                          <img src={requestQrDataUrl} alt="Request QR Code" className="w-40 h-40" data-testid="img-request-qrcode" />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={copyRequestLink} data-testid="button-copy-request-link">
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Link
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                        if (navigator.share) {
                          navigator.share({ title: 'Request Gold', text: `Request ${requestGrams}g gold`, url: '' });
                        } else {
                          copyRequestLink();
                        }
                      }} data-testid="button-share-request">
                        <Share2 className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleRequestGold} disabled={checkingUser} data-testid="button-confirm-request">
                {checkingUser ? 'Processing...' : 'Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deposit Funds</DialogTitle>
              <DialogDescription>Add USD to your wallet.</DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center text-muted-foreground">
              <p>Contact support to deposit funds to your account.</p>
              <p className="text-sm mt-2">Email: support@finatrades.com</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepositOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">Your Wallet QR Code</DialogTitle>
              <DialogDescription className="text-center">
                Share this QR code to receive gold payments
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-6">
              {qrDataUrl ? (
                <div className="p-4 bg-white rounded-xl border border-border shadow-sm">
                  <img 
                    src={qrDataUrl} 
                    alt="Wallet QR Code" 
                    className="w-64 h-64"
                    data-testid="img-qrcode"
                  />
                </div>
              ) : (
                <div className="w-64 h-64 bg-muted rounded-xl flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-muted-foreground animate-pulse" />
                </div>
              )}
              
              <div className="mt-6 w-full space-y-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Wallet ID</p>
                  <p className="font-mono text-sm font-medium truncate" data-testid="text-wallet-id">
                    {user?.finatradesId || user?.email || 'Loading...'}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={handleCopyWalletId}
                    data-testid="button-copy-wallet-id"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy ID
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={handleDownloadQr}
                    data-testid="button-download-qr"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="w-full" onClick={() => setQrOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
