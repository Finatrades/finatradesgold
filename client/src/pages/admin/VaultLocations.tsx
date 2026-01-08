import React, { useState } from 'react';
import { useLocation } from 'wouter';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Plus,
  MapPin,
  Building2,
  Globe,
  Shield,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface VaultLocation {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  country_code: string;
  capacity_kg: string;
  current_holdings_kg: string;
  insurance_provider: string | null;
  insurance_coverage_usd: string | null;
  security_level: string;
  is_active: boolean;
  is_primary: boolean;
  contact_email: string | null;
  contact_phone: string | null;
}

export default function VaultLocations() {
  const [location] = useLocation();
  const defaultTab = location.includes('vault-routing') ? 'routing' : 'locations';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const { data: locationsData, isLoading: loadingLocations, refetch: refetchLocations } = useQuery<{ locations: VaultLocation[] }>({
    queryKey: ['/api/admin/vault-management/locations'],
    refetchInterval: 60000,
  });

  const { data: routingData, isLoading: loadingRouting } = useQuery<{ rules: any[] }>({
    queryKey: ['/api/admin/vault-management/routing-rules'],
    refetchInterval: 60000,
  });

  const formatWeight = (kg: string | number | null | undefined) => {
    const kgNum = typeof kg === 'string' ? parseFloat(kg) : (kg || 0);
    if (kgNum >= 1000) {
      return `${(kgNum / 1000).toFixed(2)} tonnes`;
    }
    return `${kgNum.toFixed(2)} kg`;
  };

  const getUtilization = (current: string | number | null | undefined, capacity: string | number | null | undefined) => {
    const currentNum = typeof current === 'string' ? parseFloat(current) : (current || 0);
    const capacityNum = typeof capacity === 'string' ? parseFloat(capacity) : (capacity || 0);
    if (!capacityNum) return 0;
    return (currentNum / capacityNum) * 100;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Vault Locations & Routing
            </h1>
            <p className="text-gray-500 mt-1">
              Manage third-party vault locations and country routing rules
            </p>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-add-location">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="locations" data-testid="tab-locations">
              <Building2 className="h-4 w-4 mr-2" />
              Vault Locations
            </TabsTrigger>
            <TabsTrigger value="routing" data-testid="tab-routing">
              <Globe className="h-4 w-4 mr-2" />
              Country Routing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations">
            {loadingLocations ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-gray-200 rounded mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (locationsData?.locations?.length || 0) === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Vault Locations</h3>
                  <p className="text-gray-500 mt-1">Add your first third-party vault location to start tracking physical custody.</p>
                  <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Location
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {locationsData?.locations?.map((loc) => {
                  const utilization = getUtilization(loc.current_holdings_kg, loc.capacity_kg);
                  return (
                    <Card key={loc.id} className={`${!loc.is_active ? 'opacity-60' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-purple-600" />
                              {loc.name}
                            </CardTitle>
                            <CardDescription className="font-mono text-xs">{loc.code}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            {loc.is_primary && (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200">Primary</Badge>
                            )}
                            {loc.is_active ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700 border-gray-200">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <p>{loc.address}</p>
                          <p>{loc.city}, {loc.country}</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Capacity</span>
                            <span className="font-medium">{formatWeight(loc.capacity_kg)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Current Holdings</span>
                            <span className="font-medium">{formatWeight(loc.current_holdings_kg)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className={`h-2 rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 text-right">{utilization.toFixed(1)}% utilized</p>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Shield className="h-4 w-4" />
                            <span>{loc.security_level}</span>
                          </div>
                          {loc.insurance_provider && (
                            <p className="text-xs text-gray-500 mt-1">
                              Insured by {loc.insurance_provider}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-${loc.id}`}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" data-testid={`button-delete-${loc.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="routing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Country Routing Rules
                </CardTitle>
                <CardDescription>
                  Define which vault location should be used by default for each country
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Routing Rules</h3>
                  <p className="text-gray-500 mt-1">Configure country-to-vault routing rules to automate deposit allocation.</p>
                  <Button className="mt-4" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Routing Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
