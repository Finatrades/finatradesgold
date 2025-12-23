import { Twitter, Linkedin, Instagram, Facebook } from 'lucide-react';
import { useMode } from '../context/ModeContext';
import finatradesLogo from '@/assets/finatrades-logo.png';

const footerLinks = {
  Products: ['FinaVault', 'FinaPay Wallet', 'FinaEarn (BNSL)', 'FinaFinance'],
  Company: ['About Us', 'Careers', 'Press', 'Contact'],
  Legal: ['Terms of Service', 'Privacy Policy', 'Compliance', 'Cookies'],
  Support: ['Help Center', 'Documentation', 'API', 'Status'],
};

const socialIcons = [
  { icon: Twitter, label: 'Twitter' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Facebook, label: 'Facebook' },
];

export default function Footer() {
  const { isPersonal } = useMode();

  return (
    <footer id="contact" className="relative py-16 bg-gradient-to-b from-[#0D001E] to-[#1A0033] border-t border-[#8A2BE2]/20" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-6 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="mb-6">
              <img 
                src={finatradesLogo} 
                alt="Finatrades" 
                className="h-10 w-auto mb-2 brightness-0 invert"
              />
              <p className="text-gray-400 text-sm">Swiss-Regulated Gold Platform</p>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              {isPersonal 
                ? 'Your gateway to owning and managing real physical gold with complete transparency and security.'
                : 'Enterprise-grade gold infrastructure for treasury, trade, and compliance operations.'}
            </p>
            <div className="flex gap-3">
              {socialIcons.map((social) => (
                <button
                  key={social.label}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#8A2BE2]/30 transition-colors group"
                  data-testid={`social-${social.label.toLowerCase()}`}
                >
                  <social.icon className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4 text-sm">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-gray-400 text-sm hover:text-[#F97316] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-[#8A2BE2]/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Finatrades. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs text-center md:text-right max-w-lg">
              Finatrades operates under Swiss regulatory framework. Gold custody and services availability may vary by jurisdiction. This is not investment advice.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
