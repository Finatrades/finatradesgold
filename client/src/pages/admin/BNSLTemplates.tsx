import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, Edit, Trash2, TrendingUp, Calendar, Percent, 
  Coins, ArrowUpDown, Save, X
} from 'lucide-react';

interface PlanTemplate {
  id: string;
  name: string;
  description: string | null;
  tenorMonths: number;
  marginAnnualPercent: string;
  minGoldGrams: string;
  maxGoldGrams: string | null;
  earlyTerminationPenaltyPercent: string;
  adminFeePercent: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export default function BNSLTemplates() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PlanTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tenorMonths: 12,
    marginAnnualPercent: '8',
    minGoldGrams: '1',
    maxGoldGrams: '',
    earlyTerminationPenaltyPercent: '2',
    adminFeePercent: '1',
    displayOrder: 0,
    isActive: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['bnsl-templates-admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/bnsl/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  const templates: PlanTemplate[] = data?.templates || [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/admin/bnsl/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Plan template created successfully');
      queryClient.invalidateQueries({ queryKey: ['bnsl-templates-admin'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/admin/bnsl/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Plan template updated');
      queryClient.invalidateQueries({ queryKey: ['bnsl-templates-admin'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/bnsl/templates/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Plan template deleted');
      queryClient.invalidateQueries({ queryKey: ['bnsl-templates-admin'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/admin/bnsl/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('Failed to toggle template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bnsl-templates-admin'] });
    },
  });

  const openNewDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      tenorMonths: 12,
      marginAnnualPercent: '8',
      minGoldGrams: '1',
      maxGoldGrams: '',
      earlyTerminationPenaltyPercent: '2',
      adminFeePercent: '1',
      displayOrder: templates.length,
      isActive: true,
    });
    setShowDialog(true);
  };

  const openEditDialog = (template: PlanTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      tenorMonths: template.tenorMonths,
      marginAnnualPercent: template.marginAnnualPercent,
      minGoldGrams: template.minGoldGrams,
      maxGoldGrams: template.maxGoldGrams || '',
      earlyTerminationPenaltyPercent: template.earlyTerminationPenaltyPercent,
      adminFeePercent: template.adminFeePercent,
      displayOrder: template.displayOrder,
      isActive: template.isActive,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingTemplate(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BNSL Plan Templates</h1>
          <p className="text-muted-foreground">Create and manage Buy Now Sell Later plan types</p>
        </div>
        <Button onClick={openNewDialog} data-testid="button-create-template">
          <Plus className="w-4 h-4 mr-2" />
          Create New Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No Plan Templates</h3>
            <p className="text-muted-foreground mb-4">Create your first BNSL plan template to get started</p>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className={!template.isActive ? 'opacity-60' : ''} data-testid={`template-${template.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        #{template.displayOrder}
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={template.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: template.id, isActive: checked })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{template.tenorMonths} months</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    <span>{template.marginAnnualPercent}% margin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    <span>Min: {template.minGoldGrams}g</span>
                  </div>
                  {template.maxGoldGrams && (
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                      <span>Max: {template.maxGoldGrams}g</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(template)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this template?')) {
                        deleteMutation.mutate(template.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Plan Template' : 'Create Plan Template'}</DialogTitle>
            <DialogDescription>
              Configure the BNSL plan parameters that will be available to users
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Gold Saver 12-Month"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the plan benefits..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenorMonths">Duration (Months)</Label>
                <Input
                  id="tenorMonths"
                  type="number"
                  value={formData.tenorMonths}
                  onChange={(e) => setFormData({ ...formData, tenorMonths: parseInt(e.target.value) })}
                  min={1}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marginAnnualPercent">Annual Margin (%)</Label>
                <Input
                  id="marginAnnualPercent"
                  type="number"
                  step="0.01"
                  value={formData.marginAnnualPercent}
                  onChange={(e) => setFormData({ ...formData, marginAnnualPercent: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minGoldGrams">Minimum Gold (g)</Label>
                <Input
                  id="minGoldGrams"
                  type="number"
                  step="0.01"
                  value={formData.minGoldGrams}
                  onChange={(e) => setFormData({ ...formData, minGoldGrams: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxGoldGrams">Maximum Gold (g)</Label>
                <Input
                  id="maxGoldGrams"
                  type="number"
                  step="0.01"
                  value={formData.maxGoldGrams}
                  onChange={(e) => setFormData({ ...formData, maxGoldGrams: e.target.value })}
                  placeholder="No limit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="earlyTerminationPenaltyPercent">Early Exit Penalty (%)</Label>
                <Input
                  id="earlyTerminationPenaltyPercent"
                  type="number"
                  step="0.01"
                  value={formData.earlyTerminationPenaltyPercent}
                  onChange={(e) => setFormData({ ...formData, earlyTerminationPenaltyPercent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminFeePercent">Admin Fee (%)</Label>
                <Input
                  id="adminFeePercent"
                  type="number"
                  step="0.01"
                  value={formData.adminFeePercent}
                  onChange={(e) => setFormData({ ...formData, adminFeePercent: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {editingTemplate ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
