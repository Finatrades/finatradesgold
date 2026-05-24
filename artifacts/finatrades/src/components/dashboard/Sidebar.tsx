import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMenuForUser, getRoleLabel } from '@/lib/roleMenus';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';
import faviconIcon from '@/assets/favicon-icon.webp';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.96)',
  backdropFilter: 'blur(12px) saturate(140%)',
  WebkitBackdropFilter: 'blur(12px) saturate(140%)',
  border: '1px solid rgba(26,26,26,0.06)',
  boxShadow:
    '0 1px 0 rgba(255,255,255,0.9) inset, 0 6px 18px -8px rgba(26,26,26,0.18), 0 2px 4px -2px rgba(122,31,18,0.08)',
};

export default function Sidebar({ isOpen, setIsOpen, collapsed, setCollapsed }: SidebarProps) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const sections = getMenuForUser(user);
  const roleLabel = getRoleLabel(user);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections.forEach((s, i) => { init[s.key] = i < 3; });
    return init;
  });

  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const sidebarW = collapsed ? '76px' : '256px';

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-200"
        style={{
          width: sidebarW,
          padding: '12px 10px 12px 12px',
          background: `
            radial-gradient(120% 60% at 0% 0%, rgba(255,200,180,0.45) 0%, transparent 55%),
            radial-gradient(80% 60% at 100% 100%, rgba(168,47,27,0.55) 0%, transparent 60%),
            linear-gradient(180deg, #C73B22 0%, #A82F1B 55%, #7A1F12 100%)
          `,
          transform: isOpen ? 'translateX(0)' : '',
        }}
      >
        {/* Logo card */}
        <div
          className="flex items-center justify-between shrink-0 rounded-2xl px-3"
          style={{ ...GLASS_CARD, minHeight: '56px' }}
        >
          {collapsed ? (
            <img src={faviconIcon} alt="F" className="h-8 w-8 object-contain mx-auto" />
          ) : (
            <img src={finatradesLogo} alt="Finatrades" className="h-6 w-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0 hover:bg-white ${collapsed ? 'hidden' : ''}`}
            style={{ color: '#4A4A48', border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.5)' }}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={14} />
          </button>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden lg:flex absolute -right-3 top-5 items-center justify-center w-6 h-6 rounded-full transition-colors shadow-md"
              style={{ color: '#C73B22', background: '#fff', border: '1px solid #E8E2DC' }}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={12} />
            </button>
          )}
        </div>

        {/* Role pill */}
        {!collapsed && (
          <div className="mt-2.5 px-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide"
              style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22', border: '1px solid rgba(199,59,34,0.18)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#C73B22', boxShadow: '0 0 0 2px rgba(199,59,34,0.15)' }} />
              {roleLabel.toUpperCase()}
            </div>
          </div>
        )}

        {/* Nav (cards) */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-0.5" style={{ scrollbarWidth: 'none' }}>
          {sections.map(section => {
            const isOpenSec = openSections[section.key] || collapsed;
            return (
              <div
                key={section.key}
                className="rounded-2xl overflow-hidden"
                style={GLASS_CARD}
              >
                {!collapsed && (
                  <button
                    onClick={() => toggle(section.key)}
                    className="w-full flex items-center justify-between px-3 pt-2.5 pb-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-white/30"
                    style={{ color: '#888880' }}
                  >
                    {section.label}
                    <ChevronDown
                      size={12}
                      style={{
                        transform: openSections[section.key] ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.18s',
                        color: '#4A4A48',
                      }}
                    />
                  </button>
                )}

                {isOpenSec && (
                  <div className={`flex flex-col gap-1 ${collapsed ? 'p-2' : 'px-2 pb-2'}`}>
                    {section.items.map(item => {
                      const active = location === item.href || location.startsWith(item.href + '/');
                      return (
                        <Link key={item.href} href={item.href}>
                          <a
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all relative group"
                            style={{
                              background: active
                                ? 'linear-gradient(135deg, #C73B22 0%, #A82F1B 100%)'
                                : 'transparent',
                              color: active ? '#FFFFFF' : '#1A1A1A',
                              boxShadow: active
                                ? '0 4px 12px rgba(199,59,34,0.28), 0 1px 0 rgba(255,255,255,0.25) inset'
                                : 'none',
                              border: active
                                ? '1px solid rgba(168,47,27,0.7)'
                                : '1px solid transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (!active) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.9)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!active) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'transparent';
                              }
                            }}
                            title={collapsed ? item.label : undefined}
                          >
                            <span
                              className="shrink-0 flex items-center justify-center"
                              style={{ color: active ? '#FFFFFF' : '#C73B22' }}
                            >
                              {item.icon}
                            </span>
                            {!collapsed && (
                              <span
                                className={`truncate ${active ? 'font-bold' : 'font-semibold'}`}
                                style={{
                                  textShadow: active
                                    ? '0 1px 0 rgba(0,0,0,0.12)'
                                    : '0 1px 0 rgba(255,255,255,0.6)',
                                }}
                              >
                                {item.label}
                              </span>
                            )}
                            {item.badge && !collapsed && (
                              <span
                                className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                                style={{
                                  background: active ? 'rgba(255,255,255,0.22)' : 'rgba(199,59,34,0.12)',
                                  color: active ? '#FFFFFF' : '#C73B22',
                                  border: active
                                    ? '1px solid rgba(255,255,255,0.3)'
                                    : '1px solid rgba(199,59,34,0.18)',
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                            {collapsed && (
                              <span
                                className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity"
                                style={{
                                  background: '#1A1A1A',
                                  color: '#fff',
                                  boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                                }}
                              >
                                {item.label}
                              </span>
                            )}
                          </a>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User footer card */}
        <div className="shrink-0 rounded-2xl p-2.5 mt-2" style={GLASS_CARD}>
          {collapsed ? (
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center p-2 rounded-xl transition-colors hover:bg-white/70"
              style={{ color: '#C73B22' }}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div
                className="flex items-center gap-2.5 px-2 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #C73B22 0%, #A82F1B 100%)',
                    boxShadow: '0 2px 6px rgba(199,59,34,0.25), 0 1px 0 rgba(255,255,255,0.3) inset',
                  }}
                >
                  {((user as any)?.fullName || (user as any)?.email || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: '#1A1A1A' }}>
                    {(user as any)?.fullName || (user as any)?.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] truncate font-medium" style={{ color: '#888880' }}>
                    {roleLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-colors hover:bg-white/70"
                style={{ color: '#4A4A48' }}
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
