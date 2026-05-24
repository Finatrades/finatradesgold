import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle,
  Upload, FileText, Package as PackageIcon, Truck, ShieldCheck, ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ListCommodityWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (consignment: any) => void;
}

type HubOption = { code: string; name: string; city?: string; country?: string };
const FALLBACK_HUBS: HubOption[] = [
  { code: 'LOS', name: 'Lagos, Nigeria' },
  { code: 'NBI', name: 'Nairobi, Kenya' },
  { code: 'ACC', name: 'Accra, Ghana' },
  { code: 'ABJ', name: 'Abidjan, Côte d\'Ivoire' },
  { code: 'DKR', name: 'Dakar, Senegal' },
  { code: 'ADD', name: 'Addis Ababa, Ethiopia' },
  { code: 'CAI', name: 'Cairo, Egypt' },
  { code: 'CMN', name: 'Casablanca, Morocco' },
  { code: 'JNB', name: 'Johannesburg, South Africa' },
];

function useLiveHubs(): HubOption[] {
  const [hubs, setHubs] = React.useState<HubOption[]>(FALLBACK_HUBS);
  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/hubs', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!cancelled && d?.hubs?.length) {
          setHubs(d.hubs.map((h: any) => ({
            code: h.code,
            name: `${h.city ?? ''}${h.city && h.country ? ', ' : ''}${h.country ?? h.name}`,
            city: h.city,
            country: h.country,
          })));
        }
      })
      .catch(() => { /* keep fallback */ });
    return () => { cancelled = true; };
  }, []);
  return hubs;
}

const COMMODITIES = [
  { name: 'Cocoa Beans', hsCode: '1801.00', unit: 'MT', category: 'Agricultural' },
  { name: 'Cashew Nuts (Raw)', hsCode: '0801.31', unit: 'MT', category: 'Agricultural' },
  { name: 'Sesame Seeds', hsCode: '1207.40', unit: 'MT', category: 'Agricultural' },
  { name: 'Palm Oil (Crude)', hsCode: '1511.10', unit: 'MT', category: 'Agricultural' },
  { name: 'Soybean', hsCode: '1201.90', unit: 'MT', category: 'Agricultural' },
  { name: 'Cotton (Raw)', hsCode: '5201.00', unit: 'MT', category: 'Soft Commodities' },
  { name: 'Coffee (Arabica)', hsCode: '0901.11', unit: 'MT', category: 'Agricultural' },
  { name: 'Gold Ore', hsCode: '2616.90', unit: 'KG', category: 'Metals' },
  { name: 'Copper Ore', hsCode: '2603.00', unit: 'MT', category: 'Metals' },
  { name: 'Groundnuts', hsCode: '1202.41', unit: 'MT', category: 'Agricultural' },
];

const INCOTERMS = ['FOB', 'CIF', 'DAP', 'EXW', 'FCA', 'CFR', 'DDP'];
const GRADES = ['A+', 'A', 'B+', 'B', 'C'] as const;

const STEPS = [
  { id: 'commodity', label: 'Commodity', icon: <PackageIcon size={14} /> },
  { id: 'logistics', label: 'Logistics & Pricing', icon: <Truck size={14} /> },
  { id: 'documents', label: 'Documents', icon: <FileText size={14} /> },
  { id: 'compliance', label: 'Compliance', icon: <ShieldCheck size={14} /> },
  { id: 'review', label: 'Review & Submit', icon: <ClipboardList size={14} /> },
];

interface DocSlot {
  docType: string;
  label: string;
  description: string;
  required: boolean;
}

// Note: the document-requirement matrix is fetched live from
// /api/b2b/consignments/requirements?category=... — the server is the
// single source of truth. The DocSlot type above describes one row.

interface WizardData {
  commodityName: string;
  commodityCategory: string;
  hsCode: string;
  unit: string;
  quantity: string;
  qualityGrade: typeof GRADES[number] | '';
  batchNumber: string;
  harvestDate: string;
  originCountry: string;
  packingType: string;
  targetHubCode: string;
  incoterms: string;
  askingPriceCents: string;
  estimatedValueCents: string;
  askingCurrency: string;
  notes: string;
}

const EMPTY: WizardData = {
  commodityName: '', commodityCategory: '', hsCode: '', unit: 'MT', quantity: '',
  qualityGrade: 'A', batchNumber: '', harvestDate: '', originCountry: '',
  packingType: '', targetHubCode: '', incoterms: 'FOB',
  askingPriceCents: '', estimatedValueCents: '', askingCurrency: 'USD', notes: '',
};

async function getCsrf(): Promise<string | null> {
  const m = document.cookie.match(/csrf_token=([^;]+)/);
  if (m) return m[1];
  try {
    const r = await fetch('/api/csrf-token', { credentials: 'include' });
    if (r.ok) return (await r.json()).csrfToken ?? null;
  } catch {}
  return null;
}

export default function ListCommodityWizard({ open, onClose, onCreated }: ListCommodityWizardProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [decls, setDecls] = useState<Record<string, boolean>>({
    truthAccuracy: false,
    legalOrigin: false,
    sanctionsCompliance: false,
    qualityGuarantee: false,
    termsAccepted: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Server is the source of truth for the document-requirements matrix
  const { data: reqResp } = useQuery<{ category: string | null; documents: DocSlot[] }>({
    queryKey: ['/api/b2b/consignments/requirements', data.commodityCategory],
    queryFn: async () => {
      const url = data.commodityCategory
        ? `/api/b2b/consignments/requirements?category=${encodeURIComponent(data.commodityCategory)}`
        : `/api/b2b/consignments/requirements`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error(`requirements failed (${r.status})`);
      return r.json();
    },
    enabled: !!data.commodityCategory,
    staleTime: 60_000,
  });
  const reqDocs: DocSlot[] = useMemo(() => reqResp?.documents ?? [], [reqResp]);

  const userType = (user as any)?.userType;
  const isExporter = userType === 'exporter' || (user as any)?.role === 'admin';
  const { data: eligibility } = useQuery<{ eligible: boolean; reason?: string; kycStatus?: string; kycTier?: string }>({
    queryKey: ['/api/b2b/consignments/eligibility'],
    enabled: open && isExporter,
  });
  const kycOk = !!eligibility?.eligible;
  const kycReason = eligibility?.reason;
  const kycTier = eligibility?.kycTier;

  const create = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v));
      });
      fd.append('complianceDeclarations', JSON.stringify(decls));
      Object.entries(files).forEach(([docType, file]) => {
        fd.append(`doc__${docType}`, file, file.name);
      });
      const token = await getCsrf();
      const r = await fetch('/api/b2b/consignments', {
        method: 'POST', credentials: 'include',
        headers: token ? { 'x-csrf-token': token } : undefined,
        body: fd,
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.message || `Submit failed (${r.status})`);
      return json;
    },
    onSuccess: (json) => {
      qc.invalidateQueries({ queryKey: ['/api/b2b/consignments'] });
      onCreated?.(json);
      setData(EMPTY); setFiles({}); setStep(0);
      setDecls({ truthAccuracy: false, legalOrigin: false, sanctionsCompliance: false, qualityGuarantee: false, termsAccepted: false });
      onClose();
    },
    onError: (e: any) => setError(e?.message ?? 'Failed to submit'),
  });

  if (!open) return null;

  const stepValid = (() => {
    switch (STEPS[step].id) {
      case 'commodity':
        return !!data.commodityName && !!data.commodityCategory && !!data.hsCode &&
               Number(data.quantity) > 0 && !!data.unit && !!data.qualityGrade;
      case 'logistics':
        return !!data.originCountry && !!data.targetHubCode && !!data.incoterms && !!data.packingType;
      case 'documents':
        return reqDocs.filter(d => d.required).every(d => !!files[d.docType]);
      case 'compliance':
        return decls.truthAccuracy && decls.legalOrigin && decls.sanctionsCompliance && decls.qualityGuarantee && decls.termsAccepted;
      case 'review':
        return true;
      default:
        return false;
    }
  })();

  const goNext = () => { setError(null); if (step < STEPS.length - 1) setStep(step + 1); };
  const goBack = () => { setError(null); if (step > 0) setStep(step - 1); };

  const set = <K extends keyof WizardData>(k: K, v: WizardData[K]) => setData(d => ({ ...d, [k]: v }));

  const onPickCommodity = (name: string) => {
    const c = COMMODITIES.find(x => x.name === name);
    setData(d => ({
      ...d,
      commodityName: name,
      hsCode: c?.hsCode ?? d.hsCode,
      unit: c?.unit ?? d.unit,
      commodityCategory: c?.category ?? d.commodityCategory,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
         data-testid="list-commodity-wizard" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col"
           onClick={(e) => e.stopPropagation()}
           style={{ border: '1px solid #E8E2DC' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#E8E2DC' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>List a Commodity</h2>
            <p className="text-sm" style={{ color: '#888880' }}>Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50" aria-label="Close" data-testid="wizard-close">
            <X size={20} style={{ color: '#888880' }} />
          </button>
        </div>

        {/* KYC / Role gate */}
        {!isExporter ? (
          <div className="p-8 text-center">
            <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#D97706' }} />
            <p className="font-semibold" style={{ color: '#1A1A1A' }}>Exporter accounts only</p>
            <p className="text-sm mt-1" style={{ color: '#888880' }}>
              Switch to an exporter account to list commodities.
            </p>
          </div>
        ) : !kycOk ? (
          <div className="p-8 text-center">
            <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#D97706' }} />
            <p className="font-semibold" style={{ color: '#1A1A1A' }}>Corporate KYC required</p>
            <p className="text-sm mt-1" style={{ color: '#888880' }}>
              {kycReason || 'Complete Finatrades Corporate KYC to submit consignments.'}
            </p>
            <a href="/kyc" className="inline-block mt-4 px-4 py-2 rounded-lg font-semibold text-white"
               style={{ background: '#C73B22' }} data-testid="wizard-goto-kyc">Go to KYC</a>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div className="px-5 pt-4 flex items-center gap-2 overflow-x-auto">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                       style={{
                         background: i === step ? '#C73B22' : i < step ? 'rgba(5,150,105,0.1)' : '#F5F2EE',
                         color: i === step ? 'white' : i < step ? '#047857' : '#888880',
                       }}>
                    {i < step ? <CheckCircle2 size={12} /> : s.icon}
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && <div className="h-px flex-1 min-w-4" style={{ background: '#E8E2DC' }} />}
                </React.Fragment>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {STEPS[step].id === 'commodity' && (
                <CommodityStep data={data} set={set} onPick={onPickCommodity} />
              )}
              {STEPS[step].id === 'logistics' && (
                <LogisticsStep data={data} set={set} />
              )}
              {STEPS[step].id === 'documents' && (
                <DocumentsStep slots={reqDocs} files={files} onChange={setFiles} category={data.commodityCategory} />
              )}
              {STEPS[step].id === 'compliance' && (
                <ComplianceStep decls={decls} setDecls={setDecls} />
              )}
              {STEPS[step].id === 'review' && (
                <ReviewStep data={data} files={files} reqDocs={reqDocs} decls={decls} />
              )}

              {error && (
                <div className="mt-4 p-3 rounded-lg text-sm flex items-start gap-2"
                     style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: '#E8E2DC' }}>
              <button onClick={goBack} disabled={step === 0}
                      className="px-3 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-40"
                      style={{ color: '#1A1A1A', background: '#F5F2EE' }}
                      data-testid="wizard-back">
                <ChevronLeft size={16} /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={goNext} disabled={!stepValid}
                        className="px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1 text-white disabled:opacity-40"
                        style={{ background: '#C73B22' }}
                        data-testid="wizard-next">
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={() => create.mutate()} disabled={!stepValid || create.isPending}
                        className="px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1 text-white disabled:opacity-40"
                        style={{ background: '#C73B22' }}
                        data-testid="wizard-submit">
                  {create.isPending ? 'Submitting…' : 'Submit Consignment'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1" style={{ color: '#1A1A1A' }}>
        {label} {required && <span style={{ color: '#C73B22' }}>*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg text-sm";
const inputStyle: React.CSSProperties = { border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' };

function CommodityStep({ data, set, onPick }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Commodity" required>
        <select className={inputCls} style={inputStyle} value={data.commodityName}
                onChange={(e) => onPick(e.target.value)} data-testid="field-commodity">
          <option value="">Select commodity…</option>
          {COMMODITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="HS Code" required>
        <input className={inputCls} style={inputStyle} value={data.hsCode}
               onChange={(e) => set('hsCode', e.target.value)} placeholder="e.g. 1801.00" data-testid="field-hscode" />
      </Field>
      <Field label="Category" required>
        <select className={inputCls} style={inputStyle} value={data.commodityCategory}
                onChange={(e) => set('commodityCategory', e.target.value)} data-testid="field-category">
          <option value="">Select category…</option>
          {['Agricultural', 'Soft Commodities', 'Metals', 'Industrial', 'Energy'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Quality Grade" required>
        <select className={inputCls} style={inputStyle} value={data.qualityGrade}
                onChange={(e) => set('qualityGrade', e.target.value as any)} data-testid="field-grade">
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="Quantity" required>
        <input type="number" min={0} step="0.01" className={inputCls} style={inputStyle} value={data.quantity}
               onChange={(e) => set('quantity', e.target.value)} data-testid="field-quantity" />
      </Field>
      <Field label="Unit" required>
        <select className={inputCls} style={inputStyle} value={data.unit}
                onChange={(e) => set('unit', e.target.value)} data-testid="field-unit">
          {['MT', 'KG', 'L', 'Bags', 'Containers'].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>
      <Field label="Batch Number">
        <input className={inputCls} style={inputStyle} value={data.batchNumber}
               onChange={(e) => set('batchNumber', e.target.value)} placeholder="Optional" data-testid="field-batch" />
      </Field>
      <Field label="Harvest / Production Date">
        <input type="date" className={inputCls} style={inputStyle} value={data.harvestDate}
               onChange={(e) => set('harvestDate', e.target.value)} data-testid="field-harvest" />
      </Field>
    </div>
  );
}

function LogisticsStep({ data, set }: any) {
  const HUBS = useLiveHubs();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Origin Country" required>
        <input className={inputCls} style={inputStyle} value={data.originCountry}
               onChange={(e) => set('originCountry', e.target.value)} placeholder="e.g. Nigeria" data-testid="field-origin" />
      </Field>
      <Field label="Target Warehouse Hub" required>
        <select className={inputCls} style={inputStyle} value={data.targetHubCode}
                onChange={(e) => set('targetHubCode', e.target.value)} data-testid="field-hub">
          <option value="">Select hub…</option>
          {HUBS.map(h => <option key={h.code} value={h.code}>{h.code} — {h.name}</option>)}
        </select>
      </Field>
      <Field label="Incoterms" required>
        <select className={inputCls} style={inputStyle} value={data.incoterms}
                onChange={(e) => set('incoterms', e.target.value)} data-testid="field-incoterms">
          {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </Field>
      <Field label="Packing Type" required>
        <select className={inputCls} style={inputStyle} value={data.packingType}
                onChange={(e) => set('packingType', e.target.value)} data-testid="field-packing">
          <option value="">Select packing…</option>
          {['Jute Bags', 'PP Bags', 'Bulk', 'Drums', 'Containers (20ft)', 'Containers (40ft)', 'IBC Tote'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Asking Price (per unit, cents)">
        <input type="number" min={0} className={inputCls} style={inputStyle} value={data.askingPriceCents}
               onChange={(e) => set('askingPriceCents', e.target.value)} placeholder="e.g. 250000 = $2,500" data-testid="field-price" />
      </Field>
      <Field label="Estimated Total Value (cents)">
        <input type="number" min={0} className={inputCls} style={inputStyle} value={data.estimatedValueCents}
               onChange={(e) => set('estimatedValueCents', e.target.value)} data-testid="field-value" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Notes for reviewer">
          <textarea rows={3} className={inputCls} style={inputStyle} value={data.notes}
                    onChange={(e) => set('notes', e.target.value)} data-testid="field-notes" />
        </Field>
      </div>
    </div>
  );
}

function DocumentsStep({ slots, files, onChange, category }: {
  slots: DocSlot[]; files: Record<string, File>; onChange: (f: Record<string, File>) => void; category: string;
}) {
  if (!category) {
    return <p className="text-sm" style={{ color: '#888880' }}>Please select a commodity category in Step 1 first.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: '#888880' }}>
        Documents required for <strong style={{ color: '#1A1A1A' }}>{category}</strong> commodities.
        PDFs and images up to 10MB each.
      </p>
      {slots.map(s => {
        const f = files[s.docType];
        return (
          <div key={s.docType} className="rounded-xl p-3 flex items-start justify-between gap-3"
               style={{ border: '1px solid #E8E2DC', background: f ? 'rgba(5,150,105,0.04)' : '#FAFAF8' }}
               data-testid={`doc-slot-${s.docType}`}>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                {s.label} {s.required && <span style={{ color: '#C73B22' }}>*</span>}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#888880' }}>{s.description}</p>
              {f && (
                <p className="text-xs mt-1 inline-flex items-center gap-1" style={{ color: '#047857' }}>
                  <CheckCircle2 size={12} /> {f.name} ({Math.round(f.size / 1024)} KB)
                </p>
              )}
            </div>
            <label className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                   style={{ background: f ? '#F5F2EE' : '#C73B22', color: f ? '#1A1A1A' : 'white' }}>
              <Upload size={14} /> {f ? 'Replace' : 'Upload'}
              <input type="file" className="hidden" accept=".pdf,image/*"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) onChange({ ...files, [s.docType]: file });
                     }}
                     data-testid={`doc-upload-${s.docType}`} />
            </label>
          </div>
        );
      })}
    </div>
  );
}

function ComplianceStep({ decls, setDecls }: { decls: Record<string, boolean>; setDecls: (d: Record<string, boolean>) => void }) {
  const items: { key: string; label: string }[] = [
    { key: 'truthAccuracy', label: 'I certify that all information provided is true, accurate and complete.' },
    { key: 'legalOrigin', label: 'I confirm the commodity is of legal origin and not subject to any export embargo.' },
    { key: 'sanctionsCompliance', label: 'I confirm my organisation is not on any sanctions list (UN, OFAC, EU) and the goods do not originate from sanctioned regions.' },
    { key: 'qualityGuarantee', label: 'I guarantee the commodity meets the declared grade and is fit for export.' },
    { key: 'termsAccepted', label: 'I accept the Finatrades Marketplace Terms & the Trade Finance Master Agreement.' },
  ];
  return (
    <div className="space-y-3">
      {items.map(it => (
        <label key={it.key} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
               style={{ border: '1px solid #E8E2DC', background: decls[it.key] ? 'rgba(199,59,34,0.04)' : '#FAFAF8' }}
               data-testid={`decl-${it.key}`}>
          <input type="checkbox" className="mt-0.5" checked={!!decls[it.key]}
                 onChange={(e) => setDecls({ ...decls, [it.key]: e.target.checked })} />
          <span className="text-sm" style={{ color: '#1A1A1A' }}>{it.label}</span>
        </label>
      ))}
    </div>
  );
}

function ReviewStep({ data, files, reqDocs, decls }: {
  data: WizardData; files: Record<string, File>; reqDocs: DocSlot[]; decls: Record<string, boolean>;
}) {
  return (
    <div className="space-y-4 text-sm">
      <section>
        <h3 className="font-bold mb-2" style={{ color: '#1A1A1A' }}>Commodity</h3>
        <Grid items={[
          ['Commodity', data.commodityName], ['HS Code', data.hsCode], ['Category', data.commodityCategory],
          ['Quantity', `${data.quantity} ${data.unit}`], ['Grade', data.qualityGrade],
          ['Batch', data.batchNumber || '—'], ['Harvest', data.harvestDate || '—'],
        ]} />
      </section>
      <section>
        <h3 className="font-bold mb-2" style={{ color: '#1A1A1A' }}>Logistics & Pricing</h3>
        <Grid items={[
          ['Origin', data.originCountry], ['Target Hub', data.targetHubCode],
          ['Incoterms', data.incoterms], ['Packing', data.packingType],
          ['Asking Price', data.askingPriceCents ? `$${(Number(data.askingPriceCents) / 100).toFixed(2)}` : '—'],
          ['Est. Value', data.estimatedValueCents ? `$${(Number(data.estimatedValueCents) / 100).toFixed(2)}` : '—'],
        ]} />
      </section>
      <section>
        <h3 className="font-bold mb-2" style={{ color: '#1A1A1A' }}>Documents ({Object.keys(files).length} attached)</h3>
        <ul className="space-y-1">
          {reqDocs.map(d => (
            <li key={d.docType} className="flex items-center gap-2" style={{ color: '#1A1A1A' }}>
              {files[d.docType]
                ? <CheckCircle2 size={14} style={{ color: '#047857' }} />
                : d.required ? <AlertCircle size={14} style={{ color: '#DC2626' }} /> : <FileText size={14} style={{ color: '#888880' }} />}
              <span className="text-xs">{d.label}{d.required && !files[d.docType] ? ' — missing' : ''}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-bold mb-2" style={{ color: '#1A1A1A' }}>Compliance</h3>
        <p className="text-xs" style={{ color: '#888880' }}>
          {Object.values(decls).every(Boolean) ? 'All declarations accepted.' : 'Some declarations are missing.'}
        </p>
      </section>
    </div>
  );
}

function Grid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {items.map(([k, v]) => (
        <div key={k} className="p-2 rounded-lg" style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}>
          <dt className="text-xs" style={{ color: '#888880' }}>{k}</dt>
          <dd className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
