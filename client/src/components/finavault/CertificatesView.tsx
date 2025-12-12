import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Award, Box, ShieldCheck, Download, FileText, ChevronRight } from 'lucide-react';

interface Certificate {
  id: string;
  certificateNumber: string;
  userId: string;
  transactionId: string | null;
  vaultHoldingId: string | null;
  type: 'Digital Ownership' | 'Physical Storage';
  status: 'Active' | 'Updated' | 'Cancelled' | 'Transferred';
  goldGrams: string;
  goldPriceUsdPerGram: string | null;
  totalValueUsd: string | null;
  issuer: string;
  vaultLocation: string | null;
  wingoldStorageRef: string | null;
  issuedAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
}

interface CertificateDetailModalProps {
  certificate: Certificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CertificateDetailModal({ certificate, open, onOpenChange }: CertificateDetailModalProps) {
  if (!certificate) return null;

  const isDigitalOwnership = certificate.type === 'Digital Ownership';
  const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const goldGrams = parseFloat(certificate.goldGrams || '0');
  const totalValue = parseFloat(certificate.totalValueUsd || '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#0D0515] border-white/10 p-0 overflow-hidden">
        <div className={`relative p-8 md:p-12 border-8 border-double m-2 shadow-2xl ${
          isDigitalOwnership 
            ? 'border-[#D4AF37]/30' 
            : 'border-[#C0C0C0]/30'
        }`}>
          
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            {isDigitalOwnership ? (
              <Award className="w-96 h-96" />
            ) : (
              <Box className="w-96 h-96" />
            )}
          </div>

          <div className="text-center space-y-4 mb-10 relative z-10">
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
                isDigitalOwnership 
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]' 
                  : 'bg-[#C0C0C0]/10 border-[#C0C0C0]'
              }`}>
                {isDigitalOwnership ? (
                  <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
                ) : (
                  <Box className="w-8 h-8 text-[#C0C0C0]" />
                )}
              </div>
            </div>
            <h2 className={`text-3xl md:text-4xl font-serif tracking-wider uppercase ${
              isDigitalOwnership ? 'text-[#D4AF37]' : 'text-[#C0C0C0]'
            }`}>
              Certificate
            </h2>
            <h3 className="text-lg text-white/80 font-serif tracking-widest uppercase">
              {isDigitalOwnership ? 'of Digital Ownership' : 'of Physical Storage'}
            </h3>
            <p className="text-white/40 text-sm font-mono">{certificate.certificateNumber}</p>
            <Badge variant={certificate.status === 'Active' ? 'default' : 'secondary'} className={
              certificate.status === 'Active' ? 'bg-green-600' : ''
            }>
              {certificate.status}
            </Badge>
          </div>

          <div className="space-y-6 text-center relative z-10">
            <p className="text-lg text-white/80 leading-relaxed max-w-xl mx-auto">
              {isDigitalOwnership ? (
                <>This certifies that the holder is the beneficial owner of <strong>{goldGrams.toFixed(4)}g</strong> of fine gold, secured and recorded in the Finatrades digital ledger.</>
              ) : (
                <>This certifies that <strong>{goldGrams.toFixed(4)}g</strong> of physical gold is securely stored at <strong>{certificate.vaultLocation}</strong> under custody of <strong>{certificate.issuer}</strong>.</>
              )}
            </p>

            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 border-y py-6 my-6 ${
              isDigitalOwnership ? 'border-[#D4AF37]/20' : 'border-[#C0C0C0]/20'
            }`}>
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${
                  isDigitalOwnership ? 'text-[#D4AF37]' : 'text-[#C0C0C0]'
                }`}>Gold Weight</p>
                <p className="text-xl font-bold text-white">{goldGrams.toFixed(4)}g</p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${
                  isDigitalOwnership ? 'text-[#D4AF37]' : 'text-[#C0C0C0]'
                }`}>Purity</p>
                <p className="text-xl font-bold text-white">999.9</p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${
                  isDigitalOwnership ? 'text-[#D4AF37]' : 'text-[#C0C0C0]'
                }`}>Value (USD)</p>
                <p className="text-xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${
                  isDigitalOwnership ? 'text-[#D4AF37]' : 'text-[#C0C0C0]'
                }`}>Storage Ref</p>
                <p className="text-sm font-mono font-bold text-white">{certificate.wingoldStorageRef || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-8">
              <div className="text-center">
                <p className="text-white font-medium mb-1">{issueDate}</p>
                <Separator className={`w-32 mb-1 mx-auto ${
                  isDigitalOwnership ? 'bg-[#D4AF37]/40' : 'bg-[#C0C0C0]/40'
                }`} />
                <p className={`text-xs uppercase tracking-wider ${
                  isDigitalOwnership ? 'text-[#D4AF37]' : 'text-[#C0C0C0]'
                }`}>Date of Issue</p>
              </div>
              <div className="text-center">
                <p className="text-white font-medium mb-1">{certificate.issuer}</p>
                <Separator className={`w-32 mb-1 mx-auto ${
                  isDigitalOwnership ? 'bg-[#D4AF37]/40' : 'bg-[#C0C0C0]/40'
                }`} />
                <p className={`text-xs uppercase tracking-wider ${
                  isDigitalOwnership ? 'text-[#D4AF37]' : 'text-[#C0C0C0]'
                }`}>Issuing Authority</p>
              </div>
            </div>

            <div className="mt-8 text-[10px] text-white/30 text-center leading-relaxed">
              <p>
                This Certificate is electronically generated and verified through the Platform's secure system. 
                It does not require any physical signature or stamp to be valid.
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-8">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CertificatesView() {
  const { user } = useAuth();
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'digital' | 'storage'>('active');

  const { data, isLoading } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return { certificates: [], activeCertificates: [] };
      const res = await fetch(`/api/certificates/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch certificates');
      return res.json();
    },
    enabled: !!user?.id
  });

  const certificates: Certificate[] = data?.certificates || [];
  const activeCertificates: Certificate[] = data?.activeCertificates || [];

  const filteredCertificates = certificates.filter(cert => {
    if (filter === 'active') return cert.status === 'Active';
    if (filter === 'digital') return cert.type === 'Digital Ownership';
    if (filter === 'storage') return cert.type === 'Physical Storage';
    return true;
  });

  const openCertificate = (cert: Certificate) => {
    setSelectedCertificate(cert);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="certificates-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">My Certificates</h2>
          <p className="text-white/60">View your Digital Ownership and Physical Storage certificates</p>
        </div>
        <Badge variant="outline" className="text-[#D4AF37] border-[#D4AF37]">
          {activeCertificates.length} Active
        </Badge>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="bg-white/5 mb-4">
          <TabsTrigger value="active" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
            Active
          </TabsTrigger>
          <TabsTrigger value="digital" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
            Digital Ownership
          </TabsTrigger>
          <TabsTrigger value="storage" className="data-[state=active]:bg-[#C0C0C0] data-[state=active]:text-black">
            Physical Storage
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-white/20">
            All History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredCertificates.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">No certificates found</p>
            <p className="text-white/40 text-sm mt-2">Certificates are issued when you buy, receive, or deposit gold</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCertificates.map((cert) => {
            const isDigital = cert.type === 'Digital Ownership';
            const goldGrams = parseFloat(cert.goldGrams || '0');
            const totalValue = parseFloat(cert.totalValueUsd || '0');
            
            return (
              <Card 
                key={cert.id} 
                className={`bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-colors ${
                  cert.status !== 'Active' ? 'opacity-60' : ''
                }`}
                onClick={() => openCertificate(cert)}
                data-testid={`certificate-card-${cert.id}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    isDigital ? 'bg-[#D4AF37]/20' : 'bg-[#C0C0C0]/20'
                  }`}>
                    {isDigital ? (
                      <Award className={`w-6 h-6 ${isDigital ? 'text-[#D4AF37]' : 'text-[#C0C0C0]'}`} />
                    ) : (
                      <Box className="w-6 h-6 text-[#C0C0C0]" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isDigital ? 'text-[#D4AF37]' : 'text-[#C0C0C0]'}`}>
                        {cert.type}
                      </span>
                      <Badge variant={cert.status === 'Active' ? 'default' : 'secondary'} className={`text-xs ${
                        cert.status === 'Active' ? 'bg-green-600' : ''
                      }`}>
                        {cert.status}
                      </Badge>
                    </div>
                    <p className="text-white/60 text-sm truncate">{cert.certificateNumber}</p>
                    <p className="text-white/40 text-xs">Issued by {cert.issuer}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-white font-bold">{goldGrams.toFixed(4)}g</p>
                    <p className="text-white/60 text-sm">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CertificateDetailModal 
        certificate={selectedCertificate} 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />
    </div>
  );
}
