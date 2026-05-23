import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Search, Filter,
  Download, RefreshCw, ChevronDown,
} from 'lucide-react';

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  'Buy': { icon: <ArrowDownLeft size={13} />, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  'Sell': { icon: <ArrowUpRight size={13} />, color: '#C73B22', bg: 'rgba(199,59,34,0.08)' },
  'Send': { icon: <ArrowUpRight size={13} />, color: '#D97706', bg: 'rgba(245,158,11,0.08)' },
  'Receive': { icon: <ArrowDownLeft size={13} />, color: '#2563EB', bg: 'rgba(59,130,246,0.08)' },
  'Deposit': { icon: <ArrowDownLeft size={13} />, color: '#7C3AED', bg: 'rgba(139,92,246,0.08)' },
  'Withdrawal': { icon: <ArrowUpRight size={13} />, color: '#DC2626', bg: 'rgba(239,68,68,0.08)' },
  'Swap': { icon: <ArrowLeftRight size={13} />, color: '#0891B2', bg: 'rgba(8,145,178,0.08)' },
  'Escrow Fund': { icon: <ArrowUpRight size={13} />, color: '#C73B22', bg: 'rgba(199,59,34,0.08)' },
  'Escrow Release': { icon: <ArrowDownLeft size={13} />, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
};

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  'Completed': { color: '#047857', bg: 'rgba(5,150,105,0.1)' },
  'Pending': { color: '#D97706', bg: 'rgba(245,158,11,0.1)' },
  'Processing': { color: '#2563EB', bg: 'rgba(59,130,246,0.1)' },
  'Failed': { color: '#DC2626', bg: 'rgba(239,68,68,0.1)' },
  'Cancelled': { color: '#888880', bg: 'rgba(136,136,128,0.1)' },
};

const MOCK_TXS = [
  { id: 'TX-00234', type: 'Escrow Fund', description: 'Funded Escrow FT-ESC-2025-001', amount: -245000, currency: 'FUSD', status: 'Pending', date: '2025-05-20 14:32', ref: 'FT-ORD-2025-001' },
  { id: 'TX-00233', type: 'Escrow Release', description: 'Escrow FT-ESC-2025-000 released to AgriExport', amount: 240000, currency: 'FUSD', status: 'Completed', date: '2025-05-18 09:15', ref: 'FT-ESC-2025-000' },
  { id: 'TX-00232', type: 'Deposit', description: 'FUSD Wallet Top-up via WINVESTNET', amount: 500000, currency: 'FUSD', status: 'Completed', date: '2025-05-05 11:00', ref: 'WN-9923' },
  { id: 'TX-00231', type: 'Buy', description: 'Cocoa Beans — 100 MT (FT-ORD-2025-000)', amount: -240000, currency: 'FUSD', status: 'Completed', date: '2025-05-05 10:58', ref: 'FT-ORD-2025-000' },
  { id: 'TX-00230', type: 'Deposit', description: 'FUSD Wallet Top-up via Bank Transfer', amount: 200000, currency: 'FUSD', status: 'Completed', date: '2025-04-28 08:30', ref: 'BANK-4410' },
  { id: 'TX-00229', type: 'Send', description: 'Transfer to Sesame Seeds Supplier — DKR Hub', amount: -32000, currency: 'FUSD', status: 'Completed', date: '2025-04-22 15:45', ref: 'FT-0009' },
  { id: 'TX-00228', type: 'Receive', description: 'Refund from Rejected Consignment', amount: 15000, currency: 'FUSD', status: 'Completed', date: '2025-04-18 12:10', ref: 'FT-CSG-REFUND-003' },
  { id: 'TX-00227', type: 'Withdrawal', description: 'Withdrawal to First Bank NG — Account ****1221', amount: -50000, currency: 'FUSD', status: 'Completed', date: '2025-04-10 09:00', ref: 'WD-0087' },
];

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const types = ['All', ...Object.keys(TYPE_META)];
  const statuses = ['All', 'Completed', 'Pending', 'Processing', 'Failed'];

  const filtered = MOCK_TXS.filter(tx => {
    const matchSearch = tx.id.toLowerCase().includes(search.toLowerCase()) ||
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.ref.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All' || tx.type === typeFilter;
    const matchStatus = statusFilter === 'All' || tx.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalIn = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Transactions</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>Full transaction history and FUSD wallet audit trail</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F0EBE6] transition-all"
          style={{ border: '1px solid #E8E2DC', color: '#888880' }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#059669' }}>+FUSD {totalIn.toLocaleString()}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Total Inflow (filtered)</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#C73B22' }}>−FUSD {totalOut.toLocaleString()}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Total Outflow (filtered)</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>FUSD {(totalIn - totalOut).toLocaleString()}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Net Movement</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-white"
          style={{ border: '1px solid #E8E2DC' }}>
          <Search size={14} style={{ color: '#B0AAA4' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, description, reference..."
            className="flex-1 text-sm outline-none bg-transparent" style={{ color: '#1A1A1A' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ border: '1px solid #E8E2DC', background: '#fff', color: '#1A1A1A' }}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ border: '1px solid #E8E2DC', background: '#fff', color: '#1A1A1A' }}>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
                {['Date', 'TX ID', 'Type', 'Description', 'Amount (FUSD)', 'Status', 'Reference'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: '#888880' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-sm" style={{ color: '#B0AAA4' }}>No transactions found</td></tr>
              )}
              {filtered.map((tx, i) => {
                const meta = TYPE_META[tx.type] || TYPE_META['Buy'];
                const st = STATUS_STYLES[tx.status] || STATUS_STYLES['Pending'];
                return (
                  <tr key={tx.id} className="hover:bg-[#FAFAF8] transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F0EBE6' : 'none' }}>
                    <td className="px-4 py-3.5 text-xs font-mono whitespace-nowrap" style={{ color: '#888880' }}>{tx.date}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold" style={{ color: '#C73B22' }}>{tx.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.icon} {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[260px]">
                      <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{tx.description}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-sm" style={{ color: tx.amount > 0 ? '#059669' : '#1A1A1A' }}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: st.bg, color: st.color }}>{tx.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono" style={{ color: '#B0AAA4' }}>{tx.ref}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
