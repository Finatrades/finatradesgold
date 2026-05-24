import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Plus, Edit2, Trash2, X } from 'lucide-react';

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
  ctaLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  isActive: boolean;
};

function fmt(s: string | null): string {
  if (!s) return '';
  try { return new Date(s).toISOString().slice(0, 16); } catch { return ''; }
}

function BannerForm({ initial, onClose, onSave }: { initial?: Banner; onClose: () => void; onSave: (b: any) => void }) {
  const [b, setB] = useState({
    title: initial?.title || '',
    subtitle: initial?.subtitle || '',
    imageUrl: initial?.imageUrl || '',
    targetUrl: initial?.targetUrl || '',
    ctaLabel: initial?.ctaLabel || '',
    startsAt: fmt(initial?.startsAt || null),
    endsAt: fmt(initial?.endsAt || null),
    sortOrder: initial?.sortOrder ?? 0,
    isActive: initial?.isActive ?? true,
  });
  const u = <K extends keyof typeof b>(k: K, v: typeof b[K]) => setB(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{initial ? 'Edit' : 'New'} Banner</h2>
          <button onClick={onClose}><X size={18}/></button>
        </div>
        <div className="space-y-3 text-sm">
          {([
            ['title', 'Title *', 'text'],
            ['subtitle', 'Subtitle', 'text'],
            ['imageUrl', 'Image URL', 'text'],
            ['targetUrl', 'Target URL', 'text'],
            ['ctaLabel', 'CTA Label', 'text'],
            ['startsAt', 'Starts At', 'datetime-local'],
            ['endsAt', 'Ends At', 'datetime-local'],
          ] as const).map(([k, lbl, type]) => (
            <div key={k}>
              <label className="block text-xs mb-1" style={{ color: '#888' }}>{lbl}</label>
              <input type={type} value={(b as any)[k]} onChange={e => u(k, e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'rgba(0,0,0,0.10)' }}/>
            </div>
          ))}
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-xs mb-1" style={{ color: '#888' }}>Sort</label>
              <input type="number" value={b.sortOrder} onChange={e => u('sortOrder', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: 'rgba(0,0,0,0.10)' }}/></div>
            <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={b.isActive} onChange={e => u('isActive', e.target.checked)}/> Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: 'rgba(0,0,0,0.10)' }}>Cancel</button>
          <button onClick={() => onSave({
            ...b,
            subtitle: b.subtitle || null,
            imageUrl: b.imageUrl || null,
            targetUrl: b.targetUrl || null,
            ctaLabel: b.ctaLabel || null,
            startsAt: b.startsAt ? new Date(b.startsAt).toISOString() : null,
            endsAt: b.endsAt ? new Date(b.endsAt).toISOString() : null,
          })} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: '#C73B22' }}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBanners() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery<{ banners: Banner[] }>({
    queryKey: ['admin', 'marketplace', 'banners'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/marketplace/banners')).json(),
  });

  const save = useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: any }) => {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/marketplace/banners/${id}` : '/api/admin/marketplace/banners';
      return (await apiRequest(method, url, body)).json();
    },
    onSuccess: () => { toast({ title: 'Saved' }); qc.invalidateQueries({ queryKey: ['admin','marketplace','banners'] }); setEditing(null); setCreating(false); },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await apiRequest('DELETE', `/api/admin/marketplace/banners/${id}`)).json(),
    onSuccess: () => { toast({ title: 'Deleted' }); qc.invalidateQueries({ queryKey: ['admin','marketplace','banners'] }); },
  });

  const banners = data?.banners || [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#1A1A1A' }}><Megaphone size={22}/> Marketing Banners</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Schedule banners shown on the marketplace · {banners.length} total</p>
        </div>
        <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2" style={{ background: '#C73B22' }}><Plus size={14}/> New Banner</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && <div className="p-8 text-sm" style={{ color: '#888' }}>Loading…</div>}
        {banners.map(b => {
          const now = Date.now();
          const startsOk = !b.startsAt || new Date(b.startsAt).getTime() <= now;
          const endsOk = !b.endsAt || new Date(b.endsAt).getTime() >= now;
          const live = b.isActive && startsOk && endsOk;
          return (
            <div key={b.id} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              {b.imageUrl && <div className="h-32 bg-gray-100" style={{ background: `url(${b.imageUrl}) center/cover` }}/>}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{b.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: live ? 'rgba(22,163,74,0.10)' : 'rgba(107,114,128,0.10)', color: live ? '#16A34A' : '#4B5563' }}>
                        {live ? 'Live' : b.isActive ? 'Scheduled' : 'Inactive'}
                      </span>
                    </div>
                    {b.subtitle && <p className="text-xs mt-1" style={{ color: '#888' }}>{b.subtitle}</p>}
                    <p className="text-xs mt-2" style={{ color: '#888' }}>
                      {b.startsAt ? new Date(b.startsAt).toLocaleString() : 'always'} → {b.endsAt ? new Date(b.endsAt).toLocaleString() : 'forever'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(b)} className="p-1.5 rounded hover:bg-gray-100"><Edit2 size={14}/></button>
                    <button onClick={() => { if (window.confirm(`Delete "${b.title}"?`)) del.mutate(b.id); }} className="p-1.5 rounded hover:bg-red-50" style={{ color: '#9F1239' }}><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && banners.length === 0 && <div className="col-span-2 p-8 text-center text-sm bg-white rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.06)', color: '#888' }}>No banners yet. Create one to start.</div>}
      </div>

      {(editing || creating) && (
        <BannerForm initial={editing || undefined}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(body) => save.mutate({ id: editing?.id, body })} />
      )}
    </div>
  );
}
