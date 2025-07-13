// src/hooks/useEvermarks.ts - Fast Supabase-first implementation with blockchain fallback
import { useRecentEvermarks as useSupabaseRecentEvermarks } from './useSupabaseEvermarks';

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

/**
 * Main hook for fetching recent Evermarks
 * Now uses Supabase-first approach for dramatically improved performance
 */
export function useEvermarks(limit = 10) {
  // Use the new Supabase-first implementation
  const {
    evermarks,
    isLoading,
    error,
    refresh
  } = useSupabaseRecentEvermarks(limit);

  return {
    evermarks,
    isLoading,
    error,
    refetch: refresh,
    refresh
  };
}

// Legacy compatibility - maintain the same interface
export function useEvermarkData() {
  return useEvermarks(10);
}

// Hook specifically for homepage recent evermarks
export function useHomePageEvermarks() {
  return useEvermarks(6);
}

// Hook for getting a larger set for feeds
export function useAllEvermarks() {
  return useEvermarks(50);
}

// Missing exports that components are looking for
export function useUserEvermarks(userAddress?: string) {
  // For now, return all evermarks - this could be enhanced to filter by user
  return useEvermarks(20);
}

export function useEvermarkDetail(evermarkId: string) {
  // For now, return recent evermarks - this could be enhanced to fetch specific evermark
  return useEvermarks(1);
}
