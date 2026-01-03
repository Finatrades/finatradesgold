import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Webhook, Plus, Search, RefreshCw, CheckCircle, XCircle, Clock, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, any>;
  responseCode: number | null;
  responseBody: string | null;
  attempts: number;
  status: 'pending' | 'success' | 'failed';
  lastAttemptAt: string;
  createdAt: string;
}

export default function WebhookStatus() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [form, setForm] = useState({ name: '', url: '', events: ['transaction.completed'] });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/webhooks');
      return res.json();
    },
  });

  const { data: deliveriesData } = useQuery({
    queryKey: ['webhook-deliveries'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/webhooks/deliveries');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest('POST', '/api/admin/webhooks', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setCreateOpen(false);
      setForm({ name: '', url: '', events: ['transaction.completed'] });
      toast.success('Webhook created');
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const res = await apiRequest('POST', `/api/admin/webhooks/deliveries/${deliveryId}/retry`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] });
      toast.success('Webhook retry queued');
    },
  });

  const webhooks: WebhookConfig[] = data?.webhooks || [];
  const deliveries: WebhookDelivery[] = deliveriesData?.deliveries || [];

  const stats = {
    total: webhooks.length,
    active: webhooks.filter(w => w.isActive).length,
    successRate: deliveries.length > 0 
      ? Math.round((deliveries.filter(d => d.status === 'success').length / deliveries.length) * 100)
      : 100,
    failed: deliveries.filter(d => d.status === 'failed').length,
  };

  const availableEvents = [
    'transaction.completed',
    'transaction.failed',
    'deposit.confirmed',
    'withdrawal.completed',
    'kyc.approved',
    'kyc.rejected',
    'user.created',
    'bnsl.matured',
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Webhook Status</h1>
            <p className="text-muted-foreground">Monitor outbound webhook deliveries</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Webhook
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Webhook className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Webhooks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Send className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.successRate}%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configured Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No webhooks configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono mt-1">{webhook.url}</p>
                      <div className="flex gap-1 mt-2">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">{event}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Deliveries</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by event..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No webhook deliveries yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Event</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-left py-3 px-2 font-medium">Response</th>
                      <th className="text-left py-3 px-2 font-medium">Attempts</th>
                      <th className="text-left py-3 px-2 font-medium">Time</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.filter(d => !search || d.event.includes(search)).map((delivery) => (
                      <tr key={delivery.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{delivery.event}</code>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={
                            delivery.status === 'success' ? 'default' : 
                            delivery.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {delivery.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          {delivery.responseCode ? (
                            <Badge variant={delivery.responseCode < 400 ? 'outline' : 'destructive'}>
                              {delivery.responseCode}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm">{delivery.attempts}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(delivery.createdAt), { addSuffix: true })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => setSelectedDelivery(delivery)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {delivery.status === 'failed' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => retryMutation.mutate(delivery.id)}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            )}
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
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input 
                placeholder="My Webhook" 
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input 
                placeholder="https://example.com/webhook" 
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Events</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableEvents.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox"
                      checked={form.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, events: [...form.events, event] });
                        } else {
                          setForm({ ...form, events: form.events.filter(e => e !== event) });
                        }
                      }}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payload</label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(selectedDelivery.payload, null, 2)}
                </pre>
              </div>
              {selectedDelivery.responseBody && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Response</label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-48">
                    {selectedDelivery.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
