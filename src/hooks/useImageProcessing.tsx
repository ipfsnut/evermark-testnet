// src/hooks/useImageProcessing.tsx - FIXED version to prevent infinite re-renders
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { StandardizedEvermark } from '../lib/supabase-schema';

interface ImageProcessingMetadata {
  url: string | null;
  status: 'none' | 'processing' | 'processed' | 'failed';
  processedUrl?: string;
  originalUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  lastProcessed?: string;
}

interface UseImageProcessingResult {
  imageMetadata: ImageProcessingMetadata;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  getOptimalImageUrl: (size?: 'thumbnail' | 'medium' | 'large' | 'original') => string | null;
}

// Helper to resolve IPFS URLs - memoized to prevent re-computation
const resolveIPFSUrl = (url: string | null): string | null => {
  if (!url) return null;
  
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  
  return url;
};

// Generate SVG placeholder for missing images
const generateSVGPlaceholder = (title: string, author: string, size = 400): string => {
  const cleanTitle = title.slice(0, 30).replace(/[^\w\s]/g, '');
  const cleanAuthor = author.slice(0, 20).replace(/[^\w\s]/g, '');
  
  // Color based on content hash for consistency
  const hash = cleanTitle.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const hue = Math.abs(hash) % 360;
  
  const svg = `
    <svg width="${size}" height="${size * 0.75}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue}, 70%, 60%)" />
          <stop offset="100%" style="stop-color:hsl(${hue + 60}, 70%, 40%)" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <text x="50%" y="40%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size / 20}" font-weight="bold">
        ${cleanTitle}
      </text>
      <text x="50%" y="70%" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="${size / 25}">
        by ${cleanAuthor}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// FIXED: Memoized metadata extraction to prevent re-renders
const useImageMetadata = (evermark: StandardizedEvermark | null): ImageProcessingMetadata => {
  return useMemo(() => {
    if (!evermark) {
      return { url: null, status: 'none' };
    }

    // Priority order for image sources:
    // 1. Direct image field (most common)
    // 2. Extended metadata processed URL
    // 3. Extended metadata original image
    // 4. Generate placeholder

    let bestUrl: string | null = null;
    let originalUrl: string | null = null;
    let status: 'none' | 'processing' | 'processed' | 'failed' = 'none';

    // Check direct image field first
    if (evermark.image) {
      bestUrl = resolveIPFSUrl(evermark.image);
      originalUrl = evermark.image;
      status = 'processed';
    }

    // Check extended metadata for processed image
    if (!bestUrl && evermark.extendedMetadata?.processedImageUrl) {
      bestUrl = resolveIPFSUrl(evermark.extendedMetadata.processedImageUrl);
      status = 'processed';
    }

    // Use image status from evermark if available
    if (evermark.imageStatus && evermark.imageStatus !== 'none') {
      status = evermark.imageStatus;
    }

    // If no image found, generate SVG placeholder
    if (!bestUrl) {
      bestUrl = generateSVGPlaceholder(evermark.title, evermark.author);
      status = 'none';
    }

    return {
      url: bestUrl,
      status,
      processedUrl: bestUrl || undefined,
      originalUrl: originalUrl || undefined,
    };
  }, [
    // FIXED: Only depend on essential fields to prevent re-renders
    evermark?.id,
    evermark?.image,
    evermark?.imageStatus,
    evermark?.title,
    evermark?.author,
    evermark?.extendedMetadata?.processedImageUrl
  ]);
};

// Generate size-optimized URLs
const generateImageUrl = (baseUrl: string | null, size: 'thumbnail' | 'medium' | 'large' | 'original'): string | null => {
  if (!baseUrl) return null;

  // If it's a data URL (SVG placeholder), return as-is
  if (baseUrl.startsWith('data:')) return baseUrl;

  // For IPFS or external URLs, return as-is for now
  // In the future, you could proxy these through an image processing service
  return baseUrl;
};

export function useImageProcessing(evermark: StandardizedEvermark | null): UseImageProcessingResult {
  // FIXED: Use memoized metadata extraction
  const imageMetadata = useImageMetadata(evermark);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // FIXED: Stable getOptimalImageUrl function
  const getOptimalImageUrl = useCallback((size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium'): string | null => {
    return generateImageUrl(imageMetadata.url, size);
  }, [imageMetadata.url]); // Only depend on imageMetadata.url

  // FIXED: Stable refresh function
  const refresh = useCallback(() => {
    if (!evermark) return;
    
    setIsLoading(true);
    setError(null);
    
    // Simple refresh by incrementing trigger
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
      setIsLoading(false);
    }, 100);
  }, [evermark?.id]); // Only depend on evermark ID

  // Clear error when evermark changes
  useEffect(() => {
    setError(null);
  }, [evermark?.id]);

  return {
    imageMetadata,
    isLoading,
    error,
    refresh,
    getOptimalImageUrl
  };
}

// FIXED: Stable image validation hook
export function useImageValidation(url: string | null) {
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setIsValid(false);
      setResolvedUrl(null);
      setIsChecking(false);
      return;
    }

    // Skip validation for data URLs (SVG placeholders)
    if (url.startsWith('data:')) {
      setIsValid(true);
      setResolvedUrl(url);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    // Resolve IPFS URLs
    const checkUrl = resolveIPFSUrl(url);
    setResolvedUrl(checkUrl);

    // Validate image by attempting to load it
    const img = new Image();
    
    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };
    
    img.onload = () => {
      setIsValid(true);
      setIsChecking(false);
      cleanup();
    };
    
    img.onerror = () => {
      setIsValid(false);
      setIsChecking(false);
      cleanup();
    };

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      setIsValid(false);
      setIsChecking(false);
      cleanup();
    }, 10000); // 10 second timeout

    if (checkUrl) {
      img.src = checkUrl;
    }

    return () => {
      clearTimeout(timeout);
      cleanup();
    };
  }, [url]); // FIXED: Only depend on url

  return {
    isValid,
    isChecking,
    resolvedUrl: isValid ? resolvedUrl : null
  };
}

// FIXED: Stable placeholder hook
export function useImagePlaceholder(evermark: StandardizedEvermark | null) {
  const generatePlaceholder = useCallback((width = 400, height = 300) => {
    if (!evermark) {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#374151" />
          <text x="50%" y="50%" text-anchor="middle" fill="#9CA3AF" font-family="Arial, sans-serif" font-size="16">
            No Content
          </text>
        </svg>
      `)}`;
    }

    return generateSVGPlaceholder(evermark.title, evermark.author, width);
  }, [evermark?.title, evermark?.author]); // FIXED: Stable dependencies

  return { generatePlaceholder };
}

export type { ImageProcessingMetadata };