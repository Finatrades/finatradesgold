import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, RefreshCw, DollarSign, Percent, Globe, Shield, Landmark, Plus, Download, FileText, UserCheck, Wallet, Trash2, Edit, Bitcoin, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface CryptoWalletConfig {
  id: string;
  network: string;
  networkLabel: string;
  walletAddress: string;
  memo?: string | null;
  instructions?: string | null;
  isActive: boolean;
  displayOrder: number;
}

interface ComplianceSettings {
  id: string;
  activeKycMode: 'kycAml' | 'finatrades';
  finatradesPersonalConfig?: {
    enableBankingVerification: boolean;
    enableLivenessCapture: boolean;
  };
  finanatradesCorporateConfig?: {
    enableLivenessCapture: boolean;
    requiredDocuments: string[];
  };
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

export default function AdminSettings() {
  const { settings, updateSettings, updateBankAccount, addBankAccount } = usePlatform();
  const { user } = useAuth();
  const [complianceSettings, setComplianceSettings] = useState<ComplianceSettings | null>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  
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
    isActive: true,
    displayOrder: 0,
  });
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    fetchComplianceSettings();
    fetchCryptoWallets();
  }, []);

  const fetchComplianceSettings = async () => {
    try {
      const response = await fetch('/api/admin/compliance-settings', {
        credentials: 'include',
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setComplianceSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch compliance settings:', error);
    } finally {
      setLoadingCompliance(false);
    }
  };

  const handleKycModeChange = async (mode: 'kycAml' | 'finatrades') => {
    try {
      const response = await fetch('/api/admin/compliance-settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-User-Id': user?.id || '' 
        },
        body: JSON.stringify({ activeKycMode: mode })
      });
      if (response.ok) {
        const data = await response.json();
        setComplianceSettings(data);
        toast.success('KYC Mode Updated', {
          description: `Switched to ${mode === 'kycAml' ? 'KYC/AML Compliance' : 'Finatrades KYC'} mode.`
        });
      } else {
        toast.error('Failed to update KYC mode');
      }
    } catch (error) {
      toast.error('Failed to update KYC mode');
    }
  };

  const fetchCryptoWallets = async () => {
    try {
      const response = await fetch('/api/admin/crypto-wallets', {
        credentials: 'include',
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setCryptoWallets(data.wallets || []);
      }
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
      isActive: wallet.isActive,
      displayOrder: wallet.displayOrder,
    });
    setShowWalletDialog(true);
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
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-User-Id': user?.id || '' 
        },
        body: JSON.stringify(walletForm)
      });
      
      if (response.ok) {
        toast.success(editingWallet ? 'Wallet updated' : 'Wallet added');
        setShowWalletDialog(false);
        fetchCryptoWallets();
      } else {
        toast.error('Failed to save wallet');
      }
    } catch (error) {
      toast.error('Failed to save wallet');
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this wallet?')) return;
    
    try {
      const response = await fetch(`/api/admin/crypto-wallets/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      
      if (response.ok) {
        toast.success('Wallet deleted');
        fetchCryptoWallets();
      } else {
        toast.error('Failed to delete wallet');
      }
    } catch (error) {
      toast.error('Failed to delete wallet');
    }
  };

  const handleToggleWalletActive = async (wallet: CryptoWalletConfig) => {
    try {
      const response = await fetch(`/api/admin/crypto-wallets/${wallet.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-User-Id': user?.id || '' 
        },
        body: JSON.stringify({ isActive: !wallet.isActive })
      });
      
      if (response.ok) {
        toast.success(`Wallet ${!wallet.isActive ? 'enabled' : 'disabled'}`);
        fetchCryptoWallets();
      }
    } catch (error) {
      toast.error('Failed to update wallet');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(id);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleSave = () => {
    toast.success("Settings Saved", {
      description: "Platform configuration has been updated successfully."
    });
  };

  const handleAddBankAccount = () => {
    addBankAccount({
      name: "New Bank Account",
      bankName: "Bank Name",
      holderName: "Account Holder",
      iban: "IBAN",
      bic: "BIC/SWIFT",
      currency: "CHF",
      isActive: false
    });
    toast.success("New bank account added", {
      description: "A new bank account template has been added. Please configure the details."
    });
  };

  const handleDownloadAdminManual = async () => {
    try {
      const response = await fetch('/api/documents/admin-manual', {
        credentials: 'include',
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!response.ok) {
        throw new Error('Failed to download manual');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Finatrades-Admin-Manual.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Admin Manual downloaded');
    } catch (error) {
      toast.error('Failed to download admin manual');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
            <p className="text-gray-500">Configure fees, limits, and system parameters.</p>
          </div>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>

        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="limits">Limits</TabsTrigger>
            <TabsTrigger value="bank">Bank</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="pricing">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" /> Gold Pricing Configuration
                  </CardTitle>
                  <CardDescription>Manage spreads and transaction fees for gold trades.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Buy Spread (%)</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={settings.buySpreadPercent}
                          onChange={(e) => updateSettings({ buySpreadPercent: parseFloat(e.target.value) })}
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                      </div>
                      <p className="text-xs text-gray-500">Markup added to spot price for user purchases.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Sell Spread (%)</Label>
                      <div className="relative">
                        <Input 
                          type="number"
                          value={settings.sellSpreadPercent}
                          onChange={(e) => updateSettings({ sellSpreadPercent: parseFloat(e.target.value) })}
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                      </div>
                      <p className="text-xs text-gray-500">Markdown deducted from spot price for user sales.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                    <div className="space-y-2">
                      <Label>Storage Fee (Annual %)</Label>
                      <div className="relative">
                        <Input 
                          type="number"
                          value={settings.storageFeePercent}
                          onChange={(e) => updateSettings({ storageFeePercent: parseFloat(e.target.value) })}
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Trade Amount (CHF)</Label>
                      <div className="relative">
                        <Input 
                          type="number"
                          value={settings.minTradeAmount}
                          onChange={(e) => updateSettings({ minTradeAmount: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="limits">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" /> Compliance Limits
                    </CardTitle>
                    <CardDescription>Set transaction limits based on KYC levels.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-gray-900">Unverified Users (Level 0)</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label>Daily Limit</Label>
                          <Input defaultValue="0" disabled className="bg-gray-50" />
                       </div>
                       <div className="space-y-2">
                          <Label>Withdrawal Limit</Label>
                          <Input defaultValue="0" disabled className="bg-gray-50" />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="font-medium text-sm text-gray-900">Verified Personal (Level 1)</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label>Daily Limit (CHF)</Label>
                          <Input 
                            type="number"
                            value={settings.level1DailyLimit}
                            onChange={(e) => updateSettings({ level1DailyLimit: parseFloat(e.target.value) })}
                          />
                       </div>
                       <div className="space-y-2">
                          <Label>Monthly Limit (CHF)</Label>
                          <Input 
                            type="number"
                            value={settings.level1MonthlyLimit}
                            onChange={(e) => updateSettings({ level1MonthlyLimit: parseFloat(e.target.value) })}
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="font-medium text-sm text-gray-900">Verified Business (Level 2)</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label>Daily Limit (CHF)</Label>
                          <Input defaultValue="Unlimited" />
                       </div>
                       <div className="space-y-2">
                          <Label>Monthly Limit (CHF)</Label>
                          <Input defaultValue="Unlimited" />
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            </TabsContent>

            <TabsContent value="bank">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-purple-600" /> Receiving Bank Accounts
                  </CardTitle>
                  <CardDescription>Manage bank details displayed to users for fiat deposits.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {settings.bankAccounts.map((account) => (
                    <div key={account.id} className={`space-y-4 border rounded-lg p-4 ${account.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/50'}`}>
                       <div className="flex justify-between items-start">
                          <h4 className="font-medium text-gray-900">{account.name}</h4>
                          <Switch 
                            checked={account.isActive}
                            onCheckedChange={(checked) => updateBankAccount(account.id, { isActive: checked })}
                          />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input 
                              value={account.bankName}
                              onChange={(e) => updateBankAccount(account.id, { bankName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Holder</Label>
                            <Input 
                              value={account.holderName}
                              onChange={(e) => updateBankAccount(account.id, { holderName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>IBAN</Label>
                            <Input 
                              value={account.iban}
                              className="font-mono"
                              onChange={(e) => updateBankAccount(account.id, { iban: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>BIC / SWIFT</Label>
                            <Input 
                              value={account.bic}
                              className="font-mono"
                              onChange={(e) => updateBankAccount(account.id, { bic: e.target.value })}
                            />
                          </div>
                       </div>
                    </div>
                  ))}
                  
                  <div className="pt-2">
                     <Button variant="outline" className="w-full" onClick={handleAddBankAccount}>
                       <Plus className="w-4 h-4 mr-2" /> Add New Bank Account
                     </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="crypto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bitcoin className="w-5 h-5 text-orange-500" /> Crypto Wallet Addresses
                  </CardTitle>
                  <CardDescription>Manage cryptocurrency wallet addresses for receiving payments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loadingWallets ? (
                    <div className="text-sm text-gray-500">Loading wallets...</div>
                  ) : cryptoWallets.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500 mb-3">No crypto wallets configured</p>
                      <Button onClick={handleAddWallet}>
                        <Plus className="w-4 h-4 mr-2" /> Add Wallet
                      </Button>
                    </div>
                  ) : (
                    <>
                      {cryptoWallets.map((wallet) => (
                        <div 
                          key={wallet.id} 
                          className={`space-y-3 border rounded-lg p-4 ${wallet.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/50'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Bitcoin className="w-5 h-5 text-orange-500" />
                              <h4 className="font-medium text-gray-900">{wallet.networkLabel}</h4>
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
                      <div className="pt-2">
                        <Button variant="outline" className="w-full" onClick={handleAddWallet}>
                          <Plus className="w-4 h-4 mr-2" /> Add Another Wallet
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-600" /> System Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Maintenance Mode</Label>
                      <p className="text-sm text-gray-500">Disable platform access for all users except admins.</p>
                    </div>
                    <Switch 
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) => updateSettings({ maintenanceMode: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">New User Registration</Label>
                      <p className="text-sm text-gray-500">Allow new users to sign up.</p>
                    </div>
                    <Switch 
                      checked={settings.registrationsEnabled}
                      onCheckedChange={(checked) => updateSettings({ registrationsEnabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Auto-Approve Low Risk KYC</Label>
                      <p className="text-sm text-gray-500">Automatically verify users with low risk scores.</p>
                    </div>
                    <Switch 
                      checked={settings.autoApproveLowRisk}
                      onCheckedChange={(checked) => updateSettings({ autoApproveLowRisk: checked })}
                    />
                  </div>
                  
                  <div className="pt-6 border-t border-gray-100">
                     <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 w-full">
                       <RefreshCw className="w-4 h-4 mr-2" /> Restart System Services
                     </Button>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">Admin Panel Manual</p>
                          <p className="text-sm text-gray-500">Comprehensive guide for platform administrators</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        data-testid="button-download-admin-manual"
                        onClick={handleDownloadAdminManual}
                      >
                        <Download className="w-4 h-4 mr-2" /> Download PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

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
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_NETWORKS.map((network) => (
                      <SelectItem key={network.value} value={network.value}>
                        {network.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input 
                  value={walletForm.networkLabel}
                  onChange={(e) => setWalletForm({...walletForm, networkLabel: e.target.value})}
                  placeholder="e.g. Bitcoin (BTC)"
                />
              </div>
              <div className="space-y-2">
                <Label>Wallet Address *</Label>
                <Textarea 
                  value={walletForm.walletAddress}
                  onChange={(e) => setWalletForm({...walletForm, walletAddress: e.target.value})}
                  placeholder="Enter wallet address"
                  className="font-mono text-sm"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Memo / Tag (Optional)</Label>
                <Input 
                  value={walletForm.memo}
                  onChange={(e) => setWalletForm({...walletForm, memo: e.target.value})}
                  placeholder="For networks that require a memo"
                />
              </div>
              <div className="space-y-2">
                <Label>Instructions (Optional)</Label>
                <Textarea 
                  value={walletForm.instructions}
                  onChange={(e) => setWalletForm({...walletForm, instructions: e.target.value})}
                  placeholder="Any special instructions for users"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch 
                  checked={walletForm.isActive}
                  onCheckedChange={(checked) => setWalletForm({...walletForm, isActive: checked})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWalletDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveWallet}>
                {editingWallet ? 'Save Changes' : 'Add Wallet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}