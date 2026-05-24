import React, { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Star, Briefcase, Globe, Calendar, TrendingUp } from 'lucide-react';
import TierBadge from '@/components/TierBadge';
import AchievementBadgeList, { type AchievementBadge } from '@/components/AchievementBadgeList';

interface Counterparty {
  displayId: string;
  kycStatus: string;
  kycType: string;
  memberSince: string | null;
  completedTrades: number;
  ratingAvg: number | null;
  ratingCount: number;
  country: string | null;
  userType: string | null;
}
interface Reputation {
  tier: string;
  pendingTier: string | null;
  badges: AchievementBadge[];
  metricsSnapshot?: any;
}
interface Review {
  rating: number;
  text: string | null;
  createdAt: string;
  reviewerDisplayId: string;
}
interface Payload {
  counterparty: Counterparty;
  reviews: Review[];
  reputation: Reputation;
  leaderboardRank: number | null;
}

export default function PublicReputationProfile() {
  const [, params] = useRoute<{ ftId: string }>('/u/:ftId');
  const ftId = params?.ftId ?? '';
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!ftId) return;
    (async () => {
      try {
        const r = await fetch(`/api/finatrades-id/${encodeURIComponent(ftId)}`);
        if (!r.ok) {
          if (!cancelled) setError(r.status === 404 ? 'Finatrades ID not found.' : 'Could not load profile.');
          return;
        }
        const j = await r.json();
        if (!cancelled) setData(j);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ftId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
      <p className="text-sm" style={{ color: '#888880' }}>Loading reputation profile…</p>
    </div>;
  }
  if (error || !data) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
      <p className="text-sm" style={{ color: '#888880' }}>{error || 'Not found'}</p>
    </div>;
  }

  const { counterparty, reputation, reviews, leaderboardRank } = data;

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <Helmet>
        <title>{counterparty.displayId} — Finatrades Reputation</title>
        <meta name="description" content={`Reputation profile for verified Finatrades trader ${counterparty.displayId}.`} />
      </Helmet>

      <header className="border-b" style={{ background: '#FFF', borderColor: '#E8E2DC' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-bold tracking-tight" style={{ color: '#C73B22' }}>Finatrades</a>
          <span className="text-xs" style={{ color: '#888880' }}>Public reputation profile</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <section className="p-6 rounded-2xl" style={{ background: '#FFF', border: '1px solid #E8E2DC' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>Finatrades ID</p>
          <h1 className="text-3xl font-bold font-mono mt-1" style={{ color: '#C73B22' }}>{counterparty.displayId}</h1>
          <p className="text-xs mt-2" style={{ color: '#888880' }}>
            Verified trader. Real identity stays sealed until a trade is settled and both parties consent.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <TierBadge tier={reputation.tier as any} size="md" />
            {leaderboardRank != null && leaderboardRank <= 100 && (
              <span
                className="inline-flex items-center gap-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22', border: '1px solid rgba(199,59,34,0.18)', padding: '4px 10px' }}
              >
                <TrendingUp size={12} /> #{leaderboardRank} on the leaderboard
              </span>
            )}
            {reputation.pendingTier && (
              <span className="text-[11px] italic" style={{ color: '#888880' }}>
                Pending tier change to {reputation.pendingTier}
              </span>
            )}
          </div>
        </section>

        <section className="p-6 rounded-2xl" style={{ background: '#FFF', border: '1px solid #E8E2DC' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#888880' }}>At a glance</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={<ShieldCheck size={14} style={{ color: counterparty.kycStatus === 'Approved' ? '#059669' : '#888880' }} />} label="Compliance" value={counterparty.kycStatus} />
            <Stat icon={<Briefcase size={14} />} label="Completed trades" value={String(counterparty.completedTrades)} />
            <Stat
              icon={<Star size={14} style={{ color: '#D4AF37', fill: counterparty.ratingAvg ? '#D4AF37' : 'transparent' }} />}
              label="Rating"
              value={counterparty.ratingAvg != null ? `${counterparty.ratingAvg.toFixed(1)}/5 (${counterparty.ratingCount})` : '—'}
            />
            <Stat
              icon={<Calendar size={14} />}
              label="Member since"
              value={counterparty.memberSince ? new Date(counterparty.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '—'}
            />
            {counterparty.country && <Stat icon={<Globe size={14} />} label="Country" value={counterparty.country} />}
            {counterparty.userType && <Stat icon={<Briefcase size={14} />} label="Role" value={counterparty.userType[0].toUpperCase() + counterparty.userType.slice(1)} />}
          </div>
        </section>

        <section className="p-6 rounded-2xl" style={{ background: '#FFF', border: '1px solid #E8E2DC' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#888880' }}>Achievements</p>
          <AchievementBadgeList badges={reputation.badges} />
        </section>

        <section className="p-6 rounded-2xl" style={{ background: '#FFF', border: '1px solid #E8E2DC' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#888880' }}>Recent reviews</p>
          {reviews.length === 0 ? (
            <p className="text-sm" style={{ color: '#888880' }}>No reviews yet.</p>
          ) : (
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
        </section>
      </main>
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
