import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  CalendarClock, 
  Plus, 
  Loader2, 
  PlayCircle, 
  PauseCircle, 
  XCircle, 
  History, 
  Coins,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface DcaPlan {
  id: string;
  userId: string;
  name: string | null;
  amountUsd: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  status: 'active' | 'paused' | 'cancelled';
  totalExecutions: number;
  totalGoldPurchasedGrams: number;
  totalUsdSpent: number;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DcaExecution {
  id: string;
  planId: string;
  amountUsd: number;
  goldPurchasedGrams: number;
  goldPriceAtPurchase: number;
  status: 'completed' | 'failed' | 'pending';
  error: string | null;
  executedAt: string;
}

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly'
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 border-green-500/30',
  paused: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/30'
};

const daysOfWeek = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' }
];

export default function DCAPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DcaPlan | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const [newPlan, setNewPlan] = useState<{
    name: string;
    amountUsd: string;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek: string;
    dayOfMonth: string;
  }>({
    name: '',
    amountUsd: '',
    frequency: 'weekly',
    dayOfWeek: '1',
    dayOfMonth: '1'
  });

  const { data: plans = [], isLoading, error, refetch } = useQuery<DcaPlan[]>({
    queryKey: ['dca-plans'],
    queryFn: async () => {
      const res = await fetch('/api/dca-plans', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch DCA plans');
      return res.json();
    },
    enabled: !!user
  });

  const { data: executions = [], isLoading: isLoadingExecutions } = useQuery<DcaExecution[]>({
    queryKey: ['dca-executions', selectedPlan?.id],
    queryFn: async () => {
      if (!selectedPlan) return [];
      const res = await fetch(`/api/dca-plans/${selectedPlan.id}/executions`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch executions');
      return res.json();
    },
    enabled: !!selectedPlan && showHistoryModal
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newPlan) => {
      const res = await fetch('/api/dca-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name || null,
          amountUsd: parseFloat(data.amountUsd),
          frequency: data.frequency,
          dayOfWeek: data.frequency === 'weekly' || data.frequency === 'biweekly' ? parseInt(data.dayOfWeek) : null,
          dayOfMonth: data.frequency === 'monthly' ? parseInt(data.dayOfMonth) : null
        })
      });
      if (!res.ok) throw new Error('Failed to create DCA plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-plans'] });
      setShowCreateModal(false);
      setNewPlan({ name: '', amountUsd: '', frequency: 'weekly', dayOfWeek: '1', dayOfMonth: '1' });
      toast({ title: 'Success', description: 'DCA plan created successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create DCA plan', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'paused' }) => {
      const res = await fetch(`/api/dca-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update DCA plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-plans'] });
      toast({ title: 'Success', description: 'Plan updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update plan', variant: 'destructive' });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dca-plans/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to cancel DCA plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-plans'] });
      setShowCancelConfirm(false);
      setSelectedPlan(null);
      toast({ title: 'Success', description: 'Plan cancelled successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to cancel plan', variant: 'destructive' });
    }
  });

  const activePlans = plans.filter(p => p.status === 'active');
  const pausedPlans = plans.filter(p => p.status === 'paused');
  const cancelledPlans = plans.filter(p => p.status === 'cancelled');

  const totalMonthlyInvestment = activePlans.reduce((sum, p) => {
    const multiplier = p.frequency === 'daily' ? 30 : p.frequency === 'weekly' ? 4 : p.frequency === 'biweekly' ? 2 : 1;
    return sum + (p.amountUsd * multiplier);
  }, 0);

  const totalGoldPurchased = plans.reduce((sum, p) => sum + (p.totalGoldPurchasedGrams || 0), 0);
  const totalUsdSpent = plans.reduce((sum, p) => sum + (p.totalUsdSpent || 0), 0);

  const handleCreatePlan = () => {
    if (!newPlan.amountUsd || parseFloat(newPlan.amountUsd) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    createMutation.mutate(newPlan);
  };

  const renderPlanCard = (plan: DcaPlan) => (
    <Card 
      key={plan.id} 
      data-testid={`card-dca-plan-${plan.id}`}
      className="bg-white border border-border hover:border-primary/50 transition-all"
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <CalendarClock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {plan.name || `Auto-Buy Plan #${plan.id.slice(-4)}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                ${plan.amountUsd.toFixed(2)} {frequencyLabels[plan.frequency]}
              </p>
            </div>
          </div>
          <Badge className={statusColors[plan.status]} data-testid={`badge-status-${plan.id}`}>
            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-t border-b border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{plan.totalExecutions || 0}</p>
            <p className="text-xs text-muted-foreground">Executions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {(plan.totalGoldPurchasedGrams || 0).toFixed(4)}g
            </p>
            <p className="text-xs text-muted-foreground">Gold Purchased</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              ${(plan.totalUsdSpent || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Total Spent</p>
          </div>
        </div>

        {plan.status === 'active' && plan.nextRunAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="w-4 h-4" />
            <span>Next run: {formatDistanceToNow(new Date(plan.nextRunAt), { addSuffix: true })}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {plan.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              data-testid={`button-pause-${plan.id}`}
              onClick={() => updateMutation.mutate({ id: plan.id, status: 'paused' })}
              disabled={updateMutation.isPending}
            >
              <PauseCircle className="w-4 h-4 mr-1" />
              Pause
            </Button>
          )}
          {plan.status === 'paused' && (
            <Button
              variant="outline"
              size="sm"
              data-testid={`button-resume-${plan.id}`}
              onClick={() => updateMutation.mutate({ id: plan.id, status: 'active' })}
              disabled={updateMutation.isPending}
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              Resume
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            data-testid={`button-history-${plan.id}`}
            onClick={() => {
              setSelectedPlan(plan);
              setShowHistoryModal(true);
            }}
          >
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
          {plan.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="sm"
              data-testid={`button-cancel-${plan.id}`}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                setSelectedPlan(plan);
                setShowCancelConfirm(true);
              }}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              Auto-Buy Plans (DCA)
            </h1>
            <p className="text-muted-foreground mt-1">
              Dollar-cost averaging for automatic gold purchases
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              data-testid="button-create-plan"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Plan
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100">Active Plans</p>
                  <p className="text-3xl font-bold">{activePlans.length}</p>
                </div>
                <CalendarClock className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Investment</p>
                  <p className="text-3xl font-bold text-foreground">${totalMonthlyInvestment.toFixed(2)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Gold Purchased</p>
                  <p className="text-3xl font-bold text-foreground">{totalGoldPurchased.toFixed(4)}g</p>
                </div>
                <Coins className="w-10 h-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Invested</p>
                  <p className="text-3xl font-bold text-foreground">${totalUsdSpent.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6 flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-800">Failed to load DCA plans</h3>
                <p className="text-red-600">Please try again later.</p>
              </div>
            </CardContent>
          </Card>
        ) : plans.length === 0 ? (
          <Card className="bg-white border border-border">
            <CardContent className="p-12 text-center">
              <CalendarClock className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Auto-Buy Plans Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start building wealth automatically with dollar-cost averaging
              </p>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                data-testid="button-create-first-plan"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="active" data-testid="tab-active">
                Active ({activePlans.length})
              </TabsTrigger>
              <TabsTrigger value="paused" data-testid="tab-paused">
                Paused ({pausedPlans.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" data-testid="tab-cancelled">
                Cancelled ({cancelledPlans.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activePlans.length === 0 ? (
                <Card className="bg-white border border-border">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No active plans
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activePlans.map(renderPlanCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="paused">
              {pausedPlans.length === 0 ? (
                <Card className="bg-white border border-border">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No paused plans
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pausedPlans.map(renderPlanCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cancelled">
              {cancelledPlans.length === 0 ? (
                <Card className="bg-white border border-border">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No cancelled plans
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {cancelledPlans.map(renderPlanCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              Create Auto-Buy Plan
            </DialogTitle>
            <DialogDescription>
              Set up automatic gold purchases to dollar-cost average your investments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="plan-name">Plan Name (Optional)</Label>
              <Input
                id="plan-name"
                data-testid="input-plan-name"
                placeholder="e.g., Monthly Savings"
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount per Purchase (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  data-testid="input-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="100.00"
                  className="pl-9"
                  value={newPlan.amountUsd}
                  onChange={(e) => setNewPlan({ ...newPlan, amountUsd: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={newPlan.frequency}
                onValueChange={(value: 'daily' | 'weekly' | 'biweekly' | 'monthly') => 
                  setNewPlan({ ...newPlan, frequency: value })
                }
              >
                <SelectTrigger data-testid="select-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newPlan.frequency === 'weekly' || newPlan.frequency === 'biweekly') && (
              <div>
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select
                  value={newPlan.dayOfWeek}
                  onValueChange={(value) => setNewPlan({ ...newPlan, dayOfWeek: value })}
                >
                  <SelectTrigger data-testid="select-day-of-week">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(day => (
                      <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newPlan.frequency === 'monthly' && (
              <div>
                <Label htmlFor="dayOfMonth">Day of Month</Label>
                <Select
                  value={newPlan.dayOfMonth}
                  onValueChange={(value) => setNewPlan({ ...newPlan, dayOfMonth: value })}
                >
                  <SelectTrigger data-testid="select-day-of-month">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlan}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              data-testid="button-submit-plan"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Execution History
            </DialogTitle>
            <DialogDescription>
              {selectedPlan?.name || `Plan #${selectedPlan?.id.slice(-4)}`}
            </DialogDescription>
          </DialogHeader>

          {isLoadingExecutions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : executions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No executions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map(execution => (
                <div 
                  key={execution.id} 
                  className="border border-border rounded-lg p-4"
                  data-testid={`execution-${execution.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={
                      execution.status === 'completed' 
                        ? 'bg-green-500/10 text-green-600' 
                        : execution.status === 'failed'
                        ? 'bg-red-500/10 text-red-600'
                        : 'bg-yellow-500/10 text-yellow-600'
                    }>
                      {execution.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(execution.executedAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-semibold">${execution.amountUsd.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gold Purchased</p>
                      <p className="font-semibold">{execution.goldPurchasedGrams.toFixed(4)}g</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Price at Purchase</p>
                      <p className="font-semibold">${execution.goldPriceAtPurchase.toFixed(2)}/g</p>
                    </div>
                    {execution.error && (
                      <div className="col-span-2 text-red-600 text-xs">
                        Error: {execution.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Cancel Plan
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this auto-buy plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
              Keep Plan
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedPlan && cancelMutation.mutate(selectedPlan.id)}
              disabled={cancelMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
