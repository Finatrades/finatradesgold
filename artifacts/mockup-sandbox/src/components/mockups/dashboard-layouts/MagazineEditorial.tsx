import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  CreditCard,
  Plus,
  Send,
  Download,
  Lock,
  Briefcase,
  TrendingUp,
  Award,
  CircleDollarSign,
  Activity,
  FileText
} from "lucide-react";

export function MagazineEditorial() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* FULL-WIDTH HERO BANNER */}
      <div className="relative bg-gradient-to-br from-purple-800 via-fuchsia-700 to-purple-900 pt-16 pb-28 px-6 sm:px-12 text-white overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-fuchsia-500 rounded-full blur-[120px] opacity-40"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[30rem] h-[30rem] bg-purple-500 rounded-full blur-[140px] opacity-30"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="space-y-6 max-w-2xl">
            <div>
              <p className="text-fuchsia-200 font-medium tracking-wide uppercase text-sm mb-1">
                Portfolio Overview
              </p>
              <h1 className="text-4xl md:text-6xl font-serif font-light tracking-tight text-white mb-2">
                Welcome back, <span className="font-semibold">Prashant</span>
              </h1>
              <p className="text-purple-200 text-sm font-mono">FT-A1B2C3D4</p>
            </div>

            <div className="pt-4">
              <p className="text-purple-200 text-sm mb-1">Total Gold Balance</p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl md:text-7xl font-bold tracking-tighter">
                  33.2<span className="text-3xl md:text-4xl text-purple-300">g</span>
                </span>
                <span className="text-xl md:text-2xl text-fuchsia-200 font-light">
                  ≈ $5,442.92
                </span>
              </div>
              <div className="flex gap-4 mt-4 text-sm font-medium">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Shield className="w-4 h-4 text-fuchsia-300" />
                  <span>Vault: 10g</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Wallet className="w-4 h-4 text-fuchsia-300" />
                  <span>Wallet: 23.2g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metal Card Overlapping */}
          <div className="mt-12 md:mt-0 relative md:absolute md:right-0 md:top-8 w-full md:w-[380px] h-[240px] perspective-1000 z-20 md:translate-y-4">
            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-black p-6 flex flex-col justify-between shadow-2xl shadow-purple-900/50 border border-slate-700/50 transform rotate-1 md:-rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex justify-between items-start">
                <span className="text-xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-500">
                  FINAGOLD
                </span>
                <Activity className="text-amber-400/50 w-6 h-6" />
              </div>
              <div className="space-y-4">
                <div className="text-slate-400 font-mono text-sm tracking-[0.2em]">CARD NUMBER</div>
                <div className="text-2xl font-mono tracking-widest text-slate-100">
                  4532 •••• •••• 0001
                </div>
              </div>
              <div className="flex justify-between items-end text-slate-300 font-mono text-sm uppercase">
                <div>
                  <div className="text-slate-500 text-xs mb-1">Card Holder</div>
                  <div className="font-semibold">Prashant</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-1 text-right">Expires</div>
                  <div className="font-semibold">12/28</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gold Price Ticker */}
        <div className="absolute bottom-0 left-0 w-full bg-black/20 backdrop-blur-md border-t border-white/10 py-3 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap items-center text-sm font-medium text-purple-100">
            <span className="mx-4 flex items-center gap-2">
              <span className="text-amber-400">●</span> GOLD LIVE
            </span>
            <span className="mx-4 font-mono">$163.82 / gram</span>
            <span className="mx-4 text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +1.2%
            </span>
            <span className="mx-4 font-mono">$5,095.22 / oz</span>
            <span className="mx-4 text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +1.2%
            </span>
            
            {/* Duplicated for infinite scroll effect */}
            <span className="mx-4 flex items-center gap-2 ml-12">
              <span className="text-amber-400">●</span> GOLD LIVE
            </span>
            <span className="mx-4 font-mono">$163.82 / gram</span>
            <span className="mx-4 text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +1.2%
            </span>
            <span className="mx-4 font-mono">$5,095.22 / oz</span>
            <span className="mx-4 text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +1.2%
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-12 -mt-8 relative z-30 pb-20">
        
        {/* QUICK ACTIONS ROW */}
        <div className="flex flex-nowrap overflow-x-auto pb-4 gap-3 no-scrollbar mb-10">
          <Button variant="default" className="rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 px-6 shrink-0 h-14">
            <Plus className="w-5 h-5 mr-2" />
            Add Fund
          </Button>
          <Button variant="outline" className="rounded-full bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm px-6 shrink-0 h-14 font-medium text-slate-700">
            <Award className="w-5 h-5 mr-2 text-amber-500" />
            Buy Gold Bar
          </Button>
          <Button variant="outline" className="rounded-full bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm px-6 shrink-0 h-14 font-medium text-slate-700">
            <Download className="w-5 h-5 mr-2 text-purple-600" />
            Deposit Gold
          </Button>
          <Button variant="outline" className="rounded-full bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm px-6 shrink-0 h-14 font-medium text-slate-700">
            <Send className="w-5 h-5 mr-2 text-blue-600" />
            Send Payment
          </Button>
          <Button variant="outline" className="rounded-full bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm px-6 shrink-0 h-14 font-medium text-slate-700">
            <ArrowDownLeft className="w-5 h-5 mr-2 text-emerald-600" />
            Request Payment
          </Button>
          <Button variant="outline" className="rounded-full bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm px-6 shrink-0 h-14 font-medium text-slate-700">
            <Lock className="w-5 h-5 mr-2 text-fuchsia-600" />
            BNSL
          </Button>
        </div>

        {/* ASYMMETRIC BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-min gap-6">
          
          {/* TALL NARROW CELL (KPIs) - Spans 1 col, 2 rows (on desktop) */}
          <div className="md:col-span-1 md:row-span-2 space-y-6">
            <div className="sticky top-6">
              <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4 pl-2 border-l-2 border-fuchsia-500">
                Key Metrics
              </h2>
              <Card className="bg-white border-none shadow-sm rounded-3xl overflow-hidden">
                <div className="p-6 space-y-8">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-purple-500" /> Gold Balance
                    </p>
                    <p className="text-2xl font-bold text-slate-900">33.2g</p>
                  </div>
                  
                  <Separator className="bg-slate-100" />
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <CircleDollarSign className="w-4 h-4 text-emerald-500" /> Value USD
                    </p>
                    <p className="text-2xl font-bold text-slate-900">$5,442.92</p>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <CircleDollarSign className="w-4 h-4 text-blue-500" /> Value AED
                    </p>
                    <p className="text-2xl font-bold text-slate-900">Dh 19,975.52</p>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-500" /> Card Wallet
                    </p>
                    <p className="text-2xl font-bold text-slate-900">66.0g</p>
                    <p className="text-xs text-slate-400 font-mono">≈ $10,812.12</p>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-fuchsia-500" /> BNSL Invested
                    </p>
                    <p className="text-2xl font-bold text-slate-900">15.5g</p>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> Total Profit
                    </p>
                    <p className="text-2xl font-bold text-emerald-600">+$342.50</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* LARGE CELL (Transactions) - Spans 2 cols */}
          <Card className="md:col-span-2 bg-white border-none shadow-sm rounded-3xl p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-serif font-medium text-slate-900">Recent Activity</h3>
                <p className="text-sm text-slate-500 mt-1">Latest movements across your portfolio</p>
              </div>
              <Button variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-full">
                View All <ArrowRightLeft className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="space-y-6">
              {[
                { title: "Buy Gold Bar", date: "Today, 10:42 AM", amount: "2.5g", value: "-$409.55", type: "buy", icon: Award, color: "bg-amber-100 text-amber-600" },
                { title: "Send Payment", date: "Yesterday, 3:15 PM", amount: "1.0g", value: "-$163.82", type: "send", icon: Send, color: "bg-blue-100 text-blue-600" },
                { title: "BNSL Lock", date: "Oct 24, 09:00 AM", amount: "5.0g", value: "Locked", type: "lock", icon: Lock, color: "bg-fuchsia-100 text-fuchsia-600" },
                { title: "Deposit", date: "Oct 20, 11:30 AM", amount: "10.0g", value: "+$1,638.20", type: "deposit", icon: Download, color: "bg-emerald-100 text-emerald-600" },
                { title: "Receive", date: "Oct 18, 02:45 PM", amount: "0.5g", value: "+$81.91", type: "receive", icon: ArrowDownLeft, color: "bg-purple-100 text-purple-600" },
              ].map((tx, i) => (
                <div key={i} className="group flex items-center justify-between p-2 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.color}`}>
                      <tx.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">{tx.title}</p>
                      <p className="text-sm text-slate-500 font-mono">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'deposit' || tx.type === 'receive' ? 'text-emerald-600' : tx.type === 'lock' ? 'text-slate-600' : 'text-slate-900'}`}>
                      {tx.amount}
                    </p>
                    <p className="text-sm text-slate-500 font-mono">{tx.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* MEDIUM CELL: FinaPay Wallet */}
          <Card className="md:col-span-1 bg-gradient-to-br from-purple-50 to-white border border-purple-100 shadow-sm rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-purple-50 text-purple-600">
                <Wallet className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="bg-white/50 border-purple-200 text-purple-700 rounded-full font-mono">
                12 TXs
              </Badge>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-lg font-serif font-medium text-slate-800 mb-1">FinaPay Wallet</h3>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-2">23.2g</p>
              
              <div className="flex items-center gap-2 mt-4 text-sm bg-amber-50 text-amber-700 px-3 py-2 rounded-xl border border-amber-100">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                5g pending clearance
              </div>
            </div>
          </Card>

          {/* MEDIUM CELL: BNSL Wallet */}
          <Card className="md:col-span-1 bg-gradient-to-br from-fuchsia-50 to-white border border-fuchsia-100 shadow-sm rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-200 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-fuchsia-50 text-fuchsia-600">
                <Lock className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="bg-white/50 border-fuchsia-200 text-fuchsia-700 rounded-full font-mono">
                3 Plans
              </Badge>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-lg font-serif font-medium text-slate-800 mb-1">BNSL Locked</h3>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-2">15.5g</p>
              <p className="text-sm text-slate-500">Earning up to 5% APY</p>
            </div>
          </Card>

          {/* SMALL CELL: Certificates */}
          <Card className="md:col-span-1 bg-white border-none shadow-sm rounded-3xl p-6 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-slate-900">Certificates</h3>
                <p className="text-sm text-slate-500">3 active docs</p>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Physical</span>
                <span className="font-semibold text-slate-900 font-mono">10g</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Digital</span>
                <span className="font-semibold text-slate-900 font-mono">5g</span>
              </div>
            </div>
          </Card>

          {/* SMALL CELL: FinaBridge */}
          <Card className="md:col-span-1 bg-white border-none shadow-sm rounded-3xl p-6 flex flex-col justify-center">
             <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-slate-50 rounded-2xl text-blue-600">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-slate-900">FinaBridge</h3>
                <p className="text-sm text-slate-500">Trade Finance</p>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
               <span className="text-3xl font-bold text-slate-900 tracking-tight">8.2g</span>
               <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">2 cases</span>
            </div>
          </Card>

        </div>
      </div>
      
      {/* CSS for marquee animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
