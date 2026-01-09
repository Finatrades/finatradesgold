import React, { useState, useRef } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { 
  Search, RefreshCw, Printer, Eye, FileText, Image, Download, 
  Paperclip, Filter, User, Calendar
} from 'lucide-react';

interface DocumentRef {
  id: string;
  type: 'Invoice' | 'Certificate' | string;
  name: string;
}

interface Attachment {
  id: string;
  source: string;
  sourceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  fileName: string;
  fileType: 'image' | 'document';
  fileUrl: string | DocumentRef;
  uploadedAt: string;
  status: string;
}

const getDocumentDownloadUrl = (fileUrl: string | DocumentRef, inline: boolean = false): string | null => {
  if (typeof fileUrl === 'string') {
    return fileUrl;
  }
  if (fileUrl && typeof fileUrl === 'object' && fileUrl.id && fileUrl.type) {
    const docType = fileUrl.type.toLowerCase();
    if (docType === 'invoice') {
      return `/api/admin/documents/invoices/${fileUrl.id}/download${inline ? '?inline=1' : ''}`;
    } else if (docType === 'certificate') {
      return `/api/admin/documents/certificates/${fileUrl.id}/download${inline ? '?inline=1' : ''}`;
    }
  }
  return null;
};

export default function AttachmentsManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const { data, isLoading, refetch } = useQuery<{ attachments: Attachment[] }>({
    queryKey: ['/api/admin/attachments'],
    queryFn: async () => {
      const res = await fetch('/api/admin/attachments', {
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch attachments');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const attachments = data?.attachments || [];

  const filteredAttachments = attachments.filter(att => {
    const matchesSearch = 
      att.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.sourceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSource = sourceFilter === 'all' || att.source.includes(sourceFilter);
    
    return matchesSearch && matchesSource;
  });

  const sources = Array.from(new Set(attachments.map(a => a.source)));

  const handlePrint = (attachment: Attachment) => {
    const documentUrl = getDocumentDownloadUrl(attachment.fileUrl, true);
    const isImage = attachment.fileType === 'image' && typeof attachment.fileUrl === 'string';
    
    if (attachment.fileType === 'document' && documentUrl) {
      const printWindow = window.open(documentUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 500);
        };
      }
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print - ${attachment.fileName}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                width: 100%;
                border-bottom: 2px solid #8A2BE2;
                padding-bottom: 10px;
              }
              .header h1 { 
                color: #8A2BE2; 
                margin: 0 0 5px 0;
                font-size: 18px;
              }
              .meta {
                font-size: 12px;
                color: #666;
              }
              .content {
                max-width: 100%;
                text-align: center;
              }
              img { 
                max-width: 100%; 
                max-height: 80vh;
                object-fit: contain;
              }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Finatrades - Document Print</h1>
              <div class="meta">
                <strong>Source:</strong> ${attachment.source} | 
                <strong>Reference:</strong> ${attachment.sourceId} | 
                <strong>User:</strong> ${attachment.userName}
              </div>
              <div class="meta">
                <strong>File:</strong> ${attachment.fileName} | 
                <strong>Date:</strong> ${format(new Date(attachment.uploadedAt), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
            <div class="content">
              ${isImage
                ? `<img src="${attachment.fileUrl}" alt="${attachment.fileName}" onload="window.print();" />`
                : `<p>Document: ${attachment.fileName}</p><p class="no-print">The PDF will open in a new tab for printing.</p>`
              }
            </div>
            <script>
              ${!isImage ? 'setTimeout(function(){ window.print(); }, 100);' : ''}
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintAll = () => {
    const imageAttachments = filteredAttachments.filter(a => a.fileType === 'image');
    if (imageAttachments.length === 0) {
      toast.error('No image attachments to print');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print All Attachments</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #8A2BE2;
                padding-bottom: 10px;
              }
              .header h1 { color: #8A2BE2; }
              .attachment {
                page-break-after: always;
                margin-bottom: 20px;
                padding: 10px;
                border: 1px solid #ddd;
              }
              .attachment:last-child {
                page-break-after: auto;
              }
              .attachment-header {
                font-size: 12px;
                color: #666;
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 1px solid #eee;
              }
              img { 
                max-width: 100%; 
                max-height: 600px;
                object-fit: contain;
                display: block;
                margin: 0 auto;
              }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Finatrades - All Attachments</h1>
              <p>Total: ${imageAttachments.length} attachments</p>
            </div>
            ${imageAttachments.map((att, idx) => `
              <div class="attachment">
                <div class="attachment-header">
                  <strong>${idx + 1}.</strong> ${att.source} - ${att.sourceId} | 
                  <strong>User:</strong> ${att.userName} | 
                  <strong>File:</strong> ${att.fileName}
                </div>
                <img src="${att.fileUrl}" alt="${att.fileName}" />
              </div>
            `).join('')}
            <script>
              let loadedCount = 0;
              const images = document.querySelectorAll('img');
              images.forEach(img => {
                if (img.complete) {
                  loadedCount++;
                  if (loadedCount === images.length) window.print();
                } else {
                  img.onload = () => {
                    loadedCount++;
                    if (loadedCount === images.length) window.print();
                  };
                }
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('approved') || lower.includes('stored') || lower.includes('verified')) {
      return 'bg-green-100 text-green-700';
    }
    if (lower.includes('rejected') || lower.includes('failed')) {
      return 'bg-red-100 text-red-700';
    }
    if (lower.includes('pending') || lower.includes('review') || lower.includes('submitted')) {
      return 'bg-yellow-100 text-yellow-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">All Attachments</h1>
            <p className="text-muted-foreground">View and manage all uploaded files across the platform</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handlePrintAll}
              disabled={filteredAttachments.filter(a => a.fileType === 'image').length === 0}
              data-testid="button-print-all"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print All ({filteredAttachments.filter(a => a.fileType === 'image').length})
            </Button>
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-purple-600" />
                Platform Attachments ({filteredAttachments.length})
              </CardTitle>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search"
                  />
                </div>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-48" data-testid="select-source-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sources.map(source => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : filteredAttachments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Paperclip className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No attachments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Preview</TableHead>
                    <TableHead className="text-foreground">Source</TableHead>
                    <TableHead className="text-foreground">User</TableHead>
                    <TableHead className="text-foreground">File Name</TableHead>
                    <TableHead className="text-foreground">Uploaded</TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttachments.map((attachment) => (
                    <TableRow key={attachment.id} data-testid={`row-attachment-${attachment.id}`}>
                      <TableCell>
                        {attachment.fileType === 'image' && typeof attachment.fileUrl === 'string' && attachment.fileUrl.startsWith('data:image') ? (
                          <img 
                            src={attachment.fileUrl} 
                            alt={attachment.fileName}
                            className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => setSelectedAttachment(attachment)}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{attachment.source}</p>
                          <p className="text-xs text-muted-foreground">{attachment.sourceId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{attachment.userName}</p>
                            <p className="text-xs text-muted-foreground">{attachment.userEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {attachment.fileType === 'image' ? (
                            <Image className="w-4 h-4 text-blue-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-orange-500" />
                          )}
                          <span className="text-sm">{attachment.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(attachment.uploadedAt), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(attachment.status)}>
                          {attachment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedAttachment(attachment)}
                            data-testid={`button-view-${attachment.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handlePrint(attachment)}
                            data-testid={`button-print-${attachment.id}`}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedAttachment} onOpenChange={() => setSelectedAttachment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAttachment?.fileType === 'image' ? (
                <Image className="w-5 h-5 text-blue-500" />
              ) : (
                <FileText className="w-5 h-5 text-orange-500" />
              )}
              {selectedAttachment?.fileName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAttachment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <span className="ml-2 font-medium">{selectedAttachment.source}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="ml-2 font-medium">{selectedAttachment.sourceId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">User:</span>
                  <span className="ml-2 font-medium">{selectedAttachment.userName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={`ml-2 ${getStatusColor(selectedAttachment.status)}`}>
                    {selectedAttachment.status}
                  </Badge>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-white">
                {selectedAttachment.fileType === 'image' && typeof selectedAttachment.fileUrl === 'string' && selectedAttachment.fileUrl.startsWith('data:image') ? (
                  <img 
                    src={selectedAttachment.fileUrl} 
                    alt={selectedAttachment.fileName}
                    className="max-w-full max-h-[60vh] object-contain mx-auto"
                  />
                ) : selectedAttachment.fileType === 'document' && getDocumentDownloadUrl(selectedAttachment.fileUrl, true) ? (
                  <iframe 
                    src={getDocumentDownloadUrl(selectedAttachment.fileUrl, true) || ''}
                    className="w-full h-[60vh] border-0"
                    title={selectedAttachment.fileName}
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-muted-foreground">Document preview not available</p>
                    {getDocumentDownloadUrl(selectedAttachment.fileUrl) && (
                      <a 
                        href={getDocumentDownloadUrl(selectedAttachment.fileUrl, true) || '#'}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline"
                      >
                        Open Document
                      </a>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline"
                  onClick={() => handlePrint(selectedAttachment)}
                  data-testid="button-print-modal"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const downloadUrl = getDocumentDownloadUrl(selectedAttachment.fileUrl);
                    if (downloadUrl) {
                      const link = document.createElement('a');
                      link.href = downloadUrl;
                      link.download = selectedAttachment.fileName;
                      link.click();
                    }
                  }}
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <iframe ref={printFrameRef} style={{ display: 'none' }} title="Print Frame" />
    </AdminLayout>
  );
}
