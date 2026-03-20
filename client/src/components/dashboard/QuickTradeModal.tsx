import React, { useState } from 'react';
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
  Shield, Info, Anchor
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

type Step = 1 | 2 | 3;

export default function QuickTradeModal({ open, onOpenChange, currentGoldPrice }: QuickTradeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const goldPrice = currentGoldPrice || 144;

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [createdTradeRef, setCreatedTradeRef] = useState('');

  // Step 1 — Goods & Finance
  const [goodsName, setGoodsName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('units');
  const [tradeValueUsd, setTradeValueUsd] = useState('');
  const [isPriceLocked, setIsPriceLocked] = useState(false);

  // Step 2 — Logistics
  const [modeOfTransport, setModeOfTransport] = useState('Sea');
  const [incoterms, setIncoterms] = useState('FOB');
  const [portOfLoading, setPortOfLoading] = useState('');
  const [destination, setDestination] = useState('');
  const [expectedShipDate, setExpectedShipDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const tradeValueNum = parseFloat(tradeValueUsd) || 0;
  const priceToUse = isPriceLocked ? goldPrice : goldPrice;
  const settlementGrams = tradeValueNum > 0 ? tradeValueNum / priceToUse : 0;

  const step1Valid = goodsName.trim().length >= 2 && tradeValueNum >= 100;

  function resetForm() {
    setStep(1);
    setIsDone(false);
    setCreatedTradeRef('');
    setGoodsName('');
    setDescription('');
    setQuantity('');
    setQuantityUnit('units');
    setTradeValueUsd('');
    setIsPriceLocked(false);
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
      const payload = {
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
        suggestExporter: true,
        status: 'Open',
      };

      const res = await apiRequest('POST', '/api/finabridge/importer/requests', payload);
      const data = await res.json?.() ?? res;
      setCreatedTradeRef(data?.tradeRequest?.tradeRefId || '');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['trade-cases'] });
      setIsDone(true);
    } catch (err: any) {
      toast({
        title: 'Failed to create trade request',
        description: err?.message || 'Please try again.',
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
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
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
              <span className="text-[10px] text-blue-200/70 font-semibold">Step {step} of 3</span>
            )}
          </div>

          {!isDone && (
            <div className="relative z-10 flex gap-1.5 mt-4">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-blue-300' : 'bg-white/20'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="p-5 bg-white max-h-[75vh] overflow-y-auto">

          {/* DONE */}
          {isDone && (
            <div className="flex flex-col items-center py-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-[16px]">Trade Request Created!</p>
                {createdTradeRef && (
                  <p className="text-[12px] text-slate-500 mt-1">
                    Ref: <span className="font-bold text-slate-700">{createdTradeRef}</span>
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
                <Package className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-800 text-[13px]">What are you trading?</h3>
              </div>

              {/* Goods Name */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Goods / Product Name *</Label>
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
                <Label className="text-[11px] font-semibold text-slate-600">
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
                <Label className="text-[11px] font-semibold text-slate-600">
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
                <Label className="text-[11px] font-semibold text-slate-600">Trade Value (USD) *</Label>
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
                        ? <Lock className="w-3 h-3 text-purple-600" />
                        : <Unlock className="w-3 h-3 text-amber-600" />
                      }
                      <span className="text-[11px] font-semibold text-slate-700">Lock Gold Price</span>
                    </div>
                    <Switch
                      checked={isPriceLocked}
                      onCheckedChange={setIsPriceLocked}
                      className="scale-75"
                      data-testid="switch-price-lock"
                    />
                  </div>
                  <div className={`text-[10px] px-1.5 py-1 rounded ${isPriceLocked ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
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

                {/* Settlement preview */}
                {tradeValueNum >= 100 && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 mt-1">
                    <Weight className="w-3 h-3 text-blue-600" />
                    <span className="text-[11px] text-blue-700 font-semibold">
                      Settlement: <span className="font-extrabold">{settlementGrams.toFixed(3)}g</span> gold
                      <span className="text-blue-400 font-normal ml-1">@ ${goldPrice.toFixed(2)}/g</span>
                    </span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="w-full bg-blue-700 hover:bg-blue-800 text-[13px] h-10 font-bold"
                data-testid="button-trade-step1-next"
              >
                Next: Logistics <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP 2: Logistics & Payment ── */}
          {!isDone && step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-0.5">
                <Ship className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-800 text-[13px]">Shipping & Payment</h3>
                <span className="text-[10px] text-slate-400">(optional fields)</span>
              </div>

              {/* Mode + Incoterms */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Transport Mode</Label>
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
                  <Label className="text-[11px] font-semibold text-slate-600">Incoterms</Label>
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
                <Label className="text-[11px] font-semibold text-slate-600">Port of Loading</Label>
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
                <Label className="text-[11px] font-semibold text-slate-600">Port of Discharge / Destination</Label>
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
                <Label className="text-[11px] font-semibold text-slate-600">Expected Shipment Date</Label>
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
                <Label className="text-[11px] font-semibold text-slate-600">Payment Terms</Label>
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
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 text-[12px] h-10" data-testid="button-trade-step2-back">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-[13px] h-10 font-bold"
                  data-testid="button-trade-step2-next"
                >
                  Review <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review & Submit ── */}
          {!isDone && step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-0.5">
                <Landmark className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-800 text-[13px]">Review & Submit</h3>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-2">

                <div className="pb-1.5 mb-1.5 border-b border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1.5">Goods</p>
                  <ReviewRow label="Product" value={goodsName} />
                  {description && <ReviewRow label="Description" value={description} />}
                  {quantity && <ReviewRow label="Quantity" value={`${quantity} ${quantityUnit}`} />}
                </div>

                <div className="pb-1.5 mb-1.5 border-b border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1.5">Finance</p>
                  <ReviewRow label="Trade Value" value={`$${parseFloat(tradeValueUsd).toLocaleString()} USD`} />
                  <ReviewRow label="Settlement Gold" value={`${settlementGrams.toFixed(3)}g`} highlight />
                  <ReviewRow label="Gold Price" value={isPriceLocked ? `$${goldPrice.toFixed(2)}/g (Locked)` : `$${goldPrice.toFixed(2)}/g (Floating)`} />
                  {paymentTerms && <ReviewRow label="Payment" value={paymentTerms} />}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1.5">Logistics</p>
                  <ReviewRow label="Transport" value={modeOfTransport} />
                  <ReviewRow label="Incoterms" value={incoterms} />
                  {portOfLoading && <ReviewRow label="Port of Loading" value={portOfLoading} />}
                  {destination && <ReviewRow label="Destination" value={destination} />}
                  {expectedShipDate && <ReviewRow label="Ship Date" value={expectedShipDate} />}
                </div>
              </div>

              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                <Globe className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700">
                  This request will be <strong>Open to Exporters</strong> immediately. Finatrades will suggest matching exporters for your trade.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 text-[12px] h-10" data-testid="button-trade-step3-back">
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
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`text-[12px] font-bold ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}
