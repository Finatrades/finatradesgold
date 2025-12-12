import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  userId: string;
  type: 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Swap' | 'Deposit' | 'Withdrawal';
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';
  amountGold: string | null;
  amountUsd: string | null;
  amountEur: string | null;
  description: string | null;
  counterparty: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function Transactions() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, isLoading, refetch } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['/api/admin/transactions'],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, completedAt: status === 'Completed' ? new Date().toISOString() : null }),
      });
      if (!res.ok) throw new Error('Failed to update transaction');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
      toast.success('Transaction updated');
    },
    onError: () => {
      toast.error('Failed to update transaction');
    },
  });

  const transactions = data?.transactions || [];

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatAmount = (tx: Transaction) => {
    const goldAmt = parseFloat(tx.amountGold || '0');
    const usdAmt = parseFloat(tx.amountUsd || '0');
    
    if (goldAmt > 0 && usdAmt > 0) {
      return `${goldAmt.toFixed(4)}g ($${usdAmt.toLocaleString()})`;
    } else if (goldAmt > 0) {
      return `${goldAmt.toFixed(4)}g`;
    } else if (usdAmt > 0) {
      return `$${usdAmt.toLocaleString()}`;
    }
    return '-';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">Completed</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">Pending</Badge>;
      case 'Processing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">Processing</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'Cancelled':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-none">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Buy': 'bg-emerald-100 text-emerald-800',
      'Sell': 'bg-red-100 text-red-800',
      'Send': 'bg-blue-100 text-blue-800',
      'Receive': 'bg-purple-100 text-purple-800',
      'Deposit': 'bg-orange-100 text-orange-800',
      'Withdrawal': 'bg-pink-100 text-pink-800',
      'Swap': 'bg-cyan-100 text-cyan-800',
    };
    return <Badge className={`${colors[type] || 'bg-gray-100 text-gray-800'} border-none`}>{type}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">All Transactions</h1>
            <p className="text-gray-500">Monitor all platform financial activities in real-time.</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by ID, User ID, or Description..." 
              className="pl-10 bg-white" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Buy">Buy</SelectItem>
              <SelectItem value="Sell">Sell</SelectItem>
              <SelectItem value="Send">Send</SelectItem>
              <SelectItem value="Receive">Receive</SelectItem>
              <SelectItem value="Deposit">Deposit</SelectItem>
              <SelectItem value="Withdrawal">Withdrawal</SelectItem>
              <SelectItem value="Swap">Swap</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No transactions found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">User ID</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="bg-white border-b hover:bg-gray-50" data-testid={`row-transaction-${tx.id}`}>
                        <td className="px-4 py-4 font-mono text-xs text-gray-500">{tx.id.slice(0, 8)}...</td>
                        <td className="px-4 py-4 font-mono text-xs text-gray-600">{tx.userId.slice(0, 8)}...</td>
                        <td className="px-4 py-4">{getTypeBadge(tx.type)}</td>
                        <td className="px-4 py-4 font-medium text-gray-900">{formatAmount(tx)}</td>
                        <td className="px-4 py-4 text-gray-600 max-w-[200px] truncate">{tx.description || '-'}</td>
                        <td className="px-4 py-4">{getStatusBadge(tx.status)}</td>
                        <td className="px-4 py-4 text-gray-500">{format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}</td>
                        <td className="px-4 py-4">
                          {tx.status === 'Pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => updateMutation.mutate({ id: tx.id, status: 'Completed' })}
                                data-testid={`button-approve-${tx.id}`}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => updateMutation.mutate({ id: tx.id, status: 'Cancelled' })}
                                data-testid={`button-reject-${tx.id}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
