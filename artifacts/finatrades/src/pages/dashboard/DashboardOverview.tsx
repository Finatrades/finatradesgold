import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Package, Warehouse, Store, ArrowLeftRight, Shield,
  TrendingUp, FileText, Clock, CheckCircle2, AlertCircle,
  ArrowRight, ChevronRight, BarChart3,
} from 'lucide-react';

function KpiCard({
  label, value, sub, icon, color = '#C73B22', trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color?: string; trend?: string;
}) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: '1px solid #E8E2DC' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}12`, color }}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(5,150,105,0.08)', color: '#059669' }}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mt-1" style={{ color: '#1A1A1A' }}>{value}</p>
      <p className="text-xs font-medium mt-0.5" style={{ color: '#888880' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#B0AAA4' }}>{sub}</p>}
    </div>
  );
}

function QuickAction({ icon, label, href, desc }: { icon: React.ReactNode; label: string; href: string; desc: string }) {
  return (
    <Link href={href}>
      <a className="flex items-center gap-4 p-4 rounded-xl bg-white transition-all hover:shadow-sm group"
        style={{ border: '1px solid #E8E2DC' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22' }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{label}</p>
          <p className="text-xs truncate" style={{ color: '#888880' }}>{desc}</p>
        </div>
        <ChevronRight size={16} style={{ color: '#C0BAB4' }} className="group-hover:translate-x-0.5 transition-transform" />
      </a>
    </Link>
  );
}

const STEPS = [
  { n: 1, label: 'KYC / KYB Onboarding', status: 'done', href: '/kyc' },
  { n: 2, label: 'Seller Consignment', status: 'active', href: '/consignments' },
  { n: 3, label: 'Pre-Arrival Logistics', status: 'pending', href: '/inventory' },
  { n: 4, label: 'Warehouse Inventory', status: 'pending', href: '/inventory' },
  { n: 5, label: '14-Hub Marketplace', status: 'pending', href: '/marketplace' },
  { n: 6, label: 'Buyer Order & Payment', status: 'pending', href: '/orders' },
  { n: 7, label: 'Government Barter', status: 'pending', href: '/barter' },
  { n: 8, label: 'Trade Finance & Escrow', status: 'pending', href: '/escrow' },
];

export default function DashboardOverview() {
  const { user } = useAuth();
  const userName = (user as any)?.fullName?.split(' ')[0] || (user as any)?.email?.split('@')[0] || 'User';
  const userRole = (user as any)?.role || 'importer';

  const { data: goldData } = useQuery({
    queryKey: ['/api/gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const goldPrice = goldData?.pricePerGram?.toFixed(2) || '—';

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
            Welcome back, {userName}
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: '#888880' }}>
            {userRole} · Finatrades Institutional Platform
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.15)', color: '#C73B22' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          Platform Active
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Active Consignments"
          value="0"
          sub="No active consignments"
          icon={<Package size={18} />}
          color="#C73B22"
        />
        <KpiCard
          label="Inventory (MT)"
          value="0"
          sub="No verified inventory"
          icon={<Warehouse size={18} />}
          color="#D4AF37"
        />
        <KpiCard
          label="Open RFQs"
          value="0"
          sub="No pending RFQs"
          icon={<Store size={18} />}
          color="#059669"
        />
        <KpiCard
          label="XAU/g Live Price"
          value={`$${goldPrice}`}
          sub="Updated every 30s"
          icon={<TrendingUp size={18} />}
          color="#8B5CF6"
          trend="LIVE"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Left column */}
        <div className="space-y-5">

          {/* Platform steps */}
          <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E2DC' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold" style={{ color: '#1A1A1A' }}>Platform Workflow</h2>
                <p className="text-xs mt-0.5" style={{ color: '#888880' }}>Your 9-step institutional trade journey</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22', border: '1px solid rgba(199,59,34,0.15)' }}>
                Step 2 of 9
              </span>
            </div>
            <div className="space-y-2">
              {STEPS.map(step => (
                <Link key={step.n} href={step.href}>
                  <a className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[#FAFAF8] group"
                    style={{ border: `1px solid ${step.status === 'active' ? 'rgba(199,59,34,0.25)' : '#F0EBE5'}`, background: step.status === 'active' ? 'rgba(199,59,34,0.03)' : 'transparent' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: step.status === 'done' ? '#059669' : step.status === 'active' ? '#C73B22' : '#F0EBE5',
                        color: step.status === 'pending' ? '#B0AAA4' : '#fff',
                      }}>
                      {step.status === 'done' ? <CheckCircle2 size={13} /> : step.n}
                    </div>
                    <span className="text-sm font-medium flex-1" style={{ color: step.status === 'pending' ? '#B0AAA4' : '#1A1A1A' }}>
                      {step.label}
                    </span>
                    {step.status === 'active' && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(199,59,34,0.10)', color: '#C73B22' }}>
                        Current
                      </span>
                    )}
                    {step.status === 'done' && (
                      <span className="text-xs font-semibold" style={{ color: '#059669' }}>Complete</span>
                    )}
                    <ChevronRight size={14} style={{ color: '#C0BAB4' }} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent activity placeholder */}
          <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E2DC' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: '#1A1A1A' }}>Recent Activity</h2>
              <Link href="/transactions">
                <a className="text-xs font-semibold flex items-center gap-1" style={{ color: '#C73B22' }}>
                  View all <ArrowRight size={12} />
                </a>
              </Link>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: '#F5F0EB' }}>
                <BarChart3 size={20} style={{ color: '#C0BAB4' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: '#888880' }}>No activity yet</p>
              <p className="text-xs mt-1" style={{ color: '#B0AAA4' }}>Your transactions will appear here</p>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* KYC Status */}
          <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E2DC' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Compliance Status</h2>
            <div className="space-y-2.5">
              {[
                { label: 'Identity Verified', status: 'done' },
                { label: 'KYB / Business Docs', status: 'pending' },
                { label: 'AML Screening', status: 'pending' },
                { label: 'Admin Approval', status: 'pending' },
                { label: 'Wallet Activated', status: 'pending' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: item.status === 'done' ? 'rgba(5,150,105,0.12)' : '#F5F0EB',
                      color: item.status === 'done' ? '#059669' : '#C0BAB4',
                    }}>
                    {item.status === 'done'
                      ? <CheckCircle2 size={12} />
                      : <Clock size={12} />
                    }
                  </div>
                  <span className="text-xs font-medium" style={{ color: item.status === 'done' ? '#1A1A1A' : '#B0AAA4' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/kyc">
              <a className="flex items-center justify-center gap-1.5 w-full mt-4 py-2.5 rounded-xl text-xs font-semibold text-white"
                style={{ background: '#C73B22' }}>
                Complete KYC <ArrowRight size={13} />
              </a>
            </Link>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E2DC' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction icon={<Package size={16} />} label="Create Consignment" href="/consignments" desc="List inventory for trade" />
              <QuickAction icon={<Store size={16} />} label="Browse Marketplace" href="/marketplace" desc="Find verified commodities" />
              <QuickAction icon={<FileText size={16} />} label="Submit RFQ" href="/orders" desc="Request quotes from sellers" />
              <QuickAction icon={<Shield size={16} />} label="View Escrow" href="/escrow" desc="Track deal settlements" />
            </div>
          </div>

          {/* Alert */}
          <div className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(199,59,34,0.04)', border: '1px solid rgba(199,59,34,0.15)' }}>
            <AlertCircle size={16} style={{ color: '#C73B22', marginTop: 1, shrink: 0 }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#C73B22' }}>KYC Pending</p>
              <p className="text-xs mt-0.5" style={{ color: '#888880' }}>
                Complete your KYC/KYB documents to unlock all platform modules and wallet features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
