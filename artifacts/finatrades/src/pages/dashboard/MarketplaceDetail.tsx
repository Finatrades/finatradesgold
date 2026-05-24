import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ShieldCheck, MapPin, FileText, Star, StarOff, Building2,
  Calendar, Package, Zap, MessageCircle, ExternalLink, Download,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import BuyOrRfqModal from '@/components/marketplace/BuyOrRfqModal';
import { useAuth } from '@/context/AuthContext';

interface LotDetail {
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
  seller: { id: string; name: string; memberSince: string | null };
  warehouseReceipt: { wrNumber: string; issuedAt: string; verifyUrl: string } | null;
  documents: Array<{
    id: string; docType: string; docLabel: string | null;
    fileName: string | null; mimeType: string | null; fileSize: number | null;
    uploadedAt: string | null; downloadPath: string | null;
  }>;
  isWatched: boolean;
  specs: {
    harvestDate: string | null;
    batchNumber: string | null;
    packingType: string | null;
    notes: string | null;
  };
  sellerProfile: {
    id: string; name: string; country: string | null;
    memberSince: string | null; activeListingCount: number; kycVerified: boolean;
  };
}

export default function MarketplaceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth() as { user: any };
  const qc = useQueryClient();
  const [modalMode, setModalMode] = useState<'buy' | 'rfq' | null>(null);
  const canTransact = user?.userType === 'importer' || user?.role === 'admin';

  const { data: lot, isLoading } = useQuery<LotDetail>({
    queryKey: ['/api/b2b/marketplace/lots', id],
    queryFn: async () => {
      const r = await fetch(`/api/b2b/marketplace/lots/${id}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Lot not found');
      return r.json();
    },
    enabled: !!id,
  });

  const toggleWatch = useMutation({
    mutationFn: async () => {
      const method = lot?.isWatched ? 'DELETE' : 'POST';
      const r = await apiRequest(method, `/api/b2b/marketplace/watchlist/${id}`);
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || 'Failed');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/lots', id] });
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/watchlist'] });
      toast({ title: lot?.isWatched ? 'Removed from watchlist' : 'Added to watchlist' });
    },
    onError: (e: any) => toast({ title: 'Could not update watchlist', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#E8E2DC', borderTopColor: '#C73B22' }} />
      </div>
    );
  }
  if (!lot) {
    return (
      <div className="max-w-[1400px]">
        <Link href="/marketplace" className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: '#C73B22' }}>
          <ArrowLeft size={14} /> Back to marketplace
        </Link>
        <p className="mt-4 text-sm" style={{ color: '#888880' }}>Lot not found or no longer listed.</p>
      </div>
    );
  }

  const askUsd = lot.pricePerUnitCents != null ? lot.pricePerUnitCents / 100 : null;
  const photoDocs = lot.documents.filter(d => (d.mimeType ?? '').toLowerCase().startsWith('image/'));
  const nonPhotoDocs = lot.documents.filter(d => !(d.mimeType ?? '').toLowerCase().startsWith('image/'));
  const inspectionDocs = nonPhotoDocs.filter(d => /(inspection|quality|qa|qc|sgs|cotecna|intertek)/i.test(`${d.docType} ${d.docLabel ?? ''}`));

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Link href="/marketplace" className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: '#C73B22' }}>
        <ArrowLeft size={14} /> Back to marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo gallery */}
          {photoDocs.length > 0 && (
            <div className="rounded-2xl bg-white p-3 overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
              <PhotoGallery photos={photoDocs} />
            </div>
          )}
          <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#C73B22' }}>
                  {lot.commodityCategory || 'Commodity'}{lot.consignmentRef ? ` · ${lot.consignmentRef}` : ''}
                </p>
                <h1 className="text-2xl font-bold mt-1" style={{ color: '#1A1A1A' }}>{lot.commodity}</h1>
                <p className="text-xs font-mono mt-1" style={{ color: '#888880' }}>
                  HS: {lot.hsCode || '—'}
                </p>
              </div>
              <button
                onClick={() => toggleWatch.mutate()}
                disabled={toggleWatch.isPending}
                className="p-2 rounded-xl transition-all hover:bg-[#F0EBE6] disabled:opacity-50"
                style={{ border: '1px solid #E8E2DC' }}
                title={lot.isWatched ? 'Remove from watchlist' : 'Add to watchlist'}>
                {lot.isWatched
                  ? <Star size={16} fill="#C73B22" style={{ color: '#C73B22' }} />
                  : <StarOff size={16} style={{ color: '#888880' }} />}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {lot.grade && (
                <span className="text-xs font-bold px-2 py-1 rounded-md"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                  Grade {lot.grade}
                </span>
              )}
              {lot.warehouseReceipt && (
                <a href={lot.warehouseReceipt.verifyUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold px-2 py-1 rounded-md inline-flex items-center gap-1"
                  style={{ background: 'rgba(5,150,105,0.1)', color: '#047857' }}>
                  <ShieldCheck size={11} /> WR {lot.warehouseReceipt.wrNumber}
                  <ExternalLink size={10} />
                </a>
              )}
              {lot.incoterms && (
                <span className="text-xs font-semibold px-2 py-1 rounded-md"
                  style={{ background: '#F0EBE6', color: '#888880' }}>
                  {lot.incoterms}
                </span>
              )}
              <span className="text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1"
                style={{ background: '#F0EBE6', color: '#888880' }}>
                <MapPin size={11} /> {lot.hub || '—'}{lot.country ? `, ${lot.country}` : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Spec label="Ask price" value={askUsd != null ? `$${askUsd.toLocaleString()}/${lot.unit}` : 'On request'} highlight />
              <Spec label="Available" value={`${lot.qty.toLocaleString()} ${lot.unit}`} />
              <Spec label="Min order" value={`${lot.minOrder} ${lot.unit}`} />
              <Spec label="Currency" value={lot.currency} />
            </div>
          </div>

          {/* Specs */}
          <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
              <Package size={14} /> Lot specifications
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Spec label="Batch" value={lot.specs.batchNumber || '—'} />
              <Spec label="Packing" value={lot.specs.packingType || '—'} />
              <Spec label="Harvest date" value={lot.specs.harvestDate ? new Date(lot.specs.harvestDate).toLocaleDateString() : '—'} />
            </div>
            {lot.specs.notes && (
              <p className="mt-4 text-sm" style={{ color: '#555' }}>{lot.specs.notes}</p>
            )}
          </div>

          {/* Warehouse hub */}
          <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
              <MapPin size={14} /> Warehouse hub
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Spec label="Hub code" value={lot.hub || '—'} highlight />
              <Spec label="Origin" value={lot.country || '—'} />
              <Spec label="WR status" value={lot.warehouseReceipt ? `Active · ${lot.warehouseReceipt.wrNumber}` : 'Not issued'} />
            </div>
            {lot.warehouseReceipt && (
              <a href={lot.warehouseReceipt.verifyUrl} target="_blank" rel="noopener noreferrer"
                 className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#C73B22' }}>
                Verify on-chain <ExternalLink size={11} />
              </a>
            )}
          </div>

          {/* Quality inspection */}
          {inspectionDocs.length > 0 && (
            <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                <ShieldCheck size={14} /> Quality inspection reports
              </h2>
              <ul className="space-y-2">
                {inspectionDocs.map(d => (
                  <li key={d.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(5,150,105,0.06)' }}>
                    <ShieldCheck size={16} style={{ color: '#059669' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>{d.docLabel || d.docType}</p>
                      <p className="text-xs truncate" style={{ color: '#888880' }}>{d.fileName}</p>
                    </div>
                    {d.downloadPath && (
                      <a href={d.downloadPath} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-white" title="Download">
                        <Download size={14} style={{ color: '#059669' }} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Documents */}
          <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
              <FileText size={14} /> Documents ({nonPhotoDocs.length})
            </h2>
            {nonPhotoDocs.length === 0 ? (
              <p className="text-xs" style={{ color: '#888880' }}>No documents attached.</p>
            ) : (
              <ul className="space-y-2">
                {nonPhotoDocs.map(d => (
                  <li key={d.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FAFAF8' }}>
                    <FileText size={16} style={{ color: '#888880' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                        {d.docLabel || d.docType}
                      </p>
                      <p className="text-xs truncate" style={{ color: '#888880' }}>
                        {d.fileName} {d.fileSize ? `· ${(d.fileSize / 1024).toFixed(0)} KB` : ''}
                      </p>
                    </div>
                    {d.downloadPath && (
                      <a href={d.downloadPath} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-[#F0EBE6]" title="Download">
                        <Download size={14} style={{ color: '#888880' }} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column — actions + seller */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 sticky top-4" style={{ border: '1px solid #E8E2DC' }}>
            <p className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: '#888880' }}>Ask price</p>
            <p className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
              {askUsd != null ? `$${askUsd.toLocaleString()}` : 'RFQ only'}
            </p>
            <p className="text-xs" style={{ color: '#888880' }}>per {lot.unit} · {lot.incoterms || 'FOB'}</p>

            <div className="space-y-2 mt-4">
              {askUsd != null && (
                <button
                  disabled={!canTransact}
                  onClick={() => setModalMode('buy')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#C73B22' }}>
                  <Zap size={15} /> Buy Now
                </button>
              )}
              <button
                disabled={!canTransact}
                onClick={() => setModalMode('rfq')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-[#F0EBE6] disabled:opacity-50"
                style={{ border: '1px solid #E8E2DC', color: '#1A1A1A' }}>
                <MessageCircle size={15} /> Submit RFQ
              </button>
              {!canTransact && (
                <p className="text-xs text-center" style={{ color: '#888880' }}>
                  Switch to an importer account to transact.
                </p>
              )}
            </div>
          </div>

          {/* Seller mini-profile */}
          <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
              <Building2 size={14} /> Seller
            </h2>
            <p className="text-base font-bold" style={{ color: '#1A1A1A' }}>{lot.sellerProfile.name}</p>
            {lot.sellerProfile.country && (
              <p className="text-xs" style={{ color: '#888880' }}>{lot.sellerProfile.country}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Spec label="Active lots" value={String(lot.sellerProfile.activeListingCount)} />
              <Spec label="Member since" value={lot.sellerProfile.memberSince ? new Date(lot.sellerProfile.memberSince).getFullYear().toString() : '—'} />
            </div>
            {lot.sellerProfile.kycVerified && (
              <p className="mt-3 text-xs font-semibold inline-flex items-center gap-1" style={{ color: '#059669' }}>
                <ShieldCheck size={12} /> KYC verified
              </p>
            )}
          </div>
        </div>
      </div>

      {modalMode && (
        <BuyOrRfqModal
          lot={{
            id: lot.id, consignmentId: lot.consignmentId, commodity: lot.commodity,
            hub: lot.hub, country: lot.country, qty: lot.qty, unit: lot.unit,
            minOrder: lot.minOrder, incoterms: lot.incoterms,
            pricePerUnitCents: lot.pricePerUnitCents, currency: lot.currency,
            seller: { name: lot.seller.name },
          }}
          mode={modalMode}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  );
}

function Spec({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: highlight ? 'rgba(199,59,34,0.06)' : '#FAFAF8' }}>
      <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: '#888880' }}>{label}</p>
      <p className="font-bold mt-0.5" style={{ color: highlight ? '#C73B22' : '#1A1A1A' }}>{value}</p>
    </div>
  );
}

function PhotoGallery({ photos }: { photos: Array<{ id: string; downloadPath: string | null; docLabel: string | null; docType: string }> }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const main = photos[active];
  if (!main?.downloadPath) return null;
  return (
    <div>
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-[#1A1A1A] cursor-zoom-in"
        onClick={() => setLightbox(true)}>
        <img src={main.downloadPath} alt={main.docLabel || main.docType}
          className="w-full h-full object-contain" />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {photos.map((p, i) => (
            <button key={p.id} onClick={() => setActive(i)}
              className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all"
              style={{ border: `2px solid ${i === active ? '#C73B22' : '#E8E2DC'}` }}>
              {p.downloadPath && <img src={p.downloadPath} alt="" className="w-full h-full object-cover" />}
            </button>
          ))}
        </div>
      )}
      {lightbox && main.downloadPath && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightbox(false)}>
          <img src={main.downloadPath} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
