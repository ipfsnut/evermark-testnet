import { useMemo } from 'react';
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, NFT_STAKING_ABI, REWARDS_ABI } from "../lib/contracts";

export interface StakingStats {
  unbondingPeriod: number;
  currentAPY: number;
  totalProtocolStaked: bigint;
  isAPYFromContract: boolean;
  formatUnbondingPeriod: () => string;
}

export function useStakingStats() {
  const stakingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.NFT_STAKING,
    abi: NFT_STAKING_ABI,
  }), []);
  
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);
  
  // Get unbonding period from contract
  const { data: unbondingPeriod } = useReadContract({
    contract: stakingContract,
    method: "getUnbondingPeriod",
    params: [],
  });
  
  // Get total staked in protocol
  const { data: totalStaked } = useReadContract({
    contract: stakingContract,
    method: "getTotalStaked",
    params: [],
  });
  
  // Try to get weekly reward rate from rewards contract
  const { data: weeklyRewardRate } = useReadContract({
    contract: rewardsContract,
    method: "getWeeklyRewardRate",
    params: [],
  });
  
  // Try alternative method names for APY/reward rate
  const { data: stakingAPY } = useReadContract({
    contract: stakingContract,
    method: "getCurrentAPY",
    params: [],
  });
  
  const { data: rewardRate } = useReadContract({
    contract: rewardsContract,
    method: "getRewardRate",
    params: [],
  });
  
  // Calculate APY from contract data
  const { calculatedAPY, isFromContract } = useMemo(() => {
    // First, try direct APY from contract (if it exists)
    if (stakingAPY !== undefined) {
      const apy = Number(stakingAPY) / 100; // Assuming contract returns basis points or percentage
      return { calculatedAPY: apy, isFromContract: true };
    }
    
    // Second, try to calculate from weekly reward rate
    if (weeklyRewardRate !== undefined && totalStaked && totalStaked > BigInt(0)) {
      const weeklyRate = Number(weeklyRewardRate) / 1e18; // Assuming 18 decimals
      const totalStakedEther = Number(totalStaked) / 1e18;
      const weeklyAPR = (weeklyRate / totalStakedEther) * 100;
      const annualAPY = weeklyAPR * 52; // 52 weeks in a year
      
      return { 
        calculatedAPY: Math.max(0, annualAPY), 
        isFromContract: true 
      };
    }
    
    // Third, try general reward rate
    if (rewardRate !== undefined && totalStaked && totalStaked > BigInt(0)) {
      const rate = Number(rewardRate) / 1e18;
      const totalStakedEther = Number(totalStaked) / 1e18;
      const apy = (rate / totalStakedEther) * 100 * 365; // Assuming daily rate
      
      return { 
        calculatedAPY: Math.max(0, apy), 
        isFromContract: true 
      };
    }
    
    // If no contract data available, return 0
    return { calculatedAPY: 0, isFromContract: false };
  }, [stakingAPY, weeklyRewardRate, rewardRate, totalStaked]);
  
  const stakingStats: StakingStats = useMemo(() => ({
    unbondingPeriod: unbondingPeriod ? Number(unbondingPeriod) : 7,
    currentAPY: calculatedAPY,
    totalProtocolStaked: totalStaked || BigInt(0),
    isAPYFromContract: isFromContract,
    formatUnbondingPeriod: () => {
      const days = unbondingPeriod ? Number(unbondingPeriod) : 7;
      if (days === 1) return '1 day';
      if (days === 7) return '1 week';
      if (days === 14) return '2 weeks';
      if (days === 30) return '1 month';
      return `${days} days`;
    }
  }), [unbondingPeriod, totalStaked, calculatedAPY, isFromContract]);
  
  return stakingStats;
}