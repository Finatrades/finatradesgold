import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, DollarSign, Percent, Shield, Users, CreditCard, 
  TrendingUp, Wallet, Building, Gift, AlertCircle, Save, 
  RefreshCw, Loader2, ChevronRight, Database
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface PlatformConfig {
  id: string;
  category: string;
  configKey: string;
  configValue: string;
  configType: string;
  displayName: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  gold_pricing: { 
    label: 'Gold Pricing', 
    icon: <TrendingUp className="h-4 w-4" />, 
    description: 'Configure gold buy/sell spreads and storage fees' 
  },
  transaction_limits: { 
    label: 'Transaction Limits', 
    icon: <Shield className="h-4 w-4" />, 
    description: 'Set daily/monthly limits per KYC tier' 
  },
  deposit_limits: { 
    label: 'Deposit Limits', 
    icon: <DollarSign className="h-4 w-4" />, 
    description: 'Configure deposit amount restrictions' 
  },
  withdrawal_limits: { 
    label: 'Withdrawal Limits', 
    icon: <Wallet className="h-4 w-4" />, 
    description: 'Set withdrawal limits and fees' 
  },
  p2p_limits: { 
    label: 'P2P Limits', 
    icon: <Users className="h-4 w-4" />, 
    description: 'Configure peer-to-peer transfer limits' 
  },
  bnsl_settings: { 
    label: 'BNSL Settings', 
    icon: <TrendingUp className="h-4 w-4" />, 
    description: 'Buy Now Sell Later agreement settings' 
  },
  finabridge_settings: { 
    label: 'FinaBridge Settings', 
    icon: <Building className="h-4 w-4" />, 
    description: 'Trade finance module configuration' 
  },
  payment_fees: { 
    label: 'Payment Fees', 
    icon: <CreditCard className="h-4 w-4" />, 
    description: 'Configure fees for payment methods' 
  },
  kyc_settings: { 
    label: 'KYC Settings', 
    icon: <Shield className="h-4 w-4" />, 
    description: 'KYC verification configuration' 
  },
  system_settings: { 
    label: 'System Settings', 
    icon: <Settings className="h-4 w-4" />, 
    description: 'Platform-wide system configuration' 
  },
  vault_settings: { 
    label: 'Vault Settings', 
    icon: <Database className="h-4 w-4" />, 
    description: 'Gold vault inventory settings' 
  },
  referral_settings: { 
    label: 'Referral Settings', 
    icon: <Gift className="h-4 w-4" />, 
    description: 'Referral bonus configuration' 
  },
};

const CATEGORIES = Object.keys(CATEGORY_INFO);

export default function PlatformConfiguration() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('gold_pricing');
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/platform-config', {
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConfigs(data.configs || []);
      
      const values: Record<string, string> = {};
      (data.configs || []).forEach((c: PlatformConfig) => {
        values[c.id] = c.configValue;
      });
      setEditedValues(values);
    } catch (err) {
      toast.error('Failed to load platform configuration');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaults = async () => {
    try {
      const res = await fetch('/api/admin/platform-config/seed', {
        method: 'POST',
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to seed');
      toast.success('Default configuration seeded successfully');
      fetchConfigs();
    } catch (err) {
      toast.error('Failed to seed default configuration');
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchConfigs();
    }
  }, [user?.id]);

  const handleValueChange = (configId: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [configId]: value }));
    setHasChanges(true);
  };

  const handleBooleanToggle = (configId: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    setEditedValues(prev => ({ ...prev, [configId]: newValue }));
    setHasChanges(true);
  };

  const saveAllChanges = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editedValues)
        .filter(([id, value]) => {
          const original = configs.find(c => c.id === id);
          return original && original.configValue !== value;
        })
        .map(([id, configValue]) => ({ id, configValue }));

      if (updates.length === 0) {
        toast.info('No changes to save');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/admin/platform-config/bulk-update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-User-Id': user?.id || '' 
        },
        body: JSON.stringify({ updates })
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`Updated ${updates.length} configuration(s)`);
      setHasChanges(false);
      fetchConfigs();
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryConfigs = (category: string) => {
    return configs
      .filter(c => c.category === category)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  };

  const renderConfigInput = (config: PlatformConfig) => {
    const value = editedValues[config.id] ?? config.configValue;

    if (config.configType === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            id={config.id}
            checked={value === 'true'}
            onCheckedChange={() => handleBooleanToggle(config.id, value)}
            data-testid={`switch-${config.configKey}`}
          />
          <Label htmlFor={config.id} className="cursor-pointer">
            {value === 'true' ? 'Enabled' : 'Disabled'}
          </Label>
        </div>
      );
    }

    if (config.configType === 'json') {
      return (
        <Textarea
          id={config.id}
          value={value}
          onChange={(e) => handleValueChange(config.id, e.target.value)}
          placeholder="JSON array or object"
          className="font-mono text-sm"
          rows={3}
          data-testid={`textarea-${config.configKey}`}
        />
      );
    }

    return (
      <Input
        id={config.id}
        type={config.configType === 'number' ? 'number' : 'text'}
        step={config.configType === 'number' ? '0.01' : undefined}
        value={value}
        onChange={(e) => handleValueChange(config.id, e.target.value)}
        className="max-w-xs"
        data-testid={`input-${config.configKey}`}
      />
    );
  };

  if (loading && configs.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="h-6 w-6 text-orange-500" />
              Platform Configuration
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Centralized control for all platform fees, limits, and settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            {configs.length === 0 && (
              <Button onClick={seedDefaults} variant="outline" data-testid="button-seed-defaults">
                <Database className="h-4 w-4 mr-2" />
                Seed Default Config
              </Button>
            )}
            <Button onClick={fetchConfigs} variant="outline" disabled={loading} data-testid="button-refresh-config">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={saveAllChanges} 
              disabled={!hasChanges || saving}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-save-config"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        {hasChanges && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <span className="text-sm text-orange-700 dark:text-orange-300">
              You have unsaved changes. Click "Save Changes" to apply them.
            </span>
          </div>
        )}

        {configs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Configuration Found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">
                The platform configuration has not been initialized yet. Click below to set up default values.
              </p>
              <Button onClick={seedDefaults} className="bg-orange-500 hover:bg-orange-600" data-testid="button-seed-defaults-empty">
                <Database className="h-4 w-4 mr-2" />
                Initialize Default Configuration
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-6">
            <div className="w-64 shrink-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav className="flex flex-col">
                    {CATEGORIES.map((category) => {
                      const info = CATEGORY_INFO[category];
                      const configCount = getCategoryConfigs(category).length;
                      const isActive = activeTab === category;
                      
                      return (
                        <button
                          key={category}
                          onClick={() => setActiveTab(category)}
                          className={`flex items-center justify-between px-4 py-3 text-left border-l-2 transition-colors ${
                            isActive 
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' 
                              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                          data-testid={`tab-${category}`}
                        >
                          <div className="flex items-center gap-2">
                            {info.icon}
                            <span className="text-sm font-medium">{info.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {configCount}
                            </Badge>
                            <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {CATEGORY_INFO[activeTab]?.icon}
                    <CardTitle>{CATEGORY_INFO[activeTab]?.label}</CardTitle>
                  </div>
                  <CardDescription>{CATEGORY_INFO[activeTab]?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {getCategoryConfigs(activeTab).map((config) => (
                      <div key={config.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <div>
                          <Label htmlFor={config.id} className="font-medium">
                            {config.displayName}
                          </Label>
                          {config.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {config.description}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-2 text-xs">
                            {config.configKey}
                          </Badge>
                        </div>
                        <div className="flex justify-end items-center">
                          {renderConfigInput(config)}
                        </div>
                      </div>
                    ))}

                    {getCategoryConfigs(activeTab).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No configuration items in this category
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
