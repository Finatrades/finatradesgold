import { ModeProvider } from './context/ModeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function DisclaimerContent() {
  return (
    <div className="min-h-screen bg-[#FAFBFF] text-[#0D0D0D] antialiased">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4 text-[#0D0D0D]">Disclaimer</h1>
            <p className="text-[#0D0D0D]/60">FINATRADES.COM • Last Updated: 21/11/2025</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-[#0D0D0D]/80 leading-relaxed mb-12">
              This Disclaimer ("Disclaimer") governs your use of the website https://finatrades.com (the "Site") and the Finatrades Platform (the "Platform") operated by Finatrades Finance SA ("Finatrades," "we," "us," "our"). By accessing the Site or using the Platform, you expressly acknowledge and agree to the terms set forth below.
            </p>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">1. Nature of Information; No Professional Advice</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                All content, materials, and information presented on the Site and Platform are provided for general informational purposes only. Nothing contained herein constitutes:
              </p>
              <ul className="space-y-3 text-[#0D0D0D]/80">
                <li><strong className="text-[#0D0D0D]">Investment Advice:</strong> A recommendation, solicitation, or offer to buy or sell any financial instrument or commodity.</li>
                <li><strong className="text-[#0D0D0D]">Financial Advice:</strong> Guidance on investment strategies, financial planning, or the suitability of using gold for trade finance.</li>
                <li><strong className="text-[#0D0D0D]">Legal or Tax Advice:</strong> An opinion on your legal rights, obligations, or the tax implications of your transactions.</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mt-4">
                You are solely responsible for consulting with qualified professional advisors (legal, tax, financial) before engaging in any transactions.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">2. No Reliance on Accuracy</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                While Finatrades strives to provide reliable information, we do not warrant or guarantee the accuracy, completeness, timeliness, or reliability of any data, including but not limited to:
              </p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6">
                <li>Gold price feeds and market data.</li>
                <li>Information regarding third-party vaults and assayers.</li>
                <li>Transactional data and settlement statuses.</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mt-4">
                All information is subject to change without notice and may include estimates or delays.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">3. Service Provision "As Is"</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                The Platform and all related services are provided on an "as is" and "as available" basis. To the fullest extent permitted under Swiss law, Finatrades expressly disclaims all warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that:
              </p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6">
                <li>The Platform will be uninterrupted, secure, or error-free.</li>
                <li>The services will meet your specific requirements.</li>
                <li>Any errors in the software or systems will be corrected.</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">4. Third-Party Services and Links</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                The Platform relies on and may contain links to third-party services, including vault operators, assayers, payment processors, and financial institutions. Finatrades is not responsible or liable for:
              </p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6">
                <li>The acts, omissions, performance, or solvency of any third-party service provider.</li>
                <li>The content, accuracy, or security of any third-party websites or platforms.</li>
                <li>Any loss or damage incurred as a result of your interactions with such third parties.</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mt-4">
                Your relationship with any third-party provider is governed solely by your agreements with them.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 text-[#0D0D0D]">5. Limitation of Liability</h2>
              <p className="text-[#0D0D0D]/80 leading-relaxed mb-4">
                To the maximum extent permitted by the Swiss Code of Obligations, Finatrades shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to:
              </p>
              <ul className="space-y-2 text-[#0D0D0D]/80 list-disc ml-6">
                <li>Loss of profits, revenue, or business opportunities.</li>
                <li>Loss of or damage to your Gold Certificates or the Underlying Gold held in vaults.</li>
                <li>Damages arising from cyber-attacks, system failures, unauthorized access, or data breaches.</li>
                <li>Damages resulting from the default, insolvency, or fraudulent actions of a vault operator or other Service Provider.</li>
                <li>Any trading losses or operational losses you may incur.</li>
              </ul>
              <p className="text-[#0D0D0D]/80 leading-relaxed mt-4">
                In accordance with Swiss law, particularly regarding the exclusion of liability for slight negligence, Finatrades's liability is strictly limited as defined in our Terms and Conditions.
              </p>
            </section>

            <div className="border-t border-gray-200 pt-8 mt-12">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <p className="font-semibold text-[#0D0D0D]">Finatrades Finance SA</p>
                <p className="text-[#0D0D0D]/70">Rue Robert Céard 6</p>
                <p className="text-[#0D0D0D]/70">1204 Geneva</p>
                <p className="text-[#0D0D0D]/70">Switzerland</p>
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
      <DisclaimerContent />
    </ModeProvider>
  );
}
