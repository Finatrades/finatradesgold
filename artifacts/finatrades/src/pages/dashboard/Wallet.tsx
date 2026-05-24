import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet as WalletIcon, Lock, Clock, ArrowDownToLine, ArrowUpFromLine,
  Copy, CheckCircle2, AlertCircle, RefreshCw, Building2, Bitcoin, CreditCard,
  ChevronRight, X,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

type TabKey = 'transactions' | 'holds' | 'deposit' | 'withdraw';

function fmt(cents: number | string) {
  const n = typeof cents === 'string' ? Number(cents) : cents;
  return `$${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({ label, value, sub, accent, icon }: any) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: '1px solid #E8E2DC' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: accent.bg }}>
          {React.cloneElement(icon, { size: 16, style: { color: accent.color } })}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#888880' }}>{label}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#888880' }}>{sub}</p>}
    </div>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FAFAF8]" style={{ border: '1px solid #E8E2DC' }}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#888880' }}>{label}</p>
        <p className="text-sm font-mono truncate" style={{ color: '#1A1A1A' }}>{value}</p>
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-white transition" style={{ color: '#C73B22' }}
      >
        {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export default function Wallet() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('transactions');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: wallet, isLoading, refetch } = useQuery({
    queryKey: ['b2b-wallet'],
    queryFn: async () => (await apiRequest('GET', '/api/b2b/wallet')).json(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['b2b-wallet-transactions', typeFilter],
    queryFn: async () => {
      const url = `/api/b2b/wallet/transactions?type=${encodeURIComponent(typeFilter)}&limit=100`;
      return (await apiRequest('GET', url)).json();
    },
    enabled: tab === 'transactions',
  });

  const { data: holds = [] } = useQuery({
    queryKey: ['b2b-wallet-holds'],
    queryFn: async () => (await apiRequest('GET', '/api/b2b/wallet/holds?status=open')).json(),
    enabled: tab === 'holds',
  });

  const releaseMut = useMutation({
    mutationFn: async (id: string) => (await apiRequest('POST', `/api/b2b/wallet/holds/${id}/release`)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['b2b-wallet'] }); qc.invalidateQueries({ queryKey: ['b2b-wallet-holds'] }); toast.success('Hold released'); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E8E2DC', borderTopColor: '#C73B22' }} /></div>;
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Wallet</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>USD trading balance, holds and settlement history</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[#F0EBE6] transition" style={{ border: '1px solid #E8E2DC', color: '#888880' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Available" value={fmt(wallet?.availableCents || 0)} sub="Ready to spend or withdraw"
          accent={{ bg: 'rgba(5,150,105,0.08)', color: '#059669' }} icon={<WalletIcon />} />
        <StatCard label="Locked" value={fmt(wallet?.lockedCents || 0)} sub="Held for orders / escrow"
          accent={{ bg: 'rgba(245,158,11,0.08)', color: '#D97706' }} icon={<Lock />} />
        <StatCard label="Pending Settlement" value={fmt(wallet?.pendingCents || 0)} sub="Deposits awaiting confirmation"
          accent={{ bg: 'rgba(59,130,246,0.08)', color: '#2563EB' }} icon={<Clock />} />
      </div>

      <div className="flex items-center gap-2 border-b" style={{ borderColor: '#E8E2DC' }}>
        {[
          { k: 'transactions', l: 'Transactions' },
          { k: 'holds', l: 'Holds' },
          { k: 'deposit', l: 'Deposit' },
          { k: 'withdraw', l: 'Withdraw' },
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

      {tab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E8E2DC', background: '#fff', color: '#1A1A1A' }}>
              <option value="all">All types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="hold_placed">Hold placed</option>
              <option value="hold_released">Hold released</option>
              <option value="hold_converted_to_escrow">Converted to escrow</option>
              <option value="fee">Fee</option>
            </select>
          </div>
          <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
                {['Date', 'Type', 'Amount', 'Balance After', 'Reference', 'Description'].map(h =>
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#888880' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {transactions.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#B0AAA4' }}>No transactions yet</td></tr>}
                {transactions.map((tx: any, i: number) => (
                  <tr key={tx.id} style={{ borderBottom: i < transactions.length - 1 ? '1px solid #F0EBE6' : 'none' }}>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: '#888880' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22' }}>{tx.type}</span></td>
                    <td className="px-4 py-3 font-bold text-sm" style={{ color: Number(tx.amountCents) >= 0 ? '#059669' : '#C73B22' }}>{Number(tx.amountCents) >= 0 ? '+' : ''}{fmt(tx.amountCents)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#1A1A1A' }}>{fmt(tx.balanceAfterCents)}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: '#888880' }}>{tx.referenceType || ''} {tx.referenceId ? `#${tx.referenceId.slice(0, 8)}` : ''}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#888880' }}>{tx.description || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'holds' && (
        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E8E2DC' }}>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
              {['Placed', 'Amount', 'Reference', 'Expires', 'Status', ''].map(h =>
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#888880' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {holds.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#B0AAA4' }}>No open holds</td></tr>}
              {holds.map((h: any) => (
                <tr key={h.id}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#888880' }}>{new Date(h.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#D97706' }}>{fmt(h.amountCents)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#888880' }}>{h.referenceType} {h.referenceId ? `#${h.referenceId.slice(0, 8)}` : ''}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#888880' }}>{h.expiresAt ? new Date(h.expiresAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>{h.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => releaseMut.mutate(h.id)} disabled={releaseMut.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#F0EBE6] transition" style={{ border: '1px solid #E8E2DC', color: '#C73B22' }}>
                      Release
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'deposit' && <DepositTab wallet={wallet} />}
      {tab === 'withdraw' && <WithdrawTab available={wallet?.availableCents || 0} />}
    </div>
  );
}

function DepositTab({ wallet }: { wallet: any }) {
  const [rail, setRail] = useState<'bank' | 'stablecoin' | 'card'>('bank');
  const [amount, setAmount] = useState('');
  const qc = useQueryClient();
  const intentMut = useMutation({
    mutationFn: async () => {
      const cents = Math.round(parseFloat(amount || '0') * 100);
      const res = await apiRequest('POST', '/api/b2b/wallet/deposits/intents', { rail, amountCents: cents });
      return res.json();
    },
    onSuccess: (data) => { toast.success(data?.note || 'Deposit intent created'); qc.invalidateQueries({ queryKey: ['b2b-wallet'] }); setAmount(''); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { k: 'bank', label: 'Bank Transfer', icon: <Building2 size={18} />, desc: 'Transfer to your virtual account. Admin reconciles.' },
        { k: 'stablecoin', label: 'Stablecoin (USDC/USDT)', icon: <Bitcoin size={18} />, desc: 'Polygon network. Instant on confirmation.' },
        { k: 'card', label: 'Card top-up', icon: <CreditCard size={18} />, desc: 'Up to $5,000 per transaction.' },
      ].map(opt => (
        <button key={opt.k} onClick={() => setRail(opt.k as any)}
          className="rounded-2xl p-5 text-left transition bg-white"
          style={{
            border: rail === opt.k ? '2px solid #C73B22' : '1px solid #E8E2DC',
          }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: rail === opt.k ? '#C73B22' : '#888880' }}>
            {opt.icon}
            <p className="font-semibold text-sm">{opt.label}</p>
          </div>
          <p className="text-xs" style={{ color: '#888880' }}>{opt.desc}</p>
        </button>
      ))}

      <div className="md:col-span-3 rounded-2xl p-6 bg-white" style={{ border: '1px solid #E8E2DC' }}>
        {rail === 'bank' && (
          <div className="space-y-3">
            <h3 className="font-bold" style={{ color: '#1A1A1A' }}>Bank transfer instructions</h3>
            <p className="text-sm" style={{ color: '#888880' }}>Transfer to the virtual account below and include the reference in your bank narration. Funds are reconciled by an operator and may take up to 1 business day.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <CopyField label="Account number" value={wallet?.virtualAccount?.number || '—'} />
              <CopyField label="Bank" value={wallet?.virtualAccount?.bank || '—'} />
              <CopyField label="Reference" value={wallet?.virtualAccount?.reference || '—'} />
            </div>
            <p className="text-xs mt-3 px-3 py-2 rounded-xl flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', color: '#92400E' }}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              V1: virtual accounts are display-only. An operator manually matches your transfer and credits the wallet.
            </p>
          </div>
        )}
        {rail === 'stablecoin' && (
          <div className="space-y-3">
            <h3 className="font-bold" style={{ color: '#1A1A1A' }}>Stablecoin deposit address (Polygon)</h3>
            <CopyField label="USDC / USDT address" value={wallet?.stablecoin?.address || '—'} />
            <p className="text-xs mt-2" style={{ color: '#888880' }}>Send only USDC or USDT on the Polygon network to this address. Other networks will be lost. Credit is instant after one confirmation.</p>
          </div>
        )}
        {rail === 'card' && (
          <div className="space-y-3">
            <h3 className="font-bold" style={{ color: '#1A1A1A' }}>Card top-up</h3>
            <p className="text-sm" style={{ color: '#888880' }}>Enter the amount you'd like to add. We'll create a Stripe payment intent.</p>
          </div>
        )}

        <div className="mt-5 flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold" style={{ color: '#888880' }}>Amount (USD)</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" step="0.01" placeholder="0.00"
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ border: '1px solid #E8E2DC', background: '#fff' }} />
          </div>
          <button onClick={() => intentMut.mutate()} disabled={intentMut.isPending || !amount || Number(amount) <= 0}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#C73B22' }}>
            {intentMut.isPending ? 'Creating…' : 'Create deposit intent'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WithdrawTab({ available }: { available: number }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    amount: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    swiftCode: '',
    iban: '',
    country: '',
  });
  const mut = useMutation({
    mutationFn: async () => {
      const cents = Math.round(parseFloat(form.amount || '0') * 100);
      const res = await apiRequest('POST', '/api/b2b/wallet/withdrawals', {
        amountCents: cents,
        bankDetails: {
          bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber,
          swiftCode: form.swiftCode || undefined, iban: form.iban || undefined, country: form.country || undefined,
        },
      });
      return res.json();
    },
    onSuccess: () => { toast.success('Withdrawal request submitted. Awaiting admin approval.'); qc.invalidateQueries({ queryKey: ['b2b-wallet'] }); setForm({ amount: '', bankName: '', accountName: '', accountNumber: '', swiftCode: '', iban: '', country: '' }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const fields: [keyof typeof form, string, boolean][] = [
    ['bankName', 'Bank name', true],
    ['accountName', 'Account holder name', true],
    ['accountNumber', 'Account number', true],
    ['swiftCode', 'SWIFT / BIC', false],
    ['iban', 'IBAN', false],
    ['country', 'Bank country', false],
  ];

  return (
    <div className="rounded-2xl p-6 bg-white max-w-2xl" style={{ border: '1px solid #E8E2DC' }}>
      <h3 className="font-bold mb-1" style={{ color: '#1A1A1A' }}>Withdraw to bank</h3>
      <p className="text-sm mb-4" style={{ color: '#888880' }}>Available: <b style={{ color: '#1A1A1A' }}>{fmt(available)}</b>. Withdrawals require admin approval before payout.</p>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: '#888880' }}>Amount (USD)</label>
          <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} type="number" min="1" step="0.01"
            className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ border: '1px solid #E8E2DC' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map(([key, label, required]) => (
            <div key={key}>
              <label className="text-xs font-semibold" style={{ color: '#888880' }}>{label}{required ? ' *' : ''}</label>
              <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ border: '1px solid #E8E2DC' }} />
            </div>
          ))}
        </div>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !form.amount || !form.bankName || !form.accountName || !form.accountNumber}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#C73B22' }}>
          {mut.isPending ? 'Submitting…' : 'Submit withdrawal request'}
        </button>
      </div>
    </div>
  );
}
