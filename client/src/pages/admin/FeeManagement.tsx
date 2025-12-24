import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Percent, Plus, Edit, Trash2, Loader2, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PlatformFee {
  id: string;
  module: 'FinaPay' | 'FinaVault' | 'BNSL' | 'FinaBridge';
  feeKey: string;
  feeName: string;
  description?: string;
  feeType: string;
  feeValue: string;
  minAmount?: string;
  maxAmount?: string;
  isActive: boolean;
  displayOrder: number;
}

const MODULES = ['FinaPay', 'FinaVault', 'BNSL', 'FinaBridge'] as const;

export default function FeeManagement() {
  const [fees, setFees] = useState<PlatformFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFee, setEditingFee] = useState<PlatformFee | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('FinaPay');
  
  const [formData, setFormData] = useState<{
    module: 'FinaPay' | 'FinaVault' | 'BNSL' | 'FinaBridge';
    feeKey: string;
    feeName: string;
    description: string;
    feeType: string;
    feeValue: string;
    minAmount: string;
    maxAmount: string;
    isActive: boolean;
    displayOrder: number;
  }>({
    module: 'FinaPay',
    feeKey: '',
    feeName: '',
    description: '',
    feeType: 'percentage',
    feeValue: '',
    minAmount: '',
    maxAmount: '',
    isActive: true,
    displayOrder: 0
  });

  const fetchFees = async () => {
    setLoading(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('GET', '/api/admin/fees');
      const data = await res.json();
      setFees(data.fees || []);
    } catch (err) {
      toast.error('Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultFees = async () => {
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      await apiRequest('POST', '/api/admin/fees/seed');
      toast.success('Default fees seeded successfully');
      fetchFees();
    } catch (err) {
      toast.error('Failed to seed default fees');
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handleCreate = async () => {
    if (!formData.feeKey || !formData.feeName || !formData.feeValue) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      await apiRequest('POST', '/api/admin/fees', formData);
      toast.success('Fee created successfully');
      setCreateOpen(false);
      resetForm();
      fetchFees();
    } catch (err) {
      toast.error('Failed to create fee');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingFee) return;
    setSaving(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const updateData = {
        ...formData,
        minAmount: formData.minAmount || null,
        maxAmount: formData.maxAmount || null,
      };
      await apiRequest('PUT', `/api/admin/fees/${editingFee.id}`, updateData);
      toast.success('Fee updated successfully');
      setEditingFee(null);
      resetForm();
      fetchFees();
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to update fee';
      toast.error(errorMessage);
      console.error('Fee update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee?')) return;
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      await apiRequest('DELETE', `/api/admin/fees/${id}`);
      toast.success('Fee deleted');
      fetchFees();
    } catch (err) {
      toast.error('Failed to delete fee');
    }
  };

  const handleToggleActive = async (fee: PlatformFee) => {
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      await apiRequest('PUT', `/api/admin/fees/${fee.id}`, { isActive: !fee.isActive });
      toast.success(`Fee ${fee.isActive ? 'disabled' : 'enabled'}`);
      fetchFees();
    } catch (err) {
      toast.error('Failed to update fee');
    }
  };

  const handleQuickUpdate = async (fee: PlatformFee, newValue: string) => {
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      await apiRequest('PUT', `/api/admin/fees/${fee.id}`, { feeValue: newValue });
      toast.success('Fee value updated');
      fetchFees();
    } catch (err) {
      toast.error('Failed to update fee');
    }
  };

  const openEdit = (fee: PlatformFee) => {
    setFormData({
      module: fee.module,
      feeKey: fee.feeKey,
      feeName: fee.feeName,
      description: fee.description || '',
      feeType: fee.feeType,
      feeValue: fee.feeValue,
      minAmount: fee.minAmount || '',
      maxAmount: fee.maxAmount || '',
      isActive: fee.isActive,
      displayOrder: fee.displayOrder
    });
    setEditingFee(fee);
  };

  const resetForm = () => {
    setFormData({
      module: 'FinaPay',
      feeKey: '',
      feeName: '',
      description: '',
      feeType: 'percentage',
      feeValue: '',
      minAmount: '',
      maxAmount: '',
      isActive: true,
      displayOrder: 0
    });
  };

  const getModuleFees = (module: string) => fees.filter(f => f.module === module);

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'FinaPay': return '💳';
      case 'FinaVault': return '🏦';
      case 'BNSL': return '📈';
      case 'FinaBridge': return '🌉';
      default: return '💰';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fee Management</h1>
            <p className="text-muted-foreground">Configure platform-wide fees for all modules</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchFees} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {fees.length === 0 && (
              <Button variant="outline" onClick={seedDefaultFees}>
                <AlertCircle className="w-4 h-4 mr-2" />
                Seed Default Fees
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-fee">
              <Plus className="w-4 h-4 mr-2" />
              Add Fee
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <p className="mt-2 text-muted-foreground">Loading fees...</p>
            </CardContent>
          </Card>
        ) : fees.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Fees Configured</h3>
              <p className="text-muted-foreground mb-4">Click "Seed Default Fees" to add the standard platform fees, or create custom fees.</p>
              <Button onClick={seedDefaultFees}>
                Seed Default Fees
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              {MODULES.map((module) => (
                <TabsTrigger key={module} value={module} className="gap-2">
                  <span>{getModuleIcon(module)}</span>
                  {module}
                  <Badge variant="secondary" className="ml-1">
                    {getModuleFees(module).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {MODULES.map((module) => (
              <TabsContent key={module} value={module}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{getModuleIcon(module)}</span>
                      {module} Fees
                    </CardTitle>
                    <CardDescription>Configure fees for {module} transactions and services</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getModuleFees(module).length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No fees configured for this module.</p>
                    ) : (
                      <div className="space-y-4">
                        {getModuleFees(module).map((fee) => (
                          <div 
                            key={fee.id} 
                            className={`flex items-center justify-between p-4 rounded-lg border ${fee.isActive ? 'bg-white' : 'bg-muted/50 opacity-60'}`}
                            data-testid={`fee-row-${fee.id}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${fee.feeType === 'percentage' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                  {fee.feeType === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                                </div>
                                <div>
                                  <h4 className="font-semibold">{fee.feeName}</h4>
                                  <p className="text-sm text-muted-foreground">{fee.description || fee.feeKey}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={fee.feeValue}
                                    onChange={(e) => {
                                      const newFees = fees.map(f => 
                                        f.id === fee.id ? { ...f, feeValue: e.target.value } : f
                                      );
                                      setFees(newFees);
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value !== fee.feeValue) {
                                        handleQuickUpdate(fee, e.target.value);
                                      }
                                    }}
                                    className="w-24 text-right font-bold"
                                  />
                                  <span className="text-muted-foreground">
                                    {fee.feeType === 'percentage' ? '%' : 'USD'}
                                  </span>
                                </div>
                              </div>
                              
                              <Switch
                                checked={fee.isActive}
                                onCheckedChange={() => handleToggleActive(fee)}
                              />
                              
                              <Button variant="ghost" size="icon" onClick={() => openEdit(fee)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <Dialog open={createOpen || !!editingFee} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditingFee(null); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingFee ? 'Edit Fee' : 'Create New Fee'}</DialogTitle>
              <DialogDescription>Configure the fee settings</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Module</Label>
                  <Select value={formData.module} onValueChange={(v: any) => setFormData({ ...formData, module: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fee Type</Label>
                  <Select value={formData.feeType} onValueChange={(v) => setFormData({ ...formData, feeType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Fee Key (internal identifier)</Label>
                <Input 
                  value={formData.feeKey} 
                  onChange={(e) => setFormData({ ...formData, feeKey: e.target.value })} 
                  placeholder="e.g., buy_gold_spread"
                  disabled={!!editingFee}
                />
              </div>
              
              <div>
                <Label>Display Name</Label>
                <Input 
                  value={formData.feeName} 
                  onChange={(e) => setFormData({ ...formData, feeName: e.target.value })} 
                  placeholder="e.g., Buy Gold Spread"
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Brief description of this fee..."
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Fee Value</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.feeValue} 
                    onChange={(e) => setFormData({ ...formData, feeValue: e.target.value })} 
                    placeholder="0.50"
                  />
                </div>
                <div>
                  <Label>Min Amount (optional)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.minAmount} 
                    onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })} 
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Max Amount (optional)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.maxAmount} 
                    onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })} 
                    placeholder="100.00"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.isActive} 
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} 
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); setEditingFee(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={editingFee ? handleUpdate : handleCreate} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingFee ? 'Save Changes' : 'Create Fee'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
