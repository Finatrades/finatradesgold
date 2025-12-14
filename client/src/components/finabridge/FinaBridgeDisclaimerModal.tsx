import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Shield, Scale } from 'lucide-react';

interface FinaBridgeDisclaimerModalProps {
  open: boolean;
  onAccept: () => void;
}

export default function FinaBridgeDisclaimerModal({ open, onAccept }: FinaBridgeDisclaimerModalProps) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">FinaBridge Compliance Disclaimer</DialogTitle>
              <DialogDescription className="text-white/90 mt-1">
                Please read and accept before proceeding
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px] px-6 py-4">
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="font-medium text-red-800">
                The trading of illegal, prohibited, or restricted products and commodities is strictly forbidden on this platform.
              </p>
            </div>

            <p>
              By accessing or using FinaBridge or any Finatrades services, you confirm and acknowledge the following:
            </p>

            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Sanctions & Trade Restrictions</h4>
                <p>
                  You will not trade, sell, source, receive, or distribute any product, commodity, or asset originating from, or linked to, any country, entity, individual, or organization that is subject to international sanctions, trade restrictions, embargoes, or AML/CFT measures, including but not limited to those imposed by the UN, EU, OFAC, FINMA, SECO, FATF, or any other competent authority.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Restricted Jurisdictions</h4>
                <p className="mb-2">
                  You will not engage with any sanctioned persons, banned companies, blacklisted suppliers, restricted geographical origins, or high-risk jurisdictions identified as non-cooperative or subject to financial crime risks, including but not limited to:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Iran', 'North Korea (DPRK)', 'Syria', 'Cuba', 'Sudan', 'South Sudan', 
                    'Yemen', 'Afghanistan', 'Russia', 'Belarus', 'Myanmar (Burma)', 
                    'Venezuela', 'Crimea', 'Donetsk', 'Luhansk', 'Zaporizhzhia', 'Kherson'
                  ].map((country) => (
                    <span key={country} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                      {country}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  ...and any other region or jurisdiction designated under UN, EU, OFAC, UK HMT, SECO, FATF, or any other competent regulatory authority as sanctioned, embargoed, or high-risk.
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-2">Dynamic Updates</h4>
                <p className="text-amber-800">
                  Finatrades may, at its discretion, expand or modify the list of restricted jurisdictions without notice.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Violations & Consequences</h4>
                <p>
                  Any attempt to conduct a transaction involving prohibited, restricted, or suspicious goods, origins, or counterparties will result in immediate suspension or termination of access, without refund, and may be reported to the relevant regulatory or law-enforcement authorities.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Your Responsibility</h4>
                <p>
                  It is solely your responsibility to ensure full compliance with all applicable local, national, and international laws, including sanctions, export-control restrictions, anti-money laundering laws, and counter-terrorism financing obligations.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Liability Exclusion</h4>
                <p className="mb-2">
                  Finatrades Finance SA, Wingold & Metals DMCC, and all associated partners, affiliates, service providers, and settlement entities bear no liability for any consequences arising from:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Your engagement in prohibited or high-risk activities</li>
                  <li>Termination of platform access due to violations</li>
                  <li>Regulatory or enforcement actions taken against you</li>
                  <li>Losses arising from seizure, blocking, freezing, or cancellation of any transaction due to sanctions or compliance issues</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Right to Reject</h4>
                <p>
                  Finatrades and its partners reserve the absolute right to reject, suspend, or block any transaction, customer, shipment, or settlement if any compliance risk, sanctions match, or suspicious activity is identified, without any obligation to disclose the reasoning.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 pt-4 border-t bg-gray-50">
          <div className="flex items-start gap-3 mb-4">
            <Checkbox 
              id="accept-terms" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-1"
              data-testid="checkbox-accept-disclaimer"
            />
            <label htmlFor="accept-terms" className="text-sm text-gray-700 cursor-pointer">
              I have read and understood the above disclaimer. I confirm that I will comply with all applicable sanctions, trade restrictions, and legal requirements when using FinaBridge.
            </label>
          </div>
          
          <Button 
            onClick={handleAccept}
            disabled={!accepted}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
            data-testid="button-accept-disclaimer"
          >
            <Scale className="w-4 h-4 mr-2" />
            Accept & Continue to FinaBridge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
