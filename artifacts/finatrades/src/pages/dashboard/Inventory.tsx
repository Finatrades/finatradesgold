import React, { useState } from 'react';
import {
  Warehouse, Package, MapPin, FileText, TrendingUp, ArrowUpRight,
  ArrowDownLeft, Filter, Search, MoreVertical, ChevronDown, Plus,
  Download, ExternalLink, AlertCircle,
} from 'lucide-react';

const HUBS = [
  { code: 'ALL', name: 'All Hubs' },
  { code: 'LOS', name: 'Lagos, Nigeria' },
  { code: 'NBI', name: 'Nairobi, Kenya' },
  { code: 'ACC', name: 'Accra, Ghana' },
  { code: 'ABJ', name: 'Abidjan, Côte d\'Ivoire' },
  { code: 'DKR', name: 'Dakar, Senegal' },
  { code: 'ADD', name: 'Addis Ababa, Ethiopia' },
  { code: 'CAI', name: 'Cairo, Egypt' },
  { code: 'CMN', name: 'Casablanca, Morocco' },
  { code: 'JNB', name: 'Johannesburg, South Africa' },
  { code: 'DAR', name: 'Dar es Salaam, Tanzania' },
  { code: 'KLA', name: 'Kampala, Uganda' },
  { code: 'KAN', name: 'Kano, Nigeria' },
  { code: 'DLA', name: 'Douala, Cameroon' },
  { code: 'MBA', name: 'Mombasa, Kenya' },
];

const MOCK_INVENTORY = [
  { id: 'WR-2025-001', commodity: 'Cocoa Beans', hub: 'LOS', country: 'Nigeria', received: 500, available: 350, reserved: 150, unit: 'MT', grade: 'A', pricePerUnit: 2500, currency: 'USD', listed: true, receivedDate: '2025-04-15', expiry: '2025-10-15', consignmentRef: 'FT-CSG-2025-001' },
  { id: 'WR-2025-002', commodity: 'Palm Oil (Crude)', hub: 'LOS', country: 'Nigeria', received: 1000, available: 1000, reserved: 0, unit: 'MT', grade: 'B+', pricePerUnit: 900, currency: 'USD', listed: false, receivedDate: '2025-05-01', expiry: '2025-11-01', consignmentRef: 'FT-CSG-2025-004' },
  { id: 'WR-2025-003', commodity: 'Sesame Seeds', hub: 'ADD', country: 'Ethiopia', received: 200, available: 200, reserved: 0, unit: 'MT', grade: 'A+', pricePerUnit: 1600, currency: 'USD', listed: true, receivedDate: '2025-05-10', expiry: '2026-05-10', consignmentRef: 'FT-CSG-2025-002' },
  { id: 'WR-2025-004', commodity: 'Cashew Nuts (Raw)', hub: 'ACC', country: 'Ghana', received: 150, available: 100, reserved: 50, unit: 'MT', grade: 'A', pricePerUnit: 1900, currency: 'USD', listed: true, receivedDate: '2025-05-12', expiry: '2025-11-12', consignmentRef: 'FT-CSG-2025-003' },
];

const MOVEMENT_LOG = [
  { date: '2025-05-20', type: 'Out', commodity: 'Cocoa Beans', qty: 50, unit: 'MT', hub: 'LOS', reason: 'Order FT-ORD-2025-001 — Buyer: Cairo Imports' },
  { date: '2025-05-15', type: 'In', commodity: 'Sesame Seeds', qty: 200, unit: 'MT', hub: 'ADD', reason: 'Consignment FT-CSG-2025-002 received & verified' },
  { date: '2025-05-12', type: 'In', commodity: 'Cashew Nuts (Raw)', qty: 150, unit: 'MT', hub: 'ACC', reason: 'Consignment FT-CSG-2025-003 received & verified' },
  { date: '2025-05-10', type: 'Reserve', commodity: 'Cocoa Beans', qty: 100, unit: 'MT', hub: 'LOS', reason: 'Reserved for RFQ FT-RFQ-2025-007' },
  { date: '2025-05-05', type: 'Out', commodity: 'Cocoa Beans', qty: 100, unit: 'MT', hub: 'LOS', reason: 'Delivered — Order FT-ORD-2025-000' },
  { date: '2025-04-15', type: 'In', commodity: 'Cocoa Beans', qty: 500, unit: 'MT', hub: 'LOS', reason: 'Consignment FT-CSG-2025-001 received & verified' },
];

function GradeTag({ grade }: { grade: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'A+': { bg: 'rgba(5,150,105,0.1)', color: '#047857' },
    'A': { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
    'B+': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  };
  const c = map[grade] || map['B+'];
  return <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: c.bg, color: c.color }}>Grade {grade}</span>;
}

function MovTypeTag({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    'In': { bg: 'rgba(5,150,105,0.08)', color: '#059669', icon: <ArrowDownLeft size={11} /> },
    'Out': { bg: 'rgba(199,59,34,0.08)', color: '#C73B22', icon: <ArrowUpRight size={11} /> },
    'Reserve': { bg: 'rgba(245,158,11,0.08)', color: '#D97706', icon: <AlertCircle size={11} /> },
  };
  const c = map[type] || map['In'];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: c.bg, color: c.color }}>
      {c.icon} {type}
    </span>
  );
}

export default function Inventory() {
  const [hubFilter, setHubFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');

  const filtered = MOCK_INVENTORY.filter(item => {
    const matchHub = hubFilter === 'ALL' || item.hub === hubFilter;
    const matchSearch = item.commodity.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());
    return matchHub && matchSearch;
  });

  const totalValueUSD = filtered.reduce((s, i) => s + i.available * i.pricePerUnit, 0);
  const totalMT = filtered.reduce((s, i) => s + i.available, 0);
  const reservedMT = filtered.reduce((s, i) => s + i.reserved, 0);
  const listedCount = filtered.filter(i => i.listed).length;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Warehouse & Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
            Steps 3 & 4 — Pre-arrival tracking and verified stock management across 14 hubs
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-[#F0EBE6]"
          style={{ border: '1px solid #E8E2DC', color: '#888880' }}>
          <Download size={15} /> Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>USD {(totalValueUSD / 1e6).toFixed(2)}M</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Total Stock Value</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#059669' }}>Warehouse-backed</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{totalMT.toLocaleString()} MT</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Available Stock</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#C73B22' }}>Across {[...new Set(filtered.map(i => i.hub))].length} hubs</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{reservedMT.toLocaleString()} MT</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Reserved / Locked</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#D97706' }}>Pending fulfilment</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{listedCount}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Listed on Marketplace</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#059669' }}>Visible to buyers</p>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F0EBE6' }}>
          {(['stock', 'movements'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
              style={activeTab === t
                ? { background: '#fff', color: '#1A1A1A', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                : { color: '#888880' }}>
              {t === 'stock' ? 'Stock Overview' : 'Movement Log'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white min-w-[200px]"
            style={{ border: '1px solid #E8E2DC' }}>
            <Search size={14} style={{ color: '#B0AAA4' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search inventory..."
              className="flex-1 text-sm outline-none bg-transparent" style={{ color: '#1A1A1A' }} />
          </div>
          <select
            value={hubFilter}
            onChange={e => setHubFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: '1px solid #E8E2DC', background: '#fff', color: '#1A1A1A' }}>
            {HUBS.map(h => <option key={h.code} value={h.code}>{h.name}</option>)}
          </select>
        </div>
      </div>

      {activeTab === 'stock' && (
        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
                  {['Receipt No.', 'Commodity', 'Hub', 'Grade', 'Received', 'Available', 'Reserved', 'Valuation (USD)', 'Listed', 'Expiry', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: '#888880' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const usedPct = ((item.received - item.available) / item.received) * 100;
                  return (
                    <tr key={item.id} className="hover:bg-[#FAFAF8] transition-colors"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F0EBE6' : 'none' }}>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs font-semibold" style={{ color: '#C73B22' }}>{item.id}</span>
                        <p className="text-[10px] mt-0.5" style={{ color: '#B0AAA4' }}>Ref: {item.consignmentRef}</p>
                      </td>
                      <td className="px-4 py-4 font-medium" style={{ color: '#1A1A1A' }}>{item.commodity}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-xs" style={{ color: '#1A1A1A' }}>{item.hub}</p>
                        <p className="text-[10px]" style={{ color: '#B0AAA4' }}>{item.country}</p>
                      </td>
                      <td className="px-4 py-4"><GradeTag grade={item.grade} /></td>
                      <td className="px-4 py-4 font-semibold" style={{ color: '#1A1A1A' }}>{item.received.toLocaleString()} {item.unit}</td>
                      <td className="px-4 py-4">
                        <span className="font-bold" style={{ color: '#059669' }}>{item.available.toLocaleString()}</span>
                        <span className="text-xs ml-1" style={{ color: '#888880' }}>{item.unit}</span>
                      </td>
                      <td className="px-4 py-4">
                        {item.reserved > 0
                          ? <span className="font-semibold text-xs" style={{ color: '#D97706' }}>{item.reserved} {item.unit}</span>
                          : <span style={{ color: '#B0AAA4' }}>—</span>}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold" style={{ color: '#1A1A1A' }}>
                          {(item.available * item.pricePerUnit).toLocaleString()}
                        </p>
                        <p className="text-[10px]" style={{ color: '#B0AAA4' }}>@ {item.pricePerUnit.toLocaleString()}/{item.unit}</p>
                      </td>
                      <td className="px-4 py-4">
                        {item.listed
                          ? <span className="text-xs font-semibold" style={{ color: '#059669' }}>✓ Listed</span>
                          : <button className="text-xs font-semibold hover:underline" style={{ color: '#C73B22' }}>List Now</button>}
                      </td>
                      <td className="px-4 py-4 text-xs" style={{ color: '#B0AAA4' }}>{item.expiry}</td>
                      <td className="px-4 py-4">
                        <button className="p-1.5 rounded-lg hover:bg-[#F0EBE6] transition-colors">
                          <MoreVertical size={14} style={{ color: '#B0AAA4' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-sm" style={{ color: '#B0AAA4' }}>No inventory items found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
                  {['Date', 'Type', 'Commodity', 'Quantity', 'Hub', 'Reason / Reference'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#888880' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOVEMENT_LOG.map((m, i) => (
                  <tr key={i} className="hover:bg-[#FAFAF8] transition-colors"
                    style={{ borderBottom: i < MOVEMENT_LOG.length - 1 ? '1px solid #F0EBE6' : 'none' }}>
                    <td className="px-4 py-3.5 text-xs font-mono" style={{ color: '#888880' }}>{m.date}</td>
                    <td className="px-4 py-3.5"><MovTypeTag type={m.type} /></td>
                    <td className="px-4 py-3.5 font-medium" style={{ color: '#1A1A1A' }}>{m.commodity}</td>
                    <td className="px-4 py-3.5 font-bold" style={{ color: '#1A1A1A' }}>{m.qty} {m.unit}</td>
                    <td className="px-4 py-3.5 font-semibold text-xs" style={{ color: '#888880' }}>{m.hub}</td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: '#888880' }}>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
