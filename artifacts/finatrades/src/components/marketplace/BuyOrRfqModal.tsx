import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { X, ShieldAlert, Wallet, Zap, MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface Lot {
  id: string;
  consignmentId: string;
  commodity: string;
  hub: string | null;
  country: string | null;
  qty: number;
  unit: string;
  minOrder: number;
  incoterms: string | null;
  pricePerUnitCents: number | null;
  currency: string;
  seller: { name: string };
}

interface Eligibility {
  eligible: boolean;
  reason?: string;
  kycStatus?: string;
  kycTier?: string;
  marginBps: number;
}

interface WalletResponse {
  wallet?: { availableCents: number; lockedCents: number; currency: string };
}

interface FailureReason {
  code: string;
  message: string;
  requiredMarginCents?: number;
  totalCents?: number;
  kycStatus?: string;
}

export default function BuyOrRfqModal({
  lot, mode, onClose,
}: { lot: Lot; mode: 'buy' | 'rfq'; onClose: () => void }) {
  const { user } = useAuth() as { user: any };
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [qty, setQty] = useState(String(lot.minOrder));
  const [targetPrice, setTargetPrice] = useState(
    lot.pricePerUnitCents != null ? String((lot.pricePerUnitCents / 100).toFixed(2)) : ''
  );
  const [notes, setNotes] = useState('');
  const [incoterms, setIncoterms] = useState<string>(lot.incoterms || 'FOB');
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10);
  });
  const [serverReasons, setServerReasons] = useState<FailureReason[] | null>(null);

  const isImporter = user?.userType === 'importer' || user?.role === 'admin';

  const { data: elig } = useQuery<Eligibility>({
    queryKey: ['/api/b2b/marketplace/eligibility'],
    enabled: isImporter,
  });
  const { data: walletData, isSuccess: walletLoaded } = useQuery<WalletResponse>({
    queryKey: ['/api/b2b/wallet'],
    enabled: isImporter,
  });

  const askPrice = lot.pricePerUnitCents != null ? lot.pricePerUnitCents / 100 : null;
  const effectivePrice = mode === 'buy' ? askPrice : Number(targetPrice || 0);
  const totalUsd = (Number(qty) || 0) * (effectivePrice || 0);
  const marginBps = elig?.marginBps ?? 1000;
  const requiredMarginUsd = Math.ceil((totalUsd * marginBps) / 100) / 100;
  const availableUsd = walletData?.wallet ? walletData.wallet.availableCents / 100 : 0;

  const buyMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', '/api/b2b/marketplace/orders', {
        consignmentId: lot.consignmentId,
        quantity: Number(qty),
        incoterms: incoterms || undefined,
        notes: notes || undefined,
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const err: any = new Error(body.message || 'Order failed');
        err.status = r.status;
        err.reasons = body.reasons;
        throw err;
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/lots'] });
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/orders/mine'] });
      qc.invalidateQueries({ queryKey: ['/api/b2b/wallet'] });
      toast({ title: 'Order placed', description: 'Margin held, awaiting full payment.' });
      onClose();
      setLocation('/orders/mine');
    },
    onError: (e: any) => {
      if (e.status === 402 && e.reasons) {
        setServerReasons(e.reasons);
      } else {
        toast({ title: 'Could not place order', description: e.message, variant: 'destructive' });
      }
    },
  });

  const rfqMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', '/api/b2b/marketplace/rfqs', {
        consignmentId: lot.consignmentId,
        commodity: lot.commodity,
        quantity: Number(qty),
        unit: lot.unit,
        targetPricePerUnit: effectivePrice || undefined,
        currency: lot.currency,
        hubCode: lot.hub ?? undefined,
        incoterms: incoterms || undefined,
        expiresAt: validUntil ? new Date(validUntil).toISOString() : undefined,
        notes: notes || undefined,
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const err: any = new Error(body.message || 'RFQ failed');
        err.status = r.status;
        err.reasons = body.reasons;
        throw err;
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/rfqs/mine'] });
      toast({ title: 'RFQ submitted', description: 'Sellers will respond shortly.' });
      onClose();
      setLocation('/rfqs/mine');
    },
    onError: (e: any) => {
      if (e.status === 402 && e.reasons) setServerReasons(e.reasons);
      else toast({ title: 'Could not submit RFQ', description: e.message, variant: 'destructive' });
    },
  });

  const submitting = buyMutation.isPending || rfqMutation.isPending;
  const kycFail = isImporter && !!elig && !elig.eligible;
  const walletMissing = isImporter && walletLoaded && !walletData?.wallet;
  const insufficientFundsLocal = requiredMarginUsd > 0 && availableUsd < requiredMarginUsd;

  const disabled = useMemo(() => {
    if (!isImporter) return true;
    if (submitting) return true;
    if (Number(qty) <= 0) return true;
    if (mode === 'buy' && (askPrice == null || Number(qty) < lot.minOrder)) return true;
    if (kycFail) return true;
    if (walletMissing) return true;
    if (insufficientFundsLocal) return true;
    return false;
  }, [isImporter, submitting, qty, mode, askPrice, lot.minOrder, kycFail, walletMissing, insufficientFundsLocal]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" style={{ border: '1px solid #E8E2DC' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E8E2DC' }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#1A1A1A' }}>
              {mode === 'buy' ? <><Zap size={18} style={{ color: '#C73B22' }} /> Buy Now</> : <><MessageCircle size={18} /> Request a Quote</>}
            </h2>
            <p className="text-sm" style={{ color: '#888880' }}>
              {lot.commodity} · {lot.hub || '—'}{lot.country ? `, ${lot.country}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F0EBE6]" aria-label="Close">
            <X size={18} style={{ color: '#888880' }} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {!isImporter && (
            <div className="p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <ShieldAlert size={16} style={{ color: '#D97706' }} className="mt-0.5 shrink-0" />
              <p className="text-xs" style={{ color: '#92400E' }}>
                Buying requires an <strong>importer account</strong>. Switch account type from your profile to transact.
              </p>
            </div>
          )}

          {walletMissing && (
            <div className="p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <Wallet size={16} style={{ color: '#DC2626' }} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: '#991B1B' }}>Wallet not set up</p>
                <p className="text-xs mt-0.5" style={{ color: '#7F1D1D' }}>
                  Open and fund your trading wallet before placing an order or RFQ.
                </p>
                <Link href="/wallet"
                  className="inline-block text-xs font-semibold mt-2 underline" style={{ color: '#C73B22' }}>
                  Set up wallet →
                </Link>
              </div>
            </div>
          )}

          {kycFail && (
            <div className="p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <ShieldAlert size={16} style={{ color: '#DC2626' }} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: '#991B1B' }}>KYC required</p>
                <p className="text-xs mt-0.5" style={{ color: '#7F1D1D' }}>{elig?.reason}</p>
                <Link href="/kyc"
                  className="inline-block text-xs font-semibold mt-2 underline" style={{ color: '#C73B22' }}>
                  Complete KYC →
                </Link>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl" style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p style={{ color: '#888880' }}>Ask</p>
                <p className="font-bold text-base" style={{ color: '#1A1A1A' }}>
                  {askPrice != null ? `$${askPrice.toLocaleString()}` : '—'}
                </p>
              </div>
              <div>
                <p style={{ color: '#888880' }}>Available</p>
                <p className="font-bold" style={{ color: '#1A1A1A' }}>{lot.qty} {lot.unit}</p>
              </div>
              <div>
                <p style={{ color: '#888880' }}>Min Order</p>
                <p className="font-bold" style={{ color: '#1A1A1A' }}>{lot.minOrder} {lot.unit}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Quantity ({lot.unit}) *</label>
            <input type="number" value={qty} min={lot.minOrder} max={mode === 'buy' ? lot.qty : undefined}
              onChange={e => setQty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
          </div>

          {mode === 'rfq' && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>
                  Target Price (USD/{lot.unit})
                </label>
                <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                  placeholder="Leave blank for seller to propose"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>
                  Valid until *
                </label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
                <p className="text-[10px] mt-1" style={{ color: '#888880' }}>
                  RFQ expires after this date if not accepted.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>
              Incoterms *
            </label>
            <select value={incoterms} onChange={e => setIncoterms(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}>
              {['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DPU', 'DDP'].map(i => (
                <option key={i} value={i}>{i}{lot.incoterms === i ? ' (listed)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>
              {mode === 'buy' ? 'Notes to seller (optional)' : 'Message to seller (optional)'}
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Delivery requirements, quality specs, payment terms..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
          </div>

          {totalUsd > 0 && (
            <div className="p-3 rounded-xl space-y-2"
              style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.15)' }}>
              <div className="flex justify-between items-baseline">
                <span className="text-xs" style={{ color: '#888880' }}>
                  {mode === 'buy' ? 'Order total' : 'Estimated total'}
                </span>
                <span className="text-xl font-bold" style={{ color: '#C73B22' }}>
                  USD {totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              {mode === 'buy' && (
                <>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#888880' }} className="flex items-center gap-1">
                      <Wallet size={11} /> Margin hold ({(marginBps / 100).toFixed(0)}%)
                    </span>
                    <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                      USD {requiredMarginUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#888880' }}>Your wallet available</span>
                    <span className="font-semibold" style={{ color: insufficientFundsLocal ? '#DC2626' : '#059669' }}>
                      USD {availableUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {insufficientFundsLocal && (
                    <p className="text-xs flex items-center gap-1" style={{ color: '#DC2626' }}>
                      <AlertTriangle size={11} /> Top up your wallet to cover the margin hold.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {serverReasons && (
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#991B1B' }}>Request blocked</p>
              <ul className="space-y-1">
                {serverReasons.map((r, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#7F1D1D' }}>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ background: 'rgba(220,38,38,0.15)' }}>{r.code}</span>
                    {r.message}
                  </li>
                ))}
              </ul>
              {serverReasons.some(r => r.code === 'wallet_insufficient' || r.code === 'wallet_missing') && (
                <Link href="/wallet" className="inline-block text-xs font-semibold mt-2 underline" style={{ color: '#C73B22' }}>
                  Top up wallet →
                </Link>
              )}
              {serverReasons.some(r => r.code === 'kyc_insufficient') && (
                <Link href="/kyc" className="inline-block text-xs font-semibold mt-2 underline ml-3" style={{ color: '#C73B22' }}>
                  Complete KYC →
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6" style={{ borderTop: '1px solid #E8E2DC' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-[#F0EBE6]" style={{ color: '#888880' }}>
            Cancel
          </button>
          {mode === 'buy' ? (
            <button
              disabled={disabled}
              onClick={() => { setServerReasons(null); buyMutation.mutate(); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              style={{ background: '#C73B22' }}>
              {submitting ? '...' : <><CheckCircle2 size={14} /> Place Order</>}
            </button>
          ) : (
            <button
              disabled={disabled}
              onClick={() => { setServerReasons(null); rfqMutation.mutate(); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              style={{ background: '#C73B22' }}>
              {submitting ? '...' : 'Submit RFQ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
