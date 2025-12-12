import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw, Search, TrendingUp, ArrowUpRight, ArrowDownLeft, Send, Coins, Award, Eye, Download, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface VaultTransaction {
  id: string;
  type: 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Deposit' | 'Withdrawal';
  status: string;
  amountGold: string | null;
  amountUsd: string | null;
  goldPriceUsdPerGram: string | null;
  recipientEmail: string | null;
  senderEmail: string | null;
  description: string | null;
  createdAt: string;
  completedAt: string | null;
  certificates: {
    id: string;
    certificateNumber: string;
    type: string;
    status: string;
    goldGrams: string;
  }[];
}

interface VaultActivityData {
  transactions: VaultTransaction[];
  holdings: any[];
  certificates: any[];
  currentBalance: {
    goldGrams: string;
    usdBalance: string;
  };
}

export default function VaultActivityList() {
  const { user } = useAuth();
  const [data, setData] = useState<VaultActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTx, setSelectedTx] = useState<VaultTransaction | null>(null);

  const fetchActivity = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/vault/activity/${user.id}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch vault activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [user]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Buy': return <TrendingUp className="w-4 h-4" />;
      case 'Sell': return <ArrowUpRight className="w-4 h-4" />;
      case 'Send': return <Send className="w-4 h-4" />;
      case 'Receive': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Deposit': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Withdrawal': return <ArrowUpRight className="w-4 h-4" />;
      default: return <Coins className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Buy': return 'bg-green-100 text-green-700';
      case 'Sell': return 'bg-red-100 text-red-700';
      case 'Send': return 'bg-orange-100 text-orange-700';
      case 'Receive': return 'bg-purple-100 text-purple-700';
      case 'Deposit': return 'bg-emerald-100 text-emerald-700';
      case 'Withdrawal': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'Cancelled':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const transactions = data?.transactions || [];
  
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.senderEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <Card className="bg-white shadow-sm border border-border overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold">Vault Activity History</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-48"
                data-testid="input-search-vault"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36" data-testid="select-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
                <SelectItem value="Send">Send</SelectItem>
                <SelectItem value="Receive">Receive</SelectItem>
                <SelectItem value="Deposit">Deposit</SelectItem>
                <SelectItem value="Withdrawal">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" onClick={fetchActivity} data-testid="button-refresh-vault">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No vault activity found</p>
            <p className="text-sm">Transactions will appear here once you buy, sell, send, or receive gold.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setSelectedTx(tx)}
                data-testid={`row-vault-tx-${tx.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(tx.type)}`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tx.type}</span>
                      {tx.certificates.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30">
                          <Award className="w-3 h-3 mr-1" />
                          {tx.certificates.length} Cert
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tx.description || (tx.recipientEmail ? `To: ${tx.recipientEmail}` : tx.senderEmail ? `From: ${tx.senderEmail}` : new Date(tx.createdAt).toLocaleString())}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'Buy' || tx.type === 'Receive' || tx.type === 'Deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'Buy' || tx.type === 'Receive' || tx.type === 'Deposit' ? '+' : '-'}
                      {tx.amountGold ? parseFloat(tx.amountGold).toFixed(4) : '0'}g
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${tx.amountUsd ? parseFloat(tx.amountUsd).toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(tx.status)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-xs">{selectedTx.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <Badge className={getTypeColor(selectedTx.type)}>{selectedTx.type}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTx.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Gold Amount</p>
                  <p className="font-bold">{selectedTx.amountGold ? parseFloat(selectedTx.amountGold).toFixed(6) : '0'}g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">USD Value</p>
                  <p className="font-bold">${selectedTx.amountUsd ? parseFloat(selectedTx.amountUsd).toFixed(2) : '0.00'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gold Price</p>
                  <p>${selectedTx.goldPriceUsdPerGram ? parseFloat(selectedTx.goldPriceUsdPerGram).toFixed(2) : '0'}/g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(selectedTx.createdAt).toLocaleString()}</p>
                </div>
                {selectedTx.completedAt && (
                  <div>
                    <p className="text-muted-foreground">Completed</p>
                    <p>{new Date(selectedTx.completedAt).toLocaleString()}</p>
                  </div>
                )}
                {selectedTx.recipientEmail && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Recipient</p>
                    <p>{selectedTx.recipientEmail}</p>
                  </div>
                )}
                {selectedTx.senderEmail && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Sender</p>
                    <p>{selectedTx.senderEmail}</p>
                  </div>
                )}
                {selectedTx.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Description</p>
                    <p>{selectedTx.description}</p>
                  </div>
                )}
              </div>
              
              {selectedTx.certificates.length > 0 && (
                <div className="border-t pt-4">
                  <p className="font-medium mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#D4AF37]" />
                    Your Certificates
                  </p>
                  <div className="space-y-3">
                    {selectedTx.certificates.map((cert) => (
                      <div key={cert.id} className="p-4 bg-gradient-to-r from-[#D4AF37]/10 to-[#B8860B]/5 rounded-lg border border-[#D4AF37]/30" data-testid={`cert-card-${cert.id}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#D4AF37]" />
                            <div>
                              <p className="font-bold text-[#8B6914]">{cert.type}</p>
                              <p className="font-mono text-xs text-muted-foreground">{cert.certificateNumber}</p>
                            </div>
                          </div>
                          <Badge className={cert.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {cert.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <p className="text-muted-foreground text-xs">Gold Amount</p>
                            <p className="font-bold">{parseFloat(cert.goldGrams).toFixed(4)}g</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Issuer</p>
                            <p className="font-medium text-xs">{cert.type === 'Digital Ownership' ? 'Finatrades' : 'Wingold & Metals DMCC'}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/certificate/${cert.id}`, '_blank');
                          }}
                          data-testid={`button-view-cert-${cert.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Certificate
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
