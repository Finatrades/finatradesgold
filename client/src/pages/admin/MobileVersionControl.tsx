import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Smartphone, Plus, Apple, Chrome, AlertTriangle, RefreshCw, Download, Users } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface AppVersion {
  id: string;
  platform: 'ios' | 'android';
  version: string;
  buildNumber: number;
  releaseDate: string;
  isRequired: boolean;
  isLatest: boolean;
  minOsVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  activeUsers: number;
}

export default function MobileVersionControl() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    platform: 'ios',
    version: '',
    buildNumber: 0,
    isRequired: false,
    minOsVersion: '',
    releaseNotes: '',
    downloadUrl: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mobile-versions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/mobile/versions');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest('POST', '/api/admin/mobile/versions', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-versions'] });
      setCreateOpen(false);
      resetForm();
      toast.success('Version created');
    },
  });

  const toggleRequiredMutation = useMutation({
    mutationFn: async ({ id, isRequired }: { id: string; isRequired: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/mobile/versions/${id}`, { isRequired });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-versions'] });
      toast.success('Version updated');
    },
  });

  const resetForm = () => {
    setForm({
      platform: 'ios',
      version: '',
      buildNumber: 0,
      isRequired: false,
      minOsVersion: '',
      releaseNotes: '',
      downloadUrl: '',
    });
  };

  const versions: AppVersion[] = data?.versions || [];
  const iosVersions = versions.filter(v => v.platform === 'ios');
  const androidVersions = versions.filter(v => v.platform === 'android');

  const stats = {
    totalVersions: versions.length,
    iosLatest: iosVersions.find(v => v.isLatest)?.version || 'N/A',
    androidLatest: androidVersions.find(v => v.isLatest)?.version || 'N/A',
    totalActiveUsers: versions.reduce((sum, v) => sum + v.activeUsers, 0),
  };

  const VersionCard = ({ version }: { version: AppVersion }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        {version.platform === 'ios' ? (
          <Apple className="w-8 h-8 text-gray-700" />
        ) : (
          <Chrome className="w-8 h-8 text-green-500" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">v{version.version}</span>
            <Badge variant="outline">Build {version.buildNumber}</Badge>
            {version.isLatest && <Badge variant="default">Latest</Badge>}
            {version.isRequired && <Badge variant="destructive">Required</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Released: {format(new Date(version.releaseDate), 'MMM d, yyyy')}
          </p>
          <p className="text-sm text-muted-foreground">
            Min OS: {version.minOsVersion} • Users: {version.activeUsers.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Force Update</span>
          <Switch 
            checked={version.isRequired}
            onCheckedChange={(isRequired) => toggleRequiredMutation.mutate({ id: version.id, isRequired })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mobile Version Control</h1>
            <p className="text-muted-foreground">Manage app versions and force updates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Version
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Smartphone className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalVersions}</p>
                  <p className="text-sm text-muted-foreground">Total Versions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Apple className="w-8 h-8 text-gray-700" />
                <div>
                  <p className="text-2xl font-bold">{stats.iosLatest}</p>
                  <p className="text-sm text-muted-foreground">iOS Latest</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Chrome className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.androidLatest}</p>
                  <p className="text-sm text-muted-foreground">Android Latest</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalActiveUsers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Apple className="w-5 h-5" />
                <CardTitle>iOS Versions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {iosVersions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Apple className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No iOS versions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {iosVersions.map((version) => (
                    <VersionCard key={version.id} version={version} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Chrome className="w-5 h-5 text-green-500" />
                <CardTitle>Android Versions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {androidVersions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Chrome className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No Android versions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {androidVersions.map((version) => (
                    <VersionCard key={version.id} version={version} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Force Update Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded-lg">
              <p className="text-sm">
                When a version is marked as "Required", users on older versions will be forced to update 
                before they can continue using the app. This should be used sparingly for critical security 
                updates or breaking changes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Platform</label>
              <Select value={form.platform} onValueChange={(v: 'ios' | 'android') => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ios">iOS</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Version</label>
                <Input 
                  placeholder="1.2.3" 
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Build Number</label>
                <Input 
                  type="number"
                  placeholder="123" 
                  value={form.buildNumber || ''}
                  onChange={(e) => setForm({ ...form, buildNumber: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Minimum OS Version</label>
              <Input 
                placeholder={form.platform === 'ios' ? '14.0' : '8.0'} 
                value={form.minOsVersion}
                onChange={(e) => setForm({ ...form, minOsVersion: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Release Notes</label>
              <Textarea 
                placeholder="What's new in this version..." 
                rows={3}
                value={form.releaseNotes}
                onChange={(e) => setForm({ ...form, releaseNotes: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={form.isRequired}
                onCheckedChange={(v) => setForm({ ...form, isRequired: v })}
              />
              <label className="text-sm">Force update (make this version required)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)}>Create Version</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
