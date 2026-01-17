import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useBnsl } from '@/context/BnslContext';
import { 
  Clock, RefreshCw, Loader2, Eye, EyeOff, 
  ChevronRight, TrendingUp, Coins, Calendar,
  Plus, CheckCircle, AlertCircle, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { BnslPlan } from '@/types/bnsl';

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'pending':
    case 'pending_activation':
      return 'bg-amber-100 text-amber-700';
    case 'completed':
      return 'bg-blue-100 text-blue-700';
    case 'early terminated':
    case 'early_terminated':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const calculateProgress = (startDate: string, maturityDate: string): number => {
  const start = new Date(startDate).getTime();
  const end = new Date(maturityDate).getTime();
  const now = Date.now();
  
  if (now >= end) return 100;
  if (now <= start) return 0;
  
  return Math.round(((now - start) / (end - start)) * 100);
};

export default function MobileBNSL() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    plans,
    currentGoldPrice,
    isLoading: loading,
    refreshPlans
  } = useBnsl();

  const goldPricePerGram = currentGoldPrice;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPlans();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const activePlans = plans.filter(p => p.status === 'Active');
  const pendingPlans = plans.filter(p => p.status === 'Pending Activation');
  const completedPlans = plans.filter(p => p.status === 'Completed');
  
  const totalLockedGold = activePlans.reduce((sum, p) => sum + parseFloat(String(p.goldSoldGrams || 0)), 0);
  const totalLockedValue = totalLockedGold * goldPricePerGram;
  const totalExpectedReturns = activePlans.reduce((sum, p) => sum + parseFloat(String(p.totalSaleProceedsUsd || 0)), 0);

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
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-xl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">Buy Now Sell Later</span>
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
            <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Total Locked Value</p>
            <h2 className="text-4xl font-bold tracking-tight">
              {showBalance ? `$${totalLockedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
              <Coins className="w-3.5 h-3.5 text-yellow-200" />
              <span>{showBalance ? `${totalLockedGold.toFixed(4)}g` : '••••'}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
              <TrendingUp className="w-3.5 h-3.5 text-green-200" />
              <span>{showBalance ? `$${totalExpectedReturns.toLocaleString()}` : '••••'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Grid - only show when user has plans */}
      {plans.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Active Plans</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{activePlans.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">{pendingPlans.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Completed</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{completedPlans.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-4 border border-purple-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">Expected Returns</span>
            </div>
            <p className="text-xl font-bold text-purple-900">
              {showBalance ? `$${totalExpectedReturns.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '••••'}
            </p>
          </motion.div>
        </div>
      )}

      {/* Create New Plan Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setLocation('/bnsl?tab=create')}
        className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg"
        data-testid="btn-create-plan"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Join BNSL Plan</span>
      </motion.button>

      {/* Active Plans */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-border shadow-sm"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Your Plans</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary text-sm"
            onClick={() => setLocation('/bnsl')}
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        
        {plans.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No BNSL plans yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first plan to start earning</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {plans.slice(0, 5).map((plan, index) => {
              const progress = calculateProgress(plan.startDate, plan.maturityDate);
              const goldAmount = parseFloat(String(plan.goldSoldGrams || 0));
              const expectedReturn = parseFloat(String(plan.totalSaleProceedsUsd || 0));
              const maturityDate = new Date(plan.maturityDate);
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors"
                  onClick={() => setLocation(`/bnsl?plan=${plan.id}`)}
                  data-testid={`plan-item-${plan.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        plan.status === 'Active' ? 'bg-green-100' :
                        plan.status === 'Pending Activation' ? 'bg-amber-100' :
                        plan.status === 'Completed' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Coins className={`w-5 h-5 ${
                          plan.status === 'Active' ? 'text-green-600' :
                          plan.status === 'Pending Activation' ? 'text-amber-600' :
                          plan.status === 'Completed' ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {goldAmount.toFixed(4)}g Gold
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {plan.tenorMonths} months • {plan.agreedMarginAnnualPercent}% margin
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(plan.status)}`}>
                      {plan.status}
                    </Badge>
                  </div>
                  
                  {plan.status === 'Active' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Matures: {maturityDate.toLocaleDateString()}
                        </span>
                        <span className="font-medium text-green-600">
                          +${expectedReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
