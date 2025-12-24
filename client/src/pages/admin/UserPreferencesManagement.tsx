import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, Users, Search, Mail, Smartphone, Bell, Shield, 
  Eye, EyeOff, Loader2, Edit, Check, X, TrendingUp, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface UserPreferencesData {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  transactionAlerts: boolean;
  priceAlerts: boolean;
  securityAlerts: boolean;
  marketingEmails: boolean;
  displayCurrency: string;
  language: string;
  theme: string;
  compactMode: boolean;
  showBalance: boolean;
  twoFactorReminder: boolean;
}

interface UserWithPrefs {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  preferences: UserPreferencesData | null;
}

export default function UserPreferencesManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPrefs | null>(null);
  const [editingPrefs, setEditingPrefs] = useState<Partial<UserPreferencesData>>({});

  const { data, isLoading } = useQuery<{ users: UserWithPrefs[] }>({
    queryKey: ['admin-user-preferences'],
    queryFn: async () => {
      const res = await fetch('/api/admin/user-preferences');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserPreferencesData> }) => {
      const res = await fetch(`/api/admin/users/${userId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-preferences'] });
      toast.success('User preferences updated');
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Failed to update preferences');
    },
  });

  const users = data?.users || [];
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (user: UserWithPrefs) => {
    setSelectedUser(user);
    setEditingPrefs(user.preferences || {
      emailNotifications: true,
      pushNotifications: true,
      transactionAlerts: true,
      priceAlerts: true,
      securityAlerts: true,
      marketingEmails: false,
      displayCurrency: 'USD',
      language: 'en',
      theme: 'system',
      compactMode: false,
      showBalance: true,
      twoFactorReminder: true,
    });
  };

  const handleSave = () => {
    if (!selectedUser) return;
    updateMutation.mutate({ userId: selectedUser.userId, updates: editingPrefs });
  };

  const getPreferencesSummary = (prefs: UserPreferencesData | null) => {
    if (!prefs) return 'No preferences set';
    const enabled = [];
    if (prefs.emailNotifications) enabled.push('Email');
    if (prefs.pushNotifications) enabled.push('Push');
    if (prefs.transactionAlerts) enabled.push('Transactions');
    return enabled.length > 0 ? enabled.join(', ') : 'All disabled';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              User Preferences Management
            </h1>
            <p className="text-muted-foreground mt-1">View and manage user notification and display preferences</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All Users ({users.length})
                </CardTitle>
                <CardDescription>Search and manage individual user settings</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-users"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.userId}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    data-testid={`user-row-${user.userId}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {user.preferences ? (
                            <>
                              <Badge variant={user.preferences.emailNotifications ? 'default' : 'secondary'} className="text-xs">
                                <Mail className="w-3 h-3 mr-1" />
                                Email
                              </Badge>
                              <Badge variant={user.preferences.pushNotifications ? 'default' : 'secondary'} className="text-xs">
                                <Smartphone className="w-3 h-3 mr-1" />
                                Push
                              </Badge>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-xs">Default settings</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.preferences ? `${user.preferences.displayCurrency} / ${user.preferences.theme}` : 'USD / system'}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(user)}
                        data-testid={`button-edit-${user.userId}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Edit Preferences: {selectedUser?.firstName} {selectedUser?.lastName}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Notifications
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <Label className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4" /> Email
                    </Label>
                    <Switch 
                      checked={editingPrefs.emailNotifications ?? true}
                      onCheckedChange={(v) => setEditingPrefs(p => ({ ...p, emailNotifications: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <Label className="flex items-center gap-2 text-sm">
                      <Smartphone className="w-4 h-4" /> Push
                    </Label>
                    <Switch 
                      checked={editingPrefs.pushNotifications ?? true}
                      onCheckedChange={(v) => setEditingPrefs(p => ({ ...p, pushNotifications: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <Label className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4" /> Transactions
                    </Label>
                    <Switch 
                      checked={editingPrefs.transactionAlerts ?? true}
                      onCheckedChange={(v) => setEditingPrefs(p => ({ ...p, transactionAlerts: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <Label className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4" /> Price
                    </Label>
                    <Switch 
                      checked={editingPrefs.priceAlerts ?? true}
                      onCheckedChange={(v) => setEditingPrefs(p => ({ ...p, priceAlerts: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <Label className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4" /> Security
                    </Label>
                    <Switch 
                      checked={editingPrefs.securityAlerts ?? true}
                      onCheckedChange={(v) => setEditingPrefs(p => ({ ...p, securityAlerts: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <Label className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4" /> Marketing
                    </Label>
                    <Switch 
                      checked={editingPrefs.marketingEmails ?? false}
                      onCheckedChange={(v) => setEditingPrefs(p => ({ ...p, marketingEmails: v }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Display</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select 
                      value={editingPrefs.displayCurrency || 'USD'}
                      onValueChange={(v) => setEditingPrefs(p => ({ ...p, displayCurrency: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select 
                      value={editingPrefs.theme || 'system'}
                      onValueChange={(v) => setEditingPrefs(p => ({ ...p, theme: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Privacy
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <Label className="text-sm">Show Balance</Label>
                    <Switch 
                      checked={editingPrefs.showBalance ?? true}
                      onCheckedChange={(v) => setEditingPrefs(p => ({ ...p, showBalance: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <Label className="text-sm">2FA Reminder</Label>
                    <Switch 
                      checked={editingPrefs.twoFactorReminder ?? true}
                      onCheckedChange={(v) => setEditingPrefs(p => ({ ...p, twoFactorReminder: v }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> Save Changes</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
