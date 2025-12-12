import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'wouter';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a2e] text-white py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] rounded-xl" />
              <span className="text-2xl font-bold tracking-tight text-white">FINATRADES</span>
            </div>
            <p className="text-gray-400 max-w-sm mb-6 leading-relaxed">
              {t('footer.description')}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 text-[#D4AF37]" />
                <span>Dubai Multi Commodities Centre, Dubai, UAE</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail className="w-4 h-4 text-[#D4AF37]" />
                <span>support@finatrades.com</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone className="w-4 h-4 text-[#D4AF37]" />
                <span>+971 4 XXX XXXX</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-[#D4AF37] mb-6">{t('footer.products')}</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/finavault">
                  <span className="text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer" data-testid="footer-link-finavault">
                    {t('nav.finavault')}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/finapay">
                  <span className="text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer" data-testid="footer-link-finapay">
                    {t('nav.finapay')}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/bnsl">
                  <span className="text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer" data-testid="footer-link-bnsl">
                    {t('nav.bnsl')}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/finabridge">
                  <span className="text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer" data-testid="footer-link-finabridge">
                    {t('nav.finabridge')}
                  </span>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-[#D4AF37] mb-6">{t('footer.legal')}</h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-gray-400 hover:text-[#D4AF37] transition-colors" data-testid="footer-link-privacy">
                  {t('footer.privacyPolicy')}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#D4AF37] transition-colors" data-testid="footer-link-terms">
                  {t('footer.termsConditions')}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#D4AF37] transition-colors" data-testid="footer-link-disclaimer">
                  {t('footer.disclaimer')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm text-center md:text-left">
            {t('footer.copyright', { year: year.toString() })}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600">Powered by Finatrades Technology</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
