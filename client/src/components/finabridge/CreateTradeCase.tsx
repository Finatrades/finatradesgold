import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TradeCase, FinaBridgeWallet } from '@/types/finabridge';
import { Lock, ArrowRight, Save, CheckCircle2, Upload, Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { TradeItem } from '@/types/finabridge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface CreateTradeCaseProps {
  onSuccess: (newCase: TradeCase, lockAmount: number) => void;
  wallet: FinaBridgeWallet;
  currentRole: 'Importer' | 'Exporter';
  finaPayBalanceGold?: number;
  onTransferFromFinaPay?: (amount: number) => void;
}

export default function CreateTradeCase({ onSuccess, wallet, currentRole, finaPayBalanceGold = 0, onTransferFromFinaPay }: CreateTradeCaseProps) {
  const { toast } = useToast();
  // Removed step state
  const [formData, setFormData] = useState<Partial<TradeCase>>({
    role: currentRole,
    status: 'Draft',
    valueUsd: 0,
    valueGoldGrams: 0,
    lockedGoldGrams: 0,
    buyer: { company: '', country: '', contactName: '', email: '' },
    seller: { company: '', country: '', contactName: '', email: '' },
    items: [],
    loadingPort: 'Jebel Ali (AEAEX)',
    destinationPort: 'Nhava Sheva (IN/NSA)',
    deliveryTimeframe: '15-20 days',
  });
  const [valueMode, setValueMode] = useState<'USD' | 'GOLD'>('USD');
  const [lockAmount, setLockAmount] = useState<string>('0');
  const [useFinatradesExporter, setUseFinatradesExporter] = useState(false);
  const [items, setItems] = useState<TradeItem[]>([]);
  const [otherDocDescription, setOtherDocDescription] = useState('');
  const [isOtherDocSelected, setIsOtherDocSelected] = useState(false);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');

  const GOLD_PRICE = 85.22; // Mock price

  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }
    if (amount > finaPayBalanceGold) {
      toast({ title: "Insufficient Balance", description: "Not enough gold in FinaPay wallet.", variant: "destructive" });
      return;
    }
    
    if (onTransferFromFinaPay) {
        onTransferFromFinaPay(amount);
        setIsTransferModalOpen(false);
        setTransferAmount('');
        toast({ title: "Transfer Successful", description: `Transferred ${amount.toFixed(2)}g from FinaPay to FinaBridge Wallet.` });
    }
  };

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

  const calculateTotal = (currentItems: TradeItem[]) => {
    const total = currentItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setFormData(prev => ({
      ...prev,
      valueUsd: total,
      valueGoldGrams: total / GOLD_PRICE
    }));
  };

  const addItem = () => {
    const newItem: TradeItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      hsCode: '',
      quantity: 0,
      uom: 'KG',
      unitPrice: 0,
      currency: 'USD'
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    calculateTotal(newItems);
  };

  const updateItem = (id: string, field: keyof TradeItem, value: any) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: field === 'quantity' || field === 'unitPrice' ? parseFloat(value) || 0 : value };
      }
      return item;
    });
    setItems(newItems);
    calculateTotal(newItems);
  };

  const removeItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    calculateTotal(newItems);
  };

  const handleSubmit = (isDraft: boolean) => {
    const lockAmt = parseFloat(lockAmount) || 0;
    
    if (!isDraft && lockAmt > 0 && lockAmt > wallet.importer.availableGoldGrams) {
       toast({ title: "Insufficient Funds", description: "You don't have enough available gold to lock.", variant: "destructive" });
       return;
    }

    let finalSeller = formData.seller;
    if (useFinatradesExporter && currentRole === 'Importer') {
      finalSeller = {
        company: 'Pending Finatrades Assignment',
        country: 'Global',
        contactName: 'FinaTrades Broker Desk',
        email: 'broker@finatrades.com'
      };
    }

    const newCase: TradeCase = {
      ...formData as TradeCase,
      id: `TF-2025-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      items: items,
      seller: finalSeller || { company: '', country: '', contactName: '', email: '' },
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
    <div className="max-w-5xl mx-auto py-6">
      <div className="mb-8 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Create New Trade</h2>
      </div>

      <div className="space-y-8">
        
        {/* SECTION 1: BASIC DETAILS */}
        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-lg font-bold text-foreground">1. Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="p-3 bg-muted border border-border rounded-md text-muted-foreground">
                    {formData.role}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Trade Name</Label>
                  <Input 
                    placeholder="e.g. Gold Bullion Import - Batch A" 
                    className="bg-background border-input"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Contract Number</Label>
                  <Input 
                     className="bg-background border-input"
                     onChange={(e) => updateField('contractNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery</Label>
                  <Input 
                    type="date" 
                    className="bg-background border-input"
                    onChange={(e) => updateField('expectedDeliveryDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Commodity Description</Label>
                <Textarea 
                  placeholder="Describe the goods..." 
                  className="bg-background border-input h-24"
                  value={formData.commodityDescription || ''}
                  onChange={(e) => updateField('commodityDescription', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: EXPORTER INFO */}
        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-foreground">2. Exporter Information</CardTitle>
            {currentRole === 'Importer' && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="use-finatrades" 
                  checked={useFinatradesExporter}
                  onCheckedChange={(checked) => setUseFinatradesExporter(checked as boolean)}
                  className="border-muted-foreground data-[state=checked]:bg-secondary data-[state=checked]:text-white"
                />
                <label
                  htmlFor="use-finatrades"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-secondary"
                >
                  Suggest Finatrades Exporter
                </label>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className={`space-y-6 transition-opacity duration-200 ${useFinatradesExporter ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Company Name <span className="text-red-500">*</span></Label>
                  <Input 
                    className="bg-background border-input"
                    placeholder="Enter company name"
                    value={useFinatradesExporter ? 'Pending Finatrades Assignment' : (currentRole === 'Importer' ? formData.seller?.company : formData.buyer?.company)}
                    onChange={(e) => updateNestedField(currentRole === 'Importer' ? 'seller' : 'buyer', 'company', e.target.value)}
                    disabled={useFinatradesExporter}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country <span className="text-red-500">*</span></Label>
                  <Input 
                    className="bg-background border-input"
                    placeholder="e.g., United Arab Emirates"
                    value={useFinatradesExporter ? 'Global' : (currentRole === 'Importer' ? formData.seller?.country : formData.buyer?.country)}
                    onChange={(e) => updateNestedField(currentRole === 'Importer' ? 'seller' : 'buyer', 'country', e.target.value)}
                    disabled={useFinatradesExporter}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input 
                    className="bg-background border-input"
                    placeholder="John Doe"
                    value={useFinatradesExporter ? 'FinaTrades Broker Desk' : (currentRole === 'Importer' ? formData.seller?.contactName : formData.buyer?.contactName)}
                    onChange={(e) => updateNestedField(currentRole === 'Importer' ? 'seller' : 'buyer', 'contactName', e.target.value)}
                    disabled={useFinatradesExporter}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email <span className="text-red-500">*</span></Label>
                  <Input 
                    className="bg-background border-input"
                    placeholder="contact@company.com"
                    value={useFinatradesExporter ? 'broker@finatrades.com' : (currentRole === 'Importer' ? formData.seller?.email : formData.buyer?.email)}
                    onChange={(e) => updateNestedField(currentRole === 'Importer' ? 'seller' : 'buyer', 'email', e.target.value)}
                    disabled={useFinatradesExporter}
                  />
                </div>
              </div>

              {!useFinatradesExporter && currentRole === 'Importer' && (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Mobile Number <span className="text-red-500">*</span></Label>
                      <Input 
                        className="bg-background border-input"
                        placeholder="+971 50 123 4567"
                        value={formData.seller?.mobile || ''}
                        onChange={(e) => updateNestedField('seller', 'mobile', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input 
                        className="bg-background border-input"
                        placeholder="Bank name"
                        value={formData.seller?.bankName || ''}
                        onChange={(e) => updateNestedField('seller', 'bankName', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea 
                      className="bg-background border-input h-20"
                      placeholder="Full address"
                      value={formData.seller?.address || ''}
                      onChange={(e) => updateNestedField('seller', 'address', e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select onValueChange={(val) => updateField('paymentTerms', val)} disabled={useFinatradesExporter}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Select Terms" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                    <SelectItem value="Letter of Credit">Letter of Credit (LC)</SelectItem>
                    <SelectItem value="Cash Against Documents">Cash Against Documents (CAD)</SelectItem>
                    <SelectItem value="Open Account">Open Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {useFinatradesExporter ? (
              <div className="mt-4 p-4 bg-secondary/10 border border-secondary/20 rounded-lg text-secondary text-sm flex items-center justify-center animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Finatrades will assign a verified exporter to match your trade requirements.
              </div>
            ) : currentRole === 'Importer' && (
               <div className="mt-8 p-6 bg-muted/30 border border-border rounded-lg">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h4 className="font-bold text-foreground mb-1">Required Exporter Documents</h4>
                        <p className="text-xs text-muted-foreground">Exporter should upload all the necessary documents</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                        <div 
                             className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                             onClick={() => toast({ title: "Upload", description: "File selection dialog would open here" })}
                        >
                            <Upload className="w-4 h-4 text-secondary" />
                            <span className="text-sm text-muted-foreground">Click to upload</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50">PDF, JPG, PNG, DOC... (Max 10MB)</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {[
                       'Certificate of Origin', 
                       'Inspection / Quality Certificate', 
                       'Bill of Lading (B/L)', 
                       'Commercial Invoice', 
                       'Packing List', 
                       'Insurance Certificate',
                       'Agreements / Contract Copy',
                       'Other'
                   ].map((doc) => (
                     <div key={doc} className="flex flex-col space-y-2 p-2 rounded hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <Checkbox 
                                id={`doc-${doc.replace(/\s+/g, '-')}`} 
                                className="border-muted-foreground/40 data-[state=checked]:bg-secondary data-[state=checked]:text-white" 
                                onCheckedChange={(checked) => {
                                    if (doc === 'Other') {
                                        setIsOtherDocSelected(checked as boolean);
                                    }
                                }}
                            />
                            <label 
                                htmlFor={`doc-${doc.replace(/\s+/g, '-')}`} 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground cursor-pointer"
                            >
                                {doc}
                            </label>
                        </div>
                        {doc === 'Other' && isOtherDocSelected && (
                            <div className="pl-7 w-full animate-in fade-in slide-in-from-top-1">
                                <Input 
                                    className="bg-background border-input h-8 text-sm"
                                    placeholder="Please specify other documents..."
                                    value={otherDocDescription}
                                    onChange={(e) => setOtherDocDescription(e.target.value)}
                                />
                            </div>
                        )}
                     </div>
                   ))}
                 </div>
                 
                 <div className="mt-6 pt-4 border-t border-border flex items-center justify-end text-xs text-muted-foreground">
                    <span>0 file(s) uploaded</span>
                 </div>
               </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 3: PRODUCT & TRANSACTION */}
        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-lg font-bold text-foreground">3. Product & Transaction</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <Label>Incoterms</Label>
                   <Select onValueChange={(val) => updateField('deliveryTerms', val)}>
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Select Incoterm" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-foreground">
                      <SelectItem value="FOB">FOB (Free On Board)</SelectItem>
                      <SelectItem value="CIF">CIF (Cost, Insurance, Freight)</SelectItem>
                      <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                      <SelectItem value="DAP">DAP (Delivered at Place)</SelectItem>
                    </SelectContent>
                  </Select>
                 </div>
                 <div className="space-y-2">
                   <Label>Payment Terms</Label>
                   <Select onValueChange={(val) => updateField('paymentTerms', val)}>
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Select Terms" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-foreground">
                      <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                      <SelectItem value="Letter of Credit">Letter of Credit (LC)</SelectItem>
                      <SelectItem value="Cash Against Documents">Cash Against Documents (CAD)</SelectItem>
                      <SelectItem value="Open Account">Open Account</SelectItem>
                    </SelectContent>
                  </Select>
                 </div>
               </div>

               <div className="grid grid-cols-3 gap-6">
                 <div className="space-y-2">
                   <Label>Loading Port</Label>
                   <Input 
                      className="bg-background border-input"
                      value={formData.loadingPort}
                      onChange={(e) => updateField('loadingPort', e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Destination Port</Label>
                   <Input 
                      className="bg-background border-input"
                      value={formData.destinationPort}
                      onChange={(e) => updateField('destinationPort', e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Delivery Timeframe</Label>
                   <Input 
                      className="bg-background border-input"
                      value={formData.deliveryTimeframe}
                      onChange={(e) => updateField('deliveryTimeframe', e.target.value)}
                   />
                 </div>
               </div>

               {/* Items Table */}
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <Label>Items & HS Codes</Label>
                    <Button size="sm" onClick={addItem} className="bg-secondary text-white hover:bg-secondary/90 h-8 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </Button>
                 </div>
                 
                 <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground font-medium">
                        <tr>
                          <th className="p-3">Description</th>
                          <th className="p-3 w-24">HS Code</th>
                          <th className="p-3 w-20 text-right">Qty</th>
                          <th className="p-3 w-20">UoM</th>
                          <th className="p-3 w-28 text-right">Unit Price</th>
                          <th className="p-3 w-20">Curr</th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {items.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-white/40 italic">
                              No items added yet. Click "Add Item" to start.
                            </td>
                          </tr>
                        )}
                        {items.map((item) => (
                          <tr key={item.id} className="group hover:bg-white/5">
                            <td className="p-2">
                              <Input 
                                className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/20"
                                placeholder="Item Description"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <Input 
                                className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/20"
                                placeholder="HS Code"
                                value={item.hsCode}
                                onChange={(e) => updateItem(item.id, 'hsCode', e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <Input 
                                type="number"
                                className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 text-right"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <Input 
                                className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 uppercase"
                                value={item.uom}
                                onChange={(e) => updateItem(item.id, 'uom', e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <Input 
                                type="number"
                                className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 text-right"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <Input 
                                className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 uppercase"
                                value={item.currency}
                                onChange={(e) => updateItem(item.id, 'currency', e.target.value)}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {items.length > 0 && (
                        <tfoot className="bg-white/5 font-bold">
                          <tr>
                            <td colSpan={4} className="p-3 text-right text-white/60">Total (calc):</td>
                            <td className="p-3 text-right text-[#D4AF37] text-lg">
                              US$ {formData.valueUsd?.toLocaleString()}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                 </div>
               </div>

            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: SETTLEMENT & LOCKING */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="border-b border-white/10 pb-4">
            <CardTitle className="text-lg font-bold text-white">4. Settlement & Locking</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             <div className="space-y-8">
               
               {/* Value Display */}
               <div className="space-y-4">
                 <div className="flex justify-between items-center bg-black/20 p-4 rounded-lg border border-white/10">
                    <div>
                      <Label className="text-white/60">Total Contract Value</Label>
                      <p className="text-2xl font-bold text-white mt-1">US$ {formData.valueUsd?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <Label className="text-white/60">Gold Equivalent</Label>
                      <p className="text-xl font-bold text-[#D4AF37] mt-1 font-mono">{formData.valueGoldGrams?.toFixed(3)} g</p>
                      <p className="text-xs text-white/40">@ ${GOLD_PRICE}/g</p>
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
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                            <div className="font-bold text-white">${(wallet.importer.availableGoldGrams * GOLD_PRICE).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                            <div className="text-[10px] text-white/40">{wallet.importer.availableGoldGrams.toFixed(3)} g</div>
                        </div>
                        {onTransferFromFinaPay && (
                            <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                className="h-6 text-[10px] border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 ml-2"
                                onClick={() => setIsTransferModalOpen(true)}
                            >
                                <ArrowRightLeft className="w-3 h-3 mr-1" /> Add Funds
                            </Button>
                        )}
                      </div>
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

               {/* Fee Breakdown */}
               <div className="bg-black/20 p-4 rounded-lg border border-white/10 space-y-2">
                  <h4 className="text-sm font-bold text-white">Estimated Fee Breakdown</h4>
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Platform Service Fee (0.5%)</span>
                    <span>${((formData.valueUsd || 0) * 0.005).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Regulatory & Compliance Check</span>
                    <span>$250.00</span>
                  </div>
                  <div className="border-t border-white/10 my-2"></div>
                  <div className="flex justify-between text-sm font-bold text-white">
                    <span>Total Estimated Cost</span>
                    <span>${((formData.valueUsd || 0) * 1.005 + 250).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
               </div>

             </div>
          </CardContent>
        </Card>

        {/* SECTION 5: LOGISTICS & SERVICES */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="border-b border-white/10 pb-4">
            <CardTitle className="text-lg font-bold text-white">5. Logistics & Additional Services</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-base">Cargo Insurance</Label>
                  <RadioGroup defaultValue="self" onValueChange={(val) => updateField('insuranceOption', val === 'finatrades' ? 'Finatrades Premium' : 'Self-Arranged')}>
                    <div className="flex items-center space-x-2 border border-white/10 p-3 rounded-lg hover:bg-white/5 transition-colors">
                      <RadioGroupItem value="finatrades" id="ins-fina" className="border-white/40 text-[#D4AF37]" />
                      <Label htmlFor="ins-fina" className="cursor-pointer flex-1">
                        <span className="block font-bold text-white">Finatrades Premium Insurance</span>
                        <span className="block text-xs text-white/60">Full coverage via Lloyd's of London partners</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-white/10 p-3 rounded-lg hover:bg-white/5 transition-colors">
                      <RadioGroupItem value="self" id="ins-self" className="border-white/40 text-[#D4AF37]" />
                      <Label htmlFor="ins-self" className="cursor-pointer flex-1">
                        <span className="block font-bold text-white">Self-Arranged Insurance</span>
                        <span className="block text-xs text-white/60">Upload policy document later</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Logistics Provider</Label>
                  <RadioGroup defaultValue="self" onValueChange={(val) => updateField('logisticsOption', val === 'finatrades' ? 'Finatrades Secure' : 'Self-Arranged')}>
                    <div className="flex items-center space-x-2 border border-white/10 p-3 rounded-lg hover:bg-white/5 transition-colors">
                      <RadioGroupItem value="finatrades" id="log-fina" className="border-white/40 text-[#D4AF37]" />
                      <Label htmlFor="log-fina" className="cursor-pointer flex-1">
                        <span className="block font-bold text-white">Finatrades Secure Logistics</span>
                        <span className="block text-xs text-white/60">End-to-end secure transport (Brinks/G4S)</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-white/10 p-3 rounded-lg hover:bg-white/5 transition-colors">
                      <RadioGroupItem value="self" id="log-self" className="border-white/40 text-[#D4AF37]" />
                      <Label htmlFor="log-self" className="cursor-pointer flex-1">
                        <span className="block font-bold text-white">Self-Arranged Logistics</span>
                        <span className="block text-xs text-white/60">Exporter/Importer manages shipment</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-3">
                 <Checkbox 
                    id="inspection-req" 
                    className="border-blue-400 data-[state=checked]:bg-blue-500"
                    onCheckedChange={(checked) => updateField('inspectionRequired', checked as boolean)}
                 />
                 <label htmlFor="inspection-req" className="text-sm text-white cursor-pointer">
                    <span className="font-bold block">Request Third-Party Inspection (SGS / Bureau Veritas)</span>
                    <span className="text-white/60 text-xs">A qualified inspector will verify goods quality and quantity at loading port.</span>
                 </label>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* SECTION 6: COMPLIANCE & LEGAL */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="border-b border-white/10 pb-4">
            <CardTitle className="text-lg font-bold text-white">6. Compliance & Legal Declarations</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
               <div className="flex items-start space-x-3 p-3 hover:bg-white/5 rounded-lg transition-colors">
                 <Checkbox id="kyc-confirm" className="mt-1 border-white/40 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black" />
                 <label htmlFor="kyc-confirm" className="text-sm text-white/80 leading-relaxed cursor-pointer">
                   I certify that the funds used for this transaction are derived from legitimate sources and comply with all applicable Anti-Money Laundering (AML) and Counter-Terrorism Financing (CTF) laws.
                 </label>
               </div>
               
               <div className="flex items-start space-x-3 p-3 hover:bg-white/5 rounded-lg transition-colors">
                 <Checkbox id="sanctions-confirm" className="mt-1 border-white/40 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black" />
                 <label htmlFor="sanctions-confirm" className="text-sm text-white/80 leading-relaxed cursor-pointer">
                   I declare that neither the company nor any beneficial owners are currently subject to any international economic sanctions (OFAC, EU, UN).
                 </label>
               </div>

               <div className="flex items-start space-x-3 p-3 hover:bg-white/5 rounded-lg transition-colors">
                 <Checkbox id="terms-confirm" className="mt-1 border-white/40 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black" />
                 <label htmlFor="terms-confirm" className="text-sm text-white/80 leading-relaxed cursor-pointer">
                   I have read and agree to the <span className="text-[#D4AF37] underline">Master Trade Agreement</span> and <span className="text-[#D4AF37] underline">Platform Terms of Service</span>. I understand that FinaTrades acts as a neutral facilitator and escrow agent.
                 </label>
               </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-3 mt-8 sticky bottom-6 bg-[#0D0515]/80 backdrop-blur-md p-4 rounded-xl border border-white/10">
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
          {parseFloat(lockAmount) > 0 ? "Create & Fund Trade" : "Create Trade"}
        </Button>
      </div>

      {/* Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="bg-[#1A0A2E] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transfer Gold from FinaPay</DialogTitle>
            <DialogDescription className="text-white/60">
              Move gold from your main FinaPay wallet to your Trade Finance wallet to fund this trade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
             <div className="p-4 bg-black/20 rounded-lg border border-white/5 space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-white/60">Available in FinaPay:</span>
                 <span className="text-[#D4AF37] font-bold">{finaPayBalanceGold.toFixed(3)} g</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-white/60">Current Trade Wallet:</span>
                 <span className="text-white font-bold">{wallet.importer.availableGoldGrams.toFixed(3)} g</span>
               </div>
             </div>

             <div className="space-y-2">
               <Label>Amount to Transfer (g)</Label>
               <div className="relative">
                 <Input 
                   type="number" 
                   placeholder="0.00" 
                   className="bg-black/20 border-white/10 pl-4 pr-12 text-lg"
                   value={transferAmount}
                   onChange={(e) => setTransferAmount(e.target.value)}
                 />
                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">g</span>
               </div>
             </div>

             <Button 
               className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold"
               onClick={handleTransfer}
             >
               Confirm Transfer
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
