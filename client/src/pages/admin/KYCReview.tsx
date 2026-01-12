import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, FileText, User, Building, RefreshCw, Clock, AlertCircle, Printer, X, Camera, CreditCard, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import AdminOtpModal, { checkOtpRequired } from '@/components/admin/AdminOtpModal';
import { useAdminOtp } from '@/hooks/useAdminOtp';
import { PDFViewer } from '@/components/ui/PDFViewer';

// Helper to detect document type from URL or base64 content
function detectDocumentType(url: string): 'pdf' | 'image' | 'doc' | 'unknown' {
  if (!url) return 'unknown';
  
  // Check data URI MIME types
  if (url.startsWith('data:application/pdf')) return 'pdf';
  if (url.startsWith('data:image/')) return 'image';
  if (url.startsWith('data:application/msword') || 
      url.startsWith('data:application/vnd.openxmlformats-officedocument')) return 'doc';
  
  // Check file extensions
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.pdf')) return 'pdf';
  if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || 
      lowerUrl.endsWith('.png') || lowerUrl.endsWith('.gif') || 
      lowerUrl.endsWith('.webp')) return 'image';
  if (lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx')) return 'doc';
  
  // Check raw base64 magic bytes
  if (url.length > 100 && !url.includes('/')) {
    // PDF magic bytes %PDF- encoded as base64 = JVBERi0
    if (url.startsWith('JVBERi0')) return 'pdf';
    // DOCX/ZIP magic bytes (PK..) = UEsDBBQ or UEsDBA
    if (url.startsWith('UEsDBBQ') || url.startsWith('UEsDBA')) return 'doc';
    // Old DOC magic bytes (D0 CF 11 E0) = 0M8R4KGx
    if (url.startsWith('0M8R4KGx')) return 'doc';
    // Image magic bytes
    if (url.startsWith('/9j/')) return 'image'; // JPEG
    if (url.startsWith('iVBORw')) return 'image'; // PNG
    if (url.startsWith('R0lGOD')) return 'image'; // GIF
    if (url.startsWith('UklGR')) return 'image'; // WEBP
  }
  
  return 'unknown';
}

// Helper to detect if URL is a PDF
function isPdfUrl(url: string): boolean {
  return detectDocumentType(url) === 'pdf';
}

// Helper to detect if URL is a Word document (DOC/DOCX)
function isDocUrl(url: string): boolean {
  return detectDocumentType(url) === 'doc';
}

// Helper to ensure proper document URL format (handles base64 without prefix)
function getDocumentSrc(url: string): string {
  if (!url) return '';
  // If already a data URI or HTTP URL, return as-is
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If looks like base64 (long string without slashes at start), add data URI prefix
  if (url.length > 100 && !url.includes('/')) {
    const docType = detectDocumentType(url);
    
    switch (docType) {
      case 'pdf':
        return `data:application/pdf;base64,${url}`;
      case 'doc':
        // DOCX files
        if (url.startsWith('UEsDBBQ') || url.startsWith('UEsDBA')) {
          return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${url}`;
        }
        // Old DOC files
        return `data:application/msword;base64,${url}`;
      case 'image':
        if (url.startsWith('/9j/')) return `data:image/jpeg;base64,${url}`;
        if (url.startsWith('iVBORw')) return `data:image/png;base64,${url}`;
        if (url.startsWith('R0lGOD')) return `data:image/gif;base64,${url}`;
        if (url.startsWith('UklGR')) return `data:image/webp;base64,${url}`;
        return `data:image/jpeg;base64,${url}`;
      default:
        // Default to octet-stream for unknown types
        return `data:application/octet-stream;base64,${url}`;
    }
  }
  return url;
}

// Alias for backward compatibility
function getImageSrc(url: string): string {
  return getDocumentSrc(url);
}

// Convert base64 data URL to Blob URL for secure PDF viewing
function base64ToBlobUrl(dataUrl: string): string {
  try {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) return dataUrl;
    
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const base64 = parts[1];
    
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Error converting base64 to blob:', e);
    return dataUrl;
  }
}

// In-platform document viewer component that handles images, PDFs, and DOC files
function DocumentViewer({ 
  isOpen, 
  onClose, 
  documentUrl, 
  documentName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  documentUrl: string; 
  documentName: string; 
}) {
  const printRef = useRef<HTMLDivElement>(null);
  
  // Detect document type
  const docType = detectDocumentType(documentUrl);
  const isPdf = docType === 'pdf';
  const isDoc = docType === 'doc';
  // Convert to proper data URL format (adds correct MIME type prefix)
  const formattedUrl = getDocumentSrc(documentUrl);
  const imageSrc = formattedUrl;
  
  // Create blob URL for PDF to avoid iframe security restrictions
  const [pdfBlobUrl, setPdfBlobUrl] = React.useState<string>('');
  const [pdfLoading, setPdfLoading] = React.useState(true);
  const [pdfError, setPdfError] = React.useState(false);
  
  React.useEffect(() => {
    setPdfLoading(true);
    setPdfError(false);
    if (isPdf) {
      // Use the formatted URL which now has proper data: prefix
      if (formattedUrl.startsWith('data:')) {
        const blobUrl = base64ToBlobUrl(formattedUrl);
        setPdfBlobUrl(blobUrl);
        return () => {
          if (blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(blobUrl);
          }
        };
      } else {
        setPdfBlobUrl(formattedUrl);
      }
    }
  }, [formattedUrl, isPdf]);
  
  const handlePrint = () => {
    if (isPdf && pdfBlobUrl) {
      const printWindow = window.open(pdfBlobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${documentName}</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; max-height: 90vh; object-fit: contain; }
              @media print { body { padding: 0; } img { max-height: 100%; } }
            </style>
          </head>
          <body>
            <img src="${imageSrc}" alt="${documentName}" />
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    // Create blob URL for download
    const downloadUrl = formattedUrl.startsWith('data:') ? base64ToBlobUrl(formattedUrl) : formattedUrl;
    link.href = downloadUrl;
    // Determine file extension based on document type
    let fileExt = 'jpg';
    if (isPdf) fileExt = 'pdf';
    else if (isDoc) fileExt = formattedUrl.includes('openxmlformats') ? 'docx' : 'doc';
    link.download = `${documentName.replace(/\s+/g, '_')}.${fileExt}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Clean up blob URL after download
    if (downloadUrl.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }
  };

  const handleOpenInNewTab = () => {
    if (isPdf && pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    } else if (isDoc) {
      // DOC files can't be opened in browser, trigger download instead
      handleDownload();
    } else {
      window.open(imageSrc, '_blank');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{documentName}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenInNewTab} data-testid="button-open-new-tab">
                Open in New Tab
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download-document">
                <FileText className="w-4 h-4 mr-2" /> Download
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-document">
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="flex justify-center items-center overflow-auto max-h-[75vh] bg-gray-100 rounded-lg p-4">
          {isDoc ? (
            /* Word documents can't be previewed in browser */
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded">
              <FileText className="w-16 h-16 mb-4 text-blue-500" />
              <p className="text-gray-700 font-medium mb-2">Word Document</p>
              <p className="text-gray-500 text-sm mb-4 text-center">
                Word documents cannot be previewed in the browser.<br />
                Please download to view the document.
              </p>
              <Button variant="default" onClick={handleDownload} data-testid="button-doc-download">
                Download Document
              </Button>
            </div>
          ) : isPdf ? (
            <div className="w-full h-[70vh]">
              <PDFViewer
                file={formattedUrl}
                className="w-full h-full"
                maxWidth={700}
                showControls={true}
                onLoadSuccess={() => setPdfLoading(false)}
                onLoadError={() => {
                  setPdfLoading(false);
                  setPdfError(true);
                }}
              />
            </div>
          ) : (
            <img 
              src={imageSrc} 
              alt={documentName} 
              className="max-w-full max-h-[65vh] object-contain rounded"
              data-testid="img-document-preview"
              onError={(e) => {
                console.error('Image failed to load:', documentName);
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="14" x="50%25" y="50%25" text-anchor="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KYCReview() {
  const { user: adminUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [fullApplicationData, setFullApplicationData] = useState<any>(null);
  const [loadingFullData, setLoadingFullData] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isOtpModalOpen, pendingAction, requestOtp, handleVerified, closeOtpModal } = useAdminOtp();
  
  // Document viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<{ url: string; name: string }>({ url: '', name: '' });
  
  // Fetch full KYC details when a Finatrades KYC is selected (both corporate and personal)
  useEffect(() => {
    async function fetchFullKycDetails() {
      if (!selectedApplication) {
        setFullApplicationData(null);
        return;
      }
      
      const userId = selectedApplication.userId;
      
      // Fetch full details for corporate KYC submissions
      if (selectedApplication.kycType === 'finatrades_corporate' && userId) {
        setLoadingFullData(true);
        try {
          const res = await fetch(`/api/finatrades-kyc/corporate/${userId}`, {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            if (data.submission) {
              setFullApplicationData({
                ...selectedApplication,
                ...data.submission,
                kycType: 'finatrades_corporate',
                accountType: 'business',
                fullName: data.submission.companyName || selectedApplication.fullName,
              });
            } else {
              setFullApplicationData(selectedApplication);
            }
          } else {
            setFullApplicationData(selectedApplication);
          }
        } catch (error) {
          console.error('Failed to fetch full corporate KYC:', error);
          setFullApplicationData(selectedApplication);
        } finally {
          setLoadingFullData(false);
        }
      }
      // Fetch full details for personal KYC submissions
      else if (selectedApplication.kycType === 'finatrades_personal' && userId) {
        setLoadingFullData(true);
        try {
          const res = await fetch(`/api/finatrades-kyc/personal/${userId}`, {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            if (data.submission) {
              setFullApplicationData({
                ...selectedApplication,
                ...data.submission,
                kycType: 'finatrades_personal',
                accountType: 'personal',
              });
            } else {
              setFullApplicationData(selectedApplication);
            }
          } else {
            setFullApplicationData(selectedApplication);
          }
        } catch (error) {
          console.error('Failed to fetch full personal KYC:', error);
          setFullApplicationData(selectedApplication);
        } finally {
          setLoadingFullData(false);
        }
      } else {
        setFullApplicationData(selectedApplication);
      }
    }
    
    fetchFullKycDetails();
  }, [selectedApplication]);
  
  const openDocumentViewer = (url: string, name: string) => {
    setViewerDocument({ url, name });
    setViewerOpen(true);
  };
  
  // Print KYC application with all documents including selfie
  const handlePrintApplication = () => {
    if (!selectedApplication) return;
    
    const app = selectedApplication;
    const isFinatrades = isFinatradesKyc(app);
    
    // Build document images HTML
    const buildImageSection = (url: string | undefined, label: string) => {
      if (!url) return '';
      const imageSrc = getImageSrc(url);
      return `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">${label}</h4>
          <img src="${imageSrc}" alt="${label}" style="max-width: 100%; max-height: 300px; border: 1px solid #ddd; border-radius: 4px;" />
        </div>
      `;
    };
    
    // Build documents section based on KYC type
    let documentsHtml = '';
    if (isFinatrades) {
      documentsHtml = `
        ${buildImageSection(app.idFrontUrl, 'ID Front')}
        ${buildImageSection(app.idBackUrl, 'ID Back')}
        ${buildImageSection(app.passportUrl, 'Passport')}
        ${buildImageSection(app.addressProofUrl, 'Proof of Address')}
        ${buildImageSection(app.selfieUrl || app.livenessImageUrl, 'Selfie / Liveness Verification')}
      `;
    } else {
      documentsHtml = `
        ${buildImageSection(app.documents?.idProof?.url, 'ID Document')}
        ${buildImageSection(app.documents?.selfie?.url, 'Selfie')}
        ${buildImageSection(app.documents?.proofOfAddress?.url, 'Proof of Address')}
      `;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>KYC Application - ${app.fullName || 'Unknown'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0; color: #666; }
            .badge { display: inline-block; background: #000; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
            .section { margin-bottom: 25px; }
            .section h3 { margin: 0 0 15px; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
            .details-grid { display: grid; grid-template-columns: 150px 1fr; gap: 8px 15px; }
            .details-grid .label { color: #666; font-size: 13px; }
            .details-grid .value { font-weight: 500; font-size: 13px; }
            .documents-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .status-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
            .status-approved { background: #dcfce7; color: #166534; }
            .status-rejected { background: #fee2e2; color: #991b1b; }
            .status-pending { background: #fef9c3; color: #854d0e; }
            @media print { 
              body { margin: 10px; }
              .documents-grid { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KYC Application Review ${isFinatrades ? '<span class="badge">Finatrades KYC</span>' : ''}</h1>
            <p>${app.fullName || 'Unknown'} - ${app.accountType || 'Personal'} Account</p>
            <p style="margin-top: 10px;">
              Status: <span class="status-badge ${app.status === 'Approved' ? 'status-approved' : app.status === 'Rejected' ? 'status-rejected' : 'status-pending'}">${app.status || 'Pending'}</span>
            </p>
          </div>
          
          <div class="section">
            <h3>Applicant Details</h3>
            <div class="details-grid">
              <span class="label">Full Name:</span>
              <span class="value">${app.fullName || 'Not provided'}</span>
              <span class="label">Account Type:</span>
              <span class="value">${app.accountType || 'Personal'}</span>
              ${isFinatrades ? `
                <span class="label">Email:</span>
                <span class="value">${app.email || 'Not provided'}</span>
                <span class="label">Phone:</span>
                <span class="value">${app.phone || 'Not provided'}</span>
                <span class="label">Date of Birth:</span>
                <span class="value">${app.dateOfBirth || 'Not provided'}</span>
              ` : ''}
              <span class="label">Country:</span>
              <span class="value">${app.country || 'Not provided'}</span>
              ${isFinatrades ? `
                <span class="label">City:</span>
                <span class="value">${app.city || 'Not provided'}</span>
                <span class="label">Address:</span>
                <span class="value">${app.address || 'Not provided'}</span>
                <span class="label">Postal Code:</span>
                <span class="value">${app.postalCode || 'Not provided'}</span>
              ` : ''}
              <span class="label">Nationality:</span>
              <span class="value">${app.nationality || 'Not provided'}</span>
              ${isFinatrades ? `
                <span class="label">Occupation:</span>
                <span class="value">${app.occupation || 'Not provided'}</span>
                <span class="label">Source of Funds:</span>
                <span class="value">${app.sourceOfFunds || 'Not provided'}</span>
              ` : ''}
              <span class="label">Submitted:</span>
              <span class="value">${app.createdAt ? new Date(app.createdAt).toLocaleString() : 'Unknown'}</span>
            </div>
          </div>
          
          ${app.accountType === 'business' ? `
            <div class="section">
              <h3>Business Details</h3>
              <div class="details-grid">
                <span class="label">Company Name:</span>
                <span class="value">${app.companyName || 'Not provided'}</span>
                <span class="label">Registration Number:</span>
                <span class="value">${app.registrationNumber || 'Not provided'}</span>
                <span class="label">Tax ID:</span>
                <span class="value">${app.taxId || 'Not provided'}</span>
              </div>
            </div>
          ` : ''}
          
          <div class="section">
            <h3>Documents</h3>
            <div class="documents-grid">
              ${documentsHtml}
            </div>
          </div>
          
          ${app.rejectionReason ? `
            <div class="section" style="background: #fee2e2; padding: 15px; border-radius: 8px;">
              <h3 style="color: #991b1b; border-bottom-color: #fca5a5;">Rejection Reason</h3>
              <p style="margin: 0; color: #991b1b;">${app.rejectionReason}</p>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #999;">
            <p>Printed on ${new Date().toLocaleString()} | Finatrades KYC System</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };
  
  // Helper to check if this is a Finatrades personal KYC submission
  const isFinatradesKyc = (app: any) => {
    return app?.kycType === 'finatrades' || app?.idFrontUrl || app?.idBackUrl || app?.addressProofUrl;
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-kyc-submissions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/kyc');
      if (!res.ok) throw new Error('Failed to fetch KYC submissions');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const submissions = data?.submissions || [];
  const pendingSubmissions = submissions.filter((s: any) => s.status === 'In Progress');
  const approvedSubmissions = submissions.filter((s: any) => s.status === 'Approved');
  const rejectedSubmissions = submissions.filter((s: any) => s.status === 'Rejected');

  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await fetch(`/api/kyc/${submissionId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: 'Approved',
          reviewedBy: adminUser?.id,
          reviewedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: () => {
      toast.success('KYC Approved', { description: 'User now has full platform access.' });
      setSelectedApplication(null);
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: () => {
      toast.error('Failed to approve KYC');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      const res = await fetch(`/api/kyc/${submissionId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: 'Rejected',
          rejectionReason: reason,
          reviewedBy: adminUser?.id,
          reviewedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: () => {
      toast.error('KYC Rejected', { description: 'User has been notified.' });
      setSelectedApplication(null);
      setShowRejectDialog(false);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: () => {
      toast.error('Failed to reject KYC');
    },
  });

  const performApproval = (submissionId: string) => {
    approveMutation.mutate(submissionId);
  };

  const performRejection = (submissionId: string, reason: string) => {
    rejectMutation.mutate({ submissionId, reason });
  };

  const bulkApproveMutation = useMutation({
    mutationFn: async (submissionIds: string[]) => {
      const results = await Promise.all(
        submissionIds.map(async (id) => {
          const res = await fetch(`/api/kyc/${id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({ 
              status: 'Approved',
              reviewedBy: adminUser?.id,
              reviewedAt: new Date().toISOString(),
            }),
          });
          return { id, success: res.ok };
        })
      );
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      toast.success(`Bulk Approved`, { description: `${successCount} KYC applications approved.` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: () => {
      toast.error('Failed to bulk approve KYC applications');
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async ({ submissionIds, reason }: { submissionIds: string[]; reason: string }) => {
      const results = await Promise.all(
        submissionIds.map(async (id) => {
          const res = await fetch(`/api/kyc/${id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({ 
              status: 'Rejected',
              rejectionReason: reason,
              reviewedBy: adminUser?.id,
              reviewedAt: new Date().toISOString(),
            }),
          });
          return { id, success: res.ok };
        })
      );
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      toast.error(`Bulk Rejected`, { description: `${successCount} KYC applications rejected.` });
      setSelectedIds(new Set());
      setShowBulkRejectDialog(false);
      setBulkRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: () => {
      toast.error('Failed to bulk reject KYC applications');
    },
  });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingSubmissions.map((s: any) => s.id)));
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    bulkApproveMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0 || !bulkRejectionReason.trim()) return;
    bulkRejectMutation.mutate({ submissionIds: Array.from(selectedIds), reason: bulkRejectionReason });
  };

  const handleApprove = async () => {
    if (!selectedApplication || !adminUser?.id) return;
    
    const otpRequired = await checkOtpRequired('kyc_approval', adminUser.id);
    if (otpRequired) {
      requestOtp({
        actionType: 'kyc_approval',
        targetId: selectedApplication.id,
        targetType: 'kyc_submission',
        onComplete: () => performApproval(selectedApplication.id),
      });
    } else {
      performApproval(selectedApplication.id);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication || !rejectionReason.trim() || !adminUser?.id) return;
    
    const otpRequired = await checkOtpRequired('kyc_rejection', adminUser.id);
    if (otpRequired) {
      requestOtp({
        actionType: 'kyc_rejection',
        targetId: selectedApplication.id,
        targetType: 'kyc_submission',
        actionData: { reason: rejectionReason },
        onComplete: () => performRejection(selectedApplication.id, rejectionReason),
      });
    } else {
      performRejection(selectedApplication.id, rejectionReason);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KYC Reviews</h1>
            <p className="text-gray-500">Review and approve customer identity verifications.</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSubmissions.length}</p>
                <p className="text-sm text-gray-500">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedSubmissions.length}</p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedSubmissions.length}</p>
                <p className="text-sm text-gray-500">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Applications ({pendingSubmissions.length})</CardTitle>
            {pendingSubmissions.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <span className="text-sm text-gray-500 mr-2">{selectedIds.size} selected</span>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={selectedIds.size === 0 || bulkApproveMutation.isPending}
                  className="text-green-600 hover:bg-green-50"
                  data-testid="button-bulk-approve"
                >
                  {bulkApproveMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Bulk Approve
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => selectedIds.size > 0 && setShowBulkRejectDialog(true)}
                  disabled={selectedIds.size === 0}
                  className="text-red-600 hover:bg-red-50"
                  data-testid="button-bulk-reject"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Bulk Reject
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : pendingSubmissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                <p>No pending applications</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                  <Checkbox 
                    checked={selectedIds.size === pendingSubmissions.length && pendingSubmissions.length > 0}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-sm text-gray-600">Select All</span>
                </div>
                {pendingSubmissions.map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`kyc-submission-${app.id}`}>
                    <div className="flex items-center gap-4">
                      <Checkbox 
                        checked={selectedIds.has(app.id)}
                        onCheckedChange={() => toggleSelection(app.id)}
                        data-testid={`checkbox-kyc-${app.id}`}
                      />
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        {app.accountType === 'business' ? <Building className="w-6 h-6" /> : <User className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{app.fullName || 'Name not provided'}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="capitalize">{app.accountType} Account</span>
                          <span>•</span>
                          <span>Submitted {new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {getStatusBadge(app.status)}
                      <Button onClick={() => setSelectedApplication(app)} data-testid={`button-review-${app.id}`}>
                        Review Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Applications */}
        <Card>
          <CardHeader>
            <CardTitle>All Applications ({submissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No KYC submissions yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full">
                  <thead className="text-xs text-gray-600 uppercase bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-4 text-left font-semibold tracking-wide">Applicant</th>
                      <th className="px-4 py-4 text-left font-semibold tracking-wide">Account Type</th>
                      <th className="px-4 py-4 text-left font-semibold tracking-wide">Status</th>
                      <th className="px-4 py-4 text-left font-semibold tracking-wide">Submitted</th>
                      <th className="px-4 py-4 text-right font-semibold tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map((app: any, index: number) => (
                      <tr key={app.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-purple-50/50 transition-colors duration-150`}>
                        <td className="px-4 py-3 font-medium">{app.fullName || 'Not provided'}</td>
                        <td className="px-4 py-3 capitalize">{app.accountType}</td>
                        <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedApplication(app)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedApplication && !showRejectDialog} onOpenChange={(open) => !open && setSelectedApplication(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>KYC Application Review</DialogTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrintApplication}
                  className="ml-4"
                  data-testid="button-print-kyc-application"
                >
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
              </div>
              <DialogDescription>
                Review documents for {selectedApplication?.fullName} ({selectedApplication?.accountType} Account)
                {isFinatradesKyc(selectedApplication) && <Badge className="ml-2 bg-black text-white">Finatrades KYC</Badge>}
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <h4 className="font-medium border-b pb-2">Applicant Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Full Name:</span>
                  <span className="font-medium">{selectedApplication?.fullName || 'Not provided'}</span>
                  <span className="text-gray-500">Account Type:</span>
                  <span className="font-medium capitalize">{selectedApplication?.accountType}</span>
                  
                  {/* Show additional fields for Finatrades KYC */}
                  {isFinatradesKyc(selectedApplication) && (
                    <>
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{selectedApplication?.email || 'Not provided'}</span>
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">{selectedApplication?.phone || 'Not provided'}</span>
                      <span className="text-gray-500">Date of Birth:</span>
                      <span className="font-medium">{selectedApplication?.dateOfBirth || 'Not provided'}</span>
                    </>
                  )}
                  
                  <span className="text-gray-500">Country:</span>
                  <span className="font-medium">{selectedApplication?.country || 'Not provided'}</span>
                  
                  {isFinatradesKyc(selectedApplication) && (
                    <>
                      <span className="text-gray-500">City:</span>
                      <span className="font-medium">{selectedApplication?.city || 'Not provided'}</span>
                      <span className="text-gray-500">Address:</span>
                      <span className="font-medium">{selectedApplication?.address || 'Not provided'}</span>
                      <span className="text-gray-500">Postal Code:</span>
                      <span className="font-medium">{selectedApplication?.postalCode || 'Not provided'}</span>
                    </>
                  )}
                  
                  <span className="text-gray-500">Nationality:</span>
                  <span className="font-medium">{selectedApplication?.nationality || 'Not provided'}</span>
                  
                  {isFinatradesKyc(selectedApplication) && (
                    <>
                      <span className="text-gray-500">Occupation:</span>
                      <span className="font-medium">{selectedApplication?.occupation || 'Not provided'}</span>
                      <span className="text-gray-500">Source of Funds:</span>
                      <span className="font-medium">{selectedApplication?.sourceOfFunds || 'Not provided'}</span>
                      {selectedApplication?.passportExpiryDate && (
                        <>
                          <span className="text-gray-500">Passport Expiry:</span>
                          <span className="font-medium">{selectedApplication.passportExpiryDate}</span>
                        </>
                      )}
                    </>
                  )}
                  
                  {selectedApplication?.kycType === 'finatrades_corporate' && (
                    <>
                      {selectedApplication?.tradeLicenseExpiryDate && (
                        <>
                          <span className="text-gray-500">Trade License Expiry:</span>
                          <span className="font-medium">{selectedApplication.tradeLicenseExpiryDate}</span>
                        </>
                      )}
                      {selectedApplication?.directorPassportExpiryDate && (
                        <>
                          <span className="text-gray-500">Director Passport Expiry:</span>
                          <span className="font-medium">{selectedApplication.directorPassportExpiryDate}</span>
                        </>
                      )}
                    </>
                  )}
                  
                  <span className="text-gray-500">Submitted:</span>
                  <span className="font-medium">{selectedApplication?.createdAt ? new Date(selectedApplication.createdAt).toLocaleString() : '-'}</span>
                </div>
                
                {selectedApplication?.accountType === 'business' && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Business Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">Company Name:</span>
                      <span className="font-medium">{selectedApplication?.companyName || 'Not provided'}</span>
                      <span className="text-gray-500">Registration Number:</span>
                      <span className="font-medium">{selectedApplication?.registrationNumber || 'Not provided'}</span>
                      <span className="text-gray-500">Tax ID:</span>
                      <span className="font-medium">{selectedApplication?.taxId || 'Not provided'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium border-b pb-2">Documents Status</h4>
                {loadingFullData ? (
                  <div className="flex items-center justify-center p-4">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    <span>Loading documents...</span>
                  </div>
                ) : (
                <div className="space-y-2">
                  {/* Handle Corporate KYC format */}
                  {fullApplicationData?.kycType === 'finatrades_corporate' ? (
                    <>
                      {/* Certificate of Incorporation */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Certificate of Incorporation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.documents?.certificateOfIncorporation?.url ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.documents.certificateOfIncorporation.url, 'Certificate of Incorporation')}
                                data-testid="button-view-cert-inc"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Trade License */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Trade License</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.documents?.tradeLicense?.url ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.documents.tradeLicense.url, 'Trade License')}
                                data-testid="button-view-trade-license"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Memorandum & Articles */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Memorandum & Articles</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.documents?.memorandumArticles?.url ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.documents.memorandumArticles.url, 'Memorandum & Articles')}
                                data-testid="button-view-memo-articles"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* UBO Passports */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">UBO Passports</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.documents?.uboPassports?.url ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.documents.uboPassports.url, 'UBO Passports')}
                                data-testid="button-view-ubo-passports"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Bank Reference Letter */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Bank Reference Letter</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.documents?.bankReferenceLetter?.url ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.documents.bankReferenceLetter.url, 'Bank Reference Letter')}
                                data-testid="button-view-bank-ref"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Authorized Signatories */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Authorized Signatories</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.documents?.authorizedSignatories?.url ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.documents.authorizedSignatories.url, 'Authorized Signatories')}
                                data-testid="button-view-auth-sigs"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Liveness Capture for authorized signatory */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Signatory Liveness</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.livenessCapture ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">
                                {fullApplicationData?.livenessVerified ? 'Verified' : 'Captured'}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.livenessCapture, 'Signatory Liveness')}
                                data-testid="button-view-corp-liveness"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Captured</Badge>
                          )}
                        </div>
                      </div>
                    </>
                  ) : isFinatradesKyc(fullApplicationData) ? (
                    <>
                      {/* Finatrades Personal KYC - ID Front */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">ID Front</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.idFrontUrl ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.idFrontUrl, 'ID Front')}
                                data-testid="button-view-id-front"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* ID Back */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">ID Back</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.idBackUrl ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.idBackUrl, 'ID Back')}
                                data-testid="button-view-id-back"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Passport (Optional) */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Passport (Optional)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.passportUrl ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.passportUrl, 'Passport')}
                                data-testid="button-view-passport"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Address Proof */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Proof of Address</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.addressProofUrl ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.addressProofUrl, 'Proof of Address')}
                                data-testid="button-view-address-proof"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Liveness Capture */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Liveness Verification</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.livenessCapture ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">
                                {fullApplicationData?.livenessVerified ? 'Verified' : 'Captured'}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.livenessCapture, 'Liveness Photo')}
                                data-testid="button-view-liveness"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Captured</Badge>
                          )}
                        </div>
                      </div>
                      
                    </>
                  ) : (
                    <>
                      {/* Legacy KYC format */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">ID Document</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.documents?.idProof ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.documents.idProof.url, 'ID Document')}
                                data-testid="button-view-id-doc"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Selfie</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.documents?.selfie ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.documents.selfie.url, 'Selfie')}
                                data-testid="button-view-selfie"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Proof of Address</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fullApplicationData?.documents?.proofOfAddress ? (
                            <>
                              <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openDocumentViewer(fullApplicationData.documents.proofOfAddress.url, 'Proof of Address')}
                                data-testid="button-view-address-proof-legacy"
                              >
                                View
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                )}

                {selectedApplication?.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                    <p className="text-sm text-red-700">{selectedApplication.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {selectedApplication?.status === 'In Progress' && (
              <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                  variant="destructive" 
                  onClick={() => setShowRejectDialog(true)}
                  disabled={rejectMutation.isPending}
                  data-testid="button-reject-kyc"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve-kyc"
                >
                  {approveMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Approve & Verify
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Document Viewer */}
        <DocumentViewer 
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          documentUrl={viewerDocument.url}
          documentName={viewerDocument.name}
        />

        {/* Reject Reason Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject KYC Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this application.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea 
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-rejection-reason"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Reject Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Reject Dialog */}
        <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Reject KYC Applications</DialogTitle>
              <DialogDescription>
                You are about to reject {selectedIds.size} KYC application(s). Please provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea 
                placeholder="Enter rejection reason for all selected applications..."
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-bulk-rejection-reason"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkRejectDialog(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkReject}
                disabled={!bulkRejectionReason.trim() || bulkRejectMutation.isPending}
                data-testid="button-confirm-bulk-reject"
              >
                {bulkRejectMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Reject {selectedIds.size} Application(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin OTP Verification Modal */}
        {pendingAction && adminUser?.id && (
          <AdminOtpModal
            isOpen={isOtpModalOpen}
            onClose={closeOtpModal}
            onVerified={handleVerified}
            actionType={pendingAction.actionType}
            targetId={pendingAction.targetId}
            targetType={pendingAction.targetType}
            actionData={pendingAction.actionData}
            adminUserId={adminUser.id}
          />
        )}
      </div>
    </AdminLayout>
  );
}
