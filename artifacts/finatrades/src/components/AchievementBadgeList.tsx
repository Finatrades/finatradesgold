import React from 'react';
import {
  Award, Rocket, Medal, Truck, Zap, Shield, Globe, Star,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  rocket: Rocket, medal: Medal, truck: Truck, zap: Zap, shield: Shield, globe: Globe, star: Star,
};

export interface AchievementBadge {
  slug: string;
  label: string;
  description: string | null;
  icon: string | null;
  earnedAt: string;
  source: string;
}

export default function AchievementBadgeList({ badges }: { badges: AchievementBadge[] }) {
  if (!badges || badges.length === 0) {
    return <p className="text-sm" style={{ color: '#888880' }}>No badges yet — complete trades and earn 5-star reviews to unlock achievements.</p>;
  }
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="achievement-badge-list">
      {badges.map(b => {
        const Icon = (b.icon && ICONS[b.icon]) || Award;
        return (
          <li
            key={b.slug}
            className="p-3 rounded-lg flex flex-col gap-1"
            style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}
            title={b.description || b.label}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width: 28, height: 28,
                  background: 'rgba(212,175,55,0.15)',
                  color: '#9C7B14',
                }}
              >
                <Icon size={14} />
              </span>
              <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{b.label}</span>
            </div>
            {b.description && (
              <p className="text-[11px]" style={{ color: '#666' }}>{b.description}</p>
            )}
            <p className="text-[10px] mt-auto" style={{ color: '#888880' }}>
              {new Date(b.earnedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {b.source === 'manual' && ' • admin granted'}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
