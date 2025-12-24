import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Gift, Copy, Check, Share2, Loader2, 
  TrendingUp, Award, Clock, ChevronRight, Sparkles,
  Link as LinkIcon, QrCode, Mail, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ReferralStats {
  referralCode: string;
  stats: {
    totalReferrals: number;
    completedReferrals: number;
    totalEarnedUsd: number;
    totalEarnedGrams: number;
    rewardPerReferralUsd: number;
    rewardPerReferralGrams: number;
    refereeBonusUsd: number;
    maxReferrals: number;
    remainingReferrals: number;
  };
  referrals: Array<{
    id: string;
    referredEmail: string;
    status: string;
    rewardAmount: string;
    createdAt: string;
    completedAt: string | null;
  }>;
}

export default function Referral() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const { data, isLoading } = useQuery<ReferralStats>({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/referrals/${user?.id}/stats`);
      if (!res.ok) throw new Error('Failed to fetch referral stats');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const referralLink = data?.referralCode 
    ? `${window.location.origin}/register?ref=${data.referralCode}` 
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
      await navigator.clipboard.writeText(data?.referralCode || '');
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
          text: `Join Finatrades using my referral code and earn gold! Use code: ${data?.referralCode}`,
          url: referralLink,
        });
      } catch {
      }
    } else {
      handleCopyLink();
    }
  };

  if (!user) return null;

  const totalEarnedGrams = data?.stats.totalEarnedGrams || 0;
  const totalReferrals = data?.stats.totalReferrals || 0;
  const completedReferrals = data?.stats.completedReferrals || 0;
  const rewardPerReferralGrams = data?.stats.rewardPerReferralGrams || 0;
  const remainingReferrals = data?.stats.remainingReferrals || 0;
  const maxReferrals = data?.stats.maxReferrals || 100;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-success-muted text-success-muted-foreground">Completed</Badge>;
      case 'Pending':
        return <Badge className="bg-warning-muted text-warning-muted-foreground">Pending</Badge>;
      case 'Active':
        return <Badge className="bg-info-muted text-info-muted-foreground">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              Referral Program
            </h1>
            <p className="text-muted-foreground mt-1">Invite friends and earn gold rewards together</p>
          </div>
          <Button 
            onClick={handleShare}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
            data-testid="button-share-main"
          >
            <Share2 className="w-4 h-4 mr-2" /> Share & Invite
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20" data-testid="card-total-earned">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-foreground">{totalEarnedGrams.toFixed(3)}g</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20" data-testid="card-total-referrals">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold text-foreground">{totalReferrals}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20" data-testid="card-completed">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{completedReferrals}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20" data-testid="card-remaining">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-foreground">{remainingReferrals}/{maxReferrals}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <Tabs defaultValue="invite" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="invite" className="flex items-center gap-2" data-testid="tab-invite">
              <LinkIcon className="w-4 h-4" /> Invite
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2" data-testid="tab-referrals">
              <Users className="w-4 h-4" /> My Referrals
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2" data-testid="tab-rewards">
              <Gift className="w-4 h-4" /> Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6" data-testid="card-referral-code">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-secondary" />
                    Your Referral Code
                  </CardTitle>
                  <CardDescription>Share this code with friends to invite them</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Input 
                          readOnly 
                          value={data?.referralCode || ''} 
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
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="p-6" data-testid="card-share-options">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" />
                    Share Options
                  </CardTitle>
                  <CardDescription>Choose how you want to invite friends</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-14 text-left"
                    onClick={handleCopyLink}
                    data-testid="button-share-link"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                      <LinkIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Copy Link</p>
                      <p className="text-xs text-muted-foreground">Share your unique referral link</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-14 text-left"
                    onClick={handleShare}
                    data-testid="button-share-native"
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mr-3">
                      <MessageSquare className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Share via Apps</p>
                      <p className="text-xs text-muted-foreground">WhatsApp, Telegram, and more</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-14 text-left"
                    onClick={() => {
                      const subject = encodeURIComponent('Join Finatrades - Earn Gold!');
                      const body = encodeURIComponent(`Hey!\n\nI've been using Finatrades to invest in gold and I think you'd love it too. Use my referral code ${data?.referralCode} when you sign up and we'll both earn rewards!\n\nSign up here: ${referralLink}`);
                      window.open(`mailto:?subject=${subject}&body=${body}`);
                    }}
                    data-testid="button-share-email"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3">
                      <Mail className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Email Invite</p>
                      <p className="text-xs text-muted-foreground">Send an email invitation</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 p-6 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border-primary/20" data-testid="card-how-it-works">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">1</div>
                    <div>
                      <h4 className="font-semibold mb-1">Share Your Code</h4>
                      <p className="text-sm text-muted-foreground">Send your unique referral code or link to friends</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold shrink-0">2</div>
                    <div>
                      <h4 className="font-semibold mb-1">Friend Signs Up</h4>
                      <p className="text-sm text-muted-foreground">They register and make their first deposit</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shrink-0">3</div>
                    <div>
                      <h4 className="font-semibold mb-1">Both Earn Rewards</h4>
                      <p className="text-sm text-muted-foreground">You get {rewardPerReferralGrams.toFixed(3)}g gold, they get ${data?.stats.refereeBonusUsd || 5} bonus</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card data-testid="card-referrals-list">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>My Referrals</span>
                  <Badge variant="outline">{data?.referrals?.length || 0} total</Badge>
                </CardTitle>
                <CardDescription>Track the status of people you've referred</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : data?.referrals && data.referrals.length > 0 ? (
                  <div className="space-y-3">
                    {data.referrals.map((ref) => (
                      <div 
                        key={ref.id} 
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
                        data-testid={`row-referral-${ref.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{ref.referredEmail || 'Awaiting signup'}</p>
                            <p className="text-xs text-muted-foreground">
                              Referred on {new Date(ref.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {ref.status === 'Completed' && (
                            <span className="text-sm font-medium text-green-600">
                              +{parseFloat(ref.rewardAmount || '0').toFixed(3)}g
                            </span>
                          )}
                          {getStatusBadge(ref.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No referrals yet</h3>
                    <p className="text-muted-foreground mb-4">Start sharing your code to invite friends!</p>
                    <Button onClick={handleShare} data-testid="button-start-inviting">
                      <Share2 className="w-4 h-4 mr-2" /> Start Inviting
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6" data-testid="card-your-rewards">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-secondary" />
                    Your Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20">
                    <p className="text-sm text-muted-foreground mb-1">Total Gold Earned</p>
                    <p className="text-3xl font-bold text-foreground">{totalEarnedGrams.toFixed(3)}g</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      ≈ ${(totalEarnedGrams * 85).toFixed(2)} USD
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Referrals Completed</p>
                      <p className="text-xl font-bold">{completedReferrals}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Reward per Referral</p>
                      <p className="text-xl font-bold">{rewardPerReferralGrams.toFixed(3)}g</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6" data-testid="card-reward-tiers">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Reward Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">You earn</span>
                      </div>
                      <span className="font-bold text-primary">{rewardPerReferralGrams.toFixed(3)}g gold</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                          <Gift className="w-4 h-4 text-secondary" />
                        </div>
                        <span className="font-medium">Friend gets</span>
                      </div>
                      <span className="font-bold text-secondary">${data?.stats.refereeBonusUsd || 5} bonus</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="font-medium">Reward triggers</span>
                      </div>
                      <span className="text-sm text-muted-foreground">On first deposit</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Rewards are credited automatically once your friend makes their first deposit
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
