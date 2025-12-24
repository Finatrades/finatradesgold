import { ModeProvider } from './context/ModeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function PrivacyContent() {
  return (
    <div className="min-h-screen bg-[#FAFBFF] text-[#0D0D0D] antialiased">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4 text-[#0D0D0D]">Privacy Policy</h1>
            <p className="text-[#0D0D0D]/60">FINATRADES.COM • Last Updated: 21/11/2025</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-[#0D0D0D]/80 leading-relaxed mb-8">
              This Privacy Policy ("Policy") describes the principles and practices followed by Finatrades Finance SA, Rue Robert Céard 6, 1204 Geneva, Switzerland ("Finatrades", "we", "us", "our"), regarding the collection, use, processing, disclosure, and protection of your personal data.
            </p>

            <p className="text-[#0D0D0D]/80 leading-relaxed mb-8">
              We process your personal data in strict compliance with the Swiss Federal Act on Data Protection (FADP) and its corresponding ordinances. Where applicable, and particularly concerning the personal data of individuals located in the European Economic Area (EEA), we also adhere to the provisions of the European Union General Data Protection Regulation (EU GDPR).
            </p>

            <p className="text-[#0D0D0D]/80 leading-relaxed mb-12">
              By using the Finatrades Platform, you acknowledge that you have read and understood how we process your personal data as described in this Policy.
            </p>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">1. Data Controller & Contact Information</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">The data controller responsible for your personal data is:</p>
              <div className="bg-white rounded-xl p-6 border border-gray-200 mb-4">
                <p className="font-semibold text-[#0D0D0D]">Finatrades Finance SA</p>
                <p className="text-[#0D0D0D]/70">Rue Robert Céard 6</p>
                <p className="text-[#0D0D0D]/70">1204 Geneva</p>
                <p className="text-[#0D0D0D]/70">Switzerland</p>
                <p className="text-[#0D0D0D]/70 mt-2">Email for Data Privacy Inquiries: <a href="mailto:info@finatrades.com" className="text-[#8A2BE2] hover:underline">info@finatrades.com</a></p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">2. Categories of Personal Data We Collect</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">To provide our services and meet our legal obligations, we collect and process the following categories of personal data:</p>
              <ul className="space-y-4 text-[#0D0D0D]/80">
                <li><strong className="text-[#0D0D0D]">Identification and KYC Data:</strong> Full name, date of birth, nationality, government-issued identification numbers (e.g., passport, national ID), copies of identity documents, and photographs.</li>
                <li><strong className="text-[#0D0D0D]">Contact Information:</strong> Residential address, email address, telephone number.</li>
                <li><strong className="text-[#0D0D0D]">Financial and Background Information:</strong> Source of wealth and funds, bank account details, payment card information, and professional background as required for our "know-your-customer" (KYC) and anti-money laundering (AML) checks.</li>
                <li><strong className="text-[#0D0D0D]">Gold Transaction Data:</strong> Details of your gold deposits, purchases, sales, and all transactions involving Gold Certificates, including counterparty information, dates, amounts, and vaulting records.</li>
                <li><strong className="text-[#0D0D0D]">Technical and Usage Data:</strong> IP address, device identifier, browser type, operating system, log data, pages visited, and other information collected through cookies and similar tracking technologies.</li>
                <li><strong className="text-[#0D0D0D]">Communication Data:</strong> Records of your communications with us, including support tickets, emails, and chat logs.</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">3. Purposes & Legal Basis for Processing</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">We process your personal data for the following purposes and based on the corresponding legal grounds:</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-xl overflow-hidden border border-gray-200">
                  <thead>
                    <tr className="bg-[#8A2BE2]/10">
                      <th className="text-left p-4 font-semibold text-[#0D0D0D] border-b border-gray-200">Purpose</th>
                      <th className="text-left p-4 font-semibold text-[#0D0D0D] border-b border-gray-200">Legal Basis (under FADP/GDPR)</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#0D0D0D]/80">
                    <tr className="border-b border-gray-100">
                      <td className="p-4">To onboard you as a customer and perform KYC/AML checks</td>
                      <td className="p-4">Legal Obligation by Law & Legitimate Interest</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="p-4">To provide Platform services (issuing/managing Gold Certificates, facilitating payments through 3rd party)</td>
                      <td className="p-4">Performance as stated on Platform</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="p-4">To prevent, detect, and investigate fraud, money laundering, and other financial crimes</td>
                      <td className="p-4">Legitimate Interest & Legal Obligation by Law</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="p-4">To communicate with you and provide customer support</td>
                      <td className="p-4">Performance as stated on Platform & Legitimate Interest</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="p-4">To ensure the security and integrity of our IT systems and the Platform</td>
                      <td className="p-4">Legitimate Interest</td>
                    </tr>
                    <tr>
                      <td className="p-4">To comply with ongoing regulatory reporting and record-keeping requirements</td>
                      <td className="p-4">Legal Obligation by Law</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">4. Disclosure of Personal Data to Third Parties</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">We may share your personal data with the following categories of recipients, strictly where necessary and under contractual obligations of confidentiality:</p>
              <ul className="space-y-4 text-[#0D0D0D]/80">
                <li><strong className="text-[#0D0D0D]">Regulatory and Governmental Authorities:</strong> Swiss Financial Market Supervisory Authority (FINMA), self-regulatory organizations (SROs), the Swiss Money Laundering Reporting Office (MROS), tax authorities, and other competent bodies, as required by law.</li>
                <li>
                  <strong className="text-[#0D0D0D]">Service Providers (Processors):</strong> Entities that process data on our instructions, including:
                  <ul className="mt-2 ml-6 space-y-1 list-disc">
                    <li>KYC/AML & Identity Verification Vendors</li>
                    <li>Vault Operators & Assayers (for gold deposit and storage verification)</li>
                    <li>Cloud Hosting and IT Infrastructure Providers</li>
                    <li>Auditors, Legal Advisors, and Compliance Consultants</li>
                    <li>Customer Relationship Management (CRM) and Communication Platforms</li>
                  </ul>
                </li>
                <li><strong className="text-[#0D0D0D]">Financial Institutions:</strong> Correspondent banks and payment processors to facilitate fiat currency transactions.</li>
                <li><strong className="text-[#0D0D0D]">Other Users:</strong> As an integral part of our service, when you initiate a payment using a Gold Certificate, certain necessary data (e.g., your registered name and the transaction details) will be disclosed to the recipient User to enable the transaction and for their record-keeping.</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">5. International Data Transfers</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                Your personal data may be transferred to and processed in countries outside Switzerland. We ensure all such international data transfers are conducted lawfully and protected through appropriate legal safeguards, which may include transferring to countries with officially recognized adequate data protection standards, or where necessary to fulfill legal obligations, establish legal claims, or defend our legitimate interests in accordance with applicable data protection laws.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">6. Your Data Subject Rights</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">Under the FADP and, where applicable, the GDPR, you have the following rights regarding your personal data:</p>
              <ul className="space-y-3 text-[#0D0D0D]/80">
                <li><strong className="text-[#0D0D0D]">Right of Access:</strong> You can request a copy of the personal data we hold about you.</li>
                <li><strong className="text-[#0D0D0D]">Right to Rectification:</strong> You can request correction of inaccurate or incomplete data.</li>
                <li><strong className="text-[#0D0D0D]">Right to Erasure (Right to be Forgotten):</strong> You can request the deletion of your data, subject to our legal obligations to retain it (e.g., under Swiss AML law).</li>
                <li><strong className="text-[#0D0D0D]">Right to Restriction of Processing:</strong> You can request that we temporarily halt the processing of your data under certain conditions.</li>
                <li><strong className="text-[#0D0D0D]">Right to Data Portability:</strong> You have the right to receive your data in a structured, machine-readable format.</li>
                <li><strong className="text-[#0D0D0D]">Right to Object:</strong> You can object to the processing of your data based on our legitimate interests.</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mt-4">
                To exercise any of these rights, please contact us at <a href="mailto:info@finatrades.com" className="text-[#8A2BE2] hover:underline">info@finatrades.com</a>. We will respond to your request within 30 days.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">7. Data Retention Periods</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Policy, unless a longer retention period is required or permitted by law. In accordance with Swiss Anti-Money Laundering Law, we are required to retain your identification data, transaction records, and business correspondence for a minimum of ten (10) years after the termination of our business relationship or the execution of an individual transaction.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">8. Data Security Measures</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                We implement robust technical and organizational measures to protect your personal data from unauthorized access, loss, misuse, or alteration. These measures include:
              </p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6">
                <li>Encryption of data in transit (using TLS/SSL protocols) and at rest.</li>
                <li>Multi-Factor Authentication (MFA) for access to the Platform and our internal systems.</li>
                <li>Strict physical and logical access controls to our premises and IT infrastructure.</li>
                <li>Regular security testing, vulnerability assessments, and penetration tests.</li>
                <li>Comprehensive logging and monitoring to detect and respond to security incidents.</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mt-4">
                Despite these measures, no method of transmission over the Internet or electronic storage is 100% secure. Therefore, we cannot guarantee its absolute security.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">9. Use of Cookies and Similar Technologies</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                Our Platform uses cookies to ensure essential functionality, enhance security, and analyze user behavior to improve our services.
              </p>
              <ul className="space-y-3 text-[#0D0D0D]/80">
                <li><strong className="text-[#0D0D0D]">Essential Cookies:</strong> Required for the Platform to function (e.g., login sessions, security).</li>
                <li><strong className="text-[#0D0D0D]">Analytical/Performance Cookies:</strong> Allow us to analyze how users interact with our site to improve its performance.</li>
                <li><strong className="text-[#0D0D0D]">Functionality Cookies:</strong> Remember your preferences to personalize your experience.</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mt-4">
                You can manage your cookie preferences through your browser settings. Please note that disabling certain cookies may impact the functionality of the Platform.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">10. Policy Updates & Notification</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices, services, or legal obligations. The updated version will be indicated by a "Last Revised" date at the top of this page and will be effective immediately upon posting. We will notify you of any material changes via email or a prominent notice on our Platform. Your continued use of our services after such notification constitutes your acceptance of the updated Policy.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <ModeProvider>
      <PrivacyContent />
    </ModeProvider>
  );
}
