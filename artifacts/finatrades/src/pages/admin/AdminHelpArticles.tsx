import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type Status = 'draft'|'published'|'archived';
interface Article {
  id: string; slug: string; category: string; title: string; body: string;
  excerpt: string | null; status: Status; sortOrder: number; updatedAt: string;
}

const EMPTY = { id: '', slug: '', category: 'getting-started', title: '', body: '', excerpt: '', status: 'draft' as Status, sortOrder: 0 };

export default function AdminHelpArticles() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [edit, setEdit] = useState(EMPTY);

  const q = useQuery({
    queryKey: ['/api/admin/settings/help-articles'],
    queryFn: async () => (await (await apiRequest('GET', '/api/admin/settings/help-articles')).json()) as { articles: Article[] },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { slug: edit.slug, category: edit.category, title: edit.title, body: edit.body, excerpt: edit.excerpt, status: edit.status, sortOrder: edit.sortOrder };
      const r = edit.id
        ? await apiRequest('PUT', `/api/admin/settings/help-articles/${edit.id}`, payload)
        : await apiRequest('POST', '/api/admin/settings/help-articles', payload);
      return r.json();
    },
    onSuccess: () => { toast({ title: 'Saved' }); setEdit(EMPTY); qc.invalidateQueries({ queryKey: ['/api/admin/settings/help-articles'] }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await apiRequest('DELETE', `/api/admin/settings/help-articles/${id}`)).json(),
    onSuccess: () => { toast({ title: 'Deleted' }); qc.invalidateQueries({ queryKey: ['/api/admin/settings/help-articles'] }); },
  });

  const articles = q.data?.articles ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Help Center Articles</h1>
        <p className="text-sm" style={{ color: '#888880' }}>Published articles appear at /help.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h2 className="font-semibold mb-3">{edit.id ? 'Edit article' : 'New article'}</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="slug (kebab-case)" value={edit.slug} onChange={e => setEdit({ ...edit, slug: e.target.value })} />
              <Input placeholder="category" value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })} />
            </div>
            <Input placeholder="Title" value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} />
            <Input placeholder="Excerpt" value={edit.excerpt} onChange={e => setEdit({ ...edit, excerpt: e.target.value })} />
            <Textarea rows={12} placeholder="Body (Markdown)" value={edit.body} onChange={e => setEdit({ ...edit, body: e.target.value })} className="font-mono text-xs" />
            <div className="flex items-center gap-3">
              <select className="h-10 px-3 rounded border" value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value as Status })}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
              </select>
              <Input type="number" value={edit.sortOrder} onChange={e => setEdit({ ...edit, sortOrder: parseInt(e.target.value || '0', 10) })} className="w-24" />
              <Button onClick={() => save.mutate()} disabled={save.isPending || !edit.slug || !edit.title || !edit.body} style={{ background: '#C73B22', color: 'white' }}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
              {edit.id && <Button variant="outline" onClick={() => setEdit(EMPTY)}>Cancel</Button>}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">All articles</h2>
          <div className="space-y-2">
            {articles.map(a => (
              <div key={a.id} className="border-b pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="text-xs text-gray-500">{a.category} • {a.status}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEdit({ id: a.id, slug: a.slug, category: a.category, title: a.title, body: a.body, excerpt: a.excerpt ?? '', status: a.status, sortOrder: a.sortOrder })}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm('Delete?')) del.mutate(a.id); }}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
            {articles.length === 0 && <div className="text-xs text-gray-500">None yet.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
