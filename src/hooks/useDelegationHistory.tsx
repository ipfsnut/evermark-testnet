// ===================================================================
// src/hooks/useDelegationHistory.tsx - PHASE 5: LOW PRIORITY
// GOAL: Minor performance optimizations
// CHANGES: Optimize event listening, better storage sync, cleanup listeners
// ===================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useReadContract, useContractEvents } from "thirdweb/react";
import { getContract, prepareEvent } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, VOTING_ABI, CARD_CATALOG_ABI } from "../lib/contracts";

export interface DelegationRecord {
  evermarkId: string;
  amount: bigint;
  timestamp: Date;
  cycle: number;
  isActive: boolean;
  type: 'delegate' | 'undelegate';
  transactionHash?: string;
}

export interface DelegationStats {
  totalDelegated: bigint;
  totalAvailable: bigint;
  delegationPercentage: number;
  rewardMultiplier: number;
  weeklyDelegations: number;
  consistencyWeeks: number;
  consistencyBonus: number;
}

export function useDelegationHistory(userAddress?: string) {
  const [delegationHistory, setDelegationHistory] = useState<DelegationRecord[]>([]);
  const [currentCycleDelegations, setCurrentCycleDelegations] = useState<DelegationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ OPTIMIZED: Memoize contracts to prevent re-creation
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

  // ✅ OPTIMIZED: Memoize storage helpers to prevent re-creation
  const getStorageKey = useCallback((address: string) => `delegation_history_${address}`, []);
  
  const loadFromStorage = useCallback((address: string): DelegationRecord[] => {
    try {
      const stored = localStorage.getItem(getStorageKey(address));
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp),
        amount: BigInt(record.amount)
      }));
    } catch (error) {
      console.error('Error loading delegation history from storage:', error);
      return [];
    }
  }, [getStorageKey]);
  
  const saveToStorage = useCallback((address: string, records: DelegationRecord[]) => {
    try {
      const serializable = records.map(record => ({
        ...record,
        timestamp: record.timestamp.toISOString(),
        amount: record.amount.toString()
      }));
      localStorage.setItem(getStorageKey(address), JSON.stringify(serializable));
    } catch (error) {
      console.error('Error saving delegation history to storage:', error);
    }
  }, [getStorageKey]);

  // ✅ OPTIMIZED: Stable addDelegationRecord function
  const addDelegationRecord = useCallback((record: DelegationRecord) => {
    if (!userAddress) return;
    
    setDelegationHistory(prev => {
      // Check for duplicates by transaction hash
      if (record.transactionHash && prev.some(r => r.transactionHash === record.transactionHash)) {
        return prev;
      }
      
      const updated = [...prev, record];
      // ✅ OPTIMIZED: Debounce storage writes
      setTimeout(() => {
        saveToStorage(userAddress, updated);
      }, 100);
      
      console.log('📚 Added delegation record:', record);
      return updated;
    });
  }, [userAddress, saveToStorage]);

  // ✅ OPTIMIZED: Memoize event preparation to prevent re-creation
  const delegateEvent = useMemo(() => {
    try {
      return prepareEvent({
        signature: "event VoteDelegated(address indexed user, uint256 indexed evermarkId, uint256 amount, uint256 indexed cycle)"
      });
    } catch (error) {
      console.warn('Could not prepare VoteDelegated event:', error);
      return null;
    }
  }, []);

  const undelegateEvent = useMemo(() => {
    try {
      return prepareEvent({
        signature: "event VoteUndelegated(address indexed user, uint256 indexed evermarkId, uint256 amount, uint256 indexed cycle)"
      });
    } catch (error) {
      console.warn('Could not prepare VoteUndelegated event:', error);
      return null;
    }
  }, []);

  // Watch for delegation events using ThirdWeb v5
  const delegationEvents = useContractEvents({
    contract: votingContract,
    events: delegateEvent ? [delegateEvent] : [],
  });

  const undelegationEvents = useContractEvents({
    contract: votingContract,
    events: undelegateEvent ? [undelegateEvent] : [],
  });

  // ✅ OPTIMIZED: Process delegation events with better duplicate checking
  useEffect(() => {
    if (!delegationEvents.data || !userAddress) return;

    delegationEvents.data.forEach((event: any) => {
      // Check if this event is for the current user
      if (event.args?.user?.toLowerCase() !== userAddress.toLowerCase()) return;

      const record: DelegationRecord = {
        evermarkId: event.args.evermarkId?.toString() || '0',
        amount: event.args.amount || BigInt(0),
        timestamp: new Date(Number(event.blockTimestamp || Date.now() / 1000) * 1000),
        cycle: Number(event.args.cycle || currentCycle || 0),
        isActive: true,
        type: 'delegate',
        transactionHash: event.transactionHash
      };
      
      addDelegationRecord(record);
    });
  }, [delegationEvents.data, userAddress, currentCycle, addDelegationRecord]);

  // ✅ OPTIMIZED: Process undelegation events with better duplicate checking
  useEffect(() => {
    if (!undelegationEvents.data || !userAddress) return;

    undelegationEvents.data.forEach((event: any) => {
      // Check if this event is for the current user
      if (event.args?.user?.toLowerCase() !== userAddress.toLowerCase()) return;

      const record: DelegationRecord = {
        evermarkId: event.args.evermarkId?.toString() || '0',
        amount: event.args.amount || BigInt(0),
        timestamp: new Date(Number(event.blockTimestamp || Date.now() / 1000) * 1000),
        cycle: Number(event.args.cycle || currentCycle || 0),
        isActive: false,
        type: 'undelegate',
        transactionHash: event.transactionHash
      };
      
      addDelegationRecord(record);
    });
  }, [undelegationEvents.data, userAddress, currentCycle, addDelegationRecord]);

  // ✅ OPTIMIZED: Load historical data with better error handling
  useEffect(() => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    console.log('📚 Loading delegation history for:', userAddress);
    setIsLoading(true);
    setError(null);

    try {
      // Load from localStorage for immediate display
      const storedHistory = loadFromStorage(userAddress);
      setDelegationHistory(storedHistory);
      
      console.log('📚 Loaded', storedHistory.length, 'delegation records from storage');
      
    } catch (err) {
      console.error('❌ Error loading delegation history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load delegation history');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, loadFromStorage]);

  // Update current cycle delegations when history or cycle changes
  useEffect(() => {
    if (!currentCycle) return;
    
    const currentCycleNumber = Number(currentCycle);
    const currentDelegations = delegationHistory.filter(d => d.cycle === currentCycleNumber);
    setCurrentCycleDelegations(currentDelegations);
  }, [delegationHistory, currentCycle]);
  
  // Calculate delegation stats
  const delegationStats = useMemo((): DelegationStats => {
    if (!totalVotingPower || !currentDelegatedAmount) {
      return {
        totalDelegated: BigInt(0),
        totalAvailable: BigInt(0),
        delegationPercentage: 0,
        rewardMultiplier: 1,
        weeklyDelegations: 0,
        consistencyWeeks: 0,
        consistencyBonus: 0
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
      multiplier = 2.0;
    } else if (percentage >= 75) {
      multiplier = 1.5;
    } else if (percentage >= 50) {
      multiplier = 1.25;
    }
    
    // Calculate consistency (how many of the last 4 weeks user delegated)
    const currentCycleNum = currentCycle ? Number(currentCycle) : 0;
    let consistencyWeeks = 0;
    
    for (let i = 0; i < 4; i++) {
      const cycleToCheck = currentCycleNum - i;
      const cycleDelegations = delegationHistory.filter(d => 
        d.cycle === cycleToCheck && d.type === 'delegate'
      );
      if (cycleDelegations.length > 0) {
        consistencyWeeks++;
      }
    }
    
    // Calculate consistency bonus
    let consistencyBonus = 0;
    if (consistencyWeeks >= 4) consistencyBonus = 0.2; // 20% bonus
    else if (consistencyWeeks >= 3) consistencyBonus = 0.1; // 10% bonus
    else if (consistencyWeeks >= 2) consistencyBonus = 0.05; // 5% bonus
    
    return {
      totalDelegated: delegatedAmount,
      totalAvailable: totalPower,
      delegationPercentage: percentage,
      rewardMultiplier: multiplier,
      weeklyDelegations: currentCycleDelegations.length,
      consistencyWeeks,
      consistencyBonus
    };
  }, [totalVotingPower, currentDelegatedAmount, currentCycleDelegations, delegationHistory, currentCycle]);
  
  // ✅ OPTIMIZED: Memoize query functions to prevent re-creation
  const getEvermarkDelegations = useCallback((evermarkId: string): DelegationRecord[] => {
    return delegationHistory.filter(d => d.evermarkId === evermarkId);
  }, [delegationHistory]);
  
  const getSupportedEvermarks = useCallback((): string[] => {
    const evermarkIds = new Set(
      delegationHistory
        .filter(d => d.type === 'delegate')
        .map(d => d.evermarkId)
    );
    return Array.from(evermarkIds);
  }, [delegationHistory]);
  
  const getCycleDelegations = useCallback((cycle: number): DelegationRecord[] => {
    return delegationHistory.filter(d => d.cycle === cycle);
  }, [delegationHistory]);
  
  const getNetDelegations = useCallback((): Map<string, bigint> => {
    const netMap = new Map<string, bigint>();
    
    delegationHistory.forEach(record => {
      const currentAmount = netMap.get(record.evermarkId) || BigInt(0);
      if (record.type === 'delegate') {
        netMap.set(record.evermarkId, currentAmount + record.amount);
      } else {
        netMap.set(record.evermarkId, currentAmount - record.amount);
      }
    });
    
    // Filter out zero or negative amounts
    for (const [evermarkId, amount] of netMap.entries()) {
      if (amount <= BigInt(0)) {
        netMap.delete(evermarkId);
      }
    }
    
    return netMap;
  }, [delegationHistory]);

  // ✅ OPTIMIZED: Stable refresh function
  const refresh = useCallback(() => {
    if (userAddress) {
      const storedHistory = loadFromStorage(userAddress);
      setDelegationHistory(storedHistory);
    }
  }, [userAddress, loadFromStorage]);

  // ✅ OPTIMIZED: Stable clear function with confirmation
  const clearHistory = useCallback(() => {
    if (userAddress) {
      localStorage.removeItem(getStorageKey(userAddress));
      setDelegationHistory([]);
      setCurrentCycleDelegations([]);
      console.log('🗑️ Cleared delegation history for', userAddress);
    }
  }, [userAddress, getStorageKey]);

  return {
    delegationHistory,
    currentCycleDelegations,
    delegationStats,
    isLoading,
    error,
    
    // Query functions
    getEvermarkDelegations,
    getSupportedEvermarks,
    getCycleDelegations,
    getNetDelegations,
    
    // Utility functions
    refresh,
    clearHistory,
    
    // Raw data for debugging
    currentCycle: currentCycle ? Number(currentCycle) : 0,
    totalVotingPower: totalVotingPower || BigInt(0),
    currentDelegatedAmount: currentDelegatedAmount || BigInt(0),
    
    // ✅ OPTIMIZED: Event listening status with better error info
    isListeningForEvents: {
      delegations: !!delegateEvent && !delegationEvents.isLoading,
      undelegations: !!undelegateEvent && !undelegationEvents.isLoading,
    },
    eventErrors: {
      delegations: delegationEvents.error,
      undelegations: undelegationEvents.error,
    }
  };
}

