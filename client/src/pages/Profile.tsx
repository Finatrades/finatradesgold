import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { User, Building, Mail, Phone, MapPin, Shield, History, Edit, Save, Camera, ArrowRight, Download, FileText, Loader2, Calendar, Wallet, Fingerprint, FileCheck, CreditCard, Building2, Plus, Trash2, Image, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const CRYPTO_NETWORKS = [
  'Bitcoin', 'Ethereum', 'USDT_TRC20', 'USDT_ERC20', 'USDC', 'BNB', 'Solana', 'Polygon', 'Other'
] as const;

type CryptoNetwork = typeof CRYPTO_NETWORKS[number];

interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  routingNumber?: string;
  bankAddress?: string;
  bankCountry?: string;
  accountType?: string;
  currency?: string;
  label?: string;
  status: string;
  isPrimary: boolean;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CryptoWallet {
  id: string;
  userId: string;
  network: CryptoNetwork;
  walletAddress: string;
  label?: string;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KycSubmission {
  id: string;
  userId: string;
  status: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  passportUrl?: string;
  addressProofUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { accountType } = useAccountType();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statementFrom, setStatementFrom] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [statementTo, setStatementTo] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  
  const [addBankDialogOpen, setAddBankDialogOpen] = useState(false);
  const [addCryptoDialogOpen, setAddCryptoDialogOpen] = useState(false);
  const [bankFormData, setBankFormData] = useState({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    iban: '',
    swiftCode: '',
    label: '',
    isPrimary: false
  });
  const [cryptoFormData, setCryptoFormData] = useState({
    network: 'Bitcoin' as CryptoNetwork,
    walletAddress: '',
    label: '',
    isPrimary: false
  });
  
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/dashboard/${user.id}`);
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const { data: kycData, isLoading: isLoadingKyc } = useQuery<KycSubmission | null>({
    queryKey: ['kyc', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/kyc/${user.id}`, { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch KYC data');
      }
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const { data: bankAccounts = [], isLoading: isLoadingBankAccounts } = useQuery<BankAccount[]>({
    queryKey: ['user-bank-accounts'],
    queryFn: async () => {
      const response = await fetch('/api/user/bank-accounts', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: cryptoWallets = [], isLoading: isLoadingCryptoWallets } = useQuery<CryptoWallet[]>({
    queryKey: ['user-crypto-wallets'],
    queryFn: async () => {
      const response = await fetch('/api/user/crypto-wallets', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch crypto wallets');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const addBankAccountMutation = useMutation({
    mutationFn: async (data: typeof bankFormData) => {
      const res = await apiRequest('POST', '/api/user/bank-accounts', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bank-accounts'] });
      setAddBankDialogOpen(false);
      setBankFormData({ bankName: '', accountHolderName: '', accountNumber: '', iban: '', swiftCode: '', label: '', isPrimary: false });
      toast.success('Bank account added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add bank account', { description: error.message });
    }
  });

  const deleteBankAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/user/bank-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bank-accounts'] });
      toast.success('Bank account deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete bank account', { description: error.message });
    }
  });

  const addCryptoWalletMutation = useMutation({
    mutationFn: async (data: typeof cryptoFormData) => {
      const res = await apiRequest('POST', '/api/user/crypto-wallets', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-crypto-wallets'] });
      setAddCryptoDialogOpen(false);
      setCryptoFormData({ network: 'Bitcoin', walletAddress: '', label: '', isPrimary: false });
      toast.success('Crypto wallet added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add crypto wallet', { description: error.message });
    }
  });

  const deleteCryptoWalletMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/user/crypto-wallets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-crypto-wallets'] });
      toast.success('Crypto wallet deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete crypto wallet', { description: error.message });
    }
  });
  
  const tradeCount = dashboardData?.transactions?.length || 0;
  const totalVolumeGrams = dashboardData?.transactions?.reduce((sum: number, tx: any) => {
    return sum + (parseFloat(tx.amountGold) || 0);
  }, 0) || 0;
  
  const formatVolume = (grams: number): string => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)}kg`;
    }
    return `${grams.toFixed(1)}g`;
  };
  
  const getMemberSince = (): string => {
    if (!user?.createdAt) return 'N/A';
    try {
      return format(new Date(user.createdAt), 'MMM yyyy');
    } catch {
      return 'N/A';
    }
  };
  
  const getKycLevel = (): string => {
    if (!user?.kycStatus) return 'Basic Access';
    switch (user.kycStatus) {
      case 'Approved': return 'Full Access';
      case 'In Progress': return 'Pending Verification';
      case 'Rejected': return 'Verification Failed';
      default: return 'Basic Access';
    }
  };

  const getKycStatusBadge = () => {
    if (!kycData) {
      return <Badge variant="outline" className="bg-gray-100">Not Submitted</Badge>;
    }
    switch (kycData.status) {
      case 'Approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'In Progress':
      case 'Pending Review':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{kycData.status}</Badge>;
    }
  };
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    address: user?.address || '',
    companyName: user?.companyName || ''
  });

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest('PATCH', `/api/users/${user.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        companyName: formData.companyName
      });
      
      await refreshUser();
      setIsEditing(false);
      
      toast.success("Profile Updated", {
        description: "Your personal information has been saved successfully."
      });
    } catch (error) {
      toast.error("Failed to save", {
        description: error instanceof Error ? error.message : "Could not update profile"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  };

  const isKycApproved = user.kycStatus === 'Approved';
  const isKycInProgress = user.kycStatus === 'In Progress';
  const isKycNotStarted = user.kycStatus === 'Not Started';

  const kycDocuments = [
    { key: 'idFront', label: 'ID Front', url: kycData?.idFrontUrl },
    { key: 'idBack', label: 'ID Back', url: kycData?.idBackUrl },
    { key: 'passport', label: 'Passport', url: kycData?.passportUrl },
    { key: 'addressProof', label: 'Address Proof', url: kycData?.addressProofUrl },
  ];

  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormData.bankName || !bankFormData.accountHolderName || !bankFormData.accountNumber) {
      toast.error('Please fill in required fields');
      return;
    }
    addBankAccountMutation.mutate(bankFormData);
  };

  const handleAddCryptoWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoFormData.walletAddress) {
      toast.error('Please enter wallet address');
      return;
    }
    addCryptoWalletMutation.mutate(cryptoFormData);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isKycApproved ? 'default' : 'destructive'} className="text-sm px-3 py-1">
              {isKycApproved ? (
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Verified</span>
              ) : (
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Unverified</span>
              )}
            </Badge>
            {(isKycInProgress || isKycNotStarted) && (
              <Link href="/kyc">
                 <Button size="sm" variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50">
                    Complete Verification <ArrowRight className="w-3 h-3 ml-1" />
                 </Button>
              </Link>
            )}
            <Badge variant="outline" className="text-sm px-3 py-1 capitalize">
              {accountType} Account
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <div className="md:col-span-4 space-y-6">
            <Card className="text-center p-6 border-border">
              <div className="relative w-32 h-32 mx-auto mb-4 group cursor-pointer">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-4xl font-bold bg-primary text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground">{user.firstName} {user.lastName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              
              <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{tradeCount}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Trades</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{formatVolume(totalVolumeGrams)}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Volume</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-border">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className={`p-2 rounded-lg ${isKycApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">{isKycApproved ? 'Identity Verified' : 'Identity Unverified'}</p>
                    {isKycApproved ? (
                       <p className="text-xs text-muted-foreground">{getKycLevel()}</p>
                    ) : (
                       <Link href="/kyc">
                         <p className="text-xs text-purple-600 font-medium hover:underline cursor-pointer">Complete KYC Now</p>
                       </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">Member Since</p>
                    <p className="text-xs text-muted-foreground">{getMemberSince()}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-border" data-testid="card-user-manual">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">User Manual</p>
                  <p className="text-xs text-muted-foreground">Download PDF guide</p>
                </div>
                <a href="/api/documents/user-manual" download="Finatrades-User-Manual.pdf">
                  <Button size="sm" variant="outline" data-testid="button-download-manual">
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>
                </a>
              </div>
            </Card>

            <Card className="p-4 border-border bg-gradient-to-r from-primary/5 to-primary/10" data-testid="card-digital-identity">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary text-white">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Digital Identity</p>
                  <p className="text-xs text-muted-foreground">View your verified credential</p>
                </div>
                <Link href="/digital-identity">
                  <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="button-view-identity">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          <div className="md:col-span-8">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-8">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="statements">Statements</TabsTrigger>
                <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
                <TabsTrigger value="payment" data-testid="tab-payment">Payment</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Manage your personal details and contact info.</CardDescription>
                    </div>
                    {!isEditing ? (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} data-testid="button-cancel-edit">Cancel</Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving} data-testid="button-save-profile">
                          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input 
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            disabled={!isEditing}
                            className="pl-10"
                            data-testid="input-first-name"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input 
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          disabled={!isEditing}
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          disabled={!isEditing}
                          className="pl-10"
                          data-testid="input-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                          disabled={!isEditing}
                          className="pl-10"
                          placeholder="Enter phone number"
                          data-testid="input-phone"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          disabled={!isEditing}
                          className="pl-10"
                          placeholder="Enter address"
                          data-testid="input-address"
                        />
                      </div>
                    </div>

                    {accountType === 'business' && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        <Label>Company Name</Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input 
                            value={formData.companyName}
                            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                            disabled={!isEditing}
                            className="pl-10"
                            data-testid="input-company-name"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="statements">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Account Statements
                    </CardTitle>
                    <CardDescription>Download your account statements in bank-style format.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-800">
                        Generate a comprehensive statement showing all your deposits, withdrawals, transfers, 
                        and gold transactions with opening and closing balances.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Quick Select Period</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            setStatementFrom(format(subDays(today, 30), 'yyyy-MM-dd'));
                            setStatementTo(format(today, 'yyyy-MM-dd'));
                          }}
                          data-testid="btn-last30-days"
                        >
                          Last 30 Days
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            setStatementFrom(format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'));
                            setStatementTo(format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'));
                          }}
                          data-testid="btn-last-month"
                        >
                          Last Month
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            setStatementFrom(format(subMonths(today, 3), 'yyyy-MM-dd'));
                            setStatementTo(format(today, 'yyyy-MM-dd'));
                          }}
                          data-testid="btn-last-3months"
                        >
                          Last 3 Months
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            setStatementFrom(format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd'));
                            setStatementTo(format(today, 'yyyy-MM-dd'));
                          }}
                          data-testid="btn-this-year"
                        >
                          This Year
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Date</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={statementFrom}
                            onChange={(e) => setStatementFrom(e.target.value)}
                            className="pl-10"
                            data-testid="input-statement-from"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>To Date</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={statementTo}
                            onChange={(e) => setStatementTo(e.target.value)}
                            className="pl-10"
                            data-testid="input-statement-to"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        className="flex-1"
                        onClick={async () => {
                          setIsGeneratingStatement(true);
                          try {
                            const res = await fetch(`/api/my-statement/pdf?from=${statementFrom}&to=${statementTo}`);
                            if (!res.ok) throw new Error('Failed to generate statement');
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `account-statement-${statementFrom}-to-${statementTo}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            toast.success('Statement downloaded successfully');
                          } catch (error) {
                            toast.error('Failed to download statement');
                          } finally {
                            setIsGeneratingStatement(false);
                          }
                        }}
                        disabled={isGeneratingStatement}
                        data-testid="btn-download-pdf-statement"
                      >
                        {isGeneratingStatement ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4 mr-2" />
                        )}
                        Download PDF Statement
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/my-statement/csv?from=${statementFrom}&to=${statementTo}`);
                            if (!res.ok) throw new Error('Failed to generate CSV');
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `account-statement-${statementFrom}-to-${statementTo}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            toast.success('CSV downloaded successfully');
                          } catch (error) {
                            toast.error('Failed to download CSV');
                          }
                        }}
                        data-testid="btn-download-csv-statement"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" data-testid="tab-content-documents">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5" />
                      KYC Documents
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span>Your uploaded identity verification documents.</span>
                      {getKycStatusBadge()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {isLoadingKyc ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : !kycData ? (
                      <div className="text-center py-8">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                          <p className="text-sm text-yellow-800">
                            You haven't submitted your KYC documents yet. Complete verification to unlock all features.
                          </p>
                        </div>
                        <Link href="/kyc">
                          <Button data-testid="button-go-to-kyc">
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Start KYC Verification
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {kycDocuments.map((doc) => (
                          <Card key={doc.key} className="border" data-testid={`doc-card-${doc.key}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-muted rounded-lg">
                                  <Image className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{doc.label}</p>
                                  {doc.url ? (
                                    <a 
                                      href={doc.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                      data-testid={`doc-link-${doc.key}`}
                                    >
                                      View Document <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <p className="text-xs text-muted-foreground mt-1">Not uploaded</p>
                                  )}
                                </div>
                                {doc.url && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                                    Uploaded
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {kycData && (
                      <div className="pt-4 border-t">
                        <Link href="/kyc">
                          <Button variant="outline" className="w-full" data-testid="button-update-kyc">
                            <Edit className="w-4 h-4 mr-2" />
                            Update KYC Documents
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payment" data-testid="tab-content-payment">
                <div className="space-y-6">
                  <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          Bank Accounts
                        </CardTitle>
                        <CardDescription>Manage your linked bank accounts for withdrawals.</CardDescription>
                      </div>
                      <Dialog open={addBankDialogOpen} onOpenChange={setAddBankDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-add-bank-account">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Bank Account
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Add Bank Account</DialogTitle>
                            <DialogDescription>Enter your bank account details for withdrawals.</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddBankAccount} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="bankName">Bank Name *</Label>
                                <Input 
                                  id="bankName"
                                  value={bankFormData.bankName}
                                  onChange={(e) => setBankFormData({...bankFormData, bankName: e.target.value})}
                                  placeholder="e.g., Chase Bank"
                                  data-testid="input-bank-name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="accountHolderName">Account Holder *</Label>
                                <Input 
                                  id="accountHolderName"
                                  value={bankFormData.accountHolderName}
                                  onChange={(e) => setBankFormData({...bankFormData, accountHolderName: e.target.value})}
                                  placeholder="John Doe"
                                  data-testid="input-account-holder-name"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="accountNumber">Account Number *</Label>
                              <Input 
                                id="accountNumber"
                                value={bankFormData.accountNumber}
                                onChange={(e) => setBankFormData({...bankFormData, accountNumber: e.target.value})}
                                placeholder="1234567890"
                                data-testid="input-account-number"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="iban">IBAN</Label>
                                <Input 
                                  id="iban"
                                  value={bankFormData.iban}
                                  onChange={(e) => setBankFormData({...bankFormData, iban: e.target.value})}
                                  placeholder="GB82WEST12345698765432"
                                  data-testid="input-iban"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="swiftCode">SWIFT Code</Label>
                                <Input 
                                  id="swiftCode"
                                  value={bankFormData.swiftCode}
                                  onChange={(e) => setBankFormData({...bankFormData, swiftCode: e.target.value})}
                                  placeholder="CHASUS33"
                                  data-testid="input-swift-code"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="label">Label (Optional)</Label>
                              <Input 
                                id="label"
                                value={bankFormData.label}
                                onChange={(e) => setBankFormData({...bankFormData, label: e.target.value})}
                                placeholder="e.g., Primary Account"
                                data-testid="input-bank-label"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="isPrimary"
                                checked={bankFormData.isPrimary}
                                onCheckedChange={(checked) => setBankFormData({...bankFormData, isPrimary: checked})}
                                data-testid="switch-bank-primary"
                              />
                              <Label htmlFor="isPrimary">Set as primary account</Label>
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setAddBankDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={addBankAccountMutation.isPending} data-testid="button-submit-bank-account">
                                {addBankAccountMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Add Account
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      {isLoadingBankAccounts ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : bankAccounts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No bank accounts added yet.</p>
                          <p className="text-sm">Add a bank account to receive withdrawals.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {bankAccounts.map((account) => (
                            <div 
                              key={account.id} 
                              className="flex items-center justify-between p-4 border rounded-lg"
                              data-testid={`bank-account-${account.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {account.label || account.bankName}
                                    {account.isPrimary && (
                                      <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>
                                    )}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {account.bankName} •••• {account.accountNumber.slice(-4)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this bank account?')) {
                                    deleteBankAccountMutation.mutate(account.id);
                                  }
                                }}
                                disabled={deleteBankAccountMutation.isPending}
                                data-testid={`button-delete-bank-${account.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Wallet className="w-5 h-5" />
                          Crypto Wallets
                        </CardTitle>
                        <CardDescription>Manage your linked crypto wallets for withdrawals.</CardDescription>
                      </div>
                      <Dialog open={addCryptoDialogOpen} onOpenChange={setAddCryptoDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-add-crypto-wallet">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Crypto Wallet
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Add Crypto Wallet</DialogTitle>
                            <DialogDescription>Enter your crypto wallet details for withdrawals.</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddCryptoWallet} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="network">Network *</Label>
                              <Select
                                value={cryptoFormData.network}
                                onValueChange={(value) => setCryptoFormData({...cryptoFormData, network: value as CryptoNetwork})}
                              >
                                <SelectTrigger data-testid="select-crypto-network">
                                  <SelectValue placeholder="Select network" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CRYPTO_NETWORKS.map((network) => (
                                    <SelectItem key={network} value={network}>
                                      {network.replace('_', ' ')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="walletAddress">Wallet Address *</Label>
                              <Input 
                                id="walletAddress"
                                value={cryptoFormData.walletAddress}
                                onChange={(e) => setCryptoFormData({...cryptoFormData, walletAddress: e.target.value})}
                                placeholder="Enter wallet address"
                                data-testid="input-wallet-address"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cryptoLabel">Label (Optional)</Label>
                              <Input 
                                id="cryptoLabel"
                                value={cryptoFormData.label}
                                onChange={(e) => setCryptoFormData({...cryptoFormData, label: e.target.value})}
                                placeholder="e.g., Main BTC Wallet"
                                data-testid="input-crypto-label"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="cryptoIsPrimary"
                                checked={cryptoFormData.isPrimary}
                                onCheckedChange={(checked) => setCryptoFormData({...cryptoFormData, isPrimary: checked})}
                                data-testid="switch-crypto-primary"
                              />
                              <Label htmlFor="cryptoIsPrimary">Set as primary wallet</Label>
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setAddCryptoDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={addCryptoWalletMutation.isPending} data-testid="button-submit-crypto-wallet">
                                {addCryptoWalletMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Add Wallet
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      {isLoadingCryptoWallets ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : cryptoWallets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No crypto wallets added yet.</p>
                          <p className="text-sm">Add a wallet to receive crypto withdrawals.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cryptoWallets.map((wallet) => (
                            <div 
                              key={wallet.id} 
                              className="flex items-center justify-between p-4 border rounded-lg"
                              data-testid={`crypto-wallet-${wallet.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                                  <Wallet className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {wallet.label || wallet.network.replace('_', ' ')}
                                    {wallet.isPrimary && (
                                      <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>
                                    )}
                                  </p>
                                  <p className="text-sm text-muted-foreground font-mono">
                                    {wallet.network} • {wallet.walletAddress.slice(0, 8)}...{wallet.walletAddress.slice(-6)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this crypto wallet?')) {
                                    deleteCryptoWalletMutation.mutate(wallet.id);
                                  }
                                }}
                                disabled={deleteCryptoWalletMutation.isPending}
                                data-testid={`button-delete-crypto-${wallet.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="security">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your password, 2FA, transaction PIN, and account.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-4">
                        For full security settings including Two-Factor Authentication, Transaction PIN, Biometric Authentication, password management, and account deletion, visit the dedicated Security page.
                      </p>
                      <Link href="/security">
                        <Button className="w-full" data-testid="button-goto-security">
                          <Shield className="w-4 h-4 mr-2" /> Go to Security Settings
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose how you want to be notified.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-4">
                        Manage all your notification preferences including email, push notifications, and alert settings in the Settings page.
                      </p>
                      <Link href="/settings">
                        <Button className="w-full" data-testid="button-goto-settings">
                          <Edit className="w-4 h-4 mr-2" /> Go to Settings
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
