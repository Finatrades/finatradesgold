import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Plus, Trash2, Edit2, Save, X, AlertTriangle, Check, Ban } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
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

const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MO', name: 'Macau' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
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
      const res = await apiRequest('GET', '/api/admin/geo-restrictions');
      if (!res.ok) throw new Error('Failed to fetch restrictions');
      return res.json();
    },
  });

  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ['/api/admin/geo-restriction-settings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/geo-restriction-settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<GeoRestrictionSettings>) => {
      const res = await apiRequest('POST', '/api/admin/geo-restriction-settings', settings);
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
      const res = await apiRequest('POST', '/api/admin/geo-restrictions', data);
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
      const res = await apiRequest('PATCH', `/api/admin/geo-restrictions/${id}`, data);
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
      const res = await apiRequest('DELETE', `/api/admin/geo-restrictions/${id}`);
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
    const country = ALL_COUNTRIES.find(c => c.code === code);
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
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
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
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {ALL_COUNTRIES.map(country => (
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
    </AdminLayout>
  );
}
