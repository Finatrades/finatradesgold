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
import { Landmark, Plus, Trash2 } from 'lucide-react';

interface BankPartner {
  id: string;
  name: string;
  swiftBic: string;
  country: string;
  role: string;
  supportedCurrencies: string[];
  rating: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
const ROLES = ['issuing', 'advising', 'confirming', 'reimbursing'] as const;

interface FormState {
  name: string; swiftBic: string; country: string; role: string;
  supportedCurrencies: string[]; rating: string; contactEmail: string;
  contactPhone: string; notes: string;
}

const empty: FormState = {
  name: '', swiftBic: '', country: '', role: 'issuing',
  supportedCurrencies: ['USD'], rating: '', contactEmail: '', contactPhone: '', notes: '',
};

export default function AdminBankPartners() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [showForm, setShowForm] = useState(false);

  const q = useQuery({
    queryKey: ['/api/admin/trade-finance/bank-partners'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/admin/trade-finance/bank-partners');
      return (await r.json()) as { bankPartners: BankPartner[] };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const path = editId
        ? `/api/admin/trade-finance/bank-partners/${editId}`
        : '/api/admin/trade-finance/bank-partners';
      const r = await apiRequest(editId ? 'PUT' : 'POST', path, form);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: editId ? 'Bank partner updated' : 'Bank partner created' });
      qc.invalidateQueries({ queryKey: ['/api/admin/trade-finance/bank-partners'] });
      setShowForm(false); setEditId(null); setForm(empty);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiRequest('DELETE', `/api/admin/trade-finance/bank-partners/${id}`);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Bank partner deactivated' });
      qc.invalidateQueries({ queryKey: ['/api/admin/trade-finance/bank-partners'] });
    },
  });

  function openEdit(p: BankPartner) {
    setEditId(p.id);
    setForm({
      name: p.name, swiftBic: p.swiftBic, country: p.country, role: p.role,
      supportedCurrencies: p.supportedCurrencies || [],
      rating: p.rating || '', contactEmail: p.contactEmail || '',
      contactPhone: p.contactPhone || '', notes: p.notes || '',
    });
    setShowForm(true);
  }

  function toggleCurrency(c: string) {
    setForm((s) => ({
      ...s,
      supportedCurrencies: s.supportedCurrencies.includes(c)
        ? s.supportedCurrencies.filter((x) => x !== c)
        : [...s.supportedCurrencies, c],
    }));
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Landmark size={20} /> Bank Partners</h1>
          <Button onClick={() => { setEditId(null); setForm(empty); setShowForm(true); }} data-testid="button-new-bank">
            <Plus size={16} className="mr-1" /> New Bank Partner
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Master list of LC issuing, advising and confirming banks. Used by the importer LC application form.
        </p>

        {showForm && (
          <Card className="p-4 space-y-3" data-testid="form-bank-partner">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" />
              </div>
              <div>
                <Label className="text-xs">SWIFT/BIC *</Label>
                <Input value={form.swiftBic} onChange={(e) => setForm({ ...form, swiftBic: e.target.value.toUpperCase() })} data-testid="input-swift" />
              </div>
              <div>
                <Label className="text-xs">Country *</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} data-testid="input-country" />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="select-role">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Rating</Label>
                <Input value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  placeholder="AA-" data-testid="input-rating" />
              </div>
              <div>
                <Label className="text-xs">Contact email</Label>
                <Input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} data-testid="input-email" />
              </div>
              <div>
                <Label className="text-xs">Contact phone</Label>
                <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} data-testid="input-phone" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Supported currencies *</Label>
              <div className="flex gap-2 mt-1">
                {CURRENCIES.map((c) => (
                  <button key={c} type="button"
                    onClick={() => toggleCurrency(c)}
                    className={`px-3 py-1 rounded border text-sm ${form.supportedCurrencies.includes(c) ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                    data-testid={`toggle-currency-${c}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="textarea-notes" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save">
                {save.isPending ? 'Saving…' : editId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }} data-testid="button-cancel">
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {(q.data?.bankPartners || []).map((p) => (
            <Card key={p.id} className="p-4" data-testid={`bank-${p.swiftBic}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{p.name} <span className="font-mono text-xs text-muted-foreground">{p.swiftBic}</span></div>
                  <div className="text-xs text-muted-foreground">
                    {p.country} · {p.role}{p.rating ? ` · ${p.rating}` : ''} · {(p.supportedCurrencies || []).join('/')}
                  </div>
                  {p.contactEmail && <div className="text-xs mt-1">{p.contactEmail}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)} data-testid={`button-edit-${p.swiftBic}`}>Edit</Button>
                  {p.status === 'active' && (
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)} data-testid={`button-delete-${p.swiftBic}`}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {q.data && q.data.bankPartners.length === 0 && (
            <p className="text-sm text-muted-foreground">No bank partners yet.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
