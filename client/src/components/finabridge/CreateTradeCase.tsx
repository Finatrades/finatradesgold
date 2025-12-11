import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TradeCase, FinaBridgeWallet } from '@/types/finabridge';
import { Lock, ArrowRight, Save, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateTradeCaseProps {
  onSuccess: (newCase: TradeCase, lockAmount: number) => void;
  wallet: FinaBridgeWallet;
  currentRole: 'Importer' | 'Exporter';
}

export default function CreateTradeCase({ onSuccess, wallet, currentRole }: CreateTradeCaseProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<TradeCase>>({
    role: currentRole,
    status: 'Draft',
    valueUsd: 0,
    valueGoldGrams: 0,
    lockedGoldGrams: 0,
    buyer: { company: '', country: '', contactName: '', email: '' },
    seller: { company: '', country: '', contactName: '', email: '' },
  });
  const [valueMode, setValueMode] = useState<'USD' | 'GOLD'>('USD');
  const [lockAmount, setLockAmount] = useState<string>('0');

  const GOLD_PRICE = 85.22; // Mock price

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent: 'buyer' | 'seller', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleValueChange = (val: string) => {
    const num = parseFloat(val) || 0;
    if (valueMode === 'USD') {
      setFormData(prev => ({
        ...prev,
        valueUsd: num,
        valueGoldGrams: num / GOLD_PRICE
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        valueGoldGrams: num,
        valueUsd: num * GOLD_PRICE
      }));
    }
  };

  const handleSubmit = (isDraft: boolean) => {
    const lockAmt = parseFloat(lockAmount) || 0;
    
    if (!isDraft && lockAmt > 0 && lockAmt > wallet.importer.availableGoldGrams) {
       toast({ title: "Insufficient Funds", description: "You don't have enough available gold to lock.", variant: "destructive" });
       return;
    }

    const newCase: TradeCase = {
      id: `TF-2025-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      ...formData as TradeCase,
      status: isDraft ? 'Draft' : (lockAmt > 0 ? 'Funded – Docs Pending' : 'Awaiting Funding'),
      lockedGoldGrams: lockAmt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      riskLevel: 'Low',
      amlStatus: 'Clear'
    };

    onSuccess(newCase, lockAmt);
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-8 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Create New Trade Case</h2>
        <div className="text-white/40 text-sm">Step {step} of 4</div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 h-1 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-[#D4AF37] transition-all duration-300" style={{ width: `${step * 25}%` }} />
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8">
          
          {/* STEP 1: BASIC DETAILS */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="p-3 bg-black/20 border border-white/10 rounded-md text-white/60">
                    {formData.role}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Case Name</Label>
                  <Input 
                    placeholder="e.g. Gold Bullion Import - Batch A" 
                    className="bg-black/20 border-white/10"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Contract Number</Label>
                  <Input 
                     className="bg-black/20 border-white/10"
                     onChange={(e) => updateField('contractNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery</Label>
                  <Input 
                    type="date" 
                    className="bg-black/20 border-white/10"
                    onChange={(e) => updateField('expectedDeliveryDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Commodity Description</Label>
                <Textarea 
                  placeholder="Describe the goods..." 
                  className="bg-black/20 border-white/10 h-24"
                  value={formData.commodityDescription || ''}
                  onChange={(e) => updateField('commodityDescription', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: COUNTERPARTY INFO */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Counterparty Information</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input 
                    className="bg-black/20 border-white/10"
                    value={currentRole === 'Importer' ? formData.seller?.company : formData.buyer?.company}
                    onChange={(e) => updateNestedField(currentRole === 'Importer' ? 'seller' : 'buyer', 'company', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input 
                    className="bg-black/20 border-white/10"
                    value={currentRole === 'Importer' ? formData.seller?.country : formData.buyer?.country}
                    onChange={(e) => updateNestedField(currentRole === 'Importer' ? 'seller' : 'buyer', 'country', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input 
                    className="bg-black/20 border-white/10"
                    value={currentRole === 'Importer' ? formData.seller?.contactName : formData.buyer?.contactName}
                    onChange={(e) => updateNestedField(currentRole === 'Importer' ? 'seller' : 'buyer', 'contactName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    className="bg-black/20 border-white/10"
                    value={currentRole === 'Importer' ? formData.seller?.email : formData.buyer?.email}
                    onChange={(e) => updateNestedField(currentRole === 'Importer' ? 'seller' : 'buyer', 'email', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select onValueChange={(val) => updateField('paymentTerms', val)}>
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue placeholder="Select Terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                    <SelectItem value="Letter of Credit">Letter of Credit (LC)</SelectItem>
                    <SelectItem value="Cash Against Documents">Cash Against Documents (CAD)</SelectItem>
                    <SelectItem value="Open Account">Open Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 3: SHIPMENT & TERMS */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <Label>Incoterms</Label>
                   <Select onValueChange={(val) => updateField('deliveryTerms', val)}>
                    <SelectTrigger className="bg-black/20 border-white/10">
                      <SelectValue placeholder="Select Incoterm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOB">FOB (Free On Board)</SelectItem>
                      <SelectItem value="CIF">CIF (Cost, Insurance, Freight)</SelectItem>
                      <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                      <SelectItem value="DAP">DAP (Delivered at Place)</SelectItem>
                    </SelectContent>
                  </Select>
                 </div>
                 <div className="space-y-2">
                   <Label>Shipment Method</Label>
                   <Select onValueChange={(val) => updateField('shipmentMethod', val)}>
                    <SelectTrigger className="bg-black/20 border-white/10">
                      <SelectValue placeholder="Select Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Air Freight">Air Freight</SelectItem>
                      <SelectItem value="Sea Freight">Sea Freight</SelectItem>
                      <SelectItem value="Land Transport">Land Transport</SelectItem>
                      <SelectItem value="Secure Logistics">Secure Logistics</SelectItem>
                    </SelectContent>
                  </Select>
                 </div>
               </div>
            </div>
          )}

          {/* STEP 4: VALUE & LOCKING */}
          {step === 4 && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               
               {/* Value Input */}
               <div className="space-y-4">
                 <Label>Contract Value</Label>
                 <div className="flex gap-4 mb-2">
                   <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        checked={valueMode === 'USD'} 
                        onChange={() => setValueMode('USD')}
                        className="accent-[#D4AF37]"
                      />
                      <span className="text-sm text-white">USD</span>
                   </div>
                   <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        checked={valueMode === 'GOLD'} 
                        onChange={() => setValueMode('GOLD')}
                        className="accent-[#D4AF37]"
                      />
                      <span className="text-sm text-white">Gold (g)</span>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="relative">
                      <Input 
                        type="number"
                        placeholder="0.00"
                        className="bg-black/20 border-white/10 pl-8 text-lg"
                        onChange={(e) => handleValueChange(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">
                        {valueMode === 'USD' ? '$' : 'g'}
                      </span>
                   </div>
                   <div className="flex items-center px-4 bg-white/5 border border-white/10 rounded-md text-white/60 text-sm">
                      Equivalent: {valueMode === 'USD' 
                        ? `${formData.valueGoldGrams?.toFixed(3)} g` 
                        : `$${formData.valueUsd?.toLocaleString()}`
                      }
                   </div>
                 </div>
               </div>

               {/* Locking Section (Only for Importer) */}
               {currentRole === 'Importer' && (
                 <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-6 rounded-xl space-y-4">
                   <div className="flex items-start gap-3">
                     <div className="p-2 bg-[#D4AF37]/20 rounded-lg text-[#D4AF37]">
                       <Lock className="w-5 h-5" />
                     </div>
                     <div>
                       <h4 className="text-[#D4AF37] font-bold">Lock Settlement Value</h4>
                       <p className="text-sm text-white/60">Reserve gold from your FinaBridge wallet to fund this trade.</p>
                     </div>
                   </div>

                   <div className="flex justify-between text-sm py-2 border-b border-white/10">
                      <span className="text-white/60">Available in Wallet:</span>
                      <span className="font-bold text-white">{wallet.importer.availableGoldGrams.toFixed(3)} g</span>
                   </div>

                   <div className="space-y-2">
                     <Label>Gold to Lock (g)</Label>
                     <Input 
                       type="number" 
                       className="bg-black/20 border-white/10"
                       value={lockAmount}
                       onChange={(e) => setLockAmount(e.target.value)}
                     />
                     <p className="text-xs text-white/40">Suggested: {formData.valueGoldGrams?.toFixed(3)} g</p>
                   </div>
                 </div>
               )}

             </div>
          )}

        </CardContent>
      </Card>

      {/* Footer Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          variant="outline" 
          onClick={handleBack}
          disabled={step === 1}
          className="border-white/10 text-white hover:bg-white/5"
        >
          Back
        </Button>
        
        {step < 4 ? (
          <Button 
            onClick={handleNext}
            className="bg-white text-black hover:bg-white/90"
          >
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleSubmit(true)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button 
              onClick={() => handleSubmit(false)}
              className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> 
              {parseFloat(lockAmount) > 0 ? "Create & Fund Case" : "Create Case"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
