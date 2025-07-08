// src/hooks/useVoting.ts - ✅ FIXED with proper ThirdWeb v5 syntax and core infrastructure

import { useState, useCallback, useMemo } from "react";
import { useReadContract } from "thirdweb/react";
import { useContracts } from './core/useContracts';
import { useTransactionUtils } from './core/useTransactionUtils';
import { useWalletAuth } from "../providers/WalletProvider";
import { toEther, toWei } from "thirdweb/utils";
import { VOTING_ABI, CONTRACTS } from "../lib/contracts";

export function useVoting(evermarkId: string, userAddress?: string) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // ✅ Use unified wallet providers and core infrastructure
  const { address: walletAddress, isConnected, requireConnection } = useWalletAuth();
  const { executeTransaction, isProcessing } = useTransactionUtils();
  const { voting, cardCatalog } = useContracts();
  
  // ✅ Use wallet provider address if userAddress not provided
  const effectiveUserAddress = userAddress || walletAddress;
  
  // ✅ FIXED: Use correct ThirdWeb v5 syntax for all contract calls
  const { data: currentCycle, isLoading: isLoadingCycle, refetch: refetchCycle } = useReadContract({
    contract: voting,
    method: "function getCurrentCycle() view returns (uint256)",
    params: [],
  });

  // ✅ FIXED: Get voting power from CardCatalog with proper syntax
  const { data: availableVotingPower, isLoading: isLoadingVotingPower, refetch: refetchVotingPower } = useReadContract({
    contract: cardCatalog,
    method: "function getAvailableVotingPower(address) view returns (uint256)",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });

  // ✅ FIXED: Get total voting power from CardCatalog
  const { data: totalVotingPower } = useReadContract({
    contract: cardCatalog,
    method: "function getTotalVotingPower(address) view returns (uint256)",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });

  // ✅ FIXED: Get total wEMARK balance for debugging
  const { data: totalWemark } = useReadContract({
    contract: cardCatalog,
    method: "function balanceOf(address) view returns (uint256)",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });

  // ✅ FIXED: Use correct method name for getting votes in cycle
  const { data: totalVotes, isLoading: isLoadingTotalVotes, refetch: refetchTotalVotes } = useReadContract({
    contract: voting,
    method: "function getEvermarkVotesInCycle(uint256,uint256) view returns (uint256)",
    params: [currentCycle || BigInt(1), BigInt(evermarkId || "0")] as const,
    queryOptions: {
      enabled: !!evermarkId && evermarkId !== "0" && !!currentCycle,
    },
  });

  // ✅ FIXED: Use correct method name for getting user votes in cycle
  const userVotesQuery = useReadContract({
    contract: voting,
    method: "function getUserVotesInCycle(uint256,address,uint256) view returns (uint256)",
    params: [
      currentCycle || BigInt(1), 
      effectiveUserAddress || "0x0000000000000000000000000000000000000000", 
      BigInt(evermarkId || "0")
    ] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress && !!evermarkId && evermarkId !== "0" && !!currentCycle,
    },
  });

  // ✅ FIXED: Get cycle info
  const { data: cycleInfo } = useReadContract({
    contract: voting,
    method: "function getCycleInfo(uint256) view returns (uint256,uint256,uint256,uint256,bool,uint256)",
    params: [currentCycle || BigInt(1)] as const,
    queryOptions: {
      enabled: !!currentCycle,
    },
  });

  // ✅ FIXED: Get time remaining
  const { data: timeRemaining } = useReadContract({
    contract: voting,
    method: "function getTimeRemainingInCurrentCycle() view returns (uint256)",
    params: [] as const,
  });

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log("🔍 Voting Power:", {
      userAddress: effectiveUserAddress ? `${effectiveUserAddress.slice(0, 6)}...${effectiveUserAddress.slice(-4)}` : null,
      totalWemark: totalWemark ? toEther(totalWemark) : "0",
      availableVotingPower: availableVotingPower ? toEther(availableVotingPower) : "0",
      totalVotingPower: totalVotingPower ? toEther(totalVotingPower) : "0",
      currentCycle: currentCycle?.toString(),
      isConnected
    });
  }
  
  // ✅ Delegate votes using core transaction utilities
  const delegateVotes = useCallback(async (amount: string) => {
    console.log('🗳️ Starting delegate votes process...');
    
    // ✅ Use unified connection check
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
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

    setError(null);
    setSuccess(null);

    // Refresh data immediately before transaction
    await Promise.all([
      refetchCycle(),
      refetchVotingPower(), 
      refetchTotalVotes(),
      userVotesQuery.refetch?.(),
    ]);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const voteAmountWei = toWei(amount);
    
    // Re-check with fresh data  
    const freshVotingPowerResult = await refetchVotingPower();
    const actualAvailable = freshVotingPowerResult.data || availableVotingPower || BigInt(0);
    
    console.log("🔍 Voting attempt:", {
      amount: `${amount} wEMARK`,
      available: `${toEther(actualAvailable)} wEMARK`,
      hasEnough: voteAmountWei <= actualAvailable,
    });

    // Check with fresh data
    if (voteAmountWei > actualAvailable) {
      const errorMsg = `Insufficient voting power. Available: ${toEther(actualAvailable)} wEMARK`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    try {
      // ✅ Use core transaction utilities
      const result = await executeTransaction(
        CONTRACTS.VOTING,
        VOTING_ABI,
        "delegateVotes",
        [BigInt(evermarkId), voteAmountWei],
        {
          successMessage: `Successfully delegated ${amount} wEMARK to this Evermark!`,
          errorContext: {
            operation: 'delegateVotes',
            contract: 'VOTING',
            amount,
            tokenId: evermarkId,
            methodName: 'delegateVotes',
            userAddress: effectiveUserAddress
          }
        }
      );
      
      if (result.success) {
        console.log("✅ Vote delegation successful:", result.transactionHash);
        
        setSuccess(result.message || "Vote delegation successful");
        
        // Refetch all relevant data
        setTimeout(() => {
          refetchCycle();
          refetchTotalVotes();
          refetchVotingPower();
          userVotesQuery.refetch?.();
        }, 2000);
        
        return result;
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ Vote delegation failed:", err);
      
      let errorMsg = "Failed to delegate votes";
      if (err.message?.includes("Cannot vote on own Evermark")) {
        errorMsg = "You cannot vote on your own Evermark";
      } else if (err.message?.includes("Insufficient voting power")) {
        errorMsg = "Insufficient voting power available";
      } else if (err.message?.includes("Evermark does not exist")) {
        errorMsg = "This Evermark does not exist";
      } else if (err.message?.includes("Current cycle is finalized")) {
        errorMsg = "Current voting cycle has ended";
      } else if (err.message?.includes("user rejected")) {
        errorMsg = "Transaction was rejected";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [
    isConnected, 
    requireConnection, 
    evermarkId, 
    availableVotingPower, 
    executeTransaction,
    refetchCycle, 
    refetchTotalVotes, 
    refetchVotingPower, 
    userVotesQuery,
    effectiveUserAddress
  ]);
  
  // ✅ Undelegate votes using core transaction utilities
  const undelegateVotes = useCallback(async (amount: string) => {
    console.log('🗳️ Starting undelegate votes process...');
    
    // ✅ Use unified connection check
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
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
    
    setError(null);
    setSuccess(null);
    
    try {
      // ✅ Use core transaction utilities
      const result = await executeTransaction(
        CONTRACTS.VOTING,
        VOTING_ABI,
        "undelegateVotes",
        [BigInt(evermarkId), withdrawAmountWei],
        {
          successMessage: `Successfully withdrew ${amount} wEMARK from this Evermark!`,
          errorContext: {
            operation: 'undelegateVotes',
            contract: 'VOTING',
            amount,
            tokenId: evermarkId,
            methodName: 'undelegateVotes',
            userAddress: effectiveUserAddress
          }
        }
      );
      
      if (result.success) {
        console.log("✅ Vote undelegation successful:", result.transactionHash);
        
        setSuccess(result.message || "Vote undelegation successful");
        
        // Refetch all relevant data
        setTimeout(() => {
          refetchCycle();
          refetchTotalVotes();
          refetchVotingPower();
          userVotesQuery.refetch?.();
        }, 2000);
        
        return result;
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ Vote undelegation failed:", err);
      
      let errorMsg = "Failed to undelegate votes";
      if (err.message?.includes("Insufficient delegated votes")) {
        errorMsg = "You don't have enough votes delegated to this Evermark";
      } else if (err.message?.includes("Current cycle is finalized")) {
        errorMsg = "Current voting cycle has ended";
      } else if (err.message?.includes("user rejected")) {
        errorMsg = "Transaction was rejected";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [
    isConnected,
    requireConnection,
    userVotesQuery.data, 
    evermarkId, 
    executeTransaction,
    refetchCycle, 
    refetchTotalVotes, 
    refetchVotingPower, 
    userVotesQuery,
    effectiveUserAddress
  ]);

  // ✅ NEW: Batch delegate votes function using core utilities
  const delegateVotesBatch = useCallback(async (evermarkIds: string[], amounts: string[]) => {
    console.log('🗳️ Starting batch delegate votes process...');
    
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }
    
    if (evermarkIds.length !== amounts.length) {
      const errorMsg = "Evermark IDs and amounts arrays must be the same length";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (evermarkIds.length === 0) {
      const errorMsg = "No evermarks to vote for";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setError(null);
    setSuccess(null);
    
    try {
      const evermarkIdsBigInt = evermarkIds.map(id => BigInt(id));
      const amountsBigInt = amounts.map(amount => toWei(amount));
      
      // ✅ Use core transaction utilities
      const result = await executeTransaction(
        CONTRACTS.VOTING,
        VOTING_ABI,
        "delegateVotesBatch",
        [evermarkIdsBigInt, amountsBigInt],
        {
          successMessage: `Successfully delegated votes to ${evermarkIds.length} Evermarks!`,
          errorContext: {
            operation: 'delegateVotesBatch',
            contract: 'VOTING',
            methodName: 'delegateVotesBatch',
            userAddress: effectiveUserAddress
          }
        }
      );
      
      if (result.success) {
        console.log("✅ Batch vote delegation successful:", result.transactionHash);
        
        setSuccess(result.message || "Batch vote delegation successful");
        
        // Refetch all relevant data
        setTimeout(() => {
          refetchCycle();
          refetchTotalVotes();
          refetchVotingPower();
          userVotesQuery.refetch?.();
        }, 2000);
        
        return result;
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ Batch vote delegation failed:", err);
      
      let errorMsg = "Failed to delegate votes in batch";
      if (err.message?.includes("Insufficient voting power")) {
        errorMsg = "Insufficient voting power for batch delegation";
      } else if (err.message?.includes("user rejected")) {
        errorMsg = "Transaction was rejected";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [
    isConnected,
    requireConnection,
    executeTransaction,
    refetchCycle,
    refetchTotalVotes,
    refetchVotingPower,
    userVotesQuery,
    effectiveUserAddress
  ]);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Calculate derived values
  const isLoadingVotingData = isLoadingCycle || isLoadingTotalVotes || 
    (!!effectiveUserAddress && userVotesQuery.isLoading) || 
    (!!effectiveUserAddress && isLoadingVotingPower);
    
  const cycleEndTime = useMemo(() => {
    if (!cycleInfo) return null;
    return new Date(Number(cycleInfo[1]) * 1000); // Use endTime from tuple
  }, [cycleInfo]);
  
  const isCycleFinalized = cycleInfo?.[4] || false; // Use finalized from tuple
  const canVote = !!effectiveUserAddress && !isLoadingVotingData && !isCycleFinalized && 
                  (availableVotingPower || BigInt(0)) > BigInt(0);
  
  return {
    // Core voting data
    totalVotes: totalVotes || BigInt(0),
    userVotes: userVotesQuery.data || BigInt(0),
    availableVotingPower: availableVotingPower || BigInt(0),
    
    // Debug info
    totalWemarkBalance: totalWemark || BigInt(0),
    totalVotingPower: totalVotingPower || BigInt(0),
    
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
    isVoting: isProcessing,
    canVote,
    
    // Messages
    error,
    success,
    
    // Actions
    delegateVotes,
    undelegateVotes,
    delegateVotesBatch, // ✅ NEW: Batch voting function
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
    
    // ✅ Auth info for debugging
    authInfo: {
      effectiveUserAddress,
      isConnected,
    }
  };
}