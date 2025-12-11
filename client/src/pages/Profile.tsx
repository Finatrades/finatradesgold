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
import { User, Building, Mail, Phone, MapPin, Shield, Key, History, Edit, Save, Camera } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, login } = useAuth();
  const { accountType } = useAccountType();
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '+41 79 123 45 67', // Mock phone
    address: 'Bahnhofstrasse 12, 8001 Zurich', // Mock address
    companyName: user?.companyName || ''
  });

  if (!user) return null;

  const handleSave = () => {
    setIsEditing(false);
    
    // Update local user state
    login({
      ...user,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      companyName: formData.companyName
    });

    toast.success("Profile Updated", {
      description: "Your personal information has been saved successfully."
    });
  };

  const getInitials = () => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  };

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
            <Badge variant={user.kycStatus === 'verified' ? 'default' : 'destructive'} className="text-sm px-3 py-1">
              {user.kycStatus === 'verified' ? (
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Verified</span>
              ) : (
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Unverified</span>
              )}
            </Badge>
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
                  <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">Identity Verified</p>
                    <p className="text-xs text-muted-foreground">Level 2 Access</p>
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
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" /> Save
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
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input 
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          disabled={!isEditing}
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
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          disabled={!isEditing}
                          className="pl-10" 
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