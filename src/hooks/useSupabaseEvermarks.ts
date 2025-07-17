// ===================================================================
// src/hooks/useSupabaseEvermarks.ts - UPDATED with tokenIds filter
// ===================================================================

import { useState, useEffect, useCallback } from 'react'; // ✅ FIXED: Add missing imports
import { supabase, type EvermarkRow } from '../lib/supabase';
import { 
  MetadataTransformer, 
  type StandardizedEvermark
} from '../utils/MetadataTransformer';

interface UseSupabaseEvermarksOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'title' | 'author' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  author?: string;
  creator?: string;
  verified?: boolean;
  includeUnprocessed?: boolean;
  enableBlockchainFallback?: boolean;
  tokenIds?: number[]; // ✅ NEW: Array of specific token IDs to fetch
}

interface UseSupabaseEvermarksResult {
  evermarks: StandardizedEvermark[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
  refresh: () => Promise<void>;
}

export function useSupabaseEvermarks(options: UseSupabaseEvermarksOptions = {}): UseSupabaseEvermarksResult {
  const {
    page = 1,
    pageSize = 12,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
    author,
    creator,
    verified,
    includeUnprocessed = false,
    tokenIds // ✅ NEW: Extract tokenIds option
  } = options;

  const [evermarks, setEvermarks] = useState<StandardizedEvermark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEvermarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching Evermarks with options:', {
        page, pageSize, sortBy, sortOrder, search, author, creator, verified, tokenIds
      });

      // ✅ UPDATED: Build query with optional tokenIds filtering
      let query = supabase
        .from('evermarks')
        .select(`
          token_id,
          title,
          author,
          description,
          owner,
          content_type,
          source_url,
          created_at,
          updated_at,
          token_uri,
          metadata_fetched,
          sync_timestamp,
          verified,
          processed_image_url,
          image_processing_status,
          image_processed_at,
          metadata,
          metadata_json,
          ipfs_metadata
        `, { count: 'exact' });

      // ✅ NEW: Apply token ID filter FIRST if provided
      if (tokenIds && tokenIds.length > 0) {
        console.log(`🎯 Filtering by ${tokenIds.length} specific token IDs:`, tokenIds.slice(0, 5));
        query = query.in('token_id', tokenIds);
      }

      // Apply other filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (author) {
        query = query.eq('author', author);
      }

      if (creator) {
        query = query.or(`owner.eq.${creator},metadata->>creator.eq.${creator}`);
      }

      if (verified !== undefined) {
        query = query.eq('verified', verified);
      }

      // ✅ FIXED: More permissive image processing filter
      if (!includeUnprocessed) {
        // Only exclude items that explicitly failed processing
        // Allow pending, completed, and items without processing status
        query = query.not('image_processing_status', 'eq', 'failed');
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // ✅ SMART PAGINATION: Skip pagination for small token ID lists
      if (tokenIds && tokenIds.length > 0 && tokenIds.length <= 100) {
        console.log('📄 Skipping pagination for small token ID list');
        // Get all requested tokens in one query (up to 100)
      } else {
        // Apply normal pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data: rawData, error: queryError, count } = await query;

      if (queryError) {
        throw new Error(`Database query failed: ${queryError.message}`);
      }

      console.log(`✅ Retrieved ${rawData?.length || 0} raw Evermarks from Supabase`);

      // Transform using MetadataTransformer
      const transformedEvermarks: StandardizedEvermark[] = [];

      if (rawData) {
        for (const row of rawData) {
          try {
            const standardized = MetadataTransformer.transform(row as EvermarkRow);
            
            // Validate the result
            const validation = MetadataTransformer.validate(standardized);
            if (!validation.isValid) {
              console.warn(`⚠️ Validation failed for Evermark ${row.token_id}:`, validation.errors);
            }
            
            transformedEvermarks.push(standardized);
            
          } catch (transformError) {
            console.error(`❌ Failed to transform Evermark ${row.token_id}:`, transformError);
            
            // Still include a fallback version
            const fallback = MetadataTransformer.transform(row as EvermarkRow);
            transformedEvermarks.push(fallback);
          }
        }
      }

      setEvermarks(transformedEvermarks);
      setTotalCount(count || 0);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Evermarks';
      console.error('❌ Supabase Evermarks fetch error:', err);
      setError(errorMessage);
      setEvermarks([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    page, pageSize, sortBy, sortOrder, search, author, creator, verified, 
    includeUnprocessed, tokenIds?.join(',') // ✅ NEW: Include tokenIds in dependencies
  ]);

  useEffect(() => {
    fetchEvermarks();
  }, [fetchEvermarks]);

  const refresh = useCallback(async () => {
    console.log('🔄 Refreshing Evermarks...');
    await fetchEvermarks();
  }, [fetchEvermarks]);

  // Computed values
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    evermarks,
    isLoading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    currentPage: page,
    totalPages,
    refresh
  };
}

// ✅ UNCHANGED: Keep existing single evermark hook
export function useSupabaseEvermark(tokenId: string | undefined) {
  const [evermark, setEvermark] = useState<StandardizedEvermark | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvermark = useCallback(async () => {
    if (!tokenId) {
      setEvermark(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🔍 Fetching single Evermark: ${tokenId}`);

      const { data, error: queryError } = await supabase
        .from('evermarks')
        .select('*')
        .eq('token_id', parseInt(tokenId))
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          throw new Error(`Evermark ${tokenId} not found`);
        }
        throw new Error(`Database error: ${queryError.message}`);
      }

      if (!data) {
        throw new Error(`No data returned for Evermark ${tokenId}`);
      }

      const standardized = MetadataTransformer.transform(data as EvermarkRow);
      
      const validation = MetadataTransformer.validate(standardized);
      if (!validation.isValid) {
        console.warn(`⚠️ Validation failed for Evermark ${tokenId}:`, validation.errors);
      }

      console.log(`✅ Successfully fetched and transformed Evermark ${tokenId}`);
      setEvermark(standardized);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Evermark';
      console.error(`❌ Single Evermark fetch error for ${tokenId}:`, err);
      setError(errorMessage);
      setEvermark(null);
    } finally {
      setIsLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    fetchEvermark();
  }, [fetchEvermark]);

  const refetch = useCallback(() => {
    return fetchEvermark();
  }, [fetchEvermark]);

  return {
    evermark,
    isLoading,
    error,
    refetch
  };
}

// Export types for use in components
export type { StandardizedEvermark, UseSupabaseEvermarksOptions, UseSupabaseEvermarksResult };

// ===================================================================
// src/hooks/useEvermarks.ts - UPDATED to use new tokenIds filter
// ===================================================================

// ✅ NEW: Efficient batch hook using tokenIds filter
export function useEvermarksBatch(tokenIds: number[]) {
  // Use the enhanced hook with tokenIds filter
  const { 
    evermarks: supabaseEvermarks, 
    isLoading, 
    error 
  } = useSupabaseEvermarks({
    tokenIds, // ✅ This now works efficiently at the database level!
    sortBy: 'created_at',
    sortOrder: 'desc',
    enableBlockchainFallback: false // Skip blockchain for performance
  });

  // Convert to legacy format for compatibility
  const convertToLegacyFormat = (evermark: StandardizedEvermark) => ({
    id: evermark.id,
    name: evermark.title,
    title: evermark.title,
    description: evermark.description || '',
    content: evermark.description || '',
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
    view_count: 0,
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

  return {
    evermarks: supabaseEvermarks.map(convertToLegacyFormat),
    isLoading,
    error
  };
}
