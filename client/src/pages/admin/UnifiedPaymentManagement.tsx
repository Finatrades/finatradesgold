import React, { useState, useEffect, useMemo } from 'react';
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
  FileText, ExternalLink, Package, CreditCard, ChevronDown,
  DollarSign, Calculator, Sparkles, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow, format } from 'date-fns';
import { useLocation } from 'wouter';

interface PendingPayment {
  id: string;
  sourceType: 'CRYPTO' | 'BANK' | 'CARD' | 'PHYSICAL';
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
  orderReference?: string;
  ngeniusOrderId?: string;
  cardBrand?: string;
  cardLast4?: string;
  gatewayVerified?: boolean;
  vaultInspected?: boolean;  // For physical deposits - indicates vault inspection completed
}

const SOURCE_ICONS = {
  CRYPTO: Bitcoin,
  BANK: Building2,
  CARD: CreditCard,
  PHYSICAL: Coins,
};

const SOURCE_COLORS = {
  CRYPTO: 'text-orange-600 bg-orange-50',
  BANK: 'text-blue-600 bg-blue-50',
  CARD: 'text-purple-600 bg-purple-50',
  PHYSICAL: 'text-yellow-600 bg-yellow-50',
};

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  Pending: { variant: 'outline', label: 'Pending' },
  'Under Review': { variant: 'secondary', label: 'Under Review' },
  submitted: { variant: 'outline', label: 'Submitted' },
  pending_review: { variant: 'secondary', label: 'Pending Review' },
  pending_assay: { variant: 'secondary', label: 'Pending Assay' },
  'Gateway Verified': { variant: 'default', label: '✓ Gateway Verified' },
  'Ready for Payment': { variant: 'default', label: '✓ Vault Inspected' },
};

const generateWingoldOrderId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WG-${year}${month}${day}-${random}`;
};

const generateCertificateId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PSC-${year}${month}${day}-${random}`;
};

export default function UnifiedPaymentManagement() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  
  // Pricing
  const [pricingMode, setPricingMode] = useState<'LIVE' | 'MANUAL'>('LIVE');
  const [manualGoldPrice, setManualGoldPrice] = useState('');
  
  // Wallet & Location
  const [walletType, setWalletType] = useState<'LGPW' | 'FGPW'>('LGPW');
  const [vaultLocation, setVaultLocation] = useState('Wingold & Metals DMCC');
  
  // Wingold Order - IDs are pre-generated and editable
  const [wingoldOrderId, setWingoldOrderId] = useState('');
  const [wingoldInvoiceId, setWingoldInvoiceId] = useState('');
  const [wingoldBuyRateMode, setWingoldBuyRateMode] = useState<'SAME' | 'MANUAL'>('SAME');
  const [wingoldBuyRate, setWingoldBuyRate] = useState('');
  
  // Certificate - ID is pre-generated and editable
  const [storageCertificateId, setStorageCertificateId] = useState('');
  
  // Allocation
  const [physicalGoldAllocatedG, setPhysicalGoldAllocatedG] = useState('');
  
  // Notes
  const [approvalNotes, setApprovalNotes] = useState('');
  
  // Dialogs
  const [proofViewerOpen, setProofViewerOpen] = useState(false);
  const [proofViewerUrl, setProofViewerUrl] = useState('');

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

  const FEE_PERCENT = 0.5;

  const calculations = useMemo(() => {
    // Physical deposits: Gold grams come from inspection, not USD conversion
    if (selectedPayment?.sourceType === 'PHYSICAL') {
      const inspectedGrams = parseFloat(selectedPayment.goldGrams || '0');
      const goldRate = pricingMode === 'MANUAL' && manualGoldPrice 
        ? parseFloat(manualGoldPrice) 
        : goldPrice?.pricePerGram || 0;
      
      const buyRate = wingoldBuyRateMode === 'SAME' 
        ? goldRate 
        : parseFloat(wingoldBuyRate) || 0;
      
      const physicalGold = parseFloat(physicalGoldAllocatedG) || inspectedGrams;
      const wingoldCost = physicalGold * buyRate;
      
      return {
        depositAmount: 0,
        feeAmount: 0,
        netAmount: 0,
        goldRate,
        goldEquivalent: inspectedGrams,
        buyRate,
        physicalGold,
        wingoldCost,
        platformProfit: 0,
        isPhysicalDeposit: true,
      };
    }
    
    // Cash deposits: Calculate from USD
    if (!selectedPayment?.amountUsd) return null;
    
    const depositAmount = parseFloat(selectedPayment.amountUsd);
    const feeAmount = depositAmount * (FEE_PERCENT / 100);
    const netAmount = depositAmount - feeAmount;
    
    const goldRate = pricingMode === 'MANUAL' && manualGoldPrice 
      ? parseFloat(manualGoldPrice) 
      : goldPrice?.pricePerGram || 0;
    
    const goldEquivalent = goldRate > 0 ? netAmount / goldRate : 0;
    
    const buyRate = wingoldBuyRateMode === 'SAME' 
      ? goldRate 
      : parseFloat(wingoldBuyRate) || 0;
    
    const physicalGold = parseFloat(physicalGoldAllocatedG) || goldEquivalent;
    const wingoldCost = physicalGold * buyRate;
    
    const platformProfit = feeAmount;
    
    return {
      depositAmount,
      feeAmount,
      netAmount,
      goldRate,
      goldEquivalent,
      buyRate,
      physicalGold,
      wingoldCost,
      platformProfit,
      isPhysicalDeposit: false,
    };
  }, [selectedPayment, pricingMode, manualGoldPrice, goldPrice, wingoldBuyRateMode, wingoldBuyRate, physicalGoldAllocatedG]);

  const allocationVariance = useMemo(() => {
    if (!calculations) return null;
    const expected = calculations.goldEquivalent;
    const allocated = parseFloat(physicalGoldAllocatedG) || 0;
    if (expected === 0 || allocated === 0) return null;
    const variancePercent = ((allocated - expected) / expected) * 100;
    return { expected, allocated, variancePercent };
  }, [calculations, physicalGoldAllocatedG]);

  const approveMutation = useMutation({
    mutationFn: async (payment: PendingPayment) => {
      // IDs are pre-generated in state - use them directly
      const finalBuyRate = wingoldBuyRateMode === 'SAME' 
        ? (pricingMode === 'MANUAL' ? manualGoldPrice : String(goldPrice?.pricePerGram || 0))
        : wingoldBuyRate;
      
      const res = await apiRequest('POST', `/api/admin/unified-tally/approve-payment/${payment.sourceType}/${payment.id}`, {
        pricingMode,
        manualGoldPrice: pricingMode === 'MANUAL' ? manualGoldPrice : undefined,
        walletType,
        vaultLocation,
        notes: approvalNotes,
        wingoldOrderId: wingoldOrderId,
        wingoldInvoiceId: wingoldInvoiceId || undefined,
        physicalGoldAllocatedG: physicalGoldAllocatedG, // No fallback - Golden Rule requires explicit allocation
        wingoldBuyRate: finalBuyRate,
        storageCertificateId: storageCertificateId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Payment approved and wallet credited!');
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
    setWingoldBuyRateMode('SAME');
    setWingoldBuyRate('');
    setStorageCertificateId('');
    setPhysicalGoldAllocatedG('');
  };

  const openApprovalDialog = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setWalletType(payment.walletType as 'LGPW' | 'FGPW');
    // Pre-generate IDs so they're visible and editable
    setWingoldOrderId(generateWingoldOrderId());
    setStorageCertificateId(generateCertificateId());
    
    // For physical deposits, pre-fill gold grams from inspection data
    if (payment.sourceType === 'PHYSICAL' && payment.goldGrams) {
      setPhysicalGoldAllocatedG(payment.goldGrams);
    }
    
    setApprovalDialogOpen(true);
  };

  // Update physical gold allocation when gold rate changes (only for cash deposits)
  useEffect(() => {
    // Skip auto-update for physical deposits - they use pre-filled inspection data
    if (selectedPayment?.sourceType === 'PHYSICAL') return;
    
    if (calculations && calculations.goldEquivalent > 0 && approvalDialogOpen) {
      setPhysicalGoldAllocatedG(calculations.goldEquivalent.toFixed(4));
    }
  }, [calculations?.goldEquivalent, approvalDialogOpen, selectedPayment?.sourceType]);

  // Check if gold price is loaded
  const isPriceReady = pricingMode === 'MANUAL' 
    ? (manualGoldPrice && parseFloat(manualGoldPrice) > 0)
    : (goldPrice?.pricePerGram && goldPrice.pricePerGram > 0);

  const handleApprove = () => {
    if (!selectedPayment) return;
    
    if (!isPriceReady) {
      toast.error('Please wait for live price to load or enter a manual gold price');
      return;
    }
    
    // Golden Rule validation: physical gold allocation is MANDATORY
    const allocatedGrams = parseFloat(physicalGoldAllocatedG);
    if (!physicalGoldAllocatedG || isNaN(allocatedGrams) || allocatedGrams <= 0) {
      toast.error('Physical gold allocation is required (Golden Rule). Please enter grams to allocate.');
      return;
    }
    
    if (!wingoldOrderId.trim()) {
      toast.error('Please enter Wingold Order ID');
      return;
    }
    
    if (!storageCertificateId.trim()) {
      toast.error('Please enter Storage Certificate ID');
      return;
    }
    
    if (wingoldBuyRateMode === 'MANUAL' && (!wingoldBuyRate || parseFloat(wingoldBuyRate) <= 0)) {
      toast.error('Please enter valid Wingold buy rate');
      return;
    }
    
    const variance = allocationVariance;
    if (variance && Math.abs(variance.variancePercent) > 1 && !approvalNotes.trim()) {
      toast.error('Large variance detected! Please provide justification in the notes field.');
      return;
    }
    
    approveMutation.mutate(selectedPayment);
  };

  const payments = paymentsData?.payments || [];
  const counts = paymentsData?.counts || { crypto: 0, bank: 0, card: 0, physical: 0, total: 0 };

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

  const isFormValid = useMemo(() => {
    // Check pricing is ready
    if (!isPriceReady) return false;
    // Check IDs are set
    if (!wingoldOrderId.trim()) return false;
    if (!storageCertificateId.trim()) return false;
    // Check buy rate if manual
    if (wingoldBuyRateMode === 'MANUAL' && (!wingoldBuyRate || parseFloat(wingoldBuyRate) <= 0)) return false;
    // Check allocation is valid
    if (!physicalGoldAllocatedG || parseFloat(physicalGoldAllocatedG) <= 0) return false;
    return true;
  }, [isPriceReady, wingoldOrderId, storageCertificateId, wingoldBuyRateMode, wingoldBuyRate, physicalGoldAllocatedG]);

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

        <div className="grid grid-cols-5 gap-4">
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
                  <p className="text-sm text-orange-600">Crypto</p>
                  <p className="text-2xl font-bold text-orange-700">{counts.crypto}</p>
                </div>
                <Bitcoin className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Bank Wire</p>
                  <p className="text-2xl font-bold text-blue-700">{counts.bank}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Card</p>
                  <p className="text-2xl font-bold text-purple-700">{counts.card}</p>
                </div>
                <CreditCard className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Physical</p>
                  <p className="text-2xl font-bold text-yellow-700">{counts.physical}</p>
                </div>
                <Coins className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
            <TabsTrigger value="crypto">Crypto ({counts.crypto})</TabsTrigger>
            <TabsTrigger value="bank">Bank ({counts.bank})</TabsTrigger>
            <TabsTrigger value="card">Card ({counts.card})</TabsTrigger>
            <TabsTrigger value="physical">Physical ({counts.physical})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No pending payments
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment: PendingPayment) => {
                        const SourceIcon = SOURCE_ICONS[payment.sourceType];
                        return (
                          <TableRow key={`${payment.sourceType}-${payment.id}`}>
                            <TableCell>
                              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${SOURCE_COLORS[payment.sourceType]}`}>
                                <SourceIcon className="w-4 h-4" />
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
                              <div>
                                {payment.sourceType === 'PHYSICAL' ? (
                                  <>
                                    <p className="font-medium text-amber-600">{formatGold(payment.goldGrams)}</p>
                                    <p className="text-xs text-gray-500">{payment.depositType || 'Physical Gold'}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-medium">{formatCurrency(payment.amountUsd)}</p>
                                    {payment.goldGrams && (
                                      <p className="text-xs text-amber-600">≈ {formatGold(payment.goldGrams)}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_BADGES[payment.status]?.variant || 'outline'}>
                                {STATUS_BADGES[payment.status]?.label || payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                                <p className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {payment.proofUrl && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setProofViewerUrl(payment.proofUrl!);
                                      setProofViewerOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Approve Payment & Credit Wallet
              </DialogTitle>
              <DialogDescription>
                Complete the allocation details to credit gold to user's wallet
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && calculations && (
              <div className="space-y-4">
                <Card className="bg-gray-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Deposit Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500">User:</span>
                        <span className="ml-2 font-medium">{selectedPayment.userName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Method:</span>
                        <Badge variant="outline" className="ml-2">{selectedPayment.sourceType}</Badge>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-gray-500">Deposit Amount:</span>
                      <span className="font-semibold">{formatCurrency(calculations.depositAmount)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                      Gold Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <RadioGroup value={pricingMode} onValueChange={(v) => setPricingMode(v as 'LIVE' | 'MANUAL')} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="LIVE" id="live" />
                        <Label htmlFor="live" className="font-normal cursor-pointer">
                          Live Market Price <span className="text-green-600 font-medium">(${goldPrice?.pricePerGram?.toFixed(2) || '...'}/g)</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MANUAL" id="manual" />
                        <Label htmlFor="manual" className="font-normal cursor-pointer">Manual Entry</Label>
                      </div>
                    </RadioGroup>

                    {pricingMode === 'MANUAL' && (
                      <div className="space-y-1">
                        <Label className="text-xs">Gold Price ($/gram) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter price per gram"
                          value={manualGoldPrice}
                          onChange={(e) => setManualGoldPrice(e.target.value)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-green-600" />
                      Auto-Calculated Values
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deposit Amount:</span>
                      <span className="font-medium">{formatCurrency(calculations.depositAmount)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Platform Fee ({FEE_PERCENT}%):</span>
                      <span>- {formatCurrency(calculations.feeAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Net Amount for Gold:</span>
                      <span>{formatCurrency(calculations.netAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gold Rate Used:</span>
                      <span className="font-medium">${calculations.goldRate.toFixed(2)}/gram</span>
                    </div>
                    <div className="flex justify-between bg-amber-100 p-2 rounded-md border border-amber-300">
                      <span className="font-semibold text-amber-800">Gold to Credit User:</span>
                      <span className="font-bold text-amber-900">{calculations.goldEquivalent.toFixed(4)}g</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      Wingold Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Wingold Order ID</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="e.g., WG-20260112-XXXX"
                          value={wingoldOrderId}
                          onChange={(e) => setWingoldOrderId(e.target.value)}
                          className="font-mono"
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => setWingoldOrderId(generateWingoldOrderId())}
                          title="Regenerate ID"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Pre-generated ID shown above. Edit or regenerate as needed.</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Wingold Invoice ID (Optional)</Label>
                      <Input
                        placeholder="e.g., INV-2026-001"
                        value={wingoldInvoiceId}
                        onChange={(e) => setWingoldInvoiceId(e.target.value)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Wingold Buy Rate</Label>
                      <RadioGroup value={wingoldBuyRateMode} onValueChange={(v) => setWingoldBuyRateMode(v as 'SAME' | 'MANUAL')} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="SAME" id="rate-same" />
                          <Label htmlFor="rate-same" className="font-normal cursor-pointer">
                            Same as User Rate (${calculations.goldRate.toFixed(2)}/g)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="MANUAL" id="rate-manual" />
                          <Label htmlFor="rate-manual" className="font-normal cursor-pointer">Different Rate</Label>
                        </div>
                      </RadioGroup>
                      {wingoldBuyRateMode === 'MANUAL' && (
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Wingold buy rate ($/gram)"
                          value={wingoldBuyRate}
                          onChange={(e) => setWingoldBuyRate(e.target.value)}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-600" />
                      Physical Gold Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Physical Gold Allocated (grams) *
                        <span className="text-gray-500 ml-2">(Expected: {calculations.goldEquivalent.toFixed(4)}g)</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="e.g., 103.1088"
                        value={physicalGoldAllocatedG}
                        onChange={(e) => setPhysicalGoldAllocatedG(e.target.value)}
                        className={allocationVariance && Math.abs(allocationVariance.variancePercent) > 1 ? 'border-red-500 bg-red-50' : ''}
                      />
                      {allocationVariance && Math.abs(allocationVariance.variancePercent) > 0.1 && (
                        <div className={`text-xs mt-1 p-2 rounded flex items-start gap-2 ${Math.abs(allocationVariance.variancePercent) > 1 ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-amber-100 text-amber-700'}`}>
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <strong>Variance: {allocationVariance.variancePercent > 0 ? '+' : ''}{allocationVariance.variancePercent.toFixed(2)}%</strong>
                            <span className="ml-1">({allocationVariance.allocated.toFixed(4)}g vs expected {allocationVariance.expected.toFixed(4)}g)</span>
                            {Math.abs(allocationVariance.variancePercent) > 1 && (
                              <div className="mt-1 font-semibold">Large variance requires justification in notes</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Storage Certificate (Golden Rule)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Certificate ID</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="e.g., PSC-20260112-XXXX"
                          value={storageCertificateId}
                          onChange={(e) => setStorageCertificateId(e.target.value)}
                          className="font-mono"
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => setStorageCertificateId(generateCertificateId())}
                          title="Regenerate ID"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Pre-generated ID shown above. Edit or regenerate as needed.</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Vault Location</Label>
                      <Select value={vaultLocation} onValueChange={setVaultLocation}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Wingold & Metals DMCC">Dubai (Wingold & Metals DMCC)</SelectItem>
                          <SelectItem value="Zurich">Zurich, Switzerland</SelectItem>
                          <SelectItem value="Singapore">Singapore</SelectItem>
                          <SelectItem value="London">London, UK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isFormValid && (
                      <div className="p-2 bg-green-100 border border-green-300 rounded-md flex items-center gap-2 text-green-700 text-xs">
                        <CheckCircle className="w-4 h-4" />
                        Golden Rule satisfied: Physical gold allocated + Certificate ready
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-600" />
                      Profit Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">User Receives:</span>
                      <span className="font-medium">{(parseFloat(physicalGoldAllocatedG) || calculations.goldEquivalent).toFixed(4)}g gold</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wingold Cost:</span>
                      <span className="font-medium">{formatCurrency(calculations.wingoldCost)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-green-700 font-semibold">
                      <span>Platform Fee Revenue:</span>
                      <span>{formatCurrency(calculations.platformProfit)}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-1">
                  <Label className="text-xs">
                    Notes {allocationVariance && Math.abs(allocationVariance.variancePercent) > 1 && <span className="text-red-500">* (Required for variance)</span>}
                  </Label>
                  <Textarea
                    placeholder="Any additional notes for this approval..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className={allocationVariance && Math.abs(allocationVariance.variancePercent) > 1 && !approvalNotes.trim() ? 'border-red-400' : ''}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs">Target Wallet:</Label>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">{walletType}</Badge>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setApprovalDialogOpen(false); resetApprovalForm(); }}>
                Cancel
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={approveMutation.isPending || !isFormValid}
              >
                {approveMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve & Credit Wallet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={proofViewerOpen} onOpenChange={setProofViewerOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Payment Proof
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg min-h-[400px]">
              {proofViewerUrl && proofViewerUrl.startsWith('data:application/pdf') ? (
                <iframe 
                  src={proofViewerUrl}
                  title="Payment Proof PDF"
                  className="w-full h-[70vh] border-0 rounded"
                />
              ) : proofViewerUrl && (proofViewerUrl.startsWith('data:image') || proofViewerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                <img 
                  src={proofViewerUrl} 
                  alt="Payment Proof" 
                  className="max-w-full max-h-[60vh] object-contain rounded"
                />
              ) : proofViewerUrl ? (
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
                  <a 
                    href={proofViewerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Open in new tab
                  </a>
                </div>
              ) : (
                <p className="text-muted-foreground">No proof available</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProofViewerOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
