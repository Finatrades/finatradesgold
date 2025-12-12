import React, { useState, useEffect } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Package, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, 
  Search, RefreshCw, Loader2, Eye, FileText, Building, Bitcoin, AlertCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';

interface DepositRequest {
  id: number;
  userId: number;
  referenceNumber: string;
  vaultLocation: string;
  depositType: string;
  totalDeclaredWeightGrams: string;
  items: any[];
  deliveryMethod: string;
  pickupDetails: any;
  documents: any[];
  status: string;
  vaultInternalReference: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

interface WithdrawalRequest {
  id: number;
  userId: number;
  referenceNumber: string;
  goldGrams: string;
  goldPriceUsdPerGram: string;
  withdrawalMethod: 'Bank Transfer' | 'Crypto';
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  iban: string | null;
  swiftCode: string | null;
  bankCountry: string | null;
  cryptoNetwork: string | null;
  cryptoCurrency: string | null;
  walletAddress: string | null;
  notes: string | null;
  status: string;
  processedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

export default function FinaVaultManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('deposits');
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [vaultReference, setVaultReference] = useState('');
  const [verifiedWeight, setVerifiedWeight] = useState('');
  const [goldPrice, setGoldPrice] = useState('85.22');
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [depositsRes, withdrawalsRes] = await Promise.all([
        apiRequest('GET', '/api/admin/vault/deposits'),
        apiRequest('GET', '/api/admin/vault/withdrawals')
      ]);
      
      const depositsData = await depositsRes.json();
      const withdrawalsData = await withdrawalsRes.json();
      
      setDeposits(depositsData.requests || []);
      setWithdrawals(withdrawalsData.requests || []);
    } catch (err) {
      toast.error('Failed to fetch vault data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveDeposit = async () => {
    if (!selectedDeposit) return;
    
    const weightToUse = verifiedWeight ? parseFloat(verifiedWeight) : parseFloat(selectedDeposit.totalDeclaredWeightGrams);
    const priceToUse = parseFloat(goldPrice) || 85.22;
    
    if (weightToUse <= 0) {
      toast.error('Valid verified weight is required');
      return;
    }
    
    setProcessingId(selectedDeposit.id);
    try {
      await apiRequest('PATCH', `/api/admin/vault/deposit/${selectedDeposit.id}`, {
        status: 'Stored',
        verifiedWeightGrams: weightToUse,
        goldPriceUsdPerGram: priceToUse,
        adminNotes,
        adminId: user?.id
      });
      
      toast.success('Deposit approved successfully. Certificate issued and FinaPay credited.');
      resetDepositForm();
      fetchData();
    } catch (err) {
      toast.error('Failed to approve deposit');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDeposit = async () => {
    if (!selectedDeposit || !rejectionReason) {
      toast.error('Rejection reason is required');
      return;
    }
    
    setProcessingId(selectedDeposit.id);
    try {
      await apiRequest('PATCH', `/api/admin/vault/deposit/${selectedDeposit.id}`, {
        status: 'Rejected',
        rejectionReason,
        adminNotes,
        adminId: user?.id
      });
      
      toast.success('Deposit rejected');
      resetDepositForm();
      fetchData();
    } catch (err) {
      toast.error('Failed to reject deposit');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    
    setProcessingId(selectedWithdrawal.id);
    try {
      await apiRequest('PATCH', `/api/admin/vault/withdrawal/${selectedWithdrawal.id}`, {
        status: 'Completed',
        adminNotes,
        adminId: user?.id,
        processedAt: new Date().toISOString()
      });
      
      toast.success('Withdrawal approved. Funds will be disbursed.');
      resetWithdrawalForm();
      fetchData();
    } catch (err) {
      toast.error('Failed to approve withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!selectedWithdrawal || !rejectionReason) {
      toast.error('Rejection reason is required');
      return;
    }
    
    setProcessingId(selectedWithdrawal.id);
    try {
      await apiRequest('PATCH', `/api/admin/vault/withdrawal/${selectedWithdrawal.id}`, {
        status: 'Rejected',
        rejectionReason,
        adminNotes,
        adminId: user?.id
      });
      
      toast.success('Withdrawal rejected');
      resetWithdrawalForm();
      fetchData();
    } catch (err) {
      toast.error('Failed to reject withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const resetDepositForm = () => {
    setSelectedDeposit(null);
    setVaultReference('');
    setVerifiedWeight('');
    setGoldPrice('85.22');
    setAdminNotes('');
    setRejectionReason('');
  };

  const resetWithdrawalForm = () => {
    setSelectedWithdrawal(null);
    setAdminNotes('');
    setRejectionReason('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
      case 'Pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'In Review':
      case 'Processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200"><RefreshCw className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'Approved':
      case 'Completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'Rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingDeposits = deposits.filter(d => d.status === 'Submitted' || d.status === 'In Review');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending' || w.status === 'Processing');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">FinaVault Management</h1>
            <p className="text-muted-foreground">Manage vault deposits and withdrawal requests</p>
          </div>
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Deposits</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingDeposits.length}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <ArrowDownCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                  <p className="text-2xl font-bold text-orange-600">{pendingWithdrawals.length}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <ArrowUpCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="text-2xl font-bold">{deposits.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                  <p className="text-2xl font-bold">{withdrawals.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="deposits" className="flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4" />
                Deposit Requests
                {pendingDeposits.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingDeposits.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4" />
                Withdrawal Requests
                {pendingWithdrawals.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingWithdrawals.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <TabsContent value="deposits" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : deposits.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No deposit requests found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Vault</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell className="font-mono text-sm">{deposit.referenceNumber}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{deposit.user?.firstName} {deposit.user?.lastName}</p>
                              <p className="text-xs text-muted-foreground">{deposit.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{deposit.vaultLocation}</TableCell>
                          <TableCell>{parseFloat(deposit.totalDeclaredWeightGrams).toFixed(3)}g</TableCell>
                          <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(deposit.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedDeposit(deposit)}
                            >
                              <Eye className="w-4 h-4 mr-1" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : withdrawals.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No withdrawal requests found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((withdrawal) => {
                        const usdValue = parseFloat(withdrawal.goldGrams) * parseFloat(withdrawal.goldPriceUsdPerGram);
                        return (
                          <TableRow key={withdrawal.id}>
                            <TableCell className="font-mono text-sm">{withdrawal.referenceNumber}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{withdrawal.user?.firstName} {withdrawal.user?.lastName}</p>
                                <p className="text-xs text-muted-foreground">{withdrawal.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{parseFloat(withdrawal.goldGrams).toFixed(3)}g</p>
                                <p className="text-xs text-muted-foreground">${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {withdrawal.withdrawalMethod === 'Bank Transfer' ? (
                                  <Building className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Bitcoin className="w-4 h-4 text-orange-600" />
                                )}
                                <span>{withdrawal.withdrawalMethod}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(withdrawal.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedWithdrawal(withdrawal)}
                              >
                                <Eye className="w-4 h-4 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Deposit Detail Dialog */}
        <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Deposit Request Details</DialogTitle>
            </DialogHeader>
            
            {selectedDeposit && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Reference Number</Label>
                    <p className="font-mono font-medium">{selectedDeposit.referenceNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedDeposit.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">User</Label>
                    <p className="font-medium">{selectedDeposit.user?.firstName} {selectedDeposit.user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{selectedDeposit.user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Submitted</Label>
                    <p>{new Date(selectedDeposit.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Vault Location</Label>
                    <p className="font-medium">{selectedDeposit.vaultLocation}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Deposit Type</Label>
                    <p>{selectedDeposit.depositType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Total Declared Weight</Label>
                    <p className="font-bold text-lg">{parseFloat(selectedDeposit.totalDeclaredWeightGrams).toFixed(3)}g</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Delivery Method</Label>
                    <p>{selectedDeposit.deliveryMethod}</p>
                  </div>
                </div>

                {selectedDeposit.items && selectedDeposit.items.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-muted-foreground text-xs">Deposit Items</Label>
                      <div className="mt-2 space-y-2">
                        {selectedDeposit.items.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 bg-muted/50 rounded-lg text-sm">
                            <div className="flex justify-between">
                              <span>{item.description || item.type}</span>
                              <span className="font-medium">{item.weight || item.grams}g</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedDeposit.status === 'Submitted' || selectedDeposit.status === 'In Review' ? (
                  <>
                    <Separator />
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Verification Section</p>
                      <p className="text-xs text-blue-600 mt-1">Confirm the actual weight after physical verification</p>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Verified Weight (grams)</Label>
                          <Input 
                            type="number"
                            step="0.001"
                            value={verifiedWeight}
                            onChange={(e) => setVerifiedWeight(e.target.value)}
                            placeholder={selectedDeposit.totalDeclaredWeightGrams}
                          />
                          <p className="text-xs text-muted-foreground">Leave blank to use declared weight: {parseFloat(selectedDeposit.totalDeclaredWeightGrams).toFixed(3)}g</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Gold Price (USD/g)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={goldPrice}
                            onChange={(e) => setGoldPrice(e.target.value)}
                            placeholder="85.22"
                          />
                          <p className="text-xs text-muted-foreground">Current market price per gram</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Admin Notes</Label>
                        <Textarea 
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Internal notes..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rejection Reason (if rejecting)</Label>
                        <Textarea 
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason for rejection..."
                          rows={2}
                        />
                      </div>
                    </div>
                    
                    <DialogFooter className="gap-2">
                      <Button 
                        variant="outline" 
                        onClick={resetDepositForm}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={handleRejectDeposit}
                        disabled={processingId === selectedDeposit.id || !rejectionReason}
                      >
                        Reject
                      </Button>
                      <Button 
                        onClick={handleApproveDeposit}
                        disabled={processingId === selectedDeposit.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingId === selectedDeposit.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 mr-2" /> Approve & Issue Certificate</>
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {selectedDeposit.status === 'Approved' && selectedDeposit.vaultInternalReference && (
                        <>Vault Reference: <span className="font-mono">{selectedDeposit.vaultInternalReference}</span></>
                      )}
                      {selectedDeposit.status === 'Rejected' && selectedDeposit.rejectionReason && (
                        <>Rejection Reason: {selectedDeposit.rejectionReason}</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Withdrawal Detail Dialog */}
        <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Withdrawal Request Details</DialogTitle>
            </DialogHeader>
            
            {selectedWithdrawal && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Reference Number</Label>
                    <p className="font-mono font-medium">{selectedWithdrawal.referenceNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedWithdrawal.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">User</Label>
                    <p className="font-medium">{selectedWithdrawal.user?.firstName} {selectedWithdrawal.user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{selectedWithdrawal.user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Submitted</Label>
                    <p>{new Date(selectedWithdrawal.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <Separator />

                <div className="p-4 bg-secondary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Withdrawal Amount</p>
                      <p className="text-2xl font-bold">{parseFloat(selectedWithdrawal.goldGrams).toFixed(3)}g</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">USD Value</p>
                      <p className="text-xl font-bold text-secondary">
                        ${(parseFloat(selectedWithdrawal.goldGrams) * parseFloat(selectedWithdrawal.goldPriceUsdPerGram)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Withdrawal Method</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedWithdrawal.withdrawalMethod === 'Bank Transfer' ? (
                      <Building className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Bitcoin className="w-5 h-5 text-orange-600" />
                    )}
                    <span className="font-medium">{selectedWithdrawal.withdrawalMethod}</span>
                  </div>
                </div>

                {selectedWithdrawal.withdrawalMethod === 'Bank Transfer' ? (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="font-medium text-sm">Bank Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Bank:</span>
                      <span>{selectedWithdrawal.bankName}</span>
                      <span className="text-muted-foreground">Account Name:</span>
                      <span>{selectedWithdrawal.accountName}</span>
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-mono">{selectedWithdrawal.accountNumber}</span>
                      {selectedWithdrawal.iban && (
                        <>
                          <span className="text-muted-foreground">IBAN:</span>
                          <span className="font-mono">{selectedWithdrawal.iban}</span>
                        </>
                      )}
                      {selectedWithdrawal.swiftCode && (
                        <>
                          <span className="text-muted-foreground">SWIFT:</span>
                          <span className="font-mono">{selectedWithdrawal.swiftCode}</span>
                        </>
                      )}
                      {selectedWithdrawal.bankCountry && (
                        <>
                          <span className="text-muted-foreground">Country:</span>
                          <span>{selectedWithdrawal.bankCountry}</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="font-medium text-sm">Crypto Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Network:</span>
                      <span>{selectedWithdrawal.cryptoNetwork}</span>
                      <span className="text-muted-foreground">Currency:</span>
                      <span>{selectedWithdrawal.cryptoCurrency}</span>
                      <span className="text-muted-foreground">Wallet:</span>
                      <span className="font-mono text-xs break-all">{selectedWithdrawal.walletAddress}</span>
                    </div>
                  </div>
                )}

                {selectedWithdrawal.notes && (
                  <div>
                    <Label className="text-muted-foreground text-xs">User Notes</Label>
                    <p className="mt-1 text-sm">{selectedWithdrawal.notes}</p>
                  </div>
                )}

                {(selectedWithdrawal.status === 'Pending' || selectedWithdrawal.status === 'Processing') ? (
                  <>
                    <Separator />
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex gap-2 items-start">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium">Review Required</p>
                          <p className="mt-1">Verify the payout details carefully before approving. Funds will be disbursed to the destination specified above.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Admin Notes</Label>
                        <Textarea 
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Internal notes..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rejection Reason (if rejecting)</Label>
                        <Textarea 
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason for rejection..."
                          rows={2}
                        />
                      </div>
                    </div>
                    
                    <DialogFooter className="gap-2">
                      <Button 
                        variant="outline" 
                        onClick={resetWithdrawalForm}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={handleRejectWithdrawal}
                        disabled={processingId === selectedWithdrawal.id || !rejectionReason}
                      >
                        Reject
                      </Button>
                      <Button 
                        onClick={handleApproveWithdrawal}
                        disabled={processingId === selectedWithdrawal.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingId === selectedWithdrawal.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 mr-2" /> Approve & Disburse</>
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {selectedWithdrawal.status === 'Completed' && selectedWithdrawal.processedAt && (
                        <>Processed on: {new Date(selectedWithdrawal.processedAt).toLocaleString()}</>
                      )}
                      {selectedWithdrawal.status === 'Rejected' && selectedWithdrawal.adminNotes && (
                        <>Rejection Notes: {selectedWithdrawal.adminNotes}</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
