import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw, DollarSign, Percent, Globe, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const handleSave = () => {
    toast.success("Settings Saved", {
      description: "Platform configuration has been updated successfully."
    });
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
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="pricing">Pricing & Fees</TabsTrigger>
            <TabsTrigger value="limits">Limits & KYC</TabsTrigger>
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
                        <Input defaultValue="1.5" />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                      </div>
                      <p className="text-xs text-gray-500">Markup added to spot price for user purchases.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Sell Spread (%)</Label>
                      <div className="relative">
                        <Input defaultValue="1.0" />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                      </div>
                      <p className="text-xs text-gray-500">Markdown deducted from spot price for user sales.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                    <div className="space-y-2">
                      <Label>Storage Fee (Annual %)</Label>
                      <div className="relative">
                        <Input defaultValue="0.5" />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Trade Amount (CHF)</Label>
                      <div className="relative">
                        <Input defaultValue="50.00" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="limits">
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
                          <Input defaultValue="15,000" />
                       </div>
                       <div className="space-y-2">
                          <Label>Monthly Limit (CHF)</Label>
                          <Input defaultValue="100,000" />
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
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">New User Registration</Label>
                      <p className="text-sm text-gray-500">Allow new users to sign up.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Auto-Approve Low Risk KYC</Label>
                      <p className="text-sm text-gray-500">Automatically verify users with low risk scores.</p>
                    </div>
                    <Switch />
                  </div>
                  
                  <div className="pt-6 border-t border-gray-100">
                     <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 w-full">
                       <RefreshCw className="w-4 h-4 mr-2" /> Restart System Services
                     </Button>
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