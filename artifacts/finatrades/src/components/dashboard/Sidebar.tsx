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

  const sidebarW = collapsed ? '68px' : '240px';

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-200"
        style={{
          width: sidebarW,
          background: '#111110',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          transform: isOpen ? 'translateX(0)' : '',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', minHeight: '60px' }}>
          {collapsed ? (
            <img src={faviconIcon} alt="F" className="h-7 w-7 object-contain mx-auto" />
          ) : (
            <img src={finatradesLogo} alt="Finatrades" className="h-7 w-auto"
              style={{ filter: 'brightness(0) invert(1)' }} />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0"
            style={{ color: '#666660' }}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Role pill */}
        {!collapsed && (
          <div className="px-4 pt-3 pb-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold tracking-wide"
              style={{ background: 'rgba(199,59,34,0.12)', color: '#E8896E', border: '1px solid rgba(199,59,34,0.20)' }}>
              <div className="w-1 h-1 rounded-full" style={{ background: '#C73B22' }} />
              {roleLabel.toUpperCase()}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2" style={{ scrollbarWidth: 'none' }}>
          {sections.map(section => (
            <div key={section.key} className="mb-1">
              {!collapsed && (
                <button
                  onClick={() => toggle(section.key)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors"
                  style={{ color: '#555550' }}
                >
                  {section.label}
                  <ChevronDown size={12} style={{ transform: openSections[section.key] ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                </button>
              )}

              {(openSections[section.key] || collapsed) && (
                <div className="space-y-0.5">
                  {section.items.map(item => {
                    const active = location === item.href || location.startsWith(item.href + '/');
                    return (
                      <Link key={item.href} href={item.href}>
                        <a
                          className="flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm transition-all relative group"
                          style={{
                            background: active ? 'rgba(199,59,34,0.12)' : 'transparent',
                            color: active ? '#E8896E' : '#888880',
                          }}
                          title={collapsed ? item.label : undefined}
                        >
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                              style={{ background: '#C73B22' }} />
                          )}
                          <span className="shrink-0" style={{ color: active ? '#C73B22' : '#666660' }}>
                            {item.icon}
                          </span>
                          {!collapsed && (
                            <span className="font-medium truncate">{item.label}</span>
                          )}
                          {item.badge && !collapsed && (
                            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(199,59,34,0.15)', color: '#C73B22' }}>
                              {item.badge}
                            </span>
                          )}
                          {collapsed && (
                            <span className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity"
                              style={{ background: '#222', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
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
          ))}
        </nav>

        {/* User footer */}
        <div className="shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {collapsed ? (
            <button onClick={() => logout()} className="w-full flex items-center justify-center p-2 rounded-lg transition-colors"
              style={{ color: '#666660' }} title="Logout">
              <LogOut size={16} />
            </button>
          ) : (
            <div>
              <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: '#C73B22', color: '#fff' }}>
                  {((user as any)?.fullName || (user as any)?.email || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {(user as any)?.fullName || (user as any)?.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: '#555550' }}>
                    {roleLabel}
                  </p>
                </div>
              </div>
              <button onClick={() => logout()}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors"
                style={{ color: '#555550' }}>
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
