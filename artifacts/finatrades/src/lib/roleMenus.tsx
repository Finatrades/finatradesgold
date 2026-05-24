import React from 'react';
import {
  LayoutDashboard, Package, Warehouse, Store, FileText, Handshake, Scale, Landmark, Workflow, Vault,
  Shield, User, Settings, HelpCircle, ShieldCheck, Building2, Bell, History,
  Users, BarChart3, AlertTriangle, Globe, Wallet, Star, Inbox, Mail, Truck, Route as RouteIcon,
  ShieldAlert, Tags, Megaphone, Award,
} from 'lucide-react';

export type UserType = 'exporter' | 'importer' | 'government' | 'warehouse';

export interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
  /**
   * RBAC component slug + action this menu item requires. If set, the
   * sidebar hides the entry unless the signed-in admin has that
   * permission (or is a Super Admin with the '*' wildcard).
   */
  requires?: { component: string; action: 'view' | 'edit' };
}
export interface MenuSection {
  key: string;
  label: string;
  items: MenuItem[];
  requirePermission?: string;
}

const accountSection: MenuSection = {
  key: 'account',
  label: 'Account',
  items: [
    { icon: <User size={16} />, label: 'Profile', href: '/profile' },
    { icon: <ShieldCheck size={16} />, label: 'KYC / Compliance', href: '/kyc' },
    { icon: <Settings size={16} />, label: 'Security', href: '/security' },
    { icon: <HelpCircle size={16} />, label: 'Help & Support', href: '/help' },
  ],
};

const overviewSection = (extras: MenuItem[] = []): MenuSection => ({
  key: 'main',
  label: 'Overview',
  items: [
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard', href: '/dashboard' },
    { icon: <History size={16} />, label: 'Transactions', href: '/transactions' },
    { icon: <Bell size={16} />, label: 'Notifications', href: '/notifications' },
    ...extras,
  ],
});

export const EXPORTER_MENU: MenuSection[] = [
  overviewSection(),
  {
    key: 'trade',
    label: 'Sell-Side Operations',
    items: [
      { icon: <Package size={16} />, label: 'My Consignments', href: '/consignments' },
      { icon: <Warehouse size={16} />, label: 'Warehouse Inventory', href: '/inventory' },
      { icon: <Store size={16} />, label: 'My Listings', href: '/marketplace' },
      { icon: <Inbox size={16} />, label: 'Incoming RFQs', href: '/rfqs/incoming' },
      { icon: <Package size={16} />, label: 'Sales Orders', href: '/orders/mine' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance & Settlement',
    items: [
      { icon: <Wallet size={16} />, label: 'Wallet', href: '/wallet' },
      { icon: <Shield size={16} />, label: 'Escrow & Settlement', href: '/escrow' },
      { icon: <Handshake size={16} />, label: 'Trade Finance', href: '/finabridge' },
      { icon: <FileText size={16} />, label: 'Warehouse Receipts', href: '/certificates' },
    ],
  },
  accountSection,
];

export const IMPORTER_MENU: MenuSection[] = [
  overviewSection(),
  {
    key: 'trade',
    label: 'Buy-Side Operations',
    items: [
      { icon: <Store size={16} />, label: 'Marketplace', href: '/marketplace' },
      { icon: <Star size={16} />, label: 'Watchlist', href: '/watchlist' },
      { icon: <FileText size={16} />, label: 'My RFQs', href: '/rfqs/mine' },
      { icon: <Package size={16} />, label: 'My Orders', href: '/orders/mine' },
      { icon: <Package size={16} />, label: 'Incoming Shipments', href: '/consignments' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance & Settlement',
    items: [
      { icon: <Wallet size={16} />, label: 'Wallet', href: '/wallet' },
      { icon: <Shield size={16} />, label: 'Escrow & Settlement', href: '/escrow' },
      { icon: <Handshake size={16} />, label: 'Trade Finance', href: '/finabridge' },
    ],
  },
  accountSection,
];

export const GOVERNMENT_MENU: MenuSection[] = [
  overviewSection(),
  {
    key: 'sovereign',
    label: 'Sovereign Programs',
    items: [
      { icon: <Building2 size={16} />, label: 'Sovereign Programs', href: '/sovereign' },
      { icon: <Scale size={16} />, label: 'Barter Workflow', href: '/barter' },
      { icon: <Globe size={16} />, label: 'National Inventory', href: '/inventory' },
    ],
  },
  {
    key: 'finance',
    label: 'Treasury',
    items: [
      { icon: <Wallet size={16} />, label: 'Wallet', href: '/wallet' },
      { icon: <Shield size={16} />, label: 'Escrow & Settlement', href: '/escrow' },
      { icon: <Handshake size={16} />, label: 'Trade Finance', href: '/finabridge' },
    ],
  },
  accountSection,
];

export const WAREHOUSE_MENU: MenuSection[] = [
  overviewSection(),
  {
    key: 'warehouse',
    label: 'Warehouse Operations',
    items: [
      { icon: <Warehouse size={16} />, label: 'Inbound Tally Queue', href: '/warehouse' },
      { icon: <Package size={16} />, label: 'Hub Inventory', href: '/inventory' },
    ],
  },
  accountSection,
];

export const ADMIN_MENU: MenuSection[] = [
  overviewSection(),
  {
    key: 'ops',
    label: 'Platform Operations',
    items: [
      { icon: <Users size={16} />, label: 'All Users', href: '/admin/users' },
      { icon: <ShieldCheck size={16} />, label: 'KYC Review', href: '/admin/kyc' },
      { icon: <Package size={16} />, label: 'Consignment Review', href: '/admin/consignments' },
      { icon: <Package size={16} />, label: 'All Consignments', href: '/consignments' },
      { icon: <Warehouse size={16} />, label: 'Warehouse Tally', href: '/warehouse' },
      { icon: <Store size={16} />, label: 'Marketplace', href: '/marketplace' },
      { icon: <Wallet size={16} />, label: 'Wallets', href: '/admin/wallets' },
    ],
  },
  {
    key: 'marketplace_ops',
    label: 'Marketplace Ops',
    requirePermission: 'moderate_marketplace',
    items: [
      { icon: <ShieldAlert size={16} />, label: 'Listing Moderation', href: '/admin/listings' },
      { icon: <Tags size={16} />, label: 'Categories', href: '/admin/categories' },
      { icon: <Megaphone size={16} />, label: 'Marketing Banners', href: '/admin/banners' },
      { icon: <Award size={16} />, label: 'Seller Badges', href: '/admin/sellers' },
    ],
  },
  {
    key: 'ops2',
    label: 'More',
    items: [
      { icon: <Mail size={16} />, label: 'Email Queues', href: '/admin/email-queues' },
      { icon: <ShieldCheck size={16} />, label: 'Staff & Roles', href: '/admin/staff',
        requires: { component: 'employees', action: 'edit' } },
    ],
  },
  {
    key: 'network',
    label: 'Network',
    items: [
      { icon: <Warehouse size={16} />, label: 'Warehouse Hubs', href: '/admin/hubs' },
      { icon: <Truck size={16} />, label: 'Carriers', href: '/admin/carriers' },
      { icon: <RouteIcon size={16} />, label: 'Shipping Routes', href: '/admin/shipping-routes' },
      { icon: <Truck size={16} />, label: 'Shipments', href: '/admin/shipments' },
    ],
  },
  {
    key: 'ops2',
    label: 'Risk & Insights',
    items: [
      { icon: <Shield size={16} />, label: 'Escrow Oversight', href: '/escrow' },
      { icon: <AlertTriangle size={16} />, label: 'Risk & AML', href: '/admin/risk' },
      { icon: <BarChart3 size={16} />, label: 'Analytics', href: '/admin/analytics' },
    ],
  },
  {
    key: 'trade-finance-ops',
    label: 'Trade Finance Ops',
    items: [
      { icon: <Landmark size={16} />, label: 'Bank Partners', href: '/admin/trade-finance/banks' },
      { icon: <FileText size={16} />, label: 'LC Templates', href: '/admin/trade-finance/lc-templates' },
      { icon: <Workflow size={16} />, label: 'Milestone Presets', href: '/admin/trade-finance/milestone-presets' },
      { icon: <Vault size={16} />, label: 'Escrow Config', href: '/admin/trade-finance/escrow' },
    ],
  },
  {
    key: 'settings',
    label: 'Platform Settings',
    items: [
      { icon: <Settings size={16} />, label: 'Fees & Commissions', href: '/admin/settings/fees' },
      { icon: <Globe size={16} />, label: 'Countries', href: '/admin/settings/countries' },
      { icon: <Wallet size={16} />, label: 'Currencies', href: '/admin/settings/currencies' },
      { icon: <Mail size={16} />, label: 'Email Templates', href: '/admin/settings/email-templates' },
      { icon: <HelpCircle size={16} />, label: 'Help Articles', href: '/admin/settings/help-articles' },
      { icon: <Bell size={16} />, label: 'Announcements', href: '/admin/settings/announcements' },
    ],
  },
  accountSection,
];

export function getMenuForUser(user: any): MenuSection[] {
  if (!user) return EXPORTER_MENU;
  let sections: MenuSection[];
  if (user.role === 'admin') sections = ADMIN_MENU;
  else {
    const t: UserType = user.userType || 'exporter';
    if (t === 'importer') sections = IMPORTER_MENU;
    else if (t === 'government') sections = GOVERNMENT_MENU;
    else if (t === 'warehouse') sections = WAREHOUSE_MENU;
    else sections = EXPORTER_MENU;
  }
  return sections.filter(s => !s.requirePermission || hasPermission(user, s.requirePermission));
}

export function getRoleLabel(user: any): string {
  if (!user) return 'Exporter';
  if (user.role === 'admin') return 'Platform Admin';
  const t: UserType = user.userType || 'exporter';
  if (t === 'importer') return 'Importer / Buyer';
  if (t === 'government') return 'Government Entity';
  if (t === 'warehouse') return 'Warehouse Operator';
  return 'Exporter / Seller';
}

/**
 * Authoritative role-matrix. Admin always allowed.
 * Backend MUST mirror this in requireUserType middleware for real enforcement.
 *
 *  Path                | Exporter | Importer | Government
 *  /dashboard          |    ✓     |    ✓     |     ✓
 *  /transactions       |    ✓     |    ✓     |     ✓
 *  /notifications      |    ✓     |    ✓     |     ✓
 *  /consignments       |    ✓     |    ✓     |     —
 *  /inventory          |    ✓     |    —     |     ✓     (gov sees national inventory)
 *  /marketplace        |    ✓     |    ✓     |     —
 *  /orders             |    ✓     |    ✓     |     —
 *  /escrow             |    ✓     |    ✓     |     ✓
 *  /finabridge         |    ✓     |    ✓     |     ✓     (Trade Finance visible to all)
 *  /certificates       |    ✓     |    ✓     |     —
 *  /barter             |    —     |    —     |     ✓     (sovereign-only)
 *  /sovereign          |    —     |    —     |     ✓     (sovereign-only)
 *  /profile /kyc /security /help — open to all
 */
export const ROUTE_ACCESS: Record<string, UserType[]> = {
  '/consignments':  ['exporter', 'importer'],
  '/inventory':     ['exporter', 'government', 'warehouse'],
  '/marketplace':   ['exporter', 'importer'],
  '/marketplace/:id': ['exporter', 'importer'],
  '/orders':        ['exporter', 'importer'],
  '/orders/mine':   ['exporter', 'importer'],
  '/rfqs/mine':     ['importer'],
  '/rfqs/incoming': ['exporter'],
  '/watchlist':     ['importer'],
  '/escrow':        ['exporter', 'importer', 'government'],
  '/finabridge':    ['exporter', 'importer', 'government'],
  '/certificates':  ['exporter', 'importer'],
  '/barter':        ['government'],
  '/sovereign':     ['government'],
  '/wallet':        ['exporter', 'importer', 'government'],
  '/warehouse':     ['warehouse'],
};

export function canAccess(path: string, user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true; // un-listed paths (profile, kyc, etc.) are open
  const t: UserType = user.userType || 'exporter';
  return allowed.includes(t);
}

/**
 * Permission gate for fine-grained admin capabilities. Admin role implicitly
 * has every permission (mirrors backend defaults in security-middleware.ts).
 * Non-admin users may carry an explicit `permissions` array (slug strings).
 * Backend remains the source of truth via requirePermission middleware.
 */
export function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(permission);
}
