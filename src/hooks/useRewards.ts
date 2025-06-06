import React, { useState, useCallback, useMemo } from "react";
import { useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { encodeFunctionData } from "viem";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, REWARDS_ABI } from "../lib/contracts";
import { useFarcasterUser } from "../lib/farcaster";
import { useWalletAuth, useWalletConnection } from "../providers/WalletProvider"; 
import { toEther } from "thirdweb/utils";

export function useRewards(userAddress?: string) {
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // ✅ CRITICAL FIX: Use unified wallet providers instead of thirdweb directly
  const { address: walletAddress, isConnected, requireConnection } = useWalletAuth();
  const { sendTransaction, walletType } = useWalletConnection();
  
  // Farcaster integration (for backwards compatibility)
  const { isInFarcaster, isAuthenticated: isFarcasterAuth, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();

  // ✅ FIXED: Better address resolution - prioritize wallet provider
  const effectiveUserAddress = userAddress || walletAddress;
  const hasWalletAccess = isConnected; // ✅ Simplified - just check if wallet is connected

  // ✅ FIXED: Reduced logging - only log when there's a change and only in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Rewards Auth State:', {
        userAddress,
        walletAddress: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : null,
        effectiveUserAddress: effectiveUserAddress ? `${effectiveUserAddress.slice(0, 6)}...${effectiveUserAddress.slice(-4)}` : null,
        hasWalletAccess,
        isConnected,
        walletType
      });
    }
  }, [userAddress, walletAddress, effectiveUserAddress, hasWalletAccess, isConnected, walletType]);
  
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  // ✅ Contract reads work the same way
  const { data: userRewardInfo, isLoading: isLoadingRewards, refetch, error: rewardsError } = useReadContract({
    contract: rewardsContract,
    method: "getUserRewardInfo",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });

  // ✅ Extract data from getUserRewardInfo response
  const pendingEthRewards = userRewardInfo?.[0] || BigInt(0);
  const pendingEmarkRewards = userRewardInfo?.[1] || BigInt(0);
  const stakedAmount = userRewardInfo?.[2] || BigInt(0);
  const periodEthRewards = userRewardInfo?.[3] || BigInt(0);
  const periodEmarkRewards = userRewardInfo?.[4] || BigInt(0);
  const totalPendingRewards = pendingEthRewards + pendingEmarkRewards;

  // ✅ CRITICAL FIX: Use unified wallet provider instead of thirdweb directly
  const claimRewards = useCallback(async () => {
    console.log('🎁 Starting claim rewards process...');
    
    // ✅ Use unified connection check
    if (!hasWalletAccess) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
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
      console.log('🎁 Claiming rewards for:', effectiveUserAddress);
      console.log('🎁 Pending ETH rewards:', toEther(pendingEthRewards));
      console.log('🎁 Pending EMARK rewards:', toEther(pendingEmarkRewards));
      console.log('🔧 Using wallet type:', walletType);
      
      // ✅ CRITICAL FIX: Prepare transaction based on wallet type
      let transaction;
      
      if (walletType === 'farcaster') {
        // Use viem encoding for Farcaster frames
        const data = encodeFunctionData({
          abi: REWARDS_ABI,
          functionName: 'claimRewards',
          args: []
        });
        
        transaction = {
          to: CONTRACTS.REWARDS as `0x${string}`,
          data,
        };
      } else {
        // Use thirdweb for desktop
        transaction = prepareContractCall({
          contract: rewardsContract,
          method: "claimRewards",
          params: [] as const,
        });
      }
      
      console.log('📡 Sending transaction via unified provider...');
      
      // ✅ Use unified wallet provider's sendTransaction
      const result = await sendTransaction(transaction);
      
      if (result.success) {
        console.log("✅ Rewards claim successful:", result.transactionHash);
        
        // Refetch pending rewards after successful claim
        setTimeout(() => {
          refetch?.();
        }, 2000);
        
        const successMsg = `Successfully claimed rewards! ETH: ${toEther(pendingEthRewards)}, EMARK: ${toEther(pendingEmarkRewards)}`;
        setSuccess(successMsg);
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ Rewards claim failed:", err);
      
      let errorMsg = "Failed to claim rewards";
      if (err.message?.includes('user rejected')) {
        errorMsg = "Transaction was rejected by user";
      } else if (err.message?.includes('insufficient funds')) {
        errorMsg = "Insufficient ETH for gas fees";
      } else if (err.message?.includes('execution reverted')) {
        errorMsg = "Transaction reverted - no rewards available or already claimed";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsClaimingRewards(false);
    }
  }, [
    hasWalletAccess, 
    requireConnection, 
    totalPendingRewards, 
    effectiveUserAddress, 
    pendingEthRewards, 
    pendingEmarkRewards, 
    walletType,
    rewardsContract, 
    sendTransaction, 
    refetch
  ]);
  
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
    // Rewards data
    pendingRewards: totalPendingRewards,
    pendingEthRewards,
    pendingEmarkRewards,  
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
    
    // ✅ Updated auth info using unified provider
    authInfo: {
      effectiveUserAddress,
      hasWalletAccess,
      isInFarcaster,
      isFarcasterAuth,
      walletType, // ✅ Add wallet type for debugging
      isConnected
    }
  };
}

// ✅ Other hooks remain the same since they only do reads
export function useCurrentPeriodInfo() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: periodStatus, isLoading, error } = useReadContract({
    contract: rewardsContract,
    method: "getPeriodStatus",
    params: [] as const,
  });
  
  return {
    periodStart: periodStatus?.[0] ? Number(periodStatus[0]) : 0,
    periodEnd: periodStatus?.[1] ? Number(periodStatus[1]) : 0,
    timeUntilRebalance: periodStatus?.[2] ? Number(periodStatus[2]) : 0,
    currentEthPool: periodStatus?.[3] || BigInt(0),
    currentEmarkPool: periodStatus?.[4] || BigInt(0),
    currentEthRate: periodStatus?.[5] || BigInt(0),
    currentEmarkRate: periodStatus?.[6] || BigInt(0),
    nextEthRate: periodStatus?.[7] || BigInt(0),
    nextEmarkRate: periodStatus?.[8] || BigInt(0),
    isLoading,
    error
  };
}

export function useRewardsStats() {
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  const { data: totalStaked } = useReadContract({
    contract: rewardsContract,
    method: "totalSupply",
    params: [] as const,
  });
  
  return {
    totalStaked: totalStaked || BigInt(0),
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
      
    timeToNextRebalance: periodData.timeUntilRebalance,
    
    formatEthRewards: () => toEther(rewardsData.pendingEthRewards),
    formatEmarkRewards: () => toEther(rewardsData.pendingEmarkRewards),
    formatTotalRewards: () => toEther(rewardsData.pendingRewards),
  };
}

export function useCurrentWeek() {
  const periodData = useCurrentPeriodInfo();
  
  const currentWeek = periodData.periodStart > 0 
    ? Math.floor((periodData.periodStart - 1704067200) / (7 * 24 * 60 * 60)) + 1
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
    finalized: false,
    isLoading: periodData.isLoading,
    error: periodData.error
  };
}