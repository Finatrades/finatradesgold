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
  RefreshCw, Loader2, ChevronRight, Database, X, Plus, Globe, FileText
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'BY', name: 'Belarus' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'CN', name: 'China' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CD', name: 'Democratic Republic of Congo' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LY', name: 'Libya' },
  { code: 'ML', name: 'Mali' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'KP', name: 'North Korea' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'RU', name: 'Russia' },
  { code: 'SO', name: 'Somalia' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SY', name: 'Syria' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZW', name: 'Zimbabwe' },
];

import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';

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
    description: 'Set transaction limits by KYC verification level' 
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
  terms_conditions: { 
    label: 'Terms & Conditions', 
    icon: <FileText className="h-4 w-4" />, 
    description: 'Manage terms and conditions for deposits, purchases, and transfers' 
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
        headers: { 
          'X-Requested-With': 'XMLHttpRequest',
          'X-Admin-User-Id': user?.id || '' 
        },
        credentials: 'include'
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

      const res = await apiRequest('POST', '/api/admin/platform-config/bulk-update', { updates }, {
        'X-Admin-User-Id': user?.id || ''
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

    // Special handler for blocked_countries
    if (config.configKey === 'blocked_countries') {
      let blockedList: string[] = [];
      try {
        blockedList = JSON.parse(value || '[]');
      } catch {
        blockedList = [];
      }

      const toggleCountry = (countryCode: string) => {
        const newList = blockedList.includes(countryCode)
          ? blockedList.filter(c => c !== countryCode)
          : [...blockedList, countryCode];
        handleValueChange(config.id, JSON.stringify(newList));
      };

      const removeCountry = (countryCode: string) => {
        const newList = blockedList.filter(c => c !== countryCode);
        handleValueChange(config.id, JSON.stringify(newList));
      };

      return (
        <div className="space-y-3">
          {/* Selected countries */}
          <div className="flex flex-wrap gap-2">
            {blockedList.length === 0 ? (
              <span className="text-sm text-gray-500">No countries blocked</span>
            ) : (
              blockedList.map(code => {
                const country = COUNTRIES.find(c => c.code === code);
                return (
                  <Badge 
                    key={code} 
                    variant="secondary"
                    className="flex items-center gap-1 bg-red-100 text-red-700"
                  >
                    {country?.name || code}
                    <button
                      type="button"
                      onClick={() => removeCountry(code)}
                      className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })
            )}
          </div>

          {/* Country selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Country
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-3 border-b">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-sm">Select Countries to Block</span>
                </div>
              </div>
              <ScrollArea className="h-64">
                <div className="p-2 space-y-1">
                  {COUNTRIES.map(country => {
                    const isBlocked = blockedList.includes(country.code);
                    return (
                      <div
                        key={country.code}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-gray-100 ${
                          isBlocked ? 'bg-red-50' : ''
                        }`}
                        onClick={() => toggleCountry(country.code)}
                      >
                        <Checkbox 
                          checked={isBlocked}
                          onCheckedChange={() => toggleCountry(country.code)}
                        />
                        <span className="text-sm">{country.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{country.code}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
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
    
    // Handle text type (used for terms and conditions)
    if (config.configType === 'text') {
      return (
        <Textarea
          id={config.id}
          value={value}
          onChange={(e) => handleValueChange(config.id, e.target.value)}
          placeholder="Enter text content..."
          className="text-sm min-w-[400px]"
          rows={6}
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
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-purple-500" />
              Platform Configuration
            </h1>
            <p className="text-gray-500 mt-1">
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
              className="bg-purple-500 hover:bg-purple-600"
              data-testid="button-save-config"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        {hasChanges && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-purple-700">
              You have unsaved changes. Click "Save Changes" to apply them.
            </span>
          </div>
        )}

        {configs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Configuration Found</h3>
              <p className="text-gray-500 mb-4 text-center max-w-md">
                The platform configuration has not been initialized yet. Click below to set up default values.
              </p>
              <Button onClick={seedDefaults} className="bg-purple-500 hover:bg-purple-600" data-testid="button-seed-defaults-empty">
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
                              ? 'border-purple-500 bg-purple-50 text-purple-700' 
                              : 'border-transparent hover:bg-gray-50 text-gray-600'
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
                      <div key={config.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start py-4 border-b border-gray-100 last:border-0">
                        <div>
                          <Label htmlFor={config.id} className="font-medium">
                            {config.displayName}
                          </Label>
                          {config.description && (
                            <p className="text-sm text-gray-500 mt-1">
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
