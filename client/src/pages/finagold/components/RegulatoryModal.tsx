import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Building2, FileCheck, Mail, Globe, MapPin, Calendar, Hash, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

interface RegulatoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RegulatoryModal({ open, onOpenChange }: RegulatoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">Trusted & Regulated</DialogTitle>
              <p className="text-gray-600">Complete Regulatory and Legal Information</p>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="p-6 space-y-8">
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                About Finatrades Finance SA
              </h3>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Company Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Full Legal Name</p>
                      <p className="font-medium text-gray-900">Finatrades Finance SA</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Website</p>
                      <p className="font-medium text-purple-600">https://finatrades.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Registered Office</p>
                      <p className="font-medium text-gray-900">Rue Robert-CÉARD 6, 1204, GENEVA</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Canton</p>
                      <p className="font-medium text-gray-900">GENEVA</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Hash className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Company Number (UID)</p>
                      <p className="font-medium text-gray-900">CHE-422.960.092</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Hash className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">LEI Number</p>
                      <a 
                        href="https://search.gleif.org/#/record/894500AF89I6QWOX2V69/record" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-purple-600 hover:text-purple-700"
                      >
                        894500AF89I6QWOX2V69
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Hash className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">SWIFT Code</p>
                      <p className="font-medium text-gray-900">FNFNCHG2</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Date of Formation</p>
                      <p className="font-medium text-gray-900">29.01.2019</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileCheck className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Type of Corporation</p>
                      <p className="font-medium text-gray-900">Société Anonyme LLC</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-purple-600" />
                License Confirmation
              </h3>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 bg-purple-600 text-white text-sm font-semibold rounded-full">FINMA</div>
                  <span className="text-gray-600">Regulatory Supervision</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-4">SO-FIT Member No.: 1186</p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Finatrades Finance SA ("Finatrades") is an authorized member of d'Organisme de Surveillance pour Intermédiaires Financiers & Trustees (SO-FIT) (Member No.: 1186), and as such is subject to supervision by SO-FIT, a supervisory body officially recognized by the Swiss Financial Market Supervisory Authority (FINMA).
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Finatrades' activities, including provision of its digital barter and payment platform, are carried out in compliance with the Swiss Federal Anti-Money Laundering Act (AMLA) and other applicable Swiss and international financial regulations.
                </p>
                <p className="text-gray-600 italic">
                  All regulatory matters regarding Finatrades should be addressed to SO-FIT in its capacity as supervisory body.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Anti-Money Laundering (AML)
              </h3>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Comprehensive AML Compliance Statement</h4>
                <p className="text-gray-700 leading-relaxed mb-6">
                  Finatrades Finance SA ("Finatrades") is subject to the Swiss Federal Anti-Money Laundering Act (AMLA) and operates in full alignment with the Financial Action Task Force (FATF) Recommendations. Switzerland, as a FATF member country, requires Finatrades to identify its customers and verify the identity of the ultimate beneficial owner (UBO) for every relationship and transaction.
                </p>
                <p className="text-gray-700 mb-4">Finatrades' AML & CFT Compliance Program, approved by the Management Board, includes:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-2">Customer Due Diligence (CDD)</h5>
                    <p className="text-sm text-gray-600">Mandatory identity verification of all customers and beneficial owners, including documentation of source of funds and purpose of transactions.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-2">Enhanced Due Diligence (EDD)</h5>
                    <p className="text-sm text-gray-600">Additional scrutiny for Politically Exposed Persons (PEPs), high-risk jurisdictions, and complex structures.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-2">Ongoing Monitoring</h5>
                    <p className="text-sm text-gray-600">Continuous review of transactions to detect and report unusual or suspicious activity.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-2">Record Retention</h5>
                    <p className="text-sm text-gray-600">Secure storage of customer and transaction records for the statutory retention period.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-2">Employee Training</h5>
                    <p className="text-sm text-gray-600">Regular AML/CFT training for all relevant employees to ensure understanding of regulatory obligations.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-2">Risk-Based Approach</h5>
                    <p className="text-sm text-gray-600">Application of the Wolfsberg Principles and other international best practices for risk classification and monitoring.</p>
                  </div>
                </div>
                
                <p className="text-gray-700 mt-6 leading-relaxed">
                  Finatrades does not maintain relationships with shell banks (banks without physical presence or supervision) and ensures that all counterparties are properly regulated entities. These AML policies apply equally to Finatrades' headquarters and any affiliates or branches.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                Compliance Contact
              </h3>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-700 mb-4">
                  For compliance-related inquiries, please use the contact form on our website's Contact Us page.
                </p>
                <a href="mailto:support@finatrades.com" className="text-purple-600 font-medium hover:underline">
                  support@finatrades.com
                </a>
              </div>
            </section>

            <div className="pt-4 border-t">
              <Button 
                onClick={() => onOpenChange(false)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
