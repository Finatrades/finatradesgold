import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  RefreshCw, 
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Clock,
  Scale,
  FileText,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ReconciliationResult {
  runId: string;
  runDate: string;
  status: 'success' | 'warning' | 'error';
  totalDigitalGrams: number;
  totalPhysicalGrams: number;
  discrepancyGrams: number;
  issues: ReconciliationIssue[];
  unlinkedDeposits: number;
  countryMismatches: number;
  negativeBalances: number;
}

interface ReconciliationIssue {
  id: string;
  type: 'discrepancy' | 'unlinked' | 'mismatch' | 'negative' | 'invalid';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedEntity: string;
  affectedEntityId: string;
  resolved: boolean;
}

export default function VaultReconciliation() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery<ReconciliationResult>({
    queryKey: ['/api/admin/vault/reconciliation'],
  });

  const formatGrams = (grams: number) => {
    return grams.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-700 border-red-200">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'discrepancy':
        return <Scale className="h-4 w-4 text-red-500" />;
      case 'unlinked':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'mismatch':
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const hasIssues = data && (data.issues?.length > 0 || data.discrepancyGrams !== 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Vault Reconciliation
            </h1>
            <p className="text-gray-500 mt-1">
              Compare digital liabilities with physical custody and identify discrepancies
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-run-reconciliation"
            >
              {isFetching ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Reconciliation
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-8 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            <Card className={`border-2 ${
              data.status === 'success' ? 'border-green-200 bg-green-50' :
              data.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {data.status === 'success' ? (
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    ) : data.status === 'warning' ? (
                      <AlertTriangle className="h-12 w-12 text-yellow-600" />
                    ) : (
                      <XCircle className="h-12 w-12 text-red-600" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold" data-testid="text-reconciliation-status">
                        {data.status === 'success' ? 'Reconciliation Passed' :
                         data.status === 'warning' ? 'Issues Detected' :
                         'Reconciliation Failed'}
                      </h2>
                      <p className="text-gray-600">
                        Last run: {format(new Date(data.runDate), 'PPpp')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold" data-testid="text-discrepancy">
                      {data.discrepancyGrams === 0 ? (
                        <span className="text-green-600 flex items-center gap-2">
                          <CheckCircle className="h-6 w-6" />
                          0g
                        </span>
                      ) : data.discrepancyGrams > 0 ? (
                        <span className="text-green-600 flex items-center gap-2">
                          <TrendingUp className="h-6 w-6" />
                          +{formatGrams(data.discrepancyGrams)}g
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-2">
                          <TrendingDown className="h-6 w-6" />
                          {formatGrams(data.discrepancyGrams)}g
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Discrepancy</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatGrams(data.totalDigitalGrams)}g
                  </div>
                  <p className="text-sm text-gray-500">Digital Liability</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatGrams(data.totalPhysicalGrams)}g
                  </div>
                  <p className="text-sm text-gray-500">Physical Custody</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-600">
                    {data.unlinkedDeposits}
                  </div>
                  <p className="text-sm text-gray-500">Unlinked Deposits</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {data.issues?.filter(i => !i.resolved).length || 0}
                  </div>
                  <p className="text-sm text-gray-500">Open Issues</p>
                </CardContent>
              </Card>
            </div>

            {hasIssues && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Reconciliation Issues
                  </CardTitle>
                  <CardDescription>
                    Issues that require attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.issues?.length > 0 ? (
                    <div className="space-y-3">
                      {data.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`flex items-start justify-between p-4 rounded-lg border ${
                            issue.resolved ? 'bg-gray-50 opacity-60' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {getTypeIcon(issue.type)}
                            <div>
                              <p className="font-medium text-gray-900">{issue.description}</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Affected: {issue.affectedEntity} ({issue.affectedEntityId})
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(issue.severity)}
                            {issue.resolved ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">Resolved</Badge>
                            ) : (
                              <Button variant="outline" size="sm">
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <p>No issues detected in the latest reconciliation run.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Reconciliation Data</h3>
              <p className="text-gray-500 mt-1">Run your first reconciliation to compare digital and physical holdings.</p>
              <Button className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={() => refetch()}>
                <Play className="h-4 w-4 mr-2" />
                Run First Reconciliation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
