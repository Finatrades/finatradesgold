import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users, Gift, Copy, Check, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

export default function ReferralCard() {
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);

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
      toast.success('Referral code copied!');
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
  const rewardPerReferralGrams = data?.stats.rewardPerReferralGrams || 0;

  return (
    <>
      <Card className="p-6 bg-card shadow-sm border border-border relative overflow-hidden group" data-testid="card-referral">
        <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-secondary/20 transition-colors duration-500" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Referral Plan</h3>
              <p className="text-xs text-secondary font-medium uppercase tracking-wider">Single-level reward</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Gift className="w-5 h-5 text-secondary" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Invite friends to Finatrades! When they deposit, you both earn gold rewards.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/50 p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                  <p className="text-lg font-bold text-secondary" data-testid="text-total-earned">
                    {totalEarnedGrams.toFixed(2)} g
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Referrals</p>
                  <p className="text-lg font-bold text-foreground" data-testid="text-total-referrals">
                    {totalReferrals}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground">
                  Reward: <span className="text-foreground font-medium">{rewardPerReferralGrams.toFixed(3)} g / user</span>
                </div>
                <Button 
                  size="sm" 
                  className="bg-primary text-white hover:bg-primary/90 font-semibold"
                  onClick={() => setShowInviteModal(true)}
                  data-testid="button-invite-friend"
                >
                  <Users className="w-4 h-4 mr-2" /> Invite Friend
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-secondary" />
              Invite Friends & Earn Gold
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Share your referral code with friends. When they sign up and make their first deposit, 
                you'll earn <span className="font-semibold text-secondary">{rewardPerReferralGrams.toFixed(3)}g gold</span> and 
                they'll get <span className="font-semibold text-secondary">${data?.stats.refereeBonusUsd || 5}</span> bonus!
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your Referral Code</label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={data?.referralCode || ''} 
                    className="font-mono text-lg font-bold text-center tracking-wider"
                    data-testid="input-referral-code"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyCode} data-testid="button-copy-code">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Referral Link</label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={referralLink} 
                    className="text-sm"
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
            </div>

            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90" 
                onClick={handleShare}
                data-testid="button-share-referral"
              >
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleCopyLink}
                data-testid="button-copy-referral-link"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </Button>
            </div>

            {data?.referrals && data.referrals.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Your Referrals ({data.referrals.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {data.referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">{ref.referredEmail || 'Pending signup'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        ref.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                        ref.status === 'Active' ? 'bg-blue-100 text-blue-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {ref.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
