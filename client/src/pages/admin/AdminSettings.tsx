import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw, DollarSign, Percent, Globe, Shield, Landmark, Plus, Download, FileText, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';

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

export default function AdminSettings() {
  const { settings, updateSettings, updateBankAccount, addBankAccount } = usePlatform();
  const { user } = useAuth();
  const [complianceSettings, setComplianceSettings] = useState<ComplianceSettings | null>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(true);

  useEffect(() => {
    fetchComplianceSettings();
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
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="pricing">Pricing & Fees</TabsTrigger>
            <TabsTrigger value="limits">Limits & KYC</TabsTrigger>
            <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
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
                      <UserCheck className="w-5 h-5 text-orange-600" /> KYC Verification Mode
                    </CardTitle>
                    <CardDescription>Choose which KYC verification system to use for user onboarding.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingCompliance ? (
                      <div className="text-sm text-gray-500">Loading...</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                          data-testid="kyc-mode-kycaml"
                          onClick={() => handleKycModeChange('kycAml')}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            complianceSettings?.activeKycMode === 'kycAml' 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              complianceSettings?.activeKycMode === 'kycAml' 
                                ? 'border-orange-500' 
                                : 'border-gray-300'
                            }`}>
                              {complianceSettings?.activeKycMode === 'kycAml' && (
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                              )}
                            </div>
                            <span className="font-medium">KYC/AML Compliance</span>
                          </div>
                          <p className="text-sm text-gray-500 ml-7">
                            Full regulatory compliance with document verification, sanctions screening, and risk assessment. Suitable for regulated financial services.
                          </p>
                        </div>
                        
                        <div 
                          data-testid="kyc-mode-finatrades"
                          onClick={() => handleKycModeChange('finatrades')}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            complianceSettings?.activeKycMode === 'finatrades' 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              complianceSettings?.activeKycMode === 'finatrades' 
                                ? 'border-orange-500' 
                                : 'border-gray-300'
                            }`}>
                              {complianceSettings?.activeKycMode === 'finatrades' && (
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                              )}
                            </div>
                            <span className="font-medium">Finatrades KYC</span>
                          </div>
                          <p className="text-sm text-gray-500 ml-7">
                            Simplified verification: Banking verification + liveness capture for personal accounts, standard questionnaire for corporate accounts.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

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
      </div>
    </AdminLayout>
  );
}