import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, type EvermarkRow } from '../lib/supabase';
import { 
  EvermarkSchemaTransformer, 
  QueryService,
  type StandardizedEvermark
} from '../lib/supabase-schema';

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
  tokenIds?: number[]; // Array of specific token IDs to fetch
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
    tokenIds
  } = options;

  const [evermarks, setEvermarks] = useState<StandardizedEvermark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // 🚨 FIXED: Memoize tokenIds to prevent infinite loops
  const stableTokenIds = useMemo(() => {
    if (!tokenIds || tokenIds.length === 0) return null;
    // Create a stable reference by sorting and joining
    return [...tokenIds].sort((a, b) => a - b);
  }, [tokenIds?.join(',')]); // Only change when the actual content changes

  // 🚨 FIXED: Create stable cache key for tokenIds
  const tokenIdsCacheKey = useMemo(() => {
    return stableTokenIds ? stableTokenIds.join(',') : '';
  }, [stableTokenIds]);

  const fetchEvermarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching Evermarks with options:', {
        page, pageSize, sortBy, sortOrder, search, author, creator, verified, 
        tokenIdsCount: stableTokenIds?.length || 0
      });

      // Build query using your existing supabase structure
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
          ipfs_metadata,
          tx_hash,
          block_number,
          last_synced_at,
          user_id
        `, { count: 'exact' });

      // Apply token ID filter FIRST if provided
      if (stableTokenIds && stableTokenIds.length > 0) {
        console.log(`🎯 Filtering by ${stableTokenIds.length} specific token IDs:`, stableTokenIds.slice(0, 5));
        query = query.in('token_id', stableTokenIds);
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

      // More permissive image processing filter
      if (!includeUnprocessed) {
        // Only exclude items that explicitly failed processing
        query = query.not('image_processing_status', 'eq', 'failed');
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // SMART PAGINATION: Skip pagination for small token ID lists
      if (stableTokenIds && stableTokenIds.length > 0 && stableTokenIds.length <= 100) {
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

      // Transform using the new schema layer
      const transformedEvermarks: StandardizedEvermark[] = [];

      if (rawData) {
        for (const row of rawData) {
          try {
            // Use the schema transformer instead of the old MetadataTransformer
            const standardized = EvermarkSchemaTransformer.toStandardized(row as any);
            transformedEvermarks.push(standardized);
            
          } catch (transformError) {
            console.error(`❌ Failed to transform Evermark ${row.token_id}:`, transformError);
            
            // Still include a fallback version
            const fallback = EvermarkSchemaTransformer.toStandardized(row as any);
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
    // 🚨 FIXED: Use stable dependencies only
    page, 
    pageSize, 
    sortBy, 
    sortOrder, 
    search, 
    author, 
    creator, 
    verified, 
    includeUnprocessed, 
    tokenIdsCacheKey // Use the stable cache key instead of array
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

// Keep your existing single evermark hook but update it to use schema layer
export function useSupabaseEvermark(tokenId: string | undefined) {
  const [evermark, setEvermark] = useState<StandardizedEvermark | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🚨 FIXED: Memoize tokenId to prevent unnecessary re-fetches
  const stableTokenId = useMemo(() => {
    return tokenId ? tokenId.toString() : null;
  }, [tokenId]);

  const fetchEvermark = useCallback(async () => {
    if (!stableTokenId) {
      setEvermark(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🔍 Fetching single Evermark: ${stableTokenId}`);

      const { data, error: queryError } = await supabase
        .from('evermarks')
        .select('*')
        .eq('token_id', parseInt(stableTokenId))
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          throw new Error(`Evermark ${stableTokenId} not found`);
        }
        throw new Error(`Database error: ${queryError.message}`);
      }

      if (!data) {
        throw new Error(`No data returned for Evermark ${stableTokenId}`);
      }

      // Use the schema transformer
      const standardized = EvermarkSchemaTransformer.toStandardized(data as any);
      
      console.log(`✅ Successfully fetched and transformed Evermark ${stableTokenId}`);
      setEvermark(standardized);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Evermark';
      console.error(`❌ Single Evermark fetch error for ${stableTokenId}:`, err);
      setError(errorMessage);
      setEvermark(null);
    } finally {
      setIsLoading(false);
    }
  }, [stableTokenId]); // Use stable tokenId

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

// Efficient batch hook using tokenIds filter
export function useEvermarksBatch(tokenIds: number[]) {
  // 🚨 FIXED: Memoize the tokenIds to prevent infinite loops
  const stableTokenIds = useMemo(() => {
    if (!tokenIds || tokenIds.length === 0) return [];
    // Create a stable reference
    return [...tokenIds].sort((a, b) => a - b);
  }, [tokenIds?.join(',')]);

  // Use the enhanced hook with tokenIds filter
  const { 
    evermarks: supabaseEvermarks, 
    isLoading, 
    error 
  } = useSupabaseEvermarks({
    tokenIds: stableTokenIds, // Use stable tokenIds
    sortBy: 'created_at',
    sortOrder: 'desc',
    enableBlockchainFallback: false // Skip blockchain for performance
  });

  return {
    evermarks: supabaseEvermarks, // Already in StandardizedEvermark format
    isLoading,
    error
  };
}