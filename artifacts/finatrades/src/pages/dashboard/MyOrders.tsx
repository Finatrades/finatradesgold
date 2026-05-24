import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Package, Eye, ShieldCheck, Calendar, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Order {
  id: string;
  orderNo: string | null;
  buyerId: string;
  sellerId: string;
  commodity: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalAmount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  consignmentId: string | null;
  walletHoldId: string | null;
  marginCents: number | null;
  paidAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  'Pending Payment': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  'Pending Wallet': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  'Paid': { bg: 'rgba(5,150,105,0.1)', color: '#047857' },
  'Shipped': { bg: 'rgba(59,130,246,0.1)', color: '#2563EB' },
  'Delivered': { bg: 'rgba(5,150,105,0.1)', color: '#047857' },
  'Cancelled': { bg: 'rgba(220,38,38,0.1)', color: '#DC2626' },
};

export default function MyOrders() {
  const { user } = useAuth() as { user: any };
  const defaultSide: 'buy' | 'sell' = user?.userType === 'exporter' ? 'sell' : 'buy';
  const [side, setSide] = useState<'buy' | 'sell'>(defaultSide);

  const { data, isLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ['/api/b2b/marketplace/orders/mine', side],
    queryFn: async () => {
      const r = await fetch(`/api/b2b/marketplace/orders/mine?side=${side}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to load orders');
      return r.json();
    },
  });
  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>My Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
            {side === 'buy' ? 'Orders you have placed' : 'Orders against your listings'}
          </p>
        </div>
        {user?.role === 'admin' || user?.userType === undefined ? (
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}>
            <button onClick={() => setSide('buy')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={side === 'buy' ? { background: '#C73B22', color: '#fff' } : { color: '#888880' }}>
              Buy-side
            </button>
            <button onClick={() => setSide('sell')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={side === 'sell' ? { background: '#C73B22', color: '#fff' } : { color: '#888880' }}>
              Sell-side
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#E8E2DC', borderTopColor: '#C73B22' }} />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center" style={{ border: '1px dashed #E8E2DC' }}>
          <Package size={32} style={{ color: '#E8E2DC' }} className="mx-auto" />
          <p className="mt-3 text-sm font-medium" style={{ color: '#B0AAA4' }}>No orders yet.</p>
          {side === 'buy' && (
            <Link href="/marketplace" className="inline-block mt-3 text-xs font-semibold underline" style={{ color: '#C73B22' }}>
              Browse the marketplace →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#FAFAF8' }}>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#888880' }}>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Commodity</th>
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Margin held</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const sc = STATUS_COLORS[o.status] || { bg: '#F0EBE6', color: '#888880' };
                const marginUsd = o.marginCents ? o.marginCents / 100 : 0;
                return (
                  <tr key={o.id} style={{ borderTop: '1px solid #F0EBE6' }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1A1A1A' }}>{o.orderNo || o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1A1A1A' }}>{o.commodity}</td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{o.quantity} {o.unit}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1A1A1A' }}>
                      {o.currency} {o.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {marginUsd > 0 ? (
                        <span className="inline-flex items-center gap-1" style={{ color: '#059669' }}>
                          <Wallet size={11} /> ${marginUsd.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#888880' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-md"
                        style={{ background: sc.bg, color: sc.color }}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#888880' }}>
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {o.consignmentId && (
                        <Link href={`/marketplace/${o.consignmentId}`}
                          className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: '#C73B22' }}>
                          <Eye size={12} /> Lot
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
