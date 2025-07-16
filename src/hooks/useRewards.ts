// ===================================================================
// src/hooks/useRewards.ts - PHASE 3: MEDIUM PRIORITY
// GOAL: Optimize cache usage and coordination
// CHANGES: Better cache refresh coordination, optimistic updates, reduce redundant calls
// ===================================================================

import { useCallback } from "react";
import { CONTRACTS, REWARDS_ABI } from "../lib/contracts";
import { toEther } from "thirdweb/utils";
import { useTransactionUtils } from './core/useTransactionUtils';
import { useUserData } from './core/useUserData';

export function useRewards(userAddress?: string) {
  const { executeTransaction, isProcessing, error, success, clearMessages } = useTransactionUtils();
  const { 
    rewards, 
    refetchRewards, 
    refetch: refetchAllUserData, // ✅ NEW: Get full user data refetch
    hasWallet 
  } = useUserData(userAddress);

  // ✅ ENHANCED: Better cache coordination after claim
  const claimRewards = useCallback(async () => {
    const minimumClaimable = BigInt("1000000000000000"); // 0.001 tokens minimum
    if (rewards.totalRewards < minimumClaimable) {
      throw new Error(`Insufficient rewards to claim. Have: ${toEther(rewards.totalRewards)}, Need: ${toEther(minimumClaimable)}`);
    }

    const ethAmount = toEther(rewards.pendingEthRewards);
    const emarkAmount = toEther(rewards.pendingEmarkRewards);
    
    let successMsg = "Successfully claimed rewards! ";
    if (parseFloat(ethAmount) > 0 && parseFloat(emarkAmount) > 0) {
      successMsg += `ETH: ${ethAmount}, EMARK: ${emarkAmount}`;
    } else if (parseFloat(ethAmount) > 0) {
      successMsg += `${ethAmount} ETH`;
    } else if (parseFloat(emarkAmount) > 0) {
      successMsg += `${emarkAmount} EMARK`;
    } else {
      successMsg += `${toEther(rewards.totalRewards)} tokens`;
    }

    const result = await executeTransaction(
      CONTRACTS.REWARDS,
      REWARDS_ABI,
      "claimRewards",
      [],
      {
        successMessage: successMsg,
        errorContext: {
          operation: 'claimRewards',
          contract: 'REWARDS',
          methodName: 'claimRewards',
          userAddress
        }
      }
    );

    // ✅ ENHANCED: Refresh both rewards and full user data after successful claim
    if (result.success) {
      console.log("🔄 Refreshing user data cache after successful rewards claim");
      setTimeout(() => {
        // Refresh rewards specifically first
        refetchRewards();
        // Then refresh all user data (balances may have changed)
        refetchAllUserData();
      }, 2000);
    }

    return result;
  }, [rewards, executeTransaction, userAddress, refetchRewards, refetchAllUserData]);

  // ✅ NEW: Enhanced refetch that coordinates both rewards and user data
  const refetch = useCallback(async () => {
    console.log("🔄 Manually refreshing all rewards-related data");
    await Promise.all([
      refetchRewards(),
      refetchAllUserData()
    ]);
  }, [refetchRewards, refetchAllUserData]);

  return {
    pendingRewards: rewards.totalRewards,
    pendingEthRewards: rewards.pendingEthRewards,
    pendingEmarkRewards: rewards.pendingEmarkRewards,
    periodEthRewards: rewards.periodEthRewards,
    periodEmarkRewards: rewards.periodEmarkRewards,
    hasClaimableRewards: rewards.hasClaimableRewards,
    
    claimRewards,
    
    isClaimingRewards: isProcessing,
    error,
    success,
    clearMessages,
    
    isLoadingRewards: !hasWallet, 
    refetch, // ✅ NEW: Enhanced refetch function
    
    hasWalletAccess: hasWallet,
    
    formatEthRewards: () => toEther(rewards.pendingEthRewards),
    formatEmarkRewards: () => toEther(rewards.pendingEmarkRewards),
    formatTotalRewards: () => toEther(rewards.totalRewards),
  };
}

export function useCurrentPeriodInfo() {
  const { cycle } = useUserData();
  
  return {
    periodStart: cycle.cycleStartTime,
    periodEnd: cycle.cycleEndTime,
    timeUntilRebalance: cycle.timeRemaining,
    isLoading: false, 
  };
}

export function useCurrentWeek() {
  const { cycle } = useUserData();
  
  const currentWeek = cycle.cycleStartTime > 0 
    ? Math.floor((cycle.cycleStartTime - 1704067200) / (7 * 24 * 60 * 60)) + 1
    : 0;
  
  return {
    currentWeek,
    isLoading: false, 
  };
}

export function useUserRewardsSummary(userAddress?: string) {
  const rewardsData = useRewards(userAddress);
  const periodData = useCurrentPeriodInfo();
  
  return {
    ...rewardsData,
    ...periodData,
    
    hasRewards: rewardsData.pendingRewards > BigInt(0),
    rewardBreakdown: {
      eth: rewardsData.pendingEthRewards,
      emark: rewardsData.pendingEmarkRewards,
      total: rewardsData.pendingRewards,
    },
    
    periodProgress: periodData.periodEnd > periodData.periodStart 
      ? ((Date.now() / 1000 - periodData.periodStart) / (periodData.periodEnd - periodData.periodStart)) * 100
      : 0,
  };
}

