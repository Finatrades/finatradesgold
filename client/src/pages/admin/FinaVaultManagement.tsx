import React, { useState, useEffect } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Package, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, 
  Search, RefreshCw, Loader2, Eye, FileText, Building, Bitcoin, AlertCircle,
  Truck, Box, DollarSign, MapPin, ArrowRightLeft, Gift, Shield, BarChart3,
  Plus, Edit, Trash2, Send
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';

const DEPOSIT_STATUSES = [
  'Submitted',
  'Under Review',
  'Approved – Awaiting Delivery',
  'Received at Vault'
] as const;

const FINAL_STATUSES = ['Stored in Vault', 'Stored'] as const;

const PROCESSING_TIMES = [
  { value: '1-2', label: '1-2 Days' },
  { value: '3-6', label: '3-6 Days' },
  { value: '7-14', label: '7-14 Days' },
  { value: 'custom', label: 'Custom' }
] as const;

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

interface PhysicalDelivery {
  id: string;
  userId: string;
  referenceNumber: string;
  goldGrams: string;
  goldPriceUsdPerGram: string;
  deliveryAddress: any;
  shippingFeeUsd: string;
  insuranceFeeUsd: string;
  status: string;
  trackingNumber: string | null;
  courierName: string | null;
  estimatedDeliveryDays: number | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

interface GoldBar {
  id: string;
  serialNumber: string;
  weightGrams: string;
  purity: string;
  refiner: string;
  vaultLocation: string;
  zone: string | null;
  allocatedToUserId: string | null;
  purchasePricePerGram: string;
  assayCertificateUrl: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface StorageFee {
  id: string;
  userId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  averageGoldGrams: string;
  feeRatePercent: string;
  feeAmountUsd: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

interface VaultLocation {
  id: string;
  name: string;
  country: string;
  city: string;
  address: string;
  capacity: string;
  currentHoldings: string;
  securityGrade: string;
  insuranceProvider: string | null;
  isActive: boolean;
  createdAt: string;
}

interface VaultTransfer {
  id: string;
  userId: string;
  goldGrams: string;
  fromLocation: string;
  toLocation: string;
  transferFeeUsd: string;
  status: string;
  adminNotes: string | null;
  completedAt: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

interface GoldGift {
  id: string;
  senderUserId: string;
  recipientEmail: string;
  recipientUserId: string | null;
  goldGrams: string;
  goldPriceUsdPerGram: string;
  message: string | null;
  status: string;
  expiresAt: string;
  claimedAt: string | null;
  createdAt: string;
  sender?: { firstName: string; lastName: string; email: string };
}

interface InsuranceCertificate {
  id: string;
  vaultLocationId: string;
  certificateNumber: string;
  provider: string;
  coverageAmountUsd: string;
  validFrom: string;
  validTo: string;
  documentUrl: string | null;
  createdAt: string;
  vaultLocation?: { name: string };
}

interface ReconciliationReport {
  totalDigitalGold: number;
  totalPhysicalGold: number;
  discrepancy: number;
  coverageRatio: number;
  pendingDeliveries: number;
  pendingTransfers: number;
  lastReconciliation: string;
  locationBreakdown: Array<{
    location: string;
    digitalGold: number;
    physicalGold: number;
  }>;
}

export default function FinaVaultManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('deposits');
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [physicalDeliveries, setPhysicalDeliveries] = useState<PhysicalDelivery[]>([]);
  const [goldBars, setGoldBars] = useState<GoldBar[]>([]);
  const [storageFees, setStorageFees] = useState<StorageFee[]>([]);
  const [vaultLocations, setVaultLocations] = useState<VaultLocation[]>([]);
  const [vaultTransfers, setVaultTransfers] = useState<VaultTransfer[]>([]);
  const [goldGifts, setGoldGifts] = useState<GoldGift[]>([]);
  const [insuranceCerts, setInsuranceCerts] = useState<InsuranceCertificate[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<PhysicalDelivery | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<VaultTransfer | null>(null);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [vaultReference, setVaultReference] = useState('');
  const [verifiedWeight, setVerifiedWeight] = useState('');
  const [goldPrice, setGoldPrice] = useState('');
  const [goldPriceMode, setGoldPriceMode] = useState<'live' | 'manual'>('live');
  const [liveGoldPrice, setLiveGoldPrice] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [processingTime, setProcessingTime] = useState('3-6');
  const [customDays, setCustomDays] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  
  const [showAddBarDialog, setShowAddBarDialog] = useState(false);
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [showGenerateFeesDialog, setShowGenerateFeesDialog] = useState(false);
  const [showGenerateInsuranceDialog, setShowGenerateInsuranceDialog] = useState(false);
  
  const [newBar, setNewBar] = useState({
    serialNumber: '',
    weightGrams: '',
    purity: '999.9',
    refiner: '',
    vaultLocation: '',
    zone: '',
    purchasePricePerGram: '',
    assayCertificateUrl: '',
    notes: ''
  });
  
  const [newLocation, setNewLocation] = useState({
    name: '',
    country: '',
    city: '',
    address: '',
    capacity: '',
    securityGrade: 'A',
    insuranceProvider: ''
  });
  
  const [newInsurance, setNewInsurance] = useState({
    vaultLocationId: '',
    provider: '',
    coverageAmountUsd: '',
    validFrom: '',
    validTo: '',
    documentUrl: ''
  });

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

  const fetchTabData = async (tab: string) => {
    try {
      switch (tab) {
        case 'deliveries':
          const deliveriesRes = await apiRequest('GET', '/api/admin/vault/physical-deliveries');
          const deliveriesData = await deliveriesRes.json();
          setPhysicalDeliveries(deliveriesData.requests || []);
          break;
        case 'bars':
          const barsRes = await apiRequest('GET', '/api/admin/vault/gold-bars');
          const barsData = await barsRes.json();
          setGoldBars(barsData.bars || []);
          break;
        case 'fees':
          const feesRes = await apiRequest('GET', '/api/admin/vault/storage-fees');
          const feesData = await feesRes.json();
          setStorageFees(feesData.fees || []);
          break;
        case 'locations':
          const locationsRes = await apiRequest('GET', '/api/admin/vault/locations');
          const locationsData = await locationsRes.json();
          setVaultLocations(locationsData.locations || []);
          break;
        case 'transfers':
          const transfersRes = await apiRequest('GET', '/api/admin/vault/transfers');
          const transfersData = await transfersRes.json();
          setVaultTransfers(transfersData.transfers || []);
          break;
        case 'gifts':
          const giftsRes = await apiRequest('GET', '/api/admin/vault/gifts');
          const giftsData = await giftsRes.json();
          setGoldGifts(giftsData.gifts || []);
          break;
        case 'insurance':
          const insuranceRes = await apiRequest('GET', '/api/admin/vault/insurance');
          const insuranceData = await insuranceRes.json();
          setInsuranceCerts(insuranceData.certificates || []);
          break;
        case 'reconciliation':
          const reconRes = await apiRequest('GET', '/api/admin/vault/reconciliation');
          const reconData = await reconRes.json();
          setReconciliation(reconData);
          break;
      }
    } catch (err) {
      console.error(`Failed to fetch ${tab} data:`, err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab !== 'deposits' && activeTab !== 'withdrawals') {
      fetchTabData(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedDeposit) {
      const fetchLivePrice = async () => {
        try {
          const res = await apiRequest('GET', '/api/gold-price');
          const data = await res.json();
          if (data.pricePerGram) {
            setLiveGoldPrice(data.pricePerGram);
          }
        } catch (err) {
          console.error('Failed to fetch gold price:', err);
        }
      };
      fetchLivePrice();
    }
  }, [selectedDeposit]);

  const handleApproveDeposit = async () => {
    if (!selectedDeposit) return;
    
    const weightToUse = verifiedWeight ? parseFloat(verifiedWeight) : parseFloat(selectedDeposit.totalDeclaredWeightGrams);
    const priceToUse = goldPriceMode === 'live' 
      ? (liveGoldPrice || 0) 
      : (parseFloat(goldPrice) || 0);
    
    if (weightToUse <= 0) {
      toast.error('Valid verified weight is required');
      return;
    }
    
    if (priceToUse <= 0) {
      toast.error('Valid gold price is required');
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

  const handleUpdateStatus = async () => {
    if (!selectedDeposit || !selectedStatus) {
      toast.error('Please select a status');
      return;
    }
    
    const days = processingTime === 'custom' ? customDays : processingTime;
    const estimatedDaysNum = days.includes('-') ? parseInt(days.split('-')[1]) : parseInt(days);
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDaysNum);
    
    setProcessingId(selectedDeposit.id);
    try {
      await apiRequest('PATCH', `/api/admin/vault/deposit/${selectedDeposit.id}`, {
        status: selectedStatus,
        estimatedProcessingDays: days,
        estimatedCompletionDate: estimatedCompletionDate.toISOString(),
        adminNotes,
        adminId: user?.id
      });
      
      toast.success(`Status updated to "${selectedStatus}"`);
      resetDepositForm();
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateDeliveryStatus = async (status: string) => {
    if (!selectedDelivery) return;
    
    setProcessingId(selectedDelivery.id);
    try {
      await apiRequest('PATCH', `/api/admin/vault/physical-delivery/${selectedDelivery.id}`, {
        status,
        trackingNumber: trackingNumber || undefined,
        courierName: courierName || undefined,
        estimatedDeliveryDays: estimatedDays ? parseInt(estimatedDays) : undefined,
        adminNotes
      });
      
      toast.success(`Delivery status updated to "${status}"`);
      setSelectedDelivery(null);
      setTrackingNumber('');
      setCourierName('');
      setEstimatedDays('');
      setAdminNotes('');
      fetchTabData('deliveries');
    } catch (err) {
      toast.error('Failed to update delivery status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveTransfer = async () => {
    if (!selectedTransfer) return;
    
    setProcessingId(selectedTransfer.id);
    try {
      await apiRequest('PATCH', `/api/admin/vault/transfers/${selectedTransfer.id}`, {
        status: 'Completed',
        adminNotes
      });
      
      toast.success('Transfer approved and completed');
      setSelectedTransfer(null);
      setAdminNotes('');
      fetchTabData('transfers');
    } catch (err) {
      toast.error('Failed to approve transfer');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTransfer = async () => {
    if (!selectedTransfer || !rejectionReason) {
      toast.error('Rejection reason is required');
      return;
    }
    
    setProcessingId(selectedTransfer.id);
    try {
      await apiRequest('PATCH', `/api/admin/vault/transfers/${selectedTransfer.id}`, {
        status: 'Rejected',
        adminNotes: rejectionReason
      });
      
      toast.success('Transfer rejected');
      setSelectedTransfer(null);
      setRejectionReason('');
      fetchTabData('transfers');
    } catch (err) {
      toast.error('Failed to reject transfer');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddGoldBar = async () => {
    try {
      await apiRequest('POST', '/api/admin/vault/gold-bars', newBar);
      toast.success('Gold bar added to inventory');
      setShowAddBarDialog(false);
      setNewBar({
        serialNumber: '',
        weightGrams: '',
        purity: '999.9',
        refiner: '',
        vaultLocation: '',
        zone: '',
        purchasePricePerGram: '',
        assayCertificateUrl: '',
        notes: ''
      });
      fetchTabData('bars');
    } catch (err) {
      toast.error('Failed to add gold bar');
    }
  };

  const handleAddLocation = async () => {
    try {
      await apiRequest('POST', '/api/admin/vault/locations', newLocation);
      toast.success('Vault location added');
      setShowAddLocationDialog(false);
      setNewLocation({
        name: '',
        country: '',
        city: '',
        address: '',
        capacity: '',
        securityGrade: 'A',
        insuranceProvider: ''
      });
      fetchTabData('locations');
    } catch (err) {
      toast.error('Failed to add vault location');
    }
  };

  const handleGenerateFees = async () => {
    try {
      await apiRequest('POST', '/api/admin/vault/storage-fees/generate');
      toast.success('Monthly storage fees generated');
      setShowGenerateFeesDialog(false);
      fetchTabData('fees');
    } catch (err) {
      toast.error('Failed to generate storage fees');
    }
  };

  const handleMarkFeePaid = async (feeId: string) => {
    try {
      await apiRequest('PATCH', `/api/admin/vault/storage-fees/${feeId}`, {
        status: 'Paid'
      });
      toast.success('Storage fee marked as paid');
      fetchTabData('fees');
    } catch (err) {
      toast.error('Failed to update storage fee');
    }
  };

  const handleGenerateInsurance = async () => {
    try {
      await apiRequest('POST', '/api/admin/vault/insurance', newInsurance);
      toast.success('Insurance certificate generated');
      setShowGenerateInsuranceDialog(false);
      setNewInsurance({
        vaultLocationId: '',
        provider: '',
        coverageAmountUsd: '',
        validFrom: '',
        validTo: '',
        documentUrl: ''
      });
      fetchTabData('insurance');
    } catch (err) {
      toast.error('Failed to generate insurance certificate');
    }
  };

  const resetDepositForm = () => {
    setSelectedDeposit(null);
    setVaultReference('');
    setVerifiedWeight('');
    setGoldPrice('');
    setGoldPriceMode('live');
    setAdminNotes('');
    setRejectionReason('');
    setSelectedStatus('');
    setProcessingTime('3-6');
    setCustomDays('');
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
        return <Badge variant="outline" className="bg-warning-muted text-warning-muted-foreground border-warning"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'In Review':
      case 'Processing':
      case 'Shipped':
        return <Badge variant="outline" className="bg-info-muted text-info-muted-foreground border-info"><RefreshCw className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'Approved':
      case 'Completed':
      case 'Delivered':
      case 'Stored':
      case 'Claimed':
      case 'Paid':
        return <Badge variant="outline" className="bg-success-muted text-success-muted-foreground border-success"><CheckCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'Rejected':
      case 'Cancelled':
      case 'Expired':
        return <Badge variant="outline" className="bg-error-muted text-error-muted-foreground border-error"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingDeposits = deposits.filter(d => d.status === 'Submitted' || d.status === 'In Review');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending' || w.status === 'Processing');
  const pendingDeliveries = physicalDeliveries.filter(d => d.status === 'Pending' || d.status === 'Approved');
  const pendingTransfers = vaultTransfers.filter(t => t.status === 'Pending');
  const unpaidFees = storageFees.filter(f => f.status === 'Pending');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-vault-title">FinaVault Management</h1>
            <p className="text-muted-foreground">Manage vault deposits, withdrawals, deliveries, and inventory</p>
          </div>
          <Button onClick={() => { fetchData(); fetchTabData(activeTab); }} variant="outline" disabled={loading} data-testid="button-refresh">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  <p className="text-2xl font-bold text-purple-600">{pendingWithdrawals.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <ArrowUpCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Deliveries</p>
                  <p className="text-2xl font-bold text-blue-600">{pendingDeliveries.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Transfers</p>
                  <p className="text-2xl font-bold text-orange-600">{pendingTransfers.length}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <ArrowRightLeft className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unpaid Fees</p>
                  <p className="text-2xl font-bold text-red-600">{unpaidFees.length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="deposits" className="flex items-center gap-2" data-testid="tab-deposits">
                <ArrowDownCircle className="w-4 h-4" />
                Deposits
                {pendingDeposits.length > 0 && <Badge variant="destructive" className="ml-1">{pendingDeposits.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex items-center gap-2" data-testid="tab-withdrawals">
                <ArrowUpCircle className="w-4 h-4" />
                Withdrawals
                {pendingWithdrawals.length > 0 && <Badge variant="destructive" className="ml-1">{pendingWithdrawals.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="deliveries" className="flex items-center gap-2" data-testid="tab-deliveries">
                <Truck className="w-4 h-4" />
                Deliveries
                {pendingDeliveries.length > 0 && <Badge variant="destructive" className="ml-1">{pendingDeliveries.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="bars" className="flex items-center gap-2" data-testid="tab-bars">
                <Box className="w-4 h-4" />
                Gold Bars
              </TabsTrigger>
              <TabsTrigger value="fees" className="flex items-center gap-2" data-testid="tab-fees">
                <DollarSign className="w-4 h-4" />
                Storage Fees
                {unpaidFees.length > 0 && <Badge variant="destructive" className="ml-1">{unpaidFees.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center gap-2" data-testid="tab-locations">
                <MapPin className="w-4 h-4" />
                Locations
              </TabsTrigger>
              <TabsTrigger value="transfers" className="flex items-center gap-2" data-testid="tab-transfers">
                <ArrowRightLeft className="w-4 h-4" />
                Transfers
                {pendingTransfers.length > 0 && <Badge variant="destructive" className="ml-1">{pendingTransfers.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="gifts" className="flex items-center gap-2" data-testid="tab-gifts">
                <Gift className="w-4 h-4" />
                Gifts
              </TabsTrigger>
              <TabsTrigger value="insurance" className="flex items-center gap-2" data-testid="tab-insurance">
                <Shield className="w-4 h-4" />
                Insurance
              </TabsTrigger>
              <TabsTrigger value="reconciliation" className="flex items-center gap-2" data-testid="tab-reconciliation">
                <BarChart3 className="w-4 h-4" />
                Reconciliation
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

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
                        <TableRow key={deposit.id} data-testid={`row-deposit-${deposit.id}`}>
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
                            <Button variant="ghost" size="sm" onClick={() => setSelectedDeposit(deposit)} data-testid={`button-view-deposit-${deposit.id}`}>
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
                          <TableRow key={withdrawal.id} data-testid={`row-withdrawal-${withdrawal.id}`}>
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
                                  <Bitcoin className="w-4 h-4 text-purple-600" />
                                )}
                                <span>{withdrawal.withdrawalMethod}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(withdrawal.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedWithdrawal(withdrawal)} data-testid={`button-view-withdrawal-${withdrawal.id}`}>
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

          <TabsContent value="deliveries" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Physical Delivery Requests
                </CardTitle>
                <CardDescription>Manage requests for physical gold delivery to users</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {physicalDeliveries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No physical delivery requests</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Gold Amount</TableHead>
                        <TableHead>Shipping Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tracking</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {physicalDeliveries.map((delivery) => (
                        <TableRow key={delivery.id} data-testid={`row-delivery-${delivery.id}`}>
                          <TableCell className="font-mono text-sm">{delivery.referenceNumber}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{delivery.user?.firstName} {delivery.user?.lastName}</p>
                              <p className="text-xs text-muted-foreground">{delivery.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{parseFloat(delivery.goldGrams).toFixed(3)}g</p>
                              <p className="text-xs text-muted-foreground">${(parseFloat(delivery.goldGrams) * parseFloat(delivery.goldPriceUsdPerGram)).toFixed(2)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>${parseFloat(delivery.shippingFeeUsd).toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">Ins: ${parseFloat(delivery.insuranceFeeUsd).toFixed(2)}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                          <TableCell>
                            {delivery.trackingNumber ? (
                              <div>
                                <p className="font-mono text-xs">{delivery.trackingNumber}</p>
                                <p className="text-xs text-muted-foreground">{delivery.courierName}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(delivery.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedDelivery(delivery)} data-testid={`button-view-delivery-${delivery.id}`}>
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

          <TabsContent value="bars" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="w-5 h-5" />
                    Gold Bar Inventory
                  </CardTitle>
                  <CardDescription>Track individual gold bars with serial numbers</CardDescription>
                </div>
                <Button onClick={() => setShowAddBarDialog(true)} data-testid="button-add-bar">
                  <Plus className="w-4 h-4 mr-2" /> Add Bar
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {goldBars.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Box className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No gold bars in inventory</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Purity</TableHead>
                        <TableHead>Refiner</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Allocated To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goldBars.map((bar) => (
                        <TableRow key={bar.id} data-testid={`row-bar-${bar.id}`}>
                          <TableCell className="font-mono font-medium">{bar.serialNumber}</TableCell>
                          <TableCell>{parseFloat(bar.weightGrams).toFixed(3)}g</TableCell>
                          <TableCell>{bar.purity}</TableCell>
                          <TableCell>{bar.refiner}</TableCell>
                          <TableCell>
                            <div>
                              <p>{bar.vaultLocation}</p>
                              {bar.zone && <p className="text-xs text-muted-foreground">Zone: {bar.zone}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(bar.status)}</TableCell>
                          <TableCell>
                            {bar.allocatedToUserId ? (
                              <Badge variant="outline">User #{bar.allocatedToUserId}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Unallocated</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Storage Fees
                  </CardTitle>
                  <CardDescription>Monthly vault storage fee billing</CardDescription>
                </div>
                <Button onClick={() => setShowGenerateFeesDialog(true)} data-testid="button-generate-fees">
                  <RefreshCw className="w-4 h-4 mr-2" /> Generate Monthly Fees
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {storageFees.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No storage fees generated yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Billing Period</TableHead>
                        <TableHead>Avg. Gold</TableHead>
                        <TableHead>Fee Rate</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storageFees.map((fee) => (
                        <TableRow key={fee.id} data-testid={`row-fee-${fee.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{fee.user?.firstName} {fee.user?.lastName}</p>
                              <p className="text-xs text-muted-foreground">{fee.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(fee.billingPeriodStart).toLocaleDateString()} -
                              <br />{new Date(fee.billingPeriodEnd).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{parseFloat(fee.averageGoldGrams).toFixed(3)}g</TableCell>
                          <TableCell>{parseFloat(fee.feeRatePercent).toFixed(4)}%</TableCell>
                          <TableCell className="font-medium">${parseFloat(fee.feeAmountUsd).toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(fee.status)}</TableCell>
                          <TableCell className="text-right">
                            {fee.status === 'Pending' && (
                              <Button variant="outline" size="sm" onClick={() => handleMarkFeePaid(fee.id)} data-testid={`button-mark-paid-${fee.id}`}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Mark Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Vault Locations
                  </CardTitle>
                  <CardDescription>Manage secure storage facilities</CardDescription>
                </div>
                <Button onClick={() => setShowAddLocationDialog(true)} data-testid="button-add-location">
                  <Plus className="w-4 h-4 mr-2" /> Add Location
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {vaultLocations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No vault locations configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Security Grade</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Current Holdings</TableHead>
                        <TableHead>Insurance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vaultLocations.map((location) => (
                        <TableRow key={location.id} data-testid={`row-location-${location.id}`}>
                          <TableCell className="font-medium">{location.name}</TableCell>
                          <TableCell>
                            <div>
                              <p>{location.city}, {location.country}</p>
                              <p className="text-xs text-muted-foreground">{location.address}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/10 text-primary">
                              Grade {location.securityGrade}
                            </Badge>
                          </TableCell>
                          <TableCell>{parseFloat(location.capacity).toLocaleString()}g</TableCell>
                          <TableCell>{parseFloat(location.currentHoldings).toLocaleString()}g</TableCell>
                          <TableCell>{location.insuranceProvider || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={location.isActive ? "default" : "secondary"}>
                              {location.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfers" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  Vault Transfers
                </CardTitle>
                <CardDescription>Approve user requests to move gold between vault locations</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {vaultTransfers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No vault transfer requests</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vaultTransfers.map((transfer) => (
                        <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{transfer.user?.firstName} {transfer.user?.lastName}</p>
                              <p className="text-xs text-muted-foreground">{transfer.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{parseFloat(transfer.goldGrams).toFixed(3)}g</TableCell>
                          <TableCell>{transfer.fromLocation}</TableCell>
                          <TableCell>{transfer.toLocation}</TableCell>
                          <TableCell>${parseFloat(transfer.transferFeeUsd).toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(transfer.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {transfer.status === 'Pending' && (
                              <Button variant="ghost" size="sm" onClick={() => setSelectedTransfer(transfer)} data-testid={`button-view-transfer-${transfer.id}`}>
                                <Eye className="w-4 h-4 mr-1" /> Review
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gifts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Gold Gifts
                </CardTitle>
                <CardDescription>View all gold gift transactions between users</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {goldGifts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No gold gifts sent</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sender</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goldGifts.map((gift) => (
                        <TableRow key={gift.id} data-testid={`row-gift-${gift.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{gift.sender?.firstName} {gift.sender?.lastName}</p>
                              <p className="text-xs text-muted-foreground">{gift.sender?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p>{gift.recipientEmail}</p>
                            {gift.recipientUserId && (
                              <p className="text-xs text-muted-foreground">User #{gift.recipientUserId}</p>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{parseFloat(gift.goldGrams).toFixed(3)}g</TableCell>
                          <TableCell>${(parseFloat(gift.goldGrams) * parseFloat(gift.goldPriceUsdPerGram)).toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(gift.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(gift.expiresAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(gift.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insurance" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Insurance Certificates
                  </CardTitle>
                  <CardDescription>Vault insurance coverage documentation</CardDescription>
                </div>
                <Button onClick={() => setShowGenerateInsuranceDialog(true)} data-testid="button-generate-insurance">
                  <Plus className="w-4 h-4 mr-2" /> Generate Certificate
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {insuranceCerts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No insurance certificates</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Certificate #</TableHead>
                        <TableHead>Vault Location</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Valid From</TableHead>
                        <TableHead>Valid To</TableHead>
                        <TableHead>Document</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insuranceCerts.map((cert) => (
                        <TableRow key={cert.id} data-testid={`row-cert-${cert.id}`}>
                          <TableCell className="font-mono font-medium">{cert.certificateNumber}</TableCell>
                          <TableCell>{cert.vaultLocation?.name || cert.vaultLocationId}</TableCell>
                          <TableCell>{cert.provider}</TableCell>
                          <TableCell className="font-medium">${parseFloat(cert.coverageAmountUsd).toLocaleString()}</TableCell>
                          <TableCell>{new Date(cert.validFrom).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(cert.validTo).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {cert.documentUrl ? (
                              <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                View PDF
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconciliation" className="mt-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Digital Gold (Wallets)</p>
                      <p className="text-2xl font-bold text-primary">{reconciliation?.totalDigitalGold?.toFixed(3) || '0.000'}g</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Physical Gold (Bars)</p>
                      <p className="text-2xl font-bold text-green-600">{reconciliation?.totalPhysicalGold?.toFixed(3) || '0.000'}g</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Discrepancy</p>
                      <p className={`text-2xl font-bold ${(reconciliation?.discrepancy || 0) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {reconciliation?.discrepancy?.toFixed(3) || '0.000'}g
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Coverage Ratio</p>
                      <p className={`text-2xl font-bold ${(reconciliation?.coverageRatio || 0) >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {reconciliation?.coverageRatio?.toFixed(1) || '0.0'}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Reconciliation Report
                  </CardTitle>
                  <CardDescription>Physical vs digital gold balance comparison by vault location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Pending Deliveries</p>
                      <p className="text-xl font-bold">{reconciliation?.pendingDeliveries || 0}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Pending Transfers</p>
                      <p className="text-xl font-bold">{reconciliation?.pendingTransfers || 0}</p>
                    </div>
                  </div>

                  {reconciliation?.locationBreakdown && reconciliation.locationBreakdown.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vault Location</TableHead>
                          <TableHead className="text-right">Digital Gold</TableHead>
                          <TableHead className="text-right">Physical Gold</TableHead>
                          <TableHead className="text-right">Difference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reconciliation.locationBreakdown.map((loc, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{loc.location}</TableCell>
                            <TableCell className="text-right">{loc.digitalGold.toFixed(3)}g</TableCell>
                            <TableCell className="text-right">{loc.physicalGold.toFixed(3)}g</TableCell>
                            <TableCell className={`text-right font-medium ${loc.physicalGold - loc.digitalGold !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {(loc.physicalGold - loc.digitalGold).toFixed(3)}g
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No reconciliation data available</p>
                      <p className="text-sm">Add gold bars and vault locations to generate reports</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
                    <Label className="text-muted-foreground text-xs">Declared Weight</Label>
                    <p className="font-medium">{parseFloat(selectedDeposit.totalDeclaredWeightGrams).toFixed(3)}g</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Vault Location</Label>
                    <p>{selectedDeposit.vaultLocation}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Delivery Method</Label>
                    <p>{selectedDeposit.deliveryMethod}</p>
                  </div>
                </div>

                {!FINAL_STATUSES.includes(selectedDeposit.status as any) && selectedDeposit.status !== 'Rejected' && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Update Status</Label>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status..." />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPOSIT_STATUSES.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Verified Weight (grams)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={verifiedWeight}
                          onChange={(e) => setVerifiedWeight(e.target.value)}
                          placeholder={selectedDeposit.totalDeclaredWeightGrams}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Gold Price (USD/gram)</Label>
                        <RadioGroup value={goldPriceMode} onValueChange={(v) => setGoldPriceMode(v as 'live' | 'manual')}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="live" id="live" />
                            <Label htmlFor="live">Live Price: ${liveGoldPrice?.toFixed(2) || 'Loading...'}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manual" id="manual" />
                            <Label htmlFor="manual">Manual:</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={goldPrice}
                              onChange={(e) => setGoldPrice(e.target.value)}
                              className="w-32"
                              disabled={goldPriceMode !== 'manual'}
                            />
                          </div>
                        </RadioGroup>
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
                      <Button variant="outline" onClick={resetDepositForm}>Cancel</Button>
                      {selectedStatus && (
                        <Button onClick={handleUpdateStatus} disabled={processingId === selectedDeposit.id}>
                          Update Status
                        </Button>
                      )}
                      <Button variant="destructive" onClick={handleRejectDeposit} disabled={processingId === selectedDeposit.id || !rejectionReason}>
                        Reject
                      </Button>
                      <Button onClick={handleApproveDeposit} disabled={processingId === selectedDeposit.id} className="bg-green-600 hover:bg-green-700">
                        {processingId === selectedDeposit.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 mr-2" /> Approve & Store</>
                        )}
                      </Button>
                    </DialogFooter>
                  </>
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
                    <Label className="text-muted-foreground text-xs">Gold Amount</Label>
                    <p className="font-medium">{parseFloat(selectedWithdrawal.goldGrams).toFixed(3)}g</p>
                    <p className="text-xs text-muted-foreground">
                      ${(parseFloat(selectedWithdrawal.goldGrams) * parseFloat(selectedWithdrawal.goldPriceUsdPerGram)).toFixed(2)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground text-xs">Payout Method</Label>
                  <div className="mt-2 p-4 bg-muted rounded-lg">
                    {selectedWithdrawal.withdrawalMethod === 'Bank Transfer' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Building className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">Bank Transfer</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Bank:</span> {selectedWithdrawal.bankName}</div>
                          <div><span className="text-muted-foreground">Account:</span> {selectedWithdrawal.accountNumber}</div>
                          <div><span className="text-muted-foreground">IBAN:</span> {selectedWithdrawal.iban}</div>
                          <div><span className="text-muted-foreground">SWIFT:</span> {selectedWithdrawal.swiftCode}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Bitcoin className="w-5 h-5 text-purple-600" />
                          <span className="font-medium">Crypto</span>
                        </div>
                        <div className="text-sm">
                          <div><span className="text-muted-foreground">Network:</span> {selectedWithdrawal.cryptoNetwork}</div>
                          <div><span className="text-muted-foreground">Currency:</span> {selectedWithdrawal.cryptoCurrency}</div>
                          <div><span className="text-muted-foreground">Wallet:</span> <span className="font-mono">{selectedWithdrawal.walletAddress}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedWithdrawal.status === 'Pending' || selectedWithdrawal.status === 'Processing') && (
                  <>
                    <Separator />
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex gap-2 items-start">
                        <AlertCircle className="w-5 h-5 text-fuchsia-600 flex-shrink-0" />
                        <div className="text-sm text-fuchsia-800">
                          <p className="font-medium">Review Required</p>
                          <p className="mt-1">Verify the payout details carefully before approving.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Admin Notes</Label>
                        <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Internal notes..." rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Rejection Reason (if rejecting)</Label>
                        <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." rows={2} />
                      </div>
                    </div>
                    
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={resetWithdrawalForm}>Cancel</Button>
                      <Button variant="destructive" onClick={handleRejectWithdrawal} disabled={processingId === selectedWithdrawal.id || !rejectionReason}>
                        Reject
                      </Button>
                      <Button onClick={handleApproveWithdrawal} disabled={processingId === selectedWithdrawal.id} className="bg-green-600 hover:bg-green-700">
                        {processingId === selectedWithdrawal.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 mr-2" /> Approve & Disburse</>
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Physical Delivery Dialog */}
        <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Physical Delivery Details</DialogTitle>
            </DialogHeader>
            
            {selectedDelivery && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Reference</Label>
                    <p className="font-mono font-medium">{selectedDelivery.referenceNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedDelivery.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">User</Label>
                    <p className="font-medium">{selectedDelivery.user?.firstName} {selectedDelivery.user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{selectedDelivery.user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Gold Amount</Label>
                    <p className="font-medium">{parseFloat(selectedDelivery.goldGrams).toFixed(3)}g</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Delivery Address</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                    {typeof selectedDelivery.deliveryAddress === 'object' ? (
                      <div>
                        <p>{selectedDelivery.deliveryAddress.street}</p>
                        <p>{selectedDelivery.deliveryAddress.city}, {selectedDelivery.deliveryAddress.state}</p>
                        <p>{selectedDelivery.deliveryAddress.country} {selectedDelivery.deliveryAddress.postalCode}</p>
                      </div>
                    ) : (
                      <p>{selectedDelivery.deliveryAddress}</p>
                    )}
                  </div>
                </div>

                {(selectedDelivery.status === 'Pending' || selectedDelivery.status === 'Approved') && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Courier Name</Label>
                          <Input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="e.g., FedEx, DHL" />
                        </div>
                        <div className="space-y-2">
                          <Label>Tracking Number</Label>
                          <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Delivery (days)</Label>
                        <Input type="number" value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} placeholder="e.g., 5" />
                      </div>
                      <div className="space-y-2">
                        <Label>Admin Notes</Label>
                        <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Internal notes..." rows={2} />
                      </div>
                    </div>

                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => setSelectedDelivery(null)}>Cancel</Button>
                      {selectedDelivery.status === 'Pending' && (
                        <Button onClick={() => handleUpdateDeliveryStatus('Approved')} disabled={!!processingId}>
                          Approve Request
                        </Button>
                      )}
                      {selectedDelivery.status === 'Approved' && (
                        <Button onClick={() => handleUpdateDeliveryStatus('Shipped')} disabled={!!processingId || !trackingNumber || !courierName} className="bg-blue-600 hover:bg-blue-700">
                          <Send className="w-4 h-4 mr-2" /> Mark as Shipped
                        </Button>
                      )}
                    </DialogFooter>
                  </>
                )}

                {selectedDelivery.status === 'Shipped' && (
                  <DialogFooter>
                    <Button onClick={() => handleUpdateDeliveryStatus('Delivered')} disabled={!!processingId} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark as Delivered
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Transfer Review Dialog */}
        <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Vault Transfer</DialogTitle>
            </DialogHeader>
            
            {selectedTransfer && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">User</Label>
                    <p className="font-medium">{selectedTransfer.user?.firstName} {selectedTransfer.user?.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Gold Amount</Label>
                    <p className="font-medium">{parseFloat(selectedTransfer.goldGrams).toFixed(3)}g</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">From Location</Label>
                    <p>{selectedTransfer.fromLocation}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">To Location</Label>
                    <p>{selectedTransfer.toLocation}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Transfer Fee</Label>
                    <p className="font-medium">${parseFloat(selectedTransfer.transferFeeUsd).toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Admin Notes / Rejection Reason</Label>
                    <Textarea value={adminNotes || rejectionReason} onChange={(e) => { setAdminNotes(e.target.value); setRejectionReason(e.target.value); }} placeholder="Notes..." rows={2} />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setSelectedTransfer(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleRejectTransfer} disabled={!!processingId || !rejectionReason}>
                    Reject
                  </Button>
                  <Button onClick={handleApproveTransfer} disabled={!!processingId} className="bg-green-600 hover:bg-green-700">
                    {processingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Approve Transfer
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Gold Bar Dialog */}
        <Dialog open={showAddBarDialog} onOpenChange={setShowAddBarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Gold Bar to Inventory</DialogTitle>
              <DialogDescription>Enter the details of the physical gold bar</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input value={newBar.serialNumber} onChange={(e) => setNewBar({...newBar, serialNumber: e.target.value})} placeholder="e.g., AU-2024-001234" />
                </div>
                <div className="space-y-2">
                  <Label>Weight (grams)</Label>
                  <Input type="number" step="0.001" value={newBar.weightGrams} onChange={(e) => setNewBar({...newBar, weightGrams: e.target.value})} placeholder="e.g., 1000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purity</Label>
                  <Select value={newBar.purity} onValueChange={(v) => setNewBar({...newBar, purity: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="999.9">999.9 (24K)</SelectItem>
                      <SelectItem value="995">995</SelectItem>
                      <SelectItem value="916.7">916.7 (22K)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Refiner</Label>
                  <Input value={newBar.refiner} onChange={(e) => setNewBar({...newBar, refiner: e.target.value})} placeholder="e.g., PAMP Suisse" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vault Location</Label>
                  <Input value={newBar.vaultLocation} onChange={(e) => setNewBar({...newBar, vaultLocation: e.target.value})} placeholder="e.g., Dubai DMCC" />
                </div>
                <div className="space-y-2">
                  <Label>Zone (optional)</Label>
                  <Input value={newBar.zone} onChange={(e) => setNewBar({...newBar, zone: e.target.value})} placeholder="e.g., A-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Purchase Price (USD/gram)</Label>
                <Input type="number" step="0.01" value={newBar.purchasePricePerGram} onChange={(e) => setNewBar({...newBar, purchasePricePerGram: e.target.value})} placeholder="e.g., 65.50" />
              </div>
              <div className="space-y-2">
                <Label>Assay Certificate URL (optional)</Label>
                <Input value={newBar.assayCertificateUrl} onChange={(e) => setNewBar({...newBar, assayCertificateUrl: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={newBar.notes} onChange={(e) => setNewBar({...newBar, notes: e.target.value})} rows={2} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddBarDialog(false)}>Cancel</Button>
              <Button onClick={handleAddGoldBar} disabled={!newBar.serialNumber || !newBar.weightGrams || !newBar.refiner || !newBar.vaultLocation}>
                <Plus className="w-4 h-4 mr-2" /> Add Gold Bar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Vault Location Dialog */}
        <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vault Location</DialogTitle>
              <DialogDescription>Configure a new secure storage facility</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Location Name</Label>
                <Input value={newLocation.name} onChange={(e) => setNewLocation({...newLocation, name: e.target.value})} placeholder="e.g., Dubai DMCC Vault" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={newLocation.country} onChange={(e) => setNewLocation({...newLocation, country: e.target.value})} placeholder="e.g., UAE" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={newLocation.city} onChange={(e) => setNewLocation({...newLocation, city: e.target.value})} placeholder="e.g., Dubai" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={newLocation.address} onChange={(e) => setNewLocation({...newLocation, address: e.target.value})} placeholder="Full address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacity (grams)</Label>
                  <Input type="number" value={newLocation.capacity} onChange={(e) => setNewLocation({...newLocation, capacity: e.target.value})} placeholder="e.g., 100000" />
                </div>
                <div className="space-y-2">
                  <Label>Security Grade</Label>
                  <Select value={newLocation.securityGrade} onValueChange={(v) => setNewLocation({...newLocation, securityGrade: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AAA">AAA (Highest)</SelectItem>
                      <SelectItem value="AA">AA</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Insurance Provider (optional)</Label>
                <Input value={newLocation.insuranceProvider} onChange={(e) => setNewLocation({...newLocation, insuranceProvider: e.target.value})} placeholder="e.g., Lloyd's of London" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLocationDialog(false)}>Cancel</Button>
              <Button onClick={handleAddLocation} disabled={!newLocation.name || !newLocation.country || !newLocation.city || !newLocation.capacity}>
                <Plus className="w-4 h-4 mr-2" /> Add Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Fees Dialog */}
        <Dialog open={showGenerateFeesDialog} onOpenChange={setShowGenerateFeesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Monthly Storage Fees</DialogTitle>
              <DialogDescription>This will generate storage fee invoices for all users with vault holdings for the current month.</DialogDescription>
            </DialogHeader>
            
            <div className="p-4 bg-warning-muted rounded-lg">
              <div className="flex gap-2 items-start">
                <AlertCircle className="w-5 h-5 text-warning-muted-foreground flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Note</p>
                  <p>Fees are calculated based on average gold holdings during the billing period. Duplicate fees for the same period will not be created.</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateFeesDialog(false)}>Cancel</Button>
              <Button onClick={handleGenerateFees}>
                <RefreshCw className="w-4 h-4 mr-2" /> Generate Fees
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Insurance Certificate Dialog */}
        <Dialog open={showGenerateInsuranceDialog} onOpenChange={setShowGenerateInsuranceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Insurance Certificate</DialogTitle>
              <DialogDescription>Create a new insurance certificate for a vault location</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vault Location</Label>
                <Select value={newInsurance.vaultLocationId} onValueChange={(v) => setNewInsurance({...newInsurance, vaultLocationId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                  <SelectContent>
                    {vaultLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Insurance Provider</Label>
                <Input value={newInsurance.provider} onChange={(e) => setNewInsurance({...newInsurance, provider: e.target.value})} placeholder="e.g., Lloyd's of London" />
              </div>
              <div className="space-y-2">
                <Label>Coverage Amount (USD)</Label>
                <Input type="number" value={newInsurance.coverageAmountUsd} onChange={(e) => setNewInsurance({...newInsurance, coverageAmountUsd: e.target.value})} placeholder="e.g., 10000000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input type="date" value={newInsurance.validFrom} onChange={(e) => setNewInsurance({...newInsurance, validFrom: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Valid To</Label>
                  <Input type="date" value={newInsurance.validTo} onChange={(e) => setNewInsurance({...newInsurance, validTo: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Document URL (optional)</Label>
                <Input value={newInsurance.documentUrl} onChange={(e) => setNewInsurance({...newInsurance, documentUrl: e.target.value})} placeholder="https://..." />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateInsuranceDialog(false)}>Cancel</Button>
              <Button onClick={handleGenerateInsurance} disabled={!newInsurance.vaultLocationId || !newInsurance.provider || !newInsurance.coverageAmountUsd}>
                <Shield className="w-4 h-4 mr-2" /> Generate Certificate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
