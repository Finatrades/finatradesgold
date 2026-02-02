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
import { 
  Settings as SettingsIcon, Bell, Globe, Moon, Sun,
  Smartphone, Mail, TrendingUp, Shield, Palette,
  Eye, EyeOff, Save, Loader2, Check, Clock, RefreshCw, IdCard, CheckCircle, XCircle, AlertTriangle, LogOut, Lock, ChevronRight, Wallet, User, CreditCard
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

function SettingRow({ 
  icon: Icon, 
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  label, 
  description,
  children,
  onClick
}: { 
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  label: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div 
      className={`flex items-center justify-between py-4 ${onClick ? 'cursor-pointer hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-4 divide-y">
        {children}
      </div>
    </div>
  );
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
      if (!res.ok) throw new Error('Failed to fetch ID info');
      return res.json();
    },
  });

  const checkAvailability = async (id: string) => {
    if (id.length < 4) {
      setAvailability(null);
      return;
    }
    setIsChecking(true);
    try {
      const res = await fetch(`/api/finatrades-id/check-availability?id=${encodeURIComponent(id)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      setAvailability(data);
    } catch (err) {
      setAvailability({ available: false, message: 'Error checking availability' });
    } finally {
      setIsChecking(false);
    }
  };

  const setIdMutation = useMutation({
    mutationFn: async (newId: string) => {
      const res = await apiRequest('POST', '/api/finatrades-id/set', { customId: newId });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to set ID');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Finatrades ID updated!');
      queryClient.invalidateQueries({ queryKey: ['finatrades-id-info'] });
      setCustomId('');
      setAvailability(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    }
  });

  const canChangeId = !idInfo?.customFinatradesId || idInfo?.canChange;

  return (
    <SettingSection title="Finatrades ID">
      <div className="py-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <IdCard className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Your Finatrades ID</p>
            {idInfo?.customFinatradesId ? (
              <p className="text-primary font-mono font-semibold">{idInfo.customFinatradesId}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Not set yet</p>
            )}
          </div>
          {idInfo?.customFinatradesId && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Active</span>
          )}
        </div>

        {canChangeId && (
          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">FT-</span>
                <Input
                  value={customId}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setCustomId(val);
                    checkAvailability(val);
                  }}
                  placeholder="YOURNAME"
                  className="pl-10 font-mono uppercase"
                  maxLength={15}
                  data-testid="input-custom-id"
                />
              </div>
              <Button
                onClick={() => setIdMutation.mutate(customId)}
                disabled={!availability?.available || setIdMutation.isPending}
                data-testid="button-set-id"
              >
                {setIdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set'}
              </Button>
            </div>
            {availability && (
              <p className={`text-xs flex items-center gap-1 ${availability.available ? 'text-green-600' : 'text-red-500'}`}>
                {availability.available ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {availability.message}
              </p>
            )}
          </div>
        )}
      </div>
    </SettingSection>
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
    toast.success(checked ? 'Feature enabled! Redirecting...' : 'Feature disabled');
    
    if (checked) {
      setTimeout(() => {
        window.location.href = '/finapay';
      }, 800);
    }
  };

  return (
    <div 
      id="lock-gold-section" 
      data-testid="card-lock-gold" 
      className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
        isActive 
          ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50' 
          : 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50'
      }`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isActive ? 'bg-green-100 shadow-lg shadow-green-200/50' : 'bg-amber-100'
          }`}>
            <Lock className={`w-5 h-5 transition-colors duration-300 ${
              isActive ? 'text-green-600' : 'text-amber-600'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Lock Gold Price</h3>
            <p className="text-xs text-muted-foreground">
              {isActive ? 'Enabled on FinaPay' : 'Enable price protection'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            data-testid="switch-lock-gold-banner"
          />
        </div>
      </div>
    </div>
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

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Settings saved');
      if (result.preferences?.theme) setTheme(result.preferences.theme);
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const updatePref = <K extends keyof UserPreferencesData>(key: K, value: UserPreferencesData[K]) => {
    if (!localPrefs) return;
    setLocalPrefs({ ...localPrefs, [key]: value });
  };

  const handleSave = () => {
    if (!localPrefs) return;
    saveMutation.mutate(localPrefs);
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
      <div className="max-w-2xl mx-auto space-y-4 pb-12">
        
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">Customize your experience</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm" data-testid="button-save-settings">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Save</>}
          </Button>
        </div>

        {/* Lock Gold - Featured */}
        <LockGoldPriceSection />

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingRow icon={Mail} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Email Notifications" description="Receive updates via email">
            <Switch checked={localPrefs.emailNotifications} onCheckedChange={(v) => updatePref('emailNotifications', v)} data-testid="switch-email-notifications" />
          </SettingRow>
          <SettingRow icon={Smartphone} iconColor="text-green-500" iconBg="bg-green-500/10" label="Push Notifications" description="Browser & mobile alerts">
            <Switch checked={localPrefs.pushNotifications} onCheckedChange={(v) => updatePref('pushNotifications', v)} data-testid="switch-push-notifications" />
          </SettingRow>
          <SettingRow icon={TrendingUp} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Price Alerts" description="Gold price changes">
            <Switch checked={localPrefs.priceAlerts} onCheckedChange={(v) => updatePref('priceAlerts', v)} data-testid="switch-price-alerts" />
          </SettingRow>
          <SettingRow icon={Shield} iconColor="text-red-500" iconBg="bg-red-500/10" label="Security Alerts" description="Login & security updates">
            <Switch checked={localPrefs.securityAlerts} onCheckedChange={(v) => updatePref('securityAlerts', v)} data-testid="switch-security-alerts" />
          </SettingRow>
        </SettingSection>

        {/* Appearance */}
        <SettingSection title="Appearance">
          <div className="py-4">
            <p className="text-sm font-medium mb-3">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: SettingsIcon, label: 'Auto' },
              ].map(({ value, icon: ThemeIcon, label }) => (
                <button
                  key={value}
                  onClick={() => updatePref('theme', value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    localPrefs.theme === value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  }`}
                  data-testid={`button-theme-${value}`}
                >
                  <ThemeIcon className={`w-5 h-5 ${localPrefs.theme === value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${localPrefs.theme === value ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <SettingRow icon={Globe} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Language">
            <Select value={localPrefs.language} onValueChange={(v) => updatePref('language', v)}>
              <SelectTrigger className="w-28 h-8" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow icon={Wallet} iconColor="text-green-500" iconBg="bg-green-500/10" label="Currency">
            <Select value={localPrefs.displayCurrency} onValueChange={(v) => updatePref('displayCurrency', v)}>
              <SelectTrigger className="w-24 h-8" data-testid="select-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SettingSection>

        {/* Privacy & Security */}
        <SettingSection title="Privacy & Security">
          <SettingRow 
            icon={localPrefs.showBalance ? Eye : EyeOff} 
            iconColor={localPrefs.showBalance ? 'text-primary' : 'text-muted-foreground'} 
            iconBg="bg-primary/10" 
            label="Show Balance" 
            description="Display on dashboard"
          >
            <Switch checked={localPrefs.showBalance} onCheckedChange={(v) => updatePref('showBalance', v)} data-testid="switch-show-balance" />
          </SettingRow>
          <SettingRow icon={Shield} iconColor="text-yellow-600" iconBg="bg-yellow-500/10" label="2FA Reminder" description="Show if not enabled">
            <Switch checked={localPrefs.twoFactorReminder} onCheckedChange={(v) => updatePref('twoFactorReminder', v)} data-testid="switch-2fa-reminder" />
          </SettingRow>
        </SettingSection>

        {/* Transfers */}
        <SettingSection title="Transfers">
          <SettingRow icon={Clock} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Auto-Expire Timeout" description="Pending transfer expiry">
            <Select value={String(localPrefs.transferApprovalTimeout)} onValueChange={(v) => updatePref('transferApprovalTimeout', parseInt(v))}>
              <SelectTrigger className="w-24 h-8" data-testid="select-transfer-timeout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12h</SelectItem>
                <SelectItem value="24">24h</SelectItem>
                <SelectItem value="48">48h</SelectItem>
                <SelectItem value="72">72h</SelectItem>
                <SelectItem value="0">Never</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SettingSection>

        {/* Finatrades ID */}
        <FinatradesIdSection />

        {/* Advanced */}
        <SettingSection title="Advanced">
          <SettingRow icon={RefreshCw} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Refresh Data" description="Clear cache & reload">
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
              Refresh
            </Button>
          </SettingRow>
        </SettingSection>

        {/* Sign Out */}
        <div className="bg-red-50 rounded-xl border border-red-200 overflow-hidden">
          <SettingRow icon={LogOut} iconColor="text-red-500" iconBg="bg-red-500/10" label="Sign Out" description="End your session">
            <Button variant="destructive" size="sm" onClick={logout} data-testid="button-signout">
              Sign Out
            </Button>
          </SettingRow>
        </div>

      </div>
    </DashboardLayout>
  );
}
