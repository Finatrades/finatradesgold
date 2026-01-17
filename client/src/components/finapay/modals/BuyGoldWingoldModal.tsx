import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2, ShoppingCart, Search, SlidersHorizontal, X, MapPin, Clock, FileText, ChevronDown, Package, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BuyGoldWingoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VaultLocation {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
}

interface GoldPriceData {
  pricePerGram: number;
  pricePerOunce: number;
}

interface CartItem {
  productId: string;
  barSize: string;
  grams: number;
  label: string;
  quantity: number;
  priceAed: number;
  priceUsd: number;
  fulfillmentHours: number;
}

interface WingoldProduct {
  productId: string;
  name: string;
  weight: string;
  weightGrams: string;
  purity: string;
  livePrice: string;
  livePriceAed: string;
  stock: number;
  inStock: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  galleryUrls?: string[];
  certificationImageUrl?: string;
  description?: string;
  category?: string;
}

interface ProductsResponse {
  timestamp: string;
  spotPrice: number;
  pricePerGram: string;
  currency: string;
  totalProducts: number;
  products: WingoldProduct[];
}

const USD_TO_AED = 3.67;

const GOLD_BAR_IMAGES: Record<string, string> = {
  '1g': '/images/gold-bars/1g_gold_bar_product_photo.png',
  '10g': '/images/gold-bars/10g_gold_bar_product_photo.png',
  '100g': '/images/gold-bars/100g_gold_bar_product_photo.png',
  '1kg': '/images/gold-bars/1kg_gold_bar_product_photo.png',
};

function getProductImage(product: WingoldProduct): string | null {
  if (product.thumbnailUrl || product.imageUrl) {
    return product.thumbnailUrl || product.imageUrl || null;
  }
  const weight = product.weight?.toLowerCase().replace(/\s+/g, '');
  if (weight && GOLD_BAR_IMAGES[weight]) {
    return GOLD_BAR_IMAGES[weight];
  }
  const grams = parseFloat(product.weightGrams);
  if (grams === 1) return GOLD_BAR_IMAGES['1g'];
  if (grams === 10) return GOLD_BAR_IMAGES['10g'];
  if (grams === 100) return GOLD_BAR_IMAGES['100g'];
  if (grams === 1000) return GOLD_BAR_IMAGES['1kg'];
  return null;
}

const COMPLIANCE_NOTICE = `Finatrades Finance SA operates in partnership with Wingold & Metals DMCC for use of the Finatrades digital platform to facilitate the sale, purchase, allocation, and other structured buy-and-sell plans related to physical gold.`;

export default function BuyGoldWingoldModal({ isOpen, onClose, onSuccess }: BuyGoldWingoldModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'shop' | 'cart' | 'checkout' | 'payment' | 'submitted'>('shop');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string; referenceNumber: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState<{ title: string; terms: string; enabled: boolean } | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'weight'>('price-low');
  const [weightFilters, setWeightFilters] = useState<string[]>([]);
  const [showInStockOnly, setShowInStockOnly] = useState(true);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: goldPriceData } = useQuery<GoldPriceData>({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: vaultLocationsData } = useQuery<{ locations: VaultLocation[] }>({
    queryKey: ['wingold-vault-locations'],
    queryFn: async () => {
      const res = await fetch('/api/wingold/vault-locations');
      if (!res.ok) return { locations: [] };
      return res.json();
    },
  });

  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useQuery<ProductsResponse>({
    queryKey: ['wingold-products'],
    queryFn: async () => {
      const res = await fetch('/api/wingold/products?inStock=true&category=bars');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isOpen) {
      setStep('shop');
      setCart([]);
      setSelectedVaultId('');
      setOrderResult(null);
      setTermsAccepted(false);
      setSearchQuery('');
      setSortBy('price-low');
      setWeightFilters([]);
      setShowInStockOnly(true);
      setShowFeaturedOnly(false);
      setCheckoutUrl(null);
      setPaymentLoading(false);
      
      fetch('/api/terms/buy_gold')
        .then(res => res.json())
        .then(data => setTermsContent(data))
        .catch(() => setTermsContent(null));
    }
  }, [isOpen]);

  const [expectedNonce, setExpectedNonce] = useState<string | null>(null);
  const [expectedOrderId, setExpectedOrderId] = useState<string | null>(null);
  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch allowed origins from server (configurable via env)
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([
    'https://wingoldandmetals--imcharanpratap.replit.app',
    'https://wingoldandmetals.replit.app', 
    'https://wingoldandmetals.com',
    'https://www.wingoldandmetals.com',
  ]);

  useEffect(() => {
    // Fetch server-configured allowed origins
    fetch('/api/sso/wingold/allowed-origins')
      .then(res => res.json())
      .then(data => {
        if (data.origins && Array.isArray(data.origins)) {
          setAllowedOrigins(data.origins);
        }
      })
      .catch(err => console.warn('[BuyGold] Failed to fetch allowed origins:', err));
  }, []);

  // Dynamically add the checkoutUrl origin to allowed list when checkout starts
  useEffect(() => {
    if (checkoutUrl) {
      try {
        const url = new URL(checkoutUrl);
        if (!allowedOrigins.includes(url.origin)) {
          setAllowedOrigins(prev => [...prev, url.origin]);
        }
      } catch (e) {
        console.warn('[BuyGold] Failed to parse checkout URL origin');
      }
    }
  }, [checkoutUrl, allowedOrigins]);

  useEffect(() => {
    // Use server-provided allowlist for strict origin validation
    const isAllowedOrigin = (origin: string) => {
      return allowedOrigins.includes(origin);
    };

    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedOrigin(event.origin)) {
        console.warn('[BuyGold] Rejected message from unknown origin:', event.origin);
        return;
      }
      
      const { type, data } = event.data || {};
      
      if (!type || typeof type !== 'string') return;

      if (!expectedNonce || !data?.nonce || data.nonce !== expectedNonce) {
        console.warn('[BuyGold] Missing or mismatched nonce, ignoring message');
        return;
      }

      if (!expectedOrderId || !data?.orderId || data.orderId !== expectedOrderId) {
        console.warn('[BuyGold] Missing or mismatched orderId, ignoring message');
        return;
      }
      
      if (type === 'WINGOLD_PAYMENT_SUCCESS') {
        if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
        setOrderResult({ 
          orderId: data.orderId, 
          referenceNumber: data.referenceNumber || 'WG-' + Date.now() 
        });
        setStep('submitted');
        toast({
          title: 'Payment Successful',
          description: 'Your gold bar order has been placed successfully.',
        });
      } else if (type === 'WINGOLD_PAYMENT_CANCELLED') {
        if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
        setStep('checkout');
        setCheckoutUrl(null);
        setExpectedNonce(null);
        setExpectedOrderId(null);
        toast({
          title: 'Payment Cancelled',
          description: 'You can try again when ready.',
        });
      } else if (type === 'WINGOLD_PAYMENT_ERROR') {
        if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
        setStep('checkout');
        setCheckoutUrl(null);
        setExpectedNonce(null);
        setExpectedOrderId(null);
        toast({
          title: 'Payment Failed',
          description: data?.message || 'An error occurred during payment.',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast, expectedNonce, expectedOrderId, allowedOrigins]);

  useEffect(() => {
    if (vaultLocationsData?.locations?.length && !selectedVaultId) {
      setSelectedVaultId(vaultLocationsData.locations[0].id);
    }
  }, [vaultLocationsData, selectedVaultId]);

  const goldPriceUsd = goldPriceData?.pricePerGram || 143;
  const goldPriceAed = goldPriceUsd * USD_TO_AED;
  
  const products = productsData?.products || [];
  
  const getFulfillmentHours = (weight: string): number => {
    if (weight === '1g' || weight === '10g') return 2;
    if (weight === '100g') return 12;
    if (weight === '1kg') return 24;
    return 24;
  };

  const filteredProducts = products.filter((product: WingoldProduct) => {
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (weightFilters.length > 0 && !weightFilters.includes(product.weight)) {
      return false;
    }
    if (showInStockOnly && !product.inStock) {
      return false;
    }
    return true;
  }).sort((a: WingoldProduct, b: WingoldProduct) => {
    const aGrams = parseFloat(a.weightGrams);
    const bGrams = parseFloat(b.weightGrams);
    switch (sortBy) {
      case 'price-low':
        return aGrams - bGrams;
      case 'price-high':
        return bGrams - aGrams;
      case 'weight':
        return aGrams - bGrams;
      default:
        return 0;
    }
  });

  const addToCart = (product: WingoldProduct) => {
    const grams = parseFloat(product.weightGrams);
    const existingIndex = cart.findIndex(item => item.productId === product.productId);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        productId: product.productId,
        barSize: product.weight,
        grams,
        label: product.name,
        quantity: 1,
        priceAed: grams * goldPriceAed,
        priceUsd: grams * goldPriceUsd,
        fulfillmentHours: getFulfillmentHours(product.weight),
      }]);
    }
    toast({
      title: 'Added to Cart',
      description: `${product.name} added to your cart`,
    });
  };

  const updateCartQuantity = (barSize: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.barSize === barSize) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setCart(newCart);
  };

  const removeFromCart = (barSize: string) => {
    setCart(cart.filter(item => item.barSize !== barSize));
  };

  const cartTotalGrams = cart.reduce((sum, item) => sum + (item.grams * item.quantity), 0);
  const cartTotalAed = cart.reduce((sum, item) => sum + (item.priceAed * item.quantity), 0);
  const cartTotalUsd = cart.reduce((sum, item) => sum + (item.priceUsd * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleProceedToPayment = async () => {
    if (!user || cart.length === 0) return;

    setPaymentLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/sso/wingold/checkout', {
        cartItems: cart.map(item => ({
          barSize: item.barSize,
          quantity: item.quantity,
        })),
        vaultLocationId: selectedVaultId || undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate payment');
      }

      const result = await response.json();
      
      // Store order info in session storage for tracking
      sessionStorage.setItem('wingold_order', JSON.stringify({
        orderId: result.orderId,
        nonce: result.nonce,
        totalGrams: result.serverCalculatedTotal.grams,
        totalUsd: result.serverCalculatedTotal.usd,
      }));

      // Redirect to Wingold checkout (full page redirect, not iframe)
      window.location.href = result.checkoutUrl;
      
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
      setPaymentLoading(false);
    }
  };

  const handleClose = () => {
    if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
    setExpectedNonce(null);
    setExpectedOrderId(null);
    if (step === 'submitted') {
      onSuccess();
    }
    onClose();
  };

  const isKycApproved = user?.kycStatus === 'Approved';
  const vaultLocations = vaultLocationsData?.locations || [];

  const toggleWeightFilter = (weight: string) => {
    if (weightFilters.includes(weight)) {
      setWeightFilters(weightFilters.filter(w => w !== weight));
    } else {
      setWeightFilters([...weightFilters, weight]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] p-0 overflow-hidden bg-[#0a0a0a]" data-testid="modal-buy-gold-wingold">
        {!isKycApproved ? (
          <div className="py-16 px-8 text-center space-y-6 bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a]">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full flex items-center justify-center border border-amber-500/30">
              <ShieldCheck className="w-10 h-10 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">KYC Verification Required</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Your identity verification must be approved before you can purchase gold bars. 
                This helps us ensure secure transactions for all users.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 max-w-sm mx-auto">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-full">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-amber-300">Status: {user?.kycStatus || 'Not Started'}</p>
                  <p className="text-xs text-gray-400">
                    {user?.kycStatus === 'In Progress' ? 'Under review - usually takes 1-2 business days' : 'Complete your verification to continue'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                data-testid="button-close-kyc-required"
              >
                Close
              </Button>
              {user?.kycStatus !== 'In Progress' && (
                <Button 
                  onClick={() => { handleClose(); window.location.href = '/kyc'; }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-medium"
                  data-testid="button-complete-kyc"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Complete KYC
                </Button>
              )}
            </div>
          </div>
        ) : step === 'submitted' && orderResult ? (
          <div className="py-12 px-6 text-center space-y-4 bg-[#0a0a0a] text-white">
            <div className="mx-auto w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold">Payment Successful!</h3>
            <p className="text-gray-400">
              Your gold bar purchase has been completed via Wingold.
            </p>
            <div className="bg-[#1a1a1a] rounded-lg p-4 text-left space-y-2 max-w-md mx-auto">
              <p className="text-sm">
                <span className="text-gray-500">Reference:</span>{' '}
                <span className="font-mono font-medium text-amber-400">{orderResult.referenceNumber}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Items:</span>{' '}
                <span className="font-medium">{cartItemCount} bar{cartItemCount > 1 ? 's' : ''}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Total Gold:</span>{' '}
                <span className="font-medium text-amber-400">{cartTotalGrams.toLocaleString()}g</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Total Value:</span>{' '}
                <span className="font-medium">AED {cartTotalAed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Your gold bars will be allocated to your secure vault storage.
            </p>
            <Button onClick={handleClose} className="mt-4 bg-amber-500 hover:bg-amber-600 text-black" data-testid="button-close-success">
              Close
            </Button>
          </div>
        ) : step === 'checkout' ? (
          <div className="bg-[#0a0a0a] text-white">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Checkout</h2>
                <Button variant="ghost" size="icon" onClick={() => setStep('cart')} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-[60vh] p-6">
              <div className="space-y-6">
                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <h3 className="font-medium mb-3">Order Summary</h3>
                  {cart.map((item) => (
                    <div key={item.barSize} className="flex justify-between py-2 border-b border-gray-800 last:border-0">
                      <span className="text-gray-400">{item.quantity}x {item.label}</span>
                      <span className="text-amber-400">AED {(item.priceAed * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 font-semibold">
                    <span>Total ({cartTotalGrams.toLocaleString()}g)</span>
                    <span className="text-amber-400">AED {cartTotalAed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {vaultLocations.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      Select Storage Location
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {vaultLocations.map((vault) => (
                        <button
                          key={vault.id}
                          onClick={() => setSelectedVaultId(vault.id)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedVaultId === vault.id 
                              ? 'border-amber-500 bg-amber-500/10' 
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                          data-testid={`vault-option-${vault.code}`}
                        >
                          <span className="font-medium text-sm block">{vault.name}</span>
                          <span className="text-xs text-gray-500">{vault.city}, {vault.country}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Alert className="bg-amber-950/30 border-amber-800">
                  <AlertDescription className="text-xs text-amber-200">
                    {COMPLIANCE_NOTICE}
                  </AlertDescription>
                </Alert>

                {termsContent?.enabled && (
                  <div className="border border-gray-700 rounded-lg p-4 bg-[#1a1a1a]">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        id="buy-gold-terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                        className="mt-0.5 border-gray-600"
                        data-testid="checkbox-terms"
                      />
                      <div className="flex-1">
                        <label htmlFor="buy-gold-terms" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-400" />
                          I accept the Terms & Conditions
                        </label>
                        <details className="mt-2">
                          <summary className="text-xs text-amber-400 cursor-pointer hover:underline">View Terms</summary>
                          <div className="mt-2 text-xs text-gray-400 whitespace-pre-line bg-[#0a0a0a] p-2 rounded border border-gray-800 max-h-32 overflow-y-auto">
                            {termsContent.terms}
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <Button variant="outline" onClick={() => setStep('cart')} className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                Back to Cart
              </Button>
              <Button
                onClick={handleProceedToPayment}
                disabled={paymentLoading || (termsContent?.enabled && !termsAccepted)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                data-testid="button-proceed-payment"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting to Wingold...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </Button>
            </div>
          </div>
        ) : step === 'payment' ? (
          <div className="bg-[#0a0a0a] text-white h-[40vh] flex flex-col items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-amber-400 mx-auto" />
              <h3 className="text-lg font-semibold">Redirecting to Wingold...</h3>
              <p className="text-gray-500 text-sm">You will be redirected to complete your payment securely.</p>
              <p className="text-xs text-gray-600">If you are not redirected automatically, please wait a moment.</p>
            </div>
          </div>
        ) : step === 'cart' ? (
          <div className="bg-[#0a0a0a] text-white">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-400" />
                  Your Cart ({cartItemCount})
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setStep('shop')} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-[50vh] p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Your cart is empty</p>
                  <Button variant="outline" onClick={() => setStep('shop')} className="mt-4 border-gray-700">
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.barSize} className="flex items-center gap-4 bg-[#1a1a1a] rounded-lg p-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center">
                        <Package className="w-8 h-8 text-amber-900" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.label}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="bg-gray-800 text-gray-300">{item.grams}g</Badge>
                          <Badge variant="secondary" className="bg-gray-800 text-gray-300">999.9</Badge>
                        </div>
                        <p className="text-amber-400 font-semibold mt-2">
                          AED {item.priceAed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 border-gray-700"
                          onClick={() => updateCartQuantity(item.barSize, -1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 border-gray-700"
                          onClick={() => updateCartQuantity(item.barSize, 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-500 hover:text-red-400"
                        onClick={() => removeFromCart(item.barSize)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-800">
                <div className="flex justify-between mb-4">
                  <span className="text-gray-400">Total ({cartTotalGrams.toLocaleString()}g gold)</span>
                  <span className="text-xl font-bold text-amber-400">
                    AED {cartTotalAed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('shop')} className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                    Continue Shopping
                  </Button>
                  <Button onClick={() => setStep('checkout')} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[80vh] bg-[#0a0a0a] text-white">
            {/* Sidebar Filters */}
            <div className={`w-64 border-r border-gray-800 p-4 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </h3>
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-sm text-gray-400 mb-2 block">Price Range</Label>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>AED 0.00</span>
                    <span>AED 7,345,000.00</span>
                  </div>
                  <div className="h-1 bg-amber-500 rounded-full mt-2" />
                </div>

                <div>
                  <Label className="text-sm text-gray-400 mb-3 block">Weight</Label>
                  <div className="space-y-2">
                    {['1kg', '1g', '10g', '100g'].map((weight) => (
                      <div key={weight} className="flex items-center gap-2">
                        <Checkbox 
                          id={`weight-${weight}`}
                          checked={weightFilters.includes(weight === '1kg' ? '1kg' : weight)}
                          onCheckedChange={() => toggleWeightFilter(weight === '1kg' ? '1kg' : weight)}
                          className="border-gray-600"
                        />
                        <label htmlFor={`weight-${weight}`} className="text-sm cursor-pointer">{weight}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-400 mb-3 block">Availability</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        id="in-stock" 
                        name="availability"
                        checked={showInStockOnly}
                        onChange={() => { setShowInStockOnly(true); setShowFeaturedOnly(false); }}
                        className="accent-amber-500"
                      />
                      <label htmlFor="in-stock" className="text-sm cursor-pointer">In Stock</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        id="featured" 
                        name="availability"
                        checked={showFeaturedOnly}
                        onChange={() => { setShowFeaturedOnly(true); setShowInStockOnly(false); }}
                        className="accent-amber-500"
                      />
                      <label htmlFor="featured" className="text-sm cursor-pointer">Featured Only</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-800 flex items-center gap-4">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowFilters(true)}>
                  <SlidersHorizontal className="w-5 h-5" />
                </Button>
                
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input 
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500"
                    data-testid="input-search"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="w-40 bg-[#1a1a1a] border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-gray-700">
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="weight">Weight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  className="relative border-gray-700 hover:bg-gray-800"
                  onClick={() => cart.length > 0 ? setStep('cart') : null}
                  data-testid="button-view-cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full text-xs flex items-center justify-center text-black font-bold">
                      {cartItemCount}
                    </span>
                  )}
                </Button>
              </div>

              {/* Product Grid */}
              <ScrollArea className="flex-1 p-4">
                {productsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                    <span className="ml-2 text-gray-400">Loading products from Wingold...</span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Package className="w-12 h-12 mb-4 opacity-50" />
                    <p>No products found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product: WingoldProduct) => {
                      const grams = parseFloat(product.weightGrams);
                      const productImage = getProductImage(product);
                      return (
                        <Card key={product.productId} className="bg-[#1a1a1a] border-gray-800 overflow-hidden group" data-testid={`product-card-${product.weight}`}>
                          <div className="aspect-square relative bg-gradient-to-br from-gray-900 to-gray-800 p-4">
                            <div className="absolute inset-0 flex items-center justify-center">
                              {productImage ? (
                                <img 
                                  src={productImage} 
                                  alt={product.name}
                                  className="max-w-full max-h-full object-contain p-2 group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`flex flex-col items-center justify-center text-center p-4 ${productImage ? 'hidden' : ''}`}>
                                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                                  <span className="text-3xl font-bold text-amber-400">Au</span>
                                </div>
                                <div className="text-amber-400 font-bold text-lg">{product.weight}</div>
                                <div className="text-gray-500 text-xs mt-1">LBMA Certified</div>
                              </div>
                            </div>
                            {product.stock > 50 && (
                              <Badge className="absolute top-2 left-2 bg-amber-500 text-black">In Stock</Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-white mb-2">{product.name}</h3>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="secondary" className="bg-gray-800 text-gray-300 text-xs">{product.weight}</Badge>
                              <Badge variant="secondary" className="bg-gray-800 text-gray-300 text-xs">{product.purity}</Badge>
                            </div>
                            <p className="text-amber-400 font-bold text-lg mb-1">
                              AED {(grams * goldPriceAed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500 mb-4">LBMA Certified</p>
                            <Button 
                              onClick={() => addToCart(product)}
                              className="w-full bg-transparent border border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-black transition-colors"
                              data-testid={`button-add-to-cart-${product.weight}`}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Add to Cart
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
