// src/components/layout/UniversalImage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon, AlertCircleIcon } from 'lucide-react';
import { cn } from '../../utils/responsive';

export interface UniversalImageProps {
  src?: string | null;
  alt: string;
  aspectRatio?: 'square' | 'video' | 'photo' | 'wide' | 'card' | 'auto' | string;
  sizes?: string;
  priority?: boolean;
  fallback?: 'evermark' | 'user' | 'content' | 'none';
  className?: string;
  containerClassName?: string;
  loading?: 'lazy' | 'eager';
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  onLoad?: () => void;
  onError?: () => void;
  showLoadingState?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  overlay?: boolean;
  overlayContent?: React.ReactNode;
}

// Predefined aspect ratios
const aspectRatioMap = {
  square: 'aspect-square',
  video: 'aspect-video', // 16:9
  photo: 'aspect-[4/3]',
  wide: 'aspect-[21/9]',
  card: 'aspect-[3/4]',
  auto: '', // No aspect ratio constraint
} as const;

// Fallback placeholder configurations
const fallbackConfigs = {
  evermark: {
    icon: ImageIcon,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-400',
    text: 'Evermark',
    textColor: 'text-purple-600',
  },
  user: {
    icon: ImageIcon,
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-400',
    text: 'User',
    textColor: 'text-gray-600',
  },
  content: {
    icon: ImageIcon,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-400',
    text: 'Content',
    textColor: 'text-blue-600',
  },
  none: {
    icon: AlertCircleIcon,
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-300',
    text: '',
    textColor: 'text-gray-500',
  },
};

// Rounded corner classes
const roundedMap = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

// Shadow classes
const shadowMap = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

export const UniversalImage: React.FC<UniversalImageProps> = ({
  src,
  alt,
  aspectRatio = 'auto',
  sizes = '100vw',
  priority = false,
  fallback = 'content',
  className = '',
  containerClassName = '',
  loading = 'lazy',
  objectFit = 'cover',
  onLoad,
  onError,
  showLoadingState = true,
  rounded = 'md',
  shadow = 'none',
  overlay = false,
  overlayContent,
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isInView, setIsInView] = useState(!loading || loading === 'eager' || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, loading]);

  // Handle image load
  const handleImageLoad = () => {
    setImageState('loaded');
    onLoad?.();
  };

  // Handle image error
  const handleImageError = () => {
    setImageState('error');
    onError?.();
  };

  // Get aspect ratio class
  const aspectRatioClass = aspectRatio in aspectRatioMap 
    ? aspectRatioMap[aspectRatio as keyof typeof aspectRatioMap]
    : aspectRatio.startsWith('aspect-') 
    ? aspectRatio 
    : '';

  // Get object fit class
  const objectFitClass = `object-${objectFit}`;

  // Get fallback config
  const fallbackConfig = fallbackConfigs[fallback];
  const FallbackIcon = fallbackConfig.icon;

  // Determine if we should show the image
  const shouldShowImage = src && isInView && imageState !== 'error';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-gray-100',
        aspectRatioClass,
        roundedMap[rounded],
        shadowMap[shadow],
        containerClassName
      )}
    >
      {/* Loading State */}
      {showLoadingState && imageState === 'loading' && shouldShowImage && (
        <div className={cn(
          'absolute inset-0 bg-gray-200 animate-pulse',
          roundedMap[rounded]
        )}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
      )}

      {/* Main Image */}
      {shouldShowImage && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          sizes={sizes}
          loading={loading}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            objectFitClass,
            imageState === 'loaded' ? 'opacity-100' : 'opacity-0',
            className
          )}
          style={{
            // Ensure image covers the container properly
            minWidth: '100%',
            minHeight: '100%',
          }}
        />
      )}

      {/* Fallback/Placeholder */}
      {(!src || !isInView || imageState === 'error') && (
        <div className={cn(
          'absolute inset-0 flex flex-col items-center justify-center',
          fallbackConfig.bgColor,
          roundedMap[rounded]
        )}>
          <FallbackIcon className={cn(
            'w-8 h-8 sm:w-12 sm:h-12 mb-2',
            fallbackConfig.iconColor
          )} />
          {fallbackConfig.text && (
            <span className={cn(
              'text-xs sm:text-sm font-medium',
              fallbackConfig.textColor
            )}>
              {fallbackConfig.text}
            </span>
          )}
          {imageState === 'error' && (
            <span className="text-xs text-red-500 mt-1">
              Failed to load
            </span>
          )}
        </div>
      )}

      {/* Overlay */}
      {overlay && imageState === 'loaded' && (
        <div className="absolute inset-0 bg-black/20 transition-opacity duration-200 opacity-0 hover:opacity-100">
          {overlayContent && (
            <div className="absolute inset-0 flex items-center justify-center">
              {overlayContent}
            </div>
          )}
        </div>
      )}

      {/* Blur-up effect for better loading */}
      {imageState === 'loading' && shouldShowImage && (
        <div className="absolute inset-0 bg-gray-200 backdrop-blur-sm" />
      )}
    </div>
  );
};

// Preset configurations for common use cases
export const EvermarkImage: React.FC<Omit<UniversalImageProps, 'fallback'>> = (props) => (
  <UniversalImage {...props} fallback="evermark" />
);

export const UserAvatar: React.FC<Omit<UniversalImageProps, 'fallback' | 'aspectRatio' | 'rounded'>> = (props) => (
  <UniversalImage {...props} fallback="user" aspectRatio="square" rounded="full" />
);

export const ContentImage: React.FC<Omit<UniversalImageProps, 'fallback'>> = (props) => (
  <UniversalImage {...props} fallback="content" />
);

// Hook for programmatic image preloading
export const useImagePreload = (src: string | undefined | null) => {
  const [isPreloaded, setIsPreloaded] = useState(false);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => setIsPreloaded(true);
    img.onerror = () => setIsPreloaded(false);
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return isPreloaded;
};

export default UniversalImage;