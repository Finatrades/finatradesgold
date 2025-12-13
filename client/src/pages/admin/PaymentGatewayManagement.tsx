import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Landmark, Wallet, Bitcoin, Save, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

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
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankSwiftCode: string;
  bankIban: string;
  bankInstructions: string;
  binancePayEnabled: boolean;
  minDepositUsd: string;
  maxDepositUsd: string;
}

export default function PaymentGatewayManagement() {
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
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankRoutingNumber: '',
    bankSwiftCode: '',
    bankIban: '',
    bankInstructions: '',
    binancePayEnabled: false,
    minDepositUsd: '10',
    maxDepositUsd: '100000',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiRequest('GET', '/api/admin/payment-gateways');
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
          bankName: data.bankName || '',
          bankAccountName: data.bankAccountName || '',
          bankAccountNumber: data.bankAccountNumber || '',
          bankRoutingNumber: data.bankRoutingNumber || '',
          bankSwiftCode: data.bankSwiftCode || '',
          bankIban: data.bankIban || '',
          bankInstructions: data.bankInstructions || '',
          binancePayEnabled: data.binancePayEnabled || false,
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
      await apiRequest('PUT', '/api/admin/payment-gateways', settings);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card className={settings.bankTransferEnabled ? 'border-amber-500' : ''}>
          <CardContent className="pt-6 text-center">
            <Landmark className={`w-8 h-8 mx-auto mb-2 ${settings.bankTransferEnabled ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <p className="font-semibold">Bank Transfer</p>
            <p className={`text-sm ${settings.bankTransferEnabled ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {settings.bankTransferEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </CardContent>
        </Card>
        <Card className={settings.binancePayEnabled ? 'border-yellow-500' : ''}>
          <CardContent className="pt-6 text-center">
            <Bitcoin className={`w-8 h-8 mx-auto mb-2 ${settings.binancePayEnabled ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <p className="font-semibold">Binance Pay</p>
            <p className={`text-sm ${settings.binancePayEnabled ? 'text-yellow-500' : 'text-muted-foreground'}`}>
              {settings.binancePayEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stripe" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stripe" data-testid="tab-stripe">
            <CreditCard className="w-4 h-4 mr-2" /> Stripe
          </TabsTrigger>
          <TabsTrigger value="paypal" data-testid="tab-paypal">
            <Wallet className="w-4 h-4 mr-2" /> PayPal
          </TabsTrigger>
          <TabsTrigger value="bank" data-testid="tab-bank">
            <Landmark className="w-4 h-4 mr-2" /> Bank Transfer
          </TabsTrigger>
          <TabsTrigger value="crypto" data-testid="tab-crypto">
            <Bitcoin className="w-4 h-4 mr-2" /> Crypto
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
                  <CardDescription>Accept bank wire transfers</CardDescription>
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    placeholder="Bank Name"
                    value={settings.bankName}
                    onChange={(e) => setSettings(prev => ({ ...prev, bankName: e.target.value }))}
                    data-testid="input-bank-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder Name</Label>
                  <Input
                    placeholder="Account Holder Name"
                    value={settings.bankAccountName}
                    onChange={(e) => setSettings(prev => ({ ...prev, bankAccountName: e.target.value }))}
                    data-testid="input-bank-account-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="Account Number"
                    value={settings.bankAccountNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                    data-testid="input-bank-account-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Routing Number</Label>
                  <Input
                    placeholder="Routing Number"
                    value={settings.bankRoutingNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, bankRoutingNumber: e.target.value }))}
                    data-testid="input-bank-routing-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SWIFT/BIC Code</Label>
                  <Input
                    placeholder="SWIFT Code"
                    value={settings.bankSwiftCode}
                    onChange={(e) => setSettings(prev => ({ ...prev, bankSwiftCode: e.target.value }))}
                    data-testid="input-bank-swift"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    placeholder="IBAN"
                    value={settings.bankIban}
                    onChange={(e) => setSettings(prev => ({ ...prev, bankIban: e.target.value }))}
                    data-testid="input-bank-iban"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Transfer Instructions</Label>
                <Textarea
                  placeholder="Additional instructions for bank transfers..."
                  value={settings.bankInstructions}
                  onChange={(e) => setSettings(prev => ({ ...prev, bankInstructions: e.target.value }))}
                  className="min-h-[100px]"
                  data-testid="textarea-bank-instructions"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crypto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Crypto Payment Configuration</CardTitle>
                  <CardDescription>Accept cryptocurrency payments via Binance Pay</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Enable Binance Pay</Label>
                  <Switch
                    checked={settings.binancePayEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, binancePayEnabled: checked }))}
                    data-testid="switch-binance-enabled"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  Binance Pay credentials are configured via environment variables (BINANCE_PAY_API_KEY, BINANCE_PAY_SECRET_KEY, BINANCE_PAY_MERCHANT_ID). 
                  Toggle the switch above to enable/disable this payment method.
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
  );
}
