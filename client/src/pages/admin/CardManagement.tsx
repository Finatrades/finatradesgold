import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Lock, Unlock, Plus, Search, MoreHorizontal, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function CardManagement() {
  const cards = [
    { id: '4532 **** **** 8821', user: 'Alice Freeman', type: 'Metal (Gold)', status: 'Active', expiry: '12/28', spend: 'CHF 4,520' },
    { id: '4532 **** **** 9932', user: 'Bob Smith', type: 'Virtual', status: 'Active', expiry: '10/26', spend: 'CHF 1,200' },
    { id: '4532 **** **** 1122', user: 'Charlie Brown', type: 'Standard', status: 'Frozen', expiry: '05/27', spend: 'CHF 850' },
    { id: '4532 **** **** 7744', user: 'TechCorp AG', type: 'Corporate', status: 'Active', expiry: '01/29', spend: 'CHF 15,400' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Card Management</h1>
            <p className="text-gray-500">Issue, monitor, and control FinaCards.</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Issue New Card
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by card number or user..." className="pl-10 bg-white" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Issued Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cards.map((card, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-8 rounded bg-gradient-to-r ${
                      card.type.includes('Metal') ? 'from-yellow-400 to-yellow-600' : 
                      card.type === 'Corporate' ? 'from-slate-700 to-slate-900' :
                      'from-blue-500 to-blue-700'
                    } flex items-center justify-center text-white shadow-sm`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-mono font-medium text-gray-900">{card.id}</p>
                      <p className="text-sm text-gray-500">{card.user} • {card.type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium text-gray-900">{card.spend}</p>
                      <p className="text-xs text-gray-400">Monthly Spend</p>
                    </div>
                    <Badge variant="outline" className={
                      card.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }>
                      {card.status}
                    </Badge>
                    <div className="flex gap-2">
                       {card.status === 'Active' ? (
                         <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                           <Lock className="w-4 h-4" />
                         </Button>
                       ) : (
                         <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50 hover:text-green-700">
                           <Unlock className="w-4 h-4" />
                         </Button>
                       )}
                       <Button size="sm" variant="ghost">
                         <MoreHorizontal className="w-4 h-4" />
                       </Button>
                    </div>
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