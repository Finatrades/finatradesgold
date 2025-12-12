import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ContentData = Record<string, Record<string, string>>;

interface ContentContextType {
  getContent: (pageSlug: string, section: string, key: string, defaultValue?: string) => string;
  loadPageContent: (pageSlug: string) => void;
  isLoading: (pageSlug: string) => boolean;
  refreshContent: (pageSlug: string) => void;
}

const ContentContext = createContext<ContentContextType | null>(null);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [loadedPages, setLoadedPages] = useState<string[]>([]);
  const [contentCache, setContentCache] = useState<Record<string, ContentData>>({});
  const [loadingPages, setLoadingPages] = useState<string[]>([]);

  const fetchPageContent = useCallback(async (slug: string) => {
    if (contentCache[slug]) return;
    
    setLoadingPages(prev => [...prev, slug]);
    try {
      const res = await fetch(`/api/content/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setContentCache(prev => ({
          ...prev,
          [slug]: data.content || {}
        }));
        setLoadedPages(prev => [...prev, slug]);
      }
    } catch (error) {
      console.error(`Failed to load content for page: ${slug}`, error);
    } finally {
      setLoadingPages(prev => prev.filter(p => p !== slug));
    }
  }, [contentCache]);

  const loadPageContent = useCallback((pageSlug: string) => {
    if (!loadedPages.includes(pageSlug) && !loadingPages.includes(pageSlug)) {
      fetchPageContent(pageSlug);
    }
  }, [loadedPages, loadingPages, fetchPageContent]);

  const getContent = useCallback((pageSlug: string, section: string, key: string, defaultValue: string = '') => {
    const pageContent = contentCache[pageSlug];
    if (!pageContent) {
      loadPageContent(pageSlug);
      return defaultValue;
    }
    const sectionContent = pageContent[section];
    if (!sectionContent) return defaultValue;
    return sectionContent[key] || defaultValue;
  }, [contentCache, loadPageContent]);

  const isLoading = useCallback((pageSlug: string) => {
    return loadingPages.includes(pageSlug);
  }, [loadingPages]);

  const refreshContent = useCallback((pageSlug: string) => {
    setContentCache(prev => {
      const next = { ...prev };
      delete next[pageSlug];
      return next;
    });
    setLoadedPages(prev => prev.filter(p => p !== pageSlug));
    fetchPageContent(pageSlug);
  }, [fetchPageContent]);

  return (
    <ContentContext.Provider value={{ getContent, loadPageContent, isLoading, refreshContent }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
}

export function usePageContent(pageSlug: string) {
  const { getContent, loadPageContent, isLoading } = useContent();
  
  useEffect(() => {
    loadPageContent(pageSlug);
  }, [pageSlug, loadPageContent]);

  return {
    get: (section: string, key: string, defaultValue?: string) => 
      getContent(pageSlug, section, key, defaultValue),
    isLoading: isLoading(pageSlug)
  };
}

export function CMSText({ 
  page, 
  section, 
  contentKey, 
  defaultValue = '',
  className = ''
}: { 
  page: string; 
  section: string; 
  contentKey: string; 
  defaultValue?: string;
  className?: string;
}) {
  const { get } = usePageContent(page);
  const content = get(section, contentKey, defaultValue);
  
  return <span className={className}>{content}</span>;
}
