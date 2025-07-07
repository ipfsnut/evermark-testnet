// src/hooks/core/useContracts.ts - Single source for all contract instances
import { useMemo } from 'react';
import { getContract } from "thirdweb";
import { client } from "../../lib/thirdweb";
import { CHAIN, CONTRACTS } from "../../lib/contracts";

// Import all ABIs
import { VOTING_ABI, CARD_CATALOG_ABI, EVERMARK_NFT_ABI, LEADERBOARD_ABI, REWARDS_ABI, FEE_COLLECTOR_ABI, EMARK_TOKEN_ABI } from "../../lib/contracts";

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
 * Single source of truth for all contract instances
 * Eliminates redundant contract creation across hooks
 */
export function useContracts(): ContractInstances {
  return useMemo(() => {
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

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🏗️ Contract instances created:', {
        contractAddresses: {
          voting: CONTRACTS.VOTING,
          cardCatalog: CONTRACTS.CARD_CATALOG,
          evermarkNFT: CONTRACTS.EVERMARK_NFT,
          evermarkRewards: CONTRACTS.REWARDS,
          leaderboard: CONTRACTS.LEADERBOARD,
          feeCollector: CONTRACTS.FEE_COLLECTOR,
          emarkToken: CONTRACTS.EMARK_TOKEN,
        },
        chain: CHAIN.name || CHAIN.id,
      });
    }

    return contracts;
  }, []); // Empty dependency array - contracts are static
}

/**
 * Get a specific contract instance
 * Useful when you only need one contract
 */
export function useContract<K extends keyof ContractInstances>(
  contractName: K
): ContractInstances[K] {
  const contracts = useContracts();
  return contracts[contractName];
}

/**
 * Get multiple specific contract instances
 * Useful when you only need a subset of contracts
 */
export function useContractSubset<K extends keyof ContractInstances>(
  contractNames: K[]
): Pick<ContractInstances, K> {
  const contracts = useContracts();
  
  return useMemo(() => {
    const subset = {} as Pick<ContractInstances, K>;
    contractNames.forEach(name => {
      subset[name] = contracts[name];
    });
    return subset;
  }, [contracts, contractNames]);
}

// Type helpers for better IDE support
export type ContractName = keyof ContractInstances;
export type VotingContract = ContractInstances['voting'];
export type CardCatalogContract = ContractInstances['cardCatalog'];
export type EvermarkNFTContract = ContractInstances['evermarkNFT'];
export type EvermarkRewardsContract = ContractInstances['evermarkRewards'];
export type LeaderboardContract = ContractInstances['leaderboard'];
export type FeeCollectorContract = ContractInstances['feeCollector'];
export type EmarkTokenContract = ContractInstances['emarkToken'];