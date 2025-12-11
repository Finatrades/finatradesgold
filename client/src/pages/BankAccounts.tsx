import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Building2, Plus, Star, Trash2, CheckCircle, Clock, 
  ShieldCheck, AlertCircle, CreditCard, Globe
} from 'lucide-react';

interface BankAccount {
  id: string;
  userId: string;
  label: string | null;
  bankName: string;
  accountHolderName: string;
  maskedAccountNumber: string;
  ibanOrRouting: string;
  swiftCode: string | null;
  country: string;
  currency: string;
  accountType: 'Checking' | 'Savings' | 'Business';
  status: 'Pending' | 'Verified' | 'Rejected' | 'Disabled';
  isPrimary: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export default function BankAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  
  const [formData, setFormData] = useState({
    bankName: '',
    accountHolderName: user ? `${user.firstName} ${user.lastName}` : '',
    accountNumber: '',
    ibanOrRouting: '',
    swiftCode: '',
    country: 'United States',
    currency: 'USD',
    accountType: 'Checking',
    label: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/bank-accounts/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      return response.json();
    },
    enabled: !!user,
  });

  const accounts: BankAccount[] = data?.accounts || [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to add bank account');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Bank account added successfully');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowAddDialog(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to add bank account');
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetch(`/api/bank-accounts/${accountId}/primary`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to set primary account');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Primary account updated');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete account');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Bank account removed');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ accountId, code }: { accountId: string; code: string }) => {
      const response = await fetch(`/api/bank-accounts/${accountId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationCode: code }),
      });
      if (!response.ok) throw new Error('Failed to verify account');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Bank account verified!');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowVerifyDialog(false);
      setVerificationCode('');
      setSelectedAccount(null);
    },
    onError: () => {
      toast.error('Invalid verification code');
    },
  });

  const resetForm = () => {
    setFormData({
      bankName: '',
      accountHolderName: user ? `${user.firstName} ${user.lastName}` : '',
      accountNumber: '',
      ibanOrRouting: '',
      swiftCode: '',
      country: 'United States',
      currency: 'USD',
      accountType: 'Checking',
      label: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleVerify = () => {
    if (selectedAccount && verificationCode.length === 4) {
      verifyMutation.mutate({ accountId: selectedAccount.id, code: verificationCode });
    }
  };

  const getStatusBadge = (status: BankAccount['status']) => {
    switch (status) {
      case 'Verified':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'Pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'Rejected':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 text-primary">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
              <p className="text-muted-foreground text-sm">Link your bank accounts for deposits and withdrawals</p>
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-bank">
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Secure & Protected</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your bank details are encrypted and securely stored. We use bank-level security to protect your information.
              </p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading bank accounts...</div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium mb-2">No Bank Accounts Linked</h3>
              <p className="text-muted-foreground mb-4">
                Add a bank account to deposit funds or withdraw your gold value
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <Card key={account.id} className={account.isPrimary ? 'border-primary' : ''} data-testid={`bank-account-${account.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <CreditCard className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{account.bankName}</h3>
                          {account.isPrimary && (
                            <Badge variant="outline" className="text-primary border-primary">
                              <Star className="w-3 h-3 mr-1 fill-primary" />Primary
                            </Badge>
                          )}
                          {getStatusBadge(account.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{account.accountHolderName}</p>
                        <p className="text-sm font-mono">{account.maskedAccountNumber}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {account.country}
                          </span>
                          <span>{account.accountType}</span>
                          <span>{account.currency}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {account.status === 'Pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowVerifyDialog(true);
                          }}
                          data-testid={`button-verify-${account.id}`}
                        >
                          <ShieldCheck className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                      )}
                      {!account.isPrimary && account.status === 'Verified' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setPrimaryMutation.mutate(account.id)}
                          data-testid={`button-primary-${account.id}`}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Set Primary
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(account.id)}
                        data-testid={`button-delete-${account.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Bank Account Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Bank Account</DialogTitle>
              <DialogDescription>
                Enter your bank account details to link it to your Finatrades wallet
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g., Chase Bank"
                  required
                  data-testid="input-bank-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                  placeholder="Full name as on account"
                  required
                  data-testid="input-holder-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Enter account number"
                  required
                  data-testid="input-account-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ibanOrRouting">Routing Number / IBAN</Label>
                <Input
                  id="ibanOrRouting"
                  value={formData.ibanOrRouting}
                  onChange={(e) => setFormData({ ...formData, ibanOrRouting: e.target.value })}
                  placeholder="Enter routing number or IBAN"
                  required
                  data-testid="input-routing"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(v) => setFormData({ ...formData, country: v })}
                  >
                    <SelectTrigger data-testid="select-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="United Arab Emirates">UAE</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Germany">Germany</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select 
                    value={formData.accountType} 
                    onValueChange={(v) => setFormData({ ...formData, accountType: v })}
                  >
                    <SelectTrigger data-testid="select-account-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checking">Checking</SelectItem>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Account Label (Optional)</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Personal Checking"
                  data-testid="input-label"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-bank">
                  {createMutation.isPending ? 'Adding...' : 'Add Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Verify Account Dialog */}
        <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Verify Bank Account</DialogTitle>
              <DialogDescription>
                We've sent two small deposits to your account. Enter the 4-digit verification code.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Bank: {selectedAccount?.bankName}<br />
                  Account: {selectedAccount?.maskedAccountNumber}
                </p>
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-digit code"
                  className="text-center text-2xl tracking-widest"
                  maxLength={4}
                  data-testid="input-verification-code"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  For demo: Enter any 4 digits to verify
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={verificationCode.length !== 4 || verifyMutation.isPending}
                data-testid="button-confirm-verify"
              >
                {verifyMutation.isPending ? 'Verifying...' : 'Verify Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
