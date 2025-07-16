import { useMemo, useCallback, useState, useEffect } from 'react';
import { useReadContract, useActiveAccount } from "thirdweb/react";
import { readContract } from "thirdweb";
import { useContracts } from './useContracts';
import { useContractErrors } from './useContractErrors';
import { useSupabaseCache } from './useSupabaseCache';
import { supabase } from '../../lib/supabase';

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

// NEW: Cached user data structure
export interface CachedUserData {
  user_address: string;
  cached_balance_data: {
    emarkBalance: string;
    wEmarkBalance: string;
    stakingAllowance: string;
    totalStaked: string;
    availableVotingPower: string;
    totalVotingPower: string;
    delegatedPower: string;
    pendingEthRewards: string;
    pendingEmarkRewards: string;
    periodEthRewards: string;
    periodEmarkRewards: string;
  };
  cache_updated_at: string;
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
  
  // Cache info
  isUsingCache: boolean;
  cacheAge: number; // seconds since last cache update
  
  // Refresh functions
  refetch: () => Promise<void>;
  refetchBalances: () => Promise<void>;
  refetchVoting: () => Promise<void>;
  refetchUnbonding: () => Promise<void>;
  refetchRewards: () => Promise<void>;
  refetchCycle: () => Promise<void>;
  
  // Utility functions
  hasWallet: boolean;
  isFullyLoaded: boolean;
  lastUpdated: number;
}

/**
 * Enhanced consolidated user data hook with Supabase caching for optimal performance
 */
export function useUserData(userAddress?: string): UserDataState {
  const { cardCatalog, emarkToken, voting, evermarkRewards } = useContracts();
  const { parseError } = useContractErrors();
  const { getCachedData } = useSupabaseCache(); // Only destructure what we actually use
  const activeAccount = useActiveAccount();
  
  // Use provided address or active account address
  const effectiveUserAddress = userAddress || activeAccount?.address;
  const hasValidAddress = !!effectiveUserAddress;

  // NEW: Cache state management
  const [cachedData, setCachedDataState] = useState<CachedUserData | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);

  // Zero address for disabled queries
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // NEW: Load cached data from Supabase
  useEffect(() => {
    const loadCachedUserData = async () => {
      if (!effectiveUserAddress) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_address, cached_balance_data, cache_updated_at')
          .eq('user_address', effectiveUserAddress)
          .single();

        if (!error && data && data.cached_balance_data) {
          setCachedDataState(data);
          setIsUsingCache(true);
          
          const cacheTime = new Date(data.cache_updated_at).getTime();
          const currentTime = Date.now();
          setCacheAge(Math.floor((currentTime - cacheTime) / 1000));
          
          console.log(`🎯 Loaded cached user data for ${effectiveUserAddress}, age: ${Math.floor((currentTime - cacheTime) / 1000)}s`);
        }
      } catch (error) {
        console.warn('Failed to load cached user data:', error);
      }
    };

    loadCachedUserData();
  }, [effectiveUserAddress]);

  // NEW: Cache freshness check
  const isCacheStale = useCallback((maxAgeSeconds: number = 300): boolean => {
    return cacheAge > maxAgeSeconds;
  }, [cacheAge]);

  // Token Balances Queries - Only run if cache is stale or missing
  const shouldQueryBlockchain = !isUsingCache || isCacheStale(300); // 5 minutes

  const emarkBalanceQuery = useReadContract({
    contract: emarkToken,
    method: "function balanceOf(address) view returns (uint256)",
    params: [effectiveUserAddress || ZERO_ADDRESS],
    queryOptions: {
      enabled: hasValidAddress && shouldQueryBlockchain,
    },
  });

  const stakingAllowanceQuery = useReadContract({
    contract: emarkToken,
    method: "function allowance(address,address) view returns (uint256)",
    params: [effectiveUserAddress || ZERO_ADDRESS, cardCatalog.address],
    queryOptions: {
      enabled: hasValidAddress && shouldQueryBlockchain,
    },
  });

  // CardCatalog Queries
  const userSummaryQuery = useReadContract({
    contract: cardCatalog,
    method: "function getUserSummary(address) view returns (uint256,uint256,uint256,uint256,uint256,bool)",
    params: [effectiveUserAddress || ZERO_ADDRESS],
    queryOptions: {
      enabled: hasValidAddress && shouldQueryBlockchain,
    },
  });

  const availableVotingPowerQuery = useReadContract({
    contract: cardCatalog,
    method: "function getAvailableVotingPower(address) view returns (uint256)",
    params: [effectiveUserAddress || ZERO_ADDRESS],
    queryOptions: {
      enabled: hasValidAddress && shouldQueryBlockchain,
    },
  });

  const totalVotingPowerQuery = useReadContract({
    contract: cardCatalog,
    method: "function getTotalVotingPower(address) view returns (uint256)",
    params: [effectiveUserAddress || ZERO_ADDRESS],
    queryOptions: {
      enabled: hasValidAddress && shouldQueryBlockchain,
    },
  });

  // Unbonding Information
  const unbondingInfoQuery = useReadContract({
    contract: cardCatalog,
    method: "function getUnbondingInfo(address) view returns (uint256,uint256,bool)",
    params: [effectiveUserAddress || ZERO_ADDRESS],
    queryOptions: {
      enabled: hasValidAddress && shouldQueryBlockchain,
    },
  });

  // Cycle Information - Always fetch as it's not user-specific
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
  const userRewardInfoQuery = useReadContract({
    contract: evermarkRewards,
    method: "function getUserRewardInfo(address) view returns (uint256,uint256,uint256,uint256,uint256)",
    params: [effectiveUserAddress || ZERO_ADDRESS],
    queryOptions: {
      enabled: hasValidAddress && shouldQueryBlockchain,
    },
  });

  // NEW: Update cache when fresh data is available
  const updateCache = useCallback(async (freshData: any) => {
    if (!effectiveUserAddress) return;

    const cacheData = {
      emarkBalance: freshData.emarkBalance?.toString() || '0',
      wEmarkBalance: freshData.wEmarkBalance?.toString() || '0', 
      stakingAllowance: freshData.stakingAllowance?.toString() || '0',
      totalStaked: freshData.totalStaked?.toString() || '0',
      availableVotingPower: freshData.availableVotingPower?.toString() || '0',
      totalVotingPower: freshData.totalVotingPower?.toString() || '0',
      delegatedPower: freshData.delegatedPower?.toString() || '0',
      pendingEthRewards: freshData.pendingEthRewards?.toString() || '0',
      pendingEmarkRewards: freshData.pendingEmarkRewards?.toString() || '0',
      periodEthRewards: freshData.periodEthRewards?.toString() || '0',
      periodEmarkRewards: freshData.periodEmarkRewards?.toString() || '0',
    };

    try {
      await supabase
        .from('users')
        .upsert({
          user_address: effectiveUserAddress,
          cached_balance_data: cacheData,
          cache_updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_address'
        });

      console.log(`💾 Updated cache for user ${effectiveUserAddress}`);
    } catch (error) {
      console.warn('Failed to update user cache:', error);
    }
  }, [effectiveUserAddress]);

  // Enhanced refetch functions
  const refetchBalances = useCallback(async () => {
    try {
      await Promise.allSettled([
        emarkBalanceQuery.refetch(),
        stakingAllowanceQuery.refetch(),
      ]);
    } catch (error) {
      console.warn('Failed to refetch balances:', error);
    }
  }, [emarkBalanceQuery.refetch, stakingAllowanceQuery.refetch]);

  const refetchVoting = useCallback(async () => {
    try {
      await Promise.allSettled([
        userSummaryQuery.refetch(),
        availableVotingPowerQuery.refetch(),
        totalVotingPowerQuery.refetch(),
      ]);
    } catch (error) {
      console.warn('Failed to refetch voting data:', error);
    }
  }, [userSummaryQuery.refetch, availableVotingPowerQuery.refetch, totalVotingPowerQuery.refetch]);

  const refetchUnbonding = useCallback(async () => {
    try {
      await Promise.allSettled([
        userSummaryQuery.refetch(),
        unbondingInfoQuery.refetch(),
      ]);
    } catch (error) {
      console.warn('Failed to refetch unbonding data:', error);
    }
  }, [userSummaryQuery.refetch, unbondingInfoQuery.refetch]);

  const refetchCycle = useCallback(async () => {
    try {
      await Promise.allSettled([
        currentCycleQuery.refetch(),
        timeRemainingQuery.refetch(),
        cycleInfoQuery.refetch(),
      ]);
    } catch (error) {
      console.warn('Failed to refetch cycle data:', error);
    }
  }, [currentCycleQuery.refetch, timeRemainingQuery.refetch, cycleInfoQuery.refetch]);

  const refetchRewards = useCallback(async () => {
    try {
      await userRewardInfoQuery.refetch();
    } catch (error) {
      console.warn('Failed to refetch rewards data:', error);
    }
  }, [userRewardInfoQuery.refetch]);

  const refetch = useCallback(async () => {
    await Promise.allSettled([
      refetchBalances(),
      refetchVoting(),
      refetchUnbonding(),
      refetchCycle(),
      refetchRewards(),
    ]);
  }, [refetchBalances, refetchVoting, refetchUnbonding, refetchCycle, refetchRewards]);

  // Parse and structure the data with cache integration
  const userData = useMemo((): UserDataState => {
    // Helper function to get value from cache or blockchain
    const getValue = (blockchainValue: bigint | undefined, cacheKey: keyof CachedUserData['cached_balance_data']): bigint => {
      if (shouldQueryBlockchain && blockchainValue !== undefined) {
        return blockchainValue;
      }
      if (cachedData?.cached_balance_data?.[cacheKey]) {
        return BigInt(cachedData.cached_balance_data[cacheKey]);
      }
      return BigInt(0);
    };

    // Parse userSummary tuple safely
    const stakedBalance = getValue(userSummaryQuery.data?.[0], 'wEmarkBalance');
    const summaryAvailableVoting = getValue(userSummaryQuery.data?.[1], 'availableVotingPower');
    const delegatedPower = getValue(userSummaryQuery.data?.[2], 'delegatedPower');
    const summaryUnbondingAmount = userSummaryQuery.data?.[3] || BigInt(0);
    const summaryUnbondingReleaseTime = userSummaryQuery.data?.[4] || BigInt(0);
    const summaryCanClaimUnbonding = userSummaryQuery.data?.[5] || false;

    // Parse unbondingInfo tuple safely
    const unbondingAmount = unbondingInfoQuery.data?.[0] || summaryUnbondingAmount;
    const unbondingReleaseTime = unbondingInfoQuery.data?.[1] || summaryUnbondingReleaseTime;
    const canClaimUnbonding = unbondingInfoQuery.data?.[2] ?? summaryCanClaimUnbonding;

    // Parse userRewardInfo tuple safely
    const pendingEthRewards = getValue(userRewardInfoQuery.data?.[0], 'pendingEthRewards');
    const pendingEmarkRewards = getValue(userRewardInfoQuery.data?.[1], 'pendingEmarkRewards');
    const rewardsStakedAmount = userRewardInfoQuery.data?.[2] || BigInt(0);
    const periodEthRewards = getValue(userRewardInfoQuery.data?.[3], 'periodEthRewards');
    const periodEmarkRewards = getValue(userRewardInfoQuery.data?.[4], 'periodEmarkRewards');

    // Use individual queries or cache as fallback
    const emarkBalance = getValue(emarkBalanceQuery.data, 'emarkBalance');
    const stakingAllowance = getValue(stakingAllowanceQuery.data, 'stakingAllowance');
    const effectiveAvailableVoting = getValue(availableVotingPowerQuery.data, 'availableVotingPower') || summaryAvailableVoting;
    const effectiveTotalVoting = getValue(totalVotingPowerQuery.data, 'totalVotingPower') || stakedBalance;

    // Calculate derived values
    const totalRewards = pendingEthRewards + pendingEmarkRewards;
    const hasClaimableRewards = totalRewards > BigInt(0);
    
    // Unbonding calculations
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilRelease = Math.max(0, Number(unbondingReleaseTime) - currentTime);
    const isUnbonding = unbondingAmount > BigInt(0);

    // Cycle calculations
    const cycleStart = cycleInfoQuery.data?.[0] ? Number(cycleInfoQuery.data[0]) : 0;
    const cycleEnd = cycleInfoQuery.data?.[1] ? Number(cycleInfoQuery.data[1]) : 0;
    const isCycleActive = currentTime >= cycleStart && currentTime <= cycleEnd;

    // Loading states - adjusted for cache usage
    const isLoadingBalances = shouldQueryBlockchain && (emarkBalanceQuery.isLoading || stakingAllowanceQuery.isLoading);
    const isLoadingVoting = shouldQueryBlockchain && (userSummaryQuery.isLoading || availableVotingPowerQuery.isLoading || totalVotingPowerQuery.isLoading);
    const isLoadingUnbonding = shouldQueryBlockchain && unbondingInfoQuery.isLoading;
    const isLoadingCycle = currentCycleQuery.isLoading || timeRemainingQuery.isLoading || cycleInfoQuery.isLoading;
    const isLoadingRewards = shouldQueryBlockchain && userRewardInfoQuery.isLoading;
    const isLoading = isLoadingBalances || isLoadingVoting || isLoadingCycle || isLoadingRewards || isLoadingUnbonding;

    // Enhanced error parsing with user-friendly messages
    const parseContractError = (error: any, context: string) => {
      if (!error) return null;
      const parsed = parseError(error, { operation: context, userAddress: effectiveUserAddress });
      return parsed.message;
    };

    const balancesError = parseContractError(
      emarkBalanceQuery.error || stakingAllowanceQuery.error, 
      "fetch balances"
    );
    const votingError = parseContractError(
      userSummaryQuery.error || availableVotingPowerQuery.error || totalVotingPowerQuery.error, 
      "fetch voting data"
    );
    const unbondingError = parseContractError(unbondingInfoQuery.error, "fetch unbonding data");
    const cycleError = parseContractError(
      currentCycleQuery.error || timeRemainingQuery.error || cycleInfoQuery.error, 
      "fetch cycle data"
    );
    const rewardsError = parseContractError(userRewardInfoQuery.error, "fetch rewards data");
    
    const generalError = balancesError || votingError || unbondingError || cycleError || rewardsError;

    // NEW: Update cache when we have fresh blockchain data
    if (shouldQueryBlockchain && !isLoading && !generalError && hasValidAddress) {
      const freshData = {
        emarkBalance,
        wEmarkBalance: stakedBalance,
        stakingAllowance,
        totalStaked: stakedBalance,
        availableVotingPower: effectiveAvailableVoting,
        totalVotingPower: effectiveTotalVoting,
        delegatedPower,
        pendingEthRewards,
        pendingEmarkRewards,
        periodEthRewards,
        periodEmarkRewards,
      };
      
      // Debounced cache update (async, don't block render)
      setTimeout(() => updateCache(freshData), 1000);
    }

    return {
      balances: {
        emarkBalance,
        wEmarkBalance: stakedBalance,
        stakingAllowance,
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
        currentCycle: currentCycleQuery.data ? Number(currentCycleQuery.data) : 0,
        timeRemaining: timeRemainingQuery.data ? Number(timeRemainingQuery.data) : 0,
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
      
      // NEW: Cache info
      isUsingCache,
      cacheAge,
      
      // Refresh functions
      refetch,
      refetchBalances,
      refetchVoting,
      refetchUnbonding,
      refetchRewards,
      refetchCycle,
      
      // Utility properties
      hasWallet: hasValidAddress,
      isFullyLoaded: !isLoading && !generalError,
      lastUpdated: Date.now(),
    };
  }, [
    // Query data dependencies
    userSummaryQuery.data, emarkBalanceQuery.data, stakingAllowanceQuery.data, 
    availableVotingPowerQuery.data, totalVotingPowerQuery.data,
    unbondingInfoQuery.data, currentCycleQuery.data, timeRemainingQuery.data, 
    cycleInfoQuery.data, userRewardInfoQuery.data,
    
    // Loading states
    emarkBalanceQuery.isLoading, stakingAllowanceQuery.isLoading, userSummaryQuery.isLoading,
    availableVotingPowerQuery.isLoading, totalVotingPowerQuery.isLoading, unbondingInfoQuery.isLoading,
    currentCycleQuery.isLoading, timeRemainingQuery.isLoading, cycleInfoQuery.isLoading,
    userRewardInfoQuery.isLoading,
    
    // Error states
    emarkBalanceQuery.error, stakingAllowanceQuery.error, userSummaryQuery.error,
    availableVotingPowerQuery.error, totalVotingPowerQuery.error, unbondingInfoQuery.error,
    currentCycleQuery.error, timeRemainingQuery.error, cycleInfoQuery.error, userRewardInfoQuery.error,
    
    // Functions
    refetch, refetchBalances, refetchVoting, refetchUnbonding, refetchRewards, refetchCycle,
    
    // NEW: Cache dependencies
    cachedData, isUsingCache, cacheAge, shouldQueryBlockchain, updateCache,
    
    // Utility
    hasValidAddress, effectiveUserAddress, parseError,
  ]);

  // Enhanced debug logging for development with cache info
  if (process.env.NODE_ENV === 'development' && hasValidAddress) {
    console.log('📊 UserData state (with cache):', {
      userAddress: effectiveUserAddress ? `${effectiveUserAddress.slice(0, 6)}...${effectiveUserAddress.slice(-4)}` : null,
      cacheStatus: {
        isUsingCache,
        cacheAge: `${cacheAge}s`,
        shouldQueryBlockchain,
        cacheStale: isCacheStale()
      },
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
 * Get only token balances (lighter query for performance) with cache support
 */
export function useUserBalances(userAddress?: string): UserTokenBalances & { 
  isLoading: boolean; 
  error: string | null;
  refetch: () => Promise<void>;
  isUsingCache: boolean;
  cacheAge: number;
} {
  const { balances, isLoadingBalances, balancesError, refetchBalances, isUsingCache, cacheAge } = useUserData(userAddress);
  
  return {
    ...balances,
    isLoading: isLoadingBalances,
    error: balancesError,
    refetch: refetchBalances,
    isUsingCache,
    cacheAge,
  };
}

/**
 * Get only voting data (lighter query for performance) with cache support
 */
export function useUserVoting(userAddress?: string): UserVotingData & { 
  isLoading: boolean; 
  error: string | null;
  refetch: () => Promise<void>;
  isUsingCache: boolean;
  cacheAge: number;
} {
  const { voting, isLoadingVoting, votingError, refetchVoting, isUsingCache, cacheAge } = useUserData(userAddress);
  
  return {
    ...voting,
    isLoading: isLoadingVoting,
    error: votingError,
    refetch: refetchVoting,
    isUsingCache,
    cacheAge,
  };
}

/**
 * Get only cycle data (no user address needed) - not cached as it's global
 */
export function useCycleData(): UserCycleData & { 
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
 * Enhanced user data summary for quick overview with cache awareness
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
    
    // Additional useful flags
    hasStaked: userData.balances.wEmarkBalance > BigInt(0),
    hasAllowance: userData.balances.stakingAllowance > BigInt(0),
    needsApproval: userData.balances.emarkBalance > userData.balances.stakingAllowance,
    
    // NEW: Cache info
    isUsingCache: userData.isUsingCache,
    cacheAge: userData.cacheAge,
    dataFreshness: userData.isUsingCache ? 
      (userData.cacheAge < 60 ? 'fresh' : userData.cacheAge < 300 ? 'moderate' : 'stale') : 
      'live',
    
    // Refresh function
    refresh: userData.refetch,
    
    // Performance metrics
    lastUpdated: userData.lastUpdated,
    isFullyLoaded: userData.isFullyLoaded,
  }), [userData]);
}

/**
 * Hook specifically for checking user permissions and capabilities with cache support
 */
export function useUserCapabilities(userAddress?: string) {
  const { balances, voting, unbonding, rewards, hasWallet, error, isUsingCache } = useUserData(userAddress);
  
  return useMemo(() => ({
    // Connection status
    isConnected: hasWallet,
    hasError: !!error,
    
    // Token capabilities
    canStake: balances.emarkBalance > BigInt(0),
    canUnstake: balances.wEmarkBalance > BigInt(0),
    needsApproval: balances.emarkBalance > balances.stakingAllowance,
    
    // Voting capabilities
    canDelegate: voting.availableVotingPower > BigInt(0),
    hasVotingPower: voting.totalVotingPower > BigInt(0),
    isActiveDelegator: voting.delegatedPower > BigInt(0),
    
    // Unbonding capabilities
    canCompleteUnbonding: unbonding.canClaimUnbonding,
    isCurrentlyUnbonding: unbonding.isUnbonding,
    
    // Rewards capabilities
    canClaimRewards: rewards.hasClaimableRewards,
    hasEarnedRewards: rewards.totalRewards > BigInt(0),
    
    // Combined status
    isActiveUser: balances.wEmarkBalance > BigInt(0) || voting.totalVotingPower > BigInt(0),
    
    // NEW: Performance info
    dataSource: isUsingCache ? 'cache' : 'blockchain',
    
  }), [balances, voting, unbonding, rewards, hasWallet, error, isUsingCache]);
}