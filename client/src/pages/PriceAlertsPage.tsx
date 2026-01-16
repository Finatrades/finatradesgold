import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Trash2, Loader2, AlertCircle, ArrowUp, ArrowDown, CheckCircle2, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface PriceAlert {
  id: string;
  userId: string;
  targetPricePerGram: string;
  direction: 'above' | 'below';
  channel: 'email' | 'push' | 'in_app' | 'all';
  note?: string | null;
  isActive: boolean;
  triggeredAt?: string | null;
  notificationSentAt?: string | null;
  createdAt: string;
}

export default function PriceAlertsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    targetPricePerGram: '',
    direction: 'above' as 'above' | 'below',
    channel: 'all' as 'email' | 'push' | 'in_app' | 'all',
    note: '',
  });

  const { data: alerts, isLoading, error } = useQuery<PriceAlert[]>({
    queryKey: ['price-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/price-alerts');
      if (!res.ok) throw new Error('Failed to fetch price alerts');
      return res.json();
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create price alert');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      setIsCreateDialogOpen(false);
      setFormData({ targetPricePerGram: '', direction: 'above', channel: 'all', note: '' });
      toast({ title: 'Price alert created', description: 'You will be notified when the price reaches your target.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create price alert', variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/price-alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to update price alert');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      toast({ title: 'Alert updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update alert', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/price-alerts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete price alert');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      toast({ title: 'Alert deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete alert', variant: 'destructive' });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetPricePerGram || parseFloat(formData.targetPricePerGram) <= 0) {
      toast({ title: 'Invalid price', description: 'Please enter a valid target price', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'email': return 'Email';
      case 'push': return 'Push';
      case 'in_app': return 'In-App';
      case 'all': return 'All Channels';
      default: return channel;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              Price Alerts
            </h1>
            <p className="text-muted-foreground mt-1">
              Get notified when gold prices reach your target
            </p>
          </div>
          <Button
            data-testid="button-create-alert"
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Alert
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">Failed to load price alerts. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && alerts?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Price Alerts</h3>
              <p className="text-muted-foreground mb-4">
                Create your first price alert to get notified when gold reaches your target price.
              </p>
              <Button
                data-testid="button-create-first-alert"
                onClick={() => setIsCreateDialogOpen(true)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Alert
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && alerts && alerts.length > 0 && (
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <Card 
                key={alert.id} 
                data-testid={`card-alert-${alert.id}`}
                className={`transition-all ${alert.triggeredAt ? 'border-green-500/50 bg-green-500/5' : ''} ${!alert.isActive ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-full ${alert.direction === 'above' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {alert.direction === 'above' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-lg">
                            ${parseFloat(alert.targetPricePerGram).toFixed(2)}/g
                          </span>
                          <Badge variant={alert.direction === 'above' ? 'default' : 'secondary'}>
                            {alert.direction === 'above' ? 'Above' : 'Below'}
                          </Badge>
                          {alert.triggeredAt ? (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Triggered
                            </Badge>
                          ) : alert.isActive ? (
                            <Badge variant="outline" className="border-purple-500 text-purple-600">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-400 text-gray-500">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {alert.note && (
                          <p className="text-sm text-muted-foreground mt-1">{alert.note}</p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-2">
                          <span>Channel: {getChannelLabel(alert.channel)}</span>
                          <span>•</span>
                          <span>Created: {formatDate(alert.createdAt)}</span>
                          {alert.triggeredAt && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">Triggered: {formatDate(alert.triggeredAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        data-testid={`button-toggle-${alert.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMutation.mutate({ id: alert.id, isActive: !alert.isActive })}
                        disabled={toggleMutation.isPending || !!alert.triggeredAt}
                        title={alert.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {alert.isActive ? (
                          <ToggleRight className="h-5 w-5 text-purple-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        data-testid={`button-delete-${alert.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(alert.id)}
                        disabled={deleteMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-600" />
                Create Price Alert
              </DialogTitle>
              <DialogDescription>
                Set up an alert to be notified when gold price reaches your target.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetPrice">Target Price (USD per gram)</Label>
                <Input
                  id="targetPrice"
                  data-testid="input-target-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 85.00"
                  value={formData.targetPricePerGram}
                  onChange={(e) => setFormData({ ...formData, targetPricePerGram: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Trigger When Price Is</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(value: 'above' | 'below') => setFormData({ ...formData, direction: value })}
                >
                  <SelectTrigger data-testid="select-direction">
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above target price</SelectItem>
                    <SelectItem value="below">Below target price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Notification Channel</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value: 'email' | 'push' | 'in_app' | 'all') => setFormData({ ...formData, channel: value })}
                >
                  <SelectTrigger data-testid="select-channel">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="email">Email Only</SelectItem>
                    <SelectItem value="push">Push Notification Only</SelectItem>
                    <SelectItem value="in_app">In-App Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Input
                  id="note"
                  data-testid="input-note"
                  type="text"
                  placeholder="e.g. Good price to buy"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit-alert"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-purple-500"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Alert
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
