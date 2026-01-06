import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/queryClient';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Shield, Mail, Key, Clock, AlertCircle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface SecuritySettingsData {
  id: string;
  emailOtpEnabled: boolean;
  passkeyEnabled: boolean;
  otpOnLogin: boolean;
  otpOnWithdrawal: boolean;
  otpOnTransfer: boolean;
  otpOnBuyGold: boolean;
  otpOnSellGold: boolean;
  otpOnProfileChange: boolean;
  otpOnPasswordChange: boolean;
  otpOnBnslCreate: boolean;
  otpOnBnslEarlyTermination: boolean;
  otpOnVaultWithdrawal: boolean;
  otpOnTradeBridge: boolean;
  otpOnPeerRequest: boolean;
  otpOnAccountDeletion: boolean;
  // Admin OTP settings
  adminOtpEnabled: boolean;
  adminOtpOnKycApproval: boolean;
  adminOtpOnDepositApproval: boolean;
  adminOtpOnWithdrawalApproval: boolean;
  adminOtpOnBnslApproval: boolean;
  adminOtpOnTradeCaseApproval: boolean;
  adminOtpOnUserSuspension: boolean;
  adminOtpOnVaultDepositApproval: boolean;
  adminOtpOnVaultWithdrawalApproval: boolean;
  adminOtpOnTransactionApproval: boolean;
  // Passkey settings
  passkeyOnLogin: boolean;
  passkeyOnWithdrawal: boolean;
  passkeyOnTransfer: boolean;
  passkeyOnHighValueTransaction: boolean;
  passkeyHighValueThresholdUsd: string;
  otpExpiryMinutes: number;
  otpMaxAttempts: number;
  otpCooldownMinutes: number;
}

export default function SecuritySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SecuritySettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/admin/security-settings', {
        headers: { 'X-Admin-User-Id': user.id }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !user) return;
    
    setSaving(true);
    try {
      const { id, ...updates } = settings;
      const res = await apiFetch('/api/admin/security-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Admin-User-Id': user.id
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Security settings updated successfully');
    } catch (error) {
      toast.error('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SecuritySettingsData>(key: K, value: SecuritySettingsData[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load security settings</p>
          <Button onClick={fetchSettings} className="mt-4">Retry</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Security Settings</h1>
            <p className="text-gray-500">Configure Email OTP and Passkey verification for sensitive actions.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-settings">
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Tabs defaultValue="otp" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="otp" data-testid="tab-otp">User OTP</TabsTrigger>
            <TabsTrigger value="admin" data-testid="tab-admin">Admin Approval</TabsTrigger>
            <TabsTrigger value="passkey" data-testid="tab-passkey">Passkeys</TabsTrigger>
            <TabsTrigger value="config" data-testid="tab-config">Configuration</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="otp">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-purple-500" /> Email OTP Verification
                    </CardTitle>
                    <CardDescription>
                      Require users to verify their identity via email code before performing sensitive actions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-base font-semibold">Enable Email OTP</Label>
                        <p className="text-sm text-gray-500">Master switch for email OTP verification</p>
                      </div>
                      <Switch
                        checked={settings.emailOtpEnabled}
                        onCheckedChange={(checked) => updateSetting('emailOtpEnabled', checked)}
                        data-testid="switch-email-otp-enabled"
                      />
                    </div>

                    {settings.emailOtpEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Login</Label>
                          <Switch
                            checked={settings.otpOnLogin}
                            onCheckedChange={(checked) => updateSetting('otpOnLogin', checked)}
                            data-testid="switch-otp-login"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Withdrawals</Label>
                          <Switch
                            checked={settings.otpOnWithdrawal}
                            onCheckedChange={(checked) => updateSetting('otpOnWithdrawal', checked)}
                            data-testid="switch-otp-withdrawal"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Transfers</Label>
                          <Switch
                            checked={settings.otpOnTransfer}
                            onCheckedChange={(checked) => updateSetting('otpOnTransfer', checked)}
                            data-testid="switch-otp-transfer"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Buy Gold</Label>
                          <Switch
                            checked={settings.otpOnBuyGold}
                            onCheckedChange={(checked) => updateSetting('otpOnBuyGold', checked)}
                            data-testid="switch-otp-buy-gold"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Sell Gold</Label>
                          <Switch
                            checked={settings.otpOnSellGold}
                            onCheckedChange={(checked) => updateSetting('otpOnSellGold', checked)}
                            data-testid="switch-otp-sell-gold"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Password Change</Label>
                          <Switch
                            checked={settings.otpOnPasswordChange}
                            onCheckedChange={(checked) => updateSetting('otpOnPasswordChange', checked)}
                            data-testid="switch-otp-password-change"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Profile Changes</Label>
                          <Switch
                            checked={settings.otpOnProfileChange}
                            onCheckedChange={(checked) => updateSetting('otpOnProfileChange', checked)}
                            data-testid="switch-otp-profile-change"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>BNSL Create</Label>
                          <Switch
                            checked={settings.otpOnBnslCreate}
                            onCheckedChange={(checked) => updateSetting('otpOnBnslCreate', checked)}
                            data-testid="switch-otp-bnsl-create"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>BNSL Early Termination</Label>
                          <Switch
                            checked={settings.otpOnBnslEarlyTermination}
                            onCheckedChange={(checked) => updateSetting('otpOnBnslEarlyTermination', checked)}
                            data-testid="switch-otp-bnsl-termination"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Vault Withdrawal</Label>
                          <Switch
                            checked={settings.otpOnVaultWithdrawal}
                            onCheckedChange={(checked) => updateSetting('otpOnVaultWithdrawal', checked)}
                            data-testid="switch-otp-vault-withdrawal"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Trade Bridge</Label>
                          <Switch
                            checked={settings.otpOnTradeBridge}
                            onCheckedChange={(checked) => updateSetting('otpOnTradeBridge', checked)}
                            data-testid="switch-otp-trade-bridge"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Peer Requests</Label>
                          <Switch
                            checked={settings.otpOnPeerRequest}
                            onCheckedChange={(checked) => updateSetting('otpOnPeerRequest', checked)}
                            data-testid="switch-otp-peer-request"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Account Deletion</Label>
                          <Switch
                            checked={settings.otpOnAccountDeletion}
                            onCheckedChange={(checked) => updateSetting('otpOnAccountDeletion', checked)}
                            data-testid="switch-otp-account-deletion"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="admin">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-purple-500" /> Admin Multi-Approval OTP
                    </CardTitle>
                    <CardDescription>
                      Require OTP verification for admin actions. When enabled, admins must verify via email code before approving sensitive operations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div>
                        <Label className="text-base font-semibold">Enable Admin OTP Verification</Label>
                        <p className="text-sm text-gray-500">Master switch for admin multi-approval OTP</p>
                      </div>
                      <Switch
                        checked={settings.adminOtpEnabled}
                        onCheckedChange={(checked) => updateSetting('adminOtpEnabled', checked)}
                        data-testid="switch-admin-otp-enabled"
                      />
                    </div>

                    {settings.adminOtpEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>KYC Approval</Label>
                          <Switch
                            checked={settings.adminOtpOnKycApproval}
                            onCheckedChange={(checked) => updateSetting('adminOtpOnKycApproval', checked)}
                            data-testid="switch-admin-otp-kyc"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Deposit Approval</Label>
                          <Switch
                            checked={settings.adminOtpOnDepositApproval}
                            onCheckedChange={(checked) => updateSetting('adminOtpOnDepositApproval', checked)}
                            data-testid="switch-admin-otp-deposit"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Withdrawal Approval</Label>
                          <Switch
                            checked={settings.adminOtpOnWithdrawalApproval}
                            onCheckedChange={(checked) => updateSetting('adminOtpOnWithdrawalApproval', checked)}
                            data-testid="switch-admin-otp-withdrawal"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>BNSL Approval</Label>
                          <Switch
                            checked={settings.adminOtpOnBnslApproval}
                            onCheckedChange={(checked) => updateSetting('adminOtpOnBnslApproval', checked)}
                            data-testid="switch-admin-otp-bnsl"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Trade Case Approval</Label>
                          <Switch
                            checked={settings.adminOtpOnTradeCaseApproval}
                            onCheckedChange={(checked) => updateSetting('adminOtpOnTradeCaseApproval', checked)}
                            data-testid="switch-admin-otp-trade-case"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>User Suspension</Label>
                          <Switch
                            checked={settings.adminOtpOnUserSuspension}
                            onCheckedChange={(checked) => updateSetting('adminOtpOnUserSuspension', checked)}
                            data-testid="switch-admin-otp-suspension"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Vault Deposit Approval</Label>
                          <Switch
                            checked={settings.adminOtpOnVaultDepositApproval}
                            onCheckedChange={(checked) => updateSetting('adminOtpOnVaultDepositApproval', checked)}
                            data-testid="switch-admin-otp-vault-deposit"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Vault Withdrawal Approval</Label>
                          <Switch
                            checked={settings.adminOtpOnVaultWithdrawalApproval}
                            onCheckedChange={(checked) => updateSetting('adminOtpOnVaultWithdrawalApproval', checked)}
                            data-testid="switch-admin-otp-vault-withdrawal"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Transaction Approval</Label>
                          <Switch
                            checked={settings.adminOtpOnTransactionApproval}
                            onCheckedChange={(checked) => updateSetting('adminOtpOnTransactionApproval', checked)}
                            data-testid="switch-admin-otp-transaction"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="passkey">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-purple-500" /> Passkey Authentication
                  </CardTitle>
                  <CardDescription>
                    Allow users to use biometric or hardware security keys for authentication.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base font-semibold">Enable Passkeys</Label>
                      <p className="text-sm text-gray-500">Master switch for passkey authentication</p>
                    </div>
                    <Switch
                      checked={settings.passkeyEnabled}
                      onCheckedChange={(checked) => updateSetting('passkeyEnabled', checked)}
                      data-testid="switch-passkey-enabled"
                    />
                  </div>

                  {settings.passkeyEnabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Login</Label>
                          <Switch
                            checked={settings.passkeyOnLogin}
                            onCheckedChange={(checked) => updateSetting('passkeyOnLogin', checked)}
                            data-testid="switch-passkey-login"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Withdrawals</Label>
                          <Switch
                            checked={settings.passkeyOnWithdrawal}
                            onCheckedChange={(checked) => updateSetting('passkeyOnWithdrawal', checked)}
                            data-testid="switch-passkey-withdrawal"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Transfers</Label>
                          <Switch
                            checked={settings.passkeyOnTransfer}
                            onCheckedChange={(checked) => updateSetting('passkeyOnTransfer', checked)}
                            data-testid="switch-passkey-transfer"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>High-Value Transactions</Label>
                          <Switch
                            checked={settings.passkeyOnHighValueTransaction}
                            onCheckedChange={(checked) => updateSetting('passkeyOnHighValueTransaction', checked)}
                            data-testid="switch-passkey-high-value"
                          />
                        </div>
                      </div>

                      {settings.passkeyOnHighValueTransaction && (
                        <div className="space-y-2">
                          <Label>High-Value Threshold (USD)</Label>
                          <Input
                            type="number"
                            value={settings.passkeyHighValueThresholdUsd}
                            onChange={(e) => updateSetting('passkeyHighValueThresholdUsd', e.target.value)}
                            data-testid="input-passkey-threshold"
                          />
                          <p className="text-xs text-gray-500">
                            Transactions above this amount will require passkey verification.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="config">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-500" /> OTP Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure timing and attempt limits for OTP verification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Code Expiry (minutes)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={settings.otpExpiryMinutes}
                        onChange={(e) => updateSetting('otpExpiryMinutes', parseInt(e.target.value) || 10)}
                        data-testid="input-otp-expiry"
                      />
                      <p className="text-xs text-gray-500">How long before a code expires.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Attempts</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={settings.otpMaxAttempts}
                        onChange={(e) => updateSetting('otpMaxAttempts', parseInt(e.target.value) || 3)}
                        data-testid="input-otp-attempts"
                      />
                      <p className="text-xs text-gray-500">Failed attempts before lockout.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Cooldown (minutes)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={settings.otpCooldownMinutes}
                        onChange={(e) => updateSetting('otpCooldownMinutes', parseInt(e.target.value) || 1)}
                        data-testid="input-otp-cooldown"
                      />
                      <p className="text-xs text-gray-500">Wait time between code requests.</p>
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
