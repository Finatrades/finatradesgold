import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useCMSPage } from '@/context/CMSContext';
import { Database, TrendingUp, History, PlusCircle, Bell, Settings, Banknote, Briefcase, Loader2, Lock, Clock, Award, FileText, CheckCircle, AlertCircle, XCircle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DepositList from '@/components/finavault/DepositList';
import RequestDetails from '@/components/finavault/RequestDetails';
import CashOutForm from '@/components/finavault/CashOutForm';
import VaultActivityList from '@/components/finavault/VaultActivityList';
import CertificatesView from '@/components/finavault/CertificatesView';
import { DepositRequest, DepositRequestStatus } from '@/types/finavault';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocation, Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toProxyUrl } from '@/lib/file-utils';
import PhysicalGoldDeposit from './PhysicalGoldDeposit';
import BuyGoldBars from '@/components/finavault/BuyGoldBars';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
  UNDER_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Under Review' },
  RECEIVED: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Received' },
  INSPECTION: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Inspection' },
  NEGOTIATION: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Negotiation' },
  AGREED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Agreed' },
  READY_FOR_PAYMENT: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Ready' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
};

const STATUS_FLOW = ['SUBMITTED', 'UNDER_REVIEW', 'RECEIVED', 'INSPECTION', 'NEGOTIATION', 'AGREED', 'READY_FOR_PAYMENT', 'APPROVED'];

function DepositStatusTimeline({ deposit }: { deposit: any }) {
  const currentStatus = deposit.status;
  const isRejected = currentStatus === 'REJECTED' || currentStatus === 'CANCELLED';
  const requiresNegotiation = deposit.depositType === 'RAW' || deposit.depositType === 'OTHER';
  
  const timeline = requiresNegotiation 
    ? STATUS_FLOW 
    : STATUS_FLOW.filter(s => !['NEGOTIATION', 'AGREED'].includes(s));
  
  const currentIndex = timeline.indexOf(currentStatus);
  
  const getStepInfo = (step: string, index: number) => {
    const isCompleted = currentIndex > index || (currentIndex === timeline.length - 1 && index === currentIndex);
    const isCurrent = currentIndex === index;
    const isPending = currentIndex < index;
    
    if (isRejected && step === currentStatus) {
      return { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-500 text-white', lineColor: 'bg-red-300' };
    }
    if (isCompleted) {
      return { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-500 text-white', lineColor: 'bg-green-400' };
    }
    if (isCurrent) {
      return { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'bg-purple-500 text-white', lineColor: 'bg-gray-300' };
    }
    return { icon: <Clock className="w-4 h-4" />, color: 'bg-gray-200 text-gray-400', lineColor: 'bg-gray-200' };
  };
  
  return (
    <div className="py-4 px-2 bg-gray-50 rounded-lg">
      <p className="text-xs font-medium text-muted-foreground mb-3 px-2">Progress Timeline</p>
      <div className="flex items-start justify-between relative">
        {timeline.map((step, index) => {
          const { icon, color, lineColor } = getStepInfo(step, index);
          const label = STATUS_COLORS[step]?.label || step;
          const isLast = index === timeline.length - 1;
          
          return (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color} z-10`}>
                {icon}
              </div>
              <span className="text-[10px] text-center mt-1.5 leading-tight max-w-[60px]">{label}</span>
              {!isLast && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${lineColor}`} style={{ transform: 'translateX(50%)' }} />
              )}
            </div>
          );
        })}
      </div>
      {isRejected && (
        <div className="mt-3 px-2">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <XCircle className="w-4 h-4" />
            <span className="font-medium">{currentStatus === 'REJECTED' ? 'Rejected' : 'Cancelled'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MyPhysicalDeposits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterValue, setCounterValue] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  // Get live gold price for real-time USD calculations
  const { data: goldPriceData } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['physical-deposits', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/physical-deposits/deposits', { 
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return { deposits: [] };
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: !!user?.id,
  });

  const deposits = data?.deposits || [];

  // Keep selectedDeposit in sync with latest data
  React.useEffect(() => {
    if (selectedDeposit && deposits.length > 0) {
      const updated = deposits.find((d: any) => d.id === selectedDeposit.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedDeposit)) {
        setSelectedDeposit(updated);
      }
    }
  }, [deposits, selectedDeposit]);

  // Calculate real-time USD from grams using live gold price
  const calculateUsd = (grams: string | number | null) => {
    if (!grams) return null;
    const gramsNum = typeof grams === 'string' ? parseFloat(grams) : grams;
    const pricePerGram = goldPriceData?.pricePerGram || selectedDeposit?.priceSnapshotUsdPerGram;
    if (!pricePerGram || isNaN(gramsNum)) return null;
    return (gramsNum * parseFloat(pricePerGram.toString())).toFixed(2);
  };

  // Handle user response to admin's offer
  const handleRespond = async (action: 'ACCEPT' | 'COUNTER' | 'REJECT') => {
    console.log('[FinaVault] handleRespond called:', action, 'selectedDeposit:', selectedDeposit?.id);
    if (!selectedDeposit) {
      console.log('[FinaVault] No selectedDeposit, returning');
      return;
    }
    
    setIsResponding(true);
    try {
      const body: any = { action };
      if (action === 'COUNTER' && counterValue) {
        body.counterUsd = parseFloat(counterValue);
        body.message = `User counter-offer: $${parseFloat(counterValue).toLocaleString()}`;
      }
      console.log('[FinaVault] Sending POST with body:', body);
      
      // Use apiRequest which handles CSRF token automatically
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('POST', `/api/physical-deposits/deposits/${selectedDeposit.id}/respond`, body);
      console.log('[FinaVault] Response received:', res.status);
      
      toast({
        title: action === 'ACCEPT' ? 'Offer Accepted!' : action === 'COUNTER' ? 'Counter Offer Sent' : 'Offer Rejected',
        description: action === 'ACCEPT' 
          ? 'The negotiation is complete. Your gold will be credited soon.' 
          : action === 'COUNTER'
          ? 'Your counter offer has been sent to the admin.'
          : 'You have rejected the offer.',
      });
      
      setSelectedDeposit(null);
      setShowCounterInput(false);
      setCounterValue('');
      refetch();
    } catch (err: any) {
      console.log('[FinaVault] Error responding:', err.message);
      toast({
        title: 'Error',
        description: err.message || 'Failed to respond to offer',
        variant: 'destructive',
      });
    } finally {
      setIsResponding(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white border">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (deposits.length === 0) {
    return (
      <Card className="bg-white border">
        <CardContent className="p-8 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Deposits Yet</h3>
          <p className="text-muted-foreground mb-4">
            You haven't submitted any physical gold deposits yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Use the "Deposit Gold" tab to submit your first deposit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            My Physical Gold Deposits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {deposits.map((deposit: any) => {
              const statusInfo = STATUS_COLORS[deposit.status] || STATUS_COLORS.SUBMITTED;
              return (
                <div 
                  key={deposit.id} 
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedDeposit(deposit)}
                  data-testid={`deposit-item-${deposit.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold">{deposit.referenceNumber}</span>
                        <Badge className={`${statusInfo.bg} ${statusInfo.text} border-0`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="capitalize">{deposit.depositType?.toLowerCase().replace('_', ' ')}</span>
                        {' • '}
                        <span>{parseFloat(deposit.totalDeclaredWeightGrams).toFixed(4)} g declared</span>
                        {/* Show credited grams from final approval OR inspection summary */}
                        {deposit.finalCreditedGrams ? (
                          <>
                            {' • '}
                            <span className="text-green-600 font-medium">
                              {parseFloat(deposit.finalCreditedGrams).toFixed(4)} g credited
                            </span>
                          </>
                        ) : deposit.inspectionSummary?.creditedGrams ? (
                          <>
                            {' • '}
                            <span className="text-amber-600 font-medium">
                              {parseFloat(deposit.inspectionSummary.creditedGrams).toFixed(4)} g (pending approval)
                            </span>
                          </>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {formatDistanceToNow(new Date(deposit.createdAt))} ago
                      </p>
                    </div>
                    <div className="text-right">
                      {deposit.status === 'NEGOTIATION' && (
                        <Button size="sm" variant="outline" className="border-orange-300 text-orange-600">
                          View Offer
                        </Button>
                      )}
                      {deposit.status === 'READY_FOR_PAYMENT' && (
                        <div className="flex items-center gap-1 text-indigo-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">Pending</span>
                        </div>
                      )}
                      {deposit.status === 'APPROVED' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Credited</span>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                  {deposit.items && deposit.items.length > 0 && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      {deposit.items.length} item{deposit.items.length > 1 ? 's' : ''}: 
                      {deposit.items.map((item: any, i: number) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          {item.quantity}x {item.itemType?.replace('_', ' ')} ({item.purity})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDeposit} onOpenChange={(open) => !open && setSelectedDeposit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              Deposit Details
              {selectedDeposit && (
                <Badge className={`${STATUS_COLORS[selectedDeposit.status]?.bg || 'bg-gray-100'} ${STATUS_COLORS[selectedDeposit.status]?.text || 'text-gray-700'} border-0`}>
                  {STATUS_COLORS[selectedDeposit.status]?.label || selectedDeposit.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDeposit && (
            <div className="space-y-5 px-6 pb-6 overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              {/* Status Timeline */}
              <DepositStatusTimeline deposit={selectedDeposit} />
              
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Reference Number</p>
                  <p className="font-mono font-semibold">{selectedDeposit.referenceNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deposit Type</p>
                  <p className="capitalize font-medium">{selectedDeposit.depositType?.toLowerCase().replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Declared Weight</p>
                  <p className="font-semibold">{parseFloat(selectedDeposit.totalDeclaredWeightGrams).toFixed(4)} g</p>
                </div>
                {selectedDeposit.finalCreditedGrams && (
                  <div>
                    <p className="text-xs text-muted-foreground">Credited Weight</p>
                    <p className="font-semibold text-green-600">{parseFloat(selectedDeposit.finalCreditedGrams).toFixed(4)} g</p>
                  </div>
                )}
                {selectedDeposit.goldPriceAtSubmission && (
                  <div>
                    <p className="text-xs text-muted-foreground">Price at Submission</p>
                    <p className="font-medium text-purple-600">${parseFloat(selectedDeposit.goldPriceAtSubmission).toFixed(2)}/g</p>
                  </div>
                )}
              </div>

              {/* Submission & Delivery */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">{new Date(selectedDeposit.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(selectedDeposit.createdAt), { addSuffix: true })}</p>
                </div>
                {selectedDeposit.deliveryMethod && (
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Method</p>
                    <p className="capitalize font-medium">{selectedDeposit.deliveryMethod?.toLowerCase().replace(/_/g, ' ')}</p>
                  </div>
                )}
              </div>

              {/* Source of Metal */}
              {(selectedDeposit.sourceOfMetal || selectedDeposit.sourceDetails) && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Source of Metal</p>
                  <p className="font-medium">{selectedDeposit.sourceOfMetal || 'Not specified'}</p>
                  {selectedDeposit.sourceDetails && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedDeposit.sourceDetails}</p>
                  )}
                </div>
              )}

              {/* Courier/Pickup Details */}
              {selectedDeposit.deliveryMethod !== 'PERSONAL_DROPOFF' && (selectedDeposit.pickupContactName || selectedDeposit.pickupAddress) && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 font-semibold mb-2">Pickup Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedDeposit.pickupContactName && (
                      <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{selectedDeposit.pickupContactName}</span></div>
                    )}
                    {selectedDeposit.pickupContactPhone && (
                      <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedDeposit.pickupContactPhone}</span></div>
                    )}
                    {selectedDeposit.pickupAddress && (
                      <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{selectedDeposit.pickupAddress}</span></div>
                    )}
                    {selectedDeposit.preferredDatetime && (
                      <div><span className="text-muted-foreground">Preferred:</span> <span className="font-medium">{new Date(selectedDeposit.preferredDatetime).toLocaleString()}</span></div>
                    )}
                    {selectedDeposit.scheduledDatetime && (
                      <div><span className="text-muted-foreground">Scheduled:</span> <span className="font-medium text-green-600">{new Date(selectedDeposit.scheduledDatetime).toLocaleString()}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Uploaded Documents */}
              {(selectedDeposit.invoiceUrl || selectedDeposit.assayCertificateUrl || (selectedDeposit.additionalDocuments && selectedDeposit.additionalDocuments.length > 0)) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Your Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDeposit.invoiceUrl && (
                      <a href={toProxyUrl(selectedDeposit.invoiceUrl) || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200">
                        <FileText className="w-4 h-4" /> Invoice
                      </a>
                    )}
                    {selectedDeposit.assayCertificateUrl && (
                      <a href={toProxyUrl(selectedDeposit.assayCertificateUrl) || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200">
                        <FileText className="w-4 h-4" /> Assay Certificate
                      </a>
                    )}
                    {selectedDeposit.additionalDocuments?.map((doc: any, idx: number) => (
                      <a key={idx} href={toProxyUrl(doc.url) || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
                        <FileText className="w-4 h-4" /> {doc.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              {selectedDeposit.items && selectedDeposit.items.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Items ({selectedDeposit.items.length})</p>
                  <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                    {selectedDeposit.items.map((item: any, i: number) => (
                      <div key={i} className="py-3 border-b last:border-0">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">{item.quantity}x {item.itemType?.replace('_', ' ')}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.purity} • {item.totalDeclaredWeightGrams ? parseFloat(item.totalDeclaredWeightGrams).toFixed(4) : item.weightPerUnitGrams ? (parseFloat(item.weightPerUnitGrams) * item.quantity).toFixed(4) : '—'} g
                          </span>
                        </div>
                        {(item.brand || item.mint || item.serialNumber) && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.brand && <span>Brand: {item.brand} </span>}
                            {item.mint && <span>• Mint: {item.mint} </span>}
                            {item.serialNumber && <span>• Serial: <span className="font-mono">{item.serialNumber}</span></span>}
                          </div>
                        )}
                        {item.customDescription && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{item.customDescription}</p>
                        )}
                        {/* Item Photos */}
                        {(item.photoFrontUrl || item.photoBackUrl || (item.additionalPhotos && item.additionalPhotos.length > 0)) && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Photos</p>
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
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inspection Results (if available) */}
              {selectedDeposit.inspection && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-2">Inspection Results</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedDeposit.inspection.grossWeightGrams && (
                      <div><span className="text-muted-foreground">Gross:</span> <span className="font-medium">{selectedDeposit.inspection.grossWeightGrams}g</span></div>
                    )}
                    {selectedDeposit.inspection.netWeightGrams && (
                      <div><span className="text-muted-foreground">Net:</span> <span className="font-medium">{selectedDeposit.inspection.netWeightGrams}g</span></div>
                    )}
                    {selectedDeposit.inspection.creditedGrams && (
                      <div><span className="text-muted-foreground">Credited:</span> <span className="font-bold text-green-600">{selectedDeposit.inspection.creditedGrams}g</span></div>
                    )}
                    {selectedDeposit.inspection.purityResult && (
                      <div><span className="text-muted-foreground">Purity:</span> <span className="font-medium">{selectedDeposit.inspection.purityResult}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedDeposit.adminNotes && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700 font-semibold mb-1">Notes from Admin</p>
                  <p className="text-sm">{selectedDeposit.adminNotes}</p>
                </div>
              )}

              {/* Negotiation Section - Chat-like UI */}
              {(selectedDeposit.status === 'NEGOTIATION' || selectedDeposit.status === 'AGREED' || selectedDeposit.usdCounterFromAdmin || selectedDeposit.usdEstimateFromUser) && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedDeposit.status === 'AGREED' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
                      <p className="text-sm font-semibold text-orange-800">
                        {selectedDeposit.status === 'AGREED' ? 'Deal Agreed!' : 'Negotiation in Progress'}
                      </p>
                    </div>
                    {selectedDeposit.usdAgreedValue && (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        Final: ${parseFloat(selectedDeposit.usdAgreedValue).toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Chat-like Negotiation History */}
                  <div className="bg-white rounded-lg border border-orange-100 p-3 mb-4 max-h-48 overflow-y-auto">
                    <div className="space-y-3">
                      {selectedDeposit.usdEstimateFromUser && (
                        <div className="flex justify-end">
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg rounded-br-none max-w-[80%]">
                            <p className="text-xs text-blue-600 mb-1">Your initial estimate</p>
                            <p className="font-semibold">${parseFloat(selectedDeposit.usdEstimateFromUser).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      {selectedDeposit.negotiations && selectedDeposit.negotiations.map((msg: any, idx: number) => (
                        <div key={idx} className={`flex ${msg.senderRole === 'admin' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`px-3 py-2 rounded-lg max-w-[80%] ${
                            msg.senderRole === 'admin' 
                              ? 'bg-purple-100 text-purple-800 rounded-bl-none' 
                              : 'bg-blue-100 text-blue-800 rounded-br-none'
                          }`}>
                            <p className={`text-xs mb-1 ${msg.senderRole === 'admin' ? 'text-purple-600' : 'text-blue-600'}`}>
                              {msg.senderRole === 'admin' ? 'Finatrades' : 'You'} • {msg.messageType?.replace(/_/g, ' ')}
                            </p>
                            {msg.proposedUsd && (
                              <p className="font-semibold">${parseFloat(msg.proposedUsd).toLocaleString()}</p>
                            )}
                            {msg.proposedGrams && (
                              <p className="text-sm">{msg.proposedGrams}g gold</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {selectedDeposit.usdCounterFromAdmin && !selectedDeposit.negotiations?.length && (
                        <div className="flex justify-start">
                          <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg rounded-bl-none max-w-[80%]">
                            <p className="text-xs text-purple-600 mb-1">Finatrades offer</p>
                            <p className="font-semibold">${parseFloat(selectedDeposit.usdCounterFromAdmin).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Summary Cards - Show latest offer from negotiations or inspection */}
                  {(() => {
                    const latestAdminOffer = selectedDeposit.negotiations?.filter((m: any) => m.senderRole === 'admin').pop();
                    const offeredGrams = latestAdminOffer?.proposedGrams || selectedDeposit.inspection?.creditedGrams;
                    const offeredFees = latestAdminOffer?.proposedFees || (
                      selectedDeposit.inspection ? 
                        (parseFloat(selectedDeposit.inspection.assayFeeUsd || '0') + 
                         parseFloat(selectedDeposit.inspection.refiningFeeUsd || '0') + 
                         parseFloat(selectedDeposit.inspection.handlingFeeUsd || '0')).toFixed(2) 
                        : null
                    );
                    return (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white/80 p-3 rounded-lg border border-orange-100">
                          <p className="text-xs text-muted-foreground">Offered Gold</p>
                          <p className="text-lg font-bold text-purple-700">
                            {offeredGrams ? `${parseFloat(offeredGrams).toLocaleString()} g` : '--'}
                          </p>
                        </div>
                        <div className="bg-white/80 p-3 rounded-lg border border-orange-100">
                          <p className="text-xs text-muted-foreground">Total Fees</p>
                          <p className="text-lg font-bold text-orange-700">
                            {offeredFees ? `$${parseFloat(offeredFees).toLocaleString()}` : '--'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Action Buttons - Show if NEGOTIATION status and admin has made an offer */}
                  {selectedDeposit.status === 'NEGOTIATION' && (selectedDeposit.usdCounterFromAdmin || selectedDeposit.negotiations?.some((m: any) => m.senderRole === 'admin')) && (
                    (() => {
                      const latestAdminOffer = selectedDeposit.negotiations?.filter((m: any) => m.senderRole === 'admin').pop();
                      const offeredGrams = latestAdminOffer?.proposedGrams || selectedDeposit.inspection?.creditedGrams;
                      return (
                        <div className="space-y-4">
                          {!showCounterInput ? (
                            <>
                              <div className="flex gap-2">
                                <Button 
                                  className="flex-1 bg-green-600 hover:bg-green-700 h-12"
                                  onClick={() => handleRespond('ACCEPT')}
                                  disabled={isResponding}
                                  data-testid="button-accept-offer"
                                >
                                  {isResponding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                                  Accept {offeredGrams ? `${parseFloat(offeredGrams).toLocaleString()}g` : 'Offer'}
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline"
                                  className="flex-1 border-orange-400 text-orange-700 hover:bg-orange-100"
                                  onClick={() => setShowCounterInput(true)}
                                  disabled={isResponding}
                                  data-testid="button-counter-offer"
                                >
                                  Make Counter Offer
                                </Button>
                                <Button 
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50 px-4"
                                  onClick={() => handleRespond('REJECT')}
                                  disabled={isResponding}
                                  data-testid="button-reject-offer"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="bg-white p-3 rounded-lg border border-orange-200 space-y-3">
                              <p className="text-sm font-medium text-orange-800">Your counter offer (in grams)</p>
                              
                              {/* Quick value buttons based on offered grams */}
                              {offeredGrams && (
                                <div className="flex flex-wrap gap-2">
                                  {[0.95, 0.97, 0.99, 1.02, 1.05].map((multiplier) => {
                                    const value = (parseFloat(offeredGrams) * multiplier).toFixed(4);
                                    const label = multiplier === 1.02 ? '+2%' : multiplier === 1.05 ? '+5%' : 
                                                 multiplier === 0.99 ? '-1%' : multiplier === 0.97 ? '-3%' : '-5%';
                                    return (
                                      <Button
                                        key={multiplier}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-8"
                                        onClick={() => setCounterValue(value)}
                                      >
                                        {label} ({value}g)
                                      </Button>
                                    );
                                  })}
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    step="0.0001"
                                    value={counterValue}
                                    onChange={(e) => setCounterValue(e.target.value)}
                                    placeholder="Enter grams"
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    data-testid="input-counter-amount"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">g</span>
                                </div>
                                <Button 
                                  className="bg-purple-600 hover:bg-purple-700"
                                  onClick={() => handleRespond('COUNTER')}
                                  disabled={isResponding || !counterValue}
                                  data-testid="button-submit-counter"
                                >
                                  {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                                </Button>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="w-full text-gray-500"
                                onClick={() => {
                                  setShowCounterInput(false);
                                  setCounterValue('');
                                }}
                                disabled={isResponding}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* Rejection Reason */}
              {selectedDeposit.status === 'REJECTED' && selectedDeposit.rejectionReason && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm font-semibold text-red-700 mb-2">Rejection Reason</p>
                  <p className="text-sm">{selectedDeposit.rejectionReason}</p>
                </div>
              )}

            </div>
          )}
          
          {/* Fixed footer outside scrollable area */}
          <div className="flex justify-end px-6 py-4 border-t bg-white">
            <Button variant="outline" onClick={() => setSelectedDeposit(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FinaVault() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getContent } = useCMSPage('finavault');
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // State
  const [activeTab, setActiveTab] = useState('vault-activity');
  const [selectedRequest, setSelectedRequest] = useState<DepositRequest | null>(null);
  const [expandedLedgerRows, setExpandedLedgerRows] = useState<Set<string>>(new Set());

  // Fetch vault deposit requests
  const { data: depositData, isLoading: depositsLoading } = useQuery({
    queryKey: ['vault-deposits', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/deposits/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch vault withdrawal requests
  const { data: withdrawalData } = useQuery({
    queryKey: ['vault-withdrawals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/withdrawals/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch vault holdings for balance calculation
  const { data: holdingsData } = useQuery({
    queryKey: ['vault-holdings', user?.id],
    queryFn: async () => {
      if (!user?.id) return { holdings: [] };
      const res = await fetch(`/api/vault/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { holdings: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch vault ownership summary (central ledger)
  const { data: ownershipData } = useQuery({
    queryKey: ['vault-ownership', user?.id],
    queryFn: async () => {
      if (!user?.id) return { ownership: null };
      const res = await fetch(`/api/vault/ownership/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { ownership: null };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch vault ledger history - always refetch on mount to ensure fresh data
  const { data: ledgerData } = useQuery({
    queryKey: ['vault-ledger', user?.id],
    queryFn: async () => {
      if (!user?.id) return { entries: [] };
      const res = await fetch(`/api/vault/ledger/${user.id}?limit=50`, { credentials: 'include' });
      if (!res.ok) return { entries: [] };
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  // Fetch user transactions for history display
  const { data: transactionsData } = useQuery({
    queryKey: ['user-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return { transactions: [] };
      const res = await fetch(`/api/transactions/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { transactions: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch deposit requests (bank transfer deposits)
  const { data: depositRequestsData } = useQuery({
    queryKey: ['deposit-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/deposit-requests/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch FinaBridge wallet data for locked gold display
  const { data: finabridgeData } = useQuery({
    queryKey: ['finabridge-wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return { wallet: null, holds: [] };
      const [walletRes, holdsRes] = await Promise.all([
        fetch(`/api/finabridge/wallet/${user.id}`, { credentials: 'include' }),
        fetch(`/api/finabridge/settlement-holds/${user.id}`, { credentials: 'include' })
      ]);
      const wallet = walletRes.ok ? (await walletRes.json()).wallet : null;
      const holds = holdsRes.ok ? (await holdsRes.json()).holds : [];
      return { wallet, holds };
    },
    enabled: !!user?.id
  });

  // Fetch wallet for USD balance
  const { data: walletData } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return { wallet: null };
      const res = await fetch(`/api/wallet/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { wallet: null };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch BNSL plans for locked gold calculation
  const { data: bnslData } = useQuery({
    queryKey: ['bnsl-plans', user?.id],
    queryFn: async () => {
      if (!user?.id) return { plans: [] };
      const res = await fetch(`/api/bnsl/plans/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { plans: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch user certificates for history display
  const { data: certificatesData } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return { certificates: [] };
      const res = await fetch(`/api/certificates/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { certificates: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch current gold price
  const { data: goldPriceData } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return { pricePerGram: 85 };
      return res.json();
    }
  });

  // Transform API deposit requests to match frontend type
  const apiRequests = (depositData?.requests || []).map((req: any) => ({
    id: req.referenceNumber,
    requestId: req.id,
    userId: req.userId,
    vaultLocation: req.vaultLocation,
    depositType: req.depositType,
    totalDeclaredWeightGrams: parseFloat(req.totalDeclaredWeightGrams),
    items: req.items || [],
    deliveryMethod: req.deliveryMethod,
    pickupDetails: req.pickupDetails,
    documents: req.documents || [],
    status: req.status as DepositRequestStatus,
    submittedAt: req.createdAt,
    vaultInternalReference: req.vaultInternalReference,
    rejectionReason: req.rejectionReason,
  }));

  const goldPricePerGram = goldPriceData?.pricePerGram || 85;
  
  // Safe parse function to handle null/undefined values
  const safeParseFloat = (val: any) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  // Use ownership summary from central ledger if available, otherwise fallback to individual wallet data
  const ownership = ownershipData?.ownership;
  
  // Get values from central ledger or calculate from individual wallets
  const totalVaultGold = ownership 
    ? safeParseFloat(ownership.totalGoldGrams)
    : (holdingsData?.holdings || []).reduce((sum: number, h: any) => sum + safeParseFloat(h.goldGrams), 0);
  
  const availableGold = ownership 
    ? safeParseFloat(ownership.availableGrams)
    : Math.max(0, totalVaultGold - safeParseFloat(finabridgeData?.wallet?.lockedGoldGrams) - 
        (bnslData?.plans || []).filter((plan: any) => ['Active', 'Pending Activation', 'Maturing'].includes(plan.status))
          .reduce((sum: number, plan: any) => sum + safeParseFloat(plan.goldSoldGrams), 0));
  
  const bnslLockedGrams = ownership 
    ? safeParseFloat(ownership.lockedBnslGrams)
    : (bnslData?.plans || []).filter((plan: any) => ['Active', 'Pending Activation', 'Maturing'].includes(plan.status))
        .reduce((sum: number, plan: any) => sum + safeParseFloat(plan.goldSoldGrams), 0);
  
  const finabridgeLockedGrams = ownership 
    ? safeParseFloat(ownership.reservedTradeGrams)
    : safeParseFloat(finabridgeData?.wallet?.lockedGoldGrams);
  
  // Wallet breakdown from central ledger
  const finaPayGrams = ownership ? safeParseFloat(ownership.finaPayGrams) : 0;
  const bnslAvailableGrams = ownership ? safeParseFloat(ownership.bnslAvailableGrams) : 0;
  const finaBridgeAvailableGrams = ownership ? safeParseFloat(ownership.finaBridgeAvailableGrams) : 0;
  
  // Dual-wallet breakdown (LGPW/FGPW)
  const mpgwAvailableGrams = ownership ? safeParseFloat(ownership.mpgwAvailableGrams) : 0;
  const fpgwAvailableGrams = ownership ? safeParseFloat(ownership.fpgwAvailableGrams) : 0;
  
  // USD balance from wallet
  const usdBalance = safeParseFloat(walletData?.wallet?.usdBalance);
  
  // Calculate total available value in USD (gold value + cash)
  const availableGoldValueUsd = availableGold * goldPricePerGram;
  const totalAvailableUsd = availableGoldValueUsd + usdBalance;
  
  // Total vault value including USD
  const totalVaultValueUsd = (totalVaultGold * goldPricePerGram) + usdBalance;
  
  // Ledger entries for history display - combine ledger entries with transactions
  const ledgerEntries = ledgerData?.entries || [];
  const transactions = transactionsData?.transactions || [];
  const depositRequests = depositRequestsData?.requests || [];
  
  // Check if user has any vault activity (completed transactions OR positive balance OR ledger entries)
  const hasVaultActivity = transactions.some((tx: any) => tx.status === 'Completed') || totalVaultGold > 0 || ledgerEntries.length > 0;
  
  // Helper to format wallet destination with wallet type
  const formatWalletWithType = (wallet: string, walletType?: string) => {
    if (wallet === 'FinaPay' && walletType) {
      return `FinaPay-${walletType}`;
    }
    return wallet;
  };

  // Convert transactions to ledger-like format for display
  const transactionRecords = transactions.map((tx: any) => {
    const isInbound = tx.type === 'Receive' || tx.type === 'Deposit' || tx.type === 'Buy';
    const isOutbound = tx.type === 'Send' || tx.type === 'Withdrawal' || tx.type === 'Sell';
    const walletType = tx.goldWalletType || 'LGPW';
    
    return {
      id: tx.id,
      createdAt: tx.createdAt,
      action: tx.type,
      status: tx.status,
      fromWallet: isInbound ? 'External' : formatWalletWithType('FinaPay', walletType),
      toWallet: isOutbound ? 'External' : formatWalletWithType('FinaPay', walletType),
      fromStatus: isInbound ? null : 'Available',
      toStatus: isOutbound ? null : 'Available',
      goldGrams: tx.amountGold || tx.goldGrams || '0',
      valueUsd: tx.amountUsd || '0',
      balanceAfterGrams: tx.balanceAfterGrams || '0',
      isTransaction: true,
      transactionId: tx.id,
      goldWalletType: walletType,
    };
  });

  // Convert deposit requests (bank deposits) to ledger-like format
  const depositRecords = depositRequests.map((dep: any) => {
    const walletType = dep.goldWalletType || 'LGPW';
    return {
      id: dep.id,
      createdAt: dep.createdAt,
      action: 'Bank Deposit',
      status: dep.status,
      fromWallet: 'Bank Transfer',
      toWallet: formatWalletWithType('FinaPay', walletType),
      fromStatus: null,
      toStatus: 'Available',
      goldGrams: '0',
      valueUsd: dep.amountUsd || '0',
      balanceAfterGrams: '0',
      isDepositRequest: true,
      referenceNumber: dep.referenceNumber,
      goldWalletType: walletType,
    };
  });

  // Convert certificates to ledger-like format
  // Check if there are FinaBridge transactions to avoid duplicate entries from Trade Release certificates
  const hasFinaBridgeTransactions = transactions.some((tx: any) => tx.sourceModule === 'FinaBridge');
  
  // Handle both cases: certificatesData might be { certificates: [...] } or just [...] directly
  const certificates = Array.isArray(certificatesData) 
    ? certificatesData 
    : (certificatesData?.certificates || []);
  const certificateRecords = certificates
    .filter((cert: any) => {
      // Include Physical Storage and Digital Ownership certificates
      if (['Physical Storage', 'Digital Ownership'].includes(cert.type)) return true;
      // Only include Trade Release if there's no corresponding transaction
      if (cert.type === 'Trade Release' && !hasFinaBridgeTransactions) return true;
      return false;
    })
    .map((cert: any) => {
      const walletType = cert.goldWalletType || 'LGPW';
      const toWallet = cert.type === 'Trade Release' 
        ? 'FinaBridge Wallet' 
        : (cert.type === 'Digital Ownership' 
          ? formatWalletWithType('FinaPay', walletType) 
          : 'FinaVault');
      return {
        id: cert.id,
        createdAt: cert.issuedAt,
        action: cert.type === 'Trade Release' ? 'Trade Release Received' : cert.type,
        status: cert.status === 'Active' ? 'Completed' : cert.status,
        fromWallet: cert.type === 'Trade Release' ? 'FinaBridge Trade' : (cert.type === 'Physical Storage' ? 'Wingold & Metals' : 'FinaVault'),
        toWallet,
        fromStatus: null,
        toStatus: 'Available',
        goldGrams: cert.goldGrams || '0',
        valueUsd: cert.totalValueUsd || '0',
        balanceAfterGrams: '0',
        isCertificate: true,
        certificateNumber: cert.certificateNumber,
        transactionId: cert.transactionId || cert.transaction_id || cert.ledgerTransactionId,
        goldWalletType: walletType,
      };
    });
  
  // Combine all records and sort by date (newest first)
  const allRecords = [...transactionRecords, ...depositRecords, ...certificateRecords].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Always include certificate records, plus ledger entries or other records
  // Normalize ledger entries to have consistent transactionId field and wallet type display
  const normalizedLedgerEntries = ledgerEntries.map((entry: any) => {
    const walletType = entry.goldWalletType || 'LGPW';
    // Update toWallet to show wallet type if it's FinaPay
    let toWallet = entry.toWallet;
    if (toWallet === 'FinaPay') {
      toWallet = formatWalletWithType('FinaPay', walletType);
    }
    return {
      ...entry,
      transactionId: entry.transactionId || entry.transaction_id || entry.ledgerTransactionId,
      toWallet,
      goldWalletType: walletType,
    };
  });
  
  // Use ledger entries if available, otherwise use transaction/deposit records
  const baseRecords = normalizedLedgerEntries.length > 0 ? normalizedLedgerEntries : [...transactionRecords, ...depositRecords];
  
  // Create a map of certificate number to certificate for deduplication
  const certByNumber = new Map<string, any>();
  for (const cert of certificateRecords) {
    if (cert.certificateNumber) {
      certByNumber.set(cert.certificateNumber, cert);
    }
  }
  
  // All certificates (normalized, from API data)
  const allCertificates = certificateRecords;

  // Group entries by transactionId for chain-of-custody display
  // Entries with same transactionId are grouped together (e.g., Vault_Transfer + Deposit)
  const groupedRecords = React.useMemo(() => {
    const groups: Map<string, any[]> = new Map();
    
    // Group all records by transactionId
    for (const record of baseRecords) {
      const key = record.transactionId || record.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }
    
    // Sort entries within each group by action type (Physical Storage first, then Recorded)
    const actionOrder = (action: string) => {
      if (action === 'Vault_Transfer') return 0;
      if (action === 'Deposit') return 1;
      return 2;
    };
    groups.forEach((entries) => {
      entries.sort((a: any, b: any) => actionOrder(a.action) - actionOrder(b.action));
    });
    
    // Convert to array and sort by newest first
    const groupArray = Array.from(groups.entries()).sort((a, b) => {
      const dateA = new Date(a[1][a[1].length - 1]?.createdAt || 0).getTime();
      const dateB = new Date(b[1][b[1].length - 1]?.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    // Convert to parent/children format for display
    return groupArray.map(([txId, entries]) => {
      const mainEntry = entries[entries.length - 1]; // Last entry is the main one (Deposit)
      const totalValue = entries.reduce((sum: number, e: any) => sum + safeParseFloat(e.valueUsd || 0), 0);
      
      return {
        parent: {
          ...mainEntry,
          displayValue: totalValue.toString(),
        },
        children: entries,
        transactionId: txId,
      };
    });
  }, [baseRecords]);

  // Toggle expand/collapse for ledger rows
  const toggleLedgerRow = (id: string) => {
    setExpandedLedgerRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Check query params for initial tab - open deposit tab
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    const highlight = searchParams.get('highlight');
    
    if (tabParam === 'new-request' || highlight === 'deposit') {
      setActiveTab('deposit-gold');
    }
  }, []);

  const handleCancelRequest = async (id: string) => {
    toast({
      title: "Request Cancellation",
      description: "Please contact support to cancel your deposit request.",
    });
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header - hidden on mobile since mobile nav shows page context */}
        <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-100 rounded-lg border border-purple-200 text-primary">
                <Database className="w-6 h-6" />
             </div>
             <h1 className="text-2xl font-bold text-foreground" data-testid="text-finavault-title">
               {getContent('hero', 'title', 'FinaVault')} — <span className="text-muted-foreground font-normal">Gold Deposit</span>
             </h1>
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
               <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
               <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* FinaVault Wallet Card - Only show when user has vault activity */}
        {hasVaultActivity && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                <Database className="w-5 h-5 text-fuchsia-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">FinaVault Wallet</h2>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Available Balance */}
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden" data-testid="card-available-balance">
              <div className="absolute right-2 bottom-2 opacity-5">
                <Database className="w-20 h-20 text-green-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Balance</p>
                <p className="text-3xl font-bold text-green-600 mb-1">
                  ${availableGoldValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-green-600/70">
                  {availableGold.toFixed(4)}g Gold
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Available for withdrawal or transfer.
                </p>
              </div>
            </div>

            {/* Locked in BNSL */}
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden" data-testid="card-bnsl-locked">
              <div className="absolute right-2 bottom-2 opacity-5">
                <Clock className="w-20 h-20 text-purple-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked in BNSL</p>
                <p className="text-3xl font-bold text-purple-600 mb-1">
                  ${(bnslLockedGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-purple-600/70">
                  {bnslLockedGrams.toFixed(3)} g
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Gold in Buy Now Sell Later plans.
                </p>
              </div>
            </div>

            {/* Locked in Trade Finance */}
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden" data-testid="card-trade-locked">
              <div className="absolute right-2 bottom-2 opacity-5">
                <Briefcase className="w-20 h-20 text-purple-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked in Trades</p>
                <p className="text-3xl font-bold text-purple-500 mb-1">
                  ${(finabridgeLockedGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-purple-500/70">
                  {finabridgeLockedGrams.toFixed(3)} g
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  <Briefcase className="w-3 h-3 inline mr-1" />
                  Gold secured in trade finance.
                </p>
              </div>
            </div>

            {/* Total Value */}
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden" data-testid="card-total-value">
              <div className="absolute right-2 bottom-2 opacity-5">
                <TrendingUp className="w-20 h-20 text-purple-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Vault Value</p>
                <p className="text-3xl font-bold text-foreground mb-1">
                  ${(totalVaultGold * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {totalVaultGold.toFixed(4)}g Gold
                </p>
              </div>
            </div>

          </div>

          {/* Dual-Wallet Breakdown (LGPW/FGPW) */}
          {(mpgwAvailableGrams > 0 || fpgwAvailableGrams > 0) && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Wallet Type Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                
                {/* LGPW - Live Gold Price Wallet */}
                <div className="relative p-3 rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden" data-testid="card-mpgw-balance">
                  <div className="absolute right-1 bottom-1 opacity-10">
                    <TrendingUp className="w-10 h-10 text-amber-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">LGPW - Market Price</p>
                    </div>
                    <p className="text-lg font-bold text-amber-600">
                      {mpgwAvailableGrams.toFixed(4)}g
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ ${(mpgwAvailableGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* FGPW - Fixed Gold Price Wallet */}
                <div className="relative p-3 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden" data-testid="card-fpgw-balance">
                  <div className="absolute right-1 bottom-1 opacity-10">
                    <Lock className="w-10 h-10 text-blue-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">FGPW - Fixed Price</p>
                    </div>
                    <p className="text-lg font-bold text-blue-600">
                      {fpgwAvailableGrams.toFixed(4)}g
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ ${(fpgwAvailableGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
        )}

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {selectedRequest ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <RequestDetails 
                request={selectedRequest} 
                onClose={() => setSelectedRequest(null)}
                onCancel={handleCancelRequest}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tabs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Tabs navigation with proper styling */}
                <div className="bg-white rounded-2xl border border-border p-3 shadow-sm mb-6 overflow-x-auto">
                  <TabsList className="flex flex-wrap gap-2 bg-transparent p-0 h-auto">
                    <TabsTrigger 
                      value="vault-activity"
                      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border border-transparent bg-muted/50 text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md"
                      data-testid="tab-vault-activity"
                    >
                      <History className="w-4 h-4 mr-1.5" />
                      Vault Activity
                    </TabsTrigger>
                    <TabsTrigger 
                      value="deposit-gold"
                      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border border-green-200 bg-green-50 text-green-700 transition-all data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:border-green-500 data-[state=active]:shadow-md"
                      data-testid="tab-deposit-gold"
                    >
                      <PlusCircle className="w-4 h-4 mr-1.5" />
                      Deposit Gold
                    </TabsTrigger>
                    <TabsTrigger 
                      value="my-deposits"
                      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border border-blue-200 bg-blue-50 text-blue-700 transition-all data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-500 data-[state=active]:shadow-md"
                      data-testid="tab-my-deposits"
                    >
                      <Clock className="w-4 h-4 mr-1.5" />
                      My Deposits
                    </TabsTrigger>
                    <TabsTrigger 
                      value="buy-gold-bars"
                      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border border-amber-200 bg-amber-50 text-amber-700 transition-all data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:border-amber-500 data-[state=active]:shadow-md"
                      data-testid="tab-buy-gold-bars"
                    >
                      <Briefcase className="w-4 h-4 mr-1.5" />
                      Buy Gold Bars
                    </TabsTrigger>
                    <TabsTrigger 
                      value="cash-out"
                      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border border-orange-200 bg-orange-50 text-orange-700 transition-all data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-500 data-[state=active]:shadow-md"
                    >
                      <Banknote className="w-4 h-4 mr-1.5" />
                      Cash Out
                    </TabsTrigger>
                    <TabsTrigger 
                      value="ownership-ledger"
                      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border border-transparent bg-muted/50 text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md"
                      data-testid="tab-ownership-ledger"
                    >
                      <Lock className="w-4 h-4 mr-1.5" />
                      Ownership Ledger
                    </TabsTrigger>
                    <TabsTrigger 
                      value="certificates"
                      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border border-transparent bg-muted/50 text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md"
                      data-testid="tab-certificates"
                    >
                      <Award className="w-4 h-4 mr-1.5" />
                      Certificates
                    </TabsTrigger>
                    <TabsTrigger 
                      value="terms"
                      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border border-transparent bg-muted/50 text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md"
                      data-testid="tab-terms"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      Terms & Conditions
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="vault-activity" className="mt-0">
                  <VaultActivityList />
                </TabsContent>

                <TabsContent value="deposit-gold" className="mt-0">
                  <PhysicalGoldDeposit embedded={true} onSuccess={() => {
                    setActiveTab('my-deposits');
                    queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
                  }} />
                </TabsContent>

                <TabsContent value="my-deposits" className="mt-0">
                  <MyPhysicalDeposits />
                </TabsContent>

                <TabsContent value="buy-gold-bars" className="mt-0">
                  <BuyGoldBars />
                </TabsContent>
                
                <TabsContent value="cash-out">
                  <CashOutForm vaultBalance={totalVaultGold} />
                </TabsContent>


                <TabsContent value="ownership-ledger" className="mt-0">
                  <div className="space-y-6">
                    {/* Wallet Breakdown */}
                    <Card className="bg-white border">
                      <CardHeader className="border-b">
                        <CardTitle className="text-lg">Wallet Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg bg-gray-50 border">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">FinaPay Wallet</p>
                            <p className="text-xl font-bold">{finaPayGrams.toFixed(4)} g</p>
                            <p className="text-sm text-muted-foreground">${(finaPayGrams * goldPricePerGram).toFixed(2)}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-gray-50 border">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">BNSL Wallet</p>
                            <p className="text-xl font-bold">{(bnslAvailableGrams + bnslLockedGrams).toFixed(4)} g</p>
                            <p className="text-sm text-muted-foreground">
                              {bnslAvailableGrams.toFixed(4)} g available, {bnslLockedGrams.toFixed(4)} g locked
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-gray-50 border">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">FinaBridge Wallet</p>
                            <p className="text-xl font-bold">{(finaBridgeAvailableGrams + finabridgeLockedGrams).toFixed(4)} g</p>
                            <p className="text-sm text-muted-foreground">
                              {finaBridgeAvailableGrams.toFixed(4)} g available, {finabridgeLockedGrams.toFixed(4)} g reserved
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ledger History */}
                    <Card className="bg-white border">
                      <CardHeader className="border-b">
                        <CardTitle className="text-lg">Ownership Ledger History</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {groupedRecords.length === 0 ? (
                          <div className="p-12 text-center">
                            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                            <h3 className="text-lg font-bold mb-2">No Transaction Records</h3>
                            <p className="text-muted-foreground">
                              Your transaction history will appear here once you start transacting.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="text-left p-4 font-medium w-8"></th>
                                  <th className="text-left p-4 font-medium">Date</th>
                                  <th className="text-left p-4 font-medium">Ref ID</th>
                                  <th className="text-left p-4 font-medium">Action</th>
                                  <th className="text-left p-4 font-medium">Status</th>
                                  <th className="text-left p-4 font-medium">From</th>
                                  <th className="text-left p-4 font-medium">To</th>
                                  <th className="text-right p-4 font-medium">Gold (g)</th>
                                  <th className="text-right p-4 font-medium">Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {groupedRecords.map((group) => {
                                  const entry = group.parent;
                                  const hasChildren = group.children.length > 1;
                                  const isExpanded = expandedLedgerRows.has(entry.id);
                                  const totalValue = group.children.reduce((sum: number, c: any) => sum + safeParseFloat(c.valueUsd || 0), 0);
                                  
                                  const formatParentFrom = () => {
                                    if (hasChildren) return 'Wingold & Metals';
                                    if (entry.action === 'Vault_Transfer') return 'Wingold & Metals';
                                    return entry.fromWallet || '—';
                                  };
                                  
                                  const formatParentTo = () => {
                                    if (entry.action === 'Deposit' && entry.toGoldWalletType) {
                                      return `FinaPay-${entry.toGoldWalletType}`;
                                    }
                                    if (entry.toWallet === 'FinaPay' && entry.goldWalletType) {
                                      return `FinaPay-${entry.goldWalletType}`;
                                    }
                                    return entry.toWallet || '—';
                                  };
                                  
                                  return (
                                    <React.Fragment key={entry.id}>
                                      {/* Parent Row */}
                                      <tr 
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => hasChildren && toggleLedgerRow(entry.id)}
                                      >
                                        <td className="p-4 w-8">
                                          {hasChildren && (
                                            <span className="text-muted-foreground">
                                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                          {new Date(entry.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                          <span className="font-mono text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                                            {group.transactionId 
                                              ? group.transactionId.substring(0, 8).toUpperCase()
                                              : entry.id.substring(0, 8).toUpperCase()}
                                          </span>
                                        </td>
                                        <td className="p-4">
                                          <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                              entry.action === 'Buy' || entry.action?.includes('Deposit') || entry.action?.includes('Receive') || entry.action?.includes('Credit') 
                                                ? 'bg-green-100 text-green-700'
                                                : entry.action?.includes('Lock') || entry.action?.includes('Reserve')
                                                ? 'bg-purple-100 text-purple-700'
                                                : entry.action === 'Sell' || entry.action?.includes('Withdrawal') || entry.action?.includes('Send') || entry.action?.includes('Fee')
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                              {entry.action === 'Buy' ? 'Add Funds' : (entry.action || '').replace(/_/g, ' ')}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="p-4">
                                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                            entry.status === 'Completed' ? 'bg-green-100 text-green-700'
                                            : entry.status === 'Pending' ? 'bg-yellow-100 text-yellow-700'
                                            : entry.status === 'Processing' ? 'bg-blue-100 text-blue-700'
                                            : entry.status === 'Failed' || entry.status === 'Cancelled' ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-700'
                                          }`}>
                                            {entry.status || 'Recorded'}
                                          </span>
                                        </td>
                                        <td className="p-4">
                                          <span className="text-foreground">
                                            {formatParentFrom()}
                                          </span>
                                        </td>
                                        <td className="p-4">
                                          <span className="text-foreground">
                                            {formatParentTo()}
                                          </span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-green-600">
                                          {safeParseFloat(entry.goldGrams).toFixed(4)}
                                        </td>
                                        <td className="p-4 text-right font-medium">
                                          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                      
                                      {/* Chain-of-Custody Rows - shown when expanded */}
                                      {isExpanded && group.children.map((child: any, childIndex: number) => {
                                        const formatFrom = (e: any) => {
                                          if (e.action === 'Vault_Transfer') return 'Wingold & Metals';
                                          if (e.fromWallet === 'FinaPay' || e.fromWallet === 'External') return 'FinaVault';
                                          return e.fromWallet || '—';
                                        };
                                        
                                        const formatTo = (e: any) => {
                                          if (e.action === 'Vault_Transfer') return 'FinaVault';
                                          if (e.action === 'Deposit' && e.toGoldWalletType) {
                                            return `FinaPay-${e.toGoldWalletType}`;
                                          }
                                          if (e.toWallet === 'FinaPay' && e.goldWalletType) {
                                            return `FinaPay-${e.goldWalletType}`;
                                          }
                                          return e.toWallet || '—';
                                        };
                                        
                                        return (
                                          <tr 
                                            key={child.id} 
                                            className="bg-muted/20 border-l-4 border-l-purple-400"
                                          >
                                            <td className="p-4 w-8"></td>
                                            <td className="p-4 text-muted-foreground text-xs">
                                              Step {childIndex + 1}
                                            </td>
                                            <td className="p-4">
                                              <span className="font-mono text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                                                {child.id.substring(0, 8).toUpperCase()}
                                              </span>
                                            </td>
                                            <td className="p-4">
                                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                child.action === 'Vault_Transfer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                              }`}>
                                                {child.action === 'Vault_Transfer' ? 'Physical Storage' : 'Digital Storage'}
                                              </span>
                                            </td>
                                            <td className="p-4">
                                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-600">
                                                {child.status || 'Completed'}
                                              </span>
                                            </td>
                                            <td className="p-4 text-muted-foreground text-sm">
                                              {formatFrom(child)}
                                            </td>
                                            <td className="p-4 text-muted-foreground text-sm">
                                              {formatTo(child)}
                                            </td>
                                            <td className="p-4 text-right text-sm text-muted-foreground">
                                              {safeParseFloat(child.goldGrams).toFixed(4)}
                                            </td>
                                            <td className="p-4 text-right text-sm text-muted-foreground">
                                              ${safeParseFloat(child.valueUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="certificates" className="mt-0">
                  <CertificatesView />
                </TabsContent>

                <TabsContent value="terms" className="mt-0">
                  <Card className="bg-white border border-border">
                    <CardHeader className="border-b border-border">
                      <CardTitle className="text-xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        Vault Storage & Account Terms & Conditions
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        Finatrades Platform – in Partnership with Wingold and Metals DMCC
                      </p>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
                        
                        <section className="bg-muted/50 p-4 rounded-lg border border-border">
                          <h3 className="text-lg font-semibold mb-3">Preamble</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            These Terms govern the custody, accounting, and management of gold recorded on the Finatrades platform ("Finatrades," "Platform," "we," "us"), operated in partnership with its subsidiary Wingold and Metals DMCC ("Wingold"), which acts as the physical gold custodian and vault operator. By accepting these Terms, the Customer expressly understands and agrees that they are engaging in a gold-backed digital vault ledger and account service (FinaVault) and not a physical gold trading or investment service.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">1. Gold Storage, Custody & Ownership</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            The Customer acquires and holds gold through the Finatrades platform, with physical custody and vault operations performed exclusively by Wingold. Legal title to the gold shall at all times remain vested in the Customer, subject to these Terms. Finatrades shall maintain detailed allocated account records within FinaVault, including gold weight, purity, transaction history, and balance statements, representing the Customer's undivided proportional interest in the total pooled gold holdings.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">2. Operational Rights & Gold Pooling Mechanism</h3>
                          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p><strong>2.1</strong> The Customer hereby irrevocably grants Finatrades and Wingold full right, authority, and discretion to hold, pool, allocate, re-allocate, and administratively manage all customer gold within their integrated vaulting, custody, and accounting infrastructure, including recording, settlement, and reconciliation through FinaVault.</p>
                            <p><strong>2.2</strong> Operational use may include, without limitation, internal vault management, settlement of customer gold sale instructions, liquidity balancing, collateral support for internal credit arrangements, financing, leasing, or other lawful commercial or operational activities undertaken by Wingold in its capacity as gold custodian and bullion operator, without affecting the Customer's equivalent gold entitlement.</p>
                            <p><strong>2.3</strong> Finatrades and Wingold shall at all times maintain a book-entry obligation, reflected within FinaVault, recognizing the Customer's entitlement to an equivalent quantity of gold (by weight) and equivalent purity (by fineness). The Customer's rights are strictly limited to gold value and account-based entitlement and do not extend to any claim over specific gold bars, serial numbers, refinery batches, or physical delivery.</p>
                            <p><strong>2.4</strong> The Customer unconditionally waives and releases Finatrades and Wingold from any and all claims arising from the pooling, commingling, reallocation, or internal operational management of customer gold, including any allegation of conversion or misuse, provided that the Customer's equivalent gold balance continues to be accurately recorded within FinaVault.</p>
                            <p><strong>2.5</strong> The gold pooling and operational structure described herein is fundamental to the commercial model, pricing, and functionality of FinaVault. No additional consent shall be required from the Customer for such operational use.</p>
                          </div>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">3. Cash-Out, Gold Sale & Settlement (No Physical Gold Withdrawal)</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            The Customer expressly acknowledges and agrees that physical withdrawal or delivery of gold is not available under FinaVault. Any exit, redemption, or realization of value shall occur solely through the sale of gold via the Finatrades platform at prevailing market prices. Upon execution of a sale instruction, the corresponding quantity of gold shall be debited from the Customer's FinaVault balance, and the net cash proceeds, after applicable fees and charges, shall be credited or transferred according to the Customer's instructions.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">4. Gold Vaulting, Custodianship & Internal Movement</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Physical gold corresponding to aggregated customer balances is held under the custody and control of Wingold in approved gold vaults or bonded facilities selected at Wingold's discretion. Internal movement, relocation, rebalancing, or substitution of physical gold may occur at any time for operational, security, liquidity, or commercial reasons. Such activities shall not affect customer gold balances recorded within FinaVault.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">5. Statements & Gold Account Records</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Finatrades shall provide periodic electronic account statements through FinaVault reflecting the Customer's gold balance, transactions, fees, and valuation. The Customer is responsible for reviewing statements and notifying Finatrades of any discrepancies within thirty (30) days of issuance. Failure to do so shall constitute final and binding acceptance of the gold account records.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">6. Compliance, AML/CFT & Platform Controls</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            All services relating to gold custody and sale are subject to applicable UAE AML/CFT laws and regulations. The Customer shall provide all required information, documentation, and ongoing updates as requested. Finatrades may, without liability, suspend access to FinaVault, restrict gold transactions, delay cash settlement, or terminate the relationship where any compliance, regulatory, or reputational risk is identified.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">7. Gold Storage Fees, Platform Charges & Deductions</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Fees applicable to gold vault storage, custody, and platform services shall be determined and displayed on the Finatrades platform at the time of selection. By proceeding, the Customer expressly acknowledges, accepts, and agrees to such fees. Fees shall be automatically settled through deduction from the Customer's account, resulting in a proportional reduction of the gold balance recorded in FinaVault, reflecting the value of the fees applied.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">8. Liability & Indemnity</h3>
                          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p><strong>8.1</strong> Wingold's aggregate liability for any and all claims arising out of or relating to these Terms shall be limited strictly to the direct market value of the Stored Gold affected.</p>
                            <p><strong>8.2</strong> In no event shall Wingold be liable for any indirect, incidental, consequential, special, or punitive damages, including loss of profit, opportunity, or market value.</p>
                            <p><strong>8.3</strong> Wingold shall not be liable for any delay, loss, or damage resulting from force majeure events, acts of government or regulators, war, terrorism, inherent vice of the gold, market volatility, or the acts or omissions of any third-party custodian, carrier, or service provider.</p>
                            <p><strong>8.4</strong> The Customer shall fully indemnify and hold Wingold harmless against all claims, liabilities, losses, and expenses arising from the Customer's breach of these Terms or the provision of inaccurate or misleading information.</p>
                          </div>
                        </section>

                        <section className="bg-warning-muted p-4 rounded-lg border border-warning/20">
                          <h3 className="text-lg font-semibold mb-3 text-warning-muted-foreground">9. Risk Disclosure & Customer Acknowledgement</h3>
                          <p className="text-sm text-warning-muted-foreground leading-relaxed mb-3">
                            The Customer expressly acknowledges and accepts that:
                          </p>
                          <ul className="list-disc list-inside space-y-2 text-sm text-warning-muted-foreground">
                            <li>(a) Gold is held within a pooled custodial structure;</li>
                            <li>(b) No physical gold delivery or withdrawal rights exist;</li>
                            <li>(c) Value realization occurs solely through the sale of gold via the Platform;</li>
                            <li>(d) Finatrades relies on Wingold as its gold custodian and bullion operator; and</li>
                            <li>(e) The market value of gold is volatile and subject to fluctuation.</li>
                          </ul>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">10. Duration & Termination</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            This Agreement shall remain in effect until terminated. The Customer may terminate by requesting final withdrawal and settling all outstanding fees. Wingold may terminate this Agreement upon thirty (30) days' written notice, or immediately for cause, including fee non-payment or compliance-related concerns.
                          </p>
                        </section>

                        <section className="bg-muted/50 p-4 rounded-lg border border-border">
                          <h3 className="text-lg font-semibold mb-3">11. Governing Law & Jurisdiction</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates as applied in the Emirate of Dubai. The Courts of the Dubai International Financial Centre (DIFC) shall have exclusive jurisdiction to resolve any dispute arising herefrom.
                          </p>
                        </section>

                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
