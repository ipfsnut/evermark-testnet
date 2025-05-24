import React, { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, REWARDS_ABI } from "../lib/contracts";
import { toEther } from "thirdweb/utils";

export function useRewards(userAddress?: string) {
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  // Get pending rewards using the correct method name
  const pendingRewardsResult = useReadContract({
    contract: rewardsContract,
    method: "getUserRewardSummary",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  // Extract total pending from the reward summary
  const pendingRewards = pendingRewardsResult.data?.totalPending;
  const isLoadingRewards = userAddress ? pendingRewardsResult.isLoading : false;
  const rewardsError = userAddress ? pendingRewardsResult.error : null;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Function to claim all available rewards
  const claimRewards = useCallback(async () => {
    if (!userAddress) {
      const errorMsg = "Please connect your wallet";
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
      const transaction = prepareContractCall({
        contract: rewardsContract,
        method: "claimAllRewards",
        params: [] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch pending rewards after successful claim
      setTimeout(() => {
        pendingRewardsResult.refetch?.();
      }, 2000);
      
      const successMsg = `Successfully claimed ${toEther(pendingRewards)} EMARK tokens!`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error claiming rewards:", err);
      const errorMsg = err.message || "Failed to claim rewards";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsClaimingRewards(false);
    }
  }, [userAddress, pendingRewards, rewardsContract, sendTransaction, pendingRewardsResult]);
  
  // Function to claim rewards for a specific week
  const claimWeeklyRewards = useCallback(async (week: number) => {
    if (!userAddress) {
      const errorMsg = "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    setIsClaimingRewards(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: rewardsContract,
        method: "claimWeeklyRewards",
        params: [BigInt(week)] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch pending rewards after successful claim
      setTimeout(() => {
        pendingRewardsResult.refetch?.();
      }, 2000);
      
      const successMsg = `Successfully claimed EMARK rewards for week ${week}!`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error claiming weekly rewards:", err);
      const errorMsg = err.message || "Failed to claim weekly rewards";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsClaimingRewards(false);
    }
  }, [userAddress, rewardsContract, sendTransaction, pendingRewardsResult]);
  
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
  };
}

// Hook for current week information
export function useCurrentWeek() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: currentWeekInfo, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "getCurrentWeekInfo",
    params: [],
  });
  
  return {
    currentWeekInfo,
    isLoading,
    error,
    currentWeek: currentWeekInfo?.week,
    weekStartTime: currentWeekInfo?.startTime,
    weekEndTime: currentWeekInfo?.endTime,
    totalPool: currentWeekInfo?.totalPool,
    timeRemaining: currentWeekInfo?.timeRemaining,
    isFinalized: currentWeekInfo?.finalized,
  };
}

// Hook for week-specific information
export function useWeekInfo(weekNumber: number) {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: weekInfo, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "getWeekInfo",
    params: [BigInt(weekNumber)],
    queryOptions: {
      enabled: weekNumber > 0,
    },
  });
  
  return {
    weekInfo,
    isLoading,
    error,
  };
}

// Hook for rewards distribution info (for transparency/admin)
export function useRewardsInfo() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  // Get total rewards distributed
  const { data: totalDistributed } = useReadContract({
    contract: rewardsContract,
    method: "totalRewardsDistributed",
    params: [],
  });
  
  // Get total token staker rewards
  const { data: totalTokenStakerRewards } = useReadContract({
    contract: rewardsContract,
    method: "totalTokenStakerRewards",
    params: [],
  });
  
  // Get total creator rewards
  const { data: totalCreatorRewards } = useReadContract({
    contract: rewardsContract,
    method: "totalCreatorRewards",
    params: [],
  });
  
  // Get total NFT staker rewards
  const { data: totalNftStakerRewards } = useReadContract({
    contract: rewardsContract,
    method: "totalNftStakerRewards",
    params: [],
  });
  
  return {
    totalDistributed: totalDistributed || BigInt(0),
    totalTokenStakerRewards: totalTokenStakerRewards || BigInt(0),
    totalCreatorRewards: totalCreatorRewards || BigInt(0),
    totalNftStakerRewards: totalNftStakerRewards || BigInt(0),
  };
}

// Hook for tracking total rewards distributed (for stats/dashboard)
export function useRewardsStats() {
  const rewardsInfo = useRewardsInfo();
  const currentWeek = useCurrentWeek();
  
  return {
    ...rewardsInfo,
    currentWeek: currentWeek.currentWeek || 0,
    currentWeekPool: currentWeek.totalPool || BigInt(0),
    isCurrentWeekFinalized: currentWeek.isFinalized || false,
    timeRemainingInWeek: currentWeek.timeRemaining || 0,
  };
}

// Hook for user's reward calculation for a specific week
export function useUserWeeklyRewards(userAddress?: string, week?: number) {
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
      userAddress || "0x0000000000000000000000000000000000000000",
      BigInt(week || 0)
    ] as const,
    queryOptions: {
      enabled: !!userAddress && !!week && week > 0,
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
  };
}
