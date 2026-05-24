import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/DashboardLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, ShieldAlert, FileWarning, Banknote, Clock, ExternalLink, Download } from 'lucide-react';

const REDBRICK = '#C73B22';

function isoDateOnly(d: Date): string { return d.toISOString().slice(0, 10); }

interface RiskOverview {
  disputes: { open: number; byPriority: Record<string, number>; avgResolutionDays: number; resolvedCount: number };
  sars: { total: number; byStatus: Record<string, number> };
  sanctionsHits: number;
  largeTransactions: { count: number; thresholdCents: number };
  fraud: { total: number; bySeverity: Record<string, number> };
  withdrawalAnomalies: number;
}

interface RiskAlert {
  kind: 'dispute' | 'sar' | 'fraud' | 'withdrawal';
  id: string;
  ref: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
  deepLink: string;
}

interface RiskAlertsData {
  disputes: RiskAlert[];
  sars: RiskAlert[];
  fraud: RiskAlert[];
  withdrawals: RiskAlert[];
}

const SEVERITY_COLORS: Record<string, { bg: string; fg: string }> = {
  Critical: { bg: 'rgba(220,38,38,0.12)', fg: '#DC2626' },
  critical: { bg: 'rgba(220,38,38,0.12)', fg: '#DC2626' },
  High:     { bg: 'rgba(217,119,6,0.12)', fg: '#D97706' },
  high:     { bg: 'rgba(217,119,6,0.12)', fg: '#D97706' },
  Medium:   { bg: 'rgba(202,138,4,0.12)', fg: '#A16207' },
  medium:   { bg: 'rgba(202,138,4,0.12)', fg: '#A16207' },
  Low:      { bg: 'rgba(120,113,108,0.12)', fg: '#78716C' },
  low:      { bg: 'rgba(120,113,108,0.12)', fg: '#78716C' },
};

function SevPill({ s }: { s: string }) {
  const c = SEVERITY_COLORS[s] || SEVERITY_COLORS.Medium;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.fg }}>{s}</span>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5A4838]">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: accent || '#1A1410' }}
            data-testid={`risk-stat-${label.replace(/\s+/g,'-').toLowerCase()}`}>{value}</p>
          {sub && <p className="text-xs text-[#7A6A5A] mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(199,59,34,0.10)', color: REDBRICK }}>{icon}</div>
      </div>
    </Card>
  );
}

export default function AdminRisk() {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 3600 * 1000);
  const [from, setFrom] = useState<string>(isoDateOnly(monthAgo));
  const [to, setTo] = useState<string>(isoDateOnly(today));

  const overviewQ = useQuery<{ range: any; data: RiskOverview }>({
    queryKey: ['/api/admin/risk/overview', from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const r = await apiRequest('GET', `/api/admin/risk/overview?${params.toString()}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  const alertsQ = useQuery<{ range: any; data: RiskAlertsData }>({
    queryKey: ['/api/admin/risk/alerts', from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const r = await apiRequest('GET', `/api/admin/risk/alerts?${params.toString()}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  const ov = overviewQ.data?.data;
  const al = alertsQ.data?.data;

  const allAlerts: RiskAlert[] = [
    ...(al?.disputes ?? []),
    ...(al?.sars ?? []),
    ...(al?.fraud ?? []),
    ...(al?.withdrawals ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const exportBase = `/api/admin/risk/alerts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const csvUrl = `${exportBase}&format=csv`;
  const xlsxUrl = `${exportBase}&format=xlsx`;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(220,38,38,0.10)', color: '#DC2626' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A1410]">Risk &amp; AML</h1>
              <p className="text-sm text-[#5A4838]">Disputes, SARs, fraud alerts, sanctions and withdrawal anomalies</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.open(csvUrl, '_blank', 'noopener')}
              data-testid="btn-export-risk-csv">
              <Download size={14} className="mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(xlsxUrl, '_blank', 'noopener')}
              data-testid="btn-export-risk-xlsx">
              <Download size={14} className="mr-1" /> Excel
            </Button>
          </div>
        </div>

        {/* Date range */}
        <Card className="p-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A4838] mb-1">From</label>
              <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
                data-testid="input-risk-from"
                className="text-sm border border-[#E8D9C8] rounded-lg px-3 py-1.5 bg-[#FFFAF3] text-[#1A1410]" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A4838] mb-1">To</label>
              <input type="date" value={to} min={from} max={isoDateOnly(new Date())} onChange={e => setTo(e.target.value)}
                data-testid="input-risk-to"
                className="text-sm border border-[#E8D9C8] rounded-lg px-3 py-1.5 bg-[#FFFAF3] text-[#1A1410]" />
            </div>
            <div className="flex gap-1.5">
              {[7, 30, 90].map(d => (
                <Button key={d} size="sm" variant="outline"
                  onClick={() => { setFrom(isoDateOnly(new Date(Date.now() - d*24*3600*1000))); setTo(isoDateOnly(new Date())); }}
                  data-testid={`btn-risk-preset-${d}d`}>
                  Last {d}d
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Top-line stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={<AlertTriangle size={20} />} label="Open disputes" value={ov?.disputes.open ?? 0}
            accent={ov && ov.disputes.open > 0 ? '#DC2626' : undefined}
            sub={ov ? `${ov.disputes.byPriority.Critical || 0} critical · ${ov.disputes.byPriority.High || 0} high` : ''} />
          <StatCard icon={<Clock size={20} />} label="Avg resolution" value={`${(ov?.disputes.avgResolutionDays ?? 0).toFixed(1)}d`}
            sub={`${ov?.disputes.resolvedCount ?? 0} resolved in range`} />
          <StatCard icon={<FileWarning size={20} />} label="SARs filed" value={ov?.sars.total ?? 0}
            sub={Object.entries(ov?.sars.byStatus ?? {}).map(([k,v]) => `${v} ${k}`).join(' · ')} />
          <StatCard icon={<ShieldAlert size={20} />} label="Sanctions hits" value={ov?.sanctionsHits ?? 0}
            accent={ov && ov.sanctionsHits > 0 ? '#DC2626' : undefined} sub="from KYC screening" />
          <StatCard icon={<Banknote size={20} />} label="Large-tx alerts" value={ov?.largeTransactions.count ?? 0}
            sub={ov ? `≥ $${(ov.largeTransactions.thresholdCents/100).toLocaleString()}` : ''} />
          <StatCard icon={<AlertTriangle size={20} />} label="Withdrawal anomalies" value={ov?.withdrawalAnomalies ?? 0}
            accent={ov && ov.withdrawalAnomalies > 0 ? '#D97706' : undefined}
            sub="rejected or flagged" />
        </div>

        {/* Severity charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="text-base font-bold text-[#1A1410] mb-3">Open disputes by severity</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={['Critical','High','Medium','Low'].map(p => ({ priority: p, count: ov?.disputes.byPriority[p] ?? 0 }))}>
                <CartesianGrid stroke="#F0E6D8" vertical={false} />
                <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#5A4838' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5A4838' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={REDBRICK} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="text-base font-bold text-[#1A1410] mb-3">Fraud alerts by severity</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={['critical','high','medium','low'].map(p => ({ severity: p, count: ov?.fraud.bySeverity[p] ?? 0 }))}>
                <CartesianGrid stroke="#F0E6D8" vertical={false} />
                <XAxis dataKey="severity" tick={{ fontSize: 11, fill: '#5A4838' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5A4838' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Alert feed */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#1A1410]">Recent risk alerts</h3>
            <p className="text-xs text-[#5A4838]">{allAlerts.length} in range</p>
          </div>
          {alertsQ.isLoading && <p className="text-sm text-[#7A6A5A] py-4 text-center">Loading…</p>}
          {alertsQ.isError && (
            <p className="text-sm text-[#DC2626] py-4 flex items-center gap-2"><AlertTriangle size={14} /> Failed to load alerts.</p>
          )}
          {alertsQ.data && allAlerts.length === 0 && (
            <p className="text-sm text-[#7A6A5A] py-4 text-center">No risk events in this range — looking healthy.</p>
          )}
          <div className="space-y-2">
            {allAlerts.map((a) => (
              <div key={`${a.kind}-${a.id}`} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F0E6D8] last:border-0"
                data-testid={`alert-${a.kind}-${a.id}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ background: '#F0E6D8', color: '#5A4838' }}>{a.kind}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1410] truncate">{a.title}</p>
                    <p className="text-xs text-[#7A6A5A]">{a.ref} · {a.status} · {new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SevPill s={a.severity} />
                  <Link href={a.deepLink}>
                    <Button size="sm" variant="outline" data-testid={`btn-open-${a.kind}-${a.id}`}>
                      Open <ExternalLink size={12} className="ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
