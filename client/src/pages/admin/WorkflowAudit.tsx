import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Eye, Activity, FileCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';

interface WorkflowSummary {
  id: string;
  flowInstanceId: string;
  flowType: string;
  userId: string;
  transactionId?: string;
  overallResult: 'PASS' | 'FAIL' | 'PENDING';
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  pendingSteps: number;
  createdAt: string;
  completedAt?: string;
}

interface WorkflowStep {
  id: string;
  flowInstanceId: string;
  stepKey: string;
  stepOrder: number;
  expected?: string;
  actual?: string;
  result: 'PASS' | 'FAIL' | 'PENDING' | 'SKIPPED';
  mismatchReason?: string;
  payload?: Record<string, any>;
  recordedAt: string;
}

interface ExpectedStep {
  stepKey: string;
  order: number;
  description: string;
  required: boolean;
}

interface FlowDetails {
  summary: WorkflowSummary;
  steps: WorkflowStep[];
  expectedSteps: ExpectedStep[];
  missingSteps: string[];
}

interface AuditStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  byFlowType: Record<string, { total: number; passed: number; failed: number }>;
}

const FLOW_TYPE_LABELS: Record<string, string> = {
  'ADD_FUNDS': 'Add Funds',
  'INTERNAL_TRANSFER_LGPW_TO_FPGW': 'LGPW → FPGW Transfer',
  'INTERNAL_TRANSFER_FPGW_TO_LGPW': 'FPGW → LGPW Transfer',
  'TRANSFER_USER_TO_USER': 'P2P Transfer',
  'WITHDRAWAL': 'Withdrawal',
  'BNSL_ACTIVATION': 'BNSL Activation',
  'BNSL_PAYOUT': 'BNSL Payout',
  'FINABRIDGE_LOCK': 'FinaBridge Lock',
};

export default function WorkflowAudit() {
  const [summaries, setSummaries] = useState<WorkflowSummary[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [flowTypeFilter, setFlowTypeFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [selectedFlow, setSelectedFlow] = useState<FlowDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [summariesRes, statsRes] = await Promise.all([
        apiRequest('GET', '/api/admin/workflow-audit/summaries'),
        apiRequest('GET', '/api/admin/workflow-audit/stats'),
      ]);
      const summariesData = await summariesRes.json();
      const statsData = await statsRes.json();
      setSummaries(summariesData.summaries || []);
      setStats(statsData);
    } catch (error) {
      toast.error("Failed to load workflow audit data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleViewDetails = async (flowInstanceId: string) => {
    try {
      const response = await apiRequest('GET', `/api/admin/workflow-audit/flow/${flowInstanceId}`);
      const data = await response.json();
      setSelectedFlow(data);
      setIsDetailModalOpen(true);
    } catch (error) {
      toast.error("Failed to load flow details");
    }
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'PASS':
        return <Badge className="bg-success-muted text-success-muted-foreground"><CheckCircle className="h-3 w-3 mr-1" /> PASS</Badge>;
      case 'FAIL':
        return <Badge className="bg-error-muted text-error-muted-foreground"><XCircle className="h-3 w-3 mr-1" /> FAIL</Badge>;
      case 'PENDING':
        return <Badge className="bg-warning-muted text-warning-muted-foreground"><AlertCircle className="h-3 w-3 mr-1" /> PENDING</Badge>;
      case 'SKIPPED':
        return <Badge variant="outline">SKIPPED</Badge>;
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  const uniqueFlowTypes = Array.from(new Set(summaries.map(s => s.flowType)));

  const filteredSummaries = summaries.filter(summary => {
    const matchesSearch = 
      summary.flowInstanceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      summary.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (summary.transactionId && summary.transactionId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFlowType = flowTypeFilter === 'all' || summary.flowType === flowTypeFilter;
    const matchesResult = resultFilter === 'all' || summary.overallResult === resultFilter;
    
    return matchesSearch && matchesFlowType && matchesResult;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6" data-testid="workflow-audit-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Workflow Audit</h1>
            <p className="text-muted-foreground">Track and validate workflow execution steps</p>
          </div>
          <Button 
            onClick={fetchData} 
            variant="outline" 
            className="gap-2"
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card data-testid="card-stats-total">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Flows</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stats-passed">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Passed</p>
                    <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stats-failed">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stats-pending">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card data-testid="card-workflow-list">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Workflow Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by flow ID, user ID, or transaction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={flowTypeFilter} onValueChange={setFlowTypeFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-flow-type">
                  <SelectValue placeholder="Flow Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Flow Types</SelectItem>
                  {uniqueFlowTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {FLOW_TYPE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-result">
                  <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="PASS">Pass</SelectItem>
                  <SelectItem value="FAIL">Fail</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Flow Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Result</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Steps</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No workflow audits found
                      </td>
                    </tr>
                  ) : (
                    filteredSummaries.map((summary) => (
                      <React.Fragment key={summary.id}>
                        <tr className="hover:bg-muted/50" data-testid={`row-workflow-${summary.id}`}>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(summary.id)}
                              data-testid={`button-expand-${summary.id}`}
                            >
                              {expandedRows.has(summary.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium">{FLOW_TYPE_LABELS[summary.flowType] || summary.flowType}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {summary.flowInstanceId.slice(0, 8)}...
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getResultBadge(summary.overallResult)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-600">{summary.passedSteps}✓</span>
                              <span className="text-red-600">{summary.failedSteps}✗</span>
                              <span className="text-yellow-600">{summary.pendingSteps}?</span>
                              <span className="text-muted-foreground">/ {summary.totalSteps}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {format(new Date(summary.createdAt), 'MMM d, HH:mm')}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(summary.flowInstanceId)}
                              data-testid={`button-view-${summary.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </td>
                        </tr>
                        {expandedRows.has(summary.id) && (
                          <tr className="bg-muted/20">
                            <td colSpan={6} className="px-8 py-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">User ID:</span>{' '}
                                  <span className="font-mono">{summary.userId}</span>
                                </div>
                                {summary.transactionId && (
                                  <div>
                                    <span className="text-muted-foreground">Transaction ID:</span>{' '}
                                    <span className="font-mono">{summary.transactionId}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">Flow Instance:</span>{' '}
                                  <span className="font-mono text-xs">{summary.flowInstanceId}</span>
                                </div>
                                {summary.completedAt && (
                                  <div>
                                    <span className="text-muted-foreground">Completed:</span>{' '}
                                    {format(new Date(summary.completedAt), 'MMM d, yyyy HH:mm:ss')}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Flow Execution Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedFlow && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Flow Type</p>
                    <p className="font-medium">{FLOW_TYPE_LABELS[selectedFlow.summary.flowType] || selectedFlow.summary.flowType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Result</p>
                    {getResultBadge(selectedFlow.summary.overallResult)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-mono text-sm">{selectedFlow.summary.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-mono text-sm">{selectedFlow.summary.transactionId || 'N/A'}</p>
                  </div>
                </div>

                {selectedFlow.missingSteps.length > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
                    <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Missing Required Steps</h4>
                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                      {selectedFlow.missingSteps.map(step => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-3">Execution Steps</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Order</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Step</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Result</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedFlow.steps.map((step) => (
                          <tr key={step.id} className="hover:bg-muted/50">
                            <td className="px-3 py-2 text-sm">{step.stepOrder}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-sm">{step.stepKey}</div>
                              {step.actual && (
                                <div className="text-xs text-muted-foreground">{step.actual}</div>
                              )}
                              {step.mismatchReason && (
                                <div className="text-xs text-red-600">{step.mismatchReason}</div>
                              )}
                            </td>
                            <td className="px-3 py-2">{getResultBadge(step.result)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {format(new Date(step.recordedAt), 'HH:mm:ss.SSS')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Expected Steps Reference</h4>
                  <div className="grid gap-2">
                    {selectedFlow.expectedSteps.map((step) => {
                      const recorded = selectedFlow.steps.find(s => s.stepKey === step.stepKey);
                      return (
                        <div 
                          key={step.stepKey} 
                          className={`p-3 rounded-lg border ${
                            recorded 
                              ? recorded.result === 'PASS' 
                                ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
                                : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                              : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-sm">{step.order}. {step.stepKey}</span>
                              <p className="text-xs text-muted-foreground">{step.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {step.required ? (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Optional</Badge>
                              )}
                              {recorded ? getResultBadge(recorded.result) : (
                                <Badge variant="outline" className="text-yellow-600">Not Recorded</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
