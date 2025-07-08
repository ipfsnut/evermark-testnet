// src/hooks/useLeaderboard.ts - ✅ SIMPLIFIED using core infrastructure
import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useContracts } from './core/useContracts';
import { useMetadataUtils } from './core/useMetadataUtils';
import { useTransactionUtils } from './core/useTransactionUtils';
import { LEADERBOARD_ABI, CONTRACTS } from "../lib/contracts";

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

export function useLeaderboard(weekNumber?: number) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ Use core infrastructure
  const { voting, leaderboard, evermarkNFT } = useContracts();
  const { fetchEvermarkData } = useMetadataUtils();
  
  // Get current cycle from voting contract
  const { data: currentCycle, isLoading: isLoadingCycle } = useReadContract({
    contract: voting,
    method: "function getCurrentCycle() view returns (uint256)",
    params: [],
  });
  
  // Use the provided week or current cycle
  const targetWeek = weekNumber || (currentCycle ? Number(currentCycle) : 1);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchLeaderboard = async () => {
      if (isLoadingCycle || !targetWeek) {
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`🔍 Fetching leaderboard for week ${targetWeek}...`);
        
        // ✅ Try the correct leaderboard methods first
        let leaderboardData;
        try {
          // Method 1: Try getting from LiveLeaderboard contract
          leaderboardData = await readContract({
            contract: leaderboard,
            method: "function getLeaderboard(uint256,uint256,uint256) view returns (tuple[])",
            params: [BigInt(targetWeek), BigInt(1), BigInt(10)], // cycle, startRank, count
          });
          console.log("✅ Found leaderboard data from LiveLeaderboard:", leaderboardData);
        } catch (leaderboardError) {
          console.log("⚠️ LiveLeaderboard not available, trying voting contract...");
          
          try {
            // Method 2: Try getting from Voting contract using correct method
            leaderboardData = await readContract({
              contract: voting,
              method: "function getLeaderboard(uint256) view returns (tuple[])",
              params: [BigInt(targetWeek)],
            });
            console.log("✅ Found leaderboard data from Voting contract:", leaderboardData);
          } catch (votingError) {
            console.log("⚠️ No finalized leaderboard data, building from active evermarks...");
            
            // Method 3: Get active evermarks and build leaderboard
            const activeEvermarksData = await readContract({
              contract: voting,
              method: "function getActiveEvermarksInCycle(uint256) view returns (uint256[],uint256[])",
              params: [BigInt(targetWeek)],
            });
            
            console.log("📋 Active evermarks result:", activeEvermarksData);
            
            if (!activeEvermarksData || !activeEvermarksData[0] || activeEvermarksData[0].length === 0) {
              console.log("📭 No active evermarks found for cycle", targetWeek);
              if (isMounted) {
                setEntries([]);
                setIsLoading(false);
              }
              return;
            }
            
            const [evermarkIds, votes] = activeEvermarksData;
            
            // Build leaderboard from active evermarks
            leaderboardData = evermarkIds.map((id: bigint, index: number) => ({
              evermarkId: id,
              votes: votes[index],
              rank: index + 1,
            }))
            .sort((a: any, b: any) => Number(b.votes - a.votes)) // Sort by votes descending
            .slice(0, 10); // Top 10
            
            console.log("📈 Built leaderboard from active evermarks:", leaderboardData.length, "entries");
          }
        }
        
        if (!leaderboardData || leaderboardData.length === 0) {
          console.log("📭 No leaderboard data found for week", targetWeek);
          if (isMounted) {
            setEntries([]);
            setIsLoading(false);
          }
          return;
        }
        
        // ✅ Get complete Evermark metadata using core utility
        console.log("🎨 Enhancing", leaderboardData.length, "entries with complete metadata...");
        const enhancedEntries = await Promise.all(
          leaderboardData.map(async (item: any, index: number) => {
            try {
              // Handle different data structures
              const evermarkId = item.evermarkId || item.tokenId || item.evermarkId;
              const votes = item.votes || BigInt(0);
              const rank = item.rank || index + 1;
              
              console.log("🔍 Processing evermark:", evermarkId.toString());
              
              // ✅ Use core utility for fetching complete data
              const evermarkData = await fetchEvermarkData(evermarkId);
              
              if (!evermarkData) {
                console.log(`⚠️ Evermark ${evermarkId} not found`);
                return null;
              }
              
              console.log(`✅ Enhanced evermark ${evermarkId}:`, { 
                title: evermarkData.title, 
                author: evermarkData.author, 
                creator: evermarkData.creator,
                hasDescription: !!evermarkData.description, 
                hasImage: !!evermarkData.image,
                votes: votes.toString()
              });
              
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
                votes: votes,
                rank: Number(rank),
              };
            } catch (err) {
              console.error(`❌ Error fetching metadata for token ${item.evermarkId || item.tokenId}:`, err);
              // Return basic entry even if metadata fails
              return {
                evermark: {
                  id: (item.evermarkId || item.tokenId).toString(),
                  title: `Evermark #${item.evermarkId || item.tokenId}`,
                  author: "Unknown",
                  creator: "0x0",
                  description: "",
                  sourceUrl: "",
                  image: "",
                  metadataURI: "",
                  creationTime: Date.now(),
                },
                votes: item.votes || BigInt(0),
                rank: item.rank || 1,
              };
            }
          })
        );
        
        // Filter out nulls and set entries
        const validEntries = enhancedEntries.filter(entry => entry !== null);
        console.log(`🎉 Final leaderboard: ${validEntries.length} valid entries`);
        
        if (isMounted) {
          setEntries(validEntries);
          setIsLoading(false);
        }
        
      } catch (err: any) {
        console.error("❌ Leaderboard fetch error:", err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setError(errorMessage);
          setIsLoading(false);
        }
      }
    };
    
    fetchLeaderboard();
    
    return () => {
      isMounted = false;
    };
  }, [targetWeek, isLoadingCycle, voting, leaderboard, fetchEvermarkData]);
  
  // Check if leaderboard is finalized
  const isFinalized = useMemo(() => {
    // For current week, assume it's not finalized
    // For previous weeks, check if they're finalized
    return targetWeek < (currentCycle ? Number(currentCycle) : 1);
  }, [targetWeek, currentCycle]);
  
  return {
    entries,
    isLoading,
    error,
    isFinalized,
    weekNumber: targetWeek,
  };
}

// Hook for leaderboard management (admin functions)
export function useLeaderboardManagement() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // ✅ Use core infrastructure properly
  const { executeTransaction } = useTransactionUtils();
  
  // ✅ FIXED: Use contract address and imported ABI
  const updateLeaderboard = useCallback(async (cycle: number, evermarkId: number) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await executeTransaction(
        CONTRACTS.LEADERBOARD,
        LEADERBOARD_ABI,
        "updateEvermarkInLeaderboard",
        [BigInt(cycle), BigInt(evermarkId)]
      );
      
      if (result.success) {
        const successMsg = `Successfully updated leaderboard for Evermark ${evermarkId} in cycle ${cycle}`;
        setSuccess(successMsg);
        return { success: true, message: successMsg };
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (err: any) {
      console.error("Error updating leaderboard:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to update leaderboard";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [executeTransaction]);
  
  const batchUpdateLeaderboard = useCallback(async (cycle: number, evermarkIds: number[]) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await executeTransaction(
        CONTRACTS.LEADERBOARD,
        LEADERBOARD_ABI,
        "batchUpdateLeaderboard",
        [BigInt(cycle), evermarkIds.map(id => BigInt(id))]
      );
      
      if (result.success) {
        const successMsg = `Successfully batch updated leaderboard for ${evermarkIds.length} evermarks in cycle ${cycle}`;
        setSuccess(successMsg);
        return { success: true, message: successMsg };
      } else {
        throw new Error(result.error || 'Batch update failed');
      }
    } catch (err: any) {
      console.error("Error batch updating leaderboard:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to batch update leaderboard";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [executeTransaction]);
  
  return {
    updateLeaderboard,
    batchUpdateLeaderboard,
    isProcessing,
    error,
    success,
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    }
  };
}