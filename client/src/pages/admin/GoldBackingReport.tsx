import React from 'react';
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
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface GoldBackingReport {
  physicalGold: { 
    totalGrams: number; 
    holdings: Array<{
      id: string;
      userId: string;
      goldGrams: string;
      vaultLocation: string;
      isPhysicallyDeposited: boolean;
    }>;
  };
  customerLiabilities: {
    totalGrams: number;
    wallets: { count: number; totalGrams: number };
    bnslWallets: { count: number; availableGrams: number; lockedGrams: number };
  };
  certificates: { total: number; byStatus: Record<string, number> };
  backingRatio: number;
  surplus: number;
}

export default function GoldBackingReport() {
  const { data, isLoading, refetch, isFetching } = useQuery<GoldBackingReport>({
    queryKey: ['/api/admin/gold-backing-report'],
    refetchInterval: 60000,
  });

  const formatGrams = (grams: number) => {
    return grams.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const getBackingStatus = (ratio: number) => {
    if (ratio >= 100) return { status: 'fully-backed', label: 'Fully Backed', color: 'green', icon: CheckCircle };
    if (ratio >= 90) return { status: 'mostly-backed', label: 'Mostly Backed', color: 'yellow', icon: AlertTriangle };
    return { status: 'under-backed', label: 'Under-Backed', color: 'red', icon: XCircle };
  };

  const backingStatus = data ? getBackingStatus(data.backingRatio) : null;
  const StatusIcon = backingStatus?.icon || AlertTriangle;

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
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            disabled={isFetching}
            data-testid="button-refresh-report"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

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
                        {data.backingRatio.toFixed(2)}% of customer gold is backed by physical holdings
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold" data-testid="text-surplus">
                      {data.surplus >= 0 ? (
                        <span className="text-green-600 flex items-center gap-2">
                          <TrendingUp className="h-6 w-6" />
                          +{formatGrams(data.surplus)}g
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-2">
                          <TrendingDown className="h-6 w-6" />
                          {formatGrams(Math.abs(data.surplus))}g
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {data.surplus >= 0 ? 'Surplus' : 'Deficit'}
                    </p>
                  </div>
                </div>
                <Progress 
                  value={Math.min(data.backingRatio, 100)} 
                  className="mt-4 h-3"
                  data-testid="progress-backing-ratio"
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
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
                      {data.physicalGold.holdings.slice(0, 5).map((holding) => (
                        <div key={holding.id} className="flex justify-between text-sm border-b pb-2">
                          <span className="text-gray-600">{holding.vaultLocation}</span>
                          <span className="font-medium">{parseFloat(holding.goldGrams).toFixed(4)}g</span>
                        </div>
                      ))}
                      {data.physicalGold.holdings.length > 5 && (
                        <p className="text-xs text-gray-400">
                          +{data.physicalGold.holdings.length - 5} more holdings
                        </p>
                      )}
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
                    {data.customerLiabilities.wallets.count + data.customerLiabilities.bnslWallets.count} Accounts
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600" data-testid="text-liabilities">
                    {formatGrams(data.customerLiabilities.totalGrams)}g
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Total gold owed to customers</p>
                  
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">FinaPay Wallets</span>
                      <div className="text-right">
                        <span className="font-medium">{formatGrams(data.customerLiabilities.wallets.totalGrams)}g</span>
                        <span className="text-xs text-gray-400 ml-2">({data.customerLiabilities.wallets.count})</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">BNSL Available</span>
                      <div className="text-right">
                        <span className="font-medium">{formatGrams(data.customerLiabilities.bnslWallets.availableGrams)}g</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">BNSL Locked</span>
                      <div className="text-right">
                        <span className="font-medium">{formatGrams(data.customerLiabilities.bnslWallets.lockedGrams)}g</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
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

            <div className="text-xs text-gray-400 text-center">
              Report generated at {format(new Date(), 'PPpp')}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500" />
                <p className="text-gray-500">Unable to load gold backing report. Please try again.</p>
                <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-report">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
