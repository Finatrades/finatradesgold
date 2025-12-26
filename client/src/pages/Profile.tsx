import React, { useState } from 'react';
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
import { User, Building, Mail, Phone, MapPin, Shield, History, Edit, Save, Camera, ArrowRight, Download, FileText, Loader2, Calendar, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { accountType } = useAccountType();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statementFrom, setStatementFrom] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [statementTo, setStatementTo] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        
        {/* Header Section */}
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
          
          {/* Left Column: Avatar & Quick Stats */}
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
                  <p className="text-2xl font-bold text-primary">24</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Trades</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">1.2kg</p>
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
                       <p className="text-xs text-muted-foreground">Level 2 Access</p>
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
                    <p className="text-xs text-muted-foreground">Dec 2024</p>
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
          </div>

          {/* Right Column: Details & Settings */}
          <div className="md:col-span-8">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="statements">Statements</TabsTrigger>
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
