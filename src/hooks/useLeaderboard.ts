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
        
        console.log(`🔍 Fetching leaderboard for week ${targetWeek}...`);
        
        // ✅ FIXED: Try the correct leaderboard methods first
        let leaderboardData;
        try {
          // ✅ Method 1: Try getting from LiveLeaderboard contract
          leaderboardData = await readContract({
            contract: leaderboardContract,
            method: "getLeaderboard",
            params: [BigInt(targetWeek), BigInt(1), BigInt(10)], // cycle, startRank, count
          });
          console.log("✅ Found leaderboard data from LiveLeaderboard:", leaderboardData);
        } catch (leaderboardError) {
          console.log("⚠️ LiveLeaderboard not available, trying voting contract...");
          
          try {
            // ✅ Method 2: Try getting from Voting contract using correct method
            leaderboardData = await readContract({
              contract: votingContract,
              method: "getLeaderboard",
              params: [BigInt(targetWeek)],
            });
            console.log("✅ Found leaderboard data from Voting contract:", leaderboardData);
          } catch (votingError) {
            console.log("⚠️ No finalized leaderboard data, building from active evermarks...");
            
            // ✅ Method 3: Get active evermarks and build leaderboard
            const activeEvermarksData = await readContract({
              contract: votingContract,
              method: "getActiveEvermarksInCycle",
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
        
        // Get complete Evermark metadata
        console.log("🎨 Enhancing", leaderboardData.length, "entries with complete metadata...");
        const enhancedEntries = await Promise.all(
          leaderboardData.map(async (item: any, index: number) => {
            try {
              // Handle different data structures
              const evermarkId = item.evermarkId || item.tokenId || item.evermarkId;
              const votes = item.votes || BigInt(0);
              const rank = item.rank || index + 1;
              
              console.log("🔍 Processing evermark:", evermarkId.toString());
              
              // Check if evermark exists
              const exists = await readContract({
                contract: evermarkContract,
                method: "exists",
                params: [evermarkId],
              });
              
              if (!exists) {
                console.log(`⚠️ Evermark ${evermarkId} does not exist`);
                return null;
              }
              
              // ✅ FIXED: Use correct method name from ABI
              const evermarkData = await readContract({
                contract: evermarkContract,
                method: "evermarkData",
                params: [evermarkId],
              });
              
              // ✅ FIXED: Extract fields from evermarkData tuple
              const [title, creator, metadataURI, creationTime, minter, referrer] = evermarkData;
              
              console.log("📝 Evermark metadata:", { title, creator, metadataURI });
              
              // Fetch IPFS metadata for description, image, etc.
              console.log("🌐 Fetching IPFS metadata for:", metadataURI);
              const { description, sourceUrl, image } = await fetchIPFSMetadata(metadataURI);
              
              console.log(`✅ Enhanced evermark ${evermarkId}:`, { 
                title, creator, minter, 
                hasDescription: !!description, 
                hasImage: !!image,
                votes: votes.toString()
              });
              
              return {
                evermark: {
                  id: evermarkId.toString(),
                  title: title || `Evermark #${evermarkId}`,
                  author: creator || "Unknown",
                  creator: minter,
                  description,
                  sourceUrl,
                  image,
                  metadataURI,
                  creationTime: Number(creationTime) * 1000, // Convert to milliseconds
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
  
  // ✅ FIXED: Use correct method names for leaderboard management
  const updateLeaderboard = useCallback(async (cycle: number, evermarkId: number) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: leaderboardContract,
        method: "updateEvermarkInLeaderboard",
        params: [BigInt(cycle), BigInt(evermarkId)],
      });
      
      await sendTransaction(transaction as any);
      
      const successMsg = `Successfully updated leaderboard for Evermark ${evermarkId} in cycle ${cycle}`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error updating leaderboard:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to update leaderboard";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [leaderboardContract, sendTransaction]);
  
  const batchUpdateLeaderboard = useCallback(async (cycle: number, evermarkIds: number[]) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: leaderboardContract,
        method: "batchUpdateLeaderboard",
        params: [BigInt(cycle), evermarkIds.map(id => BigInt(id))],
      });
      
      await sendTransaction(transaction as any);
      
      const successMsg = `Successfully batch updated leaderboard for ${evermarkIds.length} evermarks in cycle ${cycle}`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error batch updating leaderboard:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to batch update leaderboard";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [leaderboardContract, sendTransaction]);
  
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