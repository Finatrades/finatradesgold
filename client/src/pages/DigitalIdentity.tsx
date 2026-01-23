import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, Download, Share2, CheckCircle, Clock, AlertTriangle,
  User, Mail, Globe, Calendar, FileText, Eye, Fingerprint,
  ExternalLink, Copy, QrCode, RefreshCw, Loader2, Lock
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
  const [activeTab, setActiveTab] = useState('overview');

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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'revoked': return 'bg-red-500';
      case 'expired': return 'bg-yellow-500';
      case 'suspended': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'Verified';
      case 'revoked': return 'Revoked';
      case 'expired': return 'Expired';
      case 'suspended': return 'Suspended';
      default: return 'Unknown';
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">My Digital Identity</h1>
          <p className="text-muted-foreground">
            Your verified digital credential powered by W3C Verifiable Credentials
          </p>
        </div>

        {!credentialData?.hasCredential ? (
          <Card className="border-2 border-dashed border-primary/30">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Fingerprint className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No Digital Identity Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Complete your KYC verification to receive your verified digital identity credential.
              </p>
              <Link href="/kyc">
                <Button className="bg-primary hover:bg-primary/90" data-testid="start-kyc-button">
                  <Shield className="w-4 h-4 mr-2" />
                  Start KYC Verification
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Main Credential Card */}
            <div 
              className="relative overflow-hidden rounded-2xl p-8 text-white"
              style={{
                background: 'linear-gradient(135deg, #8A2BE2 0%, #6B1FA8 50%, #4A1578 100%)',
                boxShadow: '0 20px 60px rgba(138, 43, 226, 0.3)'
              }}
              data-testid="credential-card"
            >
              <div className="absolute top-0 right-0 w-3/4 h-full opacity-10">
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.3) 0%, transparent 70%)'
                  }}
                />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-bold">F</span>
                    </div>
                    <span className="text-xl font-bold tracking-wider">FINATRADES</span>
                  </div>
                  <Badge 
                    className={`${getStatusColor(credentialData.status)} text-white border-0 px-4 py-1`}
                    data-testid="credential-status"
                  >
                    {getStatusLabel(credentialData.status)}
                  </Badge>
                </div>
                
                <div className="mb-6">
                  <div className="text-2xl font-bold mb-1" data-testid="user-name">
                    {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="text-white/80 text-sm" data-testid="user-email">
                    {user?.email}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/20">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Credential Type</div>
                    <div className="font-semibold">KYC Identity</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Issued Date</div>
                    <div className="font-semibold" data-testid="issued-date">
                      {credentialData.issuedAt ? format(new Date(credentialData.issuedAt), 'MMM dd, yyyy') : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Expires</div>
                    <div className="font-semibold" data-testid="expires-date">
                      {credentialData.expiresAt ? format(new Date(credentialData.expiresAt), 'MMM dd, yyyy') : '-'}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/20">
                  <div className="text-xs font-mono text-white/60">
                    ID: {credentialData.credentialId?.slice(0, 20)}...
                  </div>
                  <div className="text-xs text-white/60">
                    Issuer: did:web:finatrades.com
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="details" data-testid="tab-details">Verification Details</TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Verification Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Verification Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {credentialData.claimsSummary?.idVerified && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                          <CheckCircle className="w-3 h-3 mr-1" /> Identity Verified
                        </Badge>
                      )}
                      {credentialData.claimsSummary?.addressVerified && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                          <CheckCircle className="w-3 h-3 mr-1" /> Address Verified
                        </Badge>
                      )}
                      {credentialData.claimsSummary?.amlPassed && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                          <CheckCircle className="w-3 h-3 mr-1" /> AML Passed
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                        <CheckCircle className="w-3 h-3 mr-1" /> Document Verified
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary" data-testid="presentation-count">
                          {credentialData.presentationCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Times Shared</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">
                          {credentialData.claimsSummary?.kycLevel || 'Tier 1'}
                        </div>
                        <div className="text-sm text-muted-foreground">KYC Level</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Credential Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground uppercase mb-1">Full Name</div>
                        <div className="font-medium">{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground uppercase mb-1">KYC Level</div>
                        <div className="font-medium text-green-600">
                          {credentialData.claimsSummary?.kycLevel || 'Verified'}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground uppercase mb-1">Email</div>
                        <div className="font-medium">{user?.email}</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground uppercase mb-1">Account Type</div>
                        <div className="font-medium">Personal</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground uppercase mb-1">Signature Algorithm</div>
                        <div className="font-medium font-mono text-sm">RS256</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground uppercase mb-1">Credential ID</div>
                        <div className="font-medium font-mono text-xs truncate" title={credentialData.credentialId}>
                          {credentialData.credentialId}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Security Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Issuer DID</span>
                      <span className="font-mono text-sm">did:web:finatrades.com</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Standard</span>
                      <span>W3C VC Data Model 2.0</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Format</span>
                      <span className="font-mono text-sm">vc+ld+jwt</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">JWKS Endpoint</span>
                      <span className="font-mono text-xs">/api/.well-known/jwks.json</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Presentation History
                    </CardTitle>
                    <CardDescription>
                      A log of when and where your credential was verified
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!presentationsData?.presentations?.length ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No presentations yet</p>
                        <p className="text-sm">Your credential hasn't been shared with any partners</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {presentationsData.presentations.map((p) => (
                          <div key={p.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              {p.verificationSuccessful ? (
                                <CheckCircle className="w-5 h-5 text-blue-600" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">
                                {p.verifierName || p.verifierDomain}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(p.presentedAt), 'MMM dd, yyyy \'at\' h:mm a')}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {p.presentationContext || 'Verification'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Credential Issuance Event */}
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Credential Issued</div>
                        <div className="text-sm text-muted-foreground">
                          {credentialData.issuedAt 
                            ? format(new Date(credentialData.issuedAt), 'MMM dd, yyyy \'at\' h:mm a')
                            : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleDownload}
                data-testid="download-credential-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Credential
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-primary text-primary hover:bg-primary/5"
                onClick={handleCopyCredentialId}
                data-testid="copy-id-button"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy ID
              </Button>
              <Button 
                variant="outline"
                onClick={() => refetch()}
                data-testid="refresh-button"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
