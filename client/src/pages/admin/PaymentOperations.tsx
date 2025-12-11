import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, ArrowDownLeft, ArrowUpRight, DollarSign, Clock, AlertCircle, CreditCard, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function FinaPayManagement() {
  const [deposits, setDeposits] = useState([
    { id: 'DEP-001', user: 'Alice Freeman', amount: 'CHF 5,000.00', method: 'Bank Transfer', date: '2024-12-11', status: 'Pending', ref: 'REF-8821' },
    { id: 'DEP-002', user: 'Bob Smith', amount: 'CHF 1,200.00', method: 'Credit Card', date: '2024-12-11', status: 'Pending', ref: 'REF-8822' },
  ]);

  const [withdrawals, setWithdrawals] = useState([
    { id: 'WDR-001', user: 'TechCorp AG', amount: 'CHF 12,500.00', method: 'Bank Transfer', date: '2024-12-10', status: 'Pending', bank: 'UBS Zurich' },
    { id: 'WDR-002', user: 'Diana Prince', amount: 'CHF 500.00', method: 'Bank Transfer', date: '2024-12-11', status: 'Under Review', bank: 'Credit Suisse' },
  ]);

  const handleApprove = (id: string, type: 'deposit' | 'withdrawal') => {
    toast.success(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} ${id} Approved`);
    if (type === 'deposit') {
      setDeposits(deposits.filter(d => d.id !== id));
    } else {
      setWithdrawals(withdrawals.filter(w => w.id !== id));
    }
  };

  const handleReject = (id: string, type: 'deposit' | 'withdrawal') => {
    toast.error(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} ${id} Rejected`);
    if (type === 'deposit') {
      setDeposits(deposits.filter(d => d.id !== id));
    } else {
      setWithdrawals(withdrawals.filter(w => w.id !== id));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FinaPay Management</h1>
          <p className="text-gray-500">Manage fiat deposits, withdrawals, and digital wallet operations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ... Summary Cards ... */}
          <Card className="bg-blue-50 border-blue-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                   <ArrowDownLeft className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-blue-900">Pending Deposits</p>
                   <h3 className="text-2xl font-bold text-blue-700">CHF 6,200</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card className="bg-orange-50 border-orange-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-orange-100 text-orange-700 rounded-lg">
                   <ArrowUpRight className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-orange-900">Pending Withdrawals</p>
                   <h3 className="text-2xl font-bold text-orange-700">CHF 13,000</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card>
              <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                   <DollarSign className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-900">Treasury Balance</p>
                   <h3 className="text-2xl font-bold text-gray-900">CHF 1.2M</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>

        <Tabs defaultValue="ops" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
            <TabsTrigger value="ops" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Payment Operations
            </TabsTrigger>
            <TabsTrigger value="cards" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Card Management
            </TabsTrigger>
            <TabsTrigger value="txs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Transaction Log
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="ops">
               {/* Deposits & Withdrawals Content */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Incoming Deposits</CardTitle>
                      <CardDescription>Review and reconcile incoming transfers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {deposits.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
                                <ArrowDownLeft className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{item.amount}</p>
                                <p className="text-sm text-gray-500">{item.user}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                                 <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleReject(item.id, 'deposit')}>Reject</Button>
                                 <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(item.id, 'deposit')}>Confirm</Button>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Withdrawal Requests</CardTitle>
                      <CardDescription>Approve outgoing transfers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {withdrawals.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center">
                                <ArrowUpRight className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{item.amount}</p>
                                <p className="text-sm text-gray-500">{item.user}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                                 <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleReject(item.id, 'withdrawal')}>Reject</Button>
                                 <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleApprove(item.id, 'withdrawal')}>Process</Button>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
               </div>
            </TabsContent>

            <TabsContent value="cards">
               <Card>
                 <CardHeader>
                    <CardTitle>Issued Cards</CardTitle>
                    <CardDescription>Monitor active debit cards and limits.</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <div className="flex items-center justify-center py-12 text-gray-500">
                       <CreditCard className="w-12 h-12 mb-4 text-gray-300" />
                       <p>Card management module integrated here.</p>
                    </div>
                 </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="txs">
               <Card>
                 <CardHeader>
                    <CardTitle>Global Transaction Log</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="flex items-center justify-center py-12 text-gray-500">
                       <FileText className="w-12 h-12 mb-4 text-gray-300" />
                       <p>Full transaction history available here.</p>
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