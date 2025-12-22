import { Twitter, Linkedin, Instagram, Facebook } from 'lucide-react';

const footerLinks = {
  Products: ['Money Transfer', 'Digital Payments', 'Card Services', 'BNSL'],
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
  return (
    <footer className="relative py-16 bg-black border-t border-white/5" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-6 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="mb-6">
              <span className="text-2xl font-bold text-white tracking-tight">FINAGOLD</span>
              <p className="text-gray-500 text-sm mt-1">Powered by Finatrades</p>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Your gateway to modern money management. Send, pay, and earn with confidence.
            </p>
            <div className="flex gap-4">
              {socialIcons.map((social) => (
                <button
                  key={social.label}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#EAC26B]/10 transition-colors group"
                  data-testid={`social-${social.label.toLowerCase()}`}
                >
                  <social.icon className="w-4 h-4 text-gray-400 group-hover:text-[#EAC26B] transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-gray-400 text-sm hover:text-[#EAC26B] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Finagold. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs text-center md:text-right max-w-md">
              Finagold is powered by Finatrades infrastructure. Availability may vary by jurisdiction.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
