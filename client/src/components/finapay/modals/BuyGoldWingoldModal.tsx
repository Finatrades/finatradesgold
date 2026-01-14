import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2, ShoppingCart, Search, SlidersHorizontal, X, MapPin, Clock, FileText, ChevronDown, Package } from 'lucide-react';
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

const COMPLIANCE_NOTICE = `Finatrades Finance SA operates in partnership with Wingold & Metals DMCC for use of the Finatrades digital platform to facilitate the sale, purchase, allocation, and other structured buy-and-sell plans related to physical gold.`;

export default function BuyGoldWingoldModal({ isOpen, onClose, onSuccess }: BuyGoldWingoldModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'shop' | 'cart' | 'checkout' | 'submitted'>('shop');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string; referenceNumber: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState<{ title: string; terms: string; enabled: boolean } | null>(null);
  
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
      
      fetch('/api/terms/buy_gold')
        .then(res => res.json())
        .then(data => setTermsContent(data))
        .catch(() => setTermsContent(null));
    }
  }, [isOpen]);

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

  const handleSubmitOrder = async () => {
    if (!user || cart.length === 0) return;

    setIsSubmitting(true);
    
    try {
      const mainItem = cart.reduce((a, b) => a.grams * a.quantity > b.grams * b.quantity ? a : b);
      const totalBars = cart.reduce((sum, item) => sum + item.quantity, 0);
      
      const response = await apiRequest('POST', '/api/wingold/orders', {
        barSize: mainItem.barSize,
        barCount: totalBars,
        vaultLocationId: selectedVaultId || undefined,
        cartItems: cart.map(item => ({
          barSize: item.barSize,
          quantity: item.quantity,
          priceUsdPerGram: goldPriceUsd,
        })),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit order');
      }

      const result = await response.json();
      setOrderResult({ orderId: result.orderId, referenceNumber: result.referenceNumber });
      setStep('submitted');

      toast({
        title: 'Order Submitted',
        description: 'Your gold bar order is pending admin approval.',
      });
    } catch (error: any) {
      toast({
        title: 'Order Failed',
        description: error.message || 'Failed to submit gold bar order.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
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
          <div className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your KYC verification must be approved before you can purchase gold bars.
                Please complete your KYC verification first.
              </AlertDescription>
            </Alert>
          </div>
        ) : step === 'submitted' && orderResult ? (
          <div className="py-12 px-6 text-center space-y-4 bg-[#0a0a0a] text-white">
            <div className="mx-auto w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold">Order Submitted Successfully!</h3>
            <p className="text-gray-400">
              Your gold bar order is pending admin approval.
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
              You will be notified when your order is approved and processed.
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
                onClick={handleSubmitOrder}
                disabled={isSubmitting || (termsContent?.enabled && !termsAccepted)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                data-testid="button-confirm-order"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </Button>
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
                      return (
                        <Card key={product.productId} className="bg-[#1a1a1a] border-gray-800 overflow-hidden group" data-testid={`product-card-${product.weight}`}>
                          <div className="aspect-square relative bg-gradient-to-br from-gray-900 to-gray-800 p-4">
                            <div className="absolute inset-0 flex items-center justify-center">
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name}
                                  className="max-w-full max-h-full object-contain p-2 group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`relative ${product.imageUrl ? 'hidden' : ''}`}>
                                {/* Fallback gold bar placeholder */}
                                <div className="w-32 h-48 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 rounded-sm shadow-xl transform rotate-3 group-hover:rotate-0 transition-transform">
                                  <div className="absolute inset-2 border border-amber-600/30 rounded-sm" />
                                  <div className="absolute top-4 left-1/2 -translate-x-1/2 text-amber-900 text-xs font-bold">
                                    Au {product.weight}
                                  </div>
                                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-amber-900 text-[10px]">
                                    FINE GOLD
                                  </div>
                                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-amber-900 text-[10px]">
                                    {product.purity}
                                  </div>
                                </div>
                                {/* Certificate decoration */}
                                <div className="absolute -right-8 -top-4 w-24 h-32 bg-white rounded shadow-lg transform rotate-12 p-2">
                                  <div className="text-[6px] text-gray-800 font-bold mb-1">WINGOLD</div>
                                  <div className="text-[5px] text-gray-600 leading-tight">
                                    Certificate of Authenticity<br/>
                                    LBMA Certified<br/>
                                    {product.weight} Pure Gold<br/>
                                    Purity: {product.purity}
                                  </div>
                                  <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                                    <span className="text-[4px] text-amber-800">✓</span>
                                  </div>
                                </div>
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
