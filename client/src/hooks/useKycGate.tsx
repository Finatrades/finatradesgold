import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export function useKycGate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const kycStatus = user?.kycStatus || 'Not Started';
  const isKycApproved = kycStatus === 'Approved';
  const isKycPending = kycStatus === 'In Progress';
  const isKycRejected = kycStatus === 'Rejected';
  const isKycNotStarted = kycStatus === 'Not Started';
  
  const lockReason = isKycApproved 
    ? null 
    : isKycPending 
      ? 'KYC verification is pending approval'
      : isKycRejected
        ? 'KYC verification was rejected. Please re-submit.'
        : 'Complete KYC verification to unlock this feature';

  const guardAction = (callback: () => void) => {
    if (isKycApproved) {
      callback();
    } else {
      toast({
        title: 'Verification Required',
        description: lockReason || 'Please complete KYC verification to continue.',
        variant: 'destructive',
      });
      navigate('/kyc');
    }
  };

  const getButtonProps = (originalOnClick?: () => void) => {
    if (isKycApproved) {
      return {
        disabled: false,
        onClick: originalOnClick,
        title: undefined,
      };
    }
    
    return {
      disabled: true,
      onClick: () => guardAction(() => {}),
      title: lockReason || 'KYC verification required',
      className: 'opacity-50 cursor-not-allowed',
    };
  };

  return {
    kycStatus,
    isKycApproved,
    isKycPending,
    isKycRejected,
    isKycNotStarted,
    lockReason,
    guardAction,
    getButtonProps,
  };
}
