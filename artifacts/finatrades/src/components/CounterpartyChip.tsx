import React, { useState } from 'react';
import { ShieldCheck, Star, Info } from 'lucide-react';
import FtIdDetailSheet, { type Counterparty } from './FtIdDetailSheet';

export interface CounterpartyChipProps {
  counterparty: Counterparty | null | undefined;
  /** Fallback FT-ID string when no full snapshot is available. */
  fallbackFtId?: string | null;
  size?: 'sm' | 'md';
  showRating?: boolean;
}

/**
 * Anonymised counterparty pill. Shows ONLY FT-ID, KYC badge, and optional
 * rating. Click to open the detail sheet (member-since, completed trades,
 * recent reviews). Never renders real name / email / phone / company.
 */
export default function CounterpartyChip({
  counterparty,
  fallbackFtId,
  size = 'md',
  showRating = true,
}: CounterpartyChipProps) {
  const [open, setOpen] = useState(false);
  const displayId = counterparty?.displayId || fallbackFtId || 'Verified Counterparty';
  const kycApproved = counterparty?.kycStatus === 'Approved';
  const rating = counterparty?.ratingAvg;
  const ratingCount = counterparty?.ratingCount ?? 0;

  const isSm = size === 'sm';
  const padding = isSm ? '4px 8px' : '6px 10px';
  const fontSize = isSm ? 11 : 12;

  return (
    <>
      <button
        type="button"
        onClick={() => counterparty && setOpen(true)}
        disabled={!counterparty}
        className="inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors disabled:cursor-default"
        style={{
          background: 'rgba(199,59,34,0.08)',
          color: '#C73B22',
          border: '1px solid rgba(199,59,34,0.18)',
          padding,
          fontSize,
        }}
        data-testid={`counterparty-chip-${displayId}`}
        aria-label={`Counterparty ${displayId}`}
      >
        <span className="font-mono tracking-tight">{displayId}</span>
        {kycApproved && (
          <span className="inline-flex items-center" title="KYC verified">
            <ShieldCheck size={isSm ? 11 : 13} style={{ color: '#059669' }} />
          </span>
        )}
        {showRating && rating != null && (
          <span className="inline-flex items-center gap-0.5" title={`${rating.toFixed(1)} from ${ratingCount} reviews`}>
            <Star size={isSm ? 10 : 12} style={{ color: '#D4AF37', fill: '#D4AF37' }} />
            <span style={{ color: '#1A1A1A' }}>{rating.toFixed(1)}</span>
            {ratingCount > 0 && (
              <span style={{ color: '#888880', fontWeight: 500 }}>({ratingCount})</span>
            )}
          </span>
        )}
        {counterparty && <Info size={isSm ? 10 : 12} style={{ opacity: 0.6 }} />}
      </button>

      {open && counterparty && (
        <FtIdDetailSheet counterparty={counterparty} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
