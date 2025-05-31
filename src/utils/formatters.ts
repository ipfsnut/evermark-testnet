import { toEther } from "thirdweb/utils";

// Format EMARK tokens with proper decimal places
export function formatEmark(amount: bigint | undefined | null, decimals: number = 2): string | null {
  if (!amount || amount === BigInt(0)) {
    return null;
  }
  
  try {
    const etherValue = toEther(amount);
    const numValue = parseFloat(etherValue);
    
    // Return null for very small amounts that would round to 0
    if (numValue < Math.pow(10, -decimals)) {
      return null;
    }
    
    return numValue.toFixed(decimals);
  } catch (error) {
    console.error('Error formatting EMARK amount:', error);
    return null;
  }
}

// Format EMARK with currency symbol
export function formatEmarkWithSymbol(amount: bigint | undefined | null, decimals: number = 2): string {
  const formatted = formatEmark(amount, decimals);
  return formatted ? `${formatted} $EMARK` : '0 $EMARK';
}

// Format large numbers with K, M suffixes
export function formatLargeNumber(amount: bigint | undefined | null, decimals: number = 2): string | null {
  if (!amount || amount === BigInt(0)) {
    return null;
  }
  
  try {
    const etherValue = toEther(amount);
    const numValue = parseFloat(etherValue);
    
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(decimals)}M`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(decimals)}K`;
    } else if (numValue < Math.pow(10, -decimals)) {
      return null;
    } else {
      return numValue.toFixed(decimals);
    }
  } catch (error) {
    console.error('Error formatting large number:', error);
    return null;
  }
}

// Add just the wEMARK-specific formatters
export function formatWEmarkWithSymbol(amount: bigint | undefined | null, decimals: number = 2): string {
  const formatted = formatEmark(amount, decimals);
  return formatted ? `${formatted} wEMARK` : '0 wEMARK';
}

// Helper to format both token types with proper symbols
export function formatTokenAmount(
  amount: bigint | undefined | null, 
  tokenType: 'EMARK' | 'wEMARK', 
  decimals: number = 2
): string {
  const formatted = formatEmark(amount, decimals);
  const symbol = tokenType === 'wEMARK' ? 'wEMARK' : '$EMARK';
  return formatted ? `${formatted} ${symbol}` : `0 ${symbol}`;
}