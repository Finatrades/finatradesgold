import { Home, Package, Truck, FileText, Wallet, Shield, Search, Bell, ChevronDown, TrendingUp, ArrowUpRight, MoreHorizontal } from 'lucide-react';

const BG = `
  radial-gradient(120% 60% at 100% 0%, rgba(255,200,180,0.45) 0%, transparent 55%),
  radial-gradient(80% 60% at 0% 100%, rgba(168,47,27,0.55) 0%, transparent 60%),
  linear-gradient(135deg, #C73B22 0%, #A82F1B 55%, #7A1F12 100%)
`;
const SHADOW = 'rgba(40, 8, 4, 0.45)';
const ACCENT = '#7A1F12';

export function MidRedbrick() {
  return <ThemedShell bg={BG} shadow={SHADOW} accent={ACCENT} label="MID REDBRICK" />;
}

const glass = (shadow: string, strong = false): React.CSSProperties => ({
  background: strong
    ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: `0 1px 0 rgba(255,255,255,0.32) inset, 0 -1px 0 rgba(255,255,255,0.06) inset, 0 16px 36px -14px ${shadow}, 0 4px 10px -3px ${shadow}`,
});

function ThemedShell({ bg, shadow, accent, label }: { bg: string; shadow: string; accent: string; label: string }) {
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
    <div className="min-h-screen w-full font-sans text-white" style={{ background: bg, backgroundAttachment: 'fixed' }}>
      <div className="flex">
        <aside className="w-[232px] shrink-0 p-3 flex flex-col gap-2 h-screen sticky top-0">
          <div className="rounded-2xl px-3 py-3 flex items-center justify-between" style={glass(shadow)}>
            <div className="text-lg font-bold tracking-tight">Finatrades</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}>{label}</span>
          </div>
          <nav className="rounded-2xl py-2 flex-1" style={glass(shadow)}>
            <div className="px-3 pt-1 pb-2 text-[10px] font-bold tracking-widest uppercase text-white/70">Trade Operations</div>
            {nav.map((n, i) => (
              <div key={i} className="mx-2 mb-0.5 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold"
                style={n.active ? {
                  background: `linear-gradient(135deg, #C73B22 0%, #A82F1B 100%)`,
                  boxShadow: `0 4px 12px ${shadow}, 0 1px 0 rgba(255,255,255,0.25) inset`,
                  border: '1px solid rgba(168,47,27,0.7)',
                } : { color: 'rgba(255,255,255,0.92)' }}>
                <n.icon size={15} className={n.active ? 'text-white' : ''} style={n.active ? {} : { color: '#FFD9CC' }} />
                <span style={{ textShadow: '0 1px 2px rgba(40,8,4,0.35)' }}>{n.label}</span>
                {n.badge && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)' }}>{n.badge}</span>
                )}
              </div>
            ))}
          </nav>
          <div className="rounded-2xl p-2.5" style={glass(shadow)}>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #C73B22, #A82F1B)' }}>CP</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ textShadow: '0 1px 2px rgba(40,8,4,0.35)' }}>cps2050</p>
                <p className="text-[10px] truncate text-white/70 font-medium">Exporter</p>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 min-w-0 p-3 pr-4 flex flex-col gap-3">
          <header className="rounded-2xl px-5 h-14 flex items-center gap-4" style={glass(shadow)}>
            <h1 className="text-base font-semibold flex-1" style={{ textShadow: '0 1px 2px rgba(40,8,4,0.4)' }}>Dashboard</h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <TrendingUp size={13} />
              <span className="text-white/70">XAU/g</span>
              <span className="font-bold">$2,418</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(5,150,105,0.25)', border: '1px solid rgba(5,150,105,0.4)' }}>LIVE</span>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Search size={14} /><span>Search…</span>
            </button>
            <Bell size={16} />
            <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #C73B22, #A82F1B)' }}>C</div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold leading-tight">cps2050</p>
                <p className="text-[10px] leading-tight text-white/70">Exporter</p>
              </div>
              <ChevronDown size={13} />
            </div>
          </header>

          <section className="rounded-3xl p-6" style={glass(shadow, true)}>
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-white/70 mb-1">Welcome back</p>
                <h2 className="text-3xl font-bold tracking-tight" style={{ textShadow: '0 2px 6px rgba(40,8,4,0.45)' }}>Good afternoon, Christopher</h2>
                <p className="text-sm text-white/80 mt-1.5">4 consignments need attention · 2 RFQs awaiting your response</p>
              </div>
              <button className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: '#fff', color: accent, boxShadow: `0 8px 20px ${shadow}` }}>
                New Consignment <ArrowUpRight size={15} />
              </button>
            </div>
          </section>

          <section className="grid grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="rounded-2xl p-4" style={glass(shadow)}>
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/70">{s.label}</p>
                <p className="text-2xl font-bold tracking-tight mt-1.5" style={{ textShadow: '0 1px 3px rgba(40,8,4,0.4)' }}>{s.value}</p>
                <p className="text-[11px] mt-1 font-semibold text-white/85">▲ {s.delta}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-3 gap-3">
            <div className="col-span-2 rounded-2xl p-5" style={glass(shadow)}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-white/70">Revenue · 12 weeks</p>
                  <p className="text-xl font-bold mt-0.5" style={{ textShadow: '0 1px 3px rgba(40,8,4,0.4)' }}>$2,840,500</p>
                </div>
                <MoreHorizontal size={16} className="text-white/60" />
              </div>
              <svg viewBox="0 0 600 180" className="w-full h-44">
                <defs>
                  <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
                <path d="M0,140 C60,110 120,130 180,90 C240,55 300,80 360,55 C420,32 480,60 540,38 L600,32 L600,180 L0,180 Z" fill="url(#lg2)" />
                <path d="M0,140 C60,110 120,130 180,90 C240,55 300,80 360,55 C420,32 480,60 540,38 L600,32" stroke="#fff" strokeWidth="2.5" fill="none" />
              </svg>
            </div>
            <div className="rounded-2xl p-5" style={glass(shadow)}>
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/70">Recent Activity</p>
              <ul className="mt-3 space-y-3">
                {['Consignment CG-2451 approved', 'RFQ-1180 received from buyer FT-93', 'Escrow funded · $124K', 'Inventory updated · Cocoa 8.4MT'].map((t, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: '#fff' }} />
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
