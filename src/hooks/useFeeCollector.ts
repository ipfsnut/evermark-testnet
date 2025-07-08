import { useReadContract } from "thirdweb/react";
import { useState, useCallback, useMemo } from "react";
import { toEther, toWei } from "thirdweb/utils";
import { useContracts } from './core/useContracts';
import { useTransactionUtils } from './core/useTransactionUtils';
import { useWalletAuth } from "../providers/WalletProvider";
import { FEE_COLLECTOR_ABI, CONTRACTS } from "../lib/contracts";

export interface FeeDestination {
  destination: string;
  basisPoints: number;
  name: string;
  active: boolean;
}

export interface TokenConfig {
  supported: boolean;
  tokenAddress: string; // address(0) for ETH
  name: string;
  totalCollected: bigint;
}

export interface FeePreview {
  destinations: string[];
  amounts: bigint[];
  names: string[];
}

export function useFeeCollector() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { isConnected, address, requireConnection } = useWalletAuth();
  const { executeTransaction, isProcessing } = useTransactionUtils();
  const { feeCollector } = useContracts();

  const { data: ethDestinations, refetch: refetchEthDestinations } = useReadContract({
    contract: feeCollector,
    method: "function getFeeDestinations(string) view returns (tuple[])",
    params: ["ETH"],
  });

  const { data: wethDestinations, refetch: refetchWethDestinations } = useReadContract({
    contract: feeCollector,
    method: "function getFeeDestinations(string) view returns (tuple[])",
    params: ["WETH"],
  });

  const { data: emarkDestinations, refetch: refetchEmarkDestinations } = useReadContract({
    contract: feeCollector,
    method: "function getFeeDestinations(string) view returns (tuple[])",
    params: ["EMARK"],
  });

  const { data: ethTokenInfo } = useReadContract({
    contract: feeCollector,
    method: "function supportedTokens(string) view returns (bool,address,string,uint256)",
    params: ["ETH"],
  });

  const { data: wethTokenInfo } = useReadContract({
    contract: feeCollector,
    method: "function supportedTokens(string) view returns (bool,address,string,uint256)",
    params: ["WETH"],
  });

  const { data: emarkTokenInfo } = useReadContract({
    contract: feeCollector,
    method: "function supportedTokens(string) view returns (bool,address,string,uint256)",
    params: ["EMARK"],
  });

  // ✅ Get total ETH collected
  const { data: totalEthCollected } = useReadContract({
    contract: feeCollector,
    method: "function totalEthCollected() view returns (uint256)",
    params: [],
  });

  // ✅ Get EvermarkRewards contract address
  const { data: evermarkRewardsAddress } = useReadContract({
    contract: feeCollector,
    method: "function evermarkRewards() view returns (address)",
    params: [],
  });

  // ✅ Collect WETH trading fees using core transaction utilities
  const collectWethTradingFees = useCallback(async (amount: string) => {
    console.log('💰 Starting collect WETH fees process...');
    
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    setError(null);
    setSuccess(null);

    try {
      console.log('💰 Collecting', amount, 'WETH trading fees');
      
      const amountWei = toWei(amount);
      
      const result = await executeTransaction(
        CONTRACTS.FEE_COLLECTOR,
        FEE_COLLECTOR_ABI,
        "collectWethTradingFees",
        [amountWei],
        {
          successMessage: `Successfully collected ${amount} WETH trading fees`,
          errorContext: {
            operation: 'collectWethTradingFees',
            contract: 'FEE_COLLECTOR',
            amount,
            methodName: 'collectWethTradingFees',
            userAddress: address
          }
        }
      );
      
      if (result.success) {
        console.log("✅ WETH fee collection successful:", result.transactionHash);
        
        // Refetch relevant data
        setTimeout(() => {
          refetchWethDestinations();
        }, 2000);

        setSuccess(result.message || "Transaction completed successfully");
        return result;
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ WETH fee collection failed:", err);
      const errorMsg = err.message || "Failed to collect WETH fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isConnected, requireConnection, executeTransaction, refetchWethDestinations, address]);

  // ✅ Deposit WETH fees using core transaction utilities
  const depositWethFees = useCallback(async (amount: string) => {
    console.log('💰 Starting deposit WETH fees process...');
    
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    setError(null);
    setSuccess(null);

    try {
      const amountWei = toWei(amount);
      
      const result = await executeTransaction(
        CONTRACTS.FEE_COLLECTOR,
        FEE_COLLECTOR_ABI,
        "depositWethFees",
        [amountWei],
        {
          successMessage: `Successfully deposited ${amount} WETH fees`,
          errorContext: {
            operation: 'depositWethFees',
            contract: 'FEE_COLLECTOR',
            amount,
            methodName: 'depositWethFees',
            userAddress: address
          }
        }
      );
      
      if (result.success) {
        setTimeout(() => {
          refetchWethDestinations();
        }, 2000);

        setSuccess(result.message || "Transaction completed successfully");
        return result;
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error("❌ WETH fee deposit failed:", err);
      const errorMsg = err.message || "Failed to deposit WETH fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isConnected, requireConnection, executeTransaction, refetchWethDestinations, address]);

  // ✅ Collect ETH fees using core transaction utilities
  const collectEthFees = useCallback(async (source: string = "MANUAL") => {
    console.log('💰 Starting collect ETH fees process...');
    
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    setError(null);
    setSuccess(null);

    try {
      const result = await executeTransaction(
        CONTRACTS.FEE_COLLECTOR,
        FEE_COLLECTOR_ABI,
        "collectETH",
        [source],
        {
          value: BigInt(0),
          successMessage: `Successfully collected ETH fees with source: ${source}`,
          errorContext: {
            operation: 'collectETH',
            contract: 'FEE_COLLECTOR',
            methodName: 'collectETH',
            userAddress: address
          }
        }
      );
      
      if (result.success) {
        setTimeout(() => {
          refetchEthDestinations();
        }, 2000);

        setSuccess(result.message || "Transaction completed successfully");
        return result;
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error("❌ ETH fee collection failed:", err);
      const errorMsg = err.message || "Failed to collect ETH fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isConnected, requireConnection, executeTransaction, refetchEthDestinations, address]);

  // ✅ Collect token fees using core transaction utilities
  const collectTokenFees = useCallback(async (tokenSymbol: string, amount: string, source: string = "MANUAL") => {
    console.log('💰 Starting collect token fees process...');
    
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    setError(null);
    setSuccess(null);

    try {
      const amountWei = toWei(amount);
      
      const result = await executeTransaction(
        CONTRACTS.FEE_COLLECTOR,
        FEE_COLLECTOR_ABI,
        "collectToken",
        [tokenSymbol, amountWei, source],
        {
          successMessage: `Successfully collected ${amount} ${tokenSymbol} fees`,
          errorContext: {
            operation: 'collectToken',
            contract: 'FEE_COLLECTOR',
            amount,
            methodName: 'collectToken',
            userAddress: address
          }
        }
      );
      
      if (result.success) {
        // Refetch appropriate destinations
        setTimeout(() => {
          if (tokenSymbol === "WETH") refetchWethDestinations();
          else if (tokenSymbol === "EMARK") refetchEmarkDestinations();
          else if (tokenSymbol === "ETH") refetchEthDestinations();
        }, 2000);

        setSuccess(result.message || "Transaction completed successfully");
        return result;
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error(`❌ ${tokenSymbol} fee collection failed:`, err);
      const errorMsg = err.message || `Failed to collect ${tokenSymbol} fees`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isConnected, requireConnection, executeTransaction, refetchWethDestinations, refetchEmarkDestinations, refetchEthDestinations, address]);

  // Helper functions (unchanged)
  const formatBalance = useCallback((balance: bigint): string => {
    return parseFloat(toEther(balance)).toFixed(4);
  }, []);

  const getTotalRevenue = useCallback((): string => {
    const total = (totalEthCollected || BigInt(0));
    return formatBalance(total);
  }, [totalEthCollected, formatBalance]);

  // Get fee distribution for display
  const getFeeDistribution = useCallback((tokenSymbol: string) => {
    let destinations;
    switch (tokenSymbol) {
      case "ETH":
        destinations = ethDestinations;
        break;
      case "WETH":
        destinations = wethDestinations;
        break;
      case "EMARK":
        destinations = emarkDestinations;
        break;
      default:
        destinations = null;
    }

    if (!destinations || !Array.isArray(destinations)) {
      return { destinations: [], isConfigured: false };
    }

    return {
      destinations: destinations.map((dest: any) => ({
        address: dest.destination,
        percentage: dest.basisPoints / 100, // Convert basis points to percentage
        name: dest.name,
        active: dest.active
      })),
      isConfigured: destinations.length > 0
    };
  }, [ethDestinations, wethDestinations, emarkDestinations]);

  return {
    // Fee destination data
    ethDestinations,
    wethDestinations, 
    emarkDestinations,
    
    // Token configuration data
    ethTokenInfo,
    wethTokenInfo,
    emarkTokenInfo,
    
    // Statistics
    totalEthCollected: totalEthCollected || BigInt(0),
    evermarkRewardsAddress,
    
    // ✅ Fixed core collection actions
    collectWethTradingFees,
    depositWethFees,
    collectEthFees,
    collectTokenFees,
    
    // Utilities
    getFeeDistribution,
    formatBalance,
    getTotalRevenue,
    
    // State
    isProcessing,
    error,
    success,
    isConnected,
    
    // Refresh functions
    refetchEthDestinations,
    refetchWethDestinations,
    refetchEmarkDestinations,
    
    // Clear messages
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    },
    
    // Contract info
    contractAddress: CONTRACTS.FEE_COLLECTOR,
    version: "2.2.0",
    
    // Auth info for debugging
    authInfo: {
      isConnected,
      address,
    }
  };
}