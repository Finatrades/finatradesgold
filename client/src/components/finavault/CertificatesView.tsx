import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Award, Box, ShieldCheck, Download, FileText, ChevronRight, ArrowRight, Send } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface Certificate {
  id: string;
  certificateNumber: string;
  userId: string;
  transactionId: string | null;
  vaultHoldingId: string | null;
  type: string;
  status: 'Active' | 'Updated' | 'Cancelled' | 'Transferred';
  goldGrams: string;
  remainingGrams: string | null;
  goldPriceUsdPerGram: string | null;
  totalValueUsd: string | null;
  issuer: string;
  vaultLocation: string | null;
  wingoldStorageRef: string | null;
  goldWalletType: 'MPGW' | 'FPGW' | null;
  fromUserId: string | null;
  toUserId: string | null;
  fromUserName: string | null;
  toUserName: string | null;
  issuedAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  parentCertificateId: string | null;
}

interface CertificateDetailModalProps {
  certificate: Certificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CertificateDetailModal({ certificate, open, onOpenChange }: CertificateDetailModalProps) {
  const { toast } = useToast();
  
  if (!certificate) return null;

  const isDigitalOwnership = certificate.type === 'Digital Ownership' || certificate.type === 'BNSL Lock' || certificate.type === 'Trade Lock' || certificate.type === 'Trade Release';
  const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const originalGrams = parseFloat(certificate.goldGrams || '0');
  const remainingGrams = parseFloat(certificate.remainingGrams || certificate.goldGrams || '0');
  const goldGrams = remainingGrams; // Use remaining grams for display
  const hasPartialSurrender = remainingGrams < originalGrams;
  const totalValue = parseFloat(certificate.totalValueUsd || '0');
  
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    if (isDigitalOwnership) {
      // Dark background for digital ownership
      doc.setFillColor(13, 5, 21);
      doc.rect(0, 0, pageWidth, 297, 'F');
      
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(28);
      doc.text('CERTIFICATE', pageWidth / 2, 40, { align: 'center' });
      doc.setFontSize(14);
      doc.text('of Digital Ownership', pageWidth / 2, 52, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(certificate.certificateNumber, pageWidth / 2, 62, { align: 'center' });
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`This certifies that the holder is the beneficial owner of`, pageWidth / 2, 85, { align: 'center' });
      doc.text(`${goldGrams.toFixed(4)}g of fine gold, secured in the Finatrades ledger.`, pageWidth / 2, 93, { align: 'center' });
      
      // Details grid
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(10);
      const detailsY = 115;
      doc.text('GOLD WEIGHT', 30, detailsY);
      doc.text('PURITY', 75, detailsY);
      doc.text('VALUE (USD)', 120, detailsY);
      doc.text('ISSUER', 165, detailsY);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(`${goldGrams.toFixed(4)}g`, 30, detailsY + 10);
      doc.text('999.9', 75, detailsY + 10);
      doc.text(`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 120, detailsY + 10);
      doc.text(certificate.issuer, 165, detailsY + 10);
      
      // Footer
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(`Issued: ${issueDate}`, pageWidth / 2, 250, { align: 'center' });
      doc.text('This Certificate is electronically generated and verified through the Platform\'s secure system.', pageWidth / 2, 258, { align: 'center' });
      doc.text('It does not require any physical signature or stamp to be valid.', pageWidth / 2, 264, { align: 'center' });
    } else {
      // White background for physical storage
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 297, 'F');
      
      // Header
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.text('CERTIFICATE', pageWidth / 2, 30, { align: 'center' });
      doc.setFontSize(14);
      doc.text('of Physical Storage', pageWidth / 2, 40, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(certificate.certificateNumber, pageWidth / 2, 50, { align: 'center' });
      
      // Main content
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`This certifies that ${goldGrams.toFixed(4)}g of physical gold is securely stored at`, pageWidth / 2, 75, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(certificate.vaultLocation || 'N/A', pageWidth / 2, 85, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`under custody of ${certificate.issuer}.`, pageWidth / 2, 95, { align: 'center' });
      
      // Details box
      doc.setDrawColor(0, 0, 0);
      doc.rect(30, 110, pageWidth - 60, 50);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('GOLD WEIGHT', 40, 125);
      doc.text('PURITY', 80, 125);
      doc.text('VALUE (USD)', 120, 125);
      doc.text('STORAGE REF', 160, 125);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`${goldGrams.toFixed(4)}g`, 40, 140);
      doc.text('999.9', 80, 140);
      doc.text(`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 120, 140);
      doc.text(certificate.wingoldStorageRef || 'N/A', 160, 140);
      
      // Footer
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Issued: ${issueDate}`, 40, 200);
      doc.text(`Issuing Authority: ${certificate.issuer}`, 40, 210);
      
      doc.setFontSize(8);
      doc.text('This Certificate is electronically generated and verified through the Platform\'s secure system.', pageWidth / 2, 260, { align: 'center' });
      doc.text('It does not require any physical signature or stamp to be valid.', pageWidth / 2, 268, { align: 'center' });
    }
    
    const filename = `${certificate.type.replace(/\s+/g, '_')}_${certificate.certificateNumber}.pdf`;
    doc.save(filename);
    
    toast({
      title: "Certificate Downloaded",
      description: `${certificate.type} certificate has been saved as PDF.`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] bg-[#0D0515] border-white/10 p-0 overflow-y-auto">
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
            <div className="flex items-center justify-center gap-2">
              <Badge variant={certificate.status === 'Active' ? 'default' : 'secondary'} className={
                certificate.status === 'Active' ? 'bg-green-600' : ''
              }>
                {certificate.status}
              </Badge>
              {certificate.goldWalletType && (
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="outline" className={`px-3 py-1 ${
                    certificate.goldWalletType === 'FPGW' 
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10' 
                      : 'border-amber-500 text-amber-400 bg-amber-500/10'
                  }`}>
                    {certificate.goldWalletType === 'FPGW' ? '🔒 FPGW - Fixed Price Gold' : '📈 MPGW - Market Price Gold'}
                  </Badge>
                  <p className="text-xs text-white/50 max-w-xs text-center">
                    {certificate.goldWalletType === 'FPGW' 
                      ? 'Value locked at purchase price • Backed by cash reserve' 
                      : 'Value follows live gold price • Backed by physical gold'}
                  </p>
                </div>
              )}
            </div>
            
            {hasPartialSurrender && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-4 text-sm">
                <p className="text-amber-400">
                  Partial Surrender: {(originalGrams - remainingGrams).toFixed(4)}g converted to FPGW
                </p>
                <p className="text-white/60 text-xs mt-1">
                  Original: {originalGrams.toFixed(4)}g → Current: {remainingGrams.toFixed(4)}g
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6 text-center relative z-10">
            {/* Show transfer parties for Transfer certificates */}
            {certificate.type === 'Transfer' && (certificate.fromUserName || certificate.toUserName) && (
              <div className="bg-white/5 border border-[#D4AF37]/20 rounded-lg p-4 mb-4">
                <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-3">Transfer of Ownership</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-white/50 mb-1">From</p>
                    <p className="font-semibold text-white">{certificate.fromUserName || 'Unknown'}</p>
                  </div>
                  <div className="text-[#D4AF37] text-xl">→</div>
                  <div className="text-left">
                    <p className="text-xs text-white/50 mb-1">To</p>
                    <p className="font-semibold text-white">{certificate.toUserName || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-lg text-white/80 leading-relaxed max-w-xl mx-auto">
              {certificate.type === 'Transfer' ? (
                <>This certifies the transfer of <strong>{goldGrams.toFixed(4)}g</strong> of fine gold between Finatrades users.</>
              ) : isDigitalOwnership ? (
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
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={handleDownloadPDF}
              data-testid="button-download-certificate-pdf"
            >
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
  const [filter, setFilter] = useState<'all' | 'active' | 'digital' | 'storage' | 'transfer'>('active');

  const { data, isLoading } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return { certificates: [], activeCertificates: [] };
      const res = await fetch(`/api/certificates/${user.id}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch certificates');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const certificates: Certificate[] = data?.certificates || [];
  const activeCertificates: Certificate[] = data?.activeCertificates || [];

  const filteredCertificates = certificates.filter(cert => {
    if (filter === 'active') return cert.status === 'Active';
    if (filter === 'digital') return cert.type === 'Digital Ownership' || cert.type === 'BNSL Lock' || cert.type === 'Trade Lock' || cert.type === 'Trade Release';
    if (filter === 'storage') return cert.type === 'Physical Storage';
    if (filter === 'transfer') return cert.type === 'Transfer';
    return true;
  });

  const openCertificate = (cert: Certificate) => {
    setSelectedCertificate(cert);
    setModalOpen(true);
  };

  // Show loading if user auth is pending OR initial query load (no data yet)
  const isInitialLoading = !user?.id || (isLoading && !data);
  
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="certificates-view">
      <Card className="bg-white border">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">My Certificates</CardTitle>
              <p className="text-muted-foreground text-sm">View your Digital Ownership and Physical Storage certificates</p>
            </div>
            <Badge variant="outline" className="text-fuchsia-600 border-purple-500">
              {activeCertificates.length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
            <TabsList className="bg-muted mb-6 flex-wrap">
              <TabsTrigger value="active" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                Active
              </TabsTrigger>
              <TabsTrigger value="digital" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                Digital Ownership
              </TabsTrigger>
              <TabsTrigger value="storage" className="data-[state=active]:bg-gray-500 data-[state=active]:text-white">
                Physical Storage
              </TabsTrigger>
              <TabsTrigger value="transfer" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Transfers
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
                All History
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredCertificates.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No Certificates Found</h3>
              <p className="text-muted-foreground">
                Certificates are issued when you buy, receive, or deposit gold.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCertificates.map((cert) => {
                const isDigital = cert.type !== 'Physical Storage';
                const isTransfer = cert.type === 'Transfer';
                const originalGrams = parseFloat(cert.goldGrams || '0');
                const remainingGrams = parseFloat(cert.remainingGrams || cert.goldGrams || '0');
                const goldGrams = remainingGrams;
                const hasPartialSurrender = remainingGrams < originalGrams;
                const totalValue = parseFloat(cert.totalValueUsd || '0');
                
                return (
                  <div 
                    key={cert.id} 
                    className={`p-4 rounded-xl border bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors flex items-center gap-4 ${
                      cert.status !== 'Active' ? 'opacity-60' : ''
                    }`}
                    onClick={() => openCertificate(cert)}
                    data-testid={`certificate-card-${cert.id}`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isTransfer ? 'bg-orange-100' : isDigital ? 'bg-purple-100' : 'bg-gray-200'
                    }`}>
                      {isTransfer ? (
                        <Send className="w-6 h-6 text-orange-600" />
                      ) : isDigital ? (
                        <Award className="w-6 h-6 text-fuchsia-600" />
                      ) : (
                        <Box className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${isTransfer ? 'text-orange-600' : isDigital ? 'text-fuchsia-600' : 'text-gray-600'}`}>
                          {cert.type}
                        </span>
                        <Badge variant={cert.status === 'Active' ? 'default' : 'secondary'} className={`text-xs ${
                          cert.status === 'Active' ? 'bg-green-600' : ''
                        }`}>
                          {cert.status}
                        </Badge>
                        {cert.goldWalletType && (
                          <Badge variant="outline" className={`text-xs ${
                            cert.goldWalletType === 'FPGW' 
                              ? 'border-blue-500 text-blue-600 bg-blue-50' 
                              : 'border-amber-500 text-amber-600 bg-amber-50'
                          }`}>
                            {cert.goldWalletType === 'FPGW' ? '🔒 Fixed' : '📈 Market'}
                          </Badge>
                        )}
                      </div>
                      {isTransfer && (cert.fromUserName || cert.toUserName) ? (
                        <p className="text-sm truncate">
                          <span className="text-muted-foreground">{cert.fromUserName || 'Unknown'}</span>
                          <ArrowRight className="w-3 h-3 inline mx-1 text-orange-500" />
                          <span className="text-muted-foreground">{cert.toUserName || 'Unknown'}</span>
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-sm truncate">{cert.certificateNumber}</p>
                      )}
                      <p className="text-muted-foreground/70 text-xs">Issued by {cert.issuer}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-foreground">{goldGrams.toFixed(4)}g</p>
                      {hasPartialSurrender && (
                        <p className="text-amber-500 text-xs">of {originalGrams.toFixed(4)}g</p>
                      )}
                      <p className="text-muted-foreground text-sm">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CertificateDetailModal 
        certificate={selectedCertificate} 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />
    </div>
  );
}
