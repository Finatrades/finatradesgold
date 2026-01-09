import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  FileCheck,
  AlertTriangle,
  Coins,
  DollarSign,
  Building,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type TallyStatus = 'PENDING_PAYMENT' | 'PAYMENT_CONFIRMED' | 'PHYSICAL_ORDERED' | 'PHYSICAL_ALLOCATED' | 'CERT_RECEIVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
type DepositMethod = 'CARD' | 'BANK' | 'CRYPTO' | 'VAULT_GOLD';

interface UnifiedTallyTransaction {
  id: string;
  userId: string;
  walletType: 'MPGW' | 'FPGW';
  depositMethod: DepositMethod;
  status: TallyStatus;
  depositAmount: string;
  depositCurrency: string;
  netAmount: string;
  goldRateValue: string | null;
  goldEquivalentG: string | null;
  physicalGoldAllocatedG: string | null;
  wingoldOrderId: string | null;
  storageCertificateId: string | null;
  netProfitUsd: string | null;
  createdAt: string;
  approvedAt: string | null;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    accountType: string;
  };
}

const STATUS_CONFIG: Record<TallyStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', variant: 'outline', icon: <Clock className="w-3 h-3" /> },
  PAYMENT_CONFIRMED: { label: 'Payment Confirmed', variant: 'secondary', icon: <CheckCircle className="w-3 h-3" /> },
  PHYSICAL_ORDERED: { label: 'Physical Ordered', variant: 'secondary', icon: <Package className="w-3 h-3" /> },
  PHYSICAL_ALLOCATED: { label: 'Physical Allocated', variant: 'secondary', icon: <Coins className="w-3 h-3" /> },
  CERT_RECEIVED: { label: 'Certificate Received', variant: 'secondary', icon: <FileCheck className="w-3 h-3" /> },
  COMPLETED: { label: 'Completed', variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { label: 'Cancelled', variant: 'outline', icon: <XCircle className="w-3 h-3" /> },
};

const DEPOSIT_METHOD_LABELS: Record<DepositMethod, string> = {
  CARD: 'Card',
  BANK: 'Bank Wire',
  CRYPTO: 'Crypto',
  VAULT_GOLD: 'Vault Gold',
};

export default function UnifiedGoldTally() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTallyTransaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const limit = 20;

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/unified-tally', { page, limit, status: statusFilter, method: methodFilter, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (methodFilter !== 'all') params.set('depositMethod', methodFilter);
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/admin/unified-tally?${params}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/unified-tally/stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/unified-tally/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const openTransactionDrawer = (transaction: UnifiedTallyTransaction) => {
    setSelectedTransaction(transaction);
    setDrawerOpen(true);
  };

  const formatCurrency = (amount: string | number | null, currency = 'USD') => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount));
  };

  const formatGold = (grams: string | number | null) => {
    if (!grams) return '-';
    return `${Number(grams).toFixed(4)}g`;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Unified Gold Tally</h1>
            <p className="text-gray-500">Track all gold deposits from payment to physical allocation</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold">{stats?.inProgress || 0}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Gold (g)</p>
                  <p className="text-2xl font-bold">{Number(stats?.totalGoldCreditedG || 0).toFixed(2)}</p>
                </div>
                <Coins className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Transactions</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by ID, user..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {Object.entries(DEPOSIT_METHOD_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Gold (g)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions?.data?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions?.data?.map((txn: UnifiedTallyTransaction) => (
                          <TableRow key={txn.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openTransactionDrawer(txn)}>
                            <TableCell className="font-mono text-xs">{txn.id.slice(0, 8)}...</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {txn.user?.accountType === 'business' ? (
                                  <Building className="w-4 h-4 text-purple-500" />
                                ) : (
                                  <User className="w-4 h-4 text-blue-500" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{txn.user?.firstName} {txn.user?.lastName}</p>
                                  <p className="text-xs text-gray-500">{txn.user?.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={txn.walletType === 'MPGW' ? 'secondary' : 'outline'}>
                                {txn.walletType}
                              </Badge>
                            </TableCell>
                            <TableCell>{DEPOSIT_METHOD_LABELS[txn.depositMethod]}</TableCell>
                            <TableCell>{formatCurrency(txn.depositAmount, txn.depositCurrency)}</TableCell>
                            <TableCell className="font-mono">{formatGold(txn.goldEquivalentG || txn.physicalGoldAllocatedG)}</TableCell>
                            <TableCell>
                              <Badge variant={STATUS_CONFIG[txn.status].variant} className="gap-1">
                                {STATUS_CONFIG[txn.status].icon}
                                {STATUS_CONFIG[txn.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {format(new Date(txn.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" data-testid={`view-txn-${txn.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, transactions?.total || 0)} of {transactions?.total || 0}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">Page {page}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!transactions?.data || transactions.data.length < limit}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <TransactionDrawer
          transaction={selectedTransaction}
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setSelectedTransaction(null); }}
          onRefresh={() => { refetch(); queryClient.invalidateQueries({ queryKey: ['/api/admin/unified-tally/stats'] }); }}
        />
      </div>
    </AdminLayout>
  );
}

interface TransactionDrawerProps {
  transaction: UnifiedTallyTransaction | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

function TransactionDrawer({ transaction, open, onClose, onRefresh }: TransactionDrawerProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);

  const { data: formData, refetch: refetchForm } = useQuery({
    queryKey: ['/api/admin/unified-tally', transaction?.id, 'wingold-form'],
    queryFn: async () => {
      if (!transaction?.id) return null;
      const res = await fetch(`/api/admin/unified-tally/${transaction.id}/wingold-form`);
      if (!res.ok) throw new Error('Failed to fetch form data');
      return res.json();
    },
    enabled: !!transaction?.id && open,
  });

  const { data: events } = useQuery({
    queryKey: ['/api/admin/unified-tally', transaction?.id, 'events'],
    queryFn: async () => {
      if (!transaction?.id) return [];
      const res = await fetch(`/api/admin/unified-tally/${transaction.id}/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
    enabled: !!transaction?.id && open,
  });

  const { data: holdingsSnapshot } = useQuery({
    queryKey: ['/api/admin/unified-tally/user', transaction?.userId, 'holdings-snapshot'],
    queryFn: async () => {
      if (!transaction?.userId) return null;
      const res = await fetch(`/api/admin/unified-tally/user/${transaction.userId}/holdings-snapshot`);
      if (!res.ok) throw new Error('Failed to fetch holdings');
      return res.json();
    },
    enabled: !!transaction?.userId && open,
  });

  const handleConfirmPayment = async () => {
    if (!transaction) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/unified-tally/${transaction.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentReference: `PAY-${Date.now()}`,
          confirmedAmount: transaction.depositAmount
        }),
      });
      if (!res.ok) throw new Error('Failed to confirm payment');
      toast.success('Payment confirmed');
      refetchForm();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  const formatCurrency = (amount: string | number | null, currency = 'USD') => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount));
  };

  const formatGold = (grams: string | number | null) => {
    if (!grams) return '-';
    return `${Number(grams).toFixed(4)}g`;
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Transaction Details</SheetTitle>
          <SheetDescription>
            ID: {transaction.id}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="details" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Transaction Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <Badge variant={STATUS_CONFIG[transaction.status].variant}>
                      {STATUS_CONFIG[transaction.status].label}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Wallet</span>
                    <span className="text-sm font-medium">{transaction.walletType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Method</span>
                    <span className="text-sm font-medium">{DEPOSIT_METHOD_LABELS[transaction.depositMethod]}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Deposit Amount</span>
                    <span className="text-sm font-medium">{formatCurrency(transaction.depositAmount, transaction.depositCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Net Amount</span>
                    <span className="text-sm font-medium">{formatCurrency(transaction.netAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Gold Rate</span>
                    <span className="text-sm font-medium">{transaction.goldRateValue ? `$${Number(transaction.goldRateValue).toFixed(2)}/g` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Gold Equivalent</span>
                    <span className="text-sm font-mono font-medium">{formatGold(transaction.goldEquivalentG)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">User Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="text-sm font-medium">{transaction.user?.firstName} {transaction.user?.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm">{transaction.user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Account Type</span>
                    <Badge variant="outline">{transaction.user?.accountType || 'personal'}</Badge>
                  </div>
                </CardContent>
              </Card>

              {transaction.status === 'PENDING_PAYMENT' && (
                <Button 
                  onClick={handleConfirmPayment}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Confirm Payment
                </Button>
              )}
            </TabsContent>

            <TabsContent value="allocation" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Wingold Allocation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Wingold Order ID</span>
                    <span className="text-sm font-mono">{formData?.formData?.wingoldOrderId || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Supplier Invoice</span>
                    <span className="text-sm font-mono">{formData?.formData?.wingoldSupplierInvoiceId || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Buy Rate</span>
                    <span className="text-sm">{formData?.formData?.wingoldBuyRate ? `$${Number(formData.formData.wingoldBuyRate).toFixed(2)}/g` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Cost</span>
                    <span className="text-sm font-medium">{formatCurrency(formData?.formData?.wingoldCostUsd)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Physical Allocated</span>
                    <span className="text-sm font-mono font-medium">{formatGold(formData?.formData?.physicalGoldAllocatedG)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Vault Location</span>
                    <span className="text-sm">{formData?.formData?.vaultLocation || '-'}</span>
                  </div>
                </CardContent>
              </Card>

              {formData?.bars && formData.bars.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Gold Bars ({formData.bars.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {formData.bars.map((bar: any) => (
                        <div key={bar.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <span className="font-mono text-xs">{bar.barSerial}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{bar.weight}g</span>
                            <Badge variant="outline" className="text-xs">{bar.purity}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Certificate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Certificate ID</span>
                    <span className="text-sm font-mono">{formData?.formData?.storageCertificateId || '-'}</span>
                  </div>
                  {formData?.formData?.certificateFileUrl && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Certificate File</span>
                      <a 
                        href={formData.formData.certificateFileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:underline"
                      >
                        View Certificate
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="holdings" className="m-0 space-y-4">
              {holdingsSnapshot ? (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Current Wallet Balances</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">MPGW Balance</span>
                        <span className="text-sm font-mono font-medium">{formatGold(holdingsSnapshot.wallets?.mpgw)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">FPGW Balance</span>
                        <span className="text-sm font-mono font-medium">{formatGold(holdingsSnapshot.wallets?.fpgw)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Vault Holdings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Vault Gold</span>
                        <span className="text-sm font-mono font-medium">{formatGold(holdingsSnapshot.vaultHoldings?.totalGrams)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Pending Transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Pending Deposits</span>
                        <span className="text-sm font-medium">{holdingsSnapshot.pendingDeposits || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Pending Withdrawals</span>
                        <span className="text-sm font-medium">{holdingsSnapshot.pendingWithdrawals || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading holdings...
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Event Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {events && events.length > 0 ? (
                    <div className="space-y-4">
                      {events.map((event: any, index: number) => (
                        <div key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-purple-500' : 'bg-gray-300'}`} />
                            {index < events.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-sm font-medium">{event.eventType.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-gray-500">
                              {event.triggeredByName || 'System'} • {format(new Date(event.createdAt), 'MMM d, yyyy HH:mm')}
                            </p>
                            {event.details && Object.keys(event.details).length > 0 && (
                              <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                {Object.entries(event.details).map(([key, value]) => (
                                  <div key={key}>{key}: {String(value)}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No events yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
