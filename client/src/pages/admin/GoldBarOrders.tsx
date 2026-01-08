import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Clock, Package, AlertCircle, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface GoldBarOrder {
  id: string;
  referenceNumber: string;
  userId: string;
  barSize: string;
  barCount: number;
  totalGrams: string;
  usdAmount: string;
  goldPriceUsdPerGram: string;
  status: string;
  wingoldVaultLocationId: string;
  createdAt: string;
  submittedAt: string | null;
  fulfilledAt: string | null;
  errorMessage: string | null;
}

const barSizeLabels: Record<string, string> = {
  '1g': '1 Gram',
  '10g': '10 Gram',
  '100g': '100 Gram',
  '1kg': '1 Kilogram'
};

export default function GoldBarOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['wingold-pending-orders'],
    queryFn: async () => {
      const res = await fetch('/api/wingold/admin/pending-orders', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch pending orders');
      return res.json();
    }
  });

  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['wingold-all-orders'],
    queryFn: async () => {
      const res = await fetch('/api/wingold/admin/all-orders', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch all orders');
      return res.json();
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest('POST', `/api/wingold/orders/${orderId}/approve`, {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Approval failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Order Approved',
        description: 'Order has been sent to Wingold for processing.',
      });
      queryClient.invalidateQueries({ queryKey: ['wingold-pending-orders'] });
      queryClient.invalidateQueries({ queryKey: ['wingold-all-orders'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const res = await apiRequest('POST', `/api/wingold/orders/${orderId}/reject`, { reason });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Rejection failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Order Rejected',
        description: 'The order has been rejected.',
      });
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedOrderId(null);
      queryClient.invalidateQueries({ queryKey: ['wingold-pending-orders'] });
      queryClient.invalidateQueries({ queryKey: ['wingold-all-orders'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Rejection Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleReject = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (selectedOrderId) {
      rejectMutation.mutate({ orderId: selectedOrderId, reason: rejectReason });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning-muted text-warning-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Pending Approval</Badge>;
      case 'submitted':
        return <Badge variant="outline" className="bg-info-muted text-info-muted-foreground"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Submitted</Badge>;
      case 'confirmed':
      case 'processing':
        return <Badge variant="outline" className="bg-info-muted text-info-muted-foreground"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="bg-success-muted text-success-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" /> Fulfilled</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-error-muted text-error-muted-foreground"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-error-muted text-error-muted-foreground"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filterOrders = (orders: GoldBarOrder[]) => {
    if (!searchQuery) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(order => 
      order.referenceNumber.toLowerCase().includes(query) ||
      order.userId.toLowerCase().includes(query)
    );
  };

  const pendingOrders = filterOrders(pendingData?.orders || []);
  const allOrders = filterOrders(allData?.orders || []);

  const renderOrderCard = (order: GoldBarOrder, showActions: boolean = false) => (
    <Card key={order.id} className="mb-4" data-testid={`order-card-${order.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-lg">{order.referenceNumber}</span>
              {getStatusBadge(order.status)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Bar Size:</span>
                <p className="font-medium">{barSizeLabels[order.barSize] || order.barSize}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Quantity:</span>
                <p className="font-medium">{order.barCount} bar(s)</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Gold:</span>
                <p className="font-medium text-amber-600">{parseFloat(order.totalGrams).toLocaleString()}g</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <p className="font-medium">${parseFloat(order.usdAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Created: {new Date(order.createdAt).toLocaleString()}
              {order.errorMessage && (
                <span className="text-destructive ml-2">Error: {order.errorMessage}</span>
              )}
            </div>
          </div>
          
          {showActions && order.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => approveMutation.mutate(order.id)}
                disabled={approveMutation.isPending}
                data-testid={`approve-btn-${order.id}`}
              >
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleReject(order.id)}
                disabled={rejectMutation.isPending}
                data-testid={`reject-btn-${order.id}`}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Gold Bar Orders
          </h1>
          <p className="text-muted-foreground">Manage customer gold bar purchase orders</p>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference number or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-orders"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="relative">
              Pending Approval
              {pendingOrders.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pendingOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending orders to approve</p>
                </CardContent>
              </Card>
            ) : (
              pendingOrders.map(order => renderOrderCard(order, true))
            )}
          </TabsContent>

          <TabsContent value="all">
            {allLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : allOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders found</p>
                </CardContent>
              </Card>
            ) : (
              allOrders.map(order => renderOrderCard(order, order.status === 'pending'))
            )}
          </TabsContent>
        </Tabs>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Order</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this order. The customer will be notified.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Rejection reason (optional)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              data-testid="reject-reason"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Reject Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
