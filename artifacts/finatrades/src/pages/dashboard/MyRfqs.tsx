import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { MessageCircle, CheckCircle2, X, ShieldCheck } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import CounterpartyChip from '@/components/CounterpartyChip';
import type { Counterparty } from '@/components/FtIdDetailSheet';

interface Offer {
  id: string;
  sellerId: string;
  sellerName: string | null;
  counterparty: Counterparty | null;
  pricePerUnit: number;
  offeredQuantity: number;
  currency: string;
  validUntil: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface Rfq {
  id: string;
  referenceNo: string | null;
  commodity: string;
  hubCode: string | null;
  quantity: number;
  unit: string;
  targetPricePerUnit: number | null;
  currency: string;
  qualityRequired: string | null;
  incoterms: string | null;
  notes: string | null;
  expiresAt: string | null;
  status: string;
  offers: Offer[];
  createdAt: string;
}

const STATUS: Record<string, { bg: string; color: string }> = {
  'Open': { bg: 'rgba(59,130,246,0.1)', color: '#2563EB' },
  'Offers Received': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  'Negotiating': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  'Accepted': { bg: 'rgba(5,150,105,0.1)', color: '#047857' },
  'Cancelled': { bg: 'rgba(220,38,38,0.1)', color: '#DC2626' },
  'Expired': { bg: '#F0EBE6', color: '#888880' },
};

export default function MyRfqs() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [acceptError, setAcceptError] = useState<{ rfqId: string; reasons: any[] } | null>(null);

  const { data, isLoading } = useQuery<{ rfqs: Rfq[] }>({
    queryKey: ['/api/b2b/marketplace/rfqs/mine'],
  });
  const rfqs = data?.rfqs ?? [];

  const accept = useMutation({
    mutationFn: async (vars: { rfqId: string; offerId: string }) => {
      const r = await apiRequest('POST', `/api/b2b/marketplace/rfqs/${vars.rfqId}/accept`, { offerId: vars.offerId });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const err: any = new Error(body.message || 'Could not accept offer');
        err.status = r.status;
        err.reasons = body.reasons;
        err.rfqId = vars.rfqId;
        throw err;
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/rfqs/mine'] });
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/orders/mine'] });
      qc.invalidateQueries({ queryKey: ['/api/b2b/wallet'] });
      toast({ title: 'Offer accepted', description: 'Margin held, order created.' });
      setLocation('/orders/mine');
    },
    onError: (e: any) => {
      if (e.status === 402 && e.reasons) {
        setAcceptError({ rfqId: e.rfqId, reasons: e.reasons });
      } else {
        toast({ title: 'Could not accept offer', description: e.message, variant: 'destructive' });
      }
    },
  });

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>My RFQs</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
          Quotes you've requested and offers from sellers
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#E8E2DC', borderTopColor: '#C73B22' }} />
        </div>
      ) : rfqs.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center" style={{ border: '1px dashed #E8E2DC' }}>
          <MessageCircle size={32} style={{ color: '#E8E2DC' }} className="mx-auto" />
          <p className="mt-3 text-sm font-medium" style={{ color: '#B0AAA4' }}>You have no open RFQs.</p>
          <Link href="/marketplace" className="inline-block mt-3 text-xs font-semibold underline" style={{ color: '#C73B22' }}>
            Browse marketplace →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rfqs.map(r => {
            const sc = STATUS[r.status] || { bg: '#F0EBE6', color: '#888880' };
            return (
              <div key={r.id} className="rounded-2xl bg-white" style={{ border: '1px solid #E8E2DC' }}>
                <div className="p-5 flex flex-wrap items-start justify-between gap-3" style={{ borderBottom: '1px solid #F0EBE6' }}>
                  <div>
                    <p className="font-mono text-xs" style={{ color: '#B0AAA4' }}>{r.referenceNo}</p>
                    <p className="font-bold text-base mt-0.5" style={{ color: '#1A1A1A' }}>{r.commodity}</p>
                    <p className="text-xs mt-1" style={{ color: '#888880' }}>
                      {r.quantity} {r.unit}
                      {r.targetPricePerUnit ? ` · target ${r.currency} ${r.targetPricePerUnit.toLocaleString()}/${r.unit}` : ''}
                      {r.hubCode ? ` · ${r.hubCode}` : ''}
                      {r.incoterms ? ` · ${r.incoterms}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: sc.bg, color: sc.color }}>
                    {r.status}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#888880' }}>
                    Offers ({r.offers.length})
                  </p>
                  {r.offers.length === 0 ? (
                    <p className="text-xs" style={{ color: '#B0AAA4' }}>Waiting for sellers to respond...</p>
                  ) : (
                    <div className="space-y-2">
                      {r.offers.map(o => (
                        <div key={o.id} className="flex flex-wrap items-center gap-4 p-3 rounded-xl"
                          style={{ background: '#FAFAF8' }}>
                          <div className="flex-1 min-w-[180px]">
                            <CounterpartyChip counterparty={o.counterparty} fallbackFtId={o.sellerName} size="sm" />
                            <p className="text-xs" style={{ color: '#888880' }}>
                              {o.offeredQuantity} {r.unit} @ <span className="font-bold" style={{ color: '#1A1A1A' }}>{o.currency} {o.pricePerUnit.toLocaleString()}</span>
                              {' '}= <span className="font-bold" style={{ color: '#C73B22' }}>{o.currency} {(o.pricePerUnit * o.offeredQuantity).toLocaleString()}</span>
                            </p>
                            {o.notes && <p className="text-xs mt-1 italic" style={{ color: '#888880' }}>{o.notes}</p>}
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded-md"
                            style={o.status === 'Accepted' ? { background: 'rgba(5,150,105,0.1)', color: '#047857' }
                              : o.status === 'Rejected' ? { background: '#F0EBE6', color: '#888880' }
                              : { background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                            {o.status}
                          </span>
                          {o.status === 'Pending' && r.status !== 'Accepted' && r.status !== 'Cancelled' && (
                            <button
                              onClick={() => { setAcceptError(null); accept.mutate({ rfqId: r.id, offerId: o.id }); }}
                              disabled={accept.isPending}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
                              style={{ background: '#C73B22' }}>
                              <CheckCircle2 size={12} /> Accept
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {acceptError && acceptError.rfqId === r.id && (
                    <div className="mt-3 p-3 rounded-xl"
                      style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#991B1B' }}>Could not accept offer</p>
                      <ul className="space-y-1">
                        {acceptError.reasons.map((reason: any, i: number) => (
                          <li key={i} className="text-xs flex gap-1.5" style={{ color: '#7F1D1D' }}>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{ background: 'rgba(220,38,38,0.15)' }}>{reason.code}</span>
                            {reason.message}
                          </li>
                        ))}
                      </ul>
                      {acceptError.reasons.some((x: any) => x.code === 'wallet_insufficient' || x.code === 'wallet_missing') && (
                        <Link href="/wallet" className="inline-block text-xs font-semibold mt-2 underline" style={{ color: '#C73B22' }}>
                          Top up wallet →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
