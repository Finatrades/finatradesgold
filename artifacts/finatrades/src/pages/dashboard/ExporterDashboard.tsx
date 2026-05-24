import { Plus, List, Send, Lock, FileCheck } from 'lucide-react';
import RoleDashboardShell, { dashboardTheme as theme, type RoleDashboardConfig } from './components/RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleLabel: 'Exporter / Seller',
  subtitle: 'Raminvest Holding DIFC · FT-EXP-04821',
  kpis: [
    { value: 8, max: 12, label: 'Consignments', subLabel: '8/12 Active', delta: '+2 this week', color: theme.primary },
    { value: 1240, max: 2000, label: 'Verified Inventory', subLabel: '1,240/2k MT', delta: '62%', color: theme.info },
    { value: 12, max: 0, label: 'Open RFQs', subLabel: '12 Active', delta: '+3 today', color: theme.warning },
    { value: 4.2, max: 6.0, label: 'Escrow Locked', subLabel: '$4.2M/$6M Comm', delta: '70%', color: theme.success },
  ],
  tradeHealth: {
    score: 87,
    metrics: [
      { label: 'On-time delivery', value: 92, color: theme.success },
      { label: 'Compliance', value: 95, color: theme.success },
      { label: 'Counterparty rating', value: 94, color: theme.primary },
      { label: 'Doc completeness', value: 78, color: theme.warning },
    ],
  },
  wallet: {
    title: 'Treasury Wallets',
    items: [
      { currency: 'USD', total: 4200500, available: 1200000, locked: 2800000, pending: 200500 },
      { currency: 'EUR', total: 1850000, available: 850000, locked: 900000, pending: 100000 },
    ],
    primaryCta: { label: 'Open wallet', href: '/wallet' },
    secondaryCta: { label: 'View FX rates', href: '/wallet' },
  },
  tabs: [
    { id: 'All', label: 'All' },
    { id: 'awaiting_action', label: 'Awaiting Action' },
    { id: 'in_escrow', label: 'In Escrow' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'completed', label: 'Completed' },
    { id: 'disputed', label: 'Disputed' },
  ],
  cases: [
    { ref: 'FT-TRD-082', item: 'Cocoa Beans (Grade A)', qty: '200 MT', party: 'FT-IMP-104', rating: 4.8, status: 'in-progress', step: 2, escrow: '$450,000', action: 'Approve Doc', tag: 'awaiting_action' },
    { ref: 'FT-TRD-091', item: 'Raw Cotton', qty: '150 MT', party: 'FT-IMP-201', rating: 4.5, status: 'pending', step: 1, escrow: '$210,000', action: 'Sign Contract', tag: 'awaiting_action' },
    { ref: 'FT-TRD-103', item: 'Arabica Coffee', qty: '80 MT', party: 'FT-IMP-099', rating: 4.9, status: 'in-progress', step: 2, escrow: '€180,000', action: 'View Escrow', tag: 'in_escrow' },
    { ref: 'FT-TRD-108', item: 'Refined Gold (99.9%)', qty: '50 KG', party: 'FT-IMP-305', rating: 5.0, status: 'in-progress', step: 2, escrow: '$3,200,000', action: 'Track Shipment', tag: 'shipping' },
    { ref: 'FT-TRD-112', item: 'Robusta Coffee', qty: '120 MT', party: 'FT-IMP-112', rating: 4.7, status: 'done', step: 3, escrow: '$340,000', action: 'View Receipt', tag: 'completed' },
    { ref: 'FT-TRD-115', item: 'Cocoa Butter', qty: '60 MT', party: 'FT-IMP-155', rating: 4.6, status: 'done', step: 3, escrow: '£150,000', action: 'View Receipt', tag: 'completed' },
    { ref: 'FT-TRD-095', item: 'Raw Cotton', qty: '300 MT', party: 'FT-IMP-205', rating: 4.3, status: 'disputed', step: 2, escrow: '$420,000', action: 'Resolve Dispute', tag: 'disputed' },
    { ref: 'FT-TRD-118', item: 'Arabica Coffee', qty: '40 MT', party: 'FT-IMP-088', rating: 4.8, status: 'pending', step: 1, escrow: '€90,000', action: 'Upload BoL', tag: 'awaiting_action' },
  ],
  commodityMix: [
    { name: 'Cocoa', value: 450, color: '#C73B22' },
    { name: 'Coffee', value: 380, color: '#D97706' },
    { name: 'Cotton', value: 260, color: '#2563EB' },
    { name: 'Gold', value: 150, color: '#D4AF37' },
  ],
  revenueTrend: [
    { week: 'W1', rev: 1200000, vol: 150 }, { week: 'W2', rev: 1400000, vol: 180 },
    { week: 'W3', rev: 1100000, vol: 140 }, { week: 'W4', rev: 1800000, vol: 210 },
    { week: 'W5', rev: 1500000, vol: 190 }, { week: 'W6', rev: 2100000, vol: 260 },
    { week: 'W7', rev: 1900000, vol: 240 }, { week: 'W8', rev: 2500000, vol: 300 },
    { week: 'W9', rev: 2300000, vol: 280 }, { week: 'W10', rev: 2800000, vol: 330 },
    { week: 'W11', rev: 3100000, vol: 370 }, { week: 'W12', rev: 3400000, vol: 410 },
  ],
  revenueHeadline: '$3.4M',
  revenueDelta: '+12%',
  ticker: [
    { name: 'Cocoa', price: '$8,420', delta: '+1.2%', up: true },
    { name: 'Coffee', price: '$214.50', delta: '-0.8%', up: false },
    { name: 'Cotton', price: '$88.20', delta: '+0.5%', up: true },
    { name: 'Gold', price: '$2,340', delta: '+2.1%', up: true },
  ],
  rfqs: [
    { item: 'Arabica Coffee', qty: '50 MT', party: 'FT-IMP-882', age: '2h ago', rating: 4.9 },
    { item: 'Cocoa Beans', qty: '120 MT', party: 'FT-IMP-105', age: '5h ago', rating: 4.8 },
    { item: 'Raw Cotton', qty: '80 MT', party: 'FT-IMP-304', age: '1d ago', rating: 4.5 },
  ],
  compliance: [
    { label: 'KYB renewal', value: 80, color: theme.warning },
    { label: 'Phyto cert', value: 40, color: theme.primary },
    { label: 'BoL upload', value: 0, color: '#888880' },
  ],
  logistics: [
    { route: 'Abidjan → Rotterdam', vessel: 'MSC Rachele', progress: 65, eta: 'Oct 12', status: 'In Transit', color: theme.info },
    { route: 'Tema → Antwerp', vessel: 'CMA CGM Jade', progress: 10, eta: 'Oct 15', status: 'Customs', color: theme.warning },
  ],
  quickActions: [
    { icon: Plus, label: 'Create Consignment', href: '/consignments' },
    { icon: List, label: 'List on Marketplace', href: '/marketplace' },
    { icon: Send, label: 'Submit RFQ Response', href: '/rfqs/incoming' },
    { icon: Lock, label: 'View Escrow', href: '/escrow' },
    { icon: FileCheck, label: 'Upload Shipment Doc', href: '/inventory' },
  ],
};

export default function ExporterDashboard() {
  return <RoleDashboardShell config={config} />;
}
