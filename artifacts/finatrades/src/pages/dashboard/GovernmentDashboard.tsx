import { Building2, Scale, Globe, Handshake, Lock } from 'lucide-react';
import RoleDashboardShell, { dashboardTheme as theme, type RoleDashboardConfig } from './components/RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleLabel: 'Government Entity',
  subtitle: 'Ministry of Trade · FT-GOV-00412',
  kpis: [
    { value: 5, max: 8, label: 'Sovereign Programs', subLabel: '5/8 Active', delta: '+1 this quarter', color: theme.primary },
    { value: 12400, max: 20000, label: 'National Inventory', subLabel: '12.4k/20k MT', delta: '62%', color: theme.info },
    { value: 7, max: 0, label: 'Barter Counterparties', subLabel: '7 Engaged', delta: '+2 this month', color: theme.warning },
    { value: 42, max: 60, label: 'Treasury Held', subLabel: '$42M/$60M Comm', delta: '70%', color: theme.success },
  ],
  tradeHealth: {
    title: 'Program Health Score',
    score: 91,
    metrics: [
      { label: 'Program completion', value: 88, color: theme.success },
      { label: 'Compliance', value: 97, color: theme.success },
      { label: 'Counterparty rating', value: 96, color: theme.primary },
      { label: 'Doc completeness', value: 90, color: theme.warning },
    ],
  },
  wallet: {
    title: 'Treasury Balances',
    items: [
      { currency: 'USD', total: 42000000, available: 12000000, locked: 28000000, pending: 2000000 },
      { currency: 'EUR', total: 18500000, available: 8500000, locked: 9000000, pending: 1000000 },
    ],
    primaryCta: { label: 'Open treasury', href: '/wallet' },
    secondaryCta: { label: 'View FX rates', href: '/wallet' },
  },
  casesTitle: 'Active Sovereign Deals',
  tabs: [
    { id: 'All', label: 'All' },
    { id: 'awaiting_approval', label: 'Awaiting Approval' },
    { id: 'in_barter', label: 'In Barter' },
    { id: 'settling', label: 'Settling' },
    { id: 'completed', label: 'Completed' },
    { id: 'disputed', label: 'Disputed' },
  ],
  cases: [
    { ref: 'FT-SOV-021', item: 'Strategic Cocoa Reserve', qty: '5,000 MT', party: 'FT-GOV-200', rating: 4.9, status: 'in-progress', step: 2, escrow: '$22,000,000', action: 'Approve Program', tag: 'awaiting_approval' },
    { ref: 'FT-SOV-024', item: 'Lithium Concentrate', qty: '800 MT', party: 'FT-GOV-310', rating: 4.8, status: 'pending', step: 1, escrow: '$14,500,000', action: 'Sign MoU', tag: 'awaiting_approval' },
    { ref: 'FT-SOV-019', item: 'Gold Bullion Swap', qty: '120 KG', party: 'FT-GOV-188', rating: 5.0, status: 'in-progress', step: 2, escrow: '$8,200,000', action: 'View Barter', tag: 'in_barter' },
    { ref: 'FT-SOV-016', item: 'Cotton ↔ Wheat Barter', qty: '2,400 MT', party: 'FT-GOV-205', rating: 4.7, status: 'in-progress', step: 2, escrow: '$4,800,000', action: 'Track Settlement', tag: 'settling' },
    { ref: 'FT-SOV-012', item: 'Crude Oil Allocation', qty: '50,000 BBL', party: 'FT-GOV-118', rating: 4.8, status: 'done', step: 3, escrow: '$3,400,000', action: 'View Receipt', tag: 'completed' },
    { ref: 'FT-SOV-010', item: 'Refined Sugar Swap', qty: '1,200 MT', party: 'FT-GOV-301', rating: 4.2, status: 'disputed', step: 2, escrow: '$1,100,000', action: 'Resolve Dispute', tag: 'disputed' },
  ],
  commodityMix: [
    { name: 'Gold', value: 4200, color: '#D4AF37' },
    { name: 'Lithium', value: 2600, color: '#2563EB' },
    { name: 'Cocoa', value: 2300, color: '#C73B22' },
    { name: 'Cotton', value: 1800, color: '#059669' },
    { name: 'Oil', value: 1500, color: '#1A1A1A' },
  ],
  commodityTitle: 'National Strategic Reserves',
  revenueTitle: 'Program Volume',
  revenueHeadline: '$48M',
  revenueDelta: '+8%',
  revenueSeriesLabel: 'Settled ($)',
  revenueTrend: [
    { week: 'W1', rev: 18000000, vol: 1200 }, { week: 'W2', rev: 22000000, vol: 1400 },
    { week: 'W3', rev: 20000000, vol: 1300 }, { week: 'W4', rev: 26000000, vol: 1700 },
    { week: 'W5', rev: 24000000, vol: 1550 }, { week: 'W6', rev: 30000000, vol: 1950 },
    { week: 'W7', rev: 28000000, vol: 1850 }, { week: 'W8', rev: 36000000, vol: 2300 },
    { week: 'W9', rev: 34000000, vol: 2180 }, { week: 'W10', rev: 40000000, vol: 2550 },
    { week: 'W11', rev: 44000000, vol: 2800 }, { week: 'W12', rev: 48000000, vol: 3050 },
  ],
  ticker: [
    { name: 'Cocoa', price: '$8,420', delta: '+1.2%', up: true },
    { name: 'Coffee', price: '$214.50', delta: '-0.8%', up: false },
    { name: 'Cotton', price: '$88.20', delta: '+0.5%', up: true },
    { name: 'Gold', price: '$2,340', delta: '+2.1%', up: true },
  ],
  rfqsTitle: 'Incoming Sovereign Bids',
  rfqs: [
    { item: 'Strategic Cocoa', qty: '1,500 MT', party: 'FT-GOV-882', age: '1d ago', rating: 4.9 },
    { item: 'Lithium Spot', qty: '200 MT', party: 'FT-GOV-105', age: '2d ago', rating: 4.8 },
    { item: 'Gold Allocation', qty: '50 KG', party: 'FT-GOV-304', age: '3d ago', rating: 4.7 },
  ],
  complianceTitle: 'Sovereign Compliance',
  compliance: [
    { label: 'Cabinet approval', value: 70, color: theme.warning },
    { label: 'AML clearance', value: 95, color: theme.success },
    { label: 'Treaty docs', value: 50, color: theme.primary },
  ],
  logisticsTitle: 'Sovereign Logistics',
  logistics: [
    { route: 'Tema → Hamburg', vessel: 'Hapag Brisbane', progress: 55, eta: 'Oct 18', status: 'In Transit', color: theme.info },
    { route: 'Lagos → Shanghai', vessel: 'COSCO Pride', progress: 22, eta: 'Oct 25', status: 'Loading', color: theme.warning },
  ],
  quickActions: [
    { icon: Building2, label: 'New Program', href: '/sovereign' },
    { icon: Scale, label: 'Initiate Barter', href: '/barter' },
    { icon: Globe, label: 'National Inventory', href: '/inventory' },
    { icon: Handshake, label: 'Trade Finance', href: '/finabridge' },
    { icon: Lock, label: 'Sovereign Escrow', href: '/escrow' },
  ],
};

export default function GovernmentDashboard() {
  return <RoleDashboardShell config={config} />;
}
