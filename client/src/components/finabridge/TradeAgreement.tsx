import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  PenTool,
  Shield,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { downloadTradeAgreement } from '@/utils/generateTradeAgreementPdf';
import { useToast } from '@/hooks/use-toast';

interface TradeAgreementProps {
  tradeRef: string;
  importerName: string;
  importerEmail: string;
  exporterName: string;
  exporterEmail: string;
  tradeValue: number;
  goldGrams: number;
  goldPricePerGram: number;
  deliveryTerms: string;
  paymentTerms: string;
  shippingOrigin: string;
  shippingDestination: string;
  estimatedDeliveryDays: number;
  createdAt: string;
  userRole: 'importer' | 'exporter';
  importerSigned?: boolean;
  importerSignedAt?: string;
  exporterSigned?: boolean;
  exporterSignedAt?: string;
  onSign?: (signatureName: string) => Promise<void>;
}

export function TradeAgreement({
  tradeRef,
  importerName,
  importerEmail,
  exporterName,
  exporterEmail,
  tradeValue,
  goldGrams,
  goldPricePerGram,
  deliveryTerms,
  paymentTerms,
  shippingOrigin,
  shippingDestination,
  estimatedDeliveryDays,
  createdAt,
  userRole,
  importerSigned = false,
  importerSignedAt,
  exporterSigned = false,
  exporterSignedAt,
  onSign
}: TradeAgreementProps) {
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const { toast } = useToast();

  const userHasSigned = userRole === 'importer' ? importerSigned : exporterSigned;
  const bothPartiesSigned = importerSigned && exporterSigned;

  const handleDownload = () => {
    downloadTradeAgreement(
      {
        tradeRef,
        importerName,
        importerEmail,
        exporterName,
        exporterEmail,
        tradeValue,
        goldGrams,
        goldPricePerGram,
        deliveryTerms,
        paymentTerms,
        shippingOrigin,
        shippingDestination,
        estimatedDeliveryDays,
        createdAt
      },
      {
        importerSignature: importerSigned ? importerName : undefined,
        importerSignedAt: importerSignedAt,
        exporterSignature: exporterSigned ? exporterName : undefined,
        exporterSignedAt: exporterSignedAt
      }
    );
    toast({
      title: "Agreement Downloaded",
      description: "The trade agreement PDF has been saved to your device."
    });
  };

  const handleSign = async () => {
    if (!signatureName.trim() || !termsAccepted) return;
    
    setIsSigning(true);
    try {
      if (onSign) {
        await onSign(signatureName);
      }
      setShowSignDialog(false);
      setSignatureName('');
      setTermsAccepted(false);
      toast({
        title: "Agreement Signed",
        description: "Your digital signature has been recorded."
      });
    } catch (error) {
      toast({
        title: "Signing Failed",
        description: "There was an error signing the agreement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <>
      <Card data-testid="trade-agreement-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Trade Agreement
            </CardTitle>
            <Badge 
              variant={bothPartiesSigned ? "default" : "secondary"}
              className={bothPartiesSigned ? "bg-green-500" : ""}
              data-testid="agreement-status-badge"
            >
              {bothPartiesSigned ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Fully Executed</>
              ) : (
                <><Clock className="h-3 w-3 mr-1" /> Pending Signatures</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Trade Reference</p>
              <p className="font-medium" data-testid="text-trade-ref">{tradeRef}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Trade Value</p>
              <p className="font-medium" data-testid="text-trade-value">${tradeValue.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Gold Settlement</p>
              <p className="font-medium" data-testid="text-gold-grams">{goldGrams.toFixed(4)}g</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Agreement Date</p>
              <p className="font-medium">{new Date(createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Signature Status</p>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  importerSigned ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {importerSigned ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Importer</p>
                  <p className="text-xs text-muted-foreground">{importerName}</p>
                </div>
              </div>
              {importerSigned ? (
                <Badge variant="outline" className="text-green-600 border-green-200" data-testid="importer-signed-badge">
                  Signed {importerSignedAt && new Date(importerSignedAt).toLocaleDateString()}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                  Pending
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  exporterSigned ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {exporterSigned ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Exporter</p>
                  <p className="text-xs text-muted-foreground">{exporterName}</p>
                </div>
              </div>
              {exporterSigned ? (
                <Badge variant="outline" className="text-green-600 border-green-200" data-testid="exporter-signed-badge">
                  Signed {exporterSignedAt && new Date(exporterSignedAt).toLocaleDateString()}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                  Pending
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowPreviewDialog(true)}
              data-testid="button-preview-agreement"
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleDownload}
              data-testid="button-download-agreement"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {!userHasSigned && onSign && (
              <Button 
                className="flex-1"
                onClick={() => setShowSignDialog(true)}
                data-testid="button-sign-agreement"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Sign Agreement
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Sign Trade Agreement
            </DialogTitle>
            <DialogDescription>
              Your digital signature will be legally binding. Please review the terms carefully before signing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Important Notice</p>
                  <p className="text-yellow-700 mt-1">
                    By signing this agreement, you confirm that you have read and understood all terms 
                    and conditions. This constitutes a legally binding contract.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature-name">Full Legal Name</Label>
              <Input
                id="signature-name"
                placeholder="Enter your full name as signature"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                data-testid="input-signature-name"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms-accept"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                data-testid="checkbox-terms-accept"
              />
              <label htmlFor="terms-accept" className="text-sm text-muted-foreground leading-tight">
                I have read and agree to the complete Trade Agreement terms including escrow, 
                settlement, and dispute resolution clauses.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSign}
              disabled={!signatureName.trim() || !termsAccepted || isSigning}
              data-testid="button-confirm-signature"
            >
              {isSigning ? "Signing..." : "Confirm & Sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Trade Agreement Preview</DialogTitle>
            <DialogDescription>
              Review the key terms of this trade agreement
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <div className="text-center pb-4 border-b">
                <h2 className="text-xl font-bold text-primary">FINABRIDGE TRADE AGREEMENT</h2>
                <p className="text-muted-foreground">Gold-Backed Trade Finance Contract</p>
                <p className="font-medium mt-2">Trade Reference: {tradeRef}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Importer (Buyer)</h3>
                  <p>{importerName}</p>
                  <p className="text-muted-foreground text-xs">{importerEmail}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Exporter (Seller)</h3>
                  <p>{exporterName}</p>
                  <p className="text-muted-foreground text-xs">{exporterEmail}</p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-semibold mb-3">Trade Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>Trade Value:</div><div className="font-medium">${tradeValue.toLocaleString()}</div>
                  <div>Gold Quantity:</div><div className="font-medium">{goldGrams.toFixed(4)}g</div>
                  <div>Gold Price:</div><div className="font-medium">${goldPricePerGram.toFixed(2)}/g</div>
                  <div>Delivery Terms:</div><div className="font-medium">{deliveryTerms}</div>
                  <div>Payment Terms:</div><div className="font-medium">{paymentTerms}</div>
                  <div>Est. Delivery:</div><div className="font-medium">{estimatedDeliveryDays} days</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">1. Gold-Backed Escrow Mechanism</h3>
                <p className="text-muted-foreground">
                  Upon execution of this Agreement, the Importer shall deposit gold equivalent to the Trade Value 
                  into the FinaBridge escrow account. The escrowed gold remains locked until confirmed delivery, 
                  mutual agreement, or dispute resolution completion.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. Delivery Obligations</h3>
                <p className="text-muted-foreground">
                  The Exporter shall ship goods in accordance with the specified delivery terms and provide 
                  valid shipping documentation including Bill of Lading, Commercial Invoice, Packing List, 
                  and Certificate of Origin.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. Settlement and Release</h3>
                <p className="text-muted-foreground">
                  Upon confirmed delivery and Importer acceptance, escrowed gold shall be released to the 
                  Exporter within 3 business days. Partial settlements are permitted where goods are 
                  delivered in installments.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4. Dispute Resolution</h3>
                <p className="text-muted-foreground">
                  Either party may raise a dispute within 14 days of delivery. Disputes shall first be 
                  subject to mediation through FinaBridge arbitration services. Unresolved disputes shall 
                  be referred to binding arbitration under the rules of the Dubai International Arbitration Centre.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5. Governing Law</h3>
                <p className="text-muted-foreground">
                  This Agreement shall be governed by and construed in accordance with the laws of the 
                  United Arab Emirates. The courts of Dubai shall have exclusive jurisdiction over any 
                  disputes not resolved through arbitration.
                </p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Full PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
