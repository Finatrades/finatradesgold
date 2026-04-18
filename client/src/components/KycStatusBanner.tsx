import { Link } from 'wouter';
import { AlertTriangle, ShieldCheck, ArrowRight, X, Clock, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface KycStatusBannerProps {
  kycStatus: string;
}

interface KycRefData {
  referenceNumber: string | null;
  slaDeadline: string | null;
}

export default function KycStatusBanner({ kycStatus }: KycStatusBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [refData, setRefData] = useState<KycRefData | null>(null);

  const showsRef = kycStatus === 'Pending Review' || kycStatus === 'In Review';

  useEffect(() => {
    if (!showsRef) return;
    fetch('/api/kyc/my-reference', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.referenceNumber) setRefData(data); })
      .catch(() => null);
  }, [kycStatus]);

  if (dismissed) return null;
  if (kycStatus === 'Approved') return null;

  const getBannerContent = () => {
    switch (kycStatus) {
      case 'Not Started':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          title: 'Identity Verification Required',
          message: 'Complete your KYC verification to unlock all features. Your account is currently in view-only mode.',
          bgColor: 'bg-amber-50 dark:bg-amber-950/20',
          borderColor: 'border-amber-200 dark:border-amber-800/40',
          buttonText: 'Verify Now',
          canDismiss: false
        };
      case 'In Progress':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
          title: 'Verification In Progress',
          message: 'Your KYC verification is being reviewed. Features will be unlocked once approved.',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-800/40',
          buttonText: 'Check Status',
          canDismiss: true
        };
      case 'Rejected':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          title: 'Verification Rejected',
          message: 'Your KYC verification was not approved. Please re-submit with valid documents.',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200 dark:border-red-800/40',
          buttonText: 'Re-submit',
          canDismiss: false
        };
      case 'Changes Requested':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
          title: 'Changes Requested',
          message: 'Our compliance team requires updates to some sections of your KYC submission. Please review and resubmit.',
          bgColor: 'bg-orange-50 dark:bg-orange-950/20',
          borderColor: 'border-orange-200 dark:border-orange-800/40',
          buttonText: 'Fix & Resubmit',
          canDismiss: false
        };
      case 'In Review':
        return {
          icon: <Clock className="w-5 h-5 text-indigo-500" />,
          title: 'Under Active Review',
          message: 'A compliance officer is currently reviewing your KYC submission.',
          bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
          borderColor: 'border-indigo-200 dark:border-indigo-800/40',
          buttonText: 'Check Status',
          canDismiss: true
        };
      case 'Pending Review':
        return {
          icon: <Clock className="w-5 h-5 text-blue-500" />,
          title: 'Pending Review',
          message: 'Your KYC submission is in the review queue. You will be notified once reviewed.',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-800/40',
          buttonText: 'Check Status',
          canDismiss: true
        };
      default:
        return null;
    }
  };

  const content = getBannerContent();
  if (!content) return null;

  return (
    <div
      className={`${content.bgColor} ${content.borderColor} border rounded-lg p-4 mb-4 mx-4 mt-4`}
      data-testid="kyc-status-banner"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5 flex-shrink-0">{content.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground" data-testid="kyc-banner-title">
              {content.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {content.message}
            </p>
            {showsRef && refData?.referenceNumber && (
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  Ref: <span className="font-mono" data-testid="kyc-banner-reference">{refData.referenceNumber}</span>
                </span>
                {refData.slaDeadline && (
                  <span className="text-xs text-muted-foreground">
                    Expected by{' '}
                    <strong className="text-foreground" data-testid="kyc-banner-sla">
                      {new Date(refData.slaDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={kycStatus === 'Changes Requested' ? '/kyc?resubmit=true' : '/kyc'}>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="kyc-banner-cta"
            >
              {content.buttonText}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          {content.canDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="kyc-banner-dismiss"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
