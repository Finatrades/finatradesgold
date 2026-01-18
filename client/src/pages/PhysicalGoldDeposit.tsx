import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Upload, Package, Truck, Building2, AlertTriangle, FileText } from 'lucide-react';

interface DepositItem {
  id: string;
  itemType: 'RAW' | 'GOLD_BAR' | 'GOLD_COIN' | 'OTHER';
  quantity: number;
  weightPerUnitGrams: string;
  totalDeclaredWeightGrams: string;
  usdValuePerUnit: string;
  purity: string;
  brand?: string;
  mint?: string;
  serialNumber?: string;
  customDescription?: string;
  photos: File[];
}

type InputMode = 'grams' | 'usd';
type PriceMode = 'live' | 'manual';

const PURITY_OPTIONS = [
  { value: '999.9', label: '999.9 (24K)' },
  { value: '995', label: '995' },
  { value: '916', label: '916 (22K)' },
  { value: '750', label: '750 (18K)' },
  { value: 'Unknown', label: 'Unknown - Requires Assay' },
];

const SOURCE_OPTIONS = [
  { value: 'Mining', label: 'Mining Operations' },
  { value: 'Refinery', label: 'Refinery' },
  { value: 'Jewelry', label: 'Jewelry/Scrap' },
  { value: 'Inheritance', label: 'Inheritance' },
  { value: 'Investment', label: 'Investment Purchase' },
  { value: 'Other', label: 'Other' },
];

interface VaultLocation {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  address?: string;
  isActive: boolean;
}

interface PhysicalGoldDepositProps {
  embedded?: boolean;
  onSuccess?: () => void;
}

export default function PhysicalGoldDeposit({ embedded = false, onSuccess }: PhysicalGoldDepositProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data: vaultLocationsData, isLoading: vaultLocationsLoading } = useQuery({
    queryKey: ['wingold-vault-locations'],
    queryFn: async () => {
      const res = await fetch('/api/wingold/vault-locations', { credentials: 'include' });
      if (!res.ok) return { locations: [] };
      return res.json();
    },
  });
  
  const vaultLocations: VaultLocation[] = vaultLocationsData?.locations || [];
  
  // Fetch live gold price
  const { data: goldPriceData } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price', { credentials: 'include' });
      if (!res.ok) return { pricePerGram: 0 };
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  const liveGoldPrice = goldPriceData?.pricePerGram || 0;
  
  const [vaultLocation, setVaultLocation] = useState('');
  const [depositType, setDepositType] = useState<'RAW' | 'GOLD_BAR' | 'GOLD_COIN' | 'OTHER'>('GOLD_BAR');
  
  // Input mode and price mode state
  const [inputMode, setInputMode] = useState<InputMode>('grams');
  const [priceMode, setPriceMode] = useState<PriceMode>('live');
  const [manualPrice, setManualPrice] = useState<string>('');
  
  // Get effective price based on mode
  const effectivePrice = priceMode === 'live' ? liveGoldPrice : (parseFloat(manualPrice) || 0);
  
  // Track previous effective price for recalculation
  const prevEffectivePriceRef = useRef(effectivePrice);
  
  const [items, setItems] = useState<DepositItem[]>([{
    id: '1',
    itemType: 'GOLD_BAR',
    quantity: 1,
    weightPerUnitGrams: '',
    totalDeclaredWeightGrams: '',
    usdValuePerUnit: '',
    purity: '999.9',
    photos: [],
  }]);
  
  // Recalculate items when effective price changes
  useEffect(() => {
    if (effectivePrice > 0 && prevEffectivePriceRef.current !== effectivePrice) {
      setItems(prevItems => prevItems.map(item => {
        const qty = item.quantity || 1;
        
        if (inputMode === 'usd') {
          // In USD mode, weight is derived from USD value
          const usdValue = parseFloat(item.usdValuePerUnit) || 0;
          if (usdValue > 0) {
            const weightPerUnit = usdValue / effectivePrice;
            return {
              ...item,
              weightPerUnitGrams: weightPerUnit.toFixed(4),
              totalDeclaredWeightGrams: (qty * weightPerUnit).toFixed(4),
            };
          }
        } else {
          // In grams mode, USD is derived from weight
          const weight = parseFloat(item.weightPerUnitGrams) || 0;
          if (weight > 0) {
            return {
              ...item,
              usdValuePerUnit: (weight * effectivePrice).toFixed(2),
            };
          }
        }
        return item;
      }));
      prevEffectivePriceRef.current = effectivePrice;
    }
  }, [effectivePrice, inputMode]);
  
  const [isBeneficialOwner, setIsBeneficialOwner] = useState(false);
  const [sourceOfMetal, setSourceOfMetal] = useState('');
  const [sourceDetails, setSourceDetails] = useState('');
  
  const [deliveryMethod, setDeliveryMethod] = useState<'PERSONAL_DROPOFF' | 'COURIER' | 'ARMORED_PICKUP'>('PERSONAL_DROPOFF');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupContactName, setPickupContactName] = useState('');
  const [pickupContactPhone, setPickupContactPhone] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  
  const [noLienDispute, setNoLienDispute] = useState(false);
  const [acceptVaultTerms, setAcceptVaultTerms] = useState(false);
  
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  
  // Optional USD estimate for negotiation
  const [usdEstimate, setUsdEstimate] = useState<string>('');

  const createDepositMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/physical-deposits/deposits', data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Deposit Request Submitted',
        description: `Reference: ${data.deposit.referenceNumber}`,
      });
      if (onSuccess) {
        onSuccess();
      } else if (!embedded) {
        navigate('/finavault');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      itemType: depositType,
      quantity: 1,
      weightPerUnitGrams: '',
      totalDeclaredWeightGrams: '',
      usdValuePerUnit: '',
      purity: '999.9',
      photos: [],
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, updates: Partial<DepositItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        const qty = updates.quantity ?? item.quantity;
        
        if (inputMode === 'usd') {
          // USD mode: calculate weight from USD value
          const usdValue = updates.usdValuePerUnit ?? item.usdValuePerUnit;
          if (effectivePrice > 0 && usdValue) {
            const weightPerUnit = parseFloat(usdValue) / effectivePrice;
            updated.weightPerUnitGrams = weightPerUnit.toFixed(4);
            updated.totalDeclaredWeightGrams = (qty * weightPerUnit).toFixed(4);
          }
        } else {
          // Grams mode: calculate USD from weight
          const weight = updates.weightPerUnitGrams ?? item.weightPerUnitGrams;
          updated.totalDeclaredWeightGrams = (qty * parseFloat(weight || '0')).toFixed(4);
          if (effectivePrice > 0 && weight) {
            updated.usdValuePerUnit = (parseFloat(weight) * effectivePrice).toFixed(2);
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const totalWeight = items.reduce((sum, item) => sum + parseFloat(item.totalDeclaredWeightGrams || '0'), 0);

  const [isUploading, setIsUploading] = useState(false);

  const getCsrfToken = (): string => {
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? match[1] : '';
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const csrfToken = getCsrfToken();
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'x-csrf-token': csrfToken,
        'x-requested-with': 'XMLHttpRequest',
      },
      body: formData,
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Upload error:', res.status, errText);
      throw new Error('Failed to upload photo');
    }
    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async () => {
    if (!noLienDispute || !acceptVaultTerms) {
      toast({
        title: 'Required Declarations',
        description: 'Please accept all declarations to proceed',
        variant: 'destructive',
      });
      return;
    }

    if (!vaultLocation || !sourceOfMetal || totalWeight <= 0) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Check that all items have at least 2 photos
    const itemsWithoutEnoughPhotos = items.filter(item => item.photos.length < 2);
    if (itemsWithoutEnoughPhotos.length > 0) {
      toast({
        title: 'Photos Required',
        description: `Please add at least 2 photos for each item. ${itemsWithoutEnoughPhotos.length} item(s) need more photos.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      toast({
        title: 'Uploading Photos',
        description: 'Please wait while we upload your photos...',
      });

      // Upload all photos and get URLs
      const itemsWithPhotoUrls = await Promise.all(items.map(async (item) => {
        const photoUrls = await Promise.all(item.photos.map(uploadPhoto));
        const { id, photos, ...itemData } = item;
        return {
          ...itemData,
          photoFrontUrl: photoUrls[0] || undefined,
          photoBackUrl: photoUrls[1] || undefined,
          additionalPhotos: photoUrls.slice(2),
        };
      }));

      const preferredDatetime = pickupDate && pickupTime 
        ? `${pickupDate}T${pickupTime.split('-')[0]}:00` 
        : pickupDate 
          ? `${pickupDate}T09:00:00` 
          : undefined;

      const data = {
        vaultLocation,
        depositType,
        items: itemsWithPhotoUrls,
        isBeneficialOwner,
        sourceOfMetal,
        sourceDetails,
        deliveryMethod,
        pickupAddress: deliveryMethod !== 'PERSONAL_DROPOFF' ? pickupAddress : undefined,
        pickupContactName: deliveryMethod !== 'PERSONAL_DROPOFF' ? pickupContactName : undefined,
        pickupContactPhone: deliveryMethod !== 'PERSONAL_DROPOFF' ? pickupContactPhone : undefined,
        preferredDatetime,
        noLienDispute,
        acceptVaultTerms,
        usdEstimateFromUser: isNegotiationRequired && usdEstimate ? parseFloat(usdEstimate) : undefined,
      };

      createDepositMutation.mutate(data);
    } catch (error) {
      console.error('Photo upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload photos. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isNegotiationRequired = depositType === 'RAW' || depositType === 'OTHER';
  const allItemsHavePhotos = items.every(item => item.photos.length >= 2);
  const canSubmit = vaultLocation && sourceOfMetal && totalWeight > 0 && isBeneficialOwner && noLienDispute && acceptVaultTerms && allItemsHavePhotos;

  return (
    <div className={embedded ? "" : "max-w-4xl mx-auto py-4"}>
      {!embedded && (
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/finavault')} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to FinaVault
        </Button>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl text-purple-800">Deposit Physical Gold</CardTitle>
          <CardDescription>
            Submit your physical gold for secure vault storage and receive digital ownership credits
          </CardDescription>
        </CardHeader>
      </Card>

      {isNegotiationRequired && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Negotiation Required</p>
                <p className="text-sm text-amber-700">
                  Raw gold and other items require professional assay and valuation. 
                  After inspection, you will receive an offer which you can accept, counter, or reject.
                  The equivalent USD value will be determined through negotiation and acceptance by both parties.
                </p>
              </div>
            </div>
            
            <div className="pl-8 pt-2 border-t border-amber-200">
              <Label className="text-sm text-amber-800 mb-2 block">
                Target USD Value (Optional)
              </Label>
              <div className="flex items-center gap-3">
                <div className="relative max-w-[200px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={usdEstimate}
                    onChange={(e) => setUsdEstimate(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 bg-white"
                    data-testid="input-usd-estimate"
                  />
                </div>
                <span className="text-xs text-amber-600">
                  This helps start the negotiation. Final value is determined after assay.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Section 1: Gold Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">1. Gold Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Vault Location</Label>
              <Select value={vaultLocation} onValueChange={setVaultLocation}>
                <SelectTrigger data-testid="select-vault-location">
                  <SelectValue placeholder={vaultLocationsLoading ? "Loading..." : "Select vault"} />
                </SelectTrigger>
                <SelectContent>
                  {vaultLocations.map(vault => (
                    <SelectItem key={vault.id} value={vault.id}>
                      {vault.name} - {vault.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gold Type</Label>
              <RadioGroup
                value={depositType}
                onValueChange={(v) => {
                  setDepositType(v as any);
                  setItems(items.map(item => ({ ...item, itemType: v as any })));
                }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                <Label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-sm ${depositType === 'GOLD_BAR' ? 'border-purple-500 bg-purple-50' : ''}`}>
                  <RadioGroupItem value="GOLD_BAR" data-testid="radio-gold-bar" />
                  <span>Gold Bars</span>
                </Label>
                <Label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-sm ${depositType === 'GOLD_COIN' ? 'border-purple-500 bg-purple-50' : ''}`}>
                  <RadioGroupItem value="GOLD_COIN" data-testid="radio-gold-coin" />
                  <span>Gold Coins</span>
                </Label>
                <Label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-sm ${depositType === 'RAW' ? 'border-purple-500 bg-purple-50' : ''}`}>
                  <RadioGroupItem value="RAW" data-testid="radio-raw" />
                  <span>Raw Gold</span>
                </Label>
                <Label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-sm ${depositType === 'OTHER' ? 'border-purple-500 bg-purple-50' : ''}`}>
                  <RadioGroupItem value="OTHER" data-testid="radio-other" />
                  <span>Other</span>
                </Label>
              </RadioGroup>
            </div>

            <Separator />
            
            {/* Input Mode & Price Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Input Mode</Label>
                <RadioGroup
                  value={inputMode}
                  onValueChange={(v) => setInputMode(v as InputMode)}
                  className="flex gap-4"
                >
                  <Label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${inputMode === 'grams' ? 'border-purple-500 bg-white' : 'bg-gray-50'}`}>
                    <RadioGroupItem value="grams" data-testid="radio-input-grams" />
                    <span>Weight (grams)</span>
                  </Label>
                  <Label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${inputMode === 'usd' ? 'border-purple-500 bg-white' : 'bg-gray-50'}`}>
                    <RadioGroupItem value="usd" data-testid="radio-input-usd" />
                    <span>USD Value</span>
                  </Label>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gold Price</Label>
                <RadioGroup
                  value={priceMode}
                  onValueChange={(v) => setPriceMode(v as PriceMode)}
                  className="flex gap-4"
                >
                  <Label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${priceMode === 'live' ? 'border-purple-500 bg-white' : 'bg-gray-50'}`}>
                    <RadioGroupItem value="live" data-testid="radio-price-live" />
                    <span>Live Price</span>
                    {liveGoldPrice > 0 && <span className="text-xs text-green-600">(${liveGoldPrice.toFixed(2)}/g)</span>}
                  </Label>
                  <Label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${priceMode === 'manual' ? 'border-purple-500 bg-white' : 'bg-gray-50'}`}>
                    <RadioGroupItem value="manual" data-testid="radio-price-manual" />
                    <span>Manual Price</span>
                  </Label>
                </RadioGroup>
                {priceMode === 'manual' && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-600">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="Enter price per gram"
                      className="w-40"
                      data-testid="input-manual-price"
                    />
                    <span className="text-sm text-gray-600">per gram</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items ({items.length})</Label>
                <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="p-3 border rounded-lg bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item #{index + 1}</span>
                    {items.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} data-testid={`button-remove-item-${index}`}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                        data-testid={`input-quantity-${index}`}
                      />
                    </div>
                    
                    {inputMode === 'usd' ? (
                      <div className="space-y-1">
                        <Label className="text-xs">USD/unit</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.usdValuePerUnit}
                          onChange={(e) => updateItem(item.id, { usdValuePerUnit: e.target.value })}
                          placeholder="5000.00"
                          data-testid={`input-usd-${index}`}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-xs">Weight/unit (g)</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={item.weightPerUnitGrams}
                          onChange={(e) => updateItem(item.id, { weightPerUnitGrams: e.target.value })}
                          placeholder="31.1035"
                          data-testid={`input-weight-${index}`}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Purity</Label>
                      <Select value={item.purity} onValueChange={(v) => updateItem(item.id, { purity: v })}>
                        <SelectTrigger data-testid={`select-purity-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PURITY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Total (g)</Label>
                      <Input value={item.totalDeclaredWeightGrams || '0'} disabled className="bg-gray-100" />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">≈ USD Value</Label>
                      <Input 
                        value={effectivePrice > 0 && item.totalDeclaredWeightGrams 
                          ? `$${(parseFloat(item.totalDeclaredWeightGrams) * effectivePrice).toFixed(2)}`
                          : '--'
                        } 
                        disabled 
                        className="bg-gray-100 text-green-700" 
                      />
                    </div>
                  </div>

                  {(depositType === 'GOLD_BAR' || depositType === 'GOLD_COIN') && (
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        value={item.brand || ''}
                        onChange={(e) => updateItem(item.id, { brand: e.target.value })}
                        placeholder="Brand"
                        data-testid={`input-brand-${index}`}
                      />
                      <Input
                        value={item.mint || ''}
                        onChange={(e) => updateItem(item.id, { mint: e.target.value })}
                        placeholder="Mint"
                        data-testid={`input-mint-${index}`}
                      />
                      <Input
                        value={item.serialNumber || ''}
                        onChange={(e) => updateItem(item.id, { serialNumber: e.target.value })}
                        placeholder="Serial #"
                        data-testid={`input-serial-${index}`}
                      />
                    </div>
                  )}

                  {(depositType === 'RAW' || depositType === 'OTHER') && (
                    <Textarea
                      value={item.customDescription || ''}
                      onChange={(e) => updateItem(item.id, { customDescription: e.target.value })}
                      placeholder="Description..."
                      rows={2}
                      data-testid={`input-description-${index}`}
                    />
                  )}

                  {/* Mandatory Photos Section */}
                  <div className="space-y-2 mt-3">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      Photos <span className="text-red-500">*</span>
                      <span className="text-gray-500 font-normal">(min 2 required)</span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {item.photos.map((photo, photoIdx) => (
                        <div key={photoIdx} className="relative group">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Item ${index + 1} photo ${photoIdx + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const newPhotos = [...item.photos];
                              newPhotos.splice(photoIdx, 1);
                              updateItem(item.id, { photos: newPhotos });
                            }}
                            data-testid={`button-remove-photo-${index}-${photoIdx}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <label
                        className={`w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          item.photos.length < 2 ? 'border-red-300 bg-red-50 hover:border-red-400' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Add</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              updateItem(item.id, { photos: [...item.photos, ...files] });
                            }
                            e.target.value = '';
                          }}
                          data-testid={`input-photo-${index}`}
                        />
                      </label>
                    </div>
                    {item.photos.length < 2 && (
                      <p className="text-xs text-red-500">Please add at least 2 photos of this item</p>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex justify-between sm:block">
                  <span className="font-medium">Total Declared Weight:</span>
                  <span className="text-lg font-bold text-purple-800 sm:ml-2">{totalWeight.toFixed(4)} g</span>
                </div>
                <div className="flex justify-between sm:block text-right">
                  <span className="font-medium sm:hidden">≈ USD Value:</span>
                  <span className="text-lg font-bold text-green-700">
                    ≈ ${effectivePrice > 0 ? (totalWeight * effectivePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    @ ${effectivePrice.toFixed(2)}/g ({priceMode === 'live' ? 'Live' : 'Manual'})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Ownership */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">2. Ownership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Checkbox
                checked={isBeneficialOwner}
                onCheckedChange={(v) => setIsBeneficialOwner(!!v)}
                data-testid="checkbox-beneficial-owner"
              />
              <p className="text-sm">I confirm that I am the beneficial owner of this gold.</p>
            </div>

            <div className="space-y-2">
              <Label>Source of Metal</Label>
              <Select value={sourceOfMetal} onValueChange={setSourceOfMetal}>
                <SelectTrigger data-testid="select-source">
                  <SelectValue placeholder="Select origin" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Delivery Method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">3. Delivery Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={deliveryMethod}
              onValueChange={(v) => setDeliveryMethod(v as any)}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              <Label className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer text-center ${deliveryMethod === 'PERSONAL_DROPOFF' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                <RadioGroupItem value="PERSONAL_DROPOFF" className="sr-only" data-testid="radio-personal-dropoff" />
                <Building2 className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-medium text-sm">I will bring it</p>
                  <p className="text-xs text-gray-500">Personal drop-off</p>
                </div>
              </Label>

              <Label className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer text-center ${deliveryMethod === 'COURIER' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                <RadioGroupItem value="COURIER" className="sr-only" data-testid="radio-courier" />
                <Package className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-medium text-sm">Courier</p>
                  <p className="text-xs text-gray-500">Logistics arranged by me</p>
                </div>
              </Label>

              <Label className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer text-center ${deliveryMethod === 'ARMORED_PICKUP' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                <RadioGroupItem value="ARMORED_PICKUP" className="sr-only" data-testid="radio-armored-pickup" />
                <Truck className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-medium text-sm">Request Pickup</p>
                  <p className="text-xs text-gray-500">Armored transport</p>
                </div>
              </Label>
            </RadioGroup>

            {deliveryMethod !== 'PERSONAL_DROPOFF' && (
              <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                <Textarea
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Pickup address..."
                  rows={2}
                  data-testid="input-pickup-address"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={pickupContactName}
                    onChange={(e) => setPickupContactName(e.target.value)}
                    placeholder="Contact name"
                    data-testid="input-contact-name"
                  />
                  <Input
                    value={pickupContactPhone}
                    onChange={(e) => setPickupContactPhone(e.target.value)}
                    placeholder="Phone"
                    data-testid="input-contact-phone"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">4. Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-purple-400 hover:bg-purple-50 ${invoiceFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                onClick={() => document.getElementById('invoice-upload')?.click()}
              >
                <input
                  id="invoice-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  data-testid="input-invoice-upload"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">Upload Invoice</p>
                    <p className="text-xs text-gray-500">Proof of purchase</p>
                  </div>
                  {invoiceFile && (
                    <p className="text-sm text-green-600 mt-1">{invoiceFile.name}</p>
                  )}
                </div>
              </div>

              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-purple-400 hover:bg-purple-50 ${certificateFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                onClick={() => document.getElementById('certificate-upload')?.click()}
              >
                <input
                  id="certificate-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  data-testid="input-certificate-upload"
                />
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">Upload Certificate</p>
                    <p className="text-xs text-gray-500">Assay / Purity</p>
                  </div>
                  {certificateFile && (
                    <p className="text-sm text-green-600 mt-1">{certificateFile.name}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Declarations */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={noLienDispute}
              onCheckedChange={(v) => setNoLienDispute(!!v)}
              data-testid="checkbox-no-lien"
            />
            <p className="text-sm">I confirm the gold is free from any lien, dispute, or encumbrance.</p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              checked={acceptVaultTerms}
              onCheckedChange={(v) => setAcceptVaultTerms(!!v)}
              data-testid="checkbox-vault-terms"
            />
            <div>
              <p className="text-sm">I accept the vault storage terms, insurance policy, and fee structure.</p>
              <p className="text-xs text-gray-500">Estimated storage fee applies upon acceptance.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createDepositMutation.isPending || isUploading}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            data-testid="button-submit-deposit"
          >
            {isUploading ? 'Uploading Photos...' : createDepositMutation.isPending ? 'Submitting...' : 'Submit Deposit Request'}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              if (onSuccess) onSuccess();
              else if (!embedded) navigate('/finavault');
            }}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
