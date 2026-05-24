import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { Workflow, Plus, Trash2 } from 'lucide-react';

interface Step { sequence: number; label: string; trigger: string; percent: number; }
interface Preset {
  id: string; name: string; commodityCategory: string | null;
  schedule: Step[]; isDefault: boolean; status: string;
}

const TRIGGERS = ['lc_issued', 'shipment_documents_uploaded', 'customs_cleared', 'goods_received', 'manual_admin_release'] as const;

interface FormState {
  name: string; commodityCategory: string; isDefault: boolean;
  steps: Step[];
}

const empty: FormState = {
  name: '', commodityCategory: '', isDefault: false,
  steps: [
    { sequence: 1, label: 'Shipment Documents Uploaded', trigger: 'shipment_documents_uploaded', percent: 30 },
    { sequence: 2, label: 'Customs Cleared', trigger: 'customs_cleared', percent: 40 },
    { sequence: 3, label: 'Goods Received', trigger: 'goods_received', percent: 30 },
  ],
};

export default function AdminMilestonePresets() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [showForm, setShowForm] = useState(false);

  const q = useQuery({
    queryKey: ['/api/admin/trade-finance/milestone-presets'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/admin/trade-finance/milestone-presets');
      return (await r.json()) as { milestonePresets: Preset[] };
    },
  });

  const totalPct = form.steps.reduce((s, m) => s + (Number(m.percent) || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      if (Math.abs(totalPct - 100) > 0.01) throw new Error(`Percentages must sum to 100 (got ${totalPct})`);
      const body = {
        name: form.name,
        commodityCategory: form.commodityCategory || null,
        isDefault: form.isDefault,
        schedule: form.steps.map((s, i) => ({ ...s, sequence: i + 1, percent: Number(s.percent) })),
      };
      const path = editId
        ? `/api/admin/trade-finance/milestone-presets/${editId}`
        : '/api/admin/trade-finance/milestone-presets';
      const r = await apiRequest(editId ? 'PUT' : 'POST', path, body);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: editId ? 'Preset updated' : 'Preset created' });
      qc.invalidateQueries({ queryKey: ['/api/admin/trade-finance/milestone-presets'] });
      setShowForm(false); setEditId(null); setForm(empty);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiRequest('DELETE', `/api/admin/trade-finance/milestone-presets/${id}`);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Preset deactivated' });
      qc.invalidateQueries({ queryKey: ['/api/admin/trade-finance/milestone-presets'] });
    },
  });

  function openEdit(p: Preset) {
    setEditId(p.id);
    setForm({
      name: p.name,
      commodityCategory: p.commodityCategory || '',
      isDefault: p.isDefault,
      steps: (p.schedule || []).map((s) => ({ ...s, percent: Number(s.percent) })),
    });
    setShowForm(true);
  }

  function updateStep(idx: number, patch: Partial<Step>) {
    setForm((s) => ({ ...s, steps: s.steps.map((st, i) => i === idx ? { ...st, ...patch } : st) }));
  }
  function addStep() {
    setForm((s) => ({ ...s, steps: [...s.steps, { sequence: s.steps.length + 1, label: '', trigger: 'shipment_documents_uploaded', percent: 0 }] }));
  }
  function removeStep(idx: number) {
    setForm((s) => ({ ...s, steps: s.steps.filter((_, i) => i !== idx) }));
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Workflow size={20} /> Milestone Presets</h1>
          <Button onClick={() => { setEditId(null); setForm(empty); setShowForm(true); }} data-testid="button-new-preset">
            <Plus size={16} className="mr-1" /> New Preset
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Default milestone schedules used to materialise escrow splits when a case is funded. Per-commodity
          presets win over the wildcard default.
        </p>

        {showForm && (
          <Card className="p-4 space-y-3" data-testid="form-preset">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" />
              </div>
              <div>
                <Label className="text-xs">Commodity category</Label>
                <Input
                  value={form.commodityCategory}
                  onChange={(e) => setForm({ ...form, commodityCategory: e.target.value })}
                  placeholder="e.g. Agricultural, Energy, Metals, Cocoa, Crude Oil (blank = wildcard default)"
                  data-testid="input-category"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Matches the <code>commodities.category</code> column (case-insensitive). Leave blank for the
                  fallback used when no commodity-specific preset matches.
                </p>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    data-testid="checkbox-default" />
                  Use as default for category
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs">Steps (percentages must sum to 100; current: {totalPct.toFixed(2)})</Label>
              <div className="space-y-2 mt-2">
                {form.steps.map((s, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center" data-testid={`step-${i}`}>
                    <Input className="col-span-4" placeholder="Label" value={s.label}
                      onChange={(e) => updateStep(i, { label: e.target.value })} data-testid={`input-label-${i}`} />
                    <select className="col-span-4 h-9 rounded-md border bg-background px-2 text-sm"
                      value={s.trigger} onChange={(e) => updateStep(i, { trigger: e.target.value })} data-testid={`select-trigger-${i}`}>
                      {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <Input className="col-span-3" type="number" step="0.01" placeholder="%" value={s.percent}
                      onChange={(e) => updateStep(i, { percent: parseFloat(e.target.value) || 0 })} data-testid={`input-percent-${i}`} />
                    <Button size="sm" variant="ghost" className="col-span-1" onClick={() => removeStep(i)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addStep} data-testid="button-add-step">
                  <Plus size={14} className="mr-1" /> Add step
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending || Math.abs(totalPct - 100) > 0.01} data-testid="button-save">
                {save.isPending ? 'Saving…' : editId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {(q.data?.milestonePresets || []).map((p) => (
            <Card key={p.id} className="p-4" data-testid={`preset-${p.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    {p.name}
                    {p.isDefault && <Badge variant="outline" className="ml-2">default</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Category: {p.commodityCategory || '(wildcard)'} · {(p.schedule || []).length} steps
                  </div>
                  <div className="text-xs mt-1">
                    {(p.schedule || []).map((s) => `${s.percent}% ${s.label}`).join(' → ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)} data-testid={`button-edit-${p.id}`}>Edit</Button>
                  {p.status === 'active' && (
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)} data-testid={`button-delete-${p.id}`}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {q.data && q.data.milestonePresets.length === 0 && (
            <p className="text-sm text-muted-foreground">No milestone presets yet.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
