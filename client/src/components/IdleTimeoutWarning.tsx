import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

interface IdleTimeoutWarningProps {
  open: boolean;
  remainingSeconds: number;
  onStayActive: () => void;
  onLogout: () => void;
}

export default function IdleTimeoutWarning({
  open,
  remainingSeconds,
  onStayActive,
  onLogout,
}: IdleTimeoutWarningProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = minutes > 0 
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}s`;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-fuchsia-600" />
            </div>
            <AlertDialogTitle className="text-xl">Session Timeout Warning</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            You've been inactive for a while. For your security, you'll be automatically signed out in{' '}
            <span className="font-bold text-fuchsia-600 text-lg">{timeDisplay}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={onLogout} className="bg-gray-100 hover:bg-gray-200">
            Sign Out Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={onStayActive} className="bg-primary hover:bg-primary/90" data-testid="button-stay-active">
            Stay Signed In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
