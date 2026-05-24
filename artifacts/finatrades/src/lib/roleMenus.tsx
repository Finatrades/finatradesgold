import React from 'react';
import {
  LayoutDashboard, Package, Warehouse, Store, FileText, Handshake, Scale,
  Shield, User, Settings, HelpCircle, ShieldCheck, Building2, Bell, History,
  Users, BarChart3, AlertTriangle, Globe,
} from 'lucide-react';

export type UserType = 'exporter' | 'importer' | 'government';

export interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
}
export interface MenuSection {
  key: string;
  label: string;
  items: MenuItem[];
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
      { icon: <FileText size={16} />, label: 'Incoming RFQs', href: '/orders' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance & Settlement',
    items: [
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
      { icon: <FileText size={16} />, label: 'My RFQs & Orders', href: '/orders' },
      { icon: <Package size={16} />, label: 'Incoming Shipments', href: '/consignments' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance & Settlement',
    items: [
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
      { icon: <Shield size={16} />, label: 'Escrow & Settlement', href: '/escrow' },
      { icon: <Handshake size={16} />, label: 'Trade Finance', href: '/finabridge' },
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
      { icon: <Package size={16} />, label: 'All Consignments', href: '/consignments' },
      { icon: <Store size={16} />, label: 'Marketplace', href: '/marketplace' },
      { icon: <Shield size={16} />, label: 'Escrow Oversight', href: '/escrow' },
      { icon: <AlertTriangle size={16} />, label: 'Risk & AML', href: '/admin/risk' },
      { icon: <BarChart3 size={16} />, label: 'Analytics', href: '/admin/analytics' },
    ],
  },
  accountSection,
];

export function getMenuForUser(user: any): MenuSection[] {
  if (!user) return EXPORTER_MENU;
  if (user.role === 'admin') return ADMIN_MENU;
  const t: UserType = user.userType || 'exporter';
  if (t === 'importer') return IMPORTER_MENU;
  if (t === 'government') return GOVERNMENT_MENU;
  return EXPORTER_MENU;
}

export function getRoleLabel(user: any): string {
  if (!user) return 'Exporter';
  if (user.role === 'admin') return 'Platform Admin';
  const t: UserType = user.userType || 'exporter';
  if (t === 'importer') return 'Importer / Buyer';
  if (t === 'government') return 'Government Entity';
  return 'Exporter / Seller';
}

/**
 * Routes each user-type is permitted to access. Admin always allowed.
 * Used by RoleRoute on the client; backend should ultimately enforce too.
 */
export const ROUTE_ACCESS: Record<string, UserType[]> = {
  '/sovereign': ['government'],
  '/barter': ['government', 'exporter', 'importer'], // barter visible to all but workflows differ
};

export function canAccess(path: string, user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true;
  const t: UserType = user.userType || 'exporter';
  return allowed.includes(t);
}
