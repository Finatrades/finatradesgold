import { Link } from 'wouter';
import { AlertTriangle, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface KycStatusBannerProps {
  kycStatus: string;
}

export default function KycStatusBanner({ kycStatus }: KycStatusBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;
  if (kycStatus === 'Approved') return null;

  const getBannerContent = () => {
    switch (kycStatus) {
      case 'Not Started':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          title: 'Identity Verification Required',
          message: 'Complete your KYC verification to unlock all features. Your account is currently in view-only mode.',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-700',
          buttonText: 'Verify Now',
          canDismiss: false
        };
      case 'In Progress':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
          title: 'Verification In Progress',
          message: 'Your KYC verification is being reviewed. Features will be unlocked once approved.',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-700',
          buttonText: 'Check Status',
          canDismiss: true
        };
      case 'Rejected':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          title: 'Verification Rejected',
          message: 'Your KYC verification was not approved. Please re-submit with valid documents.',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-700',
          buttonText: 'Re-submit',
          canDismiss: false
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
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{content.icon}</div>
          <div>
            <h3 className="font-semibold text-foreground" data-testid="kyc-banner-title">
              {content.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {content.message}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kyc">
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
