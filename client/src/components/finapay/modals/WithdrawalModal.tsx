import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpRight, CheckCircle2, DollarSign, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
}

export default function WithdrawalModal({ isOpen, onClose, walletBalance }: WithdrawalModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'submitted'>('form');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setAmount('');
      setBankName('');
      setAccountName('');
      setAccountNumber('');
      setRoutingNumber('');
      setSwiftCode('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!user || !amount || !bankName || !accountName || !accountNumber) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amountNum > walletBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('POST', '/api/withdrawal-requests', {
        userId: user.id,
        amountUsd: parseFloat(amount).toString(),
        bankName,
        accountName,
        accountNumber,
        routingNumber: routingNumber || null,
        swiftCode: swiftCode || null,
      });
      const data = await res.json();
      
      setReferenceNumber(data.request.referenceNumber);
      setStep('submitted');
      toast.success("Withdrawal request submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-orange-500" />
            <span>Withdraw Funds</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 'form' && "Enter your bank details and withdrawal amount"}
            {step === 'submitted' && "Withdrawal request submitted successfully"}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-5 py-4">
            <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-xl font-bold text-foreground">${walletBalance.toFixed(2)}</p>
              </div>
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>

            <div>
              <Label className="text-sm">Amount to Withdraw (USD) *</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                  max={walletBalance}
                  data-testid="input-withdrawal-amount"
                />
              </div>
              {amount && parseFloat(amount) > walletBalance && (
                <p className="text-xs text-red-500 mt-1">Amount exceeds available balance</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Bank Account Details</h4>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Bank Name *</Label>
                  <Input 
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., Chase Bank"
                    className="mt-1"
                    data-testid="input-bank-name"
                  />
                </div>

                <div>
                  <Label className="text-sm">Account Holder Name *</Label>
                  <Input 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="mt-1"
                    data-testid="input-account-name"
                  />
                </div>

                <div>
                  <Label className="text-sm">Account Number / IBAN *</Label>
                  <Input 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Account number or IBAN"
                    className="mt-1"
                    data-testid="input-account-number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Routing Number</Label>
                    <Input 
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      placeholder="Optional"
                      className="mt-1"
                      data-testid="input-routing-number"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">SWIFT Code</Label>
                    <Input 
                      value={swiftCode}
                      onChange={(e) => setSwiftCode(e.target.value)}
                      placeholder="Optional"
                      className="mt-1"
                      data-testid="input-swift-code"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 text-orange-800 text-xs p-3 rounded-lg flex items-start gap-2">
               <div className="mt-0.5">⚠️</div>
               <p>Once submitted, the withdrawal amount will be held from your balance. Funds will be transferred to your bank account within 2-5 business days after admin approval.</p>
            </div>
          </div>
        ) : step === 'submitted' ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Withdrawal Request Submitted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your withdrawal request is being processed.
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 inline-block">
              <p className="text-xs text-muted-foreground">Reference Number</p>
              <p className="font-mono font-bold text-lg">{referenceNumber}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 inline-block ml-2">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-mono font-bold text-lg">${parseFloat(amount).toFixed(2)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              You will receive an email notification once the withdrawal is processed.
              <br />Funds typically arrive within 2-5 business days.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {step === 'form' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!amount || !bankName || !accountName || !accountNumber || submitting || parseFloat(amount) > walletBalance}
                className="bg-orange-500 hover:bg-orange-600"
                data-testid="button-submit-withdrawal"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Withdrawal
              </Button>
            </>
          )}
          {step === 'submitted' && (
            <Button onClick={handleClose} data-testid="button-close-withdrawal">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
