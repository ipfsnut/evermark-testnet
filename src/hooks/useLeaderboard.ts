import { useSupabaseLeaderboard, useTopVotedEvermarks } from './useSupabaseLeaderboard';

// Re-export the interface for compatibility
export type { LeaderboardEntry } from './useSupabaseLeaderboard';

/**
 * Main leaderboard hook - now uses enhanced Supabase-first approach
 * with image processing awareness for dramatically improved performance
 */
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

  return {
    entries,
    isLoading,
    error,
    currentCycle,
    targetCycle,
    weekNumber: targetCycle,
    isFinalized: false, // Add missing property for compatibility
    refresh,
    refetch: refresh
  };
}

/**
 * Hook for getting top voted evermarks with enhanced image processing
 */
export function useTopVoted(limit = 5) {
  return useTopVotedEvermarks(limit);
}

/**
 * Hook for current cycle leaderboard
 */
export function useCurrentLeaderboard(limit = 10) {
  return useLeaderboard(undefined, limit);
}

/**
 * Hook for specific cycle leaderboard
 */
export function useCycleLeaderboard(cycleId: number, limit = 10) {
  return useLeaderboard(cycleId, limit);
}

// Legacy compatibility exports
export function useLeaderboardData(weekNumber?: number) {
  return useLeaderboard(weekNumber);
}

export function useWeeklyLeaderboard(weekNumber: number) {
  return useLeaderboard(weekNumber);
}
