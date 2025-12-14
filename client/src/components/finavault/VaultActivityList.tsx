import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw, Search, TrendingUp, ArrowUpRight, ArrowDownLeft, Send, Coins, Award, Eye, Printer, Share2, FileText, X, ShieldCheck, Box, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

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
  const [viewingCerts, setViewingCerts] = useState<{
    id: string;
    certificateNumber: string;
    type: string;
    status: string;
    goldGrams: string;
  }[] | null>(null);
  const [certTab, setCertTab] = useState('ownership');

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async (certs: typeof viewingCerts) => {
    if (!certs || certs.length === 0) return;
    const cert = certs[0];
    const shareText = `Finatrades Gold Certificate\nGold Amount: ${parseFloat(cert.goldGrams).toFixed(4)}g\nCertificate #: ${cert.certificateNumber}\nStatus: ${cert.status}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Gold Certificate`,
          text: shareText,
        });
      } catch (err) {
        navigator.clipboard.writeText(shareText);
        alert('Certificate details copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Certificate details copied to clipboard!');
    }
  };

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
      case 'Receive': return 'bg-orange-100 text-orange-700';
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
                            setViewingCerts(selectedTx?.certificates || []);
                          }}
                          data-testid={`button-view-cert-${cert.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Certificates
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

      {/* Certificate Viewing Modal - Both Certificates with Tabs */}
      <Dialog open={!!viewingCerts && viewingCerts.length > 0} onOpenChange={() => setViewingCerts(null)}>
        <DialogContent className="max-w-4xl bg-[#0D0515] border-white/10 p-0 overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Tabs for switching certificates */}
          <div className="bg-black/40 border-b border-white/10 p-4 flex justify-center sticky top-0 z-20">
            <Tabs value={certTab} onValueChange={setCertTab} className="w-full max-w-md">
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger value="ownership" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
                  <Award className="w-4 h-4 mr-2" />
                  Digital Ownership
                </TabsTrigger>
                <TabsTrigger value="storage" className="data-[state=active]:bg-[#C0C0C0] data-[state=active]:text-black">
                  <Box className="w-4 h-4 mr-2" />
                  Storage Certificate
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="overflow-y-auto p-4 md:p-8">
            {viewingCerts && viewingCerts.length > 0 && (() => {
              const ownershipCert = viewingCerts.find(c => c.type === 'Digital Ownership');
              const storageCert = viewingCerts.find(c => c.type === 'Physical Storage');
              const goldGrams = ownershipCert?.goldGrams || storageCert?.goldGrams || '0';
              const issueDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

              return (
                <>
                  {/* DIGITAL OWNERSHIP CERTIFICATE */}
                  {certTab === 'ownership' && (
                    <div className="relative p-8 md:p-12 border-8 border-double border-[#D4AF37]/30 m-2 bg-[#0D0515] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                      
                      {/* Watermark Background */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                        <Award className="w-96 h-96" />
                      </div>

                      {/* Header */}
                      <div className="text-center space-y-4 mb-12 relative z-10">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]">
                            <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
                          </div>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-serif text-[#D4AF37] tracking-wider uppercase">Certificate</h2>
                        <h3 className="text-lg md:text-xl text-white/80 font-serif tracking-widest uppercase">of Digital Ownership</h3>
                        <p className="text-white/40 text-sm font-mono mt-2">ID: {ownershipCert?.certificateNumber || 'N/A'}</p>
                      </div>

                      {/* Content */}
                      <div className="space-y-8 text-center relative z-10">
                        <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
                          This certifies that the holder is the beneficial owner of the following precious metal assets, securely stored and insured at <strong>Dubai - Wingold & Metals DMCC</strong>.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-[#D4AF37]/20 py-8 my-8">
                          <div>
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Asset Type</p>
                            <p className="text-xl font-bold text-white">Gold</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Total Weight</p>
                            <p className="text-xl font-bold text-white">{parseFloat(goldGrams).toFixed(4)}g</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Purity</p>
                            <p className="text-xl font-bold text-white">999.9</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Status</p>
                            <p className="text-xl font-bold text-white">{ownershipCert?.status || 'Active'}</p>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row justify-center items-center md:items-end px-8 md:px-16 mt-16 gap-8">
                          <div className="text-center">
                            <p className="text-white font-medium mb-2">{issueDate}</p>
                            <Separator className="bg-[#D4AF37]/40 w-48 mb-2 mx-auto" />
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider">Date of Issue</p>
                            <p className="text-10 text-white/40">Dubai - Wingold & Metals DMCC</p>
                          </div>
                        </div>

                        <div className="mt-8 text-[10px] text-white/30 text-justify leading-relaxed px-4 md:px-0">
                          <p>
                            This Gold Ownership Certificate is valid solely until the occurrence of the next transaction affecting the Holder's gold balance. Upon execution of any new purchase, sale, transfer, allocation, redemption, or adjustment, this Certificate shall automatically become null and void.
                          </p>
                        </div>
                      </div>
                      
                      {/* Footer Actions */}
                      <div className="mt-12 flex justify-center gap-4 relative z-10 print:hidden">
                        <Button className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                        <Button variant="outline" className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10" onClick={() => handleShare(viewingCerts)}>
                          <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STORAGE CERTIFICATE (WinGold Style) */}
                  {certTab === 'storage' && (
                    <div className="relative p-8 md:p-12 border-[1px] border-white/20 m-2 bg-white text-black shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                      
                      {/* Watermark Background */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none">
                        <Box className="w-96 h-96 text-black" />
                      </div>

                      {/* Header */}
                      <div className="flex justify-between items-start mb-12 relative z-10 border-b-2 border-black pb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-black text-white flex items-center justify-center">
                            <Box className="w-10 h-10" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight uppercase">WinGold & Metals Vault</h2>
                            <p className="text-xs text-black/60 font-mono tracking-widest uppercase">Secure Logistics & Storage</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <h3 className="text-xl font-bold uppercase tracking-widest text-black/80">Certificate of Deposit</h3>
                          <p className="text-sm font-mono mt-1">REF: {storageCert?.certificateNumber || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-6 text-left relative z-10 font-mono text-sm">
                        <div className="grid grid-cols-2 gap-8 mb-8">
                          <div>
                            <p className="text-xs uppercase text-black/50 mb-1">Depositor / Owner</p>
                            <p className="font-bold text-lg">FINATRADES CLIENT</p>
                            <p>Via FinaTrades Custody Account</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase text-black/50 mb-1">Storage Location</p>
                            <p className="font-bold text-lg">DUBAI DMCC VAULT</p>
                            <p>High Security Zone A-14</p>
                          </div>
                        </div>

                        <div className="border border-black p-0">
                          <table className="w-full text-left">
                            <thead className="bg-black text-white uppercase text-xs">
                              <tr>
                                <th className="p-3 border-r border-white/20">Description</th>
                                <th className="p-3 border-r border-white/20 text-right">Weight (g)</th>
                                <th className="p-3 text-right">Purity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black">
                              <tr>
                                <td className="p-3 border-r border-black">Gold - Allocated Storage</td>
                                <td className="p-3 border-r border-black text-right">{parseFloat(goldGrams).toFixed(6)}</td>
                                <td className="p-3 text-right">999.9</td>
                              </tr>
                              <tr className="bg-black/5 font-bold">
                                <td className="p-3 border-r border-black">TOTAL NET WEIGHT</td>
                                <td className="p-3 border-r border-black text-right">{parseFloat(goldGrams).toFixed(6)}</td>
                                <td className="p-3 text-right">Au</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="text-xs text-black/60 leading-relaxed mt-8 text-justify">
                          This certificate acknowledges the receipt and storage of the above-mentioned precious metals. The assets are held in a segregated account and are fully insured against all risks. Release of the assets is subject to the standard withdrawal procedures and fee settlement.
                        </div>

                        <div className="flex justify-between items-end mt-16 pt-8 border-t border-black/20">
                          <div>
                            <p className="font-bold uppercase">Vault Manager</p>
                            <p className="text-xs text-black/50">Authorized Officer</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{issueDate}</p>
                            <p className="text-xs text-black/50 uppercase">Date of Issue</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer Actions */}
                      <div className="mt-12 flex justify-center gap-4 relative z-10 print:hidden">
                        <Button className="bg-black text-white hover:bg-black/80 font-bold" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                        <Button variant="outline" className="border-black/20 text-black hover:bg-black/5" onClick={() => handleShare(viewingCerts)}>
                          <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
