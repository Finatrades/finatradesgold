import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Users, Monitor, Smartphone, Globe, Search, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface Session {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  location: string;
  lastActivity: string;
  createdAt: string;
  isActive: boolean;
}

export default function SessionManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [terminateAllOpen, setTerminateAllOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/sessions');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const terminateMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest('DELETE', `/api/admin/sessions/${sessionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      setTerminateOpen(false);
      toast.success('Session terminated');
    },
  });

  const terminateAllMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('DELETE', `/api/admin/sessions/user/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      setTerminateAllOpen(false);
      toast.success('All user sessions terminated');
    },
  });

  const sessions: Session[] = data?.sessions || [];
  const filtered = sessions.filter(s => 
    s.userName.toLowerCase().includes(search.toLowerCase()) ||
    s.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    s.ipAddress.includes(search)
  );

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.isActive).length,
    desktop: sessions.filter(s => s.deviceType === 'desktop').length,
    mobile: sessions.filter(s => s.deviceType === 'mobile').length,
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Smartphone className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Session Management</h1>
            <p className="text-muted-foreground">View and manage active user sessions</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active Now</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Monitor className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.desktop}</p>
                  <p className="text-sm text-muted-foreground">Desktop</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Smartphone className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.mobile}</p>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Sessions</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by user or IP..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active sessions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">User</th>
                      <th className="text-left py-3 px-2 font-medium">Device</th>
                      <th className="text-left py-3 px-2 font-medium">IP Address</th>
                      <th className="text-left py-3 px-2 font-medium">Location</th>
                      <th className="text-left py-3 px-2 font-medium">Last Activity</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((session) => (
                      <tr key={session.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{session.userName}</p>
                            <p className="text-sm text-muted-foreground">{session.userEmail}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(session.deviceType)}
                            <span className="text-sm">{session.browser}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{session.ipAddress}</code>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <span className="text-sm">{session.location}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={session.isActive ? 'default' : 'secondary'}>
                            {session.isActive ? 'Active' : 'Idle'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => { setSelectedSession(session); setTerminateOpen(true); }}
                          >
                            <LogOut className="w-4 h-4" />
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
      </div>

      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Terminate Session
            </DialogTitle>
            <DialogDescription>
              This will log out {selectedSession?.userName} from this device. They will need to sign in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedSession && terminateMutation.mutate(selectedSession.sessionId)}
            >
              Terminate Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
