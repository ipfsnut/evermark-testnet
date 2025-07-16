import { useState, useEffect, useCallback } from 'react';
import { SupabaseService, EvermarkRow } from '../lib/supabase';
import { useMetadataUtils } from './core/useMetadataUtils';
import { readContract } from 'thirdweb';
import { useContracts } from './core/useContracts';

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

interface UseSupabaseEvermarksOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'title' | 'votes';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  author?: string;
  verified?: boolean;
  enableBlockchainFallback?: boolean;
}

export function useSupabaseEvermarks(options: UseSupabaseEvermarksOptions = {}) {
  const [evermarks, setEvermarks] = useState<Evermark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { evermarkNFT } = useContracts();
  const { fetchEvermarkData } = useMetadataUtils();

  const {
    page = 1,
    pageSize = 12,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
    author,
    verified,
    enableBlockchainFallback = true
  } = options;

  // FIXED: Helper function to convert IPFS URI to gateway URL
  const convertIpfsToGateway = useCallback((ipfsUri: string, gatewayUrl = 'https://gateway.pinata.cloud/ipfs/'): string => {
    if (!ipfsUri || !ipfsUri.startsWith('ipfs://')) {
      return ipfsUri;
    }
    
    const hash = ipfsUri.replace('ipfs://', '');
    return `${gatewayUrl}${hash}`;
  }, []);

  // FIXED: Convert Supabase row to Evermark interface with correct nested image path
  const convertToEvermark = useCallback((row: EvermarkRow): Evermark => {
    // FIXED: Priority order for image URL:
    // 1. processed_image_url (if available and not null)
    // 2. metadata.originalMetadata.image converted from IPFS to gateway URL
    // 3. metadata.image as fallback
    // 4. undefined if no image
    let finalImageUrl: string | undefined;
    
    if ((row as any).processed_image_url) {
      // Use the processed image URL if available (likely already HTTP)
      finalImageUrl = (row as any).processed_image_url;
    } else if ((row.metadata as any)?.originalMetadata?.image) {
      // FIXED: Look in the correct nested location for IPFS image
      finalImageUrl = convertIpfsToGateway((row.metadata as any).originalMetadata.image);
    } else if (row.metadata?.image) {
      // Fallback to metadata.image
      finalImageUrl = convertIpfsToGateway(row.metadata.image);
    }

    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🖼️ Image mapping for ${row.id}:`, {
        processed_image_url: (row as any).processed_image_url,
        image_processing_status: (row as any).image_processing_status,
        originalMetadata_image: (row.metadata as any)?.originalMetadata?.image,
        metadata_image: row.metadata?.image,
        final_image_url: finalImageUrl
      });
    }

    return {
      id: row.id,
      title: row.title,
      author: row.author,
      description: row.description,
      sourceUrl: row.metadata?.sourceUrl,
      image: finalImageUrl,  // ← FIXED: Now looks in originalMetadata.image first
      metadataURI: row.metadata?.metadataURI || '',
      creator: row.metadata?.creator || row.author,
      creationTime: row.metadata?.creationTime || new Date(row.created_at).getTime() / 1000,
      verified: row.verified
    };
  }, [convertIpfsToGateway]);

  // Fetch from Supabase first, then blockchain fallback if needed
  const fetchEvermarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Fetching evermarks from Supabase...');
      const startTime = performance.now();

      // Primary: Try Supabase first
      const supabaseResult = await SupabaseService.getEvermarks({
        page,
        pageSize,
        sortBy,
        sortOrder,
        search,
        author,
        verified
      });

      const fetchTime = performance.now() - startTime;
      console.log(`⚡ Supabase fetch completed in ${fetchTime.toFixed(2)}ms`);

      if (supabaseResult.data && supabaseResult.data.length > 0) {
        // Success with Supabase data
        const convertedEvermarks = supabaseResult.data.map(convertToEvermark);
        
        // FIXED: Log image URLs for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('🖼️ Image URLs debug:', convertedEvermarks.map(e => ({
            id: e.id,
            title: e.title.slice(0, 30),
            originalImage: supabaseResult.data.find(r => r.id === e.id)?.metadata?.image,
            processedImage: e.image
          })));
        }
        
        setEvermarks(convertedEvermarks);
        setTotalCount(supabaseResult.count);
        setTotalPages(supabaseResult.totalPages);
        setIsLoading(false);
        return;
      }

      // Fallback: If no Supabase data and fallback enabled, try blockchain
      if (enableBlockchainFallback) {
        console.log('⚠️ No Supabase data found, falling back to blockchain...');
        await fetchFromBlockchain();
      } else {
        // No data and no fallback
        setEvermarks([]);
        setTotalCount(0);
        setTotalPages(0);
        setIsLoading(false);
      }

    } catch (err) {
      console.error('Supabase fetch error:', err);
      
      if (enableBlockchainFallback) {
        console.log('⚠️ Supabase error, falling back to blockchain...');
        await fetchFromBlockchain();
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch evermarks');
        setIsLoading(false);
      }
    }
  }, [page, pageSize, sortBy, sortOrder, search, author, verified, enableBlockchainFallback, convertToEvermark]);

  // Blockchain fallback function
  const fetchFromBlockchain = useCallback(async () => {
    try {
      console.log('🔗 Fetching from blockchain...');
      const blockchainStartTime = performance.now();

      const totalSupply = await readContract({
        contract: evermarkNFT,
        method: "function totalSupply() view returns (uint256)",
        params: [],
      });

      if (Number(totalSupply) === 0) {
        setEvermarks([]);
        setTotalCount(0);
        setTotalPages(0);
        setIsLoading(false);
        return;
      }

      // For blockchain fallback, get recent tokens (limited batch)
      const totalTokens = Number(totalSupply);
      const startId = Math.max(1, totalTokens - (pageSize * page) + 1);
      const endId = Math.min(totalTokens, startId + pageSize - 1);
      
      const tokenIds = Array.from(
        { length: endId - startId + 1 }, 
        (_, i) => BigInt(startId + i)
      ).reverse(); // Newest first

      const evermarkDataPromises = tokenIds.map(async (tokenId) => {
        try {
          return await fetchEvermarkData(tokenId);
        } catch (error) {
          console.warn(`Failed to fetch evermark ${tokenId}:`, error);
          return null;
        }
      });

      const evermarkDataResults = await Promise.all(evermarkDataPromises);
      
      const fetchedEvermarks: Evermark[] = evermarkDataResults
        .filter(data => data !== null)
        .map(data => ({
          id: data!.id,
          title: data!.title,
          author: data!.author,
          description: data!.description,
          sourceUrl: data!.sourceUrl,
          image: data!.image ? convertIpfsToGateway(data!.image) : undefined, // FIXED: Convert IPFS here too
          metadataURI: data!.metadataURI,
          creator: data!.creator,
          creationTime: data!.creationTime,
        }));

      const blockchainFetchTime = performance.now() - blockchainStartTime;
      console.log(`🔗 Blockchain fetch completed in ${blockchainFetchTime.toFixed(2)}ms`);

      setEvermarks(fetchedEvermarks);
      setTotalCount(totalTokens);
      setTotalPages(Math.ceil(totalTokens / pageSize));
      setIsLoading(false);

    } catch (err) {
      console.error('Blockchain fallback error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch from blockchain');
      setIsLoading(false);
    }
  }, [evermarkNFT, fetchEvermarkData, page, pageSize, convertIpfsToGateway]);

  // Refresh function
  const refresh = useCallback(() => {
    fetchEvermarks();
  }, [fetchEvermarks]);

  // Load more function for infinite scroll
  const loadMore = useCallback(async () => {
    if (isLoadingMore || page >= totalPages) return;

    setIsLoadingMore(true);
    try {
      const nextPageResult = await SupabaseService.getEvermarks({
        page: page + 1,
        pageSize,
        sortBy,
        sortOrder,
        search,
        author,
        verified
      });

      if (nextPageResult.data && nextPageResult.data.length > 0) {
        const newEvermarks = nextPageResult.data.map(convertToEvermark);
        setEvermarks(prev => [...prev, ...newEvermarks]);
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, page, totalPages, pageSize, sortBy, sortOrder, search, author, verified, convertToEvermark]);

  // Fetch on mount and when options change
  useEffect(() => {
    fetchEvermarks();
  }, [fetchEvermarks]);

  return {
    evermarks,
    isLoading,
    error,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    refresh,
    loadMore,
    isLoadingMore,
    hasMore: page < totalPages
  };
}

// Hook for getting recent evermarks (simplified)
export function useRecentEvermarks(limit = 10) {
  const [evermarks, setEvermarks] = useState<Evermark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FIXED: Helper function to convert IPFS URI to gateway URL
  const convertIpfsToGateway = useCallback((ipfsUri: string, gatewayUrl = 'https://gateway.pinata.cloud/ipfs/'): string => {
    if (!ipfsUri || !ipfsUri.startsWith('ipfs://')) {
      return ipfsUri;
    }
    
    const hash = ipfsUri.replace('ipfs://', '');
    return `${gatewayUrl}${hash}`;
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await SupabaseService.getRecentEvermarks(limit);
      
      const convertedEvermarks = data.map((row: EvermarkRow): Evermark => {
        // FIXED: Use same image priority logic as main hook - check originalMetadata.image
        let finalImageUrl: string | undefined;
        
        if ((row as any).processed_image_url) {
          finalImageUrl = (row as any).processed_image_url;
        } else if ((row.metadata as any)?.originalMetadata?.image) {
          // FIXED: Look in the correct nested location
          finalImageUrl = convertIpfsToGateway((row.metadata as any).originalMetadata.image);
        } else if (row.metadata?.image) {
          finalImageUrl = convertIpfsToGateway(row.metadata.image);
        }

        return {
          id: row.id,
          title: row.title,
          author: row.author,
          description: row.description,
          sourceUrl: row.metadata?.sourceUrl,
          image: finalImageUrl, // ← FIXED: Same logic as main hook
          metadataURI: row.metadata?.metadataURI || '',
          creator: row.metadata?.creator || row.author,
          creationTime: row.metadata?.creationTime || new Date(row.created_at).getTime() / 1000,
          verified: row.verified
        };
      });

      setEvermarks(convertedEvermarks);
    } catch (err) {
      console.error('Recent evermarks error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recent evermarks');
    } finally {
      setIsLoading(false);
    }
  }, [limit, convertIpfsToGateway]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  return {
    evermarks,
    isLoading,
    error,
    refresh: fetchRecent
  };
}