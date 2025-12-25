import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, CheckCircle, Loader2, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface TradeCertificateData {
  id: string;
  certificateNumber: string;
  type: string;
  tradeValueUsd: string;
  settlementGoldGrams: string;
  goodsDescription?: string;
  incoterms?: string;
  issuedAt: string;
  signedBy?: string;
}

interface TradeCertificateProps {
  tradeRequestId: string;
  tradeRefId: string;
  importerName: string;
  exporterName?: string;
  goodsName: string;
  tradeValueUsd: string;
  settlementGoldGrams: string;
  incoterms?: string;
  certificates?: TradeCertificateData[];
}

export default function TradeCertificate({
  tradeRequestId,
  tradeRefId,
  importerName,
  exporterName,
  goodsName,
  tradeValueUsd,
  settlementGoldGrams,
  incoterms,
  certificates = [],
}: TradeCertificateProps) {
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<TradeCertificateData | null>(null);

  const generatePDF = async (cert: TradeCertificateData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFillColor(139, 69, 255);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FINATRADES', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(14);
    doc.text('TRADE FINANCE CERTIFICATE', pageWidth / 2, 38, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Certificate No: ${cert.certificateNumber}`, 15, 65);
    doc.text(`Date: ${new Date(cert.issuedAt).toLocaleDateString()}`, pageWidth - 15, 65, { align: 'right' });
    
    doc.setDrawColor(139, 69, 255);
    doc.setLineWidth(0.5);
    doc.line(15, 75, pageWidth - 15, 75);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(cert.type.toUpperCase(), pageWidth / 2, 90, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    let y = 110;
    const lineHeight = 10;
    
    const addField = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 80, y);
      y += lineHeight;
    };
    
    addField('Trade Reference', tradeRefId);
    addField('Importer', importerName);
    if (exporterName) addField('Exporter', exporterName);
    addField('Goods', goodsName);
    addField('Trade Value', `USD ${parseFloat(tradeValueUsd).toLocaleString()}`);
    addField('Settlement Gold', `${parseFloat(settlementGoldGrams).toFixed(4)} grams`);
    if (incoterms) addField('Incoterms', incoterms);
    
    y += 15;
    doc.setFillColor(245, 245, 255);
    doc.rect(15, y, pageWidth - 30, 35, 'F');
    
    y += 15;
    doc.setFontSize(10);
    doc.text('This certificate confirms that the above trade has been successfully processed', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.text('through the Finatrades platform with gold-backed settlement.', pageWidth / 2, y, { align: 'center' });
    
    y += 40;
    doc.setDrawColor(0, 0, 0);
    doc.line(30, y, 80, y);
    doc.line(pageWidth - 80, y, pageWidth - 30, y);
    
    y += 7;
    doc.setFontSize(9);
    doc.text('Authorized Signature', 55, y, { align: 'center' });
    doc.text('Date & Seal', pageWidth - 55, y, { align: 'center' });
    
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFillColor(245, 245, 245);
    doc.rect(0, footerY - 10, pageWidth, 30, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This is a digitally generated certificate from Finatrades Trade Finance Platform', pageWidth / 2, footerY, { align: 'center' });
    doc.text('© 2025 Finatrades. All Rights Reserved.', pageWidth / 2, footerY + 6, { align: 'center' });
    
    return doc;
  };

  const handleDownload = async (cert: TradeCertificateData) => {
    try {
      const doc = await generatePDF(cert);
      doc.save(`Trade-Certificate-${cert.certificateNumber}.pdf`);
      toast.success('Certificate downloaded');
    } catch (error) {
      toast.error('Failed to generate certificate');
    }
  };

  const handlePreview = async (cert: TradeCertificateData) => {
    setSelectedCert(cert);
    setPreviewOpen(true);
  };

  const handleGenerateCertificate = async (type: string) => {
    setGenerating(true);
    try {
      const response = await fetch('/api/finabridge/certificates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({
          tradeRequestId,
          type,
        }),
      });

      if (response.ok) {
        toast.success(`${type} generated successfully`);
      } else {
        throw new Error('Failed to generate certificate');
      }
    } catch (error) {
      toast.error('Failed to generate certificate');
    } finally {
      setGenerating(false);
    }
  };

  const getCertTypeIcon = (type: string) => {
    switch (type) {
      case 'Trade Confirmation': return FileText;
      case 'Settlement Certificate': return CheckCircle;
      case 'Completion Certificate': return Award;
      default: return FileText;
    }
  };

  const getCertTypeColor = (type: string) => {
    switch (type) {
      case 'Trade Confirmation': return 'bg-blue-100 text-blue-700';
      case 'Settlement Certificate': return 'bg-green-100 text-green-700';
      case 'Completion Certificate': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Trade Certificates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {certificates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No certificates generated yet</p>
              <p className="text-sm mt-1">Certificates will be available after trade milestones are reached.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {certificates.map((cert) => {
                const Icon = getCertTypeIcon(cert.type);
                return (
                  <div 
                    key={cert.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Icon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cert.type}</span>
                          <Badge className={getCertTypeColor(cert.type)} variant="secondary">
                            {cert.certificateNumber}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePreview(cert)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(cert)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          {selectedCert && (
            <div className="border rounded-lg p-6 bg-white">
              <div className="text-center mb-6 pb-4 border-b-2 border-purple-500">
                <h2 className="text-2xl font-bold text-purple-600">FINATRADES</h2>
                <p className="text-sm text-muted-foreground">Trade Finance Certificate</p>
              </div>
              
              <div className="text-center mb-6">
                <Badge className={getCertTypeColor(selectedCert.type)} variant="secondary">
                  {selectedCert.type}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Certificate No: {selectedCert.certificateNumber}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Trade Reference</p>
                  <p className="font-medium">{tradeRefId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Importer</p>
                  <p className="font-medium">{importerName}</p>
                </div>
                {exporterName && (
                  <div>
                    <p className="text-muted-foreground">Exporter</p>
                    <p className="font-medium">{exporterName}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Goods</p>
                  <p className="font-medium">{goodsName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trade Value</p>
                  <p className="font-medium">USD {parseFloat(tradeValueUsd).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Settlement Gold</p>
                  <p className="font-medium">{parseFloat(settlementGoldGrams).toFixed(4)}g</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-xs text-muted-foreground">
                  Issued on {new Date(selectedCert.issuedAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button onClick={() => handleDownload(selectedCert)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
