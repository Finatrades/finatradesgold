import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldCheck, Upload, CheckCircle2, Clock, AlertCircle, X,
  FileText, User, Building2, Info, Loader2,
} from 'lucide-react';

type KycKind = 'personal' | 'corporate';

interface KycResponse {
  submission: any | null;
  referenceNumber: string | null;
  slaDeadline: string | null;
}

const DOC_STYLES: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  'Approved':          { bg: 'rgba(5,150,105,0.10)',  color: '#047857', icon: <CheckCircle2 size={13} /> },
  'Pending Review':    { bg: 'rgba(217,119,6,0.10)',  color: '#D97706', icon: <Clock size={13} /> },
  'In Review':         { bg: 'rgba(217,119,6,0.10)',  color: '#D97706', icon: <Clock size={13} /> },
  'AI Review':         { bg: 'rgba(59,130,246,0.10)', color: '#1D4ED8', icon: <Clock size={13} /> },
  'In Progress':       { bg: 'rgba(217,119,6,0.10)',  color: '#D97706', icon: <Clock size={13} /> },
  'Escalated':         { bg: 'rgba(217,119,6,0.10)',  color: '#D97706', icon: <AlertCircle size={13} /> },
  'Changes Requested': { bg: 'rgba(220,38,38,0.10)',  color: '#DC2626', icon: <AlertCircle size={13} /> },
  'Rejected':          { bg: 'rgba(220,38,38,0.10)',  color: '#DC2626', icon: <X size={13} /> },
  'AI Rejected':       { bg: 'rgba(220,38,38,0.10)',  color: '#DC2626', icon: <AlertCircle size={13} /> },
  'Not Started':       { bg: 'rgba(120,113,108,0.10)', color: '#78716C', icon: <Upload size={13} /> },
  'Pending':           { bg: 'rgba(120,113,108,0.10)', color: '#78716C', icon: <Upload size={13} /> },
};

function StatusPill({ status }: { status: string }) {
  const s = DOC_STYLES[status] || DOC_STYLES['Pending'];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }} data-testid="badge-kyc-status-pill">
      {s.icon} {status}
    </span>
  );
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '';
  const r = await fetch('/api/documents/upload', {
    method: 'POST',
    credentials: 'include',
    headers: csrf ? { 'x-csrf-token': csrf, 'X-Requested-With': 'XMLHttpRequest' } : { 'X-Requested-With': 'XMLHttpRequest' },
    body: fd,
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`Upload failed (${r.status}) ${txt}`);
  }
  const j = await r.json();
  if (!j?.url) throw new Error('Upload succeeded but no URL returned');
  return j.url as string;
}

// ─── Personal KYC Form ─────────────────────────────────────────────────────
function PersonalKycForm({
  initial, onSubmitted,
}: { initial: any | null; onSubmitted: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: initial?.fullName ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    dateOfBirth: initial?.dateOfBirth ?? '',
    nationality: initial?.nationality ?? '',
    country: initial?.country ?? '',
    city: initial?.city ?? '',
    address: initial?.address ?? '',
    postalCode: initial?.postalCode ?? '',
    occupation: initial?.occupation ?? '',
    sourceOfFunds: initial?.sourceOfFunds ?? '',
  });
  const [docs, setDocs] = useState<{ idFront?: string; idBack?: string; passport?: string; addressProof?: string }>({
    idFront: initial?.idFrontUrl || undefined,
    idBack: initial?.idBackUrl || undefined,
    passport: initial?.passportUrl || undefined,
    addressProof: initial?.addressProofUrl || undefined,
  });
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', '/api/finatrades-kyc/personal', {
        userId: initial?.userId, // server overrides from session if needed
        personalInformation: { ...form, accountType: 'personal' },
        documents: {
          idFront: docs.idFront ? { url: docs.idFront } : undefined,
          idBack: docs.idBack ? { url: docs.idBack } : undefined,
          passport: docs.passport ? { url: docs.passport } : undefined,
          addressProof: docs.addressProof ? { url: docs.addressProof } : undefined,
        },
        livenessVerified: false,
        isResubmit: !!initial,
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'KYC submitted', description: 'Compliance team will review within 24 hours.' });
      onSubmitted();
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Submission failed', description: e?.message }),
  });

  const handleFile = async (key: keyof typeof docs, file: File) => {
    setUploadingKey(key);
    try {
      const url = await uploadFile(file);
      setDocs(d => ({ ...d, [key]: url }));
      toast({ title: 'File uploaded', description: file.name });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: e?.message });
    } finally {
      setUploadingKey(null);
    }
  };

  const required = ['fullName', 'email', 'phone', 'dateOfBirth', 'country', 'address'];
  const formValid = required.every(k => String((form as any)[k] || '').trim().length > 0);
  const docsValid = !!docs.idFront && !!docs.addressProof;
  const canSubmit = formValid && docsValid && !submit.isPending;

  const docSlots: { key: keyof typeof docs; label: string; required: boolean }[] = [
    { key: 'idFront', label: 'Government ID — front', required: true },
    { key: 'idBack', label: 'Government ID — back', required: false },
    { key: 'passport', label: 'Passport (optional)', required: false },
    { key: 'addressProof', label: 'Proof of address (utility bill / bank statement)', required: true },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {([
          ['fullName', 'Full Name *'],
          ['email', 'Email *'],
          ['phone', 'Phone *'],
          ['dateOfBirth', 'Date of Birth * (YYYY-MM-DD)'],
          ['nationality', 'Nationality'],
          ['country', 'Country *'],
          ['city', 'City'],
          ['postalCode', 'Postal Code'],
          ['occupation', 'Occupation'],
          ['sourceOfFunds', 'Source of Funds'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#5A4838]">{label}</span>
            <input
              type={key === 'dateOfBirth' ? 'date' : 'text'}
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              data-testid={`input-${key}`}
              className="px-3 py-2 rounded-lg text-sm bg-[#FFFAF3] border border-[#E8D9C8] text-[#1A1410] focus:outline-none focus:border-[#C73B22]"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-semibold text-[#5A4838]">Address *</span>
          <input
            type="text"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            data-testid="input-address"
            className="px-3 py-2 rounded-lg text-sm bg-[#FFFAF3] border border-[#E8D9C8] text-[#1A1410] focus:outline-none focus:border-[#C73B22]"
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5A4838]">Documents</p>
        {docSlots.map(slot => (
          <div key={slot.key} className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] border border-[#F0EBE6]">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={14} className="text-[#B0AAA4] shrink-0" />
              <p className="text-sm font-medium text-[#1A1410] truncate">
                {slot.label}{slot.required && <span className="text-[#C73B22]"> *</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {docs[slot.key] && <StatusPill status="Pending Review" />}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                style={{ background: '#C73B22' }} data-testid={`button-upload-${slot.key}`}>
                {uploadingKey === slot.key
                  ? <><Loader2 size={12} className="animate-spin" /> Uploading…</>
                  : docs[slot.key]
                    ? <><CheckCircle2 size={12} /> Replace</>
                    : <><Upload size={12} /> Upload</>}
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(slot.key, f); e.target.value = ''; }} />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        disabled={!canSubmit}
        onClick={() => submit.mutate()}
        data-testid="button-submit-personal-kyc"
        className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#C73B22' }}
      >
        {submit.isPending ? 'Submitting…' : initial ? 'Resubmit for review' : 'Submit for review'}
      </button>
      {!formValid && <p className="text-xs text-[#DC2626]">Fill all required fields (marked *).</p>}
      {formValid && !docsValid && <p className="text-xs text-[#DC2626]">Upload at least Government ID front and Proof of address.</p>}
    </div>
  );
}

// ─── Corporate KYC Form ────────────────────────────────────────────────────
function CorporateKycForm({
  initial, defaultRole, onSubmitted,
}: { initial: any | null; defaultRole: 'importer' | 'exporter' | 'both'; onSubmitted: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    companyName: initial?.companyName ?? '',
    registrationNumber: initial?.registrationNumber ?? '',
    incorporationDate: initial?.incorporationDate ?? '',
    countryOfIncorporation: initial?.countryOfIncorporation ?? '',
    companyType: initial?.companyType ?? '',
    corporateRole: initial?.corporateRole ?? defaultRole,
    natureOfBusiness: initial?.natureOfBusiness ?? '',
    headOfficeAddress: initial?.headOfficeAddress ?? '',
    telephoneNumber: initial?.telephoneNumber ?? '',
    website: initial?.website ?? '',
    emailAddress: initial?.emailAddress ?? '',
    tradingContactName: initial?.tradingContactName ?? '',
    tradingContactEmail: initial?.tradingContactEmail ?? '',
    tradingContactPhone: initial?.tradingContactPhone ?? '',
  });
  const initialDocs = (initial?.documents && typeof initial.documents === 'object') ? initial.documents : {};
  const [docs, setDocs] = useState<Record<string, string>>({
    incorporationCertificate: initialDocs.incorporationCertificate?.url || initialDocs.incorporationCertificate || '',
    tradeLicense: initialDocs.tradeLicense?.url || initialDocs.tradeLicense || '',
    memorandum: initialDocs.memorandum?.url || initialDocs.memorandum || '',
    bankReference: initialDocs.bankReference?.url || initialDocs.bankReference || '',
    directorPassport: initialDocs.directorPassport?.url || initialDocs.directorPassport || '',
  });
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', '/api/finatrades-kyc/corporate', {
        ...form,
        documents: Object.fromEntries(
          Object.entries(docs).filter(([, v]) => !!v).map(([k, v]) => [k, { url: v }])
        ),
        beneficialOwners: initial?.beneficialOwners ?? [],
        hasPepOwners: false,
        isResubmit: !!initial,
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Corporate KYC submitted', description: 'Compliance team will review within 5 business days.' });
      onSubmitted();
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Submission failed', description: e?.message }),
  });

  const handleFile = async (key: string, file: File) => {
    setUploadingKey(key);
    try {
      const url = await uploadFile(file);
      setDocs(d => ({ ...d, [key]: url }));
      toast({ title: 'File uploaded', description: file.name });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: e?.message });
    } finally {
      setUploadingKey(null);
    }
  };

  const required = ['companyName', 'registrationNumber', 'countryOfIncorporation', 'natureOfBusiness', 'headOfficeAddress', 'emailAddress'];
  const formValid = required.every(k => String((form as any)[k] || '').trim().length > 0);
  const docsValid = !!docs.incorporationCertificate && !!docs.tradeLicense;
  const canSubmit = formValid && docsValid && !submit.isPending;

  const docSlots: { key: string; label: string; required: boolean }[] = [
    { key: 'incorporationCertificate', label: 'Certificate of Incorporation', required: true },
    { key: 'tradeLicense', label: 'Trade License', required: true },
    { key: 'memorandum', label: 'Memorandum & Articles of Association', required: false },
    { key: 'bankReference', label: 'Bank reference letter', required: false },
    { key: 'directorPassport', label: 'Authorized signatory passport', required: false },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {([
          ['companyName', 'Company Name *'],
          ['registrationNumber', 'Registration Number *'],
          ['incorporationDate', 'Incorporation Date (YYYY-MM-DD)'],
          ['countryOfIncorporation', 'Country of Incorporation *'],
          ['companyType', 'Company Type (LLC / PLC / etc.)'],
          ['natureOfBusiness', 'Nature of Business *'],
          ['telephoneNumber', 'Telephone'],
          ['website', 'Website'],
          ['emailAddress', 'Company Email *'],
          ['tradingContactName', 'Trading Contact Name'],
          ['tradingContactEmail', 'Trading Contact Email'],
          ['tradingContactPhone', 'Trading Contact Phone'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#5A4838]">{label}</span>
            <input
              type={key === 'incorporationDate' ? 'date' : 'text'}
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              data-testid={`input-${key}`}
              className="px-3 py-2 rounded-lg text-sm bg-[#FFFAF3] border border-[#E8D9C8] text-[#1A1410] focus:outline-none focus:border-[#C73B22]"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#5A4838]">Corporate Role *</span>
          <select
            value={form.corporateRole}
            onChange={e => setForm(f => ({ ...f, corporateRole: e.target.value }))}
            data-testid="select-corporateRole"
            className="px-3 py-2 rounded-lg text-sm bg-[#FFFAF3] border border-[#E8D9C8] text-[#1A1410]"
          >
            <option value="importer">Importer</option>
            <option value="exporter">Exporter</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-semibold text-[#5A4838]">Head Office Address *</span>
          <input type="text"
            value={form.headOfficeAddress}
            onChange={e => setForm(f => ({ ...f, headOfficeAddress: e.target.value }))}
            data-testid="input-headOfficeAddress"
            className="px-3 py-2 rounded-lg text-sm bg-[#FFFAF3] border border-[#E8D9C8] text-[#1A1410] focus:outline-none focus:border-[#C73B22]"
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5A4838]">Documents</p>
        {docSlots.map(slot => (
          <div key={slot.key} className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] border border-[#F0EBE6]">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={14} className="text-[#B0AAA4] shrink-0" />
              <p className="text-sm font-medium text-[#1A1410] truncate">
                {slot.label}{slot.required && <span className="text-[#C73B22]"> *</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {docs[slot.key] && <StatusPill status="Pending Review" />}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                style={{ background: '#C73B22' }} data-testid={`button-upload-${slot.key}`}>
                {uploadingKey === slot.key
                  ? <><Loader2 size={12} className="animate-spin" /> Uploading…</>
                  : docs[slot.key]
                    ? <><CheckCircle2 size={12} /> Replace</>
                    : <><Upload size={12} /> Upload</>}
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(slot.key, f); e.target.value = ''; }} />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        disabled={!canSubmit}
        onClick={() => submit.mutate()}
        data-testid="button-submit-corporate-kyc"
        className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#C73B22' }}
      >
        {submit.isPending ? 'Submitting…' : initial ? 'Resubmit for review' : 'Submit for review'}
      </button>
      {!formValid && <p className="text-xs text-[#DC2626]">Fill all required fields (marked *).</p>}
      {formValid && !docsValid && <p className="text-xs text-[#DC2626]">Upload at least the Certificate of Incorporation and Trade License.</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function KycPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = (user as any)?.id as string | undefined;
  const userType = (user as any)?.userType as 'exporter' | 'importer' | 'government' | undefined;
  const accountType = (user as any)?.accountType as 'personal' | 'business' | undefined;

  const requiredKind: KycKind = useMemo(() =>
    userType === 'exporter' || userType === 'government'
      ? 'corporate'
      : accountType === 'business' ? 'corporate' : 'personal'
  , [userType, accountType]);

  const [selectedKind, setSelectedKind] = useState<KycKind>(requiredKind);
  const canChooseKind = userType === 'importer';

  // Sync selectedKind once the user loads, so exporter/government users
  // don't get stuck on the personal form because user was undefined at mount.
  useEffect(() => {
    if (!canChooseKind) setSelectedKind(requiredKind);
  }, [canChooseKind, requiredKind]);

  const kycQuery = useQuery<KycResponse>({
    queryKey: [`/api/finatrades-kyc/${selectedKind}`, userId],
    queryFn: async () => {
      const r = await apiRequest('GET', `/api/finatrades-kyc/${selectedKind}/${userId}`);
      return r.json();
    },
    enabled: !!userId,
  });

  const submission = kycQuery.data?.submission;
  const referenceNumber = kycQuery.data?.referenceNumber;
  const submissionStatus: string = submission?.status || ((user as any)?.kycStatus ?? 'Not Started');
  const isApproved = submissionStatus === 'Approved';
  const isUnderReview = ['Pending Review', 'AI Review', 'In Review', 'In Progress', 'Escalated'].includes(submissionStatus);
  const needsAction = !submission || ['Rejected', 'AI Rejected', 'Changes Requested', 'Not Started'].includes(submissionStatus);

  const [editing, setEditing] = useState(false);
  const showForm = editing || needsAction;

  const onSubmitted = () => {
    setEditing(false);
    qc.invalidateQueries({ queryKey: [`/api/finatrades-kyc/${selectedKind}`, userId] });
    qc.invalidateQueries({ queryKey: ['/api/auth/me'] });
    qc.invalidateQueries({ queryKey: ['/api/b2b/consignments/eligibility'] });
  };

  return (
    <div className="space-y-6 max-w-[1000px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1A1410]">KYC / Compliance</h1>
        <p className="text-sm mt-0.5 text-[#5A4838]">
          Identity verification and regulatory compliance for commodity trading
        </p>
      </div>

      {/* Status Banner */}
      <div className="rounded-2xl p-5 bg-[#FFFAF3] border border-[#E8D9C8]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(199,59,34,0.08)' }}>
            <ShieldCheck size={22} className="text-[#C73B22]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-base font-bold text-[#1A1410]">Verification Status</h2>
              <StatusPill status={submissionStatus} />
              {referenceNumber && (
                <span className="text-xs font-mono text-[#5A4838]" data-testid="text-kyc-ref">{referenceNumber}</span>
              )}
            </div>
            <p className="text-sm text-[#5A4838]">
              You require <strong className="text-[#1A1410]">Finatrades {requiredKind === 'corporate' ? 'Corporate' : 'Personal'} KYC</strong>.{' '}
              {requiredKind === 'corporate'
                ? 'Corporate verification unlocks consignment submission, marketplace listings, and trade-finance escrow.'
                : 'Personal verification unlocks marketplace browsing, RFQ submission, and individual buying.'}
            </p>
            {isApproved && !editing && (
              <p className="text-sm mt-2 text-[#059669] font-semibold">Your KYC is approved. All platform features are unlocked.</p>
            )}
            {isUnderReview && (
              <p className="text-sm mt-2 text-[#D97706]">Your submission is under review by the Finatrades compliance team.</p>
            )}
            {submissionStatus === 'Rejected' && submission?.rejectionReason && (
              <p className="text-sm mt-2 text-[#DC2626]"><strong>Reason:</strong> {submission.rejectionReason}</p>
            )}
            {submissionStatus === 'Changes Requested' && (
              <p className="text-sm mt-2 text-[#DC2626]">The compliance team requested changes. Please update your submission below.</p>
            )}
            {(isApproved || isUnderReview) && !editing && (
              <button
                onClick={() => setEditing(true)}
                data-testid="button-edit-kyc"
                className="mt-3 text-xs font-semibold underline text-[#C73B22] hover:opacity-80">
                {isApproved ? 'Update KYC details' : 'Edit submission'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kind selector — importer only */}
      {canChooseKind && !showForm && (
        <div className="grid grid-cols-2 gap-3">
          {(['personal','corporate'] as KycKind[]).map(kind => {
            const active = selectedKind === kind;
            return (
              <button key={kind} onClick={() => setSelectedKind(kind)}
                data-testid={`button-select-${kind}`}
                className="rounded-2xl p-4 text-left transition-all border"
                style={{
                  background: active ? 'rgba(199,59,34,0.06)' : '#FFFAF3',
                  borderColor: active ? '#C73B22' : '#E8D9C8',
                }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: active ? '#C73B22' : '#F0EBE6', color: active ? '#fff' : '#888880' }}>
                    {kind === 'personal' ? <User size={16} /> : <Building2 size={16} />}
                  </div>
                  <p className="font-bold text-sm text-[#1A1410]">
                    {kind === 'personal' ? 'Personal KYC' : 'Corporate KYC'}
                  </p>
                  {active && <CheckCircle2 size={16} className="text-[#C73B22] ml-auto" />}
                </div>
                <p className="text-xs text-[#5A4838]">
                  {kind === 'personal'
                    ? 'Individual buyer — personal ID + proof of address.'
                    : 'Company buyer — incorporation, ownership and banking.'}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Form / status detail */}
      <div className="rounded-2xl bg-[#FFFAF3] overflow-hidden border border-[#E8D9C8]">
        <div className="p-5 border-b border-[#F0EBE6]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22' }}>
              {selectedKind === 'personal' ? <User size={15} /> : <Building2 size={15} />}
            </div>
            <div>
              <p className="font-bold text-sm text-[#1A1410]">
                {selectedKind === 'personal' ? 'Personal KYC' : 'Corporate KYC'} — {showForm ? (submission ? 'Update submission' : 'Required information') : 'Submission summary'}
              </p>
              <p className="text-xs text-[#5A4838]">
                Reviewed by the Finatrades compliance team. Single-stage admin review.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {kycQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-[#5A4838]">
              <Loader2 size={14} className="animate-spin" /> Loading your KYC…
            </div>
          )}
          {!kycQuery.isLoading && showForm && selectedKind === 'personal' && (
            <PersonalKycForm initial={submission} onSubmitted={onSubmitted} />
          )}
          {!kycQuery.isLoading && showForm && selectedKind === 'corporate' && (
            <CorporateKycForm
              initial={submission}
              defaultRole={userType === 'exporter' ? 'exporter' : userType === 'importer' ? 'importer' : 'both'}
              onSubmitted={onSubmitted}
            />
          )}
          {!kycQuery.isLoading && !showForm && submission && (
            <div className="space-y-2 text-sm text-[#1A1410]">
              {selectedKind === 'personal' ? (
                <>
                  <div className="flex justify-between"><span className="text-[#5A4838]">Full Name</span><span>{submission.fullName}</span></div>
                  <div className="flex justify-between"><span className="text-[#5A4838]">Email</span><span>{submission.email}</span></div>
                  <div className="flex justify-between"><span className="text-[#5A4838]">Country</span><span>{submission.country}</span></div>
                  <div className="flex justify-between"><span className="text-[#5A4838]">Submitted</span><span>{new Date(submission.createdAt).toLocaleString()}</span></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-[#5A4838]">Company</span><span>{submission.companyName}</span></div>
                  <div className="flex justify-between"><span className="text-[#5A4838]">Reg. Number</span><span>{submission.registrationNumber}</span></div>
                  <div className="flex justify-between"><span className="text-[#5A4838]">Country</span><span>{submission.countryOfIncorporation}</span></div>
                  <div className="flex justify-between"><span className="text-[#5A4838]">Role</span><span>{submission.corporateRole}</span></div>
                  <div className="flex justify-between"><span className="text-[#5A4838]">Submitted</span><span>{new Date(submission.createdAt).toLocaleString()}</span></div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review pipeline info */}
      <div className="rounded-2xl bg-[#FFFAF3] p-5 border border-[#E8D9C8]">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-[#C73B22] mt-0.5" />
          <div className="text-xs space-y-1 text-[#5A4838]">
            <p><strong className="text-[#1A1410]">Review pipeline:</strong> Pending Review → AI Review → Admin Decision → Approved / Changes Requested / Rejected.</p>
            <p>Personal KYC SLA: 24 hours. Corporate KYC SLA: 5 business days.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
