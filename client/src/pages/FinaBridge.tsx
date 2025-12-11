import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, ShieldCheck, FileText, PlusCircle, Briefcase, Info, Lock, RefreshCw, ArrowRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

interface DbTradeCase {
  id: string;
  caseNumber: string;
  userId: string;
  companyName: string;
  tradeType: string;
  commodityType: string;
  tradeValueUsd: string;
  buyerName: string | null;
  buyerCountry: string | null;
  sellerName: string | null;
  sellerCountry: string | null;
  paymentTerms: string | null;
  shipmentDetails: string | null;
  status: string;
  riskLevel: string;
  opsApproval: boolean | null;
  complianceApproval: boolean | null;
  riskApproval: boolean | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const GOLD_PRICE = 78.50;

export default function FinaBridge() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('cases');
  const [selectedCase, setSelectedCase] = useState<DbTradeCase | null>(null);

  const [newCaseData, setNewCaseData] = useState({
    companyName: '',
    tradeType: 'Import',
    commodityType: '',
    tradeValueUsd: '',
    buyerName: '',
    buyerCountry: '',
    sellerName: '',
    sellerCountry: '',
    paymentTerms: '',
    shipmentDetails: '',
    notes: ''
  });

  const { data: casesData, isLoading, refetch } = useQuery<{ cases: DbTradeCase[] }>({
    queryKey: ['/api/trade/cases', user?.id],
    queryFn: async () => {
      if (!user?.id) return { cases: [] };
      const response = await fetch(`/api/trade/cases/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch trade cases');
      return response.json();
    },
    enabled: !!user?.id
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/trade/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create trade case');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade/cases', user?.id] });
      toast.success('Trade case created successfully!');
      addNotification({
        title: "New Trade Initiated",
        message: `Trade Case created. Your request is now pending review.`,
        type: 'success'
      });
      setActiveTab('cases');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setNewCaseData({
      companyName: '',
      tradeType: 'Import',
      commodityType: '',
      tradeValueUsd: '',
      buyerName: '',
      buyerCountry: '',
      sellerName: '',
      sellerCountry: '',
      paymentTerms: '',
      shipmentDetails: '',
      notes: ''
    });
  };

  const handleCreateCase = () => {
    if (!user?.id) {
      toast.error('Please log in to create a trade case');
      return;
    }

    if (!newCaseData.companyName || !newCaseData.commodityType || !newCaseData.tradeValueUsd) {
      toast.error('Please fill in all required fields');
      return;
    }

    const valueUsd = parseFloat(newCaseData.tradeValueUsd);
    if (isNaN(valueUsd) || valueUsd <= 0) {
      toast.error('Please enter a valid trade value');
      return;
    }

    createMutation.mutate({
      userId: user.id,
      companyName: newCaseData.companyName,
      tradeType: newCaseData.tradeType,
      commodityType: newCaseData.commodityType,
      tradeValueUsd: valueUsd.toString(),
      buyerName: newCaseData.buyerName || null,
      buyerCountry: newCaseData.buyerCountry || null,
      sellerName: newCaseData.sellerName || null,
      sellerCountry: newCaseData.sellerCountry || null,
      paymentTerms: newCaseData.paymentTerms || null,
      shipmentDetails: newCaseData.shipmentDetails || null,
      status: 'Draft',
      riskLevel: 'Low',
      notes: newCaseData.notes || null
    });
  };

  const safeParseFloat = (val: any) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const cases = casesData?.cases || [];

  const getStatusColor = (status: string) => {
    if (status === 'Approved' || status === 'Active' || status === 'Settled') return 'bg-green-100 text-green-800';
    if (status === 'Rejected' || status === 'Cancelled') return 'bg-red-100 text-red-800';
    if (status === 'Under Review' || status === 'Submitted') return 'bg-yellow-100 text-yellow-800';
    if (status === 'Draft') return 'bg-gray-100 text-gray-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Approved' || status === 'Active' || status === 'Settled') return <CheckCircle className="w-4 h-4" />;
    if (status === 'Rejected' || status === 'Cancelled') return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const totalValueUsd = cases.reduce((sum, c) => sum + safeParseFloat(c.tradeValueUsd), 0);
  const activeCases = cases.filter(c => c.status !== 'Settled' && c.status !== 'Rejected' && c.status !== 'Cancelled').length;
  const pendingCases = cases.filter(c => c.status === 'Under Review' || c.status === 'Submitted').length;

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg border border-secondary/20 text-secondary">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-finabridge-title">FinaBridge Trade</h1>
              <p className="text-muted-foreground text-sm">Gold-backed trade finance for international commerce.</p>
            </div>
          </div>
          
          <div className="hidden md:block text-right border-l border-border pl-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Gold Spot</p>
            <p className="text-secondary font-bold font-mono">${GOLD_PRICE.toFixed(2)} <span className="text-xs text-muted-foreground">/g</span></p>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-200 text-blue-700 rounded-lg">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-medium">Active Trade Cases</p>
                  <p className="text-2xl font-bold text-blue-800">{activeCases}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-200 text-amber-700 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-amber-700 font-medium">Pending Review</p>
                  <p className="text-2xl font-bold text-amber-800">{pendingCases}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-200 text-green-700 rounded-lg">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-green-700 font-medium">Total Trade Value</p>
                  <p className="text-2xl font-bold text-green-800">${totalValueUsd.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN CONTENT */}
        {selectedCase ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedCase.caseNumber}</CardTitle>
                  <CardDescription>{selectedCase.companyName} - {selectedCase.commodityType}</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setSelectedCase(null)}>
                  Back to List
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge className={`mt-1 ${getStatusColor(selectedCase.status)}`}>{selectedCase.status}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Trade Type</Label>
                  <p className="font-medium">{selectedCase.tradeType}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Risk Level</Label>
                  <p className="font-medium">{selectedCase.riskLevel}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Commodity</Label>
                  <p className="font-medium">{selectedCase.commodityType}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Trade Value (USD)</Label>
                  <p className="font-medium">${safeParseFloat(selectedCase.tradeValueUsd).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Gold Equivalent</Label>
                  <p className="font-medium">{(safeParseFloat(selectedCase.tradeValueUsd) / GOLD_PRICE).toFixed(2)}g</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Buyer</Label>
                  <p className="font-medium">{selectedCase.buyerName || 'Not specified'}</p>
                  {selectedCase.buyerCountry && <p className="text-sm text-gray-500">{selectedCase.buyerCountry}</p>}
                </div>
                <div>
                  <Label className="text-gray-500">Seller</Label>
                  <p className="font-medium">{selectedCase.sellerName || 'Not specified'}</p>
                  {selectedCase.sellerCountry && <p className="text-sm text-gray-500">{selectedCase.sellerCountry}</p>}
                </div>
              </div>

              {selectedCase.paymentTerms && (
                <div>
                  <Label className="text-gray-500">Payment Terms</Label>
                  <p className="font-medium">{selectedCase.paymentTerms}</p>
                </div>
              )}

              {selectedCase.shipmentDetails && (
                <div>
                  <Label className="text-gray-500">Shipment Details</Label>
                  <p className="font-medium">{selectedCase.shipmentDetails}</p>
                </div>
              )}

              {selectedCase.notes && (
                <div>
                  <Label className="text-gray-500">Notes</Label>
                  <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedCase.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <Label className="text-gray-500 block mb-2">Approval Status</Label>
                <div className="flex gap-2">
                  <Badge variant="outline" className={selectedCase.opsApproval ? 'border-green-300 bg-green-50' : 'border-gray-300'}>
                    Ops: {selectedCase.opsApproval ? 'Approved' : 'Pending'}
                  </Badge>
                  <Badge variant="outline" className={selectedCase.complianceApproval ? 'border-green-300 bg-green-50' : 'border-gray-300'}>
                    Compliance: {selectedCase.complianceApproval ? 'Approved' : 'Pending'}
                  </Badge>
                  <Badge variant="outline" className={selectedCase.riskApproval ? 'border-green-300 bg-green-50' : 'border-gray-300'}>
                    Risk: {selectedCase.riskApproval ? 'Approved' : 'Pending'}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Created: {new Date(selectedCase.createdAt).toLocaleDateString()} • 
                  Last updated: {new Date(selectedCase.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted border border-border p-1 mb-8 w-full md:w-auto flex">
              <TabsTrigger value="cases" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <Briefcase className="w-4 h-4 mr-2" /> My Trades
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> New Trade Request
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cases" className="mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Trade Cases</CardTitle>
                    <CardDescription>Your active and historical trade finance cases.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-cases">
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                    </div>
                  ) : cases.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p className="mb-4">You don't have any trade cases yet.</p>
                      <Button onClick={() => setActiveTab('create')} className="bg-orange-600 hover:bg-orange-700">
                        <PlusCircle className="w-4 h-4 mr-2" /> Create Your First Trade
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cases.map((tradeCase) => (
                        <div 
                          key={tradeCase.id}
                          onClick={() => setSelectedCase(tradeCase)}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          data-testid={`card-trade-case-${tradeCase.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${getStatusColor(tradeCase.status).replace('text-', 'bg-').replace('-800', '-100')}`}>
                              {getStatusIcon(tradeCase.status)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900">{tradeCase.caseNumber}</h4>
                                <Badge className={getStatusColor(tradeCase.status)}>{tradeCase.status}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {tradeCase.companyName} • {tradeCase.tradeType}
                              </p>
                              <p className="text-xs text-gray-500">
                                ${safeParseFloat(tradeCase.tradeValueUsd).toLocaleString()} • {tradeCase.commodityType}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" data-testid={`button-view-case-${tradeCase.id}`}>
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Trade Request</CardTitle>
                  <CardDescription>Submit a new trade finance case for approval. Your request will be reviewed by our team.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Company Name *</Label>
                      <Input 
                        value={newCaseData.companyName}
                        onChange={(e) => setNewCaseData({...newCaseData, companyName: e.target.value})}
                        placeholder="Your company name"
                        data-testid="input-company-name"
                      />
                    </div>
                    <div>
                      <Label>Trade Type *</Label>
                      <Select value={newCaseData.tradeType} onValueChange={(v) => setNewCaseData({...newCaseData, tradeType: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Import">Import</SelectItem>
                          <SelectItem value="Export">Export</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Commodity Type *</Label>
                      <Input 
                        value={newCaseData.commodityType}
                        onChange={(e) => setNewCaseData({...newCaseData, commodityType: e.target.value})}
                        placeholder="e.g., Electronics, Raw Materials"
                        data-testid="input-commodity-type"
                      />
                    </div>
                    <div>
                      <Label>Trade Value (USD) *</Label>
                      <Input 
                        type="number"
                        value={newCaseData.tradeValueUsd}
                        onChange={(e) => setNewCaseData({...newCaseData, tradeValueUsd: e.target.value})}
                        placeholder="e.g., 50000"
                        data-testid="input-value-usd"
                      />
                      {newCaseData.tradeValueUsd && (
                        <p className="text-xs text-gray-500 mt-1">
                          ≈ {(parseFloat(newCaseData.tradeValueUsd) / GOLD_PRICE).toFixed(2)}g gold equivalent
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Buyer Name</Label>
                      <Input 
                        value={newCaseData.buyerName}
                        onChange={(e) => setNewCaseData({...newCaseData, buyerName: e.target.value})}
                        placeholder="Buyer company name"
                        data-testid="input-buyer-name"
                      />
                    </div>
                    <div>
                      <Label>Buyer Country</Label>
                      <Input 
                        value={newCaseData.buyerCountry}
                        onChange={(e) => setNewCaseData({...newCaseData, buyerCountry: e.target.value})}
                        placeholder="e.g., USA"
                        data-testid="input-buyer-country"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Seller Name</Label>
                      <Input 
                        value={newCaseData.sellerName}
                        onChange={(e) => setNewCaseData({...newCaseData, sellerName: e.target.value})}
                        placeholder="Seller company name"
                        data-testid="input-seller-name"
                      />
                    </div>
                    <div>
                      <Label>Seller Country</Label>
                      <Input 
                        value={newCaseData.sellerCountry}
                        onChange={(e) => setNewCaseData({...newCaseData, sellerCountry: e.target.value})}
                        placeholder="e.g., China"
                        data-testid="input-seller-country"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Payment Terms</Label>
                    <Input 
                      value={newCaseData.paymentTerms}
                      onChange={(e) => setNewCaseData({...newCaseData, paymentTerms: e.target.value})}
                      placeholder="e.g., LC at Sight, Net 30"
                      data-testid="input-payment-terms"
                    />
                  </div>

                  <div>
                    <Label>Shipment Details</Label>
                    <Textarea 
                      value={newCaseData.shipmentDetails}
                      onChange={(e) => setNewCaseData({...newCaseData, shipmentDetails: e.target.value})}
                      placeholder="Describe shipment method, timeline, etc."
                      data-testid="input-shipment-details"
                    />
                  </div>

                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea 
                      value={newCaseData.notes}
                      onChange={(e) => setNewCaseData({...newCaseData, notes: e.target.value})}
                      placeholder="Any additional information..."
                      data-testid="input-notes"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={resetForm}>Clear Form</Button>
                    <Button 
                      onClick={handleCreateCase} 
                      className="bg-orange-600 hover:bg-orange-700"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-trade"
                    >
                      {createMutation.isPending ? 'Submitting...' : 'Submit Trade Request'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
