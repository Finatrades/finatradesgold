import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { 
  RefreshCw, 
  Scale, 
  Vault,
  TrendingUp,
  TrendingDown,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Package,
  FileCheck,
  Globe
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface VaultDashboardData {
  totalDigitalLiability: number;
  totalPhysicalCustody: number;
  mpgw: { totalGrams: number; count: number };
  fpgw: { totalGrams: number; count: number; weightedAvgPrice: number };
  byBucket: {
    available: number;
    reservedP2P: number;
    lockedBNSL: number;
    allocatedTrade: number;
  };
  byCountry: Record<string, number>;
  byVaultLocation: Record<string, number>;
  unlinkedDeposits: number;
  alerts: { type: string; message: string; severity: string }[];
}

interface VaultLocation {
  id: string;
  name: string;
  code: string;
  current_holdings_kg: string;
  is_active: boolean;
}

export default function VaultDashboard() {
  const { data, isLoading, refetch, isFetching } = useQuery<VaultDashboardData>({
    queryKey: ['/api/admin/vault/overview'],
    refetchInterval: 60000,
  });

  const { data: locationsData } = useQuery<{ locations: VaultLocation[] }>({
    queryKey: ['/api/admin/vault-management/locations'],
    refetchInterval: 60000,
  });

  const formatGrams = (grams: number | undefined) => {
    return (grams || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const totalDigital = data?.totalDigitalLiability || 0;
  const totalPhysical = data?.totalPhysicalCustody || 0;
  const difference = totalPhysical - totalDigital;
  const coverageRatio = totalDigital > 0 ? (totalPhysical / totalDigital) * 100 : 100;
  const isFullyBacked = coverageRatio >= 100;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Vault Management Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Overview of digital liabilities vs physical custody across all wallets
            </p>
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            disabled={isFetching}
            data-testid="button-refresh"
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
        ) : (
          <>
            <Card className={`border-2 ${isFullyBacked ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isFullyBacked ? (
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-12 w-12 text-red-600" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold" data-testid="text-coverage-status">
                        {isFullyBacked ? 'Fully Backed' : 'Under-Backed'}
                      </h2>
                      <p className="text-gray-600" data-testid="text-coverage-ratio">
                        {coverageRatio.toFixed(2)}% physical gold coverage
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold" data-testid="text-difference">
                      {difference >= 0 ? (
                        <span className="text-green-600 flex items-center gap-2">
                          <TrendingUp className="h-6 w-6" />
                          +{formatGrams(difference)}g
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-2">
                          <TrendingDown className="h-6 w-6" />
                          {formatGrams(Math.abs(difference))}g
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {difference >= 0 ? 'Surplus' : 'Deficit'}
                    </p>
                  </div>
                </div>
                <Progress 
                  value={Math.min(coverageRatio, 100)} 
                  className="mt-4 h-3"
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Digital Liability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600" data-testid="text-digital-liability">
                    {formatGrams(totalDigital)}g
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total gold owed to users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Vault className="h-4 w-4" />
                    Physical Custody
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600" data-testid="text-physical-custody">
                    {formatGrams(totalPhysical)}g
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total physical gold held</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    LGPW (Market Price)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600" data-testid="text-mpgw-total">
                    {formatGrams(data?.mpgw?.totalGrams)}g
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{data?.mpgw?.count || 0} accounts</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    FGPW (Fixed Price)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600" data-testid="text-fpgw-total">
                    {formatGrams(data?.fpgw?.totalGrams)}g
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data?.fpgw?.count || 0} accounts @ ${data?.fpgw?.weightedAvgPrice?.toFixed(2) || '0.00'}/g avg
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-green-600" />
                    Gold by Bucket
                  </CardTitle>
                  <CardDescription>Allocation status breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Available</span>
                    <span className="font-bold text-green-600">{formatGrams(data?.byBucket?.available)}g</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Reserved (P2P)</span>
                    <span className="font-bold text-blue-600">{formatGrams(data?.byBucket?.reservedP2P)}g</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                    <span className="font-medium">Locked (BNSL)</span>
                    <span className="font-bold text-amber-600">{formatGrams(data?.byBucket?.lockedBNSL)}g</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Allocated (Trade)</span>
                    <span className="font-bold text-purple-600">{formatGrams(data?.byBucket?.allocatedTrade)}g</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Gold by Vault Location
                  </CardTitle>
                  <CardDescription>Physical storage distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data?.byVaultLocation && Object.entries(data.byVaultLocation).length > 0 ? (
                    Object.entries(data.byVaultLocation).map(([location, grams]) => (
                      <div key={location} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          {location}
                        </span>
                        <span className="font-bold">{formatGrams(grams)}g</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No vault locations configured
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {(data?.unlinkedDeposits || 0) > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-5 w-5" />
                    Attention Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-yellow-800">Unlinked Deposits</p>
                      <p className="text-sm text-yellow-600">Digital credits without physical certificate reference</p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                      {data?.unlinkedDeposits} pending
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
