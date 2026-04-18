import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Wallet,
  Database,
  TrendingUp,
  BarChart3,
  CreditCard,
  User,
  Shield,
  LogOut,
  ShieldCheck,
  History,
  FileText,
  Send,
  X,
  Gift,
  HelpCircle,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';
import faviconIcon from '@/assets/favicon-icon.webp';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  variant?: 'default' | 'danger';
}

interface MenuSection {
  key: string;
  label: string;
  items: MenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen, collapsed, setCollapsed }: SidebarProps) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { accountType } = useAccountType();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    main: true,
    business: true,
    features: true,
    tools: true,
  });

  const mainItems: MenuItem[] = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Overview', href: '/dashboard' },
    { icon: <Wallet className="w-4 h-4" />, label: 'Gold Wallet', href: '/finapay' },
    { icon: <Database className="w-4 h-4" />, label: 'Gold Storage', href: '/finavault' },
    { icon: <TrendingUp className="w-4 h-4" />, label: 'Buy Now, Sell Later', href: '/bnsl' },
    { icon: <History className="w-4 h-4" />, label: 'Transactions', href: '/transactions' },
  ];

  if (user?.kycStatus === 'Not Started' || user?.kycStatus === 'Rejected') {
    mainItems.splice(1, 0, {
      icon: <ShieldCheck className="w-4 h-4" />,
      label: 'Verify Identity',
      href: '/kyc',
      variant: 'danger',
    });
  }

  const businessItems: MenuItem[] = accountType === 'business' ? [
    { icon: <BarChart3 className="w-4 h-4" />, label: 'Trade Finance', href: '/finabridge' },
    { icon: <FileText className="w-4 h-4" />, label: 'Trade Requests', href: '/finabridge/requests' },
    { icon: <Send className="w-4 h-4" />, label: 'Proposals', href: '/finabridge/proposals' },
    { icon: <History className="w-4 h-4" />, label: 'Trade History', href: '/finabridge/history' },
  ] : [];

  const featureItems: MenuItem[] = [
    { icon: <CreditCard className="w-4 h-4" />, label: 'FinaCard', href: '/finacard' },
    { icon: <Gift className="w-4 h-4" />, label: 'Referral', href: '/referral' },
  ];

  const toolItems: MenuItem[] = [
    { icon: <User className="w-4 h-4" />, label: 'Profile', href: '/profile' },
    { icon: <Shield className="w-4 h-4" />, label: 'Security', href: '/security' },
    { icon: <Settings className="w-4 h-4" />, label: 'Settings', href: '/settings' },
    { icon: <HelpCircle className="w-4 h-4" />, label: 'Help Center', href: '/help' },
  ];

  const sections: MenuSection[] = [
    { key: 'main', label: 'Main', items: mainItems },
    ...(businessItems.length > 0 ? [{ key: 'business', label: 'Business', items: businessItems }] : []),
    { key: 'features', label: 'Features', items: featureItems },
    { key: 'tools', label: 'Tools', items: toolItems },
  ];

  const isActive = (path: string) => location === path || (path !== '/dashboard' && location.startsWith(path + '/'));

  const renderItem = (item: MenuItem, isLast: boolean) => {
    const active = isActive(item.href);
    const isDanger = item.variant === 'danger';

    // SECURITY: Validate href is a safe internal path (blocks javascript:, data:, vbscript: URIs)
    const safeHref = typeof item.href === 'string' && item.href.startsWith('/') && !item.href.startsWith('//')
      ? item.href
      : '/';

    const content = (
      <Link key={safeHref} href={safeHref}>
        <div
          className={`group relative flex items-center gap-2.5 ${collapsed ? 'lg:justify-center lg:px-2' : 'pl-7 pr-3'} py-2 rounded-lg cursor-pointer transition-all ${
            active
              ? isDanger
                ? 'bg-red-500/15 text-red-500'
                : 'bg-primary/10 text-foreground'
              : isDanger
                ? 'text-red-500 hover:bg-red-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          onClick={() => setIsOpen(false)}
          data-testid={`sidebar-link-${item.href.replace(/\//g, '-').slice(1)}`}
        >
          {/* Tree connector lines */}
          {!collapsed && (
            <>
              {/* vertical line */}
              <span
                className="absolute left-3 top-0 bottom-0 w-px bg-border/60 pointer-events-none"
                style={isLast ? { bottom: '50%' } : undefined}
              />
              {/* horizontal stub */}
              <span className="absolute left-3 top-1/2 w-3 h-px bg-border/60 pointer-events-none" />
              {/* node dot */}
              <span className={`absolute left-[10px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-colors ${
                active ? 'bg-primary' : 'bg-border/80'
              }`} />
            </>
          )}
          <span className={`shrink-0 ${active && !isDanger ? 'text-primary' : ''}`}>{item.icon}</span>
          <span className={`text-[13px] font-medium whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>
            {item.label}
          </span>
        </div>
      </Link>
    );

    if (collapsed) {
      return (
        <TooltipProvider key={item.href} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">{item.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return content;
  };

  const sidebarWidth = collapsed ? 'w-72 lg:w-[72px]' : 'w-72';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      <aside
        className={`fixed top-3 left-3 bottom-3 ${sidebarWidth} z-50 transition-all duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-[110%]'
        } ${collapsed ? 'bg-transparent border-0 shadow-none' : 'hynex-card'} overflow-hidden`}
        data-testid="sidebar"
        style={collapsed ? { background: 'transparent', boxShadow: 'none', border: 'none' } : { borderRadius: 24 }}
      >
        <div className="flex flex-col h-full">

          {/* ── HEADER: logo + collapse toggle ── */}
          <div className={`h-16 flex items-center ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-4'} border-b border-border/40 shrink-0`}>
            <Link href="/">
              <div className="flex items-center cursor-pointer" data-testid="sidebar-logo">
                <img src={finatradesLogo} alt="Finatrades" className={`h-12 w-auto object-contain ${collapsed ? 'lg:hidden' : ''}`} />
                <img src={faviconIcon} alt="Finatrades" className={`w-9 h-9 rounded-lg object-contain hidden ${collapsed ? 'lg:block' : ''}`} />
              </div>
            </Link>

            {/* Mobile close */}
            <button
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop collapse arrow */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all ${collapsed ? 'lg:hidden' : ''}`}
              aria-label="Collapse sidebar"
              data-testid="button-collapse-sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* ── NAV SECTIONS ── */}
          <div className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'} space-y-4 custom-scrollbar`}>
            {sections.map(section => {
              const open = openSections[section.key] !== false;
              return (
                <div key={section.key} className="space-y-0.5">
                  {/* Section header */}
                  {!collapsed ? (
                    <button
                      onClick={() => setOpenSections(s => ({ ...s, [section.key]: !open }))}
                      className="w-full flex items-center justify-between px-2 py-1.5 group"
                      data-testid={`section-toggle-${section.key}`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                        {section.label}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-muted-foreground/50 transition-transform ${open ? '' : '-rotate-90'}`}
                      />
                    </button>
                  ) : (
                    <div className="hidden lg:block h-px bg-border/40 my-2" />
                  )}

                  {/* Items */}
                  {(open || collapsed) && (
                    <div className="space-y-0.5 relative">
                      {section.items.map((item, i) => renderItem(item, i === section.items.length - 1))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── FOOTER ── */}
          <div className={`shrink-0 ${collapsed ? 'p-2' : 'p-3'} border-t border-border/40 space-y-2`}>

            {/* Upgrade to Pro card (expanded only) */}
            <div className={collapsed ? 'lg:hidden' : ''}>
              <div
                className="relative overflow-hidden rounded-2xl p-3.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(34,211,238,0.08) 50%, rgba(124,58,237,0.10) 100%)',
                  border: '1px solid hsl(var(--border) / 0.6)',
                }}
                data-testid="card-upgrade-pro"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.25), transparent 70%)' }} />
                <div className="relative flex items-start gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground leading-tight">Upgrade to Pro</p>
                  </div>
                </div>
                <p className="relative text-[11px] leading-snug text-muted-foreground mb-3">
                  Unlock priority gold pricing, deeper insights, and premium support.
                </p>
                <div className="relative flex items-center gap-2">
                  <Link href="/upgrade">
                    <a className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', boxShadow: '0 2px 8px rgba(16,185,129,0.30)' }} data-testid="link-upgrade-pro">
                      <Zap className="w-3 h-3" /> Upgrade
                    </a>
                  </Link>
                  <Link href="/help">
                    <a className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors" data-testid="link-learn-more-pro">
                      Learn More
                    </a>
                  </Link>
                </div>
              </div>
            </div>

            {/* User chip + logout (expanded) */}
            <div className={collapsed ? 'lg:hidden' : ''}>
              <div className="flex items-center gap-2.5 px-2 py-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate" data-testid="text-sidebar-username">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize truncate">{accountType} account</p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  aria-label="Log out"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Collapsed-only: expand + logout buttons */}
            <div className={`hidden ${collapsed ? 'lg:flex' : ''} flex-col gap-1.5`}>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCollapsed(false)}
                      className="w-full flex items-center justify-center p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Expand sidebar"
                      data-testid="button-expand-sidebar"
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Expand</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={logout}
                      className="w-full flex items-center justify-center p-2.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      aria-label="Log out"
                      data-testid="button-logout-collapsed"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Log Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
