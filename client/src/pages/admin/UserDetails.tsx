import React from 'react';
import AdminLayout from './AdminLayout';
import { useRoute, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Mail, Phone, MapPin, Shield, Calendar, CreditCard, 
  Ban, Lock, FileText, Activity, Building, Download, CheckCircle2 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserDetails() {
  const [, params] = useRoute("/admin/users/:id");
  const userId = params?.id;

  // Mock Data - In a real app, fetch based on userId
  const user = {
    id: userId,
    firstName: "Alice",
    lastName: "Freeman",
    email: "alice@example.com",
    phone: "+41 79 123 45 67",
    address: "Bahnhofstrasse 12, 8001 Zurich, Switzerland",
    status: "Active",
    kycStatus: "Verified",
    accountType: "Personal",
    joinedDate: "Nov 15, 2024",
    lastLogin: "Today, 10:42 AM",
    balances: {
      fiat: "CHF 45,250.00",
      gold: "1,250g (Au)"
    },
    documents: [
      { name: "Passport.pdf", status: "Verified", date: "Nov 15, 2024" },
      { name: "Utility_Bill.pdf", status: "Verified", date: "Nov 15, 2024" }
    ],
    recentActivity: [
      { id: "TX-1", action: "Login", date: "Today, 10:42 AM", ip: "192.168.1.1" },
      { id: "TX-2", action: "Gold Purchase", date: "Yesterday, 2:30 PM", details: "Bought 50g Gold" },
      { id: "TX-3", action: "Deposit", date: "Dec 10, 2024", details: "Deposit CHF 5,000" }
    ]
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
            <p className="text-sm text-gray-500">Viewing profile for {user.firstName} {user.lastName}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <Ban className="w-4 h-4 mr-2" /> Suspend User
            </Button>
            <Button variant="outline">
              <Lock className="w-4 h-4 mr-2" /> Reset Password
            </Button>
            <Button>
              <Mail className="w-4 h-4 mr-2" /> Send Email
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
                  {user.firstName[0]}{user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
                    <div className="flex items-center gap-2 text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span className="flex items-center gap-1"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">ID: {user.id}</span></span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-3 py-1">
                      {user.status}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {user.accountType} Account
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Total Balance</p>
                    <p className="text-xl font-bold text-slate-900">{user.balances.fiat}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Gold Holdings</p>
                    <p className="text-xl font-bold text-yellow-600">{user.balances.gold}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">KYC Status</p>
                    <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5 text-green-500" />
                       <span className="font-medium text-gray-900">{user.kycStatus}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1"
            >
              Documents & KYC
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1"
            >
              Activity Log
            </TabsTrigger>
            <TabsTrigger 
              value="notes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1"
            >
              Admin Notes
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
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
                        <p className="text-sm text-gray-500">{user.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Address</p>
                        <p className="text-sm text-gray-500">{user.address}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Account Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Member Since</span>
                      <span className="text-sm font-medium">{user.joinedDate}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Last Login</span>
                      <span className="text-sm font-medium">{user.lastLogin}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Risk Level</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Low</Badge>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-gray-500">2FA Status</span>
                      <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Enabled
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Submitted Documents</CardTitle>
                  <CardDescription>KYC documents submitted by the user.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {user.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded border border-gray-200">
                            <FileText className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">Uploaded on {doc.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {doc.status}
                          </Badge>
                          <Button size="sm" variant="outline" className="gap-2">
                             <Eye className="w-4 h-4" /> View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
               <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {user.recentActivity.map((activity, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 z-10 relative">
                            <Activity className="w-4 h-4" />
                          </div>
                          {i !== user.recentActivity.length - 1 && (
                            <div className="absolute top-8 left-4 w-px h-full bg-gray-200 -ml-px" />
                          )}
                        </div>
                        <div className="pb-6">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                          {activity.details && (
                            <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                              {activity.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
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