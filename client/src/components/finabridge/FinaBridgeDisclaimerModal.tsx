import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, Scale, FileText, ArrowLeft, Package, Ship, ArrowLeftRight } from 'lucide-react';

type FinaBridgeRole = 'importer' | 'exporter' | 'both';

interface FinaBridgeDisclaimerModalProps {
  open: boolean;
  onAccept: (role: FinaBridgeRole) => void;
}

export default function FinaBridgeDisclaimerModal({ open, onAccept }: FinaBridgeDisclaimerModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [selectedRole, setSelectedRole] = useState<FinaBridgeRole | null>(null);

  const handleAccept = () => {
    if (accepted && selectedRole) {
      onAccept(selectedRole);
    }
  };

  if (showFullTerms) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFullTerms(false)}
                className="text-white hover:bg-white/20 p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">FinaBridge – Trade Finance Terms & Conditions</DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  Gold-Backed Trade Infrastructure
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[500px] px-6 py-4">
            <div className="prose prose-sm max-w-none text-gray-700">
              <h2 className="text-lg font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="mb-2">1.1. Finatrades provides a regulated Gold-Backed Trade Infrastructure designed for corporates, importers, exporters, trading houses, and institutional partners.</p>
              <p className="mb-2">1.2. FinaBridge is a Gold-Backed Trade Infrastructure enabling structured trade support for buyers and sellers through verified gold-backed value, transparent documentation, and coordinated settlement flows for international trade operations.</p>
              <p className="mb-2">1.3. Through a strategic partnership with Wingold & Metals DMCC, Finatrades transforms physical gold into a settlement-ready solution for importers and exporters.</p>
              <p className="mb-2">1.4. Finatrades does not hold, receive, store, or process fiat currency. All trade funds are converted into gold, and only gold is held, allocated, transferred, or settled.</p>
              <p className="mb-4">1.5. All gold transactions—purchase, sale, conversion, withdrawal, settlement, and buy-back—are carried out exclusively by Wingold & Metals DMCC, the licensed precious metals operator. Finatrades does not buy, sell, refine, store, or take title to gold at any time.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">2. Role of Finatrades</h2>
              <p className="mb-2">2.1. Finatrades provides digital infrastructure, documentation workflows, verification tools, dashboards, allocation systems, and settlement coordination for trade operations.</p>
              <p className="mb-2">2.2. Finatrades does not:</p>
              <ul className="list-disc list-inside mb-2 ml-4">
                <li>Act as a party to the commercial transaction between Importer and Exporter</li>
                <li>Receive or hold customer fiat currency</li>
                <li>Act as a custodian of gold</li>
                <li>Act as a bank, trustee, broker, or financial institution</li>
                <li>Guarantee or insure performance of the Importer or Exporter</li>
              </ul>
              <p className="mb-4">2.3. The Importer and Exporter enter into their own independent Commercial Contract, and Finatrades only facilitates the structured gold-backed settlement process through digital infrastructure.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">3. Trade Settlement Through Gold</h2>
              <p className="mb-2">3.1. The Importer may settle the value of the underlying trade by converting funds into gold on the Platform.</p>
              <p className="mb-2">3.2. Once purchased, gold is allocated to the Importer and stored in a secure third-party vault arranged by Wingold & Metals DMCC on the Importer's behalf.</p>
              <p className="mb-2">3.3. Settlement occurs by transferring allocated gold from the Importer to the Exporter via the Finatrades Platform, subject to the Exporter's confirmation of shipment or fulfillment of contract conditions.</p>
              <p className="mb-4">3.4. At no point does Finatrades hold fiat currency or gold.</p>

              <h3 className="text-md font-bold text-gray-900 mb-2">3.5. Gold Locking Mechanism & Conditional Release</h3>
              <p className="mb-2"><strong>3.5.1. Locking of Gold Upon Agreement:</strong> Upon conclusion of a binding commercial agreement between the Importer and Exporter using the Platform, the Importer irrevocably and unconditionally authorizes Wingold & Metals DMCC to automatically place a lock ("Gold Lock") on the specific quantity of gold allocated for that transaction.</p>
              <p className="mb-2"><strong>3.5.2. Effect of the Gold Lock:</strong></p>
              <ul className="list-disc list-inside mb-2 ml-4">
                <li>The gold shall be held in a restricted account and cannot be accessed, withdrawn, transferred, or used for any other transaction by the Importer.</li>
                <li>The gold shall not be released to the Exporter until all release conditions are met.</li>
                <li>The Gold Lock serves as a digital escrow mechanism but does not constitute a transfer of title.</li>
              </ul>
              <p className="mb-2"><strong>3.5.3. Conditions for Release to Exporter:</strong></p>
              <ul className="list-disc list-inside mb-2 ml-4">
                <li>Documentary Proof: The Exporter must upload valid shipment documents or proof of delivery.</li>
                <li>Importer's Release Instruction: The Importer must provide a final electronic instruction to release the gold.</li>
              </ul>
              <p className="mb-4"><strong>3.5.4. Transaction Cancellation:</strong> Once a transaction is initiated and gold is locked, it cannot be unilaterally cancelled by either party. Cancellation requires the written consent of the other party or a valid court order.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">4. Exporter Settlement Options</h2>
              <p className="mb-2"><strong>Option A – Settlement in Gold:</strong> Receive title transfer of the allocated gold directly into the Exporter's gold account.</p>
              <p className="mb-2"><strong>Option B – Cash-Out Conversion:</strong> Wingold & Metals DMCC will purchase the allocated gold from the Exporter at the prevailing market rate and transfer the corresponding fiat value to the Exporter's designated bank account.</p>
              <p className="mb-4"><strong>Gold Pricing:</strong> All gold transactions shall be executed at the current gold price displayed on the Platform at the time of request. The price shown at confirmation is final, binding, and conclusive.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">5. Gold Handling and Custody</h2>
              <p className="mb-2">5.1. All gold trading, allocation, storage, custody, buy-back, and settlement is conducted solely by Wingold & Metals DMCC.</p>
              <p className="mb-2">5.2. Gold is held in secure vault facilities approved by Wingold & Metals DMCC.</p>
              <p className="mb-4">5.3. Finatrades does not take possession of gold or act as custodian.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">6. Compliance and KYC/AML Requirements</h2>
              <p className="mb-2">6.1. Users must complete KYC and AML verification before using FinaBridge.</p>
              <p className="mb-2">6.2. Additional compliance checks may be required by Wingold & Metals DMCC prior to gold allocation or settlement.</p>
              <p className="mb-4">6.3. Finatrades reserves the right to suspend or decline a transaction if compliance risk is detected.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">7. Fee Allocation and Responsibility</h2>
              <p className="mb-2"><strong>7.1. Platform Fees (Finatrades):</strong> The Importer and Exporter shall agree in their Commercial Contract who shall bear the Finatrades platform fees. If not otherwise specified, platform fees shall be shared equally.</p>
              <p className="mb-2"><strong>7.2. Gold-Related Fees (Wingold & Metals DMCC):</strong> All fees related to gold conversion, storage, buy-back, spreads, and transaction execution are determined and charged exclusively by Wingold & Metals DMCC.</p>
              <p className="mb-2"><strong>7.3. Transaction Fee Transparency:</strong> All applicable fees will be displayed before transaction confirmation.</p>
              <p className="mb-4"><strong>7.4. Indemnification:</strong> The Importer and Exporter jointly agree to indemnify and hold harmless Finatrades and Wingold & Metals DMCC from any claims arising from fee allocation disagreements.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">8. No Responsibility for Commercial Disputes</h2>
              <p className="mb-2">8.1. Product quality issues, delivery delays, quantity disputes, non-performance, or any contractual disagreement between Importer and Exporter are outside the scope of Finatrades and Wingold & Metals DMCC.</p>
              <p className="mb-4">8.2. Finatrades does not mediate or resolve disputes related to the Commercial Contract.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">9. Platform Fees</h2>
              <p className="mb-2">9.1. Finatrades may charge platform, processing, coordination, documentation, or administrative fees.</p>
              <p className="mb-4">9.2. All fees related to gold conversion, buy-back, storage, or spreads are determined exclusively by Wingold & Metals DMCC.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">10. Electronic Instructions and Records</h2>
              <p className="mb-2">10.1. All instructions submitted via the Platform are considered valid and binding.</p>
              <p className="mb-4">10.2. System records, logs, certificates, and digital allocation notices constitute valid and enforceable evidence of transactions and settlement instructions.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">11. Liability and Limitations</h2>
              <p className="mb-2">11.1. Finatrades' liability is strictly limited to the platform fees collected for the specific transaction.</p>
              <p className="mb-2">11.2. Finatrades shall not be liable for:</p>
              <ul className="list-disc list-inside mb-2 ml-4">
                <li>Any gold market price fluctuation</li>
                <li>Commercial disputes between Importer and Exporter</li>
                <li>Delays caused by banks, service providers, or compliance checks</li>
                <li>Indirect, incidental, or consequential losses</li>
              </ul>
              <p className="mb-4">11.3. Wingold & Metals DMCC is exclusively responsible for all gold-related operations.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">12. Sanctions, Restricted Products & Prohibited Origins</h2>
              <p className="mb-2"><strong>12.1. Prohibited and Illegal Trading:</strong> The trading of illegal, prohibited, or restricted products and commodities is strictly forbidden on this Platform.</p>
              <p className="mb-2"><strong>12.2. Sanctioned Countries, Entities & Individuals:</strong> You shall not trade, sell, source, receive, transport, or otherwise engage with any product originating from, or linked to, any country, entity, individual, or organization that is subject to international sanctions, embargoes, or AML/CFT restrictions.</p>
              <p className="mb-2"><strong>12.3. Restricted Jurisdictions and High-Risk Territories:</strong> You agree not to engage with sanctioned persons, banned companies, blacklisted suppliers, restricted geographical origins, or high-risk jurisdictions including but not limited to: Iran, North Korea (DPRK), Syria, Cuba, Sudan, South Sudan, Yemen, Afghanistan, Russia, Belarus, Myanmar (Burma), Venezuela, Crimea, Donetsk, Luhansk, Zaporizhzhia, Kherson.</p>
              <p className="mb-2"><strong>12.4. Dynamic Sanctions List:</strong> Finatrades may, at its sole discretion, expand, update, or modify the list of restricted jurisdictions without prior notice.</p>
              <p className="mb-2"><strong>12.5. Suspension & Reporting of Violations:</strong> Any attempt to conduct a transaction involving prohibited goods will result in immediate suspension or termination of Platform access, without refund, and may be reported to relevant regulatory or law-enforcement authorities.</p>
              <p className="mb-2"><strong>12.6. User Responsibility for Legal Compliance:</strong> It is solely your responsibility to ensure continuous compliance with all applicable local, national, and international laws.</p>
              <p className="mb-2"><strong>12.7. Liability Exclusion:</strong> Finatrades Finance SA, Wingold & Metals DMCC, and all associated partners shall not be liable for any consequences arising from your engagement in prohibited or high-risk activities, termination of platform access, regulatory actions, or losses due to seizure, blocking, freezing, cancellation, or delay of any transaction due to sanctions or compliance issues.</p>
              <p className="mb-4"><strong>12.8. Right to Reject Transactions:</strong> Finatrades and its partners reserve the absolute right to reject, suspend, block, or delay any transaction, customer, shipment, gold settlement, or instruction if any compliance risk, sanctions match, or suspicious activity is identified—without obligation to disclose the basis of such decision.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">13. Governing Law</h2>
              <p className="mb-4">13.1. These Terms are governed by the laws applicable to Finatrades Finance SA (Switzerland), unless otherwise mandated by regulatory requirements.</p>

              <h2 className="text-lg font-bold text-gray-900 mb-4">14. Acceptance</h2>
              <p className="mb-2">By using FinaBridge, the Importer and Exporter confirm that they:</p>
              <ul className="list-disc list-inside mb-4 ml-4">
                <li>Have read and understood these Terms and Conditions</li>
                <li>Agree to be bound by all provisions herein</li>
                <li>Acknowledge the roles and responsibilities of Finatrades and Wingold & Metals DMCC</li>
                <li>Accept the fee structure and liability limitations</li>
                <li>Confirm compliance with all applicable laws and regulations</li>
              </ul>
            </div>
          </ScrollArea>

          <div className="p-6 pt-4 border-t bg-gray-50">
            <Button 
              onClick={() => setShowFullTerms(false)}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Disclaimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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

        <div className="p-6 pt-4 border-t bg-gray-50 space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowFullTerms(true)}
            className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
            data-testid="button-view-full-terms"
          >
            <FileText className="w-4 h-4 mr-2" />
            View Full Terms & Conditions
          </Button>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Ship className="w-5 h-5" />
              Select Your Role
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              Please indicate your primary role in trade operations:
            </p>
            <RadioGroup 
              value={selectedRole || ''} 
              onValueChange={(value) => setSelectedRole(value as FinaBridgeRole)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                <RadioGroupItem value="importer" id="role-importer" data-testid="radio-role-importer" />
                <Label htmlFor="role-importer" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Importer</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">I buy goods/commodities and need to pay suppliers</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                <RadioGroupItem value="exporter" id="role-exporter" data-testid="radio-role-exporter" />
                <Label htmlFor="role-exporter" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Ship className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-gray-900">Exporter</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">I sell goods/commodities and receive payments</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                <RadioGroupItem value="both" id="role-both" data-testid="radio-role-both" />
                <Label htmlFor="role-both" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-gray-900">Both</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">I operate as both importer and exporter</p>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="flex items-start gap-3">
            <Checkbox 
              id="accept-terms" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-1"
              data-testid="checkbox-accept-disclaimer"
            />
            <label htmlFor="accept-terms" className="text-sm text-gray-700 cursor-pointer">
              I have read and understood the above disclaimer and the full Terms & Conditions. I confirm that I will comply with all applicable sanctions, trade restrictions, and legal requirements when using FinaBridge.
            </label>
          </div>
          
          <Button 
            onClick={handleAccept}
            disabled={!accepted || !selectedRole}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold disabled:opacity-50"
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
