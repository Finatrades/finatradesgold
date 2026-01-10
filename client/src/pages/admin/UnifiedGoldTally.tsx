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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  User,
  ArrowRight,
  CreditCard,
  Plus,
  Trash2,
  Save,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type TallyStatus = 'PENDING_PAYMENT' | 'PAYMENT_CONFIRMED' | 'PHYSICAL_ORDERED' | 'PHYSICAL_ALLOCATED' | 'CERT_RECEIVED' | 'CREDITED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
type DepositMethod = 'CARD' | 'BANK' | 'CRYPTO' | 'VAULT_GOLD';

interface UnifiedTallyTransaction {
  id: string;
  userId: string;
  walletType: 'LGPW' | 'FGPW';
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
  feeAmount: string | null;
  gatewayCostUsd: string | null;
  bankCostUsd: string | null;
  networkCostUsd: string | null;
  opsCostUsd: string | null;
  totalCostsUsd: string | null;
  netProfitUsd: string | null;
  wingoldCostUsd: string | null;
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
  CREDITED: { label: 'Credited', variant: 'default', icon: <CreditCard className="w-3 h-3" /> },
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

  const openTransactionDrawer = (txn: any) => {
    const mappedTransaction: UnifiedTallyTransaction = {
      id: txn.id,
      userId: txn.user_id || txn.userId,
      walletType: txn.wallet_type || txn.walletType,
      depositMethod: txn.source_method || txn.depositMethod || 'CRYPTO',
      status: txn.status,
      depositAmount: txn.deposit_amount || txn.depositAmount || '0',
      depositCurrency: txn.deposit_currency || txn.depositCurrency || 'USD',
      netAmount: txn.net_amount || txn.netAmount || '0',
      goldRateValue: txn.gold_rate_value || txn.goldRateValue,
      goldEquivalentG: txn.gold_equivalent_g || txn.goldEquivalentG,
      physicalGoldAllocatedG: txn.physical_gold_allocated_g || txn.physicalGoldAllocatedG,
      wingoldOrderId: txn.wingold_order_id || txn.wingoldOrderId,
      storageCertificateId: txn.storage_certificate_id || txn.storageCertificateId,
      feeAmount: txn.fee_amount || txn.feeAmount,
      gatewayCostUsd: txn.gateway_cost_usd || txn.gatewayCostUsd,
      bankCostUsd: txn.bank_cost_usd || txn.bankCostUsd,
      networkCostUsd: txn.network_cost_usd || txn.networkCostUsd,
      opsCostUsd: txn.ops_cost_usd || txn.opsCostUsd,
      totalCostsUsd: txn.total_costs_usd || txn.totalCostsUsd,
      netProfitUsd: txn.net_profit_usd || txn.netProfitUsd,
      wingoldCostUsd: txn.wingold_cost_usd || txn.wingoldCostUsd,
      createdAt: txn.created_at || txn.createdAt,
      approvedAt: txn.approved_at || txn.approvedAt,
      user: {
        firstName: txn.user_name?.split(' ')[0] || '',
        lastName: txn.user_name?.split(' ').slice(1).join(' ') || '',
        email: txn.user_email || '',
        accountType: txn.account_type || 'personal',
      },
    };
    setSelectedTransaction(mappedTransaction);
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
                  <p className="text-sm text-gray-500">Pending Payment</p>
                  <p className="text-2xl font-bold">{stats?.pendingPayment || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Allocation</p>
                  <p className="text-2xl font-bold">{(stats?.pendingAllocation || 0) + (stats?.pendingCert || 0)}</p>
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
                  <p className="text-sm text-gray-500">Total Volume</p>
                  <p className="text-2xl font-bold">${Number(stats?.totalVolumeUsd || 0).toLocaleString()}</p>
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
                      {(transactions?.items?.length === 0 || !transactions?.items) ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions?.items?.map((txn: any) => (
                          <TableRow key={txn.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openTransactionDrawer(txn)}>
                            <TableCell className="font-mono text-xs">{txn.txn_id || txn.id?.slice(0, 8)}...</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-500" />
                                <div>
                                  <p className="text-sm font-medium">{txn.user_name}</p>
                                  <p className="text-xs text-gray-500">{txn.user_email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={txn.wallet_type === 'LGPW' ? 'secondary' : 'outline'}>
                                {txn.wallet_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{DEPOSIT_METHOD_LABELS[txn.source_method as DepositMethod] || txn.source_method}</TableCell>
                            <TableCell>{formatCurrency(txn.deposit_amount, txn.deposit_currency)}</TableCell>
                            <TableCell className="font-mono">{formatGold(txn.gold_equivalent_g || txn.physical_gold_allocated_g)}</TableCell>
                            <TableCell>
                              <Badge variant={STATUS_CONFIG[txn.status as TallyStatus]?.variant || 'secondary'} className="gap-1">
                                {STATUS_CONFIG[txn.status as TallyStatus]?.icon}
                                {STATUS_CONFIG[txn.status as TallyStatus]?.label || txn.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {format(new Date(txn.created_at), 'MMM d, yyyy')}
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
                      disabled={!transactions?.items || transactions.items.length < limit}
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

interface GoldBar {
  serial: string;
  weightG: number;
  purity: number;
  notes?: string;
}

interface WingoldFormState {
  wingoldOrderId: string;
  wingoldSupplierInvoiceId: string;
  wingoldBuyRate: string;
  wingoldCostUsd: string;
  vaultLocation: string;
  physicalGoldAllocatedG: string;
  storageCertificateId: string;
  certificateFileUrl: string;
  certificateDate: string;
  bars: GoldBar[];
}

interface CreditFormState {
  pricingMode: 'MARKET' | 'FIXED';
  goldRateValue: string;
  gatewayCostUsd: string;
  bankCostUsd: string;
  networkCostUsd: string;
  opsCostUsd: string;
}

function TransactionDrawer({ transaction, open, onClose, onRefresh }: TransactionDrawerProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [savingWingold, setSavingWingold] = useState(false);
  const [savingCredit, setSavingCredit] = useState(false);

  const [wingoldForm, setWingoldForm] = useState<WingoldFormState>({
    wingoldOrderId: '',
    wingoldSupplierInvoiceId: '',
    wingoldBuyRate: '',
    wingoldCostUsd: '',
    vaultLocation: '',
    physicalGoldAllocatedG: '',
    storageCertificateId: '',
    certificateFileUrl: '',
    certificateDate: '',
    bars: [],
  });

  const [creditForm, setCreditForm] = useState<CreditFormState>({
    pricingMode: 'MARKET',
    goldRateValue: '',
    gatewayCostUsd: '0',
    bankCostUsd: '0',
    networkCostUsd: '0',
    opsCostUsd: '0',
  });

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

  const { data: projection } = useQuery({
    queryKey: ['/api/admin/unified-tally', transaction?.id, 'projection'],
    queryFn: async () => {
      if (!transaction?.id) return null;
      const res = await fetch(`/api/admin/unified-tally/${transaction.id}/projection`);
      if (!res.ok) throw new Error('Failed to fetch projection');
      return res.json();
    },
    enabled: !!transaction?.id && open,
  });

  React.useEffect(() => {
    if (!open) {
      setWingoldForm({
        wingoldOrderId: '',
        wingoldSupplierInvoiceId: '',
        wingoldBuyRate: '',
        wingoldCostUsd: '',
        vaultLocation: '',
        physicalGoldAllocatedG: '',
        storageCertificateId: '',
        certificateFileUrl: '',
        certificateDate: '',
        bars: [],
      });
      setCreditForm({
        pricingMode: 'MARKET',
        goldRateValue: '',
        gatewayCostUsd: '0',
        bankCostUsd: '0',
        networkCostUsd: '0',
        opsCostUsd: '0',
      });
      setActiveTab('details');
    }
  }, [open]);

  React.useEffect(() => {
    if (formData?.formData) {
      const fd = formData.formData;
      setWingoldForm({
        wingoldOrderId: fd.wingoldOrderId || '',
        wingoldSupplierInvoiceId: fd.wingoldSupplierInvoiceId || '',
        wingoldBuyRate: fd.wingoldBuyRate || '',
        wingoldCostUsd: fd.wingoldCostUsd || '',
        vaultLocation: fd.vaultLocation || '',
        physicalGoldAllocatedG: fd.physicalGoldAllocatedG || '',
        storageCertificateId: fd.storageCertificateId || '',
        certificateFileUrl: fd.certificateFileUrl || '',
        certificateDate: fd.certificateDate ? fd.certificateDate.split('T')[0] : '',
        bars: formData.bars?.map((b: any) => ({
          serial: b.barSerial || b.serial || '',
          weightG: Number(b.weight || b.weightG || 0),
          purity: Number(b.purity || 999.9),
          notes: b.notes || '',
        })) || [],
      });
    }
  }, [formData]);

  React.useEffect(() => {
    if (transaction) {
      setCreditForm({
        pricingMode: 'MARKET',
        goldRateValue: transaction.goldRateValue || '',
        gatewayCostUsd: transaction.gatewayCostUsd || '0',
        bankCostUsd: transaction.bankCostUsd || '0',
        networkCostUsd: transaction.networkCostUsd || '0',
        opsCostUsd: transaction.opsCostUsd || '0',
      });
    }
  }, [transaction]);

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

  const handleSaveWingoldForm = async () => {
    if (!transaction) return;
    setSavingWingold(true);
    try {
      const res = await fetch(`/api/admin/unified-tally/${transaction.id}/wingold-form/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wingoldOrderId: wingoldForm.wingoldOrderId || undefined,
          wingoldSupplierInvoiceId: wingoldForm.wingoldSupplierInvoiceId || undefined,
          wingoldBuyRate: wingoldForm.wingoldBuyRate || undefined,
          wingoldCostUsd: wingoldForm.wingoldCostUsd || undefined,
          vaultLocation: wingoldForm.vaultLocation || undefined,
          goldRateValue: wingoldForm.wingoldBuyRate || undefined,
          storageCertificateId: wingoldForm.storageCertificateId || undefined,
          certificateFileUrl: wingoldForm.certificateFileUrl || undefined,
          certificateDate: wingoldForm.certificateDate || undefined,
          barLotSerialsJson: wingoldForm.bars.length > 0 ? wingoldForm.bars : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      toast.success('Wingold data saved');
      refetchForm();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingWingold(false);
    }
  };

  const handleApproveCredit = async () => {
    if (!transaction) return;
    
    if (!wingoldForm.storageCertificateId) {
      toast.error('Storage certificate is required (Golden Rule)');
      return;
    }
    if (!wingoldForm.physicalGoldAllocatedG || Number(wingoldForm.physicalGoldAllocatedG) <= 0) {
      toast.error('Physical gold must be allocated (Golden Rule)');
      return;
    }
    if (!creditForm.goldRateValue || Number(creditForm.goldRateValue) <= 0) {
      toast.error('Gold rate is required');
      return;
    }

    setSavingCredit(true);
    try {
      const res = await fetch(`/api/admin/unified-tally/${transaction.id}/approve-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricingMode: creditForm.pricingMode,
          goldRateValue: creditForm.goldRateValue,
          gatewayCostUsd: creditForm.gatewayCostUsd || '0',
          bankCostUsd: creditForm.bankCostUsd || '0',
          networkCostUsd: creditForm.networkCostUsd || '0',
          opsCostUsd: creditForm.opsCostUsd || '0',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve credit');
      }
      toast.success('Credit approved and wallet updated');
      refetchForm();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingCredit(false);
    }
  };

  const addBar = () => {
    setWingoldForm(prev => ({
      ...prev,
      bars: [...prev.bars, { serial: '', weightG: 100, purity: 999.9, notes: '' }]
    }));
  };

  const removeBar = (index: number) => {
    setWingoldForm(prev => ({
      ...prev,
      bars: prev.bars.filter((_, i) => i !== index)
    }));
  };

  const updateBar = (index: number, field: keyof GoldBar, value: string | number) => {
    setWingoldForm(prev => ({
      ...prev,
      bars: prev.bars.map((bar, i) => i === index ? { ...bar, [field]: value } : bar)
    }));
  };

  const calculateTotalCosts = () => {
    return (
      Number(creditForm.gatewayCostUsd || 0) +
      Number(creditForm.bankCostUsd || 0) +
      Number(creditForm.networkCostUsd || 0) +
      Number(creditForm.opsCostUsd || 0)
    );
  };

  const calculateNetProfit = () => {
    const depositAmount = Number(transaction?.depositAmount || 0);
    const wingoldCost = Number(wingoldForm.wingoldCostUsd || 0);
    const totalCosts = calculateTotalCosts();
    return depositAmount - wingoldCost - totalCosts;
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
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Transaction Details</SheetTitle>
          <SheetDescription>
            ID: {transaction.id}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4 overflow-hidden">
          <TabsList className="grid grid-cols-5 shrink-0">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="fees">Fees & Profit</TabsTrigger>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-2">
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

            <TabsContent value="allocation" className="m-0 space-y-4 pb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    Wingold Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Wingold Order ID *</Label>
                      <Input
                        placeholder="WG-2026-001234"
                        value={wingoldForm.wingoldOrderId}
                        onChange={(e) => setWingoldForm(prev => ({ ...prev, wingoldOrderId: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Supplier Invoice</Label>
                      <Input
                        placeholder="INV-2026-5678"
                        value={wingoldForm.wingoldSupplierInvoiceId}
                        onChange={(e) => setWingoldForm(prev => ({ ...prev, wingoldSupplierInvoiceId: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Buy Rate ($/gram) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="95.50"
                        value={wingoldForm.wingoldBuyRate}
                        onChange={(e) => setWingoldForm(prev => ({ ...prev, wingoldBuyRate: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Total Cost (USD) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="28500.00"
                        value={wingoldForm.wingoldCostUsd}
                        onChange={(e) => setWingoldForm(prev => ({ ...prev, wingoldCostUsd: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vault Location *</Label>
                    <Select
                      value={wingoldForm.vaultLocation}
                      onValueChange={(value) => setWingoldForm(prev => ({ ...prev, vaultLocation: value }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select vault location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zurich">Zurich, Switzerland</SelectItem>
                        <SelectItem value="dubai">Dubai, UAE</SelectItem>
                        <SelectItem value="singapore">Singapore</SelectItem>
                        <SelectItem value="london">London, UK</SelectItem>
                        <SelectItem value="hongkong">Hong Kong</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    Physical Gold Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Physical Gold Allocated (grams) *</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="298.4567"
                      value={wingoldForm.physicalGoldAllocatedG}
                      onChange={(e) => setWingoldForm(prev => ({ ...prev, physicalGoldAllocatedG: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Gold Bars</Label>
                    <Button variant="outline" size="sm" onClick={addBar} className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add Bar
                    </Button>
                  </div>

                  {wingoldForm.bars.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">No bars added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {wingoldForm.bars.map((bar, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded-md space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Bar #{index + 1}</span>
                            <Button variant="ghost" size="sm" onClick={() => removeBar(index)} className="h-6 w-6 p-0">
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              placeholder="Serial"
                              value={bar.serial}
                              onChange={(e) => updateBar(index, 'serial', e.target.value)}
                              className="h-7 text-xs"
                            />
                            <Input
                              type="number"
                              placeholder="Weight (g)"
                              value={bar.weightG}
                              onChange={(e) => updateBar(index, 'weightG', Number(e.target.value))}
                              className="h-7 text-xs"
                            />
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Purity"
                              value={bar.purity}
                              onChange={(e) => updateBar(index, 'purity', Number(e.target.value))}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="text-xs text-gray-500 text-right">
                        Total: {wingoldForm.bars.reduce((sum, b) => sum + b.weightG, 0).toFixed(2)}g
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-green-600" />
                    Storage Certificate (Golden Rule)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Certificate ID *</Label>
                    <Input
                      placeholder="CERT-ZH-2026-001234"
                      value={wingoldForm.storageCertificateId}
                      onChange={(e) => setWingoldForm(prev => ({ ...prev, storageCertificateId: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Certificate File URL</Label>
                      <Input
                        placeholder="https://..."
                        value={wingoldForm.certificateFileUrl}
                        onChange={(e) => setWingoldForm(prev => ({ ...prev, certificateFileUrl: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Certificate Date</Label>
                      <Input
                        type="date"
                        value={wingoldForm.certificateDate}
                        onChange={(e) => setWingoldForm(prev => ({ ...prev, certificateDate: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {wingoldForm.storageCertificateId && Number(wingoldForm.physicalGoldAllocatedG) > 0 ? (
                    <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Golden Rule satisfied: Certificate + Physical allocation present
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Golden Rule: Both certificate ID and physical allocation required to approve credit
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={handleSaveWingoldForm}
                disabled={savingWingold}
                className="w-full"
              >
                {savingWingold ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Wingold Data
              </Button>

              <Card className="border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    Approve Credit (Final Step)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Pricing Mode</Label>
                      <Select
                        value={creditForm.pricingMode}
                        onValueChange={(value: 'MARKET' | 'FIXED') => setCreditForm(prev => ({ ...prev, pricingMode: value }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MARKET">Market Price</SelectItem>
                          <SelectItem value="FIXED">Fixed Price</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Gold Rate ($/gram) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="96.75"
                        value={creditForm.goldRateValue}
                        onChange={(e) => setCreditForm(prev => ({ ...prev, goldRateValue: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <Separator />
                  <Label className="text-xs font-medium">Operating Costs</Label>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Gateway Cost ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={creditForm.gatewayCostUsd}
                        onChange={(e) => setCreditForm(prev => ({ ...prev, gatewayCostUsd: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bank Cost ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={creditForm.bankCostUsd}
                        onChange={(e) => setCreditForm(prev => ({ ...prev, bankCostUsd: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Network Cost ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={creditForm.networkCostUsd}
                        onChange={(e) => setCreditForm(prev => ({ ...prev, networkCostUsd: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ops Cost ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={creditForm.opsCostUsd}
                        onChange={(e) => setCreditForm(prev => ({ ...prev, opsCostUsd: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-md space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Costs:</span>
                      <span className="font-medium">${calculateTotalCosts().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Wingold Cost:</span>
                      <span className="font-medium">${Number(wingoldForm.wingoldCostUsd || 0).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Estimated Net Profit:</span>
                      <span className={`font-bold ${calculateNetProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${calculateNetProfit().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleApproveCredit}
                    disabled={savingCredit || !wingoldForm.storageCertificateId || Number(wingoldForm.physicalGoldAllocatedG) <= 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {savingCredit ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Approve Credit & Complete
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fees" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Revenue & Fees
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Deposit Amount</span>
                    <span className="text-sm font-medium">{formatCurrency(transaction.depositAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Platform Fee</span>
                    <span className="text-sm font-medium text-orange-600">-{formatCurrency(transaction.feeAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Net Amount</span>
                    <span className="text-sm font-bold">{formatCurrency(transaction.netAmount)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="w-4 h-4 text-red-600" />
                    Operating Costs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Wingold Cost</span>
                    <span className="text-sm">{formatCurrency(transaction.wingoldCostUsd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Payment Gateway</span>
                    <span className="text-sm">{formatCurrency(transaction.gatewayCostUsd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Bank Fees</span>
                    <span className="text-sm">{formatCurrency(transaction.bankCostUsd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Network Fees</span>
                    <span className="text-sm">{formatCurrency(transaction.networkCostUsd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Operations</span>
                    <span className="text-sm">{formatCurrency(transaction.opsCostUsd)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Costs</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(transaction.totalCostsUsd)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className={Number(transaction.netProfitUsd || 0) >= 0 ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    Net Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Platform Profit</span>
                    <span className={`text-xl font-bold ${Number(transaction.netProfitUsd || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(transaction.netProfitUsd)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Calculated as: Fee Amount - Total Costs
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="holdings" className="m-0 space-y-4">
              {projection ? (
                <>
                  <Card className="border-purple-200 bg-purple-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-purple-500" />
                        Transaction Impact Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Wallet Type</span>
                        <Badge variant="secondary">{projection.transaction?.walletType}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Gold to Credit</span>
                        <span className="text-sm font-mono font-bold text-green-600">+{formatGold(projection.transaction?.goldToCredit)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">USD Equivalent</span>
                        <span className="text-sm text-gray-500">≈ {formatCurrency(projection.transaction?.usdEquivalent)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">FinaPay Wallets (Before → After)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">LGPW Balance</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{formatGold(projection.current?.finapay?.mpgw?.balanceG)}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="font-mono font-medium text-green-600">{formatGold(projection.after?.finapay?.mpgw?.balanceG)}</span>
                            {projection.delta?.mpgwDeltaG > 0 && (
                              <Badge variant="outline" className="text-xs text-green-600">+{formatGold(projection.delta.mpgwDeltaG)}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">FGPW Balance</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{formatGold(projection.current?.finapay?.fpgw?.balanceG)}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="font-mono font-medium text-green-600">{formatGold(projection.after?.finapay?.fpgw?.balanceG)}</span>
                            {projection.delta?.fpgwDeltaG > 0 && (
                              <Badge variant="outline" className="text-xs text-green-600">+{formatGold(projection.delta.fpgwDeltaG)}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">FinaVault Holdings (Before → After)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Gold</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{formatGold(projection.current?.finavault?.totalG)}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-mono font-medium text-green-600">{formatGold(projection.after?.finavault?.totalG)}</span>
                          <Badge variant="outline" className="text-xs text-green-600">+{formatGold(projection.delta?.vaultDeltaG)}</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Bars Count</span>
                        <div className="flex items-center gap-2">
                          <span>{projection.current?.finavault?.barsCount || 0}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-medium">{projection.after?.finavault?.barsCount || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Wingold Physical (Before → After)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Allocated Total</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{formatGold(projection.current?.wingold?.allocatedTotalGForUser)}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-mono font-medium text-green-600">{formatGold(projection.after?.wingold?.allocatedTotalGForUser)}</span>
                          <Badge variant="outline" className="text-xs text-green-600">+{formatGold(projection.delta?.wingoldDeltaG)}</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Certificate</span>
                        <span className="font-mono text-xs">{projection.after?.wingold?.latestCertificateId || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {projection.readyToApprove && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        All 4 ledgers will reconcile after approval
                      </p>
                    </div>
                  )}
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
                      {events.map((event: any, index: number) => {
                        const eventType = event.event_type || event.eventType;
                        const triggeredByName = event.triggered_by_name || event.triggeredByName || 'System';
                        const createdAt = event.created_at || event.createdAt;
                        const details = event.details || {};
                        return (
                          <div key={event.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-purple-500' : 'bg-gray-300'}`} />
                              {index < events.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="text-sm font-medium">{eventType?.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-gray-500">
                                {triggeredByName} • {createdAt ? format(new Date(createdAt), 'MMM d, yyyy HH:mm') : '-'}
                              </p>
                              {details && Object.keys(details).length > 0 && (
                                <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                  {Object.entries(details).map(([key, value]) => (
                                    <div key={key}>{key}: {String(value)}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No events yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
