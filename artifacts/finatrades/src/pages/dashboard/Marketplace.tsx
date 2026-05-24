import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Store, Search, Package, MapPin, ArrowRight, Zap, ChevronRight,
  ShieldCheck, FileText, Eye, Star, StarOff, ImageOff,
} from 'lucide-react';
import BuyOrRfqModal from '@/components/marketplace/BuyOrRfqModal';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface ApiLot {
  id: string; // consignmentId
  listingId: string;
  consignmentId: string;
  consignmentRef: string | null;
  commodity: string;
  commodityCategory: string | null;
  hsCode: string | null;
  hub: string | null;
  country: string | null;
  grade: string | null;
  qty: number;
  unit: string;
  minOrder: number;
  incoterms: string | null;
  pricePerUnitCents: number | null;
  currency: string;
  seller: { id: string; name: string; memberSince: string | null };
  warehouseReceipt: { wrNumber: string; verifyUrl: string } | null;
  documentCount: number;
  verified: boolean;
  publishedAt: string | null;
  isWatched: boolean;
  thumbnailUrl: string | null;
}

interface LotsResponse {
  lots: ApiLot[];
  hubs: { hub: string; count: number; commodityCount: number; totalQty: number; unit: string | null }[];
  total: number;
}

const CATEGORIES = ['All', 'Agricultural', 'Soft Commodities', 'Metals', 'Energy', 'Industrial'];

function GradeTag({ grade }: { grade: string | null }) {
  const c: Record<string, { bg: string; color: string }> = {
    'A+': { bg: 'rgba(5,150,105,0.1)', color: '#047857' },
    'A': { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
    'B+': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
    'B': { bg: 'rgba(249,115,22,0.1)', color: '#EA580C' },
  };
  const tag = c[grade ?? ''] || { bg: '#F0EBE6', color: '#888880' };
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: tag.bg, color: tag.color }}>
      {grade ? `Grade ${grade}` : 'Ungraded'}
    </span>
  );
}

function LotCard({ l, onBuy, onRfq }: { l: ApiLot; onBuy: () => void; onRfq: () => void }) {
  const price = l.pricePerUnitCents != null ? l.pricePerUnitCents / 100 : null;
  const qc = useQueryClient();
  const toggleWatch = useMutation({
    mutationFn: async () => {
      const method = l.isWatched ? 'DELETE' : 'POST';
      const r = await apiRequest(method, `/api/b2b/marketplace/watchlist/${l.consignmentId}`);
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || 'Failed');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/lots'] });
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/watchlist'] });
    },
    onError: (e: any) => toast({ title: 'Could not update watchlist', description: e.message, variant: 'destructive' }),
  });
  return (
    <div className="rounded-2xl bg-white overflow-hidden transition-all hover:shadow-md flex flex-col"
      style={{ border: '1px solid #E8E2DC' }}>
      <div className="relative aspect-[16/10] bg-[#FAFAF8] overflow-hidden">
        {l.thumbnailUrl ? (
          <img src={l.thumbnailUrl} alt={l.commodity} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: '#B0AAA4' }}>
            <ImageOff size={28} />
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatch.mutate(); }}
          disabled={toggleWatch.isPending}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/95 backdrop-blur shadow-sm transition-all hover:bg-white disabled:opacity-50"
          title={l.isWatched ? 'Remove from watchlist' : 'Add to watchlist'}>
          {l.isWatched
            ? <Star size={14} fill="#C73B22" style={{ color: '#C73B22' }} />
            : <StarOff size={14} style={{ color: '#888880' }} />}
        </button>
      </div>
      <div className="p-4 pb-3" style={{ borderBottom: '1px solid #F0EBE6' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-bold text-base" style={{ color: '#1A1A1A' }}>{l.commodity}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: '#B0AAA4' }}>
              HS: {l.hsCode || '—'}{l.consignmentRef ? ` · ${l.consignmentRef}` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <GradeTag grade={l.grade} />
            {l.warehouseReceipt ? (
              <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: '#059669' }}>
                <ShieldCheck size={11} /> WR {l.warehouseReceipt.wrNumber}
              </span>
            ) : l.verified ? (
              <span className="text-[10px] font-semibold" style={{ color: '#059669' }}>✓ Warehouse Verified</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#888880' }}>
          <MapPin size={12} />
          <span className="font-semibold" style={{ color: '#1A1A1A' }}>{l.hub || '—'}</span>
          {l.country && <><span>·</span><span>{l.country}</span></>}
          {l.incoterms && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
              style={{ background: '#F0EBE6', color: '#888880' }}>{l.incoterms}</span>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
              {price != null ? `USD ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'On request'}
            </p>
            <p className="text-xs" style={{ color: '#888880' }}>
              {price != null ? `per ${l.unit}` : 'Submit RFQ for price'}
            </p>
          </div>
          <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#1A1A1A' }}>
            <FileText size={11} /> {l.documentCount}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="p-2 rounded-lg" style={{ background: '#FAFAF8' }}>
            <p style={{ color: '#888880' }}>Available</p>
            <p className="font-bold" style={{ color: '#1A1A1A' }}>{l.qty.toLocaleString()} {l.unit}</p>
          </div>
          <div className="p-2 rounded-lg" style={{ background: '#FAFAF8' }}>
            <p style={{ color: '#888880' }}>Min Order</p>
            <p className="font-bold" style={{ color: '#1A1A1A' }}>{l.minOrder} {l.unit}</p>
          </div>
        </div>
        <p className="text-xs mb-3 truncate" style={{ color: '#888880' }}>
          Seller: <span style={{ color: '#1A1A1A' }} className="font-semibold">{l.seller.name}</span>
        </p>
        <div className="flex gap-2 mt-auto">
          {price != null && (
            <button onClick={onBuy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: '#C73B22' }}>
              <Zap size={14} /> Buy Now
            </button>
          )}
          <button onClick={onRfq}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-[#F0EBE6]"
            style={{ border: '1px solid #E8E2DC', color: '#1A1A1A' }}>
            RFQ
          </button>
          <Link href={`/marketplace/${l.id}`}
            className="px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-[#F0EBE6] flex items-center"
            style={{ border: '1px solid #E8E2DC', color: '#888880' }}>
            <Eye size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [selectedHub, setSelectedHub] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [grades, setGrades] = useState<string[]>([]);
  const [country, setCountry] = useState('');
  const [qtyMin, setQtyMin] = useState('');
  const [qtyMax, setQtyMax] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState('newest');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [groupByHub, setGroupByHub] = useState(false);
  const [modalLot, setModalLot] = useState<{ lot: ApiLot; mode: 'buy' | 'rfq' } | null>(null);

  const params = new URLSearchParams();
  if (selectedHub !== 'ALL') params.set('hub', selectedHub);
  if (selectedCategory !== 'All') params.set('category', selectedCategory);
  if (search) params.set('search', search);
  if (grades.length) params.set('grades', grades.join(','));
  if (country) params.set('country', country);
  if (qtyMin) params.set('qtyMin', qtyMin);
  if (qtyMax) params.set('qtyMax', qtyMax);
  if (priceMin) params.set('priceMin', priceMin);
  if (priceMax) params.set('priceMax', priceMax);
  if (sort !== 'newest') params.set('sort', sort);
  const qs = params.toString();

  const { data, isLoading } = useQuery<LotsResponse>({
    queryKey: ['/api/b2b/marketplace/lots', qs],
    queryFn: async () => {
      const r = await fetch(`/api/b2b/marketplace/lots${qs ? `?${qs}` : ''}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to load lots');
      return r.json();
    },
    staleTime: 20_000,
  });

  const lots = data?.lots ?? [];
  const hubs = useMemo(() => [
    { hub: 'ALL', count: data?.total ?? 0, commodityCount: 0, totalQty: 0, unit: null as string | null },
    ...(data?.hubs ?? []),
  ], [data]);
  const lotsByHub = useMemo(() => {
    const m = new Map<string, ApiLot[]>();
    for (const l of lots) {
      const h = l.hub || 'UNK';
      if (!m.has(h)) m.set(h, []);
      m.get(h)!.push(l);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [lots]);
  const toggleGrade = (g: string) =>
    setGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Marketplace</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
            Step 5 — Warehouse-verified lots across the 14-hub African network
          </p>
        </div>
        <Link href="/watchlist"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-[#F0EBE6]"
          style={{ border: '1px solid #E8E2DC', color: '#1A1A1A' }}>
          <Star size={13} /> My Watchlist
        </Link>
      </div>

      {/* Hub strip with counts */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {hubs.map(h => (
            <button
              key={h.hub}
              onClick={() => setSelectedHub(h.hub)}
              className="flex flex-col items-start px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              style={selectedHub === h.hub
                ? { background: '#C73B22', color: '#fff' }
                : { background: '#FAFAF8', color: '#1A1A1A', border: '1px solid #E8E2DC' }}>
              <span>{h.hub}</span>
              <span className="font-normal opacity-70 text-[10px]">
                {h.count} lot{h.count === 1 ? '' : 's'}
                {h.commodityCount > 0 ? ` · ${h.commodityCount} sku` : ''}
                {h.totalQty > 0 ? ` · ${h.totalQty.toLocaleString()}${h.unit ? ' ' + h.unit : ''}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-white"
          style={{ border: '1px solid #E8E2DC' }}>
          <Search size={15} style={{ color: '#B0AAA4' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search commodity, hub, country..."
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: '#1A1A1A' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setSelectedCategory(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={selectedCategory === c
                ? { background: '#1A1A1A', color: '#fff' }
                : { background: '#FAFAF8', color: '#888880', border: '1px solid #E8E2DC' }}>
              {c}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white outline-none"
          style={{ border: '1px solid #E8E2DC', color: '#1A1A1A' }}>
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
          <option value="qty_desc">Quantity: large → small</option>
          <option value="qty_asc">Quantity: small → large</option>
        </select>
        <button onClick={() => setGroupByHub(!groupByHub)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={groupByHub
            ? { background: '#C73B22', color: '#fff' }
            : { background: '#FAFAF8', color: '#888880', border: '1px solid #E8E2DC' }}>
          Group by hub
        </button>
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: '#FAFAF8', color: '#888880', border: '1px solid #E8E2DC' }}>
          {showAdvanced ? 'Hide' : 'More'} filters
        </button>
      </div>

      {showAdvanced && (
        <div className="rounded-2xl bg-white p-4 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ border: '1px solid #E8E2DC' }}>
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#888880' }}>Grade</p>
            <div className="flex flex-wrap gap-1">
              {['A+', 'A', 'B+', 'B', 'C', 'D'].map(g => (
                <button key={g} onClick={() => toggleGrade(g)}
                  className="px-2 py-1 rounded-md text-[11px] font-bold"
                  style={grades.includes(g)
                    ? { background: '#C73B22', color: '#fff' }
                    : { background: '#FAFAF8', color: '#1A1A1A', border: '1px solid #E8E2DC' }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#888880' }}>Origin country</p>
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Ghana"
              className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#888880' }}>Qty range (MT)</p>
            <div className="flex gap-1">
              <input type="number" value={qtyMin} onChange={e => setQtyMin(e.target.value)} placeholder="Min"
                className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }} />
              <input type="number" value={qtyMax} onChange={e => setQtyMax(e.target.value)} placeholder="Max"
                className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }} />
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#888880' }}>Price range (USD)</p>
            <div className="flex gap-1">
              <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="Min"
                className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }} />
              <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Max"
                className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }} />
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#E8E2DC', borderTopColor: '#C73B22' }} />
        </div>
      ) : groupByHub ? (
        <div className="space-y-6">
          {lotsByHub.map(([h, hubLots]) => (
            <details key={h} open className="rounded-2xl bg-white" style={{ border: '1px solid #E8E2DC' }}>
              <summary className="cursor-pointer p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F0EBE6' }}>
                <div className="flex items-center gap-3">
                  <MapPin size={16} style={{ color: '#C73B22' }} />
                  <span className="font-bold text-base" style={{ color: '#1A1A1A' }}>{h}</span>
                  <span className="text-xs" style={{ color: '#888880' }}>{hubLots.length} lot{hubLots.length === 1 ? '' : 's'}</span>
                </div>
              </summary>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {hubLots.map(l => (
                  <LotCard key={l.id} l={l} onBuy={() => setModalLot({ lot: l, mode: 'buy' })}
                    onRfq={() => setModalLot({ lot: l, mode: 'rfq' })} />
                ))}
              </div>
            </details>
          ))}
          {lots.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Store size={36} style={{ color: '#E8E2DC' }} />
              <p className="text-sm font-medium mt-3" style={{ color: '#B0AAA4' }}>No lots match your filters</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lots.map(l => (
            <LotCard
              key={l.id}
              l={l}
              onBuy={() => setModalLot({ lot: l, mode: 'buy' })}
              onRfq={() => setModalLot({ lot: l, mode: 'rfq' })}
            />
          ))}
          {lots.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <Store size={36} style={{ color: '#E8E2DC' }} />
              <p className="text-sm font-medium mt-3" style={{ color: '#B0AAA4' }}>No lots match your filters</p>
              <button onClick={() => { setSelectedHub('ALL'); setSelectedCategory('All'); setSearch(''); }}
                className="mt-3 text-xs font-semibold" style={{ color: '#C73B22' }}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {modalLot && (
        <BuyOrRfqModal
          lot={modalLot.lot}
          mode={modalLot.mode}
          onClose={() => setModalLot(null)}
        />
      )}
    </div>
  );
}
