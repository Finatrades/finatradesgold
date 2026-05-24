import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Star, Globe, Calendar, Briefcase, TrendingUp } from 'lucide-react';
import TierBadge from './TierBadge';
import AchievementBadgeList, { type AchievementBadge } from './AchievementBadgeList';

export interface Counterparty {
  finatradesId: string | null;
  displayId: string;
  kycStatus: string;
  kycType: 'corporate' | 'personal' | 'none';
  memberSince: string | null;
  completedTrades: number;
  ratingAvg: number | null;
  ratingCount: number;
  country: string | null;
  userType: string | null;
  tier?: string | null;
}

interface ReputationInfo {
  tier: string;
  pendingTier: string | null;
  badges: AchievementBadge[];
  leaderboardRank?: number | null;
}

interface ReviewSnippet {
  rating: number;
  text: string | null;
  createdAt: string;
  reviewerDisplayId: string;
}

interface Props {
  counterparty: Counterparty;
  onClose: () => void;
}

export default function FtIdDetailSheet({ counterparty, onClose }: Props) {
  const [reviews, setReviews] = useState<ReviewSnippet[] | null>(null);
  const [reputation, setReputation] = useState<ReputationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/finatrades-id/${encodeURIComponent(counterparty.displayId)}`, { credentials: 'include' });
        if (!r.ok) { if (!cancelled) { setReviews([]); } return; }
        const j = await r.json();
        if (!cancelled) {
          setReviews(j.reviews ?? []);
          if (j.reputation) {
            setReputation({
              tier: j.reputation.tier,
              pendingTier: j.reputation.pendingTier,
              badges: j.reputation.badges ?? [],
              leaderboardRank: j.leaderboardRank ?? null,
            });
          }
        }
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [counterparty.displayId]);

  const kycLabel = counterparty.kycStatus === 'Approved'
    ? `KYC verified (${counterparty.kycType === 'corporate' ? 'Corporate' : counterparty.kycType === 'personal' ? 'Personal' : 'KYC'})`
    : counterparty.kycStatus;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="ftid-detail-sheet"
      >
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: '#E8E2DC' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#888880' }}>Finatrades ID</p>
            <p className="text-xl font-bold font-mono mt-1" style={{ color: '#C73B22' }}>{counterparty.displayId}</p>
            <p className="text-xs mt-1" style={{ color: '#888880' }}>
              Real identity is sealed until both parties consent at settlement.
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <TierBadge tier={(reputation?.tier ?? counterparty.tier) as any} size="sm" />
              {reputation?.leaderboardRank != null && reputation.leaderboardRank <= 100 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold"
                  style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22', border: '1px solid rgba(199,59,34,0.18)', padding: '3px 8px' }}
                >
                  <TrendingUp size={11} /> #{reputation.leaderboardRank} leaderboard
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              icon={<ShieldCheck size={16} style={{ color: counterparty.kycStatus === 'Approved' ? '#059669' : '#888880' }} />}
              label="Compliance"
              value={kycLabel}
            />
            <Stat
              icon={<Briefcase size={16} style={{ color: '#1A1A1A' }} />}
              label="Completed trades"
              value={String(counterparty.completedTrades)}
            />
            <Stat
              icon={<Star size={16} style={{ color: '#D4AF37', fill: counterparty.ratingAvg ? '#D4AF37' : 'transparent' }} />}
              label="Rating"
              value={counterparty.ratingAvg != null
                ? `${counterparty.ratingAvg.toFixed(1)} / 5 (${counterparty.ratingCount})`
                : 'No reviews yet'}
            />
            <Stat
              icon={<Calendar size={16} style={{ color: '#1A1A1A' }} />}
              label="Member since"
              value={counterparty.memberSince
                ? new Date(counterparty.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                : '—'}
            />
            {counterparty.country && (
              <Stat
                icon={<Globe size={16} style={{ color: '#1A1A1A' }} />}
                label="Country"
                value={counterparty.country}
              />
            )}
            {counterparty.userType && (
              <Stat
                icon={<Briefcase size={16} style={{ color: '#1A1A1A' }} />}
                label="Role"
                value={counterparty.userType[0].toUpperCase() + counterparty.userType.slice(1)}
              />
            )}
          </div>

          {reputation && reputation.badges.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#888880' }}>Achievements</p>
              <AchievementBadgeList badges={reputation.badges} />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#888880' }}>Recent reviews</p>
            {loading && <p className="text-sm" style={{ color: '#888880' }}>Loading…</p>}
            {!loading && reviews && reviews.length === 0 && (
              <p className="text-sm" style={{ color: '#888880' }}>No reviews yet.</p>
            )}
            {!loading && reviews && reviews.length > 0 && (
              <ul className="space-y-2">
                {reviews.map((r, i) => (
                  <li key={i} className="p-3 rounded-lg" style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#D4AF37' }}>
                        <Star size={11} style={{ fill: '#D4AF37' }} /> {r.rating}/5
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: '#888880' }}>{r.reviewerDisplayId}</span>
                    </div>
                    {r.text && <p className="text-sm" style={{ color: '#1A1A1A' }}>{r.text}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: '#888880' }}>{label}</p>
      </div>
      <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{value}</p>
    </div>
  );
}
