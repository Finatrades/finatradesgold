import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useFinaPay } from '@/context/FinaPayContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, ArrowUpRight, ArrowDownLeft, Wallet, ShieldCheck, Lock, CreditCard, RefreshCw, Send, Download, PlusCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function FinaPayDashboard() {
  const { wallet: rawWallet, transactions, currentGoldPriceUsdPerGram, goldPriceHistory, createTransaction, refreshWallet, loading } = useFinaPay();

  // Compute wallet values from API data
  const goldGrams = rawWallet ? parseFloat(rawWallet.goldGrams as string) || 0 : 0;
  const usdBalance = rawWallet ? parseFloat(rawWallet.usdBalance as string) || 0 : 0;
  
  // Computed wallet properties for UI
  const wallet = {
    goldBalanceGrams: goldGrams,
    availableGoldGrams: goldGrams, // All gold is available for now
    lockedForBnslGrams: 0,
    lockedForTradeGrams: 0,
    goldValueUsd: goldGrams * currentGoldPriceUsdPerGram,
    goldValueAed: goldGrams * currentGoldPriceUsdPerGram * 3.67, // USD to AED
    tier: goldGrams >= 100 ? 'Platinum' : goldGrams >= 50 ? 'Gold' : goldGrams >= 10 ? 'Silver' : 'Bronze',
    usdBalance,
  };

  // Default limits
  const limits = {
    dailySendGoldGrams: 100,
    remainingSendGoldGramsToday: 100,
  };

  // Helper functions for transaction handling
  const addTransaction = (tx: any) => {
    createTransaction(tx);
  };

  const updateWallet = (updates: any) => {
    // Wallet updates happen via API, just refresh
    refreshWallet();
  };

  // Modal States
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [bnslOpen, setBnslOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);

  // Form States
  const [buyAmountUsd, setBuyAmountUsd] = useState('');
  const [sellGrams, setSellGrams] = useState('');
  const [sendGrams, setSendGrams] = useState('');
  const [recipient, setRecipient] = useState('');
  const [requestGrams, setRequestGrams] = useState('');
  const [bnslGrams, setBnslGrams] = useState('');
  const [tradeGrams, setTradeGrams] = useState('');

  // --- Handlers ---

  const handleBuyGold = () => {
    const usd = parseFloat(buyAmountUsd);
    if (!usd || usd <= 0) return;

    const grams = usd / currentGoldPriceUsdPerGram;
    
    addTransaction({
      type: 'Buy',
      amountUsd: usd.toFixed(2),
      amountGold: grams.toFixed(6),
      description: 'Purchase via Card'
    });

    // Wallet update happens only after admin approval - do not update locally

    setBuyOpen(false);
    setBuyAmountUsd('');
    toast.success(`Buy order for ${grams.toFixed(4)}g Gold submitted for admin approval`);
  };

  const handleSellGold = () => {
    const grams = parseFloat(sellGrams);
    if (!grams || grams <= 0 || grams > wallet.availableGoldGrams) {
        toast.error('Invalid amount or insufficient balance');
        return;
    }

    const usd = grams * currentGoldPriceUsdPerGram;

    addTransaction({
      type: 'Sell',
      amountUsd: usd.toFixed(2),
      amountGold: grams.toFixed(6),
      description: 'Sell to Bank Account'
    });

    // Wallet update happens only after admin approval - do not update locally

    setSellOpen(false);
    setSellGrams('');
    toast.success(`Sell order for ${grams.toFixed(4)}g Gold submitted for admin approval`);
  };

  const handleSendGold = () => {
    const grams = parseFloat(sendGrams);
    if (!grams || grams <= 0 || grams > wallet.availableGoldGrams) {
        toast.error('Invalid amount or insufficient balance');
        return;
    }

    addTransaction({
      type: 'Send',
      amountGold: grams.toFixed(6),
      amountUsd: (grams * currentGoldPriceUsdPerGram).toFixed(2),
      recipientEmail: recipient,
      description: 'Internal Transfer'
    });

    // Wallet update happens only after admin approval - do not update locally

    setSendOpen(false);
    setSendGrams('');
    setRecipient('');
    toast.success(`Send request for ${grams.toFixed(4)}g to ${recipient} submitted for admin approval`);
  };

  const handleRequestGold = () => {
    const grams = parseFloat(requestGrams);
    if (!grams || grams <= 0) return;

    addTransaction({
       type: 'Receive',
       amountGold: grams.toFixed(6),
       amountUsd: (grams * currentGoldPriceUsdPerGram).toFixed(2),
       counterparty: recipient,
       description: 'Request Sent'
    });

    setRequestOpen(false);
    setRequestGrams('');
    setRecipient('');
    toast.success('Request submitted for admin approval');
  };

  const handleMoveToBnsl = () => {
    const grams = parseFloat(bnslGrams);
    if (!grams || grams <= 0 || grams > wallet.availableGoldGrams) {
       toast.error('Insufficient available balance');
       return;
    }

    addTransaction({
       type: 'Deposit',
       amountGold: grams.toFixed(6),
       amountUsd: (grams * currentGoldPriceUsdPerGram).toFixed(2),
       description: 'Locked for BNSL Plan'
    });

    // Wallet update happens only after admin approval

    setBnslOpen(false);
    setBnslGrams('');
    toast.success(`BNSL deposit of ${grams.toFixed(4)}g submitted for admin approval`);
  };

  const handleMoveToTrade = () => {
    const grams = parseFloat(tradeGrams);
    if (!grams || grams <= 0 || grams > wallet.availableGoldGrams) {
       toast.error('Insufficient available balance');
       return;
    }

    addTransaction({
       type: 'Deposit',
       amountGold: grams.toFixed(6),
       amountUsd: (grams * currentGoldPriceUsdPerGram).toFixed(2),
       description: 'Locked for Trade Settlement'
    });

    // Wallet update happens only after admin approval

    setTradeOpen(false);
    setTradeGrams('');
    toast.success(`Trade deposit of ${grams.toFixed(4)}g submitted for admin approval`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FinaPay – Digital Gold Wallet</h1>
          <p className="text-gray-500">View your gold balance, valuations and move value across Finatrades.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
           <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg col-span-1 md:col-span-2">
             <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2 opacity-90">
                   <Wallet className="w-5 h-5" />
                   <span className="text-sm font-medium">Total Gold Balance</span>
                </div>
                <h2 className="text-4xl font-bold mb-1">{wallet.goldBalanceGrams.toFixed(4)} g</h2>
                <p className="opacity-80 text-sm">Reflected from FinaVault Ledger</p>
                <div className="mt-6 flex gap-4">
                   <div>
                      <p className="text-xs opacity-70 uppercase">USD Value</p>
                      <p className="font-bold text-xl">${wallet.goldValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                   </div>
                   <div className="border-l border-white/20 pl-4">
                      <p className="text-xs opacity-70 uppercase">AED Value</p>
                      <p className="font-bold text-xl">AED {wallet.goldValueAed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                   </div>
                </div>
             </CardContent>
           </Card>

           <Card className="bg-white col-span-1 md:col-span-2">
              <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-gray-500">Liquidity Status</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="flex items-center justify-between mb-4">
                    <div>
                       <p className="text-2xl font-bold text-green-600">{wallet.availableGoldGrams.toFixed(2)} g</p>
                       <p className="text-xs text-gray-500">Available</p>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-bold text-amber-600">{(wallet.lockedForBnslGrams + wallet.lockedForTradeGrams).toFixed(2)} g</p>
                       <p className="text-xs text-gray-500">Locked (BNSL + Trade)</p>
                    </div>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                    <div className="bg-green-500 h-2.5" style={{ width: `${(wallet.availableGoldGrams / wallet.goldBalanceGrams) * 100}%` }}></div>
                    <div className="bg-amber-500 h-2.5" style={{ width: `${((wallet.lockedForBnslGrams + wallet.lockedForTradeGrams) / wallet.goldBalanceGrams) * 100}%` }}></div>
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-gray-900 text-white col-span-1">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                 <div>
                    <div className="flex justify-between items-start">
                       <ShieldCheck className="w-8 h-8 text-amber-400 mb-2" />
                       <Badge variant="outline" className="text-amber-400 border-amber-400">{wallet.tier}</Badge>
                    </div>
                    <p className="font-bold text-lg mt-2">Tier Status</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-400 mb-1">Daily Send Limit</p>
                    <p className="font-mono text-sm">{limits.remainingSendGoldGramsToday}g / {limits.dailySendGoldGrams}g left</p>
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left Column: Chart & Actions */}
           <div className="lg:col-span-2 space-y-8">
              {/* Chart */}
              <Card>
                 <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                       <CardTitle>Live Gold Price (USD/g)</CardTitle>
                       <CardDescription>Real-time market data from LBMA feed.</CardDescription>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-bold text-amber-600">${currentGoldPriceUsdPerGram.toFixed(2)}</p>
                       <p className="text-xs text-green-600 flex items-center justify-end"><TrendingUp className="w-3 h-3 mr-1" /> +1.2%</p>
                    </div>
                 </CardHeader>
                 <CardContent>
                    <div className="h-[250px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={goldPriceHistory}>
                             <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#D1A954" stopOpacity={0.3}/>
                                   <stop offset="95%" stopColor="#D1A954" stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <XAxis dataKey="timestamp" hide />
                             <YAxis domain={['auto', 'auto']} hide />
                             <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#D1A954' }}
                                labelFormatter={() => ''}
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                             />
                             <Area type="monotone" dataKey="priceUsd" stroke="#D1A954" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </CardContent>
              </Card>

              {/* Quick Actions */}
              <div>
                 <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-amber-500 hover:text-amber-600 transition-all" onClick={() => setBuyOpen(true)}>
                       <PlusCircle className="w-8 h-8" />
                       Buy Gold
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-amber-500 hover:text-amber-600 transition-all" onClick={() => setSellOpen(true)}>
                       <Download className="w-8 h-8" />
                       Sell Gold
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-amber-500 hover:text-amber-600 transition-all" onClick={() => setSendOpen(true)}>
                       <Send className="w-8 h-8" />
                       Send Gold
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-amber-500 hover:text-amber-600 transition-all" onClick={() => setRequestOpen(true)}>
                       <ArrowDownLeft className="w-8 h-8" />
                       Request
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-blue-500 hover:text-blue-600 transition-all" onClick={() => setBnslOpen(true)}>
                       <Lock className="w-8 h-8" />
                       Move to BNSL
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-purple-500 hover:text-purple-600 transition-all" onClick={() => setTradeOpen(true)}>
                       <RefreshCw className="w-8 h-8" />
                       Trade Finance
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-gray-500 hover:text-gray-900 transition-all">
                       <CreditCard className="w-8 h-8" />
                       Top Up Card
                    </Button>
                 </div>
              </div>
           </div>

           {/* Right Column: Transactions */}
           <div className="lg:col-span-1">
              <Card className="h-full">
                 <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="space-y-4">
                       {transactions.slice(0, 8).map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-gray-50 rounded transition-colors">
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
                                   <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className={`font-bold text-sm ${
                                   tx.type === 'Buy' || tx.type === 'Receive' || tx.type === 'Deposit' ? 'text-green-600' : 'text-gray-900'
                                }`}>
                                   {tx.amountGold ? parseFloat(tx.amountGold).toFixed(4) : '0.00'} g
                                </p>
                                <p className="text-xs text-gray-400">
                                   {tx.status}
                                </p>
                             </div>
                          </div>
                       ))}
                       {transactions.length === 0 && (
                          <div className="text-center py-8 text-gray-500 text-sm">No transactions yet.</div>
                       )}
                    </div>
                 </CardContent>
              </Card>
           </div>
        </div>

        {/* --- MODALS --- */}

        {/* Buy Gold Modal */}
        <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
           <DialogContent>
              <DialogHeader>
                 <DialogTitle>Buy Gold</DialogTitle>
                 <DialogDescription>Convert fiat to vaulted gold instantly.</DialogDescription>
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
                    <Input 
                       type="number" 
                       placeholder="0.00" 
                       value={buyAmountUsd} 
                       onChange={(e) => setBuyAmountUsd(e.target.value)} 
                    />
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

        {/* Sell Gold Modal */}
        <Dialog open={sellOpen} onOpenChange={setSellOpen}>
           <DialogContent>
              <DialogHeader>
                 <DialogTitle>Sell Gold</DialogTitle>
                 <DialogDescription>Liquify your gold holdings to fiat.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <Label>Payout Method</Label>
                    <Select defaultValue="bank">
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="card">Card Refund</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label>Amount (Grams)</Label>
                    <Input 
                       type="number" 
                       placeholder="0.00" 
                       value={sellGrams} 
                       onChange={(e) => setSellGrams(e.target.value)} 
                    />
                    <p className="text-xs text-gray-500">Available: {wallet.availableGoldGrams.toFixed(4)} g</p>
                 </div>
                 {sellGrams && (
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800">
                       <div className="flex justify-between mb-1">
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

        {/* Send Gold Modal */}
        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
           <DialogContent>
              <DialogHeader>
                 <DialogTitle>Send Gold</DialogTitle>
                 <DialogDescription>Transfer gold to another FinaPay wallet.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <Label>Recipient (Wallet ID or Email)</Label>
                    <Input placeholder="Enter wallet ID..." value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <Label>Amount (Grams)</Label>
                    <Input type="number" placeholder="0.00" value={sendGrams} onChange={(e) => setSendGrams(e.target.value)} />
                 </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
                 <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSendGold}>Send Now</Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

        {/* Request Gold Modal */}
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
           <DialogContent>
              <DialogHeader>
                 <DialogTitle>Request Gold</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <Label>From (Wallet ID or Email)</Label>
                    <Input placeholder="Enter identifier..." value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <Label>Amount (Grams)</Label>
                    <Input type="number" placeholder="0.00" value={requestGrams} onChange={(e) => setRequestGrams(e.target.value)} />
                 </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
                 <Button onClick={handleRequestGold}>Send Request</Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

        {/* Move to BNSL Modal */}
        <Dialog open={bnslOpen} onOpenChange={setBnslOpen}>
           <DialogContent>
              <DialogHeader>
                 <DialogTitle>Move to BNSL</DialogTitle>
                 <DialogDescription>Lock gold in a Buy Now Sell Later plan.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <Label>Amount to Lock (Grams)</Label>
                    <Input type="number" placeholder="0.00" value={bnslGrams} onChange={(e) => setBnslGrams(e.target.value)} />
                 </div>
                 <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex gap-2">
                    <Lock className="w-4 h-4 mt-0.5" />
                    <p>These funds will be moved to your BNSL wallet and locked according to the plan terms.</p>
                 </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setBnslOpen(false)}>Cancel</Button>
                 <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleMoveToBnsl}>Confirm Lock</Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

         {/* Move to Trade Modal */}
         <Dialog open={tradeOpen} onOpenChange={setTradeOpen}>
           <DialogContent>
              <DialogHeader>
                 <DialogTitle>Move to Trade Finance</DialogTitle>
                 <DialogDescription>Fund your trade wallet for settlement.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <Label>Amount to Transfer (Grams)</Label>
                    <Input type="number" placeholder="0.00" value={tradeGrams} onChange={(e) => setTradeGrams(e.target.value)} />
                 </div>
                 <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-800 flex gap-2">
                    <RefreshCw className="w-4 h-4 mt-0.5" />
                    <p>Funds will be transferred to FinaBridge wallet and may be locked for active trade cases.</p>
                 </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setTradeOpen(false)}>Cancel</Button>
                 <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleMoveToTrade}>Transfer Funds</Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
