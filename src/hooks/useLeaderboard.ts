import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, readContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, LEADERBOARD_ABI, VOTING_ABI, EVERMARK_NFT_ABI } from "../lib/contracts";
import { useState, useEffect, useMemo, useCallback } from "react";

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

// Helper function to fetch IPFS metadata
const fetchIPFSMetadata = async (metadataURI: string) => {
  const defaultReturn = { description: "", sourceUrl: "", image: "" };
  
  if (!metadataURI || !metadataURI.startsWith('ipfs://')) {
    return defaultReturn;
  }

  try {
    const ipfsHash = metadataURI.replace('ipfs://', '');
    if (ipfsHash.length < 40) {
      return defaultReturn;
    }
    
    const ipfsGatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(ipfsGatewayUrl, { 
      signal: controller.signal,
      cache: 'force-cache',
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return defaultReturn;
    }
    
    const ipfsData = await response.json();
    
    return {
      description: ipfsData.description || "",
      sourceUrl: ipfsData.external_url || "",
      image: ipfsData.image 
        ? ipfsData.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') 
        : ""
    };
  } catch (error) {
    return defaultReturn;
  }
};

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
        
        // STRATEGY 1: Try to get finalized leaderboard data first
        let leaderboardData;
        try {
          leaderboardData = await readContract({
            contract: leaderboardContract,
            method: "getWeeklyTopEvermarks", // FIXED: Use redeployed contract method name
            params: [BigInt(targetWeek), BigInt(10)], // Get top 10
          });
          console.log("Found finalized leaderboard data:", leaderboardData);
        } catch (leaderboardError) {
          console.log("No finalized leaderboard data, building from live voting data...");
          
          // STRATEGY 2: Fallback - Build leaderboard from current voting data
          try {
            const bookmarksWithVotes = await readContract({
              contract: votingContract,
              method: "getEvermarksWithVotesInCycle", // FIXED: Use redeployed contract method name
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
                    method: "getEvermarkVotesInCycle", // FIXED: Use redeployed contract method name
                    params: [BigInt(targetWeek), bookmarkId],
                  });
                  
                  return {
                    tokenId: bookmarkId,
                    votes: votes,
                    rank: BigInt(0),
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
        
        // ENHANCED: Get complete Evermark metadata
        console.log("Enhancing with complete metadata...");
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
              
              // Get metadata using correct deployed contract method names
              const [title, author, metadataURI] = await readContract({
                contract: evermarkContract,
                method: "getEvermarkMetadata", // FIXED: Use redeployed contract method name
                params: [bookmark.tokenId],
              });
              
              // Get creator address
              const creator = await readContract({
                contract: evermarkContract,
                method: "getEvermarkCreator", // FIXED: Use redeployed contract method name
                params: [bookmark.tokenId],
              });
              
              // Get creation time
              const creationTime = await readContract({
                contract: evermarkContract,
                method: "getEvermarkCreationTime", // FIXED: Use redeployed contract method name
                params: [bookmark.tokenId],
              });
              
              // ENHANCED: Fetch IPFS metadata for description, image, etc.
              const { description, sourceUrl, image } = await fetchIPFSMetadata(metadataURI);
              
              console.log(`Enhanced bookmark ${bookmark.tokenId}:`, { 
                title, author, creator, description: description ? 'present' : 'missing',
                image: image ? 'present' : 'missing'
              });
              
              return {
                evermark: {
                  id: bookmark.tokenId.toString(),
                  title: title || `Evermark #${bookmark.tokenId}`,
                  author: author || "Unknown",
                  creator: creator,
                  description,
                  sourceUrl,
                  image,
                  metadataURI,
                  creationTime: Number(creationTime) * 1000, // Convert to milliseconds
                },
                votes: bookmark.votes,
                rank: Number(bookmark.rank),
              };
            } catch (err) {
              console.error(`Error fetching metadata for token ${bookmark.tokenId}:`, err);
              // Return basic entry even if metadata fails
              return {
                evermark: {
                  id: bookmark.tokenId.toString(),
                  title: `Evermark #${bookmark.tokenId}`,
                  author: "Unknown",
                  creator: "0x0",
                  description: "",
                  sourceUrl: "",
                  image: "",
                  metadataURI: "",
                  creationTime: Date.now(),
                },
                votes: bookmark.votes,
                rank: Number(bookmark.rank),
              };
            }
          })
        );
        
        // Filter out nulls and set entries
        const validEntries = enhancedEntries.filter(entry => entry !== null);
        console.log(`Final leaderboard entries with complete data:`, validEntries.length);
        
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
  
  const leaderboardContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.LEADERBOARD,
    abi: LEADERBOARD_ABI,
  }), []);
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Function to finalize weekly leaderboard (admin only)
  const finalizeWeeklyLeaderboard = useCallback(async (weekNumber: number) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: leaderboardContract,
        method: "finalizeWeeklyLeaderboard",
        params: [BigInt(weekNumber)],
      });
      
      await sendTransaction(transaction as any);
      
      const successMsg = `Successfully finalized leaderboard for week ${weekNumber}`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error finalizing leaderboard:", err);
      const errorMsg = err.message || "Failed to finalize leaderboard";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [leaderboardContract, sendTransaction]);
  
  return {
    finalizeWeeklyLeaderboard,
    isProcessing,
    error,
    success,
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    }
  };
}