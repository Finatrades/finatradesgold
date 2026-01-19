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

  const cartTotal = cart.reduce((sum, item) => {
    return sum + parseFloat(item.product.livePrice) * item.quantity;
  }, 0);

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
      const cartItems = cart.map(item => ({
        barSize: item.product.weight,
        grams: parseFloat(item.product.weightGrams),
        quantity: item.quantity,
        priceUsd: parseFloat(item.product.livePrice) * item.quantity,
      }));

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
      <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col overflow-hidden">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                  <Card 
                    key={product.productId} 
                    className="overflow-hidden hover:shadow-lg transition-shadow border-amber-100"
                    data-testid={`product-card-${product.productId}`}
                  >
                    <div className="flex">
                      <div className="w-32 h-32 bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center p-2 shrink-0">
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop';
                          }}
                        />
                      </div>
                      <CardContent className="flex-1 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {product.weight} • {product.purity} Purity
                            </p>
                          </div>
                          {product.inStock ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              In Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              Out of Stock
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {product.description || 'LBMA Certified pure gold bar with assay certificate'}
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold text-amber-600">
                              ${parseFloat(product.livePrice).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              AED {parseFloat(product.livePriceAed || '0').toLocaleString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addToCart(product)}
                            disabled={!product.inStock}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                            data-testid={`add-to-cart-${product.productId}`}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
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
                  {cart.map((item) => (
                    <div
                      key={item.product.productId}
                      className="bg-white rounded-lg p-3 shadow-sm border"
                      data-testid={`cart-item-${item.product.productId}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{item.product.weight} Gold Bar</p>
                          <p className="text-xs text-muted-foreground">
                            ${parseFloat(item.product.livePrice).toLocaleString()} each
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
                          ${(parseFloat(item.product.livePrice) * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="p-4 border-t bg-white space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Gold</span>
                    <span className="font-medium" data-testid="text-total-grams">{cartTotalGrams.toFixed(2)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-xl font-bold text-amber-600" data-testid="text-total-usd">
                      ${cartTotal.toLocaleString()}
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
