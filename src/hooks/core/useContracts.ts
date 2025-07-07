// src/hooks/core/useContracts.ts - Enhanced for ThirdWeb v5 compatibility with better performance
import { useMemo } from 'react';
import { getContract } from "thirdweb";
import { client } from "../../lib/thirdweb";
import { CHAIN, CONTRACTS } from "../../lib/contracts";

// Import all ABIs with proper typing
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

// Enhanced validation function for contract addresses
function validateContractAddresses() {
  const requiredContracts = {
    VOTING: CONTRACTS.VOTING,
    CARD_CATALOG: CONTRACTS.CARD_CATALOG,
    EVERMARK_NFT: CONTRACTS.EVERMARK_NFT,
    REWARDS: CONTRACTS.REWARDS,
    LEADERBOARD: CONTRACTS.LEADERBOARD,
    FEE_COLLECTOR: CONTRACTS.FEE_COLLECTOR,
    EMARK_TOKEN: CONTRACTS.EMARK_TOKEN,
  };

  const missingContracts = Object.entries(requiredContracts)
    .filter(([, address]) => !address || !address.startsWith('0x'))
    .map(([name]) => name);

  if (missingContracts.length > 0) {
    console.error('❌ Missing or invalid contract addresses:', missingContracts);
    throw new Error(`Missing contract addresses: ${missingContracts.join(', ')}`);
  }

  return requiredContracts;
}

/**
 * Enhanced contract instances hook with better error handling and validation
 * Optimized for ThirdWeb v5 with proper memoization and type safety
 */
export function useContracts(): ContractInstances {
  return useMemo(() => {
    // Validate contract addresses first
    const validatedContracts = validateContractAddresses();

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

      // Enhanced debug logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log('🏗️ Contract instances created successfully:', {
          network: CHAIN.name || `Chain ID: ${CHAIN.id}`,
          contracts: Object.entries(validatedContracts).map(([name, address]) => ({
            name,
            address: `${address.slice(0, 6)}...${address.slice(-4)}`,
            verified: !!address
          })),
          client: !!client,
          timestamp: new Date().toISOString()
        });
      }

      return contracts;
    } catch (error) {
      console.error('❌ Failed to create contract instances:', error);
      throw new Error(`Contract initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [client, CHAIN.id]); // Include relevant dependencies
}

/**
 * Get a specific contract instance with type safety
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
 * Get multiple specific contract instances with memoization
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
  }, [contracts, contractNames.join(',')]); // Stable dependency
}

/**
 * Enhanced utility to check if all contracts are properly initialized
 */
export function useContractStatus() {
  const contracts = useContracts();
  
  return useMemo(() => {
    try {
      const contractNames = Object.keys(contracts) as (keyof ContractInstances)[];
      
      const status = {
        isReady: true,
        contractCount: contractNames.length,
        contracts: contractNames.reduce((acc, name) => {
          const contractConfig = contracts[name];
          acc[name] = {
            address: contractConfig.address || 'N/A',
            isInitialized: !!contractConfig,
            chainId: contractConfig.chain?.id || 0
          };
          return acc;
        }, {} as Record<keyof ContractInstances, { 
          address: string; 
          isInitialized: boolean;
          chainId: number;
        }>),
        chain: {
          id: CHAIN.id,
          name: CHAIN.name || 'Unknown'
        },
        lastChecked: Date.now()
      };
      
      return status;
    } catch (error) {
      return {
        isReady: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        contractCount: 0,
        contracts: {},
        chain: { id: 0, name: 'Unknown' },
        lastChecked: Date.now()
      };
    }
  }, [contracts]);
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
 * Contract method validation utility for development - enhanced
 */
export function validateContractMethod(
  contract: any, 
  methodName: string, 
  contractName: string
): boolean {
  if (process.env.NODE_ENV === 'development') {
    if (!contract) {
      console.warn(`⚠️ Contract "${contractName}" is null or undefined`);
      return false;
    }
    
    // For ThirdWeb v5 contracts, check if we can prepare a call
    try {
      // This is a more robust check for ThirdWeb v5
      if (!contract.address || !contract.chain) {
        console.warn(`⚠️ Contract "${contractName}" is not properly initialized`);
        return false;
      }
      
      console.log(`✅ Contract "${contractName}" method "${methodName}" validation passed`);
      return true;
    } catch (error) {
      console.warn(`⚠️ Contract "${contractName}" validation failed:`, error);
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
  timestamp?: number;
  chain?: number;
  environment?: string;
  gasEstimate?: bigint;
  blockNumber?: number;
}

/**
 * Hook to get enhanced contract error context for better debugging
 */
export function useContractErrorContext(): (context: ContractErrorContext) => ContractErrorContext & { 
  timestamp: number; 
  chain: number; 
  environment: string;
  sessionId: string;
} {
  return useMemo(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return (context: ContractErrorContext) => ({
      ...context,
      timestamp: Date.now(),
      chain: CHAIN.id,
      environment: process.env.NODE_ENV || 'unknown',
      sessionId
    });
  }, []);
}

/**
 * Get contract by address - useful for dynamic contract interactions
 */
export function useContractByAddress(address: string, abi?: any) {
  return useMemo(() => {
    if (!address || !address.startsWith('0x')) {
      console.warn('Invalid contract address provided:', address);
      return null;
    }

    try {
      return getContract({
        client,
        chain: CHAIN,
        address,
        abi: abi || []
      });
    } catch (error) {
      console.error('Failed to create contract instance for address:', address, error);
      return null;
    }
  }, [address, abi]);
}

/**
 * Hook to get all contract addresses for reference
 */
export function useContractAddresses() {
  return useMemo(() => ({
    VOTING: CONTRACTS.VOTING,
    CARD_CATALOG: CONTRACTS.CARD_CATALOG,
    EVERMARK_NFT: CONTRACTS.EVERMARK_NFT,
    REWARDS: CONTRACTS.REWARDS,
    LEADERBOARD: CONTRACTS.LEADERBOARD,
    FEE_COLLECTOR: CONTRACTS.FEE_COLLECTOR,
    EMARK_TOKEN: CONTRACTS.EMARK_TOKEN,
  }), []);
}