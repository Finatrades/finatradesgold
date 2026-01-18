import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { toProxyUrl } from '@/lib/file-utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  Package, CheckCircle2, XCircle, Clock, Search, Eye, 
  FileCheck, Truck, Scale, MessageSquare, DollarSign,
  ArrowRight, AlertTriangle, User
} from 'lucide-react';

interface DepositItem {
  id: string;
  itemType: string;
  quantity: number;
  weightPerUnitGrams: string;
  totalDeclaredWeightGrams: string;
  purity: string;
  brand?: string;
  mint?: string;
  serialNumber?: string;
  customDescription?: string;
  verifiedWeightGrams?: string;
  verifiedPurity?: string;
  photoFrontUrl?: string;
  photoBackUrl?: string;
  additionalPhotos?: string[];
}

interface Deposit {
  id: string;
  referenceNumber: string;
  userId: string;
  depositType: string;
  requiresNegotiation: boolean;
  totalDeclaredWeightGrams: string;
  itemCount: number;
  deliveryMethod: string;
  status: string;
  createdAt: string;
  items: DepositItem[];
  user?: { id: string; firstName: string; lastName: string; email: string };
  inspection?: any;
  negotiations?: any[];
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  SUBMITTED: { label: 'Submitted', variant: 'secondary' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'outline' },
  RECEIVED: { label: 'Received', variant: 'default' },
  INSPECTION: { label: 'Inspection', variant: 'outline' },
  NEGOTIATION: { label: 'Negotiation', variant: 'outline' },
  AGREED: { label: 'Agreed', variant: 'default' },
  READY_FOR_PAYMENT: { label: 'Ready for UFM', variant: 'default' },
  APPROVED: { label: 'Approved', variant: 'default' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

export default function PhysicalDepositsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'receive' | 'inspect' | 'offer' | 'reject' | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: stats } = useQuery({
    queryKey: ['physical-deposit-stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/physical-deposits/admin/deposits/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const { data: deposits, isLoading } = useQuery({
    queryKey: ['physical-deposits', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' 
        ? '/api/physical-deposits/admin/deposits'
        : `/api/physical-deposits/admin/deposits?status=${statusFilter}`;
      const res = await apiRequest('GET', url);
      if (!res.ok) throw new Error('Failed to fetch deposits');
      return res.json();
    },
  });

  const { data: goldPrice } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/gold-price');
      if (!res.ok) throw new Error('Failed to fetch gold price');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const reviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/physical-deposits/admin/deposits/${id}/review`, {});
      if (!res.ok) throw new Error('Failed to review');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      toast({ title: 'Deposit marked as under review' });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('POST', `/api/physical-deposits/admin/deposits/${id}/receive`, data);
      if (!res.ok) throw new Error('Failed to receive');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      setDialogMode(null);
      toast({ title: 'Deposit marked as received' });
    },
  });

  const inspectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('POST', `/api/physical-deposits/admin/deposits/${id}/inspect`, data);
      if (!res.ok) throw new Error('Failed to inspect');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      setDialogMode(null);
      toast({ title: 'Inspection completed' });
    },
  });

  const offerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('POST', `/api/physical-deposits/admin/deposits/${id}/offer`, data);
      if (!res.ok) throw new Error('Failed to send offer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      setDialogMode(null);
      toast({ title: 'Offer sent to user' });
    },
  });

  const acceptCounterMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message?: string }) => {
      const res = await apiRequest('POST', `/api/physical-deposits/admin/deposits/${id}/accept-counter`, { message });
      if (!res.ok) throw new Error('Failed to accept counter');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      toast({ title: 'Counter-offer accepted', description: 'Negotiation completed successfully' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest('POST', `/api/physical-deposits/admin/deposits/${id}/reject`, { reason });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      setDialogMode(null);
      toast({ title: 'Deposit rejected' });
    },
  });

  // Send deposit to UFM for unified approval flow
  const sendToUfmMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/physical-deposits/admin/deposits/${id}/send-to-ufm`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send to UFM');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['unified-pending-payments'] });
      toast({ 
        title: 'Sent to UFM', 
        description: `Deposit ready for final approval in Unified Payment Management (${data.creditedGrams}g)` 
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const openDialog = (deposit: Deposit, mode: 'view' | 'receive' | 'inspect' | 'offer' | 'reject') => {
    setSelectedDeposit(deposit);
    setDialogMode(mode);
  };

  const [receiveForm, setReceiveForm] = useState({ batchLotId: '', notes: '' });
  const [inspectForm, setInspectForm] = useState({
    grossWeightGrams: '',
    netWeightGrams: '',
    purityResult: '',
    assayMethod: '',
    assayFeeUsd: '0',
    refiningFeeUsd: '0',
    handlingFeeUsd: '0',
    creditedGrams: '',
    inspectorNotes: '',
    useManualPrice: false,
    manualPricePerGram: '',
  });
  const [offerForm, setOfferForm] = useState({
    proposedGrams: 0,
    proposedFees: 0,
    usdOffer: 0,
    message: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-800">Physical Gold Deposits</h1>
            <p className="text-gray-500">Manage physical gold deposit requests</p>
          </div>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { key: 'submitted', label: 'Submitted', icon: Package, color: 'text-blue-600' },
          { key: 'underReview', label: 'Review', icon: Eye, color: 'text-purple-600' },
          { key: 'received', label: 'Received', icon: Truck, color: 'text-orange-600' },
          { key: 'inspection', label: 'Inspection', icon: Scale, color: 'text-yellow-600' },
          { key: 'negotiation', label: 'Negotiation', icon: MessageSquare, color: 'text-indigo-600' },
          { key: 'agreed', label: 'Agreed', icon: CheckCircle2, color: 'text-teal-600' },
          { key: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-green-600' },
          { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600' },
        ].map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(key.toUpperCase())}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-2xl font-bold">{stats?.[key] || 0}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deposit Requests</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="INSPECTION">Inspection</SelectItem>
                <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                <SelectItem value="AGREED">Agreed</SelectItem>
                <SelectItem value="READY_FOR_PAYMENT">Ready for UFM</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : deposits?.deposits?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No deposits found</div>
          ) : (
            <div className="space-y-4">
              {deposits?.deposits?.map((deposit: Deposit) => (
                <Card key={deposit.id} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-lg font-bold">{deposit.referenceNumber}</span>
                          <Badge variant={STATUS_BADGES[deposit.status]?.variant || 'default'}>
                            {STATUS_BADGES[deposit.status]?.label || deposit.status}
                          </Badge>
                          {deposit.requiresNegotiation && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Needs Negotiation
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {deposit.user?.firstName} {deposit.user?.lastName}
                          </span>
                          <span>{deposit.depositType.replace('_', ' ')}</span>
                          <span>{deposit.itemCount} item(s)</span>
                          <span className="font-medium">{parseFloat(deposit.totalDeclaredWeightGrams).toFixed(4)} g</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Submitted {formatDistanceToNow(new Date(deposit.createdAt))} ago
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openDialog(deposit, 'view')} data-testid={`button-view-${deposit.id}`}>
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                        {deposit.status === 'SUBMITTED' && (
                          <Button size="sm" onClick={() => reviewMutation.mutate(deposit.id)} data-testid={`button-review-${deposit.id}`}>
                            Start Review
                          </Button>
                        )}
                        {deposit.status === 'UNDER_REVIEW' && (
                          <Button size="sm" onClick={() => openDialog(deposit, 'receive')} data-testid={`button-receive-${deposit.id}`}>
                            <Truck className="w-4 h-4 mr-1" /> Mark Received
                          </Button>
                        )}
                        {deposit.status === 'RECEIVED' && (
                          <Button size="sm" onClick={() => openDialog(deposit, 'inspect')} data-testid={`button-inspect-${deposit.id}`}>
                            <Scale className="w-4 h-4 mr-1" /> Inspect
                          </Button>
                        )}
                        {(deposit.status === 'INSPECTION' || deposit.status === 'NEGOTIATION') && deposit.requiresNegotiation && (
                          <>
                            <Button size="sm" onClick={() => openDialog(deposit, 'offer')} data-testid={`button-offer-${deposit.id}`}>
                              <DollarSign className="w-4 h-4 mr-1" /> Send Offer
                            </Button>
                            {(deposit.negotiations?.length ?? 0) > 0 && 
                             deposit.negotiations?.[deposit.negotiations.length - 1]?.messageType === 'USER_COUNTER' && (
                              <Button 
                                size="sm" 
                                className="bg-teal-600 hover:bg-teal-700"
                                onClick={() => acceptCounterMutation.mutate({ id: deposit.id })}
                                disabled={acceptCounterMutation.isPending}
                                data-testid={`button-accept-counter-${deposit.id}`}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Accept Counter
                              </Button>
                            )}
                          </>
                        )}
                        {(deposit.status === 'AGREED' || (deposit.status === 'INSPECTION' && !deposit.requiresNegotiation)) && (
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700" 
                            onClick={() => sendToUfmMutation.mutate(deposit.id)} 
                            disabled={sendToUfmMutation.isPending}
                            data-testid={`button-send-to-ufm-${deposit.id}`}
                          >
                            <ArrowRight className="w-4 h-4 mr-1" /> {sendToUfmMutation.isPending ? 'Sending...' : 'Send to UFM'}
                          </Button>
                        )}
                        {!['APPROVED', 'REJECTED', 'CANCELLED', 'READY_FOR_PAYMENT'].includes(deposit.status) && (
                          <Button variant="destructive" size="sm" onClick={() => openDialog(deposit, 'reject')} data-testid={`button-reject-${deposit.id}`}>
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogMode === 'view' && !!selectedDeposit} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deposit Details: {selectedDeposit?.referenceNumber}</DialogTitle>
            <DialogDescription>View complete deposit information</DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Status</Label>
                  <Badge variant={STATUS_BADGES[selectedDeposit.status]?.variant}>{STATUS_BADGES[selectedDeposit.status]?.label}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Type</Label>
                  <p className="font-medium text-sm">{selectedDeposit.depositType.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Total Weight</Label>
                  <p className="font-medium text-sm">{parseFloat(selectedDeposit.totalDeclaredWeightGrams).toFixed(4)} g</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Delivery Method</Label>
                  <p className="font-medium text-sm">{selectedDeposit.deliveryMethod.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* User Info */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <User className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium">{selectedDeposit.user?.firstName} {selectedDeposit.user?.lastName}</p>
                      <p className="text-sm text-gray-600">{selectedDeposit.user?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submission Date & Ownership */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Submitted</Label>
                  <p className="font-medium text-sm">{new Date(selectedDeposit.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(selectedDeposit.createdAt), { addSuffix: true })}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Beneficial Owner</Label>
                  <p className="font-medium text-sm">{(selectedDeposit as any).isBeneficialOwner ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Source of Metal */}
              {((selectedDeposit as any).sourceOfMetal || (selectedDeposit as any).sourceDetails) && (
                <div className="grid grid-cols-2 gap-4">
                  {(selectedDeposit as any).sourceOfMetal && (
                    <div>
                      <Label className="text-gray-500 text-xs">Source of Metal</Label>
                      <p className="font-medium text-sm">{(selectedDeposit as any).sourceOfMetal}</p>
                    </div>
                  )}
                  {(selectedDeposit as any).sourceDetails && (
                    <div>
                      <Label className="text-gray-500 text-xs">Source Details</Label>
                      <p className="text-sm text-gray-700">{(selectedDeposit as any).sourceDetails}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery/Pickup Details */}
              {selectedDeposit.deliveryMethod !== 'PERSONAL_DROPOFF' && (
                <Card className="bg-gray-50">
                  <CardContent className="py-3">
                    <Label className="text-gray-500 text-xs block mb-2">Pickup/Courier Details</Label>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {(selectedDeposit as any).pickupContactName && (
                        <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{(selectedDeposit as any).pickupContactName}</span></div>
                      )}
                      {(selectedDeposit as any).pickupContactPhone && (
                        <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{(selectedDeposit as any).pickupContactPhone}</span></div>
                      )}
                      {(selectedDeposit as any).pickupAddress && (
                        <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{(selectedDeposit as any).pickupAddress}</span></div>
                      )}
                      {(selectedDeposit as any).preferredDatetime && (
                        <div><span className="text-gray-500">Preferred:</span> <span className="font-medium">{new Date((selectedDeposit as any).preferredDatetime).toLocaleString()}</span></div>
                      )}
                      {(selectedDeposit as any).scheduledDatetime && (
                        <div><span className="text-gray-500">Scheduled:</span> <span className="font-medium text-green-600">{new Date((selectedDeposit as any).scheduledDatetime).toLocaleString()}</span></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              {((selectedDeposit as any).invoiceUrl || (selectedDeposit as any).assayCertificateUrl || (selectedDeposit as any).additionalDocuments?.length > 0) && (
                <div>
                  <Label className="text-gray-500 text-xs block mb-2">Documents</Label>
                  <div className="flex flex-wrap gap-2">
                    {(selectedDeposit as any).invoiceUrl && (
                      <a href={toProxyUrl((selectedDeposit as any).invoiceUrl) || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200">
                        <FileCheck className="w-4 h-4" /> Invoice
                      </a>
                    )}
                    {(selectedDeposit as any).assayCertificateUrl && (
                      <a href={toProxyUrl((selectedDeposit as any).assayCertificateUrl) || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200">
                        <FileCheck className="w-4 h-4" /> Assay Certificate
                      </a>
                    )}
                    {(selectedDeposit as any).additionalDocuments?.map((doc: any, idx: number) => (
                      <a key={idx} href={toProxyUrl(doc.url) || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
                        <FileCheck className="w-4 h-4" /> {doc.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <Label className="text-gray-500 text-xs mb-2 block">Items ({selectedDeposit.items?.length})</Label>
                <div className="space-y-2">
                  {selectedDeposit.items?.map((item, i) => (
                    <Card key={item.id} className="bg-gray-50">
                      <CardContent className="py-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-medium">Item #{i + 1}: {item.itemType.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-500">
                              {item.quantity}x @ {item.weightPerUnitGrams}g = {parseFloat(item.totalDeclaredWeightGrams).toFixed(4)}g
                            </p>
                            <p className="text-sm text-gray-500">Purity: {item.purity}</p>
                            {item.brand && <p className="text-sm text-gray-500">Brand: {item.brand}</p>}
                            {item.mint && <p className="text-sm text-gray-500">Mint: {item.mint}</p>}
                            {item.serialNumber && <p className="text-sm text-gray-500">Serial: <span className="font-mono">{item.serialNumber}</span></p>}
                            {item.customDescription && <p className="text-sm text-gray-500 italic">{item.customDescription}</p>}
                          </div>
                          {item.verifiedWeightGrams && (
                            <Badge variant="outline" className="text-green-600">
                              Verified: {item.verifiedWeightGrams}g
                            </Badge>
                          )}
                        </div>
                        {(item.photoFrontUrl || item.photoBackUrl || (item.additionalPhotos && item.additionalPhotos.length > 0)) && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-gray-500 mb-2">Photos</p>
                            <div className="flex flex-wrap gap-2">
                              {item.photoFrontUrl && (
                                <a href={toProxyUrl(item.photoFrontUrl) || '#'} target="_blank" rel="noopener noreferrer" className="block">
                                  <img 
                                    src={toProxyUrl(item.photoFrontUrl) || ''} 
                                    alt="Front view" 
                                    className="w-16 h-16 object-cover rounded-md border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all"
                                  />
                                </a>
                              )}
                              {item.photoBackUrl && (
                                <a href={toProxyUrl(item.photoBackUrl) || '#'} target="_blank" rel="noopener noreferrer" className="block">
                                  <img 
                                    src={toProxyUrl(item.photoBackUrl) || ''} 
                                    alt="Back view" 
                                    className="w-16 h-16 object-cover rounded-md border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all"
                                  />
                                </a>
                              )}
                              {item.additionalPhotos?.map((photoUrl: string, photoIdx: number) => (
                                <a key={photoIdx} href={toProxyUrl(photoUrl) || '#'} target="_blank" rel="noopener noreferrer" className="block">
                                  <img 
                                    src={toProxyUrl(photoUrl) || ''} 
                                    alt={`Photo ${photoIdx + 1}`} 
                                    className="w-16 h-16 object-cover rounded-md border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Inspection Results */}
              {selectedDeposit.inspection && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="py-3">
                    <Label className="text-green-700 text-xs font-semibold block mb-2">Inspection Results</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {selectedDeposit.inspection.grossWeightGrams && (
                        <div><span className="text-gray-500">Gross Weight:</span> <span className="font-medium">{selectedDeposit.inspection.grossWeightGrams}g</span></div>
                      )}
                      {selectedDeposit.inspection.netWeightGrams && (
                        <div><span className="text-gray-500">Net Weight:</span> <span className="font-medium">{selectedDeposit.inspection.netWeightGrams}g</span></div>
                      )}
                      {selectedDeposit.inspection.creditedGrams && (
                        <div><span className="text-gray-500">Credited:</span> <span className="font-bold text-green-600">{selectedDeposit.inspection.creditedGrams}g</span></div>
                      )}
                      {selectedDeposit.inspection.purityResult && (
                        <div><span className="text-gray-500">Purity:</span> <span className="font-medium">{selectedDeposit.inspection.purityResult}</span></div>
                      )}
                      {selectedDeposit.inspection.assayMethod && (
                        <div><span className="text-gray-500">Assay Method:</span> <span className="font-medium">{selectedDeposit.inspection.assayMethod}</span></div>
                      )}
                    </div>
                    {(selectedDeposit.inspection.assayFeeUsd || selectedDeposit.inspection.refiningFeeUsd || selectedDeposit.inspection.handlingFeeUsd) && (
                      <div className="mt-3 pt-2 border-t border-green-200 grid grid-cols-3 gap-3 text-sm">
                        {selectedDeposit.inspection.assayFeeUsd && (
                          <div><span className="text-gray-500">Assay Fee:</span> <span className="font-medium">${selectedDeposit.inspection.assayFeeUsd}</span></div>
                        )}
                        {selectedDeposit.inspection.refiningFeeUsd && (
                          <div><span className="text-gray-500">Refining Fee:</span> <span className="font-medium">${selectedDeposit.inspection.refiningFeeUsd}</span></div>
                        )}
                        {selectedDeposit.inspection.handlingFeeUsd && (
                          <div><span className="text-gray-500">Handling Fee:</span> <span className="font-medium">${selectedDeposit.inspection.handlingFeeUsd}</span></div>
                        )}
                      </div>
                    )}
                    {selectedDeposit.inspection.notes && (
                      <div className="mt-2 p-2 bg-white rounded text-sm"><span className="text-gray-500">Notes:</span> {selectedDeposit.inspection.notes}</div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Negotiation */}
              {selectedDeposit.requiresNegotiation && (
                <div>
                  <Label className="text-gray-500 text-xs mb-2 block">Negotiation</Label>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="py-3 space-y-2">
                      {(selectedDeposit as any).usdEstimateFromUser && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">User's USD Estimate:</span>
                          <span className="font-medium">${parseFloat((selectedDeposit as any).usdEstimateFromUser).toLocaleString()}</span>
                        </div>
                      )}
                      {(selectedDeposit as any).usdCounterFromAdmin && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Admin's USD Offer:</span>
                          <span className="font-medium">${parseFloat((selectedDeposit as any).usdCounterFromAdmin).toLocaleString()}</span>
                        </div>
                      )}
                      {(selectedDeposit as any).usdAgreedValue && (
                        <div className="flex justify-between text-green-700">
                          <span className="text-sm font-medium">Agreed USD Value:</span>
                          <span className="font-bold">${parseFloat((selectedDeposit as any).usdAgreedValue).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedDeposit.negotiations && selectedDeposit.negotiations.length > 0 && (
                        <div className="pt-2 border-t border-amber-200">
                          <p className="text-xs text-gray-500 mb-2">Message History ({selectedDeposit.negotiations.length})</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedDeposit.negotiations.map((msg: any, idx: number) => (
                              <div key={idx} className={`text-xs p-2 rounded ${msg.senderRole === 'admin' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                                <span className="font-medium">{msg.senderRole === 'admin' ? 'Admin' : 'User'}:</span>{' '}
                                <span>{msg.messageType.replace(/_/g, ' ')}</span>
                                {msg.proposedGrams && <span className="ml-2">({msg.proposedGrams}g)</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Admin Notes */}
              {(selectedDeposit as any).adminNotes && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Label className="text-purple-700 text-xs font-semibold block mb-1">Admin Notes</Label>
                  <p className="text-sm text-gray-700">{(selectedDeposit as any).adminNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'receive' && !!selectedDeposit} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Received</DialogTitle>
            <DialogDescription>Confirm physical receipt of gold items</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Batch/Lot ID (Optional)</Label>
              <Input
                value={receiveForm.batchLotId}
                onChange={(e) => setReceiveForm({ ...receiveForm, batchLotId: e.target.value })}
                placeholder="Enter batch or lot ID..."
                data-testid="input-batch-lot-id"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={receiveForm.notes}
                onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                placeholder="Any notes about the receipt..."
                data-testid="input-receive-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button 
              onClick={() => selectedDeposit && receiveMutation.mutate({ id: selectedDeposit.id, data: receiveForm })}
              disabled={receiveMutation.isPending}
              data-testid="button-confirm-receive"
            >
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'inspect' && !!selectedDeposit} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inspection Results</DialogTitle>
            <DialogDescription>Enter assay and inspection details</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6">
            {/* LEFT PANEL - Input Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Inspection Data</h3>
              <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Gross Weight (g)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={inspectForm.grossWeightGrams}
                  onChange={(e) => setInspectForm({ ...inspectForm, grossWeightGrams: e.target.value })}
                  data-testid="input-gross-weight"
                />
              </div>
              <div className="space-y-2">
                <Label>Net Weight (g)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={inspectForm.netWeightGrams}
                  onChange={(e) => setInspectForm({ ...inspectForm, netWeightGrams: e.target.value })}
                  data-testid="input-net-weight"
                />
              </div>
              <div className="space-y-2">
                <Label>Purity Result (Fineness: 0-999.9)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="999.9"
                  value={inspectForm.purityResult}
                  onChange={(e) => setInspectForm({ ...inspectForm, purityResult: e.target.value })}
                  placeholder="e.g. 999.9 (24K = 999.9, 22K = 916.7)"
                  className={inspectForm.purityResult && parseFloat(inspectForm.purityResult) > 999.9 ? 'border-red-500' : ''}
                  data-testid="input-purity-result"
                />
                {inspectForm.purityResult && parseFloat(inspectForm.purityResult) > 999.9 && (
                  <p className="text-xs text-red-500">Purity must be between 0-999.9</p>
                )}
                <p className="text-xs text-gray-400">Fineness scale: 999.9 = 99.99% pure (24K), 916.7 = 91.67% (22K)</p>
              </div>
              <div className="space-y-2">
                <Label>Assay Method</Label>
                <Select value={inspectForm.assayMethod} onValueChange={(v) => setInspectForm({ ...inspectForm, assayMethod: v })}>
                  <SelectTrigger data-testid="select-assay-method">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XRF">XRF Analysis</SelectItem>
                    <SelectItem value="Fire Assay">Fire Assay</SelectItem>
                    <SelectItem value="Visual">Visual Inspection</SelectItem>
                    <SelectItem value="Serial Verification">Serial Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Assay Fee (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inspectForm.assayFeeUsd}
                  onChange={(e) => setInspectForm({ ...inspectForm, assayFeeUsd: e.target.value })}
                  data-testid="input-assay-fee"
                />
              </div>
              <div className="space-y-2">
                <Label>Refining Fee (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inspectForm.refiningFeeUsd}
                  onChange={(e) => setInspectForm({ ...inspectForm, refiningFeeUsd: e.target.value })}
                  data-testid="input-refining-fee"
                />
              </div>
              <div className="space-y-2">
                <Label>Handling Fee (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inspectForm.handlingFeeUsd}
                  onChange={(e) => setInspectForm({ ...inspectForm, handlingFeeUsd: e.target.value })}
                  data-testid="input-handling-fee"
                />
              </div>
            </div>
            
            {/* Gold Price Selection */}
            <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Gold Price for Calculation</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${!inspectForm.useManualPrice ? 'font-medium text-purple-600' : 'text-gray-400'}`}>Live</span>
                  <Switch
                    checked={inspectForm.useManualPrice}
                    onCheckedChange={(checked) => setInspectForm({ ...inspectForm, useManualPrice: checked })}
                    data-testid="switch-manual-price"
                  />
                  <span className={`text-xs ${inspectForm.useManualPrice ? 'font-medium text-purple-600' : 'text-gray-400'}`}>Manual</span>
                </div>
              </div>
              {inspectForm.useManualPrice ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter price per gram"
                    value={inspectForm.manualPricePerGram}
                    onChange={(e) => setInspectForm({ ...inspectForm, manualPricePerGram: e.target.value })}
                    className="w-40"
                    data-testid="input-manual-price"
                  />
                  <span className="text-sm text-gray-500">/ gram</span>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Live Price: <span className="font-medium text-purple-600">${goldPrice?.pricePerGram?.toFixed(2) || '---'}/g</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Credited Grams (Final)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    const netWeight = parseFloat(inspectForm.netWeightGrams) || 0;
                    const purity = parseFloat(inspectForm.purityResult) || 0;
                    if (netWeight > 0 && purity > 0 && purity <= 999.9) {
                      const calculated = (netWeight * purity / 999.9).toFixed(4);
                      setInspectForm({ ...inspectForm, creditedGrams: calculated });
                    }
                  }}
                  disabled={!inspectForm.netWeightGrams || !inspectForm.purityResult || parseFloat(inspectForm.purityResult) > 999.9}
                  data-testid="button-auto-calc"
                >
                  Auto Calculate
                </Button>
              </div>
              <Input
                type="number"
                step="0.0001"
                value={inspectForm.creditedGrams}
                onChange={(e) => setInspectForm({ ...inspectForm, creditedGrams: e.target.value })}
                className={parseFloat(inspectForm.creditedGrams) > parseFloat(inspectForm.netWeightGrams) ? 'border-red-500' : ''}
                data-testid="input-credited-grams"
              />
              {parseFloat(inspectForm.creditedGrams) > parseFloat(inspectForm.netWeightGrams) && (
                <p className="text-xs text-red-500">Credited grams cannot exceed net weight</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Inspector Notes</Label>
              <Textarea
                value={inspectForm.inspectorNotes}
                onChange={(e) => setInspectForm({ ...inspectForm, inspectorNotes: e.target.value })}
                placeholder="Any observations or notes..."
                rows={3}
                data-testid="input-inspector-notes"
              />
            </div>
            </div>
            
            {/* RIGHT PANEL - Valuation Summary */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Valuation Summary</h3>
            
            {/* Summary Card - Shows weight valuations, credited gold, fees, and USD equivalent */}
            {(inspectForm.grossWeightGrams || inspectForm.netWeightGrams || inspectForm.creditedGrams) && (
              (() => {
                const grossWeight = parseFloat(inspectForm.grossWeightGrams) || 0;
                const netWeight = parseFloat(inspectForm.netWeightGrams) || 0;
                const creditedGrams = parseFloat(inspectForm.creditedGrams) || 0;
                
                // Use manual price if enabled, otherwise use live price
                const livePrice = goldPrice?.pricePerGram;
                const manualPrice = parseFloat(inspectForm.manualPricePerGram);
                const pricePerGram = inspectForm.useManualPrice 
                  ? (!isNaN(manualPrice) && manualPrice > 0 ? manualPrice : undefined)
                  : livePrice;
                const hasPriceData = pricePerGram && pricePerGram > 0;
                const priceSource = inspectForm.useManualPrice ? 'Manual' : 'Live';
                
                const grossWeightUsd = hasPriceData ? grossWeight * pricePerGram : 0;
                const netWeightUsd = hasPriceData ? netWeight * pricePerGram : 0;
                const creditedUsd = hasPriceData ? creditedGrams * pricePerGram : 0;
                
                const assayFee = parseFloat(inspectForm.assayFeeUsd) || 0;
                const refiningFee = parseFloat(inspectForm.refiningFeeUsd) || 0;
                const handlingFee = parseFloat(inspectForm.handlingFeeUsd) || 0;
                const totalFees = assayFee + refiningFee + handlingFee;
                const netUsdValue = hasPriceData ? creditedUsd - totalFees : 0;
                
                const purity = parseFloat(inspectForm.purityResult);
                const hasValidation = creditedGrams > netWeight && netWeight > 0;
                const hasPurityError = !isNaN(purity) && purity > 999.9;
                const hasNegativeFees = assayFee < 0 || refiningFee < 0 || handlingFee < 0;
                
                const formatUsd = (val: number) => hasPriceData 
                  ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '---';
                
                return (
                  <Card className={`border-2 ${hasValidation || hasPurityError || hasNegativeFees ? 'bg-red-50 border-red-300' : 'bg-gradient-to-r from-purple-50 to-amber-50 border-purple-200'}`}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-purple-700">Valuation Summary</span>
                        <span className={`text-xs px-2 py-1 rounded ${inspectForm.useManualPrice ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-500'}`}>
                          {priceSource}: {hasPriceData ? `$${pricePerGram.toFixed(2)}/g` : '---'}
                        </span>
                      </div>
                      
                      {/* Weight Valuations */}
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Weight Valuations:</p>
                        <div className="space-y-2">
                          {grossWeight > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Gross Weight ({grossWeight.toFixed(2)}g):</span>
                              <span className="font-medium text-gray-700">{formatUsd(grossWeightUsd)}</span>
                            </div>
                          )}
                          {netWeight > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Net Weight ({netWeight.toFixed(2)}g):</span>
                              <span className="font-medium text-purple-600">{formatUsd(netWeightUsd)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Credited Gold - PRIMARY VALUE */}
                      {creditedGrams > 0 && (
                        <div className="text-center p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-300">
                          <p className="text-xs text-amber-700 font-medium mb-1">Final Gold to Credit</p>
                          <p className="text-2xl font-bold text-amber-600">{creditedGrams.toFixed(4)} g</p>
                          <p className="text-sm text-gray-500 mt-1">≈ {formatUsd(creditedUsd)} equivalent</p>
                        </div>
                      )}

                      {/* Fee Deductions */}
                      {totalFees > 0 && creditedGrams > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1">
                          <p className="text-xs font-medium text-gray-600 mb-2">Fee Deductions:</p>
                          {assayFee > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Assay Fee:</span>
                              <span className="text-red-500">-${assayFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {refiningFee > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Refining Fee:</span>
                              <span className="text-red-500">-${refiningFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {handlingFee > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Handling Fee:</span>
                              <span className="text-red-500">-${handlingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs font-medium pt-1 border-t">
                            <span className="text-gray-600">Total Fees:</span>
                            <span className="text-red-600">-${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}

                      {/* Fee Summary - Shows deduction in equivalent terms */}
                      {totalFees > 0 && creditedGrams > 0 && hasPriceData && (
                        <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Fees Equivalent</p>
                          <p className="text-sm text-gray-600">
                            Total Fees: <span className="font-medium text-red-500">-{formatUsd(totalFees)}</span>
                            <span className="text-gray-400 mx-1">≈</span>
                            <span className="text-red-500">-{(totalFees / pricePerGram).toFixed(4)}g</span>
                          </p>
                        </div>
                      )}

                      {hasNegativeFees && (
                        <p className="text-xs text-red-500 text-center">⚠️ Fees cannot be negative</p>
                      )}
                      <p className="text-xs text-gray-400 text-center">* USD values are approximate based on current gold rate</p>
                    </CardContent>
                  </Card>
                );
              })()
            )}

            {/* Show placeholder when no data entered */}
            {!inspectForm.grossWeightGrams && !inspectForm.netWeightGrams && !inspectForm.creditedGrams && (
              <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Enter inspection data to see valuation summary</p>
              </div>
            )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button 
              onClick={() => selectedDeposit && inspectMutation.mutate({ id: selectedDeposit.id, data: inspectForm })}
              disabled={(() => {
                const grossWeight = parseFloat(inspectForm.grossWeightGrams);
                const netWeight = parseFloat(inspectForm.netWeightGrams);
                const purity = parseFloat(inspectForm.purityResult);
                const creditedGrams = parseFloat(inspectForm.creditedGrams);
                const assayFee = parseFloat(inspectForm.assayFeeUsd) || 0;
                const refiningFee = parseFloat(inspectForm.refiningFeeUsd) || 0;
                const handlingFee = parseFloat(inspectForm.handlingFeeUsd) || 0;
                
                return (
                  isNaN(grossWeight) || grossWeight <= 0 ||
                  isNaN(netWeight) || netWeight <= 0 ||
                  isNaN(purity) || purity <= 0 || purity > 999.9 ||
                  isNaN(creditedGrams) || creditedGrams <= 0 ||
                  creditedGrams > netWeight ||
                  assayFee < 0 || refiningFee < 0 || handlingFee < 0 ||
                  inspectMutation.isPending
                );
              })()}
              data-testid="button-confirm-inspect"
            >
              Submit Inspection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'offer' && !!selectedDeposit} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Offer</DialogTitle>
            <DialogDescription>Propose credited grams to the user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(selectedDeposit as any)?.usdEstimateFromUser && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800">User's Target USD Value:</span>
                  <span className="font-bold text-amber-900">${parseFloat((selectedDeposit as any).usdEstimateFromUser).toLocaleString()}</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">Consider this when making your offer</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Proposed Credited Grams</Label>
              <Input
                type="number"
                step="0.0001"
                value={offerForm.proposedGrams}
                onChange={(e) => setOfferForm({ ...offerForm, proposedGrams: parseFloat(e.target.value) })}
                data-testid="input-proposed-grams"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Fees (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={offerForm.proposedFees}
                onChange={(e) => setOfferForm({ ...offerForm, proposedFees: parseFloat(e.target.value) })}
                data-testid="input-proposed-fees"
              />
            </div>
            <div className="space-y-2">
              <Label>USD Valuation Offer</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={offerForm.usdOffer || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, usdOffer: parseFloat(e.target.value) || 0 })}
                  className="pl-7"
                  placeholder="Enter USD value for this gold"
                  data-testid="input-usd-offer"
                />
              </div>
              <p className="text-xs text-gray-500">This is the total USD value you're offering for the deposited gold</p>
            </div>
            <div className="space-y-2">
              <Label>Message to User</Label>
              <Textarea
                value={offerForm.message}
                onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                placeholder="Explain the offer..."
                data-testid="input-offer-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button 
              onClick={() => selectedDeposit && offerMutation.mutate({ id: selectedDeposit.id, data: offerForm })}
              disabled={offerForm.proposedGrams <= 0 || offerMutation.isPending}
              data-testid="button-send-offer"
            >
              Send Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'reject' && !!selectedDeposit} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deposit</DialogTitle>
            <DialogDescription>This action cannot be undone</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this deposit is being rejected..."
                rows={4}
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => selectedDeposit && rejectMutation.mutate({ id: selectedDeposit.id, reason: rejectReason })}
              disabled={!rejectReason || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              Reject Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </AdminLayout>
  );
}
