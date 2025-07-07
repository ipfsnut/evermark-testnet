// src/hooks/core/useUserData.ts - Consolidated user queries
import { useMemo } from 'react';
import { useReadContract } from "thirdweb/react";
import { useContracts } from './useContracts';

export interface UserTokenBalances {
  emarkBalance: bigint;
  wEmarkBalance: bigint;
  stakingAllowance: bigint;
}

export interface UserVotingData {
  availableVotingPower: bigint;
  totalVotingPower: bigint;
  delegatedPower: bigint;
  stakedBalance: bigint;
}

export interface UserUnbondingData {
  unbondingAmount: bigint;
  unbondingReleaseTime: bigint;
  canClaimUnbonding: boolean;
}

export interface UserCycleData {
  currentCycle: number;
  timeRemaining: number;
}

export interface UserRewardsData {
  pendingEthRewards: bigint;
  pendingEmarkRewards: bigint;
  periodEthRewards: bigint;
  periodEmarkRewards: bigint;
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
  
  // Refresh functions
  refetch: () => void;
  refetchBalances: () => void;
  refetchVoting: () => void;
  refetchUnbonding: () => void;
  refetchRewards: () => void;
}

/**
 * Consolidated user data hook - single source of truth for user-related queries
 * Eliminates redundant data fetching across multiple hooks
 */
export function useUserData(userAddress?: string): UserDataState {
  const { cardCatalog, emarkToken, voting, evermarkRewards } = useContracts();
  
  // Normalize user address
  const effectiveUserAddress = userAddress || "0x0000000000000000000000000000000000000000";
  const hasValidAddress = !!userAddress;

  // Token Balances Queries
  const { data: emarkBalance, isLoading: isLoadingEmarkBalance, refetch: refetchEmarkBalance } = useReadContract({
    contract: emarkToken,
    method: "balanceOf",
    params: [effectiveUserAddress],
    queryOptions: { enabled: hasValidAddress },
  });

  const { data: stakingAllowance, refetch: refetchStakingAllowance } = useReadContract({
    contract: emarkToken,
    method: "allowance",
    params: [effectiveUserAddress, cardCatalog.address],
    queryOptions: { enabled: hasValidAddress },
  });

  // CardCatalog Queries - User Summary (most comprehensive)
  const { 
    data: userSummary, 
    isLoading: isLoadingUserSummary, 
    refetch: refetchUserSummary 
  } = useReadContract({
    contract: cardCatalog,
    method: "getUserSummary",
    params: [effectiveUserAddress],
    queryOptions: { enabled: hasValidAddress },
  });

  // Individual CardCatalog queries for additional data
  const { data: availableVotingPower, refetch: refetchAvailableVoting } = useReadContract({
    contract: cardCatalog,
    method: "getAvailableVotingPower",
    params: [effectiveUserAddress],
    queryOptions: { enabled: hasValidAddress },
  });

  const { data: totalVotingPower, refetch: refetchTotalVoting } = useReadContract({
    contract: cardCatalog,
    method: "getTotalVotingPower",
    params: [effectiveUserAddress],
    queryOptions: { enabled: hasValidAddress },
  });

  // Cycle Information
  const { data: currentCycle, isLoading: isLoadingCycle, refetch: refetchCurrentCycle } = useReadContract({
    contract: voting,
    method: "getCurrentCycle",
    params: [],
  });

  const { data: timeRemaining, refetch: refetchTimeRemaining } = useReadContract({
    contract: voting,
    method: "getTimeRemainingInCurrentCycle",
    params: [],
  });

  // Rewards Information
  const { 
    data: userRewardInfo, 
    isLoading: isLoadingRewards, 
    refetch: refetchUserRewards 
  } = useReadContract({
    contract: evermarkRewards,
    method: "getUserRewardInfo",
    params: [effectiveUserAddress],
    queryOptions: { enabled: hasValidAddress },
  });

  // Parse and structure the data
  const userData = useMemo((): UserDataState => {
    // Parse userSummary tuple: [stakedBalance, availableVotingPower, delegatedPower, unbondingAmount_, unbondingReleaseTime_, canClaimUnbonding]
    const stakedBalance = userSummary?.[0] || BigInt(0);
    const summaryAvailableVoting = userSummary?.[1] || BigInt(0);
    const delegatedPower = userSummary?.[2] || BigInt(0);
    const unbondingAmount = userSummary?.[3] || BigInt(0);
    const unbondingReleaseTime = userSummary?.[4] || BigInt(0);
    const canClaimUnbonding = userSummary?.[5] || false;

    // Parse userRewardInfo tuple: [pendingEth, pendingEmark, stakedAmount, periodEth, periodEmark]
    const pendingEthRewards = userRewardInfo?.[0] || BigInt(0);
    const pendingEmarkRewards = userRewardInfo?.[1] || BigInt(0);
    const periodEthRewards = userRewardInfo?.[3] || BigInt(0);
    const periodEmarkRewards = userRewardInfo?.[4] || BigInt(0);

    // Use individual queries as fallback for voting power
    const effectiveAvailableVoting = availableVotingPower || summaryAvailableVoting;
    const effectiveTotalVoting = totalVotingPower || stakedBalance;

    // Loading states
    const isLoadingBalances = isLoadingEmarkBalance;
    const isLoadingVoting = isLoadingUserSummary;
    const isLoadingUnbonding = isLoadingUserSummary;
    const isLoading = isLoadingBalances || isLoadingVoting || isLoadingCycle || isLoadingRewards;

    return {
      balances: {
        emarkBalance: emarkBalance || BigInt(0),
        wEmarkBalance: stakedBalance,
        stakingAllowance: stakingAllowance || BigInt(0),
      },
      
      voting: {
        availableVotingPower: effectiveAvailableVoting,
        totalVotingPower: effectiveTotalVoting,
        delegatedPower,
        stakedBalance,
      },
      
      unbonding: {
        unbondingAmount,
        unbondingReleaseTime,
        canClaimUnbonding,
      },
      
      cycle: {
        currentCycle: currentCycle ? Number(currentCycle) : 0,
        timeRemaining: timeRemaining ? Number(timeRemaining) : 0,
      },
      
      rewards: {
        pendingEthRewards,
        pendingEmarkRewards,
        periodEthRewards,
        periodEmarkRewards,
      },
      
      // Loading states
      isLoading,
      isLoadingBalances,
      isLoadingVoting,
      isLoadingUnbonding,
      isLoadingCycle,
      isLoadingRewards,
      
      // Error state (basic)
      error: null, // Could be enhanced with error aggregation
      
      // Refresh functions
      refetch: () => {
        refetchEmarkBalance();
        refetchUserSummary();
        refetchCurrentCycle();
        refetchUserRewards();
        refetchAvailableVoting();
        refetchTotalVoting();
        refetchTimeRemaining();
      },
      
      refetchBalances: () => {
        refetchEmarkBalance();
        refetchStakingAllowance();
      },
      
      refetchVoting: () => {
        refetchUserSummary();
        refetchAvailableVoting();
        refetchTotalVoting();
      },
      
      refetchUnbonding: () => {
        refetchUserSummary();
      },
      
      refetchRewards: () => {
        refetchUserRewards();
      },
    };
  }, [
    // Dependencies for memoization
    userSummary,
    emarkBalance,
    stakingAllowance,
    availableVotingPower,
    totalVotingPower,
    currentCycle,
    timeRemaining,
    userRewardInfo,
    isLoadingEmarkBalance,
    isLoadingUserSummary,
    isLoadingCycle,
    isLoadingRewards,
    // Refetch functions
    refetchEmarkBalance,
    refetchStakingAllowance,
    refetchUserSummary,
    refetchAvailableVoting,
    refetchTotalVoting,
    refetchCurrentCycle,
    refetchTimeRemaining,
    refetchUserRewards,
  ]);

  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && hasValidAddress) {
    console.log('📊 UserData state:', {
      userAddress: userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : null,
      balances: {
        emark: userData.balances.emarkBalance.toString(),
        wEmark: userData.balances.wEmarkBalance.toString(),
      },
      voting: {
        available: userData.voting.availableVotingPower.toString(),
        total: userData.voting.totalVotingPower.toString(),
        delegated: userData.voting.delegatedPower.toString(),
      },
      cycle: userData.cycle.currentCycle,
      isLoading: userData.isLoading,
    });
  }

  return userData;
}

/**
 * Get only token balances (lighter query)
 */
export function useUserBalances(userAddress?: string): UserTokenBalances & { isLoading: boolean; refetch: () => void } {
  const { balances, isLoadingBalances, refetchBalances } = useUserData(userAddress);
  
  return {
    ...balances,
    isLoading: isLoadingBalances,
    refetch: refetchBalances,
  };
}

/**
 * Get only voting data (lighter query)
 */
export function useUserVoting(userAddress?: string): UserVotingData & { isLoading: boolean; refetch: () => void } {
  const { voting, isLoadingVoting, refetchVoting } = useUserData(userAddress);
  
  return {
    ...voting,
    isLoading: isLoadingVoting,
    refetch: refetchVoting,
  };
}

/**
 * Get only cycle data (no user address needed)
 */
export function useCycleData(): UserCycleData & { isLoading: boolean } {
  const { cycle, isLoadingCycle } = useUserData();
  
  return {
    ...cycle,
    isLoading: isLoadingCycle,
  };
}