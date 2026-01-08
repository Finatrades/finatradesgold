import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { 
  RefreshCw, 
  Plus,
  Search,
  FileCheck,
  Upload,
  Link2,
  ExternalLink,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface PhysicalCertificate {
  id: string;
  physicalStorageRef: string;
  issuer: string;
  goldGrams: number;
  countryCode: string;
  vaultLocationId: string;
  vaultLocationName: string;
  issuedAt: string;
  status: 'Active' | 'Voided' | 'Linked';
  linkedVaultCertificateId: string | null;
}

export default function VaultPhysicalRegistry() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, refetch, isFetching } = useQuery<{ certificates: PhysicalCertificate[] }>({
    queryKey: ['/api/admin/vault/physical-registry'],
    refetchInterval: 60000,
  });

  const formatGrams = (grams: number) => {
    return grams.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const filteredCertificates = (data?.certificates || []).filter(cert => {
    const matchesSearch = searchQuery === '' || 
      cert.physicalStorageRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case 'Linked':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Linked</Badge>;
      case 'Voided':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Voided</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Physical Custody Registry
            </h1>
            <p className="text-gray-500 mt-1">
              Manage WinGold physical storage certificates and bar inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-import-csv">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-add-certificate">
              <Plus className="h-4 w-4 mr-2" />
              Add Certificate
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {data?.certificates?.length || 0}
              </div>
              <p className="text-sm text-gray-500">Total Certificates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {data?.certificates?.filter(c => c.status === 'Active').length || 0}
              </div>
              <p className="text-sm text-gray-500">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {data?.certificates?.filter(c => c.status === 'Linked').length || 0}
              </div>
              <p className="text-sm text-gray-500">Linked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">
                {formatGrams(data?.certificates?.reduce((sum, c) => sum + c.goldGrams, 0) || 0)}g
              </div>
              <p className="text-sm text-gray-500">Total Gold</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-purple-600" />
                Physical Storage Certificates
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by reference or issuer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
                data-testid="select-status-filter"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Linked">Linked</option>
                <option value="Voided">Voided</option>
              </select>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading certificates...</div>
            ) : filteredCertificates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No physical certificates found. Add your first certificate to start tracking physical custody.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium">Reference</th>
                      <th className="text-left p-3 font-medium">Issuer</th>
                      <th className="text-right p-3 font-medium">Gold (g)</th>
                      <th className="text-left p-3 font-medium">Location</th>
                      <th className="text-left p-3 font-medium">Issued</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{cert.physicalStorageRef}</td>
                        <td className="p-3">{cert.issuer}</td>
                        <td className="p-3 text-right font-medium">{formatGrams(cert.goldGrams)}</td>
                        <td className="p-3">
                          <span className="text-gray-600">{cert.vaultLocationName}</span>
                          <span className="text-xs text-gray-400 ml-1">({cert.countryCode})</span>
                        </td>
                        <td className="p-3 text-gray-500">
                          {format(new Date(cert.issuedAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(cert.status)}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" data-testid={`button-view-${cert.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            {cert.status === 'Active' && (
                              <Button variant="ghost" size="sm" data-testid={`button-link-${cert.id}`}>
                                <Link2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
