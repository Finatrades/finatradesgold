import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/DashboardLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, Download, TrendingUp, Users, Activity, DollarSign, Globe, ShieldCheck, AlertTriangle } from 'lucide-react';

const COLORS = ['#C73B22', '#1A1A1A', '#D97706', '#059669', '#1D4ED8', '#7C3AED', '#DB2777', '#0891B2', '#65A30D', '#92400E'];
const REDBRICK = '#C73B22';

function isoDateOnly(d: Date): string { return d.toISOString().slice(0, 10); }

function formatMoney(cents: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toLocaleString()}`;
  }
}

function downloadCsv(url: string) {
  window.open(url, '_blank', 'noopener');
}

interface KpiData {
  gmvByCurrency: Record<string, number>;
  completedTrades: number;
  activeTrades: number;
  avgDealSizeCents: number;
  newUsers: { total: number; exporter: number; importer: number; government: number; warehouse?: number };
  commission: { centsByCurrency: Record<string, number>; feePct: number; tracked: 'estimate' | false; source: string };
}

interface TimeseriesPoint { day: string; commodity: string; currency: string; amountCents: number; }
interface CommodityRow { commodity: string; currency: string; amountCents: number; dealCount: number; }
interface TraderRow { ftId: string; displayName: string; country: string | null; currency: string; amountCents: number; dealCount: number; }
interface GeoRow { country: string | null; dealCount: number; valueCents: number; }
interface GeoData { origin: GeoRow[]; destination: GeoRow[]; }
interface KycFunnelData {
  total: { submitted: number; aiReview: number; humanReview: number; approved: number; rejected: number };
  personal: { submitted: number; aiReview: number; humanReview: number; approved: number; rejected: number };
  corporate: { submitted: number; aiReview: number; humanReview: number; approved: number; rejected: number };
  approvalRate: number;
  conversion: { submittedToAi: number; aiToHuman: number; humanToApproved: number; submittedToApproved: number; rejectionRate: number };
}
interface TradeFunnelData {
  stages: Array<{ key: string; label: string; count: number }>;
  consignmentsByStatus: Record<string, number>;
  casesByStatus: Record<string, number>;
}

function useAnalyticsQuery<T>(path: string, from: string, to: string) {
  return useQuery<{ range: { from: string; to: string; tz?: string }; data: T }>({
    queryKey: ['/api/admin/analytics' + path, from, to],
    queryFn: async () => {
      // Calendar dates (YYYY-MM-DD) — server normalises to Africa/Lagos boundaries.
      const params = new URLSearchParams({ from, to });
      const r = await apiRequest('GET', `/api/admin/analytics${path}?${params.toString()}`);
      return r.json();
    },
    staleTime: 30_000,
  });
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5A4838]">{label}</p>
          <p className="text-2xl font-bold text-[#1A1410] mt-1 truncate" data-testid={`kpi-value-${label.replace(/\s+/g,'-').toLowerCase()}`}>{value}</p>
          {sub && <p className="text-xs text-[#7A6A5A] mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(199,59,34,0.10)', color: REDBRICK }}>{icon}</div>
      </div>
    </Card>
  );
}

function ConvStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-[#F0E6D8] bg-[#FFFAF3] px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-[#7A6A5A] truncate">{label}</p>
      <p className="text-sm font-bold" style={{ color: accent || '#1A1410' }}>{value}</p>
    </div>
  );
}

function GeoHeatmap({ title, rows, accent }: { title: string; rows: GeoRow[]; accent: string }) {
  const top = [...rows].sort((a, b) => b.valueCents - a.valueCents).slice(0, 10);
  const max = top.reduce((m, r) => Math.max(m, r.valueCents), 0) || 1;
  const maxCount = top.reduce((m, r) => Math.max(m, r.dealCount), 0) || 1;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#5A4838] mb-3 flex items-center gap-1">
        <Globe size={12} /> {title}
      </p>
      {top.length === 0 ? (
        <p className="text-xs text-[#7A6A5A] py-6 text-center">No data</p>
      ) : (
        <div className="space-y-2.5">
          {top.map((r, i) => {
            const intensity = r.valueCents / max;
            const bubble = 12 + Math.round((r.dealCount / maxCount) * 28);
            const bg = `linear-gradient(90deg, ${accent}${Math.round(intensity * 0xCC).toString(16).padStart(2, '0').toUpperCase()} 0%, ${accent}10 ${Math.max(intensity * 100, 8)}%, transparent ${Math.max(intensity * 100, 8)}%)`;
            return (
              <div key={(r.country ?? '') + i} className="rounded-lg px-3 py-2 border border-[#F0E6D8]"
                style={{ background: bg }}
                data-testid={`geo-${title.toLowerCase().replace(/\s+/g, '-')}-${i}`}>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full shrink-0" style={{ width: bubble, height: bubble, background: accent, opacity: 0.4 + intensity * 0.6 }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#1A1410] truncate">{r.country || 'Unknown'}</span>
                      <span className="text-xs font-bold shrink-0" style={{ color: accent }}>{formatMoney(r.valueCents)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#7A6A5A]">
                      <span>{r.dealCount} deals</span>
                      <span>{Math.round(intensity * 100)}% of peak</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function exportUrl(path: string, from: string, to: string, format: 'csv' | 'xlsx', extraQs: string = '') {
  return `/api/admin/analytics${path}?from=${from}&to=${to}&format=${format}${extraQs ? '&' + extraQs : ''}`;
}

function ChartCard({ title, subtitle, exportPath, from, to, extraQs, children }: {
  title: string; subtitle?: string; exportPath: string; from: string; to: string; extraQs?: string; children: React.ReactNode;
}) {
  const slug = exportPath.replace(/\W+/g, '-');
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-[#1A1410]">{title}</h3>
          {subtitle && <p className="text-xs text-[#5A4838] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadCsv(exportUrl(exportPath, from, to, 'csv', extraQs))}
            data-testid={`btn-export-csv-${slug}`}>
            <Download size={14} className="mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCsv(exportUrl(exportPath, from, to, 'xlsx', extraQs))}
            data-testid={`btn-export-xlsx-${slug}`}>
            <Download size={14} className="mr-1" /> Excel
          </Button>
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function AdminAnalytics() {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 3600 * 1000);
  const [from, setFrom] = useState<string>(isoDateOnly(monthAgo));
  const [to, setTo] = useState<string>(isoDateOnly(today));
  const [traderSide, setTraderSide] = useState<'exporter' | 'importer'>('exporter');

  const kpi = useAnalyticsQuery<KpiData>('/kpis', from, to);
  const ts = useAnalyticsQuery<TimeseriesPoint[]>('/timeseries/gmv', from, to);
  const commodities = useAnalyticsQuery<CommodityRow[]>('/top-commodities', from, to);
  const tradersQ = useQuery<{ range: any; side: string; data: TraderRow[] }>({
    queryKey: ['/api/admin/analytics/top-traders', from, to, traderSide],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to, side: traderSide });
      const r = await apiRequest('GET', `/api/admin/analytics/top-traders?${params.toString()}`);
      return r.json();
    },
    staleTime: 30_000,
  });
  const geo = useAnalyticsQuery<GeoData>('/geo', from, to);
  const kycFunnel = useAnalyticsQuery<KycFunnelData>('/kyc-funnel', from, to);
  const tradeFunnel = useAnalyticsQuery<TradeFunnelData>('/trade-funnel', from, to);

  // ── Build stacked timeseries: one series per commodity ─────────────────
  const tsChart = useMemo(() => {
    const data = ts.data?.data ?? [];
    const days = Array.from(new Set(data.map(d => d.day))).sort();
    const commodities = Array.from(new Set(data.map(d => d.commodity || 'Unknown')));
    const rows = days.map(day => {
      const row: Record<string, any> = { day };
      for (const c of commodities) row[c] = 0;
      for (const p of data.filter(p => p.day === day)) {
        row[p.commodity || 'Unknown'] += p.amountCents / 100;
      }
      return row;
    });
    return { rows, commodities };
  }, [ts.data]);

  const gmvTotal = useMemo(() => {
    if (!kpi.data?.data) return '—';
    const entries = Object.entries(kpi.data.data.gmvByCurrency);
    if (entries.length === 0) return '$0';
    return entries.map(([cur, cents]) => formatMoney(cents, cur)).join(' · ');
  }, [kpi.data]);

  const commissionTotal = useMemo(() => {
    if (!kpi.data?.data) return '—';
    const entries = Object.entries(kpi.data.data.commission.centsByCurrency);
    if (entries.length === 0) return formatMoney(0, 'USD');
    return entries.map(([cur, cents]) => formatMoney(cents, cur)).join(' · ');
  }, [kpi.data]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(199,59,34,0.10)', color: REDBRICK }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A1410]">Platform Analytics</h1>
              <p className="text-sm text-[#5A4838]">GMV, trade activity, KYC funnel, and geographic spread (Africa/Lagos)</p>
            </div>
          </div>
        </div>

        {/* Date range */}
        <Card className="p-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A4838] mb-1">From</label>
              <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
                data-testid="input-date-from"
                className="text-sm border border-[#E8D9C8] rounded-lg px-3 py-1.5 bg-[#FFFAF3] text-[#1A1410]" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A4838] mb-1">To</label>
              <input type="date" value={to} min={from} max={isoDateOnly(new Date())} onChange={e => setTo(e.target.value)}
                data-testid="input-date-to"
                className="text-sm border border-[#E8D9C8] rounded-lg px-3 py-1.5 bg-[#FFFAF3] text-[#1A1410]" />
            </div>
            <div className="flex gap-1.5">
              {[7, 30, 90, 365].map(d => (
                <Button key={d} size="sm" variant="outline"
                  onClick={() => { setFrom(isoDateOnly(new Date(Date.now() - d*24*3600*1000))); setTo(isoDateOnly(new Date())); }}
                  data-testid={`btn-preset-${d}d`}>
                  Last {d}d
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={<DollarSign size={20} />} label="GMV (settled)" value={gmvTotal} sub={`${kpi.data?.data.completedTrades ?? 0} settled deals`} />
          <KpiCard icon={<TrendingUp size={20} />} label="Commission (est.)" value={commissionTotal}
            sub={kpi.data?.data ? `@ ${kpi.data.data.commission.feePct}% — ${kpi.data.data.commission.source}` : ''} />
          <KpiCard icon={<Activity size={20} />} label="Active trades" value={String(kpi.data?.data.activeTrades ?? 0)} sub={`${kpi.data?.data.completedTrades ?? 0} completed`} />
          <KpiCard icon={<TrendingUp size={20} />} label="Avg deal size" value={kpi.data?.data ? formatMoney(kpi.data.data.avgDealSizeCents, 'USD') : '—'} sub="across all settled" />
          <KpiCard icon={<Users size={20} />} label="New users" value={String(kpi.data?.data.newUsers.total ?? 0)}
            sub={`${kpi.data?.data.newUsers.exporter ?? 0} exp · ${kpi.data?.data.newUsers.importer ?? 0} imp · ${kpi.data?.data.newUsers.government ?? 0} gov`} />
        </div>
        {kpi.data?.data && kpi.data.data.commission.tracked === 'estimate' && (
          <Card className="p-3 text-xs text-[#7A6A5A]">
            Commission is shown as an <strong>estimate</strong> (active fee schedule × settled GMV); per-trade fee assessments are not persisted yet, so actual earned commission may differ.
          </Card>
        )}

        {/* GMV timeseries */}
        <ChartCard title="Daily GMV by commodity" subtitle="Stacked area, settled trades only" exportPath="/timeseries/gmv" from={from} to={to}>
          {tsChart.rows.length === 0 ? (
            <p className="text-sm text-[#7A6A5A] py-10 text-center">No settled trades in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={tsChart.rows}>
                <CartesianGrid stroke="#F0E6D8" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5A4838' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5A4838' }} tickFormatter={(v) => `$${Math.round(v/1000)}k`} />
                <Tooltip formatter={(v: number) => `$${Math.round(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {tsChart.commodities.map((c, i) => (
                  <Area key={c} type="monotone" dataKey={c} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top commodities */}
          <ChartCard title="Top 10 commodities" subtitle="By settled GMV" exportPath="/top-commodities" from={from} to={to}>
            {(commodities.data?.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-[#7A6A5A] py-10 text-center">No commodity data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={(commodities.data?.data ?? []).map(d => ({ name: d.commodity, gmv: d.amountCents / 100, deals: d.dealCount }))}
                  layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid stroke="#F0E6D8" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#5A4838' }} tickFormatter={(v) => `$${Math.round(v/1000)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#5A4838' }} width={120} />
                  <Tooltip formatter={(v: number) => `$${Math.round(v).toLocaleString()}`} />
                  <Bar dataKey="gmv" fill={REDBRICK} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top traders */}
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-[#1A1410]">Top 10 traders</h3>
                <p className="text-xs text-[#5A4838] mt-0.5">Anonymised — Finatrades ID only</p>
              </div>
              <div className="flex gap-2">
                <select value={traderSide} onChange={e => setTraderSide(e.target.value as 'exporter' | 'importer')}
                  data-testid="select-trader-side"
                  className="text-xs border border-[#E8D9C8] rounded-lg px-2 py-1 bg-[#FFFAF3] text-[#1A1410]">
                  <option value="exporter">Exporters</option>
                  <option value="importer">Importers</option>
                </select>
                <Button size="sm" variant="outline"
                  onClick={() => downloadCsv(exportUrl('/top-traders', from, to, 'csv', `side=${traderSide}`))}
                  data-testid="btn-export-traders-csv">
                  <Download size={14} className="mr-1" /> CSV
                </Button>
                <Button size="sm" variant="outline"
                  onClick={() => downloadCsv(exportUrl('/top-traders', from, to, 'xlsx', `side=${traderSide}`))}
                  data-testid="btn-export-traders-xlsx">
                  <Download size={14} className="mr-1" /> Excel
                </Button>
              </div>
            </div>
            {(tradersQ.data?.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-[#7A6A5A] py-10 text-center">No trader activity.</p>
            ) : (
              <div className="space-y-2">
                {(tradersQ.data?.data ?? []).map((t, i) => (
                  <div key={t.ftId + i} className="flex items-center justify-between gap-3 py-2 border-b border-[#F0E6D8] last:border-0"
                    data-testid={`row-trader-${i}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(199,59,34,0.10)', color: REDBRICK }}>{i + 1}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#1A1410] truncate">{t.ftId}</p>
                        <p className="text-xs text-[#7A6A5A]">{t.country || '—'} · {t.dealCount} deals</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#1A1410] shrink-0">{formatMoney(t.amountCents, t.currency)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Geo — intensity heatmap (bubble-style ranked bars) */}
        <ChartCard title="Geographic spread (intensity)" subtitle="Bubble & heat intensity scaled to deal value — origin (consignments) vs destination (trade cases)" exportPath="/geo" from={from} to={to}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GeoHeatmap title="Top origins" rows={geo.data?.data.origin ?? []} accent={REDBRICK} />
            <GeoHeatmap title="Top destinations" rows={geo.data?.data.destination ?? []} accent="#1A1A1A" />
          </div>
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* KYC funnel with per-step conversion */}
          <ChartCard title="KYC funnel" subtitle={`${kycFunnel.data?.data.approvalRate ?? 0}% overall approval`} exportPath="/kyc-funnel" from={from} to={to}>
            {!kycFunnel.data ? (
              <p className="text-sm text-[#7A6A5A] py-10 text-center">Loading…</p>
            ) : (() => {
              const k = kycFunnel.data.data;
              const reachedAi = k.total.aiReview + k.total.humanReview + k.total.approved + k.total.rejected;
              const reachedHuman = k.total.humanReview + k.total.approved;
              const stages = [
                { stage: 'Submitted', count: k.total.submitted, conv: 100, color: '#1A1A1A' },
                { stage: 'AI Review', count: reachedAi, conv: k.conversion.submittedToAi, color: '#D97706' },
                { stage: 'Human Review', count: reachedHuman, conv: k.conversion.aiToHuman, color: '#A16207' },
                { stage: 'Approved', count: k.total.approved, conv: k.conversion.humanToApproved, color: '#059669' },
                { stage: 'Rejected', count: k.total.rejected, conv: k.conversion.rejectionRate, color: '#DC2626' },
              ];
              return (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={stages}>
                      <CartesianGrid stroke="#F0E6D8" vertical={false} />
                      <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#5A4838' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#5A4838' }} />
                      <Tooltip formatter={(v: number, _name: string, entry: any) => [`${v} (${entry?.payload?.conv ?? 0}%)`, 'count (conv)']} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {stages.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px]">
                    <ConvStat label="Submit → AI" value={`${k.conversion.submittedToAi}%`} />
                    <ConvStat label="AI → Human" value={`${k.conversion.aiToHuman}%`} />
                    <ConvStat label="Human → Approved" value={`${k.conversion.humanToApproved}%`} />
                    <ConvStat label="Rejection rate" value={`${k.conversion.rejectionRate}%`} accent={k.conversion.rejectionRate > 25 ? '#DC2626' : undefined} />
                  </div>
                </>
              );
            })()}
          </ChartCard>

          {/* Trade funnel */}
          <ChartCard title="Trade funnel" subtitle="Drafted → Settled" exportPath="/trade-funnel" from={from} to={to}>
            {!tradeFunnel.data ? (
              <p className="text-sm text-[#7A6A5A] py-10 text-center">Loading…</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tradeFunnel.data.data.stages.map(s => ({ stage: s.label, count: s.count }))}>
                  <CartesianGrid stroke="#F0E6D8" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#5A4838' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#5A4838' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* User type breakdown */}
        <ChartCard title="New user mix" subtitle="By user type, over the selected range" exportPath="/kpis" from={from} to={to}>
          {!kpi.data ? (
            <p className="text-sm text-[#7A6A5A] py-10 text-center">Loading…</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={[
                  { name: 'Exporter', value: kpi.data.data.newUsers.exporter },
                  { name: 'Importer', value: kpi.data.data.newUsers.importer },
                  { name: 'Government', value: kpi.data.data.newUsers.government },
                ].filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {COLORS.slice(0, 3).map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Error states */}
        {kpi.isError && (
          <Card className="p-4 text-sm text-[#DC2626] flex items-center gap-2">
            <AlertTriangle size={16} /> Failed to load analytics. {(kpi.error as any)?.message}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
