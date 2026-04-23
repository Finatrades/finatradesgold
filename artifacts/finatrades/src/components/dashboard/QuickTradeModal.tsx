import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Loader2, ChevronRight, ChevronLeft, CheckCircle2,
  Globe, Package, ArrowLeftRight, MapPin, Calendar,
  DollarSign, Weight, Ship, Landmark, Lock, Unlock,
  Shield, Info, Anchor, Users, Building2, Mail,
  Phone, Clock, AlertTriangle, Wallet
} from 'lucide-react';

const INCOTERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DAP', 'FCA', 'CPT'] as const;
const TRANSPORT_MODES = ['Sea', 'Air', 'Road', 'Rail', 'Multimodal'] as const;
const QTY_UNITS = ['units', 'pcs', 'kg', 'ton', 'MT', 'lbs', 'CBM', 'Ltrs', 'Boxes', 'Cartons', 'Pallets', 'Containers'] as const;
const PAYMENT_TERMS = ['', 'T/T (Wire Transfer)', 'L/C (Letter of Credit)', 'D/P (Documents against Payment)', 'D/A (Documents against Acceptance)', 'Open Account', 'Gold Settlement Only'] as const;

interface QuickTradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoldPrice: number;
}

type Step = 1 | 2 | 3 | 4;

interface TradePayload {
  importerUserId: string;
  goodsName: string;
  description?: string;
  quantity?: string;
  tradeValueUsd: string;
  settlementGoldGrams: string;
  goldPriceUsdPerGram: string | null;
  isPriceLocked: boolean;
  currency: string;
  paymentTerms?: string;
  modeOfTransport: string;
  incoterms: string;
  portOfLoading?: string;
  destination?: string;
  expectedShipDate?: string;
  financeType: string;
  suggestExporter: boolean;
  status: string;
  exporterCompanyName?: string;
  exporterContactName?: string;
  exporterEmail?: string;
  exporterPhone?: string;
  proposedQuotePrice?: string;
  proposedTimelineDays?: string;
  proposalNotes?: string;
}

export default function QuickTradeModal({ open, onOpenChange, currentGoldPrice }: QuickTradeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const goldPrice = currentGoldPrice || 144;

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [createdTradeRef, setCreatedTradeRef] = useState('');

  // FinaBridge wallet balance — null means not yet fetched/resolved
  const [finabridgeBalance, setFinabridgeBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceFetchFailed, setBalanceFetchFailed] = useState(false);

  // Step 1 — Goods & Finance
  const [goodsName, setGoodsName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('units');
  const [tradeValueUsd, setTradeValueUsd] = useState('');
  const [isPriceLocked, setIsPriceLocked] = useState(false);

  // Step 2 — Exporter Preference
  const [suggestExporter, setSuggestExporter] = useState(true);
  const [exporterCompanyName, setExporterCompanyName] = useState('');
  const [exporterContactName, setExporterContactName] = useState('');
  const [exporterEmail, setExporterEmail] = useState('');
  const [exporterPhone, setExporterPhone] = useState('');
  const [proposedQuotePrice, setProposedQuotePrice] = useState('');
  const [proposedTimelineDays, setProposedTimelineDays] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');

  // Step 3 — Logistics
  const [modeOfTransport, setModeOfTransport] = useState('Sea');
  const [incoterms, setIncoterms] = useState('FOB');
  const [portOfLoading, setPortOfLoading] = useState('');
  const [destination, setDestination] = useState('');
  const [expectedShipDate, setExpectedShipDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const tradeValueNum = parseFloat(tradeValueUsd) || 0;
  const settlementGrams = tradeValueNum > 0 ? tradeValueNum / goldPrice : 0;

  // Block Next while balance is loading; unblock on fetch failure (server will validate).
  // When balance is known, enforce that settlement <= available.
  const hasEnoughBalance =
    settlementGrams === 0 ||
    balanceFetchFailed || // couldn't load — rely on server-side enforcement
    (finabridgeBalance !== null && settlementGrams <= finabridgeBalance);
  const step1Valid =
    goodsName.trim().length >= 2 &&
    tradeValueNum >= 100 &&
    !balanceLoading &&     // block while wallet fetch is in-flight
    hasEnoughBalance;

  const step2Valid = suggestExporter || (
    exporterCompanyName.trim().length > 0 &&
    exporterEmail.trim().length > 0 &&
    parseFloat(proposedQuotePrice) > 0 &&
    parseInt(proposedTimelineDays) > 0
  );

  // Fetch FinaBridge wallet balance when modal opens
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setBalanceLoading(true);
    setBalanceFetchFailed(false);
    setFinabridgeBalance(null);
    apiRequest('GET', `/api/finabridge/wallet/${user.id}`)
      .then(async (res: Response) => {
        if (cancelled) return;
        const data: { wallet?: { availableGoldGrams?: string } } = await res.json();
        const available = parseFloat(data?.wallet?.availableGoldGrams ?? '0');
        setFinabridgeBalance(isNaN(available) ? 0 : available);
      })
      .catch(() => {
        if (!cancelled) setBalanceFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, user?.id]);

  function resetForm() {
    setStep(1);
    setIsDone(false);
    setCreatedTradeRef('');
    setFinabridgeBalance(null);
    setBalanceFetchFailed(false);
    setGoodsName('');
    setDescription('');
    setQuantity('');
    setQuantityUnit('units');
    setTradeValueUsd('');
    setIsPriceLocked(false);
    setSuggestExporter(true);
    setExporterCompanyName('');
    setExporterContactName('');
    setExporterEmail('');
    setExporterPhone('');
    setProposedQuotePrice('');
    setProposedTimelineDays('');
    setProposalNotes('');
    setModeOfTransport('Sea');
    setIncoterms('FOB');
    setPortOfLoading('');
    setDestination('');
    setExpectedShipDate('');
    setPaymentTerms('');
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  }

  async function handleSubmit() {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      const payload: TradePayload = {
        importerUserId: user.id,
        goodsName: goodsName.trim(),
        description: description.trim() || undefined,
        quantity: quantity.trim() ? `${quantity.trim()} ${quantityUnit}` : undefined,
        tradeValueUsd: tradeValueNum.toFixed(2),
        settlementGoldGrams: settlementGrams.toFixed(6),
        goldPriceUsdPerGram: isPriceLocked ? goldPrice.toFixed(6) : null,
        isPriceLocked,
        currency: 'USD',
        paymentTerms: paymentTerms || undefined,
        modeOfTransport,
        incoterms,
        portOfLoading: portOfLoading.trim() || undefined,
        destination: destination.trim() || undefined,
        expectedShipDate: expectedShipDate || undefined,
        financeType: 'FinaBridge Finance',
        suggestExporter,
        status: 'Open',
      };

      if (!suggestExporter) {
        payload.exporterCompanyName = exporterCompanyName.trim();
        payload.exporterContactName = exporterContactName.trim() || undefined;
        payload.exporterEmail = exporterEmail.trim();
        payload.exporterPhone = exporterPhone.trim() || undefined;
        payload.proposedQuotePrice = proposedQuotePrice;
        payload.proposedTimelineDays = proposedTimelineDays;
        payload.proposalNotes = proposalNotes.trim() || undefined;
      }

      const res = await apiRequest('POST', '/api/finabridge/importer/requests', payload);
      const data: { tradeRequest?: { tradeRefId?: string } } = await res.json();
      setCreatedTradeRef(data?.tradeRequest?.tradeRefId ?? '');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['trade-cases'] });
      setIsDone(true);
    } catch (err: unknown) {
      toast({
        title: 'Failed to create trade request',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl">

        {/* ── Header ── */}
        <div
          className="relative p-5 pb-4"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 55%, #2563eb 100%)' }}
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-card/15 flex items-center justify-center border border-white/20">
                <ArrowLeftRight className="w-4 h-4 text-blue-200" />
              </div>
              <div>
                <DialogTitle className="text-white font-extrabold text-[15px] leading-tight">
                  Quick Trade Request
                </DialogTitle>
                <p className="text-blue-200/80 text-[10px] mt-0.5">Gold-backed international trade</p>
              </div>
            </div>
            {!isDone && (
              <span className="text-[10px] text-blue-200/70 font-semibold">Step {step} of 4</span>
            )}
          </div>

          {!isDone && (
            <div className="relative z-10 flex gap-1.5 mt-4">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-blue-300' : 'bg-card/20'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="p-5 bg-card max-h-[70vh] overflow-y-auto">

          {/* DONE */}
          {isDone && (
            <div className="flex flex-col items-center py-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 dark:text-slate-100 text-[16px]">Trade Request Created!</p>
                {createdTradeRef && (
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                    Ref: <span className="font-bold text-slate-700 dark:text-slate-200">{createdTradeRef}</span>
                  </p>
                )}
                <p className="text-[12px] text-slate-400 mt-2">
                  Open to exporters. Manage from FinaBridge dashboard.
                </p>
              </div>
              <div className="flex gap-2 w-full mt-2">
                <Button variant="outline" className="flex-1 text-[12px]" onClick={handleClose}>
                  Close
                </Button>
                <a href="/finabridge" className="flex-1">
                  <Button className="w-full text-[12px] bg-blue-700 hover:bg-blue-800">
                    View FinaBridge <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* ── STEP 1: Goods & Finance ── */}
          {!isDone && step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-0.5">
                <Package className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[13px]">What are you trading?</h3>
              </div>

              {/* Goods Name */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Goods / Product Name *</Label>
                <Input
                  placeholder="e.g. Electronics, Textiles, Crude Oil"
                  value={goodsName}
                  onChange={e => setGoodsName(e.target.value)}
                  className="text-[13px] h-9"
                  data-testid="input-trade-goods-name"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <textarea
                  placeholder="Brief description of the goods..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full text-[13px] rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-testid="input-trade-description"
                />
              </div>

              {/* Quantity + Unit */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Quantity <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 500"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="text-[13px] h-9 flex-1"
                    data-testid="input-trade-quantity"
                  />
                  <select
                    value={quantityUnit}
                    onChange={e => setQuantityUnit(e.target.value)}
                    className="h-9 text-[13px] rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
                    data-testid="select-trade-qty-unit"
                  >
                    {QTY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Trade Value */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Trade Value (USD) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    type="number"
                    placeholder="50000"
                    value={tradeValueUsd}
                    onChange={e => setTradeValueUsd(e.target.value)}
                    className="pl-7 text-[13px] h-9"
                    min={100}
                    data-testid="input-trade-value"
                  />
                </div>

                {/* Gold Price Lock Toggle */}
                <div className="mt-2 p-2.5 rounded-lg border" style={{ background: 'linear-gradient(to right, #faf5ff, #fefce8)', borderColor: isPriceLocked ? '#c084fc' : '#fde68a' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {isPriceLocked
                        ? <Lock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        : <Unlock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      }
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Lock Gold Price</span>
                    </div>
                    <Switch
                      checked={isPriceLocked}
                      onCheckedChange={setIsPriceLocked}
                      className="scale-75"
                      data-testid="switch-price-lock"
                    />
                  </div>
                  <div className={`text-[10px] px-1.5 py-1 rounded ${isPriceLocked ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
                    {isPriceLocked ? (
                      <div className="flex items-start gap-1">
                        <Shield className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>Locked at <strong>${goldPrice.toFixed(2)}/g</strong> — protected from price fluctuations.</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1">
                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>Floating price (market rate) — recalculated at each stage.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Settlement preview + FinaBridge wallet balance */}
                {tradeValueNum >= 100 && (
                  <div className="space-y-1.5 mt-1">
                    {/* Settlement pill */}
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${
                      !hasEnoughBalance
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40'
                        : 'bg-blue-50 dark:bg-blue-950/20 border-blue-100'
                    }`}>
                      <Weight className={`w-3 h-3 ${!hasEnoughBalance ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`} />
                      <span className={`text-[11px] font-semibold ${!hasEnoughBalance ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                        Settlement: <span className="font-extrabold">{settlementGrams.toFixed(3)}g</span> gold
                        <span className={`font-normal ml-1 ${!hasEnoughBalance ? 'text-red-400' : 'text-blue-400'}`}>@ ${goldPrice.toFixed(2)}/g</span>
                      </span>
                    </div>

                    {/* FinaBridge balance line */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950/20 rounded-lg border border-slate-100">
                      <Wallet className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">FinaBridge Wallet:</span>
                      {balanceLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                      ) : (
                        <span className={`text-[11px] font-bold ${
                          finabridgeBalance === null ? 'text-slate-400' :
                          !hasEnoughBalance ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {finabridgeBalance === null ? (balanceFetchFailed ? 'unavailable' : '—') : `${finabridgeBalance.toFixed(4)}g available`}
                        </span>
                      )}
                    </div>

                    {/* Insufficient balance warning */}
                    {!hasEnoughBalance && (
                      <div className="flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800/40">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                        <div className="text-[10px] text-red-700 dark:text-red-300">
                          <p className="font-bold">Insufficient FinaBridge balance</p>
                          <p className="mt-0.5">
                            Need <strong>{settlementGrams.toFixed(3)}g</strong>
                            {finabridgeBalance !== null && <>, have <strong>{finabridgeBalance.toFixed(4)}g</strong></>}.
                            {' '}<a href="/finabridge" className="underline font-semibold">Top up FinaBridge wallet</a> first.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="w-full bg-blue-700 hover:bg-blue-800 text-[13px] h-10 font-bold"
                data-testid="button-trade-step1-next"
              >
                Next: Exporter <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP 2: Exporter Preference ── */}
          {!isDone && step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-0.5">
                <Users className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[13px]">Exporter Preference</h3>
              </div>

              {/* Toggle */}
              <div className={`p-3 rounded-xl border-2 transition-all ${suggestExporter ? 'border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20/60' : 'border-slate-200 dark:border-slate-800/40 bg-slate-50 dark:bg-slate-950/20'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className={`w-4 h-4 ${suggestExporter ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    <div>
                      <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">Let Finatrades find exporters</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {suggestExporter
                          ? 'Finatrades will match your request with verified exporters.'
                          : "I'll provide my own exporter details below."}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={suggestExporter}
                    onCheckedChange={setSuggestExporter}
                    data-testid="switch-suggest-exporter"
                  />
                </div>
              </div>

              {/* Manual exporter fields */}
              {!suggestExporter && (
                <div className="space-y-3 p-3 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50 dark:bg-purple-950/20/40">
                  <p className="text-[11px] font-bold text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> My Exporter Details
                  </p>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Company Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        placeholder="e.g. ABC Trading Ltd."
                        value={exporterCompanyName}
                        onChange={e => setExporterCompanyName(e.target.value)}
                        className="pl-7 text-[13px] h-9"
                        data-testid="input-exporter-company"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Contact Name</Label>
                      <Input
                        placeholder="John Smith"
                        value={exporterContactName}
                        onChange={e => setExporterContactName(e.target.value)}
                        className="text-[13px] h-9"
                        data-testid="input-exporter-contact"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                          placeholder="+1 234 567"
                          value={exporterPhone}
                          onChange={e => setExporterPhone(e.target.value)}
                          className="pl-7 text-[13px] h-9"
                          data-testid="input-exporter-phone"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="exporter@company.com"
                        value={exporterEmail}
                        onChange={e => setExporterEmail(e.target.value)}
                        className="pl-7 text-[13px] h-9"
                        data-testid="input-exporter-email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Quote Price (USD) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={proposedQuotePrice}
                          onChange={e => setProposedQuotePrice(e.target.value)}
                          className="pl-7 text-[13px] h-9"
                          data-testid="input-quote-price"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Timeline (Days) *</Label>
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                          type="number"
                          placeholder="30"
                          value={proposedTimelineDays}
                          onChange={e => setProposedTimelineDays(e.target.value)}
                          className="pl-7 text-[13px] h-9"
                          data-testid="input-timeline-days"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Notes / Terms <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <textarea
                      placeholder="Additional terms or notes..."
                      value={proposalNotes}
                      onChange={e => setProposalNotes(e.target.value)}
                      rows={2}
                      className="w-full text-[13px] rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid="input-proposal-notes"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 text-[12px] h-10" data-testid="button-trade-step2-back">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!step2Valid}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-[13px] h-10 font-bold"
                  data-testid="button-trade-step2-next"
                >
                  Next: Logistics <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Logistics & Payment ── */}
          {!isDone && step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-0.5">
                <Ship className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[13px]">Shipping & Payment</h3>
                <span className="text-[10px] text-slate-400">(optional fields)</span>
              </div>

              {/* Mode + Incoterms */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Transport Mode</Label>
                  <select
                    value={modeOfTransport}
                    onChange={e => setModeOfTransport(e.target.value)}
                    className="w-full h-9 text-[13px] rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="select-trade-transport"
                  >
                    {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Incoterms</Label>
                  <select
                    value={incoterms}
                    onChange={e => setIncoterms(e.target.value)}
                    className="w-full h-9 text-[13px] rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="select-trade-incoterms"
                  >
                    {INCOTERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Port of Loading */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Port of Loading</Label>
                <div className="relative">
                  <Anchor className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="e.g. Shanghai Port, China"
                    value={portOfLoading}
                    onChange={e => setPortOfLoading(e.target.value)}
                    className="pl-7 text-[13px] h-9"
                    data-testid="input-trade-port-loading"
                  />
                </div>
              </div>

              {/* Port of Discharge / Destination */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Port of Discharge / Destination</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="e.g. Jebel Ali Port, UAE"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    className="pl-7 text-[13px] h-9"
                    data-testid="input-trade-destination"
                  />
                </div>
              </div>

              {/* Ship Date */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Expected Shipment Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    type="date"
                    value={expectedShipDate}
                    onChange={e => setExpectedShipDate(e.target.value)}
                    className="pl-7 text-[13px] h-9"
                    data-testid="input-trade-ship-date"
                  />
                </div>
              </div>

              {/* Payment Terms */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Payment Terms</Label>
                <select
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  className="w-full h-9 text-[13px] rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="select-trade-payment-terms"
                >
                  {PAYMENT_TERMS.map(t => (
                    <option key={t} value={t}>{t || 'Select payment terms…'}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 text-[12px] h-10" data-testid="button-trade-step3-back">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-[13px] h-10 font-bold"
                  data-testid="button-trade-step3-next"
                >
                  Review <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Review & Submit ── */}
          {!isDone && step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-0.5">
                <Landmark className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[13px]">Review & Submit</h3>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/20/50 p-3.5 space-y-2">

                <div className="pb-1.5 mb-1.5 border-b border-blue-100">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-1.5">Goods</p>
                  <ReviewRow label="Product" value={goodsName} />
                  {description && <ReviewRow label="Description" value={description} />}
                  {quantity && <ReviewRow label="Quantity" value={`${quantity} ${quantityUnit}`} />}
                </div>

                <div className="pb-1.5 mb-1.5 border-b border-blue-100">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-1.5">Finance</p>
                  <ReviewRow label="Trade Value" value={`$${parseFloat(tradeValueUsd).toLocaleString()} USD`} />
                  <ReviewRow label="Settlement Gold" value={`${settlementGrams.toFixed(3)}g`} highlight />
                  <ReviewRow label="Gold Price" value={isPriceLocked ? `$${goldPrice.toFixed(2)}/g (Locked)` : `$${goldPrice.toFixed(2)}/g (Floating)`} />
                  {paymentTerms && <ReviewRow label="Payment" value={paymentTerms} />}
                </div>

                <div className="pb-1.5 mb-1.5 border-b border-blue-100">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-1.5">Exporter</p>
                  {suggestExporter ? (
                    <ReviewRow label="Finding" value="Finatrades will suggest exporters" />
                  ) : (
                    <>
                      <ReviewRow label="Company" value={exporterCompanyName} />
                      <ReviewRow label="Email" value={exporterEmail} />
                      {proposedQuotePrice && <ReviewRow label="Quote" value={`$${parseFloat(proposedQuotePrice).toLocaleString()}`} />}
                      {proposedTimelineDays && <ReviewRow label="Timeline" value={`${proposedTimelineDays} days`} />}
                    </>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-1.5">Logistics</p>
                  <ReviewRow label="Transport" value={modeOfTransport} />
                  <ReviewRow label="Incoterms" value={incoterms} />
                  {portOfLoading && <ReviewRow label="Port of Loading" value={portOfLoading} />}
                  {destination && <ReviewRow label="Destination" value={destination} />}
                  {expectedShipDate && <ReviewRow label="Ship Date" value={expectedShipDate} />}
                </div>
              </div>

              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100">
                <Globe className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  This request will be <strong>Open to Exporters</strong> immediately.
                  {suggestExporter ? ' Finatrades will suggest matching exporters.' : ' Your specified exporter will be contacted.'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1 text-[12px] h-10" data-testid="button-trade-step4-back">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-[13px] h-10 font-bold"
                  data-testid="button-trade-submit"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting…</>
                    : <>Submit Trade <ChevronRight className="w-4 h-4 ml-1" /></>
                  }
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-[12px] font-bold ${highlight ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-100'}`}>{value}</span>
    </div>
  );
}
