import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, Download, Search, Calendar, User, Building2, 
  Wallet, ArrowUpRight, ArrowDownRight, Loader2, RefreshCcw,
  Filter, Eye
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

interface UserOption {
  id: string;
  finatradesId: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
}

interface StatementTransaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  debitUsd: number | null;
  creditUsd: number | null;
  debitGold: number | null;
  creditGold: number | null;
  balanceUsd: number;
  balanceGold: number;
  type: string;
  status: string;
}

interface AccountStatement {
  user: {
    id: string;
    finatradesId: string;
    fullName: string;
    email: string;
    accountType: string;
  };
  period: {
    from: string;
    to: string;
  };
  reportId: string;
  generatedAt: string;
  currentGoldPrice: number;
  balances: {
    openingUsd: number;
    openingGold: number;
    totalCreditsUsd: number;
    totalDebitsUsd: number;
    totalCreditsGold: number;
    totalDebitsGold: number;
    closingUsd: number;
    closingGold: number;
    closingUsdGoldEquivalent: number;
  };
  transactions: StatementTransaction[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatGrams(grams: number): string {
  return `${grams.toFixed(4)}g`;
}

export default function AccountStatements() {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: users, isLoading: loadingUsers, isFetching: fetchingUsers } = useQuery<UserOption[]>({
    queryKey: ['/api/admin/users/list', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      const res = await fetch(`/api/admin/users/list?${params}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });

  const { data: statement, isLoading: loadingStatement, refetch: refetchStatement } = useQuery<AccountStatement>({
    queryKey: ['/api/admin/account-statement', selectedUserId, dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/admin/account-statement/${selectedUserId}?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error('Failed to fetch statement');
      return res.json();
    },
    enabled: !!selectedUserId && !!dateFrom && !!dateTo
  });

  const handleDownloadPDF = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user first');
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/admin/account-statement/${selectedUserId}/pdf?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `account-statement-${statement?.user.finatradesId || selectedUserId}-${dateFrom}-to-${dateTo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Statement downloaded successfully');
    } catch (error) {
      toast.error('Failed to download statement');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user first');
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/account-statement/${selectedUserId}/csv?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error('Failed to generate CSV');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `account-statement-${statement?.user.finatradesId || selectedUserId}-${dateFrom}-to-${dateTo}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('CSV downloaded successfully');
    } catch (error) {
      toast.error('Failed to download CSV');
    }
  };

  const setQuickDateRange = (range: string) => {
    const today = new Date();
    switch (range) {
      case 'last30':
        setDateFrom(format(subDays(today, 30), 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        setDateFrom(format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'));
        break;
      case 'last3Months':
        setDateFrom(format(subMonths(today, 3), 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'thisYear':
        setDateFrom(format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-account-statements-title">
              Account Statements
            </h1>
            <p className="text-gray-500">
              Generate bank-style account statements for any user
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Select User
              </CardTitle>
              <CardDescription>
                Choose a user to generate their statement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-users"
                />
              </div>

              <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
                {loadingUsers || fetchingUsers ? (
                  <div className="p-4 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    {searchQuery ? 'Searching...' : 'Loading users...'}
                  </div>
                ) : !users || users.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchQuery ? `No users found for "${searchQuery}"` : 'No users found'}
                  </div>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 cursor-pointer hover:bg-orange-50 transition-colors ${
                        selectedUserId === user.id ? 'bg-orange-100 border-l-4 border-orange-500' : ''
                      }`}
                      onClick={() => setSelectedUserId(user.id)}
                      data-testid={`user-option-${user.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          <div className="text-xs font-mono text-orange-600">{user.finatradesId}</div>
                        </div>
                        <Badge variant={user.accountType === 'Corporate' ? 'default' : 'secondary'} className="text-xs">
                          {user.accountType === 'Corporate' ? <Building2 className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                          {user.accountType}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Statement Period & Actions
              </CardTitle>
              <CardDescription>
                Select date range and generate statement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange('last30')} data-testid="btn-last30">
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange('lastMonth')} data-testid="btn-last-month">
                  Last Month
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange('last3Months')} data-testid="btn-last-3months">
                  Last 3 Months
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange('thisYear')} data-testid="btn-this-year">
                  This Year
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    data-testid="input-date-from"
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    data-testid="input-date-to"
                  />
                </div>
              </div>

              {selectedUserId && (
                <div className="flex gap-3">
                  <Button 
                    onClick={() => { refetchStatement(); setPreviewOpen(true); }}
                    className="flex-1"
                    data-testid="btn-preview-statement"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Statement
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadPDF}
                    disabled={isGenerating}
                    data-testid="btn-download-pdf"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadCSV}
                    data-testid="btn-download-csv"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                </div>
              )}

              {!selectedUserId && (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a user from the list to generate their statement</p>
                </div>
              )}

              {selectedUserId && statement && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Balance Summary</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Opening USD</div>
                        <div className="font-semibold">{formatCurrency(statement.balances.openingUsd)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Closing USD</div>
                        <div className="font-semibold">{formatCurrency(statement.balances.closingUsd)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Opening Gold</div>
                        <div className="font-semibold">{formatGrams(statement.balances.openingGold)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Closing Gold</div>
                        <div className="font-semibold">{formatGrams(statement.balances.closingGold)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Account Statement Preview
              </DialogTitle>
            </DialogHeader>

            {loadingStatement ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Loading statement...</p>
              </div>
            ) : statement ? (
              <div className="space-y-6">
                <div className="border-2 border-orange-200 rounded-lg p-6 bg-gradient-to-r from-orange-50 to-white">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-orange-600">FINATRADES</h2>
                    <p className="text-lg font-medium text-gray-700">Account Statement</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-500">Account Holder:</span> <strong>{statement.user.fullName}</strong></p>
                      <p><span className="text-gray-500">Account ID:</span> <strong className="font-mono">{statement.user.finatradesId}</strong></p>
                      <p><span className="text-gray-500">Account Type:</span> <strong>{statement.user.accountType}</strong></p>
                    </div>
                    <div className="text-right">
                      <p><span className="text-gray-500">Statement Period:</span></p>
                      <p className="font-medium">{format(new Date(statement.period.from), 'dd MMM yyyy')} – {format(new Date(statement.period.to), 'dd MMM yyyy')}</p>
                      <p className="text-xs text-gray-500 mt-1">Report ID: {statement.reportId}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="text-xs text-blue-600">Opening Balance</div>
                      <div className="font-bold text-lg">{formatCurrency(statement.balances.openingUsd)}</div>
                      <div className="text-sm text-gray-500">{formatGrams(statement.balances.openingGold)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="pt-4">
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> Total Credits
                      </div>
                      <div className="font-bold text-lg text-green-700">{formatCurrency(statement.balances.totalCreditsUsd)}</div>
                      <div className="text-sm text-gray-500">{formatGrams(statement.balances.totalCreditsGold)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50">
                    <CardContent className="pt-4">
                      <div className="text-xs text-red-600 flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3" /> Total Debits
                      </div>
                      <div className="font-bold text-lg text-red-700">{formatCurrency(statement.balances.totalDebitsUsd)}</div>
                      <div className="text-sm text-gray-500">{formatGrams(statement.balances.totalDebitsGold)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50">
                    <CardContent className="pt-4">
                      <div className="text-xs text-orange-600">Closing Balance</div>
                      <div className="font-bold text-lg">{formatCurrency(statement.balances.closingUsd)}</div>
                      <div className="text-sm text-gray-500">{formatGrams(statement.balances.closingGold)}</div>
                      {statement.balances.closingUsdGoldEquivalent > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          ≈ {formatGrams(statement.balances.closingUsdGoldEquivalent)} @ ${statement.currentGoldPrice.toFixed(2)}/g
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Reference</th>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-right font-medium text-red-600">Debit (-)</th>
                        <th className="px-3 py-2 text-right font-medium text-green-600">Credit (+)</th>
                        <th className="px-3 py-2 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {statement.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                            No transactions in this period
                          </td>
                        </tr>
                      ) : (
                        statement.transactions.map((tx, idx) => (
                          <tr key={tx.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2">{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                            <td className="px-3 py-2 font-mono text-xs">{tx.reference}</td>
                            <td className="px-3 py-2">{tx.description}</td>
                            <td className="px-3 py-2 text-right text-red-600">
                              {tx.debitUsd ? formatCurrency(tx.debitUsd) : ''}
                              {tx.debitGold ? <span className="block text-xs">{formatGrams(tx.debitGold)}</span> : ''}
                            </td>
                            <td className="px-3 py-2 text-right text-green-600">
                              {tx.creditUsd ? formatCurrency(tx.creditUsd) : ''}
                              {tx.creditGold ? <span className="block text-xs">{formatGrams(tx.creditGold)}</span> : ''}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {formatCurrency(tx.balanceUsd)}
                              <span className="block text-xs text-gray-500">{formatGrams(tx.balanceGold)}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-center text-xs text-gray-500 border-t pt-4">
                  <p>This statement is generated by Finatrades and is for informational purposes only.</p>
                  <p>Gold values are calculated at transaction time rates. For questions, contact support@finatrades.com</p>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={handleDownloadPDF} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download PDF
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                <p>No statement data available</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
