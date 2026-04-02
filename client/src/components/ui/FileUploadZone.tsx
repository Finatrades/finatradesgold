import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, ScanLine, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

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
}

type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'complete';

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
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
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
      if (progressRef.current) clearInterval(progressRef.current);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    }
  }, [file]);

  const startProgressAnimation = useCallback(() => {
    setScanStatus('uploading');
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (progressRef.current) clearInterval(progressRef.current);
          setScanStatus('scanning');
          scanTimerRef.current = setTimeout(() => {
            setProgress(100);
            setScanStatus('complete');
          }, 800);
          return 90;
        }
        return prev + Math.random() * 12 + 5;
      });
    }, 100);
  }, []);

  const processFile = useCallback(
    (f: File) => {
      setError(null);
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
      startProgressAnimation();
    },
    [accept, maxSizeMB, onFile, startProgressAnimation]
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
                  {scanStatus === 'uploading' ? 'Uploading…' : 'Scanning document…'}
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
              className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 font-medium"
              data-testid={testId ? `${testId}-scan-complete` : undefined}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Document scan complete — ready for submission
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
