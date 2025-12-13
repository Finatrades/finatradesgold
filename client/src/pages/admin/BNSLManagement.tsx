import React, { useState, useEffect } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, AlertTriangle, FileText, CheckCircle, Clock, Loader2, RefreshCw, Edit, Trash2, Settings, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import BnslPlanDetailAdmin from '@/components/bnsl/admin/BnslPlanDetailAdmin';
import { BnslPlan, BnslEarlyTerminationRequest, AuditLogEntry, BnslMarginPayout, BnslPlanStatus, BnslTenor } from '@/types/bnsl';
import { useBnsl } from '@/context/BnslContext';
import { Textarea } from '@/components/ui/textarea';

// Types for templates
interface BnslTemplateVariant {
  id: string;
  templateId: string;
  tenorMonths: number;
  marginRatePercent: string;
  minMarginRatePercent?: string;
  maxMarginRatePercent?: string;
  isActive: boolean;
}

interface BnslPlanTemplate {
  id: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive' | 'Draft';
  minGoldGrams: string;
  maxGoldGrams: string;
  payoutFrequency: string;
  earlyTerminationFeePercent: string;
  adminFeePercent: string;
  termsAndConditions?: string;
  displayOrder: number;
  variants?: BnslTemplateVariant[];
}

// Templates Manager Component
function BnslTemplatesManager() {
  const [templates, setTemplates] = useState<BnslPlanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BnslPlanTemplate | null>(null);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    status: 'Active' | 'Inactive' | 'Draft';
    minGoldGrams: string;
    maxGoldGrams: string;
    payoutFrequency: string;
    earlyTerminationFeePercent: string;
    adminFeePercent: string;
    termsAndConditions: string;
  }>({
    name: '',
    description: '',
    status: 'Draft',
    minGoldGrams: '10',
    maxGoldGrams: '10000',
    payoutFrequency: 'Quarterly',
    earlyTerminationFeePercent: '2.00',
    adminFeePercent: '0.50',
    termsAndConditions: ''
  });

  const [variantForm, setVariantForm] = useState({
    tenorMonths: '12',
    marginRatePercent: '8.00'
  });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('GET', '/api/admin/bnsl/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('POST', '/api/admin/bnsl/templates', formData);
      const data = await res.json();
      if (data.template) {
        toast.success('Template created successfully');
        setCreateOpen(false);
        setFormData({ name: '', description: '', status: 'Draft', minGoldGrams: '10', maxGoldGrams: '10000', payoutFrequency: 'Quarterly', earlyTerminationFeePercent: '2.00', adminFeePercent: '0.50', termsAndConditions: '' });
        fetchTemplates();
      }
    } catch (err) {
      toast.error('Failed to create template');
    }
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      await apiRequest('PUT', `/api/admin/bnsl/templates/${editingTemplate.id}`, formData);
      toast.success('Template updated');
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to update template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      await apiRequest('DELETE', `/api/admin/bnsl/templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to delete template');
    }
  };

  const handleAddVariant = async () => {
    if (!selectedTemplateId) return;
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      await apiRequest('POST', `/api/admin/bnsl/templates/${selectedTemplateId}/variants`, variantForm);
      toast.success('Variant added');
      setVariantDialogOpen(false);
      setVariantForm({ tenorMonths: '12', marginRatePercent: '8.00' });
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to add variant');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      await apiRequest('DELETE', `/api/admin/bnsl/variants/${variantId}`);
      toast.success('Variant deleted');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to delete variant');
    }
  };

  const openEdit = (template: BnslPlanTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      status: template.status,
      minGoldGrams: template.minGoldGrams,
      maxGoldGrams: template.maxGoldGrams,
      payoutFrequency: template.payoutFrequency,
      earlyTerminationFeePercent: template.earlyTerminationFeePercent,
      adminFeePercent: template.adminFeePercent,
      termsAndConditions: template.termsAndConditions || ''
    });
    setEditingTemplate(template);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          <p className="mt-2 text-gray-500">Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>BNSL Plan Templates</CardTitle>
            <CardDescription>Configure reusable plan types with different tenors and margin rates</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-template">
            <Plus className="w-4 h-4 mr-2" /> New Template
          </Button>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No templates found. Create your first template to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 bg-white" data-testid={`template-card-${template.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">{template.name}</h4>
                        <Badge variant={template.status === 'Active' ? 'default' : template.status === 'Draft' ? 'secondary' : 'outline'}>
                          {template.status}
                        </Badge>
                      </div>
                      {template.description && <p className="text-sm text-gray-600 mt-1">{template.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Min Gold:</span> {template.minGoldGrams}g
                    </div>
                    <div>
                      <span className="text-gray-500">Max Gold:</span> {template.maxGoldGrams}g
                    </div>
                    <div>
                      <span className="text-gray-500">Payout:</span> {template.payoutFrequency}
                    </div>
                    <div>
                      <span className="text-gray-500">Term Fee:</span> {template.earlyTerminationFeePercent}%
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Tenor Variants</h5>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedTemplateId(template.id); setVariantDialogOpen(true); }}>
                        <Plus className="w-3 h-3 mr-1" /> Add Variant
                      </Button>
                    </div>
                    {template.variants && template.variants.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {template.variants.map((v) => (
                          <div key={v.id} className="flex items-center gap-2 bg-gray-100 rounded px-3 py-1 text-sm">
                            <span>{v.tenorMonths} months @ {v.marginRatePercent}%</span>
                            <button onClick={() => handleDeleteVariant(v.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No variants. Add tenor/rate options.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Template Dialog */}
      <Dialog open={createOpen || !!editingTemplate} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditingTemplate(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>Configure the plan template settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Standard BNSL" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payout Frequency</Label>
                <Select value={formData.payoutFrequency} onValueChange={(v) => setFormData({ ...formData, payoutFrequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Gold (grams)</Label>
                <Input type="number" value={formData.minGoldGrams} onChange={(e) => setFormData({ ...formData, minGoldGrams: e.target.value })} />
              </div>
              <div>
                <Label>Max Gold (grams)</Label>
                <Input type="number" value={formData.maxGoldGrams} onChange={(e) => setFormData({ ...formData, maxGoldGrams: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Early Termination Fee %</Label>
                <Input type="number" step="0.01" value={formData.earlyTerminationFeePercent} onChange={(e) => setFormData({ ...formData, earlyTerminationFeePercent: e.target.value })} />
              </div>
              <div>
                <Label>Admin Fee %</Label>
                <Input type="number" step="0.01" value={formData.adminFeePercent} onChange={(e) => setFormData({ ...formData, adminFeePercent: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditingTemplate(null); }}>Cancel</Button>
            <Button onClick={editingTemplate ? handleUpdate : handleCreate}>
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tenor Variant</DialogTitle>
            <DialogDescription>Add a new tenor/margin rate option to this template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tenor (Months)</Label>
              <Select value={variantForm.tenorMonths} onValueChange={(v) => setVariantForm({ ...variantForm, tenorMonths: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                  <SelectItem value="18">18 Months</SelectItem>
                  <SelectItem value="24">24 Months</SelectItem>
                  <SelectItem value="36">36 Months</SelectItem>
                  <SelectItem value="48">48 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Annual Margin Rate %</Label>
              <Input type="number" step="0.01" value={variantForm.marginRatePercent} onChange={(e) => setVariantForm({ ...variantForm, marginRatePercent: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddVariant}>Add Variant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function BNSLManagement() {
  const { allPlans, auditLogs, currentGoldPrice, updatePlanStatus, addAuditLog, updatePayout, updateEarlyTermination, refreshAllPlans } = useBnsl();
  
  useEffect(() => {
    refreshAllPlans();
  }, [refreshAllPlans]);
  
  const plans = allPlans;
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleOpenPlan = (id: string) => {
    setSelectedPlanId(id);
    setDetailOpen(true);
  };

  // KPIs
  const totalBaseLiability = plans.reduce((sum, p) => sum + p.basePriceComponentUsd, 0);
  const totalMarginLiability = plans.reduce((sum, p) => sum + p.totalMarginComponentUsd, 0);
  const activePlans = plans.filter(p => p.status === 'Active').length;
  const terminationRequests = plans.filter(p => p.status === 'Early Termination Requested').length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BNSL Management</h1>
            <p className="text-gray-500">Buy Now Sell Later – Admin Panel & Risk Monitoring</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <Card className="bg-blue-50 border-blue-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                   <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-blue-900">Active Plans</p>
                   <h3 className="text-2xl font-bold text-blue-700">{activePlans}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="bg-amber-50 border-amber-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
                   <FileText className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-amber-900">Base Liability</p>
                   <h3 className="text-2xl font-bold text-amber-700">${totalBaseLiability.toLocaleString()}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="bg-green-50 border-green-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                   <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-green-900">Margin Liability</p>
                   <h3 className="text-2xl font-bold text-green-700">${totalMarginLiability.toLocaleString()}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="bg-red-50 border-red-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                   <AlertTriangle className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-red-900">Term. Requests</p>
                   <h3 className="text-2xl font-bold text-red-700">{terminationRequests}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>

        <Tabs defaultValue="plans" className="w-full">
           <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
             <TabsTrigger value="plans" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               All Plans
             </TabsTrigger>
             <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               Plan Templates
             </TabsTrigger>
             <TabsTrigger value="risk" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               Risk & Exposure
             </TabsTrigger>
             <TabsTrigger value="audit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               Global Audit Log
             </TabsTrigger>
           </TabsList>

           <div className="mt-6">
             <TabsContent value="plans">
                <Card>
                  <CardHeader>
                    <CardTitle>BNSL Plans</CardTitle>
                    <CardDescription>Manage active plans, payouts, and terminations.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {plans.length === 0 ? (
                         <div className="text-center py-8 text-gray-500">No active plans found. Create one to get started.</div>
                       ) : (
                         plans.map((plan) => (
                           <div key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer group">
                               <div className="flex items-center gap-4 mb-4 md:mb-0">
                                 <div className={`p-2 rounded border ${plan.status === 'Active' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                     <FileText className="w-6 h-6" />
                                 </div>
                                 <div>
                                     <div className="flex items-center gap-2">
                                       <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{plan.contractId}</h4>
                                       <Badge variant="outline" className="text-xs">{plan.status}</Badge>
                                       {plan.earlyTermination?.status === 'Requested' && <Badge variant="destructive" className="text-xs animate-pulse">Termination Requested</Badge>}
                                     </div>
                                     <p className="text-sm text-gray-600">
                                       {plan.participant.name} • {plan.tenorMonths} Months @ {plan.agreedMarginAnnualPercent}%
                                     </p>
                                     <p className="text-xs text-gray-500 mt-1">
                                        Gold Sold: {plan.goldSoldGrams}g • Base: ${plan.basePriceComponentUsd.toLocaleString()}
                                     </p>
                                 </div>
                               </div>
                               <div className="flex gap-2">
                                 <Button variant="outline" size="sm">
                                   View Plan
                                 </Button>
                               </div>
                           </div>
                         ))
                       )}
                     </div>
                  </CardContent>
                </Card>
             </TabsContent>
             
             <TabsContent value="templates">
               <BnslTemplatesManager />
             </TabsContent>
             
             {/* Other tabs placeholders */}
             <TabsContent value="risk">
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    Risk dashboard implementation coming next.
                  </CardContent>
                </Card>
             </TabsContent>

             <TabsContent value="audit">
               <Card>
                 <CardHeader>
                   <CardTitle>Global Audit Log</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="space-y-0">
                       {auditLogs.map((log) => (
                         <div key={log.id} className="flex gap-4 p-3 border-b last:border-0 hover:bg-gray-50">
                            <div className="text-xs text-gray-500 w-32 shrink-0">
                               {new Date(log.timestamp).toLocaleString()}
                            </div>
                            <div>
                               <p className="font-medium text-sm text-gray-900">
                                 <span className="font-bold">{log.actor}</span> ({log.actorRole}) - {log.actionType}
                               </p>
                               <p className="text-sm text-gray-600">{log.details}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </CardContent>
               </Card>
             </TabsContent>
           </div>
        </Tabs>

        {/* Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden">
             {selectedPlan ? (
               <BnslPlanDetailAdmin 
                 plan={selectedPlan}
                 auditLogs={auditLogs.filter(l => l.planId === selectedPlan.id)}
                 currentMarketPrice={currentGoldPrice}
                 onClose={() => setDetailOpen(false)}
                 onUpdatePlanStatus={updatePlanStatus}
                 onAddAuditLog={addAuditLog}
                 onUpdatePayout={updatePayout}
                 onUpdateEarlyTermination={updateEarlyTermination}
               />
             ) : (
               <div className="p-10 text-center">Loading...</div>
             )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
