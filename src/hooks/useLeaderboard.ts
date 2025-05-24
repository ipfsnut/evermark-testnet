// src/hooks/useLeaderboard.ts - FIXED VERSION - DEPLOY THIS NOW
import { useReadContract } from "thirdweb/react";
import { getContract, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, LEADERBOARD_ABI, VOTING_ABI, EVERMARK_NFT_ABI } from "../lib/contracts";
import { useState, useEffect, useMemo } from "react";
import { toEther } from "thirdweb/utils";

export interface LeaderboardEntry {
  evermark: {
    id: string;
    title: string;
    author: string;
    creator: string;
  };
  votes: bigint;
  rank: number;
}

export function useLeaderboard(weekNumber?: number) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create contracts with useMemo to prevent recreation
  const votingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.VOTING,
    abi: VOTING_ABI,
  }), []);
  
  const leaderboardContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.LEADERBOARD,
    abi: LEADERBOARD_ABI,
  }), []);
  
  const evermarkContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EVERMARK_NFT,
    abi: EVERMARK_NFT_ABI,
  }), []);
  
  // Get current cycle from voting contract
  const { data: currentCycle, isLoading: isLoadingCycle } = useReadContract({
    contract: votingContract,
    method: "getCurrentCycle",
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
        
        console.log(`Fetching leaderboard for week ${targetWeek}...`);
        
        // First, try to get finalized leaderboard data
        let leaderboardData;
        try {
          leaderboardData = await readContract({
            contract: leaderboardContract,
            method: "getWeeklyTopBookmarks",
            params: [BigInt(targetWeek), BigInt(10)], // Get top 10
          });
          console.log("Found finalized leaderboard data:", leaderboardData);
        } catch (leaderboardError) {
          console.log("No finalized leaderboard data, building from live voting data...");
          
          // Fallback: Build leaderboard from current voting data
          try {
            // Get all bookmarks with votes in the current cycle
            const bookmarksWithVotes = await readContract({
              contract: votingContract,
              method: "getBookmarksWithVotesInCycle",
              params: [BigInt(targetWeek)],
            });
            
            console.log("Bookmarks with votes:", bookmarksWithVotes);
            
            if (!bookmarksWithVotes || bookmarksWithVotes.length === 0) {
              console.log("No bookmarks with votes found");
              if (isMounted) {
                setEntries([]);
                setIsLoading(false);
              }
              return;
            }
            
            // Get vote counts for each bookmark
            const bookmarkVoteData = await Promise.all(
              bookmarksWithVotes.map(async (bookmarkId: bigint) => {
                try {
                  const votes = await readContract({
                    contract: votingContract,
                    method: "getBookmarkVotesInCycle",
                    params: [BigInt(targetWeek), bookmarkId],
                  });
                  
                  console.log(`Bookmark ${bookmarkId} has ${votes} votes`);
                  
                  return {
                    tokenId: bookmarkId,
                    votes: votes,
                    rank: BigInt(0), // Will be set after sorting
                  };
                } catch (err) {
                  console.error(`Error fetching votes for bookmark ${bookmarkId}:`, err);
                  return null;
                }
              })
            );
            
            // Filter out failed requests and sort by votes
            leaderboardData = bookmarkVoteData
              .filter(data => data !== null)
              .sort((a, b) => Number(b.votes - a.votes))
              .slice(0, 10) // Top 10
              .map((data, index) => ({
                ...data,
                rank: BigInt(index + 1),
              }));
            
            console.log("Built leaderboard from voting data:", leaderboardData);
          } catch (votingError) {
            console.error("Error fetching voting data:", votingError);
            // If we can't get voting data either, try to show any existing Evermarks
            if (isMounted) {
              setEntries([]);
              setIsLoading(false);
            }
            return;
          }
        }
        
        if (!leaderboardData || leaderboardData.length === 0) {
          console.log("No leaderboard data found");
          if (isMounted) {
            setEntries([]);
            setIsLoading(false);
          }
          return;
        }
        
        // Enhance with Evermark metadata
        console.log("Enhancing with metadata...");
        const enhancedEntries = await Promise.all(
          leaderboardData.map(async (bookmark: any) => {
            try {
              // Check if bookmark exists
              const exists = await readContract({
                contract: evermarkContract,
                method: "exists",
                params: [bookmark.tokenId],
              });
              
              if (!exists) {
                console.log(`Bookmark ${bookmark.tokenId} does not exist`);
                return null;
              }
              
              // Get metadata
              const [title, author] = await readContract({
                contract: evermarkContract,
                method: "getBookmarkMetadata",
                params: [bookmark.tokenId],
              });
              
              // Get creator
              const creator = await readContract({
                contract: evermarkContract,
                method: "getBookmarkCreator",
                params: [bookmark.tokenId],
              });
              
              console.log(`Enhanced bookmark ${bookmark.tokenId}:`, { title, author, creator });
              
              return {
                evermark: {
                  id: bookmark.tokenId.toString(),
                  title: title || `Evermark #${bookmark.tokenId}`,
                  author: author || "Unknown",
                  creator: creator,
                },
                votes: bookmark.votes,
                rank: Number(bookmark.rank),
              };
            } catch (err) {
              console.error(`Error fetching metadata for token ${bookmark.tokenId}:`, err);
              return {
                evermark: {
                  id: bookmark.tokenId.toString(),
                  title: `Evermark #${bookmark.tokenId}`,
                  author: "Unknown",
                  creator: "0x0",
                },
                votes: bookmark.votes,
                rank: Number(bookmark.rank),
              };
            }
          })
        );
        
        // Filter out nulls and set entries
        const validEntries = enhancedEntries.filter(entry => entry !== null);
        console.log("Final leaderboard entries:", validEntries);
        
        if (isMounted) {
          setEntries(validEntries);
          setIsLoading(false);
        }
        
      } catch (err: any) {
        console.error("Error fetching leaderboard:", err);
        if (isMounted) {
          setError(err.message || "Failed to load leaderboard");
          setIsLoading(false);
        }
      }
    };
    
    fetchLeaderboard();
    
    return () => {
      isMounted = false;
    };
  }, [targetWeek, isLoadingCycle, votingContract, leaderboardContract, evermarkContract]);
  
  // Check if leaderboard is finalized
  const isFinalized = useMemo(() => {
    // For now, assume current week is not finalized, previous weeks might be
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