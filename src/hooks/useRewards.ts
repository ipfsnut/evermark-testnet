import React, { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, REWARDS_ABI } from "../lib/contracts";
import { toEther } from "thirdweb/utils";
import { useFarcasterUser } from "../lib/farcaster";
import { formatEmarkWithSymbol } from "../utils/formatters";

export function useRewards(userAddress?: string) {
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // ADD FARCASTER USER HOOK
  const { isInFarcaster, isAuthenticated: isFarcasterAuth, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();

  // ENHANCED: Determine the effective user address
  const effectiveUserAddress = userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddress() ? getPrimaryAddress() : null);
  const hasWalletAccess = !!userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddress());

  console.log('🔍 Rewards Auth Debug:', {
    userAddress,
    isInFarcaster,
    isFarcasterAuth,
    hasVerifiedAddress: hasVerifiedAddress(),
    primaryAddress: getPrimaryAddress(),
    effectiveUserAddress,
    hasWalletAccess
  });
  
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  // UPDATE: Use effectiveUserAddress
  const pendingRewardsResult = useReadContract({
    contract: rewardsContract,
    method: "getUserRewardSummary",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Extract total pending from the reward summary
  const pendingRewards = pendingRewardsResult.data?.totalPending;
  const isLoadingRewards = effectiveUserAddress ? pendingRewardsResult.isLoading : false;
  const rewardsError = effectiveUserAddress ? pendingRewardsResult.error : null;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Function to claim all available rewards
  const claimRewards = useCallback(async () => {
    // UPDATE VALIDATION
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
      console.log('🎁 Claiming rewards for:', effectiveUserAddress);
      
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
            
            // Update the claimRewards success message to use real data
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
    // UPDATE VALIDATION
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
      console.log('🎁 Claiming weekly rewards for week:', week, 'user:', effectiveUserAddress);
      
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
    rewardSummary: pendingRewardsResult.data, // Full reward breakdown
    isLoadingRewards,
    isClaimingRewards,
    error,
    success,
    claimRewards,
    claimWeeklyRewards,
    clearMessages,
    refetch: pendingRewardsResult.refetch,
    // ADD THESE FOR DEBUGGING
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
  // ADD FARCASTER SUPPORT
  const { isInFarcaster, isAuthenticated: isFarcasterAuth, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();
  const effectiveUserAddress = userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddress() ? getPrimaryAddress() : null);

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
    effectiveUserAddress // ADD THIS FOR DEBUGGING
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
    method: "getCurrentWeek",
    params: [] as const,
  });
  
  return {
    currentWeek: currentWeek ? Number(currentWeek) : 0,
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
    weekInfo,
    isLoading,
    error
  };
}

// Hook to get general rewards information
export function useRewardsInfo() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: rewardsInfo, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "getRewardsInfo",
    params: [] as const,
  });
  
  return {
    rewardsInfo,
    isLoading,
    error
  };
}

// Hook to get rewards statistics
export function useRewardsStats() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: totalDistributed } = useReadContract({
    contract: rewardsContract,
    method: "getTotalDistributed",
    params: [] as const,
  });
  
  const { data: totalParticipants } = useReadContract({
    contract: rewardsContract,
    method: "getTotalParticipants",
    params: [] as const,
  });
  
  return {
    totalDistributed: totalDistributed || BigInt(0),
    totalParticipants: totalParticipants ? Number(totalParticipants) : 0,
  };
}
