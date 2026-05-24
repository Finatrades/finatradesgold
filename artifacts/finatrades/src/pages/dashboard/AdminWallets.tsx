import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, CheckCircle2, X, AlertCircle, Wallet as WalletIcon, ChevronRight, Eye } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

function fmt(cents: number | string) {
  const n = typeof cents === 'string' ? Number(cents) : cents;
  return `$${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type TabKey = 'wallets' | 'withdrawals' | 'reconcile';

export default function AdminWallets() {
  const [tab, setTab] = useState<TabKey>('wallets');
  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Wallets — Admin</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888880' }}>Reconcile deposits, approve withdrawals, audit balances.</p>
      </div>
      <div className="flex items-center gap-2 border-b" style={{ borderColor: '#E8E2DC' }}>
        {[
          { k: 'wallets', l: 'All wallets' },
          { k: 'withdrawals', l: 'Withdrawal queue' },
          { k: 'reconcile', l: 'Reconcile deposit' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as TabKey)}
            className="px-4 py-3 text-sm font-semibold transition"
            style={{
              color: tab === t.k ? '#C73B22' : '#888880',
              borderBottom: tab === t.k ? '2px solid #C73B22' : '2px solid transparent',
              marginBottom: '-1px',
            }}>{t.l}</button>
        ))}
      </div>

      {tab === 'wallets' && <WalletList />}
      {tab === 'withdrawals' && <WithdrawalQueue />}
      {tab === 'reconcile' && <ReconcileForm />}
    </div>
  );
}

function WalletList() {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ['admin-wallets', q],
    queryFn: async () => (await apiRequest('GET', `/api/b2b/admin/wallets?q=${encodeURIComponent(q)}`)).json(),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Available', cents: data?.totals?.total_available || 0, color: '#059669' },
          { label: 'Locked', cents: data?.totals?.total_locked || 0, color: '#D97706' },
          { label: 'Pending', cents: data?.totals?.total_pending || 0, color: '#2563EB' },
          { label: 'Wallets', cents: 0, color: '#1A1A1A', count: data?.totals?.wallet_count || 0 },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#888880' }}>{c.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: c.color }}>{c.count !== undefined ? c.count : fmt(c.cents)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white" style={{ border: '1px solid #E8E2DC' }}>
        <Search size={14} style={{ color: '#B0AAA4' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by email, name, company, virtual account…"
          className="flex-1 text-sm outline-none bg-transparent" />
      </div>

      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
            {['User', 'Virtual Account', 'Available', 'Locked', 'Pending', ''].map(h =>
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#888880' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(!data?.wallets || data.wallets.length === 0) && <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#B0AAA4' }}>No wallets</td></tr>}
            {data?.wallets?.map((row: any) => (
              <tr key={row.wallet.id} className="hover:bg-[#FAFAF8] cursor-pointer" onClick={() => setSelected(row.user?.id)}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{row.user?.companyName || `${row.user?.firstName || ''} ${row.user?.lastName || ''}`}</p>
                  <p className="text-xs" style={{ color: '#888880' }}>{row.user?.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#888880' }}>{row.wallet.virtualAccountNumber}</td>
                <td className="px-4 py-3 font-bold" style={{ color: '#059669' }}>{fmt(row.wallet.availableCents)}</td>
                <td className="px-4 py-3 font-bold" style={{ color: '#D97706' }}>{fmt(row.wallet.lockedCents)}</td>
                <td className="px-4 py-3 font-bold" style={{ color: '#2563EB' }}>{fmt(row.wallet.pendingCents)}</td>
                <td className="px-4 py-3 text-right"><ChevronRight size={14} style={{ color: '#B0AAA4' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <WalletDetailModal userId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function WalletDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['admin-wallet-detail', userId],
    queryFn: async () => (await apiRequest('GET', `/api/b2b/admin/wallets/${userId}`)).json(),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #E8E2DC' }}>
          <div>
            <h2 className="font-bold" style={{ color: '#1A1A1A' }}>{data?.user?.companyName || data?.user?.email}</h2>
            <p className="text-xs" style={{ color: '#888880' }}>{data?.wallet?.virtualAccountNumber}</p>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(5,150,105,0.06)' }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: '#059669' }}>Available</p>
              <p className="text-lg font-bold" style={{ color: '#059669' }}>{fmt(data?.wallet?.availableCents || 0)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)' }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: '#D97706' }}>Locked</p>
              <p className="text-lg font-bold" style={{ color: '#D97706' }}>{fmt(data?.wallet?.lockedCents || 0)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.06)' }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: '#2563EB' }}>Pending</p>
              <p className="text-lg font-bold" style={{ color: '#2563EB' }}>{fmt(data?.wallet?.pendingCents || 0)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#1A1A1A' }}>Transactions ({data?.transactions?.length || 0})</h3>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
              <table className="w-full text-xs">
                <thead><tr style={{ background: '#FAFAF8' }}>
                  {['Date', 'Type', 'Amount', 'Balance After', 'Ref'].map(h => <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: '#888880' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data?.transactions?.map((tx: any) => (
                    <tr key={tx.id}>
                      <td className="px-3 py-2 font-mono">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">{tx.type}</td>
                      <td className="px-3 py-2 font-bold" style={{ color: Number(tx.amountCents) >= 0 ? '#059669' : '#C73B22' }}>{Number(tx.amountCents) >= 0 ? '+' : ''}{fmt(tx.amountCents)}</td>
                      <td className="px-3 py-2">{fmt(tx.balanceAfterCents)}</td>
                      <td className="px-3 py-2 font-mono">{tx.referenceType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#1A1A1A' }}>Holds ({data?.holds?.length || 0})</h3>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
              <table className="w-full text-xs">
                <thead><tr style={{ background: '#FAFAF8' }}>
                  {['Placed', 'Amount', 'Status', 'Reference'].map(h => <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: '#888880' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data?.holds?.map((h: any) => (
                    <tr key={h.id}>
                      <td className="px-3 py-2 font-mono">{new Date(h.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 font-bold">{fmt(h.amountCents)}</td>
                      <td className="px-3 py-2">{h.status}</td>
                      <td className="px-3 py-2 font-mono">{h.referenceType} #{h.referenceId?.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WithdrawalQueue() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [viewingBank, setViewingBank] = useState<string | null>(null);

  const { data: list = [] } = useQuery({
    queryKey: ['admin-withdrawals', status],
    queryFn: async () => (await apiRequest('GET', `/api/b2b/admin/withdrawals?status=${status}`)).json(),
  });

  const decisionMut = useMutation({
    mutationFn: async (input: { id: string; action: 'approve' | 'reject'; rejectReason?: string }) => {
      const res = await apiRequest('PATCH', `/api/b2b/admin/withdrawals/${input.id}`, {
        action: input.action, rejectReason: input.rejectReason,
      });
      return res.json();
    },
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['admin-withdrawals'] }); setRejecting(null); setReason(''); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const { data: bankDetails } = useQuery({
    queryKey: ['admin-bank-details', viewingBank],
    queryFn: async () => (await apiRequest('GET', `/api/b2b/admin/withdrawals/${viewingBank}/bank-details`)).json(),
    enabled: !!viewingBank,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: status === s ? '#C73B22' : '#fff',
              color: status === s ? '#fff' : '#888880',
              border: '1px solid #E8E2DC',
            }}>{s}</button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
            {['Requested', 'User', 'Amount', 'Bank', 'Status', 'Actions'].map(h =>
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#888880' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#B0AAA4' }}>No withdrawals</td></tr>}
            {list.map((row: any) => {
              const wd = row.withdrawal;
              return (
                <tr key={wd.id} style={{ borderBottom: '1px solid #F0EBE6' }}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#888880' }}>{new Date(wd.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{row.user?.companyName || `${row.user?.firstName} ${row.user?.lastName}`}</p>
                    <p className="text-xs" style={{ color: '#888880' }}>{row.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#1A1A1A' }}>{fmt(wd.amountCents)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#888880' }}>
                    {wd.bankDetailsHint}
                    <button onClick={() => setViewingBank(wd.id)} className="ml-2 inline-flex items-center gap-1 text-[#C73B22] font-semibold">
                      <Eye size={11} /> View
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full font-semibold" style={{
                      background: wd.status === 'pending' ? 'rgba(245,158,11,0.1)' : wd.status === 'approved' ? 'rgba(5,150,105,0.1)' : 'rgba(239,68,68,0.1)',
                      color: wd.status === 'pending' ? '#D97706' : wd.status === 'approved' ? '#047857' : '#DC2626',
                    }}>{wd.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {wd.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => decisionMut.mutate({ id: wd.id, action: 'approve' })} disabled={decisionMut.isPending}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: '#059669' }}>Approve</button>
                        <button onClick={() => setRejecting(wd.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ border: '1px solid #E8E2DC', color: '#DC2626' }}>Reject</button>
                      </div>
                    )}
                    {wd.rejectReason && <p className="text-xs italic" style={{ color: '#888880' }}>{wd.rejectReason}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full">
            <h3 className="font-bold mb-3">Reject withdrawal</h3>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason (visible to user)..."
              className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3" style={{ border: '1px solid #E8E2DC' }} />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setRejecting(null); setReason(''); }} className="px-4 py-2 rounded-xl text-sm" style={{ border: '1px solid #E8E2DC' }}>Cancel</button>
              <button onClick={() => decisionMut.mutate({ id: rejecting, action: 'reject', rejectReason: reason })}
                disabled={!reason || decisionMut.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#DC2626' }}>Confirm reject</button>
            </div>
          </div>
        </div>
      )}

      {viewingBank && bankDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold">Bank details</h3>
              <button onClick={() => setViewingBank(null)}><X size={16} /></button>
            </div>
            <div className="space-y-2 text-sm">
              {Object.entries(bankDetails).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b py-1.5" style={{ borderColor: '#F0EBE6' }}>
                  <span style={{ color: '#888880' }}>{k}</span><span className="font-mono" style={{ color: '#1A1A1A' }}>{String(v)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 italic" style={{ color: '#888880' }}>This view is audit-logged.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ReconcileForm() {
  const [form, setForm] = useState({ userId: '', amount: '', reference: '', note: '' });
  const mut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/b2b/admin/wallets/${form.userId}/credit`, {
        amountCents: Math.round(parseFloat(form.amount || '0') * 100),
        reference: form.reference,
        note: form.note || undefined,
      });
      return res.json();
    },
    onSuccess: () => { toast.success('Wallet credited'); setForm({ userId: '', amount: '', reference: '', note: '' }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });
  return (
    <div className="rounded-2xl p-6 bg-white max-w-2xl" style={{ border: '1px solid #E8E2DC' }}>
      <h3 className="font-bold mb-1" style={{ color: '#1A1A1A' }}>Reconcile inbound bank deposit</h3>
      <p className="text-sm mb-4" style={{ color: '#888880' }}>Credit a user's wallet for funds received via bank transfer. Reference is used as idempotency key.</p>
      <div className="space-y-3">
        {[
          { k: 'userId', l: 'User ID', placeholder: 'UUID' },
          { k: 'amount', l: 'Amount (USD)', type: 'number' },
          { k: 'reference', l: 'Bank reference (idempotency key) *' },
          { k: 'note', l: 'Internal note' },
        ].map(f => (
          <div key={f.k}>
            <label className="text-xs font-semibold" style={{ color: '#888880' }}>{f.l}</label>
            <input value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} type={f.type || 'text'}
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ border: '1px solid #E8E2DC' }} />
          </div>
        ))}
        <p className="text-xs px-3 py-2 rounded-xl flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', color: '#92400E' }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          Proof upload is logged via metadata for v1. Use a unique bank reference per deposit to prevent double-credit.
        </p>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !form.userId || !form.amount || !form.reference}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#C73B22' }}>
          {mut.isPending ? 'Crediting…' : 'Credit wallet'}
        </button>
      </div>
    </div>
  );
}
