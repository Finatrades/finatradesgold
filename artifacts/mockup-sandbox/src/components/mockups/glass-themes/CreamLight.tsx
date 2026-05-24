import { Home, Package, Truck, FileText, Wallet, Shield, Search, Bell, ChevronDown, TrendingUp, ArrowUpRight, MoreHorizontal } from 'lucide-react';

const BG = `
  radial-gradient(120% 60% at 100% 0%, rgba(255,210,180,0.55) 0%, transparent 55%),
  radial-gradient(80% 60% at 0% 100%, rgba(232,84,42,0.18) 0%, transparent 60%),
  linear-gradient(135deg, #FAEFE3 0%, #F5E8DC 55%, #EBD9C8 100%)
`;
const SHADOW = 'rgba(120, 40, 20, 0.16)';
const ACCENT = '#E8542A';
const ACCENT_DARK = '#C73B22';
const INK = '#1A1410';
const INK_MUTED = 'rgba(26,20,16,0.62)';
const INK_FAINT = 'rgba(26,20,16,0.45)';

export function CreamLight() {
  const nav = [
    { icon: Home, label: 'Dashboard', active: true },
    { icon: Package, label: 'Consignments', badge: 12 },
    { icon: Truck, label: 'Logistics' },
    { icon: FileText, label: 'RFQs', badge: 4 },
    { icon: Wallet, label: 'Wallet' },
    { icon: Shield, label: 'KYC' },
  ];
  const stats = [
    { label: 'Total Revenue', value: '$2.84M', delta: '+12.4%' },
    { label: 'Active Trades', value: '47', delta: '+8' },
    { label: 'In Transit', value: '23.5K MT', delta: '+3.2%' },
    { label: 'Escrow Locked', value: '$840K', delta: '4 deals' },
  ];
  return (
    <div className="min-h-screen w-full font-sans" style={{ background: BG, backgroundAttachment: 'fixed', color: INK }}>
      <div className="flex">
        <aside className="w-[232px] shrink-0 p-3 flex flex-col gap-2 h-screen sticky top-0">
          <div className="rounded-2xl px-3 py-3 flex items-center justify-between" style={glass()}>
            <div className="text-lg font-bold tracking-tight" style={{ color: ACCENT_DARK }}>Finatrades</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(232,84,42,0.12)', color: ACCENT_DARK, border: '1px solid rgba(232,84,42,0.25)' }}>CREAM</span>
          </div>
          <nav className="rounded-2xl py-2 flex-1" style={glass()}>
            <div className="px-3 pt-1 pb-2 text-[10px] font-bold tracking-widest uppercase" style={{ color: INK_FAINT }}>Trade Operations</div>
            {nav.map((n, i) => (
              <div key={i} className="mx-2 mb-0.5 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold"
                style={n.active ? {
                  background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
                  color: '#fff',
                  boxShadow: `0 6px 16px rgba(232,84,42,0.32), 0 1px 0 rgba(255,255,255,0.25) inset`,
                  border: '1px solid rgba(232,84,42,0.4)',
                } : { color: INK }}>
                <n.icon size={15} style={{ color: n.active ? '#fff' : ACCENT }} />
                <span>{n.label}</span>
                {n.badge && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={n.active
                      ? { background: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff' }
                      : { background: 'rgba(232,84,42,0.14)', border: '1px solid rgba(232,84,42,0.3)', color: ACCENT_DARK }}>{n.badge}</span>
                )}
              </div>
            ))}
          </nav>
          <div className="rounded-2xl p-2.5" style={glass()}>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(232,84,42,0.18)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` }}>CP</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">cps2050</p>
                <p className="text-[10px] truncate font-medium" style={{ color: INK_MUTED }}>Exporter</p>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 min-w-0 p-3 pr-4 flex flex-col gap-3">
          <header className="rounded-2xl px-5 h-14 flex items-center gap-4" style={glass()}>
            <h1 className="text-base font-semibold flex-1">Dashboard</h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,20,16,0.08)' }}>
              <TrendingUp size={13} style={{ color: ACCENT }} />
              <span style={{ color: INK_MUTED }}>XAU/g</span>
              <span className="font-bold">$2,418</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(5,150,105,0.14)', color: '#047857', border: '1px solid rgba(5,150,105,0.3)' }}>LIVE</span>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,20,16,0.08)', color: INK_MUTED }}>
              <Search size={14} /><span>Search…</span>
            </button>
            <Bell size={16} style={{ color: INK_MUTED }} />
            <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,20,16,0.08)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` }}>C</div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold leading-tight">cps2050</p>
                <p className="text-[10px] leading-tight" style={{ color: INK_MUTED }}>Exporter</p>
              </div>
              <ChevronDown size={13} style={{ color: INK_MUTED }} />
            </div>
          </header>

          <section className="rounded-3xl p-6 relative overflow-hidden" style={glass(true)}>
            <div className="flex items-end justify-between gap-6 relative">
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color: ACCENT_DARK }}>Welcome back</p>
                <h2 className="text-3xl font-bold tracking-tight">Good afternoon, <span style={{ color: ACCENT }}>Christopher</span></h2>
                <p className="text-sm mt-1.5" style={{ color: INK_MUTED }}>4 consignments need attention · 2 RFQs awaiting your response</p>
              </div>
              <button className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`, boxShadow: `0 10px 24px rgba(232,84,42,0.4)` }}>
                New Consignment <ArrowUpRight size={15} />
              </button>
            </div>
          </section>

          <section className="grid grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="rounded-2xl p-4" style={glass()}>
                <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: INK_FAINT }}>{s.label}</p>
                <p className="text-2xl font-bold tracking-tight mt-1.5">{s.value}</p>
                <p className="text-[11px] mt-1 font-semibold" style={{ color: ACCENT_DARK }}>▲ {s.delta}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-3 gap-3">
            <div className="col-span-2 rounded-2xl p-5" style={glass()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: INK_FAINT }}>Revenue · 12 weeks</p>
                  <p className="text-xl font-bold mt-0.5">$2,840,500</p>
                </div>
                <MoreHorizontal size={16} style={{ color: INK_FAINT }} />
              </div>
              <svg viewBox="0 0 600 180" className="w-full h-44">
                <defs>
                  <linearGradient id="lg4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(232,84,42,0.35)" />
                    <stop offset="100%" stopColor="rgba(232,84,42,0)" />
                  </linearGradient>
                </defs>
                <path d="M0,140 C60,110 120,130 180,90 C240,55 300,80 360,55 C420,32 480,60 540,38 L600,32 L600,180 L0,180 Z" fill="url(#lg4)" />
                <path d="M0,140 C60,110 120,130 180,90 C240,55 300,80 360,55 C420,32 480,60 540,38 L600,32" stroke={ACCENT} strokeWidth="2.5" fill="none" />
              </svg>
            </div>
            <div className="rounded-2xl p-5" style={glass()}>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: INK_FAINT }}>Recent Activity</p>
              <ul className="mt-3 space-y-3">
                {['Consignment CG-2451 approved', 'RFQ-1180 received from buyer FT-93', 'Escrow funded · $124K', 'Inventory updated · Cocoa 8.4MT'].map((t, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: ACCENT }} />
                    <span className="text-[12px] leading-snug">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function glass(strong = false): React.CSSProperties {
  return {
    background: strong
      ? 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.45) 100%)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.85)',
    boxShadow: `0 1px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(120,40,20,0.04) inset, 0 14px 32px -14px ${SHADOW}, 0 4px 10px -3px ${SHADOW}`,
  };
}
