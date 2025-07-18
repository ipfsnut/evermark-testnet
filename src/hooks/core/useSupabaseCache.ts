
import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface CacheEntry {
  id?: string;
  key: string;
  data: any;
  expires_at: string;
  contract_address?: string;
  user_address?: string;
  method_name?: string;
  block_number?: number;
  created_at?: string;
  updated_at?: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 5 minutes)
  forceRefresh?: boolean;
  blockSensitive?: boolean; // Whether this data depends on block number
  userSpecific?: boolean; // Whether this data is user-specific
}

// NEW: Metadata structure validation
interface SupabaseEvermarkMetadata {
  source: string;
  tokenId: number;
  syncedAt: string;
  tokenURI: string;
  originalMetadata: {
    name: string;
    image: string;  // Key: This is the IPFS image URI to process
    description: string;
    external_url: string;
    attributes: Array<{ trait_type: string; value: string; }>;
  };
}

/**
 * Enhanced Supabase caching layer for blockchain data with metadata validation
 */
export function useSupabaseCache() {
  
  /**
   * Generate a cache key for blockchain data
   */
  const generateCacheKey = useCallback((
    contractAddress: string,
    method: string,
    params: any[],
    userAddress?: string
  ): string => {
    const paramStr = JSON.stringify(params);
    const baseKey = `${contractAddress}:${method}:${paramStr}`;
    return userAddress ? `user:${userAddress}:${baseKey}` : baseKey;
  }, []);

  /**
   * Get cached data from Supabase
   */
  const getCachedData = useCallback(async <T>(
    cacheKey: string,
    options: CacheOptions = {}
  ): Promise<T | null> => {
    try {
      if (options.forceRefresh) {
        return null;
      }

      const { data, error } = await supabase
        .from('blockchain_cache')
        .select('*')
        .eq('key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      // For block-sensitive data, check if we need fresher data
      if (options.blockSensitive && data.block_number) {
        const currentTime = Date.now();
        const cacheTime = new Date(data.created_at!).getTime();
        const ageMinutes = (currentTime - cacheTime) / (1000 * 60);
        
        // If cache is older than 2 minutes for block-sensitive data, refresh
        if (ageMinutes > 2) {
          return null;
        }
      }

      console.log(`🎯 Cache HIT for ${cacheKey}`);
      return data.data as T;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }, []);

  /**
   * Set cached data in Supabase
   */
  const setCachedData = useCallback(async (
    cacheKey: string,
    data: any,
    options: CacheOptions = {}
  ): Promise<void> => {
    try {
      const ttl = options.ttl || 300; // Default 5 minutes
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

      const cacheEntry: Partial<CacheEntry> = {
        key: cacheKey,
        data,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Extract metadata from cache key for better querying
      if (cacheKey.includes(':')) {
        const parts = cacheKey.split(':');
        if (parts[0] === 'user' && parts.length > 3) {
          cacheEntry.user_address = parts[1];
          cacheEntry.contract_address = parts[2];
          cacheEntry.method_name = parts[3];
        } else if (parts.length >= 2) {
          cacheEntry.contract_address = parts[0];
          cacheEntry.method_name = parts[1];
        }
      }

      // Upsert the cache entry
      const { error } = await supabase
        .from('blockchain_cache')
        .upsert(cacheEntry, { 
          onConflict: 'key',
          ignoreDuplicates: false 
        });

      if (error) {
        console.warn('Cache write error:', error);
      } else {
        console.log(`💾 Cache SET for ${cacheKey}`);
      }
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }, []);

  // NEW: Metadata validation functions
  /**
   * Validate Evermark metadata structure
   */
  const validateMetadataStructure = useCallback((metadata: any): {
    isValid: boolean;
    hasOriginalMetadata: boolean;
    hasImage: boolean;
    hasValidImageUri: boolean;
    issues: string[];
  } => {
    const issues: string[] = [];
    
    const hasOriginalMetadata = !!metadata?.originalMetadata;
    if (!hasOriginalMetadata) {
      issues.push('Missing originalMetadata');
    }

    const hasImage = !!metadata?.originalMetadata?.image;
    if (!hasImage) {
      issues.push('Missing image in originalMetadata');
    }

    const hasValidImageUri = metadata?.originalMetadata?.image?.startsWith('ipfs://');
    if (hasImage && !hasValidImageUri) {
      issues.push('Image URI is not a valid IPFS URI');
    }

    return {
      isValid: hasOriginalMetadata && hasImage && hasValidImageUri,
      hasOriginalMetadata,
      hasImage,
      hasValidImageUri,
      issues
    };
  }, []);

  /**
   * Extract image URI from metadata structure
   */
  const extractImageUri = useCallback((metadata: any): string | null => {
    const validation = validateMetadataStructure(metadata);
    if (!validation.hasValidImageUri) {
      return null;
    }
    return metadata.originalMetadata.image;
  }, [validateMetadataStructure]);

  /**
   * Convert IPFS URI to gateway URL
   */
  const convertIpfsToGateway = useCallback((ipfsUri: string, gatewayUrl = 'https://gateway.pinata.cloud/ipfs/'): string => {
    if (!ipfsUri || !ipfsUri.startsWith('ipfs://')) {
      return ipfsUri;
    }
    
    const hash = ipfsUri.replace('ipfs://', '');
    return `${gatewayUrl}${hash}`;
  }, []);

  /**
   * Invalidate cache entries by pattern
   */
  const invalidateCache = useCallback(async (
    pattern: {
      contractAddress?: string;
      userAddress?: string;
      methodName?: string;
    }
  ): Promise<void> => {
    try {
      let query = supabase.from('blockchain_cache').delete();

      if (pattern.contractAddress) {
        query = query.eq('contract_address', pattern.contractAddress);
      }
      if (pattern.userAddress) {
        query = query.eq('user_address', pattern.userAddress);
      }
      if (pattern.methodName) {
        query = query.eq('method_name', pattern.methodName);
      }

      const { error } = await query;
      
      if (error) {
        console.warn('Cache invalidation error:', error);
      } else {
        console.log('🗑️ Cache invalidated for pattern:', pattern);
      }
    } catch (error) {
      console.warn('Cache invalidation error:', error);
    }
  }, []);

  /**
   * Clear expired cache entries
   */
  const clearExpiredCache = useCallback(async (): Promise<void> => {
    try {
      const { error } = await supabase
        .from('blockchain_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.warn('Cache cleanup error:', error);
      } else {
        console.log('🧹 Expired cache entries cleared');
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(async () => {
    try {
      const { count: totalEntries } = await supabase
        .from('blockchain_cache')
        .select('*', { count: 'exact', head: true });

      const { count: expiredEntries } = await supabase
        .from('blockchain_cache')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());

      return {
        totalEntries: totalEntries || 0,
        activeEntries: (totalEntries || 0) - (expiredEntries || 0),
        expiredEntries: expiredEntries || 0,
      };
    } catch (error) {
      console.warn('Cache stats error:', error);
      return { totalEntries: 0, activeEntries: 0, expiredEntries: 0 };
    }
  }, []);

  return {
    generateCacheKey,
    getCachedData,
    setCachedData,
    invalidateCache,
    clearExpiredCache,
    getCacheStats,
    
    // NEW: Metadata validation functions
    validateMetadataStructure,
    extractImageUri,
    convertIpfsToGateway,
  };
}
