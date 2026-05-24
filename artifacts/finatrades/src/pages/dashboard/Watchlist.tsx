import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Star, StarOff, MapPin, Eye } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface WatchlistLot {
  id: string;
  consignmentId: string;
  commodity: string;
  hub: string | null;
  country: string | null;
  grade: string | null;
  qty: number;
  unit: string;
  pricePerUnitCents: number | null;
  currency: string;
  seller: { name: string };
}

export default function Watchlist() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ items: WatchlistLot[] }>({
    queryKey: ['/api/b2b/marketplace/watchlist'],
  });
  const items = data?.items ?? [];

  const remove = useMutation({
    mutationFn: async (consignmentId: string) => {
      const r = await apiRequest('DELETE', `/api/b2b/marketplace/watchlist/${consignmentId}`);
      if (!r.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/watchlist'] });
      qc.invalidateQueries({ queryKey: ['/api/b2b/marketplace/lots'] });
      toast({ title: 'Removed from watchlist' });
    },
  });

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1A1A1A' }}>
          <Star size={18} style={{ color: '#C73B22' }} /> Watchlist
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#888880' }}>Lots you're tracking</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#E8E2DC', borderTopColor: '#C73B22' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center" style={{ border: '1px dashed #E8E2DC' }}>
          <StarOff size={32} style={{ color: '#E8E2DC' }} className="mx-auto" />
          <p className="mt-3 text-sm font-medium" style={{ color: '#B0AAA4' }}>No watched lots yet.</p>
          <Link href="/marketplace" className="inline-block mt-3 text-xs font-semibold underline" style={{ color: '#C73B22' }}>
            Browse marketplace →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(l => {
            const price = l.pricePerUnitCents != null ? l.pricePerUnitCents / 100 : null;
            return (
              <div key={l.id} className="rounded-2xl bg-white p-5 flex flex-col" style={{ border: '1px solid #E8E2DC' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-base" style={{ color: '#1A1A1A' }}>{l.commodity}</p>
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#888880' }}>
                      <MapPin size={11} /> {l.hub || '—'}{l.country ? `, ${l.country}` : ''}
                    </p>
                  </div>
                  <button onClick={() => remove.mutate(l.consignmentId)}
                    className="p-1.5 rounded-lg hover:bg-[#F0EBE6]" title="Remove">
                    <Star size={14} fill="#C73B22" style={{ color: '#C73B22' }} />
                  </button>
                </div>
                <p className="text-xs" style={{ color: '#888880' }}>{l.seller.name}</p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
                    {price != null ? `$${price.toLocaleString()}` : 'RFQ only'}
                  </p>
                  <p className="text-xs" style={{ color: '#888880' }}>{l.qty} {l.unit} avail</p>
                </div>
                <Link href={`/marketplace/${l.consignmentId}`}
                  className="mt-4 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                  style={{ background: '#C73B22' }}>
                  <Eye size={13} /> View Lot
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
