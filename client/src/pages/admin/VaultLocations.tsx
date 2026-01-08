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
  capacityKg: number;
  currentHoldingsKg: number;
  insuranceProvider: string;
  insuranceCoverageUsd: number;
  securityLevel: string;
  isActive: boolean;
  contactEmail: string;
  contactPhone: string;
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

  const formatWeight = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(2)} tonnes`;
    }
    return `${kg.toFixed(2)} kg`;
  };

  const getUtilization = (current: number, capacity: number) => {
    if (!capacity) return 0;
    return (current / capacity) * 100;
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
                {locationsData?.locations?.map((location) => {
                  const utilization = getUtilization(location.currentHoldingsKg, location.capacityKg);
                  return (
                    <Card key={location.id} className={`${!location.isActive ? 'opacity-60' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-purple-600" />
                              {location.name}
                            </CardTitle>
                            <CardDescription className="font-mono text-xs">{location.code}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            {location.isActive ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700 border-gray-200">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <p>{location.address}</p>
                          <p>{location.city}, {location.country}</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Capacity</span>
                            <span className="font-medium">{formatWeight(location.capacityKg)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Current Holdings</span>
                            <span className="font-medium">{formatWeight(location.currentHoldingsKg)}</span>
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
                            <span>{location.securityLevel}</span>
                          </div>
                          {location.insuranceProvider && (
                            <p className="text-xs text-gray-500 mt-1">
                              Insured by {location.insuranceProvider} (${(location.insuranceCoverageUsd / 1000000).toFixed(1)}M)
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-${location.id}`}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" data-testid={`button-delete-${location.id}`}>
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
