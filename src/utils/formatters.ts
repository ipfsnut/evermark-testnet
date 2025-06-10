import { toEther } from "thirdweb/utils";

/**
 * 🔧 FIXED: Format EMARK amounts with proper decimal handling
 * This was likely the source of the 10x-11x display bug
 */
export function formatEmark(value: bigint | undefined | null, decimals: number = 2): string {
  if (!value || value === BigInt(0)) {
    return "0";
  }

  try {
    // 🔧 FIX: Use thirdweb's toEther for reliable conversion
    const etherValue = toEther(value);
    const numValue = parseFloat(etherValue);
    
    // 🔧 FIX: Handle very small amounts that might round to 0
    if (numValue === 0 && value > BigInt(0)) {
      // Show more decimals for very small amounts
      return parseFloat(etherValue).toFixed(Math.max(decimals, 8));
    }
    
    // 🔧 FIX: Use proper decimal formatting
    return numValue.toFixed(decimals);
  } catch (error) {
    console.error('❌ Error formatting EMARK amount:', error, 'Value:', value?.toString());
    return "0";
  }
}

/**
 * 🔧 FIXED: Format EMARK with symbol, ensuring consistent decimal handling
 */
export function formatEmarkWithSymbol(value: bigint | undefined | null, decimals: number = 2): string {
  const formatted = formatEmark(value, decimals);
  return `${formatted} $EMARK`;
}

/**
 * 🔧 FIXED: Format wEMARK (wrapped EMARK) with symbol
 */
export function formatWEmarkWithSymbol(value: bigint | undefined | null, decimals: number = 2): string {
  const formatted = formatEmark(value, decimals);
  return `${formatted} wEMARK`;
}

/**
 * 🔧 NEW: Format ETH amounts using same reliable method
 */
export function formatEth(value: bigint | undefined | null, decimals: number = 4): string {
  if (!value || value === BigInt(0)) {
    return "0";
  }

  try {
    const etherValue = toEther(value);
    const numValue = parseFloat(etherValue);
    
    if (numValue === 0 && value > BigInt(0)) {
      return parseFloat(etherValue).toFixed(Math.max(decimals, 8));
    }
    
    return numValue.toFixed(decimals);
  } catch (error) {
    console.error('❌ Error formatting ETH amount:', error, 'Value:', value?.toString());
    return "0";
  }
}

/**
 * 🔧 NEW: Format ETH with symbol
 */
export function formatEthWithSymbol(value: bigint | undefined | null, decimals: number = 4): string {
  const formatted = formatEth(value, decimals);
  return `${formatted} ETH`;
}

/**
 * 🔧 NEW: Format WETH with symbol  
 */
export function formatWethWithSymbol(value: bigint | undefined | null, decimals: number = 4): string {
  const formatted = formatEth(value, decimals);
  return `${formatted} WETH`;
}

/**
 * 🔧 NEW: Debug function to help identify formatting issues
 */
export function debugFormatting(value: bigint | undefined | null, label: string = ""): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 ${label} Formatting Debug:`, {
      rawValue: value?.toString() || 'null/undefined',
      toEther: value ? toEther(value) : 'N/A',
      formatEmark_2: value ? formatEmark(value, 2) : 'N/A',
      formatEmark_6: value ? formatEmark(value, 6) : 'N/A',
      formatEmarkWithSymbol: value ? formatEmarkWithSymbol(value, 6) : 'N/A'
    });
  }
}

/**
 * 🔧 NEW: Format percentage values
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) {
    return "0";
  }
  return value.toFixed(decimals);
}

/**
 * 🔧 NEW: Format large numbers with proper scaling
 */
export function formatLargeNumber(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) {
    return "0";
  }
  
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(decimals)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(decimals)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(decimals)}K`;
  }
  
  return value.toFixed(decimals);
}

/**
 * 🔧 NEW: Safe number parsing with fallback
 */
export function safeParseFloat(value: string | undefined | null): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 🔧 NEW: Convert wei string to readable format
 */
export function weiToReadable(weiString: string, symbol: string = "", decimals: number = 6): string {
  try {
    const bigIntValue = BigInt(weiString);
    const formatted = formatEmark(bigIntValue, decimals);
    return symbol ? `${formatted} ${symbol}` : formatted;
  } catch (error) {
    console.error('❌ Error converting wei to readable:', error);
    return "0";
  }
}

/**
 * 🔧 NEW: Validation helper to ensure BigInt values are handled correctly
 */
export function validateBigIntValue(value: any, fallback: bigint = BigInt(0)): bigint {
  try {
    if (value === null || value === undefined) {
      return fallback;
    }
    
    if (typeof value === 'bigint') {
      return value;
    }
    
    if (typeof value === 'string' || typeof value === 'number') {
      return BigInt(value);
    }
    
    console.warn('⚠️ Unexpected value type for BigInt conversion:', typeof value, value);
    return fallback;
  } catch (error) {
    console.error('❌ Error validating BigInt value:', error, value);
    return fallback;
  }
}