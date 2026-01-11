import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bitcoin, Building2, Coins, Clock, CheckCircle, XCircle, 
  RefreshCw, Eye, ArrowRight, AlertTriangle, TrendingUp,
  FileText, ExternalLink, Package, CreditCard, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow, format } from 'date-fns';
import { useLocation } from 'wouter';

interface PendingPayment {
  id: string;
  sourceType: 'CRYPTO' | 'BANK' | 'PHYSICAL';
  sourceTable: string;
  userId: string;
  userName: string;
  userEmail: string;
  amountUsd: string | null;
  goldGrams: string | null;
  goldPriceAtTime: string | null;
  status: string;
  proofUrl?: string;
  transactionHash?: string;
  referenceNumber?: string;
  senderBankName?: string;
  depositType?: string;
  deliveryMethod?: string;
  walletType: string;
  createdAt: string;
  linkedTallyId: string | null;
}

const SOURCE_ICONS = {
  CRYPTO: Bitcoin,
  BANK: Building2,
  PHYSICAL: Coins,
};

const SOURCE_COLORS = {
  CRYPTO: 'text-orange-600 bg-orange-50',
  BANK: 'text-blue-600 bg-blue-50',
  PHYSICAL: 'text-yellow-600 bg-yellow-50',
};

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  Pending: { variant: 'outline', label: 'Pending' },
  'Under Review': { variant: 'secondary', label: 'Under Review' },
  submitted: { variant: 'outline', label: 'Submitted' },
  pending_review: { variant: 'secondary', label: 'Pending Review' },
  pending_assay: { variant: 'secondary', label: 'Pending Assay' },
};

export default function UnifiedPaymentManagement() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [pricingMode, setPricingMode] = useState<'LIVE' | 'MANUAL'>('LIVE');
  const [manualGoldPrice, setManualGoldPrice] = useState('');
  const [walletType, setWalletType] = useState<'LGPW' | 'FGPW'>('LGPW');
  const [vaultLocation, setVaultLocation] = useState('Wingold & Metals DMCC');
  const [approvalNotes, setApprovalNotes] = useState('');
  
  // Allocation fields
  const [wingoldOrderId, setWingoldOrderId] = useState('');
  const [wingoldInvoiceId, setWingoldInvoiceId] = useState('');
  const [physicalGoldAllocatedG, setPhysicalGoldAllocatedG] = useState('');
  const [wingoldBuyRate, setWingoldBuyRate] = useState('');
  const [storageCertificateId, setStorageCertificateId] = useState('');
  const [showAllocationFields, setShowAllocationFields] = useState(false);

  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ['unified-pending-payments'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/unified-tally/pending-payments');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: goldPrice } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/gold-price');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: async (payment: PendingPayment) => {
      const res = await apiRequest('POST', `/api/admin/unified-tally/approve-payment/${payment.sourceType}/${payment.id}`, {
        pricingMode,
        manualGoldPrice: pricingMode === 'MANUAL' ? manualGoldPrice : undefined,
        walletType,
        vaultLocation,
        notes: approvalNotes,
        // Allocation fields (optional - can be added later in UTT detail view)
        wingoldOrderId: wingoldOrderId || undefined,
        wingoldInvoiceId: wingoldInvoiceId || undefined,
        physicalGoldAllocatedG: physicalGoldAllocatedG || undefined,
        wingoldBuyRate: wingoldBuyRate || undefined,
        storageCertificateId: storageCertificateId || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Payment approved and UTT created');
      queryClient.invalidateQueries({ queryKey: ['unified-pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['unified-tally'] });
      setApprovalDialogOpen(false);
      setSelectedPayment(null);
      resetApprovalForm();
      
      if (data.tally?.id) {
        navigate(`/admin/unified-gold-tally?highlight=${data.tally.id}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve payment');
    },
  });

  const resetApprovalForm = () => {
    setPricingMode('LIVE');
    setManualGoldPrice('');
    setWalletType('LGPW');
    setVaultLocation('Wingold & Metals DMCC');
    setApprovalNotes('');
    setWingoldOrderId('');
    setWingoldInvoiceId('');
    setPhysicalGoldAllocatedG('');
    setWingoldBuyRate('');
    setStorageCertificateId('');
    setShowAllocationFields(false);
  };

  const openApprovalDialog = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setWalletType(payment.walletType as 'LGPW' | 'FGPW');
    setApprovalDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedPayment) return;
    if (pricingMode === 'MANUAL' && !manualGoldPrice) {
      toast.error('Please enter manual gold price');
      return;
    }
    approveMutation.mutate(selectedPayment);
  };

  const payments = paymentsData?.payments || [];
  const counts = paymentsData?.counts || { crypto: 0, bank: 0, physical: 0, total: 0 };

  const filteredPayments = activeTab === 'all' 
    ? payments 
    : payments.filter((p: PendingPayment) => p.sourceType === activeTab.toUpperCase());

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  };

  const formatGold = (grams: string | number | null) => {
    if (!grams) return '-';
    return `${Number(grams).toFixed(4)}g`;
  };

  const calculateGoldEquivalent = (amountUsd: string | null, pricePerGram: number) => {
    if (!amountUsd || !pricePerGram) return '-';
    return `${(Number(amountUsd) / pricePerGram).toFixed(4)}g`;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Unified Payment Management</h1>
            <p className="text-gray-500">Manage all incoming payments in one place</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Pending</p>
                  <p className="text-2xl font-bold">{counts.total}</p>
                </div>
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Crypto Payments</p>
                  <p className="text-2xl font-bold text-orange-600">{counts.crypto}</p>
                </div>
                <Bitcoin className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Bank Deposits</p>
                  <p className="text-2xl font-bold text-blue-600">{counts.bank}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Physical Gold</p>
                  <p className="text-2xl font-bold text-yellow-600">{counts.physical}</p>
                </div>
                <Coins className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {goldPrice && (
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="py-3">
              <div className="flex items-center gap-4">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">Current Gold Price:</span>
                <span className="font-bold text-purple-700">${goldPrice.pricePerGram?.toFixed(2)}/gram</span>
                <span className="text-xs text-gray-400">
                  Updated {formatDistanceToNow(new Date(goldPrice.timestamp))} ago
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
            <TabsTrigger value="crypto">Crypto ({counts.crypto})</TabsTrigger>
            <TabsTrigger value="bank">Bank ({counts.bank})</TabsTrigger>
            <TabsTrigger value="physical">Physical ({counts.physical})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Pending Payments</CardTitle>
                <CardDescription>
                  Approve payments to create Unified Gold Tally records for processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                    <p>No pending payments</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Gold Equiv.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment: PendingPayment) => {
                        const Icon = SOURCE_ICONS[payment.sourceType];
                        const colorClass = SOURCE_COLORS[payment.sourceType];
                        return (
                          <TableRow key={`${payment.sourceType}-${payment.id}`}>
                            <TableCell>
                              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${colorClass}`}>
                                <Icon className="w-4 h-4" />
                                <span className="text-xs font-medium">{payment.sourceType}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{payment.userName}</p>
                                <p className="text-xs text-gray-500">{payment.userEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {payment.amountUsd ? (
                                <span className="font-medium">{formatCurrency(payment.amountUsd)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {payment.goldGrams ? (
                                <span className="font-mono">{formatGold(payment.goldGrams)}</span>
                              ) : payment.amountUsd && goldPrice?.pricePerGram ? (
                                <span className="font-mono text-gray-500">
                                  ~{calculateGoldEquivalent(payment.amountUsd, goldPrice.pricePerGram)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_BADGES[payment.status]?.variant || 'outline'}>
                                {STATUS_BADGES[payment.status]?.label || payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-500">
                                {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {payment.proofUrl && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer">
                                      <Eye className="w-4 h-4" />
                                    </a>
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => openApprovalDialog(payment)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                              </div>
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

        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Approve Payment
              </DialogTitle>
              <DialogDescription>
                This will create a Unified Gold Tally record for processing
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-4">
                <Card className="bg-gray-50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Source</span>
                      <Badge variant="outline">{selectedPayment.sourceType}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">User</span>
                      <span className="text-sm font-medium">{selectedPayment.userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedPayment.amountUsd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Fee (0.5%)</span>
                      <span className="text-sm font-medium text-red-500">
                        -{formatCurrency(selectedPayment.amountUsd * 0.005)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Net Amount</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(selectedPayment.amountUsd * 0.995)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-sm text-gray-500">≈ Gold to Credit</span>
                      <span className="text-sm font-semibold text-amber-600">
                        {pricingMode === 'MANUAL' && manualGoldPrice 
                          ? ((selectedPayment.amountUsd * 0.995) / parseFloat(manualGoldPrice)).toFixed(4)
                          : goldPrice?.pricePerGram 
                            ? ((selectedPayment.amountUsd * 0.995) / goldPrice.pricePerGram).toFixed(4)
                            : '...'} g
                      </span>
                    </div>
                    {selectedPayment.transactionHash && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">TX Hash</span>
                        <span className="text-xs font-mono">{selectedPayment.transactionHash.slice(0, 20)}...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Separator />

                <div className="space-y-3">
                  <Label>Pricing Mode</Label>
                  <RadioGroup value={pricingMode} onValueChange={(v) => setPricingMode(v as 'LIVE' | 'MANUAL')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="LIVE" id="live" />
                      <Label htmlFor="live" className="font-normal">
                        Live Price (${goldPrice?.pricePerGram?.toFixed(2) || '...'}/g)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="MANUAL" id="manual" />
                      <Label htmlFor="manual" className="font-normal">Manual Price</Label>
                    </div>
                  </RadioGroup>

                  {pricingMode === 'MANUAL' && (
                    <div className="space-y-1">
                      <Label>Gold Price ($/gram)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter price per gram"
                        value={manualGoldPrice}
                        onChange={(e) => setManualGoldPrice(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Target Wallet</Label>
                    <Select value={walletType} onValueChange={(v) => setWalletType(v as 'LGPW' | 'FGPW')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LGPW">LGPW (Market Price)</SelectItem>
                        <SelectItem value="FGPW">FGPW (Fixed Price)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Vault Location</Label>
                    <Select value={vaultLocation} onValueChange={setVaultLocation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wingold & Metals DMCC">Dubai (Wingold)</SelectItem>
                        <SelectItem value="Zurich">Zurich</SelectItem>
                        <SelectItem value="Singapore">Singapore</SelectItem>
                        <SelectItem value="London">London</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => setShowAllocationFields(!showAllocationFields)}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-sm">Wingold Allocation Details (Optional)</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllocationFields ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showAllocationFields && (
                    <div className="space-y-3 pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        Fill these fields now if you have Wingold order details, or add them later in the UTT detail view.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Wingold Order ID</Label>
                          <Input
                            placeholder="e.g., WG-2026-0001"
                            value={wingoldOrderId}
                            onChange={(e) => setWingoldOrderId(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Wingold Invoice ID</Label>
                          <Input
                            placeholder="e.g., INV-2026-001"
                            value={wingoldInvoiceId}
                            onChange={(e) => setWingoldInvoiceId(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Physical Gold Allocated (g)</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            placeholder="e.g., 150.5000"
                            value={physicalGoldAllocatedG}
                            onChange={(e) => setPhysicalGoldAllocatedG(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Wingold Buy Rate ($/g)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 65.50"
                            value={wingoldBuyRate}
                            onChange={(e) => setWingoldBuyRate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Storage Certificate ID</Label>
                        <Input
                          placeholder="e.g., CERT-2026-0001"
                          value={storageCertificateId}
                          onChange={(e) => setStorageCertificateId(e.target.value)}
                        />
                      </div>
                      
                      {parseFloat(physicalGoldAllocatedG) > 0 && storageCertificateId.trim().length > 0 && (
                        <Card className="bg-green-50 border-green-200">
                          <CardContent className="py-2">
                            <div className="flex items-center gap-2 text-green-700 text-xs">
                              <CheckCircle className="w-4 h-4" />
                              Golden Rule will be satisfied - wallet credit will proceed immediately after approval.
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any additional notes for this approval..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                  />
                </div>

                <Card className={`${parseFloat(physicalGoldAllocatedG) > 0 && storageCertificateId.trim().length > 0 ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
                  <CardContent className="py-3">
                    <div className={`flex items-center gap-2 ${parseFloat(physicalGoldAllocatedG) > 0 && storageCertificateId.trim().length > 0 ? 'text-green-700' : 'text-purple-700'}`}>
                      <ArrowRight className="w-4 h-4" />
                      <span className="text-sm">
                        {parseFloat(physicalGoldAllocatedG) > 0 && storageCertificateId.trim().length > 0 
                          ? 'Golden Rule satisfied! UTT will be created with allocation data and ready for final approval.'
                          : 'After approval, a Unified Gold Tally record will be created. You\'ll need to add Wingold order details and storage certificate before crediting.'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve & Create UTT
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
