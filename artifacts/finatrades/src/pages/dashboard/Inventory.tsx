import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Warehouse, Package, MapPin, FileText, Search, Download, ExternalLink,
  AlertCircle, CheckCircle2, ShieldCheck, Loader2, ToggleLeft, ToggleRight,
} from 'lucide-react';

const HUB_NAMES: Record<string, string> = {
  LOS: 'Lagos, Nigeria', NBI: 'Nairobi, Kenya', ACC: 'Accra, Ghana',
  ABJ: 'Abidjan, Côte d\'Ivoire', DKR: 'Dakar, Senegal', ADD: 'Addis Ababa, Ethiopia',
  CAI: 'Cairo, Egypt', CMN: 'Casablanca, Morocco', JNB: 'Johannesburg, South Africa',
  DAR: 'Dar es Salaam, Tanzania', KLA: 'Kampala, Uganda', KAN: 'Kano, Nigeria',
  DLA: 'Douala, Cameroon', MBA: 'Mombasa, Kenya',
};

interface InventoryRow {
  id: string;
  consignmentId: string;
  referenceNo: string;
  commodityName: string;
  commodityCategory: string | null;
  qualityGrade: string | null;
  quantity: number;
  unit: string;
  hubCode: string | null;
  originCountry: string;
  estimatedValueCents: number | null;
  currency: string | null;
  marketplacePublished: boolean;
  marketplacePublishedAt: string | null;
  warehouseReceipt: null | {
    wrNumber: string;
    status: string;
    pdfStatus: string;
    issuedAt: string;
    verificationUrl: string;
  };
}

function fmtMoney(cents: number | null, currency = 'USD'): string {
  if (cents == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch { return `${(cents / 100).toFixed(2)} ${currency}`; }
}

function fmtDate(s: string | null): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}

function GradeTag({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-xs" style={{ color: '#888880' }}>—</span>;
  const map: Record<string, { bg: string; color: string }> = {
    'A+': { bg: 'rgba(5,150,105,0.1)', color: '#047857' },
    'A': { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
    'B+': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
    'B': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  };
  const c = map[grade] || { bg: 'rgba(136,136,128,0.12)', color: '#666' };
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: c.bg, color: c.color }}>
      Grade {grade}
    </span>
  );
}

async function fetchSignedWrUrl(consignmentId: string): Promise<{ signedUrl: string }> {
  const res = await fetch(`/api/b2b/consignments/${consignmentId}/warehouse-receipt/url`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [hubFilter, setHubFilter] = useState('ALL');
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<{ items: InventoryRow[]; count: number }>({
    queryKey: ['/api/b2b/consignments/_inventory/list'],
    queryFn: async () => {
      const res = await fetch('/api/b2b/consignments/_inventory/list', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ consignmentId, published }: { consignmentId: string; published: boolean }) => {
      const res = await fetch(`/api/b2b/consignments/${consignmentId}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/b2b/consignments/_inventory/list'] });
    },
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const handleDownload = async (consignmentId: string) => {
    setDownloadingId(consignmentId);
    try {
      const { signedUrl } = await fetchSignedWrUrl(consignmentId);
      window.open(signedUrl, '_blank', 'noopener');
    } catch (e: any) {
      alert(`Failed to fetch receipt: ${e?.message || 'unknown error'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const items = data?.items ?? [];
  const filtered = items.filter((i) => {
    if (hubFilter !== 'ALL' && i.hubCode !== hubFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = [i.commodityName, i.referenceNo, i.warehouseReceipt?.wrNumber, i.originCountry]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  });

  const hubsInUse = Array.from(new Set(items.map((i) => i.hubCode).filter(Boolean))) as string[];

  return (
    <div className="space-y-6" data-testid="page-inventory">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Inventory</h1>
        <p className="text-sm mt-1" style={{ color: '#888880' }}>
          Live stock backed by Electronic Warehouse Receipts (eWR). Each row is a tamper-evident receipt issued by a Finatrades hub.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Package size={18} />} label="Active receipts" value={String(items.length)} />
        <StatCard
          icon={<ShieldCheck size={18} />}
          label="Published to marketplace"
          value={String(items.filter((i) => i.marketplacePublished).length)}
        />
        <StatCard
          icon={<Warehouse size={18} />}
          label="Hubs in use"
          value={String(hubsInUse.length)}
        />
      </div>

      <div className="rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#FAFAF8' }}>
        <div className="p-4 flex flex-wrap items-center gap-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#888880' }} />
            <input
              type="text"
              placeholder="Search by commodity, WR#, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none"
              style={{ borderColor: 'rgba(0,0,0,0.1)' }}
            />
          </div>
          <select
            value={hubFilter}
            onChange={(e) => setHubFilter(e.target.value)}
            data-testid="select-hub"
            className="px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: 'rgba(0,0,0,0.1)' }}
          >
            <option value="ALL">All hubs</option>
            {hubsInUse.map((h) => (
              <option key={h} value={h}>{h} — {HUB_NAMES[h] || h}</option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div className="p-10 text-center text-sm flex items-center justify-center gap-2" style={{ color: '#888880' }}>
            <Loader2 size={14} className="animate-spin" /> Loading inventory…
          </div>
        )}

        {error && (
          <div className="p-10 text-center text-sm flex items-center justify-center gap-2" style={{ color: '#DC2626' }}>
            <AlertCircle size={14} /> Failed to load inventory: {(error as any)?.message || 'unknown error'}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-10 text-center text-sm" style={{ color: '#888880' }}>
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <div className="font-semibold mb-1" style={{ color: '#1A1A1A' }}>No active inventory</div>
            Inventory appears here once a consignment has been physically tallied at a hub and an Electronic Warehouse Receipt has been issued.
          </div>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                <tr style={{ color: '#666' }}>
                  <Th>Receipt #</Th>
                  <Th>Commodity</Th>
                  <Th>Hub / Origin</Th>
                  <Th className="text-right">Quantity</Th>
                  <Th>Grade</Th>
                  <Th className="text-right">Est. value</Th>
                  <Th>Marketplace</Th>
                  <Th>Issued</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const wr = row.warehouseReceipt;
                  const pdfReady = wr?.pdfStatus === 'ready';
                  return (
                    <tr key={row.id} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.04)' }} data-testid={`row-${row.id}`}>
                      <Td>
                        <div className="font-mono font-bold" style={{ color: '#1A1A1A' }}>
                          {wr?.wrNumber || '—'}
                        </div>
                        <Link
                          href={`/consignments/${row.consignmentId}`}
                          className="text-xs hover:underline"
                          style={{ color: '#C73B22' }}
                        >
                          {row.referenceNo}
                        </Link>
                      </Td>
                      <Td>
                        <div className="font-semibold" style={{ color: '#1A1A1A' }}>{row.commodityName}</div>
                        {row.commodityCategory && (
                          <div className="text-xs" style={{ color: '#888880' }}>{row.commodityCategory}</div>
                        )}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#1A1A1A' }}>
                          <MapPin size={11} /> {row.hubCode || '—'}
                        </div>
                        <div className="text-xs" style={{ color: '#888880' }}>{row.originCountry}</div>
                      </Td>
                      <Td className="text-right font-semibold">
                        {row.quantity.toLocaleString()} {row.unit}
                      </Td>
                      <Td><GradeTag grade={row.qualityGrade} /></Td>
                      <Td className="text-right">
                        {fmtMoney(row.estimatedValueCents, row.currency || 'USD')}
                      </Td>
                      <Td>
                        <button
                          type="button"
                          disabled={publishMutation.isPending}
                          onClick={() => publishMutation.mutate({
                            consignmentId: row.consignmentId,
                            published: !row.marketplacePublished,
                          })}
                          data-testid={`btn-publish-${row.id}`}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition"
                          style={{
                            background: row.marketplacePublished ? 'rgba(5,150,105,0.12)' : 'rgba(136,136,128,0.12)',
                            color: row.marketplacePublished ? '#047857' : '#888880',
                          }}
                        >
                          {row.marketplacePublished ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {row.marketplacePublished ? 'Published' : 'Unlisted'}
                        </button>
                      </Td>
                      <Td className="text-xs" style={{ color: '#888880' }}>
                        {fmtDate(wr?.issuedAt ?? null)}
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {wr && (
                            <button
                              type="button"
                              disabled={!pdfReady || downloadingId === row.consignmentId}
                              onClick={() => handleDownload(row.consignmentId)}
                              data-testid={`btn-download-wr-${row.id}`}
                              title={pdfReady ? 'Download eWR PDF' : `PDF status: ${wr.pdfStatus}`}
                              className="p-1.5 rounded hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {downloadingId === row.consignmentId
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Download size={14} style={{ color: '#1A1A1A' }} />}
                            </button>
                          )}
                          {wr && (
                            <a
                              href={wr.verificationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`link-verify-${row.id}`}
                              title="Public verification"
                              className="p-1.5 rounded hover:bg-black/5"
                            >
                              <ExternalLink size={14} style={{ color: '#1A1A1A' }} />
                            </a>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#FAFAF8' }}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>
        <span style={{ color: '#C73B22' }}>{icon}</span> {label}
      </div>
      <div className="mt-2 text-2xl font-bold" style={{ color: '#1A1A1A' }}>{value}</div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left text-xs font-semibold uppercase tracking-wider px-3 py-2 ${className}`}>{children}</th>
  );
}

function Td({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={`px-3 py-3 align-top ${className}`} style={style}>{children}</td>;
}
