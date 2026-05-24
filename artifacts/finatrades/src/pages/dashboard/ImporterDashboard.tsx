import { Store, Send, Package, Lock, Wallet } from 'lucide-react';
import RoleDashboardShell, { dashboardTheme as theme, type RoleDashboardConfig } from './components/RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleLabel: 'Importer / Buyer',
  subtitle: 'Global Buyers DMCC · FT-IMP-02118',
  kpis: [
    { value: 6, max: 10, label: 'Active Orders', subLabel: '6/10 Open', delta: '+1 this week', color: theme.primary },
    { value: 18, max: 0, label: 'Watchlist', subLabel: '18 Listings', delta: '+4 today', color: theme.info },
    { value: 9, max: 0, label: 'Open RFQs', subLabel: '9 Submitted', delta: '+2 today', color: theme.warning },
    { value: 2.8, max: 4.0, label: 'Escrow Funded', subLabel: '$2.8M/$4M Comm', delta: '70%', color: theme.success },
  ],
  tradeHealth: {
    score: 84,
    metrics: [
      { label: 'On-time receipt', value: 91, color: theme.success },
      { label: 'Compliance', value: 93, color: theme.success },
      { label: 'Counterparty rating', value: 92, color: theme.primary },
      { label: 'Doc completeness', value: 82, color: theme.warning },
    ],
  },
  wallet: {
    title: 'Buyer Wallets',
    items: [
      { currency: 'USD', total: 2800000, available: 1100000, locked: 1500000, pending: 200000 },
      { currency: 'EUR', total: 950000, available: 400000, locked: 500000, pending: 50000 },
    ],
    primaryCta: { label: 'Fund escrow', href: '/escrow' },
    secondaryCta: { label: 'Top up wallet', href: '/wallet' },
  },
  casesTitle: 'Active Orders',
  tabs: [
    { id: 'All', label: 'All' },
    { id: 'awaiting_action', label: 'Awaiting Action' },
    { id: 'in_escrow', label: 'In Escrow' },
    { id: 'shipping', label: 'Inbound Shipping' },
    { id: 'completed', label: 'Completed' },
    { id: 'disputed', label: 'Disputed' },
  ],
  cases: [
    { ref: 'FT-ORD-204', item: 'Cocoa Beans (Grade A)', qty: '200 MT', party: 'FT-EXP-082', rating: 4.7, status: 'in-progress', step: 2, escrow: '$450,000', action: 'Approve Docs', tag: 'awaiting_action' },
    { ref: 'FT-ORD-211', item: 'Robusta Coffee', qty: '120 MT', party: 'FT-EXP-091', rating: 4.6, status: 'pending', step: 1, escrow: '$340,000', action: 'Sign Contract', tag: 'awaiting_action' },
    { ref: 'FT-ORD-220', item: 'Refined Gold (99.9%)', qty: '30 KG', party: 'FT-EXP-305', rating: 5.0, status: 'in-progress', step: 2, escrow: '$1,920,000', action: 'View Escrow', tag: 'in_escrow' },
    { ref: 'FT-ORD-225', item: 'Arabica Coffee', qty: '80 MT', party: 'FT-EXP-099', rating: 4.9, status: 'in-progress', step: 2, escrow: '€180,000', action: 'Track Shipment', tag: 'shipping' },
    { ref: 'FT-ORD-188', item: 'Cocoa Butter', qty: '60 MT', party: 'FT-EXP-155', rating: 4.6, status: 'done', step: 3, escrow: '£150,000', action: 'View Receipt', tag: 'completed' },
    { ref: 'FT-ORD-178', item: 'Raw Cotton', qty: '100 MT', party: 'FT-EXP-205', rating: 4.3, status: 'disputed', step: 2, escrow: '$140,000', action: 'Resolve Dispute', tag: 'disputed' },
  ],
  commodityMix: [
    { name: 'Cocoa', value: 380, color: '#C73B22' },
    { name: 'Coffee', value: 290, color: '#D97706' },
    { name: 'Gold', value: 220, color: '#D4AF37' },
    { name: 'Cotton', value: 110, color: '#2563EB' },
  ],
  commodityTitle: 'Purchase Mix',
  revenueTitle: 'Spend & Volume',
  revenueHeadline: '$2.6M',
  revenueDelta: '+9%',
  revenueSeriesLabel: 'Spend ($)',
  revenueTrend: [
    { week: 'W1', rev: 800000, vol: 100 }, { week: 'W2', rev: 950000, vol: 130 },
    { week: 'W3', rev: 900000, vol: 120 }, { week: 'W4', rev: 1300000, vol: 170 },
    { week: 'W5', rev: 1100000, vol: 150 }, { week: 'W6', rev: 1600000, vol: 210 },
    { week: 'W7', rev: 1400000, vol: 190 }, { week: 'W8', rev: 1900000, vol: 240 },
    { week: 'W9', rev: 1750000, vol: 220 }, { week: 'W10', rev: 2150000, vol: 260 },
    { week: 'W11', rev: 2400000, vol: 290 }, { week: 'W12', rev: 2600000, vol: 320 },
  ],
  ticker: [
    { name: 'Cocoa', price: '$8,420', delta: '+1.2%', up: true },
    { name: 'Coffee', price: '$214.50', delta: '-0.8%', up: false },
    { name: 'Cotton', price: '$88.20', delta: '+0.5%', up: true },
    { name: 'Gold', price: '$2,340', delta: '+2.1%', up: true },
  ],
  rfqsTitle: 'My Submitted RFQs',
  rfqs: [
    { item: 'Arabica Coffee', qty: '50 MT', party: 'FT-EXP-882', age: '2h ago', rating: 4.9 },
    { item: 'Cocoa Beans', qty: '120 MT', party: 'FT-EXP-105', age: '5h ago', rating: 4.8 },
    { item: 'Raw Cotton', qty: '80 MT', party: 'FT-EXP-304', age: '1d ago', rating: 4.5 },
  ],
  compliance: [
    { label: 'KYB renewal', value: 90, color: theme.success },
    { label: 'Import licence', value: 60, color: theme.warning },
    { label: 'LC docs', value: 25, color: theme.primary },
  ],
  logistics: [
    { route: 'Rotterdam ← Abidjan', vessel: 'MSC Rachele', progress: 65, eta: 'Oct 12', status: 'In Transit', color: theme.info },
    { route: 'Antwerp ← Tema', vessel: 'CMA CGM Jade', progress: 10, eta: 'Oct 15', status: 'Customs', color: theme.warning },
  ],
  quickActions: [
    { icon: Store, label: 'Browse Marketplace', href: '/marketplace' },
    { icon: Send, label: 'Submit New RFQ', href: '/rfqs/mine' },
    { icon: Package, label: 'Track Orders', href: '/orders/mine' },
    { icon: Lock, label: 'Fund Escrow', href: '/escrow' },
    { icon: Wallet, label: 'Top up Wallet', href: '/wallet' },
  ],
};

export default function ImporterDashboard() {
  return <RoleDashboardShell config={config} />;
}
