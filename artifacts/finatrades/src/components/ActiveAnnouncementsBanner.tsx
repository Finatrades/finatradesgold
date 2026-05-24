import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Ann {
  id: string; title: string; body: string;
  severity: 'info'|'warning'|'success'|'critical';
  ctaLabel: string | null; ctaUrl: string | null;
}

const COLORS: Record<Ann['severity'], { bg: string; border: string; fg: string }> = {
  info:     { bg: '#EEF4FB', border: '#3B82F6', fg: '#1E3A8A' },
  warning:  { bg: '#FEF7E6', border: '#F59E0B', fg: '#78350F' },
  success:  { bg: '#ECFDF5', border: '#10B981', fg: '#064E3B' },
  critical: { bg: '#FEE2E2', border: '#C73B22', fg: '#7F1D1D' },
};

const DISMISS_KEY = 'finatrades:dismissed-announcements';

function loadDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]')); } catch { return new Set(); }
}
function saveDismissed(s: Set<string>) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}

export default function ActiveAnnouncementsBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const q = useQuery({
    queryKey: ['/api/announcements/active'],
    queryFn: async () => (await (await apiRequest('GET', '/api/announcements/active')).json()) as { announcements: Ann[] },
    refetchInterval: 5 * 60 * 1000,
  });
  useEffect(() => { /* hydrate on mount */ }, []);
  const items = (q.data?.announcements ?? []).filter(a => !dismissed.has(a.id));
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {items.map(a => {
        const c = COLORS[a.severity] || COLORS.info;
        return (
          <div key={a.id} className="rounded-lg border-l-4 px-4 py-3 flex items-start justify-between gap-3"
               style={{ background: c.bg, borderLeftColor: c.border, color: c.fg }}>
            <div className="flex-1">
              <div className="font-semibold text-sm">{a.title}</div>
              <div className="text-xs mt-0.5 whitespace-pre-line">{a.body}</div>
              {a.ctaUrl && a.ctaLabel && (
                <a href={a.ctaUrl} className="text-xs font-semibold underline mt-1 inline-block" target="_blank" rel="noopener noreferrer">{a.ctaLabel}</a>
              )}
            </div>
            <button onClick={() => { const next = new Set(dismissed); next.add(a.id); setDismissed(next); saveDismissed(next); }}
                    aria-label="Dismiss" className="text-current opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
