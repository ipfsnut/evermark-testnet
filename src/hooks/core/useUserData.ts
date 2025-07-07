// src/hooks/core/useUserData.ts - Enhanced consolidated user queries with better error handling
import { useMemo, useCallback } from 'react';
import { useReadContract } from "thirdweb/react";
import { useContracts } from './useContracts';
import { useContractErrors } from './useContractErrors';

export interface UserTokenBalances {
  emarkBalance: bigint;
  wEmarkBalance: bigint;
  stakingAllowance: bigint;
  totalStaked: bigint;
}

export interface UserVotingData {
  availableVotingPower: bigint;
  totalVotingPower: bigint;
  delegatedPower: bigint;
  stakedBalance: bigint;
  reservedPower: bigint;
}

export interface UserUnbondingData {
  unbondingAmount: bigint;
  unbondingReleaseTime: bigint;
  canClaimUnbonding: boolean;
  timeUntilRelease: number;
  isUnbonding: boolean;
}

export interface UserCycleData {
  currentCycle: number;
  timeRemaining: number;
  cycleStartTime: number;
  cycleEndTime: number;
  isCycleActive: boolean;
}

export interface UserRewardsData {
  pendingEthRewards: bigint;
  pendingEmarkRewards: bigint;
  periodEthRewards: bigint;
  periodEmarkRewards: bigint;
  totalRewards: bigint;
  hasClaimableRewards: boolean;
}

export interface UserDataState {
  // Token balances
  balances: UserTokenBalances;
  
  // Voting and staking data
  voting: UserVotingData;
  
  // Unbonding data
  unbonding: UserUnbondingData;
  
  // Cycle information
  cycle: UserCycleData;
  
  // Rewards data
  rewards: UserRewardsData;
  
  // Loading states
  isLoading: boolean;
  isLoadingBalances: boolean;
  isLoadingVoting: boolean;
  isLoadingUnbonding: boolean;
  isLoadingCycle: boolean;
  isLoadingRewards: boolean;
  
  // Error states
  error: string | null;
  balancesError: string | null;
  votingError: string | null;
  unbondingError: string | null;
  cycleError: string | null;
  rewardsError: string | null;
  
  // Refresh functions
  refetch: () => void;
  refetchBalances: () => void;
  refetchVoting: () => void;
  refetchUnbonding: () => void;
  refetchRewards: () => void;
  refetchCycle: () => void;
  
  // Utility functions
  hasWallet: boolean;
  isFullyLoaded: boolean;
  lastUpdated: number;
}

/**
 * Enhanced consolidated user data hook with better error handling and performance
 * Single source of truth for all user-related blockchain data
 */
export function useUserData(userAddress?: string): UserDataState {
  const { cardCatalog, emarkToken, voting, evermarkRewards } = useContracts();
  const { parseError } = useContractErrors();
  
  // Normalize user address
  const effectiveUserAddress = userAddress || "0x0000000000000000000000000000000000000000";
  const hasValidAddress = !!userAddress;

  // Token Balances Queries - Fixed with correct ThirdWeb v5 syntax
  const { 
    data: emarkBalance, 
    isLoading: isLoadingEmarkBalance, 
    error: emarkBalanceError,
    refetch: refetchEmarkBalance 
  } = useReadContract({
    contract: emarkToken,
    method: "balanceOf",
    params: [effectiveUserAddress] as const,
    queryOptions: { 
      enabled: hasValidAddress,
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
    },
  });

  const { 
    data: stakingAllowance, 
    error: stakingAllowanceError,
    refetch: refetchStakingAllowance 
  } = useReadContract({
    contract: emarkToken,
    method: "allowance",
    params: [effectiveUserAddress, cardCatalog.address] as const,
    queryOptions: { 
      enabled: hasValidAddress,
      staleTime: 30000,
    },
  });

  // CardCatalog Queries - Fixed with correct ThirdWeb v5 syntax and method names
  const { 
    data: userSummary, 
    isLoading: isLoadingUserSummary, 
    error: userSummaryError,
    refetch: refetchUserSummary 
  } = useReadContract({
    contract: cardCatalog,
    method: "getUserSummary",
    params: [effectiveUserAddress] as const,
    queryOptions: { 
      enabled: hasValidAddress,
      staleTime: 15000, // 15 seconds for more frequent updates
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Individual CardCatalog queries for fallback data
  const { 
    data: availableVotingPower, 
    error: availableVotingError,
    refetch: refetchAvailableVoting 
  } = useReadContract({
    contract: cardCatalog,
    method: "getAvailableVotingPower",
    params: [effectiveUserAddress] as const,
    queryOptions: { 
      enabled: hasValidAddress,
      staleTime: 15000,
    },
  });

  const { 
    data: totalVotingPower, 
    error: totalVotingError,
    refetch: refetchTotalVoting 
  } = useReadContract({
    contract: cardCatalog,
    method: "getTotalVotingPower",
    params: [effectiveUserAddress] as const,
    queryOptions: { 
      enabled: hasValidAddress,
      staleTime: 15000,
    },
  });

  // Unbonding Information
  const { 
    data: unbondingInfo, 
    isLoading: isLoadingUnbonding,
    error: unbondingInfoError,
    refetch: refetchUnbondingInfo 
  } = useReadContract({
    contract: cardCatalog,
    method: "getUnbondingInfo",
    params: [effectiveUserAddress] as const,
    queryOptions: { 
      enabled: hasValidAddress,
      staleTime: 30000,
    },
  });

  // Cycle Information - Fixed with correct ThirdWeb v5 syntax
  const { 
    data: currentCycle, 
    isLoading: isLoadingCycle, 
    error: currentCycleError,
    refetch: refetchCurrentCycle 
  } = useReadContract({
    contract: voting,
    method: "getCurrentCycle",
    params: [] as const,
    queryOptions: {
      staleTime: 60000, // 1 minute
      refetchInterval: 120000, // 2 minutes
    },
  });

  const { 
    data: timeRemaining, 
    error: timeRemainingError,
    refetch: refetchTimeRemaining 
  } = useReadContract({
    contract: voting,
    method: "getTimeRemainingInCurrentCycle",
    params: [] as const,
    queryOptions: {
      staleTime: 30000,
      refetchInterval: 60000,
    },
  });

  const { 
    data: cycleInfo,
    error: cycleInfoError,
    refetch: refetchCycleInfo
  } = useReadContract({
    contract: voting,
    method: "getCycleInfo",
    params: [currentCycle || BigInt(1)] as const,
    queryOptions: {
      enabled: !!currentCycle,
      staleTime: 60000,
    },
  });

  // Rewards Information - Fixed with correct ThirdWeb v5 syntax
  const { 
    data: userRewardInfo, 
    isLoading: isLoadingRewards, 
    error: userRewardError,
    refetch: refetchUserRewards 
  } = useReadContract({
    contract: evermarkRewards,
    method: "getUserRewardInfo",
    params: [effectiveUserAddress] as const,
    queryOptions: { 
      enabled: hasValidAddress,
      staleTime: 30000,
      refetchInterval: 60000,
    },
  });

  // Enhanced refetch functions
  const refetchBalances = useCallback(() => {
    refetchEmarkBalance();
    refetchStakingAllowance();
  }, [refetchEmarkBalance, refetchStakingAllowance]);

  const refetchVoting = useCallback(() => {
    refetchUserSummary();
    refetchAvailableVoting();
    refetchTotalVoting();
  }, [refetchUserSummary, refetchAvailableVoting, refetchTotalVoting]);

  const refetchUnbonding = useCallback(() => {
    refetchUserSummary();
    refetchUnbondingInfo();
  }, [refetchUserSummary, refetchUnbondingInfo]);

  const refetchCycle = useCallback(() => {
    refetchCurrentCycle();
    refetchTimeRemaining();
    refetchCycleInfo();
  }, [refetchCurrentCycle, refetchTimeRemaining, refetchCycleInfo]);

  const refetch = useCallback(() => {
    refetchBalances();
    refetchVoting();
    refetchUnbonding();
    refetchCycle();
    refetchUserRewards();
  }, [refetchBalances, refetchVoting, refetchUnbonding, refetchCycle, refetchUserRewards]);

  // Parse and structure the data with enhanced error handling
  const userData = useMemo((): UserDataState => {
    // Parse userSummary tuple safely: [stakedBalance, availableVotingPower, delegatedPower, unbondingAmount_, unbondingReleaseTime_, canClaimUnbonding]
    const stakedBalance = userSummary?.[0] || BigInt(0);
    const summaryAvailableVoting = userSummary?.[1] || BigInt(0);
    const delegatedPower = userSummary?.[2] || BigInt(0);
    const summaryUnbondingAmount = userSummary?.[3] || BigInt(0);
    const summaryUnbondingReleaseTime = userSummary?.[4] || BigInt(0);
    const summaryCanClaimUnbonding = userSummary?.[5] || false;

    // Parse unbondingInfo tuple safely: [amount, releaseTime, canClaim]
    const unbondingAmount = unbondingInfo?.[0] || summaryUnbondingAmount;
    const unbondingReleaseTime = unbondingInfo?.[1] || summaryUnbondingReleaseTime;
    const canClaimUnbonding = unbondingInfo?.[2] ?? summaryCanClaimUnbonding;

    // Parse userRewardInfo tuple safely: [pendingEth, pendingEmark, stakedAmount, periodEth, periodEmark]
    const pendingEthRewards = userRewardInfo?.[0] || BigInt(0);
    const pendingEmarkRewards = userRewardInfo?.[1] || BigInt(0);
    const rewardsStakedAmount = userRewardInfo?.[2] || BigInt(0);
    const periodEthRewards = userRewardInfo?.[3] || BigInt(0);
    const periodEmarkRewards = userRewardInfo?.[4] || BigInt(0);

    // Use individual queries as fallback for voting power
    const effectiveAvailableVoting = availableVotingPower || summaryAvailableVoting;
    const effectiveTotalVoting = totalVotingPower || stakedBalance;

    // Calculate derived values
    const totalRewards = pendingEthRewards + pendingEmarkRewards;
    const hasClaimableRewards = totalRewards > BigInt(0);
    
    // Unbonding calculations
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilRelease = Math.max(0, Number(unbondingReleaseTime) - currentTime);
    const isUnbonding = unbondingAmount > BigInt(0);

    // Cycle calculations
    const cycleStart = cycleInfo?.[0] ? Number(cycleInfo[0]) : 0;
    const cycleEnd = cycleInfo?.[1] ? Number(cycleInfo[1]) : 0;
    const isCycleActive = currentTime >= cycleStart && currentTime <= cycleEnd;

    // Loading states
    const isLoadingBalances = isLoadingEmarkBalance;
    const isLoadingVoting = isLoadingUserSummary;
    const isLoading = isLoadingBalances || isLoadingVoting || isLoadingCycle || isLoadingRewards || isLoadingUnbonding;

    // Error parsing with user-friendly messages
    const parseContractError = (error: any, context: string) => {
      if (!error) return null;
      const parsed = parseError(error, { operation: context, userAddress });
      return parsed.message;
    };

    const balancesError = parseContractError(emarkBalanceError || stakingAllowanceError, "fetch balances");
    const votingError = parseContractError(userSummaryError || availableVotingError || totalVotingError, "fetch voting data");
    const unbondingError = parseContractError(unbondingInfoError, "fetch unbonding data");
    const cycleError = parseContractError(currentCycleError || timeRemainingError || cycleInfoError, "fetch cycle data");
    const rewardsError = parseContractError(userRewardError, "fetch rewards data");
    
    const generalError = balancesError || votingError || unbondingError || cycleError || rewardsError;

    return {
      balances: {
        emarkBalance: emarkBalance || BigInt(0),
        wEmarkBalance: stakedBalance,
        stakingAllowance: stakingAllowance || BigInt(0),
        totalStaked: stakedBalance,
      },
      
      voting: {
        availableVotingPower: effectiveAvailableVoting,
        totalVotingPower: effectiveTotalVoting,
        delegatedPower,
        stakedBalance,
        reservedPower: effectiveTotalVoting - effectiveAvailableVoting,
      },
      
      unbonding: {
        unbondingAmount,
        unbondingReleaseTime,
        canClaimUnbonding,
        timeUntilRelease,
        isUnbonding,
      },
      
      cycle: {
        currentCycle: currentCycle ? Number(currentCycle) : 0,
        timeRemaining: timeRemaining ? Number(timeRemaining) : 0,
        cycleStartTime: cycleStart,
        cycleEndTime: cycleEnd,
        isCycleActive,
      },
      
      rewards: {
        pendingEthRewards,
        pendingEmarkRewards,
        periodEthRewards,
        periodEmarkRewards,
        totalRewards,
        hasClaimableRewards,
      },
      
      // Loading states
      isLoading,
      isLoadingBalances,
      isLoadingVoting,
      isLoadingUnbonding,
      isLoadingCycle,
      isLoadingRewards,
      
      // Error states
      error: generalError,
      balancesError,
      votingError,
      unbondingError,
      cycleError,
      rewardsError,
      
      // Refresh functions
      refetch,
      refetchBalances,
      refetchVoting,
      refetchUnbonding,
      refetchRewards: refetchUserRewards,
      refetchCycle,
      
      // Utility properties
      hasWallet: hasValidAddress,
      isFullyLoaded: !isLoading && !generalError,
      lastUpdated: Date.now(),
    };
  }, [
    // Dependencies for memoization
    userSummary,
    emarkBalance,
    stakingAllowance,
    availableVotingPower,
    totalVotingPower,
    unbondingInfo,
    currentCycle,
    timeRemaining,
    cycleInfo,
    userRewardInfo,
    isLoadingEmarkBalance,
    isLoadingUserSummary,
    isLoadingCycle,
    isLoadingRewards,
    isLoadingUnbonding,
    // Error states
    emarkBalanceError,
    stakingAllowanceError,
    userSummaryError,
    availableVotingError,
    totalVotingError,
    unbondingInfoError,
    currentCycleError,
    timeRemainingError,
    cycleInfoError,
    userRewardError,
    // Refetch functions
    refetch,
    refetchBalances,
    refetchVoting,
    refetchUnbonding,
    refetchUserRewards,
    refetchCycle,
    // Utility
    hasValidAddress,
    userAddress,
    parseError,
  ]);

  // Enhanced debug logging
  if (process.env.NODE_ENV === 'development' && hasValidAddress) {
    console.log('📊 UserData state:', {
      userAddress: userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : null,
      balances: {
        emark: userData.balances.emarkBalance.toString(),
        wEmark: userData.balances.wEmarkBalance.toString(),
        allowance: userData.balances.stakingAllowance.toString(),
      },
      voting: {
        available: userData.voting.availableVotingPower.toString(),
        total: userData.voting.totalVotingPower.toString(),
        delegated: userData.voting.delegatedPower.toString(),
        reserved: userData.voting.reservedPower.toString(),
      },
      unbonding: {
        amount: userData.unbonding.unbondingAmount.toString(),
        timeUntilRelease: userData.unbonding.timeUntilRelease,
        canClaim: userData.unbonding.canClaimUnbonding,
      },
      rewards: {
        totalRewards: userData.rewards.totalRewards.toString(),
        hasClaimable: userData.rewards.hasClaimableRewards,
      },
      cycle: userData.cycle.currentCycle,
      isLoading: userData.isLoading,
      errors: {
        general: userData.error,
        balances: userData.balancesError,
        voting: userData.votingError,
        unbonding: userData.unbondingError,
        cycle: userData.cycleError,
        rewards: userData.rewardsError,
      }
    });
  }

  return userData;
}

/**
 * Get only token balances (lighter query for performance)
 */
export function useUserBalances(userAddress?: string): UserTokenBalances & { 
  isLoading: boolean; 
  error: string | null;
  refetch: () => void; 
} {
  const { balances, isLoadingBalances, balancesError, refetchBalances } = useUserData(userAddress);
  
  return {
    ...balances,
    isLoading: isLoadingBalances,
    error: balancesError,
    refetch: refetchBalances,
  };
}

/**
 * Get only voting data (lighter query for performance)
 */
export function useUserVoting(userAddress?: string): UserVotingData & { 
  isLoading: boolean; 
  error: string | null;
  refetch: () => void; 
} {
  const { voting, isLoadingVoting, votingError, refetchVoting } = useUserData(userAddress);
  
  return {
    ...voting,
    isLoading: isLoadingVoting,
    error: votingError,
    refetch: refetchVoting,
  };
}

/**
 * Get only cycle data (no user address needed)
 */
export function useCycleData(): UserCycleData & { 
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { cycle, isLoadingCycle, cycleError, refetchCycle } = useUserData();
  
  return {
    ...cycle,
    isLoading: isLoadingCycle,
    error: cycleError,
    refetch: refetchCycle,
  };
}

/**
 * Get user data summary for quick overview
 */
export function useUserSummary(userAddress?: string) {
  const userData = useUserData(userAddress);
  
  return useMemo(() => ({
    hasWallet: userData.hasWallet,
    isLoading: userData.isLoading,
    hasError: !!userData.error,
    
    // Quick stats
    totalStaked: userData.balances.wEmarkBalance,
    totalRewards: userData.rewards.totalRewards,
    availableVotingPower: userData.voting.availableVotingPower,
    isUnbonding: userData.unbonding.isUnbonding,
    
    // Status flags
    canStake: userData.balances.emarkBalance > BigInt(0),
    canVote: userData.voting.availableVotingPower > BigInt(0),
    canClaim: userData.rewards.hasClaimableRewards,
    canUnwrap: userData.unbonding.canClaimUnbonding,
    
    // Refresh function
    refresh: userData.refetch,
  }), [userData]);
}