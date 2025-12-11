import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Transactions() {
  const transactions = [
    { id: 'TX-9821', user: 'Alice Freeman', type: 'Deposit', amount: '+$5,000.00', status: 'Completed', date: '2024-12-11 14:30' },
    { id: 'TX-9822', user: 'Bob Smith', type: 'Buy Gold', amount: '-$1,250.00', status: 'Completed', date: '2024-12-11 12:15' },
    { id: 'TX-9823', user: 'TechCorp AG', type: 'Withdrawal', amount: '-$12,000.00', status: 'Pending', date: '2024-12-11 09:45' },
    { id: 'TX-9824', user: 'Diana Prince', type: 'BNSL Lock', amount: '50g Gold', status: 'Completed', date: '2024-12-10 18:20' },
    { id: 'TX-9825', user: 'Evan Wright', type: 'Deposit', amount: '+$250.00', status: 'Failed', date: '2024-12-10 16:00' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500">Monitor all platform financial activities.</p>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by ID, User, or Amount..." className="pl-10 bg-white" />
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
          <Button variant="outline">Export CSV</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{tx.id}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{tx.user}</td>
                      <td className="px-6 py-4">{tx.type}</td>
                      <td className={`px-6 py-4 font-medium ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-gray-900'}`}>
                        {tx.amount}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={tx.status === 'Completed' ? 'default' : tx.status === 'Failed' ? 'destructive' : 'secondary'} className={tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{tx.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}