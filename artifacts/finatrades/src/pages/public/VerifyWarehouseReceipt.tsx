import React from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, ShieldAlert, ShieldX, Loader2, Warehouse,
  Package, Calendar, MapPin, User, Hash,
} from 'lucide-react';

interface VerifyResponse {
  valid: boolean;
  wrNumber: string;
  status: string;
  issuedAt: string;
  hubCode: string;
  hubName: string;
  commodityName: string;
  quantity: number;
  unit: string;
  grade: string | null;
  originCountry: string | null;
  depositor: string | null;
  verificationCheckedAt: string;
  message?: string;
}

export default function VerifyWarehouseReceipt() {
  const [, params] = useRoute<{ wrNumber: string }>('/wr/verify/:wrNumber');
  const wrNumber = params?.wrNumber;

  const { data, isLoading, error } = useQuery<VerifyResponse>({
    queryKey: [`/api/b2b/consignments/public/wr/verify/${wrNumber}`],
    enabled: !!wrNumber,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/b2b/consignments/public/wr/verify/${wrNumber}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
      return body;
    },
  });

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <header className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)', background: 'white' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight" style={{ color: '#C73B22' }}>
            FINATRADES
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>
            Public Warehouse Receipt Verification
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {isLoading && (
          <div className="rounded-2xl border p-10 text-center flex items-center justify-center gap-2"
               style={{ borderColor: 'rgba(0,0,0,0.06)', background: 'white' }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm" style={{ color: '#888880' }}>Verifying receipt {wrNumber}…</span>
          </div>
        )}

        {error && (
          <ResultCard
            tone="invalid"
            title="Receipt could not be verified"
            wrNumber={wrNumber || ''}
            message={(error as any)?.message || 'No receipt found with this number. It may be invalid, withdrawn, or tampered.'}
          />
        )}

        {data && (
          <>
            <ResultCard
              tone={data.valid ? 'valid' : data.status === 'cancelled' ? 'invalid' : 'warning'}
              title={
                data.valid ? 'Authentic — receipt is active'
                : data.status === 'cancelled' ? 'Cancelled — no longer valid'
                : `Receipt status: ${data.status}`
              }
              wrNumber={data.wrNumber}
              message={
                data.valid
                  ? 'This Electronic Warehouse Receipt was issued by Finatrades and currently represents goods held in custody.'
                  : 'This receipt is on record but is no longer active. It cannot be used as collateral.'
              }
            />

            <div className="mt-6 rounded-2xl border bg-white" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>
                  Receipt details
                </h2>
              </div>
              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <Field icon={<Hash size={14} />} label="Receipt number" value={data.wrNumber} mono />
                <Field icon={<Calendar size={14} />} label="Issued at" value={new Date(data.issuedAt).toLocaleString()} />
                <Field icon={<Warehouse size={14} />} label="Hub" value={`${data.hubName} (${data.hubCode})`} />
                <Field icon={<Package size={14} />} label="Commodity" value={data.commodityName} />
                <Field
                  icon={<Package size={14} />}
                  label="Quantity"
                  value={`${data.quantity.toLocaleString()} ${data.unit}${data.grade ? ` · Grade ${data.grade}` : ''}`}
                />
                <Field icon={<MapPin size={14} />} label="Country of origin" value={data.originCountry || '—'} />
                <Field icon={<User size={14} />} label="Depositor" value={data.depositor || '—'} />
                <Field icon={<ShieldCheck size={14} />} label="Verified at" value={new Date(data.verificationCheckedAt).toLocaleString()} />
              </div>
            </div>

            <p className="mt-6 text-xs leading-relaxed" style={{ color: '#888880' }}>
              This verification page shows only non-sensitive metadata about the receipt. It does not disclose commercial terms,
              contract values, or counterparty information. If you believe this receipt has been tampered with or is being misrepresented,
              contact <a href="mailto:compliance@finatrades.com" style={{ color: '#C73B22' }}>compliance@finatrades.com</a>.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function ResultCard({
  tone, title, wrNumber, message,
}: { tone: 'valid' | 'invalid' | 'warning'; title: string; wrNumber: string; message: string }) {
  const styles = tone === 'valid'
    ? { bg: 'rgba(5,150,105,0.08)', border: '#10B981', color: '#047857', Icon: ShieldCheck }
    : tone === 'invalid'
      ? { bg: 'rgba(220,38,38,0.08)', border: '#DC2626', color: '#B91C1C', Icon: ShieldX }
      : { bg: 'rgba(245,158,11,0.08)', border: '#D97706', color: '#B45309', Icon: ShieldAlert };
  const { Icon } = styles;
  return (
    <div className="rounded-2xl border-2 p-6 flex items-start gap-4" style={{ borderColor: styles.border, background: styles.bg }} data-testid={`result-${tone}`}>
      <div className="shrink-0 mt-0.5"><Icon size={28} style={{ color: styles.color }} /></div>
      <div className="flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: styles.color }}>
          {wrNumber}
        </div>
        <h1 className="text-xl font-bold mt-1" style={{ color: '#1A1A1A' }}>{title}</h1>
        <p className="text-sm mt-2" style={{ color: '#1A1A1A' }}>{message}</p>
      </div>
    </div>
  );
}

function Field({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: '#888880' }}>
        <span style={{ color: '#C73B22' }}>{icon}</span> {label}
      </div>
      <div className={`mt-0.5 text-sm font-semibold ${mono ? 'font-mono' : ''}`} style={{ color: '#1A1A1A' }}>
        {value}
      </div>
    </div>
  );
}
