import { useState, useEffect, useMemo } from 'react';
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, VOTING_ABI, CARD_CATALOG_ABI } from "../lib/contracts";

export interface DelegationRecord {
  evermarkId: string;
  amount: bigint;
  timestamp: Date;
  cycle: number;
  isActive: boolean;
}

export interface DelegationStats {
  totalDelegated: bigint;
  totalAvailable: bigint;
  delegationPercentage: number;
  rewardMultiplier: number;
  weeklyDelegations: number;
}

export function useDelegationHistory(userAddress?: string) {
  const [delegationHistory, setDelegationHistory] = useState<DelegationRecord[]>([]);
  const [currentCycleDelegations, setCurrentCycleDelegations] = useState<DelegationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get contracts
  const votingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.VOTING,
    abi: VOTING_ABI,
  }), []);
  
  const catalogContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CARD_CATALOG_ABI,
  }), []);
  
  // Get current cycle
  const { data: currentCycle } = useReadContract({
    contract: votingContract,
    method: "getCurrentCycle",
    params: [],
  });
  
  // Get total voting power
  const { data: totalVotingPower } = useReadContract({
    contract: catalogContract,
    method: "getTotalVotingPower",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  // Get current delegated amount
  const { data: currentDelegatedAmount } = useReadContract({
    contract: votingContract,
    method: "getTotalUserVotesInCurrentCycle",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  // Load delegation history (mock data - in production from events or database)
  useEffect(() => {
    if (!userAddress || !currentCycle) return;
    
    setIsLoading(true);
    
    // Mock delegation history
    const mockHistory: DelegationRecord[] = [
      {
        evermarkId: '1',
        amount: BigInt(100e18),
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        cycle: Number(currentCycle),
        isActive: true
      },
      {
        evermarkId: '2',
        amount: BigInt(50e18),
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        cycle: Number(currentCycle),
        isActive: true
      },
      {
        evermarkId: '3',
        amount: BigInt(200e18),
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        cycle: Number(currentCycle) - 1,
        isActive: false
      }
    ];
    
    setDelegationHistory(mockHistory);
    setCurrentCycleDelegations(mockHistory.filter(d => d.cycle === Number(currentCycle)));
    setIsLoading(false);
  }, [userAddress, currentCycle]);
  
  // Calculate delegation stats
  const delegationStats = useMemo((): DelegationStats => {
    if (!totalVotingPower || !currentDelegatedAmount) {
      return {
        totalDelegated: BigInt(0),
        totalAvailable: BigInt(0),
        delegationPercentage: 0,
        rewardMultiplier: 1,
        weeklyDelegations: 0
      };
    }
    
    const delegatedAmount = currentDelegatedAmount || BigInt(0);
    const totalPower = totalVotingPower || BigInt(0);
    const percentage = totalPower > BigInt(0) 
      ? Number((delegatedAmount * BigInt(100)) / totalPower)
      : 0;
    
    // Calculate reward multiplier based on delegation percentage
    let multiplier = 1;
    if (percentage >= 100) {
      multiplier = 2;
    } else if (percentage >= 75) {
      multiplier = 1.5;
    } else if (percentage >= 50) {
      multiplier = 1.25;
    }
    
    return {
      totalDelegated: delegatedAmount,
      totalAvailable: totalPower,
      delegationPercentage: percentage,
      rewardMultiplier: multiplier,
      weeklyDelegations: currentCycleDelegations.length
    };
  }, [totalVotingPower, currentDelegatedAmount, currentCycleDelegations]);
  
  // Get delegation history for a specific Evermark
  const getEvermarkDelegations = (evermarkId: string): DelegationRecord[] => {
    return delegationHistory.filter(d => d.evermarkId === evermarkId);
  };
  
  // Get unique Evermarks that have been delegated to
  const getSupportedEvermarks = (): string[] => {
    return [...new Set(delegationHistory.map(d => d.evermarkId))];
  };
  
  // Get delegation history for a specific cycle
  const getCycleDelegations = (cycle: number): DelegationRecord[] => {
    return delegationHistory.filter(d => d.cycle === cycle);
  };
  
  // Calculate rewards boost based on delegation consistency
  const getConsistencyBonus = (): number => {
    if (!currentCycle) return 0;
    
    // Check last 4 weeks
    let consistentWeeks = 0;
    for (let i = 0; i < 4; i++) {
      const cycleNumber = Number(currentCycle) - i;
      const cycleDelegations = getCycleDelegations(cycleNumber);
      if (cycleDelegations.length > 0) {
        consistentWeeks++;
      }
    }
    
    // Bonus for consistent participation
    if (consistentWeeks >= 4) return 0.2; // 20% bonus
    if (consistentWeeks >= 3) return 0.1; // 10% bonus
    if (consistentWeeks >= 2) return 0.05; // 5% bonus
    return 0;
  };
  
  return {
    delegationHistory,
    currentCycleDelegations,
    delegationStats,
    isLoading,
    getEvermarkDelegations,
    getSupportedEvermarks,
    getCycleDelegations,
    getConsistencyBonus,
    currentCycle: currentCycle ? Number(currentCycle) : 0
  };
}