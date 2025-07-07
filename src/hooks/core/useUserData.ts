// src/hooks/core/useUserData.ts - Fixed ThirdWeb v5 query options
import { useMemo, useCallback } from 'react';
import { useReadContract, useActiveAccount } from "thirdweb/react";
import { readContract } from "thirdweb";
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
 * Enhanced consolidated user data hook with optimized queries
 * Single source of truth for all user-related blockchain data
 */
export function useUserData(userAddress?: string): UserDataState {
  const { cardCatalog, emarkToken, voting, evermarkRewards } = useContracts();
  const { parseError } = useContractErrors();
  const activeAccount = useActiveAccount();
  
  // Use provided address or active account address
  const effectiveUserAddress = userAddress || activeAccount?.address;
  const hasValidAddress = !!effectiveUserAddress;

  // Token Balances Queries - Only valid ThirdWeb v5 queryOptions
  const emarkBalanceQuery = useReadContract(
    hasValidAddress
      ? {
          contract: emarkToken,
          method: "function balanceOf(address) view returns (uint256)",
          params: [effectiveUserAddress],
        }
      : {
          contract: emarkToken,
          method: "function balanceOf(address) view returns (uint256)",
          params: ["0x0000000000000000000000000000000000000000"],
          queryOptions: {
            enabled: false,
          },
        }
  );

  const stakingAllowanceQuery = useReadContract(
    hasValidAddress
      ? {
          contract: emarkToken,
          method: "function allowance(address,address) view returns (uint256)",
          params: [effectiveUserAddress, cardCatalog.address],
        }
      : {
          contract: emarkToken,
          method: "function allowance(address,address) view returns (uint256)",
          params: ["0x0000000000000000000000000000000000000000", cardCatalog.address],
          queryOptions: {
            enabled: false,
          },
        }
  );

  // CardCatalog Queries
  const userSummaryQuery = useReadContract(
    hasValidAddress
      ? {
          contract: cardCatalog,
          method: "function getUserSummary(address) view returns (uint256,uint256,uint256,uint256,uint256,bool)",
          params: [effectiveUserAddress],
        }
      : {
          contract: cardCatalog,
          method: "function getUserSummary(address) view returns (uint256,uint256,uint256,uint256,uint256,bool)",
          params: ["0x0000000000000000000000000000000000000000"],
          queryOptions: {
            enabled: false,
          },
        }
  );

  const availableVotingPowerQuery = useReadContract(
    hasValidAddress
      ? {
          contract: cardCatalog,
          method: "function getAvailableVotingPower(address) view returns (uint256)",
          params: [effectiveUserAddress],
        }
      : {
          contract: cardCatalog,
          method: "function getAvailableVotingPower(address) view returns (uint256)",
          params: ["0x0000000000000000000000000000000000000000"],
          queryOptions: {
            enabled: false,
          },
        }
  );

  const totalVotingPowerQuery = useReadContract(
    hasValidAddress
      ? {
          contract: cardCatalog,
          method: "function getTotalVotingPower(address) view returns (uint256)",
          params: [effectiveUserAddress],
        }
      : {
          contract: cardCatalog,
          method: "function getTotalVotingPower(address) view returns (uint256)",
          params: ["0x0000000000000000000000000000000000000000"],
          queryOptions: {
            enabled: false,
          },
        }
  );

  // Unbonding Information
  const unbondingInfoQuery = useReadContract(
    hasValidAddress
      ? {
          contract: cardCatalog,
          method: "function getUnbondingInfo(address) view returns (uint256,uint256,bool)",
          params: [effectiveUserAddress],
        }
      : {
          contract: cardCatalog,
          method: "function getUnbondingInfo(address) view returns (uint256,uint256,bool)",
          params: ["0x0000000000000000000000000000000000000000"],
          queryOptions: {
            enabled: false,
          },
        }
  );

  // Cycle Information - No user address needed
  const currentCycleQuery = useReadContract({
    contract: voting,
    method: "function getCurrentCycle() view returns (uint256)",
    params: [],
  });

  const timeRemainingQuery = useReadContract({
    contract: voting,
    method: "function getTimeRemainingInCurrentCycle() view returns (uint256)",
    params: [],
  });

  const cycleInfoQuery = useReadContract({
    contract: voting,
    method: "function getCycleInfo(uint256) view returns (uint256,uint256,uint256,uint256,bool,uint256)",
    params: [currentCycleQuery.data || BigInt(1)],
    queryOptions: {
      enabled: !!currentCycleQuery.data,
    },
  });

  // Rewards Information
  const userRewardInfoQuery = useReadContract(
    hasValidAddress
      ? {
          contract: evermarkRewards,
          method: "function getUserRewardInfo(address) view returns (uint256,uint256,uint256,uint256,uint256)",
          params: [effectiveUserAddress],
        }
      : {
          contract: evermarkRewards,
          method: "function getUserRewardInfo(address) view returns (uint256,uint256,uint256,uint256,uint256)",
          params: ["0x0000000000000000000000000000000000000000"],
          queryOptions: {
            enabled: false,
          },
        }
  );

  // Extract data and functions from query objects
  const {
    data: emarkBalance,
    isLoading: isLoadingEmarkBalance,
    error: emarkBalanceError,
    refetch: refetchEmarkBalance
  } = emarkBalanceQuery;

  const {
    data: stakingAllowance,
    error: stakingAllowanceError,
    refetch: refetchStakingAllowance
  } = stakingAllowanceQuery;

  const {
    data: userSummary,
    isLoading: isLoadingUserSummary,
    error: userSummaryError,
    refetch: refetchUserSummary
  } = userSummaryQuery;

  const {
    data: availableVotingPower,
    error: availableVotingError,
    refetch: refetchAvailableVoting
  } = availableVotingPowerQuery;

  const {
    data: totalVotingPower,
    error: totalVotingError,
    refetch: refetchTotalVoting
  } = totalVotingPowerQuery;

  const {
    data: unbondingInfo,
    isLoading: isLoadingUnbonding,
    error: unbondingInfoError,
    refetch: refetchUnbondingInfo
  } = unbondingInfoQuery;

  const {
    data: currentCycle,
    isLoading: isLoadingCycle,
    error: currentCycleError,
    refetch: refetchCurrentCycle
  } = currentCycleQuery;

  const {
    data: timeRemaining,
    error: timeRemainingError,
    refetch: refetchTimeRemaining
  } = timeRemainingQuery;

  const {
    data: cycleInfo,
    error: cycleInfoError,
    refetch: refetchCycleInfo
  } = cycleInfoQuery;

  const {
    data: userRewardInfo,
    isLoading: isLoadingRewards,
    error: userRewardError,
    refetch: refetchUserRewards
  } = userRewardInfoQuery;

  // Enhanced refetch functions with error handling
  const refetchBalances = useCallback(async () => {
    try {
      await Promise.all([
        refetchEmarkBalance(),
        refetchStakingAllowance(),
      ]);
    } catch (error) {
      console.warn('Failed to refetch balances:', error);
    }
  }, [refetchEmarkBalance, refetchStakingAllowance]);

  const refetchVoting = useCallback(async () => {
    try {
      await Promise.all([
        refetchUserSummary(),
        refetchAvailableVoting(),
        refetchTotalVoting(),
      ]);
    } catch (error) {
      console.warn('Failed to refetch voting data:', error);
    }
  }, [refetchUserSummary, refetchAvailableVoting, refetchTotalVoting]);

  const refetchUnbonding = useCallback(async () => {
    try {
      await Promise.all([
        refetchUserSummary(),
        refetchUnbondingInfo(),
      ]);
    } catch (error) {
      console.warn('Failed to refetch unbonding data:', error);
    }
  }, [refetchUserSummary, refetchUnbondingInfo]);

  const refetchCycle = useCallback(async () => {
    try {
      await Promise.all([
        refetchCurrentCycle(),
        refetchTimeRemaining(),
        refetchCycleInfo(),
      ]);
    } catch (error) {
      console.warn('Failed to refetch cycle data:', error);
    }
  }, [refetchCurrentCycle, refetchTimeRemaining, refetchCycleInfo]);

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchBalances(),
      refetchVoting(),
      refetchUnbonding(),
      refetchCycle(),
      refetchUserRewards(),
    ]);
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
      const parsed = parseError(error, { operation: context, userAddress: effectiveUserAddress });
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
    userSummary, emarkBalance, stakingAllowance, availableVotingPower, totalVotingPower,
    unbondingInfo, currentCycle, timeRemaining, cycleInfo, userRewardInfo,
    isLoadingEmarkBalance, isLoadingUserSummary, isLoadingCycle, isLoadingRewards, isLoadingUnbonding,
    // Error states
    emarkBalanceError, stakingAllowanceError, userSummaryError, availableVotingError, totalVotingError,
    unbondingInfoError, currentCycleError, timeRemainingError, cycleInfoError, userRewardError,
    // Functions
    refetch, refetchBalances, refetchVoting, refetchUnbonding, refetchUserRewards, refetchCycle,
    // Utility
    hasValidAddress, effectiveUserAddress, parseError,
  ]);

  // Enhanced debug logging for development
  if (process.env.NODE_ENV === 'development' && hasValidAddress) {
    console.log('📊 UserData state:', {
      userAddress: effectiveUserAddress ? `${effectiveUserAddress.slice(0, 6)}...${effectiveUserAddress.slice(-4)}` : null,
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
