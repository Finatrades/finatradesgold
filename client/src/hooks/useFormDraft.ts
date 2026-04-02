import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

interface UseFormDraftOptions<T> {
  key: string;
  data: T;
  debounceMs?: number;
  enabled?: boolean;
  apiEndpoint?: string;
  submissionType?: string;
}

interface UseFormDraftReturn<T> {
  savedAt: Date | null;
  isDirty: boolean;
  showResumeBanner: boolean;
  serverDraftData: T | null;
  save: () => void;
  load: <R>() => R | null;
  clear: () => void;
  dismissResume: () => void;
  restoreDraft: () => T | null;
}

export function useFormDraft<T>({
  key,
  data,
  debounceMs = 500,
  enabled = true,
  apiEndpoint,
  submissionType = 'personal',
}: UseFormDraftOptions<T>): UseFormDraftReturn<T> {
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
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [serverDraftData, setServerDraftData] = useState<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<T>(data);
  const initializedRef = useRef(false);

  dataRef.current = data;

  useEffect(() => {
    if (!enabled || !apiEndpoint || initializedRef.current) return;
    initializedRef.current = true;
    fetch(`${apiEndpoint}?submissionType=${submissionType}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.draft?.draftData) {
          setServerDraftData(json.draft.draftData as T);
          const serverTs = json.draft.updatedAt ? new Date(json.draft.updatedAt).getTime() : 0;
          const dismissed = localStorage.getItem(`${key}_resume_dismissed`);
          const dismissedTs = dismissed ? parseInt(dismissed, 10) : 0;
          if (serverTs > dismissedTs) {
            setShowResumeBanner(true);
          }
        }
      })
      .catch(() => {});
  }, [apiEndpoint, submissionType, key, enabled]);

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
    if (apiEndpoint) {
      fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ submissionType, draftData: dataRef.current }),
      }).catch(() => {});
    }
  }, [key, enabled, apiEndpoint, submissionType]);

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
    localStorage.removeItem(`${key}_resume_dismissed`);
    setSavedAt(null);
    setIsDirty(false);
    setShowResumeBanner(false);
    setServerDraftData(null);
    if (apiEndpoint) {
      const deleteUrl = submissionType ? `${apiEndpoint}?submissionType=${submissionType}` : apiEndpoint;
      fetch(deleteUrl, {
        method: 'DELETE',
        credentials: 'include',
      }).catch(() => {});
    }
  }, [key, apiEndpoint, submissionType]);

  const dismissResume = useCallback(() => {
    localStorage.setItem(`${key}_resume_dismissed`, Date.now().toString());
    setShowResumeBanner(false);
  }, [key]);

  const restoreDraft = useCallback((): T | null => {
    dismissResume();
    return serverDraftData;
  }, [serverDraftData, dismissResume]);

  const serializedData = useMemo(() => {
    try { return JSON.stringify(data); } catch { return ''; }
  }, [data]);

  useEffect(() => {
    if (!enabled) return;
    setIsDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [serializedData, debounceMs, save, enabled]);

  return { savedAt, isDirty, showResumeBanner, serverDraftData, save, load, clear, dismissResume, restoreDraft };
}
