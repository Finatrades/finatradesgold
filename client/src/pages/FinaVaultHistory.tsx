import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { History, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface VaultTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  goldGrams: string;
  status: string;
  createdAt: string;
  referenceNumber?: string;
  vaultLocation?: string;
}

export default function FinaVaultHistory() {
  const { user } = useAuth();

  const { data: depositsData, isLoading: depositsLoading } = useQuery({
    queryKey: ['vault-deposits', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/deposits/${user.id}`);
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: withdrawalsData, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['vault-withdrawals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/withdrawals/${user.id}`);
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const isLoading = depositsLoading || withdrawalsLoading;

  const allTransactions: VaultTransaction[] = [
    ...(depositsData?.requests || []).map((d: any) => ({
      id: d.id,
      type: 'deposit' as const,
      goldGrams: d.totalDeclaredWeightGrams,
      status: d.status,
      createdAt: d.createdAt,
      referenceNumber: d.referenceNumber,
      vaultLocation: d.vaultLocation,
    })),
    ...(withdrawalsData?.requests || []).map((w: any) => ({
      id: w.id,
      type: 'withdrawal' as const,
      goldGrams: w.goldGrams,
      status: w.status,
      createdAt: w.createdAt,
      referenceNumber: w.referenceNumber,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
      case 'in_progress':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'in_progress':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <History className="w-8 h-8 text-[#D4AF37]" />
            Vault History
          </h1>
          <p className="text-muted-foreground">View all your vault deposits and withdrawal transactions.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
              </div>
            ) : allTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No vault transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allTransactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    data-testid={`vault-transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {tx.type === 'deposit' 
                          ? <ArrowDownRight className="w-5 h-5 text-green-600" />
                          : <ArrowUpRight className="w-5 h-5 text-red-600" />
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-foreground capitalize">
                          {tx.type === 'deposit' ? 'Gold Deposit' : 'Gold Withdrawal'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tx.referenceNumber || tx.id.slice(0, 8)}
                          {tx.vaultLocation && ` - ${tx.vaultLocation}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}{parseFloat(tx.goldGrams).toFixed(3)} g
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                        {getStatusIcon(tx.status)}
                        <span className="capitalize">{tx.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
