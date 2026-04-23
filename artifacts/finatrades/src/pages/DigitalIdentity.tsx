import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Download, Share2, CheckCircle, Clock, AlertTriangle,
  User, FileText, Eye, Fingerprint, Copy, RefreshCw, Loader2, 
  Lock, Award, Calendar, Globe, Key, History
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'wouter';

interface CredentialData {
  hasCredential: boolean;
  credentialId?: string;
  status?: 'active' | 'revoked' | 'expired' | 'suspended';
  issuedAt?: string;
  expiresAt?: string;
  vcJwt?: string;
  claimsSummary?: {
    kycLevel?: string;
    kycStatus?: string;
    idVerified?: boolean;
    addressVerified?: boolean;
    amlPassed?: boolean;
  };
  presentationCount?: number;
  message?: string;
}

interface PresentationData {
  id: string;
  verifierDomain: string;
  verifierName?: string;
  claimsShared?: string[];
  verificationSuccessful: boolean;
  presentationContext?: string;
  presentedAt: string;
}

export default function DigitalIdentity() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'credential' | 'history' | 'details'>('credential');

  const { data: credentialData, isLoading, refetch } = useQuery<CredentialData>({
    queryKey: ['my-credential'],
    queryFn: async () => {
      const res = await fetch('/api/vc/my-credential');
      if (!res.ok) throw new Error('Failed to fetch credential');
      return res.json();
    }
  });

  const { data: presentationsData } = useQuery<{ presentations: PresentationData[] }>({
    queryKey: ['credential-presentations', credentialData?.credentialId],
    queryFn: async () => {
      if (!credentialData?.credentialId) return { presentations: [] };
      const res = await fetch(`/api/vc/presentations/${credentialData.credentialId}`);
      if (!res.ok) return { presentations: [] };
      return res.json();
    },
    enabled: !!credentialData?.credentialId
  });

  const handleDownload = () => {
    if (!credentialData?.vcJwt) {
      toast.error('No credential available to download');
      return;
    }
    
    const blob = new Blob([credentialData.vcJwt], { type: 'application/jwt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finatrades-credential-${credentialData.credentialId}.jwt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Credential downloaded successfully');
  };

  const handleCopyCredentialId = () => {
    if (credentialData?.credentialId) {
      navigator.clipboard.writeText(credentialData.credentialId);
      toast.success('Credential ID copied to clipboard');
    }
  };

  const handleShare = async () => {
    if (credentialData?.credentialId) {
      const shareUrl = `${window.location.origin}/api/vc/status/${credentialData.credentialId}`;
      try {
        await navigator.share?.({
          title: 'Finatrades Digital Identity',
          text: 'Verify my identity credential',
          url: shareUrl
        });
      } catch {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Verification link copied to clipboard');
      }
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.email?.split('@')[0] || 'User';

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary" data-testid="page-title">Digital Identity</h1>
            <p className="text-sm text-muted-foreground">Your verified credential</p>
          </div>
        </div>

        {!credentialData?.hasCredential ? (
          /* No Credential State */
          <div className="hynex-card p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Fingerprint className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Digital Identity Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Complete your KYC verification to receive your verified digital identity credential.
            </p>
            <Link href="/kyc">
              <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full px-6" data-testid="start-kyc-button">
                <Shield className="w-4 h-4 mr-2" />
                Start KYC Verification
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Action Buttons - Pill Style */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                onClick={() => setActiveTab('credential')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === 'credential' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md' 
                    : 'hynex-card text-foreground/85 hover:bg-muted/40'
                }`}
                data-testid="tab-credential"
              >
                <Award className="w-4 h-4 mr-1.5" />
                Credential
              </Button>
              <Button
                onClick={() => setActiveTab('details')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === 'details' 
                    ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-md' 
                    : 'hynex-card text-foreground/85 hover:bg-muted/40'
                }`}
                data-testid="tab-details"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                Details
              </Button>
              <Button
                onClick={() => setActiveTab('history')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === 'history' 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                    : 'hynex-card text-foreground/85 hover:bg-muted/40'
                }`}
                data-testid="tab-history"
              >
                <History className="w-4 h-4 mr-1.5" />
                History
              </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Status Card */}
              <div className="hynex-card p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    credentialData.status === 'active' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <CheckCircle className={`w-4 h-4 ${
                      credentialData.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`} />
                  </div>
                  <span className="text-sm text-muted-foreground">Status</span>
                </div>
                <p className={`text-lg font-bold ${
                  credentialData.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`} data-testid="credential-status">
                  {credentialData.status === 'active' ? 'Verified' : credentialData.status}
                </p>
              </div>

              {/* Shares Card */}
              <div className="hynex-card p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">Shared</span>
                </div>
                <p className="text-lg font-bold" data-testid="presentation-count">
                  {credentialData.presentationCount || 0}
                </p>
              </div>

              {/* Issued Card */}
              <div className="hynex-card p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">Issued</span>
                </div>
                <p className="text-sm font-semibold" data-testid="issued-date">
                  {credentialData.issuedAt ? format(new Date(credentialData.issuedAt), 'MMM dd, yyyy') : '-'}
                </p>
              </div>

              {/* Expires Card */}
              <div className="hynex-card p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">Expires</span>
                </div>
                <p className="text-sm font-semibold" data-testid="expires-date">
                  {credentialData.expiresAt ? format(new Date(credentialData.expiresAt), 'MMM dd, yyyy') : '-'}
                </p>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'credential' && (
              <div className="hynex-card overflow-hidden">
                <div className="p-4 border-b border-border/60">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Verification Badges
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {credentialData.claimsSummary?.idVerified && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Identity Verified</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Government ID confirmed</p>
                      </div>
                    </div>
                  )}
                  {credentialData.claimsSummary?.addressVerified && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Address Verified</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Proof of address confirmed</p>
                      </div>
                    </div>
                  )}
                  {credentialData.claimsSummary?.amlPassed && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl">
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">AML Screening Passed</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Anti-money laundering check complete</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="font-medium text-purple-800 dark:text-purple-200">KYC Level</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">{credentialData.claimsSummary?.kycLevel || 'Tier 3 - Fully Verified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="hynex-card overflow-hidden">
                <div className="p-4 border-b border-border/60">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Credential Details
                  </h3>
                </div>
                <div className="divide-y divide-border/60">
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-muted-foreground">Full Name</span>
                    <span className="font-medium">{userName}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="font-medium text-sm">{user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-muted-foreground">Credential Type</span>
                    <span className="font-medium">KYC Identity</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-muted-foreground">Issuer</span>
                    <span className="font-mono text-xs">did:web:finatrades.com</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-muted-foreground">Algorithm</span>
                    <span className="font-mono text-sm">RS256</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-muted-foreground">Standard</span>
                    <span className="text-sm">W3C VC 2.0</span>
                  </div>
                  <div className="p-4">
                    <span className="text-sm text-muted-foreground block mb-2">Credential ID</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {credentialData.credentialId}
                      </code>
                      <Button size="sm" variant="ghost" onClick={handleCopyCredentialId} data-testid="copy-id-button">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="hynex-card overflow-hidden">
                <div className="p-4 border-b border-border/60 flex justify-between items-center">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Presentation History
                  </h3>
                  <Button size="sm" variant="ghost" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <div className="divide-y divide-border/60">
                  {!presentationsData?.presentations?.length ? (
                    <div className="p-8 text-center">
                      <Eye className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No presentations yet</p>
                      <p className="text-xs text-muted-foreground">Your credential hasn't been shared</p>
                    </div>
                  ) : (
                    presentationsData.presentations.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          p.verificationSuccessful ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                        }`}>
                          {p.verificationSuccessful ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{p.verifierName || p.verifierDomain}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(p.presentedAt), 'MMM dd, yyyy \'at\' h:mm a')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {p.presentationContext || 'Verified'}
                        </Badge>
                      </div>
                    ))
                  )}
                  
                  {/* Always show credential issued event */}
                  <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950/20/50">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-purple-800 dark:text-purple-200">Credential Issued</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        {credentialData.issuedAt 
                          ? format(new Date(credentialData.issuedAt), 'MMM dd, yyyy \'at\' h:mm a')
                          : 'Date unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl py-6"
                onClick={handleDownload}
                data-testid="download-credential-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button 
                className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white rounded-xl py-6"
                onClick={handleShare}
                data-testid="share-button"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
