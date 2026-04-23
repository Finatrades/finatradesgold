import { useLocation } from 'wouter';
import { AlertTriangle, ShieldCheck, Clock, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KycStatusPillProps {
  kycStatus: string;
  compact?: boolean;
}

interface PillConfig {
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  dotClass: string;
  ringClass: string;
  iconClass: string;
  textClass: string;
  pulse?: boolean;
}

const STATUS_MAP: Record<string, PillConfig> = {
  'Not Started': {
    icon: AlertTriangle,
    label: 'Verify Identity',
    shortLabel: 'Verify',
    dotClass: 'bg-amber-500',
    ringClass: 'border-amber-300/60 dark:border-amber-700/50 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50',
    iconClass: 'text-amber-600 dark:text-amber-400',
    textClass: 'text-amber-700 dark:text-amber-300',
    pulse: true,
  },
  'In Progress': {
    icon: ShieldCheck,
    label: 'KYC In Progress',
    shortLabel: 'In Progress',
    dotClass: 'bg-blue-500',
    ringClass: 'border-blue-300/60 dark:border-blue-700/50 bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50',
    iconClass: 'text-blue-600 dark:text-blue-400',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  'Pending Review': {
    icon: Clock,
    label: 'Pending Review',
    shortLabel: 'Pending',
    dotClass: 'bg-blue-500',
    ringClass: 'border-blue-300/60 dark:border-blue-700/50 bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50',
    iconClass: 'text-blue-600 dark:text-blue-400',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  'In Review': {
    icon: Clock,
    label: 'Under Review',
    shortLabel: 'Review',
    dotClass: 'bg-indigo-500',
    ringClass: 'border-indigo-300/60 dark:border-indigo-700/50 bg-indigo-50/80 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
    textClass: 'text-indigo-700 dark:text-indigo-300',
  },
  'Changes Requested': {
    icon: ShieldAlert,
    label: 'Action Required',
    shortLabel: 'Action',
    dotClass: 'bg-orange-500',
    ringClass: 'border-orange-300/60 dark:border-orange-700/50 bg-orange-50/80 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50',
    iconClass: 'text-orange-600 dark:text-orange-400',
    textClass: 'text-orange-700 dark:text-orange-300',
    pulse: true,
  },
  'Rejected': {
    icon: AlertTriangle,
    label: 'Verification Rejected',
    shortLabel: 'Rejected',
    dotClass: 'bg-red-500',
    ringClass: 'border-red-300/60 dark:border-red-700/50 bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50',
    iconClass: 'text-red-600 dark:text-red-400',
    textClass: 'text-red-700 dark:text-red-300',
    pulse: true,
  },
};

export default function KycStatusPill({ kycStatus, compact = false }: KycStatusPillProps) {
  const [, setLocation] = useLocation();

  if (kycStatus === 'Approved') return null;
  const cfg = STATUS_MAP[kycStatus];
  if (!cfg) return null;

  const Icon = cfg.icon;
  const targetPath = kycStatus === 'Changes Requested' ? '/kyc?resubmit=true' : '/kyc';

  if (compact) {
    return (
      <button
        onClick={() => setLocation(targetPath)}
        className={`relative h-9 w-9 rounded-full border flex items-center justify-center transition-colors shrink-0 ${cfg.ringClass}`}
        title={cfg.label}
        aria-label={cfg.label}
        data-testid="kyc-pill-compact"
      >
        <Icon className={`w-4 h-4 ${cfg.iconClass}`} />
        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${cfg.dotClass} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      </button>
    );
  }

  return (
    <button
      onClick={() => setLocation(targetPath)}
      className={`group relative inline-flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-full border transition-colors shrink-0 ${cfg.ringClass}`}
      title={cfg.label}
      data-testid="kyc-pill"
    >
      <span className="relative flex items-center justify-center">
        <Icon className={`w-4 h-4 ${cfg.iconClass}`} />
        {cfg.pulse && (
          <span className={`absolute inset-0 -m-1 rounded-full ${cfg.dotClass} opacity-30 animate-ping`} />
        )}
      </span>
      <span className={`text-[12px] font-semibold whitespace-nowrap ${cfg.textClass}`}>
        {cfg.shortLabel}
      </span>
    </button>
  );
}
