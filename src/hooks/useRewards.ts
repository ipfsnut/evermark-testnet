import React, { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, REWARDS_ABI } from "../lib/contracts";
import { useFarcasterUser } from "../lib/farcaster";
import { toEther } from "thirdweb/utils";

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
  
  // ✅ FIXED: Use actual contract method "getUserRewardInfo"
  const { data: userRewardInfo, isLoading: isLoadingRewards, refetch, error: rewardsError } = useReadContract({
    contract: rewardsContract,
    method: "getUserRewardInfo", // ✅ This method exists in EvermarkRewards
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });

  // ✅ FIXED: Extract data from getUserRewardInfo response
  // Returns: (pendingEth, pendingEmark, stakedAmount, periodEthRewards, periodEmarkRewards)
  const pendingEthRewards = userRewardInfo?.[0] || BigInt(0); // pendingEth (WETH)
  const pendingEmarkRewards = userRewardInfo?.[1] || BigInt(0); // pendingEmark
  const stakedAmount = userRewardInfo?.[2] || BigInt(0); // stakedAmount
  const periodEthRewards = userRewardInfo?.[3] || BigInt(0); // periodEthRewards
  const periodEmarkRewards = userRewardInfo?.[4] || BigInt(0); // periodEmarkRewards
  const totalPendingRewards = pendingEthRewards + pendingEmarkRewards;

  const { mutate: sendTransaction } = useSendTransaction();
  
  // ✅ FIXED: Use "claimRewards" instead of "claimAllRewards"
  const claimRewards = useCallback(async () => {
    if (!hasWalletAccess) {
      const errorMsg = isInFarcaster ? 
        "Please authenticate in Farcaster or connect a wallet" : 
        "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (totalPendingRewards === BigInt(0)) {
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
        console.log('🎁 Pending ETH rewards:', toEther(pendingEthRewards));
        console.log('🎁 Pending EMARK rewards:', toEther(pendingEmarkRewards));
      }
      
      const transaction = prepareContractCall({
        contract: rewardsContract,
        method: "claimRewards", // ✅ Correct method name from contract
        params: [] as const,
      });
      
      return new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
        sendTransaction(transaction, {
          onSuccess: (result: any) => {
            console.log("✅ Rewards claim successful:", result);
            
            // Refetch pending rewards after successful claim
            setTimeout(() => {
              refetch?.();
            }, 2000);
            
            const successMsg = `Successfully claimed rewards! ETH: ${toEther(pendingEthRewards)}, EMARK: ${toEther(pendingEmarkRewards)}`;
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
  }, [effectiveUserAddress, totalPendingRewards, pendingEthRewards, pendingEmarkRewards, rewardsContract, sendTransaction, refetch, hasWalletAccess, isInFarcaster]);
  
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
    // ✅ FIXED: Use actual data from contract response
    pendingRewards: totalPendingRewards,
    pendingEthRewards, // WETH rewards
    pendingEmarkRewards, // EMARK rewards  
    stakedAmount,
    periodEthRewards,
    periodEmarkRewards,
    isLoadingRewards,
    isClaimingRewards,
    error,
    success,
    claimRewards,
    clearMessages,
    refetch,
    authInfo: {
      effectiveUserAddress,
      hasWalletAccess,
      isInFarcaster,
      isFarcasterAuth
    }
  };
}

// ✅ FIXED: Use getPeriodStatus for current period info instead of week-based methods
export function useCurrentPeriodInfo() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: periodStatus, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "getPeriodStatus", // ✅ This method exists in EvermarkRewards
    params: [] as const,
  });
  
  return {
    // ✅ FIXED: Map to actual getPeriodStatus response
    periodStart: periodStatus?.[0] ? Number(periodStatus[0]) : 0,
    periodEnd: periodStatus?.[1] ? Number(periodStatus[1]) : 0,
    timeUntilRebalance: periodStatus?.[2] ? Number(periodStatus[2]) : 0,
    currentEthPool: periodStatus?.[3] || BigInt(0), // currentEthPool (WETH)
    currentEmarkPool: periodStatus?.[4] || BigInt(0), // currentEmarkPool  
    currentEthRate: periodStatus?.[5] || BigInt(0), // currentEthRate
    currentEmarkRate: periodStatus?.[6] || BigInt(0), // currentEmarkRate
    nextEthRate: periodStatus?.[7] || BigInt(0), // nextEthRate
    nextEmarkRate: periodStatus?.[8] || BigInt(0), // nextEmarkRate
    isLoading,
    error
  };
}

// ✅ SIMPLIFIED: Total supply and balance methods that should exist
export function useRewardsStats() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  // Get total staked amount
  const { data: totalStaked } = useReadContract({
    contract: rewardsContract,
    method: "totalSupply", // ✅ This should exist as it tracks staked amounts
    params: [] as const,
  });
  
  return {
    totalStaked: totalStaked || BigInt(0),
    // We can get current pools from getPeriodStatus instead
  };
}

// ✅ NEW: Helper hook to get both current period and user rewards
export function useUserRewardsSummary(userAddress?: string) {
  const rewardsData = useRewards(userAddress);
  const periodData = useCurrentPeriodInfo();
  
  return {
    ...rewardsData,
    ...periodData,
    
    // Calculated fields
    hasRewards: rewardsData.pendingRewards > BigInt(0),
    rewardBreakdown: {
      eth: rewardsData.pendingEthRewards,
      emark: rewardsData.pendingEmarkRewards,
      total: rewardsData.pendingRewards,
    },
    
    // Period info  
    periodProgress: periodData.periodEnd > periodData.periodStart 
      ? ((Date.now() / 1000 - periodData.periodStart) / (periodData.periodEnd - periodData.periodStart)) * 100
      : 0,
      
    timeToNextRebalance: periodData.timeUntilRebalance,
    
    // Formatting helpers
    formatEthRewards: () => toEther(rewardsData.pendingEthRewards),
    formatEmarkRewards: () => toEther(rewardsData.pendingEmarkRewards),
    formatTotalRewards: () => toEther(rewardsData.pendingRewards),
  };
}

// ✅ LEGACY COMPATIBILITY: Keep old week-based hooks but map to period data
export function useCurrentWeek() {
  const periodData = useCurrentPeriodInfo();
  
  // Calculate a "week number" from period start time
  const currentWeek = periodData.periodStart > 0 
    ? Math.floor((periodData.periodStart - 1704067200) / (7 * 24 * 60 * 60)) + 1 // Rough week calculation
    : 0;
  
  return {
    currentWeek,
    isLoading: periodData.isLoading,
    error: periodData.error
  };
}

export function useCurrentWeekInfo() {
  const periodData = useCurrentPeriodInfo();
  
  return {
    week: periodData.periodStart > 0 
      ? Math.floor((periodData.periodStart - 1704067200) / (7 * 24 * 60 * 60)) + 1
      : 0,
    startTime: periodData.periodStart,
    endTime: periodData.periodEnd,
    totalPool: periodData.currentEthPool + periodData.currentEmarkPool,
    timeRemaining: periodData.timeUntilRebalance,
    finalized: false, // Periods are ongoing, not finalized like weeks
    isLoading: periodData.isLoading,
    error: periodData.error
  };
}