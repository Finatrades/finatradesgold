import React, { useState } from 'react';
import {
  Shield, Clock, CheckCircle2, AlertCircle, X, ChevronRight,
  Lock, Unlock, FileText, DollarSign, ExternalLink, Info,
} from 'lucide-react';

const MOCK_ESCROWS = [
  {
    id: 'ESC-2025-001',
    ref: 'FT-ESC-2025-001',
    orderId: 'FT-ORD-2025-001',
    commodity: 'Cocoa Beans — 100 MT',
    buyer: 'You',
    seller: 'AgriExport Co.',
    amount: 245000,
    currency: 'FUSD',
    status: 'Pending Funding',
    funded: null,
    released: null,
    conditions: [
      { label: 'Warehouse Receipt Issued', met: true },
      { label: 'Quality Inspection Passed', met: true },
      { label: 'Buyer Funding Confirmed', met: false },
      { label: 'Delivery Confirmed by Buyer', met: false },
    ],
    createdDate: '2025-05-20',
  },
  {
    id: 'ESC-2025-000',
    ref: 'FT-ESC-2025-000',
    orderId: 'FT-ORD-2025-000',
    commodity: 'Cocoa Beans — 100 MT',
    buyer: 'You',
    seller: 'AgriExport Co.',
    amount: 240000,
    currency: 'FUSD',
    status: 'Released',
    funded: '2025-05-06',
    released: '2025-05-18',
    conditions: [
      { label: 'Warehouse Receipt Issued', met: true },
      { label: 'Quality Inspection Passed', met: true },
      { label: 'Buyer Funding Confirmed', met: true },
      { label: 'Delivery Confirmed by Buyer', met: true },
    ],
    createdDate: '2025-05-05',
  },
];

const STATUS_STYLES: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  'Pending Funding': { bg: 'rgba(245,158,11,0.1)', color: '#D97706', icon: <Clock size={13} /> },
  'Funded': { bg: 'rgba(59,130,246,0.1)', color: '#2563EB', icon: <Lock size={13} /> },
  'Active': { bg: 'rgba(139,92,246,0.1)', color: '#7C3AED', icon: <Shield size={13} /> },
  'Conditions Met': { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle2 size={13} /> },
  'Released': { bg: 'rgba(5,150,105,0.12)', color: '#047857', icon: <Unlock size={13} /> },
  'Disputed': { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <AlertCircle size={13} /> },
  'Refunded': { bg: 'rgba(136,136,128,0.1)', color: '#888880', icon: <X size={13} /> },
};

function EscrowCard({ escrow }: { escrow: typeof MOCK_ESCROWS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_STYLES[escrow.status] || STATUS_STYLES['Pending Funding'];
  const metCount = escrow.conditions.filter(c => c.met).length;
  const progress = (metCount / escrow.conditions.length) * 100;

  return (
    <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold" style={{ color: '#C73B22' }}>{escrow.ref}</span>
              <span className="text-xs" style={{ color: '#B0AAA4' }}>·</span>
              <span className="text-xs" style={{ color: '#B0AAA4' }}>Order {escrow.orderId}</span>
            </div>
            <p className="font-semibold" style={{ color: '#1A1A1A' }}>{escrow.commodity}</p>
            <p className="text-xs mt-0.5" style={{ color: '#888880' }}>
              Buyer: {escrow.buyer} · Seller: {escrow.seller}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: s.bg, color: s.color }}>
              {s.icon} {escrow.status}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-6 mb-4">
          <div>
            <p className="text-xs" style={{ color: '#888880' }}>Escrow Amount</p>
            <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
              {escrow.currency} {escrow.amount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: '#888880' }}>Created</p>
            <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{escrow.createdDate}</p>
          </div>
          {escrow.funded && (
            <div>
              <p className="text-xs" style={{ color: '#888880' }}>Funded</p>
              <p className="font-semibold text-sm" style={{ color: '#059669' }}>{escrow.funded}</p>
            </div>
          )}
          {escrow.released && (
            <div>
              <p className="text-xs" style={{ color: '#888880' }}>Released</p>
              <p className="font-semibold text-sm" style={{ color: '#047857' }}>{escrow.released}</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold" style={{ color: '#888880' }}>Release Conditions</p>
            <p className="text-xs font-semibold" style={{ color: metCount === escrow.conditions.length ? '#059669' : '#888880' }}>
              {metCount}/{escrow.conditions.length} met
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E8E2DC' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: progress === 100 ? '#059669' : '#C73B22' }} />
          </div>
        </div>

        {/* Conditions (collapsible) */}
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold mt-1 flex items-center gap-1 hover:underline"
          style={{ color: '#C73B22' }}>
          {expanded ? 'Hide' : 'View'} conditions
          <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {escrow.conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg"
                style={{ background: cond.met ? 'rgba(5,150,105,0.06)' : '#FAFAF8', border: '1px solid', borderColor: cond.met ? 'rgba(5,150,105,0.15)' : '#E8E2DC' }}>
                {cond.met
                  ? <CheckCircle2 size={15} style={{ color: '#059669' }} />
                  : <Clock size={15} style={{ color: '#B0AAA4' }} />}
                <p className="text-sm font-medium" style={{ color: cond.met ? '#059669' : '#888880' }}>{cond.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Actions */}
      {escrow.status !== 'Released' && escrow.status !== 'Refunded' && (
        <div className="px-5 pb-5 flex items-center gap-2">
          {escrow.status === 'Pending Funding' && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
              style={{ background: '#C73B22' }}>
              <DollarSign size={14} /> Fund Escrow
            </button>
          )}
          {['Funded', 'Active', 'Conditions Met'].includes(escrow.status) && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
              style={{ background: '#059669' }}>
              <Unlock size={14} /> Release Funds
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F0EBE6]"
            style={{ border: '1px solid #E8E2DC', color: '#888880' }}>
            <AlertCircle size={14} /> Raise Dispute
          </button>
          <button className="ml-auto flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: '#888880' }}>
            <FileText size={13} /> View Contract
          </button>
        </div>
      )}
    </div>
  );
}

export default function Escrow() {
  const stats = {
    pending: MOCK_ESCROWS.filter(e => e.status === 'Pending Funding').length,
    active: MOCK_ESCROWS.filter(e => ['Funded', 'Active'].includes(e.status)).length,
    released: MOCK_ESCROWS.filter(e => e.status === 'Released').length,
    totalLocked: MOCK_ESCROWS
      .filter(e => !['Released', 'Refunded'].includes(e.status))
      .reduce((s, e) => s + e.amount, 0),
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Escrow & Settlement</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
            Step 8 — FUSD-backed escrow ensures secure, condition-based trade settlement
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.15)', color: '#C73B22' }}>
          <Shield size={14} /> FUSD-Secured
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>FUSD {(stats.totalLocked / 1000).toFixed(0)}K</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Total Locked</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#C73B22' }}>In escrow</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.pending}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Pending Funding</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#D97706' }}>Requires funding</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.active}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Active Escrows</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#2563EB' }}>In progress</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.released}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Released</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#059669' }}>Successfully settled</p>
        </div>
      </div>

      {/* FUSD info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: 'rgba(199,59,34,0.04)', border: '1px solid rgba(199,59,34,0.12)' }}>
        <Info size={16} style={{ color: '#C73B22', marginTop: 1, flexShrink: 0 }} />
        <div className="text-xs" style={{ color: '#888880' }}>
          <strong style={{ color: '#1A1A1A' }}>FUSD (Finatrades USD)</strong> is a platform-internal reference valuation unit pegged 1:1 to USD. Escrow funds are held in a segregated account and released only when all conditions are verified by the Finatrades Settlement Engine. Real settlement is processed via WINVESTNET.
        </div>
      </div>

      {/* Escrow Cards */}
      <div className="space-y-4">
        {MOCK_ESCROWS.map(e => <EscrowCard key={e.id} escrow={e} />)}
        {MOCK_ESCROWS.length === 0 && (
          <div className="flex flex-col items-center py-16 rounded-2xl bg-white" style={{ border: '1px solid #E8E2DC' }}>
            <Shield size={36} style={{ color: '#E8E2DC' }} />
            <p className="text-sm font-medium mt-3" style={{ color: '#B0AAA4' }}>No escrow holds yet</p>
            <p className="text-xs mt-1" style={{ color: '#B0AAA4' }}>Escrow is created automatically when a trade order is confirmed</p>
          </div>
        )}
      </div>
    </div>
  );
}
