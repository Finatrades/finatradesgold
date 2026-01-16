import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Target, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Trash2,
  Calendar,
  Coins,
  TrendingUp,
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';

interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetGrams: string;
  targetDate: string | null;
  status: 'active' | 'completed' | 'cancelled';
  completedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoalProgress {
  goalId: string;
  targetGrams: number;
  currentHoldingsGrams: number;
  progressPercent: number;
  remainingGrams: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  completed: 'bg-green-500/10 text-green-600 border-green-500/30',
  cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/30'
};

export default function SavingsGoalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetGrams: '',
    targetDate: '',
    note: ''
  });

  const [editGoal, setEditGoal] = useState({
    name: '',
    targetGrams: '',
    targetDate: '',
    note: ''
  });

  const { data: goals = [], isLoading, error } = useQuery<SavingsGoal[]>({
    queryKey: ['savings-goals'],
    queryFn: async () => {
      const res = await fetch('/api/savings-goals', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch savings goals');
      return res.json();
    },
    enabled: !!user
  });

  const { data: goalsProgress = {} } = useQuery<Record<string, GoalProgress>>({
    queryKey: ['savings-goals-progress'],
    queryFn: async () => {
      const progressMap: Record<string, GoalProgress> = {};
      for (const goal of goals) {
        try {
          const res = await fetch(`/api/savings-goals/${goal.id}/progress`, { credentials: 'include' });
          if (res.ok) {
            progressMap[goal.id] = await res.json();
          }
        } catch {
          // Skip failed progress fetches
        }
      }
      return progressMap;
    },
    enabled: goals.length > 0
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newGoal) => {
      const res = await fetch('/api/savings-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          targetGrams: data.targetGrams,
          targetDate: data.targetDate || null,
          note: data.note || null
        })
      });
      if (!res.ok) throw new Error('Failed to create savings goal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      setShowCreateModal(false);
      setNewGoal({ name: '', targetGrams: '', targetDate: '', note: '' });
      toast({ title: 'Success', description: 'Savings goal created successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create savings goal', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SavingsGoal> }) => {
      const res = await fetch(`/api/savings-goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update savings goal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      setShowEditModal(false);
      setSelectedGoal(null);
      toast({ title: 'Success', description: 'Goal updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update goal', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/savings-goals/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete savings goal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      setShowDeleteConfirm(false);
      setSelectedGoal(null);
      toast({ title: 'Success', description: 'Goal deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete goal', variant: 'destructive' });
    }
  });

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const cancelledGoals = goals.filter(g => g.status === 'cancelled');

  const totalTargetGrams = activeGoals.reduce((sum, g) => sum + parseFloat(g.targetGrams), 0);

  const handleCreateGoal = () => {
    if (!newGoal.name || !newGoal.targetGrams || parseFloat(newGoal.targetGrams) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid name and target amount', variant: 'destructive' });
      return;
    }
    createMutation.mutate(newGoal);
  };

  const handleEditGoal = () => {
    if (!selectedGoal) return;
    if (!editGoal.name || !editGoal.targetGrams || parseFloat(editGoal.targetGrams) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid name and target amount', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({
      id: selectedGoal.id,
      data: {
        name: editGoal.name,
        targetGrams: editGoal.targetGrams,
        targetDate: editGoal.targetDate || null,
        note: editGoal.note || null
      }
    });
  };

  const openEditModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setEditGoal({
      name: goal.name,
      targetGrams: goal.targetGrams,
      targetDate: goal.targetDate || '',
      note: goal.note || ''
    });
    setShowEditModal(true);
  };

  const renderGoalCard = (goal: SavingsGoal) => {
    const progress = goalsProgress[goal.id];
    const progressPercent = progress?.progressPercent || 0;
    const currentHoldings = progress?.currentHoldingsGrams || 0;
    const targetGrams = parseFloat(goal.targetGrams);
    
    return (
      <Card 
        key={goal.id} 
        data-testid={`card-goal-${goal.id}`}
        className="bg-white border border-border hover:border-primary/50 transition-all"
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{goal.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Target: {targetGrams.toFixed(4)}g
                </p>
              </div>
            </div>
            <Badge className={statusColors[goal.status]} data-testid={`badge-status-${goal.id}`}>
              {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            </Badge>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-primary">
                {currentHoldings.toFixed(4)}g / {targetGrams.toFixed(4)}g ({progressPercent.toFixed(1)}%)
              </span>
            </div>
            <Progress 
              value={Math.min(progressPercent, 100)} 
              className="h-3"
              data-testid={`progress-${goal.id}`}
            />
          </div>

          {goal.targetDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              <span>Target date: {format(new Date(goal.targetDate), 'PPP')}</span>
            </div>
          )}

          {goal.note && (
            <p className="text-sm text-muted-foreground mb-4 italic">"{goal.note}"</p>
          )}

          {goal.status === 'active' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                data-testid={`button-complete-${goal.id}`}
                onClick={() => updateMutation.mutate({ id: goal.id, data: { status: 'completed' } })}
                disabled={updateMutation.isPending}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid={`button-edit-${goal.id}`}
                onClick={() => openEditModal(goal)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid={`button-cancel-${goal.id}`}
                onClick={() => updateMutation.mutate({ id: goal.id, data: { status: 'cancelled' } })}
                disabled={updateMutation.isPending}
                className="text-gray-500 hover:text-gray-600 hover:bg-gray-50"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid={`button-delete-${goal.id}`}
                onClick={() => {
                  setSelectedGoal(goal);
                  setShowDeleteConfirm(true);
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          )}

          {goal.status === 'completed' && goal.completedAt && (
            <p className="text-sm text-green-600">
              Completed on {format(new Date(goal.completedAt), 'PPP')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              Savings Goals
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your gold savings progress
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            data-testid="button-create-goal"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100">Active Goals</p>
                  <p className="text-3xl font-bold">{activeGoals.length}</p>
                </div>
                <Target className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Target</p>
                  <p className="text-3xl font-bold text-foreground">{totalTargetGrams.toFixed(4)}g</p>
                </div>
                <Coins className="w-10 h-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Goals</p>
                  <p className="text-3xl font-bold text-foreground">{completedGoals.length}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-500" />
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
                <h3 className="font-semibold text-red-800">Failed to load savings goals</h3>
                <p className="text-red-600">Please try again later.</p>
              </div>
            </CardContent>
          </Card>
        ) : goals.length === 0 ? (
          <Card className="bg-white border border-border">
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Savings Goals Yet</h3>
              <p className="text-muted-foreground mb-6">
                Set your first gold savings goal and start tracking your progress
              </p>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                data-testid="button-create-first-goal"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeGoals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Active Goals</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeGoals.map(renderGoalCard)}
                </div>
              </div>
            )}
            {completedGoals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Completed Goals</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {completedGoals.map(renderGoalCard)}
                </div>
              </div>
            )}
            {cancelledGoals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Cancelled Goals</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {cancelledGoals.map(renderGoalCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Create Savings Goal
            </DialogTitle>
            <DialogDescription>
              Set a gold savings target to track your progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="goal-name">Goal Name</Label>
              <Input
                id="goal-name"
                data-testid="input-goal-name"
                placeholder="e.g., Emergency Fund"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="target-grams">Target Amount (grams)</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="target-grams"
                  data-testid="input-target-grams"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  placeholder="10.0000"
                  className="pl-9"
                  value={newGoal.targetGrams}
                  onChange={(e) => setNewGoal({ ...newGoal, targetGrams: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="target-date">Target Date (Optional)</Label>
              <Input
                id="target-date"
                data-testid="input-target-date"
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Input
                id="note"
                data-testid="input-note"
                placeholder="Add a note for this goal"
                value={newGoal.note}
                onChange={(e) => setNewGoal({ ...newGoal, note: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateGoal}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-purple-700"
              data-testid="button-submit-goal"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Edit Savings Goal
            </DialogTitle>
            <DialogDescription>
              Update your savings goal details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-goal-name">Goal Name</Label>
              <Input
                id="edit-goal-name"
                data-testid="input-edit-goal-name"
                value={editGoal.name}
                onChange={(e) => setEditGoal({ ...editGoal, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-target-grams">Target Amount (grams)</Label>
              <Input
                id="edit-target-grams"
                data-testid="input-edit-target-grams"
                type="number"
                min="0.0001"
                step="0.0001"
                value={editGoal.targetGrams}
                onChange={(e) => setEditGoal({ ...editGoal, targetGrams: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-target-date">Target Date (Optional)</Label>
              <Input
                id="edit-target-date"
                data-testid="input-edit-target-date"
                type="date"
                value={editGoal.targetDate}
                onChange={(e) => setEditGoal({ ...editGoal, targetDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-note">Note (Optional)</Label>
              <Input
                id="edit-note"
                data-testid="input-edit-note"
                value={editGoal.note}
                onChange={(e) => setEditGoal({ ...editGoal, note: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditGoal}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-purple-700"
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Goal
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedGoal?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedGoal && deleteMutation.mutate(selectedGoal.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
