import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Plus, Trash2, Edit2, Save, X, AlertTriangle, Check, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface GeoRestriction {
  id: string;
  countryCode: string;
  countryName: string;
  isRestricted: boolean;
  restrictionMessage: string | null;
  allowRegistration: boolean;
  allowLogin: boolean;
  allowTransactions: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GeoRestrictionSettings {
  id: string;
  isEnabled: boolean;
  defaultMessage: string;
  showNoticeOnLanding: boolean;
  blockAccess: boolean;
}

const COMMON_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },
  { code: 'RU', name: 'Russia' },
  { code: 'KP', name: 'North Korea' },
  { code: 'IR', name: 'Iran' },
  { code: 'SY', name: 'Syria' },
  { code: 'CU', name: 'Cuba' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'BY', name: 'Belarus' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'LY', name: 'Libya' },
  { code: 'SD', name: 'Sudan' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'CH', name: 'Switzerland' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function GeoRestrictions() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GeoRestriction>>({});
  const [newRestriction, setNewRestriction] = useState({
    countryCode: '',
    countryName: '',
    isRestricted: true,
    restrictionMessage: '',
    allowRegistration: false,
    allowLogin: false,
    allowTransactions: false,
    reason: '',
  });

  const { data: restrictionsData, isLoading: loadingRestrictions } = useQuery({
    queryKey: ['/api/admin/geo-restrictions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/geo-restrictions');
      if (!res.ok) throw new Error('Failed to fetch restrictions');
      return res.json();
    },
  });

  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ['/api/admin/geo-restriction-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/geo-restriction-settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<GeoRestrictionSettings>) => {
      const res = await fetch('/api/admin/geo-restriction-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/geo-restriction-settings'] });
      toast.success('Settings updated successfully');
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  const createRestrictionMutation = useMutation({
    mutationFn: async (data: typeof newRestriction) => {
      const res = await fetch('/api/admin/geo-restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create restriction');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/geo-restrictions'] });
      setIsAddDialogOpen(false);
      setNewRestriction({
        countryCode: '',
        countryName: '',
        isRestricted: true,
        restrictionMessage: '',
        allowRegistration: false,
        allowLogin: false,
        allowTransactions: false,
        reason: '',
      });
      toast.success('Country restriction added');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateRestrictionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GeoRestriction> }) => {
      const res = await fetch(`/api/admin/geo-restrictions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update restriction');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/geo-restrictions'] });
      setEditingId(null);
      toast.success('Restriction updated');
    },
    onError: () => {
      toast.error('Failed to update restriction');
    },
  });

  const deleteRestrictionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/geo-restrictions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete restriction');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/geo-restrictions'] });
      toast.success('Restriction deleted');
    },
    onError: () => {
      toast.error('Failed to delete restriction');
    },
  });

  const restrictions: GeoRestriction[] = restrictionsData?.restrictions || [];
  const settings: GeoRestrictionSettings | null = settingsData?.settings;
  
  const defaultSettings = {
    isEnabled: false,
    defaultMessage: 'Our services are not available in your region. Please contact support for more information.',
    showNoticeOnLanding: true,
    blockAccess: false,
  };
  
  const currentSettings = settings || defaultSettings;

  const handleCountrySelect = (code: string) => {
    const country = COMMON_COUNTRIES.find(c => c.code === code);
    if (country) {
      setNewRestriction(prev => ({
        ...prev,
        countryCode: country.code,
        countryName: country.name,
      }));
    }
  };

  const startEditing = (restriction: GeoRestriction) => {
    setEditingId(restriction.id);
    setEditForm({
      isRestricted: restriction.isRestricted,
      restrictionMessage: restriction.restrictionMessage || '',
      allowRegistration: restriction.allowRegistration,
      allowLogin: restriction.allowLogin,
      allowTransactions: restriction.allowTransactions,
      reason: restriction.reason || '',
    });
  };

  const saveEdit = () => {
    if (editingId) {
      updateRestrictionMutation.mutate({ id: editingId, data: editForm });
    }
  };

  if (loadingRestrictions || loadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="geo-restrictions-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Geo Restrictions</h1>
          <p className="text-muted-foreground">Manage IP-based cross-border access restrictions</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-restriction">
              <Plus className="w-4 h-4 mr-2" />
              Add Country
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Country Restriction</DialogTitle>
              <DialogDescription>
                Add a new country to the restriction list
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Country</Label>
                <Select 
                  value={newRestriction.countryCode} 
                  onValueChange={handleCountrySelect}
                >
                  <SelectTrigger data-testid="select-country">
                    <SelectValue placeholder="Choose a country..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_COUNTRIES.map(country => (
                      <SelectItem 
                        key={country.code} 
                        value={country.code}
                        disabled={restrictions.some(r => r.countryCode === country.code)}
                      >
                        {country.name} ({country.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Or enter manually</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Code (e.g. US)"
                    value={newRestriction.countryCode}
                    onChange={e => setNewRestriction(prev => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                    maxLength={2}
                    className="w-24"
                    data-testid="input-country-code"
                  />
                  <Input
                    placeholder="Country Name"
                    value={newRestriction.countryName}
                    onChange={e => setNewRestriction(prev => ({ ...prev, countryName: e.target.value }))}
                    data-testid="input-country-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Custom Restriction Message (optional)</Label>
                <Textarea
                  placeholder="Leave empty to use default message"
                  value={newRestriction.restrictionMessage}
                  onChange={e => setNewRestriction(prev => ({ ...prev, restrictionMessage: e.target.value }))}
                  data-testid="input-restriction-message"
                />
              </div>
              <div className="space-y-3">
                <Label>Access Permissions</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Allow Registration</span>
                  <Switch
                    checked={newRestriction.allowRegistration}
                    onCheckedChange={checked => setNewRestriction(prev => ({ ...prev, allowRegistration: checked }))}
                    data-testid="switch-allow-registration"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Allow Login</span>
                  <Switch
                    checked={newRestriction.allowLogin}
                    onCheckedChange={checked => setNewRestriction(prev => ({ ...prev, allowLogin: checked }))}
                    data-testid="switch-allow-login"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Allow Transactions</span>
                  <Switch
                    checked={newRestriction.allowTransactions}
                    onCheckedChange={checked => setNewRestriction(prev => ({ ...prev, allowTransactions: checked }))}
                    data-testid="switch-allow-transactions"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Internal Reason (optional)</Label>
                <Textarea
                  placeholder="Reason for restriction (internal use only)"
                  value={newRestriction.reason}
                  onChange={e => setNewRestriction(prev => ({ ...prev, reason: e.target.value }))}
                  data-testid="input-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createRestrictionMutation.mutate(newRestriction)}
                disabled={!newRestriction.countryCode || !newRestriction.countryName || createRestrictionMutation.isPending}
                data-testid="button-save-restriction"
              >
                {createRestrictionMutation.isPending ? 'Adding...' : 'Add Restriction'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Global Settings
          </CardTitle>
          <CardDescription>
            Configure how geo restrictions work across the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Enable Geo Restrictions</p>
              <p className="text-sm text-muted-foreground">Turn on IP-based country detection and restrictions</p>
            </div>
            <Switch
              checked={currentSettings.isEnabled}
              onCheckedChange={checked => updateSettingsMutation.mutate({ 
                ...currentSettings, 
                isEnabled: checked,
              })}
              data-testid="switch-enable-restrictions"
            />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Show Notice on Landing Page</p>
              <p className="text-sm text-muted-foreground">Display a notice banner for restricted users</p>
            </div>
            <Switch
              checked={currentSettings.showNoticeOnLanding}
              onCheckedChange={checked => updateSettingsMutation.mutate({ 
                ...currentSettings, 
                showNoticeOnLanding: checked 
              })}
              disabled={!currentSettings.isEnabled}
              data-testid="switch-show-notice"
            />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Block Access Completely</p>
              <p className="text-sm text-muted-foreground">Prevent restricted users from accessing the site entirely</p>
            </div>
            <Switch
              checked={currentSettings.blockAccess}
              onCheckedChange={checked => updateSettingsMutation.mutate({ 
                ...currentSettings, 
                blockAccess: checked 
              })}
              disabled={!currentSettings.isEnabled}
              data-testid="switch-block-access"
            />
          </div>
          <div className="space-y-2">
            <Label>Default Restriction Message</Label>
            <Textarea
              value={currentSettings.defaultMessage}
              onChange={e => updateSettingsMutation.mutate({ ...currentSettings, defaultMessage: e.target.value })}
              placeholder="Message shown to restricted users"
              disabled={!currentSettings.isEnabled}
              data-testid="textarea-default-message"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5" />
            Restricted Countries
          </CardTitle>
          <CardDescription>
            {restrictions.length} countries in restriction list
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restrictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No country restrictions configured</p>
              <p className="text-sm">Add a country to start restricting access</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Custom Message</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restrictions.map((restriction) => (
                  <TableRow key={restriction.id} data-testid={`row-restriction-${restriction.id}`}>
                    <TableCell>
                      <div className="font-medium">{restriction.countryName}</div>
                      <div className="text-xs text-muted-foreground">{restriction.countryCode}</div>
                    </TableCell>
                    <TableCell>
                      {editingId === restriction.id ? (
                        <Switch
                          checked={editForm.isRestricted ?? restriction.isRestricted}
                          onCheckedChange={checked => setEditForm(prev => ({ ...prev, isRestricted: checked }))}
                        />
                      ) : (
                        <Badge variant={restriction.isRestricted ? 'destructive' : 'secondary'}>
                          {restriction.isRestricted ? 'Restricted' : 'Allowed'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === restriction.id ? (
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={editForm.allowRegistration ?? restriction.allowRegistration}
                              onChange={e => setEditForm(prev => ({ ...prev, allowRegistration: e.target.checked }))}
                            />
                            Reg
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={editForm.allowLogin ?? restriction.allowLogin}
                              onChange={e => setEditForm(prev => ({ ...prev, allowLogin: e.target.checked }))}
                            />
                            Login
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={editForm.allowTransactions ?? restriction.allowTransactions}
                              onChange={e => setEditForm(prev => ({ ...prev, allowTransactions: e.target.checked }))}
                            />
                            Txn
                          </label>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          {restriction.allowRegistration && (
                            <Badge variant="outline" className="text-xs">Reg</Badge>
                          )}
                          {restriction.allowLogin && (
                            <Badge variant="outline" className="text-xs">Login</Badge>
                          )}
                          {restriction.allowTransactions && (
                            <Badge variant="outline" className="text-xs">Txn</Badge>
                          )}
                          {!restriction.allowRegistration && !restriction.allowLogin && !restriction.allowTransactions && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {editingId === restriction.id ? (
                        <Input
                          value={editForm.restrictionMessage || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, restrictionMessage: e.target.value }))}
                          placeholder="Custom message"
                          className="text-xs"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground truncate block">
                          {restriction.restrictionMessage || 'Using default'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === restriction.id ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={saveEdit}
                            disabled={updateRestrictionMutation.isPending}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(restriction)}
                            data-testid={`button-edit-${restriction.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteRestrictionMutation.mutate(restriction.id)}
                            disabled={deleteRestrictionMutation.isPending}
                            data-testid={`button-delete-${restriction.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
