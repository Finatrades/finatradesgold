import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Version {
  id: string; slug: string; version: number; subject: string; bodyHtml: string;
  mergeVars: string[] | null; isActive: boolean; notes: string | null; createdAt: string;
}

export default function AdminEmailTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [slug, setSlug] = useState('');
  const [editor, setEditor] = useState({ subject: '', bodyHtml: '', notes: '' });
  const [preview, setPreview] = useState<{ subject: string; bodyHtml: string } | null>(null);

  const list = useQuery({
    queryKey: ['/api/admin/settings/email-templates'],
    queryFn: async () => (await (await apiRequest('GET', '/api/admin/settings/email-templates')).json()) as { templates: { slug: string; latestVersion: number; latestSubject: string }[] },
  });

  const detail = useQuery({
    queryKey: ['/api/admin/settings/email-templates', slug],
    queryFn: async () => (await (await apiRequest('GET', `/api/admin/settings/email-templates/${slug}`)).json()) as { latest: Version | null; history: Version[] },
    enabled: !!slug,
  });

  const publish = useMutation({
    mutationFn: async () => (await (await apiRequest('POST', `/api/admin/settings/email-templates/${slug}/versions`, editor)).json()),
    onSuccess: () => {
      toast({ title: 'New version published' });
      qc.invalidateQueries({ queryKey: ['/api/admin/settings/email-templates'] });
      qc.invalidateQueries({ queryKey: ['/api/admin/settings/email-templates', slug] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const doPreview = useMutation({
    mutationFn: async () => (await (await apiRequest('POST', `/api/admin/settings/email-templates/${slug}/preview`, { subject: editor.subject, bodyHtml: editor.bodyHtml, sampleData: { name: 'Sample User', amount: '1,200.00', currency: 'USD' } })).json()),
    onSuccess: (d: any) => setPreview({ subject: d.subject, bodyHtml: d.bodyHtml }),
  });

  function loadSlug(s: string) {
    setSlug(s);
    apiRequest('GET', `/api/admin/settings/email-templates/${s}`).then(r => r.json()).then((d: any) => {
      if (d.latest) setEditor({ subject: d.latest.subject || '', bodyHtml: d.latest.bodyHtml || '', notes: '' });
      else setEditor({ subject: '', bodyHtml: '', notes: '' });
    });
  }

  const templates = list.data?.templates ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Email Templates</h1>
        <p className="text-sm" style={{ color: '#888880' }}>Each save publishes a new immutable version and deactivates the previous one.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-1">
          <h2 className="font-semibold mb-3">Templates</h2>
          <div className="space-y-1 mb-4">
            {templates.map(t => (
              <button key={t.slug} onClick={() => loadSlug(t.slug)}
                className={`w-full text-left px-3 py-2 rounded text-sm ${slug === t.slug ? 'bg-red-50 font-semibold' : 'hover:bg-gray-50'}`}>
                {t.slug} <span className="text-gray-400">v{t.latestVersion}</span>
              </button>
            ))}
            {templates.length === 0 && <div className="text-xs text-gray-500">No templates yet — enter a slug below to create one.</div>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">New / open slug</label>
            <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} placeholder="welcome_email" />
          </div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          {slug ? (
            <>
              <h2 className="font-semibold mb-3">Editing: {slug}</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Subject</label>
                  <Input value={editor.subject} onChange={e => setEditor({ ...editor, subject: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Body HTML (use &#123;&#123;variable&#125;&#125; for merge vars)</label>
                  <Textarea rows={14} value={editor.bodyHtml} onChange={e => setEditor({ ...editor, bodyHtml: e.target.value })} className="font-mono text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Change notes (optional)</label>
                  <Input value={editor.notes} onChange={e => setEditor({ ...editor, notes: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => publish.mutate()} disabled={publish.isPending || !editor.subject || !editor.bodyHtml} style={{ background: '#C73B22', color: 'white' }}>
                    {publish.isPending ? 'Publishing…' : 'Publish new version'}
                  </Button>
                  <Button variant="outline" onClick={() => doPreview.mutate()}>Preview with sample data</Button>
                </div>
              </div>
              {preview && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="font-semibold mb-2">Preview</h3>
                  <div className="text-xs text-gray-500 mb-1">Subject: {preview.subject}</div>
                  <iframe srcDoc={preview.bodyHtml} className="w-full h-64 border rounded" title="preview" sandbox="" />
                </div>
              )}
              {detail.data?.history && detail.data.history.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="font-semibold mb-2">History</h3>
                  <ul className="space-y-1 text-xs text-gray-700">
                    {detail.data.history.map(v => (
                      <li key={v.id}>v{v.version} — {new Date(v.createdAt).toLocaleString()} {v.isActive && <span className="text-green-600 font-semibold ml-2">ACTIVE</span>}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500">Select or enter a template slug to begin editing.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
