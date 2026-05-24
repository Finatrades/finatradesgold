import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Plus, Trash2 } from 'lucide-react';

interface LcTemplate {
  id: string;
  code: string;
  name: string;
  lcType: string;
  description: string | null;
  defaultIncoterms: string | null;
  defaultTenorDays: number | null;
  defaultTolerancePct: string | null;
  requiredDocuments: string[];
  defaultTerms: Record<string, any>;
  status: string;
}

const LC_TYPES = ['sight', 'usance', 'standby', 'revolving', 'transferable', 'back_to_back'] as const;

interface FormState {
  code: string; name: string; lcType: string; description: string;
  defaultIncoterms: string; defaultTenorDays: string; defaultTolerancePct: string;
  requiredDocumentsCsv: string; defaultTermsJson: string;
}

const empty: FormState = {
  code: '', name: '', lcType: 'sight', description: '',
  defaultIncoterms: '', defaultTenorDays: '', defaultTolerancePct: '5',
  requiredDocumentsCsv: 'Commercial Invoice, Bill of Lading, Packing List',
  defaultTermsJson: '{}',
};

export default function AdminLcTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [showForm, setShowForm] = useState(false);

  const q = useQuery({
    queryKey: ['/api/admin/trade-finance/lc-templates'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/admin/trade-finance/lc-templates');
      return (await r.json()) as { lcTemplates: LcTemplate[] };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      let defaultTerms: any = {};
      try { defaultTerms = JSON.parse(form.defaultTermsJson || '{}'); }
      catch { throw new Error('Default terms must be valid JSON'); }
      const body: any = {
        code: form.code, name: form.name, lcType: form.lcType,
        description: form.description || undefined,
        defaultIncoterms: form.defaultIncoterms || undefined,
        defaultTenorDays: form.defaultTenorDays ? parseInt(form.defaultTenorDays, 10) : undefined,
        defaultTolerancePct: form.defaultTolerancePct ? parseFloat(form.defaultTolerancePct) : undefined,
        requiredDocuments: form.requiredDocumentsCsv.split(',').map((s) => s.trim()).filter(Boolean),
        defaultTerms,
      };
      const path = editId
        ? `/api/admin/trade-finance/lc-templates/${editId}`
        : '/api/admin/trade-finance/lc-templates';
      const r = await apiRequest(editId ? 'PUT' : 'POST', path, body);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: editId ? 'Template updated' : 'Template created' });
      qc.invalidateQueries({ queryKey: ['/api/admin/trade-finance/lc-templates'] });
      setShowForm(false); setEditId(null); setForm(empty);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiRequest('DELETE', `/api/admin/trade-finance/lc-templates/${id}`);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Template deactivated' });
      qc.invalidateQueries({ queryKey: ['/api/admin/trade-finance/lc-templates'] });
    },
  });

  function openEdit(t: LcTemplate) {
    setEditId(t.id);
    setForm({
      code: t.code, name: t.name, lcType: t.lcType, description: t.description || '',
      defaultIncoterms: t.defaultIncoterms || '',
      defaultTenorDays: t.defaultTenorDays != null ? String(t.defaultTenorDays) : '',
      defaultTolerancePct: t.defaultTolerancePct || '',
      requiredDocumentsCsv: (t.requiredDocuments || []).join(', '),
      defaultTermsJson: JSON.stringify(t.defaultTerms || {}, null, 2),
    });
    setShowForm(true);
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><FileText size={20} /> LC Templates</h1>
          <Button onClick={() => { setEditId(null); setForm(empty); setShowForm(true); }} data-testid="button-new-template">
            <Plus size={16} className="mr-1" /> New Template
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Standard Letter of Credit product templates. Importers pick a template when applying for an LC; required-documents
          and default terms pre-fill from here.
        </p>

        {showForm && (
          <Card className="p-4 space-y-3" data-testid="form-lc-template">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Code *</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} data-testid="input-code" />
              </div>
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" />
              </div>
              <div>
                <Label className="text-xs">LC Type</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={form.lcType} onChange={(e) => setForm({ ...form, lcType: e.target.value })} data-testid="select-lctype">
                  {LC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Default Incoterms</Label>
                <Input value={form.defaultIncoterms} onChange={(e) => setForm({ ...form, defaultIncoterms: e.target.value.toUpperCase() })} placeholder="CIF / FOB / DDP" data-testid="input-incoterms" />
              </div>
              <div>
                <Label className="text-xs">Default tenor (days)</Label>
                <Input type="number" value={form.defaultTenorDays} onChange={(e) => setForm({ ...form, defaultTenorDays: e.target.value })} data-testid="input-tenor" />
              </div>
              <div>
                <Label className="text-xs">Default tolerance %</Label>
                <Input type="number" step="0.01" value={form.defaultTolerancePct} onChange={(e) => setForm({ ...form, defaultTolerancePct: e.target.value })} data-testid="input-tolerance" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="textarea-description" />
            </div>
            <div>
              <Label className="text-xs">Required documents (comma-separated)</Label>
              <Textarea value={form.requiredDocumentsCsv} onChange={(e) => setForm({ ...form, requiredDocumentsCsv: e.target.value })} data-testid="textarea-docs" />
            </div>
            <div>
              <Label className="text-xs">Default terms (JSON)</Label>
              <Textarea className="font-mono text-xs" rows={4} value={form.defaultTermsJson} onChange={(e) => setForm({ ...form, defaultTermsJson: e.target.value })} data-testid="textarea-terms" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save">
                {save.isPending ? 'Saving…' : editId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {(q.data?.lcTemplates || []).map((t) => (
            <Card key={t.id} className="p-4" data-testid={`template-${t.code}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    <span className="font-mono text-sm mr-2">{t.code}</span>
                    {t.name}
                    <Badge variant="outline" className="ml-2">{t.lcType}</Badge>
                  </div>
                  {t.description && <div className="text-xs text-muted-foreground mt-1">{t.description}</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    Tenor: {t.defaultTenorDays ?? '—'}d · Incoterms: {t.defaultIncoterms || '—'} · Docs: {(t.requiredDocuments || []).length}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.status === 'active' ? 'default' : 'secondary'}>{t.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)} data-testid={`button-edit-${t.code}`}>Edit</Button>
                  {t.status === 'active' && (
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(t.id)} data-testid={`button-delete-${t.code}`}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {q.data && q.data.lcTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">No LC templates yet.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
