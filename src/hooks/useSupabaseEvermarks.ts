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

class TimestampUtils {

  static toMilliseconds(timestamp: number | string | Date | null | undefined): number {
    if (!timestamp) {
      return Date.now();
    }
    
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
    
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
      
      const num = parseInt(timestamp);
      if (!isNaN(num)) {
        return this.toMilliseconds(num);
      }
      
      return Date.now();
    }
    
    const num = Number(timestamp);
    
    if (num > 0 && num < 10000000000) {
      return num * 1000;
    }
    
    if (num >= 10000000000) {
      return num;
    }
    
    return Date.now();
  }

  static extractCreationTime(row: any): number {

    if (row.metadata?.originalMetadata?.evermark?.createdAt) {
      return this.toMilliseconds(row.metadata.originalMetadata.evermark.createdAt);
    }
    
    if (row.metadata?.creationTime) {
      return this.toMilliseconds(row.metadata.creationTime);
    }
    
    if (row.metadata?.syncedAt) {
      return this.toMilliseconds(row.metadata.syncedAt);
    }
    
    if (row.created_at) {
      return new Date(row.created_at).getTime();
    }
    
    return Date.now();
  }
}

class ImageResolver {
  static convertIpfsToGateway(ipfsUri: string, gateway = 'https://gateway.pinata.cloud/ipfs/'): string {
    if (!ipfsUri || !ipfsUri.startsWith('ipfs://')) {
      return ipfsUri;
    }
    
    const hash = ipfsUri.replace('ipfs://', '');
    return `${gateway}${hash}`;
  }
  
  static resolveImageUrl(row: any): string | undefined {

    if (row.processed_image_url) {
      return row.processed_image_url;
    }
    
    if (row.metadata?.originalMetadata?.image) {
      return this.convertIpfsToGateway(row.metadata.originalMetadata.image);
    }
    
    if (row.metadata?.image) {
      return this.convertIpfsToGateway(row.metadata.image);
    }
    
    if (row.metadata?.originalMetadata?.external_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return row.metadata.originalMetadata.external_url;
    }
    
    return undefined;
  }
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

  const convertToEvermark = useCallback((row: EvermarkRow): Evermark => {
    const creationTime = TimestampUtils.extractCreationTime(row);
    
    const imageUrl = ImageResolver.resolveImageUrl(row);
    
    const originalMetadata = (row.metadata as any)?.originalMetadata;
    
    const result: Evermark = {
      id: row.id,
      title: row.title,
      author: row.author,
      description: row.description || originalMetadata?.description,
      sourceUrl: originalMetadata?.external_url,
      image: imageUrl,
      metadataURI: (row.metadata as any)?.tokenURI || '',
      creator: (row.metadata as any)?.creator || row.author,
      creationTime,
      verified: row.verified
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 Evermark ${row.id} conversion:`, {
        title: result.title.slice(0, 30),
        creationTime: result.creationTime,
        isMilliseconds: result.creationTime > 10000000000,
        humanDate: new Date(result.creationTime).toISOString(),
        relativeTime: formatRelativeTime(result.creationTime),
        imageResolution: {
          processed_image_url: !!(row as any).processed_image_url,
          originalMetadata_image: !!originalMetadata?.image,
          final_image_url: !!result.image
        },
        rawTimestamps: {
          created_at: row.created_at,
          syncedAt: (row.metadata as any)?.syncedAt,
          evermarkCreatedAt: originalMetadata?.evermark?.createdAt,
          metadataCreationTime: (row.metadata as any)?.creationTime
        }
      });
    }
    
    return result;
  }, []);

  const formatRelativeTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }, []);

  const fetchEvermarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Fetching evermarks from Supabase...');
      const startTime = performance.now();

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
        const convertedEvermarks = supabaseResult.data.map(convertToEvermark);
        
        const timestampIssues = convertedEvermarks.filter(e => {
          const date = new Date(e.creationTime);
          return date.getFullYear() < 2020;
        });
        
        if (timestampIssues.length > 0) {
          console.warn('⚠️ Found evermarks with suspicious timestamps:', timestampIssues.map(e => ({
            id: e.id,
            title: e.title.slice(0, 30),
            creationTime: e.creationTime,
            humanDate: new Date(e.creationTime).toISOString()
          })));
        }
        
        setEvermarks(convertedEvermarks);
        setTotalCount(supabaseResult.count);
        setTotalPages(supabaseResult.totalPages);
        setIsLoading(false);
        return;
      }

      if (enableBlockchainFallback) {
        console.log('⚠️ No Supabase data found, falling back to blockchain...');
        await fetchFromBlockchain();
      } else {
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

      const totalTokens = Number(totalSupply);
      const startId = Math.max(1, totalTokens - (pageSize * page) + 1);
      const endId = Math.min(totalTokens, startId + pageSize - 1);
      
      const tokenIds = Array.from(
        { length: endId - startId + 1 }, 
        (_, i) => BigInt(startId + i)
      ).reverse();

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
          image: data!.image ? ImageResolver.convertIpfsToGateway(data!.image) : undefined,
          metadataURI: data!.metadataURI,
          creator: data!.creator,
          creationTime: TimestampUtils.toMilliseconds(data!.creationTime), // ✅ FIXED
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
  }, [evermarkNFT, fetchEvermarkData, page, pageSize]);

  const refresh = useCallback(() => {
    fetchEvermarks();
  }, [fetchEvermarks]);

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

export function useRecentEvermarks(limit = 10) {
  const [evermarks, setEvermarks] = useState<Evermark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await SupabaseService.getRecentEvermarks(limit);
      
      const convertedEvermarks = data.map((row: any): Evermark => ({
        id: row.id,
        title: row.title,
        author: row.author,
        description: row.description || row.metadata?.originalMetadata?.description,
        sourceUrl: row.metadata?.originalMetadata?.external_url,
        image: ImageResolver.resolveImageUrl(row),
        metadataURI: row.metadata?.tokenURI || '',
        creator: row.metadata?.creator || row.author,
        creationTime: TimestampUtils.extractCreationTime(row), // ✅ FIXED
        verified: row.verified
      }));

      setEvermarks(convertedEvermarks);
    } catch (err) {
      console.error('Recent evermarks error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recent evermarks');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

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