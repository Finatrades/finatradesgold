import React from 'react';
import AdminLayout from './AdminLayout';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Mail, Phone, MapPin, Shield, Calendar, 
  Ban, Lock, FileText, Activity, Building, CheckCircle2, 
  AlertCircle, Clock, User, Wallet, RefreshCw, TrendingUp, BookOpen
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function UserDetails() {
  const [, params] = useRoute("/admin/users/:id");
  const userId = params?.id;
  const { user: adminUser } = useAuth();
  const { toast } = useToast();

  // Fetch user details
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-user-details', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
    enabled: !!userId,
  });

  const user = data?.user;
  const wallet = data?.wallet;
  const transactions = data?.transactions || [];
  const kycSubmission = data?.kycSubmission;
  const auditLogs = data?.auditLogs || [];

  // Client brief
  const { data: briefData, isLoading: briefLoading } = useQuery({
    queryKey: ['admin-user-brief', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users/${userId}/brief`);
      if (!res.ok) throw new Error('Failed to fetch brief');
      return res.json();
    },
    enabled: !!userId,
  });
  const brief = briefData?.brief;

  // Admin actions
  const handleVerifyEmail = async () => {
    try {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/verify-email`, { adminId: adminUser?.id });
      if (res.ok) {
        toast({ title: "Email Verified", description: "User email has been verified." });
        refetch();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to verify email", variant: "destructive" });
    }
  };

  const handleSuspend = async () => {
    try {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/suspend`, { adminId: adminUser?.id, reason: "Suspended by admin" });
      if (res.ok) {
        toast({ title: "User Suspended", description: "User has been suspended." });
        refetch();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to suspend user", variant: "destructive" });
    }
  };

  const handleActivate = async () => {
    try {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/activate`, { adminId: adminUser?.id });
      if (res.ok) {
        toast({ title: "User Activated", description: "User has been activated." });
        refetch();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to activate user", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">User Not Found</h2>
          <p className="text-gray-500 mt-2">The user you're looking for doesn't exist.</p>
          <Link href="/admin/users">
            <Button className="mt-4">Back to Users</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const getKycStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'In Progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Not Started</Badge>;
    }
  };

  const goldBalance = wallet ? parseFloat(wallet.goldGrams || '0') : 0;
  const usdBalance = wallet ? parseFloat(wallet.usdBalance || '0') : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
            <p className="text-sm text-gray-500">Viewing profile for {user.firstName} {user.lastName}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {user.kycStatus === 'Rejected' ? (
              <Button variant="outline" onClick={handleActivate} className="text-green-600 border-green-200 hover:bg-green-50" data-testid="button-activate">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Activate User
              </Button>
            ) : (
              <Button variant="outline" onClick={handleSuspend} className="text-red-600 border-red-200 hover:bg-red-50" data-testid="button-suspend">
                <Ban className="w-4 h-4 mr-2" /> Suspend User
              </Button>
            )}
            {!user.isEmailVerified && (
              <Button variant="outline" onClick={handleVerifyEmail} data-testid="button-verify-email">
                <Mail className="w-4 h-4 mr-2" /> Verify Email
              </Button>
            )}
            <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Top Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="w-24 h-24 border-4 border-gray-50">
                <AvatarImage src="" />
                <AvatarFallback className="text-2xl bg-slate-900 text-white">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
                    {user.accountType === 'business' && user.companyName && (
                      <p className="text-sm text-purple-600 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3" /> {user.companyName}
                        {user.registrationNumber && <span className="text-gray-400">({user.registrationNumber})</span>}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-gray-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</span>
                      {user.phoneNumber && (
                        <>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phoneNumber}</span>
                        </>
                      )}
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">ID: {user.id?.substring(0, 8)}...</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {user.isEmailVerified ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">
                        <Mail className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Mail className="w-3 h-3 mr-1" /> Pending
                      </Badge>
                    )}
                    <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="capitalize">
                      {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                      {user.role}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {user.accountType === 'business' ? <Building className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                      {user.accountType}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">USD Balance</p>
                    <p className="text-xl font-bold text-slate-900">${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Gold Holdings</p>
                    <p className="text-xl font-bold text-yellow-600">{goldBalance.toLocaleString('en-US', { maximumFractionDigits: 4 })}g</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">KYC Status</p>
                    {getKycStatusBadge(user.kycStatus)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1">
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1">
              Transactions ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="kyc" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1">
              KYC Details
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1">
              Activity Log ({auditLogs.length})
            </TabsTrigger>
            <TabsTrigger value="brief" data-testid="tab-client-brief" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1">
              Client Brief
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Address</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone Number</p>
                        <p className="text-sm text-gray-500">{user.phoneNumber || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Country</p>
                        <p className="text-sm text-gray-500">{user.country || 'Not provided'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Account Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Account Type</span>
                      <span className="text-sm font-medium capitalize">{user.accountType}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Role</span>
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="capitalize">{user.role}</Badge>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Email Verified</span>
                      <span className={`text-sm font-medium ${user.isEmailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                        {user.isEmailVerified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-gray-500">Last Updated</span>
                      <span className="text-sm font-medium">
                        {new Date(user.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Wallet Card */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="w-5 h-5" /> Wallet Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {wallet ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                          <p className="text-sm text-yellow-700">Gold Balance</p>
                          <p className="text-2xl font-bold text-yellow-800">{goldBalance.toLocaleString('en-US', { maximumFractionDigits: 4 })}g</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                          <p className="text-sm text-green-700">USD Balance</p>
                          <p className="text-2xl font-bold text-green-800">${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-sm text-blue-700">EUR Balance</p>
                          <p className="text-2xl font-bold text-blue-800">€{parseFloat(wallet.eurBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">No wallet found for this user.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transaction History</CardTitle>
                  <CardDescription>All transactions for this user.</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No transactions found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Amount</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Module</th>
                            <th className="px-4 py-3 text-left">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx: any) => (
                            <tr key={tx.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <Badge variant="outline">{tx.type}</Badge>
                              </td>
                              <td className="px-4 py-3">
                                {tx.amountGold && <span className="text-yellow-600">{parseFloat(tx.amountGold).toFixed(4)}g</span>}
                                {tx.amountUsd && <span className="text-green-600 ml-2">${parseFloat(tx.amountUsd).toFixed(2)}</span>}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={tx.status === 'Completed' ? 'default' : tx.status === 'Failed' ? 'destructive' : 'secondary'}>
                                  {tx.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">{tx.sourceModule || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* KYC Tab */}
            <TabsContent value="kyc">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">KYC Submission Details</CardTitle>
                  <CardDescription>Identity verification information.</CardDescription>
                </CardHeader>
                <CardContent>
                  {kycSubmission ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="font-medium">Status</span>
                        {getKycStatusBadge(kycSubmission.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Full Name</p>
                          <p className="font-medium">{kycSubmission.fullName || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Date of Birth</p>
                          <p className="font-medium">{kycSubmission.dateOfBirth || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Nationality</p>
                          <p className="font-medium">{kycSubmission.nationality || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Country</p>
                          <p className="font-medium">{kycSubmission.country || 'Not provided'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">{kycSubmission.address || 'Not provided'}</p>
                        </div>
                      </div>

                      {kycSubmission.accountType === 'business' && (
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-4 flex items-center gap-2">
                            <Building className="w-4 h-4" /> Business Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Company Name</p>
                              <p className="font-medium">{kycSubmission.companyName || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Registration Number</p>
                              <p className="font-medium">{kycSubmission.registrationNumber || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Tax ID</p>
                              <p className="font-medium">{kycSubmission.taxId || 'Not provided'}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-sm text-gray-500">Company Address</p>
                              <p className="font-medium">{kycSubmission.companyAddress || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Uploaded Documents
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {kycSubmission.idFrontUrl && (
                            <div className="border rounded-lg overflow-hidden">
                              <p className="text-xs font-medium bg-gray-100 px-3 py-1.5 text-gray-700">ID Front</p>
                              <div className="p-2">
                                <img src={kycSubmission.idFrontUrl} alt="ID Front" className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90" onClick={() => window.open(kycSubmission.idFrontUrl, '_blank')}  loading="lazy"/>
                              </div>
                            </div>
                          )}
                          {kycSubmission.idBackUrl && (
                            <div className="border rounded-lg overflow-hidden">
                              <p className="text-xs font-medium bg-gray-100 px-3 py-1.5 text-gray-700">ID Back</p>
                              <div className="p-2">
                                <img src={kycSubmission.idBackUrl} alt="ID Back" className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90" onClick={() => window.open(kycSubmission.idBackUrl, '_blank')}  loading="lazy"/>
                              </div>
                            </div>
                          )}
                          {kycSubmission.passportUrl && (
                            <div className="border rounded-lg overflow-hidden">
                              <p className="text-xs font-medium bg-gray-100 px-3 py-1.5 text-gray-700">Passport</p>
                              <div className="p-2">
                                <img src={kycSubmission.passportUrl} alt="Passport" className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90" onClick={() => window.open(kycSubmission.passportUrl, '_blank')}  loading="lazy"/>
                              </div>
                            </div>
                          )}
                          {kycSubmission.addressProofUrl && (
                            <div className="border rounded-lg overflow-hidden">
                              <p className="text-xs font-medium bg-gray-100 px-3 py-1.5 text-gray-700">Proof of Address</p>
                              <div className="p-2">
                                <img src={kycSubmission.addressProofUrl} alt="Proof of Address" className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90" onClick={() => window.open(kycSubmission.addressProofUrl, '_blank')}  loading="lazy"/>
                              </div>
                            </div>
                          )}
                          {kycSubmission.livenessCapture && (
                            <div className="border rounded-lg overflow-hidden">
                              <p className="text-xs font-medium bg-gray-100 px-3 py-1.5 text-gray-700">Liveness Verification</p>
                              <div className="p-2">
                                <img src={kycSubmission.livenessCapture} alt="Liveness Capture" className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90" onClick={() => window.open(kycSubmission.livenessCapture, '_blank')}  loading="lazy"/>
                              </div>
                            </div>
                          )}
                          {kycSubmission.documents?.idFront?.url && (
                            <div className="border rounded-lg overflow-hidden">
                              <p className="text-xs font-medium bg-gray-100 px-3 py-1.5 text-gray-700">ID Front (Documents)</p>
                              <div className="p-2">
                                <img src={kycSubmission.documents.idFront.url} alt="ID Front" className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90" onClick={() => window.open(kycSubmission.documents.idFront.url, '_blank')}  loading="lazy"/>
                              </div>
                            </div>
                          )}
                          {kycSubmission.documents?.idBack?.url && (
                            <div className="border rounded-lg overflow-hidden">
                              <p className="text-xs font-medium bg-gray-100 px-3 py-1.5 text-gray-700">ID Back (Documents)</p>
                              <div className="p-2">
                                <img src={kycSubmission.documents.idBack.url} alt="ID Back" className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90" onClick={() => window.open(kycSubmission.documents.idBack.url, '_blank')}  loading="lazy"/>
                              </div>
                            </div>
                          )}
                          {kycSubmission.documents?.selfie?.url && (
                            <div className="border rounded-lg overflow-hidden">
                              <p className="text-xs font-medium bg-gray-100 px-3 py-1.5 text-gray-700">Selfie</p>
                              <div className="p-2">
                                <img src={kycSubmission.documents.selfie.url} alt="Selfie" className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90" onClick={() => window.open(kycSubmission.documents.selfie.url, '_blank')}  loading="lazy"/>
                              </div>
                            </div>
                          )}
                          {kycSubmission.documents?.proofOfAddress?.url && (
                            <div className="border rounded-lg overflow-hidden">
                              <p className="text-xs font-medium bg-gray-100 px-3 py-1.5 text-gray-700">Proof of Address (Documents)</p>
                              <div className="p-2">
                                <img src={kycSubmission.documents.proofOfAddress.url} alt="Proof of Address" className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90" onClick={() => window.open(kycSubmission.documents.proofOfAddress.url, '_blank')}  loading="lazy"/>
                              </div>
                            </div>
                          )}
                          {!kycSubmission.idFrontUrl && !kycSubmission.idBackUrl && !kycSubmission.passportUrl && !kycSubmission.addressProofUrl && !kycSubmission.livenessCapture && !kycSubmission.documents?.idFront?.url && !kycSubmission.documents?.idBack?.url && !kycSubmission.documents?.selfie?.url && !kycSubmission.documents?.proofOfAddress?.url && (
                            <div className="col-span-full text-center py-4 text-gray-500">
                              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">No documents uploaded yet</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {kycSubmission.rejectionReason && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                          <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                          <p className="text-sm text-red-700">{kycSubmission.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No KYC submission found.</p>
                      <p className="text-sm text-gray-400">User has not submitted KYC documents yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity Log</CardTitle>
                  <CardDescription>Recent actions and system events.</CardDescription>
                </CardHeader>
                <CardContent>
                  {auditLogs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No activity logs found.</p>
                  ) : (
                    <div className="space-y-4">
                      {auditLogs.map((log: any, i: number) => (
                        <div key={log.id || i} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{log.actionType}</p>
                            <p className="text-sm text-gray-500">{log.details}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(log.createdAt).toLocaleString()} • By {log.actorRole}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Client Brief Tab */}
            <TabsContent value="brief">
              {briefLoading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : !brief ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>Client brief unavailable.</p>
                </div>
              ) : (
                <div className="space-y-6" data-testid="client-brief-container">

                  {/* Portfolio Snapshot */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Portfolio Snapshot
                          </CardTitle>
                          <CardDescription>Current holdings at live gold price.</CardDescription>
                        </div>
                        {brief.holdingsByWalletType?.liveGoldPriceUsdPerGram && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Live Gold Price</p>
                            <p className="text-lg font-bold text-blue-700" data-testid="brief-gold-price">
                              ${parseFloat(brief.holdingsByWalletType.liveGoldPriceUsdPerGram).toFixed(2)}/g
                            </p>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Summary row */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                          <p className="text-xs text-yellow-700 mb-1">FinaPay Gold</p>
                          <p className="text-lg font-bold text-yellow-800" data-testid="brief-gold-grams">
                            {parseFloat(brief.wallet?.goldGrams || '0').toFixed(4)}g
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="text-xs text-green-700 mb-1">FinaPay Portfolio Value</p>
                          <p className="text-lg font-bold text-green-800" data-testid="brief-portfolio-value">
                            {brief.wallet?.portfolioValueUsd ? `$${parseFloat(brief.wallet.portfolioValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <p className="text-xs text-purple-700 mb-1">USD Balance</p>
                          <p className="text-lg font-bold text-purple-800" data-testid="brief-usd-balance">
                            ${parseFloat(brief.wallet?.usdBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Holdings breakdown by wallet type */}
                      {brief.holdingsByWalletType && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Holdings by Wallet Type</p>
                          <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-sm" data-testid="brief-holdings-table">
                              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                  <th className="px-3 py-2 text-left">Wallet</th>
                                  <th className="px-3 py-2 text-right">Available (g)</th>
                                  <th className="px-3 py-2 text-right">Locked (g)</th>
                                  <th className="px-3 py-2 text-right">Total (g)</th>
                                  <th className="px-3 py-2 text-right">Value (USD)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { key: 'finapay', label: 'FinaPay (LGPW)', data: brief.holdingsByWalletType.finapay },
                                  { key: 'mpgw', label: 'MPGW (Vault)', data: brief.holdingsByWalletType.mpgw },
                                  { key: 'fpgw', label: 'FPGW (Vault)', data: brief.holdingsByWalletType.fpgw },
                                  { key: 'bnsl', label: 'BNSL', data: brief.holdingsByWalletType.bnsl },
                                  { key: 'finabridge', label: 'FinaBridge', data: brief.holdingsByWalletType.finabridge },
                                ].filter(w => w.data !== null).map(w => (
                                  <tr key={w.key} className="border-t hover:bg-gray-50" data-testid={`brief-holding-${w.key}`}>
                                    <td className="px-3 py-2 font-medium text-gray-700">{w.label}</td>
                                    <td className="px-3 py-2 text-right font-mono text-yellow-700">
                                      {parseFloat(w.data!.availableGrams).toFixed(4)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-orange-600">
                                      {parseFloat(w.data!.lockedGrams).toFixed(4)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-semibold">
                                      {parseFloat(w.data!.totalGrams).toFixed(4)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-green-700">
                                      {w.data!.portfolioValueUsd
                                        ? `$${parseFloat(w.data!.portfolioValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                        : 'N/A'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Risk & AML Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="w-4 h-4" /> Risk Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {brief.riskProfile ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Risk Level</span>
                              <Badge
                                data-testid="brief-risk-level"
                                variant={
                                  brief.riskProfile.riskLevel === 'Critical' || brief.riskProfile.riskLevel === 'High'
                                    ? 'destructive'
                                    : brief.riskProfile.riskLevel === 'Medium'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {brief.riskProfile.riskLevel}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Overall Score</span>
                              <span className="text-sm font-medium" data-testid="brief-risk-score">
                                {brief.riskProfile.overallRiskScore ?? 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Last Assessed</span>
                              <span className="text-sm text-gray-600">
                                {brief.riskProfile.lastAssessedAt
                                  ? new Date(brief.riskProfile.lastAssessedAt).toLocaleDateString()
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No risk profile on record.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> AML Cases
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Total Cases</span>
                            <span className="text-sm font-medium" data-testid="brief-aml-total">{brief.aml.totalCases}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Open Cases</span>
                            <Badge
                              data-testid="brief-aml-open"
                              variant={brief.aml.openCases > 0 ? 'destructive' : 'outline'}
                            >
                              {brief.aml.openCases}
                            </Badge>
                          </div>
                          {brief.aml.cases.slice(0, 3).map((c: any) => (
                            <div key={c.id} className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                              <span className="font-mono">{c.caseNumber}</span> —{' '}
                              <Badge variant="outline" className="text-xs">{c.status}</Badge>{' '}
                              <span className="text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 30-Day Activity Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4" /> 30-Day Activity Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Total Transactions</p>
                          <p className="text-xl font-bold" data-testid="brief-tx-total">{brief.recentActivity.transactionCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Completed</p>
                          <p className="text-xl font-bold text-green-600" data-testid="brief-tx-completed">{brief.recentActivity.completedCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Pending</p>
                          <p className="text-xl font-bold text-yellow-600" data-testid="brief-tx-pending">{brief.recentActivity.pendingCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Gold Inflow</p>
                          <p className="text-lg font-bold text-green-700" data-testid="brief-inflow">{parseFloat(brief.recentActivity.inflowGoldGrams).toFixed(4)}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Gold Outflow</p>
                          <p className="text-lg font-bold text-red-600" data-testid="brief-outflow">{parseFloat(brief.recentActivity.outflowGoldGrams).toFixed(4)}g</p>
                        </div>
                      </div>
                      {brief.recentActivity.transactions.length > 0 && (
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                              <tr>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-left">Gold (g)</th>
                                <th className="px-3 py-2 text-left">USD</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {brief.recentActivity.transactions.map((tx: any) => (
                                <tr key={tx.id} className="border-t hover:bg-gray-50" data-testid={`brief-tx-row-${tx.id}`}>
                                  <td className="px-3 py-2">
                                    <Badge variant="outline" className="text-xs">{tx.type}</Badge>
                                  </td>
                                  <td className="px-3 py-2 text-yellow-700 font-mono">
                                    {tx.amountGold ? parseFloat(tx.amountGold).toFixed(4) : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-green-700 font-mono">
                                    {tx.amountUsd ? `$${parseFloat(tx.amountUsd).toFixed(2)}` : '—'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge
                                      variant={tx.status === 'Completed' ? 'default' : tx.status === 'Failed' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {tx.status}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* KYC & Identity Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Identity & KYC Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-sm text-gray-500">Full Name</span>
                            <span className="text-sm font-medium">{brief.identity.firstName} {brief.identity.lastName}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-sm text-gray-500">Country</span>
                            <span className="text-sm font-medium">{brief.identity.country || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-sm text-gray-500">Account Type</span>
                            <span className="text-sm font-medium capitalize">{brief.identity.accountType}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-sm text-gray-500">Member Since</span>
                            <span className="text-sm font-medium">
                              {new Date(brief.identity.memberSince).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-sm text-gray-500">KYC Status</span>
                            {brief.kyc ? getKycStatusBadge(brief.kyc.status) : <Badge variant="outline">Not Submitted</Badge>}
                          </div>
                          {brief.kyc && (
                            <>
                              <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-sm text-gray-500">KYC Full Name</span>
                                <span className="text-sm font-medium">{brief.kyc.fullName || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-sm text-gray-500">Nationality</span>
                                <span className="text-sm font-medium">{brief.kyc.nationality || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="text-sm text-gray-500">Submitted</span>
                                <span className="text-sm font-medium">
                                  {brief.kyc.submittedAt ? new Date(brief.kyc.submittedAt).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
