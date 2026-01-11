import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from './button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText, AlertCircle } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: string | File | { data: Uint8Array };
  className?: string;
  maxWidth?: number;
  showControls?: boolean;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
}

export function PDFViewer({ 
  file, 
  className = '', 
  maxWidth = 800,
  showControls = true,
  onLoadSuccess,
  onLoadError
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    onLoadSuccess?.(numPages);
  }, [onLoadSuccess]);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err);
    setLoading(false);
    setError('Failed to load PDF document');
    onLoadError?.(err);
  }, [onLoadError]);

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-700 font-medium">{error}</p>
        <p className="text-gray-500 text-sm mt-2">The PDF could not be displayed</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {showControls && !loading && numPages > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 bg-gray-100 border-b rounded-t-lg">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              data-testid="btn-pdf-prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              data-testid="btn-pdf-next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.5}
              data-testid="btn-pdf-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 3.0}
              data-testid="btn-pdf-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-auto bg-gray-200 rounded-b-lg p-4 flex justify-center">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-gray-600">Loading PDF...</p>
          </div>
        )}
        
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex flex-col items-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            width={maxWidth}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
            loading={
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            }
          />
        </Document>
      </div>
    </div>
  );
}

export default PDFViewer;
