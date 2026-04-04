import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Settings as SettingsIcon, Bell, Moon, Sun, Monitor,
  Smartphone, Mail, Shield, RefreshCw, Loader2, Save,
  IdCard, CheckCircle, XCircle, AlertTriangle, Clock,
  DollarSign, Calendar, MessageSquare,
} from 'lucide-react';
import { clearQueryCache, apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface UserPreferencesData {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  transactionAlerts: boolean;
  securityAlerts: boolean;
  marketingEmails: boolean;
  monthlySummaryEmails: boolean;
  theme: string;
  transferApprovalTimeout: number;
}

function FinatradesIdSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [customId, setCustomId] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; message: string; normalizedId?: string } | null>(null);

  const { data: idInfo, isLoading: isLoadingInfo } = useQuery({
    queryKey: ['finatrades-id-info'],
    queryFn: async () => {
      const res = await fetch('/api/finatrades-id/info', {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) throw new Error('Failed to fetch Finatrades ID info');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const checkAvailability = async (id: string) => {
    if (id.length < 4) { setAvailability(null); return; }
    setIsChecking(true);
    try {
      const res = await apiRequest('POST', '/api/finatrades-id/check-availability', { customId: id });
      setAvailability(await res.json());
    } catch {
      setAvailability({ available: false, message: 'Failed to check availability' });
    } finally {
      setIsChecking(false);
    }
  };

  const setIdMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', '/api/finatrades-id/set', { customId: id });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finatrades-id-info'] });
      toast.success('Finatrades ID updated successfully');
      setCustomId('');
      setAvailability(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setCustomId(value);
    if (value.length >= 4) checkAvailability(value);
    else setAvailability(null);
  };

  return (
    <Card data-testid="card-finatrades-id">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="w-5 h-5 text-primary" />
          Finatrades ID
        </CardTitle>
        <CardDescription>
          Set a custom ID for easy identification and passwordless login via OTP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/40">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Your Current ID</p>
            <p className="text-xl font-mono font-bold text-primary" data-testid="text-current-id">
              {isLoadingInfo ? '···' : (idInfo?.displayId || user?.finatradesId || '—')}
            </p>
          </div>
          {idInfo?.customFinatradesId && (
            <Badge variant="secondary" className="text-xs">Custom</Badge>
          )}
        </div>

        {!idInfo?.canChange && idInfo?.canChangeIn > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ID can be changed again in {idInfo.canChangeIn} day{idInfo.canChangeIn !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {(idInfo?.canChange || !idInfo?.customFinatradesId) && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Custom Finatrades ID</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                4–15 characters · letters and numbers only · one change per 30 days
              </p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm select-none">
                    FT-
                  </span>
                  <Input
                    placeholder="YOURNAME"
                    value={customId}
                    onChange={handleInputChange}
                    maxLength={15}
                    className="pl-11 font-mono uppercase tracking-wider"
                    data-testid="input-custom-id"
                  />
                  {isChecking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {!isChecking && availability && (
                    availability.available
                      ? <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                      : <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  )}
                </div>
                <Button
                  onClick={() => setIdMutation.mutate(customId)}
                  disabled={!availability?.available || setIdMutation.isPending}
                  data-testid="button-set-id"
                >
                  {setIdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set ID'}
                </Button>
              </div>
              {availability && (
                <p className={`text-xs mt-1.5 ${availability.available ? 'text-green-600' : 'text-red-500'}`}>
                  {availability.message}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationRow({
  icon: Icon,
  iconColor,
  label,
  description,
  checked,
  onCheckedChange,
  testId,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} className="shrink-0 ml-4" />
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ preferences: UserPreferencesData }>({
    queryKey: ['preferences', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/preferences`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const [localPrefs, setLocalPrefs] = useState<UserPreferencesData | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.preferences) {
      setLocalPrefs(data.preferences);
      setIsDirty(false);
      if (data.preferences.theme && data.preferences.theme !== theme) {
        setTheme(data.preferences.theme);
      }
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferencesData>) => {
      const res = await apiRequest('PUT', `/api/users/${user?.id}/preferences`, updates);
      if (!res.ok) throw new Error('Failed to save preferences');
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      setIsDirty(false);
      toast.success('Settings saved');
      if (result.preferences?.theme) setTheme(result.preferences.theme);
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => {
    if (!localPrefs) return;
    saveMutation.mutate({
      emailNotifications: localPrefs.emailNotifications,
      pushNotifications: localPrefs.pushNotifications,
      transactionAlerts: localPrefs.transactionAlerts,
      securityAlerts: localPrefs.securityAlerts,
      marketingEmails: localPrefs.marketingEmails,
      monthlySummaryEmails: localPrefs.monthlySummaryEmails,
      theme: localPrefs.theme,
      transferApprovalTimeout: localPrefs.transferApprovalTimeout,
    });
  };

  const updatePref = <K extends keyof UserPreferencesData>(key: K, value: UserPreferencesData[K]) => {
    setLocalPrefs(prev => prev ? { ...prev, [key]: value } : null);
    setIsDirty(true);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  if (!user) return null;

  if (isLoading || !localPrefs) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5 pb-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <SettingsIcon className="w-4.5 h-4.5 text-white" />
              </div>
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 ml-11">Manage your account preferences</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !isDirty}
            data-testid="button-save-settings"
            size="sm"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save</>
            )}
          </Button>
        </div>

        {/* Notifications */}
        <Card data-testid="card-notifications">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4.5 h-4.5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Choose how you want to be notified</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Primary toggles */}
            <div className="divide-y divide-border/60">
              <NotificationRow
                icon={Mail}
                iconColor="bg-blue-500/10 text-blue-500"
                label="Email Notifications"
                description="Receive all account updates via email"
                checked={localPrefs.emailNotifications}
                onCheckedChange={(v) => updatePref('emailNotifications', v)}
                testId="switch-email-notifications"
              />
              <NotificationRow
                icon={Smartphone}
                iconColor="bg-violet-500/10 text-violet-500"
                label="Push Notifications"
                description="In-browser and mobile push alerts"
                checked={localPrefs.pushNotifications}
                onCheckedChange={(v) => updatePref('pushNotifications', v)}
                testId="switch-push-notifications"
              />
            </div>

            {/* Granular toggles */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Alert types</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { icon: DollarSign, label: 'Transaction Alerts', key: 'transactionAlerts' as const, color: 'text-green-500' },
                  { icon: Shield, label: 'Security Alerts', key: 'securityAlerts' as const, color: 'text-red-500' },
                  { icon: MessageSquare, label: 'Marketing & News', key: 'marketingEmails' as const, color: 'text-orange-500' },
                  { icon: Calendar, label: 'Monthly Summary', key: 'monthlySummaryEmails' as const, color: 'text-sky-500' },
                ].map(({ icon: Icon, label, key, color }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50 border border-transparent hover:border-border/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    <Switch
                      checked={localPrefs[key] as boolean}
                      onCheckedChange={(v) => updatePref(key, v)}
                      data-testid={`switch-${key}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card data-testid="card-appearance">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sun className="w-4.5 h-4.5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>Choose your preferred color theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(({ value, label, icon: Icon }) => {
                const active = localPrefs.theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => updatePref('theme', value)}
                    data-testid={`button-theme-${value}`}
                    className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all cursor-pointer
                      ${active
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-muted/30 hover:bg-muted/60 hover:border-border'
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Finatrades ID */}
        <FinatradesIdSection />

        {/* Payment Settings */}
        <Card data-testid="card-payment">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4.5 h-4.5 text-primary" />
              Payment Settings
            </CardTitle>
            <CardDescription>
              Incoming transfers require your approval before funds are added to your wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Auto-reject timeout</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Pending transfers will be automatically rejected if not reviewed within this time
              </p>
              <Select
                value={String(localPrefs.transferApprovalTimeout)}
                onValueChange={(v) => updatePref('transferApprovalTimeout', parseInt(v))}
              >
                <SelectTrigger data-testid="select-transfer-timeout" className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                  <SelectItem value="0">Never (manual only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Advanced */}
        <Card data-testid="card-advanced">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="w-4.5 h-4.5 text-primary" />
              Advanced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Refresh All Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Clear cached data and reload fresh information from the server
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearQueryCache();
                  queryClient.invalidateQueries();
                  toast.success('Data refreshed');
                  window.location.reload();
                }}
                data-testid="button-refresh-data"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
