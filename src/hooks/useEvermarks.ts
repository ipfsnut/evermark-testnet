import { useState, useEffect, useCallback } from 'react';
import { useSupabaseEvermarks, type Evermark } from './useSupabaseEvermarks';

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

// Convert Supabase Evermark to legacy EvermarkData format for compatibility
const convertToLegacyFormat = (evermark: Evermark): EvermarkData => ({
  id: evermark.id,
  name: evermark.title, // Map title to name for legacy compatibility
  title: evermark.title,
  description: evermark.description || '',
  content: evermark.description || '', // Map description to content
  image: evermark.image,
  external_url: evermark.sourceUrl,
  author: evermark.author,
  creator: evermark.creator,
  timestamp: new Date(evermark.creationTime * 1000).toISOString(),
  created_at: new Date(evermark.creationTime * 1000).toISOString(),
  updated_at: new Date(evermark.creationTime * 1000).toISOString(),
  creationTime: evermark.creationTime,
  tx_hash: undefined,
  block_number: undefined,
  metadataURI: evermark.metadataURI,
  evermark_type: 'standard',
  source_platform: evermark.sourceUrl?.includes('farcaster') ? 'farcaster' : 'web',
  sourceUrl: evermark.sourceUrl,
  voting_power: evermark.votes || 0,
  view_count: 0, // Could be enhanced with view tracking
  tags: [],
  category: 'general',
  metadata: {
    creator: evermark.creator,
    sourceUrl: evermark.sourceUrl,
    image: evermark.image,
    metadataURI: evermark.metadataURI,
    creationTime: evermark.creationTime
  }
});

// Main hook for getting single evermark details - NOW USES SUPABASE CACHE
export function useEvermarkDetail(id?: string): UseEvermarkDetailResult {
  const [evermark, setEvermark] = useState<EvermarkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use Supabase hook with single item fetch
  const { 
    evermarks, 
    isLoading: supabaseLoading, 
    error: supabaseError, 
    refresh 
  } = useSupabaseEvermarks({
    page: 1,
    pageSize: 1,
    // Could add specific ID filter here if SupabaseService supports it
    enableBlockchainFallback: true
  });

  // Fetch specific evermark by ID using Supabase
  const fetchEvermark = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      setError('No Evermark ID provided');
      setEvermark(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Try to find in current evermarks first (cache hit)
      const cachedEvermark = evermarks.find(e => e.id === id);
      if (cachedEvermark) {
        setEvermark(convertToLegacyFormat(cachedEvermark));
        setIsLoading(false);
        return;
      }

      // If not in current results, use SupabaseService directly for single fetch
      const { SupabaseService } = await import('../lib/supabase');
      const supabaseEvermark = await SupabaseService.getEvermarkById(id);
      
      if (supabaseEvermark) {
        // Convert from Supabase format to our Evermark interface
        const evermarkData: Evermark = {
          id: supabaseEvermark.id,
          title: supabaseEvermark.title,
          author: supabaseEvermark.author,
          description: supabaseEvermark.description,
          sourceUrl: supabaseEvermark.metadata?.sourceUrl,
          image: supabaseEvermark.metadata?.image,
          metadataURI: supabaseEvermark.metadata?.metadataURI || '',
          creator: supabaseEvermark.metadata?.creator || supabaseEvermark.author,
          creationTime: supabaseEvermark.metadata?.creationTime || new Date(supabaseEvermark.created_at).getTime() / 1000,
          verified: supabaseEvermark.verified
        };
        
        setEvermark(convertToLegacyFormat(evermarkData));
      } else {
        throw new Error('Evermark not found');
      }
      
    } catch (err) {
      console.error('❌ Error fetching Evermark:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [id, evermarks]);

  const retry = useCallback(() => {
    refresh();
    fetchEvermark();
  }, [refresh, fetchEvermark]);

  useEffect(() => {
    fetchEvermark();
  }, [fetchEvermark]);

  return {
    evermark,
    isLoading: isLoading || supabaseLoading,
    error: error || supabaseError,
    retry
  };
}

// Hook for user evermarks - NOW USES SUPABASE CACHE
export function useUserEvermarks(userAddress?: string) {
  const { 
    evermarks, 
    isLoading, 
    error 
  } = useSupabaseEvermarks({
    author: userAddress, // Filter by user address as author
    pageSize: 100, // Get all user evermarks
    enableBlockchainFallback: true
  });

  return {
    evermarks: evermarks.map(convertToLegacyFormat),
    isLoading,
    error
  };
}

// Hook for listing evermarks with filters - NOW USES SUPABASE CACHE
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

