import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle2, Package, Minus, Plus, MapPin, Clock, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

type BarSize = '1g' | '10g' | '100g' | '1kg';

const BAR_OPTIONS: { size: BarSize; grams: number; label: string; fulfillmentHours: number }[] = [
  { size: '1g', grams: 1, label: '1 Gram Bar', fulfillmentHours: 2 },
  { size: '10g', grams: 10, label: '10 Gram Bar', fulfillmentHours: 2 },
  { size: '100g', grams: 100, label: '100 Gram Bar', fulfillmentHours: 12 },
  { size: '1kg', grams: 1000, label: '1 Kilogram Bar', fulfillmentHours: 24 },
];

const COMPLIANCE_NOTICE = `Finatrades Finance SA operates in partnership with Wingold & Metals DMCC for use of the Finatrades digital platform to facilitate the sale, purchase, allocation, and other structured buy-and-sell plans related to physical gold. All gold transactions executed by Wingold & Metals DMCC through the Platform are processed, recorded, and maintained within the Finatrades system.`;

export default function BuyGoldWingoldModal({ isOpen, onClose, onSuccess }: BuyGoldWingoldModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'select' | 'confirm' | 'submitted'>('select');
  const [selectedBarSize, setSelectedBarSize] = useState<BarSize>('10g');
  const [barCount, setBarCount] = useState(1);
  const [selectedVaultId, setSelectedVaultId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string; referenceNumber: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState<{ title: string; terms: string; enabled: boolean } | null>(null);

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

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedBarSize('10g');
      setBarCount(1);
      setSelectedVaultId('');
      setOrderResult(null);
      setTermsAccepted(false);
      
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

  const goldPrice = goldPriceData?.pricePerGram || 143;
  const selectedBar = BAR_OPTIONS.find(b => b.size === selectedBarSize)!;
  const totalGrams = selectedBar.grams * barCount;
  const totalUsd = totalGrams * goldPrice;

  const handleSubmitOrder = async () => {
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('POST', '/api/wingold/orders', {
        barSize: selectedBarSize,
        barCount,
        vaultLocationId: selectedVaultId || undefined,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-buy-gold-wingold">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            <span>Buy Gold Bar</span>
            <span className="text-sm font-normal text-muted-foreground">(Wingold & Metals)</span>
          </DialogTitle>
          <DialogDescription>
            Purchase physical gold bars stored in secure LBMA-accredited vaults
          </DialogDescription>
        </DialogHeader>

        {!isKycApproved ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your KYC verification must be approved before you can purchase gold bars.
              Please complete your KYC verification first.
            </AlertDescription>
          </Alert>
        ) : step === 'submitted' && orderResult ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Order Submitted Successfully!</h3>
            <p className="text-muted-foreground">
              Your gold bar order is pending admin approval.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Reference:</span>{' '}
                <span className="font-mono font-medium">{orderResult.referenceNumber}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Order:</span>{' '}
                <span className="font-medium">{barCount}x {selectedBar.label}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Total Gold:</span>{' '}
                <span className="font-medium text-amber-600">{totalGrams.toLocaleString()}g</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Estimated Value:</span>{' '}
                <span className="font-medium">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              You will be notified when your order is approved and processed.
            </p>
            <Button onClick={handleClose} className="mt-4" data-testid="button-close-success">
              Close
            </Button>
          </div>
        ) : step === 'confirm' ? (
          <div className="space-y-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                Please review your order details before submitting.
              </AlertDescription>
            </Alert>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bar Size</span>
                  <span className="font-medium">{selectedBar.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">{barCount} bar{barCount > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Gold</span>
                  <span className="font-medium text-amber-600">{totalGrams.toLocaleString()}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gold Price</span>
                  <span className="font-medium">${goldPrice.toFixed(2)}/g</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-medium">Total Value</span>
                  <span className="font-bold text-lg">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {selectedVaultId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Storage Location</span>
                    <span>{vaultLocations.find(v => v.id === selectedVaultId)?.name || 'Selected Vault'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Estimated fulfillment: {selectedBar.fulfillmentHours} hours</span>
                </div>
              </CardContent>
            </Card>

            <Alert className="bg-purple-50 border-purple-200">
              <AlertDescription className="text-xs text-purple-800">
                {COMPLIANCE_NOTICE}
              </AlertDescription>
            </Alert>

            {termsContent?.enabled && (
              <div className="border border-border rounded-lg p-3 bg-muted/30">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="buy-gold-terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className="mt-0.5"
                    data-testid="checkbox-terms"
                  />
                  <div className="flex-1">
                    <label htmlFor="buy-gold-terms" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      I accept the Terms & Conditions
                    </label>
                    <details className="mt-2">
                      <summary className="text-xs text-primary cursor-pointer hover:underline">View Terms</summary>
                      <div className="mt-2 text-xs text-muted-foreground whitespace-pre-line bg-white p-2 rounded border max-h-32 overflow-y-auto">
                        {termsContent.terms}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('select')} data-testid="button-back">
                Back
              </Button>
              <Button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || (termsContent?.enabled && !termsAccepted)}
                className="bg-amber-500 hover:bg-amber-600"
                data-testid="button-confirm-order"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Confirm Order'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Bar Size</Label>
              <RadioGroup
                value={selectedBarSize}
                onValueChange={(value) => setSelectedBarSize(value as BarSize)}
                className="grid grid-cols-2 gap-3"
              >
                {BAR_OPTIONS.map((option) => (
                  <div key={option.size} className="relative">
                    <RadioGroupItem
                      value={option.size}
                      id={`bar-${option.size}`}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor={`bar-${option.size}`}
                      className="flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50 hover:border-amber-300"
                      data-testid={`bar-option-${option.size}`}
                    >
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-sm text-muted-foreground">
                        ${(option.grams * goldPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        ~{option.fulfillmentHours}h fulfillment
                      </span>
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Quantity</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setBarCount(Math.max(1, barCount - 1))}
                  disabled={barCount <= 1}
                  data-testid="button-decrease-quantity"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center" data-testid="text-quantity">
                  {barCount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setBarCount(barCount + 1)}
                  disabled={barCount >= 100}
                  data-testid="button-increase-quantity"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {vaultLocations.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Storage Location
                </Label>
                <RadioGroup
                  value={selectedVaultId}
                  onValueChange={setSelectedVaultId}
                  className="grid grid-cols-2 gap-2"
                >
                  {vaultLocations.map((vault) => (
                    <div key={vault.id} className="relative">
                      <RadioGroupItem
                        value={vault.id}
                        id={`vault-${vault.id}`}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor={`vault-${vault.id}`}
                        className="flex flex-col p-3 border rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50"
                        data-testid={`vault-option-${vault.code}`}
                      >
                        <span className="font-medium text-sm">{vault.name}</span>
                        <span className="text-xs text-muted-foreground">{vault.city}, {vault.country}</span>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Total Gold</span>
                  <span className="text-xl font-bold text-amber-600">{totalGrams.toLocaleString()}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estimated Value</span>
                  <span className="text-lg font-semibold">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * Final price confirmed at time of approval
                </p>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                className="bg-amber-500 hover:bg-amber-600"
                data-testid="button-proceed"
              >
                Proceed to Review
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
