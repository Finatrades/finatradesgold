import React, { useState, useEffect } from 'react';
import { DepositRequest, DepositItem } from '@/types/finavault';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Info, UploadCloud, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NewDepositFormProps {
  onSubmit: (data: Omit<DepositRequest, 'id' | 'status' | 'submittedAt'>) => void;
  onCancel: () => void;
}

// Mock KYC Check
const KYC_APPROVED = true; 

export default function NewDepositForm({ onSubmit, onCancel }: NewDepositFormProps) {
  const { toast } = useToast();

  // --- State ---
  const [vaultLocation, setVaultLocation] = useState<string>('Dubai Vault');
  const [items, setItems] = useState<DepositItem[]>([
    { id: '1', itemType: 'Bar', quantity: 1, weightPerUnitGrams: 0, totalWeightGrams: 0, purity: '999.9', brand: '' }
  ]);
  const [ownerChecked, setOwnerChecked] = useState(false);
  const [sourceOfMetal, setSourceOfMetal] = useState<string>('');
  const [sourceOther, setSourceOther] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'Walk-in' | 'Courier' | 'Pickup'>('Walk-in');
  
  // Pickup Details
  const [pickupAddress, setPickupAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  // Docs
  const [documents, setDocuments] = useState<{id: string, type: string, name: string}[]>([]);

  // Terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [lienChecked, setLienChecked] = useState(false);

  // --- Computed ---
  const totalWeight = items.reduce((sum, item) => sum + item.totalWeightGrams, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // --- Handlers ---
  const updateItem = (id: string, field: keyof DepositItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Auto-calc total weight
      if (field === 'quantity' || field === 'weightPerUnitGrams') {
        const qty = field === 'quantity' ? Number(value) : item.quantity;
        const weight = field === 'weightPerUnitGrams' ? Number(value) : item.weightPerUnitGrams;
        updated.totalWeightGrams = qty * weight;
      }
      
      return updated;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      itemType: 'Bar',
      quantity: 1,
      weightPerUnitGrams: 0,
      totalWeightGrams: 0,
      purity: '999.9',
      brand: ''
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocuments(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        type,
        name: file.name
      }]);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleSubmit = () => {
    // Validation
    if (!vaultLocation) { toast({ title: "Validation Error", description: "Please select a vault location", variant: "destructive" }); return; }
    if (totalWeight <= 0) { toast({ title: "Validation Error", description: "Total weight must be greater than 0", variant: "destructive" }); return; }
    if (!ownerChecked) { toast({ title: "Validation Error", description: "Please confirm ownership", variant: "destructive" }); return; }
    if (!sourceOfMetal) { toast({ title: "Validation Error", description: "Please select source of metal", variant: "destructive" }); return; }
    if (!termsAccepted || !lienChecked) { toast({ title: "Validation Error", description: "Please accept terms and conditions", variant: "destructive" }); return; }

    if (deliveryMethod === 'Pickup') {
      if (!pickupAddress || !contactName || !contactMobile || !pickupDate || !pickupTime) {
         toast({ title: "Validation Error", description: "Please complete all pickup details", variant: "destructive" }); return;
      }
    }

    // Determine deposit type
    const hasBars = items.some(i => i.itemType === 'Bar');
    const hasCoins = items.some(i => i.itemType === 'Coin');
    const depositType = (hasBars && hasCoins) ? 'Mixed' : hasBars ? 'Bars' : 'Coins';

    // Submit
    onSubmit({
      userId: 'user-1', // Mock
      vaultLocation,
      depositType,
      totalDeclaredWeightGrams: totalWeight,
      items,
      deliveryMethod,
      pickupDetails: deliveryMethod === 'Pickup' ? {
        address: pickupAddress,
        contactName,
        contactMobile,
        date: pickupDate,
        timeSlot: pickupTime
      } : undefined,
      documents
    });
  };

  if (!KYC_APPROVED) {
    return (
      <Card className="bg-red-500/10 border-red-500/20 p-8 text-center shadow-none">
        <h3 className="text-xl font-bold text-red-600 mb-2">KYC Verification Required</h3>
        <p className="text-muted-foreground mb-6">Please complete your identity verification before making deposit requests.</p>
        <Button variant="destructive">Go to KYC Verification</Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Main Form Column */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* 1. Gold Items */}
        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-medium text-foreground">1. Gold Items</CardTitle>
            <Button size="sm" onClick={addItem} className="bg-muted hover:bg-muted/80 text-foreground border border-border">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => (
              <div key={item.id} className="p-4 rounded-lg bg-muted/30 border border-border relative">
                <div className="absolute top-2 right-2 text-xs text-muted-foreground font-mono">#{index + 1}</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Type</Label>
                    <Select value={item.itemType} onValueChange={(v) => updateItem(item.id, 'itemType', v)}>
                      <SelectTrigger className="bg-background border-input h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-foreground">
                        <SelectItem value="Bar">Gold Bar</SelectItem>
                        <SelectItem value="Coin">Gold Coin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input 
                      type="number" 
                      min="1"
                      className="bg-background border-input h-9" 
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Weight/Unit (g)</Label>
                    <Input 
                      type="number" 
                      className="bg-background border-input h-9"
                      value={item.weightPerUnitGrams || ''}
                      onChange={(e) => updateItem(item.id, 'weightPerUnitGrams', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Purity</Label>
                    <Select value={item.purity} onValueChange={(v) => updateItem(item.id, 'purity', v)}>
                      <SelectTrigger className="bg-background border-input h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-foreground">
                        <SelectItem value="999.9">999.9 (24K)</SelectItem>
                        <SelectItem value="999.5">999.5</SelectItem>
                        <SelectItem value="995">995.0</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Brand / Mint</Label>
                    <Input 
                      placeholder="e.g. Valcambi, PAMP..." 
                      className="bg-background border-input h-9"
                      value={item.brand}
                      onChange={(e) => updateItem(item.id, 'brand', e.target.value)}
                    />
                  </div>
                   <div className="flex items-end gap-2">
                     <div className="space-y-2 flex-1">
                       <Label className="text-xs">Total Weight</Label>
                       <div className="h-9 px-3 flex items-center bg-white border border-border rounded-md text-sm text-secondary font-bold">
                         {item.totalWeightGrams} g
                       </div>
                     </div>
                     {items.length > 1 && (
                       <Button variant="ghost" size="icon" className="h-9 w-9 text-red-600 hover:bg-red-500/10" onClick={() => removeItem(item.id)}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     )}
                   </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 2. Ownership & Source */}
        <Card className="bg-white shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">2. Ownership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 p-3 rounded bg-muted/30 border border-border">
              <Checkbox id="owner" checked={ownerChecked} onCheckedChange={(c) => setOwnerChecked(c as boolean)} />
              <Label htmlFor="owner" className="cursor-pointer text-foreground">I confirm that I am the beneficial owner of this gold.</Label>
            </div>
            
            <div className="space-y-2">
              <Label>Source of Metal</Label>
              <Select onValueChange={setSourceOfMetal} value={sourceOfMetal}>
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue placeholder="Select origin" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="Salary / Savings">Salary / Savings</SelectItem>
                  <SelectItem value="Business Profits">Business Profits</SelectItem>
                  <SelectItem value="Inheritance">Inheritance</SelectItem>
                  <SelectItem value="Mining / Refinery">Mining / Refinery</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {sourceOfMetal === 'Other' && (
              <Input 
                placeholder="Please specify source..." 
                className="bg-background border-input"
                value={sourceOther}
                onChange={(e) => setSourceOther(e.target.value)}
              />
            )}
          </CardContent>
        </Card>

        {/* 3. Delivery Method */}
        <Card className="bg-white shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">3. Delivery Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as any)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <RadioGroupItem value="Walk-in" id="walk-in" className="peer sr-only" />
                <Label
                  htmlFor="walk-in"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-border bg-muted/10 p-4 hover:bg-muted/30 hover:text-foreground peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary cursor-pointer h-full text-center text-muted-foreground"
                >
                  <span className="mb-2 text-lg">🚶</span>
                  <span className="font-semibold">I will bring it</span>
                  <span className="text-xs text-muted-foreground/80 mt-1">Personal drop-off</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="Courier" id="courier" className="peer sr-only" />
                <Label
                  htmlFor="courier"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-border bg-muted/10 p-4 hover:bg-muted/30 hover:text-foreground peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary cursor-pointer h-full text-center text-muted-foreground"
                >
                  <span className="mb-2 text-lg">📦</span>
                  <span className="font-semibold">Courier</span>
                  <span className="text-xs text-muted-foreground/80 mt-1">Logistics arranged by me</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="Pickup" id="pickup" className="peer sr-only" />
                <Label
                  htmlFor="pickup"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-border bg-muted/10 p-4 hover:bg-muted/30 hover:text-foreground peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary cursor-pointer h-full text-center text-muted-foreground"
                >
                  <span className="mb-2 text-lg">🚚</span>
                  <span className="font-semibold">Request Pickup</span>
                  <span className="text-xs text-muted-foreground/80 mt-1">Armored transport</span>
                </Label>
              </div>
            </RadioGroup>

            {deliveryMethod === 'Pickup' && (
              <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label>Pickup Address</Label>
                  <Textarea 
                    className="bg-background border-input" 
                    placeholder="Full address for secure pickup..."
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input 
                      className="bg-background border-input" 
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Mobile</Label>
                    <Input 
                      className="bg-background border-input" 
                      value={contactMobile}
                      onChange={(e) => setContactMobile(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preferred Date</Label>
                    <Input 
                      type="date" 
                      className="bg-background border-input" 
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Slot</Label>
                    <Select value={pickupTime} onValueChange={setPickupTime}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-foreground">
                        <SelectItem value="10:00 - 12:00">10:00 - 12:00</SelectItem>
                        <SelectItem value="12:00 - 14:00">12:00 - 14:00</SelectItem>
                        <SelectItem value="14:00 - 16:00">14:00 - 16:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Documents */}
        <Card className="bg-white shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">4. Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border-2 border-dashed border-border rounded-lg hover:border-secondary/50 transition-colors text-center cursor-pointer relative bg-muted/10">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'Invoice')} />
                <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Upload Invoice</p>
                <p className="text-xs text-muted-foreground">Proof of purchase</p>
              </div>
              <div className="p-4 border-2 border-dashed border-border rounded-lg hover:border-secondary/50 transition-colors text-center cursor-pointer relative bg-muted/10">
                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'Certificate')} />
                 <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                 <p className="text-sm font-medium text-foreground">Upload Certificate</p>
                 <p className="text-xs text-muted-foreground">Assay / Purity</p>
              </div>
            </div>

            {documents.length > 0 && (
              <div className="space-y-2 mt-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border text-sm">
                    <span className="text-foreground flex items-center gap-2">
                       <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{doc.type}</span>
                       {doc.name}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => removeDocument(doc.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. Terms */}
        <div className="space-y-4 pt-4">
           <div className="flex items-start space-x-2">
              <Checkbox id="lien" checked={lienChecked} onCheckedChange={(c) => setLienChecked(c as boolean)} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="lien" className="text-sm font-medium leading-none text-foreground cursor-pointer">
                  I confirm the gold is free from any lien, dispute, or encumbrance.
                </Label>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(c as boolean)} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="terms" className="text-sm font-medium leading-none text-foreground cursor-pointer">
                  I accept the vault storage terms, insurance policy, and fee structure.
                </Label>
                <p className="text-xs text-muted-foreground">Estimated storage fee applies upon acceptance.</p>
              </div>
            </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={handleSubmit} className="flex-1 bg-primary text-white hover:bg-primary/90 font-bold h-12">
            Submit Deposit Request
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1 border-border hover:bg-muted text-foreground h-12">
            Cancel
          </Button>
        </div>

      </div>

      {/* Right Sidebar - Summary */}
      <div className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <Card className="bg-secondary/5 border-secondary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-secondary">Deposit Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="text-foreground font-medium">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Weight</span>
                <span className="text-foreground font-bold">{totalWeight} g</span>
              </div>
              <Separator className="bg-secondary/20" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Value (USD)</span>
                <span className="text-secondary font-bold">~${(totalWeight * 85.22).toFixed(2)}</span>
              </div>
              <div className="mt-4 p-3 bg-secondary/10 rounded border border-secondary/20">
                <p className="text-xs text-secondary flex gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Upon verification at the vault, <strong>{totalWeight}g</strong> of Gold will be credited to your FinaPay Wallet.</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
