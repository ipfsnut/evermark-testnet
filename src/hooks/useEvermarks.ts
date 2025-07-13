// src/hooks/useEvermarks.ts - Fast Supabase-first implementation with blockchain fallback
import { useState, useEffect } from 'react';
import { useRecentEvermarks as useSupabaseRecentEvermarks } from './useSupabaseEvermarks';
import { SupabaseService } from '../lib/supabase';
import { useMetadataUtils } from './core/useMetadataUtils';

export interface Evermark {
  id: string;
  title: string;
  author: string;
  description?: string;
  sourceUrl?: string;
  image?: string;
  metadataURI: string;
  creator: string;
  creationTime: number;
  votes?: number;
  verified?: boolean;
}

/**
 * Main hook for fetching recent Evermarks
 * Now uses Supabase-first approach for dramatically improved performance
 */
export function useEvermarks(limit = 10) {
  // Use the new Supabase-first implementation
  const {
    evermarks,
    isLoading,
    error,
    refresh
  } = useSupabaseRecentEvermarks(limit);

  return {
    evermarks,
    isLoading,
    error,
    refetch: refresh,
    refresh
  };
}

// Legacy compatibility - maintain the same interface
export function useEvermarkData() {
  return useEvermarks(10);
}

// Hook specifically for homepage recent evermarks
export function useHomePageEvermarks() {
  return useEvermarks(6);
}

// Hook for getting a larger set for feeds
export function useAllEvermarks() {
  return useEvermarks(50);
}

// Missing exports that components are looking for
export function useUserEvermarks(userAddress?: string) {
  // For now, return all evermarks - this could be enhanced to filter by user
  return useEvermarks(20);
}

export function useEvermarkDetail(evermarkId: string) {
  const [evermark, setEvermark] = useState<Evermark | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get blockchain utilities outside the effect
  const { fetchEvermarkData } = useMetadataUtils();

  useEffect(() => {
    if (!evermarkId) {
      setEvermark(null);
      setIsLoading(false);
      return;
    }

    const fetchEvermark = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`🔍 Fetching evermark detail for ID: ${evermarkId}`);

        // Try Supabase first
        try {
          const supabaseEvermark = await SupabaseService.getEvermarkById(evermarkId);
          if (supabaseEvermark) {
            console.log('✅ Found evermark in Supabase');
            const convertedEvermark: Evermark = {
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
            setEvermark(convertedEvermark);
            setIsLoading(false);
            return;
          }
        } catch (supabaseError) {
          console.warn('⚠️ Supabase fetch failed, trying blockchain:', supabaseError);
        }

        // Fallback to blockchain
        console.log('🔗 Falling back to blockchain...');
        const blockchainData = await fetchEvermarkData(BigInt(evermarkId));
        
        if (blockchainData) {
          console.log('✅ Found evermark on blockchain');
          const convertedEvermark: Evermark = {
            id: blockchainData.id,
            title: blockchainData.title,
            author: blockchainData.author,
            description: blockchainData.description,
            sourceUrl: blockchainData.sourceUrl,
            image: blockchainData.image,
            metadataURI: blockchainData.metadataURI,
            creator: blockchainData.creator,
            creationTime: blockchainData.creationTime,
          };
          setEvermark(convertedEvermark);
        } else {
          throw new Error(`Evermark with ID ${evermarkId} not found`);
        }
      } catch (err) {
        console.error('❌ Failed to fetch evermark detail:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch evermark');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvermark();
  }, [evermarkId, fetchEvermarkData]);

  return { evermark, isLoading, error };
}
