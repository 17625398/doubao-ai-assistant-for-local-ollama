import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Image as ImageIcon, FileText, Clock, Shield, AlertCircle } from 'lucide-react';

interface LinkPreviewData {
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
  type: 'article' | 'video' | 'image' | 'website';
}

interface LinkPreviewBlockProps {
  href: string;
  children: React.ReactNode;
}

export const LinkPreviewBlock: React.FC<LinkPreviewBlockProps> = ({ href, children }) => {
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = useMemo(() => {
    try {
      const url = new URL(href);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }, [href]);

  useEffect(() => {
    if (!isValidUrl) {
      setError('Invalid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchPreview = async () => {
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(href)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch preview');
        }
        const data = await response.json();
        setPreviewData(data);
      } catch (err) {
        console.warn('Failed to fetch link preview:', err);
        setPreviewData(null);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timer);
  }, [href, isValidUrl]);

  const renderFallbackPreview = () => {
    try {
      const url = new URL(href);
      const siteName = url.hostname.replace('www.', '');
      return {
        title: href,
        description: `Visit ${siteName}`,
        siteName,
        favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`,
        image: '',
        type: 'website' as const,
      };
    } catch {
      return null;
    }
  };

  const displayData = previewData || renderFallbackPreview();

  if (!isValidUrl || !displayData) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--theme-accent-primary)] hover:underline break-all"
      >
        {children}
      </a>
    );
  }

  return (
    <div className="my-3 group">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] overflow-hidden hover:border-[var(--theme-accent-primary)]/50 hover:shadow-md transition-all duration-200"
      >
        {isLoading ? (
          <div className="p-4 animate-pulse">
            <div className="h-8 bg-[var(--theme-bg-tertiary)] rounded w-3/4 mb-2" />
            <div className="h-4 bg-[var(--theme-bg-tertiary)] rounded w-1/2 mb-2" />
            <div className="h-4 bg-[var(--theme-bg-tertiary)] rounded w-full" />
          </div>
        ) : (
          <>
            {displayData.image && (
              <div className="relative h-36 bg-[var(--theme-bg-tertiary)] overflow-hidden">
                <img
                  src={displayData.image}
                  alt={displayData.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                    {displayData.type === 'video' && <Clock size={12} className="text-white" />}
                    {displayData.type === 'image' && <ImageIcon size={12} className="text-white" />}
                    {displayData.type === 'article' && <FileText size={12} className="text-white" />}
                    <span className="text-[10px] text-white font-medium uppercase">
                      {displayData.type}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start gap-3">
                {displayData.favicon && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--theme-bg-tertiary)] overflow-hidden border border-[var(--theme-border-secondary)]">
                    <img
                      src={displayData.favicon}
                      alt={displayData.siteName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-[var(--theme-text-primary)] line-clamp-2 mb-1 group-hover:text-[var(--theme-accent-primary)] transition-colors">
                    {displayData.title}
                  </h4>
                  
                  {displayData.description && (
                    <p className="text-sm text-[var(--theme-text-secondary)] line-clamp-2 mb-2">
                      {displayData.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--theme-text-tertiary)]">
                      {displayData.siteName}
                    </span>
                    <ExternalLink size={12} className="text-[var(--theme-text-tertiary)]" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="p-3 bg-red-50/20 border-t border-red-200/50">
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertCircle size={14} />
              <span>Preview unavailable</span>
            </div>
          </div>
        )}
      </a>

      <div className="text-xs text-[var(--theme-text-tertiary)] mt-1 flex items-center gap-2">
        <Shield size={12} />
        <span>Secure link</span>
      </div>
    </div>
  );
};