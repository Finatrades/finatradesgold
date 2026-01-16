import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { 
  Briefcase, RefreshCw, Loader2, Eye, EyeOff, 
  ChevronRight, Package, FileText, Lock, Unlock,
  Ship, Plane, Train, Truck, CheckCircle, Clock,
  Plus, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TradeRequest {
  id: string;
  tradeRefId: string;
  goodsName: string;
  tradeValueUsd: string;
  settlementGoldGrams: string;
  status: string;
  createdAt: string;
  modeOfTransport?: string | null;
}

interface TradeProposal {
  id: string;
  status: string;
  quotePrice: string;
  createdAt: string;
  tradeRequest?: {
    tradeRefId: string;
    goodsName: string;
    tradeValueUsd: string;
  };
}

interface FinabridgeWallet {
  availableGoldGrams: string;
  lockedGoldGrams: string;
}

const getTransportIcon = (mode?: string | null) => {
  switch (mode?.toLowerCase()) {
    case 'sea': return Ship;
    case 'air': return Plane;
    case 'rail': return Train;
    case 'road': return Truck;
    default: return Package;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'pending':
    case 'submitted':
    case 'under_review':
      return 'bg-amber-100 text-amber-700';
    case 'rejected':
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export default function MobileFinaBridge() {
  const { user } = useAuth();
  const { accountType } = useAccountType();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [wallet, setWallet] = useState<FinabridgeWallet | null>(null);
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);
  const [proposals, setProposals] = useState<TradeProposal[]>([]);
  const [goldPricePerGram, setGoldPricePerGram] = useState(0);

  const fetchData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const [walletRes, requestsRes, proposalsRes, priceRes] = await Promise.all([
        fetch(`/api/finabridge/wallet/${user.id}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch(`/api/finabridge/importer/requests/${user.id}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { requests: [] }),
        fetch(`/api/finabridge/exporter/proposals/${user.id}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { proposals: [] }),
        fetch('/api/gold-price', { credentials: 'include' }).then(r => r.ok ? r.json() : { pricePerGram: 0 })
      ]);
      
      if (walletRes?.wallet) setWallet(walletRes.wallet);
      setTradeRequests(requestsRes.requests || []);
      setProposals(proposalsRes.proposals || []);
      setGoldPricePerGram(priceRes.pricePerGram || 0);
    } catch (error) {
      console.error('Failed to fetch FinaBridge data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const availableGold = wallet ? parseFloat(wallet.availableGoldGrams || '0') : 0;
  const lockedGold = wallet ? parseFloat(wallet.lockedGoldGrams || '0') : 0;
  const totalGold = availableGold + lockedGold;
  const totalValueUsd = totalGold * goldPricePerGram;

  const activeRequests = tradeRequests.filter(r => 
    !['completed', 'cancelled', 'rejected'].includes(r.status.toLowerCase())
  );
  const pendingProposals = proposals.filter(p => p.status.toLowerCase() === 'pending');

  const isBusinessUser = accountType === 'business';
  const canCreateTrade = isBusinessUser;
  const canBrowseTrades = isBusinessUser;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-6 text-white shadow-xl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">FinaBridge</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowBalance(!showBalance)}
                className="p-2 bg-white/10 rounded-full backdrop-blur-sm"
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9, rotate: 180 }}
                onClick={handleRefresh}
                className="p-2 bg-white/10 rounded-full backdrop-blur-sm"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>
          
          <div className="mb-1">
            <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Trade Finance Portfolio</p>
            <h2 className="text-4xl font-bold tracking-tight">
              {showBalance ? `$${totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
              <Unlock className="w-3.5 h-3.5 text-green-300" />
              <span>{showBalance ? `${availableGold.toFixed(2)}g` : '••••'}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>{showBalance ? `${lockedGold.toFixed(2)}g` : '••••'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Active Trades</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{activeRequests.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Pending Proposals</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">{pendingProposals.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <Unlock className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Available Gold</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{showBalance ? `${availableGold.toFixed(2)}g` : '••••'}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-4 border border-purple-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">Locked in Trades</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{showBalance ? `${lockedGold.toFixed(2)}g` : '••••'}</p>
        </motion.div>
      </div>

      {/* Quick Actions */}
      {isBusinessUser && (
        <div className="flex gap-3">
          {canCreateTrade && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation('/finabridge?tab=create')}
              className="flex-1 flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg"
              data-testid="btn-create-trade"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Trade</span>
            </motion.button>
          )}
          {canBrowseTrades && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation('/finabridge?tab=browse')}
              className="flex-1 flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg"
              data-testid="btn-browse-trades"
            >
              <Package className="w-5 h-5" />
              <span className="font-medium">Browse Trades</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Active Trade Cases */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-border shadow-sm"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Active Trades</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary text-sm"
            onClick={() => setLocation('/finabridge')}
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        
        {activeRequests.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No active trades</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeRequests.slice(0, 5).map((trade, index) => {
              const TransportIcon = getTransportIcon(trade.modeOfTransport);
              return (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors"
                  onClick={() => setLocation(`/finabridge?trade=${trade.id}`)}
                  data-testid={`trade-item-${trade.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <TransportIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{trade.goodsName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{trade.tradeRefId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-foreground">
                      ${parseFloat(trade.tradeValueUsd).toLocaleString()}
                    </p>
                    <Badge className={`text-xs ${getStatusColor(trade.status)}`}>
                      {trade.status}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Recent Proposals */}
      {proposals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-border shadow-sm"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">My Proposals</h3>
          </div>
          
          <div className="divide-y divide-border">
            {proposals.slice(0, 3).map((proposal, index) => (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4"
                data-testid={`proposal-item-${proposal.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {proposal.tradeRequest?.goodsName || 'Trade Proposal'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Quote: ${parseFloat(proposal.quotePrice).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge className={`text-xs ${getStatusColor(proposal.status)}`}>
                  {proposal.status}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
