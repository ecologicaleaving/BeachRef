'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  generateFlagUrl, 
  getLocalFlagPath, 
  getCountryName, 
  validateCountryCode,
  normalizeCountryCodeForFlag 
} from '@/lib/country-utils';

export interface CountryFlagProps {
  /** Country code (2-letter ISO or 3-letter FIVB) */
  countryCode: string;
  /** Additional CSS classes */
  className?: string;
  /** Flag size - affects both display and CDN size */
  size?: 'sm' | 'md' | 'lg';
  /** Show fallback when flag fails to load */
  showFallback?: boolean;
  /** Override alt text (defaults to country name) */
  altText?: string;
  /** Whether to show loading state */
  showLoading?: boolean;
}

interface CountryFlagState {
  imageLoaded: boolean;
  imageError: boolean;
  triedFallback: boolean;
  isVisible: boolean;
}

/**
 * CountryFlag Component
 * 
 * Displays country flags with comprehensive fallback handling:
 * 1. Primary: Flag from CDN (flagcdn.com)
 * 2. Secondary: Local flag asset
 * 3. Tertiary: Country code text
 * 4. Final: Generic placeholder
 * 
 * Features:
 * - Lazy loading with intersection observer
 * - Accessibility compliant (WCAG 2.1 AA)
 * - Performance optimized
 * - Responsive sizing
 * - Error handling with multiple fallbacks
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode,
  className = '',
  size = 'sm',
  showFallback = true,
  altText,
  showLoading = true
}) => {
  const [state, setState] = useState<CountryFlagState>({
    imageLoaded: false,
    imageError: false,
    triedFallback: false,
    isVisible: false
  });
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Validate country code
  const isValidCode = validateCountryCode(countryCode);
  const countryName = getCountryName(countryCode);
  const flagCode = normalizeCountryCodeForFlag(countryCode);

  // Size configurations
  const sizeConfig = {
    sm: {
      width: 20,
      height: 15,
      cdnSize: 'w20',
      classes: 'w-5 h-3'
    },
    md: {
      width: 32,
      height: 24,
      cdnSize: 'w40',
      classes: 'w-8 h-6'
    },
    lg: {
      width: 48,
      height: 36,
      cdnSize: 'w80',
      classes: 'w-12 h-9'
    }
  };

  const currentSize = sizeConfig[size];
  
  // Generate URLs
  const primaryUrl = isValidCode ? generateFlagUrl(countryCode, currentSize.cdnSize) : '';
  const fallbackUrl = isValidCode ? getLocalFlagPath(countryCode) : '';

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!containerRef.current || state.isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setState(prev => ({ ...prev, isVisible: true }));
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [state.isVisible]);

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      imageLoaded: true, 
      imageError: false 
    }));
  }, []);

  // Handle image load error with fallback chain
  const handleImageError = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    // If we haven't tried fallback yet and fallback URL exists
    if (!state.triedFallback && fallbackUrl && img.src !== fallbackUrl) {
      setState(prev => ({ ...prev, triedFallback: true }));
      img.src = fallbackUrl;
      return;
    }

    // All fallbacks failed
    setState(prev => ({ 
      ...prev, 
      imageError: true, 
      imageLoaded: false 
    }));
  }, [state.triedFallback, fallbackUrl]);

  // Reset state when country code changes
  useEffect(() => {
    setState({
      imageLoaded: false,
      imageError: false,
      triedFallback: false,
      isVisible: false
    });
  }, [countryCode]);

  // Generate alt text
  const imageAltText = altText || `${countryName} flag`;
  const ariaLabel = `Tournament location: ${countryName}`;

  // Don't render anything if country code is invalid and we shouldn't show fallback
  if (!isValidCode && !showFallback) {
    return null;
  }

  // Container classes
  const containerClasses = `
    relative inline-flex items-center justify-center
    ${currentSize.classes}
    ${className}
  `.trim();

  return (
    <div 
      ref={containerRef}
      className={containerClasses}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Loading state */}
      {showLoading && !state.imageLoaded && !state.imageError && state.isVisible && (
        <div 
          className={`
            ${currentSize.classes} 
            bg-gray-200 animate-pulse rounded-sm
          `}
          aria-hidden="true"
        />
      )}

      {/* Flag image */}
      {state.isVisible && primaryUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={primaryUrl}
          alt={imageAltText}
          className={`
            ${currentSize.classes}
            object-cover rounded-sm border border-gray-200
            ${state.imageLoaded ? 'opacity-100' : 'opacity-0'}
            ${state.imageError ? 'hidden' : ''}
            transition-opacity duration-200
          `}
          width={currentSize.width}
          height={currentSize.height}
          loading="lazy"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            aspectRatio: `${currentSize.width}/${currentSize.height}`
          }}
        />
      )}

      {/* Country code fallback */}
      {showFallback && (state.imageError || !primaryUrl) && isValidCode && (
        <div 
          className={`
            ${currentSize.classes}
            text-xs font-medium bg-gray-100 border border-gray-300 
            rounded-sm flex items-center justify-center
            text-gray-700 select-none
          `}
          title={`${countryName} (${countryCode})`}
          aria-label={ariaLabel}
        >
          {flagCode.toUpperCase()}
        </div>
      )}

      {/* Generic placeholder for invalid codes */}
      {showFallback && !isValidCode && (
        <div 
          className={`
            ${currentSize.classes}
            bg-gray-100 border border-gray-300 rounded-sm
            flex items-center justify-center
          `}
          title="Unknown country"
          aria-label="Unknown country flag"
        >
          <svg
            className="w-3 h-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}

      {/* Screen reader only description */}
      <span className="sr-only">
        Flag representing {countryName}
        {countryCode !== countryName && ` (${countryCode})`}
      </span>
    </div>
  );
};

