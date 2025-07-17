import { useState, useMemo, useCallback } from 'react';
import { useSupabaseEvermarks, StandardizedEvermark } from './useSupabaseEvermarks';

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
  evermarks: StandardizedEvermark[];
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
  filters: FeedFilters;
  setFilters: (filters: Partial<FeedFilters>) => void;
  setPage: (page: number) => void;
  refresh: () => void;
  refreshAfterCreation: () => void;
}

const DEFAULT_PAGE_SIZE = 12;

export function useEvermarkFeed(initialPageSize = DEFAULT_PAGE_SIZE): EvermarkFeedResult {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<FeedFilters>({
    sort: 'newest',
    filter: 'all'
  });

  // ✅ FIXED: Convert sort options to Supabase format using new schema fields
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

  // ✅ FIXED: Use the updated Supabase hook
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
    creator: filters.creator,
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
        // Recent items (last 7 days)
        const weekAgo = Date.now() / 1000 - (7 * 24 * 60 * 60);
        filtered = filtered.filter(evermark => evermark.creationTime > weekAgo);
        break;
      case 'popular':
        // Popular items with votes
        filtered = filtered.filter(evermark => evermark.votes && evermark.votes > 0);
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }

    return filtered;
  }, [rawEvermarks, filters.filter]);

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

  const refresh = useCallback(() => {
    console.log("🔄 Refreshing evermark feed data");
    refreshSupabase();
  }, [refreshSupabase]);

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
    refreshAfterCreation,
  };
}

// ✅ FIXED: Simplified hook for getting recent evermarks without pagination
export function useRecentEvermarks(limit = 10) {
  return useSupabaseEvermarks({
    page: 1,
    pageSize: limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
    enableBlockchainFallback: true
  });
}

// ✅ FIXED: Hook for getting evermarks by specific author
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

// ✅ FIXED: Hook for searching evermarks
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

// ✅ FIXED: Hook for trending evermarks
export function useTrendingEvermarks(limit = 10) {
  return useSupabaseEvermarks({
    page: 1,
    pageSize: limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
    enableBlockchainFallback: true
  });
}