// src/hooks/useEvermarkFeed.ts - Enhanced feed with pagination and filtering
import { useState, useEffect, useMemo, useCallback } from 'react';
import { readContract } from "thirdweb";
import { useContracts } from './core/useContracts';
import { useMetadataUtils } from './core/useMetadataUtils';

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
  evermarks: any[];
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
  filters: FeedFilters;
  setFilters: (filters: Partial<FeedFilters>) => void;
  setPage: (page: number) => void;
  refresh: () => void;
}

const DEFAULT_PAGE_SIZE = 12;
const MAX_FETCH_SIZE = 50; // Fetch in chunks to avoid overwhelming the network

export function useEvermarkFeed(initialPageSize = DEFAULT_PAGE_SIZE): EvermarkFeedResult {
  const [allEvermarks, setAllEvermarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  const [filters, setFiltersState] = useState<FeedFilters>({
    sort: 'newest',
    filter: 'all'
  });

  const { evermarkNFT } = useContracts();
  const { fetchEvermarkDataBatch } = useMetadataUtils();

  // Fetch all evermarks with smart caching
  const fetchAllEvermarks = useCallback(async () => {
    const now = Date.now();
    // Only refetch if it's been more than 60 seconds since last fetch
    if (now - lastFetch < 60000 && allEvermarks.length > 0) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setLastFetch(now);
      
      console.log('🔍 Fetching all evermarks for feed...');
      
      const totalSupply = await readContract({
        contract: evermarkNFT,
        method: "function totalSupply() view returns (uint256)",
        params: [],
      });
      
      if (Number(totalSupply) === 0) {
        setAllEvermarks([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch all token IDs in batches
      const totalTokens = Number(totalSupply);
      const allTokenIds = Array.from({ length: totalTokens }, (_, i) => BigInt(i + 1));
      
      console.log(`📊 Fetching ${totalTokens} evermarks in batches...`);
      
      // Process in chunks to avoid overwhelming the network
      const chunkSize = Math.min(MAX_FETCH_SIZE, totalTokens);
      const chunks = [];
      for (let i = 0; i < allTokenIds.length; i += chunkSize) {
        chunks.push(allTokenIds.slice(i, i + chunkSize));
      }
      
      const allEvermarkData = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`📦 Processing chunk ${i + 1}/${chunks.length}...`);
        const chunkData = await fetchEvermarkDataBatch(chunks[i], 5); // 5 concurrent requests per chunk
        allEvermarkData.push(...chunkData.filter(data => data !== null));
      }
      
      console.log(`✅ Successfully fetched ${allEvermarkData.length} evermarks`);
      setAllEvermarks(allEvermarkData);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error("❌ Error fetching evermarks feed:", errorMessage);
      setError(errorMessage || "Failed to load evermarks");
    } finally {
      setIsLoading(false);
    }
  }, [evermarkNFT, fetchEvermarkDataBatch, lastFetch, allEvermarks.length]);

  // Filter and sort evermarks
  const filteredAndSortedEvermarks = useMemo(() => {
    let filtered = [...allEvermarks];
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(evermark => 
        evermark.title.toLowerCase().includes(searchTerm) ||
        evermark.author.toLowerCase().includes(searchTerm) ||
        evermark.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply author filter
    if (filters.author) {
      filtered = filtered.filter(evermark => 
        evermark.author.toLowerCase().includes(filters.author!.toLowerCase())
      );
    }
    
    // Apply creator filter
    if (filters.creator) {
      filtered = filtered.filter(evermark => 
        evermark.creator?.toLowerCase() === filters.creator!.toLowerCase()
      );
    }
    
    // Apply content filters
    switch (filters.filter) {
      case 'hasImage':
        filtered = filtered.filter(evermark => evermark.image);
        break;
      case 'recent':
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(evermark => evermark.creationTime > weekAgo);
        break;
      case 'popular':
        // Filter for evermarks with votes > 0 (assuming voting data is available)
        filtered = filtered.filter(evermark => (evermark.votes || 0) > 0);
        break;
    }
    
    // Apply sorting
    switch (filters.sort) {
      case 'newest':
        filtered.sort((a, b) => b.creationTime - a.creationTime);
        break;
      case 'oldest':
        filtered.sort((a, b) => a.creationTime - b.creationTime);
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'mostVoted':
        filtered.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        break;
    }
    
    return filtered;
  }, [allEvermarks, filters]);

  // Calculate pagination
  const pagination = useMemo((): PaginationState => {
    const totalItems = filteredAndSortedEvermarks.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    
    return {
      page: currentPage,
      pageSize,
      totalPages,
      totalItems,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    };
  }, [filteredAndSortedEvermarks.length, currentPage, pageSize]);

  // Get current page items
  const currentPageEvermarks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedEvermarks.slice(startIndex, endIndex);
  }, [filteredAndSortedEvermarks, currentPage, pageSize]);

  // Handlers
  const setFilters = useCallback((newFilters: Partial<FeedFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const setPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  }, [pagination.totalPages]);

  const refresh = useCallback(() => {
    setLastFetch(0); // Force refetch
    fetchAllEvermarks();
  }, [fetchAllEvermarks]);

  // Initial fetch
  useEffect(() => {
    fetchAllEvermarks();
  }, [fetchAllEvermarks]);

  // Debug logging
  useEffect(() => {
    console.log('📊 Feed State:', {
      totalEvermarks: allEvermarks.length,
      filteredCount: filteredAndSortedEvermarks.length,
      currentPageItems: currentPageEvermarks.length,
      pagination,
      filters
    });
  }, [allEvermarks.length, filteredAndSortedEvermarks.length, currentPageEvermarks.length, pagination, filters]);

  return {
    evermarks: currentPageEvermarks,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    setPage,
    refresh,
  };
}

// Hook for trending/featured evermarks
export function useTrendingEvermarks(limit = 6) {
  const { evermarks, isLoading } = useEvermarkFeed();
  
  const trendingEvermarks = useMemo(() => {
    // Sort by creation time and votes for trending
    return [...evermarks]
      .sort((a, b) => {
        const aScore = (a.votes || 0) + (Date.now() - a.creationTime) / (1000 * 60 * 60 * 24); // Boost recent items
        const bScore = (b.votes || 0) + (Date.now() - b.creationTime) / (1000 * 60 * 60 * 24);
        return bScore - aScore;
      })
      .slice(0, limit);
  }, [evermarks, limit]);
  
  return {
    trendingEvermarks,
    isLoading
  };
}

// Hook for recent evermarks
export function useRecentEvermarks(limit = 8) {
  const { evermarks, isLoading } = useEvermarkFeed();
  
  const recentEvermarks = useMemo(() => {
    return [...evermarks]
      .sort((a, b) => b.creationTime - a.creationTime)
      .slice(0, limit);
  }, [evermarks, limit]);
  
  return {
    recentEvermarks,
    isLoading
  };
}