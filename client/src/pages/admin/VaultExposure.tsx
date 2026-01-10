import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  RefreshCw, 
  Scale, 
  Vault,
  Building2,
  Wallet,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Coins
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ExposureData {
  mpgw: {
    totalGrams: string;
    availableGrams: string;
    pendingGrams: string;
    lockedGrams: string;
    reservedGrams: string;
    valueUsd: string;
    userCount: number;
  };
  fpgw: {
    totalGrams: string;
    availableGrams: string;
    pendingGrams: string;
    lockedGrams: string;
    weightedAvgPrice: string;
    lockedValueUsd: string;
    userCount: number;
  };
  coverage: {
    mpgwRatio: number;
    fpgwRatio: number;
    isMpgwFullyBacked: boolean;
    isFpgwFullyBacked: boolean;
  };
  physical: {
    totalGrams: string;
    valueUsd: string;
    barCount: number;
  };
  cashSafety: {
    balanceUsd: string;
    fpgwLockedValueUsd: string;
  };
  alerts: {
    activeCount: number;
    pendingConversions: number;
  };
  timestamp: string;
}

interface ConversionRequest {
  id: string;
  userId: string;
  direction: 'LGPW_TO_FGPW' | 'FGPW_TO_LGPW' | 'mpgw_to_fpgw' | 'fpgw_to_mpgw';
  goldGrams: string;
  spotPriceUsdPerGram?: string;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reason?: string;
  adminNotes?: string;
  rejectionReason?: string;
  userName?: string;
  userEmail?: string;
}

interface CashLedgerEntry {
  id: string;
  entryType: string;
  amountUsd: string;
  direction: 'credit' | 'debit';
  runningBalanceUsd: string;
  conversionId?: string;
  userId?: string;
  bankReference?: string;
  notes?: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

interface CashLedgerResponse {
  entries: CashLedgerEntry[];
  currentBalance: string;
  stats: {
    totalCredits: string;
    totalDebits: string;
    entryCount: number;
  };
}

export default function VaultExposure() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversion, setSelectedConversion] = React.useState<ConversionRequest | null>(null);
  const [adminNotes, setAdminNotes] = React.useState('');
  const [showApproveDialog, setShowApproveDialog] = React.useState(false);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);

  const { data: exposure, isLoading: exposureLoading, refetch: refetchExposure, isFetching } = useQuery<ExposureData>({
    queryKey: ['/api/admin/vault-exposure/dashboard'],
    refetchInterval: 60000,
  });

  const { data: pendingConversions, isLoading: conversionsLoading } = useQuery<{ conversions: ConversionRequest[] }>({
    queryKey: ['/api/admin/vault-exposure/conversions?status=pending'],
    refetchInterval: 30000,
  });

  const { data: allConversions } = useQuery<{ conversions: ConversionRequest[] }>({
    queryKey: ['/api/admin/vault-exposure/conversions'],
  });

  const { data: cashLedger } = useQuery<CashLedgerResponse>({
    queryKey: ['/api/admin/vault-exposure/cash-ledger'],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest('POST', `/api/admin/vault-exposure/conversions/${id}/approve`, { adminNotes: notes });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Conversion approved', description: 'The conversion has been processed successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vault-exposure/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vault-exposure/conversions?status=pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vault-exposure/conversions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vault-exposure/cash-ledger'] });
      setShowApproveDialog(false);
      setSelectedConversion(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to approve conversion', variant: 'destructive' });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest('POST', `/api/admin/vault-exposure/conversions/${id}/reject`, { reason: notes });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Conversion rejected', description: 'The conversion has been rejected.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vault-exposure/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vault-exposure/conversions?status=pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vault-exposure/conversions'] });
      setShowRejectDialog(false);
      setSelectedConversion(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to reject conversion', variant: 'destructive' });
    }
  });

  const formatGrams = (grams: string | number | undefined) => {
    const value = typeof grams === 'string' ? parseFloat(grams) : (grams || 0);
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const formatUsd = (usd: string | number | undefined) => {
    const value = typeof usd === 'string' ? parseFloat(usd) : (usd || 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const isMpgwToFpgw = (direction: string) => {
    return direction.toUpperCase() === 'LGPW_TO_FGPW';
  };

  const formatDirection = (direction: string) => {
    return isMpgwToFpgw(direction) ? 'LGPW → FGPW' : 'FGPW → LGPW';
  };

  const mpgwTotal = parseFloat(exposure?.mpgw?.totalGrams || '0');
  const fpgwTotal = parseFloat(exposure?.fpgw?.totalGrams || '0');
  const physicalInventory = parseFloat(exposure?.physical?.totalGrams || '0');
  const cashBalance = parseFloat(exposure?.cashSafety?.balanceUsd || '0');
  const fpgwLockedValueUsd = parseFloat(exposure?.fpgw?.lockedValueUsd || '0');
  const fpgwAvgPrice = parseFloat(exposure?.fpgw?.weightedAvgPrice || '0');
  const mpgwUserCount = exposure?.mpgw?.userCount || 0;
  const fpgwUserCount = exposure?.fpgw?.userCount || 0;

  const totalDigitalLiability = mpgwTotal + fpgwTotal;
  const physicalCoverage = totalDigitalLiability > 0 ? (physicalInventory / totalDigitalLiability) * 100 : 100;
  const mpgwCoverage = mpgwTotal > 0 ? (physicalInventory / mpgwTotal) * 100 : 100;
  const fpgwCoverage = fpgwLockedValueUsd > 0 ? (cashBalance / fpgwLockedValueUsd) * 100 : 100;
  const isMpgwFullyBacked = mpgwCoverage >= 100;
  const isFpgwFullyBacked = fpgwCoverage >= 100;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Platform Exposure Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              LGPW (Physical Gold) vs FGPW (Cash-Backed) wallet exposure management
            </p>
          </div>
          <Button 
            onClick={() => refetchExposure()} 
            variant="outline" 
            disabled={isFetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {exposureLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-3/4 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className={`border-2 ${isMpgwFullyBacked ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {isMpgwFullyBacked ? (
                        <CheckCircle className="h-10 w-10 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-10 w-10 text-red-600" />
                      )}
                      <div>
                        <h2 className="text-xl font-bold" data-testid="text-mpgw-coverage-status">
                          {isMpgwFullyBacked ? 'LGPW Fully Backed' : 'LGPW Under-Backed'}
                        </h2>
                        <p className="text-gray-600 text-sm" data-testid="text-mpgw-coverage-ratio">
                          {mpgwCoverage.toFixed(2)}% physical gold coverage
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>Physical: {formatGrams(physicalInventory)} g</p>
                      <p>LGPW: {formatGrams(mpgwTotal)} g</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`border-2 ${isFpgwFullyBacked ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {isFpgwFullyBacked ? (
                        <CheckCircle className="h-10 w-10 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-10 w-10 text-red-600" />
                      )}
                      <div>
                        <h2 className="text-xl font-bold" data-testid="text-fpgw-coverage-status">
                          {isFpgwFullyBacked ? 'FGPW Fully Backed' : 'FGPW Under-Backed'}
                        </h2>
                        <p className="text-gray-600 text-sm" data-testid="text-fpgw-coverage-ratio">
                          {fpgwCoverage.toFixed(2)}% cash safety coverage
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>Cash: {formatUsd(cashBalance)}</p>
                      <p>FGPW Locked: {formatUsd(fpgwLockedValueUsd)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">LGPW Total</CardTitle>
                  <Vault className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600" data-testid="text-mpgw-total">
                    {formatGrams(mpgwTotal)} g
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mpgwUserCount} users with physical gold
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">FGPW Total</CardTitle>
                  <Wallet className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600" data-testid="text-fpgw-total">
                    {formatGrams(fpgwTotal)} g
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fpgwUserCount} users with locked positions
                  </p>
                  {fpgwAvgPrice > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Avg price: {formatUsd(fpgwAvgPrice)}/g
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Physical Inventory</CardTitle>
                  <Scale className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-physical-inventory">
                    {formatGrams(physicalInventory)} g
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Covers {physicalCoverage.toFixed(1)}% of total liability
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Safety Account</CardTitle>
                  <Building2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-cash-balance">
                    {formatUsd(cashBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Backing FGPW positions
                  </p>
                </CardContent>
              </Card>
            </div>

            {exposure?.alerts && (exposure.alerts.activeCount > 0 || exposure.alerts.pendingConversions > 0) && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-5 w-5" />
                    System Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {exposure.alerts.activeCount > 0 && (
                      <div className="flex items-center gap-2 text-yellow-700">
                        <Badge variant="secondary">Reconciliation</Badge>
                        <span>{exposure.alerts.activeCount} active reconciliation alert(s)</span>
                      </div>
                    )}
                    {exposure.alerts.pendingConversions > 0 && (
                      <div className="flex items-center gap-2 text-amber-700">
                        <Badge variant="outline">Pending</Badge>
                        <span>{exposure.alerts.pendingConversions} conversion(s) awaiting approval</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Conversions ({pendingConversions?.conversions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Conversion History
            </TabsTrigger>
            <TabsTrigger value="cash-ledger">
              <DollarSign className="h-4 w-4 mr-2" />
              Cash Safety Ledger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Conversion Requests</CardTitle>
                <CardDescription>
                  Review and approve/reject LGPW ↔ FGPW conversion requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conversionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !pendingConversions?.conversions?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No pending conversion requests</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Lock Price</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingConversions.conversions.map((conversion) => (
                        <TableRow key={conversion.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{conversion.userName || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{conversion.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isMpgwToFpgw(conversion.direction) ? 'default' : 'secondary'}>
                              {formatDirection(conversion.direction)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatGrams(conversion.goldGrams)} g
                          </TableCell>
                          <TableCell className="font-mono">
                            {conversion.spotPriceUsdPerGram ? formatUsd(conversion.spotPriceUsdPerGram) : '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(conversion.requestedAt), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {conversion.reason || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedConversion(conversion);
                                  setShowApproveDialog(true);
                                }}
                                data-testid={`button-approve-${conversion.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedConversion(conversion);
                                  setShowRejectDialog(true);
                                }}
                                data-testid={`button-reject-${conversion.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Conversion History</CardTitle>
                <CardDescription>All processed LGPW ↔ FGPW conversions</CardDescription>
              </CardHeader>
              <CardContent>
                {!allConversions?.conversions?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversion history</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Notes / Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allConversions.conversions.map((conversion) => (
                        <TableRow key={conversion.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{conversion.userName || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{conversion.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isMpgwToFpgw(conversion.direction) ? 'default' : 'secondary'}>
                              {formatDirection(conversion.direction)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatGrams(conversion.goldGrams)} g
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              conversion.status === 'completed' ? 'default' : 
                              conversion.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {conversion.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {conversion.reviewedAt 
                              ? format(new Date(conversion.reviewedAt), 'MMM d, HH:mm')
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {conversion.status === 'rejected' 
                              ? conversion.rejectionReason || '-'
                              : conversion.adminNotes || '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash-ledger">
            <Card>
              <CardHeader>
                <CardTitle>Cash Safety Account Ledger</CardTitle>
                <CardDescription>
                  Track of cash in/out for FGPW positions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cashLedger && (
                  <div className="grid gap-4 md:grid-cols-4 mb-6" data-testid="cash-ledger-summary">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className="text-2xl font-bold text-green-600" data-testid="text-cash-current-balance">{formatUsd(cashLedger.currentBalance)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Total Credits (In)</p>
                        <p className="text-xl font-bold text-green-600" data-testid="text-cash-total-credits">+{formatUsd(cashLedger.stats?.totalCredits || '0')}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Total Debits (Out)</p>
                        <p className="text-xl font-bold text-red-600" data-testid="text-cash-total-debits">-{formatUsd(cashLedger.stats?.totalDebits || '0')}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Total Entries</p>
                        <p className="text-xl font-bold" data-testid="text-cash-entry-count">{cashLedger.stats?.entryCount || 0}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {!cashLedger?.entries?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No cash ledger entries</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance After</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashLedger.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(new Date(entry.createdAt), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {entry.entryType.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-mono ${
                            entry.direction === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {entry.direction === 'credit' ? '+' : '-'}{formatUsd(entry.amountUsd)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatUsd(entry.runningBalanceUsd)}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {entry.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Conversion</DialogTitle>
            <DialogDescription>
              Approve this {selectedConversion ? formatDirection(selectedConversion.direction) : ''} conversion 
              of {formatGrams(selectedConversion?.goldGrams)} grams?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Optional admin notes..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedConversion && approveMutation.mutate({ id: selectedConversion.id, notes: adminNotes })}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Conversion</DialogTitle>
            <DialogDescription>
              Reject this conversion request? The user will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection (optional)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedConversion && rejectMutation.mutate({ id: selectedConversion.id, notes: adminNotes })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Processing...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
