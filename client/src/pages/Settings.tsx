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
import { Input } from '@/components/ui/input';
import { 
  Settings as SettingsIcon, Bell, Globe, DollarSign, Moon, Sun,
  Smartphone, Mail, MessageSquare, TrendingUp, Shield, Palette,
  Eye, EyeOff, Volume2, VolumeX, Save, Loader2, Check, ArrowDownLeft, Clock, Calendar, RefreshCw, IdCard, CheckCircle, XCircle, AlertTriangle, LogOut, Lock
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
  priceAlerts: boolean;
  securityAlerts: boolean;
  marketingEmails: boolean;
  monthlySummaryEmails: boolean;
  displayCurrency: string;
  language: string;
  theme: string;
  compactMode: boolean;
  showBalance: boolean;
  twoFactorReminder: boolean;
  requireTransferApproval: boolean;
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
      const res = await fetch('/api/finatrades-id/info', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch Finatrades ID info');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const checkAvailability = async (id: string) => {
    if (id.length < 4) {
      setAvailability(null);
      return;
    }
    
    setIsChecking(true);
    try {
      const res = await apiRequest('POST', '/api/finatrades-id/check-availability', { customId: id });
      const data = await res.json();
      setAvailability(data);
    } catch {
      setAvailability({ available: false, message: 'Failed to check availability' });
    } finally {
      setIsChecking(false);
    }
  };

  const setIdMutation = useMutation({
    mutationFn: async (customId: string) => {
      const res = await apiRequest('POST', '/api/finatrades-id/set', { customId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finatrades-id-info'] });
      toast.success('Your Finatrades ID has been updated!');
      setCustomId('');
      setAvailability(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setCustomId(value);
    if (value.length >= 4) {
      checkAvailability(value);
    } else {
      setAvailability(null);
    }
  };

  return (
    <Card data-testid="card-finatrades-id">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="w-5 h-5 text-primary" />
          Finatrades ID
        </CardTitle>
        <CardDescription>Customize your unique identifier for easy login</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Finatrades ID</p>
              <p className="text-lg font-mono font-semibold text-primary" data-testid="text-current-id">
                {isLoadingInfo ? '...' : (idInfo?.displayId || user?.finatradesId || 'Not set')}
              </p>
            </div>
            {idInfo?.customFinatradesId && (
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">Custom</span>
            )}
          </div>
        </div>

        {!idInfo?.canChange && idInfo?.canChangeIn > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              You can change your ID again in {idInfo.canChangeIn} days
            </p>
          </div>
        )}

        {(idInfo?.canChange || !idInfo?.customFinatradesId) && (
          <div className="space-y-3">
            <div>
              <Label>Set Custom Finatrades ID</Label>
              <p className="text-xs text-muted-foreground mb-2">4-15 letters/numbers. Changes allowed once per 30 days.</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">FT-</span>
                  <Input
                    placeholder="YOURNAME"
                    value={customId}
                    onChange={handleInputChange}
                    maxLength={15}
                    className="pl-12 font-mono uppercase"
                    data-testid="input-custom-id"
                  />
                  {isChecking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {!isChecking && availability && (
                    availability.available ? (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                    )
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
                <p className={`text-xs mt-1 ${availability.available ? 'text-green-600' : 'text-red-500'}`}>
                  {availability.message}
                </p>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Your Finatrades ID allows passwordless login. After setting a custom ID, you can login using just your ID and an OTP sent to your email.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LockGoldPriceSection() {
  const [isActive, setIsActive] = useState(() => {
    const saved = localStorage.getItem('lockGoldBannerActive');
    return saved !== 'false';
  });

  const handleToggle = (checked: boolean) => {
    setIsActive(checked);
    localStorage.setItem('lockGoldBannerActive', String(checked));
    toast.success(checked ? 'Lock Gold feature enabled on FinaPay' : 'Lock Gold feature hidden from FinaPay');
  };

  return (
    <Card id="lock-gold-section" data-testid="card-lock-gold" className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-yellow-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-600" />
          Lock Gold Price (FGPW)
        </CardTitle>
        <CardDescription>
          Lock your gold at today's market price to protect against price drops
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active/Inactive Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <Label className="text-base">Show on FinaPay</Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? 'Lock Gold card is visible on FinaPay' : 'Lock Gold card is hidden from FinaPay'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              data-testid="switch-lock-gold-banner"
            />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-amber-100/50 border border-amber-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-amber-800">What is Fixed Gold Price Wallet (FGPW)?</p>
              <ul className="space-y-1 text-amber-700">
                <li>• <strong>LGPW (Live):</strong> Your gold value changes with live market price</li>
                <li>• <strong>FGPW (Locked):</strong> Your gold value is fixed at the price when you locked it</li>
                <li>• Lock: Transfer LGPW → FGPW to lock current price</li>
                <li>• Unlock: Transfer FGPW → LGPW before withdraw/sell/transfer</li>
                <li>• All transactions happen from Live Gold (LGPW) only</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          className="w-full bg-amber-600 hover:bg-amber-700"
          onClick={() => window.location.href = '/finapay'}
          data-testid="button-go-to-finapay"
        >
          <Lock className="w-4 h-4 mr-2" />
          Go to FinaPay to Lock Gold
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
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

  // Scroll to section if hash is present (e.g., /settings#lock-gold-section)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight effect
          element.classList.add('ring-2', 'ring-amber-400');
          setTimeout(() => element.classList.remove('ring-2', 'ring-amber-400'), 2000);
        }, 300);
      }
    }
  }, []);

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
      monthlySummaryEmails: localPrefs.monthlySummaryEmails,
      displayCurrency: localPrefs.displayCurrency,
      language: localPrefs.language,
      theme: localPrefs.theme,
      compactMode: localPrefs.compactMode,
      showBalance: localPrefs.showBalance,
      twoFactorReminder: localPrefs.twoFactorReminder,
      requireTransferApproval: localPrefs.requireTransferApproval,
      transferApprovalTimeout: localPrefs.transferApprovalTimeout,
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
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Monthly Summary</span>
                </div>
                <Switch 
                  checked={localPrefs.monthlySummaryEmails}
                  onCheckedChange={(v) => updatePref('monthlySummaryEmails', v)}
                  data-testid="switch-monthly-summary"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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


        <FinatradesIdSection />

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

        <Card data-testid="card-payment">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-primary" />
              Payment Settings
            </CardTitle>
            <CardDescription>Control how you receive payments and transfers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Transfer Approval</Label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      Always Enabled
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For your security, you must accept or reject incoming transfers before they are added to your wallet
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <Label className="text-base">Auto-Expire Timeout</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Pending transfers will automatically be rejected after this time if not accepted
              </p>
              <Select 
                value={String(localPrefs.transferApprovalTimeout)}
                onValueChange={(v) => updatePref('transferApprovalTimeout', parseInt(v))}
              >
                <SelectTrigger data-testid="select-transfer-timeout" className="w-full">
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

            <div className="p-3 bg-info-muted rounded-lg">
              <p className="text-sm text-info-muted-foreground">
                <strong>How it works:</strong> When someone sends you gold or money, you'll receive a notification. 
                You can then accept (receive funds) or reject (return funds to sender) the transfer from your FinaPay page.
              </p>
            </div>
          </CardContent>
        </Card>

        <LockGoldPriceSection />

        <Card data-testid="card-advanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Advanced
            </CardTitle>
            <CardDescription>Cache and data management options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <Label className="text-base">Refresh All Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Clear cached data and fetch fresh information from the server
                  </p>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  clearQueryCache();
                  queryClient.invalidateQueries();
                  toast.success('All data refreshed successfully');
                  window.location.reload();
                }}
                data-testid="button-refresh-data"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Use this if you notice outdated information on your dashboard or wallet balances. 
                This will reload all your account data from the server.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <LogOut className="w-5 h-5" />
              Sign Out
            </CardTitle>
            <CardDescription>Sign out of your Finatrades account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <Label className="text-base">Sign Out</Label>
                  <p className="text-sm text-muted-foreground">
                    This will end your session and return you to the login page
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive"
                onClick={logout}
                data-testid="button-signout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
