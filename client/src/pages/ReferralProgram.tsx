import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Users, Gift, Copy, Share2, CheckCircle, Clock, 
  TrendingUp, Coins, UserPlus, Award
} from 'lucide-react';

interface ReferralStats {
  total: number;
  completed: number;
  pending: number;
  totalBonus: number;
}

interface Referral {
  id: string;
  referredId: string | null;
  status: 'Pending' | 'Completed' | 'Expired';
  bonusGoldGrams: string;
  completedAt: string | null;
  createdAt: string;
}

export default function ReferralProgram() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/referrals/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch referrals');
      return response.json();
    },
    enabled: !!user,
  });

  const referralCode = data?.referralCode || '';
  const referrals: Referral[] = data?.referrals || [];
  const stats: ReferralStats = data?.stats || { total: 0, completed: 0, pending: 0, totalBonus: 0 };

  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Finatrades',
          text: `Join Finatrades and get 0.5g of gold free! Use my referral code: ${referralCode}`,
          url: referralLink,
        });
      } catch (err) {
        copyToClipboard(referralLink);
      }
    } else {
      copyToClipboard(referralLink);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 text-primary">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Referral Program</h1>
            <p className="text-muted-foreground text-sm">Invite friends and earn gold rewards together</p>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-orange-500 to-amber-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Earn 0.5g Gold Per Referral
                </h2>
                <p className="text-white/80">
                  Share your referral code with friends. When they sign up and make their first transaction, 
                  you both receive 0.5 grams of gold credited to your wallets!
                </p>
              </div>
              <div className="flex-shrink-0">
                <Award className="w-20 h-20 text-white/30" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{stats.totalBonus.toFixed(2)}g</p>
              <p className="text-sm text-muted-foreground">Gold Earned</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Your Referral Code
            </CardTitle>
            <CardDescription>
              Share this code with friends to earn rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input 
                  value={referralCode}
                  readOnly
                  className="font-mono text-lg text-center font-bold tracking-wider bg-muted"
                  data-testid="input-referral-code"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(referralCode)}
                data-testid="button-copy-code"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Input 
                value={referralLink}
                readOnly
                className="text-sm bg-muted"
                data-testid="input-referral-link"
              />
              <Button 
                onClick={shareReferral}
                className="bg-gradient-to-r from-orange-500 to-amber-500"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Referral History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">No referrals yet</p>
                <p className="text-sm text-muted-foreground">Share your code to start earning!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div 
                    key={referral.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    data-testid={`referral-${referral.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Invited Friend</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={referral.status === 'Completed' ? 'default' : 'secondary'}
                        className={referral.status === 'Completed' ? 'bg-green-500' : ''}
                      >
                        {referral.status}
                      </Badge>
                      {referral.status === 'Completed' && (
                        <span className="text-sm font-medium text-amber-600">
                          +{referral.bonusGoldGrams}g
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xl">
                  1
                </div>
                <h3 className="font-medium">Share Your Code</h3>
                <p className="text-sm text-muted-foreground">
                  Send your unique referral code or link to friends
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xl">
                  2
                </div>
                <h3 className="font-medium">Friend Signs Up</h3>
                <p className="text-sm text-muted-foreground">
                  They create an account using your referral code
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xl">
                  3
                </div>
                <h3 className="font-medium">Both Earn Gold</h3>
                <p className="text-sm text-muted-foreground">
                  After their first transaction, you both get 0.5g gold
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
