import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  LineChart,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  TrendingUp,
  Vault,
  Wallet,
} from "lucide-react";

const KPI_METRICS = [
  { label: "Gold Balance", value: "33.2g", icon: Vault, color: "text-amber-500" },
  { label: "Value (USD)", value: "$5,442.92", icon: Banknote, color: "text-emerald-500" },
  { label: "Value (AED)", value: "Dh 19,975.52", icon: Banknote, color: "text-emerald-500" },
  { label: "Card Wallet", value: "66g ≈$10,812", icon: CreditCard, color: "text-blue-500" },
  { label: "BNSL Invested", value: "15.5g", icon: Briefcase, color: "text-purple-500" },
  { label: "Total Profit", value: "+$342.50", icon: TrendingUp, color: "text-emerald-600" },
];

const TRANSACTIONS = [
  { title: "Buy Gold", amount: "+2.5g", status: "Completed", type: "buy", date: "Today, 10:24 AM" },
  { title: "Send Payment", amount: "-1.0g", status: "Completed", type: "send", date: "Yesterday, 14:30 PM" },
  { title: "BNSL Lock", amount: "-5.0g", status: "Active", type: "lock", date: "Oct 12, 09:15 AM" },
  { title: "Deposit", amount: "+10.0g", status: "Pending", type: "deposit", date: "Oct 10, 11:00 AM" },
  { title: "Receive", amount: "+0.5g", status: "Completed", type: "receive", date: "Oct 08, 16:45 PM" },
];

const CERTIFICATES = [
  { title: "Digital Storage", weight: "5g", id: "CERT-9921", date: "2024-10-15" },
  { title: "Physical Storage", weight: "10g", id: "CERT-8834", date: "2024-09-22" },
  { title: "Transfer", weight: "2.5g", id: "CERT-7712", date: "2024-08-11" },
];

const QUICK_ACTIONS = [
  { label: "Add Fund", icon: Plus },
  { label: "Buy Gold", icon: Banknote },
  { label: "Deposit", icon: Vault },
  { label: "Send", icon: Send },
  { label: "Request", icon: ArrowDownRight },
  { label: "BNSL", icon: Briefcase },
];

export const CompactDense = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* TOP BAR */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 h-12 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="font-semibold text-sm">
            Welcome, <span className="text-purple-700">Prashant</span>
          </div>
          <div className="h-4 w-px bg-slate-300"></div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="text-slate-500">Gold Live:</span>
            <span className="text-emerald-600 flex items-center">
              $163.82/g <TrendingUp className="w-3 h-3 ml-1" />
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-600">$5,095.22/oz</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] h-6 px-2 bg-purple-50 text-purple-700 border-purple-200">
            ID: FT-A1B2C3D4
          </Badge>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:text-purple-600 hover:bg-purple-50">
              <RefreshCcw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:text-purple-600 hover:bg-purple-50">
              <ShieldCheck className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 p-3 overflow-hidden">
        <div className="grid grid-cols-4 gap-3 h-full max-h-[calc(100vh-100px)]">
          
          {/* COLUMN 1: KPIs */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
            {KPI_METRICS.map((kpi, i) => (
              <Card key={i} className="shadow-none border-slate-200 h-[68px] shrink-0 hover:border-purple-300 transition-colors cursor-pointer">
                <CardContent className="p-3 flex items-center gap-3 h-full">
                  <div className={`p-2 rounded-md bg-slate-100 ${kpi.color}`}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate">{kpi.label}</span>
                    <span className="text-sm font-bold text-slate-800 truncate">{kpi.value}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* COLUMN 2: Metal Card & Certificates */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
            {/* Metal Card */}
            <div className="relative w-full aspect-[1.586/1] rounded-xl overflow-hidden shadow-md shrink-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 border border-slate-700">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                <span className="text-amber-400 font-bold text-[10px] tracking-widest">FINAGOLD</span>
                <span className="text-slate-300 text-[8px] border border-slate-600 px-1 rounded">METAL</span>
              </div>
              <div className="absolute top-10 left-3 z-10">
                <div className="w-8 h-6 bg-amber-200/80 rounded border border-amber-400/50"></div>
              </div>
              <div className="absolute bottom-6 left-3 z-10 w-full">
                <div className="text-slate-200 font-mono text-sm tracking-widest mb-1">
                  4532 •••• •••• 0001
                </div>
                <div className="flex justify-between items-end pr-6">
                  <div className="text-slate-400 text-[10px] font-medium uppercase">
                    Prashant
                  </div>
                  <div className="text-slate-400 text-[8px] font-mono">
                    12/28
                  </div>
                </div>
              </div>
            </div>

            {/* Certificates */}
            <Card className="shadow-none border-slate-200 flex-1 flex flex-col min-h-0">
              <CardHeader className="p-3 pb-2 border-b border-slate-100 shrink-0">
                <CardTitle className="text-xs font-bold flex justify-between items-center text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Vault Certificates
                  </div>
                  <Badge variant="secondary" className="text-[9px] px-1 h-4">3 active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-slate-100">
                  {CERTIFICATES.map((cert, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0">
                          <Vault className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-slate-700 truncate">{cert.title}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{cert.id}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-bold text-amber-600">{cert.weight}</span>
                        <span className="text-[9px] text-slate-400">{cert.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLUMN 3: Transactions */}
          <Card className="shadow-none border-slate-200 flex flex-col h-full min-h-0">
            <CardHeader className="p-3 pb-2 border-b border-slate-100 shrink-0">
              <CardTitle className="text-xs font-bold flex justify-between items-center text-slate-700">
                <div className="flex items-center gap-1.5">
                  <LineChart className="w-3.5 h-3.5 text-slate-500" />
                  Recent Ledger
                </div>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 text-purple-600 hover:bg-purple-50">View All</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto custom-scrollbar">
              <div className="divide-y divide-slate-100">
                {TRANSACTIONS.map((tx, i) => (
                  <div key={i} className="p-2.5 flex items-center gap-2.5 hover:bg-slate-50 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'buy' ? 'bg-emerald-100 text-emerald-600' :
                      tx.type === 'send' ? 'bg-red-100 text-red-600' :
                      tx.type === 'receive' ? 'bg-blue-100 text-blue-600' :
                      tx.type === 'lock' ? 'bg-purple-100 text-purple-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {tx.type === 'buy' || tx.type === 'receive' || tx.type === 'deposit' ? <ArrowDownRight className="w-3.5 h-3.5" /> : 
                       tx.type === 'send' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xs font-semibold text-slate-700 truncate">{tx.title}</span>
                        <span className={`text-xs font-bold shrink-0 ${
                          tx.amount.startsWith('+') ? 'text-emerald-600' : 'text-slate-700'
                        }`}>{tx.amount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-400">{tx.date}</span>
                        <span className={`text-[9px] font-medium ${
                          tx.status === 'Completed' ? 'text-emerald-500' :
                          tx.status === 'Pending' ? 'text-amber-500' : 'text-purple-500'
                        }`}>{tx.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* COLUMN 4: Wallet Cards */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
            {/* FinaPay Wallet */}
            <Card className="shadow-none border-slate-200 bg-gradient-to-br from-white to-slate-50 shrink-0 border-l-2 border-l-blue-500">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-700">FinaPay</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">12 txs</Badge>
                </div>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500">Available Balance</span>
                    <span className="text-lg font-black text-slate-800 tracking-tight">23.2<span className="text-sm font-semibold text-slate-500 ml-0.5">g</span></span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    Pending: <span className="font-medium text-amber-600">5g</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BNSL Wallet */}
            <Card className="shadow-none border-slate-200 bg-gradient-to-br from-purple-50 to-white shrink-0 border-l-2 border-l-purple-500">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-900">BNSL Plans</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-purple-100 text-purple-800 border-purple-200">3 active</Badge>
                </div>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-purple-600/70">Locked Gold</span>
                    <span className="text-lg font-black text-purple-950 tracking-tight">15.5<span className="text-sm font-semibold text-purple-700 ml-0.5">g</span></span>
                  </div>
                  <Button variant="link" className="h-auto p-0 text-[10px] text-purple-600 h-5">Manage <ChevronRight className="w-3 h-3 ml-0.5" /></Button>
                </div>
              </CardContent>
            </Card>

            {/* FinaBridge Wallet */}
            <Card className="shadow-none border-slate-200 bg-gradient-to-br from-slate-50 to-white shrink-0 border-l-2 border-l-slate-700">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-800">FinaBridge</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-slate-100 text-slate-700 border-slate-200">2 cases</Badge>
                </div>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500">Committed</span>
                    <span className="text-lg font-black text-slate-800 tracking-tight">8.2<span className="text-sm font-semibold text-slate-500 ml-0.5">g</span></span>
                  </div>
                  <Button variant="link" className="h-auto p-0 text-[10px] text-slate-600 h-5">Review <ChevronRight className="w-3 h-3 ml-0.5" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>

      {/* BOTTOM STRIP: Quick Actions */}
      <footer className="bg-white border-t border-slate-200 p-2 shrink-0">
        <div className="flex gap-2 justify-center max-w-4xl mx-auto">
          {QUICK_ACTIONS.map((action, i) => (
            <Button 
              key={i} 
              variant="outline" 
              className="h-8 text-xs font-semibold px-4 rounded-md border-slate-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-colors flex-1 max-w-[140px]"
            >
              <action.icon className="w-3.5 h-3.5 mr-1.5" />
              {action.label}
            </Button>
          ))}
        </div>
      </footer>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
};

export default CompactDense;