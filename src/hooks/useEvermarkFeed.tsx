import { useState, useMemo, useCallback } from 'react';
import { useSupabaseEvermarks, Evermark } from './useSupabaseEvermarks';

export type SortOption = 'newest' | 'oldest' | 'mostVoted' | 'title';
export type FilterOption = 'all' | 'hasImage' | 'recent' | 'popular';

export interface FeedFilters {
  sort: SortOption;
  filter: FilterOption;
  search?: string;
  author?: string;
  creator?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface EvermarkFeedResult {
  evermarks: Evermark[];
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
  filters: FeedFilters;
  setFilters: (filters: Partial<FeedFilters>) => void;
  setPage: (page: number) => void;
  refresh: () => void;
  refreshAfterCreation: () => void; // ✅ FIXED: Add missing property
}

const DEFAULT_PAGE_SIZE = 12;

export function useEvermarkFeed(initialPageSize = DEFAULT_PAGE_SIZE): EvermarkFeedResult {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<FeedFilters>({
    sort: 'newest',
    filter: 'all'
  });

  // Convert sort options to Supabase format
  const sortBy = useMemo(() => {
    switch (filters.sort) {
      case 'title': return 'title';
      case 'oldest': return 'created_at';
      case 'newest':
      default: return 'created_at';
    }
  }, [filters.sort]);

  const sortOrder = useMemo(() => {
    return filters.sort === 'oldest' ? 'asc' : 'desc';
  }, [filters.sort]);

  // ✅ ENHANCED: Use the Supabase-first hook with better error handling
  const {
    evermarks: rawEvermarks,
    isLoading,
    error,
    totalCount,
    totalPages,
    refresh: refreshSupabase
  } = useSupabaseEvermarks({
    page: currentPage,
    pageSize,
    sortBy,
    sortOrder,
    search: filters.search,
    author: filters.author,
    enableBlockchainFallback: true
  });

  // Apply client-side filtering for special filters
  const filteredEvermarks = useMemo(() => {
    let filtered = rawEvermarks;

    switch (filters.filter) {
      case 'hasImage':
        filtered = filtered.filter(evermark => evermark.image);
        break;
      case 'recent':
        // Recent items (last 7 days) - this could be moved to server-side
        const weekAgo = Date.now() / 1000 - (7 * 24 * 60 * 60);
        filtered = filtered.filter(evermark => evermark.creationTime > weekAgo);
        break;
      case 'popular':
        // Popular items with votes - this should eventually be server-side
        filtered = filtered.filter(evermark => evermark.votes && evermark.votes > 0);
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }

    // Apply creator filter if specified
    if (filters.creator) {
      filtered = filtered.filter(evermark => 
        evermark.creator?.toLowerCase().includes(filters.creator!.toLowerCase())
      );
    }

    return filtered;
  }, [rawEvermarks, filters.filter, filters.creator]);

  // Create pagination state
  const pagination: PaginationState = useMemo(() => ({
    page: currentPage,
    pageSize,
    totalPages,
    totalItems: totalCount,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  }), [currentPage, pageSize, totalPages, totalCount]);

  // Handle filter changes
  const setFilters = useCallback((newFilters: Partial<FeedFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    // Reset to first page when filters change
    if (newFilters.sort || newFilters.filter || newFilters.search || newFilters.author) {
      setCurrentPage(1);
    }
  }, []);

  // Handle page changes
  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // ✅ ENHANCED: Refresh function with cache coordination
  const refresh = useCallback(() => {
    console.log("🔄 Refreshing evermark feed data");
    refreshSupabase();
  }, [refreshSupabase]);

  // ✅ NEW: Auto-refresh when new evermarks might be created
  // This could be enhanced with real-time subscriptions later
  const refreshAfterCreation = useCallback(() => {
    console.log("🔄 Refreshing feed after potential new evermark creation");
    setTimeout(() => {
      refresh();
    }, 3000); // Give time for webhook to update Supabase
  }, [refresh]);

  return {
    evermarks: filteredEvermarks,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    setPage,
    refresh,
    // ✅ NEW: Expose refresh trigger for after creation
    refreshAfterCreation,
  };
}

// Simplified hook for getting recent evermarks without pagination
export function useRecentEvermarks(limit = 10) {
  return useSupabaseEvermarks({
    page: 1,
    pageSize: limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
    enableBlockchainFallback: true
  });
}

// Hook for getting evermarks by specific author
export function useEvermarksByAuthor(author: string, limit = 20) {
  return useSupabaseEvermarks({
    page: 1,
    pageSize: limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
    author,
    enableBlockchainFallback: true
  });
}

// Hook for searching evermarks
export function useEvermarkSearch(query: string, limit = 20) {
  return useSupabaseEvermarks({
    page: 1,
    pageSize: limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
    search: query,
    enableBlockchainFallback: true
  });
}

// Missing export that components are looking for
export function useTrendingEvermarks(limit = 10) {
  // For now, return recent evermarks - this could be enhanced with trending algorithm
  return useSupabaseEvermarks({
    page: 1,
    pageSize: limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
    enableBlockchainFallback: true
  });
}