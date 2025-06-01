import { useMemo } from 'react';
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS } from "../lib/contracts";
import CardCatalogABI from "../lib/abis/CardCatalog.json";

export interface WrappingStats {
  unbondingPeriod: number; // in seconds
  unbondingPeriodDays: number; // converted to days
  totalProtocolWrapped: bigint;
  formatUnbondingPeriod: () => string;
}

export function useWrappingStats() {
  const wrappingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CardCatalogABI as any,
  }), []);
  
  // Get unbonding period from contract (should be in seconds)
  const { data: unbondingPeriod } = useReadContract({
    contract: wrappingContract,
    method: "UNBONDING_PERIOD",
    params: [],
  });
  
  // Get total wrapped in protocol
  const { data: totalWrapped } = useReadContract({
    contract: wrappingContract,
    method: "getTotalStakedEmark", // This might be the total wrapped amount
    params: [],
  });
  
  const wrappingStats: WrappingStats = useMemo(() => {
    const periodInSeconds = unbondingPeriod ? Number(unbondingPeriod) : 604800; // Default 7 days in seconds
    const periodInDays = Math.floor(periodInSeconds / (24 * 60 * 60)); // Convert seconds to days
    
    console.log("🕐 Unbonding period calculation:", {
      rawValue: unbondingPeriod?.toString(),
      periodInSeconds,
      periodInDays,
      calculation: `${periodInSeconds} seconds ÷ ${24 * 60 * 60} = ${periodInDays} days`
    });
    
    return {
      unbondingPeriod: periodInSeconds,
      unbondingPeriodDays: periodInDays,
      totalProtocolWrapped: totalWrapped || BigInt(0),
      formatUnbondingPeriod: () => {
        if (periodInDays === 1) return '1 day';
        if (periodInDays === 7) return '1 week';
        if (periodInDays === 14) return '2 weeks';
        if (periodInDays === 30) return '1 month';
        return `${periodInDays} days`;
      }
    };
  }, [unbondingPeriod, totalWrapped]);
  
  return wrappingStats;
}
