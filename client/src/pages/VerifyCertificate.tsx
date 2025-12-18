import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Link, useSearch } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { 
  Shield, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, Loader2, Award, Calendar, MapPin,
  ArrowRight, User, Building2, Clock, Hash, Coins, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import FinatradesLogo from '@/components/FinatradesLogo';

interface LedgerEvent {
  eventType: string;
  timestamp: string;
  goldGrams: string;
  valueUsd: string | null;
  fromFinatradesId: string | null;
  fromAccountType: string | null;
  toFinatradesId: string | null;
  toAccountType: string | null;
  action: string | null;
  eventHash: string;
}

interface CertificateVerificationResult {
  verificationResult: 'genuine_active' | 'genuine_expired' | 'invalid' | 'error';
  message: string;
  certificateNumber?: string;
  certificate?: {
    certificateNumber: string;
    type: string;
    goldGrams: string;
    goldPriceUsdPerGram: string | null;
    totalValueUsd: string | null;
    issuer: string;
    vaultLocation: string | null;
    status: string;
    issuedAt: string;
    expiresAt: string | null;
    holderFinatradesId?: string;
    holderAccountType?: string;
  };
  ledgerHistory?: LedgerEvent[];
  summary?: {
    totalEvents: number;
    lastEventAt: string | null;
    isTransfer: boolean;
  };
}

export default function VerifyCertificate() {
  const searchString = useSearch();
  const [certificateNumber, setCertificateNumber] = useState('');
  const [result, setResult] = useState<CertificateVerificationResult | null>(null);
  const [autoVerified, setAutoVerified] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: async (certNumber: string): Promise<CertificateVerificationResult> => {
      const response = await fetch('/api/certificates/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateNumber: certNumber }),
      });
      if (!response.ok) {
        throw new Error('Verification failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => {
      setResult({
        verificationResult: 'error',
        message: 'Unable to verify certificate. Please try again later.'
      });
    }
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (certificateNumber.trim()) {
      verifyMutation.mutate(certificateNumber.trim());
    }
  };

  useEffect(() => {
    if (searchString && !autoVerified) {
      const params = new URLSearchParams(searchString);
      const certFromUrl = params.get('cert');
      if (certFromUrl) {
        setCertificateNumber(certFromUrl.toUpperCase());
        setAutoVerified(true);
        verifyMutation.mutate(certFromUrl.trim());
      }
    }
  }, [searchString, autoVerified]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getResultIcon = () => {
    if (!result) return null;
    switch (result.verificationResult) {
      case 'genuine_active':
        return <CheckCircle2 className="w-16 h-16 text-success" />;
      case 'genuine_expired':
        return <AlertTriangle className="w-16 h-16 text-warning" />;
      case 'invalid':
        return <XCircle className="w-16 h-16 text-destructive" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-muted-foreground" />;
    }
  };

  const getResultColor = () => {
    if (!result) return '';
    switch (result.verificationResult) {
      case 'genuine_active':
        return 'bg-success-muted border-success';
      case 'genuine_expired':
        return 'bg-warning-muted border-warning';
      case 'invalid':
        return 'bg-error-muted border-destructive';
      default:
        return 'bg-muted border-border';
    }
  };

  const getResultTitle = () => {
    if (!result) return '';
    switch (result.verificationResult) {
      case 'genuine_active':
        return 'Certificate Verified';
      case 'genuine_expired':
        return 'Certificate Expired';
      case 'invalid':
        return 'Certificate Not Found';
      default:
        return 'Verification Error';
    }
  };

  const getEventIcon = (eventType: string) => {
    const type = eventType.toUpperCase();
    if (type.includes('DEPOSIT')) return <ArrowDownRight className="w-4 h-4" />;
    if (type.includes('TRANSFER SEND') || type.includes('WITHDRAWAL')) return <ArrowUpRight className="w-4 h-4" />;
    if (type.includes('TRANSFER RECEIVE')) return <ArrowDownRight className="w-4 h-4" />;
    if (type.includes('TRANSFER')) return <ArrowRight className="w-4 h-4" />;
    if (type.includes('EXPIRED')) return <Clock className="w-4 h-4" />;
    if (type.includes('REVOKED')) return <XCircle className="w-4 h-4" />;
    if (type.includes('CERTIFICATE')) return <Award className="w-4 h-4" />;
    if (type.includes('LOCK') || type.includes('BNSL')) return <Shield className="w-4 h-4" />;
    return <Hash className="w-4 h-4" />;
  };

  const getEventColor = (eventType: string) => {
    const type = eventType.toUpperCase();
    if (type.includes('DEPOSIT') || type.includes('RECEIVE')) return 'bg-green-500';
    if (type.includes('WITHDRAWAL') || type.includes('SEND')) return 'bg-orange-500';
    if (type.includes('TRANSFER')) return 'bg-blue-500';
    if (type.includes('EXPIRED')) return 'bg-yellow-500';
    if (type.includes('REVOKED')) return 'bg-red-500';
    if (type.includes('CERTIFICATE ISSUED')) return 'bg-primary';
    if (type.includes('LOCK')) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  const getEventLabel = (eventType: string) => {
    return eventType.split('_').join(' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const AccountBadge = ({ finatradesId, accountType }: { finatradesId: string | null; accountType: string | null }) => {
    if (!finatradesId) return <span className="text-muted-foreground text-xs">External</span>;
    
    const isPersonal = accountType === 'personal';
    return (
      <div className="flex items-center gap-1">
        {isPersonal ? (
          <User className="w-3 h-3 text-blue-500" />
        ) : (
          <Building2 className="w-3 h-3 text-purple-500" />
        )}
        <span className="font-mono text-xs font-medium">{finatradesId}</span>
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {isPersonal ? 'Personal' : 'Corporate'}
        </Badge>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <FinatradesLogo size="sm" showText />
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Certificate Explorer</h1>
            <p className="text-muted-foreground">
              Verify and explore Finatrades gold certificates. View transaction history like a blockchain explorer.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Enter Certificate Number
              </CardTitle>
              <CardDescription>
                The certificate number is located on your digital or physical certificate (e.g., FT-DOC-XXXXX-XXXX)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="certificateNumber">Certificate Number</Label>
                  <Input
                    id="certificateNumber"
                    placeholder="Enter certificate number (e.g., FT-DOC-XXXXX-XXXX)"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value.toUpperCase())}
                    className="text-lg font-mono"
                    data-testid="input-certificate-number"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90"
                  disabled={!certificateNumber.trim() || verifyMutation.isPending}
                  data-testid="button-verify-certificate"
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Verify Certificate
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {result && (
            <>
              <Card className={`border-2 ${getResultColor()} mb-6`} data-testid="verification-result">
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                      {getResultIcon()}
                    </div>
                    <h2 className="text-2xl font-bold mb-2" data-testid="text-result-title">{getResultTitle()}</h2>
                    <p className="text-muted-foreground" data-testid="text-result-message">{result.message}</p>
                  </div>

                  {result.certificate && (
                    <div className="bg-background rounded-lg p-4 space-y-4">
                      <h3 className="font-semibold text-lg border-b pb-2">Certificate Details</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground">Certificate Number</span>
                          <p className="font-mono font-medium" data-testid="text-cert-number">
                            {result.certificate.certificateNumber}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Type</span>
                          <p className="font-medium" data-testid="text-cert-type">
                            {result.certificate.type}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Gold Amount</span>
                          <p className="font-medium text-primary" data-testid="text-cert-gold">
                            {parseFloat(result.certificate.goldGrams).toFixed(6)} grams
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">USD Value</span>
                          <p className="font-medium" data-testid="text-cert-value">
                            ${parseFloat(result.certificate.totalValueUsd || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Issuer</span>
                          <p className="font-medium" data-testid="text-cert-issuer">
                            {result.certificate.issuer}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Status</span>
                          <p className={`font-medium ${
                            result.certificate.status === 'Active' ? 'text-success' : 'text-warning'
                          }`} data-testid="text-cert-status">
                            {result.certificate.status}
                          </p>
                        </div>
                      </div>

                      {result.certificate.holderFinatradesId && (
                        <div className="pt-2 border-t">
                          <span className="text-sm text-muted-foreground">Current Holder (Finatrades ID)</span>
                          <div className="mt-1">
                            <AccountBadge 
                              finatradesId={result.certificate.holderFinatradesId} 
                              accountType={result.certificate.holderAccountType || 'personal'} 
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                        <Calendar className="w-4 h-4" />
                        <span>Issued: {formatDate(result.certificate.issuedAt)}</span>
                      </div>

                      {result.certificate.vaultLocation && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>Vault: {result.certificate.vaultLocation}</span>
                        </div>
                      )}

                      {result.certificate.expiresAt && (
                        <div className="flex items-center gap-2 text-sm text-warning">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Expires: {formatDate(result.certificate.expiresAt)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {result.verificationResult === 'invalid' && (
                    <div className="bg-error-muted rounded-lg p-4 mt-4">
                      <h4 className="font-semibold text-destructive mb-2">What does this mean?</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>The certificate number you entered was not found in our system.</li>
                        <li>Please double-check the certificate number and try again.</li>
                        <li>If you believe this is an error, please contact our support team.</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {result.ledgerHistory && result.ledgerHistory.length > 0 && (
                <Card className="mb-6" data-testid="ledger-history">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-primary" />
                      Transaction History
                    </CardTitle>
                    <CardDescription>
                      Blockchain-style ledger showing all events for this certificate
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      
                      <div className="space-y-6">
                        {result.ledgerHistory.map((event, index) => (
                          <div key={index} className="relative pl-10" data-testid={`ledger-event-${index}`}>
                            <div className={`absolute left-2 w-5 h-5 rounded-full ${getEventColor(event.eventType)} flex items-center justify-center text-white`}>
                              {getEventIcon(event.eventType)}
                            </div>
                            
                            <div className="bg-muted/50 rounded-lg p-4 border">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="font-semibold">
                                  {getEventLabel(event.eventType)}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {event.eventHash}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs">Timestamp</span>
                                  <p className="font-medium">{formatDate(event.timestamp)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Gold Amount</span>
                                  <p className="font-medium text-primary">{parseFloat(event.goldGrams).toFixed(6)} g</p>
                                </div>
                              </div>
                              
                              {(event.fromFinatradesId || event.toFinatradesId) && (
                                <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
                                  {event.fromFinatradesId && (
                                    <div className="flex items-center gap-1">
                                      <ArrowUpRight className="w-3 h-3 text-red-500" />
                                      <span className="text-xs text-muted-foreground">From:</span>
                                      <AccountBadge finatradesId={event.fromFinatradesId} accountType={event.fromAccountType} />
                                    </div>
                                  )}
                                  {event.fromFinatradesId && event.toFinatradesId && (
                                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-2" />
                                  )}
                                  {event.toFinatradesId && (
                                    <div className="flex items-center gap-1">
                                      <ArrowDownRight className="w-3 h-3 text-green-500" />
                                      <span className="text-xs text-muted-foreground">To:</span>
                                      <AccountBadge finatradesId={event.toFinatradesId} accountType={event.toAccountType} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {result.summary && (
                      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                        <span>{result.summary.totalEvents} event(s) recorded</span>
                        {result.summary.lastEventAt && (
                          <span>Last activity: {formatDate(result.summary.lastEventAt)}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setCertificateNumber('');
                    setAutoVerified(false);
                  }}
                  data-testid="button-verify-another"
                >
                  Verify Another Certificate
                </Button>
              </div>
            </>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Need help? Contact our support team at support@finatrades.com</p>
          </div>
        </div>
      </main>
    </div>
  );
}
