import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500">Welcome back, here's what's happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard 
            title="Total Users" 
            value="2,543" 
            change="+12.5%" 
            trend="up" 
            icon={<Users className="w-5 h-5 text-blue-600" />} 
            bg="bg-blue-50"
          />
          <StatsCard 
            title="Total Volume" 
            value="$4.2M" 
            change="+8.2%" 
            trend="up" 
            icon={<Activity className="w-5 h-5 text-purple-600" />} 
            bg="bg-purple-50"
          />
          <StatsCard 
            title="Pending KYC" 
            value="18" 
            change="-2.4%" 
            trend="down" 
            icon={<ShieldCheck className="w-5 h-5 text-orange-600" />} 
            bg="bg-orange-50"
          />
          <StatsCard 
            title="Revenue" 
            value="$125k" 
            change="+15.3%" 
            trend="up" 
            icon={<DollarSign className="w-5 h-5 text-green-600" />} 
            bg="bg-green-50"
          />
        </div>

        {/* Recent Activity & KYC Requests */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Recent KYC Requests */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending KYC Requests</CardTitle>
              <Button variant="outline" size="sm">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Sarah Johnson', type: 'Personal', date: '2 mins ago', status: 'Pending' },
                  { name: 'TechCorp Solutions AG', type: 'Corporate', date: '15 mins ago', status: 'In Review' },
                  { name: 'Michael Chen', type: 'Personal', date: '1 hour ago', status: 'Pending' },
                  { name: 'Global Trade Ltd', type: 'Corporate', date: '2 hours ago', status: 'Pending' },
                  { name: 'Emma Davis', type: 'Personal', date: '3 hours ago', status: 'Pending' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                        {item.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.type} Account • {item.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
                        <Clock className="w-3 h-3 mr-1" /> {item.status}
                      </Badge>
                      <Button size="sm" variant="ghost">Review</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <StatusItem label="FinaVault Storage" status="Operational" color="green" />
              <StatusItem label="Payment Gateway" status="Operational" color="green" />
              <StatusItem label="KYC Verification API" status="Degraded" color="yellow" />
              <StatusItem label="Email Service" status="Operational" color="green" />
              
              <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <h4 className="font-medium text-sm mb-2 text-slate-900">Admin Notices</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Scheduled maintenance for the FinaBridge module is planned for Sunday at 02:00 UTC. Expect minor downtime.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AdminLayout>
  );
}

function StatsCard({ title, value, change, trend, icon, bg }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${bg}`}>
            {icon}
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusItem({ label, status, color }: any) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${(colors as any)[color]}`} />
        <span className="text-xs text-gray-500">{status}</span>
      </div>
    </div>
  );
}