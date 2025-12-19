import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function CardManagement() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Card Management</h1>
            <p className="text-gray-500">Issue, monitor, and control FinaCards.</p>
          </div>
          <Button disabled>
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
            <CardDescription>FinaCard issuance coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-10 rounded bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center text-white shadow-sm mb-4">
                <CreditCard className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cards Issued Yet</h3>
              <p className="text-gray-500 max-w-sm">
                FinaCard issuance is coming soon. Once enabled, you'll be able to issue and manage gold-backed debit cards for your users here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}