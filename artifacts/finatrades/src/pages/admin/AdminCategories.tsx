import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tags, Plus, Edit2, Trash2, X } from 'lucide-react';

type Cat = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  icon: string | null;
  hsCodes: string[] | null;
  sortOrder: number;
  isActive: boolean;
};

function CatForm({ initial, parents, onClose, onSave }: { initial?: Cat; parents: Cat[]; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [parentId, setParentId] = useState<string>(initial?.parentId || '');
  const [icon, setIcon] = useState(initial?.icon || '');
  const [hsCodes, setHsCodes] = useState((initial?.hsCodes || []).join(', '));
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{initial ? 'Edit' : 'New'} Category</h2>
          <button onClick={onClose}><X size={18}/></button>
        </div>
        <div className="space-y-3 text-sm">
          <div><label className="block text-xs mb-1" style={{ color: '#888' }}>Name *</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border" style={{borderColor:'rgba(0,0,0,0.10)'}}/></div>
          <div><label className="block text-xs mb-1" style={{ color: '#888' }}>Slug * (lowercase, dashes)</label>
            <input value={slug} onChange={e=>setSlug(e.target.value)} className="w-full px-3 py-2 rounded-lg border" style={{borderColor:'rgba(0,0,0,0.10)'}}/></div>
          <div><label className="block text-xs mb-1" style={{ color: '#888' }}>Parent</label>
            <select value={parentId} onChange={e=>setParentId(e.target.value)} className="w-full px-3 py-2 rounded-lg border" style={{borderColor:'rgba(0,0,0,0.10)'}}>
              <option value="">(top-level)</option>
              {parents.filter(p=>!p.parentId && p.id !== initial?.id).map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className="block text-xs mb-1" style={{ color: '#888' }}>Icon (emoji)</label>
            <input value={icon} onChange={e=>setIcon(e.target.value)} className="w-full px-3 py-2 rounded-lg border" style={{borderColor:'rgba(0,0,0,0.10)'}}/></div>
          <div><label className="block text-xs mb-1" style={{ color: '#888' }}>HS Codes (comma separated)</label>
            <input value={hsCodes} onChange={e=>setHsCodes(e.target.value)} className="w-full px-3 py-2 rounded-lg border" style={{borderColor:'rgba(0,0,0,0.10)'}}/></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-xs mb-1" style={{ color: '#888' }}>Sort</label>
              <input type="number" value={sortOrder} onChange={e=>setSortOrder(parseInt(e.target.value)||0)} className="w-full px-3 py-2 rounded-lg border" style={{borderColor:'rgba(0,0,0,0.10)'}}/></div>
            <label className="flex items-center gap-2 mt-6 text-sm"><input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)}/> Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border" style={{borderColor:'rgba(0,0,0,0.10)'}}>Cancel</button>
          <button onClick={() => onSave({
            name, slug, parentId: parentId || null, icon: icon || null,
            hsCodes: hsCodes.split(',').map(s=>s.trim()).filter(Boolean),
            sortOrder, isActive,
          })} className="px-4 py-2 rounded-lg text-sm text-white" style={{background:'#C73B22'}}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategories() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Cat | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery<{ categories: Cat[] }>({
    queryKey: ['admin', 'marketplace', 'categories'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/marketplace/categories')).json(),
  });

  const save = useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: any }) => {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/marketplace/categories/${id}` : '/api/admin/marketplace/categories';
      return (await apiRequest(method, url, body)).json();
    },
    onSuccess: () => { toast({ title: 'Saved' }); qc.invalidateQueries({ queryKey: ['admin','marketplace','categories'] }); setEditing(null); setCreating(false); },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await apiRequest('DELETE', `/api/admin/marketplace/categories/${id}`)).json(),
    onSuccess: () => { toast({ title: 'Deleted' }); qc.invalidateQueries({ queryKey: ['admin','marketplace','categories'] }); },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  const cats = data?.categories || [];
  const tree = useMemo(() => {
    const tops = cats.filter(c => !c.parentId);
    return tops.map(t => ({ ...t, children: cats.filter(c => c.parentId === t.id) }));
  }, [cats]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#1A1A1A' }}><Tags size={22}/> Commodity Categories</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Manage marketplace categories · {cats.length} total</p>
        </div>
        <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2" style={{ background: '#C73B22' }}>
          <Plus size={14}/> New Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {isLoading && <div className="p-8 text-center text-sm" style={{ color: '#888' }}>Loading…</div>}
        {tree.map(t => (
          <div key={t.id} className="border-b last:border-b-0" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <CatRow cat={t} onEdit={() => setEditing(t)} onDelete={() => { if (window.confirm(`Delete "${t.name}"?`)) del.mutate(t.id); }} />
            {t.children.map((c: any) => (
              <div key={c.id} className="pl-10 bg-gray-50/50">
                <CatRow cat={c} onEdit={() => setEditing(c)} onDelete={() => { if (window.confirm(`Delete "${c.name}"?`)) del.mutate(c.id); }} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <CatForm initial={editing || undefined} parents={cats}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(body) => save.mutate({ id: editing?.id, body })} />
      )}
    </div>
  );
}

function CatRow({ cat, onEdit, onDelete }: { cat: Cat; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="p-3 flex items-center gap-3">
      <div className="text-lg">{cat.icon || '📦'}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{cat.name}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100" style={{ color: '#666' }}>{cat.slug}</span>
          {!cat.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(199,59,34,0.10)', color: '#9F1239' }}>Inactive</span>}
        </div>
        {cat.hsCodes && cat.hsCodes.length > 0 && <div className="text-xs mt-0.5" style={{ color: '#888' }}>HS: {cat.hsCodes.join(', ')}</div>}
      </div>
      <button onClick={onEdit} className="p-1.5 rounded hover:bg-gray-100"><Edit2 size={14}/></button>
      <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50" style={{ color: '#9F1239' }}><Trash2 size={14}/></button>
    </div>
  );
}
