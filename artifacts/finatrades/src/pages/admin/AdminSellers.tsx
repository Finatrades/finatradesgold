import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Award, Search, Plus, X, Star } from 'lucide-react';

type Seller = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  country: string | null;
  finatradesId: string | null;
  kycStatus: string | null;
  rating: number | null;
  ratingCount: number;
  completedTradesCount: number;
  badges: { id: string; slug: string; label: string; color: string | null; awardedAt: string }[];
};

const PRESETS = [
  { slug: 'verified_seller', label: 'Verified Seller', color: '#16A34A' },
  { slug: 'gold_member', label: 'Gold Member', color: '#D4AF37' },
  { slug: 'top_exporter', label: 'Top Exporter', color: '#C73B22' },
  { slug: 'trusted_partner', label: 'Trusted Partner', color: '#2C7A7B' },
];

function AwardModal({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [slug, setSlug] = useState(PRESETS[0].slug);
  const [label, setLabel] = useState(PRESETS[0].label);
  const [color, setColor] = useState(PRESETS[0].color);
  const [notes, setNotes] = useState('');

  const save = useMutation({
    mutationFn: async () => (await apiRequest('POST', `/api/admin/marketplace/users/${userId}/badges`, { slug, label, color, notes })).json(),
    onSuccess: () => { toast({ title: 'Badge awarded' }); onSaved(); onClose(); },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Award size={18}/> Award Badge</h2>
          <button onClick={onClose}><X size={18}/></button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {PRESETS.map(p => (
            <button key={p.slug} onClick={() => { setSlug(p.slug); setLabel(p.label); setColor(p.color); }}
              className="p-2 rounded-lg text-xs font-semibold border transition"
              style={{
                borderColor: slug === p.slug ? p.color : 'rgba(0,0,0,0.10)',
                color: p.color, background: slug === p.slug ? `${p.color}14` : '#fff',
              }}>{p.label}</button>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug" className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'rgba(0,0,0,0.10)' }}/>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="label" className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'rgba(0,0,0,0.10)' }}/>
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="color (#hex)" className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'rgba(0,0,0,0.10)' }}/>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="notes (optional)" rows={2} className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'rgba(0,0,0,0.10)' }}/>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: 'rgba(0,0,0,0.10)' }}>Cancel</button>
          <button onClick={() => save.mutate()} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: '#C73B22' }}>Award</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSellers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [awarding, setAwarding] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ sellers: Seller[] }>({
    queryKey: ['admin', 'marketplace', 'sellers', q],
    queryFn: async () => (await apiRequest('GET', `/api/admin/marketplace/sellers?q=${encodeURIComponent(q)}`)).json(),
  });

  const revoke = useMutation({
    mutationFn: async ({ userId, slug }: { userId: string; slug: string }) =>
      (await apiRequest('DELETE', `/api/admin/marketplace/users/${userId}/badges/${slug}`)).json(),
    onSuccess: () => { toast({ title: 'Badge revoked' }); qc.invalidateQueries({ queryKey: ['admin','marketplace','sellers'] }); },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  const sellers = data?.sellers || [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#1A1A1A' }}><Award size={22}/> Seller Badges</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>Award and revoke trust badges for exporters · {sellers.length} sellers</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#888' }}/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, email, company, FT-ID…"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none text-sm" style={{ borderColor: 'rgba(0,0,0,0.10)' }}/>
      </div>

      <div className="bg-white rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {isLoading && <div className="p-8 text-center text-sm" style={{ color: '#888' }}>Loading…</div>}
        {!isLoading && sellers.length === 0 && <div className="p-8 text-center text-sm" style={{ color: '#888' }}>No exporters found.</div>}
        {sellers.map(s => (
          <div key={s.id} className="p-4 border-b last:border-b-0 flex flex-wrap items-center gap-4" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <div className="flex-1 min-w-[260px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                  {s.companyName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email}
                </span>
                {s.finatradesId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100" style={{ color: '#666' }}>{s.finatradesId}</span>}
                {s.kycStatus === 'Approved' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">KYC ✓</span>}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#888' }}>
                {s.email} · {s.country || '—'} ·
                {s.rating ? <span className="inline-flex items-center gap-0.5 ml-1"><Star size={10} fill="#D4AF37" style={{color:'#D4AF37'}}/>{s.rating.toFixed(1)} ({s.ratingCount})</span> : ' No ratings'}
                · {s.completedTradesCount} completed
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {s.badges.map(b => (
                  <button key={b.slug} onClick={() => { if (window.confirm(`Revoke "${b.label}"?`)) revoke.mutate({ userId: s.id, slug: b.slug }); }}
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 group"
                    style={{ background: `${b.color || '#C73B22'}14`, color: b.color || '#C73B22' }}>
                    {b.label} <X size={10} className="opacity-50 group-hover:opacity-100"/>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setAwarding(s.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 text-white" style={{ background: '#C73B22' }}>
              <Plus size={12}/> Award Badge
            </button>
          </div>
        ))}
      </div>

      {awarding && <AwardModal userId={awarding} onClose={() => setAwarding(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['admin','marketplace','sellers'] })}/>}
    </div>
  );
}
