import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Plus, 
  Loader2, 
  AlertCircle,
  Trash2,
  Edit2,
  Star,
  Mail,
  Phone,
  User,
  Percent,
  AlertTriangle
} from 'lucide-react';

interface Beneficiary {
  id: string;
  userId: string;
  fullName: string;
  relationship: string;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  allocationPercent: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAt: string | null;
  identificationDocument: string | null;
  note: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

const relationshipOptions = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other_relative', label: 'Other Relative' },
  { value: 'friend', label: 'Friend' },
  { value: 'business_partner', label: 'Business Partner' },
  { value: 'charity', label: 'Charity' },
  { value: 'trust', label: 'Trust' },
  { value: 'other', label: 'Other' }
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  verified: 'bg-green-500/10 text-green-600 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/30'
};

export default function BeneficiariesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [newBeneficiary, setNewBeneficiary] = useState({
    fullName: '',
    relationship: 'spouse',
    email: '',
    phoneNumber: '',
    allocationPercent: '',
    isPrimary: false,
    note: ''
  });

  const [editBeneficiary, setEditBeneficiary] = useState({
    fullName: '',
    relationship: 'spouse',
    email: '',
    phoneNumber: '',
    allocationPercent: '',
    isPrimary: false,
    note: ''
  });

  const { data: beneficiaries = [], isLoading, error } = useQuery<Beneficiary[]>({
    queryKey: ['beneficiaries'],
    queryFn: async () => {
      const res = await fetch('/api/beneficiaries', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch beneficiaries');
      return res.json();
    },
    enabled: !!user
  });

  const totalAllocation = beneficiaries.reduce((sum, b) => sum + parseFloat(b.allocationPercent), 0);
  const remainingAllocation = 100 - totalAllocation;

  const createMutation = useMutation({
    mutationFn: async (data: typeof newBeneficiary) => {
      const allocationValue = parseFloat(data.allocationPercent);
      if (allocationValue + totalAllocation > 100) {
        throw new Error('Total allocation cannot exceed 100%');
      }
      const res = await fetch('/api/beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: data.fullName,
          relationship: data.relationship,
          email: data.email || null,
          phoneNumber: data.phoneNumber || null,
          allocationPercent: data.allocationPercent,
          isPrimary: data.isPrimary,
          note: data.note || null
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add beneficiary');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      setShowCreateModal(false);
      setNewBeneficiary({ fullName: '', relationship: 'spouse', email: '', phoneNumber: '', allocationPercent: '', isPrimary: false, note: '' });
      toast({ title: 'Success', description: 'Beneficiary added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Beneficiary> }) => {
      const res = await fetch(`/api/beneficiaries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update beneficiary');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      setShowEditModal(false);
      setSelectedBeneficiary(null);
      toast({ title: 'Success', description: 'Beneficiary updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/beneficiaries/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to remove beneficiary');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      setShowDeleteConfirm(false);
      setSelectedBeneficiary(null);
      toast({ title: 'Success', description: 'Beneficiary removed successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove beneficiary', variant: 'destructive' });
    }
  });

  const handleCreate = () => {
    if (!newBeneficiary.fullName || !newBeneficiary.allocationPercent) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    const allocation = parseFloat(newBeneficiary.allocationPercent);
    if (allocation <= 0 || allocation > 100) {
      toast({ title: 'Error', description: 'Allocation must be between 0 and 100%', variant: 'destructive' });
      return;
    }
    if (allocation > remainingAllocation) {
      toast({ title: 'Error', description: `Maximum available allocation is ${remainingAllocation.toFixed(2)}%`, variant: 'destructive' });
      return;
    }
    createMutation.mutate(newBeneficiary);
  };

  const handleEdit = () => {
    if (!selectedBeneficiary) return;
    if (!editBeneficiary.fullName || !editBeneficiary.allocationPercent) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    const allocation = parseFloat(editBeneficiary.allocationPercent);
    const currentAllocation = parseFloat(selectedBeneficiary.allocationPercent);
    const maxAllocation = remainingAllocation + currentAllocation;
    
    if (allocation <= 0 || allocation > 100) {
      toast({ title: 'Error', description: 'Allocation must be between 0 and 100%', variant: 'destructive' });
      return;
    }
    if (allocation > maxAllocation) {
      toast({ title: 'Error', description: `Maximum available allocation is ${maxAllocation.toFixed(2)}%`, variant: 'destructive' });
      return;
    }
    updateMutation.mutate({
      id: selectedBeneficiary.id,
      data: {
        fullName: editBeneficiary.fullName,
        relationship: editBeneficiary.relationship as Beneficiary['relationship'],
        email: editBeneficiary.email || null,
        phoneNumber: editBeneficiary.phoneNumber || null,
        allocationPercent: editBeneficiary.allocationPercent,
        isPrimary: editBeneficiary.isPrimary,
        note: editBeneficiary.note || null
      }
    });
  };

  const openEditModal = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setEditBeneficiary({
      fullName: beneficiary.fullName,
      relationship: beneficiary.relationship,
      email: beneficiary.email || '',
      phoneNumber: beneficiary.phoneNumber || '',
      allocationPercent: beneficiary.allocationPercent,
      isPrimary: beneficiary.isPrimary,
      note: beneficiary.note || ''
    });
    setShowEditModal(true);
  };

  const getRelationshipLabel = (value: string) => {
    return relationshipOptions.find(r => r.value === value)?.label || value;
  };

  const primaryBeneficiaries = beneficiaries.filter(b => b.isPrimary);
  const secondaryBeneficiaries = beneficiaries.filter(b => !b.isPrimary);

  const renderBeneficiaryCard = (beneficiary: Beneficiary) => (
    <Card 
      key={beneficiary.id} 
      data-testid={`card-beneficiary-${beneficiary.id}`}
      className="bg-white border border-border hover:border-primary/50 transition-all"
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              beneficiary.isPrimary 
                ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
                : 'bg-gradient-to-br from-purple-500 to-purple-700'
            }`}>
              {beneficiary.isPrimary ? (
                <Star className="w-6 h-6 text-white" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{beneficiary.fullName}</h3>
                {beneficiary.isPrimary && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                    Primary
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {getRelationshipLabel(beneficiary.relationship)}
              </p>
            </div>
          </div>
          <Badge className={statusColors[beneficiary.status]} data-testid={`badge-status-${beneficiary.id}`}>
            {beneficiary.status.charAt(0).toUpperCase() + beneficiary.status.slice(1)}
          </Badge>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Allocation</span>
            <span className="text-2xl font-bold text-primary">
              {parseFloat(beneficiary.allocationPercent).toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          {beneficiary.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>{beneficiary.email}</span>
            </div>
          )}
          {beneficiary.phoneNumber && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{beneficiary.phoneNumber}</span>
            </div>
          )}
        </div>

        {beneficiary.note && (
          <p className="text-sm text-muted-foreground mb-4 italic">"{beneficiary.note}"</p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            data-testid={`button-edit-${beneficiary.id}`}
            onClick={() => openEditModal(beneficiary)}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid={`button-delete-${beneficiary.id}`}
            onClick={() => {
              setSelectedBeneficiary(beneficiary);
              setShowDeleteConfirm(true);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              Beneficiaries
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your estate planning beneficiaries
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            data-testid="button-add-beneficiary"
            disabled={remainingAllocation <= 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Beneficiary
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100">Total Beneficiaries</p>
                  <p className="text-3xl font-bold">{beneficiaries.length}</p>
                </div>
                <Users className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-border">
            <CardContent className="p-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Total Allocated</p>
                  <span className="text-xl font-bold text-foreground">{totalAllocation.toFixed(2)}%</span>
                </div>
                <Progress value={totalAllocation} className="h-3" />
                {totalAllocation > 100 && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Allocation exceeds 100%!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className={`text-3xl font-bold ${remainingAllocation < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {remainingAllocation.toFixed(2)}%
                  </p>
                </div>
                <Percent className="w-10 h-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6 flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-800">Failed to load beneficiaries</h3>
                <p className="text-red-600">Please try again later.</p>
              </div>
            </CardContent>
          </Card>
        ) : beneficiaries.length === 0 ? (
          <Card className="bg-white border border-border">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Beneficiaries Yet</h3>
              <p className="text-muted-foreground mb-6">
                Add beneficiaries to manage your estate planning
              </p>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                data-testid="button-add-first-beneficiary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Beneficiary
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {primaryBeneficiaries.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Primary Beneficiaries
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {primaryBeneficiaries.map(renderBeneficiaryCard)}
                </div>
              </div>
            )}
            {secondaryBeneficiaries.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Other Beneficiaries</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {secondaryBeneficiaries.map(renderBeneficiaryCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Add Beneficiary
            </DialogTitle>
            <DialogDescription>
              Add a new beneficiary for estate planning. Available allocation: {remainingAllocation.toFixed(2)}%
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="full-name">Full Name *</Label>
              <Input
                id="full-name"
                data-testid="input-full-name"
                placeholder="John Doe"
                value={newBeneficiary.fullName}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, fullName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="relationship">Relationship *</Label>
              <Select
                value={newBeneficiary.relationship}
                onValueChange={(value) => setNewBeneficiary({ ...newBeneficiary, relationship: value })}
              >
                <SelectTrigger data-testid="select-relationship">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relationshipOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="allocation">Allocation Percentage *</Label>
              <div className="relative">
                <Input
                  id="allocation"
                  data-testid="input-allocation"
                  type="number"
                  min="0.01"
                  max={remainingAllocation}
                  step="0.01"
                  placeholder="25.00"
                  value={newBeneficiary.allocationPercent}
                  onChange={(e) => setNewBeneficiary({ ...newBeneficiary, allocationPercent: e.target.value })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                placeholder="john@example.com"
                value={newBeneficiary.email}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                data-testid="input-phone"
                placeholder="+1 234 567 8900"
                value={newBeneficiary.phoneNumber}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, phoneNumber: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="primary">Primary Beneficiary</Label>
                <p className="text-sm text-muted-foreground">Mark as primary beneficiary</p>
              </div>
              <Switch
                id="primary"
                data-testid="switch-primary"
                checked={newBeneficiary.isPrimary}
                onCheckedChange={(checked) => setNewBeneficiary({ ...newBeneficiary, isPrimary: checked })}
              />
            </div>

            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Input
                id="note"
                data-testid="input-note"
                placeholder="Add a note"
                value={newBeneficiary.note}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, note: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-purple-700"
              data-testid="button-submit-beneficiary"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Beneficiary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Edit Beneficiary
            </DialogTitle>
            <DialogDescription>
              Update beneficiary details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-full-name">Full Name *</Label>
              <Input
                id="edit-full-name"
                data-testid="input-edit-full-name"
                value={editBeneficiary.fullName}
                onChange={(e) => setEditBeneficiary({ ...editBeneficiary, fullName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-relationship">Relationship *</Label>
              <Select
                value={editBeneficiary.relationship}
                onValueChange={(value) => setEditBeneficiary({ ...editBeneficiary, relationship: value })}
              >
                <SelectTrigger data-testid="select-edit-relationship">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationshipOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-allocation">Allocation Percentage *</Label>
              <div className="relative">
                <Input
                  id="edit-allocation"
                  data-testid="input-edit-allocation"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={editBeneficiary.allocationPercent}
                  onChange={(e) => setEditBeneficiary({ ...editBeneficiary, allocationPercent: e.target.value })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-email">Email (Optional)</Label>
              <Input
                id="edit-email"
                data-testid="input-edit-email"
                type="email"
                value={editBeneficiary.email}
                onChange={(e) => setEditBeneficiary({ ...editBeneficiary, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-phone">Phone (Optional)</Label>
              <Input
                id="edit-phone"
                data-testid="input-edit-phone"
                value={editBeneficiary.phoneNumber}
                onChange={(e) => setEditBeneficiary({ ...editBeneficiary, phoneNumber: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="edit-primary">Primary Beneficiary</Label>
                <p className="text-sm text-muted-foreground">Mark as primary beneficiary</p>
              </div>
              <Switch
                id="edit-primary"
                data-testid="switch-edit-primary"
                checked={editBeneficiary.isPrimary}
                onCheckedChange={(checked) => setEditBeneficiary({ ...editBeneficiary, isPrimary: checked })}
              />
            </div>

            <div>
              <Label htmlFor="edit-note">Note (Optional)</Label>
              <Input
                id="edit-note"
                data-testid="input-edit-note"
                value={editBeneficiary.note}
                onChange={(e) => setEditBeneficiary({ ...editBeneficiary, note: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-purple-700"
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Remove Beneficiary
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{selectedBeneficiary?.fullName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedBeneficiary && deleteMutation.mutate(selectedBeneficiary.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
