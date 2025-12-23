import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, RefreshCw, AlertTriangle, CheckCircle, XCircle, Loader2, Edit, Trash2, Play, Pause } from 'lucide-react';

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
  createdAt: string;
}

interface AmlCase {
  id: string;
  userId: string;
  caseNumber: string;
  status: string;
  severity: string;
  description: string;
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export default function AMLManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('rules');
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [editRule, setEditRule] = useState<AmlRule | null>(null);
  const [newRule, setNewRule] = useState({
    ruleName: '',
    ruleCode: '',
    description: '',
    ruleType: 'threshold',
    actionType: 'alert',
    priority: 5,
    conditions: {} as Record<string, unknown>
  });

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['aml-rules'],
    queryFn: async () => {
      const res = await fetch('/api/admin/aml-rules');
      if (!res.ok) throw new Error('Failed to fetch AML rules');
      return res.json();
    }
  });

  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ['aml-cases'],
    queryFn: async () => {
      const res = await fetch('/api/admin/aml-cases');
      if (!res.ok) throw new Error('Failed to fetch AML cases');
      return res.json();
    }
  });

  const { data: alertsData } = useQuery({
    queryKey: ['aml-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/aml/alerts');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    }
  });

  const seedRulesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/aml-rules/seed-defaults', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to seed rules');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aml-rules'] });
      toast({ title: 'Success', description: 'Default AML rules have been seeded' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to seed rules', variant: 'destructive' });
    }
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: typeof newRule) => {
      const res = await fetch('/api/admin/aml-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });
      if (!res.ok) throw new Error('Failed to create rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aml-rules'] });
      setAddRuleOpen(false);
      setNewRule({ ruleName: '', ruleCode: '', description: '', ruleType: 'threshold', actionType: 'alert', priority: 5, conditions: {} });
      toast({ title: 'Success', description: 'AML rule created' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create rule', variant: 'destructive' });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AmlRule> }) => {
      const res = await fetch(`/api/admin/aml-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aml-rules'] });
      setEditRule(null);
      toast({ title: 'Success', description: 'Rule updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update rule', variant: 'destructive' });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/aml-rules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aml-rules'] });
      toast({ title: 'Success', description: 'Rule deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete rule', variant: 'destructive' });
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/aml-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (!res.ok) throw new Error('Failed to toggle rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aml-rules'] });
    }
  });

  const rules: AmlRule[] = rulesData?.rules || [];
  const cases: AmlCase[] = casesData?.cases || [];
  const alerts = alertsData?.alerts || [];

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      alert: 'bg-warning-muted text-warning-muted-foreground',
      flag: 'bg-info-muted text-info-muted-foreground',
      block: 'bg-error-muted text-error-muted-foreground',
      escalate: 'bg-primary/20 text-primary'
    };
    return <Badge className={colors[action] || 'bg-muted'}>{action}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-info-muted text-info-muted-foreground',
      medium: 'bg-warning-muted text-warning-muted-foreground',
      high: 'bg-error-muted text-error-muted-foreground',
      critical: 'bg-destructive text-destructive-foreground'
    };
    return <Badge className={colors[severity?.toLowerCase()] || 'bg-muted'}>{severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-warning-muted text-warning-muted-foreground',
      investigating: 'bg-info-muted text-info-muted-foreground',
      resolved: 'bg-success-muted text-success-muted-foreground',
      closed: 'bg-muted text-muted-foreground'
    };
    return <Badge className={colors[status?.toLowerCase()] || 'bg-muted'}>{status}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6" data-testid="aml-management-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" />
              AML Management
            </h1>
            <p className="text-muted-foreground">Manage Anti-Money Laundering rules and monitor cases</p>
          </div>
          <Button onClick={() => seedRulesMutation.mutate()} disabled={seedRulesMutation.isPending} data-testid="btn-seed-rules">
            {seedRulesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Seed Default Rules
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rules.length}</p>
                  <p className="text-sm text-muted-foreground">Total Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rules.filter(r => r.isActive).length}</p>
                  <p className="text-sm text-muted-foreground">Active Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{cases.filter(c => c.status === 'open' || c.status === 'investigating').length}</p>
                  <p className="text-sm text-muted-foreground">Open Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-error" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{alerts.length}</p>
                  <p className="text-sm text-muted-foreground">Recent Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rules" data-testid="tab-rules">Rules</TabsTrigger>
            <TabsTrigger value="cases" data-testid="tab-cases">Cases</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>AML Rules</CardTitle>
                  <CardDescription>Configure transaction monitoring rules</CardDescription>
                </div>
                <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="btn-add-rule">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add AML Rule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Rule Name</Label>
                          <Input value={newRule.ruleName} onChange={e => setNewRule({ ...newRule, ruleName: e.target.value })} placeholder="Large Transaction Alert" data-testid="input-rule-name" />
                        </div>
                        <div>
                          <Label>Rule Code</Label>
                          <Input value={newRule.ruleCode} onChange={e => setNewRule({ ...newRule, ruleCode: e.target.value.toUpperCase() })} placeholder="LARGE_TXN_10K" data-testid="input-rule-code" />
                        </div>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={newRule.description} onChange={e => setNewRule({ ...newRule, description: e.target.value })} placeholder="Flag transactions over $10,000" data-testid="input-rule-desc" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Rule Type</Label>
                          <Select value={newRule.ruleType} onValueChange={v => setNewRule({ ...newRule, ruleType: v })}>
                            <SelectTrigger data-testid="select-rule-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="threshold">Threshold</SelectItem>
                              <SelectItem value="velocity">Velocity</SelectItem>
                              <SelectItem value="geography">Geography</SelectItem>
                              <SelectItem value="pattern">Pattern</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Action</Label>
                          <Select value={newRule.actionType} onValueChange={v => setNewRule({ ...newRule, actionType: v })}>
                            <SelectTrigger data-testid="select-action-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alert">Alert</SelectItem>
                              <SelectItem value="flag">Flag</SelectItem>
                              <SelectItem value="block">Block</SelectItem>
                              <SelectItem value="escalate">Escalate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Priority (1-10)</Label>
                          <Input type="number" min={1} max={10} value={newRule.priority} onChange={e => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 5 })} data-testid="input-priority" />
                        </div>
                      </div>
                      {newRule.ruleType === 'threshold' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Amount Threshold (USD)</Label>
                            <Input type="number" value={(newRule.conditions.amountThreshold as number) || ''} onChange={e => setNewRule({ ...newRule, conditions: { ...newRule.conditions, amountThreshold: parseFloat(e.target.value) } })} placeholder="10000" data-testid="input-threshold" />
                          </div>
                          <div>
                            <Label>Time Window (hours, optional)</Label>
                            <Input type="number" value={(newRule.conditions.timeWindowHours as number) || ''} onChange={e => setNewRule({ ...newRule, conditions: { ...newRule.conditions, timeWindowHours: parseInt(e.target.value) || undefined } })} placeholder="24" data-testid="input-time-window" />
                          </div>
                        </div>
                      )}
                      {newRule.ruleType === 'velocity' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Max Transactions</Label>
                            <Input type="number" value={(newRule.conditions.transactionCount as number) || ''} onChange={e => setNewRule({ ...newRule, conditions: { ...newRule.conditions, transactionCount: parseInt(e.target.value) } })} placeholder="5" data-testid="input-txn-count" />
                          </div>
                          <div>
                            <Label>Time Window (hours)</Label>
                            <Input type="number" value={(newRule.conditions.timeWindowHours as number) || ''} onChange={e => setNewRule({ ...newRule, conditions: { ...newRule.conditions, timeWindowHours: parseInt(e.target.value) } })} placeholder="24" data-testid="input-velocity-window" />
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddRuleOpen(false)}>Cancel</Button>
                      <Button onClick={() => createRuleMutation.mutate(newRule)} disabled={!newRule.ruleName || !newRule.ruleCode || createRuleMutation.isPending} data-testid="btn-save-rule">
                        {createRuleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Create Rule
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No AML rules configured. Click "Seed Default Rules" to add standard rules.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => (
                        <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                          <TableCell>
                            <Switch checked={rule.isActive} onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, isActive: checked })} data-testid={`toggle-rule-${rule.id}`} />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{rule.ruleName}</p>
                              <p className="text-xs text-muted-foreground">{rule.description}</p>
                            </div>
                          </TableCell>
                          <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{rule.ruleCode}</code></TableCell>
                          <TableCell><Badge variant="outline">{rule.ruleType}</Badge></TableCell>
                          <TableCell>{getActionBadge(rule.actionType)}</TableCell>
                          <TableCell><Badge variant="secondary">{rule.priority}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => setEditRule(rule)} data-testid={`btn-edit-${rule.id}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteRuleMutation.mutate(rule.id)} data-testid={`btn-delete-${rule.id}`}>
                                <Trash2 className="w-4 h-4 text-destructive" />
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

          <TabsContent value="cases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AML Cases</CardTitle>
                <CardDescription>Active investigations and monitoring cases</CardDescription>
              </CardHeader>
              <CardContent>
                {casesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : cases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No AML cases. This is good - no suspicious activity detected.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case #</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cases.map((c) => (
                        <TableRow key={c.id} data-testid={`row-case-${c.id}`}>
                          <TableCell><code>{c.caseNumber}</code></TableCell>
                          <TableCell>{c.userId}</TableCell>
                          <TableCell>{getSeverityBadge(c.severity)}</TableCell>
                          <TableCell>{getStatusBadge(c.status)}</TableCell>
                          <TableCell className="max-w-xs truncate">{c.description}</TableCell>
                          <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Transaction monitoring alerts</CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent alerts.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((alert: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell><Badge variant="destructive">{alert.alertType}</Badge></TableCell>
                          <TableCell>{alert.userId}</TableCell>
                          <TableCell>{alert.transactionId}</TableCell>
                          <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                          <TableCell>{alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {editRule && (
          <Dialog open={!!editRule} onOpenChange={() => setEditRule(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Rule: {editRule.ruleName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <Textarea value={editRule.description} onChange={e => setEditRule({ ...editRule, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Action Type</Label>
                    <Select value={editRule.actionType} onValueChange={v => setEditRule({ ...editRule, actionType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alert">Alert</SelectItem>
                        <SelectItem value="flag">Flag</SelectItem>
                        <SelectItem value="block">Block</SelectItem>
                        <SelectItem value="escalate">Escalate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Input type="number" min={1} max={10} value={editRule.priority} onChange={e => setEditRule({ ...editRule, priority: parseInt(e.target.value) || 5 })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditRule(null)}>Cancel</Button>
                <Button onClick={() => updateRuleMutation.mutate({ id: editRule.id, updates: { description: editRule.description, actionType: editRule.actionType, priority: editRule.priority } })} disabled={updateRuleMutation.isPending}>
                  {updateRuleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
