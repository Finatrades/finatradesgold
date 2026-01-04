import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  FileText, 
  RefreshCw, 
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Eye,
  ChevronRight,
  BarChart3,
  TrendingUp,
  UserCheck,
  FileWarning,
  Scale,
  Plus,
  Edit2,
  Trash2,
  Gavel
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

interface AmlRule {
  id: string;
  ruleName: string;
  ruleCode: string;
  description: string;
  ruleType: string;
  conditions: Record<string, unknown>;
  actionType: string;
  priority: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export default function ComplianceDashboard() {
  const { user: adminUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseNotes, setCaseNotes] = useState('');
  const [caseStatus, setCaseStatus] = useState('');
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AmlRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    ruleName: '',
    ruleCode: '',
    description: '',
    ruleType: 'threshold',
    actionType: 'alert',
    priority: 5,
    conditions: {} as Record<string, unknown>,
    isActive: true
  });
  const [conditionsJson, setConditionsJson] = useState('{}');

  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['admin-aml-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/aml/alerts');
      if (!res.ok) throw new Error('Failed to fetch AML alerts');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: casesData, isLoading: casesLoading, refetch: refetchCases } = useQuery({
    queryKey: ['admin-aml-cases'],
    queryFn: async () => {
      const res = await fetch('/api/admin/aml-cases');
      if (!res.ok) throw new Error('Failed to fetch AML cases');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: riskProfilesData, isLoading: profilesLoading, refetch: refetchProfiles } = useQuery({
    queryKey: ['admin-risk-profiles'],
    queryFn: async () => {
      const res = await fetch('/api/admin/risk-profiles');
      if (!res.ok) throw new Error('Failed to fetch risk profiles');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: screeningLogsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-screening-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/screening-logs');
      if (!res.ok) throw new Error('Failed to fetch screening logs');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: auditLogsData, isLoading: auditLogsLoading, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audit-logs');
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const updateCaseMutation = useMutation({
    mutationFn: async ({ caseId, status, notes }: { caseId: string; status: string; notes?: string }) => {
      const res = await fetch(`/api/admin/aml-cases/${caseId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ status, notes, reviewedBy: adminUser?.id }),
      });
      if (!res.ok) throw new Error('Failed to update case');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Case updated successfully');
      setSelectedCase(null);
      setCaseNotes('');
      setCaseStatus('');
      queryClient.invalidateQueries({ queryKey: ['admin-aml-cases'] });
      queryClient.invalidateQueries({ queryKey: ['admin-aml-alerts'] });
    },
    onError: () => {
      toast.error('Failed to update case');
    },
  });

  const calculateRiskMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/risk-profile/${userId}/calculate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ assessedBy: adminUser?.id }),
      });
      if (!res.ok) throw new Error('Failed to calculate risk');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Risk score recalculated');
      queryClient.invalidateQueries({ queryKey: ['admin-risk-profiles'] });
    },
    onError: () => {
      toast.error('Failed to calculate risk score');
    },
  });

  const seedRulesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/aml/seed-rules', { 
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to seed rules');
      return res.json();
    },
    onSuccess: () => {
      toast.success('AML rules seeded successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-aml-rules'] });
    },
    onError: () => {
      toast.error('Failed to seed AML rules');
    },
  });

  const { data: rulesData, isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['admin-aml-rules'],
    queryFn: async () => {
      const res = await fetch('/api/admin/aml-rules');
      if (!res.ok) throw new Error('Failed to fetch AML rules');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof ruleForm) => {
      const res = await fetch('/api/admin/aml-rules', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ ...data, createdBy: adminUser?.id }),
      });
      if (!res.ok) throw new Error('Failed to create rule');
      return res.json();
    },
    onSuccess: () => {
      toast.success('AML rule created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-aml-rules'] });
      closeRuleDialog();
    },
    onError: () => {
      toast.error('Failed to create AML rule');
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof ruleForm> }) => {
      const res = await fetch(`/api/admin/aml-rules/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update rule');
      return res.json();
    },
    onSuccess: () => {
      toast.success('AML rule updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-aml-rules'] });
      closeRuleDialog();
    },
    onError: () => {
      toast.error('Failed to update AML rule');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/aml-rules/${id}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete rule');
      return res.json();
    },
    onSuccess: () => {
      toast.success('AML rule deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-aml-rules'] });
    },
    onError: () => {
      toast.error('Failed to delete AML rule');
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/aml-rules/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to toggle rule');
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Rule ${variables.isActive ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-aml-rules'] });
    },
    onError: () => {
      toast.error('Failed to toggle rule');
    },
  });

  const amlRules: AmlRule[] = rulesData || [];

  const openCreateRule = () => {
    setEditingRule(null);
    setRuleForm({
      ruleName: '',
      ruleCode: '',
      description: '',
      ruleType: 'threshold',
      actionType: 'alert',
      priority: 5,
      conditions: {},
      isActive: true
    });
    setConditionsJson('{}');
    setShowRuleDialog(true);
  };

  const openEditRule = (rule: AmlRule) => {
    setEditingRule(rule);
    setRuleForm({
      ruleName: rule.ruleName,
      ruleCode: rule.ruleCode,
      description: rule.description,
      ruleType: rule.ruleType,
      actionType: rule.actionType,
      priority: rule.priority,
      conditions: rule.conditions,
      isActive: rule.isActive
    });
    setConditionsJson(JSON.stringify(rule.conditions, null, 2));
    setShowRuleDialog(true);
  };

  const closeRuleDialog = () => {
    setShowRuleDialog(false);
    setEditingRule(null);
    setRuleForm({
      ruleName: '',
      ruleCode: '',
      description: '',
      ruleType: 'threshold',
      actionType: 'alert',
      priority: 5,
      conditions: {},
      isActive: true
    });
    setConditionsJson('{}');
  };

  const handleSaveRule = () => {
    let parsedConditions = {};
    try {
      parsedConditions = JSON.parse(conditionsJson);
    } catch {
      toast.error('Invalid JSON in conditions');
      return;
    }

    const data = { ...ruleForm, conditions: parsedConditions };

    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const getConditionTemplate = (ruleType: string): string => {
    switch (ruleType) {
      case 'threshold':
        return JSON.stringify({ amountThreshold: 10000, currency: "USD" }, null, 2);
      case 'velocity':
        return JSON.stringify({ transactionCount: 5, timeWindowHours: 24 }, null, 2);
      case 'pattern':
        return JSON.stringify({ amountThreshold: 9000, transactionCount: 3, timeWindowHours: 48 }, null, 2);
      case 'geography':
        return JSON.stringify({ highRiskCountries: ["North Korea", "Iran", "Syria"] }, null, 2);
      default:
        return '{}';
    }
  };

  const openCases = alertsData?.openCases || [];
  const highPriorityCases = alertsData?.highPriorityCases || [];
  const recentViolations = alertsData?.recentViolations || [];
  const allCases = casesData?.cases || [];
  const riskProfiles = riskProfilesData?.profiles || [];
  const screeningLogs = screeningLogsData?.logs || [];
  const auditLogs = auditLogsData?.logs || [];

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return <Badge className="bg-red-600 text-white">Critical</Badge>;
      case 'High':
        return <Badge className="bg-purple-500 text-white">High</Badge>;
      case 'Medium':
        return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
      case 'Low':
        return <Badge className="bg-green-500 text-white">Low</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getCaseStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" /> Open</Badge>;
      case 'Under Investigation':
        return <Badge className="bg-yellow-100 text-yellow-700"><Search className="w-3 h-3 mr-1" /> Investigating</Badge>;
      case 'Resolved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Resolved</Badge>;
      case 'Escalated':
        return <Badge className="bg-purple-100 text-purple-700"><TrendingUp className="w-3 h-3 mr-1" /> Escalated</Badge>;
      case 'Closed':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" /> Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'High':
        return <Badge className="bg-purple-500 text-white">High</Badge>;
      case 'Medium':
        return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
      case 'Low':
        return <Badge className="bg-blue-500 text-white">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const handleRefreshAll = () => {
    refetchAlerts();
    refetchCases();
    refetchProfiles();
    refetchLogs();
    refetchAuditLogs();
    refetchRules();
  };

  const filteredCases = allCases.filter((c: any) => 
    c.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.caseType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const highRiskProfiles = riskProfiles.filter((p: any) => 
    p.riskLevel === 'High' || p.riskLevel === 'Critical'
  );

  const profilesRequiringReview = riskProfiles.filter((p: any) => 
    p.nextReviewDate && new Date(p.nextReviewDate) <= new Date()
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-500" />
              Compliance Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Monitor AML alerts, manage cases, and track user risk profiles.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshAll} data-testid="button-refresh-compliance">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" onClick={() => seedRulesMutation.mutate()} disabled={seedRulesMutation.isPending} data-testid="button-seed-rules">
              <Scale className="w-4 h-4 mr-2" /> Seed AML Rules
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-overview">
              <BarChart3 className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="rules" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-rules">
              <Gavel className="w-4 h-4 mr-2" /> AML Rules
            </TabsTrigger>
            <TabsTrigger value="cases" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-cases">
              <FileWarning className="w-4 h-4 mr-2" /> AML Cases
            </TabsTrigger>
            <TabsTrigger value="risk" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-risk">
              <UserCheck className="w-4 h-4 mr-2" /> Risk Profiles
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-logs">
              <Activity className="w-4 h-4 mr-2" /> Screening
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-audit">
              <FileText className="w-4 h-4 mr-2" /> Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Open Cases</p>
                      <p className="text-3xl font-bold text-gray-900" data-testid="stat-open-cases">{openCases.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">High Priority</p>
                      <p className="text-3xl font-bold text-gray-900" data-testid="stat-high-priority">{highPriorityCases.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">High-Risk Users</p>
                      <p className="text-3xl font-bold text-gray-900" data-testid="stat-high-risk">{highRiskProfiles.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Reviews Due</p>
                      <p className="text-3xl font-bold text-gray-900" data-testid="stat-reviews-due">{profilesRequiringReview.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-purple-500" />
                    Recent Alerts (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alertsLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : recentViolations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                      <p>No recent alerts</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {recentViolations.slice(0, 10).map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border" data-testid={`alert-${v.id}`}>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{v.screeningType}</p>
                            <p className="text-xs text-gray-500">
                              {v.matchDetails?.matchReason || 'Rule violation detected'}
                            </p>
                          </div>
                          <Badge variant={v.status === 'Escalated' ? 'destructive' : 'outline'}>
                            {v.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileWarning className="w-5 h-5 text-red-500" />
                    High Priority Cases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {casesLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : highPriorityCases.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                      <p>No high priority cases</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {highPriorityCases.slice(0, 5).map((c: any) => (
                        <div 
                          key={c.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => { setSelectedCase(c); setActiveTab('cases'); }}
                          data-testid={`priority-case-${c.id}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{c.caseNumber}</p>
                            <p className="text-xs text-gray-500">{c.caseType?.replace(/_/g, ' ')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(c.priority)}
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Gavel className="w-5 h-5 text-purple-500" />
                      AML Monitoring Rules ({amlRules.length})
                    </CardTitle>
                    <CardDescription>Configure rules for automatic transaction monitoring and alerts</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => seedRulesMutation.mutate()} disabled={seedRulesMutation.isPending} data-testid="button-seed-rules-tab">
                      <Scale className="w-4 h-4 mr-2" /> Seed Defaults
                    </Button>
                    <Button onClick={openCreateRule} data-testid="button-create-rule">
                      <Plus className="w-4 h-4 mr-2" /> Create Rule
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : amlRules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Gavel className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="mb-4">No AML rules configured</p>
                    <Button variant="outline" onClick={() => seedRulesMutation.mutate()} disabled={seedRulesMutation.isPending}>
                      <Scale className="w-4 h-4 mr-2" /> Seed Default Rules
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rule Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Active</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {amlRules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-gray-50 transition-colors" data-testid={`rule-row-${rule.id}`}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{rule.ruleName}</p>
                                <p className="text-xs text-gray-500 max-w-xs truncate">{rule.description}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">{rule.ruleCode}</code>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="capitalize">{rule.ruleType}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={
                                rule.actionType === 'block' ? 'bg-red-500 text-white' :
                                rule.actionType === 'escalate' ? 'bg-purple-500 text-white' :
                                rule.actionType === 'flag' ? 'bg-yellow-500 text-white' :
                                'bg-blue-500 text-white'
                              }>
                                {rule.actionType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  rule.priority >= 9 ? 'bg-red-500' :
                                  rule.priority >= 7 ? 'bg-purple-500' :
                                  rule.priority >= 5 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`} />
                                <span className="text-sm">{rule.priority}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Switch
                                checked={rule.isActive}
                                onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, isActive: checked })}
                                disabled={toggleRuleMutation.isPending}
                                data-testid={`switch-rule-${rule.id}`}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openEditRule(rule)}
                                  data-testid={`button-edit-rule-${rule.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm(`Delete rule "${rule.ruleName}"?`)) {
                                      deleteRuleMutation.mutate(rule.id);
                                    }
                                  }}
                                  disabled={deleteRuleMutation.isPending}
                                  data-testid={`button-delete-rule-${rule.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Threshold Rules</p>
                  <p className="text-2xl font-bold">{amlRules.filter(r => r.ruleType === 'threshold').length}</p>
                  <p className="text-xs text-gray-400 mt-1">Amount-based triggers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Velocity Rules</p>
                  <p className="text-2xl font-bold">{amlRules.filter(r => r.ruleType === 'velocity').length}</p>
                  <p className="text-xs text-gray-400 mt-1">Transaction count triggers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Pattern Rules</p>
                  <p className="text-2xl font-bold">{amlRules.filter(r => r.ruleType === 'pattern').length}</p>
                  <p className="text-xs text-gray-400 mt-1">Behavior detection</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Active Rules</p>
                  <p className="text-2xl font-bold text-green-600">{amlRules.filter(r => r.isActive).length}</p>
                  <p className="text-xs text-gray-400 mt-1">Currently monitoring</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cases" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AML Cases ({allCases.length})</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Search cases..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-cases"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {casesLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredCases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No AML cases found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Case #</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredCases.map((c: any) => (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors" data-testid={`case-row-${c.id}`}>
                            <td className="px-4 py-3 font-medium">{c.caseNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 capitalize">{c.caseType?.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3">{getPriorityBadge(c.priority)}</td>
                            <td className="px-4 py-3">{getCaseStatusBadge(c.status)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {c.createdAt ? format(new Date(c.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedCase(c)}
                                data-testid={`button-view-case-${c.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" /> View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Risk Profiles ({riskProfiles.length})</CardTitle>
                <CardDescription>View and manage user risk assessments</CardDescription>
              </CardHeader>
              <CardContent>
                {profilesLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : riskProfiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No risk profiles found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Risk Level</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Score</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Flags</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Next Review</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {riskProfiles.map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors" data-testid={`risk-row-${p.id}`}>
                            <td className="px-4 py-3 font-mono text-sm">{p.userId?.slice(0, 8)}...</td>
                            <td className="px-4 py-3">{getRiskBadge(p.riskLevel)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      p.overallRiskScore >= 70 ? 'bg-red-500' :
                                      p.overallRiskScore >= 50 ? 'bg-purple-500' :
                                      p.overallRiskScore >= 30 ? 'bg-yellow-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${p.overallRiskScore}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{p.overallRiskScore}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {p.isPep && <Badge variant="outline" className="text-xs">PEP</Badge>}
                                {p.isSanctioned && <Badge variant="destructive" className="text-xs">Sanctioned</Badge>}
                                {p.hasAdverseMedia && <Badge variant="outline" className="text-xs bg-yellow-50">Adverse Media</Badge>}
                                {p.requiresEnhancedDueDiligence && <Badge variant="outline" className="text-xs bg-purple-50">EDD</Badge>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {p.nextReviewDate ? (
                                <span className={new Date(p.nextReviewDate) <= new Date() ? 'text-red-600 font-medium' : ''}>
                                  {format(new Date(p.nextReviewDate), 'MMM d, yyyy')}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedRiskProfile(p)}
                                  data-testid={`button-view-profile-${p.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => calculateRiskMutation.mutate(p.userId)}
                                  disabled={calculateRiskMutation.isPending}
                                  data-testid={`button-recalculate-${p.id}`}
                                >
                                  <RefreshCw className={`w-4 h-4 ${calculateRiskMutation.isPending ? 'animate-spin' : ''}`} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AML Screening Logs ({screeningLogs.length})</CardTitle>
                <CardDescription>View all screening activities and matches</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : screeningLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No screening logs found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Provider</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Match</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Score</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {screeningLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors" data-testid={`log-row-${log.id}`}>
                            <td className="px-4 py-3 font-medium text-sm">{log.screeningType}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{log.provider}</td>
                            <td className="px-4 py-3">
                              <Badge variant={log.status === 'Escalated' ? 'destructive' : log.status === 'Match Found' ? 'secondary' : 'outline'}>
                                {log.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {log.matchFound ? (
                                <Badge className="bg-red-100 text-red-700">Yes</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700">No</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">{log.matchScore || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail ({auditLogs.length})</CardTitle>
                <CardDescription>Track all system activities and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No audit logs found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Entity</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Performed By</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {auditLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors" data-testid={`audit-row-${log.id}`}>
                            <td className="px-4 py-3">
                              <Badge variant={
                                (log.actionType || log.action)?.includes('create') ? 'default' :
                                (log.actionType || log.action)?.includes('update') ? 'secondary' :
                                (log.actionType || log.action)?.includes('delete') ? 'destructive' : 'outline'
                              }>
                                {log.actionType || log.action}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="font-medium">{log.entityType}</span>
                              <span className="text-gray-500 text-xs block">{log.entityName || log.entityId?.slice(0, 8) + '...'}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {log.actorName || log.actor || log.performedBy || 'System'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                              {typeof log.details === 'object' 
                                ? JSON.stringify(log.details)?.slice(0, 50) + '...' 
                                : log.details || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {(log.timestamp || log.createdAt) ? format(new Date(log.timestamp || log.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Case Details: {selectedCase?.caseNumber}</DialogTitle>
              <DialogDescription>
                Review and update case status
              </DialogDescription>
            </DialogHeader>

            {selectedCase && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Case Type:</span>
                    <p className="font-medium capitalize">{selectedCase.caseType?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <p>{getPriorityBadge(selectedCase.priority)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p>{getCaseStatusBadge(selectedCase.status)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <p className="font-medium">
                      {selectedCase.createdAt ? format(new Date(selectedCase.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Trigger Details:</span>
                    <p className="font-medium mt-1 p-2 bg-gray-50 rounded">
                      {selectedCase.triggerDetails?.reason || 'No details available'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-2 block">Update Status:</label>
                  <Select 
                    value={caseStatus || selectedCase.status} 
                    onValueChange={(value) => setCaseStatus(value)}
                  >
                    <SelectTrigger data-testid="select-case-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                      <SelectItem value="Escalated">Escalated</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-2 block">Notes:</label>
                  <Textarea 
                    placeholder="Add investigation notes..."
                    value={caseNotes}
                    onChange={(e) => setCaseNotes(e.target.value)}
                    rows={3}
                    data-testid="textarea-case-notes"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCase(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => updateCaseMutation.mutate({ 
                  caseId: selectedCase?.id, 
                  status: caseStatus || selectedCase?.status, 
                  notes: caseNotes 
                })}
                disabled={updateCaseMutation.isPending}
                data-testid="button-update-case"
              >
                {updateCaseMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Update Case
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedRiskProfile} onOpenChange={(open) => !open && setSelectedRiskProfile(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Risk Profile Details</DialogTitle>
              <DialogDescription>
                User ID: {selectedRiskProfile?.userId}
              </DialogDescription>
            </DialogHeader>

            {selectedRiskProfile && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Overall Risk</p>
                    <div className="flex items-center gap-3 mt-1">
                      {getRiskBadge(selectedRiskProfile.riskLevel)}
                      <span className="text-2xl font-bold">{selectedRiskProfile.overallRiskScore}/100</span>
                    </div>
                  </div>
                  {selectedRiskProfile.requiresEnhancedDueDiligence && (
                    <Badge className="bg-purple-100 text-purple-700">Requires EDD</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Geography Risk</p>
                    <p className="text-xl font-bold">{selectedRiskProfile.geographyRisk}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Transaction Risk</p>
                    <p className="text-xl font-bold">{selectedRiskProfile.transactionRisk}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Behavior Risk</p>
                    <p className="text-xl font-bold">{selectedRiskProfile.behaviorRisk}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Screening Risk</p>
                    <p className="text-xl font-bold">{selectedRiskProfile.screeningRisk}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Daily Limit:</span>
                    <p className="font-medium">${parseFloat(selectedRiskProfile.dailyTransactionLimit || '0').toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Monthly Limit:</span>
                    <p className="font-medium">${parseFloat(selectedRiskProfile.monthlyTransactionLimit || '0').toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Assessed:</span>
                    <p className="font-medium">
                      {selectedRiskProfile.lastAssessedAt ? format(new Date(selectedRiskProfile.lastAssessedAt), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Next Review:</span>
                    <p className="font-medium">
                      {selectedRiskProfile.nextReviewDate ? format(new Date(selectedRiskProfile.nextReviewDate), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedRiskProfile.isPep && (
                    <Badge className="bg-blue-100 text-blue-700">Politically Exposed Person</Badge>
                  )}
                  {selectedRiskProfile.isSanctioned && (
                    <Badge variant="destructive">On Sanctions List</Badge>
                  )}
                  {selectedRiskProfile.hasAdverseMedia && (
                    <Badge className="bg-yellow-100 text-yellow-700">Adverse Media Found</Badge>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRiskProfile(null)}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  calculateRiskMutation.mutate(selectedRiskProfile?.userId);
                  setSelectedRiskProfile(null);
                }}
                disabled={calculateRiskMutation.isPending}
                data-testid="button-recalculate-profile"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${calculateRiskMutation.isPending ? 'animate-spin' : ''}`} />
                Recalculate Risk
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRuleDialog} onOpenChange={(open) => !open && closeRuleDialog()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit AML Rule' : 'Create AML Rule'}</DialogTitle>
              <DialogDescription>
                {editingRule ? 'Update the rule configuration' : 'Configure a new rule for transaction monitoring'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleName">Rule Name</Label>
                  <Input
                    id="ruleName"
                    placeholder="e.g., Large Transaction Alert"
                    value={ruleForm.ruleName}
                    onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                    data-testid="input-rule-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ruleCode">Rule Code</Label>
                  <Input
                    id="ruleCode"
                    placeholder="e.g., LARGE_TXN_10K"
                    value={ruleForm.ruleCode}
                    onChange={(e) => setRuleForm({ ...ruleForm, ruleCode: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    data-testid="input-rule-code"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this rule does..."
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  rows={2}
                  data-testid="input-rule-description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select 
                    value={ruleForm.ruleType} 
                    onValueChange={(value) => {
                      setRuleForm({ ...ruleForm, ruleType: value });
                      setConditionsJson(getConditionTemplate(value));
                    }}
                  >
                    <SelectTrigger data-testid="select-rule-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="threshold">Threshold (Amount)</SelectItem>
                      <SelectItem value="velocity">Velocity (Count)</SelectItem>
                      <SelectItem value="pattern">Pattern (Behavior)</SelectItem>
                      <SelectItem value="geography">Geography (Location)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action Type</Label>
                  <Select 
                    value={ruleForm.actionType} 
                    onValueChange={(value) => setRuleForm({ ...ruleForm, actionType: value })}
                  >
                    <SelectTrigger data-testid="select-action-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alert">Alert (Notify Admin)</SelectItem>
                      <SelectItem value="flag">Flag (Mark for Review)</SelectItem>
                      <SelectItem value="block">Block (Stop Transaction)</SelectItem>
                      <SelectItem value="escalate">Escalate (Create Case)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (1-10)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min={1}
                    max={10}
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 5 })}
                    data-testid="input-priority"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Conditions (JSON)</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setConditionsJson(getConditionTemplate(ruleForm.ruleType))}
                    type="button"
                  >
                    Load Template
                  </Button>
                </div>
                <Textarea
                  placeholder='{"amountThreshold": 10000}'
                  value={conditionsJson}
                  onChange={(e) => setConditionsJson(e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                  data-testid="input-conditions"
                />
                <p className="text-xs text-gray-500">
                  {ruleForm.ruleType === 'threshold' && 'Use: amountThreshold, currency, timeWindowHours (optional)'}
                  {ruleForm.ruleType === 'velocity' && 'Use: transactionCount, timeWindowHours'}
                  {ruleForm.ruleType === 'pattern' && 'Use: amountThreshold, transactionCount, timeWindowHours, maxAmount'}
                  {ruleForm.ruleType === 'geography' && 'Use: highRiskCountries (array of country names)'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={ruleForm.isActive}
                  onCheckedChange={(checked) => setRuleForm({ ...ruleForm, isActive: checked })}
                  data-testid="switch-rule-active"
                />
                <Label>Rule is active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeRuleDialog}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveRule}
                disabled={createRuleMutation.isPending || updateRuleMutation.isPending || !ruleForm.ruleName || !ruleForm.ruleCode}
                data-testid="button-save-rule"
              >
                {(createRuleMutation.isPending || updateRuleMutation.isPending) ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
