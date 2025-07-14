// src/hooks/useEvermarks.ts - FIXED VERSION with better error handling
import { useState, useEffect, useCallback } from 'react';

interface EvermarkData {
  id: string;
  name: string;
  title: string;
  description: string;
  content: string;
  image?: string;
  external_url?: string;
  author: string;
  creator: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
  creationTime: number;
  tx_hash?: string;
  block_number?: number;
  metadataURI?: string;
  evermark_type: string;
  source_platform: string;
  sourceUrl?: string;
  voting_power: number;
  view_count: number;
  tags: string[];
  category?: string;
  metadata: any;
}

interface UseEvermarkDetailResult {
  evermark: EvermarkData | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useEvermarkDetail(id?: string): UseEvermarkDetailResult {
  const [evermark, setEvermark] = useState<EvermarkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchEvermark = useCallback(async (evermarkId: string, attempt: number = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔍 Fetching Evermark ${evermarkId}, attempt ${attempt + 1}`);
      
      // 🔧 FIXED: Use the correct API endpoint path
      const response = await fetch(`/.netlify/functions/evermarks?id=${encodeURIComponent(evermarkId)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          throw new Error(errorData.message || 'Evermark not found');
        }
        
        if (response.status >= 500) {
          throw new Error(errorData.message || 'Server error - please try again');
        }
        
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Evermark data fetched:', data);
      
      // 🔧 FIXED: Validate the response structure
      if (!data || !data.id) {
        throw new Error('Invalid response format from server');
      }
      
      setEvermark(data);
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      console.error('❌ Error fetching Evermark:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // 🔧 FIXED: Retry logic for network errors (but not 404s)
      const maxRetries = 3;
      const shouldRetry = attempt < maxRetries && 
                         !errorMessage.includes('not found') && 
                         !errorMessage.includes('404');
      
      if (shouldRetry) {
        console.log(`🔄 Retrying in 2 seconds... (${attempt + 1}/${maxRetries})`);
        setTimeout(() => {
          setRetryCount(attempt + 1);
        }, 2000);
        return; // Don't set loading to false yet
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    if (id) {
      setRetryCount(0);
      fetchEvermark(id, 0);
    }
  }, [id, fetchEvermark]);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setError('No Evermark ID provided');
      setEvermark(null);
      return;
    }

    fetchEvermark(id, retryCount);
  }, [id, retryCount, fetchEvermark]);

  return {
    evermark,
    isLoading,
    error,
    retry
  };
}

// 🔧 NEW: Additional hook for listing evermarks
export function useEvermarksList(filters?: {
  author?: string;
  category?: string;
  limit?: number;
}) {
  const [evermarks, setEvermarks] = useState<EvermarkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvermarks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (filters?.author) params.set('author', filters.author);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.limit) params.set('limit', filters.limit.toString());
        
        const queryString = params.toString();
        const url = `/.netlify/functions/evermarks${queryString ? `?${queryString}` : ''}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch evermarks: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle both single evermark and array responses
        const evermarksList = Array.isArray(data) ? data : [data];
        setEvermarks(evermarksList);
        
      } catch (err) {
        console.error('❌ Error fetching evermarks list:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setEvermarks([]); // Reset to empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvermarks();
  }, [filters?.author, filters?.category, filters?.limit]);

  return {
    evermarks,
    isLoading,
    error
  };
}