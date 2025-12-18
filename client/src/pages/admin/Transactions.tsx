import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Download, FileText, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { useAuth } from '@/context/AuthContext';
import AdminOtpModal, { checkOtpRequired } from '@/components/admin/AdminOtpModal';
import { useAdminOtp } from '@/hooks/useAdminOtp';

interface Transaction {
  id: string;
  userId: string;
  type: 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Swap' | 'Deposit' | 'Withdrawal' | 'Buy Gold Bar' | 'Crypto Deposit' | 'Trade Finance' | 'BNSL';
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled' | 'Under Review' | 'Pending Review' | 'Draft' | 'Pending Termination';
  amountGold: string | null;
  amountUsd: string | null;
  amountEur: string | null;
  description: string | null;
  counterparty: string | null;
  createdAt: string;
  completedAt: string | null;
  userName?: string;
  userEmail?: string;
  finatradesId?: string;
  sourceTable?: string;
}

export default function Transactions() {
  const { user: adminUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isOtpModalOpen, pendingAction, requestOtp, handleVerified, closeOtpModal } = useAdminOtp();

  const { data, isLoading, refetch } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['/api/admin/transactions'],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, sourceTable }: { id: string; sourceTable?: string }) => {
      const res = await fetch(`/api/admin/transactions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTable }),
      });
      if (!res.ok) throw new Error('Failed to approve transaction');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
      toast.success('Transaction approved and processed');
    },
    onError: () => {
      toast.error('Failed to approve transaction');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, sourceTable }: { id: string; sourceTable?: string }) => {
      const res = await fetch(`/api/admin/transactions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by admin', sourceTable }),
      });
      if (!res.ok) throw new Error('Failed to reject transaction');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
      toast.success('Transaction rejected');
    },
    onError: () => {
      toast.error('Failed to reject transaction');
    },
  });

  const handleApproveWithOtp = async (txId: string, txType: string, sourceTable?: string) => {
    if (!adminUser?.id) return;
    const actionType = txType === 'Deposit' ? 'deposit_approval' : 'withdrawal_approval';
    const otpRequired = await checkOtpRequired(actionType as any, adminUser.id);
    if (otpRequired) {
      requestOtp({
        actionType: actionType as any,
        targetId: txId,
        targetType: 'transaction',
        onComplete: () => approveMutation.mutate({ id: txId, sourceTable }),
      });
    } else {
      approveMutation.mutate({ id: txId, sourceTable });
    }
  };

  const handleRejectWithOtp = async (txId: string, txType: string, sourceTable?: string) => {
    if (!adminUser?.id) return;
    const actionType = txType === 'Deposit' ? 'deposit_rejection' : 'withdrawal_rejection';
    const otpRequired = await checkOtpRequired(actionType as any, adminUser.id);
    if (otpRequired) {
      requestOtp({
        actionType: actionType as any,
        targetId: txId,
        targetType: 'transaction',
        onComplete: () => rejectMutation.mutate({ id: txId, sourceTable }),
      });
    } else {
      rejectMutation.mutate({ id: txId, sourceTable });
    }
  };

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/admin/transactions/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          return { id, success: res.ok };
        })
      );
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      toast.success(`Bulk Approved`, { description: `${successCount} transaction(s) approved.` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
    },
    onError: () => {
      toast.error('Failed to bulk approve transactions');
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/admin/transactions/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Bulk rejected by admin' }),
          });
          return { id, success: res.ok };
        })
      );
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      toast.error(`Bulk Rejected`, { description: `${successCount} transaction(s) rejected.` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
    },
    onError: () => {
      toast.error('Failed to bulk reject transactions');
    },
  });

  const transactions = data?.transactions || [];
  const pendingTransactions = transactions.filter(tx => tx.status === 'Pending');

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAllPending = () => {
    if (selectedIds.size === pendingTransactions.length && pendingTransactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingTransactions.map(tx => tx.id)));
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    bulkApproveMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    bulkRejectMutation.mutate(Array.from(selectedIds));
  };
  const pendingCount = transactions.filter(tx => tx.status === 'Pending').length;

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
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-admin-export">
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={() => exportToCSV(filteredTransactions.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    status: tx.status,
                    amountGold: tx.amountGold,
                    amountUsd: tx.amountUsd,
                    description: tx.description,
                    createdAt: tx.createdAt,
                  })), 'admin_transactions')}
                  data-testid="button-admin-export-csv"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => exportToPDF(filteredTransactions.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    status: tx.status,
                    amountGold: tx.amountGold,
                    amountUsd: tx.amountUsd,
                    description: tx.description,
                    createdAt: tx.createdAt,
                  })), 'Platform Transaction Report')}
                  data-testid="button-admin-export-pdf"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{pendingCount}</span>
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">Pending Authorization</h3>
                <p className="text-yellow-700 text-sm">{pendingCount} transaction(s) awaiting your approval</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-sm text-yellow-700 mr-2">{selectedIds.size} selected</span>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBulkApprove}
                disabled={selectedIds.size === 0 || bulkApproveMutation.isPending}
                className="text-green-600 border-green-300 hover:bg-green-50"
                data-testid="button-bulk-approve-tx"
              >
                {bulkApproveMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Bulk Approve
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBulkReject}
                disabled={selectedIds.size === 0 || bulkRejectMutation.isPending}
                className="text-red-600 border-red-300 hover:bg-red-50"
                data-testid="button-bulk-reject-tx"
              >
                {bulkRejectMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Bulk Reject
              </Button>
              <Button 
                variant="outline" 
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                onClick={() => setStatusFilter('Pending')}
              >
                View Pending
              </Button>
            </div>
          </div>
        )}

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
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-600 uppercase bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-4 font-semibold tracking-wide w-12">
                        <Checkbox 
                          checked={selectedIds.size === pendingTransactions.length && pendingTransactions.length > 0}
                          onCheckedChange={toggleSelectAllPending}
                          disabled={pendingTransactions.length === 0}
                          data-testid="checkbox-select-all-tx"
                        />
                      </th>
                      <th className="px-4 py-4 font-semibold tracking-wide">Transaction ID</th>
                      <th className="px-4 py-4 font-semibold tracking-wide">Finatrades ID</th>
                      <th className="px-4 py-4 font-semibold tracking-wide">User</th>
                      <th className="px-4 py-4 font-semibold tracking-wide">Type</th>
                      <th className="px-4 py-4 font-semibold tracking-wide">Amount</th>
                      <th className="px-4 py-4 font-semibold tracking-wide">Status</th>
                      <th className="px-4 py-4 font-semibold tracking-wide">Date</th>
                      <th className="px-4 py-4 font-semibold tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.map((tx, index) => (
                      <tr 
                        key={tx.id} 
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50/50 transition-colors duration-150 group`} 
                        data-testid={`row-transaction-${tx.id}`}
                      >
                        <td className="px-4 py-4">
                          {tx.status === 'Pending' ? (
                            <Checkbox 
                              checked={selectedIds.has(tx.id)}
                              onCheckedChange={() => toggleSelection(tx.id)}
                              data-testid={`checkbox-tx-${tx.id}`}
                            />
                          ) : (
                            <div className="w-4" />
                          )}
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-gray-500">TX-{tx.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm font-medium text-orange-600">{tx.finatradesId || `FT-${tx.userId.slice(0, 8).toUpperCase()}`}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{tx.userName || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">{tx.userEmail || ''}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">{getTypeBadge(tx.type)}</td>
                        <td className="px-4 py-4 font-medium text-gray-900">{formatAmount(tx)}</td>
                        <td className="px-4 py-4">{getStatusBadge(tx.status)}</td>
                        <td className="px-4 py-4 text-gray-500">{format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}</td>
                        <td className="px-4 py-4">
                          {(tx.status === 'Pending' || tx.status === 'Under Review' || tx.status === 'Pending Review' || tx.status === 'Draft') && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => handleApproveWithOtp(tx.id, tx.type, tx.sourceTable)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${tx.id}`}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleRejectWithOtp(tx.id, tx.type, tx.sourceTable)}
                                disabled={rejectMutation.isPending}
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

        {/* Admin OTP Verification Modal */}
        {pendingAction && adminUser?.id && (
          <AdminOtpModal
            isOpen={isOtpModalOpen}
            onClose={closeOtpModal}
            onVerified={handleVerified}
            actionType={pendingAction.actionType}
            targetId={pendingAction.targetId}
            targetType={pendingAction.targetType}
            actionData={pendingAction.actionData}
            adminUserId={adminUser.id}
          />
        )}
      </div>
    </AdminLayout>
  );
}
