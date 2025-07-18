// src/hooks/useImageProcessing.tsx - Hook for handling image processing and optimization
import { useState, useEffect, useCallback } from 'react';
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

// Helper to extract image from various metadata sources
const extractImageFromEvermark = (evermark: StandardizedEvermark): ImageProcessingMetadata => {
  // Priority order:
  // 1. Direct image field (already processed)
  // 2. No other sources available in current schema
  
  const directImage = evermark.image;

  // Determine the best available URL
  let bestUrl: string | null = directImage || null;
  let originalUrl: string | null = directImage || null;

  // Resolve IPFS URLs
  if (bestUrl?.startsWith('ipfs://')) {
    const hash = bestUrl.replace('ipfs://', '');
    bestUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  if (originalUrl?.startsWith('ipfs://')) {
    const hash = originalUrl.replace('ipfs://', '');
    originalUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  // Safely handle imageStatus - ensure it's one of our expected values
  const validStatuses: Array<'none' | 'processing' | 'processed' | 'failed'> = ['none', 'processing', 'processed', 'failed'];
  const status = validStatuses.includes(evermark.imageStatus as any) 
    ? (evermark.imageStatus as 'none' | 'processing' | 'processed' | 'failed')
    : 'none';

  return {
    url: bestUrl,
    status,
    processedUrl: bestUrl || undefined,
    originalUrl: originalUrl || undefined,
  };
};

// Generate thumbnail URLs for different sizes
const generateImageUrl = (baseUrl: string | null, size: 'thumbnail' | 'medium' | 'large' | 'original'): string | null => {
  if (!baseUrl) return null;

  // If it's already a processed URL from our backend, we might have size variants
  if (baseUrl.includes('processed') || baseUrl.includes('optimized')) {
    // This would be where you'd integrate with your image processing service
    // For now, return the base URL
    return baseUrl;
  }

  // For IPFS or external URLs, return as-is
  // In the future, you could proxy these through an image processing service
  return baseUrl;
};

export function useImageProcessing(evermark: StandardizedEvermark | null): UseImageProcessingResult {
  const [imageMetadata, setImageMetadata] = useState<ImageProcessingMetadata>({
    url: null,
    status: 'none'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract image metadata when evermark changes
  useEffect(() => {
    if (!evermark) {
      setImageMetadata({ url: null, status: 'none' });
      setError(null);
      return;
    }

    try {
      const extracted = extractImageFromEvermark(evermark);
      setImageMetadata(extracted);
      setError(null);
    } catch (err) {
      console.error('Error extracting image metadata:', err);
      setError('Failed to process image metadata');
      setImageMetadata({ url: null, status: 'failed' });
    }
  }, [evermark?.id, evermark?.image, evermark?.imageStatus]); // More specific dependencies

  // Function to get optimal image URL for different use cases
  const getOptimalImageUrl = useCallback((size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium'): string | null => {
    return generateImageUrl(imageMetadata.url, size);
  }, [imageMetadata.url]);

  // Refresh function (could trigger reprocessing in the future)
  const refresh = useCallback(() => {
    if (!evermark) return;
    
    setIsLoading(true);
    
    // Re-extract metadata
    try {
      const extracted = extractImageFromEvermark(evermark);
      setImageMetadata(extracted);
      setError(null);
    } catch (err) {
      console.error('Error refreshing image metadata:', err);
      setError('Failed to refresh image metadata');
    } finally {
      setIsLoading(false);
    }
  }, [evermark]);

  return {
    imageMetadata,
    isLoading,
    error,
    refresh,
    getOptimalImageUrl
  };
}

// Hook for validating and preprocessing image URLs
export function useImageValidation(url: string | null) {
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setIsValid(false);
      setResolvedUrl(null);
      return;
    }

    setIsChecking(true);

    // Resolve IPFS URLs
    let checkUrl = url;
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      checkUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
    }

    setResolvedUrl(checkUrl);

    // Validate image by attempting to load it
    const img = new Image();
    
    img.onload = () => {
      setIsValid(true);
      setIsChecking(false);
    };
    
    img.onerror = () => {
      setIsValid(false);
      setIsChecking(false);
    };

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      setIsValid(false);
      setIsChecking(false);
    }, 10000); // 10 second timeout

    img.src = checkUrl;

    return () => {
      clearTimeout(timeout);
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return {
    isValid,
    isChecking,
    resolvedUrl: isValid ? resolvedUrl : null
  };
}

// Hook for generating placeholder images
export function useImagePlaceholder(evermark: StandardizedEvermark | null) {
  const generatePlaceholder = useCallback((width = 400, height = 300) => {
    if (!evermark) {
      return `https://via.placeholder.com/${width}x${height}/374151/9CA3AF?text=No+Content`;
    }

    const title = encodeURIComponent(evermark.title.slice(0, 30));
    const author = encodeURIComponent(evermark.author.slice(0, 20));
    
    // Generate a color based on the content type
    const colorMap: Record<string, string> = {
      'Cast': '6366F1', // Indigo
      'DOI': '059669',  // Green  
      'ISBN': 'DC2626', // Red
      'URL': '2563EB',  // Blue
      'Custom': '7C3AED' // Purple
    };
    
    const color = colorMap[evermark.contentType] || '6B7280';
    
    return `https://via.placeholder.com/${width}x${height}/${color}/FFFFFF?text=${title}%0A%0Aby+${author}`;
  }, [evermark]);

  return { generatePlaceholder };
}

export type { ImageProcessingMetadata };