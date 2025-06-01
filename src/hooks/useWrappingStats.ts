import { useMemo } from 'react';
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS } from "../lib/contracts";

// Import the CardCatalog ABI
import CardCatalogABI from "../lib/abis/CardCatalog.json";

export interface WrappingStats {
  unbondingPeriod: number;
  totalProtocolWrapped: bigint;
  formatUnbondingPeriod: () => string;
}

export function useWrappingStats() {
  const wrappingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CardCatalogABI as any, // Type assertion to avoid ABI typing issues
  }), []);
  
  // Get unbonding period from contract
  const { data: unbondingPeriod } = useReadContract({
    contract: wrappingContract,
    method: "UNBONDING_PERIOD",
    params: [],
  });
  
  // Get total wrapped in protocol
  const { data: totalWrapped } = useReadContract({
    contract: wrappingContract,
    method: "getTotalStakedEmark",
    params: [],
  });
  
  const wrappingStats: WrappingStats = useMemo(() => ({
    unbondingPeriod: unbondingPeriod ? Number(unbondingPeriod) : 7,
    totalProtocolWrapped: totalWrapped || BigInt(0),
    formatUnbondingPeriod: () => {
      const days = unbondingPeriod ? Number(unbondingPeriod) : 7;
      if (days === 7) return '1 week';
      if (days === 14) return '2 weeks';
      if (days === 30) return '1 month';
      return `${days} days`;
    }
  }), [unbondingPeriod, totalWrapped]);
  
  return wrappingStats;
}
