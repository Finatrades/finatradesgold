import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  User, Building2, Mail, Phone, MapPin, Globe, Save,
  Camera, Shield, Bell, LogOut, ChevronRight, Edit3,
} from 'lucide-react';

type TradeFinanceEventKind =
  | 'lc_issued'
  | 'lc_compliant'
  | 'lc_discrepant'
  | 'escrow_funded'
  | 'milestone_released'
  | 'dispute_opened'
  | 'dispute_resolved';

const TRADE_EVENT_LABELS: { key: TradeFinanceEventKind; label: string; help: string }[] = [
  { key: 'lc_issued', label: 'Letter of Credit issued', help: 'Email me when an LC is issued on my case.' },
  { key: 'lc_compliant', label: 'LC documents Compliant', help: 'Email me when presented LC documents pass review.' },
  { key: 'lc_discrepant', label: 'LC documents Discrepant', help: 'Email me when LC documents come back with discrepancies.' },
  { key: 'escrow_funded', label: 'Escrow funded', help: 'Email me when an importer funds escrow on my case.' },
  { key: 'milestone_released', label: 'Escrow milestone released', help: 'Email me each time a milestone payment is released.' },
  { key: 'dispute_opened', label: 'Trade dispute opened', help: 'Email me when a dispute is opened on my case.' },
  { key: 'dispute_resolved', label: 'Trade dispute resolved', help: 'Email me when a dispute is resolved.' },
];

function Toggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={enabled}
      className="w-10 h-5 rounded-full relative cursor-pointer transition-colors shrink-0"
      style={{ background: enabled ? '#C73B22' : '#E8E2DC' }}
    >
      <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
        style={{ left: enabled ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function TradeFinanceEmailPrefs({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const queryKey = ['/api/users', userId, 'preferences'] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/users/${userId}/preferences`);
      if (!res.ok) throw new Error('Failed to load preferences');
      return res.json() as Promise<{ preferences: { tradeFinanceEmailPrefs?: Record<string, boolean> | null } }>;
    },
  });

  const prefs = (data?.preferences?.tradeFinanceEmailPrefs ?? {}) as Record<string, boolean>;
  const isOn = (k: TradeFinanceEventKind) => prefs[k] !== false; // default ON

  const mutation = useMutation({
    mutationFn: async (next: Record<string, boolean>) => {
      const res = await apiRequest('PUT', `/api/users/${userId}/preferences`, {
        tradeFinanceEmailPrefs: next,
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<any>(queryKey);
      qc.setQueryData<any>(queryKey, (old: any) => ({
        preferences: { ...(old?.preferences ?? {}), tradeFinanceEmailPrefs: next },
      }));
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const handleToggle = (k: TradeFinanceEventKind) => {
    const currentlyOn = isOn(k);
    const next: Record<string, boolean> = { ...prefs, [k]: !currentlyOn };
    mutation.mutate(next);
  };

  return (
    <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#1A1A1A' }}>Trade alerts by email</h3>
          <p className="text-xs mt-0.5" style={{ color: '#888880' }}>
            Pick which trade-finance events email you. In-app notifications stay on either way.
          </p>
        </div>
        {mutation.isPending && (
          <span className="text-xs" style={{ color: '#888880' }}>Saving…</span>
        )}
      </div>
      <div className="mt-3">
        {TRADE_EVENT_LABELS.map(({ key, label, help }) => (
          <div key={key} className="flex items-center justify-between py-3 gap-4"
            style={{ borderBottom: '1px solid #F0EBE6' }}>
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#888880' }}>{help}</p>
            </div>
            <Toggle
              enabled={isOn(key)}
              onClick={() => !isLoading && handleToggle(key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldRow({ label, value, editable = false }: { label: string; value: string; editable?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F0EBE6' }}>
      <p className="text-sm font-medium w-40 shrink-0" style={{ color: '#888880' }}>{label}</p>
      <p className="text-sm font-semibold flex-1" style={{ color: '#1A1A1A' }}>{value || '—'}</p>
      {editable && (
        <button className="p-1.5 rounded-lg hover:bg-[#F0EBE6] transition-colors ml-2">
          <Edit3 size={13} style={{ color: '#B0AAA4' }} />
        </button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'preferences'>('profile');

  const u = user as any;
  const fullName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || '—';
  const finaId = u?.finatradesId || 'FT-000000';
  const role = u?.finabridgeRole || 'importer';

  return (
    <div className="space-y-6 max-w-[800px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: '#888880' }}>Manage your account and company information</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: '#C73B22' }}>
              {fullName.charAt(0).toUpperCase()}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center bg-white shadow-md"
              style={{ border: '1px solid #E8E2DC' }}>
              <Camera size={12} style={{ color: '#888880' }} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{fullName}</h2>
            <p className="text-sm" style={{ color: '#888880' }}>{u?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22' }}>
                {finaId}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md capitalize"
                style={{ background: '#F0EBE6', color: '#888880' }}>
                {role}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                {u?.kycStatus || 'In Progress'}
              </span>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 text-white"
            style={{ background: '#C73B22' }}>
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl self-start" style={{ background: '#F0EBE6' }}>
        {([['profile', 'Personal Info'], ['company', 'Company'], ['preferences', 'Preferences']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === k
              ? { background: '#fff', color: '#1A1A1A', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#888880' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#1A1A1A' }}>Personal Information</h3>
          <FieldRow label="First Name" value={u?.firstName} editable />
          <FieldRow label="Last Name" value={u?.lastName} editable />
          <FieldRow label="Email" value={u?.email} />
          <FieldRow label="Phone Number" value={u?.phoneNumber || 'Not set'} editable />
          <FieldRow label="Country" value={u?.country || 'Not set'} editable />
          <FieldRow label="Address" value={u?.address || 'Not set'} editable />
          <FieldRow label="Finatrades ID" value={finaId} />
          <FieldRow label="Trade Role" value={role} editable />
          <div className="pt-3">
            <FieldRow label="Account Type" value={u?.accountType || 'business'} />
          </div>
        </div>
      )}

      {activeTab === 'company' && (
        <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#1A1A1A' }}>Company Information</h3>
          <FieldRow label="Company Name" value={u?.companyName || 'Not set'} editable />
          <FieldRow label="Registration No." value={u?.registrationNumber || 'Not set'} editable />
          <FieldRow label="Account Type" value="Business" />
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(199,59,34,0.04)', border: '1px solid rgba(199,59,34,0.12)' }}>
            <p className="text-xs font-semibold" style={{ color: '#C73B22' }}>Company Verification</p>
            <p className="text-xs mt-1" style={{ color: '#888880' }}>
              Complete Finatrades Corporate KYC to have your company fully verified on the platform. Verified companies get priority matching on the marketplace and higher trade limits.
            </p>
            <button className="mt-2 text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#C73B22' }}>
              Go to KYC <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="space-y-4">
          {u?.id && <TradeFinanceEmailPrefs userId={u.id} />}

          <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E8E2DC' }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#1A1A1A' }}>Platform Preferences</h3>
            <FieldRow label="Default Currency" value="USD" editable />
            <FieldRow label="Default Hub" value="Lagos (LOS)" editable />
            <FieldRow label="Default Incoterms" value="FOB" editable />
            <FieldRow label="Language" value="English" editable />
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all hover:bg-red-50"
            style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
