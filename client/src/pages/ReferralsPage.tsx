import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, Gift, Copy, Check, Share2, Loader2, 
  TrendingUp, Award, Clock, ChevronRight, Sparkles,
  Link as LinkIcon, Mail, MessageSquare, RefreshCw,
  AlertCircle, UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ReferralDashboard {
  referralCode: string | null;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalBonusEarned: number;
    totalBonusEarnedGrams: number;
  };
}

interface ReferredUser {
  id: string;
  maskedName: string;
  maskedEmail: string;
  status: 'Pending' | 'Active' | 'Completed';
  bonusEarned: number;
  bonusEarnedGrams: number;
  referredAt: string;
  activatedAt: string | null;
  completedAt: string | null;
}

interface MyReferralsResponse {
  referrals: ReferredUser[];
  totalCount: number;
}

function maskEmail(email: string): string {
  if (!email || email.length < 5) return '***@***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '***' + (local.length > 2 ? local.charAt(local.length - 1) : '');
  const maskedDomain = domain ? domain.charAt(0) + '***' : '***';
  return `${maskedLocal}@${maskedDomain}`;
}

function maskName(name: string): string {
  if (!name || name.length < 2) return '***';
  return name.charAt(0) + '***' + name.charAt(name.length - 1);
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = useQuery<ReferralDashboard>({
    queryKey: ['referrals-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/referrals/dashboard');
      if (!res.ok) throw new Error('Failed to fetch referral dashboard');
      return res.json();
    },
    enabled: !!user,
  });

  const { data: referralsData, isLoading: referralsLoading, error: referralsError } = useQuery<MyReferralsResponse>({
    queryKey: ['my-referrals'],
    queryFn: async () => {
      const res = await fetch('/api/referrals/my-referrals');
      if (!res.ok) throw new Error('Failed to fetch referrals');
      return res.json();
    },
    enabled: !!user,
  });

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/referrals/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to generate referral code');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals-dashboard'] });
      toast.success('Referral code generated successfully!');
    },
    onError: () => {
      toast.error('Failed to generate referral code');
    },
  });

  const referralLink = dashboard?.referralCode 
    ? `${window.location.origin}/register?ref=${dashboard.referralCode}` 
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(dashboard?.referralCode || '');
      setCopiedCode(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Finatrades',
          text: `Join Finatrades using my referral code and earn gold! Use code: ${dashboard?.referralCode}`,
          url: referralLink,
        });
      } catch {
      }
    } else {
      handleCopyLink();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200" data-testid={`badge-status-completed`}>Completed</Badge>;
      case 'Active':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200" data-testid={`badge-status-active`}>Active</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200" data-testid={`badge-status-pending`}>Pending</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status.toLowerCase()}`}>{status}</Badge>;
    }
  };

  if (!user) return null;

  const stats = dashboard?.stats || {
    totalReferrals: 0,
    activeReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalBonusEarned: 0,
    totalBonusEarnedGrams: 0,
  };

  const referrals = referralsData?.referrals || [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="heading-referral-dashboard">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              Referral Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Track your referrals and earn rewards</p>
          </div>
          {dashboard?.referralCode && (
            <Button 
              onClick={handleShare}
              className="bg-gradient-to-r from-purple-500 to-purple-700 hover:opacity-90 text-white"
              data-testid="button-share-main"
            >
              <Share2 className="w-4 h-4 mr-2" /> Share & Invite
            </Button>
          )}
        </div>

        {dashboardLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-12 w-12 rounded-xl mb-3" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))}
          </div>
        ) : dashboardError ? (
          <Card className="p-6 border-red-200 bg-red-50" data-testid="error-dashboard">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p>Failed to load referral dashboard. Please try again.</p>
            </div>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-purple-700/5 border-purple-200" data-testid="card-total-referrals">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-referrals">{stats.totalReferrals}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-700/5 border-blue-200" data-testid="card-active-referrals">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Referrals</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-active-referrals">{stats.activeReferrals}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-green-500/10 to-green-700/5 border-green-200" data-testid="card-completed-referrals">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-completed-referrals">{stats.completedReferrals}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-700/5 border-amber-200" data-testid="card-total-bonus">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Bonus Earned</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-bonus">
                    {stats.totalBonusEarnedGrams?.toFixed(3) || '0.000'}g
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-6" data-testid="card-referral-code">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-purple-600" />
                Your Referral Code
              </CardTitle>
              <CardDescription>Share this code with friends to invite them</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {dashboardLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : !dashboard?.referralCode ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <UserPlus className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">No Referral Code Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate your unique referral code to start inviting friends
                  </p>
                  <Button 
                    onClick={() => generateCodeMutation.mutate()}
                    disabled={generateCodeMutation.isPending}
                    className="bg-gradient-to-r from-purple-500 to-purple-700 hover:opacity-90 text-white"
                    data-testid="button-generate-code"
                  >
                    {generateCodeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Generate Referral Code
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Input 
                      readOnly 
                      value={dashboard.referralCode} 
                      className="text-2xl font-mono font-bold text-center tracking-[0.3em] py-6 bg-muted/50"
                      data-testid="input-referral-code"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={handleCopyCode}
                      data-testid="button-copy-code"
                    >
                      {copiedCode ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Referral Link</label>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={referralLink} 
                        className="text-sm bg-muted/50"
                        data-testid="input-referral-link"
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handleCopyLink}
                        data-testid="button-copy-link"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Share via</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleShare}
                        data-testid="button-share-apps"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" /> Apps
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          const subject = encodeURIComponent('Join Finatrades - Earn Gold!');
                          const body = encodeURIComponent(`Hey!\n\nI've been using Finatrades to invest in gold and I think you'd love it too. Use my referral code ${dashboard.referralCode} when you sign up and we'll both earn rewards!\n\nSign up here: ${referralLink}`);
                          window.open(`mailto:?subject=${subject}&body=${body}`);
                        }}
                        data-testid="button-share-email"
                      >
                        <Mail className="w-4 h-4 mr-2" /> Email
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2" data-testid="card-referrals-list">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Referred Users
                </span>
                <Badge variant="outline">{referrals.length} total</Badge>
              </CardTitle>
              <CardDescription>Track the status of people you've referred (names masked for privacy)</CardDescription>
            </CardHeader>
            <CardContent>
              {referralsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : referralsError ? (
                <div className="flex items-center justify-center py-8 text-red-500" data-testid="error-referrals">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Failed to load referrals
                </div>
              ) : referrals.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {referrals.map((ref) => (
                    <div 
                      key={ref.id} 
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted/70 transition-colors"
                      data-testid={`row-referral-${ref.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-referral-name-${ref.id}`}>
                            {ref.maskedName || maskName(ref.maskedEmail?.split('@')[0] || '')}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-referral-email-${ref.id}`}>
                            {ref.maskedEmail || maskEmail('')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Referred: {new Date(ref.referredAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(ref.status)}
                        {ref.status === 'Completed' && ref.bonusEarnedGrams > 0 && (
                          <span className="text-sm font-medium text-green-600" data-testid={`text-bonus-${ref.id}`}>
                            +{ref.bonusEarnedGrams.toFixed(3)}g
                          </span>
                        )}
                        {ref.status === 'Pending' && (
                          <span className="text-xs text-muted-foreground">Awaiting deposit</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12" data-testid="empty-referrals">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No referrals yet</h3>
                  <p className="text-muted-foreground mb-4">Start sharing your code to invite friends!</p>
                  {dashboard?.referralCode && (
                    <Button onClick={handleShare} data-testid="button-start-inviting">
                      <Share2 className="w-4 h-4 mr-2" /> Start Inviting
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="p-6 bg-gradient-to-r from-purple-500/5 via-purple-600/5 to-purple-700/5 border-purple-200" data-testid="card-how-it-works">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              How Referrals Work
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <h4 className="font-semibold mb-1">Get Your Code</h4>
                  <p className="text-sm text-muted-foreground">Generate your unique referral code above</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <h4 className="font-semibold mb-1">Share With Friends</h4>
                  <p className="text-sm text-muted-foreground">Send your code or link to friends</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <h4 className="font-semibold mb-1">Friend Signs Up</h4>
                  <p className="text-sm text-muted-foreground">They register and make their first deposit</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shrink-0">4</div>
                <div>
                  <h4 className="font-semibold mb-1">Earn Rewards</h4>
                  <p className="text-sm text-muted-foreground">Both of you earn gold bonuses!</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
