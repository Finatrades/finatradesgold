import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpRight, CheckCircle2, DollarSign, Loader2, Building2, CreditCard } from 'lucide-react';
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
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to submit withdrawal request";
      toast.error(errorMessage, {
        description: errorMessage.includes('balance') 
          ? 'Please check your available balance and try again.'
          : 'Please try again or contact support if the problem persists.',
        action: {
          label: 'Retry',
          onClick: () => handleSubmit(),
        },
      });
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
      <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-purple-500" />
            <span>Withdraw Funds</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 'form' && "Enter your bank details and withdrawal amount"}
            {step === 'submitted' && "Withdrawal request submitted successfully"}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Panel - Balance & Amount */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-50 rounded-xl p-5 border border-purple-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Available Balance</p>
                    <p className="text-2xl font-bold text-gray-900">${walletBalance.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-purple-200">
                  <Label className="text-sm font-medium text-gray-700">Amount to Withdraw (USD) *</Label>
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-9 bg-white border-gray-200 text-lg font-semibold"
                      max={walletBalance}
                      data-testid="input-withdrawal-amount"
                    />
                  </div>
                  {amount && parseFloat(amount) > walletBalance && (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-md mt-2">
                      <span className="text-red-500">⚠️</span>
                      <span>Insufficient funds. Your balance is ${walletBalance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-purple-50 text-purple-800 text-xs p-4 rounded-lg flex items-start gap-2 border border-purple-200">
                <div className="mt-0.5 text-purple-500">⚠️</div>
                <p className="leading-relaxed">Once submitted, the withdrawal amount will be held from your balance. Funds will be transferred to your bank account within 2-5 business days after admin approval.</p>
              </div>
            </div>

            {/* Right Panel - Bank Details */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Bank Account Details</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">Bank Name *</Label>
                  <Input 
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., Chase Bank"
                    className="mt-1 bg-white"
                    data-testid="input-bank-name"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Account Holder Name *</Label>
                  <Input 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="mt-1 bg-white"
                    data-testid="input-account-name"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Account Number / IBAN *</Label>
                  <Input 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Account number or IBAN"
                    className="mt-1 bg-white"
                    data-testid="input-account-number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-gray-600">Routing Number</Label>
                    <Input 
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      placeholder="Optional"
                      className="mt-1 bg-white"
                      data-testid="input-routing-number"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">SWIFT Code</Label>
                    <Input 
                      value={swiftCode}
                      onChange={(e) => setSwiftCode(e.target.value)}
                      placeholder="Optional"
                      className="mt-1 bg-white"
                      data-testid="input-swift-code"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : step === 'submitted' ? (
          <div className="py-6 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-success-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Withdrawal Request Submitted!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your request is now being reviewed by our team.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
                <p className="font-mono font-bold text-lg text-primary">{referenceNumber}</p>
              </div>
              <div className="bg-success-muted border border-success/20 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="font-mono font-bold text-lg text-success">${parseFloat(amount).toFixed(2)}</p>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> What Happens Next?
              </h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Our team will review and verify your withdrawal request</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Once approved, funds will be sent to your bank account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>You'll receive an email and notification when completed (2-5 business days)</span>
                </li>
              </ol>
            </div>
            
            <div className="bg-info-muted text-info-muted-foreground text-xs p-3 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>You can track your withdrawal status in the Transaction History section of your dashboard.</p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {step === 'form' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!amount || !bankName || !accountName || !accountNumber || submitting || parseFloat(amount) > walletBalance}
                className="bg-purple-500 hover:bg-purple-600"
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
