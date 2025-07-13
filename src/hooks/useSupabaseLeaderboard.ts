// src/hooks/useSupabaseLeaderboard.ts - Fast Supabase-first leaderboard with blockchain fallback
import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../lib/supabase';
import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { useContracts } from './core/useContracts';
import { useMetadataUtils } from './core/useMetadataUtils';

export interface LeaderboardEntry {
  evermark: {
    id: string;
    title: string;
    author: string;
    creator: string;
    description?: string;
    sourceUrl?: string;
    image?: string;
    metadataURI: string;
    creationTime: number;
  };
  votes: bigint;
  rank: number;
}

interface UseSupabaseLeaderboardOptions {
  cycleId?: number;
  limit?: number;
  enableBlockchainFallback?: boolean;
}

export function useSupabaseLeaderboard(options: UseSupabaseLeaderboardOptions = {}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCycle, setCurrentCycle] = useState<number | null>(null);

  const { voting, leaderboard } = useContracts();
  const { fetchEvermarkData } = useMetadataUtils();

  const {
    cycleId,
    limit = 10,
    enableBlockchainFallback = true
  } = options;

  // Get current cycle from voting contract
  const { data: currentCycleData, isLoading: isLoadingCycle } = useReadContract({
    contract: voting,
    method: "function getCurrentCycle() view returns (uint256)",
    params: [],
  });

  useEffect(() => {
    if (currentCycleData) {
      setCurrentCycle(Number(currentCycleData));
    }
  }, [currentCycleData]);

  // Use provided cycleId or current cycle
  const targetCycle = cycleId || currentCycle;

  // Fetch leaderboard from Supabase first, then blockchain fallback
  const fetchLeaderboard = useCallback(async () => {
    if (isLoadingCycle || !targetCycle) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Fetching leaderboard from Supabase...');
      const startTime = performance.now();

      // Primary: Try Supabase first
      const supabaseLeaderboard = await SupabaseService.getLeaderboard(targetCycle, limit);

      const fetchTime = performance.now() - startTime;
      console.log(`⚡ Supabase leaderboard fetch completed in ${fetchTime.toFixed(2)}ms`);

      if (supabaseLeaderboard && supabaseLeaderboard.length > 0) {
        // Success with Supabase data
        setEntries(supabaseLeaderboard);
        setIsLoading(false);
        return;
      }

      // Fallback: If no Supabase data and fallback enabled, try blockchain
      if (enableBlockchainFallback) {
        console.log('⚠️ No Supabase leaderboard data found, falling back to blockchain...');
        await fetchFromBlockchain();
      } else {
        // No data and no fallback
        setEntries([]);
        setIsLoading(false);
      }

    } catch (err) {
      console.error('Supabase leaderboard fetch error:', err);
      
      if (enableBlockchainFallback) {
        console.log('⚠️ Supabase error, falling back to blockchain...');
        await fetchFromBlockchain();
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
        setIsLoading(false);
      }
    }
  }, [targetCycle, limit, enableBlockchainFallback, isLoadingCycle]);

  // Blockchain fallback function
  const fetchFromBlockchain = useCallback(async () => {
    if (!targetCycle) return;

    try {
      console.log(`🔗 Fetching leaderboard from blockchain for cycle ${targetCycle}...`);
      const blockchainStartTime = performance.now();

      let leaderboardData: any = null;

      // Try multiple methods to get leaderboard data
      try {
        // Method 1: Try getting from LiveLeaderboard contract
        leaderboardData = await readContract({
          contract: leaderboard,
          method: "function getLeaderboard(uint256,uint256,uint256) view returns (tuple[])",
          params: [BigInt(targetCycle), BigInt(1), BigInt(limit)],
        });
        console.log("✅ Found leaderboard data from LiveLeaderboard contract");
      } catch (leaderboardError) {
        console.log("⚠️ LiveLeaderboard not available, trying voting contract...");
        
        try {
          // Method 2: Try getting from Voting contract
          leaderboardData = await readContract({
            contract: voting,
            method: "function getLeaderboard(uint256) view returns (tuple[])",
            params: [BigInt(targetCycle)],
          });
          console.log("✅ Found leaderboard data from Voting contract");
        } catch (votingError) {
          console.log("⚠️ Voting contract getLeaderboard failed, trying getActiveEvermarksInCycle...");
          
          try {
            // Method 3: Get active evermarks and build leaderboard
            const activeEvermarks = await readContract({
              contract: voting,
              method: "function getActiveEvermarksInCycle(uint256) view returns (uint256[])",
              params: [BigInt(targetCycle)],
            });

            if (activeEvermarks && activeEvermarks.length > 0) {
              // Get vote counts for each evermark
              const leaderboardPromises = activeEvermarks.slice(0, limit).map(async (tokenId: bigint, index: number) => {
                try {
                  const votes = await readContract({
                    contract: voting,
                    method: "function getVotes(uint256,uint256) view returns (uint256)",
                    params: [BigInt(targetCycle), tokenId],
                  });

                  return {
                    tokenId,
                    votes,
                    rank: index + 1
                  };
                } catch (error) {
                  console.warn(`Failed to get votes for token ${tokenId}:`, error);
                  return null;
                }
              });

              const leaderboardResults = await Promise.all(leaderboardPromises);
              
              // Convert to expected format
              leaderboardData = leaderboardResults
                .filter(result => result !== null)
                .sort((a, b) => Number(b!.votes) - Number(a!.votes))
                .map((result, index) => ({
                  tokenId: result!.tokenId,
                  votes: result!.votes,
                  rank: index + 1
                }));

              console.log("✅ Built leaderboard from active evermarks");
            }
          } catch (activeError) {
            console.warn("All leaderboard methods failed:", activeError);
            throw new Error("Unable to fetch leaderboard data from blockchain");
          }
        }
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        setEntries([]);
        setIsLoading(false);
        return;
      }

      // Fetch evermark metadata for each leaderboard entry
      const entriesPromises = leaderboardData.map(async (entry: any, index: number) => {
        try {
          const tokenId = entry.tokenId || entry[0] || BigInt(index + 1);
          const votes = entry.votes || entry[1] || BigInt(0);
          
          const evermarkData = await fetchEvermarkData(tokenId);
          
          if (!evermarkData) {
            console.warn(`No data found for token ${tokenId}`);
            return null;
          }

          return {
            evermark: {
              id: evermarkData.id,
              title: evermarkData.title,
              author: evermarkData.author,
              creator: evermarkData.creator,
              description: evermarkData.description,
              sourceUrl: evermarkData.sourceUrl,
              image: evermarkData.image,
              metadataURI: evermarkData.metadataURI,
              creationTime: evermarkData.creationTime,
            },
            votes: typeof votes === 'bigint' ? votes : BigInt(votes || 0),
            rank: index + 1
          };
        } catch (error) {
          console.warn(`Failed to fetch evermark data for leaderboard entry:`, error);
          return null;
        }
      });

      const fetchedEntries = await Promise.all(entriesPromises);
      
      const validEntries = fetchedEntries
        .filter(entry => entry !== null) as LeaderboardEntry[];

      // Sort by votes (descending) and update ranks
      const sortedEntries = validEntries
        .sort((a, b) => Number(b.votes) - Number(a.votes))
        .map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));

      const blockchainFetchTime = performance.now() - blockchainStartTime;
      console.log(`🔗 Blockchain leaderboard fetch completed in ${blockchainFetchTime.toFixed(2)}ms`);

      setEntries(sortedEntries);
      setIsLoading(false);

    } catch (err) {
      console.error('Blockchain leaderboard fallback error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard from blockchain');
      setIsLoading(false);
    }
  }, [targetCycle, limit, voting, leaderboard, fetchEvermarkData]);

  // Refresh function
  const refresh = useCallback(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Fetch when target cycle is available
  useEffect(() => {
    if (targetCycle) {
      fetchLeaderboard();
    }
  }, [targetCycle, fetchLeaderboard]);

  return {
    entries,
    isLoading,
    error,
    currentCycle,
    targetCycle,
    refresh
  };
}

// Hook for getting top voted evermarks (simplified)
export function useTopVotedEvermarks(limit = 5) {
  const [evermarks, setEvermarks] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopVoted = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const leaderboard = await SupabaseService.getLeaderboard(undefined, limit);
      setEvermarks(leaderboard);
    } catch (err) {
      console.error('Top voted evermarks error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch top voted evermarks');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTopVoted();
  }, [fetchTopVoted]);

  return {
    evermarks,
    isLoading,
    error,
    refresh: fetchTopVoted
  };
}
