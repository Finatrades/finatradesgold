import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Send, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import CounterpartyChip from '@/components/CounterpartyChip';
import type { Counterparty } from '@/components/FtIdDetailSheet';

interface IncomingRfq {
  id: string;
  referenceNo: string | null;
  buyerName: string | null;
  counterparty: Counterparty | null;
  commodity: string;
  hubCode: string | null;
  quantity: number;
  unit: string;
  targetPricePerUnit: number | null;
  currency: string;
  qualityRequired: string | null;
  incoterms: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  myOffer: {
    id: string; pricePerUnit: number; offeredQuantity: number; status: string;
  } | null;
}

const STATUS: Record<string, { bg: string; color: string }> = {
  'Open': { bg: 'rgba(59,130,246,0.1)', color: '#2563EB' },
  'Offers Received': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  'Negotiating': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
};

function OfferModal({ rfq, onClose }: { rfq: IncomingRfq; onClose: () => void }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState(rfq.targetPricePerUnit ? String(rfq.targetPricePerUnit) : '');
  const [qty, setQty] = useState(String(rfq.quantity));
  const [notes, setNotes] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', `/api/b2b/marketplace/rfqs/${rfq.id}/offers`, {
        pricePerUnit: Number(price),
        offeredQuantity: Number(qty),
        currency: rfq.currency,
        notes: notes || undefined,
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || 'Failed');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/rfqs/incoming'] });
      toast({ title: 'Offer submitted' });
      onClose();
    },
    onError: (e: any) => toast({ title: 'Could not submit offer', description: e.message, variant: 'destructive' }),
  });

  const total = (Number(price) || 0) * (Number(qty) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" style={{ border: '1px solid #E8E2DC' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E8E2DC' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Submit Offer</h2>
            <p className="text-sm" style={{ color: '#888880' }}>{rfq.commodity} · RFQ {rfq.referenceNo}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F0EBE6]"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}>
            <p><span style={{ color: '#888880' }}>Buyer asked: </span><span style={{ color: '#1A1A1A' }} className="font-semibold">{rfq.quantity} {rfq.unit}{rfq.targetPricePerUnit ? ` @ target ${rfq.currency} ${rfq.targetPricePerUnit}` : ''}</span></p>
            {rfq.qualityRequired && <p><span style={{ color: '#888880' }}>Quality: </span>{rfq.qualityRequired}</p>}
            {rfq.notes && <p style={{ color: '#888880' }} className="italic">"{rfq.notes}"</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Offered Price ({rfq.currency}/{rfq.unit}) *</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Offered Quantity ({rfq.unit}) *</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }} />
          </div>
          {total > 0 && (
            <div className="p-3 rounded-xl flex justify-between items-baseline"
              style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.15)' }}>
              <span className="text-xs" style={{ color: '#888880' }}>Total</span>
              <span className="text-lg font-bold" style={{ color: '#C73B22' }}>{rfq.currency} {total.toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-6" style={{ borderTop: '1px solid #E8E2DC' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F0EBE6]" style={{ color: '#888880' }}>Cancel</button>
          <button onClick={() => submit.mutate()} disabled={submit.isPending || !price || !qty}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
            style={{ background: '#C73B22' }}>
            <Send size={13} /> Submit Offer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IncomingRfqs() {
  const [offerTarget, setOfferTarget] = useState<IncomingRfq | null>(null);
  const { data, isLoading } = useQuery<{ rfqs: IncomingRfq[] }>({
    queryKey: ['/api/b2b/marketplace/rfqs/incoming'],
  });
  const rfqs = data?.rfqs ?? [];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Incoming RFQs</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
          Buyer quote requests across the marketplace — submit an offer to win the deal
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#E8E2DC', borderTopColor: '#C73B22' }} />
        </div>
      ) : rfqs.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center" style={{ border: '1px dashed #E8E2DC' }}>
          <FileText size={32} style={{ color: '#E8E2DC' }} className="mx-auto" />
          <p className="mt-3 text-sm font-medium" style={{ color: '#B0AAA4' }}>No open RFQs at the moment.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#FAFAF8' }}>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#888880' }}>
                <th className="px-4 py-3 font-semibold">Ref</th>
                <th className="px-4 py-3 font-semibold">Buyer</th>
                <th className="px-4 py-3 font-semibold">Commodity</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">My offer</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map(r => {
                const sc = STATUS[r.status] || { bg: '#F0EBE6', color: '#888880' };
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid #F0EBE6' }}>
                    <td className="px-4 py-3 font-mono text-xs">{r.referenceNo}</td>
                    <td className="px-4 py-3">
                      <CounterpartyChip counterparty={r.counterparty} fallbackFtId={r.buyerName} size="sm" />
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1A1A1A' }}>{r.commodity}</td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{r.quantity} {r.unit}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#888880' }}>
                      {r.targetPricePerUnit ? `${r.currency} ${r.targetPricePerUnit.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: sc.bg, color: sc.color }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.myOffer ? (
                        <span style={{ color: '#059669' }}>
                          ✓ {r.currency} {r.myOffer.pricePerUnit.toLocaleString()} ({r.myOffer.status})
                        </span>
                      ) : (
                        <span style={{ color: '#888880' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!r.myOffer && (
                        <button onClick={() => setOfferTarget(r)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1 hover:opacity-90"
                          style={{ background: '#C73B22' }}>
                          <Send size={11} /> Offer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {offerTarget && <OfferModal rfq={offerTarget} onClose={() => setOfferTarget(null)} />}
    </div>
  );
}
