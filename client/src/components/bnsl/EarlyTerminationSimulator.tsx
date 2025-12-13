import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BnslPlan } from '@/types/bnsl';
import { AlertTriangle, Calculator, ArrowRight, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface EarlyTerminationSimulatorProps {
  plan: BnslPlan;
  currentGoldPrice: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmTermination: () => void;
}

export default function EarlyTerminationSimulator({ 
  plan, 
  currentGoldPrice, 
  isOpen, 
  onClose, 
  onConfirmTermination 
}: EarlyTerminationSimulatorProps) {
  
  const [simulationPrice, setSimulationPrice] = useState(currentGoldPrice);
  const [confirmed, setConfirmed] = useState(false);

  // Use dynamic fee percentages from plan (captured from template at enrollment)
  const adminFeePercent = (plan.adminFeePercent || 0.50) / 100;
  const earlyTerminationFeePercent = (plan.earlyTerminationFeePercent || 2.00) / 100;

  // Calculations
  const totalSaleProceeds = plan.basePriceComponentUsd + plan.totalMarginComponentUsd;
  
  // Step 1: Base Valuation
  // If market price < enrollment price, value drops. If higher, capped at enrollment (face value).
  // Actually, typically in these products, you get the lower of market or face value on the base.
  // Prompt says: If current < enrollment: base = grams * current. Else: base = basePriceComponent.
  const baseValue = simulationPrice < plan.enrollmentPriceUsdPerGram
    ? plan.goldSoldGrams * simulationPrice
    : plan.basePriceComponentUsd;

  // Step 2: Deductions
  const adminFee = totalSaleProceeds * adminFeePercent;
  const earlyPenalty = totalSaleProceeds * earlyTerminationFeePercent;
  const reimburseDisbursements = plan.paidMarginUsd || 0;
  
  const totalDeductions = adminFee + earlyPenalty + reimburseDisbursements;
  
  // Step 3: Final Settlement
  const netValueUsd = baseValue - totalDeductions;
  const finalGoldGrams = netValueUsd > 0 ? netValueUsd / simulationPrice : 0;
  
  const lossGrams = plan.goldSoldGrams - finalGoldGrams;
  const lossPercent = (lossGrams / plan.goldSoldGrams) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white border-border text-foreground max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-6 h-6" />
            Early Termination Simulator
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Calculates the estimated settlement if you terminate Plan {plan.id} today.
            Early termination is a breach of contract and incurs significant penalties.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
            <div>
              <Label className="text-muted-foreground">Simulated Market Price (USD/g)</Label>
              <Input 
                type="number" 
                value={simulationPrice}
                onChange={(e) => setSimulationPrice(parseFloat(e.target.value) || 0)}
                className="bg-background border-input mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Enrollment Price (USD/g)</Label>
              <div className="text-lg font-bold mt-2 text-foreground">${plan.enrollmentPriceUsdPerGram.toFixed(2)}</div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold border-b border-border pb-2 text-foreground">Deduction Breakdown</h4>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base Value Valuation</span>
              <span className="text-foreground">${baseValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>

            <div className="flex justify-between text-sm text-red-500">
              <span>Admin Fee ({(adminFeePercent * 100).toFixed(2)}% of Proceeds)</span>
              <span>-${adminFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            
            <div className="flex justify-between text-sm text-red-500">
              <span>Early Termination Penalty ({(earlyTerminationFeePercent * 100).toFixed(2)}%)</span>
              <span>-${earlyPenalty.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>

            <div className="flex justify-between text-sm text-red-500">
              <span>Reimburse Received Margins</span>
              <span>-${reimburseDisbursements.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>

            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span className="text-foreground">Net Settlement Value (USD)</span>
              <span className="text-foreground">${netValueUsd.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg text-center">
             <p className="text-sm text-muted-foreground mb-2">Estimated Gold Returned</p>
             <h3 className="text-3xl font-bold text-red-600 mb-1">
               {finalGoldGrams.toFixed(3)} <span className="text-lg text-muted-foreground">g</span>
             </h3>
             <p className="text-red-500 text-sm">
               Loss of {lossGrams.toFixed(3)} g ({lossPercent.toFixed(1)}%) vs Original Sold
             </p>
          </div>

          <Alert className="bg-red-500/5 border-red-500/20 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action is irreversible. The gold returned will be credited to your FinaPay wallet immediately, net of all deductions.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="border-border hover:bg-muted text-foreground">
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirmTermination}
            className="bg-red-600 hover:bg-red-700"
          >
            Confirm Early Termination
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
