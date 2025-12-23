import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Download, Mail, FileText, Eye, Receipt, ArrowUpCircle, ArrowDownCircle, Repeat, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  transactionId: string;
  issuer: string;
  customerName: string;
  customerEmail: string;
  goldGrams: string;
  goldPriceUsdPerGram: string;
  totalUsd: string;
  status: 'Generated' | 'Sent' | 'Failed';
  createdAt: string;
  emailedAt: string | null;
  userName?: string;
  userEmail?: string;
}

interface CertificateDelivery {
  id: string;
  certificateId: string;
  userId: string;
  deliveryMethod: string;
  recipientEmail: string;
  status: 'Pending' | 'Sent' | 'Failed' | 'Resent';
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  certificateNumber?: string;
  certificateType?: string;
  goldGrams?: string;
}

interface TransactionReceipt {
  id: number;
  odooId: string | null;
  odooName: string | null;
  userId: number;
  type: string;
  status: string;
  amountGold: string | null;
  amountUsd: string | null;
  goldPriceAtTransaction: string | null;
  description: string | null;
  sourceModule: string | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export default function DocumentsManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('invoices');

  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ['/api/admin/documents/invoices'],
    queryFn: async () => {
      const res = await fetch('/api/admin/documents/invoices', {
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: deliveriesData, isLoading: deliveriesLoading, refetch: refetchDeliveries } = useQuery<{ deliveries: CertificateDelivery[] }>({
    queryKey: ['/api/admin/documents/certificate-deliveries'],
    queryFn: async () => {
      const res = await fetch('/api/admin/documents/certificate-deliveries', {
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch deliveries');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: receiptsData, isLoading: receiptsLoading, refetch: refetchReceipts } = useQuery<{ transactions: TransactionReceipt[] }>({
    queryKey: ['/api/admin/documents/transaction-receipts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/documents/transaction-receipts', {
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch transaction receipts');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const resendInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/documents/invoices/${id}/resend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-User-Id': user?.id || ''
        },
      });
      if (!res.ok) throw new Error('Failed to resend invoice');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents/invoices'] });
      toast.success('Invoice email resent successfully');
    },
    onError: () => {
      toast.error('Failed to resend invoice email');
    },
  });

  const resendCertificateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/documents/certificates/${id}/resend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-User-Id': user?.id || ''
        },
      });
      if (!res.ok) throw new Error('Failed to resend certificate');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents/certificate-deliveries'] });
      toast.success('Certificate email resent successfully');
    },
    onError: () => {
      toast.error('Failed to resend certificate email');
    },
  });

  const invoices = invoicesData?.invoices || [];
  const deliveries = deliveriesData?.deliveries || [];
  const receipts = receiptsData?.transactions || [];

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDeliveries = deliveries.filter((del) => {
    const matchesSearch = 
      (del.certificateNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      del.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (del.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || del.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const filteredReceipts = receipts.filter((rec) => {
    const matchesSearch = 
      (rec.odooId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (rec.odooName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (rec.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (rec.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (rec.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
    const typeFilterLower = typeFilter.toLowerCase();
    const matchesType = typeFilter === 'all' || 
      rec.type?.toLowerCase().includes(typeFilterLower) || 
      rec.sourceModule?.toLowerCase().includes(typeFilterLower);
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sent':
      case 'Resent':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">{status}</Badge>;
      case 'Pending':
      case 'Generated':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">{status}</Badge>;
      case 'Failed':
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDownloadInvoice = (id: string) => {
    window.open(`/api/admin/documents/invoices/${id}/download`, '_blank');
  };

  const handleDownloadCertificate = (id: string) => {
    window.open(`/api/admin/documents/certificates/${id}/download`, '_blank');
  };

  const handleDownloadReceipt = (id: number) => {
    window.open(`/api/admin/documents/receipts/${id}/download`, '_blank');
  };

  const refetch = () => {
    refetchInvoices();
    refetchDeliveries();
    refetchReceipts();
  };

  const invoiceStats = {
    total: invoices.length,
    sent: invoices.filter(i => i.status === 'Sent').length,
    failed: invoices.filter(i => i.status === 'Failed').length,
  };

  const deliveryStats = {
    total: deliveries.length,
    sent: deliveries.filter(d => d.status === 'Sent' || d.status === 'Resent').length,
    failed: deliveries.filter(d => d.status === 'Failed').length,
  };

  const receiptStats = {
    total: receipts.length,
    completed: receipts.filter(r => r.status === 'Completed' || r.status === 'Approved').length,
    pending: receipts.filter(r => r.status === 'Pending').length,
  };

  const getTypeIcon = (type: string, sourceModule: string | null) => {
    const module = sourceModule?.toLowerCase() || type.toLowerCase();
    if (module.includes('deposit') || type.toLowerCase().includes('deposit')) {
      return <ArrowDownCircle className="w-4 h-4 text-green-600" />;
    }
    if (module.includes('withdrawal') || type.toLowerCase().includes('withdrawal')) {
      return <ArrowUpCircle className="w-4 h-4 text-red-600" />;
    }
    if (module.includes('transfer') || type.toLowerCase().includes('transfer')) {
      return <Repeat className="w-4 h-4 text-blue-600" />;
    }
    if (module.includes('bnsl') || type.toLowerCase().includes('bnsl')) {
      return <Wallet className="w-4 h-4 text-purple-600" />;
    }
    return <Receipt className="w-4 h-4 text-gray-600" />;
  };

  const getTypeBadge = (type: string, sourceModule: string | null) => {
    const displayType = type || sourceModule || 'Unknown';
    let bgColor = 'bg-gray-100 text-gray-800';
    
    if (displayType.toLowerCase().includes('deposit')) {
      bgColor = 'bg-green-100 text-green-800';
    } else if (displayType.toLowerCase().includes('withdrawal')) {
      bgColor = 'bg-red-100 text-red-800';
    } else if (displayType.toLowerCase().includes('transfer')) {
      bgColor = 'bg-blue-100 text-blue-800';
    } else if (displayType.toLowerCase().includes('buy')) {
      bgColor = 'bg-emerald-100 text-emerald-800';
    } else if (displayType.toLowerCase().includes('sell')) {
      bgColor = 'bg-orange-100 text-orange-800';
    } else if (displayType.toLowerCase().includes('bnsl')) {
      bgColor = 'bg-purple-100 text-purple-800';
    } else if (displayType.toLowerCase().includes('vault')) {
      bgColor = 'bg-yellow-100 text-yellow-800';
    } else if (displayType.toLowerCase().includes('bridge') || displayType.toLowerCase().includes('trade')) {
      bgColor = 'bg-indigo-100 text-indigo-800';
    }
    
    return <Badge className={`${bgColor} hover:${bgColor} border-none`}>{displayType}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Documents Management</h1>
            <p className="text-gray-500">Manage invoices and certificate deliveries</p>
          </div>
          <Button variant="outline" onClick={refetch} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Total Invoices</div>
              <div className="text-2xl font-bold">{invoiceStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Invoices Sent</div>
              <div className="text-2xl font-bold text-green-600">{invoiceStats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Certificates Delivered</div>
              <div className="text-2xl font-bold text-green-600">{deliveryStats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Transaction Receipts</div>
              <div className="text-2xl font-bold text-purple-600">{receiptStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Failed Deliveries</div>
              <div className="text-2xl font-bold text-red-600">{invoiceStats.failed + deliveryStats.failed}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices" data-testid="tab-invoices">
              <FileText className="w-4 h-4 mr-2" />
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates">
              <Mail className="w-4 h-4 mr-2" />
              Certificates ({deliveries.length})
            </TabsTrigger>
            <TabsTrigger value="receipts" data-testid="tab-receipts">
              <Receipt className="w-4 h-4 mr-2" />
              Transaction Receipts ({receipts.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-4 flex-wrap mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search..." 
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
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Generated">Generated</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Resent">Resent</SelectItem>
              </SelectContent>
            </Select>
            {activeTab === 'receipts' && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-type">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Buy">Buy Gold</SelectItem>
                  <SelectItem value="Sell">Sell Gold</SelectItem>
                  <SelectItem value="Deposit">Deposit</SelectItem>
                  <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                  <SelectItem value="bnsl">BNSL</SelectItem>
                  <SelectItem value="vault">Vault</SelectItem>
                  <SelectItem value="finabridge">Trade Finance</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading invoices...</div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No invoices found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Invoice #</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50" data-testid={`row-invoice-${invoice.id}`}>
                            <td className="py-3 px-4 font-mono text-sm">{invoice.invoiceNumber}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{invoice.customerName}</div>
                              <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">${parseFloat(invoice.totalUsd).toLocaleString()}</div>
                              <div className="text-sm text-gray-500">{parseFloat(invoice.goldGrams).toFixed(4)}g</div>
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(invoice.status)}</td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDownloadInvoice(invoice.id)}
                                  data-testid={`button-download-invoice-${invoice.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => resendInvoiceMutation.mutate(invoice.id)}
                                  disabled={resendInvoiceMutation.isPending}
                                  data-testid={`button-resend-invoice-${invoice.id}`}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Certificate Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                {deliveriesLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading deliveries...</div>
                ) : filteredDeliveries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No certificate deliveries found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Certificate #</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Recipient</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Gold</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Sent At</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDeliveries.map((delivery) => (
                          <tr key={delivery.id} className="border-b hover:bg-gray-50" data-testid={`row-delivery-${delivery.id}`}>
                            <td className="py-3 px-4 font-mono text-sm">{delivery.certificateNumber || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{delivery.userName || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{delivery.recipientEmail}</div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{delivery.certificateType || 'Unknown'}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              {delivery.goldGrams ? `${parseFloat(delivery.goldGrams).toFixed(4)}g` : 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(delivery.status)}
                              {delivery.failureReason && (
                                <div className="text-xs text-red-500 mt-1">{delivery.failureReason}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {delivery.sentAt ? format(new Date(delivery.sentAt), 'MMM dd, yyyy HH:mm') : 'Not sent'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDownloadCertificate(delivery.certificateId)}
                                  data-testid={`button-download-cert-${delivery.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => resendCertificateMutation.mutate(delivery.certificateId)}
                                  disabled={resendCertificateMutation.isPending}
                                  data-testid={`button-resend-cert-${delivery.id}`}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Transaction Receipts for Evidence
                </CardTitle>
                <p className="text-sm text-gray-500">Download transaction receipts as PDF for auditing and evidence purposes</p>
              </CardHeader>
              <CardContent>
                {receiptsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading transaction receipts...</div>
                ) : filteredReceipts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No transaction receipts found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Transaction ID</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">User</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReceipts.map((receipt) => (
                          <tr key={receipt.id} className="border-b hover:bg-gray-50" data-testid={`row-receipt-${receipt.id}`}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {getTypeIcon(receipt.type, receipt.sourceModule)}
                                <div>
                                  <div className="font-mono text-sm">{receipt.odooId || `TXN-${receipt.id}`}</div>
                                  {receipt.odooName && (
                                    <div className="text-xs text-gray-500">{receipt.odooName}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{receipt.userName || `User #${receipt.userId}`}</div>
                              <div className="text-sm text-gray-500">{receipt.userEmail || '-'}</div>
                            </td>
                            <td className="py-3 px-4">
                              {getTypeBadge(receipt.type, receipt.sourceModule)}
                            </td>
                            <td className="py-3 px-4">
                              {receipt.amountUsd && (
                                <div className="font-medium">${parseFloat(receipt.amountUsd).toLocaleString()}</div>
                              )}
                              {receipt.amountGold && (
                                <div className="text-sm text-gray-500">{parseFloat(receipt.amountGold).toFixed(4)}g gold</div>
                              )}
                              {receipt.goldPriceAtTransaction && (
                                <div className="text-xs text-gray-400">@ ${parseFloat(receipt.goldPriceAtTransaction).toFixed(2)}/g</div>
                              )}
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(receipt.status)}</td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {format(new Date(receipt.createdAt), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDownloadReceipt(receipt.id)}
                                  title="Download Receipt PDF"
                                  data-testid={`button-download-receipt-${receipt.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
