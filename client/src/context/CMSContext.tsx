import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface CMSPageContent {
  page: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    module: string | null;
    isActive: boolean;
  };
  content: Record<string, Record<string, string | null>>;
}

export interface CMSData {
  pages: Record<string, CMSPageContent>;
}

interface CMSContextType {
  data: CMSData | null;
  isLoading: boolean;
  getContent: (pageSlug: string, section: string, key: string, fallback?: string) => string;
  getSection: (pageSlug: string, section: string) => Record<string, string | null>;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export function CMSProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/cms/pages'],
    queryFn: async () => {
      const res = await fetch('/api/cms/pages');
      if (!res.ok) return { pages: {} };
      return res.json() as Promise<CMSData>;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  const getContent = (pageSlug: string, section: string, key: string, fallback: string = ''): string => {
    if (!data?.pages?.[pageSlug]) return fallback;
    const sectionData = data.pages[pageSlug].content?.[section];
    if (!sectionData) return fallback;
    return sectionData[key] || fallback;
  };

  const getSection = (pageSlug: string, section: string): Record<string, string | null> => {
    if (!data?.pages?.[pageSlug]) return {};
    return data.pages[pageSlug].content?.[section] || {};
  };

  return (
    <CMSContext.Provider value={{ data: data || null, isLoading, getContent, getSection }}>
      {children}
    </CMSContext.Provider>
  );
}

export function useCMS() {
  const context = useContext(CMSContext);
  if (context === undefined) {
    throw new Error('useCMS must be used within a CMSProvider');
  }
  return context;
}

export function useCMSPage(pageSlug: string) {
  const { data, isLoading } = useCMS();
  
  const pageData = data?.pages?.[pageSlug];
  
  const getContent = (section: string, key: string, fallback: string = ''): string => {
    if (!pageData?.content?.[section]) return fallback;
    return pageData.content[section][key] || fallback;
  };

  const getSection = (section: string): Record<string, string | null> => {
    return pageData?.content?.[section] || {};
  };

  return {
    page: pageData?.page || null,
    content: pageData?.content || {},
    isLoading,
    getContent,
    getSection
  };
}
