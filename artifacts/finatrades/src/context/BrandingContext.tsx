import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface BrandingSettings {
  id: string;
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  primaryForeground: string;
  secondaryColor: string;
  secondaryForeground: string;
  accentColor: string;
  buttonRadius: string;
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  fontFamily: string;
  headingFontFamily: string | null;
  backgroundColor: string;
  cardBackground: string;
  sidebarBackground: string;
  borderRadius: string;
  borderColor: string;
  navLinkNames: Record<string, string> | null;
  footerText: string | null;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  } | null;
  isActive: boolean;
}

interface BrandingContextType {
  settings: BrandingSettings | null;
  isLoading: boolean;
  applyTheme: () => void;
}

const DEFAULT_BRANDING: BrandingSettings = {
  id: '',
  companyName: 'Finatrades',
  tagline: null,
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#8A2BE2',
  primaryForeground: '#ffffff',
  secondaryColor: '#eab308',
  secondaryForeground: '#ffffff',
  accentColor: '#f59e0b',
  buttonRadius: '0.5rem',
  buttonPrimaryBg: '#8A2BE2',
  buttonPrimaryText: '#ffffff',
  buttonSecondaryBg: '#f3f4f6',
  buttonSecondaryText: '#1f2937',
  fontFamily: 'Inter',
  headingFontFamily: null,
  backgroundColor: '#ffffff',
  cardBackground: '#ffffff',
  sidebarBackground: '#1f2937',
  borderRadius: '0.5rem',
  borderColor: '#e5e7eb',
  navLinkNames: null,
  footerText: null,
  socialLinks: null,
  isActive: true
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [appliedSettings, setAppliedSettings] = useState<BrandingSettings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/branding'],
    queryFn: async () => {
      const res = await fetch('/api/branding');
      if (!res.ok) return { settings: DEFAULT_BRANDING };
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  const settings = data?.settings || DEFAULT_BRANDING;

  const applyTheme = () => {
    if (!settings) return;
    
    const root = document.documentElement;
    
    root.style.setProperty('--brand-primary', settings.primaryColor);
    root.style.setProperty('--brand-primary-foreground', settings.primaryForeground);
    root.style.setProperty('--brand-secondary', settings.secondaryColor);
    root.style.setProperty('--brand-secondary-foreground', settings.secondaryForeground);
    root.style.setProperty('--brand-accent', settings.accentColor);
    
    root.style.setProperty('--brand-button-radius', settings.buttonRadius);
    root.style.setProperty('--brand-button-primary-bg', settings.buttonPrimaryBg);
    root.style.setProperty('--brand-button-primary-text', settings.buttonPrimaryText);
    root.style.setProperty('--brand-button-secondary-bg', settings.buttonSecondaryBg);
    root.style.setProperty('--brand-button-secondary-text', settings.buttonSecondaryText);
    
    root.style.setProperty('--brand-font-family', settings.fontFamily);
    if (settings.headingFontFamily) {
      root.style.setProperty('--brand-heading-font-family', settings.headingFontFamily);
    }
    
    root.style.setProperty('--brand-background', settings.backgroundColor);
    root.style.setProperty('--brand-card-background', settings.cardBackground);
    root.style.setProperty('--brand-sidebar-background', settings.sidebarBackground);
    
    root.style.setProperty('--brand-border-radius', settings.borderRadius);
    root.style.setProperty('--brand-border-color', settings.borderColor);
    
    if (settings.faviconUrl) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = settings.faviconUrl;
      }
    }
    
    if (settings.companyName) {
      document.title = settings.companyName;
    }
    
    setAppliedSettings(settings);
  };

  useEffect(() => {
    if (settings && !isLoading) {
      applyTheme();
    }
  }, [settings, isLoading]);

  return (
    <BrandingContext.Provider value={{ settings: appliedSettings || settings, isLoading, applyTheme }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
