import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Package, ExternalLink, ShieldCheck, Clock, CheckCircle, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
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

const WINGOLD_SHOP_URL = 'https://wingoldandmetals--imcharanpratap.replit.app';
const IFRAME_TIMEOUT_MS = 15000;

export default function BuyGoldBars() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showShopModal, setShowShopModal] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeTimeout, setIframeTimeout] = useState(false);
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (showShopModal && iframeLoading && ssoUrl) {
      timeoutRef.current = setTimeout(() => {
        if (iframeLoading) {
          console.log('[Wingold Shop] Iframe load timeout - shop may be unavailable');
          setIframeTimeout(true);
          setIframeLoading(false);
        }
      }, IFRAME_TIMEOUT_MS);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showShopModal, iframeLoading, ssoUrl]);

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

  const handleOpenShop = async () => {
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

    try {
      console.log('[Wingold Shop] Fetching SSO URL...');
      const res = await fetch('/api/sso/wingold', { credentials: 'include' });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Wingold Shop] SSO Error:', res.status, errorText);
        throw new Error(`Failed to generate SSO token: ${res.status}`);
      }
      const data = await res.json();
      console.log('[Wingold Shop] SSO URL received:', data.redirectUrl?.substring(0, 100) + '...');
      setSsoUrl(data.redirectUrl);
      setIframeLoading(true);
      setShowShopModal(true);
    } catch (error: any) {
      console.error('[Wingold Shop] Connection error:', error);
      toast({
        title: 'Connection Error',
        description: error.message || 'Unable to connect to Wingold shop. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleCloseShop = () => {
    setShowShopModal(false);
    setSsoUrl(null);
    setIframeTimeout(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIframeLoading(true);
  };

  const handleRetry = () => {
    setIframeTimeout(false);
    setIframeLoading(true);
    handleOpenShop();
  };

  const handleOpenInNewTab = () => {
    if (ssoUrl) {
      window.open(ssoUrl, '_blank');
    }
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
                  Browse and purchase gold bars from our trusted partner, 
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
                  onClick={handleOpenShop}
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid="button-shop-wingold"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Gold Bar Shop
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

      <Dialog open={showShopModal} onOpenChange={handleCloseShop}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 py-3 border-b bg-amber-50 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="flex items-center gap-2 text-amber-900">
                <Package className="w-5 h-5" />
                Wingold & Metals Shop
              </DialogTitle>
              <DialogDescription className="text-amber-700 text-xs mt-1">
                Browse and purchase physical gold bars
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseShop}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 relative min-h-0">
            {iframeLoading && !iframeTimeout && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading Wingold Shop...</p>
                </div>
              </div>
            )}
            {iframeTimeout && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center max-w-md px-6">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Shop Loading Issue
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    The Wingold shop is taking longer than expected to load. 
                    This may be due to temporary connectivity issues.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleRetry}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleOpenInNewTab}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    If the issue persists, please contact support.
                  </p>
                </div>
              </div>
            )}
            {ssoUrl && !iframeTimeout && (
              <iframe
                src={ssoUrl}
                className="w-full h-full border-0"
                style={{ minHeight: 'calc(90vh - 60px)' }}
                onLoad={() => {
                  console.log('[Wingold Shop] Iframe loaded successfully');
                  setIframeLoading(false);
                  setIframeTimeout(false);
                  if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                  }
                }}
                onError={(e) => {
                  console.error('[Wingold Shop] Iframe load error:', e);
                  setIframeLoading(false);
                  setIframeTimeout(true);
                }}
                title="Wingold & Metals Shop"
                allow="payment"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
