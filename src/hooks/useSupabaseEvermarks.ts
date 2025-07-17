
import { useState, useEffect, useCallback } from 'react';
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
  tokenIds?: number[]; 
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

      // Image processing filter
      if (!includeUnprocessed) {
        query = query.or('processed_image_url.neq.null,image_processing_status.neq.failed');
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

