import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, ScanLine, ShieldCheck, CircleCheck, CircleX, CircleDot, Globe, Hash, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface ScanFields {
  is_identity_document?: boolean;
  full_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  document_number: string | null;
  expiry_date: string | null;
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
  declaredName?: string;
  declaredDob?: string;
  onScanResult?: (result: ScanFields, verification?: ScanVerification | null) => void;
}

type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'complete' | 'error';

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
  declaredName,
  declaredDob,
  onScanResult,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [scanFields, setScanFields] = useState<ScanFields | null>(null);
  const [verification, setVerification] = useState<ScanVerification | null>(null);
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
      if (progressRef.current) clearInterval(progressRef.current);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    }
  }, [file]);

  const startProgressAnimation = useCallback((targetPct = 90) => {
    setScanStatus('uploading');
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetPct) {
          if (progressRef.current) clearInterval(progressRef.current);
          setScanStatus('scanning');
          return targetPct;
        }
        return prev + Math.random() * 12 + 5;
      });
    }, 100);
  }, []);

  const callOcrApi = useCallback(async (f: File) => {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
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

      const resp = await fetch('/api/kyc/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          base64,
          mimeType: f.type || 'image/jpeg',
          declaredName: declaredName || undefined,
          declaredDob: declaredDob || undefined,
        }),
      });

      if (!resp.ok) throw new Error('Scan request failed');
      const data = await resp.json();
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

      const verif: ScanVerification | null = data.verification ?? null;
      setScanFields(fields);
      setVerification(verif);
      onScanResult?.(fields, verif);
    } catch {
      setScanFields({ full_name: null, date_of_birth: null, nationality: null, document_number: null, expiry_date: null });
      setVerification(null);
    }
    setProgress(100);
    setScanStatus('complete');
  }, [onScanResult, onFile, declaredName, declaredDob]);

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
        startProgressAnimation(90);
        scanTimerRef.current = setTimeout(() => {
          setProgress(100);
          setScanStatus('complete');
        }, 900);
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

              {enableOcr && scanFields && (
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-950/20 divide-y divide-green-100 dark:divide-green-900 text-xs overflow-hidden">
                  {/* Name row */}
                  {scanFields.full_name && (
                    <div className="flex items-center justify-between px-3 py-1.5 gap-2">
                      <span className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                        <CircleDot className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate font-medium text-foreground">{scanFields.full_name}</span>
                      </span>
                      {verification?.nameMatch !== null && verification?.nameMatch !== undefined ? (
                        verification.nameMatch ? (
                          <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-medium flex-shrink-0">
                            <CircleCheck className="w-3.5 h-3.5" /> Name match
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium flex-shrink-0">
                            <CircleX className="w-3.5 h-3.5" /> Name differs
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground flex-shrink-0">Name extracted</span>
                      )}
                    </div>
                  )}

                  {/* DOB row */}
                  {scanFields.date_of_birth && (
                    <div className="flex items-center justify-between px-3 py-1.5 gap-2">
                      <span className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium text-foreground">{scanFields.date_of_birth}</span>
                      </span>
                      {verification?.dobMatch !== null && verification?.dobMatch !== undefined ? (
                        verification.dobMatch ? (
                          <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-medium flex-shrink-0">
                            <CircleCheck className="w-3.5 h-3.5" /> DOB match
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium flex-shrink-0">
                            <CircleX className="w-3.5 h-3.5" /> DOB differs
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground flex-shrink-0">DOB extracted</span>
                      )}
                    </div>
                  )}

                  {/* Nationality row */}
                  {scanFields.nationality && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5">
                      <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">Nationality:</span>
                      <span className="font-medium text-foreground">{scanFields.nationality}</span>
                    </div>
                  )}

                  {/* Document number row */}
                  {scanFields.document_number && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5">
                      <Hash className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">Doc #:</span>
                      <span className="font-medium text-foreground font-mono">{scanFields.document_number}</span>
                    </div>
                  )}

                  {/* Expiry row */}
                  {scanFields.expiry_date && (
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">Expires:</span>
                        <span className="font-medium text-foreground">{scanFields.expiry_date}</span>
                      </div>
                      {new Date(scanFields.expiry_date) < new Date() ? (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <CircleX className="w-3.5 h-3.5" /> Expired
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                          <CircleCheck className="w-3.5 h-3.5" /> Valid
                        </span>
                      )}
                    </div>
                  )}

                  {/* Mismatch warning */}
                  {((verification?.nameMatch === false) || (verification?.dobMatch === false)) && (
                    <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/30">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-700 dark:text-amber-400">
                        Details don't fully match what you entered in Step 1. Please verify your name and date of birth are correct before submitting.
                      </p>
                    </div>
                  )}

                  {/* No fields at all */}
                  {!scanFields.full_name && !scanFields.date_of_birth && (
                    <div className="px-3 py-2 text-muted-foreground">
                      Document accepted — fields could not be auto-extracted. An agent will review manually.
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
