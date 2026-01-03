import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, Plus, Search, Users, Globe, Percent, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: 'development' | 'production' | 'all';
  rolloutPercent: number;
  targetUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export default function FeatureFlags() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: '', name: '', description: '', environment: 'all', rolloutPercent: 100 });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/feature-flags');
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/feature-flags/${id}`, { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Feature flag updated');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newFlag) => {
      const res = await apiRequest('POST', '/api/admin/feature-flags', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      setCreateOpen(false);
      setNewFlag({ key: '', name: '', description: '', environment: 'all', rolloutPercent: 100 });
      toast.success('Feature flag created');
    },
  });

  const flags: FeatureFlag[] = data?.flags || [];
  const filtered = flags.filter(f => 
    f.key.toLowerCase().includes(search.toLowerCase()) || 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: flags.length,
    enabled: flags.filter(f => f.enabled).length,
    production: flags.filter(f => f.environment === 'production' || f.environment === 'all').length,
    partial: flags.filter(f => f.rolloutPercent < 100 && f.rolloutPercent > 0).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Feature Flags</h1>
            <p className="text-muted-foreground">Toggle features without deployment</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Flag
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Flag className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Flags</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.enabled}</p>
                  <p className="text-sm text-muted-foreground">Enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Globe className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.production}</p>
                  <p className="text-sm text-muted-foreground">In Production</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Percent className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.partial}</p>
                  <p className="text-sm text-muted-foreground">Partial Rollout</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Feature Flags</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search flags..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading flags...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Flag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No feature flags found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">{flag.key}</code>
                        <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">{flag.environment}</Badge>
                        {flag.rolloutPercent < 100 && (
                          <Badge variant="outline" className="text-orange-600">
                            {flag.rolloutPercent}% rollout
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium mt-1">{flag.name}</p>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    </div>
                    <Switch 
                      checked={flag.enabled}
                      onCheckedChange={(enabled) => toggleMutation.mutate({ id: flag.id, enabled })}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Key</label>
              <Input 
                placeholder="e.g., new_checkout_flow" 
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input 
                placeholder="New Checkout Flow" 
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input 
                placeholder="Enable the redesigned checkout experience" 
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Environment</label>
              <Select value={newFlag.environment} onValueChange={(v) => setNewFlag({ ...newFlag, environment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  <SelectItem value="development">Development Only</SelectItem>
                  <SelectItem value="production">Production Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Rollout Percentage</label>
              <Input 
                type="number" 
                min="0" 
                max="100"
                value={newFlag.rolloutPercent}
                onChange={(e) => setNewFlag({ ...newFlag, rolloutPercent: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(newFlag)}>Create Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
