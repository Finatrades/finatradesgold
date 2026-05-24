import { ShieldCheck, Package, Wallet, AlertTriangle, BarChart3 } from 'lucide-react';
import RoleDashboardShell, { dashboardTheme as theme, type RoleDashboardConfig } from './components/RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleLabel: 'Platform Admin',
  subtitle: 'Finatrades Ops · FT-ADM-001',
  kpis: [
    { value: 1840, max: 2000, label: 'Active Users', subLabel: '1,840/2,000', delta: '+62 this week', color: theme.primary },
    { value: 24, max: 0, label: 'Pending KYC', subLabel: '24 in queue', delta: '+5 today', color: theme.warning },
    { value: 3, max: 0, label: 'Open Disputes', subLabel: '3 active', delta: '-1 today', color: theme.info },
    { value: 124, max: 200, label: 'Platform Volume', subLabel: '$124M MTD', delta: '+18% MoM', color: theme.success },
  ],
  tradeHealth: {
    title: 'Platform Health Score',
    score: 95,
    scoreLabel: 'Excellent',
    metrics: [
      { label: 'Uptime', value: 99, color: theme.success },
      { label: 'KYC SLA', value: 94, color: theme.success },
      { label: 'Dispute SLA', value: 88, color: theme.warning },
      { label: 'Settlement SLA', value: 96, color: theme.primary },
    ],
  },
  wallet: {
    title: 'Platform Reserves (Custodial)',
    items: [
      { currency: 'USD', total: 84000000, available: 24000000, locked: 56000000, pending: 4000000 },
      { currency: 'EUR', total: 31500000, available: 12500000, locked: 17000000, pending: 2000000 },
      { currency: 'GBP', total: 9800000, available: 3800000, locked: 5500000, pending: 500000 },
    ],
    primaryCta: { label: 'Open admin wallets', href: '/admin/wallets' },
    secondaryCta: { label: 'View analytics', href: '/admin/analytics' },
  },
  casesTitle: 'Platform Activity Queue',
  tabs: [
    { id: 'All', label: 'All' },
    { id: 'pending_kyc', label: 'Pending KYC' },
    { id: 'pending_consignment', label: 'Pending Consignment' },
    { id: 'disputed', label: 'Open Disputes' },
    { id: 'escrow_issues', label: 'Escrow Issues' },
    { id: 'settled_today', label: 'Settled Today' },
  ],
  cases: [
    { ref: 'FT-USR-1840', item: 'KYB Document Review', qty: 'Corporate', party: 'FT-IMP-1840', rating: 4.5, status: 'pending', step: 1, escrow: '—', action: 'Review KYC', tag: 'pending_kyc' },
    { ref: 'FT-USR-1841', item: 'KYC Identity Check', qty: 'Individual', party: 'FT-EXP-1841', rating: 4.6, status: 'pending', step: 1, escrow: '—', action: 'Review KYC', tag: 'pending_kyc' },
    { ref: 'FT-CON-512', item: 'Cocoa Consignment', qty: '300 MT', party: 'FT-EXP-082', rating: 4.8, status: 'in-progress', step: 2, escrow: '$675,000', action: 'Approve Consignment', tag: 'pending_consignment' },
    { ref: 'FT-CON-518', item: 'Coffee Consignment', qty: '120 MT', party: 'FT-EXP-091', rating: 4.7, status: 'in-progress', step: 2, escrow: '$340,000', action: 'Approve Consignment', tag: 'pending_consignment' },
    { ref: 'FT-DIS-031', item: 'Quality Dispute', qty: 'Raw Cotton 300 MT', party: 'FT-IMP-205', rating: 4.3, status: 'disputed', step: 2, escrow: '$420,000', action: 'Adjudicate', tag: 'disputed' },
    { ref: 'FT-ESC-204', item: 'Escrow Release Hold', qty: 'Gold 50 KG', party: 'FT-IMP-305', rating: 5.0, status: 'in-progress', step: 2, escrow: '$3,200,000', action: 'Review Hold', tag: 'escrow_issues' },
    { ref: 'FT-TRD-112', item: 'Robusta Coffee Settled', qty: '120 MT', party: 'FT-IMP-112', rating: 4.7, status: 'done', step: 3, escrow: '$340,000', action: 'View Receipt', tag: 'settled_today' },
    { ref: 'FT-TRD-115', item: 'Cocoa Butter Settled', qty: '60 MT', party: 'FT-IMP-155', rating: 4.6, status: 'done', step: 3, escrow: '£150,000', action: 'View Receipt', tag: 'settled_today' },
  ],
  commodityMix: [
    { name: 'Cocoa', value: 4200, color: '#C73B22' },
    { name: 'Coffee', value: 3800, color: '#D97706' },
    { name: 'Cotton', value: 2600, color: '#2563EB' },
    { name: 'Gold', value: 1500, color: '#D4AF37' },
    { name: 'Other', value: 1200, color: '#059669' },
  ],
  commodityTitle: 'Platform Commodity Mix',
  revenueTitle: 'Platform Volume',
  revenueHeadline: '$124M MTD',
  revenueDelta: '+18%',
  revenueSeriesLabel: 'Volume ($)',
  volumeSeriesLabel: 'Deals',
  revenueTrend: [
    { week: 'W1', rev: 6000000, vol: 80 }, { week: 'W2', rev: 7800000, vol: 95 },
    { week: 'W3', rev: 7100000, vol: 88 }, { week: 'W4', rev: 9800000, vol: 120 },
    { week: 'W5', rev: 9200000, vol: 110 }, { week: 'W6', rev: 12500000, vol: 145 },
    { week: 'W7', rev: 11800000, vol: 138 }, { week: 'W8', rev: 14800000, vol: 168 },
    { week: 'W9', rev: 14000000, vol: 160 }, { week: 'W10', rev: 17500000, vol: 195 },
    { week: 'W11', rev: 19200000, vol: 215 }, { week: 'W12', rev: 21000000, vol: 240 },
  ],
  ticker: [
    { name: 'Cocoa', price: '$8,420', delta: '+1.2%', up: true },
    { name: 'Coffee', price: '$214.50', delta: '-0.8%', up: false },
    { name: 'Cotton', price: '$88.20', delta: '+0.5%', up: true },
    { name: 'Gold', price: '$2,340', delta: '+2.1%', up: true },
  ],
  rfqsTitle: 'High-Value RFQs (Review)',
  rfqs: [
    { item: 'Refined Gold', qty: '100 KG', party: 'FT-IMP-882', age: '1h ago', rating: 4.9 },
    { item: 'Cocoa Beans', qty: '500 MT', party: 'FT-IMP-105', age: '3h ago', rating: 4.8 },
    { item: 'Lithium', qty: '300 MT', party: 'FT-GOV-310', age: '6h ago', rating: 4.8 },
  ],
  complianceTitle: 'SLA Compliance',
  compliance: [
    { label: 'KYC SLA (24h)', value: 94, color: theme.success },
    { label: 'Dispute SLA (72h)', value: 88, color: theme.warning },
    { label: 'Settlement SLA (48h)', value: 96, color: theme.success },
  ],
  logisticsTitle: 'High-Risk Shipments',
  logistics: [
    { route: 'Abidjan → Rotterdam', vessel: 'MSC Rachele', progress: 65, eta: 'Oct 12', status: 'Watch', color: theme.info },
    { route: 'Tema → Antwerp', vessel: 'CMA CGM Jade', progress: 10, eta: 'Oct 15', status: 'Customs', color: theme.warning },
  ],
  quickActions: [
    { icon: ShieldCheck, label: 'KYC Review', href: '/admin/kyc' },
    { icon: Package, label: 'Consignment Review', href: '/admin/consignments' },
    { icon: Wallet, label: 'Wallets', href: '/admin/wallets' },
    { icon: AlertTriangle, label: 'Risk & AML', href: '/admin/risk' },
    { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  ],
};

export default function AdminDashboard() {
  return <RoleDashboardShell config={config} />;
}
