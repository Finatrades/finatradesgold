import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import CounterpartyChip from '@/components/CounterpartyChip';

interface Milestone {
  id: string;
  sequence: number;
  label: string;
  trigger: string;
  percent: string;
  amountCents: number;
  currency: string;
  // `released_reserved` = goods_received approved but funds remain locked
  // for the 30-day dispute window before final payout to the exporter.
  status: 'pending' | 'released' | 'released_reserved' | 'disputed';
  releasedAt?: string | null;
}

interface LcRecord {
  id: string;
  lcRef: string;
  status: string;
  currency: string;
  amountCents: number;
  applicantCounterparty?: { ftId?: string | null } | null;
  beneficiaryCounterparty?: { ftId?: string | null } | null;
}

interface Props {
  caseId: string;
  counterpartyFtId?: string | null;
  /** The other party's userId — required for issuing an LC. */
  counterpartyUserId?: string | null;
}

// Task #172: milestone presets are now master data loaded from
// /api/milestone-presets. No hardcoded schedules in this component.
interface MilestonePresetRecord {
  id: string;
  name: string;
  commodityCategory: string | null;
  schedule: Array<{ sequence: number; label: string; trigger: string; percent: number }>;
  isDefault: boolean;
}

interface BankPartnerOption {
  id: string;
  name: string;
  swiftBic: string;
  supportedCurrencies: string[];
}

interface LcTemplateOption {
  id: string;
  code: string;
  name: string;
  lcType: string;
  defaultIncoterms: string | null;
  requiredDocuments: string[];
}

interface EscrowConfigRecord {
  id: string;
  currency: string;
  maxHoldPerCaseCents: number | null;
}

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export function TradeFinanceTab({ caseId, counterpartyFtId, counterpartyUserId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isImporter = (user as any)?.userType === 'importer';

  const milestonesQ = useQuery({
    queryKey: ['/api/trade/cases', caseId, 'milestones'],
    queryFn: async () => {
      const r = await apiRequest('GET', `/api/trade/cases/${caseId}/milestones`);
      return (await r.json()) as { milestones: Milestone[]; caseId?: string; commodity?: string | null };
    },
  });
  const caseCommodity = milestonesQ.data?.commodity ?? null;

  const lcQ = useQuery({
    queryKey: ['/api/trade/cases', caseId, 'lc'],
    queryFn: async () => {
      const r = await apiRequest('GET', `/api/trade/cases/${caseId}/lc`);
      return (await r.json()) as { lcs: LcRecord[]; events: any[]; presentations: any[] };
    },
  });

  const balancesQ = useQuery({
    queryKey: ['/api/wallet/balances'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/wallet/balances');
      return (await r.json()) as { balances: Array<{ currency: string; availableCents: number; lockedCents: number }> };
    },
  });

  // ─────────── Milestone schedule preset selector (importer only) ───────────
  // Task #172: presets are master data — admins manage them under
  // /admin/trade-finance/milestone-presets and they are exposed here via
  // /api/milestone-presets. No hardcoded schedules in this component.
  const presetsQ = useQuery({
    queryKey: ['/api/milestone-presets', caseCommodity],
    enabled: milestonesQ.isSuccess,
    queryFn: async () => {
      const qs = caseCommodity ? `?commodity=${encodeURIComponent(caseCommodity)}` : '';
      const r = await apiRequest('GET', `/api/milestone-presets${qs}`);
      return (await r.json()) as { milestonePresets: MilestonePresetRecord[]; suggested: MilestonePresetRecord | null };
    },
  });
  const [presetId, setPresetId] = useState<string>('');
  const selectedPreset: MilestonePresetRecord | null = useMemo(() => {
    const list = presetsQ.data?.milestonePresets ?? [];
    if (presetId) return list.find((p) => p.id === presetId) || null;
    return presetsQ.data?.suggested ?? list.find((p) => p.isDefault) ?? list[0] ?? null;
  }, [presetsQ.data, presetId]);
  const setMilestones = useMutation({
    mutationFn: async () => {
      if (!selectedPreset) throw new Error('Pick a milestone preset first.');
      const r = await apiRequest('PUT', `/api/trade/cases/${caseId}/milestones`, {
        schedule: selectedPreset.schedule,
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Milestone schedule set', description: `Applied "${selectedPreset?.name}".` });
      qc.invalidateQueries({ queryKey: ['/api/trade/cases', caseId, 'milestones'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Could not set milestones', description: e?.message }),
  });

  const [escrowAmount, setEscrowAmount] = useState('');
  const fundEscrow = useMutation({
    mutationFn: async () => {
      // ROUND-5 FIX: when the case has no settlement amount on file (common
      // for deal-room-derived cases), the importer enters one here. Sent as
      // optional `amountCents`; backend falls back to case.settlementAmountCents.
      const dollars = parseFloat(escrowAmount || '0');
      const body: Record<string, unknown> = {};
      if (Number.isFinite(dollars) && dollars > 0) {
        body.amountCents = Math.round(dollars * 100);
      }
      const r = await apiRequest('POST', `/api/trade/cases/${caseId}/escrow/fund`, body);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Escrow funded', description: 'Funds are locked pending milestone releases.' });
      qc.invalidateQueries({ queryKey: ['/api/trade/cases', caseId, 'milestones'] });
      qc.invalidateQueries({ queryKey: ['/api/wallet/balances'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Could not fund escrow', description: e?.message }),
  });

  // ROUND-5 FIX: explicit buyer-confirm fires the canonical `goods_received`
  // trigger across all matching milestones. Distinct from per-milestone
  // Release — this is the spec-required delivery acknowledgement.
  const confirmGoodsReceived = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', `/api/trade/cases/${caseId}/goods-received`, {
        reason: 'Importer confirmed goods received',
      });
      return r.json();
    },
    onSuccess: (data: any) => {
      const n = Array.isArray(data?.released) ? data.released.length : 0;
      toast({
        title: 'Delivery confirmed',
        description: n > 0
          ? `${n} milestone${n === 1 ? '' : 's'} released to dispute-window reserve.`
          : 'No matching pending milestones; delivery recorded.',
      });
      qc.invalidateQueries({ queryKey: ['/api/trade/cases', caseId, 'milestones'] });
      qc.invalidateQueries({ queryKey: ['/api/wallet/balances'] });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Confirm failed', description: e?.message }),
  });

  const releaseMilestone = useMutation({
    mutationFn: async ({ milestoneId, reason }: { milestoneId: string; reason: string }) => {
      const r = await apiRequest(
        'POST',
        `/api/trade/cases/${caseId}/milestones/${milestoneId}/release`,
        { reason },
      );
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Milestone released', description: 'Funds disbursed to counterparty.' });
      qc.invalidateQueries({ queryKey: ['/api/trade/cases', caseId, 'milestones'] });
      qc.invalidateQueries({ queryKey: ['/api/wallet/balances'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Release failed', description: e?.message }),
  });

  const [lcAmount, setLcAmount] = useState('');
  const [lcCurrency, setLcCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  // Task #172: bank partner + LC template come from master data.
  const [lcBankPartnerId, setLcBankPartnerId] = useState('');
  const [lcTemplateId, setLcTemplateId] = useState('');
  const banksQ = useQuery({
    queryKey: ['/api/bank-partners', lcCurrency],
    queryFn: async () => {
      const r = await apiRequest('GET', `/api/bank-partners?supports=${lcCurrency}`);
      return (await r.json()) as { bankPartners: BankPartnerOption[] };
    },
  });
  const templatesQ = useQuery({
    queryKey: ['/api/lc-templates'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/lc-templates');
      return (await r.json()) as { lcTemplates: LcTemplateOption[] };
    },
  });
  const escrowConfigsQ = useQuery({
    queryKey: ['/api/escrow-configurations'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/escrow-configurations');
      return (await r.json()) as { escrowConfigurations: EscrowConfigRecord[] };
    },
  });
  const selectedTemplate = useMemo(
    () => (templatesQ.data?.lcTemplates ?? []).find((t) => t.id === lcTemplateId) || null,
    [templatesQ.data, lcTemplateId],
  );
  const lcEscrowCap = useMemo(() => {
    const cfg = (escrowConfigsQ.data?.escrowConfigurations ?? []).find((c) => c.currency === lcCurrency);
    return cfg?.maxHoldPerCaseCents ?? null;
  }, [escrowConfigsQ.data, lcCurrency]);
  const lcAmountCents = Math.round(parseFloat(lcAmount || '0') * 100);
  const lcOverCap = lcEscrowCap !== null && lcAmountCents > lcEscrowCap;

  const createLc = useMutation({
    mutationFn: async () => {
      if (!counterpartyUserId) throw new Error('Counterparty not resolved on this case');
      if (!lcBankPartnerId) throw new Error('Pick an issuing bank.');
      if (lcOverCap) throw new Error(`Amount exceeds platform cap of ${formatMoney(lcEscrowCap!, lcCurrency)}.`);
      const r = await apiRequest('POST', `/api/trade/cases/${caseId}/lc`, {
        beneficiaryUserId: counterpartyUserId,
        currency: lcCurrency,
        amountCents: lcAmountCents,
        bankPartnerId: lcBankPartnerId,
        lcTemplateId: lcTemplateId || undefined,
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'LC issued', description: 'Letter of credit issued. 100% of the LC amount is held in escrow.' });
      qc.invalidateQueries({ queryKey: ['/api/trade/cases', caseId, 'lc'] });
      qc.invalidateQueries({ queryKey: ['/api/wallet/balances'] });
      qc.invalidateQueries({ queryKey: ['/api/trade/cases', caseId, 'milestones'] });
      setLcAmount('');
      setLcBankPartnerId('');
      setLcTemplateId('');
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'LC issuance failed', description: e?.message }),
  });

  // ─────────── Dispute initiation (parties only, 0–30 days post Goods Received) ───────────
  const goodsReceivedReleasedAt = useMemo(() => {
    // Backend marks goods_received milestones as `released_reserved` (funds
    // held in reserve through the dispute window) rather than `released`.
    // Either state opens the dispute window.
    const m = (milestonesQ.data?.milestones ?? []).find(
      (x) =>
        x.trigger === 'goods_received' &&
        (x.status === 'released' || x.status === 'released_reserved') &&
        x.releasedAt,
    );
    return m?.releasedAt ? new Date(m.releasedAt) : null;
  }, [milestonesQ.data]);
  const disputeWindowOpen = useMemo(() => {
    if (!goodsReceivedReleasedAt) return false;
    const elapsed = (Date.now() - goodsReceivedReleasedAt.getTime()) / 86_400_000;
    return elapsed >= 0 && elapsed <= 30;
  }, [goodsReceivedReleasedAt]);

  // ─────────── Exporter LC presentation (beneficiary submits shipping docs) ───────────
  const [presentingLc, setPresentingLc] = useState<LcRecord | null>(null);
  const [presentDocIds, setPresentDocIds] = useState('');
  const [presentNotes, setPresentNotes] = useState('');
  const presentDocs = useMutation({
    mutationFn: async () => {
      if (!presentingLc) throw new Error('No LC selected');
      const ids = presentDocIds.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length === 0) throw new Error('Provide at least one deal-room document ID');
      const r = await apiRequest('POST', `/api/lc/${presentingLc.id}/present`, {
        documentIds: ids,
        notes: presentNotes || undefined,
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Documents presented', description: 'Issuing bank will review the presentation.' });
      qc.invalidateQueries({ queryKey: ['/api/trade/cases', caseId, 'lc'] });
      setPresentingLc(null);
      setPresentDocIds('');
      setPresentNotes('');
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Presentation failed', description: e?.message }),
  });

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeForm, setDisputeForm] = useState({ disputeType: 'goods_not_received', subject: '', description: '', requestedResolution: '' });
  const raiseDispute = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', `/api/trade/cases/${caseId}/dispute`, disputeForm);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Dispute opened', description: 'Tribunal has been notified. Counter-evidence window: 7 days.' });
      setDisputeOpen(false);
      setDisputeForm({ disputeType: 'goods_not_received', subject: '', description: '', requestedResolution: '' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Could not open dispute', description: e?.message }),
  });

  return (
    <div className="p-4 space-y-6" data-testid="tab-content-trade-finance">
      <section>
        <h3 className="text-sm font-semibold mb-2">Multi-currency wallet</h3>
        <div className="grid grid-cols-3 gap-3">
          {(balancesQ.data?.balances ?? []).map((b) => (
            <Card key={b.currency} className="p-3">
              <div className="text-xs text-muted-foreground">{b.currency}</div>
              <div className="text-lg font-semibold" data-testid={`balance-${b.currency}`}>
                {formatMoney(b.availableCents, b.currency)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Locked: {formatMoney(b.lockedCents, b.currency)}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Milestone schedule</h3>
          <div className="flex items-center gap-2">
            {isImporter && (
              <>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                  value={presetId || (selectedPreset?.id ?? '')}
                  onChange={(e) => setPresetId(e.target.value)}
                  data-testid="select-milestone-preset"
                >
                  {(presetsQ.data?.milestonePresets ?? []).length === 0 && (
                    <option value="">No presets configured</option>
                  )}
                  {(presetsQ.data?.milestonePresets ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.commodityCategory ? ` · ${p.commodityCategory}` : ''}
                      {p === presetsQ.data?.suggested ? ' (suggested)' : ''}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMilestones.mutate()}
                  disabled={setMilestones.isPending || !selectedPreset}
                  data-testid="button-apply-preset"
                  title={selectedPreset ? selectedPreset.schedule.map((s) => `${s.percent}% ${s.label}`).join(' → ') : ''}
                >
                  Apply preset
                </Button>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="border rounded px-2 py-1 text-sm w-32"
                  placeholder="Amount (USD)"
                  value={escrowAmount}
                  onChange={(e) => setEscrowAmount(e.target.value)}
                  data-testid="input-escrow-amount"
                />
                <Button
                  size="sm"
                  onClick={() => fundEscrow.mutate()}
                  disabled={fundEscrow.isPending}
                  data-testid="button-fund-escrow"
                >
                  {fundEscrow.isPending ? 'Funding…' : 'Fund escrow'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => confirmGoodsReceived.mutate()}
                  disabled={confirmGoodsReceived.isPending}
                  data-testid="button-confirm-goods-received"
                  title="Fires the goods_received milestone trigger. Releases matching milestones into the dispute-window reserve."
                >
                  {confirmGoodsReceived.isPending ? 'Confirming…' : 'Confirm goods received'}
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {(milestonesQ.data?.milestones ?? []).map((m) => (
            <Card key={m.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  #{m.sequence} · {m.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {m.percent}% · {formatMoney(m.amountCents, m.currency)} · trigger: {m.trigger}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={m.status === 'released' || m.status === 'released_reserved' ? 'default' : 'secondary'}>
                  {m.status === 'released_reserved' ? 'released · reserved' : m.status}
                </Badge>
                {isImporter && m.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => releaseMilestone.mutate({ milestoneId: m.id, reason: 'Importer approved release' })}
                    disabled={releaseMilestone.isPending}
                    data-testid={`button-release-${m.sequence}`}
                  >
                    Release
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {milestonesQ.data?.milestones?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No milestones yet — pick a preset above and apply, then fund escrow.
            </p>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Letters of Credit</h3>
        {counterpartyFtId && (
          <div className="mb-2 text-xs">
            Beneficiary: <CounterpartyChip counterparty={null} fallbackFtId={counterpartyFtId} size="sm" />
          </div>
        )}
        <div className="space-y-2 mb-3">
          {(lcQ.data?.lcs ?? []).map((lc) => (
            <Card key={lc.id} className="p-3" data-testid={`lc-${lc.lcRef}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-mono">{lc.lcRef}</div>
                  <div className="text-xs text-muted-foreground">{formatMoney(lc.amountCents, lc.currency)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{lc.status}</Badge>
                  {/* Exporter (beneficiary) presents shipping documents
                      against an Issued / Documents Presented LC for the
                      issuing-bank's compliance review. */}
                  {!isImporter && (lc.status === 'Issued' || lc.status === 'Documents Presented' || lc.status === 'Discrepant') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPresentingLc(lc)}
                      data-testid={`button-present-docs-${lc.lcRef}`}
                    >
                      Present documents
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
        {isImporter && (
          <Card className="p-3 space-y-2">
            <div className="text-xs font-medium">Issue a new LC (holds 100% in escrow)</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <Label className="text-[11px]">Amount</Label>
                <Input
                  value={lcAmount}
                  onChange={(e) => setLcAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-lc-amount"
                />
              </div>
              <div>
                <Label className="text-[11px]">Currency</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={lcCurrency}
                  onChange={(e) => {
                    setLcCurrency(e.target.value as 'USD' | 'EUR' | 'GBP');
                    setLcBankPartnerId('');
                  }}
                  data-testid="select-lc-currency"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px]">Issuing bank</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={lcBankPartnerId}
                  onChange={(e) => setLcBankPartnerId(e.target.value)}
                  data-testid="select-lc-bank"
                >
                  <option value="">— pick a partner —</option>
                  {(banksQ.data?.bankPartners ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.swiftBic})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px]">LC product template</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={lcTemplateId}
                  onChange={(e) => setLcTemplateId(e.target.value)}
                  data-testid="select-lc-template"
                >
                  <option value="">— none —</option>
                  {(templatesQ.data?.lcTemplates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.code} · {t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {selectedTemplate && (
              <div className="text-[11px] text-muted-foreground" data-testid="lc-template-summary">
                Incoterms: {selectedTemplate.defaultIncoterms || '—'} · Required docs: {(selectedTemplate.requiredDocuments || []).join(', ') || '—'}
              </div>
            )}
            {lcEscrowCap !== null && (
              <div className={`text-[11px] ${lcOverCap ? 'text-destructive' : 'text-muted-foreground'}`} data-testid="lc-cap-hint">
                Platform escrow cap for {lcCurrency}: {formatMoney(lcEscrowCap, lcCurrency)}.
                {lcOverCap && ' Amount exceeds cap.'}
              </div>
            )}
            <Button
              size="sm"
              onClick={() => createLc.mutate()}
              disabled={createLc.isPending || !lcAmount || !lcBankPartnerId || lcOverCap}
              data-testid="button-create-lc"
            >
              {createLc.isPending ? 'Issuing…' : 'Issue LC'}
            </Button>
          </Card>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Dispute tribunal</h3>
          <Button
            size="sm"
            variant={disputeWindowOpen ? 'destructive' : 'outline'}
            disabled={!disputeWindowOpen}
            onClick={() => setDisputeOpen(true)}
            data-testid="button-raise-dispute"
          >
            Raise dispute
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {goodsReceivedReleasedAt
            ? disputeWindowOpen
              ? `Dispute window open until ${new Date(goodsReceivedReleasedAt.getTime() + 30 * 86_400_000).toLocaleDateString()}.`
              : 'Dispute window (30 days after Goods Received) has closed.'
            : 'Disputes become available 0–30 days after the Goods Received milestone is released.'}
        </p>
      </section>

      <Dialog open={!!presentingLc} onOpenChange={(o) => !o && setPresentingLc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Present documents · {presentingLc?.lcRef}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter the IDs of the deal-room documents you wish to present for the issuing
              bank's compliance review. The documents must already be uploaded to this deal
              room. Separate multiple IDs with commas.
            </p>
            <div>
              <Label className="text-xs">Deal-room document IDs</Label>
              <Textarea
                rows={3}
                value={presentDocIds}
                onChange={(e) => setPresentDocIds(e.target.value)}
                placeholder="doc-id-1, doc-id-2, …"
                data-testid="textarea-present-doc-ids"
              />
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={presentNotes}
                onChange={(e) => setPresentNotes(e.target.value)}
                data-testid="input-present-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPresentingLc(null)}>Cancel</Button>
            <Button
              onClick={() => presentDocs.mutate()}
              disabled={presentDocs.isPending || !presentDocIds.trim()}
              data-testid="button-submit-presentation"
            >
              {presentDocs.isPending ? 'Submitting…' : 'Present documents'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise tribunal dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Claim type</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={disputeForm.disputeType}
                onChange={(e) => setDisputeForm((f) => ({ ...f, disputeType: e.target.value }))}
                data-testid="select-dispute-type"
              >
                <option value="goods_not_received">Goods not received</option>
                <option value="goods_damaged">Goods damaged</option>
                <option value="quality_mismatch">Quality mismatch</option>
                <option value="quantity_short">Quantity short</option>
                <option value="documents_discrepant">Documents discrepant</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input
                value={disputeForm.subject}
                onChange={(e) => setDisputeForm((f) => ({ ...f, subject: e.target.value }))}
                data-testid="input-dispute-subject"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={4}
                value={disputeForm.description}
                onChange={(e) => setDisputeForm((f) => ({ ...f, description: e.target.value }))}
                data-testid="textarea-dispute-description"
              />
            </div>
            <div>
              <Label className="text-xs">Requested resolution (optional)</Label>
              <Input
                value={disputeForm.requestedResolution}
                onChange={(e) => setDisputeForm((f) => ({ ...f, requestedResolution: e.target.value }))}
                data-testid="input-dispute-resolution"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button
              onClick={() => raiseDispute.mutate()}
              disabled={raiseDispute.isPending || !disputeForm.subject || !disputeForm.description}
              data-testid="button-submit-dispute"
            >
              {raiseDispute.isPending ? 'Submitting…' : 'Open dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
