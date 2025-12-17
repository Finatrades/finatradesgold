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
import { User, Building, Mail, Phone, MapPin, Shield, Key, History, Edit, Save, Camera, ArrowRight, AlertTriangle, Download, FileText, Loader2, Trash2, Fingerprint } from 'lucide-react';
import BiometricSettings from '@/components/BiometricSettings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const { accountType } = useAccountType();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Password required", {
        description: "Please enter your password to confirm deletion"
      });
      return;
    }
    
    setIsDeleting(true);
    try {
      await apiRequest('DELETE', `/api/users/${user.id}`, {
        password: deletePassword
      });
      
      toast.success("Account deleted", {
        description: "Your account has been permanently deleted."
      });
      
      logout();
      setLocation('/');
    } catch (error) {
      toast.error("Failed to delete account", {
        description: error instanceof Error ? error.message : "Could not delete your account"
      });
    } finally {
      setIsDeleting(false);
      setDeletePassword('');
    }
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
                 <Button size="sm" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
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
                  <p className="text-2xl font-bold text-secondary">24</p>
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
                         <p className="text-xs text-orange-600 font-medium hover:underline cursor-pointer">Complete KYC Now</p>
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
                <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
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
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
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

              <TabsContent value="security">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your password and 2FA settings.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-xs text-muted-foreground">Secure your account with 2FA.</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Enable 2FA</Button>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button>Update Password</Button>
                  </CardFooter>
                </Card>

                {/* Biometric Authentication */}
                <div className="mt-6">
                  <BiometricSettings />
                </div>

                {/* Danger Zone */}
                <Card className="border-red-200 mt-6">
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>Irreversible actions for your account.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                      <div>
                        <p className="font-medium text-red-700">Delete Account</p>
                        <p className="text-sm text-red-600">Permanently delete your account and all data. This cannot be undone.</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" data-testid="button-delete-account">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                              <AlertTriangle className="w-5 h-5" />
                              Delete Your Account?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. All your data, transactions, and wallet balances will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-2 py-4">
                            <Label htmlFor="delete-password">Enter your password to confirm:</Label>
                            <Input
                              id="delete-password"
                              type="password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              placeholder="Your password"
                              data-testid="input-delete-password"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAccount}
                              disabled={isDeleting || !deletePassword}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid="button-confirm-delete"
                            >
                              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
                    {['Email Notifications', 'Push Notifications', 'SMS Alerts', 'Marketing Updates'].map((item) => (
                      <div key={item} className="flex items-center justify-between py-2">
                        <Label className="font-medium">{item}</Label>
                        <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                      </div>
                    ))}
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
