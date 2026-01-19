import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShoppingCart, Plus, Minus, Trash2, ExternalLink, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface BuyGoldBarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GoldProduct {
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
  makingFee?: string;
  premiumFeePercent?: string;
  vatPercent?: string;
}

// Calculate price breakdown for a product
function calculatePriceBreakdown(product: GoldProduct, quantity: number = 1) {
  const basePrice = parseFloat(product.livePrice) || 0;
  const makingFee = parseFloat(product.makingFee || '0') * quantity;
  const premiumPercent = parseFloat(product.premiumFeePercent || '0');
  const vatPercent = parseFloat(product.vatPercent || '0');
  
  const premium = (basePrice * quantity * premiumPercent) / 100;
  const subtotal = (basePrice * quantity) + makingFee + premium;
  const vat = (subtotal * vatPercent) / 100;
  const total = subtotal + vat;
  
  return {
    basePrice: basePrice * quantity,
    makingFee,
    premium,
    vat,
    total,
    vatPercent,
    premiumPercent,
  };
}

interface CartItem {
  product: GoldProduct;
  quantity: number;
}

const GOLD_BAR_IMAGES: Record<string, string> = {
  '1g': '/images/gold-bars/1g_gold_bar_product_photo.png',
  '10g': '/images/gold-bars/10g_gold_bar_product_photo.png',
  '100g': '/images/gold-bars/100g_gold_bar_product_photo.png',
  '1kg': '/images/gold-bars/1kg_gold_bar_product_photo.png',
};

function getProductImage(product: GoldProduct): string {
  if (product.imageUrl) return product.imageUrl;
  const weight = product.weight?.toLowerCase().replace(/\s+/g, '');
  if (weight && GOLD_BAR_IMAGES[weight]) return GOLD_BAR_IMAGES[weight];
  return 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop';
}

export default function BuyGoldBarModal({ isOpen, onClose }: BuyGoldBarModalProps) {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['wingold-products'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/wingold/products');
      return res.json();
    },
    enabled: isOpen,
  });

  const products: GoldProduct[] = productsData?.products || [];

  const addToCart = (product: GoldProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.productId === product.productId);
      if (existing) {
        return prev.map(item =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({
      title: 'Added to Cart',
      description: `${product.name} added to your cart`,
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => 
      prev.map(item => {
        if (item.product.productId === productId) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.productId !== productId));
  };

  const clearCart = () => setCart([]);

  // Calculate cart totals with fee breakdown
  const cartBreakdown = cart.reduce((totals, item) => {
    const breakdown = calculatePriceBreakdown(item.product, item.quantity);
    return {
      basePrice: totals.basePrice + breakdown.basePrice,
      makingFee: totals.makingFee + breakdown.makingFee,
      premium: totals.premium + breakdown.premium,
      vat: totals.vat + breakdown.vat,
      total: totals.total + breakdown.total,
    };
  }, { basePrice: 0, makingFee: 0, premium: 0, vat: 0, total: 0 });

  const cartTotal = cartBreakdown.total;

  const cartTotalGrams = cart.reduce((sum, item) => {
    return sum + parseFloat(item.product.weightGrams) * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart Empty',
        description: 'Please add items to your cart before checkout',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      const cartItems = cart.map(item => {
        const breakdown = calculatePriceBreakdown(item.product, item.quantity);
        return {
          barSize: item.product.weight,
          grams: parseFloat(item.product.weightGrams),
          quantity: item.quantity,
          priceUsd: breakdown.total, // Total price including all fees
          basePrice: breakdown.basePrice,
          makingFee: breakdown.makingFee,
          premium: breakdown.premium,
          vat: breakdown.vat,
        };
      });

      const res = await apiRequest('POST', '/api/sso/wingold/checkout', {
        cart: cartItems,
        totalGrams: cartTotalGrams,
        totalUsd: cartTotal,
      });

      const data = await res.json();

      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        toast({
          title: 'Redirecting to Wingold',
          description: 'Complete your purchase on Wingold & Metals',
        });
        clearCart();
        onClose();
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Unable to proceed to checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-yellow-50 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-900">
                <Package className="w-6 h-6" />
                Buy Gold Bars
              </DialogTitle>
              <DialogDescription className="text-amber-700 mt-1">
                Browse and purchase certified LBMA gold bars
              </DialogDescription>
            </div>
            {cart.length > 0 && (
              <Badge className="bg-amber-500 text-white px-3 py-1">
                <ShoppingCart className="w-4 h-4 mr-1" />
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Package className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No products available</p>
                <p className="text-sm">Check back later for gold bar offerings</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => {
                  const unitBreakdown = calculatePriceBreakdown(product, 1);
                  return (
                    <Card 
                      key={product.productId} 
                      className="overflow-hidden hover:shadow-lg transition-shadow border-amber-100 flex flex-col"
                      data-testid={`product-card-${product.productId}`}
                    >
                      {/* Product Image - Large at top */}
                      <div className="aspect-square bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center p-4">
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop';
                          }}
                        />
                      </div>
                      
                      {/* Product Details */}
                      <CardContent className="flex-1 p-4 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</h3>
                          {product.inStock ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs shrink-0">
                              In Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs shrink-0">
                              Out of Stock
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          {product.weight} • {product.purity} Purity
                        </p>
                        
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">
                          {product.description || 'LBMA Certified pure gold bar with assay certificate'}
                        </p>
                        
                        {/* Price Section */}
                        <div className="mb-3">
                          <p className="text-lg font-bold text-amber-600">
                            ${unitBreakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            AED {(unitBreakdown.total * 3.67).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {(unitBreakdown.makingFee > 0 || unitBreakdown.premium > 0) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Includes premium + making
                            </p>
                          )}
                        </div>
                        
                        {/* Full-width Add to Cart button */}
                        <Button
                          onClick={() => addToCart(product)}
                          disabled={!product.inStock}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                          data-testid={`add-to-cart-${product.productId}`}
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
          </div>

          <div className="w-80 border-l bg-gray-50 flex flex-col shrink-0">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Your Cart
              </h3>
            </div>

            <ScrollArea className="flex-1 p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Your cart is empty</p>
                  <p className="text-xs">Add gold bars to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const itemBreakdown = calculatePriceBreakdown(item.product, item.quantity);
                    const unitPrice = calculatePriceBreakdown(item.product, 1).total;
                    return (
                      <div
                        key={item.product.productId}
                        className="bg-white rounded-lg p-3 shadow-sm border"
                        data-testid={`cart-item-${item.product.productId}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{item.product.weight} Gold Bar</p>
                            <p className="text-xs text-muted-foreground">
                              ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeFromCart(item.product.productId)}
                            data-testid={`button-remove-${item.product.productId}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product.productId, -1)}
                              data-testid={`button-decrease-${item.product.productId}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium" data-testid={`text-quantity-${item.product.productId}`}>{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product.productId, 1)}
                              data-testid={`button-increase-${item.product.productId}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="font-semibold text-amber-600">
                            ${itemBreakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="p-4 border-t bg-white space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Gold</span>
                    <span className="font-medium" data-testid="text-total-grams">{cartTotalGrams.toFixed(2)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gold Price</span>
                    <span data-testid="text-gold-price">${cartBreakdown.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {cartBreakdown.makingFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Making Fee</span>
                      <span data-testid="text-making-fee">${cartBreakdown.makingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {cartBreakdown.premium > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Premium</span>
                      <span data-testid="text-premium">${cartBreakdown.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {cartBreakdown.vat > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT</span>
                      <span data-testid="text-vat">${cartBreakdown.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="text-lg font-bold text-amber-600" data-testid="text-total-usd">
                      ${cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  data-testid="button-checkout"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Checkout on Wingold
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  You will be redirected to Wingold & Metals to complete your purchase
                </p>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={clearCart}
                  data-testid="button-clear-cart"
                >
                  Clear Cart
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
