// src/hooks/useRewards.ts - FIXED VERSION FOR NEW MULTI-STREAM ARCHITECTURE
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
  
  // FIXED: Get pending rewards using correct method name and enabled pattern
  const pendingRewardsResult = useReadContract({
    contract: rewardsContract,
    method: "getPendingRewards", // VERIFIED: This method exists in REWARDS_ABI
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress, // Only run query if userAddress exists
    },
  });
  
  const pendingRewards = userAddress ? pendingRewardsResult.data : undefined;
  const isLoadingRewards = userAddress ? pendingRewardsResult.isLoading : false;
  const rewardsError = userAddress ? pendingRewardsResult.error : null;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // FIXED: Function to claim rewards with proper validation and error handling
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
      // FIXED: Using correct method name from REWARDS_ABI
      const transaction = prepareContractCall({
        contract: rewardsContract,
        method: "claimRewards", // VERIFIED: This method exists in REWARDS_ABI
        params: [] as const, // No parameters needed for user's own rewards
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch pending rewards after successful claim
      setTimeout(() => {
        pendingRewardsResult.refetch?.();
      }, 2000);
      
      const successMsg = `Successfully claimed ${toEther(pendingRewards)} NSI tokens!`;
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
    isLoadingRewards,
    isClaimingRewards,
    error,
    success,
    claimRewards,
    clearMessages,
    refetch: pendingRewardsResult.refetch,
  };
}

// ENHANCED: Hook for rewards distribution info (for transparency/admin)
export function useRewardsInfo() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  // FIXED: Get reward percentages using correct method names
  const { data: stakingRewardPercentage, isLoading: isLoadingStaking } = useReadContract({
    contract: rewardsContract,
    method: "stakingRewardPercentage", // VERIFIED: Exists in ABI
    params: [],
  });
  
  const { data: creatorRewardPercentage, isLoading: isLoadingCreator } = useReadContract({
    contract: rewardsContract,
    method: "creatorRewardPercentage", // VERIFIED: Exists in ABI  
    params: [],
  });
  
  return {
    stakingRewardPercentage: stakingRewardPercentage ? Number(stakingRewardPercentage) : 60, // Default 60%
    creatorRewardPercentage: creatorRewardPercentage ? Number(creatorRewardPercentage) : 40, // Default 40%
    isLoading: isLoadingStaking || isLoadingCreator,
  };
}

// ENHANCED: Hook for tracking total rewards distributed (for stats/dashboard)
export function useRewardsStats() {
  const [totalClaimed, setTotalClaimed] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  
  // Since there's no direct method to get total claimed rewards in the current ABI,
  // we could track this through events or other means in the future
  // For now, returning placeholder data
  
  React.useEffect(() => {
    // TODO: Implement if needed for dashboard stats
    // Could listen to RewardClaimed events or maintain a counter
    setTotalClaimed(BigInt(0));
    setIsLoading(false);
  }, []);
  
  return {
    totalClaimed,
    isLoading,
  };
}

// NEW: Hook for weekly reward cycle information
export function useRewardCycles() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);

  // This would require additional contract methods for cycle tracking
  // For now, return mock data structure for future implementation
  const [currentCycle, setCurrentCycle] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  return {
    currentCycle,
    isLoading,
    // Future: Add methods to get cycle details, history, etc.
  };
}