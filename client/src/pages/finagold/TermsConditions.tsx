import { ModeProvider } from './context/ModeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function TermsContent() {
  return (
    <div className="min-h-screen bg-[#FAFBFF] text-[#0D0D0D] antialiased">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4 text-[#0D0D0D]">Terms and Conditions</h1>
            <p className="text-[#0D0D0D]/60">FINATRADES.COM • Last Updated: December 4, 2025</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-[#0D0D0D]/80 leading-relaxed mb-6">
              These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User," "Customer," "you") and Finatrades Finance SA, a company incorporated under the laws of Switzerland, with its registered office at Rue Robert Céard 6, 1204 Geneva, Switzerland, and registered in the Swiss Commercial Register under CHE-422.960.092 ("Finatrades," "we," "us," "our").
            </p>

            <p className="text-[#0D0D0D]/80 leading-relaxed mb-8">
              These Terms govern your access and use of the services accessible via https://finatrades.com (the "Site") and the associated Platform. The Platform provides a registry and payment system backed by physical gold, allowing for the certification, transfer, and use of gold holdings as a payment method for trade transactions through third-party infrastructure.
            </p>

            <div className="bg-[#8A2BE2]/10 border border-[#8A2BE2]/20 rounded-xl p-6 mb-12">
              <h3 className="text-lg font-bold text-[#0D0D0D] mb-3">IMPORTANT NOTICE</h3>
              <p className="text-[#0D0D0D]/80 text-sm leading-relaxed">
                BY ACCESSING, BROWSING, OR USING THE PLATFORM, YOU EXPLICITLY ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND IRREVOCABLY AGREE TO BE LEGALLY BOUND BY THESE TERMS IN THEIR ENTIRETY. YOU ALSO AGREE TO OUR PRIVACY POLICY, DISCLAIMER, WARRANTY & SECURITY STATEMENT, AND RISK DISCLOSURE STATEMENT (COLLECTIVELY, THE "POLICIES"). IF YOU ARE ENTERING INTO THESE TERMS ON BEHALF OF A LEGAL ENTITY, YOU REPRESENT THAT YOU HAVE THE AUTHORITY TO BIND SUCH ENTITY. IF YOU DO NOT AGREE TO ALL OF THESE TERMS, YOU MUST IMMEDIATELY CEASE ALL USE OF THE PLATFORM AND EXIT THE SITE.
              </p>
            </div>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-[#0D0D0D]">1. Definitions & Interpretation</h2>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#0D0D0D] mb-1">"Customer" or "User"</p>
                  <p className="text-[#0D0D0D]/70 text-sm">means any natural or legal person who accesses or uses the Platform.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#0D0D0D] mb-1">"Gold Certificate"</p>
                  <p className="text-[#0D0D0D]/70 text-sm">means a digital instrument issued and administered on the Platform that certifies the Customer's beneficial ownership of a specific quantity and purity of physical gold that has been deposited, assayed, and stored with a licensed third-party vault operator under a vaulting agreement between the vault operator and the relevant Commercial Partner.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#0D0D0D] mb-1">"Underlying Gold"</p>
                  <p className="text-[#0D0D0D]/70 text-sm">means the specific physical gold bullion (bars, coins) that corresponds to a Gold Certificate. Legal title to the Underlying Gold is held by the Customer, subject to the terms of the vaulting agreement between the Commercial Partner and the third-party vault operator.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#0D0D0D] mb-1">"Platform"</p>
                  <p className="text-[#0D0D0D]/70 text-sm">means the Finatrades digital infrastructure, including websites, apps, and APIs, that acts as a registry and transaction system for Gold Certificates.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#0D0D0D] mb-1">"Commercial Partner"</p>
                  <p className="text-[#0D0D0D]/70 text-sm">refers to Wingold & Metals DMCC, a UAE-licensed precious metals trading company, which utilizes the Platform for specific commercial activities. A Commercial Partner acts as an independent principal in its transactions with Users and is responsible for all arrangements regarding the physical gold, including vaulting agreements.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#0D0D0D] mb-1">"Vaulting Agreement"</p>
                  <p className="text-[#0D0D0D]/70 text-sm">means the separate contractual agreement between the Commercial Partner (Wingold & Metals DMCC) and a licensed third-party vault operator governing the storage, insurance, and safekeeping of physical gold. This agreement is independent of Finatrades and these Terms.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#0D0D0D] mb-1">"Affiliate"</p>
                  <p className="text-[#0D0D0D]/70 text-sm">means, with respect to Finatrades, any entity that directly or indirectly controls, is controlled by, or is under common control with Finatrades. Affiliates may be engaged to perform specific technical, operational, or administrative functions related to the Platform.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#0D0D0D] mb-1">"Swiss Law"</p>
                  <p className="text-[#0D0D0D]/70 text-sm">means all applicable statutory, regulatory, and supervisory frameworks of Switzerland.</p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-[#0D0D0D]">2. Nature of Services, Roles & Responsibilities</h2>
              
              <h3 className="text-xl font-semibold mb-4 text-[#0D0D0D]">2.1. Finatrades' Role as Platform Provider</h3>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">Finatrades operates a technological and administrative platform that provides the following services:</p>
              
              <div className="space-y-4 mb-8">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#8A2BE2] mb-2">A. Gold Certification & Registry</p>
                  <p className="text-[#0D0D0D]/70 text-sm">We provide the digital infrastructure to issue and maintain a registry of Gold Certificates. These Certificates represent beneficial ownership of physical gold that is stored under vaulting agreements managed solely by Commercial Partners.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#8A2BE2] mb-2">B. Gold-Based Payment and Settlement System</p>
                  <p className="text-[#0D0D0D]/70 text-sm">The Platform enables a payment and settlement system where Gold Certificates function as the medium of exchange. This involves the transfer of ownership of a Gold Certificate (and the beneficial interest in the Underlying Gold) to another User on the Platform. All transactions are settled through the transfer of Gold Certificates, representing gold. Finatrades does not accept, hold, or transmit customer funds.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#8A2BE2] mb-2">C. Platform Infrastructure for Commercial Partners</p>
                  <p className="text-[#0D0D0D]/70 text-sm">Finatrades provides the neutral digital infrastructure that enables Commercial Partners to offer their services to Users.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-semibold text-[#8A2BE2] mb-2">D. Operational Support</p>
                  <p className="text-[#0D0D0D]/70 text-sm">Finatrades may engage its Affiliates to provide specific technical, operational, or administrative support for the Platform. Such Affiliates act under Finatrades' instruction and for its benefit, and Finatrades remains responsible for their performance under these Terms.</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-4 text-[#0D0D0D]">2.2. Critical Clarifications of Status (Disclaimers)</h3>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">For the avoidance of doubt, and as a fundamental basis of this agreement:</p>
              <ul className="space-y-3 text-[#0D0D0D]/80 mb-8">
                <li>Finatrades is <strong className="text-[#0D0D0D]">"not a bank"</strong>. Under Swiss law, the activities of trade finance facilitation, payment settlement in commodities, and commodities-linked financing as conducted by Finatrades through this Platform do not constitute deposit-taking from the public and therefore do not require a banking licence. Finatrades does not hold customer money.</li>
                <li>Finatrades is <strong className="text-[#0D0D0D]">"not a custodian"</strong>. The physical Underlying Gold is held exclusively by independent, licensed third-party vault operators under Vaulting Agreements entered into by the Commercial Partner (Wingold). Finatrades acts solely as an administrator of the digital registry for the Gold Certificates.</li>
                <li>Finatrades is <strong className="text-[#0D0D0D]">"not a financial advisor"</strong> and provides no investment, legal, or tax advice.</li>
                <li>Finatrades is <strong className="text-[#0D0D0D]">"not a principal or counterparty"</strong> in commercial gold trading transactions facilitated on the Platform, except where explicitly stated otherwise. Finatrades is a service provider to Commercial Partners, not their agent, partner in a joint venture, or guarantor.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-4 text-[#0D0D0D]">2.3. Commercial Partner Activities – Independent Relationship with Users</h3>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                The Platform hosts commercial activities conducted by independent third-party Commercial Partners, such as Wingold & Metals DMCC ("Wingold"). Wingold utilizes the Finatrades Platform to offer services, including but not limited to, the execution and management of the "Buy-Now-Sell-Later" (BNSL) plan featured on the Platform.
              </p>
              
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Independent Contractor Status</p>
                  <p className="text-[#0D0D0D]/70 text-sm">Wingold is an independent contractor and principal in all its dealings with Users and with third-party vault operators. Its use of the Platform does not create a partnership, joint venture, agency, or employment relationship between Finatrades and Wingold. Finatrades does not control, manage, or supervise Wingold's business operations, compliance, or its agreements with vault operators.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Direct User-Partner Contract</p>
                  <p className="text-[#0D0D0D]/70 text-sm">When you engage in a transaction with a Commercial Partner like Wingold, you are entering into a direct contractual relationship with that Commercial Partner. The terms of that specific transaction, including all commercial terms, warranties, delivery, financial settlement obligations, and crucially, the terms governing the storage and insurance of the physical gold (the Vaulting Agreement), are governed by separate agreements between you and the Commercial Partner and between the Commercial Partner and the vault operator. Finatrades is not a party to any of these agreements.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Vaulting Arrangements</p>
                  <p className="text-[#0D0D0D]/70 text-sm">You acknowledge and agree that any vaulting, storage, insurance, or safekeeping services for the Underlying Gold are provided under a Vaulting Agreement between the Commercial Partner (Wingold) and the third-party vault operator. Finatrades is not a party to this agreement, does not guarantee its performance, and has no liability arising from it.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Limitation of Finatrades' Role</p>
                  <p className="text-[#0D0D0D]/70 text-sm">Finatrades' role is strictly limited to providing the neutral digital registry, recording, and transaction infrastructure. Finatrades does not: (i) engage in the commercial sale, purchase, or physical handling of gold; (ii) guarantee the performance, solvency, or compliance of Wingold or any vault operator; (iii) hold or transfer funds; or (iv) provide any form of insurance or protection for transactions or storage arrangements.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Partner's Sole Responsibility</p>
                  <p className="text-[#0D0D0D]/70 text-sm">Wingold & Metals DMCC remains fully and solely responsible for its own regulatory compliance, licensing, operational conduct, financial obligations, representations made to Users, its agreements with vault operators, and any and all claims arising from its commercial activities or the storage of gold.</p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-[#0D0D0D]">3. User Responsibilities & Representations</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">You represent, warrant, and covenant that you will:</p>
              <ul className="space-y-3 text-[#0D0D0D]/80 list-disc ml-6">
                <li>Provide complete, accurate, and truthful information during onboarding and promptly update it.</li>
                <li>Comply fully with all applicable laws, including Swiss AMLA and international sanctions regimes.</li>
                <li>Maintain the security of your account credentials and authentication devices. You are solely responsible for all activities under your account.</li>
                <li>Not use the Platform for any illegal purpose, including money laundering, terrorist financing, or tax evasion.</li>
                <li>Understand and accept that the Gold Certificate is a digital record of beneficial ownership. Any rights or claims regarding the physical storage, safety, or delivery of the Underlying Gold are governed solely by the separate agreements between you, the Commercial Partner, and the vault operator.</li>
                <li>Conduct your own due diligence on any Commercial Partner (including Wingold) and any associated vault operator before transacting. You acknowledge that Finatrades does not endorse, vet, or guarantee any Commercial Partner or third-party service provider.</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-[#0D0D0D]">4. Gold Certificates & Risk Disclosure</h2>
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <p className="text-red-800 font-semibold mb-2">YOU EXPRESSLY ACKNOWLEDGE AND ACCEPT THE FOLLOWING INHERENT AND SIGNIFICANT RISKS:</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">No Physical Redemption from Finatrades</p>
                  <p className="text-[#0D0D0D]/70 text-sm">A Gold Certificate does not entitle you to take physical possession of the Underlying Gold from Finatrades. It represents a beneficial ownership right exercisable only through the Platform.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Third-Party Vault</p>
                  <p className="text-[#0D0D0D]/70 text-sm">The Underlying Gold is held by independent third-party vault operators under agreements with the Commercial Partner. Finatrades is not a party to these agreements and disclaims all liability for the acts, omissions, insolvency, negligence, or fraud of these operators or for any loss, theft, or damage to the Underlying Gold.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Transaction with Commercial Partner</p>
                  <p className="text-[#0D0D0D]/70 text-sm">Transactions with Commercial Partner (Wingold) are undertaken at your own risk. You are solely responsible for assessing the creditworthiness, reliability, and compliance of any Commercial Partner. Finatrades is not a party to these contracts and bears no liability for the performance, solvency, non-delivery, misrepresentation, breach, or any other conduct of Commercial Partners. The risk of default by a Commercial Partner rests entirely with you.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Price Volatility</p>
                  <p className="text-[#0D0D0D]/70 text-sm">The value of gold can be highly volatile, which will affect the value of your Gold Certificates.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Platform Risk</p>
                  <p className="text-[#0D0D0D]/70 text-sm">The Platform is a critical system. Its unavailability, technical failures, or a security breach could prevent access to or transfer of Gold Certificates.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Regulatory Risk</p>
                  <p className="text-[#0D0D0D]/70 text-sm">Changes in law or regulation may adversely affect the Platform, Gold Certificates, or the ability of Commercial Partners to operate.</p>
                </div>
              </div>
              
              <p className="text-[#0D0D0D]/80 leading-relaxed mt-6">
                Finatrades explicitly disclaims liability for losses arising from: the insolvency, fraud, or default of a vault operator or Commercial Partner; gold price fluctuations; system failures or cyber-attacks; any act or omission of a Commercial Partner or vault operator; or any force majeure event.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">5. Prohibited Users & Jurisdictions</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                Access to and use of the Platform is strictly prohibited for individuals or entities located in, resident of, or incorporated in jurisdictions comprehensively sanctioned by Switzerland, the UN, the EU, or the U.S., or for persons on any sanctions list. Commercial Partners, including Wingold, may impose additional jurisdictional restrictions on their own services.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-[#0D0D0D]">6. Liability Limitation (Under Swiss Law)</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">TO THE FULLEST EXTENT PERMITTED BY THE SWISS CODE OF OBLIGATIONS (OR):</p>
              <ol className="space-y-3 text-[#0D0D0D]/80 list-decimal ml-6">
                <li>Finatrades shall only be liable for direct damages caused by its own intent (dolus) or gross negligence (culpa lata). Liability for slight negligence (culpa levis) is expressly excluded.</li>
                <li>In no event shall Finatrades be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or opportunity.</li>
                <li>Finatrades's total aggregate liability towards you for any and all claims shall be limited to the amount of platform access or administration fees you have paid directly to Finatrades in the three (3) months preceding the event giving rise to the claim.</li>
              </ol>
              <div className="mt-4">
                <p className="font-semibold text-[#0D0D0D] mb-2">No Liability for Third Parties</p>
                <p className="text-[#0D0D0D]/70 text-sm">Finatrades assumes no liability whatsoever for any acts, omissions, breaches, representations, or damages caused by Service Providers, Commercial Partners (including Wingold & Metals DMCC), vault operators, or other Users. Your recourse for any issues with a third party's services or conduct is solely against that third party.</p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-[#0D0D0D]">7. Governing Law, Jurisdiction & Dispute Resolution</h2>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Governing Law for Platform Use</p>
                  <p className="text-[#0D0D0D]/70 text-sm">These Terms, and any dispute arising from your use of the Platform in its capacity as a platform provider, shall be governed by the substantive laws of Switzerland, excluding its conflict of law provisions.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Jurisdiction for Platform Disputes</p>
                  <p className="text-[#0D0D0D]/70 text-sm">Any such dispute shall be subject to the exclusive jurisdiction of the ordinary courts of Geneva, Switzerland. Alternatively, at Finatrades's sole discretion, we may elect to submit any such dispute to final and binding arbitration under the Rules of the International Chamber of Commerce (ICC) seated in Geneva, conducted in English.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Disputes with Commercial Partners or Vault Operators Are Separate</p>
                  <p className="text-[#0D0D0D]/70 text-sm">Any disputes arising from your commercial relationship with a Commercial Partner (e.g., Wingold) or related to vaulting services shall be governed solely by the terms of your separate agreement(s) with those entities and resolved in the forum and manner specified therein. Finatrades is not a necessary or proper party to such disputes. You agree not to name, join, or attempt to involve Finatrades in any legal proceeding against a Commercial Partner or vault operator.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D] mb-2">Indemnification for Involvement in Third-Party Disputes</p>
                  <p className="text-[#0D0D0D]/70 text-sm">You agree to indemnify, defend, and hold harmless Finatrades and its Affiliates from and against any and all claims, damages, liabilities, costs, and expenses (including legal fees) arising from or related to any dispute between you and a Commercial Partner, vault operator, or other third party, including any attempt to involve Finatrades in such a dispute.</p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">8. Termination</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                Finatrades reserves the right to immediately suspend or terminate your access to the Platform for reasons including compliance with legal obligations, suspected violation of these Terms, or any fraudulent conduct. Termination of your access to the Platform does not terminate any separate agreements you may have with Commercial Partners or vault operators, which remain in effect according to their own terms.
              </p>
            </section>

            <div className="border-t border-gray-200 pt-8 mt-12">
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-6">
                IN WITNESS WHEREOF, these Terms have been made accessible and effective as of the date first posted above.
              </p>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <p className="text-[#0D0D0D]/70 mb-2">For questions regarding these Terms, please contact:</p>
                <p className="font-semibold text-[#0D0D0D]">Finatrades Finance SA</p>
                <p className="text-[#0D0D0D]/70">Rue Robert Céard 6</p>
                <p className="text-[#0D0D0D]/70">1204 Geneva</p>
                <p className="text-[#0D0D0D]/70">Switzerland</p>
                <p className="text-[#0D0D0D]/70 mt-2">Email: <a href="mailto:admin@finatrades.com" className="text-[#8A2BE2] hover:underline">admin@finatrades.com</a></p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function TermsConditions() {
  return (
    <ModeProvider>
      <TermsContent />
    </ModeProvider>
  );
}
