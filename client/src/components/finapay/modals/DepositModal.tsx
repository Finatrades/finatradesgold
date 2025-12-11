import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePlatform } from '@/context/PlatformContext';
import { Copy, Building, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { settings } = usePlatform();
  const activeAccounts = settings.bankAccounts.filter(acc => acc.isActive);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", {
      description: `${label} copied: ${text}`
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            <span>Bank Deposit</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Transfer funds to one of our bank accounts. Your wallet will be credited once funds arrive (1-3 business days).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {activeAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active bank accounts available for deposit at this time.
            </div>
          ) : (
            activeAccounts.map((account) => (
              <div key={account.id} className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                  <h4 className="font-bold text-foreground">{account.name}</h4>
                  <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded">
                    {account.currency}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase">Beneficiary Name</span>
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-border">
                      <span className="font-medium font-mono">{account.holderName}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(account.holderName, 'Beneficiary')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase">IBAN</span>
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-border">
                      <span className="font-medium font-mono">{account.iban}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(account.iban, 'IBAN')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase">BIC / SWIFT</span>
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-border">
                      <span className="font-medium font-mono">{account.bic}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(account.bic, 'BIC')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase">Bank Name</span>
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-border">
                      <span className="font-medium">{account.bankName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 text-yellow-800 text-xs p-2 rounded flex items-start gap-2 mt-2">
                   <div className="mt-0.5">⚠️</div>
                   <p>Please include your <strong>User ID (REF-8821)</strong> in the transfer reference/memo field to ensure faster processing.</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}