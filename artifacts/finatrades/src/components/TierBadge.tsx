import React from 'react';
import { Award } from 'lucide-react';

export type TierSlug = 'bronze' | 'silver' | 'gold' | 'platinum';

const TIER_STYLES: Record<TierSlug, { bg: string; fg: string; border: string; label: string }> = {
  bronze:   { bg: 'rgba(180,120,80,0.10)',  fg: '#8B5E3C', border: 'rgba(180,120,80,0.30)', label: 'Bronze' },
  silver:   { bg: 'rgba(140,140,150,0.12)', fg: '#5C5C66', border: 'rgba(140,140,150,0.30)', label: 'Silver' },
  gold:     { bg: 'rgba(212,175,55,0.12)',  fg: '#9C7B14', border: 'rgba(212,175,55,0.35)', label: 'Gold' },
  platinum: { bg: 'rgba(72,118,186,0.12)',  fg: '#2A5F9E', border: 'rgba(72,118,186,0.35)', label: 'Platinum' },
};

interface Props {
  tier: TierSlug | string | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  title?: string;
}

export default function TierBadge({ tier, size = 'sm', showLabel = true, title }: Props) {
  const slug = (tier as TierSlug) in TIER_STYLES ? (tier as TierSlug) : 'bronze';
  const s = TIER_STYLES[slug];
  const isXs = size === 'xs';
  const isMd = size === 'md';
  const padding = isXs ? '2px 6px' : isMd ? '6px 10px' : '3px 8px';
  const fontSize = isXs ? 10 : isMd ? 13 : 11;
  const iconSize = isXs ? 10 : isMd ? 14 : 12;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-semibold"
      style={{
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        padding,
        fontSize,
        lineHeight: 1.1,
      }}
      title={title || `${s.label} tier`}
      data-testid={`tier-badge-${slug}`}
    >
      <Award size={iconSize} />
      {showLabel && <span>{s.label}</span>}
    </span>
  );
}
