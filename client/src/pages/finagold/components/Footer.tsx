import { Twitter, Linkedin, Instagram, Facebook } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';
import finatradesLogo from '@/assets/finatrades-logo.png';

const footerLinks = {
  Products: [
    { label: 'FinaVault', href: '/finagold/finavault' },
    { label: 'FinaPay Wallet', href: '/finagold/finapay' },
    { label: 'FinaEarn (BNSL)', href: '/finagold/bnsl' },
    { label: 'FinaBridge', href: '/finagold/finabridge' },
  ],
  Company: [
    { label: 'About Us', href: '#about' },
    { label: 'Careers', href: '#' },
    { label: 'Press', href: '#' },
    { label: 'Contact', href: '#contact' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Compliance', href: '#legal' },
    { label: 'Cookies', href: '#' },
  ],
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
    <footer id="contact" className="relative py-16 bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082]" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="mb-6">
              <img 
                src={finatradesLogo} 
                alt="Finatrades" 
                className="h-10 w-auto mb-2"
              />
              <p className="text-white/60 text-sm">Swiss-Regulated Gold Platform</p>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              {isPersonal 
                ? 'Your gateway to owning and managing real physical gold with complete transparency and security.'
                : 'Enterprise-grade gold infrastructure for treasury, trade, and compliance operations.'}
            </p>
            <div className="flex gap-3">
              {socialIcons.map((social) => (
                <button
                  key={social.label}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors group"
                  data-testid={`social-${social.label.toLowerCase()}`}
                >
                  <social.icon className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} id={category === 'Legal' ? 'legal' : undefined}>
              <h4 className="text-white font-semibold mb-4 text-sm">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-white/60 text-sm hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-white/60 text-sm hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-sm">
              © {new Date().getFullYear()} Finatrades. All rights reserved.
            </p>
            <p className="text-white/40 text-xs text-center md:text-right max-w-lg">
              Finatrades operates under Swiss regulatory framework. Gold custody and services availability may vary by jurisdiction. This is not investment advice.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
