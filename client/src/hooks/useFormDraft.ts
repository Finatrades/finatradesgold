import { useEffect, useRef, useCallback, useState } from 'react';

interface UseFormDraftOptions<T> {
  key: string;
  data: T;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseFormDraftReturn {
  savedAt: Date | null;
  isDirty: boolean;
  save: () => void;
  load: <T>() => T | null;
  clear: () => void;
}

export function useFormDraft<T>({
  key,
  data,
  debounceMs = 500,
  enabled = true,
}: UseFormDraftOptions<T>): UseFormDraftReturn {
  const [savedAt, setSavedAt] = useState<Date | null>(() => {
    try {
      const raw = localStorage.getItem(`${key}_meta`);
      if (raw) {
        const meta = JSON.parse(raw);
        return meta.savedAt ? new Date(meta.savedAt) : null;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [isDirty, setIsDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<T>(data);

  dataRef.current = data;

  const save = useCallback(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(key, JSON.stringify(dataRef.current));
      const now = new Date();
      localStorage.setItem(`${key}_meta`, JSON.stringify({ savedAt: now.toISOString() }));
      setSavedAt(now);
      setIsDirty(false);
    } catch {
      // storage full or unavailable
    }
  }, [key, enabled]);

  const load = useCallback(<R>(): R | null => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as R;
    } catch {
      // ignore
    }
    return null;
  }, [key]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_meta`);
    setSavedAt(null);
    setIsDirty(false);
  }, [key]);

  useEffect(() => {
    if (!enabled) return;
    setIsDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, debounceMs, save, enabled]);

  return { savedAt, isDirty, save, load, clear };
}
