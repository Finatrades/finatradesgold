import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { ShieldCheck, FileText, Building2, User, ExternalLink, Clock, CheckCircle2, X, AlertTriangle } from 'lucide-react';

type KycType = 'kycAml' | 'finatrades_personal' | 'finatrades_corporate';

interface KycSubmission {
  id: string;
  userId: string;
  kycType: KycType;
  status: string;
  createdAt: string;
  updatedAt?: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  companyName?: string | null;
  registrationNumber?: string | null;
  corporateRole?: string | null;
  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  passportUrl?: string | null;
  addressProofUrl?: string | null;
  documents?: Record<string, { url?: string; filename?: string } | string> | null;
  beneficialOwners?: any;
  riskScore?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
}

interface ListResponse {
  submissions: KycSubmission[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  'Approved':          { bg: 'rgba(5,150,105,0.12)',  fg: '#059669' },
  'Pending Review':    { bg: 'rgba(217,119,6,0.12)',  fg: '#D97706' },
  'AI Review':         { bg: 'rgba(59,130,246,0.12)', fg: '#1D4ED8' },
  'In Review':         { bg: 'rgba(217,119,6,0.12)',  fg: '#D97706' },
  'In Progress':       { bg: 'rgba(217,119,6,0.12)',  fg: '#D97706' },
  'Escalated':         { bg: 'rgba(217,119,6,0.12)',  fg: '#D97706' },
  'Changes Requested': { bg: 'rgba(220,38,38,0.12)',  fg: '#DC2626' },
  'Rejected':          { bg: 'rgba(220,38,38,0.12)',  fg: '#DC2626' },
  'AI Rejected':       { bg: 'rgba(220,38,38,0.12)',  fg: '#DC2626' },
  'Not Started':       { bg: 'rgba(120,113,108,0.12)', fg: '#78716C' },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['Not Started'];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.fg }} data-testid={`status-${status.replace(/\s+/g, '-').toLowerCase()}`}>
      {status === 'Approved' ? <CheckCircle2 size={12} /> : status === 'Rejected' ? <X size={12} /> : <Clock size={12} />}
      {status}
    </span>
  );
}

function TypeBadge({ kycType }: { kycType: KycType }) {
  if (kycType === 'finatrades_corporate') {
    return <Badge variant="secondary" className="gap-1"><Building2 size={12} /> Corporate</Badge>;
  }
  if (kycType === 'finatrades_personal') {
    return <Badge variant="secondary" className="gap-1"><User size={12} /> Personal</Badge>;
  }
  return <Badge variant="outline">Legacy</Badge>;
}

function DocLink({ label, url }: { label: string; url?: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-[#E8D9C8] bg-[#FFFAF3] hover:bg-[#FBE7DF] text-[#1A1410]">
      <FileText size={12} /> {label} <ExternalLink size={10} />
    </a>
  );
}

export default function AdminKycQueue() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('Pending Review');
  const [typeFilter, setTypeFilter] = useState<'all' | KycType>('all');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const q = useQuery<ListResponse>({
    queryKey: ['/api/admin/kyc', statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ status: statusFilter, type: typeFilter, limit: '50' });
      const r = await apiRequest('GET', `/api/admin/kyc?${params.toString()}`);
      return r.json();
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: 'Approved' | 'Rejected' | 'Changes Requested'; rejectionReason?: string }) => {
      const r = await apiRequest('PATCH', `/api/kyc/${id}`, {
        status,
        rejectionReason: rejectionReason || undefined,
        decisionNotes: rejectionReason || undefined,
        reviewedAt: new Date().toISOString(),
      });
      return r.json();
    },
    onMutate: ({ id }) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: (_data, vars) => {
      const friendly =
        vars.status === 'Approved' ? 'KYC approved' :
        vars.status === 'Rejected' ? 'KYC rejected' :
        'Changes requested from the user';
      toast({ title: friendly, description: 'The user has been notified by email and in-app.' });
      qc.invalidateQueries({ queryKey: ['/api/admin/kyc'] });
    },
    onError: (e: any) => toast({
      variant: 'destructive',
      title: 'We could not save your decision',
      description: e?.message || 'Please try again.',
    }),
  });

  const submissions = q.data?.submissions ?? [];
  const counts = {
    pending: submissions.filter(s => ['Pending Review', 'AI Review', 'In Review', 'In Progress', 'Escalated'].includes(s.status)).length,
    approved: submissions.filter(s => s.status === 'Approved').length,
    rejected: submissions.filter(s => ['Rejected', 'AI Rejected'].includes(s.status)).length,
    changes: submissions.filter(s => s.status === 'Changes Requested').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1200px]">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(199,59,34,0.10)', color: '#C73B22' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A1410]">KYC Review Queue</h1>
              <p className="text-sm text-[#5A4838]">Approve, reject, or request changes on submitted KYC verifications</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(217,119,6,0.10)', color: '#D97706' }}>
              {counts.pending} pending
            </div>
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(5,150,105,0.10)', color: '#059669' }}>
              {counts.approved} approved
            </div>
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(220,38,38,0.10)', color: '#DC2626' }}>
              {counts.rejected} rejected
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#5A4838] uppercase tracking-wider">Status</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                data-testid="select-status-filter"
                className="text-sm border border-[#E8D9C8] rounded-lg px-3 py-1.5 bg-[#FFFAF3] text-[#1A1410]"
              >
                <option value="all">All</option>
                <option value="Pending Review">Pending Review</option>
                <option value="AI Review">AI Review</option>
                <option value="In Progress">In Progress</option>
                <option value="Escalated">Escalated</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Changes Requested">Changes Requested</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#5A4838] uppercase tracking-wider">Type</span>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                data-testid="select-type-filter"
                className="text-sm border border-[#E8D9C8] rounded-lg px-3 py-1.5 bg-[#FFFAF3] text-[#1A1410]"
              >
                <option value="all">All</option>
                <option value="finatrades_personal">Personal</option>
                <option value="finatrades_corporate">Corporate</option>
                <option value="kycAml">Legacy</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Queue */}
        {q.isLoading && <Card className="p-6 text-sm text-[#5A4838]">Loading submissions…</Card>}
        {q.isError && (
          <Card className="p-6 text-sm text-[#DC2626] flex items-center gap-2">
            <AlertTriangle size={16} /> Failed to load KYC queue. {(q.error as any)?.message}
          </Card>
        )}
        {q.data && submissions.length === 0 && (
          <Card className="p-8 text-center text-sm text-[#5A4838]">No KYC submissions match the current filters.</Card>
        )}

        <div className="space-y-3">
          {submissions.map(sub => {
            const isCorp = sub.kycType === 'finatrades_corporate';
            const title = isCorp ? (sub.companyName || 'Unnamed company') : (sub.fullName || sub.email || 'Unnamed applicant');
            const docs: { label: string; url?: string | null }[] = [];
            if (sub.idFrontUrl) docs.push({ label: 'ID front', url: sub.idFrontUrl });
            if (sub.idBackUrl) docs.push({ label: 'ID back', url: sub.idBackUrl });
            if (sub.passportUrl) docs.push({ label: 'Passport', url: sub.passportUrl });
            if (sub.addressProofUrl) docs.push({ label: 'Address proof', url: sub.addressProofUrl });
            if (sub.documents && typeof sub.documents === 'object') {
              for (const [k, v] of Object.entries(sub.documents)) {
                const url = typeof v === 'string' ? v : v?.url;
                if (url) docs.push({ label: k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(), url });
              }
            }

            const busy = busyId === sub.id;
            return (
              <Card key={sub.id} className="p-5" data-testid={`kyc-card-${sub.id}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22' }}>
                      {isCorp ? <Building2 size={18} /> : <User size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#1A1410]">{title}</p>
                        <TypeBadge kycType={sub.kycType} />
                        <StatusPill status={sub.status} />
                        {typeof sub.riskScore === 'number' && sub.riskScore > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(217,119,6,0.10)', color: '#D97706' }}>
                            Risk {sub.riskScore}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#5A4838] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {sub.email && <span>{sub.email}</span>}
                        {sub.phone && <span>· {sub.phone}</span>}
                        {sub.country && <span>· {sub.country}</span>}
                        {isCorp && sub.registrationNumber && <span>· Reg #{sub.registrationNumber}</span>}
                        {isCorp && sub.corporateRole && <span>· {sub.corporateRole}</span>}
                        <span>· Submitted {new Date(sub.createdAt).toLocaleString()}</span>
                        {sub.reviewedByName && sub.reviewedAt && (
                          <span>· Reviewed by {sub.reviewedByName} on {new Date(sub.reviewedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {docs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {docs.map((d, i) => <DocLink key={i} label={d.label} url={d.url} />)}
                  </div>
                )}

                {['Pending Review', 'AI Review', 'In Review', 'In Progress', 'Escalated'].includes(sub.status) && (
                  <>
                    <Textarea
                      placeholder="Optional decision notes / rejection reason"
                      value={notesById[sub.id] ?? ''}
                      onChange={e => setNotesById(s => ({ ...s, [sub.id]: e.target.value }))}
                      className="mb-3 text-sm"
                      data-testid={`textarea-notes-${sub.id}`}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => decide.mutate({ id: sub.id, status: 'Approved' })}
                        data-testid={`button-approve-${sub.id}`}
                        style={{ background: '#059669', color: '#fff' }}
                      >
                        <CheckCircle2 size={14} className="mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          const note = notesById[sub.id];
                          if (!note?.trim()) { toast({ variant: 'destructive', title: 'Please add a note for the user', description: 'Tell them what to update before they can resubmit.' }); return; }
                          decide.mutate({ id: sub.id, status: 'Changes Requested', rejectionReason: note });
                        }}
                        data-testid={`button-changes-${sub.id}`}
                      >
                        Request Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => {
                          const note = notesById[sub.id];
                          if (!note?.trim()) { toast({ variant: 'destructive', title: 'Please add a reason', description: 'The user needs to know why their KYC was rejected.' }); return; }
                          decide.mutate({ id: sub.id, status: 'Rejected', rejectionReason: note });
                        }}
                        data-testid={`button-reject-${sub.id}`}
                      >
                        <X size={14} className="mr-1" /> Reject
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
