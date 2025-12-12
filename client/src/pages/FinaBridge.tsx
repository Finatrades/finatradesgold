import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, ShieldCheck, PlusCircle, Briefcase, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  opsApproval: boolean;
  complianceApproval: boolean;
  riskApproval: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function FinaBridge() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('cases');
  const [cases, setCases] = useState<DbTradeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedCase, setSelectedCase] = useState<DbTradeCase | null>(null);
  
  const [formData, setFormData] = useState({
    companyName: '',
    tradeType: 'Import',
    commodityType: 'Gold Bullion',
    tradeValueUsd: '',
    buyerName: '',
    buyerCountry: '',
    sellerName: '',
    sellerCountry: '',
    paymentTerms: '',
    shipmentDetails: ''
  });

  const fetchCases = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiRequest('GET', `/api/trade/cases/${user.id}`);
      const data = await res.json();
      setCases(data.cases || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load trade cases', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user]);

  const generateCaseNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TF-${year}-${random}`;
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.companyName || !formData.tradeValueUsd) {
      toast({ title: 'Missing Fields', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const payload = {
        caseNumber: generateCaseNumber(),
        userId: user.id,
        companyName: formData.companyName,
        tradeType: formData.tradeType,
        commodityType: formData.commodityType,
        tradeValueUsd: formData.tradeValueUsd,
        buyerName: formData.buyerName || null,
        buyerCountry: formData.buyerCountry || null,
        sellerName: formData.sellerName || null,
        sellerCountry: formData.sellerCountry || null,
        paymentTerms: formData.paymentTerms || null,
        shipmentDetails: formData.shipmentDetails || null,
        status: 'Draft',
        riskLevel: 'Low'
      };

      const res = await apiRequest('POST', '/api/trade/cases', payload);
      const data = await res.json();
      
      toast({ title: 'Trade Case Created', description: `Case ${data.tradeCase.caseNumber} has been submitted` });
      addNotification({
        title: 'New Trade Case',
        message: `Trade case ${data.tradeCase.caseNumber} created successfully`,
        type: 'success'
      });
      
      setFormData({
        companyName: '',
        tradeType: 'Import',
        commodityType: 'Gold Bullion',
        tradeValueUsd: '',
        buyerName: '',
        buyerCountry: '',
        sellerName: '',
        sellerCountry: '',
        paymentTerms: '',
        shipmentDetails: ''
      });
      setActiveTab('cases');
      fetchCases();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create trade case', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-700';
      case 'Submitted': return 'bg-blue-100 text-blue-700';
      case 'Under Review': return 'bg-amber-100 text-amber-700';
      case 'Approved': return 'bg-green-100 text-green-700';
      case 'Active': return 'bg-purple-100 text-purple-700';
      case 'Settled': return 'bg-emerald-100 text-emerald-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg border border-secondary/20 text-secondary">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">FinaBridge Trade Finance</h1>
              <p className="text-muted-foreground text-sm">Gold-backed trade financing for imports and exports.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={fetchCases} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="hidden md:block text-right border-l border-border pl-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Gold Spot</p>
              <p className="text-secondary font-bold font-mono">$85.22 <span className="text-xs text-muted-foreground">/g</span></p>
            </div>
          </div>
        </div>

        {selectedCase ? (
          <Card className="bg-white shadow-sm border">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedCase.caseNumber}</h2>
                  <p className="text-muted-foreground">{selectedCase.companyName}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedCase(null)}>Back to List</Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Trade Type</p>
                  <p className="font-bold">{selectedCase.tradeType}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Commodity</p>
                  <p className="font-bold">{selectedCase.commodityType}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Trade Value</p>
                  <p className="font-bold">${parseFloat(selectedCase.tradeValueUsd).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getStatusColor(selectedCase.status)}`}>
                    {selectedCase.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Buyer Details</h3>
                  <div className="space-y-2">
                    <p><span className="text-muted-foreground">Name:</span> {selectedCase.buyerName || 'Not specified'}</p>
                    <p><span className="text-muted-foreground">Country:</span> {selectedCase.buyerCountry || 'Not specified'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Seller Details</h3>
                  <div className="space-y-2">
                    <p><span className="text-muted-foreground">Name:</span> {selectedCase.sellerName || 'Not specified'}</p>
                    <p><span className="text-muted-foreground">Country:</span> {selectedCase.sellerCountry || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2">Approval Status</h3>
                <div className="flex gap-4">
                  <div className={`px-4 py-2 rounded-lg ${selectedCase.opsApproval ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    Operations: {selectedCase.opsApproval ? 'Approved' : 'Pending'}
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${selectedCase.complianceApproval ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    Compliance: {selectedCase.complianceApproval ? 'Approved' : 'Pending'}
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${selectedCase.riskApproval ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    Risk: {selectedCase.riskApproval ? 'Approved' : 'Pending'}
                  </div>
                </div>
              </div>

              {selectedCase.notes && (
                <div className="space-y-2">
                  <h3 className="font-semibold border-b pb-2">Notes</h3>
                  <p className="text-muted-foreground">{selectedCase.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted border border-border p-1 mb-8 w-full md:w-auto flex">
              <TabsTrigger value="cases" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <Briefcase className="w-4 h-4 mr-2" /> My Trade Cases
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Create New Trade
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <ShieldCheck className="w-4 h-4 mr-2" /> Audit & Compliance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cases" className="mt-0">
              {loading ? (
                <Card className="bg-white shadow-sm border">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Loading trade cases...</p>
                  </CardContent>
                </Card>
              ) : cases.length === 0 ? (
                <Card className="bg-white shadow-sm border">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-bold text-foreground mb-2">No Trade Cases Yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first trade case to get started with gold-backed trade finance.</p>
                    <Button onClick={() => setActiveTab('create')}>
                      <PlusCircle className="w-4 h-4 mr-2" /> Create Trade Case
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {cases.map((tradeCase) => (
                    <Card key={tradeCase.id} className="bg-white shadow-sm border hover:border-secondary/50 transition-colors cursor-pointer" onClick={() => setSelectedCase(tradeCase)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-secondary/10 rounded-lg">
                              <Briefcase className="w-5 h-5 text-secondary" />
                            </div>
                            <div>
                              <h3 className="font-bold">{tradeCase.caseNumber}</h3>
                              <p className="text-sm text-muted-foreground">{tradeCase.companyName} - {tradeCase.tradeType}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold">${parseFloat(tradeCase.tradeValueUsd).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{tradeCase.commodityType}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(tradeCase.status)}`}>
                              {tradeCase.status}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create">
              <Card className="bg-white shadow-sm border">
                <CardContent className="p-6">
                  <form onSubmit={handleCreateCase} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Company Name *</label>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="w-full p-3 border rounded-lg"
                          placeholder="Your company name"
                          data-testid="input-company-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Trade Type</label>
                        <select
                          value={formData.tradeType}
                          onChange={(e) => setFormData({ ...formData, tradeType: e.target.value })}
                          className="w-full p-3 border rounded-lg"
                          data-testid="select-trade-type"
                        >
                          <option value="Import">Import</option>
                          <option value="Export">Export</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Commodity Type</label>
                        <select
                          value={formData.commodityType}
                          onChange={(e) => setFormData({ ...formData, commodityType: e.target.value })}
                          className="w-full p-3 border rounded-lg"
                          data-testid="select-commodity"
                        >
                          <option value="Gold Bullion">Gold Bullion</option>
                          <option value="Gold Jewelry">Gold Jewelry</option>
                          <option value="Gold Coins">Gold Coins</option>
                          <option value="Other Precious Metals">Other Precious Metals</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Trade Value (USD) *</label>
                        <input
                          type="number"
                          value={formData.tradeValueUsd}
                          onChange={(e) => setFormData({ ...formData, tradeValueUsd: e.target.value })}
                          className="w-full p-3 border rounded-lg"
                          placeholder="0.00"
                          data-testid="input-trade-value"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Buyer Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Buyer Name</label>
                          <input
                            type="text"
                            value={formData.buyerName}
                            onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="Buyer company name"
                            data-testid="input-buyer-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Buyer Country</label>
                          <input
                            type="text"
                            value={formData.buyerCountry}
                            onChange={(e) => setFormData({ ...formData, buyerCountry: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="Country"
                            data-testid="input-buyer-country"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Seller Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Seller Name</label>
                          <input
                            type="text"
                            value={formData.sellerName}
                            onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="Seller company name"
                            data-testid="input-seller-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Seller Country</label>
                          <input
                            type="text"
                            value={formData.sellerCountry}
                            onChange={(e) => setFormData({ ...formData, sellerCountry: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="Country"
                            data-testid="input-seller-country"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Additional Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Payment Terms</label>
                          <input
                            type="text"
                            value={formData.paymentTerms}
                            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="e.g., LC at sight, 30 days net"
                            data-testid="input-payment-terms"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Shipment Details</label>
                          <input
                            type="text"
                            value={formData.shipmentDetails}
                            onChange={(e) => setFormData({ ...formData, shipmentDetails: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="e.g., CIF Dubai, Sea freight"
                            data-testid="input-shipment"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('cases')}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creating} data-testid="button-submit-trade">
                        {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit Trade Case
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <Card className="bg-white shadow-sm border border-border">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-bold text-foreground mb-2">Compliance Dashboard</h3>
                  <p>Global view of all trade risks, AML flags, and audit trails.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

      </div>
    </DashboardLayout>
  );
}
