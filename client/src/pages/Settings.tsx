import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  Eye, EyeOff, Volume2, VolumeX, Save, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    transactions: boolean;
    marketing: boolean;
    priceAlerts: boolean;
    securityAlerts: boolean;
  };
  display: {
    currency: 'USD' | 'AED' | 'EUR';
    language: 'en' | 'ar';
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
  };
  privacy: {
    showBalance: boolean;
    twoFactorReminder: boolean;
  };
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: {
      email: true,
      push: true,
      transactions: true,
      marketing: false,
      priceAlerts: true,
      securityAlerts: true,
    },
    display: {
      currency: 'USD',
      language: 'en',
      theme: (theme as 'light' | 'dark' | 'system') || 'system',
      compactMode: false,
    },
    privacy: {
      showBalance: true,
      twoFactorReminder: true,
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (preferences.display.theme !== theme) {
        setTheme(preferences.display.theme);
      }
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotification = (key: keyof UserPreferences['notifications'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  const updateDisplay = (key: keyof UserPreferences['display'], value: any) => {
    setPreferences(prev => ({
      ...prev,
      display: { ...prev.display, [key]: value }
    }));
  };

  const updatePrivacy = (key: keyof UserPreferences['privacy'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value }
    }));
  };

  if (!user) return null;

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
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-settings">
            {isSaving ? (
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
                checked={preferences.notifications.email}
                onCheckedChange={(v) => updateNotification('email', v)}
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
                checked={preferences.notifications.push}
                onCheckedChange={(v) => updateNotification('push', v)}
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
                  checked={preferences.notifications.transactions}
                  onCheckedChange={(v) => updateNotification('transactions', v)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Price Alerts</span>
                </div>
                <Switch 
                  checked={preferences.notifications.priceAlerts}
                  onCheckedChange={(v) => updateNotification('priceAlerts', v)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Security Alerts</span>
                </div>
                <Switch 
                  checked={preferences.notifications.securityAlerts}
                  onCheckedChange={(v) => updateNotification('securityAlerts', v)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Marketing & News</span>
                </div>
                <Switch 
                  checked={preferences.notifications.marketing}
                  onCheckedChange={(v) => updateNotification('marketing', v)}
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
                  value={preferences.display.currency}
                  onValueChange={(v) => updateDisplay('currency', v)}
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
                  value={preferences.display.language}
                  onValueChange={(v) => updateDisplay('language', v)}
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
                  variant={preferences.display.theme === 'light' ? 'default' : 'outline'}
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => updateDisplay('theme', 'light')}
                  data-testid="button-theme-light"
                >
                  <Sun className="w-5 h-5" />
                  <span>Light</span>
                </Button>
                <Button
                  variant={preferences.display.theme === 'dark' ? 'default' : 'outline'}
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => updateDisplay('theme', 'dark')}
                  data-testid="button-theme-dark"
                >
                  <Moon className="w-5 h-5" />
                  <span>Dark</span>
                </Button>
                <Button
                  variant={preferences.display.theme === 'system' ? 'default' : 'outline'}
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => updateDisplay('theme', 'system')}
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
                checked={preferences.display.compactMode}
                onCheckedChange={(v) => updateDisplay('compactMode', v)}
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
                  {preferences.privacy.showBalance ? (
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
                checked={preferences.privacy.showBalance}
                onCheckedChange={(v) => updatePrivacy('showBalance', v)}
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
                checked={preferences.privacy.twoFactorReminder}
                onCheckedChange={(v) => updatePrivacy('twoFactorReminder', v)}
                data-testid="switch-2fa-reminder"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
