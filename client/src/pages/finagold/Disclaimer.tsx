import { ModeProvider } from './context/ModeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';
import PageSeo from '@/components/PageSeo';

function DisclaimerContent() {
  return (
    <div className="min-h-screen bg-[#FAFBFF] text-[#0D0D0D] antialiased">
      <Navbar />
      <main className="pt-24 pb-20">

        {/* Document Header with Logo */}
        <div className="bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082] py-16">
          <div className="max-w-4xl mx-auto px-6">
            <img
              src={finatradesLogo}
              alt="Finatrades"
              className="h-14 w-auto brightness-0 invert mb-6"
            />
            <h1 className="text-4xl font-bold text-white mb-2">Disclaimer</h1>
            <p className="text-white/60 text-sm tracking-wide uppercase">
              FINATRADES.COM &nbsp;·&nbsp; Last Updated: 07/04/2026
            </p>
          </div>
        </div>

        {/* Document Body */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="prose prose-lg max-w-none">
            <p className="text-[#0D0D0D]/80 leading-relaxed mb-6">
              This Disclaimer ("Disclaimer") governs your use of the website https://finatrades.com (the "Site") and the Finatrades Platform (the "Platform") operated by Finatrades Finance SA ("Finatrades," "we," "us," "our"). By accessing the Site or using the Platform, you expressly acknowledge and agree to the terms set forth below.
            </p>
            <p className="text-[#0D0D0D]/80 leading-relaxed mb-12">
              Where the Platform requires execution of physical gold-related operations (such as gold storage, assay, vaulting, logistics, release, or settlement), certain functions are performed by or in coordination with Wingold DMCC ("Wingold"), acting strictly as an operational service provider on behalf of Finatrades. Wingold does not engage directly with Platform users and assumes no contractual relationship or liability toward them.
            </p>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">1. Nature of Information; No Professional Advice</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                All content, materials, and information presented on the Site and Platform are provided for general informational purposes only. Nothing contained herein constitutes:
              </p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6 mb-4">
                <li>Investment advice</li>
                <li>Financial advice</li>
                <li>Legal or tax advice</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                You are solely responsible for consulting qualified professionals before engaging in any transactions.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">2. No Reliance on Accuracy</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                Finatrades strives to provide reliable information, but does not warrant or guarantee the accuracy, completeness, timeliness, or reliability of:
              </p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6 mb-4">
                <li>market or gold price feeds</li>
                <li>vault and assayer information</li>
                <li>transactional or settlement data</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                All information may change without notice and may include delays, estimates, or third-party dependencies.
              </p>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                Where data is supplied by Wingold as part of its vaulting or assay operations, such information is provided solely on an operational basis and Finatrades does not guarantee its accuracy beyond reasonable verification procedures.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">3. Service Provision "As Is"</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                The Platform and all related services are provided on an "as is" and "as available" basis. Finatrades disclaims all warranties, express or implied, including merchantability, fitness for purpose, and non-infringement.
              </p>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">We do not guarantee that:</p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6 mb-4">
                <li>the Platform will operate uninterrupted</li>
                <li>services will meet user expectations</li>
                <li>any defects will be corrected</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                Wingold's operational activities (vaulting, assay, storage, logistics) are also provided strictly "as is" and subject to operational constraints, third-party facilities, and applicable regulations.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">4. Third-Party Services, Affiliates and Links</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                The Platform interacts with third-party services, including vault operators, assayers, banks, payment processors, insurers, logistics providers, compliance vendors, and affiliated entities and subsidiaries of Finatrades (collectively, "Service Providers"). Finatrades Finance SA may, at its discretion, engage, appoint, or utilize such Service Providers to facilitate various aspects of the Platform and related services, including but not limited to logistics, vaulting, storage, payment processing, compliance, and technology infrastructure.
              </p>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">Accordingly:</p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6 mb-4">
                <li>Finatrades is not responsible or liable for any action, omission, delay, solvency issue, or failure of any Service Provider</li>
                <li>such Service Providers may operate under independent terms, operational constraints, or regulatory obligations</li>
                <li>Finatrades may delegate or outsource functions without prior notice</li>
                <li>links to external websites are accessed at your own risk</li>
                <li>your relationship with any Service Provider is governed solely by your agreements with them</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                All provisions of this Disclaimer, including limitation of liability, exclusion of warranties, and Force Majeure protections, shall apply equally to and for the benefit of such Service Providers, affiliates, and subsidiaries, whether directly or indirectly engaged, to the maximum extent permitted by applicable law.
              </p>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                Nothing in this Disclaimer shall be construed as creating any partnership, joint venture, agency, or fiduciary relationship between Finatrades and any Service Provider.
              </p>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                Wingold is treated as an operational service provider. While Wingold performs specific gold-related functions, Finatrades remains the sole responsible entity for the Platform, and no contractual relationship is created between Wingold and Platform users.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">5. Force Majeure and System Disruptions</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                Finatrades shall not be liable for any failure, delay, interruption, or inability to perform its obligations, provide access to the Platform, display account information, or process any transaction, where such failure or delay arises from events beyond its reasonable control (each a "Force Majeure Event").
              </p>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">Force Majeure Events shall include, without limitation:</p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6 mb-4">
                <li>acts of God, natural disasters, earthquakes, floods, fires, pandemics, or epidemics</li>
                <li>war (declared or undeclared), armed conflict, terrorism, civil unrest, riots, or political instability</li>
                <li>governmental actions, sanctions, embargoes, regulatory restrictions, or changes in law, including situations where governmental authorities do not provide support, intervention, or relief</li>
                <li>failure, disruption, or suspension of banking systems, payment networks, blockchain infrastructure, or financial intermediaries</li>
                <li>cyber-attacks, hacking, data breaches, malware, denial-of-service attacks, or other cybersecurity incidents</li>
                <li>system failures, server downtime, technical malfunctions, software bugs, maintenance outages, or infrastructure breakdowns</li>
                <li>telecommunications failures, internet outages, power failures, or cloud service interruptions</li>
                <li>delays or failures by Service Providers</li>
                <li>market disruptions, liquidity constraints, or extreme volatility affecting gold pricing, settlement, or execution</li>
                <li>customs delays, border closures, or transport/logistics interruptions</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">During any Force Majeure Event:</p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6 mb-4">
                <li>access to the Platform may be suspended, restricted, or unavailable</li>
                <li>users may experience delays or inability to view account balances, holdings, or transaction status</li>
                <li>execution, settlement, conversion, or transfer of funds or gold may be delayed, suspended, or cancelled</li>
                <li>data displayed on the Platform may be delayed, incomplete, or temporarily inaccurate</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                Finatrades shall use commercially reasonable efforts to resume normal operations as soon as practicable; however, it does not guarantee restoration within any specific timeframe.
              </p>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">Users expressly acknowledge and agree that:</p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6 mb-4">
                <li>no liability shall arise for any losses, damages, or delays caused directly or indirectly by a Force Majeure Event</li>
                <li>all transactions are subject to operational, technical, and external dependencies beyond Finatrades' control</li>
                <li>any pending transaction affected by a Force Majeure Event may be executed, adjusted, delayed, or cancelled as deemed necessary</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                Finatrades shall have the right, at its sole discretion, to suspend or modify Platform operations, transaction processing, or account access during a Force Majeure Event without prior notice.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">6. Limitation of Liability</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                To the maximum extent permitted under the Swiss Code of Obligations, Finatrades shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to:
              </p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6 mb-4">
                <li>loss of profits or business opportunities</li>
                <li>loss or damage to Gold Certificates or underlying gold in vaults</li>
                <li>cyber-attacks, system failures, data breaches, or unauthorized access</li>
                <li>failures or defaults of Service Providers</li>
                <li>delays, inaccuracies, or errors in gold operations</li>
                <li>trading, settlement, or operational losses</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                Wingold, acting strictly on Finatrades' instructions, shall have no liability toward Platform users for:
              </p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6 mb-4">
                <li>KYC or customer identity issues</li>
                <li>trading or digital token losses</li>
                <li>financial, investment, or settlement decisions</li>
                <li>errors arising from customer submissions or incorrect instructions</li>
                <li>delays caused by regulators, customs, logistics, or third-party systems</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                Finatrades' liability is strictly limited as defined in the Terms &amp; Conditions, and no additional liability is created by Wingold's operational assistance.
              </p>
            </section>

            {/* Footer Address Block */}
            <div className="border-t border-gray-200 pt-10 mt-12">
              <div className="bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082] rounded-2xl p-8">
                <img
                  src={finatradesLogo}
                  alt="Finatrades"
                  className="h-10 w-auto brightness-0 invert mb-5"
                />
                <div className="grid sm:grid-cols-2 gap-6 text-white/70 text-sm">
                  <div>
                    <p className="font-semibold text-white mb-1">Finatrades Finance SA</p>
                    <p>Rue Robert-Céard 6</p>
                    <p>1204 Geneva</p>
                    <p>Switzerland</p>
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">Contact &amp; Registry</p>
                    <p>LEI: <span className="text-purple-300">894500AF89I6QWOX2V69</span></p>
                    <p>SWIFT: <span className="text-purple-300">FNFNCHG2</span></p>
                    <p>
                      <a href="https://www.finatrades.com" className="text-purple-300 hover:text-purple-200 transition-colors">
                        www.finatrades.com
                      </a>
                    </p>
                  </div>
                </div>
                <p className="text-white/40 text-xs mt-6 pt-6 border-t border-white/20">
                  © {new Date().getFullYear()} Finatrades Finance SA. All rights reserved. This Disclaimer was last revised on 07/04/2026.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Disclaimer() {
  return (
    <ModeProvider>
      <PageSeo
        title="Disclaimer — Finatrades"
        description="Read the Finatrades platform disclaimer covering investment risk, regulatory status, gold price volatility, and the limitations of financial information provided on this site."
        canonical="/disclaimer"
      />
      <DisclaimerContent />
    </ModeProvider>
  );
}
