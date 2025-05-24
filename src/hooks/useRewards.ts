// src/hooks/useRewards.ts - FIXED VERSION
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
  
  // Get pending rewards - FIXED: use enabled option instead of conditional params
  const pendingRewardsResult = useReadContract({
    contract: rewardsContract,
    method: "getPendingRewards",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress, // Only run query if userAddress exists
    },
  });
  
  const pendingRewards = userAddress ? pendingRewardsResult.data : undefined;
  const isLoadingRewards = userAddress ? pendingRewardsResult.isLoading : false;
  const rewardsError = userAddress ? pendingRewardsResult.error : null;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Function to claim rewards - FIXED: proper validation and error handling
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
        method: "claimRewards",
        params: [] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch pending rewards after successful claim
      setTimeout(() => {
        pendingRewardsResult.refetch?.();
      }, 2000);
      
      const successMsg = `Successfully claimed ${toEther(pendingRewards)} tokens!`;
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

// BONUS: Hook for rewards distribution info (for admins/transparency)
export function useRewardsInfo() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  // Get reward percentages
  const { data: stakingRewardPercentage, isLoading: isLoadingStaking } = useReadContract({
    contract: rewardsContract,
    method: "stakingRewardPercentage",
    params: [],
  });
  
  const { data: creatorRewardPercentage, isLoading: isLoadingCreator } = useReadContract({
    contract: rewardsContract,
    method: "creatorRewardPercentage",
    params: [],
  });
  
  return {
    stakingRewardPercentage: stakingRewardPercentage ? Number(stakingRewardPercentage) : 0,
    creatorRewardPercentage: creatorRewardPercentage ? Number(creatorRewardPercentage) : 0,
    isLoading: isLoadingStaking || isLoadingCreator,
  };
}

// Hook for tracking total rewards distributed (if needed for stats)
export function useRewardsStats() {
  const [totalClaimed, setTotalClaimed] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  
  // Since there's no direct method to get total claimed rewards,
  // we could track this through events or other means
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