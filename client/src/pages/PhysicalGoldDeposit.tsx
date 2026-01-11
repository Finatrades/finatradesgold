import { useState, useEffect } from 'react';
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
import { ArrowLeft, Plus, Trash2, Upload, Package, Truck, Building2, AlertTriangle } from 'lucide-react';

interface DepositItem {
  id: string;
  itemType: 'RAW' | 'GOLD_BAR' | 'GOLD_COIN' | 'OTHER';
  quantity: number;
  weightPerUnitGrams: string;
  totalDeclaredWeightGrams: string;
  purity: string;
  brand?: string;
  mint?: string;
  serialNumber?: string;
  customDescription?: string;
  photoFrontUrl?: string;
  photoBackUrl?: string;
}

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
  const [step, setStep] = useState(1);
  
  // Fetch vault locations from database
  const { data: vaultLocationsData, isLoading: vaultLocationsLoading } = useQuery({
    queryKey: ['vault-locations'],
    queryFn: async () => {
      const res = await fetch('/api/vault/locations', { credentials: 'include' });
      if (!res.ok) return { locations: [] };
      return res.json();
    },
  });
  
  const vaultLocations: VaultLocation[] = vaultLocationsData?.locations || [];
  
  const [vaultLocation, setVaultLocation] = useState('');
  const [depositType, setDepositType] = useState<'RAW' | 'GOLD_BAR' | 'GOLD_COIN' | 'OTHER'>('GOLD_BAR');
  const [items, setItems] = useState<DepositItem[]>([{
    id: '1',
    itemType: 'GOLD_BAR',
    quantity: 1,
    weightPerUnitGrams: '',
    totalDeclaredWeightGrams: '',
    purity: '999.9',
  }]);
  
  const [isBeneficialOwner, setIsBeneficialOwner] = useState(true);
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
  const [acceptInsurance, setAcceptInsurance] = useState(false);
  const [acceptFees, setAcceptFees] = useState(false);

  const createDepositMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/physical-deposits/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create deposit');
      }
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
      setStep(1);
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
      purity: '999.9',
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
        if (updates.quantity !== undefined || updates.weightPerUnitGrams !== undefined) {
          const qty = updates.quantity ?? item.quantity;
          const weight = updates.weightPerUnitGrams ?? item.weightPerUnitGrams;
          updated.totalDeclaredWeightGrams = (qty * parseFloat(weight || '0')).toFixed(4);
        }
        return updated;
      }
      return item;
    }));
  };

  const totalWeight = items.reduce((sum, item) => sum + parseFloat(item.totalDeclaredWeightGrams || '0'), 0);

  const handleSubmit = () => {
    if (!noLienDispute || !acceptVaultTerms || !acceptInsurance || !acceptFees) {
      toast({
        title: 'Required Declarations',
        description: 'Please accept all declarations to proceed',
        variant: 'destructive',
      });
      return;
    }

    const preferredDatetime = pickupDate && pickupTime 
      ? `${pickupDate}T${pickupTime.split('-')[0]}:00` 
      : pickupDate 
        ? `${pickupDate}T09:00:00` 
        : undefined;

    const data = {
      vaultLocation,
      depositType,
      items: items.map(({ id, ...item }) => item),
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
      acceptInsurance,
      acceptFees,
    };

    createDepositMutation.mutate(data);
  };

  const isNegotiationRequired = depositType === 'RAW' || depositType === 'OTHER';

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
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Negotiation Required</p>
                  <p className="text-sm text-amber-700">
                    Raw gold and other items require professional assay and valuation. 
                    After inspection, you will receive an offer which you can accept, counter, or reject.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-purple-600' : 'bg-gray-200'}`}
              data-testid={`step-indicator-${s}`}
            />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Vault & Gold Details</CardTitle>
              <CardDescription>Select vault location and add your gold items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
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
                <p className="text-sm text-muted-foreground">
                  Your gold will be stored in a secure, insured vault at this location
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>What type of gold are you depositing?</Label>
                <RadioGroup
                  value={depositType}
                  onValueChange={(v) => {
                    setDepositType(v as any);
                    setItems(items.map(item => ({ ...item, itemType: v as any })));
                  }}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${depositType === 'GOLD_BAR' ? 'border-purple-500 bg-purple-50' : ''}`}>
                    <RadioGroupItem value="GOLD_BAR" data-testid="radio-gold-bar" />
                    <div>
                      <p className="font-medium">Gold Bars</p>
                      <p className="text-sm text-gray-500">Certified gold bars with serial numbers</p>
                    </div>
                  </Label>
                  <Label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${depositType === 'GOLD_COIN' ? 'border-purple-500 bg-purple-50' : ''}`}>
                    <RadioGroupItem value="GOLD_COIN" data-testid="radio-gold-coin" />
                    <div>
                      <p className="font-medium">Gold Coins</p>
                      <p className="text-sm text-gray-500">Investment grade gold coins</p>
                    </div>
                  </Label>
                  <Label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${depositType === 'RAW' ? 'border-purple-500 bg-purple-50' : ''}`}>
                    <RadioGroupItem value="RAW" data-testid="radio-raw" />
                    <div>
                      <p className="font-medium">Raw Gold</p>
                      <p className="text-sm text-gray-500">Unrefined gold, nuggets, ore</p>
                    </div>
                  </Label>
                  <Label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${depositType === 'OTHER' ? 'border-purple-500 bg-purple-50' : ''}`}>
                    <RadioGroupItem value="OTHER" data-testid="radio-other" />
                    <div>
                      <p className="font-medium">Other</p>
                      <p className="text-sm text-gray-500">Jewelry, scrap, or other items</p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Items ({items.length})</Label>
                  <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <Card key={item.id} className="bg-gray-50">
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Item #{index + 1}</span>
                        {items.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} data-testid={`button-remove-item-${index}`}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                            data-testid={`input-quantity-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Weight per unit (g)</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={item.weightPerUnitGrams}
                            onChange={(e) => updateItem(item.id, { weightPerUnitGrams: e.target.value })}
                            placeholder="e.g. 31.1035"
                            data-testid={`input-weight-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Purity</Label>
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
                        <div className="space-y-2">
                          <Label>Total Weight (g)</Label>
                          <Input
                            value={item.totalDeclaredWeightGrams || '0'}
                            disabled
                            className="bg-gray-100"
                            data-testid={`input-total-weight-${index}`}
                          />
                        </div>
                      </div>

                      {(depositType === 'GOLD_BAR' || depositType === 'GOLD_COIN') && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Brand/Manufacturer</Label>
                            <Input
                              value={item.brand || ''}
                              onChange={(e) => updateItem(item.id, { brand: e.target.value })}
                              placeholder="e.g. PAMP, Valcambi"
                              data-testid={`input-brand-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Mint</Label>
                            <Input
                              value={item.mint || ''}
                              onChange={(e) => updateItem(item.id, { mint: e.target.value })}
                              placeholder="e.g. Swiss Mint"
                              data-testid={`input-mint-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Serial Number</Label>
                            <Input
                              value={item.serialNumber || ''}
                              onChange={(e) => updateItem(item.id, { serialNumber: e.target.value })}
                              placeholder="If available"
                              data-testid={`input-serial-${index}`}
                            />
                          </div>
                        </div>
                      )}

                      {(depositType === 'RAW' || depositType === 'OTHER') && (
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={item.customDescription || ''}
                            onChange={(e) => updateItem(item.id, { customDescription: e.target.value })}
                            placeholder="Describe your gold item in detail..."
                            rows={3}
                            data-testid={`input-description-${index}`}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Declared Weight:</span>
                      <span className="text-xl font-bold text-purple-800">{totalWeight.toFixed(4)} g</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={totalWeight <= 0} data-testid="button-next-step-1">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Ownership & Source</CardTitle>
              <CardDescription>Provide information about the origin of your gold</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Ownership Declaration</Label>
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Checkbox
                    checked={isBeneficialOwner}
                    onCheckedChange={(v) => setIsBeneficialOwner(!!v)}
                    data-testid="checkbox-beneficial-owner"
                  />
                  <div>
                    <p className="font-medium">I am the beneficial owner</p>
                    <p className="text-sm text-gray-500">
                      I confirm that I am the legal owner of the gold being deposited and have full authority to transfer custody.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Source of Gold</Label>
                <Select value={sourceOfMetal} onValueChange={setSourceOfMetal}>
                  <SelectTrigger data-testid="select-source">
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Additional Details (Optional)</Label>
                <Textarea
                  value={sourceDetails}
                  onChange={(e) => setSourceDetails(e.target.value)}
                  placeholder="Provide any additional information about how you acquired this gold..."
                  rows={3}
                  data-testid="input-source-details"
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} data-testid="button-prev-step-2">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!sourceOfMetal} data-testid="button-next-step-2">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Delivery Method</CardTitle>
              <CardDescription>How will you deliver your gold to our vault?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={deliveryMethod}
                onValueChange={(v) => setDeliveryMethod(v as any)}
                className="space-y-4"
              >
                <Label className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer ${deliveryMethod === 'PERSONAL_DROPOFF' ? 'border-purple-500 bg-purple-50' : ''}`}>
                  <RadioGroupItem value="PERSONAL_DROPOFF" className="mt-1" data-testid="radio-personal-dropoff" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-purple-600" />
                      <p className="font-medium">Personal Drop-off</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Bring your gold directly to our vault location in Dubai
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Address: Wingold & Metals DMCC, Almas Tower, JLT, Dubai, UAE
                    </p>
                  </div>
                </Label>

                <Label className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer ${deliveryMethod === 'COURIER' ? 'border-purple-500 bg-purple-50' : ''}`}>
                  <RadioGroupItem value="COURIER" className="mt-1" data-testid="radio-courier" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-600" />
                      <p className="font-medium">Insured Courier</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Ship via insured courier service (additional fees apply)
                    </p>
                  </div>
                </Label>

                <Label className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer ${deliveryMethod === 'ARMORED_PICKUP' ? 'border-purple-500 bg-purple-50' : ''}`}>
                  <RadioGroupItem value="ARMORED_PICKUP" className="mt-1" data-testid="radio-armored-pickup" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-purple-600" />
                      <p className="font-medium">Armored Pickup</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      We arrange secure armored transport from your location
                    </p>
                  </div>
                </Label>
              </RadioGroup>

              {deliveryMethod !== 'PERSONAL_DROPOFF' && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <div className="space-y-2">
                    <Label>Pickup Address</Label>
                    <Textarea
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="Full address for pickup..."
                      rows={2}
                      data-testid="input-pickup-address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input
                        value={pickupContactName}
                        onChange={(e) => setPickupContactName(e.target.value)}
                        placeholder="Full name"
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input
                        value={pickupContactPhone}
                        onChange={(e) => setPickupContactPhone(e.target.value)}
                        placeholder="+971..."
                        data-testid="input-contact-phone"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Date</Label>
                  <Input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="input-pickup-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Time</Label>
                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger data-testid="select-pickup-time">
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00-11:00">9:00 AM - 11:00 AM</SelectItem>
                      <SelectItem value="11:00-13:00">11:00 AM - 1:00 PM</SelectItem>
                      <SelectItem value="14:00-16:00">2:00 PM - 4:00 PM</SelectItem>
                      <SelectItem value="16:00-18:00">4:00 PM - 6:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} data-testid="button-prev-step-3">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(4)} 
                  disabled={deliveryMethod !== 'PERSONAL_DROPOFF' && (!pickupAddress || !pickupContactName || !pickupContactPhone)}
                  data-testid="button-next-step-3"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Declarations & Submit</CardTitle>
              <CardDescription>Review and accept the terms before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Card className="bg-gray-50">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vault Location:</span>
                    <span className="font-medium">{vaultLocations.find(v => v.id === vaultLocation)?.name || vaultLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gold Type:</span>
                    <span className="font-medium">{depositType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Number of Items:</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Declared Weight:</span>
                    <span className="font-medium">{totalWeight.toFixed(4)} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Method:</span>
                    <span className="font-medium">{deliveryMethod.replace(/_/g, ' ')}</span>
                  </div>
                  {pickupDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Preferred Schedule:</span>
                      <span className="font-medium">{pickupDate} {pickupTime}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Source:</span>
                    <span className="font-medium">{sourceOfMetal}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={noLienDispute}
                    onCheckedChange={(v) => setNoLienDispute(!!v)}
                    data-testid="checkbox-no-lien"
                  />
                  <div>
                    <p className="font-medium text-sm">No Liens or Disputes</p>
                    <p className="text-xs text-gray-500">
                      I confirm that the gold is free from any liens, encumbrances, or legal disputes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={acceptVaultTerms}
                    onCheckedChange={(v) => setAcceptVaultTerms(!!v)}
                    data-testid="checkbox-vault-terms"
                  />
                  <div>
                    <p className="font-medium text-sm">Vault Storage Terms</p>
                    <p className="text-xs text-gray-500">
                      I have read and accept the vault storage terms and conditions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={acceptInsurance}
                    onCheckedChange={(v) => setAcceptInsurance(!!v)}
                    data-testid="checkbox-insurance"
                  />
                  <div>
                    <p className="font-medium text-sm">Insurance Coverage</p>
                    <p className="text-xs text-gray-500">
                      I understand and accept the insurance coverage terms for stored gold.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={acceptFees}
                    onCheckedChange={(v) => setAcceptFees(!!v)}
                    data-testid="checkbox-fees"
                  />
                  <div>
                    <p className="font-medium text-sm">Fees and Charges</p>
                    <p className="text-xs text-gray-500">
                      I acknowledge and accept applicable storage fees, assay fees (if required), and handling charges.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)} data-testid="button-prev-step-4">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!noLienDispute || !acceptVaultTerms || !acceptInsurance || !acceptFees || createDepositMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-submit-deposit"
                >
                  {createDepositMutation.isPending ? 'Submitting...' : 'Submit Deposit Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
