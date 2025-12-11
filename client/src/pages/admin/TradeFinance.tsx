import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Briefcase, FileCheck, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function TradeFinance() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trade Finance Operations</h1>
          <p className="text-gray-500">Manage BNSL positions and FinaBridge corporate financing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-gray-500">Total BNSL Exposure</CardTitle>
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

           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-gray-500">Active Bridge Loans</CardTitle>
               <Briefcase className="w-4 h-4 text-gray-500" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">CHF 2.8M</div>
               <p className="text-xs text-gray-500 mt-1">4 Active Supply Chain Deals</p>
               <div className="mt-4 flex gap-2">
                 <Badge variant="secondary">2 Pending Review</Badge>
                 <Badge variant="outline">0 Defaults</Badge>
               </div>
             </CardContent>
           </Card>
        </div>

        <Tabs defaultValue="bnsl" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
            <TabsTrigger value="bnsl" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              BNSL Positions
            </TabsTrigger>
            <TabsTrigger value="bridge" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              FinaBridge Requests
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="bnsl">
              <Card>
                <CardHeader>
                  <CardTitle>Active BNSL Positions</CardTitle>
                  <CardDescription>Monitor leverage and collateral ratios.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { id: 'POS-101', user: 'Alice Freeman', collateral: '100g Gold', loan: 'CHF 4,500', ratio: '145%', status: 'Healthy' },
                      { id: 'POS-102', user: 'Bob Smith', collateral: '50g Gold', loan: 'CHF 2,800', ratio: '115%', status: 'Warning' },
                      { id: 'POS-103', user: 'Charlie Brown', collateral: '500g Gold', loan: 'CHF 25,000', ratio: '160%', status: 'Healthy' },
                    ].map((pos, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                        <div>
                          <p className="font-bold text-gray-900">{pos.loan}</p>
                          <p className="text-sm text-gray-500">Loan against {pos.collateral}</p>
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
            </TabsContent>

            <TabsContent value="bridge">
               <Card>
                <CardHeader>
                  <CardTitle>Corporate Finance Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-blue-50/50">
                        <div className="flex items-center gap-4">
                           <div className="p-2 bg-white rounded border border-blue-100">
                              <Briefcase className="w-6 h-6 text-blue-600" />
                           </div>
                           <div>
                              <h4 className="font-bold text-gray-900">Supply Chain Financing - TechCorp AG</h4>
                              <p className="text-sm text-gray-600">Requesting CHF 150,000 for 90 days • Collateral: Invoice #INV-9982</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="outline" className="bg-white">View Docs</Button>
                           <Button>Review Application</Button>
                        </div>
                     </div>
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