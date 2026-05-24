import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Store, Search, Filter, Package, MapPin, Star, ArrowRight,
  TrendingUp, TrendingDown, BarChart3, RefreshCw, X, Zap,
  ChevronDown,
} from 'lucide-react';

interface ApiListingDocument {
  id: string;
  docType: string;
  docLabel: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  isRequired: boolean;
  uploadedAt: string | null;
  downloadPath: string | null;
}

interface ApiListing {
  id: string;
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
  seller: string;
  verified: boolean;
  publishedAt: string | null;
  documents: ApiListingDocument[];
  documentCount: number;
}

type UiListing = {
  id: string;
  commodity: string;
  hsCode: string;
  hub: string;
  country: string;
  qty: number;
  unit: string;
  grade: string;
  pricePerMT: number;
  currency: string;
  incoterms: string;
  seller: string;
  category: string;
  trend: 'up' | 'down';
  change: string;
  minOrder: number;
  verified: boolean;
  isLive?: boolean;
};

function apiToUi(l: ApiListing): UiListing {
  const price = l.pricePerUnitCents != null ? Math.round(l.pricePerUnitCents / 100) : 0;
  return {
    id: l.id,
    commodity: l.commodity,
    hsCode: l.hsCode || '—',
    hub: l.hub || '—',
    country: l.country || '',
    qty: l.qty,
    unit: l.unit,
    grade: l.grade || 'B',
    pricePerMT: price,
    currency: l.currency,
    incoterms: l.incoterms || 'FOB',
    seller: l.seller,
    category: l.commodityCategory || 'Agricultural',
    trend: 'up',
    change: 'New',
    minOrder: l.minOrder,
    verified: l.verified,
    isLive: true,
  };
}

const HUBS = [
  { code: 'ALL', name: 'All Hubs', country: '' },
  { code: 'LOS', name: 'Lagos', country: 'Nigeria' },
  { code: 'NBI', name: 'Nairobi', country: 'Kenya' },
  { code: 'ACC', name: 'Accra', country: 'Ghana' },
  { code: 'ABJ', name: 'Abidjan', country: 'Côte d\'Ivoire' },
  { code: 'DKR', name: 'Dakar', country: 'Senegal' },
  { code: 'ADD', name: 'Addis Ababa', country: 'Ethiopia' },
  { code: 'CAI', name: 'Cairo', country: 'Egypt' },
  { code: 'CMN', name: 'Casablanca', country: 'Morocco' },
  { code: 'JNB', name: 'Johannesburg', country: 'South Africa' },
  { code: 'DAR', name: 'Dar es Salaam', country: 'Tanzania' },
  { code: 'KLA', name: 'Kampala', country: 'Uganda' },
  { code: 'KAN', name: 'Kano', country: 'Nigeria' },
  { code: 'DLA', name: 'Douala', country: 'Cameroon' },
  { code: 'MBA', name: 'Mombasa', country: 'Kenya' },
];

const CATEGORIES = ['All', 'Agricultural', 'Soft Commodities', 'Metals', 'Energy', 'Industrial'];

const LISTINGS = [
  { id: 'L001', commodity: 'Cocoa Beans', hsCode: '1801.00', hub: 'LOS', country: 'Nigeria', qty: 500, unit: 'MT', grade: 'A', pricePerMT: 2500, currency: 'USD', incoterms: 'FOB', seller: 'AgriExport Co.', category: 'Soft Commodities', trend: 'up', change: '+2.3%', minOrder: 50, verified: true },
  { id: 'L002', commodity: 'Sesame Seeds', hsCode: '1207.40', hub: 'ADD', country: 'Ethiopia', qty: 200, unit: 'MT', grade: 'A+', pricePerMT: 1600, currency: 'USD', incoterms: 'CIF', seller: 'Horn Trade Ltd', category: 'Agricultural', trend: 'up', change: '+1.1%', minOrder: 20, verified: true },
  { id: 'L003', commodity: 'Cashew Nuts (Raw)', hsCode: '0801.31', hub: 'ACC', country: 'Ghana', qty: 300, unit: 'MT', grade: 'A', pricePerMT: 1900, currency: 'USD', incoterms: 'FOB', seller: 'GhanaAgro', category: 'Agricultural', trend: 'down', change: '-0.8%', minOrder: 25, verified: true },
  { id: 'L004', commodity: 'Palm Oil (Crude)', hsCode: '1511.10', hub: 'LOS', country: 'Nigeria', qty: 1000, unit: 'MT', grade: 'B+', pricePerMT: 900, currency: 'USD', incoterms: 'DAP', seller: 'NigerPalm Corp', category: 'Agricultural', trend: 'up', change: '+0.5%', minOrder: 100, verified: false },
  { id: 'L005', commodity: 'Coffee (Arabica)', hsCode: '0901.11', hub: 'NBI', country: 'Kenya', qty: 80, unit: 'MT', grade: 'A+', pricePerMT: 4800, currency: 'USD', incoterms: 'FOB', seller: 'Kenya Highlands Coffee', category: 'Soft Commodities', trend: 'up', change: '+3.7%', minOrder: 10, verified: true },
  { id: 'L006', commodity: 'Copper Ore', hsCode: '2603.00', hub: 'JNB', country: 'South Africa', qty: 750, unit: 'MT', grade: 'B+', pricePerMT: 8200, currency: 'USD', incoterms: 'CIF', seller: 'SA Minerals', category: 'Metals', trend: 'down', change: '-1.2%', minOrder: 50, verified: true },
  { id: 'L007', commodity: 'Cotton (Raw)', hsCode: '5201.00', hub: 'DKR', country: 'Senegal', qty: 400, unit: 'MT', grade: 'A', pricePerMT: 1750, currency: 'USD', incoterms: 'FOB', seller: 'Sahel Cotton', category: 'Industrial', trend: 'up', change: '+0.9%', minOrder: 40, verified: true },
  { id: 'L008', commodity: 'Groundnuts', hsCode: '1202.41', hub: 'KAN', country: 'Nigeria', qty: 180, unit: 'MT', grade: 'A', pricePerMT: 620, currency: 'USD', incoterms: 'EXW', seller: 'Kano Agro Hub', category: 'Agricultural', trend: 'up', change: '+1.5%', minOrder: 20, verified: false },
  { id: 'L009', commodity: 'Shea Butter', hsCode: '1515.90', hub: 'ABJ', country: 'Côte d\'Ivoire', qty: 120, unit: 'MT', grade: 'A+', pricePerMT: 2100, currency: 'USD', incoterms: 'FOB', seller: 'IvoryShea Ltd', category: 'Soft Commodities', trend: 'down', change: '-0.4%', minOrder: 15, verified: true },
  { id: 'L010', commodity: 'Ginger (Dried)', hsCode: '0910.11', hub: 'KLA', country: 'Uganda', qty: 60, unit: 'MT', grade: 'A', pricePerMT: 1400, currency: 'USD', incoterms: 'CIF', seller: 'Uganda Spices Co', category: 'Agricultural', trend: 'up', change: '+2.0%', minOrder: 10, verified: true },
];

function GradeTag({ grade }: { grade: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    'A+': { bg: 'rgba(5,150,105,0.1)', color: '#047857' },
    'A': { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
    'B+': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
    'B': { bg: 'rgba(249,115,22,0.1)', color: '#EA580C' },
  };
  const c = colors[grade] || colors['B'];
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: c.bg, color: c.color }}>
      Grade {grade}
    </span>
  );
}

function RFQModal({ listing, onClose }: { listing: UiListing; onClose: () => void }) {
  const [qty, setQty] = useState(String(listing.minOrder));
  const [price, setPrice] = useState(String(listing.pricePerMT));
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" style={{ border: '1px solid #E8E2DC' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E8E2DC' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Submit RFQ</h2>
            <p className="text-sm" style={{ color: '#888880' }}>{listing.commodity} · {listing.hub}, {listing.country}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F0EBE6]">
            <X size={18} style={{ color: '#888880' }} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Listing summary */}
          <div className="p-4 rounded-xl" style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><p style={{ color: '#888880' }}>Ask Price</p><p className="font-bold text-base" style={{ color: '#1A1A1A' }}>USD {listing.pricePerMT.toLocaleString()}<span style={{ color: '#888880', fontWeight: 400 }}>/MT</span></p></div>
              <div><p style={{ color: '#888880' }}>Available</p><p className="font-bold" style={{ color: '#1A1A1A' }}>{listing.qty} {listing.unit}</p></div>
              <div><p style={{ color: '#888880' }}>Min Order</p><p className="font-bold" style={{ color: '#1A1A1A' }}>{listing.minOrder} {listing.unit}</p></div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Requested Quantity ({listing.unit}) *</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Target Price (USD/{listing.unit}) *</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
          </div>
          {qty && price && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.15)' }}>
              <p className="text-xs" style={{ color: '#888880' }}>Estimated Total</p>
              <p className="text-xl font-bold" style={{ color: '#C73B22' }}>
                USD {(Number(qty) * Number(price)).toLocaleString()}
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>Message to Seller (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Delivery requirements, quality specs, payment terms..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6" style={{ borderTop: '1px solid #E8E2DC' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-[#F0EBE6]" style={{ color: '#888880' }}>Cancel</button>
          <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: '#C73B22' }}>
            Submit RFQ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [selectedHub, setSelectedHub] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [rfqTarget, setRfqTarget] = useState<UiListing | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: liveData } = useQuery<{ listings: ApiListing[] }>({
    queryKey: ['/api/b2b/consignments/marketplace/listings'],
    staleTime: 30_000,
  });

  const liveListings: UiListing[] = (liveData?.listings ?? []).map(apiToUi);
  // Live (approved-consignment) listings first, then the legacy showcase mock data.
  const allListings: UiListing[] = [...liveListings, ...(LISTINGS as UiListing[])];

  const filtered = allListings.filter(l => {
    const matchHub = selectedHub === 'ALL' || l.hub === selectedHub;
    const matchCat = selectedCategory === 'All' || l.category === selectedCategory;
    const matchSearch = l.commodity.toLowerCase().includes(search.toLowerCase()) ||
      l.hub.toLowerCase().includes(search.toLowerCase()) ||
      l.country.toLowerCase().includes(search.toLowerCase());
    return matchHub && matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>14-Hub Marketplace</h1>
          <p className="text-sm mt-0.5" style={{ color: '#888880' }}>
            Step 5 — Browse verified warehouse-backed commodity listings across Africa
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.15)', color: '#C73B22' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {filtered.length} listings live
        </div>
      </div>

      {/* Hub Filter */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {HUBS.map(h => (
            <button
              key={h.code}
              onClick={() => setSelectedHub(h.code)}
              className="flex flex-col items-center px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              style={selectedHub === h.code
                ? { background: '#C73B22', color: '#fff' }
                : { background: '#FAFAF8', color: '#888880', border: '1px solid #E8E2DC' }}>
              <span>{h.code}</span>
              {h.country && <span className="font-normal opacity-70 text-[10px]">{h.country}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Category + Search */}
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
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(l => (
          <div key={l.id} className="rounded-2xl bg-white overflow-hidden transition-all hover:shadow-md"
            style={{ border: '1px solid #E8E2DC' }}>
            {/* Card Header */}
            <div className="p-4 pb-3" style={{ borderBottom: '1px solid #F0EBE6' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-base" style={{ color: '#1A1A1A' }}>{l.commodity}</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: '#B0AAA4' }}>HS: {l.hsCode}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <GradeTag grade={l.grade} />
                  {l.verified && (
                    <span className="text-[10px] font-semibold" style={{ color: '#059669' }}>✓ Warehouse Verified</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#888880' }}>
                <MapPin size={12} />
                <span className="font-semibold" style={{ color: '#1A1A1A' }}>{l.hub}</span>
                <span>·</span>
                <span>{l.country}</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: '#F0EBE6', color: '#888880' }}>{l.incoterms}</span>
              </div>
            </div>

            {/* Price Block */}
            <div className="p-4">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
                    USD {l.pricePerMT.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: '#888880' }}>per {l.unit}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: l.trend === 'up' ? '#059669' : '#DC2626' }}>
                  {l.trend === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {l.change}
                </div>
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

              <div className="flex gap-2">
                <button
                  onClick={() => setRfqTarget(l)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: '#C73B22' }}>
                  <Zap size={14} /> Submit RFQ
                </button>
                <button className="px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-[#F0EBE6]"
                  style={{ border: '1px solid #E8E2DC', color: '#888880' }}>
                  <BarChart3 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <Store size={36} style={{ color: '#E8E2DC' }} />
            <p className="text-sm font-medium mt-3" style={{ color: '#B0AAA4' }}>No listings match your filters</p>
            <button onClick={() => { setSelectedHub('ALL'); setSelectedCategory('All'); setSearch(''); }}
              className="mt-3 text-xs font-semibold" style={{ color: '#C73B22' }}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {rfqTarget && <RFQModal listing={rfqTarget} onClose={() => setRfqTarget(null)} />}
    </div>
  );
}
