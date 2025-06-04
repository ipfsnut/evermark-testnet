import { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, VOTING_ABI, CARD_CATALOG_ABI } from "../lib/contracts";
import { toEther, toWei } from "thirdweb/utils";

export function useVoting(evermarkId: string, userAddress?: string) {
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Both contracts needed for full voting functionality
  const votingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.VOTING,
    abi: VOTING_ABI,
  }), []);

  const cardCatalogContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CARD_CATALOG_ABI,
  }), []);

  // Get current cycle
  const { data: currentCycle, isLoading: isLoadingCycle, refetch: refetchCycle } = useReadContract({
    contract: votingContract,
    method: "getCurrentCycle",
    params: [],
  });

  // ✅ FIXED: Get voting power from EvermarkVoting (matches transaction behavior)
  const { data: availableVotingPower, isLoading: isLoadingVotingPower, refetch: refetchVotingPower } = useReadContract({
    contract: votingContract,
    method: "getRemainingVotingPower", 
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });

  // ✅ BONUS: Also get voting power direct from CardCatalog (for debugging)
  const { data: cardCatalogDirectPower } = useReadContract({
    contract: cardCatalogContract,
    method: "getAvailableVotingPower",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });

  // ✅ BONUS: Also get total wEMARK balance for debugging
  const { data: totalWemark } = useReadContract({
    contract: cardCatalogContract,
    method: "balanceOf",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });

  // ✅ Get total votes for this Evermark (cycle-specific)
  const { data: totalVotes, isLoading: isLoadingTotalVotes, refetch: refetchTotalVotes } = useReadContract({
    contract: votingContract,
    method: "getEvermarkVotesInCycle",
    params: [currentCycle || BigInt(1), BigInt(evermarkId || "0")] as const,
    queryOptions: {
      enabled: !!evermarkId && evermarkId !== "0" && !!currentCycle,
    },
  });

  // ✅ Get user's votes for this Evermark (cycle-specific)
  const userVotesQuery = useReadContract({
    contract: votingContract,
    method: "getUserVotesInCycle",
    params: [
      currentCycle || BigInt(1), 
      userAddress || "0x0000000000000000000000000000000000000000", 
      BigInt(evermarkId || "0")
    ] as const,
    queryOptions: {
      enabled: !!userAddress && !!evermarkId && evermarkId !== "0" && !!currentCycle,
    },
  });

  // ✅ Get cycle info
  const { data: cycleInfo } = useReadContract({
    contract: votingContract,
    method: "getCycleInfo",
    params: [currentCycle || BigInt(1)] as const,
    queryOptions: {
      enabled: !!currentCycle,
    },
  });

  // ✅ Get time remaining
  const { data: timeRemaining } = useReadContract({
    contract: votingContract,
    method: "getTimeRemainingInCurrentCycle",
    params: [] as const,
  });

  // 🔍 DEBUG: Log voting power info  
  console.log("🔍 Voting Power:", {
    userAddress: userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : null,
    totalWemark: totalWemark ? toEther(totalWemark) : "0",
    availableVotingPower: availableVotingPower ? toEther(availableVotingPower) : "0",
    cardCatalogDirectPower: cardCatalogDirectPower ? toEther(cardCatalogDirectPower) : "0",
    powerMatch: availableVotingPower?.toString() === cardCatalogDirectPower?.toString(),
    currentCycle: currentCycle?.toString(),
  });

  const { mutate: sendTransaction } = useSendTransaction();
  
  // ✅ Delegate votes function
  const delegateVotes = useCallback(async (amount: string) => {
    if (!userAddress) {
      const errorMsg = "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      const errorMsg = "Please enter a valid vote amount";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!evermarkId || evermarkId === "0") {
      const errorMsg = "Invalid Evermark ID";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsVoting(true);
    setError(null);
    setSuccess(null);

    // ✅ CRITICAL FIX: Refresh data immediately before transaction
    await Promise.all([
      refetchCycle(),
      refetchVotingPower(), 
      refetchTotalVotes(),
      userVotesQuery.refetch?.(),
    ]);

    // Small delay to ensure data is fresh
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const voteAmountWei = toWei(amount);
    
    // Re-check with fresh data  
    const freshVotingPowerResult = await refetchVotingPower();
    const actualAvailable = freshVotingPowerResult.data || availableVotingPower || BigInt(0);
    
    // 🔍 DEBUG: Log transaction attempt
    console.log("🔍 Voting:", {
      amount: `${amount} wEMARK`,
      available: `${toEther(actualAvailable)} wEMARK`,
      hasEnough: voteAmountWei <= actualAvailable,
    });

    // Check with fresh data
    if (voteAmountWei > actualAvailable) {
      const errorMsg = `Insufficient voting power. Available: ${toEther(actualAvailable)} wEMARK`;
      setError(errorMsg);
      setIsVoting(false);
      return { success: false, error: errorMsg };
    }
    
    try {
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "delegateVotes",
        params: [BigInt(evermarkId), voteAmountWei] as const,
      });
      
      // 🔍 DEBUG: Log the exact transaction details
      console.log("🔍 Transaction Details:", {
        contractAddress: votingContract.address,
        method: "delegateVotes",
        evermarkId: evermarkId,
        amount: toEther(voteAmountWei),
        userAddressFromUI: userAddress,
        chainId: votingContract.chain.id,
      });
      
      return new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: () => {
            const successMsg = `Successfully delegated ${amount} wEMARK to this Evermark!`;
            setSuccess(successMsg);
            
            // Refetch all relevant data
            setTimeout(() => {
              refetchCycle();
              refetchTotalVotes();
              refetchVotingPower();
              userVotesQuery.refetch?.();
            }, 2000);
            
            resolve({ success: true, message: successMsg });
          },
          onError: (error: any) => {
            console.error("Error delegating votes:", error);
            
            let errorMsg = "Failed to delegate votes";
            if (error.message?.includes("Cannot vote on own Evermark")) {
              errorMsg = "You cannot vote on your own Evermark";
            } else if (error.message?.includes("Insufficient voting power")) {
              errorMsg = "Insufficient voting power available";
            } else if (error.message?.includes("Evermark does not exist")) {
              errorMsg = "This Evermark does not exist";
            } else if (error.message?.includes("Current cycle is finalized")) {
              errorMsg = "Current voting cycle has ended";
            } else if (error.message?.includes("user rejected")) {
              errorMsg = "Transaction was rejected";
            } else if (error.message) {
              errorMsg = error.message;
            }
            
            setError(errorMsg);
            resolve({ success: false, error: errorMsg });
          }
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || "Failed to delegate votes";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [userAddress, evermarkId, availableVotingPower, totalWemark, votingContract, sendTransaction, refetchCycle, refetchTotalVotes, refetchVotingPower, userVotesQuery]);
  
  // ✅ Undelegate votes function
  const undelegateVotes = useCallback(async (amount: string) => {
    if (!userAddress) {
      const errorMsg = "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    const userVotes = userVotesQuery.data;
    if (!userVotes || userVotes === BigInt(0)) {
      const errorMsg = "No votes to withdraw from this Evermark";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      const errorMsg = "Please enter a valid amount to withdraw";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    const withdrawAmountWei = toWei(amount);
    if (withdrawAmountWei > userVotes) {
      const errorMsg = `Cannot withdraw more than delegated. Your delegation: ${toEther(userVotes)} wEMARK`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "undelegateVotes",
        params: [BigInt(evermarkId), withdrawAmountWei] as const,
      });
      
      return new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: () => {
            const successMsg = `Successfully withdrew ${amount} wEMARK from this Evermark!`;
            setSuccess(successMsg);
            
            // Refetch all relevant data
            setTimeout(() => {
              refetchCycle();
              refetchTotalVotes();
              refetchVotingPower();
              userVotesQuery.refetch?.();
            }, 2000);
            
            resolve({ success: true, message: successMsg });
          },
          onError: (error: any) => {
            console.error("Error undelegating votes:", error);
            
            let errorMsg = "Failed to undelegate votes";
            if (error.message?.includes("Insufficient delegated votes")) {
              errorMsg = "You don't have enough votes delegated to this Evermark";
            } else if (error.message?.includes("Current cycle is finalized")) {
              errorMsg = "Current voting cycle has ended";
            } else if (error.message?.includes("user rejected")) {
              errorMsg = "Transaction was rejected";
            } else if (error.message) {
              errorMsg = error.message;
            }
            
            setError(errorMsg);
            resolve({ success: false, error: errorMsg });
          }
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || "Failed to undelegate votes";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [userAddress, userVotesQuery.data, evermarkId, votingContract, sendTransaction, refetchCycle, refetchTotalVotes, refetchVotingPower, userVotesQuery]);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Calculate derived values
  const isLoadingVotingData = isLoadingCycle || isLoadingTotalVotes || 
    (!!userAddress && userVotesQuery.isLoading) || 
    (!!userAddress && isLoadingVotingPower);
    
  const cycleEndTime = useMemo(() => {
    if (!cycleInfo) return null;
    return new Date(Number(cycleInfo.endTime) * 1000);
  }, [cycleInfo]);
  
  const isCycleFinalized = cycleInfo?.finalized || false;
  const canVote = !!userAddress && !isLoadingVotingData && !isCycleFinalized && 
                  (availableVotingPower || BigInt(0)) > BigInt(0);
  
  return {
    // Core voting data
    totalVotes: totalVotes || BigInt(0),
    userVotes: userVotesQuery.data || BigInt(0),
    availableVotingPower: availableVotingPower || BigInt(0),
    
    // ✅ BONUS: Expose wEMARK balance for debugging
    totalWemarkBalance: totalWemark || BigInt(0),
    
    // Cycle information
    currentCycle: currentCycle ? Number(currentCycle) : 0,
    cycleInfo,
    timeRemaining: timeRemaining ? Number(timeRemaining) : 0,
    cycleEndTime,
    isCycleFinalized,
    
    // Loading states
    isLoadingTotalVotes: isLoadingVotingData,
    isLoadingUserVotes: userVotesQuery.isLoading,
    isLoadingVotingPower,
    isLoadingCycle,
    
    // Action states
    isVoting,
    canVote,
    
    // Messages
    error,
    success,
    
    // Actions
    delegateVotes,
    undelegateVotes,
    clearMessages,
    
    // Manual refresh
    refresh: useCallback(() => {
      refetchCycle();
      refetchTotalVotes();
      refetchVotingPower();
      userVotesQuery.refetch?.();
    }, [refetchCycle, refetchTotalVotes, refetchVotingPower, userVotesQuery]),
    
    // Helper functions
    formatTimeRemaining: useCallback((seconds: number) => {
      if (seconds <= 0) return "Cycle ended";
      
      const days = Math.floor(seconds / (24 * 60 * 60));
      const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((seconds % (60 * 60)) / 60);
      
      if (days > 0) {
        return `${days}d ${hours}h remaining`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
      } else {
        return `${minutes}m remaining`;
      }
    }, []),
  };
}