import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Smartphone, Key, Copy, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, Lock, KeyRound, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useLocation } from 'wouter';

export default function Security() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  
  // MFA States
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Setup dialog states
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(false);
  
  // Disable dialog states
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Transaction PIN states
  const [pinStatus, setPinStatus] = useState<{hasPin: boolean; isLocked: boolean; lockedUntil?: string | null}>({hasPin: false, isLocked: false});
  const [isPinLoading, setIsPinLoading] = useState(true);
  const [showPinSetupDialog, setShowPinSetupDialog] = useState(false);
  const [showPinResetDialog, setShowPinResetDialog] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [confirmPinValue, setConfirmPinValue] = useState('');
  const [pinPassword, setPinPassword] = useState('');
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [isPinSaving, setIsPinSaving] = useState(false);
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');

  useEffect(() => {
    if (user) {
      fetchMfaStatus();
      fetchPinStatus();
    }
  }, [user]);

  const fetchPinStatus = async () => {
    if (!user) return;
    
    try {
      const res = await fetch(`/api/transaction-pin/status/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setPinStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch PIN status:', error);
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleSetupPin = async () => {
    if (!user || pinValue.length !== 6 || pinValue !== confirmPinValue || !pinPassword) {
      toast.error('Please fill in all fields correctly');
      return;
    }
    
    setIsPinSaving(true);
    
    try {
      const res = await fetch('/api/transaction-pin/setup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ userId: user.id, pin: pinValue, password: pinPassword }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to set up PIN');
      }
      
      setPinStatus({ hasPin: true, isLocked: false });
      setShowPinSetupDialog(false);
      resetPinForm();
      toast.success('Transaction PIN set up successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set up PIN');
    } finally {
      setIsPinSaving(false);
    }
  };

  const handleResetPin = async () => {
    if (!user || pinValue.length !== 6 || pinValue !== confirmPinValue || !pinPassword) {
      toast.error('Please fill in all fields correctly');
      return;
    }
    
    setIsPinSaving(true);
    
    try {
      const res = await fetch('/api/transaction-pin/reset', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ userId: user.id, newPin: pinValue, password: pinPassword }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset PIN');
      }
      
      setPinStatus({ hasPin: true, isLocked: false });
      setShowPinResetDialog(false);
      resetPinForm();
      toast.success('Transaction PIN has been reset');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset PIN');
    } finally {
      setIsPinSaving(false);
    }
  };

  const resetPinForm = () => {
    setPinValue('');
    setConfirmPinValue('');
    setPinPassword('');
    setPinStep('enter');
  };

  const fetchMfaStatus = async () => {
    if (!user) return;
    
    try {
      const res = await fetch(`/api/mfa/status/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(data.mfaEnabled);
        setMfaMethod(data.mfaMethod);
      }
    } catch (error) {
      console.error('Failed to fetch MFA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSetup = async () => {
    if (!user) return;
    
    setIsSettingUp(true);
    setShowSetupDialog(true);
    setSetupStep('qr');
    
    try {
      const res = await fetch('/api/mfa/setup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (!res.ok) throw new Error('Failed to start MFA setup');
      
      const data = await res.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
    } catch (error) {
      toast.error('Failed to start MFA setup');
      setShowSetupDialog(false);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!user || verifyCode.length < 6) return;
    
    setIsSettingUp(true);
    
    try {
      const res = await fetch('/api/mfa/enable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ userId: user.id, token: verifyCode }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Invalid code');
      }
      
      const data = await res.json();
      setBackupCodes(data.backupCodes);
      setSetupStep('backup');
      setMfaEnabled(true);
      setMfaMethod('totp');
      await refreshUser();
      
      toast.success('Two-factor authentication enabled!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify code');
      setVerifyCode('');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!user || !disablePassword) return;
    
    setIsDisabling(true);
    
    try {
      const res = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ userId: user.id, password: disablePassword }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to disable MFA');
      }
      
      setMfaEnabled(false);
      setMfaMethod(null);
      setShowDisableDialog(false);
      setDisablePassword('');
      await refreshUser();
      
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disable MFA');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret key copied to clipboard');
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied to clipboard');
  };

  const handleCloseSetup = () => {
    setShowSetupDialog(false);
    setSetupStep('qr');
    setVerifyCode('');
    setBackupCodes([]);
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Settings</h1>
          <p className="text-muted-foreground">Manage your account security and authentication methods.</p>
        </div>

        {/* MFA Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Two-Factor Authentication
                    {mfaEnabled && (
                      <Badge className="bg-green-100 text-green-700 border-none">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Enabled
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account using an authenticator app.
                  </CardDescription>
                </div>
              </div>
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch 
                  checked={mfaEnabled} 
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleStartSetup();
                    } else {
                      setShowDisableDialog(true);
                    }
                  }}
                  data-testid="switch-mfa"
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Smartphone className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Authenticator App</h4>
                <p className="text-sm text-muted-foreground">
                  Use apps like Google Authenticator, Authy, or Microsoft Authenticator to generate 6-digit codes for secure login.
                </p>
              </div>
            </div>
            
            {mfaEnabled && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm text-green-800">Protection Active</h4>
                  <p className="text-sm text-green-700">
                    Your account is protected with two-factor authentication via {mfaMethod === 'totp' ? 'authenticator app' : 'email'}.
                  </p>
                </div>
              </div>
            )}
            
            {!mfaEnabled && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm text-yellow-800">Recommended</h4>
                  <p className="text-sm text-yellow-700">
                    Enable two-factor authentication to protect your account from unauthorized access and secure your gold assets.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Change your password regularly to keep your account secure.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" data-testid="button-change-password">
              <Lock className="w-4 h-4 mr-2" /> Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Transaction PIN Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Transaction PIN
                    {pinStatus.hasPin && (
                      <Badge className="bg-green-100 text-green-700 border-none">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    )}
                    {pinStatus.isLocked && (
                      <Badge variant="destructive">
                        <LockKeyhole className="w-3 h-3 mr-1" /> Locked
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of protection for sensitive transactions like withdrawals and transfers.
                  </CardDescription>
                </div>
              </div>
              {isPinLoading && (
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <LockKeyhole className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">6-Digit Security PIN</h4>
                <p className="text-sm text-muted-foreground">
                  Your transaction PIN is required when performing sensitive operations such as withdrawals, transfers, and gold trades.
                </p>
              </div>
            </div>
            
            {pinStatus.hasPin ? (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-green-800">Transaction PIN Active</h4>
                  <p className="text-sm text-green-700">
                    Your transactions are protected with a 6-digit PIN.
                    {pinStatus.isLocked && pinStatus.lockedUntil && (
                      <span className="block mt-1 text-red-600">
                        PIN is currently locked until {new Date(pinStatus.lockedUntil).toLocaleTimeString()}.
                      </span>
                    )}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { resetPinForm(); setShowPinResetDialog(true); }}
                  data-testid="button-reset-pin"
                >
                  Reset PIN
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-amber-800">PIN Not Set</h4>
                  <p className="text-sm text-amber-700">
                    Set up a transaction PIN to add an extra layer of security for your financial operations.
                  </p>
                </div>
                <Button 
                  onClick={() => { resetPinForm(); setShowPinSetupDialog(true); }}
                  size="sm"
                  data-testid="button-setup-pin"
                >
                  Set Up PIN
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Dialog */}
        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {setupStep === 'qr' && 'Set Up Two-Factor Authentication'}
                {setupStep === 'verify' && 'Verify Your Setup'}
                {setupStep === 'backup' && 'Save Your Backup Codes'}
              </DialogTitle>
              <DialogDescription>
                {setupStep === 'qr' && 'Scan this QR code with your authenticator app.'}
                {setupStep === 'verify' && 'Enter the 6-digit code from your authenticator app.'}
                {setupStep === 'backup' && 'Save these codes in a safe place. You can use them if you lose access to your authenticator.'}
              </DialogDescription>
            </DialogHeader>

            {setupStep === 'qr' && (
              <div className="space-y-4 py-4">
                <div className="flex justify-center">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-lg border" />
                  ) : (
                    <div className="w-48 h-48 rounded-lg border flex items-center justify-center bg-muted">
                      <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Or enter this key manually:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="px-3 py-1 bg-muted rounded text-sm font-mono">
                      {secret || '...'}
                    </code>
                    <Button size="sm" variant="ghost" onClick={handleCopySecret} data-testid="button-copy-secret">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {setupStep === 'verify' && (
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-4">
                  <InputOTP 
                    maxLength={6} 
                    value={verifyCode}
                    onChange={setVerifyCode}
                    data-testid="input-verify-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            )}

            {setupStep === 'backup' && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="px-3 py-2 bg-muted rounded font-mono text-sm text-center">
                      {code}
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={handleCopyBackupCodes} data-testid="button-copy-backup">
                  <Copy className="w-4 h-4 mr-2" /> Copy All Codes
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Each backup code can only be used once. Store them securely.
                </p>
              </div>
            )}

            <DialogFooter>
              {setupStep === 'qr' && (
                <Button 
                  onClick={() => setSetupStep('verify')} 
                  disabled={!qrCode}
                  className="w-full"
                  data-testid="button-next-verify"
                >
                  I've Scanned the Code
                </Button>
              )}
              {setupStep === 'verify' && (
                <div className="flex gap-2 w-full">
                  <Button variant="outline" onClick={() => setSetupStep('qr')}>Back</Button>
                  <Button 
                    onClick={handleVerifyCode} 
                    disabled={verifyCode.length < 6 || isSettingUp}
                    className="flex-1"
                    data-testid="button-enable-mfa"
                  >
                    {isSettingUp ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Enable MFA
                  </Button>
                </div>
              )}
              {setupStep === 'backup' && (
                <Button onClick={handleCloseSetup} className="w-full" data-testid="button-finish-setup">
                  Done
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Disable Dialog */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Enter your password to confirm disabling two-factor authentication. This will make your account less secure.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="disable-password">Password</Label>
              <div className="relative mt-2">
                <Input 
                  id="disable-password"
                  type={showPassword ? "text" : "password"}
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  data-testid="input-disable-password"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDisableDialog(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleDisableMfa}
                disabled={!disablePassword || isDisabling}
                data-testid="button-confirm-disable"
              >
                {isDisabling ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Disable MFA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* PIN Setup Dialog */}
        <Dialog open={showPinSetupDialog} onOpenChange={(open) => { setShowPinSetupDialog(open); if (!open) resetPinForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {pinStep === 'enter' ? 'Set Up Transaction PIN' : 'Confirm Your PIN'}
              </DialogTitle>
              <DialogDescription>
                {pinStep === 'enter' 
                  ? 'Create a 6-digit PIN to secure your transactions.'
                  : 'Enter your PIN again to confirm.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {pinStep === 'enter' ? (
                <div className="flex flex-col items-center gap-4">
                  <Label className="text-center">Enter your 6-digit PIN</Label>
                  <InputOTP 
                    maxLength={6} 
                    value={pinValue}
                    onChange={setPinValue}
                    data-testid="input-setup-pin"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-4">
                    <Label className="text-center">Confirm your PIN</Label>
                    <InputOTP 
                      maxLength={6} 
                      value={confirmPinValue}
                      onChange={setConfirmPinValue}
                      data-testid="input-confirm-pin"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    {confirmPinValue.length === 6 && confirmPinValue !== pinValue && (
                      <p className="text-sm text-red-500">PINs do not match</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pin-password">Enter your password to confirm</Label>
                    <div className="relative">
                      <Input 
                        id="pin-password"
                        type={showPinPassword ? "text" : "password"}
                        value={pinPassword}
                        onChange={(e) => setPinPassword(e.target.value)}
                        placeholder="Your account password"
                        data-testid="input-pin-password"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPinPassword(!showPinPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              {pinStep === 'enter' ? (
                <Button 
                  onClick={() => setPinStep('confirm')} 
                  disabled={pinValue.length !== 6}
                  className="w-full"
                  data-testid="button-pin-next"
                >
                  Continue
                </Button>
              ) : (
                <div className="flex gap-2 w-full">
                  <Button variant="outline" onClick={() => { setPinStep('enter'); setConfirmPinValue(''); setPinPassword(''); }}>Back</Button>
                  <Button 
                    onClick={handleSetupPin} 
                    disabled={confirmPinValue.length !== 6 || confirmPinValue !== pinValue || !pinPassword || isPinSaving}
                    className="flex-1"
                    data-testid="button-save-pin"
                  >
                    {isPinSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Set Up PIN
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* PIN Reset Dialog */}
        <Dialog open={showPinResetDialog} onOpenChange={(open) => { setShowPinResetDialog(open); if (!open) resetPinForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {pinStep === 'enter' ? 'Reset Transaction PIN' : 'Confirm New PIN'}
              </DialogTitle>
              <DialogDescription>
                {pinStep === 'enter' 
                  ? 'Create a new 6-digit PIN.'
                  : 'Enter your new PIN again to confirm.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {pinStep === 'enter' ? (
                <div className="flex flex-col items-center gap-4">
                  <Label className="text-center">Enter your new 6-digit PIN</Label>
                  <InputOTP 
                    maxLength={6} 
                    value={pinValue}
                    onChange={setPinValue}
                    data-testid="input-reset-pin"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-4">
                    <Label className="text-center">Confirm your new PIN</Label>
                    <InputOTP 
                      maxLength={6} 
                      value={confirmPinValue}
                      onChange={setConfirmPinValue}
                      data-testid="input-confirm-reset-pin"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    {confirmPinValue.length === 6 && confirmPinValue !== pinValue && (
                      <p className="text-sm text-red-500">PINs do not match</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reset-pin-password">Enter your password to confirm</Label>
                    <div className="relative">
                      <Input 
                        id="reset-pin-password"
                        type={showPinPassword ? "text" : "password"}
                        value={pinPassword}
                        onChange={(e) => setPinPassword(e.target.value)}
                        placeholder="Your account password"
                        data-testid="input-reset-pin-password"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPinPassword(!showPinPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              {pinStep === 'enter' ? (
                <Button 
                  onClick={() => setPinStep('confirm')} 
                  disabled={pinValue.length !== 6}
                  className="w-full"
                  data-testid="button-reset-pin-next"
                >
                  Continue
                </Button>
              ) : (
                <div className="flex gap-2 w-full">
                  <Button variant="outline" onClick={() => { setPinStep('enter'); setConfirmPinValue(''); setPinPassword(''); }}>Back</Button>
                  <Button 
                    onClick={handleResetPin} 
                    disabled={confirmPinValue.length !== 6 || confirmPinValue !== pinValue || !pinPassword || isPinSaving}
                    className="flex-1"
                    data-testid="button-confirm-reset-pin"
                  >
                    {isPinSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Reset PIN
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
