import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  APPROVED: { label: 'Approved', variant: 'default' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

export default function PhysicalDepositsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'receive' | 'inspect' | 'offer' | 'reject' | 'approve' | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: stats } = useQuery({
    queryKey: ['physical-deposit-stats'],
    queryFn: async () => {
      const res = await fetch('/api/physical-deposits/admin/deposits/stats', { credentials: 'include' });
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
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch deposits');
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/physical-deposits/admin/deposits/${id}/review`, {
        method: 'POST',
        credentials: 'include',
      });
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
      const res = await fetch(`/api/physical-deposits/admin/deposits/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
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
      const res = await fetch(`/api/physical-deposits/admin/deposits/${id}/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
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
      const res = await fetch(`/api/physical-deposits/admin/deposits/${id}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to send offer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      setDialogMode(null);
      toast({ title: 'Offer sent to user' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/physical-deposits/admin/deposits/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      setDialogMode(null);
      toast({ title: 'Deposit rejected' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/physical-deposits/admin/deposits/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      setDialogMode(null);
      toast({ 
        title: 'Deposit Approved', 
        description: `Certificates: ${data.physicalCertificateNumber} & ${data.digitalCertificateNumber}` 
      });
    },
  });

  const openDialog = (deposit: Deposit, mode: 'view' | 'receive' | 'inspect' | 'offer' | 'reject' | 'approve') => {
    setSelectedDeposit(deposit);
    setDialogMode(mode);
  };

  const [receiveForm, setReceiveForm] = useState({ batchLotId: '', notes: '' });
  const [approveForm, setApproveForm] = useState({ goldPriceUsd: 0, vaultLocation: 'Wingold & Metals DMCC', adminNotes: '' });
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
  });
  const [offerForm, setOfferForm] = useState({
    proposedGrams: 0,
    proposedFees: 0,
    message: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  return (
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
                          <Button size="sm" onClick={() => openDialog(deposit, 'offer')} data-testid={`button-offer-${deposit.id}`}>
                            <DollarSign className="w-4 h-4 mr-1" /> Send Offer
                          </Button>
                        )}
                        {(deposit.status === 'AGREED' || (deposit.status === 'INSPECTION' && !deposit.requiresNegotiation)) && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openDialog(deposit, 'approve')} data-testid={`button-approve-${deposit.id}`}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                        )}
                        {!['APPROVED', 'REJECTED', 'CANCELLED'].includes(deposit.status) && (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deposit Details: {selectedDeposit?.referenceNumber}</DialogTitle>
            <DialogDescription>View complete deposit information</DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <p className="font-medium">{STATUS_BADGES[selectedDeposit.status]?.label}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Type</Label>
                  <p className="font-medium">{selectedDeposit.depositType.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Total Weight</Label>
                  <p className="font-medium">{parseFloat(selectedDeposit.totalDeclaredWeightGrams).toFixed(4)} g</p>
                </div>
                <div>
                  <Label className="text-gray-500">Delivery Method</Label>
                  <p className="font-medium">{selectedDeposit.deliveryMethod.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">User</Label>
                <p className="font-medium">{selectedDeposit.user?.firstName} {selectedDeposit.user?.lastName} ({selectedDeposit.user?.email})</p>
              </div>
              <div>
                <Label className="text-gray-500 mb-2 block">Items ({selectedDeposit.items?.length})</Label>
                <div className="space-y-2">
                  {selectedDeposit.items?.map((item, i) => (
                    <Card key={item.id} className="bg-gray-50">
                      <CardContent className="py-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Item #{i + 1}: {item.itemType.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-500">
                              {item.quantity}x @ {item.weightPerUnitGrams}g = {parseFloat(item.totalDeclaredWeightGrams).toFixed(4)}g
                            </p>
                            <p className="text-sm text-gray-500">Purity: {item.purity}</p>
                            {item.brand && <p className="text-sm text-gray-500">Brand: {item.brand}</p>}
                            {item.customDescription && <p className="text-sm text-gray-500">{item.customDescription}</p>}
                          </div>
                          {item.verifiedWeightGrams && (
                            <Badge variant="outline" className="text-green-600">
                              Verified: {item.verifiedWeightGrams}g
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Inspection Results</DialogTitle>
            <DialogDescription>Enter assay and inspection details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Purity Result</Label>
                <Input
                  value={inspectForm.purityResult}
                  onChange={(e) => setInspectForm({ ...inspectForm, purityResult: e.target.value })}
                  placeholder="e.g. 999.9"
                  data-testid="input-purity-result"
                />
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
            <div className="space-y-2">
              <Label>Credited Grams (Final)</Label>
              <Input
                type="number"
                step="0.0001"
                value={inspectForm.creditedGrams}
                onChange={(e) => setInspectForm({ ...inspectForm, creditedGrams: e.target.value })}
                data-testid="input-credited-grams"
              />
            </div>
            <div className="space-y-2">
              <Label>Inspector Notes</Label>
              <Textarea
                value={inspectForm.inspectorNotes}
                onChange={(e) => setInspectForm({ ...inspectForm, inspectorNotes: e.target.value })}
                placeholder="Any observations or notes..."
                data-testid="input-inspector-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button 
              onClick={() => selectedDeposit && inspectMutation.mutate({ id: selectedDeposit.id, data: inspectForm })}
              disabled={!inspectForm.grossWeightGrams || !inspectForm.netWeightGrams || !inspectForm.creditedGrams || inspectMutation.isPending}
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

      <Dialog open={dialogMode === 'approve' && !!selectedDeposit} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Deposit</DialogTitle>
            <DialogDescription>
              Generate dual certificates and credit user's wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-medium">{selectedDeposit?.referenceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Declared Weight:</span>
                  <span className="font-medium">{parseFloat(selectedDeposit?.totalDeclaredWeightGrams || '0').toFixed(4)} g</span>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <Label>Current Gold Price (USD/g)</Label>
              <Input
                type="number"
                step="0.01"
                value={approveForm.goldPriceUsd}
                onChange={(e) => setApproveForm({ ...approveForm, goldPriceUsd: parseFloat(e.target.value) })}
                placeholder="e.g. 65.50"
                data-testid="input-gold-price"
              />
            </div>
            <div className="space-y-2">
              <Label>Vault Location</Label>
              <Input
                value={approveForm.vaultLocation}
                onChange={(e) => setApproveForm({ ...approveForm, vaultLocation: e.target.value })}
                data-testid="input-vault-location"
              />
            </div>
            <div className="space-y-2">
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={approveForm.adminNotes}
                onChange={(e) => setApproveForm({ ...approveForm, adminNotes: e.target.value })}
                placeholder="Any notes about this approval..."
                data-testid="input-approve-notes"
              />
            </div>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium text-green-800">This will:</p>
                <ul className="list-disc list-inside text-green-700 mt-2 space-y-1">
                  <li>Generate Physical Storage Certificate (Wingold)</li>
                  <li>Generate Digital Ownership Certificate (Finatrades)</li>
                  <li>Credit user's MPGW wallet</li>
                  <li>Create deposit transaction</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedDeposit && approveMutation.mutate({ id: selectedDeposit.id, data: approveForm })}
              disabled={approveForm.goldPriceUsd <= 0 || approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve & Generate Certificates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
