import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function BNSLManagement() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BNSL Management</h1>
          <p className="text-gray-500">Buy Now Sell Later - Position Monitoring & Risk Management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-gray-500">Total Exposure</CardTitle>
               <TrendingUp className="w-4 h-4 text-gray-500" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">CHF 450,000</div>
               <p className="text-xs text-gray-500 mt-1">Across 124 Active Positions</p>
               <div className="mt-4">
                 <div className="flex justify-between text-xs mb-1">
                    <span>Collateral Health</span>
                    <span className="text-green-600">Healthy (145%)</span>
                 </div>
                 <Progress value={85} className="h-2" />
               </div>
             </CardContent>
           </Card>

           <Card className="bg-orange-50 border-orange-100">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-orange-800">Risk Alerts</CardTitle>
               <AlertTriangle className="w-4 h-4 text-orange-600" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-orange-700">3 Positions</div>
               <p className="text-xs text-orange-600 mt-1">Approaching liquidation threshold</p>
               <Button size="sm" variant="outline" className="mt-4 w-full border-orange-200 text-orange-700 hover:bg-orange-100">
                 View At-Risk Positions
               </Button>
             </CardContent>
           </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active BNSL Positions</CardTitle>
            <CardDescription>Real-time monitoring of all leveraged positions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: 'POS-101', user: 'Alice Freeman', collateral: '100g Gold', loan: 'CHF 4,500', ratio: '145%', status: 'Healthy' },
                { id: 'POS-102', user: 'Bob Smith', collateral: '50g Gold', loan: 'CHF 2,800', ratio: '115%', status: 'Warning' },
                { id: 'POS-103', user: 'Charlie Brown', collateral: '500g Gold', loan: 'CHF 25,000', ratio: '160%', status: 'Healthy' },
                { id: 'POS-104', user: 'Diana Prince', collateral: '250g Gold', loan: 'CHF 12,000', ratio: '135%', status: 'Healthy' },
                { id: 'POS-105', user: 'Evan Wright', collateral: '10g Gold', loan: 'CHF 400', ratio: '112%', status: 'Warning' },
              ].map((pos, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{pos.loan}</p>
                      <span className="text-xs text-gray-500">({pos.id})</span>
                    </div>
                    <p className="text-sm text-gray-500">Loan against {pos.collateral} • {pos.user}</p>
                  </div>
                  <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={`font-bold ${pos.status === 'Warning' ? 'text-red-600' : 'text-green-600'}`}>{pos.ratio}</p>
                        <p className="text-xs text-gray-500">LTV Ratio</p>
                      </div>
                      <Badge variant={pos.status === 'Warning' ? 'destructive' : 'outline'} className={pos.status === 'Healthy' ? 'text-green-700 bg-green-50 border-green-200' : ''}>
                        {pos.status}
                      </Badge>
                      <Button size="sm" variant="ghost">Details</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}