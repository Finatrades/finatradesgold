import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Landmark, Wallet, Bitcoin, Save, Loader2, Eye, EyeOff, CheckCircle2, Plus, Trash2, TrendingUp, Copy, Check, Edit, Upload, X, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/context/AuthContext';

interface BankAccount {
  id: string;
  bankName: string;
  bankAddress: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  iban: string;
  currency: string;
  isActive: boolean;
}

interface CryptoWalletConfig {
  id: string;
  network: string;
  networkLabel: string;
  walletAddress: string;
  memo?: string | null;
  instructions?: string | null;
  qrCodeImage?: string | null;
  isActive: boolean;
  displayOrder: number;
}

const CRYPTO_NETWORKS = [
  { value: 'Bitcoin', label: 'Bitcoin (BTC)' },
  { value: 'Ethereum', label: 'Ethereum (ETH)' },
  { value: 'USDT_TRC20', label: 'USDT (TRC20)' },
  { value: 'USDT_ERC20', label: 'USDT (ERC20)' },
  { value: 'USDC', label: 'USDC' },
  { value: 'BNB', label: 'BNB (BSC)' },
  { value: 'Solana', label: 'Solana (SOL)' },
  { value: 'Polygon', label: 'Polygon (MATIC)' },
  { value: 'Other', label: 'Other' },
];

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
];

interface PaymentGatewaySettings {
  stripeEnabled: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeFeePercent: string;
  stripeFixedFee: string;
  paypalEnabled: boolean;
  paypalClientId: string;
  paypalClientSecret: string;
  paypalMode: string;
  paypalFeePercent: string;
  paypalFixedFee: string;
  bankTransferEnabled: boolean;
  bankAccounts: BankAccount[];
  bankInstructions: string;
  bankTransferFeePercent: string;
  bankTransferFixedFee: string;
  binancePayEnabled: boolean;
  ngeniusEnabled: boolean;
  ngeniusApiKey: string;
  ngeniusOutletRef: string;
  ngeniusRealmName: string;
  ngeniusMode: string;
  ngeniusFeePercent: string;
  ngeniusFixedFee: string;
  metalsApiEnabled: boolean;
  metalsApiKey: string;
  metalsApiProvider: string;
  metalsApiCacheDuration: string;
  goldPriceMarkupPercent: string;
  minDepositUsd: string;
  maxDepositUsd: string;
}

export default function PaymentGatewayManagement() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PaymentGatewaySettings>({
    stripeEnabled: false,
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripeFeePercent: '2.9',
    stripeFixedFee: '0.30',
    paypalEnabled: false,
    paypalClientId: '',
    paypalClientSecret: '',
    paypalMode: 'sandbox',
    paypalFeePercent: '2.9',
    paypalFixedFee: '0.30',
    bankTransferEnabled: false,
    bankAccounts: [],
    bankInstructions: '',
    bankTransferFeePercent: '0',
    bankTransferFixedFee: '0',
    binancePayEnabled: false,
    ngeniusEnabled: false,
    ngeniusApiKey: '',
    ngeniusOutletRef: '',
    ngeniusRealmName: '',
    ngeniusMode: 'sandbox',
    ngeniusFeePercent: '2.5',
    ngeniusFixedFee: '0.30',
    metalsApiEnabled: false,
    metalsApiKey: '',
    metalsApiProvider: 'gold-api',
    metalsApiCacheDuration: '5',
    goldPriceMarkupPercent: '0',
    minDepositUsd: '10',
    maxDepositUsd: '100000',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  
  // Crypto wallet state
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWalletConfig[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [editingWallet, setEditingWallet] = useState<CryptoWalletConfig | null>(null);
  const [walletForm, setWalletForm] = useState({
    network: 'Bitcoin',
    networkLabel: 'Bitcoin (BTC)',
    walletAddress: '',
    memo: '',
    instructions: '',
    qrCodeImage: '',
    isActive: true,
    displayOrder: 0,
  });
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [manualCryptoEnabled, setManualCryptoEnabled] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
      fetchCryptoWallets();
    }
  }, [user?.id]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/payment-gateways', {
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data) {
        setSettings({
          stripeEnabled: data.stripeEnabled || false,
          stripePublishableKey: data.stripePublishableKey || '',
          stripeSecretKey: data.stripeSecretKey || '',
          stripeWebhookSecret: data.stripeWebhookSecret || '',
          stripeFeePercent: data.stripeFeePercent || '2.9',
          stripeFixedFee: data.stripeFixedFee || '0.30',
          paypalEnabled: data.paypalEnabled || false,
          paypalClientId: data.paypalClientId || '',
          paypalClientSecret: data.paypalClientSecret || '',
          paypalMode: data.paypalMode || 'sandbox',
          paypalFeePercent: data.paypalFeePercent || '2.9',
          paypalFixedFee: data.paypalFixedFee || '0.30',
          bankTransferEnabled: data.bankTransferEnabled || false,
          bankAccounts: data.bankAccounts || [],
          bankInstructions: data.bankInstructions || '',
          bankTransferFeePercent: data.bankTransferFeePercent || '0',
          bankTransferFixedFee: data.bankTransferFixedFee || '0',
          binancePayEnabled: data.binancePayEnabled || false,
          ngeniusEnabled: data.ngeniusEnabled || false,
          ngeniusApiKey: data.ngeniusApiKey || '',
          ngeniusOutletRef: data.ngeniusOutletRef || '',
          ngeniusRealmName: data.ngeniusRealmName || '',
          ngeniusMode: data.ngeniusMode || 'sandbox',
          ngeniusFeePercent: data.ngeniusFeePercent || '2.5',
          ngeniusFixedFee: data.ngeniusFixedFee || '0.30',
          metalsApiEnabled: data.metalsApiEnabled || false,
          metalsApiKey: data.metalsApiKey || '',
          metalsApiProvider: data.metalsApiProvider || 'metals-api',
          metalsApiCacheDuration: data.metalsApiCacheDuration?.toString() || '5',
          goldPriceMarkupPercent: data.goldPriceMarkupPercent?.toString() || '0',
          minDepositUsd: data.minDepositUsd || '10',
          maxDepositUsd: data.maxDepositUsd || '100000',
        });
      }
    } catch (error) {
      console.error('Failed to fetch payment gateway settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/payment-gateways', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-User-Id': user?.id || '' 
        },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Payment gateway settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addBankAccount = () => {
    const newAccount: BankAccount = {
      id: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bankName: '',
      bankAddress: '',
      accountHolderName: '',
      accountNumber: '',
      routingNumber: '',
      swiftCode: '',
      iban: '',
      currency: 'USD',
      isActive: true,
    };
    setSettings(prev => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAccount],
    }));
  };

  const updateBankAccount = (id: string, field: keyof BankAccount, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(account =>
        account.id === id ? { ...account, [field]: value } : account
      ),
    }));
  };

  const removeBankAccount = (id: string) => {
    setSettings(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(account => account.id !== id),
    }));
  };

  // Crypto wallet functions
  const fetchCryptoWallets = async () => {
    try {
      const response = await fetch('/api/admin/crypto-wallets', {
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setCryptoWallets(data.wallets || []);
      setManualCryptoEnabled(data.wallets?.some((w: CryptoWalletConfig) => w.isActive) || false);
    } catch (error) {
      console.error('Failed to fetch crypto wallets:', error);
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleAddWallet = () => {
    setEditingWallet(null);
    setWalletForm({
      network: 'Bitcoin',
      networkLabel: 'Bitcoin (BTC)',
      walletAddress: '',
      memo: '',
      instructions: '',
      qrCodeImage: '',
      isActive: true,
      displayOrder: cryptoWallets.length,
    });
    setShowWalletDialog(true);
  };

  const handleEditWallet = (wallet: CryptoWalletConfig) => {
    setEditingWallet(wallet);
    setWalletForm({
      network: wallet.network,
      networkLabel: wallet.networkLabel,
      walletAddress: wallet.walletAddress,
      memo: wallet.memo || '',
      instructions: wallet.instructions || '',
      qrCodeImage: wallet.qrCodeImage || '',
      isActive: wallet.isActive,
      displayOrder: wallet.displayOrder,
    });
    setShowWalletDialog(true);
  };

  const handleQrCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setWalletForm(prev => ({ ...prev, qrCodeImage: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const removeQrCode = () => {
    setWalletForm(prev => ({ ...prev, qrCodeImage: '' }));
  };

  const handleSaveWallet = async () => {
    if (!walletForm.walletAddress.trim()) {
      toast.error('Wallet address is required');
      return;
    }
    
    try {
      const url = editingWallet 
        ? `/api/admin/crypto-wallets/${editingWallet.id}`
        : '/api/admin/crypto-wallets';
      const method = editingWallet ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-User-Id': user?.id || ''
        },
        body: JSON.stringify(walletForm)
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(editingWallet ? 'Wallet updated' : 'Wallet added');
      setShowWalletDialog(false);
      fetchCryptoWallets();
    } catch (error) {
      toast.error('Failed to save wallet');
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this wallet?')) return;
    
    try {
      const res = await fetch(`/api/admin/crypto-wallets/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Wallet deleted');
      fetchCryptoWallets();
    } catch (error) {
      toast.error('Failed to delete wallet');
    }
  };

  const handleToggleWalletActive = async (wallet: CryptoWalletConfig) => {
    try {
      const res = await fetch(`/api/admin/crypto-wallets/${wallet.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-User-Id': user?.id || ''
        },
        body: JSON.stringify({ isActive: !wallet.isActive })
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchCryptoWallets();
    } catch (error) {
      toast.error('Failed to update wallet');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(id);
    setTimeout(() => setCopiedAddress(null), 2000);
    toast.success('Address copied');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Gateway Management</h1>
          <p className="text-muted-foreground">Configure payment methods for user deposits</p>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="button-save-payment-settings">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={settings.stripeEnabled ? 'border-green-500' : ''}>
          <CardContent className="pt-6 text-center">
            <CreditCard className={`w-8 h-8 mx-auto mb-2 ${settings.stripeEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
            <p className="font-semibold">Stripe</p>
            <p className={`text-sm ${settings.stripeEnabled ? 'text-green-500' : 'text-muted-foreground'}`}>
              {settings.stripeEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </CardContent>
        </Card>
        <Card className={settings.paypalEnabled ? 'border-blue-500' : ''}>
          <CardContent className="pt-6 text-center">
            <Wallet className={`w-8 h-8 mx-auto mb-2 ${settings.paypalEnabled ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <p className="font-semibold">PayPal</p>
            <p className={`text-sm ${settings.paypalEnabled ? 'text-blue-500' : 'text-muted-foreground'}`}>
              {settings.paypalEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </CardContent>
        </Card>
        <Card className={settings.bankTransferEnabled ? 'border-purple-500' : ''}>
          <CardContent className="pt-6 text-center">
            <Landmark className={`w-8 h-8 mx-auto mb-2 ${settings.bankTransferEnabled ? 'text-purple-500' : 'text-muted-foreground'}`} />
            <p className="font-semibold">Bank Transfer</p>
            <p className={`text-sm ${settings.bankTransferEnabled ? 'text-purple-500' : 'text-muted-foreground'}`}>
              {settings.bankTransferEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </CardContent>
        </Card>
        <Card className={manualCryptoEnabled ? 'border-purple-500' : ''}>
          <CardContent className="pt-6 text-center">
            <Bitcoin className={`w-8 h-8 mx-auto mb-2 ${manualCryptoEnabled ? 'text-purple-500' : 'text-muted-foreground'}`} />
            <p className="font-semibold">Manual Crypto</p>
            <p className={`text-sm ${manualCryptoEnabled ? 'text-purple-500' : 'text-muted-foreground'}`}>
              {cryptoWallets.filter(w => w.isActive).length} wallet(s)
            </p>
          </CardContent>
        </Card>
        <Card className={settings.ngeniusEnabled ? 'border-purple-500' : ''}>
          <CardContent className="pt-6 text-center">
            <CreditCard className={`w-8 h-8 mx-auto mb-2 ${settings.ngeniusEnabled ? 'text-purple-500' : 'text-muted-foreground'}`} />
            <p className="font-semibold">NGenius</p>
            <p className={`text-sm ${settings.ngeniusEnabled ? 'text-purple-500' : 'text-muted-foreground'}`}>
              {settings.ngeniusEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stripe" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="stripe" data-testid="tab-stripe">
            <CreditCard className="w-4 h-4 mr-2" /> Stripe
          </TabsTrigger>
          <TabsTrigger value="paypal" data-testid="tab-paypal">
            <Wallet className="w-4 h-4 mr-2" /> PayPal
          </TabsTrigger>
          <TabsTrigger value="bank" data-testid="tab-bank">
            <Landmark className="w-4 h-4 mr-2" /> Bank
          </TabsTrigger>
          <TabsTrigger value="crypto" data-testid="tab-crypto">
            <Bitcoin className="w-4 h-4 mr-2" /> Crypto
          </TabsTrigger>
          <TabsTrigger value="ngenius" data-testid="tab-ngenius">
            <CreditCard className="w-4 h-4 mr-2" /> NGenius
          </TabsTrigger>
          <TabsTrigger value="metals-api" data-testid="tab-metals-api">
            <TrendingUp className="w-4 h-4 mr-2" /> Gold API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stripe Configuration</CardTitle>
                  <CardDescription>Accept credit/debit card payments via Stripe</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Enable Stripe</Label>
                  <Switch
                    checked={settings.stripeEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, stripeEnabled: checked }))}
                    data-testid="switch-stripe-enabled"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Publishable Key</Label>
                  <Input
                    placeholder="pk_test_..."
                    value={settings.stripePublishableKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, stripePublishableKey: e.target.value }))}
                    data-testid="input-stripe-publishable-key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets['stripeSecret'] ? 'text' : 'password'}
                      placeholder="sk_test_..."
                      value={settings.stripeSecretKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, stripeSecretKey: e.target.value }))}
                      data-testid="input-stripe-secret-key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleSecret('stripeSecret')}
                    >
                      {showSecrets['stripeSecret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets['stripeWebhook'] ? 'text' : 'password'}
                      placeholder="whsec_..."
                      value={settings.stripeWebhookSecret}
                      onChange={(e) => setSettings(prev => ({ ...prev, stripeWebhookSecret: e.target.value }))}
                      data-testid="input-stripe-webhook-secret"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleSecret('stripeWebhook')}
                    >
                      {showSecrets['stripeWebhook'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fee Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.stripeFeePercent}
                    onChange={(e) => setSettings(prev => ({ ...prev, stripeFeePercent: e.target.value }))}
                    data-testid="input-stripe-fee-percent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paypal">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>PayPal Configuration</CardTitle>
                  <CardDescription>Accept PayPal payments</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Enable PayPal</Label>
                  <Switch
                    checked={settings.paypalEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, paypalEnabled: checked }))}
                    data-testid="switch-paypal-enabled"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input
                    placeholder="PayPal Client ID"
                    value={settings.paypalClientId}
                    onChange={(e) => setSettings(prev => ({ ...prev, paypalClientId: e.target.value }))}
                    data-testid="input-paypal-client-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets['paypalSecret'] ? 'text' : 'password'}
                      placeholder="PayPal Client Secret"
                      value={settings.paypalClientSecret}
                      onChange={(e) => setSettings(prev => ({ ...prev, paypalClientSecret: e.target.value }))}
                      data-testid="input-paypal-client-secret"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleSecret('paypalSecret')}
                    >
                      {showSecrets['paypalSecret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={settings.paypalMode}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, paypalMode: value }))}
                  >
                    <SelectTrigger data-testid="select-paypal-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="live">Live (Production)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fee Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.paypalFeePercent}
                    onChange={(e) => setSettings(prev => ({ ...prev, paypalFeePercent: e.target.value }))}
                    data-testid="input-paypal-fee-percent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bank Transfer Configuration</CardTitle>
                  <CardDescription>Accept bank wire transfers in multiple currencies</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Enable Bank Transfer</Label>
                  <Switch
                    checked={settings.bankTransferEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, bankTransferEnabled: checked }))}
                    data-testid="switch-bank-enabled"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Bank Accounts</h3>
                  <p className="text-sm text-muted-foreground">Add bank accounts for different currencies</p>
                </div>
                <Button onClick={addBankAccount} variant="outline" data-testid="button-add-bank-account">
                  <Plus className="w-4 h-4 mr-2" /> Add Bank Account
                </Button>
              </div>

              {settings.bankAccounts.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center">
                  <Landmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No bank accounts configured</p>
                  <p className="text-sm text-muted-foreground mb-4">Add a bank account to accept wire transfers</p>
                  <Button onClick={addBankAccount} variant="outline" data-testid="button-add-first-bank">
                    <Plus className="w-4 h-4 mr-2" /> Add Bank Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {settings.bankAccounts.map((account, index) => (
                    <Card key={account.id} className={`${account.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={account.isActive}
                                onCheckedChange={(checked) => updateBankAccount(account.id, 'isActive', checked)}
                                data-testid={`switch-bank-active-${index}`}
                              />
                              <span className="text-sm text-muted-foreground">
                                {account.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <Select
                              value={account.currency}
                              onValueChange={(value) => updateBankAccount(account.id, 'currency', value)}
                            >
                              <SelectTrigger className="w-[180px]" data-testid={`select-bank-currency-${index}`}>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                {SUPPORTED_CURRENCIES.map((currency) => (
                                  <SelectItem key={currency.code} value={currency.code}>
                                    {currency.code} - {currency.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeBankAccount(account.id)}
                            data-testid={`button-remove-bank-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input
                              placeholder="Bank Name"
                              value={account.bankName}
                              onChange={(e) => updateBankAccount(account.id, 'bankName', e.target.value)}
                              data-testid={`input-bank-name-${index}`}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Bank Address</Label>
                            <Input
                              placeholder="Bank Address"
                              value={account.bankAddress}
                              onChange={(e) => updateBankAccount(account.id, 'bankAddress', e.target.value)}
                              data-testid={`input-bank-address-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Holder Name</Label>
                            <Input
                              placeholder="Account Holder Name"
                              value={account.accountHolderName}
                              onChange={(e) => updateBankAccount(account.id, 'accountHolderName', e.target.value)}
                              data-testid={`input-bank-holder-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input
                              placeholder="Account Number"
                              value={account.accountNumber}
                              onChange={(e) => updateBankAccount(account.id, 'accountNumber', e.target.value)}
                              data-testid={`input-bank-number-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Routing Number</Label>
                            <Input
                              placeholder="Routing Number"
                              value={account.routingNumber}
                              onChange={(e) => updateBankAccount(account.id, 'routingNumber', e.target.value)}
                              data-testid={`input-bank-routing-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>SWIFT/BIC Code</Label>
                            <Input
                              placeholder="SWIFT Code"
                              value={account.swiftCode}
                              onChange={(e) => updateBankAccount(account.id, 'swiftCode', e.target.value)}
                              data-testid={`input-bank-swift-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>IBAN</Label>
                            <Input
                              placeholder="IBAN"
                              value={account.iban}
                              onChange={(e) => updateBankAccount(account.id, 'iban', e.target.value)}
                              data-testid={`input-bank-iban-${index}`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Label>Transfer Instructions</Label>
                <Textarea
                  placeholder="Additional instructions for bank transfers (shown to all users)..."
                  value={settings.bankInstructions}
                  onChange={(e) => setSettings(prev => ({ ...prev, bankInstructions: e.target.value }))}
                  className="min-h-[100px]"
                  data-testid="textarea-bank-instructions"
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-4">Bank Transfer Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fee Percentage (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      value={settings.bankTransferFeePercent}
                      onChange={(e) => setSettings(prev => ({ ...prev, bankTransferFeePercent: e.target.value }))}
                      data-testid="input-bank-fee-percent"
                    />
                    <p className="text-xs text-muted-foreground">Percentage fee charged on bank transfers</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Fixed Fee (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={settings.bankTransferFixedFee}
                      onChange={(e) => setSettings(prev => ({ ...prev, bankTransferFixedFee: e.target.value }))}
                      data-testid="input-bank-fixed-fee"
                    />
                    <p className="text-xs text-muted-foreground">Fixed amount added to each bank transfer</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crypto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bitcoin className="w-5 h-5 text-purple-500" /> Manual Crypto Payments
                  </CardTitle>
                  <CardDescription>Configure wallet addresses for receiving cryptocurrency payments</CardDescription>
                </div>
                <Button onClick={handleAddWallet} data-testid="button-add-crypto-wallet">
                  <Plus className="w-4 h-4 mr-2" /> Add Wallet
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-purple-800">
                  Users will see these wallet addresses when choosing crypto payment. After sending crypto, users submit their transaction hash for admin verification in Payment Operations.
                </p>
              </div>
              
              {loadingWallets ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : cryptoWallets.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 mb-3">No crypto wallets configured</p>
                  <Button onClick={handleAddWallet} variant="outline">
                    <Plus className="w-4 h-4 mr-2" /> Add Your First Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cryptoWallets.map((wallet) => (
                    <div 
                      key={wallet.id} 
                      className={`space-y-3 border rounded-lg p-4 ${wallet.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/50'}`}
                      data-testid={`crypto-wallet-${wallet.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Bitcoin className="w-5 h-5 text-purple-500" />
                          <h4 className="font-medium text-gray-900">{wallet.networkLabel}</h4>
                          {wallet.qrCodeImage && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full flex items-center gap-1">
                              <QrCode className="w-3 h-3" /> QR
                            </span>
                          )}
                          {!wallet.isActive && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Disabled</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={wallet.isActive}
                            onCheckedChange={() => handleToggleWalletActive(wallet)}
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleEditWallet(wallet)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteWallet(wallet.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                        <code className="text-sm font-mono flex-1 break-all text-gray-700">{wallet.walletAddress}</code>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(wallet.walletAddress, wallet.id)}
                        >
                          {copiedAddress === wallet.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      {wallet.memo && (
                        <p className="text-sm text-gray-500"><strong>Memo/Tag:</strong> {wallet.memo}</p>
                      )}
                      {wallet.instructions && (
                        <p className="text-sm text-gray-500">{wallet.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ngenius">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>NGenius Card Payments</CardTitle>
                  <CardDescription>Accept Visa/Mastercard payments via Network International (NGenius)</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Enable NGenius</Label>
                  <Switch
                    checked={settings.ngeniusEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, ngeniusEnabled: checked }))}
                    data-testid="switch-ngenius-enabled"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets['ngeniusApiKey'] ? 'text' : 'password'}
                      placeholder="NGenius API Key"
                      value={settings.ngeniusApiKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, ngeniusApiKey: e.target.value }))}
                      data-testid="input-ngenius-api-key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleSecret('ngeniusApiKey')}
                    >
                      {showSecrets['ngeniusApiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Outlet Reference</Label>
                  <Input
                    placeholder="Outlet Reference ID"
                    value={settings.ngeniusOutletRef}
                    onChange={(e) => setSettings(prev => ({ ...prev, ngeniusOutletRef: e.target.value }))}
                    data-testid="input-ngenius-outlet-ref"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Realm Name</Label>
                  <Input
                    placeholder="Realm name (e.g., ni)"
                    value={settings.ngeniusRealmName}
                    onChange={(e) => setSettings(prev => ({ ...prev, ngeniusRealmName: e.target.value }))}
                    data-testid="input-ngenius-realm-name"
                  />
                  <p className="text-xs text-muted-foreground">Required for authentication - found in your NGenius portal</p>
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={settings.ngeniusMode}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, ngeniusMode: value }))}
                  >
                    <SelectTrigger data-testid="select-ngenius-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="live">Live (Production)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fee Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.ngeniusFeePercent}
                    onChange={(e) => setSettings(prev => ({ ...prev, ngeniusFeePercent: e.target.value }))}
                    data-testid="input-ngenius-fee-percent"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fixed Fee (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.ngeniusFixedFee}
                    onChange={(e) => setSettings(prev => ({ ...prev, ngeniusFixedFee: e.target.value }))}
                    data-testid="input-ngenius-fixed-fee"
                  />
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-purple-800">
                  NGenius is a card payment gateway by Network International. Once enabled, users will see a "Card Payment" option when depositing funds. 
                  They will be redirected to the secure NGenius hosted payment page to complete the transaction.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metals-api">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gold Price API (GoldAPI.io)</CardTitle>
                  <CardDescription>Configure live gold price feed from goldapi.io</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Enable Gold Price API</Label>
                  <Switch
                    checked={settings.metalsApiEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, metalsApiEnabled: checked }))}
                    data-testid="switch-metals-api-enabled"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets['metalsApiKey'] ? 'text' : 'password'}
                      placeholder="Your Metals API Key"
                      value={settings.metalsApiKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, metalsApiKey: e.target.value }))}
                      data-testid="input-metals-api-key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleSecret('metalsApiKey')}
                    >
                      {showSecrets['metalsApiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Get your API key from <a href="https://www.goldapi.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">goldapi.io</a></p>
                </div>
                <div className="space-y-2">
                  <Label>Cache Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.metalsApiCacheDuration}
                    onChange={(e) => setSettings(prev => ({ ...prev, metalsApiCacheDuration: e.target.value }))}
                    data-testid="input-metals-api-cache"
                  />
                  <p className="text-xs text-muted-foreground">How long to cache gold prices before fetching new data</p>
                </div>
                <div className="space-y-2">
                  <Label>Price Markup (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={settings.goldPriceMarkupPercent}
                    onChange={(e) => setSettings(prev => ({ ...prev, goldPriceMarkupPercent: e.target.value }))}
                    data-testid="input-gold-price-markup"
                  />
                  <p className="text-xs text-muted-foreground">Percentage markup added to the gold price (e.g., 2.5 adds 2.5% to the API price)</p>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-fuchsia-800">
                  <strong>Note:</strong> When enabled, GoldAPI.io will be used as the primary source for gold prices. 
                  If disabled or if the API fails, the system will fall back to the last known price.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure deposit limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Deposit (USD)</Label>
              <Input
                type="number"
                value={settings.minDepositUsd}
                onChange={(e) => setSettings(prev => ({ ...prev, minDepositUsd: e.target.value }))}
                data-testid="input-min-deposit"
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Deposit (USD)</Label>
              <Input
                type="number"
                value={settings.maxDepositUsd}
                onChange={(e) => setSettings(prev => ({ ...prev, maxDepositUsd: e.target.value }))}
                data-testid="input-max-deposit"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Crypto Wallet Add/Edit Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWallet ? 'Edit Crypto Wallet' : 'Add Crypto Wallet'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select 
                value={walletForm.network} 
                onValueChange={(value) => {
                  const network = CRYPTO_NETWORKS.find(n => n.value === value);
                  setWalletForm({
                    ...walletForm, 
                    network: value,
                    networkLabel: network?.label || value
                  });
                }}
              >
                <SelectTrigger data-testid="select-crypto-network">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {CRYPTO_NETWORKS.map(n => (
                    <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input 
                value={walletForm.walletAddress}
                onChange={(e) => setWalletForm({...walletForm, walletAddress: e.target.value})}
                placeholder="Enter wallet address"
                className="font-mono"
                data-testid="input-wallet-address"
              />
            </div>
            <div className="space-y-2">
              <Label>Memo / Tag (Optional)</Label>
              <Input 
                value={walletForm.memo}
                onChange={(e) => setWalletForm({...walletForm, memo: e.target.value})}
                placeholder="For networks that require memo/tag"
                data-testid="input-wallet-memo"
              />
            </div>
            <div className="space-y-2">
              <Label>Instructions (Optional)</Label>
              <Textarea 
                value={walletForm.instructions}
                onChange={(e) => setWalletForm({...walletForm, instructions: e.target.value})}
                placeholder="Additional instructions for users"
                data-testid="input-wallet-instructions"
              />
            </div>
            <div className="space-y-2">
              <Label>QR Code Image (Optional)</Label>
              {walletForm.qrCodeImage ? (
                <div className="relative inline-block">
                  <img 
                    src={walletForm.qrCodeImage} 
                    alt="Wallet QR Code" 
                    className="w-32 h-32 object-contain border rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeQrCode}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500">Click to upload QR code</span>
                    <span className="text-xs text-gray-400">Max 2MB, PNG/JPG</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrCodeUpload}
                      className="hidden"
                      data-testid="input-qr-code-upload"
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={walletForm.isActive}
                onCheckedChange={(checked) => setWalletForm({...walletForm, isActive: checked})}
                data-testid="switch-wallet-active"
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWalletDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWallet} data-testid="button-save-wallet">
              {editingWallet ? 'Update Wallet' : 'Add Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
