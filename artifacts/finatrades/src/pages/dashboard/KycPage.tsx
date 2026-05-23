import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck, Upload, CheckCircle2, Clock, AlertCircle, X,
  FileText, User, Building2, ChevronRight, Info, Lock,
} from 'lucide-react';

const TIER_INFO = [
  {
    tier: 1, label: 'Tier 1 — Basic Identity', maxTrade: 'USD 50,000/month',
    docs: ['Government-issued ID (Passport / NIN / Driver\'s License)', 'Selfie verification'],
    desc: 'Basic identity verification. Suitable for small commodity buyers.',
  },
  {
    tier: 2, label: 'Tier 2 — Enhanced KYC', maxTrade: 'USD 500,000/month',
    docs: ['Tier 1 documents', 'Proof of address (utility bill / bank statement)', 'Source of funds declaration'],
    desc: 'Enhanced due diligence. Unlocks marketplace access and RFQ submission.',
  },
  {
    tier: 3, label: 'Tier 3 — Corporate KYB', maxTrade: 'Unlimited',
    docs: ['Tier 2 documents', 'Certificate of Incorporation', 'Memorandum & Articles of Association', 'Directors list + IDs', 'Beneficial ownership declaration', 'Audited financials (last 2 years)', 'Bank reference letter'],
    desc: 'Full corporate verification. Required for consignment, escrow, and large-volume trading.',
  },
];

const USER_DOCS = [
  { id: 'D001', type: 'International Passport', tier: 1, status: 'Approved', uploadedAt: '2025-04-10', reviewedAt: '2025-04-11' },
  { id: 'D002', type: 'Selfie Verification', tier: 1, status: 'Approved', uploadedAt: '2025-04-10', reviewedAt: '2025-04-11' },
  { id: 'D003', type: 'Proof of Address', tier: 2, status: 'Approved', uploadedAt: '2025-04-12', reviewedAt: '2025-04-13' },
  { id: 'D004', type: 'Source of Funds Declaration', tier: 2, status: 'In Review', uploadedAt: '2025-05-19', reviewedAt: null },
  { id: 'D005', type: 'Certificate of Incorporation', tier: 3, status: 'Pending', uploadedAt: null, reviewedAt: null },
];

const DOC_STYLES: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  'Approved': { bg: 'rgba(5,150,105,0.1)', color: '#047857', icon: <CheckCircle2 size={13} /> },
  'In Review': { bg: 'rgba(245,158,11,0.1)', color: '#D97706', icon: <Clock size={13} /> },
  'Pending': { bg: 'rgba(136,136,128,0.1)', color: '#888880', icon: <Upload size={13} /> },
  'Rejected': { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <X size={13} /> },
  'AI Rejected': { bg: 'rgba(239,68,68,0.08)', color: '#DC2626', icon: <AlertCircle size={13} /> },
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
  const currentTier = 2;
  const approvedDocs = USER_DOCS.filter(d => d.status === 'Approved').length;
  const inReviewDocs = USER_DOCS.filter(d => d.status === 'In Review').length;

  return (
    <div className="space-y-6 max-w-[1000px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>KYC / Compliance</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
          Step 1 — Identity verification and regulatory compliance for commodity trading
        </p>
      </div>

      {/* KYC Status Banner */}
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
                style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                {kycStatus}
              </span>
            </div>
            <p className="text-sm" style={{ color: '#888880' }}>
              You are currently at <strong style={{ color: '#1A1A1A' }}>Tier {currentTier}</strong>.
              Complete Tier 3 corporate documents to unlock full consignment submission and escrow access.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs" style={{ color: '#888880' }}>Documents</p>
            <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{approvedDocs}/{USER_DOCS.length}</p>
            <p className="text-xs" style={{ color: '#059669' }}>approved</p>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="mt-5 flex items-center gap-0">
          {TIER_INFO.map((t, i) => (
            <React.Fragment key={t.tier}>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={t.tier <= currentTier
                    ? { background: '#C73B22', color: '#fff' }
                    : { background: '#E8E2DC', color: '#888880' }}>
                  {t.tier <= currentTier ? <CheckCircle2 size={16} /> : t.tier}
                </div>
                <p className="text-[10px] font-semibold mt-1 whitespace-nowrap"
                  style={{ color: t.tier <= currentTier ? '#C73B22' : '#888880' }}>
                  Tier {t.tier}
                </p>
              </div>
              {i < TIER_INFO.length - 1 && (
                <div className="flex-1 h-0.5 mx-2"
                  style={{ background: t.tier < currentTier ? '#C73B22' : '#E8E2DC' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Tier Cards */}
      <div className="space-y-4">
        {TIER_INFO.map(tier => {
          const tierDocs = USER_DOCS.filter(d => d.tier === tier.tier);
          const isUnlocked = tier.tier <= currentTier + 1;
          const isComplete = tier.tier < currentTier;

          return (
            <div key={tier.tier} className="rounded-2xl bg-white overflow-hidden"
              style={{ border: `1px solid ${isComplete ? 'rgba(5,150,105,0.2)' : '#E8E2DC'}` }}>
              <div className="p-5" style={{ borderBottom: '1px solid #F0EBE6' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                      style={isComplete
                        ? { background: 'rgba(5,150,105,0.1)', color: '#059669' }
                        : tier.tier === currentTier + 1
                          ? { background: 'rgba(199,59,34,0.08)', color: '#C73B22' }
                          : { background: '#F0EBE6', color: '#888880' }}>
                      {isComplete ? <CheckCircle2 size={15} /> : tier.tier}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#1A1A1A' }}>{tier.label}</p>
                      <p className="text-xs" style={{ color: '#888880' }}>Trade limit: <strong>{tier.maxTrade}</strong></p>
                    </div>
                  </div>
                  {isComplete && <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>✓ Verified</span>}
                  {!isUnlocked && <span className="flex items-center gap-1 text-xs" style={{ color: '#B0AAA4' }}>
                    <Lock size={12} /> Complete Tier {tier.tier - 1} first
                  </span>}
                </div>
                <p className="text-xs mt-2" style={{ color: '#888880' }}>{tier.desc}</p>
              </div>

              <div className="p-5 space-y-2.5">
                {tier.docs.map((docName, di) => {
                  const doc = USER_DOCS.find(d => d.type === docName);
                  const docStatus = doc?.status || 'Pending';
                  return (
                    <div key={di} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: '#FAFAF8', border: '1px solid #F0EBE6' }}>
                      <div className="flex items-center gap-2.5">
                        <FileText size={14} style={{ color: '#B0AAA4' }} />
                        <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{docName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {doc?.uploadedAt && (
                          <span className="text-xs" style={{ color: '#B0AAA4' }}>{doc.uploadedAt}</span>
                        )}
                        <DocStatus status={docStatus} />
                        {(docStatus === 'Pending' || docStatus === 'Rejected') && isUnlocked && (
                          <button
                            onClick={() => { setUploadDocType(docName); setShowUpload(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90"
                            style={{ background: '#C73B22' }}>
                            <Upload size={12} /> Upload
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
            style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>Clear</span>
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
