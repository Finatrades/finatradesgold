import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'wouter';

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 py-16 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-secondary to-primary rounded-lg" />
              <span className="text-xl font-bold tracking-tight text-foreground">Finatrades</span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6">
              {t('footer.description')}
            </p>
            <p className="text-muted-foreground/60 text-sm">
              {t('contact.address')}: {t('contact.companyDesc')}
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-foreground mb-6">{t('footer.products')}</h4>
            <ul className="space-y-4">
              <li><Link href="/finavault"><span className="text-muted-foreground hover:text-secondary transition-colors cursor-pointer">{t('nav.finavault')}</span></Link></li>
              <li><Link href="/finapay"><span className="text-muted-foreground hover:text-secondary transition-colors cursor-pointer">{t('nav.finapay')}</span></Link></li>
              <li><Link href="/bnsl"><span className="text-muted-foreground hover:text-secondary transition-colors cursor-pointer">{t('nav.bnsl')}</span></Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-foreground mb-6">{t('footer.legal')}</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">{t('footer.privacyPolicy')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">{t('footer.termsConditions')}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">{t('footer.disclaimer')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground/60 text-sm text-center md:text-left">
            {t('footer.copyright', { year: year.toString() })}
          </p>
          <div className="flex items-center gap-6">
            {/* Social icons could go here */}
          </div>
        </div>
      </div>
    </footer>
  );
}
