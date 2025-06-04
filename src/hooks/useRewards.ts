import React, { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, REWARDS_ABI } from "../lib/contracts";
import { useFarcasterUser } from "../lib/farcaster";
import { formatEmarkWithSymbol } from "../utils/formatters";

export function useRewards(userAddress?: string) {
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Farcaster integration
  const { isInFarcaster, isAuthenticated: isFarcasterAuth, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();

  // ✅ FIXED: Memoize these function calls to prevent excessive re-renders
  const hasVerifiedAddr = useMemo(() => hasVerifiedAddress(), [hasVerifiedAddress]);
  const primaryAddress = useMemo(() => getPrimaryAddress(), [getPrimaryAddress]);

  // Determine the effective user address
  const effectiveUserAddress = userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddr ? primaryAddress : null);
  const hasWalletAccess = !!userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddr);

  // ✅ FIXED: Reduced logging - only log when there's a change and only in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Rewards Auth State:', {
        hasUserAddress: !!userAddress,
        isInFarcaster,
        isFarcasterAuth,
        hasVerifiedAddr,
        effectiveUserAddress: effectiveUserAddress ? `${effectiveUserAddress.slice(0, 6)}...${effectiveUserAddress.slice(-4)}` : null,
        hasWalletAccess
      });
    }
  }, [userAddress, isInFarcaster, isFarcasterAuth, hasVerifiedAddr, effectiveUserAddress, hasWalletAccess]);
  
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  // Get user reward summary (this contains all pending rewards)
  const pendingRewardsResult = useReadContract({
    contract: rewardsContract,
    method: "getUserRewardSummary",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Extract data from reward summary
  const rewardSummary = pendingRewardsResult.data;
  const pendingRewards = rewardSummary?.totalPending;
  const isLoadingRewards = effectiveUserAddress ? pendingRewardsResult.isLoading : false;
  const rewardsError = effectiveUserAddress ? pendingRewardsResult.error : null;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Function to claim all available rewards
  const claimRewards = useCallback(async () => {
    if (!hasWalletAccess) {
      const errorMsg = isInFarcaster ? 
        "Please authenticate in Farcaster or connect a wallet" : 
        "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!pendingRewards || pendingRewards === BigInt(0)) {
      const errorMsg = "No rewards to claim";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    setIsClaimingRewards(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎁 Claiming rewards for:', effectiveUserAddress);
      }
      
      const transaction = prepareContractCall({
        contract: rewardsContract,
        method: "claimAllRewards",
        params: [] as const,
      });
      
      return new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: (result: any) => {
            console.log("✅ Rewards claim successful:", result);
            
            // Refetch pending rewards after successful claim
            setTimeout(() => {
              pendingRewardsResult.refetch?.();
            }, 2000);
            
            const successMsg = `Successfully claimed ${formatEmarkWithSymbol(pendingRewards)}!`;
            setSuccess(successMsg);
            setIsClaimingRewards(false);
            resolve({ success: true, message: successMsg });
          },
          onError: (error: any) => {
            console.error("❌ Rewards claim failed:", error);
            
            let errorMsg = "Failed to claim rewards";
            if (error.code === 4001) {
              errorMsg = "Transaction was rejected by user";
            } else if (error.message?.includes('insufficient funds')) {
              errorMsg = "Insufficient ETH for gas fees";
            } else if (error.message?.includes('execution reverted')) {
              errorMsg = "Transaction reverted - no rewards available or already claimed";
            } else if (error.message) {
              errorMsg = error.message;
            }
            
            setError(errorMsg);
            setIsClaimingRewards(false);
            resolve({ success: false, error: errorMsg });
          }
        });
      });
    } catch (err: any) {
      console.error("Error claiming rewards:", err);
      const errorMsg = err.message || "Failed to claim rewards";
      setError(errorMsg);
      setIsClaimingRewards(false);
      return { success: false, error: errorMsg };
    }
  }, [effectiveUserAddress, pendingRewards, rewardsContract, sendTransaction, pendingRewardsResult, hasWalletAccess, isInFarcaster]);
  
  // Function to claim rewards for a specific week
  const claimWeeklyRewards = useCallback(async (week: number) => {
    if (!hasWalletAccess) {
      const errorMsg = isInFarcaster ? 
        "Please authenticate in Farcaster or connect a wallet" : 
        "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    setIsClaimingRewards(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎁 Claiming weekly rewards for week:', week, 'user:', effectiveUserAddress);
      }
      
      const transaction = prepareContractCall({
        contract: rewardsContract,
        method: "claimWeeklyRewards",
        params: [BigInt(week)] as const,
      });
      
      return new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: (result: any) => {
            console.log("✅ Weekly rewards claim successful:", result);
            
            // Refetch pending rewards after successful claim
            setTimeout(() => {
              pendingRewardsResult.refetch?.();
            }, 2000);
            
            const successMsg = `Successfully claimed EMARK rewards for week ${week}!`;
            setSuccess(successMsg);
            setIsClaimingRewards(false);
            resolve({ success: true, message: successMsg });
          },
          onError: (error: any) => {
            console.error("❌ Weekly rewards claim failed:", error);
            const errorMsg = error.message || "Failed to claim weekly rewards";
            setError(errorMsg);
            setIsClaimingRewards(false);
            resolve({ success: false, error: errorMsg });
          }
        });
      });
    } catch (err: any) {
      console.error("Error claiming weekly rewards:", err);
      const errorMsg = err.message || "Failed to claim weekly rewards";
      setError(errorMsg);
      setIsClaimingRewards(false);
      return { success: false, error: errorMsg };
    }
  }, [effectiveUserAddress, rewardsContract, sendTransaction, pendingRewardsResult, hasWalletAccess, isInFarcaster]);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  
  // Set error from contract fetch if it exists
  React.useEffect(() => {
    if (rewardsError && !error) {
      setError(`Failed to fetch rewards: ${rewardsError.message}`);
    }
  }, [rewardsError, error]);
  
  return {
    pendingRewards,
    rewardSummary,
    isLoadingRewards,
    isClaimingRewards,
    error,
    success,
    claimRewards,
    claimWeeklyRewards,
    clearMessages,
    refetch: pendingRewardsResult.refetch,
    authInfo: {
      effectiveUserAddress,
      hasWalletAccess,
      isInFarcaster,
      isFarcasterAuth
    }
  };
}

// Hook for user's reward calculation for a specific week
export function useUserWeeklyRewards(userAddress?: string, week?: number) {
  const { isInFarcaster, isAuthenticated: isFarcasterAuth, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();
  
  // ✅ FIXED: Memoize function calls to prevent re-renders
  const hasVerifiedAddr = useMemo(() => hasVerifiedAddress(), [hasVerifiedAddress]);
  const primaryAddress = useMemo(() => getPrimaryAddress(), [getPrimaryAddress]);
  
  const effectiveUserAddress = userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddr ? primaryAddress : null);

  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: weeklyRewards, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "calculateUserWeeklyRewards",
    params: [
      effectiveUserAddress || "0x0000000000000000000000000000000000000000",
      BigInt(week || 0)
    ] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress && !!week && week > 0,
    },
  });
  
  return {
    baseRewards: weeklyRewards?.[0] || BigInt(0),
    variableRewards: weeklyRewards?.[1] || BigInt(0),
    nftRewards: weeklyRewards?.[2] || BigInt(0),
    totalWeeklyRewards: weeklyRewards ? 
      (weeklyRewards[0] || BigInt(0)) + 
      (weeklyRewards[1] || BigInt(0)) + 
      (weeklyRewards[2] || BigInt(0)) : BigInt(0),
    isLoading,
    error,
    effectiveUserAddress
  };
}

// Hook to get current week number
export function useCurrentWeek() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: currentWeek, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "currentWeek",
    params: [] as const,
  });
  
  return {
    currentWeek: currentWeek ? Number(currentWeek) : 0,
    isLoading,
    error
  };
}

// Hook to get current week information  
export function useCurrentWeekInfo() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: weekInfo, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "getCurrentWeekInfo",
    params: [] as const,
  });
  
  return {
    week: weekInfo?.[0] ? Number(weekInfo[0]) : 0,
    startTime: weekInfo?.[1] ? Number(weekInfo[1]) : 0,
    endTime: weekInfo?.[2] ? Number(weekInfo[2]) : 0,
    totalPool: weekInfo?.[3] || BigInt(0),
    timeRemaining: weekInfo?.[4] ? Number(weekInfo[4]) : 0,
    finalized: weekInfo?.[5] || false,
    isLoading,
    error
  };
}

// Hook to get week information
export function useWeekInfo(week?: number) {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: weekInfo, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "getWeekInfo",
    params: [BigInt(week || 0)] as const,
    queryOptions: {
      enabled: !!week && week > 0,
    },
  });
  
  return {
    week: weekInfo?.[0] ? Number(weekInfo[0]) : 0,
    startTime: weekInfo?.[1] ? Number(weekInfo[1]) : 0,
    endTime: weekInfo?.[2] ? Number(weekInfo[2]) : 0,
    totalPool: weekInfo?.[3] || BigInt(0),
    tokenStakerPool: weekInfo?.[4] || BigInt(0),
    creatorPool: weekInfo?.[5] || BigInt(0),
    finalized: weekInfo?.[6] || false,
    distributed: weekInfo?.[7] || false,
    isLoading,
    error
  };
}

// Hook to get global rewards statistics
export function useRewardsStats() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: globalStats } = useReadContract({
    contract: rewardsContract,
    method: "getGlobalStats",
    params: [] as const,
  });
  
  return {
    totalDistributed: globalStats?.[0] || BigInt(0),
    totalTokenStaker: globalStats?.[1] || BigInt(0),
    totalCreator: globalStats?.[2] || BigInt(0),
    totalNftStaker: globalStats?.[3] || BigInt(0),
    currentWeekNumber: globalStats?.[4] ? Number(globalStats[4]) : 0,
  };
}

// Hook to get user's reward breakdown for specific week
export function useUserWeekRewards(userAddress?: string, week?: number) {
  const { isInFarcaster, isAuthenticated: isFarcasterAuth, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();
  
  // ✅ FIXED: Memoize function calls
  const hasVerifiedAddr = useMemo(() => hasVerifiedAddress(), [hasVerifiedAddress]);
  const primaryAddress = useMemo(() => getPrimaryAddress(), [getPrimaryAddress]);
  
  const effectiveUserAddress = userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddr ? primaryAddress : null);

  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: weekRewards, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "getUserWeekRewards",
    params: [
      effectiveUserAddress || "0x0000000000000000000000000000000000000000",
      BigInt(week || 0)
    ] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress && !!week && week > 0,
    },
  });
  
  return {
    baseRewards: weekRewards?.[0] || BigInt(0),
    variableRewards: weekRewards?.[1] || BigInt(0),
    nftRewards: weekRewards?.[2] || BigInt(0),
    claimed: weekRewards?.[3] || false,
    totalWeekRewards: weekRewards ? 
      (weekRewards[0] || BigInt(0)) + 
      (weekRewards[1] || BigInt(0)) + 
      (weekRewards[2] || BigInt(0)) : BigInt(0),
    isLoading,
    error,
    effectiveUserAddress
  };
}