import { useState, useCallback } from 'react';
import type { AdminActionType } from '@/components/admin/AdminOtpModal';
import { apiFetch } from '@/lib/queryClient';

interface UseAdminOtpReturn {
  isOtpModalOpen: boolean;
  pendingAction: {
    actionType: AdminActionType;
    targetId: string;
    targetType: string;
    actionData?: Record<string, any>;
    onComplete: (actionData?: Record<string, any>) => void;
  } | null;
  requestOtp: (params: {
    actionType: AdminActionType;
    targetId: string;
    targetType: string;
    actionData?: Record<string, any>;
    onComplete: (actionData?: Record<string, any>) => void;
  }) => void;
  handleVerified: (actionData?: Record<string, any>) => void;
  closeOtpModal: () => void;
}

export function useAdminOtp(): UseAdminOtpReturn {
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<UseAdminOtpReturn['pendingAction']>(null);

  const requestOtp = useCallback((params: {
    actionType: AdminActionType;
    targetId: string;
    targetType: string;
    actionData?: Record<string, any>;
    onComplete: (actionData?: Record<string, any>) => void;
  }) => {
    setPendingAction({
      actionType: params.actionType,
      targetId: params.targetId,
      targetType: params.targetType,
      actionData: params.actionData,
      onComplete: params.onComplete,
    });
    setIsOtpModalOpen(true);
  }, []);

  const handleVerified = useCallback((actionData?: Record<string, any>) => {
    if (pendingAction?.onComplete) {
      pendingAction.onComplete(actionData);
    }
    setPendingAction(null);
    setIsOtpModalOpen(false);
  }, [pendingAction]);

  const closeOtpModal = useCallback(() => {
    setPendingAction(null);
    setIsOtpModalOpen(false);
  }, []);

  return {
    isOtpModalOpen,
    pendingAction,
    requestOtp,
    handleVerified,
    closeOtpModal,
  };
}

export async function checkIfOtpRequired(
  actionType: AdminActionType,
  adminUserId: string
): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/admin/action-otp/required/${actionType}`, {
      headers: {
        'X-Admin-User-Id': adminUserId,
      },
    });
    const data = await res.json();
    return data.required === true;
  } catch {
    return false;
  }
}

export async function executeWithOtpCheck(params: {
  actionType: AdminActionType;
  targetId: string;
  targetType: string;
  adminUserId: string;
  actionData?: Record<string, any>;
  onOtpRequired: () => void;
  onNoOtpRequired: () => void;
}): Promise<void> {
  const isRequired = await checkIfOtpRequired(params.actionType, params.adminUserId);
  if (isRequired) {
    params.onOtpRequired();
  } else {
    params.onNoOtpRequired();
  }
}
