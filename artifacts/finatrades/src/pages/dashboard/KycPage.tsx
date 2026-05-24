import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck, Upload, CheckCircle2, Clock, AlertCircle, X,
  FileText, User, Building2, ChevronRight, Info,
} from 'lucide-react';

type KycKind = 'personal' | 'corporate';

const PERSONAL_DOCS = [
  'Government-issued ID (Passport / National ID / Driver\'s License)',
  'Proof of address (utility bill / bank statement)',
  'Selfie / liveness capture',
];

const CORPORATE_DOCS = [
  'Certificate of Incorporation',
  'Trade License',
  'Memorandum & Articles of Association',
  'Shareholder list',
  'Beneficial owner passports',
  'Bank reference letter',
  'Authorized signatories list',
];

const DOC_STYLES: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  'Approved':       { bg: 'rgba(5,150,105,0.10)', color: '#047857', icon: <CheckCircle2 size={13} /> },
  'Pending Review': { bg: 'rgba(245,158,11,0.10)', color: '#D97706', icon: <Clock size={13} /> },
  'AI Review':      { bg: 'rgba(59,130,246,0.10)', color: '#1D4ED8', icon: <Clock size={13} /> },
  'Pending':        { bg: 'rgba(136,136,128,0.10)', color: '#888880', icon: <Upload size={13} /> },
  'Rejected':       { bg: 'rgba(239,68,68,0.10)',  color: '#DC2626', icon: <X size={13} /> },
  'AI Rejected':    { bg: 'rgba(239,68,68,0.08)',  color: '#DC2626', icon: <AlertCircle size={13} /> },
};

function DocStatus({ status }: { status: string }) {
  const s = DOC_STYLES[status] || DOC_STYLES['Pending'];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {s.icon} {status}
    </span>
  );
}

export default function KycPage() {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('');

  const kycStatus = (user as any)?.kycStatus || 'In Progress';
  const userType = (user as any)?.userType as 'exporter' | 'importer' | 'government' | undefined;
  const accountType = (user as any)?.accountType as 'personal' | 'business' | undefined;

  // Exporter & government must complete Corporate; importer chooses based on accountType
  const requiredKind: KycKind =
    userType === 'exporter' || userType === 'government'
      ? 'corporate'
      : accountType === 'business'
        ? 'corporate'
        : 'personal';

  const [selectedKind, setSelectedKind] = useState<KycKind>(requiredKind);
  const canChooseKind = userType === 'importer';

  const docs = selectedKind === 'corporate' ? CORPORATE_DOCS : PERSONAL_DOCS;

  return (
    <div className="space-y-6 max-w-[1000px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>KYC / Compliance</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
          Identity verification and regulatory compliance for commodity trading
        </p>
      </div>

      {/* Status Banner */}
      <div className="rounded-2xl p-5 bg-white" style={{ border: '1px solid #E8E2DC' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(199,59,34,0.08)' }}>
            <ShieldCheck size={22} style={{ color: '#C73B22' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-base font-bold" style={{ color: '#1A1A1A' }}>Verification Status</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(245,158,11,0.10)', color: '#D97706' }}>
                {kycStatus}
              </span>
            </div>
            <p className="text-sm" style={{ color: '#888880' }}>
              You require <strong style={{ color: '#1A1A1A' }}>Finatrades {requiredKind === 'corporate' ? 'Corporate' : 'Personal'} KYC</strong>.
              {requiredKind === 'corporate'
                ? ' Corporate verification unlocks consignment submission, marketplace listings, and trade-finance escrow.'
                : ' Personal verification unlocks marketplace browsing, RFQ submission, and individual buying.'}
            </p>
          </div>
        </div>
      </div>

      {/* Kind selector — importer only */}
      {canChooseKind && (
        <div className="grid grid-cols-2 gap-3">
          {(['personal','corporate'] as KycKind[]).map(kind => {
            const active = selectedKind === kind;
            return (
              <button key={kind} onClick={() => setSelectedKind(kind)}
                className="rounded-2xl p-4 text-left transition-all"
                style={{
                  background: active ? 'rgba(199,59,34,0.06)' : '#fff',
                  border: `1px solid ${active ? '#C73B22' : '#E8E2DC'}`,
                }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: active ? '#C73B22' : '#F0EBE6', color: active ? '#fff' : '#888880' }}>
                    {kind === 'personal' ? <User size={16} /> : <Building2 size={16} />}
                  </div>
                  <p className="font-bold text-sm" style={{ color: '#1A1A1A' }}>
                    {kind === 'personal' ? 'Personal KYC' : 'Corporate KYC'}
                  </p>
                  {active && <CheckCircle2 size={16} style={{ color: '#C73B22', marginLeft: 'auto' }} />}
                </div>
                <p className="text-xs" style={{ color: '#888880' }}>
                  {kind === 'personal'
                    ? 'Individual buyer — personal ID + proof of address + selfie.'
                    : 'Company buyer — incorporation, ownership, banking and signatories.'}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Required documents */}
      <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
        <div className="p-5" style={{ borderBottom: '1px solid #F0EBE6' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22' }}>
              {selectedKind === 'personal' ? <User size={15} /> : <Building2 size={15} />}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: '#1A1A1A' }}>
                {selectedKind === 'personal' ? 'Personal KYC — Required Documents' : 'Corporate KYC — Required Documents'}
              </p>
              <p className="text-xs" style={{ color: '#888880' }}>
                Reviewed by the Finatrades compliance team. Single-stage admin review.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-2.5">
          {docs.map((docName, di) => (
            <div key={di} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: '#FAFAF8', border: '1px solid #F0EBE6' }}>
              <div className="flex items-center gap-2.5">
                <FileText size={14} style={{ color: '#B0AAA4' }} />
                <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{docName}</p>
              </div>
              <div className="flex items-center gap-3">
                <DocStatus status="Pending" />
                <button
                  onClick={() => { setUploadDocType(docName); setShowUpload(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90"
                  style={{ background: '#C73B22' }}>
                  <Upload size={12} /> Upload
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review pipeline info */}
      <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E2DC' }}>
        <div className="flex items-start gap-3">
          <Info size={16} style={{ color: '#C73B22', marginTop: 2 }} />
          <div className="text-xs space-y-1" style={{ color: '#888880' }}>
            <p><strong style={{ color: '#1A1A1A' }}>Review pipeline:</strong> Pending → AI Review → Pending Review → Approved.</p>
            <p>Documents flagged by AI are sent to a Finatrades compliance officer for single-stage human review.</p>
            <ChevronRight size={1} className="hidden" />
          </div>
        </div>
      </div>

      {/* AML Screening */}
      <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E2DC' }}>
        <div className="flex items-start gap-3 mb-4">
          <ShieldCheck size={18} style={{ color: '#059669' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: '#1A1A1A' }}>AML Screening</p>
            <p className="text-xs" style={{ color: '#888880' }}>Automated sanctions and PEP screening on all registered users</p>
          </div>
          <span className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: 'rgba(5,150,105,0.10)', color: '#059669' }}>Clear</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl" style={{ background: '#FAFAF8' }}>
            <p style={{ color: '#888880' }}>Sanctions Check</p>
            <p className="font-bold mt-0.5" style={{ color: '#059669' }}>✓ Clear</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: '#FAFAF8' }}>
            <p style={{ color: '#888880' }}>PEP Screening</p>
            <p className="font-bold mt-0.5" style={{ color: '#059669' }}>✓ Clear</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: '#FAFAF8' }}>
            <p style={{ color: '#888880' }}>Risk Level</p>
            <p className="font-bold mt-0.5" style={{ color: '#D97706' }}>Medium</p>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" style={{ border: '1px solid #E8E2DC' }}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E8E2DC' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Upload Document</h2>
                <p className="text-sm" style={{ color: '#888880' }}>{uploadDocType}</p>
              </div>
              <button onClick={() => setShowUpload(false)} className="p-2 rounded-xl hover:bg-[#F0EBE6]">
                <X size={18} style={{ color: '#888880' }} />
              </button>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-[#C73B22] transition-colors"
                style={{ borderColor: '#E8E2DC' }}>
                <Upload size={28} className="mx-auto mb-3" style={{ color: '#C0BAB4' }} />
                <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Click to upload or drag & drop</p>
                <p className="text-xs mt-1" style={{ color: '#888880' }}>PDF, JPG, PNG — max 10MB</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowUpload(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#F0EBE6]" style={{ color: '#888880' }}>
                  Cancel
                </button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                  style={{ background: '#C73B22' }}>
                  Submit for Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
