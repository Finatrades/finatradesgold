import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Package, ExternalLink, ShieldCheck, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WingoldOrder {
  id: string;
  referenceNumber: string;
  barSize: string;
  barCount: number;
  totalGrams: string;
  usdAmount: string;
  status: string;
  createdAt: string;
}

export default function BuyGoldBars() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['wingold-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return { orders: [] };
      const res = await fetch(`/api/wingold/orders/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { orders: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const orders: WingoldOrder[] = ordersData?.orders || [];

  const handleShopRedirect = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to purchase gold bars.',
        variant: 'destructive'
      });
      return;
    }

    if (user.kycStatus !== 'Approved') {
      toast({
        title: 'KYC Required',
        description: 'Please complete KYC verification before purchasing gold bars.',
        variant: 'destructive'
      });
      return;
    }

    window.location.href = '/api/sso/wingold/shop';
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Loader2 className="w-3 h-3 mr-1" /> Confirmed</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Fulfilled</Badge>;
      case 'cancelled':
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            Buy Physical Gold Bars
          </CardTitle>
          <CardDescription>
            Purchase certified gold bars stored securely in our partner vaults
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <ShieldCheck className="w-8 h-8 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-amber-900 mb-2">
                  Shop on Wingold & Metals
                </h3>
                <p className="text-amber-800 mb-4">
                  Click below to browse and purchase gold bars from our trusted partner, 
                  Wingold & Metals. Your purchase will be securely stored in a SecureVault 
                  location and automatically credited to your FinaVault account.
                </p>
                <ul className="text-sm text-amber-700 space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    SecureVault storage only (no home delivery)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Physical storage certificate issued by Wingold
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Digital ownership certificate from Finatrades
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Auto-credit to your LGPW wallet upon fulfillment
                  </li>
                </ul>
                <Button 
                  onClick={handleShopRedirect}
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid="button-shop-wingold"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Shop Gold Bars on Wingold
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Gold Bar Orders
          </CardTitle>
          <CardDescription>
            Track your physical gold bar purchases from Wingold
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No gold bar orders yet</p>
              <p className="text-sm">Your purchases from Wingold will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`order-card-${order.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{order.referenceNumber}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.barCount}x {order.barSize} bars • {parseFloat(order.totalGrams).toFixed(2)}g total
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${parseFloat(order.usdAmount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">USD Value</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
