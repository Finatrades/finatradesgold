import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Fingerprint, Smartphone, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import BiometricService from '@/lib/biometric-service';

export function BiometricSettings() {
  const { user, refreshUser } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    checkBiometricStatus();
  }, [user?.id]);

  const checkBiometricStatus = async () => {
    setLoading(true);
    try {
      setIsNative(BiometricService.isNativePlatform());
      
      const status = await BiometricService.checkAvailability();
      setBiometricAvailable(status.isAvailable);
      setBiometryType(status.biometryType);

      if (user?.id) {
        const response = await fetch(`/api/biometric/status/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setBiometricEnabled(data.biometricEnabled);
        }
      }
    } catch (error) {
      console.error('Failed to check biometric status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (enabled: boolean) => {
    setPendingAction(enabled ? 'enable' : 'disable');
    setShowPasswordDialog(true);
  };

  const handleConfirm = async () => {
    if (!user?.id || !password) return;

    setLoading(true);
    try {
      if (pendingAction === 'enable') {
        const authenticated = await BiometricService.authenticate(
          'Verify your identity to enable biometric login'
        );

        if (!authenticated) {
          toast.error('Biometric verification failed');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/biometric/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            password,
            deviceId: `${BiometricService.getPlatform()}-${Date.now()}`,
          }),
        });

        if (response.ok) {
          await BiometricService.saveCredentials(user.email, user.id);
          setBiometricEnabled(true);
          toast.success(`${biometryType} login enabled successfully`);
          refreshUser?.();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to enable biometric login');
        }
      } else {
        const response = await fetch('/api/biometric/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            password,
          }),
        });

        if (response.ok) {
          await BiometricService.deleteCredentials();
          setBiometricEnabled(false);
          toast.success('Biometric login disabled');
          refreshUser?.();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to disable biometric login');
        }
      }
    } catch (error) {
      console.error('Biometric toggle error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
      setShowPasswordDialog(false);
      setPassword('');
      setPendingAction(null);
    }
  };

  if (!isNative) {
    return (
      <Card data-testid="biometric-settings-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Login
          </CardTitle>
          <CardDescription>
            Use fingerprint or face recognition for quick, secure login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Mobile App Required</p>
              <p className="text-sm text-muted-foreground">
                Biometric login is only available on the Finatrades mobile app.
                Download the app to use Face ID or fingerprint login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="biometric-settings-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Login
          </CardTitle>
          <CardDescription>
            Use {biometryType || 'fingerprint or face recognition'} for quick, secure login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!biometricAvailable ? (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Biometrics Not Available</p>
                <p className="text-sm">
                  Your device doesn't support biometric authentication or it hasn't been set up.
                  Please configure {biometryType || 'biometrics'} in your device settings.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {biometricEnabled ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{biometryType} Login</p>
                    <p className="text-sm text-muted-foreground">
                      {biometricEnabled
                        ? `You can use ${biometryType} to sign in`
                        : 'Enable for faster, more secure access'}
                    </p>
                  </div>
                </div>
                <Switch
                  data-testid="biometric-toggle"
                  checked={biometricEnabled}
                  onCheckedChange={handleToggle}
                  disabled={loading}
                />
              </div>

              {biometricEnabled && (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>{biometryType}</strong> login is enabled. You can now use your {biometryType.toLowerCase()} to sign in quickly and securely.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'enable' ? 'Enable' : 'Disable'} Biometric Login
            </DialogTitle>
            <DialogDescription>
              Please enter your password to {pendingAction === 'enable' ? 'enable' : 'disable'} {biometryType} login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biometric-password">Password</Label>
              <Input
                id="biometric-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                data-testid="biometric-password-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPassword('');
                setPendingAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!password || loading}
              data-testid="biometric-confirm-button"
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BiometricSettings;
