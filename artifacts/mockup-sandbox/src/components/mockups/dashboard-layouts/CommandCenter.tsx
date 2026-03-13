import React from "react";
import { 
  Plus, 
  ArrowRightLeft, 
  Download, 
  Send, 
  DownloadCloud, 
  Landmark, 
  CreditCard,
  TrendingUp,
  Award,
  ShieldCheck,
  FileText,
  Clock,
  ChevronRight,
  User,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CommandCenter() {
  const user = {
    userName: "Prashant",
    finatradesId: "FT-A1B2C3D4"
  };

  const market = {
    goldPriceGram: 163.82,
    goldPriceOz: 5095.22,
    trend: "+1.2%"
  };

  const kpis = [
    { label: "Gold Balance", value: "33.2g", subtext: "Total holdings" },
    { label: "Gold Value USD", value: "$5,442.92", subtext: "Current market rate" },
    { label: "Gold Value AED", value: "Dh 19,975.52", subtext: "Current market rate" },
    { label: "Card Wallet", value: "66g", subtext: "≈ $10,812.12" },
    { label: "BNSL Invested", value: "15.5g", subtext: "Locked" },
    { label: "Total Profit", value: "+$342.50", subtext: "All time", positive: true }
  ];

  const quickActions = [
    { icon: <Plus size={20} />, label: "Add Fund" },
    { icon: <Landmark size={20} />, label: "Buy Gold Bar" },
    { icon: <Download size={20} />, label: "Deposit Gold" },
    { icon: <Send size={20} />, label: "Send Payment" },
    { icon: <DownloadCloud size={20} />, label: "Request Payment" },
    { icon: <TrendingUp size={20} />, label: "BNSL" }
  ];

  const transactions = [
    { id: 1, type: "Buy Gold", amount: "2.5g", date: "Today, 10:45 AM", status: "Completed", icon: <Landmark className="text-purple-500" /> },
    { id: 2, type: "Send Payment", amount: "1.0g", date: "Yesterday", status: "Completed", icon: <Send className="text-blue-500" /> },
    { id: 3, type: "BNSL Lock", amount: "5.0g", date: "Oct 12, 2023", status: "Active", icon: <TrendingUp className="text-fuchsia-500" /> },
    { id: 4, type: "Deposit", amount: "10.0g", date: "Oct 10, 2023", status: "Completed", icon: <Download className="text-green-500" /> },
    { id: 5, type: "Receive", amount: "0.5g", date: "Oct 05, 2023", status: "Completed", icon: <DownloadCloud className="text-teal-500" /> }
  ];

  const walletCards = [
    { name: "FinaPay Wallet", amount: "23.2g", details: "Pending 5g • 12 transactions", color: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
    { name: "BNSL Plans", amount: "15.5g", details: "Locked • 3 active plans", color: "bg-fuchsia-100 dark:bg-fuchsia-900/30", text: "text-fuchsia-700 dark:text-fuchsia-300" },
    { name: "FinaBridge", amount: "8.2g", details: "2 active cases", color: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" }
  ];

  const certificates = [
    { name: "Digital Storage", amount: "5g", id: "CERT-98234-A", status: "Verified" },
    { name: "Physical Storage", amount: "10g", id: "CERT-11234-B", status: "Verified" },
    { name: "Transfer", amount: "2.5g", id: "CERT-44567-C", status: "Pending" }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* LEFT SIDEBAR - The "Command Center" Panel */}
      <aside className="w-80 flex-shrink-0 bg-slate-900 text-white flex flex-col shadow-xl z-10 hidden md:flex h-screen sticky top-0">
        
        {/* User Profile Area */}
        <div className="p-6 border-b border-white/10 flex items-center gap-4 bg-slate-950">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center text-lg font-bold shadow-lg shadow-purple-500/20">
            {user.userName.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{user.userName}</h2>
            <p className="text-sm text-slate-400 font-mono flex items-center gap-1">
              <ShieldCheck size={14} className="text-purple-400" />
              {user.finatradesId}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          
          {/* Metal Card Integration */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Finagold Card</h3>
            <div className="relative aspect-[1.586/1] w-full rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700 p-5 flex flex-col justify-between shadow-2xl overflow-hidden group">
              {/* Card texture/shine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <span className="text-sm font-bold tracking-widest text-slate-300">FINAGOLD</span>
                <CreditCard className="text-slate-500" size={24} />
              </div>
              
              <div className="relative z-10 space-y-4">
                <div className="text-xl font-mono tracking-widest text-slate-200">
                  4532 •••• •••• 0001
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-mono uppercase">
                  <span>{user.userName}</span>
                  <span>12/28</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Metrics List */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Command Metrics</h3>
            <div className="space-y-3">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-default group">
                  <div>
                    <p className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors">{kpi.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{kpi.subtext}</p>
                  </div>
                  <div className={`text-right font-mono font-medium ${kpi.positive ? 'text-emerald-400' : 'text-white'}`}>
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {/* Live Market Price Footer */}
        <div className="p-6 border-t border-white/10 bg-slate-950">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Activity size={12} className="text-purple-500" /> Live Gold
            </span>
            <span className="text-xs font-bold text-emerald-400">{market.trend}</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <span className="text-2xl font-bold">${market.goldPriceGram}</span>
              <span className="text-sm text-slate-500 ml-1">/g</span>
            </div>
            <div className="text-sm text-slate-400">
              ${market.goldPriceOz} /oz
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        
        {/* Header Strip */}
        <header className="px-8 py-8 lg:py-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm backdrop-blur-xl bg-white/80 dark:bg-slate-900/80">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back, {user.userName}
              </h1>
              <p className="text-slate-500 mt-1 flex items-center gap-2">
                Your portfolio is looking strong today. Let's make some moves.
              </p>
            </div>
            
            {/* Quick Actions Strip */}
            <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {quickActions.map((action, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 group min-w-[64px]">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="w-12 h-12 rounded-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 shadow-sm transition-all group-hover:scale-105"
                  >
                    {action.icon}
                  </Button>
                  <span className="text-[10px] font-medium text-slate-500 text-center uppercase tracking-wider">{action.label}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Dashboard Content Grid */}
        <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Transactions (Takes up 2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={18} className="text-slate-400" />
                  Recent Activity
                </h2>
                <Button variant="ghost" size="sm" className="text-purple-600 font-medium">View All <ChevronRight size={16} /></Button>
              </div>
              
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {tx.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{tx.type}</p>
                          <p className="text-xs text-slate-500">{tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{tx.amount}</p>
                        <Badge variant="secondary" className="mt-1 text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium border-0">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

            </div>

            {/* Right Column: Wallet Cards Stacks */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Landmark size={18} className="text-slate-400" />
                  Assets Overview
                </h2>
              </div>
              
              <div className="space-y-4">
                {walletCards.map((wallet, idx) => (
                  <Card key={idx} className={`border-0 shadow-sm ${wallet.color} overflow-hidden relative group cursor-pointer`}>
                    <div className="absolute inset-0 bg-white/40 dark:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <CardContent className="p-5 flex flex-col gap-2 relative z-10">
                      <div className="flex justify-between items-start">
                        <span className={`text-sm font-bold ${wallet.text}`}>{wallet.name}</span>
                        <ArrowRightLeft size={16} className={`opacity-50 ${wallet.text}`} />
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {wallet.amount}
                      </div>
                      <p className={`text-xs font-medium ${wallet.text} opacity-80`}>
                        {wallet.details}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Row: Certificates */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Award size={18} className="text-slate-400" />
                Certificates & Vault
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert, idx) => (
                <Card key={idx} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow hover:border-purple-200 cursor-pointer group">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 flex-shrink-0 group-hover:scale-110 transition-transform">
                      <FileText size={24} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{cert.name}</p>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cert.status === 'Verified' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
                          {cert.status}
                        </Badge>
                      </div>
                      <p className="text-lg font-black text-slate-700 dark:text-slate-300 mt-1">{cert.amount}</p>
                      <p className="text-xs text-slate-400 font-mono mt-2 truncate">{cert.id}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
