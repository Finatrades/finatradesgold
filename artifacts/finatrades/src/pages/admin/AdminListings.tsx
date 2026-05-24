import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, CheckCircle2, XCircle, Star, EyeOff, Search, ChevronDown, ChevronRight, FileText, ExternalLink } from 'lucide-react';

type Listing = {
  id: string;
  consignmentId: string;
  consignmentRef: string | null;
  commodity: string;
  hub: string | null;
  country: string | null;
  grade: string | null;
  quantity: number;
  unit: string | null;
  pricePerUnitCents: number;
  currency: string;
  moderationStatus: 'pending' | 'live' | 'featured' | 'suspended' | 'rejected';
  moderationReason: string | null;
  featuredRank: number | null;
  publishedAt: string | null;
  warehouseReceipt: string | null;
  seller: { id: string; email: string; name: string; companyName: string | null; country: string | null; finatradesId: string | null; kycStatus: string | null };
};

type ListingDetail = {
  listing: Listing;
  consignment: { ref: string | null; status: string | null; notes: string | null } | null;
  warehouseReceipt: string | null;
  documents: { id: string; type: string; filename: string; mimeType: string; status: string; viewUrl: string }[];
  seller: Listing['seller'] & {
    kyc?: { overall: string | null; personal: string | null; corporate: string | null };
    rating?: number | null;
    ratingCount?: number;
    completedTrades?: number;
    badges?: { slug: string; label: string }[];
  };
};

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(180,83,9,0.10)',  color: '#B45309', label: 'Pending' },
  live:      { bg: 'rgba(22,163,74,0.10)', color: '#16A34A', label: 'Live' },
  featured:  { bg: 'rgba(199,59,34,0.10)', color: '#C73B22', label: 'Featured' },
  suspended: { bg: 'rgba(107,114,128,0.12)', color: '#4B5563', label: 'Suspended' },
  rejected:  { bg: 'rgba(199,59,34,0.12)', color: '#9F1239', label: 'Rejected' },
};

function InlineDrawer({ id }: { id: string }) {
  const { data, isLoading } = useQuery<ListingDetail>({
    queryKey: ['admin', 'marketplace', 'listing', id],
    queryFn: async () => {
      const r = await apiRequest('GET', `/api/admin/marketplace/listings/${id}`);
      return r.json();
    },
  });
  if (isLoading) return <div className="text-xs px-4 py-3" style={{ color: '#888' }}>Loading details…</div>;
  if (!data?.listing) return <div className="text-xs px-4 py-3" style={{ color: '#888' }}>No detail.</div>;
  const consignment = data.consignment;
  const docs = data.documents ?? [];
  const seller = data.seller;
  const kyc = seller?.kyc;
  return (
    <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs" style={{ background: 'rgba(0,0,0,0.02)' }}>
      <div>
        <div className="font-semibold mb-1 uppercase tracking-wide" style={{ color: '#666' }}>Consignment</div>
        <div style={{ color: '#1A1A1A' }}>{consignment?.ref || '—'}</div>
        <div style={{ color: '#666' }}>Status: {consignment?.status || '—'}</div>
        {data.warehouseReceipt && <div className="mt-1" style={{ color: '#16A34A' }}>WR: {data.warehouseReceipt}</div>}
        {consignment?.notes && <div className="mt-1" style={{ color: '#666' }}>{consignment.notes.slice(0, 160)}</div>}
      </div>
      <div>
        <div className="font-semibold mb-1 uppercase tracking-wide" style={{ color: '#666' }}>Seller KYC</div>
        {kyc ? (
          <>
            <div style={{ color: '#1A1A1A' }}>Overall: {kyc.overall || '—'}</div>
            <div style={{ color: '#666' }}>Personal: {kyc.personal || '—'} · Corporate: {kyc.corporate || '—'}</div>
          </>
        ) : (
          <div style={{ color: '#888' }}>No KYC on file.</div>
        )}
        <div className="mt-1" style={{ color: '#666' }}>FT-ID: {seller?.finatradesId || '—'}</div>
        {(seller?.completedTrades ?? 0) > 0 && (
          <div style={{ color: '#666' }}>Completed trades: {seller?.completedTrades}</div>
        )}
      </div>
      <div>
        <div className="font-semibold mb-1 uppercase tracking-wide" style={{ color: '#666' }}>Documents ({docs.length})</div>
        {docs.length === 0 && <div style={{ color: '#888' }}>None.</div>}
        <ul className="space-y-1">
          {docs.slice(0, 8).map(doc => (
            <li key={doc.id} className="flex items-center gap-1">
              <FileText size={11} style={{ color: '#666' }} />
              <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="hover:underline truncate" style={{ color: '#C73B22' }}>
                {doc.filename || doc.type}
              </a>
              <span className="text-[10px]" style={{ color: '#888' }}>{doc.status}</span>
            </li>
          ))}
        </ul>
        <Link href={`/admin/listings/${id}`} className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold" style={{ color: '#C73B22' }}>
          Open full review <ExternalLink size={10} />
        </Link>
      </div>
    </div>
  );
}

export default function AdminListings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [since, setSince] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<{ listings: Listing[]; total: number; statusCounts: { status: string; n: number }[] }>({
    queryKey: ['admin', 'marketplace', 'listings', status, country, since],
    queryFn: async () => {
      const qs = new URLSearchParams({ status });
      if (country) qs.set('country', country);
      if (since) qs.set('since', since);
      const r = await apiRequest('GET', `/api/admin/marketplace/listings?${qs.toString()}`);
      return r.json();
    },
  });

  const mutate = useMutation({
    mutationFn: async ({ id, action, reason, featuredRank }: { id: string; action: string; reason?: string; featuredRank?: number }) => {
      const r = await apiRequest('POST', `/api/admin/marketplace/listings/${id}/${action}`, { reason, featuredRank });
      return r.json();
    },
    onSuccess: (_d, vars) => {
      toast({ title: 'Done', description: `Listing ${vars.action}d.` });
      qc.invalidateQueries({ queryKey: ['admin', 'marketplace', 'listings'] });
    },
    onError: (e: any) => toast({ title: 'Action failed', description: e?.message || 'Try again', variant: 'destructive' }),
  });

  const bulkMutate = useMutation({
    mutationFn: async ({ ids, action, reason, featuredRank }: { ids: string[]; action: string; reason?: string; featuredRank?: number }) => {
      const r = await apiRequest('POST', `/api/admin/marketplace/listings/bulk`, { ids, action, reason, featuredRank });
      return r.json();
    },
    onSuccess: (d: any) => {
      toast({ title: 'Bulk action complete', description: `${d.succeeded}/${d.total} succeeded${d.failed ? `, ${d.failed} failed` : ''}.` });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin', 'marketplace', 'listings'] });
    },
    onError: (e: any) => toast({ title: 'Bulk action failed', description: e?.message || 'Try again', variant: 'destructive' }),
  });

  const counts = useMemo(() => {
    const m: Record<string, number> = { pending: 0, live: 0, featured: 0, suspended: 0, rejected: 0 };
    (data?.statusCounts || []).forEach(s => { m[s.status] = s.n; });
    return m;
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.listings || [];
    return (data?.listings || []).filter(l =>
      l.commodity?.toLowerCase().includes(q) ||
      l.consignmentRef?.toLowerCase().includes(q) ||
      l.seller?.email?.toLowerCase().includes(q) ||
      l.seller?.companyName?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const allChecked = filtered.length > 0 && filtered.every(l => selected.has(l.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map(l => l.id)));
  };
  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const ask = (label: string) => window.prompt(`${label} — optional reason / note:`);

  const runBulk = (action: 'approve' | 'suspend' | 'reject' | 'feature' | 'unfeature') => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    let reason: string | undefined;
    let featuredRank: number | undefined;
    if (action === 'suspend' || action === 'reject') {
      const r = ask(`${action} ${ids.length} listings`);
      if (r === null) return;
      reason = r || undefined;
    }
    if (action === 'feature') {
      const r = window.prompt(`Featured rank for ${ids.length} listings (0 = top):`, '100');
      if (r === null) return;
      featuredRank = Math.max(0, parseInt(r, 10) || 100);
    }
    if (!window.confirm(`Apply "${action}" to ${ids.length} listing(s)?`)) return;
    bulkMutate.mutate({ ids, action, reason, featuredRank });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#1A1A1A' }}>
          <ShieldAlert size={22} /> Listing Moderation
        </h1>
        <p className="text-sm mt-1" style={{ color: '#888880' }}>Review and moderate marketplace listings · {data?.total ?? 0} shown</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['pending','live','featured','suspended','rejected'] as const).map(k => (
          <button key={k} onClick={() => setStatus(k)}
            className="p-3 rounded-xl text-left transition border"
            style={{
              borderColor: status === k ? '#C73B22' : 'rgba(0,0,0,0.08)',
              background: status === k ? 'rgba(199,59,34,0.05)' : '#fff',
            }}>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: '#888' }}>{STATUS_COLORS[k].label}</div>
            <div className="text-xl font-bold" style={{ color: STATUS_COLORS[k].color }}>{counts[k] || 0}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#888' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search commodity, ref, seller…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none text-sm"
            style={{ borderColor: 'rgba(0,0,0,0.10)' }} />
        </div>
        <input value={country} onChange={e => setCountry(e.target.value)}
          placeholder="Country (e.g. NG, KE)"
          className="px-4 py-2.5 rounded-lg border outline-none text-sm"
          style={{ borderColor: 'rgba(0,0,0,0.10)' }} />
        <input type="date" value={since} onChange={e => setSince(e.target.value)}
          className="px-4 py-2.5 rounded-lg border outline-none text-sm"
          style={{ borderColor: 'rgba(0,0,0,0.10)' }}
          title="Listed on or after" />
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border" style={{ background: 'rgba(199,59,34,0.04)', borderColor: 'rgba(199,59,34,0.18)' }}>
          <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{selected.size} selected</span>
          <button onClick={() => runBulk('approve')} disabled={bulkMutate.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(22,163,74,0.10)', color: '#16A34A' }}>
            <CheckCircle2 size={12}/> Approve
          </button>
          <button onClick={() => runBulk('feature')} disabled={bulkMutate.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(199,59,34,0.10)', color: '#C73B22' }}>
            <Star size={12}/> Feature
          </button>
          <button onClick={() => runBulk('unfeature')} disabled={bulkMutate.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(107,114,128,0.10)', color: '#4B5563' }}>
            Unfeature
          </button>
          <button onClick={() => runBulk('suspend')} disabled={bulkMutate.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(107,114,128,0.10)', color: '#4B5563' }}>
            <EyeOff size={12}/> Suspend
          </button>
          <button onClick={() => runBulk('reject')} disabled={bulkMutate.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: 'rgba(199,59,34,0.10)', color: '#9F1239' }}>
            <XCircle size={12}/> Reject
          </button>
          <button onClick={() => setSelected(new Set())}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ color: '#666' }}>
            Clear
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-b flex items-center gap-2 text-xs" style={{ borderColor: 'rgba(0,0,0,0.06)', color: '#666' }}>
            <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
            <span>Select all on this page</span>
          </div>
        )}
        {isLoading && <div className="p-8 text-center text-sm" style={{ color: '#888' }}>Loading…</div>}
        {!isLoading && filtered.length === 0 && <div className="p-8 text-center text-sm" style={{ color: '#888' }}>No listings.</div>}
        {filtered.map(l => {
          const c = STATUS_COLORS[l.moderationStatus] || STATUS_COLORS.pending;
          const isOpen = expanded === l.id;
          return (
            <div key={l.id} className="border-b last:border-b-0" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <div className="p-4 flex flex-wrap gap-4 items-center">
                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label="Select listing" />
                <button onClick={() => setExpanded(isOpen ? null : l.id)}
                  className="p-1 rounded hover:bg-black/5" aria-label={isOpen ? 'Collapse' : 'Expand'}>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/admin/listings/${l.id}`} className="font-semibold hover:underline" style={{ color: '#1A1A1A' }}>{l.commodity}</Link>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: c.bg, color: c.color }}>{c.label}</span>
                    {l.warehouseReceipt && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">WR ✓</span>}
                  </div>
                  <div className="text-xs" style={{ color: '#666' }}>
                    {l.consignmentRef} · {l.hub || '—'} · {l.grade || 'No grade'} · {l.quantity} {l.unit} · {(l.pricePerUnitCents / 100).toFixed(2)} {l.currency}/{l.unit}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#888' }}>
                    Seller: {l.seller.companyName || l.seller.name} ({l.seller.finatradesId || '—'}) · {l.seller.country || '—'} · KYC {l.seller.kycStatus || '—'}
                  </div>
                  {l.moderationReason && <div className="text-xs mt-1 italic" style={{ color: '#9F1239' }}>"{l.moderationReason}"</div>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {l.moderationStatus !== 'live' && l.moderationStatus !== 'featured' && (
                    <button onClick={() => mutate.mutate({ id: l.id, action: 'approve' })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(22,163,74,0.10)', color: '#16A34A' }}>
                      <CheckCircle2 size={12}/> Approve
                    </button>
                  )}
                  {l.moderationStatus !== 'featured' ? (
                    <button onClick={() => {
                      const rank = window.prompt('Featured rank (0 = top):', '100');
                      if (rank === null) return;
                      mutate.mutate({ id: l.id, action: 'feature', featuredRank: Math.max(0, parseInt(rank, 10) || 100) });
                    }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(199,59,34,0.10)', color: '#C73B22' }}>
                      <Star size={12}/> Feature
                    </button>
                  ) : (
                    <button onClick={() => mutate.mutate({ id: l.id, action: 'unfeature' })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(107,114,128,0.10)', color: '#4B5563' }}>
                      Unfeature
                    </button>
                  )}
                  {l.moderationStatus !== 'suspended' && (
                    <button onClick={() => { const r = ask('Suspend listing'); if (r === null) return; mutate.mutate({ id: l.id, action: 'suspend', reason: r || undefined }); }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(107,114,128,0.10)', color: '#4B5563' }}>
                      <EyeOff size={12}/> Suspend
                    </button>
                  )}
                  {l.moderationStatus !== 'rejected' && (
                    <button onClick={() => { const r = ask('Reject listing'); if (r === null) return; mutate.mutate({ id: l.id, action: 'reject', reason: r || undefined }); }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(199,59,34,0.10)', color: '#9F1239' }}>
                      <XCircle size={12}/> Reject
                    </button>
                  )}
                </div>
              </div>
              {isOpen && <InlineDrawer id={l.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
