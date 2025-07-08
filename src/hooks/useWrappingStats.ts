// src/hooks/useWrappingStats.ts - ✅ FIXED with proper imports and ThirdWeb v5 syntax
import { useMemo } from 'react';
import { useReadContract } from "thirdweb/react";
import { useContracts } from './core/useContracts';

export interface WrappingStats {
  unbondingPeriod: number; // in seconds
  unbondingPeriodDays: number; // converted to days
  totalProtocolWrapped: bigint;
  formatUnbondingPeriod: () => string;
}

export function useWrappingStats() {
  // ✅ Use core contracts instead of creating our own
  const { cardCatalog } = useContracts();
  
  // ✅ FIXED: Use correct ThirdWeb v5 syntax
  const { data: unbondingPeriod } = useReadContract({
    contract: cardCatalog,
    method: "function UNBONDING_PERIOD() view returns (uint256)",
    params: [],
  });
  
  // ✅ FIXED: Use correct ThirdWeb v5 syntax
  const { data: totalWrapped } = useReadContract({
    contract: cardCatalog,
    method: "function getTotalStakedEmark() view returns (uint256)",
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