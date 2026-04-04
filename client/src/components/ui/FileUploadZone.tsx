import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, ScanLine, ShieldCheck, CircleCheck, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

async function pdfFirstPageToJpegBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const scale = 2.5;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return dataUrl.split(',')[1];
}

export interface ScanFields {
  is_identity_document?: boolean;
  is_address_document?: boolean;
  document_type?: 'passport' | 'national_id' | 'driver_licence' | null;
  document_type_label?: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  document_number: string | null;
  expiry_date: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  document_date?: string | null;
  source?: 'mrz' | 'gpt';
}

export interface ScanVerification {
  nameMatch: boolean | null;
  dobMatch: boolean | null;
  similarity: number | null;
  declaredName: string | null;
  declaredDob: string | null;
}

interface FileUploadZoneProps {
  label: string;
  description?: string;
  accept?: string;
  maxSizeMB?: number;
  required?: boolean;
  disabled?: boolean;
  file?: File | null;
  onFile: (file: File | null) => void;
  testId?: string;
  enableOcr?: boolean;
  expectedDocType?: 'national_id' | 'passport' | 'address_proof' | 'any';
  declaredName?: string;
  declaredDob?: string;
  onScanResult?: (result: ScanFields, verification?: ScanVerification | null) => void;
  onWrongDocType?: (detectedType: string, fields: ScanFields) => void;
}

type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'complete' | 'error';

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  national_id: 'National ID',
  driver_licence: 'Driver Licence',
};

export function FileUploadZone({
  label,
  description,
  accept = '.jpg,.jpeg,.png,.pdf',
  maxSizeMB = 5,
  required = false,
  disabled = false,
  file,
  onFile,
  testId,
  enableOcr = false,
  expectedDocType = 'any',
  declaredName,
  declaredDob,
  onScanResult,
  onWrongDocType,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [scanFields, setScanFields] = useState<ScanFields | null>(null);
  const [verification, setVerification] = useState<ScanVerification | null>(null);
  const [wrongSlot, setWrongSlot] = useState<boolean>(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setScanStatus('idle');
      setProgress(0);
      setPreview(null);
      setScanFields(null);
      setVerification(null);
      setWrongSlot(false);
      if (progressRef.current) clearInterval(progressRef.current);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    }
  }, [file]);

  const startProgressAnimation = useCallback((targetPct = 90, onReached?: () => void) => {
    setScanStatus('uploading');
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    let current = 0;
    progressRef.current = setInterval(() => {
      current = Math.min(current + Math.random() * 12 + 5, targetPct);
      setProgress(current);
      if (current >= targetPct) {
        clearInterval(progressRef.current!);
        progressRef.current = null;
        setScanStatus('scanning');
        onReached?.();
      }
    }, 80);
  }, []);

  const callOcrApi = useCallback(async (f: File) => {
    try {
      // For PDFs: render first page to JPEG so Groq vision can read any PDF type
      let base64: string;
      let mimeType: string;
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        console.log('[OCR] PDF detected — rendering first page to JPEG for vision scan...');
        try {
          base64 = await pdfFirstPageToJpegBase64(f);
          mimeType = 'image/jpeg';
          console.log('[OCR] PDF rendered to JPEG, base64 length:', base64.length);
        } catch (pdfErr) {
          console.warn('[OCR] PDF render failed, falling back to raw PDF:', pdfErr instanceof Error ? pdfErr.message : String(pdfErr));
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const b64 = (e.target?.result as string).split(',')[1];
              if (b64) resolve(b64); else reject(new Error('Failed to read file'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(f);
          });
          mimeType = 'application/pdf';
        }
      } else {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            const b64 = result.split(',')[1];
            if (b64) resolve(b64);
            else reject(new Error('Failed to read file'));
          };
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        mimeType = f.type || 'image/jpeg';
      }

      // Fetch CSRF token from the server (same approach as Login/Security pages)
      let csrfToken: string | null = null;
      try {
        console.log('[OCR] Fetching CSRF token...');
        const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' });
        const csrfData = await csrfRes.json();
        csrfToken = csrfData?.csrfToken ?? null;
        console.log('[OCR] CSRF token obtained:', csrfToken ? 'yes (' + csrfToken.slice(0, 6) + '...)' : 'null');
      } catch (csrfErr) {
        console.warn('[OCR] CSRF fetch failed, trying cookie:', csrfErr instanceof Error ? csrfErr.message : String(csrfErr));
        const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
        csrfToken = m ? decodeURIComponent(m[1]) : null;
        console.log('[OCR] Cookie fallback token:', csrfToken ? 'yes' : 'null');
      }

      const isAddressProofMode = expectedDocType === 'address_proof';
      const endpoint = isAddressProofMode ? '/api/kyc/scan-address-proof' : '/api/kyc/scan-document';
      const bodyStr = JSON.stringify({
        base64,
        mimeType,
        declaredName: declaredName || undefined,
        ...(isAddressProofMode ? {} : { declaredDob: declaredDob || undefined }),
      });
      console.log('[OCR] Sending scan request to', endpoint, ', payload size:', bodyStr.length, 'bytes, mimeType:', mimeType);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: bodyStr,
      });

      console.log('[OCR] Response status:', resp.status, resp.ok ? 'OK' : 'NOT OK');
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`Scan request failed: ${resp.status} ${errBody}`);
      }
      const data = await resp.json();

      if (isAddressProofMode) {
        const addrFields = data.fields ?? {};
        const fields: ScanFields = {
          is_address_document: addrFields.is_address_document ?? true,
          document_type_label: addrFields.document_type_label ?? null,
          full_name: addrFields.full_name ?? null,
          date_of_birth: null,
          nationality: null,
          document_number: null,
          expiry_date: null,
          address: addrFields.address ?? null,
          city: addrFields.city ?? null,
          postal_code: addrFields.postal_code ?? null,
          country: addrFields.country ?? null,
          document_date: addrFields.document_date ?? null,
          source: 'gpt',
        };
        const nv = data.nameVerification ?? null;
        const verif: ScanVerification | null = nv ? { nameMatch: nv.nameMatch, dobMatch: null, similarity: nv.similarity, declaredName: nv.declaredName, declaredDob: null } : null;
        setScanFields(fields);
        setVerification(verif);
        onScanResult?.(fields, verif);
      } else {
        const fields: ScanFields = data.fields ?? {
          is_identity_document: true, full_name: null, date_of_birth: null,
          nationality: null, document_number: null, expiry_date: null, source: 'gpt',
        };

        if (fields.is_identity_document === false) {
          setProgress(100);
          setScanStatus('error');
          setError('This does not appear to be a valid identity document. Please upload a passport, national ID, or driver\'s licence.');
          onFile(null);
          return;
        }

        const detectedType = fields.document_type ?? null;
        let isWrongSlot = false;
        if (detectedType && expectedDocType !== 'any') {
          isWrongSlot = (expectedDocType === 'national_id' && detectedType === 'passport')
            || (expectedDocType === 'passport' && detectedType === 'national_id');
        }
        setWrongSlot(isWrongSlot);
        if (isWrongSlot && onWrongDocType && detectedType) {
          onWrongDocType(detectedType, fields);
        }

        const verif: ScanVerification | null = data.verification ?? null;
        setScanFields(fields);
        setVerification(verif);
        onScanResult?.(fields, verif);
      }
    } catch (err) {
      console.error('[OCR] Scan failed:', err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      setScanFields({ full_name: null, date_of_birth: null, nationality: null, document_number: null, expiry_date: null });
      setVerification(null);
    }
    setProgress(100);
    setScanStatus('complete');
  }, [onScanResult, onFile, declaredName, declaredDob, expectedDocType, onWrongDocType]);

  const processFile = useCallback(
    (f: File) => {
      setError(null);
      setScanFields(null);
      if (f.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
        return;
      }
      const validExts = accept
        .split(',')
        .map((t) => t.trim().replace('.', '').toLowerCase());
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!validExts.includes(ext)) {
        setError(`Invalid file type. Accepted: ${accept}`);
        return;
      }
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(f);
      } else {
        setPreview(null);
      }
      onFile(f);
      if (enableOcr) {
        startProgressAnimation(80);
        callOcrApi(f);
      } else {
        // For non-OCR uploads: animate quickly to 90%, then complete after a short pause
        startProgressAnimation(90, () => {
          scanTimerRef.current = setTimeout(() => {
            setProgress(100);
            setScanStatus('complete');
          }, 300);
        });
      }
    },
    [accept, maxSizeMB, onFile, startProgressAnimation, enableOcr, callOcrApi]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [disabled, processFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const removeFile = () => {
    setPreview(null);
    setError(null);
    setScanStatus('idle');
    setProgress(0);
    setScanFields(null);
    onFile(null);
    if (inputRef.current) inputRef.current.value = '';
    if (progressRef.current) clearInterval(progressRef.current);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  };

  const typeLabels = accept
    .split(',')
    .map((t) => t.trim().replace('.', '').toUpperCase())
    .join(', ');

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        {required && <span className="text-red-500 text-sm">*</span>}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
      )}

      {!file ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 select-none',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/60 hover:bg-muted/20',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            error && 'border-red-400 bg-red-50/30 dark:bg-red-950/20'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2.5">
            <div
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
                isDragging
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Upload
                className={cn('w-5 h-5', isDragging && 'animate-bounce')}
              />
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragging ? 'Drop file here' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {typeLabels} — max {maxSizeMB}MB
              </p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleChange}
            data-testid={testId}
          />
        </div>
      ) : (
        <div
          className={cn(
            'border rounded-xl p-3 flex flex-col gap-2.5 group transition-colors',
            scanStatus === 'complete'
              ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200 dark:border-green-800'
              : 'bg-muted/20 border-border'
          )}
        >
          <div className="flex items-center gap-3">
            {preview ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <File className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {scanStatus === 'complete' ? (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <ScanLine className="w-4 h-4 text-primary flex-shrink-0 animate-pulse" />
                )}
                <span className="text-sm font-medium truncate">{file.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="flex-shrink-0 text-muted-foreground hover:text-red-600 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {(scanStatus === 'uploading' || scanStatus === 'scanning') && (
            <div className="space-y-1" data-testid={testId ? `${testId}-progress` : undefined}>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ScanLine className="w-3 h-3 animate-pulse" />
                  {scanStatus === 'uploading' ? 'Uploading…' : enableOcr ? 'AI scanning document…' : 'Scanning document…'}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-200',
                    scanStatus === 'scanning' ? 'bg-amber-500' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          {scanStatus === 'complete' && (
            <div
              className="space-y-2"
              data-testid={testId ? `${testId}-scan-complete` : undefined}
            >
              {/* Header */}
              <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                {scanFields?.source === 'mrz' ? 'MRZ scan complete' : enableOcr ? 'AI document scan complete' : 'Document scan complete'} — ready for submission
                {scanFields?.source === 'mrz' && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-semibold">FREE</span>
                )}
              </div>

              {/* Wrong-slot advisory — passport uploaded to ID slot */}
              {wrongSlot && scanFields?.document_type === 'passport' && expectedDocType === 'national_id' && (
                <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs font-sans">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-700 dark:text-amber-400">
                    <strong>Passport detected.</strong> This slot is for a national ID or driver's licence. If you only have a passport, upload it in the <strong>Passport</strong> section below — or keep it here and we'll note it for review.
                  </p>
                </div>
              )}

              {enableOcr && scanFields && (
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-green-950/10 divide-y divide-gray-100 dark:divide-green-900/40 text-xs overflow-hidden font-mono">
                  {/* Document type row */}
                  {scanFields.document_type ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">TYPE</span>
                      <span className="font-semibold text-foreground">{DOC_TYPE_LABELS[scanFields.document_type] ?? scanFields.document_type}</span>
                    </div>
                  ) : null}

                  {/* Name row */}
                  {scanFields.full_name ? (
                    <div className="flex items-center justify-between px-3 py-2 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">NAME</span>
                        <span className="font-semibold text-foreground truncate">{scanFields.full_name}</span>
                      </div>
                      {verification?.nameMatch != null ? (
                        verification.nameMatch ? (
                          <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold flex-shrink-0">
                            <CircleCheck className="w-3.5 h-3.5" /> MATCHED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold flex-shrink-0" title={`${verification.similarity ?? 0}% match with your Step 1 name`}>
                            <CircleX className="w-3.5 h-3.5" /> DIFFERS{verification.similarity != null ? ` (${verification.similarity}%)` : ''}
                          </span>
                        )
                      ) : null}
                    </div>
                  ) : null}

                  {/* DOB row */}
                  {scanFields.date_of_birth ? (
                    <div className="flex items-center justify-between px-3 py-2 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">DOB</span>
                        <span className="font-semibold text-foreground">{scanFields.date_of_birth}</span>
                      </div>
                      {verification?.dobMatch != null ? (
                        verification.dobMatch ? (
                          <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold flex-shrink-0">
                            <CircleCheck className="w-3.5 h-3.5" /> MATCHED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold flex-shrink-0" title="Date of birth on document differs from Step 1">
                            <CircleX className="w-3.5 h-3.5" /> DIFFERS
                          </span>
                        )
                      ) : null}
                    </div>
                  ) : null}

                  {/* Nationality row */}
                  {scanFields.nationality ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">COUNTRY</span>
                      <span className="font-semibold text-foreground">{scanFields.nationality}</span>
                    </div>
                  ) : null}

                  {/* Address proof rows */}
                  {scanFields.document_type_label ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">TYPE</span>
                      <span className="font-semibold text-foreground capitalize">{scanFields.document_type_label}</span>
                    </div>
                  ) : null}
                  {scanFields.address ? (
                    <div className="flex items-start gap-2 px-3 py-2">
                      <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0 mt-0.5">ADDR</span>
                      <span className="font-semibold text-foreground text-xs leading-relaxed">{scanFields.address}</span>
                    </div>
                  ) : null}
                  {scanFields.city ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">CITY</span>
                      <span className="font-semibold text-foreground">{scanFields.city}</span>
                    </div>
                  ) : null}
                  {scanFields.postal_code ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">POST</span>
                      <span className="font-semibold text-foreground tracking-wider">{scanFields.postal_code}</span>
                    </div>
                  ) : null}
                  {scanFields.country ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">CTRY</span>
                      <span className="font-semibold text-foreground">{scanFields.country}</span>
                    </div>
                  ) : null}
                  {scanFields.document_date ? (
                    <div className="flex items-center justify-between px-3 py-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">DATE</span>
                        <span className="font-semibold text-foreground">{scanFields.document_date}</span>
                      </div>
                      {(() => {
                        const docDate = new Date(scanFields.document_date!);
                        const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                        return docDate < threeMonthsAgo ? (
                          <span className="flex items-center gap-1 text-red-600 font-semibold flex-shrink-0">
                            <CircleX className="w-3.5 h-3.5" /> OUTDATED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold flex-shrink-0">
                            <CircleCheck className="w-3.5 h-3.5" /> RECENT
                          </span>
                        );
                      })()}
                    </div>
                  ) : null}

                  {/* Document number row */}
                  {scanFields.document_number ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">DOC #</span>
                      <span className="font-semibold text-foreground tracking-wider">{scanFields.document_number}</span>
                    </div>
                  ) : null}

                  {/* Expiry row */}
                  {scanFields.expiry_date ? (
                    <div className="flex items-center justify-between px-3 py-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground uppercase tracking-wide text-[10px] w-14 flex-shrink-0">EXPIRY</span>
                        <span className="font-semibold text-foreground">{scanFields.expiry_date}</span>
                      </div>
                      {new Date(scanFields.expiry_date) < new Date() ? (
                        <span className="flex items-center gap-1 text-red-600 font-semibold flex-shrink-0">
                          <CircleX className="w-3.5 h-3.5" /> EXPIRED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold flex-shrink-0">
                          <CircleCheck className="w-3.5 h-3.5" /> VALID
                        </span>
                      )}
                    </div>
                  ) : null}

                  {/* Mismatch warning */}
                  {(verification?.nameMatch === false || verification?.dobMatch === false) && (
                    <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 font-sans">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-700 dark:text-amber-400">
                        Details don't fully match Step 1.{verification?.nameMatch === false && verification?.similarity != null && ` Name similarity: ${verification.similarity}%.`} Please verify your name and date of birth are correct — our team will review any discrepancies.
                      </p>
                    </div>
                  )}

                  {/* No fields extracted */}
                  {!scanFields.full_name && !scanFields.date_of_birth && (
                    <div className="px-3 py-2 text-muted-foreground font-sans">
                      Document accepted — MRZ could not be read. An agent will verify manually.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}

export default FileUploadZone;
