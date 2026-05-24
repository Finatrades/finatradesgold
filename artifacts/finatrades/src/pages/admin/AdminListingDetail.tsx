import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Star, CheckCircle2, XCircle, EyeOff } from 'lucide-react';

export default function AdminListingDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<any>({
    queryKey: ['admin', 'marketplace', 'listing', id],
    queryFn: async () => (await apiRequest('GET', `/api/admin/marketplace/listings/${id}`)).json(),
  });

  const mutate = useMutation({
    mutationFn: async ({ action, body }: { action: string; body?: any }) =>
      (await apiRequest('POST', `/api/admin/marketplace/listings/${id}/${action}`, body || {})).json(),
    onSuccess: () => {
      toast({ title: 'Updated' });
      qc.invalidateQueries({ queryKey: ['admin', 'marketplace'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  if (isLoading || !data) return <div className="p-8 text-sm" style={{ color: '#888' }}>Loading…</div>;

  const l = data.listing;
  const s = data.seller;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <Link href="/admin/listings" className="text-sm flex items-center gap-1.5 hover:underline" style={{ color: '#C73B22' }}>
        <ArrowLeft size={14}/> Back to moderation queue
      </Link>

      <div className="bg-white p-6 rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{l.commodityName}</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>{data.consignment.ref} · {l.hubCode} · {l.qualityGrade || 'No grade'}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div><div className="text-xs" style={{ color: '#888' }}>Quantity</div><div className="font-semibold">{Number(l.quantity)} {l.unit}</div></div>
          <div><div className="text-xs" style={{ color: '#888' }}>Price</div><div className="font-semibold">{(l.askingPriceCents/100).toFixed(2)} {l.askingCurrency}/{l.unit}</div></div>
          <div><div className="text-xs" style={{ color: '#888' }}>Status</div><div className="font-semibold">{l.moderationStatus}</div></div>
          <div><div className="text-xs" style={{ color: '#888' }}>WR</div><div className="font-semibold">{data.warehouseReceipt || '—'}</div></div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <button onClick={() => mutate.mutate({ action: 'approve' })}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(22,163,74,0.10)', color: '#16A34A' }}><CheckCircle2 size={12}/> Approve</button>
          <button onClick={() => {
            const r = window.prompt('Featured rank (0 = top):', '100');
            if (r === null) return;
            mutate.mutate({ action: 'feature', body: { featuredRank: Math.max(0, parseInt(r, 10) || 100) } });
          }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(199,59,34,0.10)', color: '#C73B22' }}><Star size={12}/> Feature</button>
          <button onClick={() => { const r = window.prompt('Reason'); if (r === null) return; mutate.mutate({ action: 'suspend', body: { reason: r } }); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(107,114,128,0.10)', color: '#4B5563' }}><EyeOff size={12}/> Suspend</button>
          <button onClick={() => { const r = window.prompt('Rejection reason'); if (r === null) return; mutate.mutate({ action: 'reject', body: { reason: r } }); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(199,59,34,0.10)', color: '#9F1239' }}><XCircle size={12}/> Reject</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <h2 className="font-semibold mb-3" style={{ color: '#1A1A1A' }}>Seller</h2>
        <div className="text-sm space-y-1">
          <div><span style={{ color: '#888' }}>Name:</span> {s.name || s.companyName} ({s.finatradesId || '—'})</div>
          <div><span style={{ color: '#888' }}>Email:</span> {s.email}</div>
          <div><span style={{ color: '#888' }}>Country:</span> {s.country || '—'}</div>
          <div><span style={{ color: '#888' }}>KYC:</span> overall {s.kyc.overall || '—'} · personal {s.kyc.personal || '—'} · corporate {s.kyc.corporate || '—'}</div>
          <div><span style={{ color: '#888' }}>Rating:</span> {s.rating ? `${s.rating.toFixed(1)} (${s.ratingCount})` : 'No ratings'} · {s.completedTrades} completed trades</div>
          {s.badges?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {s.badges.map((b: any) => (
                <span key={b.slug} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(199,59,34,0.08)', color: b.color || '#C73B22' }}>{b.label}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}><FileText size={16}/> Documents ({data.documents.length})</h2>
        <div className="space-y-1.5">
          {data.documents.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
              <div>
                <div className="font-medium">{d.type}</div>
                <div className="text-xs" style={{ color: '#888' }}>{d.filename}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100">{d.status}</span>
            </div>
          ))}
          {data.documents.length === 0 && <div className="text-xs" style={{ color: '#888' }}>No documents uploaded.</div>}
        </div>
      </div>
    </div>
  );
}
