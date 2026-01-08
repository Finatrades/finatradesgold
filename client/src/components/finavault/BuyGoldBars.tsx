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
import { Loader2, Package, MapPin, Scale, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  // Fetch gold price
  const { data: goldPriceData } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return { pricePerGram: 142 };
      return res.json();
    }
  });

  // Fetch vault locations
  const { data: vaultData } = useQuery({
    queryKey: ['wingold-vault-locations'],
    queryFn: async () => {
      const res = await fetch('/api/wingold/vault-locations', { credentials: 'include' });
      if (!res.ok) return { locations: [] };
      return res.json();
    }
  });

  // Fetch user's pending orders
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

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: { barSize: BarSize; barCount: number; vaultLocationId: string }) => {
      const res = await apiRequest('POST', '/api/wingold/orders', orderData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Order Placed',
        description: `Your order ${data.referenceNumber} has been submitted for approval.`,
      });
      queryClient.invalidateQueries({ queryKey: ['wingold-orders'] });
      setQuantity(1);
    },
    onError: (error: Error) => {
      toast({
        title: 'Order Failed',
        description: error.message || 'Failed to place order. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const goldPricePerGram = goldPriceData?.pricePerGram || 142;
  const vaultLocations: VaultLocation[] = vaultData?.locations || [];
  const orders: GoldBarOrder[] = ordersData?.orders || [];

  const totalGrams = barSizeGrams[barSize] * quantity;
  const totalPrice = totalGrams * goldPricePerGram;

  const handlePlaceOrder = () => {
    if (!vaultLocation) {
      toast({
        title: 'Select Vault',
        description: 'Please select a vault location for storage.',
        variant: 'destructive'
      });
      return;
    }

    placeOrderMutation.mutate({
      barSize,
      barCount: quantity,
      vaultLocationId: vaultLocation
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning-muted text-warning-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Awaiting Approval</Badge>;
      case 'submitted':
      case 'confirmed':
      case 'processing':
        return <Badge variant="outline" className="bg-info-muted text-info-muted-foreground"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="bg-success-muted text-success-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'cancelled':
      case 'failed':
        return <Badge variant="outline" className="bg-error-muted text-error-muted-foreground"><AlertCircle className="w-3 h-3 mr-1" /> {status === 'cancelled' ? 'Cancelled' : 'Failed'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            Buy Physical Gold Bars
          </CardTitle>
          <CardDescription>
            Purchase certified gold bars stored in secure vaults worldwide
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bar Size Selection */}
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

          {/* Quantity */}
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

          {/* Vault Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Vault Location
            </Label>
            <Select value={vaultLocation} onValueChange={setVaultLocation}>
              <SelectTrigger data-testid="select-vault-location">
                <SelectValue placeholder="Select vault location" />
              </SelectTrigger>
              <SelectContent>
                {vaultLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} data-testid={`option-vault-${loc.code}`}>
                    {loc.city}, {loc.country} ({loc.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Summary */}
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
                * Price is estimated. Final price will be confirmed upon approval.
              </p>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePlaceOrder}
            disabled={placeOrderMutation.isPending || !vaultLocation}
            data-testid="button-place-order"
          >
            {placeOrderMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Place Order
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Orders require admin approval before processing. You will be notified once approved.
          </p>
        </CardContent>
      </Card>

      {/* Order History */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Gold Bar Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  data-testid={`order-${order.id}`}
                >
                  <div className="space-y-1">
                    <div className="font-medium">{order.referenceNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.barCount}x {barSizeLabels[order.barSize]} • {parseFloat(order.totalGrams).toLocaleString()}g
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {getStatusBadge(order.status)}
                    <div className="text-sm font-medium">
                      ${parseFloat(order.usdAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
