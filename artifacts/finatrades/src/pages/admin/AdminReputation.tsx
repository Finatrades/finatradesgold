import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import DashboardLayout from '@/components/DashboardLayout';
import TierBadge from '@/components/TierBadge';
import { Award, Plus, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserRow {
  userId: string;
  displayId: string;
  email: string;
  userType: string;
  country: string | null;
  completedTrades: number;
  ratingAvg: number | null;
  tier: string;
  pendingTier: string | null;
  pendingDemotionAt: string | null;
  manualOverrideTier: string | null;
  manualOverrideReason: string | null;
  computedAt: string | null;
}

interface BadgeRule { slug: string; label: string; description: string | null; icon: string | null; }

const TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;

export default function AdminReputation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const list = useQuery({
    queryKey: ['/api/admin/reputation/users', filter],
    queryFn: async () => {
      const url = filter ? `/api/admin/reputation/users?tier=${filter}` : '/api/admin/reputation/users';
      const r = await apiRequest('GET', url);
      const j = await r.json();
      return j.users as UserRow[];
    },
  });

  const rules = useQuery({
    queryKey: ['/api/admin/reputation/rules'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/admin/reputation/rules');
      const j = await r.json();
      return j as { tierRules: any[]; badgeRules: BadgeRule[] };
    },
  });

  const recompute = useMutation({
    mutationFn: async (userId: string) => {
      const r = await apiRequest('POST', `/api/admin/reputation/users/${userId}/recompute`, {});
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Recomputed' });
      qc.invalidateQueries({ queryKey: ['/api/admin/reputation/users'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Trader Reputation & Gamification</h1>
          <p className="text-sm" style={{ color: '#888880' }}>
            Manage trader tiers, grant or revoke achievement badges, and recompute reputation snapshots. All changes are audit-logged.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className="px-3 py-1.5 text-sm rounded-lg font-semibold"
            style={{ background: filter === '' ? '#C73B22' : '#FAFAF8', color: filter === '' ? '#FFF' : '#1A1A1A', border: '1px solid #E8E2DC' }}
          >All tiers</button>
          {TIERS.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="px-3 py-1.5 text-sm rounded-lg font-semibold"
              style={{ background: filter === t ? '#C73B22' : '#FAFAF8', color: filter === t ? '#FFF' : '#1A1A1A', border: '1px solid #E8E2DC' }}
            >{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFF', border: '1px solid #E8E2DC' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#FAFAF8' }}>
              <tr>
                <th className="text-left p-3 font-semibold">FT-ID</th>
                <th className="text-left p-3 font-semibold">Tier</th>
                <th className="text-left p-3 font-semibold">Type</th>
                <th className="text-right p-3 font-semibold">Trades</th>
                <th className="text-right p-3 font-semibold">Rating</th>
                <th className="text-left p-3 font-semibold">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && <tr><td className="p-4 text-center" colSpan={7} style={{ color: '#888880' }}>Loading…</td></tr>}
              {list.data?.map(u => (
                <tr key={u.userId} className="border-t" style={{ borderColor: '#E8E2DC' }}>
                  <td className="p-3 font-mono text-xs" style={{ color: '#C73B22' }}>{u.displayId}</td>
                  <td className="p-3"><TierBadge tier={u.tier as any} size="xs" /></td>
                  <td className="p-3 text-xs">{u.userType}</td>
                  <td className="p-3 text-right">{u.completedTrades}</td>
                  <td className="p-3 text-right">{u.ratingAvg != null ? u.ratingAvg.toFixed(1) : '—'}</td>
                  <td className="p-3 text-xs">
                    {u.manualOverrideTier && <span style={{ color: '#C73B22' }}>Manual: {u.manualOverrideTier}</span>}
                    {u.pendingTier && (
                      <span style={{ color: '#888880' }}>
                        Pending → {u.pendingTier} {u.pendingDemotionAt && `(${new Date(u.pendingDemotionAt).toLocaleDateString()})`}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => recompute.mutate(u.userId)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-semibold"
                      style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}
                      disabled={recompute.isPending}
                    >
                      <RefreshCw size={11} /> Recompute
                    </button>
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="px-2 py-1 text-xs rounded font-semibold"
                      style={{ background: '#C73B22', color: '#FFF' }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {list.data && list.data.length === 0 && (
                <tr><td className="p-4 text-center" colSpan={7} style={{ color: '#888880' }}>No users match.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {rules.data && (
          <div className="rounded-2xl p-5" style={{ background: '#FFF', border: '1px solid #E8E2DC' }}>
            <h2 className="font-bold mb-2">Tier thresholds (read-only)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {rules.data.tierRules.map((r: any) => (
                <div key={r.tier} className="p-2 rounded" style={{ background: '#FAFAF8' }}>
                  <TierBadge tier={r.tier as any} size="xs" />
                  <span className="ml-2">≥{r.minTrades} trades · rating ≥{r.minRating} · ≤{(r.maxDisputeRateBps / 100).toFixed(2)}% disputes · ≥{r.minCommodityCategories} categories</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedUser && rules.data && (
        <ManageUserModal
          user={selectedUser}
          badgeRules={rules.data.badgeRules}
          onClose={() => {
            setSelectedUser(null);
            qc.invalidateQueries({ queryKey: ['/api/admin/reputation/users'] });
          }}
        />
      )}
    </DashboardLayout>
  );
}

function ManageUserModal({
  user, badgeRules, onClose,
}: { user: UserRow; badgeRules: BadgeRule[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [grantSlug, setGrantSlug] = useState(badgeRules[0]?.slug ?? '');
  const [grantReason, setGrantReason] = useState('');
  const [overrideTier, setOverrideTier] = useState<string>(user.manualOverrideTier ?? '');
  const [overrideReason, setOverrideReason] = useState('');

  const detail = useQuery({
    queryKey: ['/api/admin/reputation/users', user.userId, 'detail'],
    queryFn: async () => {
      const r = await apiRequest('GET', `/api/admin/reputation/users/${user.userId}`);
      return r.json();
    },
  });

  const grant = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', `/api/admin/reputation/users/${user.userId}/badges`, { badgeSlug: grantSlug, reason: grantReason });
      return r.json();
    },
    onSuccess: () => { toast({ title: 'Badge granted' }); setGrantReason(''); detail.refetch(); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const revoke = useMutation({
    mutationFn: async ({ slug, reason }: { slug: string; reason: string }) => {
      const r = await apiRequest('DELETE', `/api/admin/reputation/users/${user.userId}/badges/${slug}`, { reason });
      return r.json();
    },
    onSuccess: () => { toast({ title: 'Badge revoked' }); detail.refetch(); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const setTier = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', `/api/admin/reputation/users/${user.userId}/tier-override`, {
        tier: overrideTier || null,
        reason: overrideReason,
      });
      return r.json();
    },
    onSuccess: () => { toast({ title: 'Tier updated' }); setOverrideReason(''); qc.invalidateQueries({ queryKey: ['/api/admin/reputation/users'] }); detail.refetch(); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#E8E2DC' }}>
          <div>
            <p className="text-xs uppercase font-semibold" style={{ color: '#888880' }}>Manage reputation</p>
            <p className="font-mono font-bold" style={{ color: '#C73B22' }}>{user.displayId}</p>
          </div>
          <button onClick={onClose} aria-label="Close"><X /></button>
        </div>

        <div className="p-5 space-y-5">
          <section>
            <h3 className="font-bold mb-2 text-sm">Tier override</h3>
            <p className="text-xs mb-2" style={{ color: '#888880' }}>
              Current: <TierBadge tier={user.tier as any} size="xs" />. Manual override always wins over the computed tier.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={overrideTier}
                onChange={(e) => setOverrideTier(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                style={{ borderColor: '#E8E2DC' }}
              >
                <option value="">— Clear override (use computed) —</option>
                {TIERS.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </select>
              <input
                placeholder="Reason (required, audit-logged)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-sm"
                style={{ borderColor: '#E8E2DC' }}
              />
              <button
                onClick={() => setTier.mutate()}
                disabled={!overrideReason || setTier.isPending}
                className="px-3 py-1 text-sm font-semibold rounded"
                style={{ background: '#C73B22', color: '#FFF', opacity: !overrideReason ? 0.5 : 1 }}
              >
                Save
              </button>
            </div>
          </section>

          <section>
            <h3 className="font-bold mb-2 text-sm">Grant badge</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={grantSlug}
                onChange={(e) => setGrantSlug(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                style={{ borderColor: '#E8E2DC' }}
              >
                {badgeRules.map(b => <option key={b.slug} value={b.slug}>{b.label}</option>)}
              </select>
              <input
                placeholder="Reason (required, audit-logged)"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-sm"
                style={{ borderColor: '#E8E2DC' }}
              />
              <button
                onClick={() => grant.mutate()}
                disabled={!grantReason || !grantSlug || grant.isPending}
                className="px-3 py-1 text-sm font-semibold rounded inline-flex items-center gap-1"
                style={{ background: '#C73B22', color: '#FFF', opacity: !grantReason ? 0.5 : 1 }}
              >
                <Plus size={12} /> Grant
              </button>
            </div>
          </section>

          <section>
            <h3 className="font-bold mb-2 text-sm">Current badges</h3>
            {detail.data?.badges?.length === 0 && <p className="text-xs" style={{ color: '#888880' }}>None.</p>}
            <ul className="space-y-1.5">
              {detail.data?.badges?.map((b: any) => (
                <li key={b.slug} className="flex items-center gap-2 p-2 rounded text-sm" style={{ background: '#FAFAF8' }}>
                  <Award size={14} style={{ color: '#9C7B14' }} />
                  <span className="font-semibold">{b.label}</span>
                  <span className="text-[11px]" style={{ color: '#888880' }}>{b.source}</span>
                  <button
                    onClick={() => {
                      const r = window.prompt(`Revoke "${b.label}"? Reason:`);
                      if (r && r.trim()) revoke.mutate({ slug: b.slug, reason: r.trim() });
                    }}
                    className="ml-auto text-[11px] underline"
                    style={{ color: '#C73B22' }}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {detail.data?.metricsSnapshot && (
            <section>
              <h3 className="font-bold mb-2 text-sm">Latest metrics snapshot</h3>
              <pre className="text-[11px] p-2 rounded overflow-x-auto" style={{ background: '#FAFAF8', color: '#1A1A1A' }}>
                {JSON.stringify(detail.data.metricsSnapshot, null, 2)}
              </pre>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
