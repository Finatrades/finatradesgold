import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, ShieldCheck, FileText, 
  Truck, ArrowRight, ArrowLeftRight, Check, X, Bell,
  ChevronRight, Box, Anchor, CheckCircle2, AlertCircle,
  Activity, DollarSign, Package, FileCode, CheckSquare
} from 'lucide-react';

// --- Types & Mock Data ---

type TradeCase = {
  id: string;
  ref: string;
  commodity: string;
  qty: string;
  counterparty: string;
  rating: number;
  trades: number;
  status: string[];
  amount: string;
  currency: string;
  action: string;
};

type RFQ = {
  id: string;
  commodity: string;
  qty: string;
  hub: string;
  counterparty: string;
  rating: number;
  age: string;
};

const TRADE_CASES: TradeCase[] = [
  { id: '1', ref: 'TC-2026-0341', commodity: 'Cocoa Beans', qty: '240 MT', counterparty: 'FT-IMP-09127', rating: 4.8, trades: 23, status: ['LC Issued', 'Shipment Dispatched'], amount: '1,180,000', currency: '€', action: 'Upload BoL' },
  { id: '2', ref: 'TC-2026-0338', commodity: 'Raw Cotton', qty: '500 MT', counterparty: 'FT-IMP-04822', rating: 4.9, trades: 41, status: ['LC Pending'], amount: '425,000', currency: '$', action: 'Await LC' },
  { id: '3', ref: 'TC-2026-0312', commodity: 'Lithium Ore', qty: '1000 MT', counterparty: 'FT-IMP-11094', rating: 4.5, trades: 8, status: ['Shipment Dispatched', 'Goods Received'], amount: '2,150,000', currency: '$', action: 'Approve Release' },
];

const RFQS: RFQ[] = [
  { id: '1', commodity: 'Coffee (Robusta)', qty: '120 MT', hub: 'Dubai (DMCC)', counterparty: 'FT-IMP-08831', rating: 4.7, age: '2h ago' },
  { id: '2', commodity: 'Gold (Dore)', qty: '50 kg', hub: 'Geneva', counterparty: 'FT-IMP-02199', rating: 5.0, age: '4h ago' },
  { id: '3', commodity: 'Cashew Nuts', qty: '300 MT', hub: 'Rotterdam', counterparty: 'FT-IMP-05542', rating: 4.2, age: '1d ago' },
];

const TICKER_ITEMS = [
  { symbol: 'COCOA', price: '3,420', unit: 'MT', change: '+1.2%', up: true },
  { symbol: 'COTTON', price: '0.74', unit: 'lb', change: '-0.3%', up: false },
  { symbol: 'COFFEE', price: '1.89', unit: 'lb', change: '+0.5%', up: true },
  { symbol: 'GOLD', price: '2,341', unit: 'oz', change: '+0.4%', up: true },
  { symbol: 'LITHIUM', price: '14,200', unit: 'MT', change: '-1.8%', up: false },
];

const WORKFLOW_STEPS = [
  { id: 1, label: 'KYC & Onboarding', status: 'done' },
  { id: 2, label: 'Consignment Setup', status: 'done' },
  { id: 3, label: 'Logistics Booking', status: 'done' },
  { id: 4, label: 'Inventory Verification', status: 'done' },
  { id: 5, label: 'Marketplace Listing', status: 'done' },
  { id: 6, label: 'Order & Payment', status: 'done' },
  { id: 7, label: 'Government Barter', status: 'skipped' },
  { id: 8, label: 'Trade Finance / Escrow', status: 'active' },
  { id: 9, label: 'Settlement & Payout', status: 'pending' },
];

// --- Components ---

const Ticker = () => (
  <div className="bg-[#1A1A1A] text-white flex items-center h-8 text-[11px] font-mono overflow-hidden whitespace-nowrap border-b border-[#E8E2DC]">
    <div className="flex items-center px-3 bg-[#C73B22] font-bold h-full z-10 shrink-0">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2"></span>
      LIVE
    </div>
    <div className="flex items-center space-x-6 px-4 animate-[marquee_30s_linear_infinite]">
      {TICKER_ITEMS.map((item, i) => (
        <div key={i} className="flex items-center space-x-2">
          <span className="text-[#888880]">{item.symbol}</span>
          <span>${item.price}/{item.unit}</span>
          <span className={item.up ? 'text-[#059669]' : 'text-[#C73B22]'}>
            {item.up ? '▲' : '▼'} {item.change}
          </span>
        </div>
      ))}
    </div>
    <style>{`
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `}</style>
  </div>
);

const Card = ({ children, className = '', title, action }: any) => (
  <div className={`bg-white border border-[#E8E2DC] rounded-sm flex flex-col ${className}`}>
    {title && (
      <div className="flex justify-between items-center px-3 py-2 border-b border-[#E8E2DC] bg-[#FAFAF8]">
        <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">{title}</h3>
        {action && <div className="text-xs">{action}</div>}
      </div>
    )}
    <div className="p-3 flex-1 flex flex-col">
      {children}
    </div>
  </div>
);

const Badge = ({ children, variant = 'neutral' }: any) => {
  const variants: any = {
    success: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
    warning: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20',
    danger: 'bg-[#C73B22]/10 text-[#C73B22] border-[#C73B22]/20',
    info: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
    neutral: 'bg-[#FAFAF8] text-[#888880] border-[#E8E2DC]',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded-sm border text-[10px] font-mono uppercase ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'primary', className = '' }: any) => {
  const variants: any = {
    primary: 'bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90',
    secondary: 'bg-white text-[#1A1A1A] border border-[#E8E2DC] hover:bg-[#FAFAF8]',
    accent: 'bg-[#C73B22] text-white hover:bg-[#C73B22]/90',
  };
  return (
    <button className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

export default function InstitutionalTrader() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans text-[#1A1A1A] selection:bg-[#C73B22]/20 flex flex-col">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      `}</style>

      <Ticker />

      <div className="flex-1 w-full max-w-[1280px] mx-auto p-4 flex flex-col gap-4">
        {/* Header */}
        <header className="flex justify-between items-end border-b border-[#E8E2DC] pb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold tracking-tight">Welcome back, Charan</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[#059669]/10 text-[#059669] border border-[#059669]/20 rounded-sm text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck size={12} />
                Corporate KYC Approved
              </span>
            </div>
            <div className="text-sm text-[#888880] flex items-center gap-2 font-mono">
              <span>EXPORTER</span>
              <span>·</span>
              <span>Raminvest Holding DIFC</span>
              <span>·</span>
              <span className="text-[#1A1A1A]">FT-ID FT-EXP-04821</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex items-center gap-2">
              <Bell size={14} />
              <span className="font-mono tabular-nums">3</span>
            </Button>
            <Button variant="accent">New Consignment</Button>
          </div>
        </header>

        {/* Main Grid */}
        <div className="flex gap-4 flex-1 items-start">
          
          {/* Left Rail: Actions & Workflow */}
          <div className="w-56 shrink-0 flex flex-col gap-4 sticky top-4">
            <Card title="Quick Actions">
              <div className="flex flex-col gap-1">
                {[
                  { icon: Package, label: 'Create Consignment' },
                  { icon: Activity, label: 'List on Marketplace' },
                  { icon: ArrowLeftRight, label: 'Submit RFQ Response' },
                  { icon: ShieldCheck, label: 'View Escrow' },
                  { icon: FileCode, label: 'Upload Shipment Doc' },
                ].map((action, i) => (
                  <button key={i} className="flex items-center gap-2 p-2 text-xs text-left hover:bg-[#FAFAF8] rounded-sm transition-colors border border-transparent hover:border-[#E8E2DC]">
                    <action.icon size={14} className="text-[#888880]" />
                    <span className="font-medium text-[#1A1A1A]">{action.label}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Workflow Pipeline">
              <div className="relative pl-3 border-l-2 border-[#E8E2DC] ml-2 mt-1 space-y-4 py-1">
                {WORKFLOW_STEPS.map((step, i) => (
                  <div key={step.id} className="relative">
                    <div className={`absolute -left-[17px] top-0.5 w-2 h-2 rounded-full border-2 bg-[#FAFAF8] ${
                      step.status === 'done' ? 'border-[#059669] bg-[#059669]' : 
                      step.status === 'active' ? 'border-[#C73B22] bg-[#C73B22] shadow-[0_0_0_2px_rgba(199,59,34,0.2)]' : 
                      step.status === 'skipped' ? 'border-[#E8E2DC] bg-[#E8E2DC]' :
                      'border-[#E8E2DC]'
                    }`} />
                    <div className={`text-[11px] font-medium leading-tight ${
                      step.status === 'active' ? 'text-[#1A1A1A] font-bold' : 
                      step.status === 'skipped' ? 'text-[#E8E2DC] line-through' :
                      'text-[#888880]'
                    }`}>
                      {step.label}
                      {step.status === 'active' && <div className="text-[10px] text-[#C73B22] mt-0.5 font-mono uppercase tracking-wider">Current Phase</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Active Consignments', value: '8', unit: 'lots' },
                { label: 'Verified Inventory', value: '1,240', unit: 'MT' },
                { label: 'Open RFQs', value: '12', unit: 'reqs' },
                { label: 'Escrow Locked', value: '$4.2M', unit: 'USD', highlight: true },
              ].map((kpi, i) => (
                <Card key={i} className={kpi.highlight ? 'border-[#1A1A1A] shadow-sm' : ''}>
                  <div className="text-[10px] font-mono text-[#888880] uppercase tracking-wider mb-1">{kpi.label}</div>
                  <div className="flex items-baseline gap-1">
                    <div className="text-2xl font-mono font-bold tracking-tight text-[#1A1A1A] tabular-nums">{kpi.value}</div>
                    <div className="text-xs font-mono text-[#888880]">{kpi.unit}</div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Trade Cases Table */}
            <Card title="Active Trade Cases (Escrow / LC)">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[#E8E2DC] text-[#888880] font-mono uppercase text-[10px]">
                      <th className="pb-2 font-medium">Deal Ref</th>
                      <th className="pb-2 font-medium">Commodity</th>
                      <th className="pb-2 font-medium">Counterparty</th>
                      <th className="pb-2 font-medium">Milestones</th>
                      <th className="pb-2 font-medium text-right">Escrow Amount</th>
                      <th className="pb-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2DC]">
                    {TRADE_CASES.map((tc) => (
                      <tr key={tc.id} className="hover:bg-[#FAFAF8]">
                        <td className="py-2.5 font-mono text-[#1A1A1A]">{tc.ref}</td>
                        <td className="py-2.5">
                          <div className="font-medium text-[#1A1A1A]">{tc.commodity}</div>
                          <div className="text-[10px] font-mono text-[#888880]">{tc.qty}</div>
                        </td>
                        <td className="py-2.5">
                          <div className="font-mono text-[#1A1A1A]">{tc.counterparty}</div>
                          <div className="text-[10px] text-[#888880] flex items-center gap-1">
                            <span className="text-[#D4AF37]">★</span> {tc.rating} · {tc.trades} trades
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {tc.status.map(s => (
                              <Badge key={s} variant={s.includes('Issued') || s.includes('Received') ? 'success' : s.includes('Pending') ? 'warning' : 'info'}>
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-medium text-[#1A1A1A]">
                          {tc.currency}{tc.amount}
                        </td>
                        <td className="py-2.5 text-right">
                          <Button variant="secondary" className="!text-[10px] !py-1 !px-2 uppercase font-mono tracking-wider">{tc.action}</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* RFQs Table */}
            <Card title="Recent Incoming RFQs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[#E8E2DC] text-[#888880] font-mono uppercase text-[10px]">
                      <th className="pb-2 font-medium">Commodity</th>
                      <th className="pb-2 font-medium">Qty</th>
                      <th className="pb-2 font-medium">Target Hub</th>
                      <th className="pb-2 font-medium">Importer</th>
                      <th className="pb-2 font-medium">Age</th>
                      <th className="pb-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2DC]">
                    {RFQS.map((rfq) => (
                      <tr key={rfq.id} className="hover:bg-[#FAFAF8]">
                        <td className="py-2.5 font-medium text-[#1A1A1A]">{rfq.commodity}</td>
                        <td className="py-2.5 font-mono tabular-nums text-[#1A1A1A]">{rfq.qty}</td>
                        <td className="py-2.5 text-[#1A1A1A] flex items-center gap-1">
                          <Anchor size={12} className="text-[#888880]" />
                          {rfq.hub}
                        </td>
                        <td className="py-2.5">
                          <div className="font-mono text-[#1A1A1A]">{rfq.counterparty}</div>
                          <div className="text-[10px] text-[#888880] flex items-center gap-1">
                            <span className="text-[#D4AF37]">★</span> {rfq.rating}
                          </div>
                        </td>
                        <td className="py-2.5 font-mono tabular-nums text-[#888880]">{rfq.age}</td>
                        <td className="py-2.5 text-right space-x-2">
                          <button className="text-[10px] font-mono uppercase tracking-wider text-[#1A1A1A] hover:underline">Counter</button>
                          <Button variant="primary" className="!text-[10px] !py-1 !px-2 uppercase font-mono tracking-wider bg-[#059669] hover:bg-[#059669]/90 border-transparent text-white">Accept</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Bottom Row */}
            <div className="grid grid-cols-3 gap-4">
              
              {/* Wallet */}
              <Card title="Wallet Snapshot" action={<span className="text-[10px] text-[#2563EB] hover:underline cursor-pointer uppercase font-mono tracking-wider font-bold">Open Wallet</span>}>
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[10px] font-mono text-[#888880] uppercase">Available USD</div>
                      <div className="text-xl font-mono font-bold tracking-tight text-[#1A1A1A] tabular-nums">$842,000.00</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-[#888880] uppercase">Locked</div>
                      <div className="text-sm font-mono text-[#888880] tabular-nums">$4,200,000.00</div>
                    </div>
                  </div>
                  <div className="h-px bg-[#E8E2DC] w-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] font-mono text-[#888880] uppercase">EUR Balance</div>
                      <div className="text-sm font-mono text-[#1A1A1A] tabular-nums">€310,000.00</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-[#888880] uppercase">GBP Balance</div>
                      <div className="text-sm font-mono text-[#1A1A1A] tabular-nums">£45,000.00</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Logistics */}
              <Card title="Logistics & Inventory">
                <div className="space-y-3 flex-1 flex flex-col justify-center">
                  {[
                    { vessel: 'MSC Rachele', eta: 'Oct 14', route: 'Abidjan → Antwerp', status: 'In Transit' },
                    { vessel: 'CMA CGM Jade', eta: 'Oct 22', route: 'Lagos → Dubai', status: 'Customs Hold' }
                  ].map((ship, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#FAFAF8] border border-[#E8E2DC] rounded-sm">
                      <div>
                        <div className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1"><Truck size={12}/> {ship.vessel}</div>
                        <div className="text-[10px] font-mono text-[#888880] mt-0.5">{ship.route}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono uppercase text-[#1A1A1A]">ETA {ship.eta}</div>
                        <div className={`text-[10px] font-mono uppercase mt-0.5 ${ship.status === 'In Transit' ? 'text-[#059669]' : 'text-[#C73B22]'}`}>{ship.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Compliance */}
              <Card title="Compliance Inbox" action={<Badge variant="danger">2 Action Req</Badge>}>
                <div className="space-y-2 flex-1 flex flex-col justify-center">
                  {[
                    { doc: 'Phytosanitary Cert', ref: 'CN-554', type: 'Upload Req' },
                    { doc: 'Bill of Lading', ref: 'TC-2026-0339', type: 'Signature Req' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 text-[#C73B22]">
                        <AlertCircle size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#1A1A1A]">{item.doc}</div>
                        <div className="text-[10px] font-mono text-[#888880] mt-0.5">Ref: {item.ref} · {item.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
