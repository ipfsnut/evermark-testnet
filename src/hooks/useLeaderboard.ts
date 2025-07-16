// ===================================================================
// src/hooks/useLeaderboard.ts - FIXED VERSION  
// FIXES: Correct imports, verify function existence, proper types
// ===================================================================

import { useCallback } from 'react';
import { useSupabaseLeaderboard, useTopVotedEvermarks } from './useSupabaseLeaderboard';

// Re-export the interface for compatibility
export type { LeaderboardEntry } from './useSupabaseLeaderboard';

export function useLeaderboard(weekNumber?: number, limit = 10) {
  const {
    entries,
    isLoading,
    error,
    currentCycle,
    targetCycle,
    refresh
  } = useSupabaseLeaderboard({
    cycleId: weekNumber,
    limit,
    enableBlockchainFallback: true
  });

  const refreshWithCacheCoordination = useCallback(() => {
    console.log("🔄 Refreshing leaderboard with cache coordination");
    refresh();
  }, [refresh]);

  return {
    entries,
    isLoading,
    error,
    currentCycle,
    targetCycle,
    weekNumber: targetCycle,
    isFinalized: false,
    refresh: refreshWithCacheCoordination,
    refetch: refreshWithCacheCoordination
  };
}

export function useTopVoted(limit = 5) {
  return useTopVotedEvermarks(limit);
}

export function useCurrentLeaderboard(limit = 10) {
  return useLeaderboard(undefined, limit);
}

export function useCycleLeaderboard(cycleId: number, limit = 10) {
  return useLeaderboard(cycleId, limit);
}

export function useLeaderboardData(weekNumber?: number) {
  return useLeaderboard(weekNumber);
}

export function useWeeklyLeaderboard(weekNumber: number) {
  return useLeaderboard(weekNumber);
}