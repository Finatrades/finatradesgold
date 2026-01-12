import React from 'react';
import { apiRequest } from '@/lib/queryClient';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertTriangle, Shield, TrendingUp, TrendingDown, 
  RefreshCw, Users, Coins, DollarSign, Activity 
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface RiskData {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  totalExposure: {
    goldGrams: number;
    usdValue: number;
  };
  exposureByModule: {
    module: string;
    goldGrams: number;
    usdValue: number;
    riskLevel: string;
  }[];
  highRiskUsers: {
    userId: string;
    name: string;
    exposure: number;
    riskScore: number;
  }[];
  pendingObligations: {
    bnslPayouts: number;
    withdrawals: number;
    tradeSettlements: number;
    total: number;
  };
  concentrationRisk: {
    top10UsersPercent: number;
    top20UsersPercent: number;
    largestSingleExposure: number;
  };
  liquidityRatio: number;
  alerts: { type: string; message: string; severity: string }[];
}

const COLORS = ['#8A2BE2', '#FF2FBF', '#4B0082', '#A342FF', '#6B21A8'];

export default function RiskExposure() {
  const { data, isLoading, refetch } = useQuery<RiskData>({
    queryKey: ['/api/admin/risk-exposure'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/risk-exposure');
      if (!res.ok) throw new Error('Failed to fetch risk data');
      return res.json();
    },
  });

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge className="bg-success-muted text-success-muted-foreground">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-warning-muted text-warning-muted-foreground">Medium Risk</Badge>;
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'critical':
        return <Badge variant="destructive" className="animate-pulse">Critical</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatGold = (value: number) => `${value.toFixed(2)}g`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-risk-title">Risk Exposure Dashboard</h1>
            <p className="text-muted-foreground mt-1">Platform-wide risk monitoring and liability assessment</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {data?.alerts && data.alerts.length > 0 && (
          <div className="space-y-2">
            {data.alerts.map((alert, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  alert.severity === 'critical' ? 'bg-destructive/10 border border-destructive' :
                  alert.severity === 'high' ? 'bg-error-muted' :
                  'bg-warning-muted'
                }`}
              >
                <AlertTriangle className={`w-5 h-5 ${alert.severity === 'critical' ? 'text-destructive' : 'text-warning-muted-foreground'}`} />
                <span className="font-medium">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={data?.riskLevel === 'critical' ? 'border-destructive' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Risk Score</p>
                  <p className="text-3xl font-bold mt-1">{data?.overallRiskScore || 0}/100</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  data?.riskLevel === 'low' ? 'bg-success-muted' :
                  data?.riskLevel === 'medium' ? 'bg-warning-muted' :
                  'bg-destructive/10'
                }`}>
                  <Shield className={`w-6 h-6 ${
                    data?.riskLevel === 'low' ? 'text-success-muted-foreground' :
                    data?.riskLevel === 'medium' ? 'text-warning-muted-foreground' :
                    'text-destructive'
                  }`} />
                </div>
              </div>
              {data && getRiskBadge(data.riskLevel)}
              <Progress 
                value={data?.overallRiskScore || 0} 
                className="mt-3"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Exposure</p>
                  <p className="text-2xl font-bold mt-1">
                    {isLoading ? '...' : formatCurrency(data?.totalExposure.usdValue || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatGold(data?.totalExposure.goldGrams || 0)} gold
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Obligations</p>
                  <p className="text-2xl font-bold mt-1">
                    {isLoading ? '...' : formatCurrency(data?.pendingObligations.total || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Due within 30 days</p>
                </div>
                <div className="p-3 bg-warning-muted rounded-lg">
                  <DollarSign className="w-6 h-6 text-warning-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Liquidity Ratio</p>
                  <p className={`text-2xl font-bold mt-1 ${(data?.liquidityRatio || 0) < 1 ? 'text-destructive' : 'text-green-600'}`}>
                    {((data?.liquidityRatio || 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(data?.liquidityRatio || 0) >= 1 ? 'Healthy' : 'Below threshold'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${(data?.liquidityRatio || 0) >= 1 ? 'bg-success-muted' : 'bg-destructive/10'}`}>
                  <Activity className={`w-6 h-6 ${(data?.liquidityRatio || 0) >= 1 ? 'text-success-muted-foreground' : 'text-destructive'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Exposure by Module</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.exposureByModule || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="module" />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="usdValue" fill="#8A2BE2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Obligations Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'BNSL Payouts', value: data?.pendingObligations.bnslPayouts || 0 },
                        { name: 'Withdrawals', value: data?.pendingObligations.withdrawals || 0 },
                        { name: 'Trade Settlements', value: data?.pendingObligations.tradeSettlements || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Concentration Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Top 10 Users</span>
                    <span className="text-sm font-medium">{(data?.concentrationRisk.top10UsersPercent || 0).toFixed(1)}%</span>
                  </div>
                  <Progress value={data?.concentrationRisk.top10UsersPercent || 0} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Top 20 Users</span>
                    <span className="text-sm font-medium">{(data?.concentrationRisk.top20UsersPercent || 0).toFixed(1)}%</span>
                  </div>
                  <Progress value={data?.concentrationRisk.top20UsersPercent || 0} />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Largest Single Exposure</p>
                  <p className="text-2xl font-bold">{formatCurrency(data?.concentrationRisk.largestSingleExposure || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>High Risk Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.highRiskUsers || []).slice(0, 5).map((user, i) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-sm font-bold text-destructive">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">Risk Score: {user.riskScore}</p>
                      </div>
                    </div>
                    <Badge variant="destructive">{formatCurrency(user.exposure)}</Badge>
                  </div>
                ))}
                {(!data?.highRiskUsers || data.highRiskUsers.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No high risk users</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
