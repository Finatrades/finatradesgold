import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type Severity = 'info'|'warning'|'success'|'critical';
type Segment = 'all'|'exporter'|'importer'|'government'|'warehouse'|'admin';
type Channel = 'banner'|'in_app'|'email';

interface Ann {
  id: string; title: string; body: string; channel: Channel; severity: Severity;
  audienceSegment: Segment; audienceCountry: string | null;
  scheduledAt: string; expiresAt: string | null; isActive: boolean;
  ctaLabel: string | null; ctaUrl: string | null;
}

const EMPTY = { id: '', title: '', body: '', channel: 'banner' as Channel, severity: 'info' as Severity,
  audienceSegment: 'all' as Segment, audienceCountry: '', scheduledAt: '', expiresAt: '', isActive: true,
  ctaLabel: '', ctaUrl: '' };

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);

  const q = useQuery({
    queryKey: ['/api/admin/settings/announcements'],
    queryFn: async () => (await (await apiRequest('GET', '/api/admin/settings/announcements')).json()) as { announcements: Ann[] },
  });

  const save = useMutation({
    mutationFn: async () => {
      const body: any = {
        title: form.title, body: form.body, channel: form.channel, severity: form.severity,
        audienceSegment: form.audienceSegment,
        audienceCountry: form.audienceCountry ? form.audienceCountry.toUpperCase() : null,
        scheduledAt: form.scheduledAt || null,
        expiresAt: form.expiresAt || null,
        isActive: form.isActive,
        ctaLabel: form.ctaLabel || undefined, ctaUrl: form.ctaUrl || undefined,
      };
      const r = form.id
        ? await apiRequest('PUT', `/api/admin/settings/announcements/${form.id}`, body)
        : await apiRequest('POST', '/api/admin/settings/announcements', body);
      return r.json();
    },
    onSuccess: () => { toast({ title: 'Saved' }); setForm(EMPTY); qc.invalidateQueries({ queryKey: ['/api/admin/settings/announcements'] }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await apiRequest('DELETE', `/api/admin/settings/announcements/${id}`)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/admin/settings/announcements'] }); },
  });

  const anns = q.data?.announcements ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Platform Announcements</h1>
        <p className="text-sm" style={{ color: '#888880' }}>Banners appear at the top of every dashboard for matching audiences.</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">{form.id ? 'Edit announcement' : 'New announcement'}</h2>
        <div className="space-y-3">
          <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Textarea rows={3} placeholder="Body" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select className="h-10 px-3 rounded border" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as Channel })}>
              <option value="banner">Banner</option><option value="in_app">In-app</option><option value="email">Email</option>
            </select>
            <select className="h-10 px-3 rounded border" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as Severity })}>
              <option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option><option value="critical">Critical</option>
            </select>
            <select className="h-10 px-3 rounded border" value={form.audienceSegment} onChange={e => setForm({ ...form, audienceSegment: e.target.value as Segment })}>
              <option value="all">All users</option>
              <option value="exporter">Exporters</option><option value="importer">Importers</option>
              <option value="government">Government</option><option value="warehouse">Warehouse</option>
              <option value="admin">Admins</option>
            </select>
            <Input placeholder="Country ISO (optional)" maxLength={2} value={form.audienceCountry} onChange={e => setForm({ ...form, audienceCountry: e.target.value.toUpperCase() })} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Scheduled (start)</label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Expires</label>
              <Input type="datetime-local" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
            <Input placeholder="CTA label" value={form.ctaLabel} onChange={e => setForm({ ...form, ctaLabel: e.target.value })} />
            <Input placeholder="CTA URL" value={form.ctaUrl} onChange={e => setForm({ ...form, ctaUrl: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title || !form.body} style={{ background: '#C73B22', color: 'white' }}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
            {form.id && <Button variant="outline" onClick={() => setForm(EMPTY)}>Cancel</Button>}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">All announcements</h2>
        <div className="space-y-2">
          {anns.map(a => (
            <div key={a.id} className="border-b pb-2 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold">{a.title} <span className="text-xs text-gray-500 ml-2">{a.severity} • {a.audienceSegment}{a.audienceCountry ? ` • ${a.audienceCountry}` : ''} • {a.isActive ? 'active' : 'inactive'}</span></div>
                <div className="text-xs text-gray-600 mt-1">{a.body}</div>
              </div>
              <div className="flex gap-1">
                {a.channel === 'email' && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (!confirm(`Broadcast "${a.title}" to all matching users by email?`)) return;
                    try {
                      const r = await apiRequest('POST', `/api/admin/settings/announcements/${a.id}/broadcast-email`);
                      const d = await r.json();
                      toast({ title: 'Broadcast sent', description: `Delivered to ${d.recipients} recipients` });
                    } catch (e: any) {
                      toast({ variant: 'destructive', title: 'Broadcast failed', description: e?.message });
                    }
                  }}>Broadcast</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setForm({
                  id: a.id, title: a.title, body: a.body, channel: a.channel, severity: a.severity,
                  audienceSegment: a.audienceSegment, audienceCountry: a.audienceCountry ?? '',
                  scheduledAt: a.scheduledAt ? a.scheduledAt.slice(0, 16) : '',
                  expiresAt: a.expiresAt ? a.expiresAt.slice(0, 16) : '',
                  isActive: a.isActive, ctaLabel: a.ctaLabel ?? '', ctaUrl: a.ctaUrl ?? '',
                })}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => { if (confirm('Delete?')) del.mutate(a.id); }}>Delete</Button>
              </div>
            </div>
          ))}
          {anns.length === 0 && <div className="text-xs text-gray-500">None yet.</div>}
        </div>
      </Card>
    </div>
  );
}
