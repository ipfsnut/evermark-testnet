// src/hooks/useSupabaseEvermarks.ts - FIXED with centralized metadata processing
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, type EvermarkRow } from '../lib/supabase';
import { 
  MetadataTransformer, 
  type StandardizedEvermark,
  TimestampProcessor,
  ImageResolver,
  MetadataValidation
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
  category?: string;
  contentType?: StandardizedEvermark['contentType'];
  includeUnprocessed?: boolean;
}

interface UseSupabaseEvermarksResult {
  evermarks: StandardizedEvermark[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
  
  // Actions
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Metadata info
  processingStats: {
    total: number;
    processed: number;
    processing: number;
    failed: number;
    validationErrors: number;
  };
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
    category,
    contentType,
    includeUnprocessed = false
  } = options;

  const [evermarks, setEvermarks] = useState<StandardizedEvermark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    processed: 0,
    processing: 0,
    failed: 0,
    validationErrors: 0
  });

  // 🔧 FIXED: Centralized data fetching with proper error handling
  const fetchEvermarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching Evermarks with options:', {
        page,
        pageSize,
        sortBy,
        sortOrder,
        search,
        author,
        creator,
        verified,
        category,
        contentType
      });

      // Build query with proper column selection
      let query = supabase
        .from('evermarks')
        .select(`
          id,
          title,
          author,
          description,
          user_id,
          verified,
          created_at,
          updated_at,
          metadata,
          last_synced_at,
          tx_hash,
          block_number,
          processed_image_url,
          image_processing_status,
          image_processed_at
        `, { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (author) {
        query = query.eq('author', author);
      }

      if (creator) {
        // Search in metadata for creator info
        query = query.or(`user_id.eq.${creator},metadata->>creator.eq.${creator}`);
      }

      if (verified !== undefined) {
        query = query.eq('verified', verified);
      }

      if (category) {
        query = query.contains('metadata', { category });
      }

      // Content type filtering (needs custom logic since it's derived)
      if (contentType && contentType !== 'Custom') {
        switch (contentType) {
          case 'DOI':
            query = query.or('metadata->>doi.neq.null,metadata->originalMetadata->>doi.neq.null');
            break;
          case 'ISBN':
            query = query.or('metadata->>isbn.neq.null,metadata->originalMetadata->>isbn.neq.null');
            break;
          case 'Cast':
            query = query.or('metadata->>farcasterData.neq.null,metadata->originalMetadata->>farcasterData.neq.null');
            break;
          case 'URL':
            query = query.or('metadata->>sourceUrl.neq.null,metadata->originalMetadata->>external_url.neq.null');
            break;
        }
      }

      // Image processing filter
      if (!includeUnprocessed) {
        // Prioritize items with processed images or successful processing
        query = query.or('processed_image_url.neq.null,image_processing_status.neq.failed');
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: rawData, error: queryError, count } = await query;

      if (queryError) {
        throw new Error(`Database query failed: ${queryError.message}`);
      }

      console.log(`✅ Retrieved ${rawData?.length || 0} raw Evermarks from Supabase`);

      // 🔧 FIXED: Use centralized MetadataTransformer
      const transformedEvermarks: StandardizedEvermark[] = [];
      const stats = {
        total: rawData?.length || 0,
        processed: 0,
        processing: 0,
        failed: 0,
        validationErrors: 0
      };

      if (rawData) {
        for (const row of rawData) {
          try {
            // Transform using centralized processor
            const standardized = MetadataTransformer.transform(row as EvermarkRow);
            
            // Validate the result
            const validation = MetadataTransformer.validate(standardized);
            if (!validation.isValid) {
              console.warn(`⚠️ Validation failed for Evermark ${row.id}:`, validation.errors);
              stats.validationErrors++;
            }
            
            transformedEvermarks.push(standardized);
            
            // Update processing stats
            switch (standardized.imageStatus) {
              case 'processed':
                stats.processed++;
                break;
              case 'processing':
                stats.processing++;
                break;
              case 'failed':
                stats.failed++;
                break;
            }
            
          } catch (transformError) {
            console.error(`❌ Failed to transform Evermark ${row.id}:`, transformError);
            stats.validationErrors++;
            
            // Still include a fallback version
            const fallback = MetadataTransformer.transform(row as EvermarkRow);
            transformedEvermarks.push(fallback);
          }
        }
      }

      console.log('🔧 Processing Stats:', stats);
      
      setEvermarks(transformedEvermarks);
      setTotalCount(count || 0);
      setProcessingStats(stats);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Evermarks';
      console.error('❌ Supabase Evermarks fetch error:', err);
      setError(errorMessage);
      setEvermarks([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    sortBy,
    sortOrder,
    search,
    author,
    creator,
    verified,
    category,
    contentType,
    includeUnprocessed
  ]);

  // Initial fetch and dependency updates
  useEffect(() => {
    fetchEvermarks();
  }, [fetchEvermarks]);

  // 🔧 FIXED: Enhanced action methods
  const refetch = useCallback(async () => {
    await fetchEvermarks();
  }, [fetchEvermarks]);

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loading) {
      // This would require modifying the hook to support append mode
      // For now, just refetch with next page
      console.log('📄 Load more functionality would go here');
    }
  }, [loading]);

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
    loading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    currentPage: page,
    totalPages,
    
    refetch,
    loadMore,
    refresh,
    
    processingStats
  };
}

// 🔧 FIXED: Single Evermark fetcher with consistent transformation
export function useSupabaseEvermark(id: string | undefined) {
  const [evermark, setEvermark] = useState<StandardizedEvermark | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvermark = useCallback(async () => {
    if (!id) {
      setEvermark(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Fetching single Evermark: ${id}`);

      const { data, error: queryError } = await supabase
        .from('evermarks')
        .select(`
          id,
          title,
          author,
          description,
          user_id,
          verified,
          created_at,
          updated_at,
          metadata,
          last_synced_at,
          tx_hash,
          block_number,
          processed_image_url,
          image_processing_status,
          image_processed_at
        `)
        .eq('id', id)
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          throw new Error(`Evermark ${id} not found`);
        }
        throw new Error(`Database error: ${queryError.message}`);
      }

      if (!data) {
        throw new Error(`No data returned for Evermark ${id}`);
      }

      // 🔧 FIXED: Use centralized transformer
      const standardized = MetadataTransformer.transform(data as EvermarkRow);
      
      // Validate the result
      const validation = MetadataTransformer.validate(standardized);
      if (!validation.isValid) {
        console.warn(`⚠️ Validation failed for Evermark ${id}:`, validation.errors);
      }

      console.log(`✅ Successfully fetched and transformed Evermark ${id}`);
      setEvermark(standardized);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Evermark';
      console.error(`❌ Single Evermark fetch error for ${id}:`, err);
      setError(errorMessage);
      setEvermark(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvermark();
  }, [fetchEvermark]);

  const refetch = useCallback(() => {
    return fetchEvermark();
  }, [fetchEvermark]);

  return {
    evermark,
    loading,
    error,
    refetch
  };
}

// 🔧 FIXED: Helper hook for processing statistics
export function useEvermarkProcessingStats() {
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    processing: 0,
    failed: 0,
    needsProcessing: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      // Get processing statistics
      const { data, error } = await supabase
        .from('evermarks')
        .select('processed_image_url, image_processing_status')
        .not('processed_image_url', 'is', null);

      if (error) throw error;

      const processedCount = data?.filter(row => row.processed_image_url).length || 0;
      const processingCount = data?.filter(row => row.image_processing_status === 'processing').length || 0;
      const failedCount = data?.filter(row => row.image_processing_status === 'failed').length || 0;
      
      // Get total count
      const { count: totalCount } = await supabase
        .from('evermarks')
        .select('*', { count: 'exact', head: true });

      const total = totalCount || 0;
      const needsProcessing = total - processedCount - processingCount - failedCount;

      setStats({
        total,
        processed: processedCount,
        processing: processingCount,
        failed: failedCount,
        needsProcessing: Math.max(0, needsProcessing)
      });

    } catch (err) {
      console.error('❌ Failed to fetch processing stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
}

// 🔧 FIXED: Author-specific hook with consistent filtering
export function useSupabaseEvermarksByAuthor(author: string | undefined, options: Omit<UseSupabaseEvermarksOptions, 'author'> = {}) {
  return useSupabaseEvermarks({
    ...options,
    author
  });
}

// 🔧 FIXED: Creator-specific hook 
export function useSupabaseEvermarksByCreator(creator: string | undefined, options: Omit<UseSupabaseEvermarksOptions, 'creator'> = {}) {
  return useSupabaseEvermarks({
    ...options,
    creator
  });
}

// 🔧 FIXED: Search hook with debouncing
export function useSupabaseEvermarksSearch(searchTerm: string, debounceMs: number = 300) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  return useSupabaseEvermarks({
    search: debouncedSearch,
    pageSize: 20 // More results for search
  });
}

// 🔧 FIXED: Utility functions for component use
export const SupabaseEvermarkUtils = {
  /**
   * Format display date consistently
   */
  formatDisplayDate: (evermark: StandardizedEvermark): string => {
    try {
      return new Date(evermark.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  },

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime: (evermark: StandardizedEvermark): string => {
    try {
      const now = Date.now();
      const created = new Date(evermark.createdAt).getTime();
      const diffMs = now - created;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 30) return `${diffDays}d ago`;
      
      return SupabaseEvermarkUtils.formatDisplayDate(evermark);
    } catch (error) {
      return 'Unknown';
    }
  },

  /**
   * Get content type display name
   */
  getContentTypeDisplay: (contentType: StandardizedEvermark['contentType']): string => {
    const displayNames = {
      'DOI': 'Academic Paper',
      'ISBN': 'Book',
      'Cast': 'Farcaster Cast',
      'URL': 'Web Content',
      'Custom': 'Custom Content'
    };
    return displayNames[contentType] || contentType;
  },

  /**
   * Get processing status display
   */
  getImageStatusDisplay: (imageStatus: StandardizedEvermark['imageStatus']): { 
    text: string; 
    color: 'green' | 'yellow' | 'red' | 'gray' 
  } => {
    const statusMap = {
      'processed': { text: 'Processed', color: 'green' as const },
      'processing': { text: 'Processing', color: 'yellow' as const },
      'failed': { text: 'Failed', color: 'red' as const },
      'none': { text: 'No Image', color: 'gray' as const }
    };
    return statusMap[imageStatus] || { text: 'Unknown', color: 'gray' };
  },

  /**
   * Check if Evermark has rich metadata
   */
  hasRichMetadata: (evermark: StandardizedEvermark): boolean => {
    return !!(
      evermark.extendedMetadata.castData ||
      evermark.extendedMetadata.doi ||
      evermark.extendedMetadata.isbn ||
      evermark.tags.length > 0
    );
  },

  /**
   * Extract primary tags for display
   */
  getPrimaryTags: (evermark: StandardizedEvermark, maxTags: number = 3): string[] => {
    return evermark.tags.slice(0, maxTags);
  },

  /**
   * Get engagement data if available
   */
  getEngagementData: (evermark: StandardizedEvermark): {
    hasEngagement: boolean;
    likes?: number;
    recasts?: number;
    replies?: number;
    total: number;
  } => {
    const castData = evermark.extendedMetadata.castData;
    if (castData?.engagement) {
      const { likes, recasts, replies } = castData.engagement;
      return {
        hasEngagement: true,
        likes,
        recasts,
        replies,
        total: likes + recasts + replies
      };
    }
    return { hasEngagement: false, total: 0 };
  }
};

// Export types for use in components
export type { StandardizedEvermark, UseSupabaseEvermarksOptions, UseSupabaseEvermarksResult };