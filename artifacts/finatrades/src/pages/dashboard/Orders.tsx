import React, { useState } from 'react';
import {
  FileText, Plus, Search, Clock, CheckCircle2, X, AlertCircle,
  MessageSquare, ChevronRight, MoreVertical, Zap, DollarSign,
  ArrowRight, Package,
} from 'lucide-react';

const COMMODITIES = [
  'Cocoa Beans', 'Cashew Nuts (Raw)', 'Sesame Seeds', 'Palm Oil (Crude)',
  'Coffee (Arabica)', 'Cotton (Raw)', 'Copper Ore', 'Groundnuts', 'Shea Butter',
];

const HUBS = [
  { code: 'LOS', name: 'Lagos, Nigeria' },
  { code: 'NBI', name: 'Nairobi, Kenya' },
  { code: 'ACC', name: 'Accra, Ghana' },
  { code: 'ABJ', name: 'Abidjan, Côte d\'Ivoire' },
  { code: 'ADD', name: 'Addis Ababa, Ethiopia' },
  { code: 'JNB', name: 'Johannesburg, South Africa' },
  { code: 'CAI', name: 'Cairo, Egypt' },
];

const MOCK_RFQS = [
  { id: 'FT-RFQ-2025-007', commodity: 'Cocoa Beans', hub: 'LOS', qty: 100, unit: 'MT', targetPrice: 2400, currency: 'USD', status: 'Offers Received', offersCount: 3, deadline: '2025-06-01', created: '2025-05-18' },
  { id: 'FT-RFQ-2025-006', commodity: 'Sesame Seeds', hub: 'ADD', qty: 50, unit: 'MT', targetPrice: 1550, currency: 'USD', status: 'Open', offersCount: 0, deadline: '2025-05-30', created: '2025-05-15' },
  { id: 'FT-RFQ-2025-005', commodity: 'Coffee (Arabica)', hub: 'NBI', qty: 20, unit: 'MT', targetPrice: 4600, currency: 'USD', status: 'Accepted', offersCount: 2, deadline: '2025-05-25', created: '2025-05-10' },
  { id: 'FT-RFQ-2025-004', commodity: 'Cashew Nuts (Raw)', hub: 'ACC', qty: 75, unit: 'MT', targetPrice: 1850, currency: 'USD', status: 'Expired', offersCount: 1, deadline: '2025-05-12', created: '2025-05-01' },
];

const MOCK_OFFERS = [
  { id: 'OFF-001', rfqId: 'FT-RFQ-2025-007', rfqCommodity: 'Cocoa Beans', seller: 'AgriExport Co. (LOS)', qty: 100, unit: 'MT', pricePerUnit: 2450, currency: 'USD', validUntil: '2025-05-28', status: 'Pending', notes: 'FOB Lagos. Grade A confirmed. Ready for immediate dispatch.' },
  { id: 'OFF-002', rfqId: 'FT-RFQ-2025-007', rfqCommodity: 'Cocoa Beans', seller: 'West Africa Agro Ltd', qty: 100, unit: 'MT', pricePerUnit: 2500, currency: 'USD', validUntil: '2025-05-27', status: 'Pending', notes: 'CIF destination. Includes quality certificate.' },
  { id: 'OFF-003', rfqId: 'FT-RFQ-2025-007', rfqCommodity: 'Cocoa Beans', seller: 'Cacao Global Ltd', qty: 80, unit: 'MT', pricePerUnit: 2380, currency: 'USD', validUntil: '2025-05-26', status: 'Pending', notes: 'Partial fill possible. Grade A+ available.' },
  { id: 'OFF-004', rfqId: 'FT-RFQ-2025-005', rfqCommodity: 'Coffee (Arabica)', seller: 'Kenya Highlands Coffee', qty: 20, unit: 'MT', pricePerUnit: 4750, currency: 'USD', validUntil: '2025-05-24', status: 'Accepted', notes: 'Premium grade, single origin Nyeri.' },
];

const MOCK_ORDERS = [
  { id: 'FT-ORD-2025-001', commodity: 'Cocoa Beans', hub: 'LOS', qty: 100, unit: 'MT', pricePerUnit: 2450, total: 245000, currency: 'USD', seller: 'AgriExport Co.', status: 'Pending Payment', createdDate: '2025-05-20' },
  { id: 'FT-ORD-2025-000', commodity: 'Cocoa Beans', hub: 'LOS', qty: 100, unit: 'MT', pricePerUnit: 2400, total: 240000, currency: 'USD', seller: 'AgriExport Co.', status: 'Completed', createdDate: '2025-05-05' },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'Open': { bg: 'rgba(59,130,246,0.1)', color: '#2563EB' },
  'Offers Received': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  'Negotiating': { bg: 'rgba(139,92,246,0.1)', color: '#7C3AED' },
  'Accepted': { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  'Expired': { bg: 'rgba(136,136,128,0.1)', color: '#888880' },
  'Cancelled': { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
  'Pending': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  'Pending Payment': { bg: 'rgba(199,59,34,0.1)', color: '#C73B22' },
  'Completed': { bg: 'rgba(5,150,105,0.1)', color: '#047857' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Open'];
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>{status}</span>
  );
}

function NewRFQModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    commodity: '', hub: 'LOS', qty: '', unit: 'MT',
    targetPrice: '', currency: 'USD', deadline: '', notes: '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" style={{ border: '1px solid #E8E2DC' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E8E2DC' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>New Request for Quotation</h2>
            <p className="text-sm" style={{ color: '#888880' }}>Broadcast your buying intent to verified sellers</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F0EBE6]">
            <X size={18} style={{ color: '#888880' }} />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Commodity *</label>
              <select value={form.commodity} onChange={e => setForm(f => ({ ...f, commodity: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}>
                <option value="">Select commodity...</option>
                {COMMODITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Source Hub *</label>
              <select value={form.hub} onChange={e => setForm(f => ({ ...f, hub: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}>
                {HUBS.map(h => <option key={h.code} value={h.code}>[{h.code}] {h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Quantity ({form.unit}) *</label>
              <input type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Target Price (USD/MT)</label>
              <input type="number" value={form.targetPrice} onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))}
                placeholder="Optional — your budget ceiling"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Deadline for Offers</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Additional Requirements</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Quality grade, packing, inspection, payment terms, delivery requirements..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
            </div>
          </div>
          {form.qty && form.targetPrice && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.15)' }}>
              <p className="text-xs" style={{ color: '#888880' }}>Max Budget</p>
              <p className="text-xl font-bold" style={{ color: '#C73B22' }}>
                USD {(Number(form.qty) * Number(form.targetPrice)).toLocaleString()}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-6" style={{ borderTop: '1px solid #E8E2DC' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F0EBE6]" style={{ color: '#888880' }}>Cancel</button>
          <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: '#C73B22' }}>
            Broadcast RFQ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [activeTab, setActiveTab] = useState<'rfqs' | 'offers' | 'orders'>('rfqs');
  const [showNewRFQ, setShowNewRFQ] = useState(false);
  const [search, setSearch] = useState('');

  const stats = {
    openRFQs: MOCK_RFQS.filter(r => r.status === 'Open').length,
    withOffers: MOCK_RFQS.filter(r => r.status === 'Offers Received').length,
    pendingPayment: MOCK_ORDERS.filter(o => o.status === 'Pending Payment').length,
    completed: MOCK_ORDERS.filter(o => o.status === 'Completed').length,
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>RFQ & Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
            Step 6 — Request quotations, review offers, and manage trade orders
          </p>
        </div>
        <button onClick={() => setShowNewRFQ(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
          style={{ background: '#C73B22' }}>
          <Plus size={16} /> New RFQ
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.openRFQs}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Open RFQs</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#2563EB' }}>Awaiting offers</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.withOffers}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>RFQs with Offers</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#D97706' }}>Requires review</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.pendingPayment}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Pending Payment</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#C73B22' }}>Action required</p>
        </div>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.completed}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>Completed Orders</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#059669' }}>This month</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl self-start" style={{ background: '#F0EBE6' }}>
        {([['rfqs', 'My RFQs'], ['offers', 'Received Offers'], ['orders', 'Trade Orders']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === k
              ? { background: '#fff', color: '#1A1A1A', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#888880' }}>
            {label}
          </button>
        ))}
      </div>

      {/* RFQ List */}
      {activeTab === 'rfqs' && (
        <div className="space-y-3">
          {MOCK_RFQS.map(rfq => (
            <div key={rfq.id} className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E2DC' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs font-semibold" style={{ color: '#C73B22' }}>{rfq.id}</span>
                    <StatusBadge status={rfq.status} />
                    {rfq.offersCount > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                        {rfq.offersCount} offer{rfq.offersCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div><span style={{ color: '#888880' }}>Commodity: </span><span className="font-semibold" style={{ color: '#1A1A1A' }}>{rfq.commodity}</span></div>
                    <div><span style={{ color: '#888880' }}>Hub: </span><span className="font-semibold" style={{ color: '#1A1A1A' }}>{rfq.hub}</span></div>
                    <div><span style={{ color: '#888880' }}>Qty: </span><span className="font-semibold" style={{ color: '#1A1A1A' }}>{rfq.qty} {rfq.unit}</span></div>
                    <div><span style={{ color: '#888880' }}>Target: </span><span className="font-semibold" style={{ color: '#1A1A1A' }}>USD {rfq.targetPrice.toLocaleString()}/{rfq.unit}</span></div>
                    <div><span style={{ color: '#888880' }}>Expires: </span><span className="font-semibold" style={{ color: '#1A1A1A' }}>{rfq.deadline}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {rfq.offersCount > 0 && (
                    <button onClick={() => setActiveTab('offers')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90"
                      style={{ background: '#C73B22' }}>
                      View Offers <ChevronRight size={12} />
                    </button>
                  )}
                  <button className="p-2 rounded-xl hover:bg-[#F0EBE6]">
                    <MoreVertical size={15} style={{ color: '#B0AAA4' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offers */}
      {activeTab === 'offers' && (
        <div className="space-y-3">
          {MOCK_OFFERS.map(offer => (
            <div key={offer.id} className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E2DC' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs font-semibold" style={{ color: '#888880' }}>{offer.id}</span>
                    <span className="text-xs" style={{ color: '#B0AAA4' }}>for {offer.rfqId}</span>
                    <StatusBadge status={offer.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                    <div><span style={{ color: '#888880' }}>From: </span><span className="font-semibold" style={{ color: '#1A1A1A' }}>{offer.seller}</span></div>
                    <div><span style={{ color: '#888880' }}>Qty: </span><span className="font-semibold" style={{ color: '#1A1A1A' }}>{offer.qty} {offer.unit}</span></div>
                    <div>
                      <span style={{ color: '#888880' }}>Price: </span>
                      <span className="font-bold text-base" style={{ color: '#1A1A1A' }}>USD {offer.pricePerUnit.toLocaleString()}<span className="text-sm font-normal" style={{ color: '#888880' }}>/{offer.unit}</span></span>
                    </div>
                    <div>
                      <span style={{ color: '#888880' }}>Total: </span>
                      <span className="font-bold" style={{ color: '#C73B22' }}>USD {(offer.qty * offer.pricePerUnit).toLocaleString()}</span>
                    </div>
                    <div><span style={{ color: '#888880' }}>Valid until: </span><span className="font-semibold" style={{ color: '#1A1A1A' }}>{offer.validUntil}</span></div>
                  </div>
                  <p className="text-xs p-3 rounded-xl" style={{ background: '#FAFAF8', color: '#888880', border: '1px solid #F0EBE6' }}>
                    {offer.notes}
                  </p>
                </div>
                {offer.status === 'Pending' && (
                  <div className="flex flex-col gap-2">
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 whitespace-nowrap"
                      style={{ background: '#059669' }}>
                      <CheckCircle2 size={14} /> Accept Offer
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F0EBE6] whitespace-nowrap"
                      style={{ border: '1px solid #E8E2DC', color: '#888880' }}>
                      <MessageSquare size={14} /> Counter
                    </button>
                    <button className="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
                      style={{ color: '#DC2626' }}>
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Orders */}
      {activeTab === 'orders' && (
        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
                {['Order No.', 'Commodity', 'Hub', 'Quantity', 'Price/MT', 'Total (USD)', 'Seller', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: '#888880' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_ORDERS.map((order, i) => (
                <tr key={order.id} className="hover:bg-[#FAFAF8]"
                  style={{ borderBottom: i < MOCK_ORDERS.length - 1 ? '1px solid #F0EBE6' : 'none' }}>
                  <td className="px-4 py-4"><span className="font-mono text-xs font-semibold" style={{ color: '#C73B22' }}>{order.id}</span></td>
                  <td className="px-4 py-4 font-medium" style={{ color: '#1A1A1A' }}>{order.commodity}</td>
                  <td className="px-4 py-4 text-xs font-semibold" style={{ color: '#888880' }}>{order.hub}</td>
                  <td className="px-4 py-4 font-semibold" style={{ color: '#1A1A1A' }}>{order.qty} {order.unit}</td>
                  <td className="px-4 py-4" style={{ color: '#1A1A1A' }}>USD {order.pricePerUnit.toLocaleString()}</td>
                  <td className="px-4 py-4 font-bold" style={{ color: '#1A1A1A' }}>USD {order.total.toLocaleString()}</td>
                  <td className="px-4 py-4 text-xs" style={{ color: '#888880' }}>{order.seller}</td>
                  <td className="px-4 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-4 text-xs" style={{ color: '#B0AAA4' }}>{order.createdDate}</td>
                  <td className="px-4 py-4">
                    {order.status === 'Pending Payment' && (
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90"
                        style={{ background: '#C73B22' }}>
                        <DollarSign size={12} /> Pay Now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewRFQ && <NewRFQModal onClose={() => setShowNewRFQ(false)} />}
    </div>
  );
}
