import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, DollarSign, TrendingUp, Coins, BarChart3, AlertTriangle, CheckCircle2, Wallet, EyeOff, ArrowUpRight, ArrowDownRight, Zap, Shield, Clock, ChevronRight, Sparkles, Building, CreditCard, Send, ArrowRight, RefreshCw } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card } from '@/components/ui/card';
import { AEDAmount } from '@/components/ui/DirhamSymbol';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';

import TransactionsTable from '@/components/dashboard/TransactionsTable';
import CertificatesCard from '@/components/dashboard/CertificatesCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import OnboardingTour, { useOnboarding } from '@/components/OnboardingTour';
import { useDashboardTour } from '@/hooks/useDashboardTour';
import { TourButton } from '@/components/tour/TourProvider';

interface UserPreferences {
  showBalance: boolean;
  twoFactorReminder: boolean;
  compactMode: boolean;
  displayCurrency: string;
}

function formatNumber(num: number | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0.00';
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatGrams(grams: number | null | undefined): string {
  if (grams === null || grams === undefined || isNaN(grams)) {
    return '0.0000 g';
  }
  if (grams >= 1000) {
    return `${formatNumber(grams / 1000, 4)} kg`;
  }
  return `${formatNumber(grams, 4)} g`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totals, wallet, transactions, goldPrice, goldPriceSource, isLoading, tradeCounts, finaBridge, certificates } = useDashboardData();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { startTour, tourId } = useDashboardTour();

  const { data: prefsData } = useQuery<{ preferences: UserPreferences }>({
    queryKey: ['preferences', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/preferences`);
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 300000,
  });

  const prefs = prefsData?.preferences;
  const showBalance = prefs?.showBalance !== false;
  const displayCurrency = prefs?.displayCurrency || 'USD';

  const formatCurrency = (usdAmount: number) => {
    if (displayCurrency === 'AED') {
      return `Dh ${formatNumber(usdAmount * 3.67)}`;
    } else if (displayCurrency === 'EUR') {
      return `€${formatNumber(usdAmount * 0.92)}`;
    }
    return `$${formatNumber(usdAmount)}`;
  };

  const hiddenValue = '••••••';

  if (!user) return null;
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  const userName = user.firstName || user.email?.split('@')[0] || 'User';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || userName;
  const isBusinessUser = user.accountType === 'business' || !!user.finabridgeRole;
  const isGoldPriceLive = goldPriceSource && !goldPriceSource.includes('fallback');
  
  const totalGoldGrams = (totals.walletGoldGrams || 0) + (totals.vaultGoldGrams || 0);
  const totalPortfolioValue = totals.totalPortfolioUsd || 0;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Premium Hero Section */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 md:p-8">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Top row - Greeting & Live Price */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="text-purple-300 text-sm mb-1">Welcome back</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{userName}</h1>
                {user.finatradesId && (
                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full">
                    <span className="text-xs text-purple-300">ID</span>
                    <span className="text-sm font-mono font-bold text-amber-400">{user.finatradesId}</span>
                  </div>
                )}
              </div>
              
              {/* Live Gold Price Ticker */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isGoldPriceLive ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                  <span className="text-xs text-purple-300 uppercase tracking-wide">Gold Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-amber-400">${goldPrice.toFixed(2)}</span>
                  <span className="text-xs text-purple-300">/gram</span>
                </div>
              </div>
            </div>
            
            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Gold Holdings */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-sm text-purple-300">Total Gold Holdings</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {showBalance ? `${formatNumber(totalGoldGrams, 4)}g` : hiddenValue}
                </p>
                <p className="text-sm text-purple-300">
                  {showBalance ? `≈ ${formatCurrency(totalGoldGrams * goldPrice)}` : ''}
                </p>
              </div>
              
              {/* Total Portfolio Value */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-sm text-purple-300">Portfolio Value</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {showBalance ? formatCurrency(totalPortfolioValue) : hiddenValue}
                </p>
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Active</span>
                </div>
              </div>
              
              {/* Vault Status */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-sm text-purple-300">Vault Storage</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {showBalance ? `${formatNumber(totals.vaultGoldGrams || 0, 4)}g` : hiddenValue}
                </p>
                <div className="flex items-center gap-1 text-purple-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Secured in FinaVault</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions Hub */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/finapay">
            <div className="group p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 hover:shadow-lg hover:shadow-emerald-100 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ArrowDownRight className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Deposit</h3>
              <p className="text-xs text-gray-500">Add funds</p>
            </div>
          </Link>
          
          <Link href="/finapay">
            <div className="group p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-lg hover:shadow-blue-100 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Withdraw</h3>
              <p className="text-xs text-gray-500">Cash out</p>
            </div>
          </Link>
          
          <Link href="/finapay">
            <div className="group p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:shadow-lg hover:shadow-purple-100 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Convert</h3>
              <p className="text-xs text-gray-500">MPGW ↔ FPGW</p>
            </div>
          </Link>
          
          <Link href="/finapay">
            <div className="group p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 hover:shadow-lg hover:shadow-amber-100 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Send className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Transfer</h3>
              <p className="text-xs text-gray-500">Send gold</p>
            </div>
          </Link>
        </section>

        {/* Dual Wallet Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MPGW Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">MPGW</h3>
                    <p className="text-xs text-purple-200">Market Price Gold Wallet</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0">Live Price</Badge>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-purple-200 mb-1">Available Balance</p>
                <p className="text-4xl font-bold text-white">
                  {showBalance ? `${formatNumber(totals.mpgwAvailableGrams || 0, 4)}g` : hiddenValue}
                </p>
                <p className="text-sm text-purple-200 mt-1">
                  {showBalance ? `≈ ${formatCurrency((totals.mpgwAvailableGrams || 0) * goldPrice)}` : ''}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                <div>
                  <p className="text-xs text-purple-200">Pending</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totals.mpgwPendingGrams || 0, 4)}g</p>
                </div>
                <div>
                  <p className="text-xs text-purple-200">Locked (BNSL)</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totals.mpgwLockedBnslGrams || 0, 4)}g</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* FPGW Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">FPGW</h3>
                    <p className="text-xs text-amber-100">Fixed Price Gold Wallet</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0">Fixed Price</Badge>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-amber-100 mb-1">Available Balance</p>
                <p className="text-4xl font-bold text-white">
                  {showBalance ? `${formatNumber(totals.fpgwAvailableGrams || 0, 4)}g` : hiddenValue}
                </p>
                <p className="text-sm text-amber-100 mt-1">
                  {showBalance && totals.fpgwWeightedAvgPriceUsd ? `Cost: $${formatNumber(totals.fpgwWeightedAvgPriceUsd, 2)}/g` : 'No holdings'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                <div>
                  <p className="text-xs text-amber-100">Pending</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totals.fpgwPendingGrams || 0, 4)}g</p>
                </div>
                <div>
                  <p className="text-xs text-amber-100">Locked</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totals.fpgwLockedBnslGrams || 0, 4)}g</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Insights Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* BNSL Summary */}
          <Card className="p-5 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">BNSL Program</h3>
                <p className="text-xs text-gray-500">Buy Now, Sell Later</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Invested</span>
                <span className="font-semibold text-gray-900">{formatNumber(totals.bnslLockedGrams || 0, 4)}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Plans</span>
                <span className="font-semibold text-teal-600">{totals.activeBnslPlans || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Profit</span>
                <span className="font-semibold text-emerald-600">+{formatCurrency(totals.bnslTotalProfit || 0)}</span>
              </div>
            </div>
            <Link href="/bnsl">
              <Button variant="outline" className="w-full mt-4 border-teal-300 text-teal-700 hover:bg-teal-100">
                View Plans <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </Card>
          
          {/* Pending Deposits */}
          <Card className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Pending</h3>
                <p className="text-xs text-gray-500">Awaiting verification</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Gold Pending</span>
                <span className="font-semibold text-orange-600">{formatNumber(totals.pendingGoldGrams || 0, 4)}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">USD Pending</span>
                <span className="font-semibold text-gray-900">${formatNumber(totals.pendingDepositUsd || 0)}</span>
              </div>
            </div>
            <Link href="/finapay">
              <Button variant="outline" className="w-full mt-4 border-orange-300 text-orange-700 hover:bg-orange-100">
                View Details <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </Card>
          
          {/* Certificates */}
          <Card className="p-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Certificates</h3>
                <p className="text-xs text-gray-500">Ownership proof</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-semibold text-gray-900">{certificates?.summary?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <span className="font-semibold text-purple-600">{certificates?.summary?.active || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Physical Storage</span>
                <span className="font-semibold text-emerald-600">{certificates?.summary?.physicalStorage || 0}</span>
              </div>
            </div>
            <Link href="/vault">
              <Button variant="outline" className="w-full mt-4 border-purple-300 text-purple-700 hover:bg-purple-100">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </Card>
        </section>

        {/* Recent Transactions & Certificates */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionsTable transactions={transactions} goldPrice={goldPrice} />
          <CertificatesCard certificates={certificates?.recent || []} isLoading={isLoading} />
        </section>

      </div>

      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}
    </DashboardLayout>
  );
}
