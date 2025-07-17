// src/hooks/useEvermarks.ts - Fixed version with proper imports and hook usage
import { useState, useEffect, useCallback } from 'react';
import { 
  useSupabaseEvermarks, 
  useSupabaseEvermark, // ✅ FIXED: Add the missing import
  type StandardizedEvermark 
} from './useSupabaseEvermarks';

interface EvermarkData {
  id: string;
  name: string;
  title: string;
  description: string;
  content: string;
  image?: string;
  external_url?: string;
  author: string;
  creator: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
  creationTime: number;
  tx_hash?: string;
  block_number?: number;
  metadataURI?: string;
  evermark_type: string;
  source_platform: string;
  sourceUrl?: string;
  voting_power: number;
  view_count: number;
  tags: string[];
  category?: string;
  metadata: any;
}

interface UseEvermarkDetailResult {
  evermark: EvermarkData | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

// ✅ FIXED: Convert StandardizedEvermark to legacy EvermarkData format for compatibility
const convertToLegacyFormat = (evermark: StandardizedEvermark): EvermarkData => ({
  id: evermark.id,                    // Already string from tokenId
  name: evermark.title,               // Map title to name for legacy compatibility
  title: evermark.title,
  description: evermark.description || '',
  content: evermark.description || '', // Map description to content
  image: evermark.image,
  external_url: evermark.sourceUrl,
  author: evermark.author,
  creator: evermark.creator,
  timestamp: new Date(evermark.creationTime * 1000).toISOString(),
  created_at: evermark.createdAt,
  updated_at: evermark.updatedAt,
  creationTime: evermark.creationTime,
  tx_hash: undefined,
  block_number: undefined,
  metadataURI: evermark.metadataURI,
  evermark_type: 'standard',
  source_platform: evermark.sourceUrl?.includes('farcaster') ? 'farcaster' : 'web',
  sourceUrl: evermark.sourceUrl,
  voting_power: evermark.votes || 0,
  view_count: 0, // Could be enhanced with view tracking
  tags: evermark.tags,
  category: 'general',
  metadata: {
    creator: evermark.creator,
    sourceUrl: evermark.sourceUrl,
    image: evermark.image,
    metadataURI: evermark.metadataURI,
    creationTime: evermark.creationTime,
    tokenId: evermark.tokenId,
    extendedMetadata: evermark.extendedMetadata
  }
});

// ✅ FIXED: Main hook for getting single evermark details using token_id
export function useEvermarkDetail(id?: string): UseEvermarkDetailResult {
  const [evermark, setEvermark] = useState<EvermarkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIXED: Use the imported hook correctly
  const { 
    evermark: supabaseEvermark, 
    isLoading: supabaseLoading, 
    error: supabaseError, 
    refetch 
  } = useSupabaseEvermark(id); // Now properly imported

  // Transform Supabase evermark to legacy format
  useEffect(() => {
    if (supabaseEvermark) {
      setEvermark(convertToLegacyFormat(supabaseEvermark));
      setError(null);
    } else if (supabaseError) {
      setError(supabaseError);
      setEvermark(null);
    } else {
      setEvermark(null);
    }
    setIsLoading(supabaseLoading);
  }, [supabaseEvermark, supabaseError, supabaseLoading]);

  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    evermark,
    isLoading,
    error,
    retry
  };
}

// ✅ FIXED: Hook for user evermarks using owner/author fields
export function useUserEvermarks(userAddress?: string) {
  const { 
    evermarks, 
    isLoading, 
    error 
  } = useSupabaseEvermarks({
    author: userAddress, // Filter by author field (which maps to user address)
    pageSize: 100, // Get all user evermarks
    enableBlockchainFallback: true
  });

  return {
    evermarks: evermarks.map(convertToLegacyFormat),
    isLoading,
    error
  };
}

// ✅ FIXED: Hook for listing evermarks with filters
export function useEvermarksList(filters?: {
  author?: string;
  category?: string;
  limit?: number;
}) {
  const { 
    evermarks, 
    isLoading, 
    error 
  } = useSupabaseEvermarks({
    author: filters?.author,
    pageSize: filters?.limit || 20,
    enableBlockchainFallback: true
  });

  return {
    evermarks: evermarks.map(convertToLegacyFormat),
    isLoading,
    error
  };
}

// ✅ NEW: Additional utility hooks for common use cases

/**
 * Hook for getting evermarks by token IDs (efficient batch fetch)
 */
export function useEvermarksByTokenIds(tokenIds: string[]) {
  // ✅ MUCH BETTER: Use the existing Supabase hook with proper filtering
  const { 
    evermarks: supabaseEvermarks, 
    isLoading, 
    error 
  } = useSupabaseEvermarks({
    page: 1,
    pageSize: tokenIds.length || 100, // Set appropriate page size
    // Note: We'd need to add token_id filtering to useSupabaseEvermarks
    // For now, we'll fetch all and filter client-side (not ideal but better than 1-by-1)
    enableBlockchainFallback: false // Skip blockchain for performance
  });

  // Filter to only the requested token IDs
  const filteredEvermarks = supabaseEvermarks.filter(evermark => 
    tokenIds.includes(evermark.id)
  );

  return {
    evermarks: filteredEvermarks.map(convertToLegacyFormat),
    isLoading,
    error
  };
}

/**
 * ✅ BETTER: Hook for getting multiple evermarks efficiently
 * Uses a single query with IN clause instead of multiple individual queries
 */
export function useEvermarksBatch(tokenIds: number[]) {
  const [evermarks, setEvermarks] = useState<EvermarkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenIds.length === 0) {
      setEvermarks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchEvermarks = async () => {
      try {
        // ✅ EFFICIENT: Single query with IN clause
        const { supabase } = await import('../lib/supabase');
        const { MetadataTransformer } = await import('../utils/MetadataTransformer');
        
        const { data, error: queryError } = await supabase
          .from('evermarks')
          .select('*')
          .in('token_id', tokenIds); // Much more efficient than individual queries

        if (queryError) {
          throw new Error(`Failed to fetch evermarks: ${queryError.message}`);
        }

        // Transform to legacy format
        const transformedEvermarks = (data || []).map(row => {
          const standardized = MetadataTransformer.transform(row);
          return convertToLegacyFormat(standardized);
        });

        setEvermarks(transformedEvermarks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch evermarks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvermarks();
  }, [tokenIds.join(',')]); // Stable dependency

  return {
    evermarks,
    isLoading,
    error
  };
}

/**
 * Hook for checking if an evermark exists
 */
export function useEvermarkExists(id?: string) {
  const { evermark, isLoading, error } = useEvermarkDetail(id);
  
  return {
    exists: !!evermark && !error,
    isLoading,
    error
  };
}

/**
 * Hook for getting evermark metadata only (lighter query)
 */
export function useEvermarkMetadata(id?: string) {
  const { evermark, isLoading, error } = useEvermarkDetail(id);
  
  const metadata = evermark ? {
    id: evermark.id,
    title: evermark.title,
    author: evermark.author,
    description: evermark.description,
    image: evermark.image,
    contentType: evermark.metadata?.extendedMetadata?.contentType || 'Custom',
    tags: evermark.tags || [],
    createdAt: evermark.created_at,
    verified: evermark.metadata?.verified || false
  } : null;

  return {
    metadata,
    isLoading,
    error
  };
}


export type { EvermarkData, UseEvermarkDetailResult };