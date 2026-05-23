import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  Package, Plus, Search, Filter, ChevronRight, X, CheckCircle2,
  Clock, AlertCircle, Truck, Warehouse, FileText, MoreVertical,
  Upload, ChevronDown,
} from 'lucide-react';

const HUBS = [
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

const COMMODITIES = [
  { name: 'Cocoa Beans', hsCode: '1801.00', unit: 'MT' },
  { name: 'Cashew Nuts (Raw)', hsCode: '0801.31', unit: 'MT' },
  { name: 'Sesame Seeds', hsCode: '1207.40', unit: 'MT' },
  { name: 'Palm Oil (Crude)', hsCode: '1511.10', unit: 'MT' },
  { name: 'Soybean', hsCode: '1201.90', unit: 'MT' },
  { name: 'Cotton (Raw)', hsCode: '5201.00', unit: 'MT' },
  { name: 'Coffee (Arabica)', hsCode: '0901.11', unit: 'MT' },
  { name: 'Gold Ore', hsCode: '2616.90', unit: 'KG' },
  { name: 'Groundnuts', hsCode: '1202.41', unit: 'MT' },
  { name: 'Shea Butter', hsCode: '1515.90', unit: 'MT' },
  { name: 'Ginger (Dried)', hsCode: '0910.11', unit: 'MT' },
  { name: 'Copper Ore', hsCode: '2603.00', unit: 'MT' },
];

const INCOTERMS = ['FOB', 'CIF', 'DAP', 'EXW', 'FCA', 'CFR', 'DDP'];
const GRADES = ['A+', 'A', 'B+', 'B', 'C'];

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  'Draft': { bg: 'rgba(136,136,128,0.1)', color: '#888880', icon: <FileText size={12} /> },
  'Submitted': { bg: 'rgba(59,130,246,0.1)', color: '#2563EB', icon: <Clock size={12} /> },
  'Under Review': { bg: 'rgba(245,158,11,0.1)', color: '#D97706', icon: <AlertCircle size={12} /> },
  'Approved': { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle2 size={12} /> },
  'Rejected': { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <X size={12} /> },
  'In Transit': { bg: 'rgba(139,92,246,0.1)', color: '#7C3AED', icon: <Truck size={12} /> },
  'At Warehouse': { bg: 'rgba(199,59,34,0.1)', color: '#C73B22', icon: <Warehouse size={12} /> },
  'Verified': { bg: 'rgba(5,150,105,0.12)', color: '#047857', icon: <CheckCircle2 size={12} /> },
};

const MOCK_CONSIGNMENTS = [
  { id: 'FT-CSG-2025-001', commodity: 'Cocoa Beans', hsCode: '1801.00', quantity: '500', unit: 'MT', grade: 'A', origin: 'Nigeria', hub: 'LOS', incoterms: 'FOB', value: '1,250,000', currency: 'USD', status: 'Approved', submitted: '2025-05-10' },
  { id: 'FT-CSG-2025-002', commodity: 'Sesame Seeds', hsCode: '1207.40', quantity: '200', unit: 'MT', grade: 'A+', origin: 'Ethiopia', hub: 'ADD', incoterms: 'CIF', value: '320,000', currency: 'USD', status: 'Under Review', submitted: '2025-05-15' },
  { id: 'FT-CSG-2025-003', commodity: 'Cashew Nuts (Raw)', hsCode: '0801.31', quantity: '150', unit: 'MT', grade: 'A', origin: 'Ghana', hub: 'ACC', incoterms: 'FOB', value: '285,000', currency: 'USD', status: 'Submitted', submitted: '2025-05-18' },
  { id: 'FT-CSG-2025-004', commodity: 'Palm Oil (Crude)', hsCode: '1511.10', quantity: '1000', unit: 'MT', grade: 'B+', origin: 'Nigeria', hub: 'LOS', incoterms: 'DAP', value: '900,000', currency: 'USD', status: 'At Warehouse', submitted: '2025-04-22' },
  { id: 'FT-CSG-2025-005', commodity: 'Coffee (Arabica)', hsCode: '0901.11', quantity: '80', unit: 'MT', grade: 'A+', origin: 'Kenya', hub: 'NBI', incoterms: 'FOB', value: '384,000', currency: 'USD', status: 'Draft', submitted: '—' },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Draft'];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {s.icon} {status}
    </span>
  );
}

function StatCard({ label, value, sub, color = '#C73B22' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
      <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{value}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color: '#888880' }}>{label}</p>
      {sub && <p className="text-xs mt-1 font-semibold" style={{ color }}>{sub}</p>}
    </div>
  );
}

export default function Consignments() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    commodity: '', hsCode: '', quantity: '', unit: 'MT', grade: 'A',
    origin: '', hub: 'LOS', incoterms: 'FOB', estimatedValue: '', notes: '',
  });

  const handleCommodityChange = (name: string) => {
    const c = COMMODITIES.find(x => x.name === name);
    setForm(f => ({ ...f, commodity: name, hsCode: c?.hsCode || '', unit: c?.unit || 'MT' }));
  };

  const filtered = MOCK_CONSIGNMENTS.filter(c => {
    const matchSearch = c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.commodity.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: MOCK_CONSIGNMENTS.length,
    pending: MOCK_CONSIGNMENTS.filter(c => ['Submitted', 'Under Review'].includes(c.status)).length,
    approved: MOCK_CONSIGNMENTS.filter(c => ['Approved', 'At Warehouse', 'Verified'].includes(c.status)).length,
    draft: MOCK_CONSIGNMENTS.filter(c => c.status === 'Draft').length,
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Consignments</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
            Step 2 — Register your commodity for warehouse onboarding
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: '#C73B22' }}>
          <Plus size={16} /> New Consignment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Consignments" value={stats.total} />
        <StatCard label="Pending Approval" value={stats.pending} sub="Requires action" color="#D97706" />
        <StatCard label="Approved / Warehoused" value={stats.approved} sub="Active stock" color="#059669" />
        <StatCard label="Drafts" value={stats.draft} sub="Incomplete" color="#888880" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-white"
          style={{ border: '1px solid #E8E2DC' }}>
          <Search size={15} style={{ color: '#B0AAA4' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID or commodity..."
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: '#1A1A1A' }}
          />
        </div>
        <div className="flex items-center gap-2">
          {['All', 'Draft', 'Submitted', 'Under Review', 'Approved', 'At Warehouse'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={statusFilter === s
                ? { background: '#C73B22', color: '#fff' }
                : { background: '#FAFAF8', color: '#888880', border: '1px solid #E8E2DC' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
                {['Reference', 'Commodity', 'HS Code', 'Qty / Unit', 'Grade', 'Origin → Hub', 'Est. Value', 'Status', 'Submitted', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#888880' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm" style={{ color: '#B0AAA4' }}>
                    No consignments found
                  </td>
                </tr>
              )}
              {filtered.map((c, i) => (
                <tr key={c.id}
                  className="hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F0EBE6' : 'none' }}>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-semibold" style={{ color: '#C73B22' }}>{c.id}</span>
                  </td>
                  <td className="px-4 py-3.5 font-medium" style={{ color: '#1A1A1A' }}>{c.commodity}</td>
                  <td className="px-4 py-3.5 font-mono text-xs" style={{ color: '#888880' }}>{c.hsCode}</td>
                  <td className="px-4 py-3.5 font-semibold" style={{ color: '#1A1A1A' }}>{c.quantity} {c.unit}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                      style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22' }}>{c.grade}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs" style={{ color: '#888880' }}>
                    {c.origin} <ChevronRight size={12} className="inline" /> <span className="font-semibold" style={{ color: '#1A1A1A' }}>{c.hub}</span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold" style={{ color: '#1A1A1A' }}>
                    <span className="text-xs" style={{ color: '#888880' }}>USD </span>{c.value}
                  </td>
                  <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3.5 text-xs" style={{ color: '#B0AAA4' }}>{c.submitted}</td>
                  <td className="px-4 py-3.5">
                    <button className="p-1.5 rounded-lg hover:bg-[#F0EBE6] transition-colors">
                      <MoreVertical size={15} style={{ color: '#B0AAA4' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Consignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" style={{ border: '1px solid #E8E2DC' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E8E2DC' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>New Consignment</h2>
                <p className="text-sm" style={{ color: '#888880' }}>Register a commodity for warehouse onboarding</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-[#F0EBE6] transition-colors">
                <X size={18} style={{ color: '#888880' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* Commodity */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Commodity *</label>
                  <select
                    value={form.commodity}
                    onChange={e => handleCommodityChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}>
                    <option value="">Select commodity...</option>
                    {COMMODITIES.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* HS Code */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>HS Code</label>
                  <input
                    value={form.hsCode}
                    onChange={e => setForm(f => ({ ...f, hsCode: e.target.value }))}
                    placeholder="e.g. 1801.00"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}
                  />
                </div>

                {/* Origin Country */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Origin Country *</label>
                  <input
                    value={form.origin}
                    onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                    placeholder="e.g. Nigeria"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Quantity *</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Unit</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}>
                    {['MT', 'KG', 'Litre', 'Barrel', 'Bag'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>

                {/* Quality Grade */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Quality Grade</label>
                  <select
                    value={form.grade}
                    onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}>
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>

                {/* Target Hub */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Target Warehouse Hub *</label>
                  <select
                    value={form.hub}
                    onChange={e => setForm(f => ({ ...f, hub: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}>
                    {HUBS.map(h => <option key={h.code} value={h.code}>[{h.code}] {h.name}</option>)}
                  </select>
                </div>

                {/* Incoterms */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Incoterms</label>
                  <select
                    value={form.incoterms}
                    onChange={e => setForm(f => ({ ...f, incoterms: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}>
                    {INCOTERMS.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>

                {/* Estimated Value */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Estimated Value (USD)</label>
                  <input
                    type="number"
                    value={form.estimatedValue}
                    onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}
                  />
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Packing details, inspection requirements, special instructions..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ border: '1px solid #E8E2DC', color: '#1A1A1A', background: '#FAFAF8' }}
                  />
                </div>
              </div>

              {/* Document upload notice */}
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.15)' }}>
                <Upload size={16} style={{ color: '#C73B22', marginTop: 1 }} />
                <p className="text-xs" style={{ color: '#888880' }}>
                  Supporting documents (phytosanitary certificate, origin certificate, quality report) can be uploaded after submission via the consignment detail page.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6" style={{ borderTop: '1px solid #E8E2DC' }}>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-[#F0EBE6]"
                style={{ color: '#888880' }}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#888880' }}>
                Save Draft
              </button>
              <button
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#C73B22' }}>
                Submit Consignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
