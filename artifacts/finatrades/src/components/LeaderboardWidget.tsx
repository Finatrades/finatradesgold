import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import TierBadge from './TierBadge';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayId: string;
  country: string | null;
  completedTrades: number;
  ratingAvg: number | null;
  tier: string;
}

export default function LeaderboardWidget({ defaultType = 'exporter' as 'exporter' | 'importer' }: { defaultType?: 'exporter' | 'importer' }) {
  const [type, setType] = useState<'exporter' | 'importer'>(defaultType);
  const q = useQuery({
    queryKey: ['/api/leaderboard', type],
    queryFn: async () => {
      const r = await fetch(`/api/leaderboard?type=${type}`);
      if (!r.ok) throw new Error('Failed to load leaderboard');
      const j = await r.json();
      return j.entries as LeaderboardEntry[];
    },
  });

  return (
    <div className="rounded-2xl p-5" style={{ background: '#FFF', border: '1px solid #E8E2DC' }} data-testid="leaderboard-widget">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} style={{ color: '#C73B22' }} />
          <h3 className="font-bold" style={{ color: '#1A1A1A' }}>Top traders this month</h3>
        </div>
        <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
          {(['exporter', 'importer'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="px-3 py-1 text-xs font-semibold transition-colors"
              style={{
                background: type === t ? '#C73B22' : '#FAFAF8',
                color: type === t ? '#FFF' : '#1A1A1A',
              }}
              data-testid={`leaderboard-tab-${t}`}
            >
              {t[0].toUpperCase() + t.slice(1)}s
            </button>
          ))}
        </div>
      </div>
      {q.isLoading && <p className="text-sm" style={{ color: '#888880' }}>Loading…</p>}
      {q.isError && <p className="text-sm" style={{ color: '#C73B22' }}>Could not load leaderboard.</p>}
      {q.data && q.data.length === 0 && <p className="text-sm" style={{ color: '#888880' }}>No traders yet — be the first.</p>}
      {q.data && q.data.length > 0 && (
        <ol className="space-y-1.5">
          {q.data.slice(0, 10).map(e => (
            <li
              key={e.userId}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ background: e.rank <= 3 ? 'rgba(199,59,34,0.04)' : 'transparent' }}
            >
              <span className="w-7 text-center font-bold text-sm" style={{ color: e.rank <= 3 ? '#C73B22' : '#888880' }}>
                {e.rank}
              </span>
              <a
                href={`/u/${encodeURIComponent(e.displayId)}`}
                className="font-mono text-sm font-semibold hover:underline"
                style={{ color: '#C73B22' }}
              >
                {e.displayId}
              </a>
              <TierBadge tier={e.tier as any} size="xs" showLabel={false} />
              {e.country && <span className="text-[11px]" style={{ color: '#888880' }}>{e.country}</span>}
              <span className="ml-auto text-xs" style={{ color: '#1A1A1A' }}>
                {e.completedTrades} trades
                {e.ratingAvg != null && <span style={{ color: '#888880' }}> • {e.ratingAvg.toFixed(1)}★</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
