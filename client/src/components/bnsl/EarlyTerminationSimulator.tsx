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

  // Constants
  const ADMIN_FEE_PERCENT = 0.01; // 1%
  const PENALTY_PERCENT = 0.05;   // 5%

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
  const adminFee = totalSaleProceeds * ADMIN_FEE_PERCENT;
  const earlyPenalty = totalSaleProceeds * PENALTY_PERCENT;
  const reimburseDisbursements = plan.totalPaidMarginUsd;
  
  const totalDeductions = adminFee + earlyPenalty + reimburseDisbursements;
  
  // Step 3: Final Settlement
  const netValueUsd = baseValue - totalDeductions;
  const finalGoldGrams = netValueUsd > 0 ? netValueUsd / simulationPrice : 0;
  
  const lossGrams = plan.goldSoldGrams - finalGoldGrams;
  const lossPercent = (lossGrams / plan.goldSoldGrams) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1A0A2E] border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-6 h-6" />
            Early Termination Simulator
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Calculates the estimated settlement if you terminate Plan {plan.id} today.
            Early termination is a breach of contract and incurs significant penalties.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <Label className="text-white/60">Simulated Market Price (USD/g)</Label>
              <Input 
                type="number" 
                value={simulationPrice}
                onChange={(e) => setSimulationPrice(parseFloat(e.target.value) || 0)}
                className="bg-black/20 border-white/10 mt-1"
              />
            </div>
            <div>
              <Label className="text-white/60">Enrollment Price (USD/g)</Label>
              <div className="text-lg font-bold mt-2">${plan.enrollmentPriceUsdPerGram.toFixed(2)}</div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold border-b border-white/10 pb-2">Deduction Breakdown</h4>
            
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Base Value Valuation</span>
              <span>${baseValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>

            <div className="flex justify-between text-sm text-red-400">
              <span>Admin Fee (1% of Proceeds)</span>
              <span>-${adminFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            
            <div className="flex justify-between text-sm text-red-400">
              <span>Early Termination Penalty (5%)</span>
              <span>-${earlyPenalty.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>

            <div className="flex justify-between text-sm text-red-400">
              <span>Reimburse Received Margins</span>
              <span>-${reimburseDisbursements.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>

            <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
              <span>Net Settlement Value (USD)</span>
              <span>${netValueUsd.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
             <p className="text-sm text-white/60 mb-2">Estimated Gold Returned</p>
             <h3 className="text-3xl font-bold text-white mb-1">
               {finalGoldGrams.toFixed(3)} <span className="text-lg text-white/40">g</span>
             </h3>
             <p className="text-red-400 text-sm">
               Loss of {lossGrams.toFixed(3)} g ({lossPercent.toFixed(1)}%) vs Original Sold
             </p>
          </div>

          <Alert className="bg-red-500/10 border-red-500/20 text-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action is irreversible. The gold returned will be credited to your FinaPay wallet immediately, net of all deductions.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="border-white/10 hover:bg-white/5 text-white">
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
