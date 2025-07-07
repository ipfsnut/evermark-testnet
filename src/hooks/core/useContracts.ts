// src/hooks/core/useContracts.ts - Rewritten for upgraded smart contracts
import { useMemo } from 'react';
import { getContract } from "thirdweb";
import { client } from "../../lib/thirdweb";
import { CHAIN, CONTRACTS } from "../../lib/contracts";

// Import all ABIs - updated to match your current structure
import { 
  VOTING_ABI, 
  CARD_CATALOG_ABI, 
  EVERMARK_NFT_ABI, 
  LEADERBOARD_ABI, 
  REWARDS_ABI, 
  FEE_COLLECTOR_ABI, 
  EMARK_TOKEN_ABI 
} from "../../lib/contracts";

export interface ContractInstances {
  voting: ReturnType<typeof getContract>;
  cardCatalog: ReturnType<typeof getContract>;
  evermarkNFT: ReturnType<typeof getContract>;
  evermarkRewards: ReturnType<typeof getContract>;
  leaderboard: ReturnType<typeof getContract>;
  feeCollector: ReturnType<typeof getContract>;
  emarkToken: ReturnType<typeof getContract>;
}

/**
 * Enhanced contract instances hook with better error handling and validation
 * Single source of truth for all contract instances
 */
export function useContracts(): ContractInstances {
  return useMemo(() => {
    // Validate that all contract addresses are available
    const requiredContracts = {
      VOTING: CONTRACTS.VOTING,
      CARD_CATALOG: CONTRACTS.CARD_CATALOG,
      EVERMARK_NFT: CONTRACTS.EVERMARK_NFT,
      REWARDS: CONTRACTS.REWARDS,
      LEADERBOARD: CONTRACTS.LEADERBOARD,
      FEE_COLLECTOR: CONTRACTS.FEE_COLLECTOR,
      EMARK_TOKEN: CONTRACTS.EMARK_TOKEN,
    };

    // Check for missing contract addresses
    const missingContracts = Object.entries(requiredContracts)
      .filter(([name, address]) => !address)
      .map(([name]) => name);

    if (missingContracts.length > 0) {
      console.error('❌ Missing contract addresses:', missingContracts);
      throw new Error(`Missing contract addresses: ${missingContracts.join(', ')}`);
    }

    try {
      const contracts = {
        voting: getContract({
          client,
          chain: CHAIN,
          address: CONTRACTS.VOTING,
          abi: VOTING_ABI,
        }),
        
        cardCatalog: getContract({
          client,
          chain: CHAIN,
          address: CONTRACTS.CARD_CATALOG,
          abi: CARD_CATALOG_ABI,
        }),
        
        evermarkNFT: getContract({
          client,
          chain: CHAIN,
          address: CONTRACTS.EVERMARK_NFT,
          abi: EVERMARK_NFT_ABI,
        }),
        
        evermarkRewards: getContract({
          client,
          chain: CHAIN,
          address: CONTRACTS.REWARDS,
          abi: REWARDS_ABI,
        }),
        
        leaderboard: getContract({
          client,
          chain: CHAIN,
          address: CONTRACTS.LEADERBOARD,
          abi: LEADERBOARD_ABI,
        }),
        
        feeCollector: getContract({
          client,
          chain: CHAIN,
          address: CONTRACTS.FEE_COLLECTOR,
          abi: FEE_COLLECTOR_ABI,
        }),
        
        emarkToken: getContract({
          client,
          chain: CHAIN,
          address: CONTRACTS.EMARK_TOKEN,
          abi: EMARK_TOKEN_ABI,
        }),
      };

      // Enhanced debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('🏗️ Contract instances created successfully:', {
          network: CHAIN.name || `Chain ID: ${CHAIN.id}`,
          contracts: Object.entries(requiredContracts).map(([name, address]) => ({
            name,
            address: `${address.slice(0, 6)}...${address.slice(-4)}`,
            verified: !!address
          })),
          timestamp: new Date().toISOString()
        });
      }

      return contracts;
    } catch (error) {
      console.error('❌ Failed to create contract instances:', error);
      throw new Error(`Contract initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []); // Empty dependency array - contracts are static
}

/**
 * Get a specific contract instance with type safety
 * @param contractName - Name of the contract to retrieve
 * @returns Typed contract instance
 */
export function useContract<K extends keyof ContractInstances>(
  contractName: K
): ContractInstances[K] {
  const contracts = useContracts();
  
  if (!contracts[contractName]) {
    throw new Error(`Contract "${contractName}" is not available`);
  }
  
  return contracts[contractName];
}

/**
 * Get multiple specific contract instances
 * @param contractNames - Array of contract names to retrieve
 * @returns Object with requested contract instances
 */
export function useContractSubset<K extends keyof ContractInstances>(
  contractNames: K[]
): Pick<ContractInstances, K> {
  const contracts = useContracts();
  
  return useMemo(() => {
    const subset = {} as Pick<ContractInstances, K>;
    
    contractNames.forEach(name => {
      if (!contracts[name]) {
        throw new Error(`Contract "${name}" is not available`);
      }
      subset[name] = contracts[name];
    });
    
    return subset;
  }, [contracts, contractNames]);
}

/**
 * Utility to check if all contracts are properly initialized
 * @returns Object with contract status information
 */
export function useContractStatus() {
  return useMemo(() => {
    try {
      const contracts = useContracts();
      const contractNames = Object.keys(contracts) as (keyof ContractInstances)[];
      
      const status = {
        isReady: true,
        contractCount: contractNames.length,
        contracts: contractNames.reduce((acc, name) => {
          acc[name] = {
            address: CONTRACTS[name.toUpperCase() as keyof typeof CONTRACTS] || 'N/A',
            isInitialized: !!contracts[name]
          };
          return acc;
        }, {} as Record<keyof ContractInstances, { address: string; isInitialized: boolean }>),
        chain: {
          id: CHAIN.id,
          name: CHAIN.name || 'Unknown'
        }
      };
      
      return status;
    } catch (error) {
      return {
        isReady: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        contractCount: 0,
        contracts: {},
        chain: { id: 0, name: 'Unknown' }
      };
    }
  }, []);
}

// Type helpers for better IDE support and type safety
export type ContractName = keyof ContractInstances;
export type VotingContract = ContractInstances['voting'];
export type CardCatalogContract = ContractInstances['cardCatalog'];
export type EvermarkNFTContract = ContractInstances['evermarkNFT'];
export type EvermarkRewardsContract = ContractInstances['evermarkRewards'];
export type LeaderboardContract = ContractInstances['leaderboard'];
export type FeeCollectorContract = ContractInstances['feeCollector'];
export type EmarkTokenContract = ContractInstances['emarkToken'];

/**
 * Contract method validation utility
 * Helps ensure methods exist on contracts during development
 */
export function validateContractMethod(
  contract: any, 
  methodName: string, 
  contractName: string
): boolean {
  if (process.env.NODE_ENV === 'development') {
    if (!contract || typeof contract[methodName] !== 'function') {
      console.warn(`⚠️ Method "${methodName}" not found on ${contractName} contract`);
      return false;
    }
  }
  return true;
}

/**
 * Enhanced error context for contract operations
 */
export interface ContractErrorContext {
  contractName: keyof ContractInstances;
  methodName: string;
  parameters?: any[];
  userAddress?: string;
}

/**
 * Hook to get contract error context for better debugging
 */
export function useContractErrorContext(): (context: ContractErrorContext) => ContractErrorContext {
  return useMemo(() => {
    return (context: ContractErrorContext) => ({
      ...context,
      timestamp: Date.now(),
      chain: CHAIN.id,
      environment: process.env.NODE_ENV
    });
  }, []);
}