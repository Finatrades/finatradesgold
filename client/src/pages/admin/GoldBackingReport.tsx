import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Vault,
  Wallet,
  FileCheck,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  User,
  X,
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  Clock,
  CreditCard,
  Building,
  Download,
  Printer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GoldBackingReport {
  physicalGold: { 
    totalGrams: number; 
    holdings: Array<{
      id: string;
      userId: string;
      goldGrams: number;
      vaultLocation: string;
      isPhysicallyDeposited: boolean;
    }>;
    byLocation?: Record<string, number>;
  };
  customerLiabilities: {
    totalGrams: number;
    wallets?: { count: number; totalGrams: number };
    bnslWallets?: { count: number; availableGrams: number; lockedGrams: number };
    mpgw?: { totalGrams: number; available: number; pending: number; lockedBnsl: number; reservedTrade: number; count: number };
    fpgw?: { totalGrams: number; available: number; pending: number; lockedBnsl: number; reservedTrade: number; count: number };
    bnsl?: { count: number; availableGrams: number; lockedGrams: number };
  };
  certificates: { total: number; byStatus: Record<string, number>; byType?: Record<string, number> };
  backing: {
    overallRatio: number;
    overallSurplus: number;
    mpgwRatio: number;
    mpgwSurplus: number;
    fpgwRatio: number;
    fpgwSurplus: number;
  };
  compliance?: {
    lastReconciliationDate: string | null;
    totalReconciliations: number;
    pendingReviews: number;
    digitalCertificates: number;
    physicalCertificates: number;
  };
  generatedAt?: string;
}

interface EnhancedGoldBackingReport {
  physicalGold: { 
    totalGrams: number; 
    holdings: any[];
    byLocation: Record<string, number>;
  };
  customerLiabilities: {
    totalGrams: number;
    mpgw: { totalGrams: number; available: number; pending: number; lockedBnsl: number; reservedTrade: number; count: number };
    fpgw: { totalGrams: number; available: number; pending: number; lockedBnsl: number; reservedTrade: number; count: number; weightedAvgPriceUsd: number };
    bnsl: { count: number; availableGrams: number; lockedGrams: number };
  };
  certificates: { total: number; byStatus: Record<string, number>; byType: Record<string, number> };
  backing: {
    overallRatio: number;
    overallSurplus: number;
    mpgwRatio: number;
    mpgwSurplus: number;
    fpgwRatio: number;
    fpgwSurplus: number;
  };
  compliance: {
    lastReconciliationDate: string | null;
    totalReconciliations: number;
    pendingReviews: number;
    digitalCertificates: number;
    physicalCertificates: number;
  };
  generatedAt: string;
}

interface UserHolding {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  finatradesId: string | null;
  goldGrams?: number;
  availableGoldGrams?: number;
  lockedGoldGrams?: number;
  totalGoldGrams?: number;
  kycStatus?: string;
  accountType?: string;
  certificateNumber?: string;
  status?: string;
}

interface UserFinancialProfile {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    finatradesId: string | null;
    phoneNumber: string | null;
    kycStatus: string;
    accountType: string;
    createdAt: string;
    country: string | null;
  };
  finapayWallet: { goldGrams: number; usdBalance: number } | null;
  bnslWallet: { availableGoldGrams: number; lockedGoldGrams: number } | null;
  vaultHoldings: any[];
  certificates: any[];
  recentTransactions: any[];
  kycSubmission: any | null;
}

type ModalType = 'finapay' | 'bnsl' | 'vault' | null;

export default function GoldBackingReport() {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedVaultLocation, setSelectedVaultLocation] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const [reportMode, setReportMode] = useState<'summary' | 'segmented'>('summary');

  const { data, isLoading, refetch, isFetching } = useQuery<GoldBackingReport>({
    queryKey: ['/api/admin/gold-backing-report'],
    refetchInterval: 60000,
  });

  const { data: enhancedData, isLoading: isLoadingEnhanced, refetch: refetchEnhanced } = useQuery<EnhancedGoldBackingReport>({
    queryKey: ['/api/admin/gold-backing-report/enhanced'],
    refetchInterval: 60000,
  });

  const { data: finapayUsers, isLoading: loadingFinapay } = useQuery<{ users: UserHolding[] }>({
    queryKey: ['/api/admin/gold-backing/finapay-users'],
    enabled: modalType === 'finapay',
  });

  const { data: bnslUsers, isLoading: loadingBnsl } = useQuery<{ users: UserHolding[] }>({
    queryKey: ['/api/admin/gold-backing/bnsl-users'],
    enabled: modalType === 'bnsl',
  });

  const { data: vaultUsers, isLoading: loadingVault } = useQuery<{ users: UserHolding[] }>({
    queryKey: ['/api/admin/gold-backing/vault-location', selectedVaultLocation],
    enabled: modalType === 'vault' && !!selectedVaultLocation,
  });

  const { data: userProfile, isLoading: loadingProfile } = useQuery<UserFinancialProfile>({
    queryKey: ['/api/admin/gold-backing/user', selectedUserId],
    enabled: !!selectedUserId,
  });

  const formatGrams = (grams: number | string | null | undefined) => {
    const num = typeof grams === 'string' ? parseFloat(grams) : (grams ?? 0);
    return (isNaN(num) ? 0 : num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const safeNumber = (val: number | string | null | undefined): number => {
    if (val === null || val === undefined) return 0;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  };

  const getBackingStatus = (ratio: number) => {
    if (ratio >= 100) return { status: 'fully-backed', label: 'Fully Backed', color: 'green', icon: CheckCircle };
    if (ratio >= 90) return { status: 'mostly-backed', label: 'Mostly Backed', color: 'yellow', icon: AlertTriangle };
    return { status: 'under-backed', label: 'Under-Backed', color: 'red', icon: XCircle };
  };

  const getKycBadgeColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Pending Review': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleOpenUserList = (type: ModalType, vaultLocation?: string) => {
    setModalType(type);
    setSelectedVaultLocation(vaultLocation || null);
    setSelectedUserId(null);
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleBack = () => {
    setSelectedUserId(null);
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedVaultLocation(null);
    setSelectedUserId(null);
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/admin/gold-backing-report/pdf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gold-backing-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: 'Download Complete',
        description: 'Gold backing report PDF has been downloaded.',
      });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to generate PDF report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    refetch();
    refetchEnhanced();
  };

  const backingStatus = data ? getBackingStatus(data.backing.overallRatio) : null;
  const StatusIcon = backingStatus?.icon || AlertTriangle;
  
  const enhancedBackingStatus = enhancedData ? getBackingStatus(enhancedData.backing.overallRatio) : null;
  const EnhancedStatusIcon = enhancedBackingStatus?.icon || AlertTriangle;

  const currentUsers = modalType === 'finapay' ? finapayUsers?.users :
                       modalType === 'bnsl' ? bnslUsers?.users :
                       modalType === 'vault' ? vaultUsers?.users : [];

  const isLoadingUsers = modalType === 'finapay' ? loadingFinapay :
                         modalType === 'bnsl' ? loadingBnsl :
                         modalType === 'vault' ? loadingVault : false;

  const modalTitle = modalType === 'finapay' ? 'LGPW Holders (Live Gold Price Wallet)' :
                     modalType === 'bnsl' ? 'BNSL Account Holders' :
                     modalType === 'vault' ? `Vault: ${selectedVaultLocation}` : '';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Gold Backing Report
            </h1>
            <p className="text-gray-500 mt-1">
              Compare vault holdings against customer liabilities to ensure full gold backing
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleDownloadPDF} 
              variant="outline" 
              disabled={isDownloading || !data}
              data-testid="button-download-pdf"
            >
              <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-pulse' : ''}`} />
              {isDownloading ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button 
              onClick={handlePrint} 
              variant="outline" 
              disabled={!data}
              data-testid="button-print-report"
              className="print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              disabled={isFetching || isLoadingEnhanced}
              data-testid="button-refresh-report"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(isFetching || isLoadingEnhanced) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={reportMode} onValueChange={(v) => setReportMode(v as 'summary' | 'segmented')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="summary" data-testid="tab-summary">Summary View</TabsTrigger>
            <TabsTrigger value="segmented" data-testid="tab-segmented">LGPW / FPGW Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-gray-200 rounded w-3/4 mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : data ? (
              <>
                <Card 
                  data-testid="card-backing-status"
                  className={`border-2 ${
                    backingStatus?.color === 'green' ? 'border-green-200 bg-green-50' :
                    backingStatus?.color === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
                    'border-red-200 bg-red-50'
                  }`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <StatusIcon className={`h-12 w-12 ${
                          backingStatus?.color === 'green' ? 'text-green-600' :
                          backingStatus?.color === 'yellow' ? 'text-yellow-600' :
                          'text-red-600'
                        }`} />
                        <div>
                          <h2 className="text-2xl font-bold" data-testid="text-backing-status">{backingStatus?.label}</h2>
                          <p className="text-gray-600" data-testid="text-backing-ratio">
                            {data.backing.overallRatio.toFixed(2)}% of customer gold is backed by physical holdings
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold" data-testid="text-surplus">
                          {data.backing.overallSurplus >= 0 ? (
                            <span className="text-green-600 flex items-center gap-2">
                              <TrendingUp className="h-6 w-6" />
                              +{formatGrams(data.backing.overallSurplus)}g
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-2">
                              <TrendingDown className="h-6 w-6" />
                              {formatGrams(Math.abs(data.backing.overallSurplus))}g
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {data.backing.overallSurplus >= 0 ? 'Surplus' : 'Deficit'}
                        </p>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(data.backing.overallRatio, 100)} 
                      className="mt-4 h-3"
                      data-testid="progress-backing-ratio"
                    />
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2 mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Vault className="h-5 w-5 text-purple-600" />
                        Physical Gold in Vault
                      </CardTitle>
                      <Badge variant="outline" className="bg-purple-50">
                        {data.physicalGold.holdings.length} Holdings
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600" data-testid="text-physical-gold">
                        {formatGrams(data.physicalGold.totalGrams)}g
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Total physical gold stored</p>
                      
                      {data.physicalGold.holdings.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                          {data.physicalGold.holdings.map((holding) => (
                            <button
                              key={holding.id}
                              onClick={() => handleOpenUserList('vault', holding.vaultLocation)}
                              className="w-full flex justify-between items-center text-sm border-b pb-2 hover:bg-purple-50 p-2 rounded transition-colors cursor-pointer"
                              data-testid={`button-vault-${holding.id}`}
                            >
                              <span className="text-gray-600 flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                {holding.vaultLocation}
                              </span>
                              <span className="font-medium flex items-center gap-2">
                                {formatGrams(holding.goldGrams)}g
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        Customer Liabilities
                      </CardTitle>
                      <Badge variant="outline" className="bg-blue-50">
                        {(data.customerLiabilities.mpgw?.count || 0) + (data.customerLiabilities.bnsl?.count || 0)} Accounts
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600" data-testid="text-liabilities">
                        {formatGrams(data.customerLiabilities.totalGrams)}g
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Total gold owed to customers</p>
                      
                      <div className="mt-4 space-y-2">
                        {/* LGPW - Live Gold Price Wallet */}
                        <button
                          onClick={() => handleOpenUserList('finapay')}
                          className="w-full flex justify-between items-center p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer border border-blue-200"
                          data-testid="button-mpgw-users"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">LGPW</span>
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Market Price</Badge>
                              </div>
                              <p className="text-xs text-gray-500">
                                {data.customerLiabilities.mpgw?.count || 0} accounts
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600">
                              {formatGrams(data.customerLiabilities.mpgw?.totalGrams || 0)}g
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </button>

                        {/* FPGW - Fixed Price Gold Wallet */}
                        <button
                          onClick={() => handleOpenUserList('finapay')}
                          className="w-full flex justify-between items-center p-3 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer border border-amber-200"
                          data-testid="button-fpgw-users"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Shield className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">FPGW</span>
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Fixed Price</Badge>
                              </div>
                              <p className="text-xs text-gray-500">
                                {enhancedData?.customerLiabilities?.fpgw?.count || 0} accounts
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <div>
                              <span className="font-bold text-amber-600">
                                {formatGrams(enhancedData?.customerLiabilities?.fpgw?.totalGrams || 0)}g
                              </span>
                              {enhancedData?.customerLiabilities?.fpgw?.weightedAvgPriceUsd ? (
                                <p className="text-xs text-gray-400">
                                  @ ${enhancedData.customerLiabilities.fpgw.weightedAvgPriceUsd.toFixed(2)}/g avg
                                </p>
                              ) : null}
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </button>

                        {/* BNSL Accounts */}
                        <button
                          onClick={() => handleOpenUserList('bnsl')}
                          className="w-full flex justify-between items-center p-3 rounded-lg hover:bg-green-50 transition-colors cursor-pointer border border-green-200"
                          data-testid="button-bnsl-users"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Clock className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="text-left">
                              <span className="text-sm font-medium text-gray-900">BNSL Accounts</span>
                              <p className="text-xs text-gray-500">{data.customerLiabilities.bnsl?.count || 0} accounts</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <div>
                              <span className="font-bold text-green-600">
                                {formatGrams((data.customerLiabilities.bnsl?.availableGrams || 0) + (data.customerLiabilities.bnsl?.lockedGrams || 0))}g
                              </span>
                              <p className="text-xs text-gray-400">
                                {formatGrams(data.customerLiabilities.bnsl?.lockedGrams || 0)}g locked
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-orange-600" />
                      Certificates Overview
                    </CardTitle>
                    <CardDescription>
                      Gold storage and ownership certificates issued
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold" data-testid="text-total-certificates">{data.certificates.total}</div>
                      <span className="text-gray-500">Total Certificates</span>
                    </div>
                    {Object.keys(data.certificates.byStatus).length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.entries(data.certificates.byStatus).map(([status, count]) => (
                          <Badge 
                            key={status} 
                            variant="outline"
                            className="capitalize"
                          >
                            {status}: {count}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="text-xs text-gray-400 text-center mt-4">
                  Report generated at {format(new Date(), 'PPpp')}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <AlertTriangle className="h-12 w-12 text-yellow-500" />
                    <p className="text-gray-500">Unable to load gold backing report. Please try again.</p>
                    <Button variant="outline" onClick={handleRefresh} data-testid="button-retry-report">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="segmented">
            {isLoadingEnhanced ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-gray-200 rounded w-3/4 mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : enhancedData ? (
              <>
                <Card 
                  data-testid="card-enhanced-backing-status"
                  className={`border-2 mb-6 ${
                  enhancedBackingStatus?.color === 'green' ? 'border-green-200 bg-green-50' :
                  enhancedBackingStatus?.color === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
                  'border-red-200 bg-red-50'
                }`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <EnhancedStatusIcon className={`h-12 w-12 ${
                          enhancedBackingStatus?.color === 'green' ? 'text-green-600' :
                          enhancedBackingStatus?.color === 'yellow' ? 'text-yellow-600' :
                          'text-red-600'
                        }`} />
                        <div>
                          <h2 className="text-2xl font-bold" data-testid="text-enhanced-backing-status">{enhancedBackingStatus?.label}</h2>
                          <p className="text-gray-600" data-testid="text-enhanced-backing-ratio">
                            {enhancedData.backing.overallRatio.toFixed(2)}% of customer gold is backed by physical holdings
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold" data-testid="text-enhanced-surplus">
                          {enhancedData.backing.overallSurplus >= 0 ? (
                            <span className="text-green-600 flex items-center gap-2">
                              <TrendingUp className="h-6 w-6" />
                              +{formatGrams(enhancedData.backing.overallSurplus)}g
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-2">
                              <TrendingDown className="h-6 w-6" />
                              {formatGrams(Math.abs(enhancedData.backing.overallSurplus))}g
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {enhancedData.backing.overallSurplus >= 0 ? 'Surplus' : 'Deficit'}
                        </p>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(enhancedData.backing.overallRatio, 100)} 
                      className="mt-4 h-3"
                      data-testid="progress-enhanced-backing-ratio"
                    />
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2 mb-6">
                  <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-amber-600" />
                        LGPW (Live Gold Price Wallet)
                      </CardTitle>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700">
                        {enhancedData.customerLiabilities.mpgw.count} Users
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600" data-testid="text-mpgw-total">
                        {formatGrams(enhancedData.customerLiabilities.mpgw.totalGrams)}g
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Gold valued at live market price</p>
                      
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Available</span>
                          <span className="font-medium text-green-600">{formatGrams(enhancedData.customerLiabilities.mpgw.available)}g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Pending</span>
                          <span className="font-medium text-yellow-600">{formatGrams(enhancedData.customerLiabilities.mpgw.pending)}g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Locked (BNSL)</span>
                          <span className="font-medium text-orange-600">{formatGrams(enhancedData.customerLiabilities.mpgw.lockedBnsl)}g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Reserved (Trade)</span>
                          <span className="font-medium text-blue-600">{formatGrams(enhancedData.customerLiabilities.mpgw.reservedTrade)}g</span>
                        </div>
                      </div>

                      <Separator className="my-4" />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Backing Ratio</span>
                        <div className="flex items-center gap-2">
                          <Badge className={enhancedData.backing.mpgwRatio >= 100 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {enhancedData.backing.mpgwRatio.toFixed(2)}%
                          </Badge>
                          {enhancedData.backing.mpgwSurplus >= 0 ? (
                            <span className="text-xs text-green-600">+{formatGrams(enhancedData.backing.mpgwSurplus)}g</span>
                          ) : (
                            <span className="text-xs text-red-600">{formatGrams(enhancedData.backing.mpgwSurplus)}g</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        FPGW (Fixed Price Gold Wallet)
                      </CardTitle>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        {enhancedData.customerLiabilities.fpgw.count} Users
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600" data-testid="text-fpgw-total">
                        {formatGrams(enhancedData.customerLiabilities.fpgw.totalGrams)}g
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Gold value locked at purchase price</p>
                      
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Available</span>
                          <span className="font-medium text-green-600">{formatGrams(enhancedData.customerLiabilities.fpgw.available)}g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Pending</span>
                          <span className="font-medium text-yellow-600">{formatGrams(enhancedData.customerLiabilities.fpgw.pending)}g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Locked (BNSL)</span>
                          <span className="font-medium text-orange-600">{formatGrams(enhancedData.customerLiabilities.fpgw.lockedBnsl)}g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Reserved (Trade)</span>
                          <span className="font-medium text-blue-600">{formatGrams(enhancedData.customerLiabilities.fpgw.reservedTrade)}g</span>
                        </div>
                      </div>

                      <Separator className="my-4" />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Weighted Avg Price</span>
                          <span className="font-medium">${enhancedData.customerLiabilities.fpgw.weightedAvgPriceUsd.toFixed(2)}/g</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Backing Ratio</span>
                          <div className="flex items-center gap-2">
                            <Badge className={enhancedData.backing.fpgwRatio >= 100 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                              {enhancedData.backing.fpgwRatio.toFixed(2)}%
                            </Badge>
                            {enhancedData.backing.fpgwSurplus >= 0 ? (
                              <span className="text-xs text-green-600">+{formatGrams(enhancedData.backing.fpgwSurplus)}g</span>
                            ) : (
                              <span className="text-xs text-red-600">{formatGrams(enhancedData.backing.fpgwSurplus)}g</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-3 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Vault className="h-4 w-4 text-purple-600" />
                        Physical Gold by Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600 mb-4">
                        {formatGrams(enhancedData.physicalGold.totalGrams)}g
                      </div>
                      <div className="space-y-2">
                        {Object.entries(enhancedData.physicalGold.byLocation).map(([location, grams]) => (
                          <div key={location} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                            <span className="text-gray-600">{location}</span>
                            <span className="font-medium">{formatGrams(grams)}g</span>
                          </div>
                        ))}
                        {Object.keys(enhancedData.physicalGold.byLocation).length === 0 && (
                          <p className="text-gray-400 text-sm">No vault holdings</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        BNSL Liabilities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600 mb-4">
                        {formatGrams(safeNumber(enhancedData.customerLiabilities.bnsl.availableGrams) + safeNumber(enhancedData.customerLiabilities.bnsl.lockedGrams))}g
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Available</span>
                          <span className="font-medium text-green-600">{formatGrams(enhancedData.customerLiabilities.bnsl.availableGrams)}g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Locked</span>
                          <span className="font-medium text-orange-600">{formatGrams(enhancedData.customerLiabilities.bnsl.lockedGrams)}g</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Accounts</span>
                          <Badge variant="outline">{enhancedData.customerLiabilities.bnsl.count}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-orange-600" />
                        Compliance Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Last Reconciliation</span>
                          <span className="font-medium">
                            {enhancedData.compliance.lastReconciliationDate 
                              ? format(new Date(enhancedData.compliance.lastReconciliationDate), 'PP')
                              : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Reconciliations</span>
                          <Badge variant="outline">{enhancedData.compliance.totalReconciliations}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Pending Reviews</span>
                          <Badge variant={enhancedData.compliance.pendingReviews > 0 ? 'destructive' : 'outline'}>
                            {enhancedData.compliance.pendingReviews}
                          </Badge>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Digital Certificates</span>
                          <span className="font-medium">{enhancedData.compliance.digitalCertificates}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Physical Certificates</span>
                          <span className="font-medium">{enhancedData.compliance.physicalCertificates}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-orange-600" />
                      Certificates Overview
                    </CardTitle>
                    <CardDescription>
                      Gold storage and ownership certificates by status and type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">By Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(enhancedData.certificates.byStatus).map(([status, count]) => (
                            <Badge key={status} variant="outline" className="capitalize">
                              {status}: {count}
                            </Badge>
                          ))}
                          {Object.keys(enhancedData.certificates.byStatus).length === 0 && (
                            <span className="text-gray-400 text-sm">No certificates</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">By Type</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(enhancedData.certificates.byType).map(([type, count]) => (
                            <Badge key={type} variant="secondary" className="capitalize">
                              {type}: {count}
                            </Badge>
                          ))}
                          {Object.keys(enhancedData.certificates.byType).length === 0 && (
                            <span className="text-gray-400 text-sm">No certificates</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-xs text-gray-400 text-center">
                  Enhanced report generated at {enhancedData.generatedAt ? format(new Date(enhancedData.generatedAt), 'PPpp') : format(new Date(), 'PPpp')}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <AlertTriangle className="h-12 w-12 text-yellow-500" />
                    <p className="text-gray-500">Unable to load enhanced gold backing report. Please try again.</p>
                    <Button variant="outline" onClick={handleRefresh} data-testid="button-retry-enhanced-report">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={modalType !== null} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              {selectedUserId && (
                <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle className="flex items-center gap-2">
                {selectedUserId && userProfile ? (
                  <>
                    <User className="h-5 w-5" />
                    {userProfile.user.firstName} {userProfile.user.lastName}
                  </>
                ) : (
                  <>
                    {modalType === 'finapay' && <CreditCard className="h-5 w-5 text-blue-600" />}
                    {modalType === 'bnsl' && <Clock className="h-5 w-5 text-green-600" />}
                    {modalType === 'vault' && <Building className="h-5 w-5 text-purple-600" />}
                    {modalTitle}
                  </>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[calc(85vh-100px)] pr-4">
            {selectedUserId ? (
              loadingProfile ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : userProfile ? (
                <UserProfileView profile={userProfile} formatGrams={formatGrams} getKycBadgeColor={getKycBadgeColor} />
              ) : (
                <p className="text-center text-gray-500 py-8">User not found</p>
              )
            ) : (
              isLoadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : currentUsers && currentUsers.length > 0 ? (
                <div className="space-y-2">
                  {currentUsers.map((user, idx) => (
                    <UserListItem 
                      key={user.userId} 
                      user={user} 
                      modalType={modalType!} 
                      onSelect={handleSelectUser}
                      formatGrams={formatGrams}
                      getKycBadgeColor={getKycBadgeColor}
                      index={idx}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No users found</p>
              )
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function UserListItem({ 
  user, 
  modalType, 
  onSelect, 
  formatGrams,
  getKycBadgeColor,
  index
}: { 
  user: UserHolding; 
  modalType: ModalType; 
  onSelect: (userId: string) => void;
  formatGrams: (grams: number | string | null | undefined) => string;
  getKycBadgeColor: (status: string) => string;
  index: number;
}) {
  const holdingAmount = modalType === 'finapay' ? user.goldGrams :
                        modalType === 'bnsl' ? user.totalGoldGrams :
                        user.goldGrams;

  return (
    <button
      onClick={() => onSelect(user.userId)}
      className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
      data-testid={`button-user-${user.userId}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
        </div>
        <div className="text-left">
          <div className="font-medium text-gray-900">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span>{user.email}</span>
            {user.finatradesId && (
              <Badge variant="outline" className="text-xs">{user.finatradesId}</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user.kycStatus && (
          <Badge className={getKycBadgeColor(user.kycStatus)}>{user.kycStatus}</Badge>
        )}
        <div className="text-right">
          <div className="font-bold text-lg">{formatGrams(holdingAmount || 0)}g</div>
          {modalType === 'bnsl' && user.lockedGoldGrams !== undefined && user.lockedGoldGrams > 0 && (
            <div className="text-xs text-gray-500">{formatGrams(user.lockedGoldGrams)}g locked</div>
          )}
          {modalType === 'vault' && user.certificateNumber && (
            <div className="text-xs text-gray-500">{user.certificateNumber}</div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>
    </button>
  );
}

function UserProfileView({ 
  profile, 
  formatGrams,
  getKycBadgeColor
}: { 
  profile: UserFinancialProfile; 
  formatGrams: (grams: number | string | null | undefined) => string;
  getKycBadgeColor: (status: string) => string;
}) {
  const { user, finapayWallet, bnslWallet, vaultHoldings, certificates, recentTransactions, kycSubmission } = profile;
  
  const totalGold = (finapayWallet?.goldGrams || 0) + 
                    (bnslWallet?.availableGoldGrams || 0) + 
                    (bnslWallet?.lockedGoldGrams || 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold" data-testid="text-user-name">
                  {user.firstName} {user.lastName}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
                {user.phoneNumber && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="h-4 w-4" />
                    {user.phoneNumber}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              {user.finatradesId && (
                <Badge variant="outline" className="mb-2">{user.finatradesId}</Badge>
              )}
              <Badge className={getKycBadgeColor(user.kycStatus)}>{user.kycStatus}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Account Type</span>
              <p className="font-medium capitalize">{user.accountType}</p>
            </div>
            <div>
              <span className="text-gray-500">Country</span>
              <p className="font-medium">{user.country || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-gray-500">Member Since</span>
              <p className="font-medium">{format(new Date(user.createdAt), 'PP')}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Gold Holdings</span>
              <p className="font-bold text-purple-600">{formatGrams(totalGold)}g</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="holdings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="holdings" data-testid="tab-holdings">Holdings</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="certificates" data-testid="tab-certificates">Certificates</TabsTrigger>
          <TabsTrigger value="kyc" data-testid="tab-kyc">KYC</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  LGPW (Market Price)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {finapayWallet ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gold Balance</span>
                      <span className="font-bold text-blue-600" data-testid="text-finapay-gold">
                        {formatGrams(finapayWallet.goldGrams)}g
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">USD Balance</span>
                      <span className="font-medium">${finapayWallet.usdBalance.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No LGPW wallet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  BNSL Wallet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bnslWallet ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Available</span>
                      <span className="font-bold text-green-600" data-testid="text-bnsl-available">
                        {formatGrams(bnslWallet.availableGoldGrams)}g
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Locked</span>
                      <span className="font-medium text-orange-600">{formatGrams(bnslWallet.lockedGoldGrams)}g</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No BNSL wallet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {vaultHoldings.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Vault className="h-4 w-4 text-purple-600" />
                  Vault Holdings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {vaultHoldings.map((holding: any) => (
                    <div key={holding.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{holding.vaultLocation}</span>
                      <span className="font-medium">{formatGrams(holding.goldGrams)}g</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{tx.type}</Badge>
                          <Badge variant={tx.status === 'Completed' ? 'default' : 'secondary'} className="text-xs">
                            {tx.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(tx.createdAt), 'PPp')}
                        </p>
                      </div>
                      <div className="text-right">
                        {tx.amountGold > 0 && <div className="font-medium">{formatGrams(tx.amountGold)}g</div>}
                        {tx.amountUsd > 0 && <div className="text-sm text-gray-500">${tx.amountUsd.toFixed(2)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No transactions found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              {certificates.length > 0 ? (
                <div className="space-y-2">
                  {certificates.map((cert: any) => (
                    <div key={cert.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{cert.certificateNumber}</div>
                        <div className="text-xs text-gray-500">{cert.vaultLocation}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatGrams(cert.goldGrams)}g</div>
                        <Badge variant="outline" className="text-xs">{cert.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No certificates found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                KYC Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kycSubmission ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p className="font-medium">{kycSubmission.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Tier</span>
                      <p className="font-medium capitalize">{kycSubmission.tier?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Full Name</span>
                      <p className="font-medium">{kycSubmission.fullName || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Nationality</span>
                      <p className="font-medium">{kycSubmission.nationality || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No KYC submission found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
