import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, Bell, Globe, DollarSign, Moon, Sun,
  Smartphone, Mail, MessageSquare, TrendingUp, Shield, Palette,
  Eye, EyeOff, Volume2, VolumeX, Save, Loader2, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

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

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ preferences: UserPreferencesData }>({
    queryKey: ['preferences', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/preferences`);
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const [localPrefs, setLocalPrefs] = useState<UserPreferencesData | null>(null);

  useEffect(() => {
    if (data?.preferences) {
      setLocalPrefs(data.preferences);
      if (data.preferences.theme && data.preferences.theme !== theme) {
        setTheme(data.preferences.theme);
      }
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferencesData>) => {
      const res = await fetch(`/api/users/${user?.id}/preferences`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Settings saved successfully');
      if (result.preferences?.theme) {
        setTheme(result.preferences.theme);
      }
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const handleSave = () => {
    if (!localPrefs) return;
    saveMutation.mutate({
      emailNotifications: localPrefs.emailNotifications,
      pushNotifications: localPrefs.pushNotifications,
      transactionAlerts: localPrefs.transactionAlerts,
      priceAlerts: localPrefs.priceAlerts,
      securityAlerts: localPrefs.securityAlerts,
      marketingEmails: localPrefs.marketingEmails,
      displayCurrency: localPrefs.displayCurrency,
      language: localPrefs.language,
      theme: localPrefs.theme,
      compactMode: localPrefs.compactMode,
      showBalance: localPrefs.showBalance,
      twoFactorReminder: localPrefs.twoFactorReminder,
    });
  };

  const updatePref = <K extends keyof UserPreferencesData>(key: K, value: UserPreferencesData[K]) => {
    setLocalPrefs(prev => prev ? { ...prev, [key]: value } : null);
  };

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
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">Customize your Finatrades experience</p>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </div>

        <Card data-testid="card-notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose how you want to receive updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
              </div>
              <Switch 
                checked={localPrefs.emailNotifications}
                onCheckedChange={(v) => updatePref('emailNotifications', v)}
                data-testid="switch-email-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser and mobile notifications</p>
                </div>
              </div>
              <Switch 
                checked={localPrefs.pushNotifications}
                onCheckedChange={(v) => updatePref('pushNotifications', v)}
                data-testid="switch-push-notifications"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Transaction Alerts</span>
                </div>
                <Switch 
                  checked={localPrefs.transactionAlerts}
                  onCheckedChange={(v) => updatePref('transactionAlerts', v)}
                  data-testid="switch-transaction-alerts"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Price Alerts</span>
                </div>
                <Switch 
                  checked={localPrefs.priceAlerts}
                  onCheckedChange={(v) => updatePref('priceAlerts', v)}
                  data-testid="switch-price-alerts"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Security Alerts</span>
                </div>
                <Switch 
                  checked={localPrefs.securityAlerts}
                  onCheckedChange={(v) => updatePref('securityAlerts', v)}
                  data-testid="switch-security-alerts"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Marketing & News</span>
                </div>
                <Switch 
                  checked={localPrefs.marketingEmails}
                  onCheckedChange={(v) => updatePref('marketingEmails', v)}
                  data-testid="switch-marketing-emails"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-display">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Display Settings
            </CardTitle>
            <CardDescription>Customize how information is displayed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Display Currency</Label>
                <Select 
                  value={localPrefs.displayCurrency}
                  onValueChange={(v) => updatePref('displayCurrency', v)}
                >
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="AED">AED (Dh)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Gold is always stored in grams</p>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select 
                  value={localPrefs.language}
                  onValueChange={(v) => updatePref('language', v)}
                >
                  <SelectTrigger data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base">Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={localPrefs.theme === 'light' ? 'default' : 'outline'}
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => updatePref('theme', 'light')}
                  data-testid="button-theme-light"
                >
                  <Sun className="w-5 h-5" />
                  <span>Light</span>
                </Button>
                <Button
                  variant={localPrefs.theme === 'dark' ? 'default' : 'outline'}
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => updatePref('theme', 'dark')}
                  data-testid="button-theme-dark"
                >
                  <Moon className="w-5 h-5" />
                  <span>Dark</span>
                </Button>
                <Button
                  variant={localPrefs.theme === 'system' ? 'default' : 'outline'}
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => updatePref('theme', 'system')}
                  data-testid="button-theme-system"
                >
                  <SettingsIcon className="w-5 h-5" />
                  <span>System</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label className="text-base">Compact Mode</Label>
                <p className="text-sm text-muted-foreground">Show more information in less space</p>
              </div>
              <Switch 
                checked={localPrefs.compactMode}
                onCheckedChange={(v) => updatePref('compactMode', v)}
                data-testid="switch-compact-mode"
              />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-privacy">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Privacy Settings
            </CardTitle>
            <CardDescription>Control your privacy preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {localPrefs.showBalance ? (
                    <Eye className="w-5 h-5 text-primary" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Label className="text-base">Show Balance</Label>
                  <p className="text-sm text-muted-foreground">Display balance on dashboard</p>
                </div>
              </div>
              <Switch 
                checked={localPrefs.showBalance}
                onCheckedChange={(v) => updatePref('showBalance', v)}
                data-testid="switch-show-balance"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <Label className="text-base">2FA Reminder</Label>
                  <p className="text-sm text-muted-foreground">Show reminder if 2FA is not enabled</p>
                </div>
              </div>
              <Switch 
                checked={localPrefs.twoFactorReminder}
                onCheckedChange={(v) => updatePref('twoFactorReminder', v)}
                data-testid="switch-2fa-reminder"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
