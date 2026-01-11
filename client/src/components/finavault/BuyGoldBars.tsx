import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Package, MapPin, Scale, DollarSign, CheckCircle, Clock, AlertCircle, CreditCard, Building2, Bitcoin, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type BarSize = '1g' | '10g' | '100g' | '1kg';

const barSizeGrams: Record<BarSize, number> = {
  '1g': 1,
  '10g': 10,
  '100g': 100,
  '1kg': 1000
};

const barSizeLabels: Record<BarSize, string> = {
  '1g': '1 Gram Bar',
  '10g': '10 Gram Bar',
  '100g': '100 Gram Bar',
  '1kg': '1 Kilogram Bar'
};

interface VaultLocation {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
}

interface GoldBarOrder {
  id: string;
  referenceNumber: string;
  barSize: BarSize;
  barCount: number;
  totalGrams: string;
  usdAmount: string;
  status: string;
  createdAt: string;
  wingoldVaultLocationId: string;
}

export default function BuyGoldBars() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [barSize, setBarSize] = useState<BarSize>('10g');
  const [quantity, setQuantity] = useState(1);
  const [vaultLocation, setVaultLocation] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'crypto'>('bank');

  const { data: goldPriceData } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return { pricePerGram: 142 };
      return res.json();
    }
  });

  const { data: vaultData } = useQuery({
    queryKey: ['wingold-vault-locations'],
    queryFn: async () => {
      const res = await fetch('/api/wingold/vault-locations', { credentials: 'include' });
      if (!res.ok) return { locations: [] };
      return res.json();
    }
  });

  const { data: ordersData } = useQuery({
    queryKey: ['deposit-requests-goldbar', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/deposit-requests/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { requests: [] };
      const data = await res.json();
      return { 
        requests: (data.requests || []).filter((r: any) => r.goldBarPurchase?.isGoldBarPurchase) 
      };
    },
    enabled: !!user?.id
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/bank-accounts', { credentials: 'include' });
      if (!res.ok) return { accounts: [] };
      return res.json();
    }
  });

  const createGoldBarDepositMutation = useMutation({
    mutationFn: async (data: {
      paymentMethod: 'bank' | 'crypto';
      amountUsd: number;
      goldBarPurchase: {
        isGoldBarPurchase: boolean;
        barSize: BarSize;
        barCount: number;
        totalGrams: number;
        vaultLocationId: string;
        vaultLocationName: string;
        estimatedPricePerGram: number;
      };
    }) => {
      const endpoint = data.paymentMethod === 'bank' 
        ? '/api/deposit-requests' 
        : '/api/crypto-payments';
      
      const payload = data.paymentMethod === 'bank' 
        ? {
            userId: user?.id,
            amountUsd: data.amountUsd,
            currency: 'USD',
            paymentMethod: 'Bank Transfer',
            goldWalletType: 'LGPW',
            notes: `Gold Bar Purchase: ${data.goldBarPurchase.barCount}x ${data.goldBarPurchase.barSize} bar(s)`,
            goldBarPurchase: data.goldBarPurchase
          }
        : {
            userId: user?.id,
            amountUsd: data.amountUsd,
            goldGrams: data.goldBarPurchase.totalGrams,
            goldPriceAtTime: data.goldBarPurchase.estimatedPricePerGram,
            goldBarPurchase: data.goldBarPurchase
          };

      const res = await apiRequest('POST', endpoint, payload);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Payment Request Created',
        description: `Your gold bar purchase request has been submitted. Reference: ${data.referenceNumber || data.id}`,
      });
      queryClient.invalidateQueries({ queryKey: ['deposit-requests-goldbar'] });
      setShowPaymentModal(false);
      setQuantity(1);
    },
    onError: (error: Error) => {
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to create payment request. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const goldPricePerGram = goldPriceData?.pricePerGram || 142;
  const vaultLocations: VaultLocation[] = vaultData?.locations || [];
  const orders: any[] = ordersData?.requests || [];
  const bankAccounts = bankAccountsData?.accounts || [];

  const totalGrams = barSizeGrams[barSize] * quantity;
  const totalPrice = totalGrams * goldPricePerGram;

  const selectedVault = vaultLocations.find(v => v.id === vaultLocation);

  const handleProceedToPayment = () => {
    if (!vaultLocation) {
      toast({
        title: 'Select Vault',
        description: 'Please select a vault location for storage.',
        variant: 'destructive'
      });
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedVault) return;

    createGoldBarDepositMutation.mutate({
      paymentMethod,
      amountUsd: totalPrice,
      goldBarPurchase: {
        isGoldBarPurchase: true,
        barSize,
        barCount: quantity,
        totalGrams,
        vaultLocationId: vaultLocation,
        vaultLocationName: selectedVault.name,
        estimatedPricePerGram: goldPricePerGram
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning-muted text-warning-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Awaiting Payment</Badge>;
      case 'confirmed':
      case 'approved':
        return <Badge variant="outline" className="bg-success-muted text-success-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'under review':
        return <Badge variant="outline" className="bg-info-muted text-info-muted-foreground"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Under Review</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge variant="outline" className="bg-error-muted text-error-muted-foreground"><AlertCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
            Purchase certified gold bars stored in secure vaults. Your wallet is only credited after physical gold is allocated (Golden Rule).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Bar Size
            </Label>
            <Select value={barSize} onValueChange={(val) => setBarSize(val as BarSize)}>
              <SelectTrigger data-testid="select-bar-size">
                <SelectValue placeholder="Select bar size" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(barSizeLabels) as BarSize[]).map((size) => (
                  <SelectItem key={size} value={size} data-testid={`option-bar-size-${size}`}>
                    {barSizeLabels[size]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                data-testid="button-decrease-quantity"
              >
                -
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
                min={1}
                data-testid="input-quantity"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                data-testid="button-increase-quantity"
              >
                +
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Vault Location (SecureVault Only)
            </Label>
            <Select value={vaultLocation} onValueChange={setVaultLocation}>
              <SelectTrigger data-testid="select-vault-location">
                <SelectValue placeholder="Select SecureVault location" />
              </SelectTrigger>
              <SelectContent>
                {vaultLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} data-testid={`option-vault-${loc.code}`}>
                    {loc.name} - {loc.city}, {loc.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gold Price:</span>
                <span>${goldPricePerGram.toFixed(2)}/gram</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bar Size:</span>
                <span>{barSizeLabels[barSize]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity:</span>
                <span>{quantity} bar(s)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Weight:</span>
                <span className="text-amber-600 font-medium">{totalGrams.toLocaleString()}g</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Price:</span>
                <span className="text-primary">${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                * Price is estimated. Final allocation happens after payment is verified and physical gold is secured.
              </p>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={handleProceedToPayment}
            disabled={!vaultLocation}
            data-testid="button-proceed-to-payment"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Proceed to Payment
          </Button>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Golden Rule:</strong> Your LGPW wallet will only be credited after physical gold is allocated and a storage certificate is issued. This ensures your digital gold is always 100% backed by physical gold.
            </p>
          </div>
        </CardContent>
      </Card>

      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Gold Bar Purchase Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  data-testid={`order-${order.id}`}
                >
                  <div className="space-y-1">
                    <div className="font-medium">{order.referenceNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.goldBarPurchase?.barCount}x {barSizeLabels[order.goldBarPurchase?.barSize as BarSize] || 'Gold Bar'} • {order.goldBarPurchase?.totalGrams?.toLocaleString()}g
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {getStatusBadge(order.status)}
                    <div className="text-sm font-medium">
                      ${parseFloat(order.amountUsd).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Gold Bar Purchase</DialogTitle>
            <DialogDescription>
              Select your preferred payment method and complete the transfer to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Purchase:</span>
                <span className="font-medium">{quantity}x {barSizeLabels[barSize]}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Gold:</span>
                <span className="font-medium text-amber-600">{totalGrams.toLocaleString()}g</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Vault:</span>
                <span className="font-medium">{selectedVault?.name}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between">
                <span className="font-medium">Amount to Pay:</span>
                <span className="text-lg font-bold text-primary">${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'bank' | 'crypto')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bank" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Bank Transfer
                </TabsTrigger>
                <TabsTrigger value="crypto" className="flex items-center gap-2">
                  <Bitcoin className="w-4 h-4" />
                  Crypto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank" className="space-y-4 mt-4">
                {bankAccounts.length > 0 ? (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm mb-2 font-medium">Transfer to our bank account:</p>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p><strong>Bank:</strong> {bankAccounts[0]?.bankName}</p>
                      <p><strong>Account:</strong> {bankAccounts[0]?.accountNumber}</p>
                      <p><strong>IBAN:</strong> {bankAccounts[0]?.iban}</p>
                    </div>
                    <p className="text-xs mt-2 text-blue-700 dark:text-blue-300">
                      After transferring, click "Submit Request" and upload your payment proof.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Bank accounts will be provided after request submission.</p>
                )}
              </TabsContent>

              <TabsContent value="crypto" className="space-y-4 mt-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm mb-2 font-medium">Pay with cryptocurrency:</p>
                  <p className="text-xs text-muted-foreground">
                    You'll be shown our wallet address after submitting the request. Send the equivalent amount in USDT, USDC, or BTC.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirmPayment}
              disabled={createGoldBarDepositMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {createGoldBarDepositMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Payment Request
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Once you complete the transfer and upload proof, our team will verify and allocate your gold bars.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
