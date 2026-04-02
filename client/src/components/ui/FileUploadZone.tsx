import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, Image } from 'lucide-react';
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
    },
    [accept, maxSizeMB, onFile]
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
    onFile(null);
    if (inputRef.current) inputRef.current.value = '';
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
        <div className="border rounded-xl p-3 bg-green-50/40 dark:bg-green-950/20 border-green-200 dark:border-green-800 flex items-center gap-3 group">
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
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium text-green-800 dark:text-green-400 truncate">
                {file.name}
              </span>
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
