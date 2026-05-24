import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Download, MoreVertical, AlertCircle, Warehouse as WarehouseIcon,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  warehouseReceiptNo: string | null;
  consignmentId: string | null;
  hubCode: string | null;
  hubName: string | null;
  hubCountry: string | null;
  commodityName: string;
  ownerId: string;
  quantityReceived: number | null;
  quantityAvailable: number | null;
  quantityReserved: number;
  unit: string;
  qualityGrade: string | null;
  valuationPerUnit: number | null;
  valuationCurrency: string | null;
  isListed: boolean;
  receivedAt: string;
  expiresAt: string | null;
}

function GradeTag({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-xs" style={{ color: '#B0AAA4' }}>—</span>;
  const map: Record<string, { bg: string; color: string }> = {
    'A+': { bg: 'rgba(5,150,105,0.1)', color: '#047857' },
    'A':  { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
    'B+': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
    'B':  { bg: 'rgba(245,158,11,0.08)', color: '#B45309' },
    'C':  { bg: 'rgba(199,59,34,0.08)', color: '#C73B22' },
    'D':  { bg: 'rgba(239,68,68,0.08)', color: '#DC2626' },
  };
  const c = map[grade] || { bg: '#F0EBE6', color: '#888880' };
  return <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: c.bg, color: c.color }}>Grade {grade}</span>;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}

export default function Inventory() {
  const [hubFilter, setHubFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading, error } = useQuery<InventoryItem[]>({
    queryKey: ['/api/b2b/warehouse/inventory'],
  });

  const hubOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const i of items) {
      if (i.hubCode) set.set(i.hubCode, i.hubName ? `${i.hubName}` : i.hubCode);
    }
    return [{ code: 'ALL', name: 'All Hubs' }, ...Array.from(set, ([code, name]) => ({ code, name }))];
  }, [items]);

  const filtered = useMemo(() => items.filter(item => {
    const matchHub = hubFilter === 'ALL' || item.hubCode === hubFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (item.commodityName ?? '').toLowerCase().includes(q) ||
      (item.warehouseReceiptNo ?? '').toLowerCase().includes(q);
    return matchHub && matchSearch;
  }), [items, hubFilter, search]);

  const totalValueUSD = filtered.reduce((s, i) =>
    s + (i.quantityAvailable ?? 0) * (i.valuationPerUnit ?? 0), 0);
  const totalUnits = filtered.reduce((s, i) => s + (i.quantityAvailable ?? 0), 0);
  const reservedUnits = filtered.reduce((s, i) => s + (i.quantityReserved ?? 0), 0);
  const listedCount = filtered.filter(i => i.isListed).length;
  const hubCount = new Set(filtered.map(i => i.hubCode).filter(Boolean)).size;

  const hubError = (error as any)?.message?.includes('HUB_NOT_ASSIGNED');

  return (
    <div className="space-y-6 max-w-[1400px]" data-testid="page-inventory">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Warehouse Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
            Verified stock backed by warehouse receipts — Step 4 output, ready for marketplace listing
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-[#F0EBE6]"
          style={{ border: '1px solid #E8E2DC', color: '#888880' }}>
          <Download size={15} /> Export Report
        </button>
      </div>

      {hubError && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertCircle size={18} style={{ color: '#B45309' }} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>No hub assigned</p>
            <p className="text-xs mt-0.5" style={{ color: '#7A6242' }}>
              An administrator needs to assign a warehouse hub to your account before you can see inventory.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Total Stock Value" value={`USD ${(totalValueUSD / 1e6).toFixed(2)}M`} sub="Warehouse-backed" subColor="#059669" />
        <Stat label="Available Stock" value={`${totalUnits.toLocaleString()}`} sub={`Across ${hubCount} hub${hubCount === 1 ? '' : 's'}`} subColor="#C73B22" />
        <Stat label="Reserved / Locked" value={`${reservedUnits.toLocaleString()}`} sub="Pending fulfilment" subColor="#D97706" />
        <Stat label="Listed on Marketplace" value={listedCount} sub="Visible to buyers" subColor="#059669" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white min-w-[260px]"
          style={{ border: '1px solid #E8E2DC' }}>
          <Search size={14} style={{ color: '#B0AAA4' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search inventory…"
            className="flex-1 text-sm outline-none bg-transparent" style={{ color: '#1A1A1A' }}
            data-testid="input-search" />
        </div>
        <select
          value={hubFilter}
          onChange={e => setHubFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ border: '1px solid #E8E2DC', background: '#fff', color: '#1A1A1A' }}
          data-testid="select-hub">
          {hubOptions.map(h => <option key={h.code} value={h.code}>{h.name}</option>)}
        </select>
      </div>

      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
        {isLoading ? (
          <div className="p-10 text-center text-sm" style={{ color: '#888880' }}>Loading inventory…</div>
        ) : error && !hubError ? (
          <div className="p-10 text-center text-sm" style={{ color: '#DC2626' }}>
            Failed to load: {(error as any)?.message || 'unknown error'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center" data-testid="empty-state">
            <WarehouseIcon size={36} className="mx-auto mb-2" style={{ color: '#888880' }} />
            <p className="font-semibold" style={{ color: '#1A1A1A' }}>No inventory items yet</p>
            <p className="text-sm mt-1" style={{ color: '#888880' }}>
              Verified consignments appear here once the warehouse operator completes the tally and issues a warehouse receipt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
                  {['Receipt No.', 'Commodity', 'Hub', 'Grade', 'Received', 'Available', 'Reserved', 'Valuation', 'Listed', 'Received', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: '#888880' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} className="hover:bg-[#FAFAF8] transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F0EBE6' : 'none' }}
                    data-testid={`row-${item.warehouseReceiptNo ?? item.id}`}>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs font-semibold" style={{ color: '#C73B22' }}>
                        {item.warehouseReceiptNo ?? item.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium" style={{ color: '#1A1A1A' }}>{item.commodityName}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-xs" style={{ color: '#1A1A1A' }}>{item.hubCode ?? '—'}</p>
                      <p className="text-[10px]" style={{ color: '#B0AAA4' }}>{item.hubCountry ?? ''}</p>
                    </td>
                    <td className="px-4 py-4"><GradeTag grade={item.qualityGrade} /></td>
                    <td className="px-4 py-4 font-semibold" style={{ color: '#1A1A1A' }}>
                      {item.quantityReceived?.toLocaleString() ?? '—'} {item.unit}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold" style={{ color: '#059669' }}>
                        {item.quantityAvailable?.toLocaleString() ?? '—'}
                      </span>
                      <span className="text-xs ml-1" style={{ color: '#888880' }}>{item.unit}</span>
                    </td>
                    <td className="px-4 py-4">
                      {item.quantityReserved > 0
                        ? <span className="font-semibold text-xs" style={{ color: '#D97706' }}>{item.quantityReserved} {item.unit}</span>
                        : <span style={{ color: '#B0AAA4' }}>—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {item.valuationPerUnit != null && item.quantityAvailable != null ? (
                        <>
                          <p className="font-semibold" style={{ color: '#1A1A1A' }}>
                            {item.valuationCurrency ?? 'USD'} {(item.quantityAvailable * item.valuationPerUnit).toLocaleString()}
                          </p>
                          <p className="text-[10px]" style={{ color: '#B0AAA4' }}>
                            @ {item.valuationPerUnit.toLocaleString()}/{item.unit}
                          </p>
                        </>
                      ) : <span style={{ color: '#B0AAA4' }}>—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {item.isListed
                        ? <span className="text-xs font-semibold" style={{ color: '#059669' }}>✓ Listed</span>
                        : <button className="text-xs font-semibold hover:underline" style={{ color: '#C73B22' }}>List Now</button>}
                    </td>
                    <td className="px-4 py-4 text-xs" style={{ color: '#B0AAA4' }}>{fmtDate(item.receivedAt)}</td>
                    <td className="px-4 py-4">
                      <button className="p-1.5 rounded-lg hover:bg-[#F0EBE6] transition-colors">
                        <MoreVertical size={14} style={{ color: '#B0AAA4' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, subColor }: { label: string; value: React.ReactNode; sub: string; subColor: string }) {
  return (
    <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
      <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{value}</p>
      <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>{label}</p>
      <p className="text-xs mt-1 font-semibold" style={{ color: subColor }}>{sub}</p>
    </div>
  );
}
