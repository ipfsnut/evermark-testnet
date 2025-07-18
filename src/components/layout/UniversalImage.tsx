// src/components/layout/UniversalImage.tsx - Enhanced image component with fallbacks
import React, { useState, useCallback } from 'react';
import { ImageIcon, AlertCircleIcon } from 'lucide-react';
import { cn } from '../../utils/responsive';

interface UniversalImageProps {
  src?: string | null;
  alt: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  priority?: boolean;
  className?: string;
  fallbackClassName?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  showFallbackIcon?: boolean;
  fallbackText?: string;
}

// Helper to resolve IPFS URLs to gateway URLs
const resolveImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  
  // Handle IPFS URLs
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  
  // Handle data URLs
  if (url.startsWith('data:')) return url;
  
  // Handle relative URLs
  if (url.startsWith('/')) return url;
  
  // Handle absolute URLs
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  // Default: assume it's a valid URL
  return url;
};

// Aspect ratio classes
const aspectRatioClasses = {
  square: 'aspect-square',
  video: 'aspect-video', // 16:9
  portrait: 'aspect-[3/4]', // 3:4
  auto: '' // No aspect ratio constraint
};

// Rounded classes
const roundedClasses = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md', 
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full'
};

export const UniversalImage: React.FC<UniversalImageProps> = ({
  src,
  alt,
  aspectRatio = 'video',
  rounded = 'lg',
  priority = false,
  className = '',
  fallbackClassName = '',
  loading = 'lazy',
  onLoad,
  onError,
  showFallbackIcon = true,
  fallbackText
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string | null>(resolveImageUrl(src));

  const handleImageLoad = useCallback(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    console.warn('Image failed to load:', currentSrc);
    setImageState('error');
    onError?.();
  }, [currentSrc, onError]);

  // Update src when prop changes
  React.useEffect(() => {
    const newSrc = resolveImageUrl(src);
    if (newSrc !== currentSrc) {
      setCurrentSrc(newSrc);
      setImageState('loading');
    }
  }, [src, currentSrc]);

  const containerClasses = cn(
    'relative overflow-hidden bg-gray-100 dark:bg-gray-800',
    aspectRatioClasses[aspectRatio],
    roundedClasses[rounded],
    className
  );

  const imageClasses = cn(
    'w-full h-full object-cover transition-opacity duration-300',
    imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
  );

  const fallbackClasses = cn(
    'absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
    roundedClasses[rounded],
    fallbackClassName
  );

  // If no src provided, show fallback immediately
  if (!currentSrc) {
    return (
      <div className={containerClasses}>
        <div className={fallbackClasses}>
          {showFallbackIcon && <ImageIcon className="w-8 h-8 mb-2" />}
          {fallbackText && (
            <span className="text-sm text-center px-2">{fallbackText}</span>
          )}
          {!fallbackText && <span className="text-xs">No image</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {/* Main Image */}
      <img
        src={currentSrc}
        alt={alt}
        className={imageClasses}
        loading={priority ? 'eager' : loading}
        onLoad={handleImageLoad}
        onError={handleImageError}
        decoding="async"
      />

      {/* Loading State */}
      {imageState === 'loading' && (
        <div className={cn(fallbackClasses, 'animate-pulse')}>
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded mb-2" />
          <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
        </div>
      )}

      {/* Error State */}
      {imageState === 'error' && (
        <div className={fallbackClasses}>
          {showFallbackIcon && <AlertCircleIcon className="w-8 h-8 mb-2 text-red-400" />}
          <span className="text-xs text-center px-2">
            {fallbackText || 'Image unavailable'}
          </span>
        </div>
      )}
    </div>
  );
};

// Specialized component for Evermark images
export const EvermarkImage: React.FC<Omit<UniversalImageProps, 'fallbackText'> & {
  evermarkTitle?: string;
}> = ({ evermarkTitle, ...props }) => {
  return (
    <UniversalImage
      {...props}
      fallbackText={evermarkTitle ? `No image for "${evermarkTitle}"` : 'No Evermark image'}
      showFallbackIcon={true}
    />
  );
};

// Avatar component for user images
export const UserAvatar: React.FC<Omit<UniversalImageProps, 'aspectRatio' | 'fallbackText'> & {
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ username, size = 'md', className, ...props }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <UniversalImage
      {...props}
      aspectRatio="square"
      rounded="full"
      className={cn(sizeClasses[size], className)}
      fallbackText={username ? username.slice(0, 2).toUpperCase() : '?'}
      showFallbackIcon={false}
    />
  );
};

export default UniversalImage;