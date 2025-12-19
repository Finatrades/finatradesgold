import React from 'react';
import { Shield, Info } from 'lucide-react';

interface GoldBackedDisclosureProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export default function GoldBackedDisclosure({ variant = 'compact', className = '' }: GoldBackedDisclosureProps) {
  if (variant === 'full') {
    return (
      <div className={`bg-purple-50 border border-purple-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="w-5 h-5 text-fuchsia-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">Gold-Backed Balance Disclosure</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your balance is not cash. It represents physical gold that you legally own, digitally recorded by 
              <span className="font-medium text-fuchsia-600"> Finatrades</span> and physically stored by 
              <span className="font-medium text-fuchsia-600"> Wingold & Metals DMCC</span>.
            </p>
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs text-muted-foreground">
                <strong>Certificate Responsibility:</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• <span className="font-medium">Digital Ownership Certificate</span> — Issued by Finatrades</li>
                <li>• <span className="font-medium">Physical Storage Certificate</span> — Issued by Wingold & Metals DMCC</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 ${className}`}>
      <Info className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
      <span>
        Your balance represents physical gold backed 1:1 — digitally recorded by Finatrades and stored by Wingold & Metals DMCC.
      </span>
    </div>
  );
}
