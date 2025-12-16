import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
  onScan: (data: string) => void;
  isActive: boolean;
}

export default function QRScanner({ onScan, isActive }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerIdRef = useRef(`qr-reader-${Date.now()}`);

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    setIsInitializing(true);
    setError(null);

    try {
      const scannerId = scannerIdRef.current;
      
      if (!document.getElementById(scannerId)) {
        const scannerElement = document.createElement('div');
        scannerElement.id = scannerId;
        containerRef.current.appendChild(scannerElement);
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          let finatradesId = decodedText;
          
          if (decodedText.includes('finatrades.com')) {
            const match = decodedText.match(/[?&]id=([^&]+)/);
            if (match) {
              finatradesId = match[1];
            }
          }
          
          if (finatradesId.startsWith('FT') || finatradesId.match(/^[A-Z0-9]+$/i)) {
            onScan(finatradesId.toUpperCase());
            stopScanner();
          }
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('QR Scanner error:', err);
      if (err.message?.includes('Permission denied') || err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.message?.includes('NotFoundError') || err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to start camera. Please try again.');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (!isActive && isScanning) {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [isActive]);

  return (
    <div className="space-y-3">
      <div 
        ref={containerRef}
        className="bg-muted/50 border-2 border-dashed border-border rounded-xl min-h-[200px] flex flex-col items-center justify-center overflow-hidden relative"
      >
        {!isScanning && !isInitializing && (
          <div className="text-center p-4">
            {error ? (
              <>
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-500 text-sm font-medium">{error}</p>
                <Button 
                  onClick={startScanner} 
                  className="mt-3"
                  variant="outline"
                  size="sm"
                >
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm font-medium">Tap to scan QR code</p>
                <Button 
                  onClick={startScanner}
                  className="mt-3 bg-primary hover:bg-primary/90 text-white"
                  size="sm"
                  data-testid="button-start-qr-scanner"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              </>
            )}
          </div>
        )}

        {isInitializing && (
          <div className="text-center p-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Starting camera...</p>
          </div>
        )}

        {isScanning && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center z-10">
            <Button 
              onClick={stopScanner}
              variant="secondary"
              size="sm"
              className="bg-white/90 hover:bg-white shadow-lg"
              data-testid="button-stop-qr-scanner"
            >
              <CameraOff className="w-4 h-4 mr-2" />
              Stop Camera
            </Button>
          </div>
        )}
      </div>

      {isScanning && (
        <p className="text-xs text-center text-muted-foreground">
          Position the QR code within the frame to scan
        </p>
      )}
    </div>
  );
}
