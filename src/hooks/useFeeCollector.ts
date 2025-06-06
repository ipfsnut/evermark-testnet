// Fixed useFeeCollector.ts - Use unified wallet provider instead of thirdweb directly
// Replace your entire src/hooks/useFeeCollector.ts with this:

import { useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { encodeFunctionData } from "viem";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, FEE_COLLECTOR_ABI } from "../lib/contracts";
import { useState, useCallback, useMemo } from "react";
import { toEther, toWei } from "thirdweb/utils";
import { useWalletAuth, useWalletConnection } from "../providers/WalletProvider"; // ✅ USE UNIFIED PROVIDER

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // ✅ CRITICAL FIX: Use unified wallet providers
  const { isConnected, address, requireConnection } = useWalletAuth();
  const { sendTransaction, walletType } = useWalletConnection();
  
  const contract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.FEE_COLLECTOR,
    abi: FEE_COLLECTOR_ABI,
  }), []);

  // Fee destination queries (these work the same way)
  const { data: ethDestinations, refetch: refetchEthDestinations } = useReadContract({
    contract,
    method: "getFeeDestinations",
    params: ["ETH"],
  });

  const { data: wethDestinations, refetch: refetchWethDestinations } = useReadContract({
    contract,
    method: "getFeeDestinations", 
    params: ["WETH"],
  });

  const { data: emarkDestinations, refetch: refetchEmarkDestinations } = useReadContract({
    contract,
    method: "getFeeDestinations",
    params: ["EMARK"], 
  });

  // Token configuration queries
  const { data: ethTokenInfo } = useReadContract({
    contract,
    method: "supportedTokens",
    params: ["ETH"],
  });

  const { data: wethTokenInfo } = useReadContract({
    contract,
    method: "supportedTokens",
    params: ["WETH"],
  });

  const { data: emarkTokenInfo } = useReadContract({
    contract,
    method: "supportedTokens",
    params: ["EMARK"],
  });

  // Get total ETH collected
  const { data: totalEthCollected } = useReadContract({
    contract,
    method: "totalEthCollected",
    params: [],
  });

  // Get EvermarkRewards contract address
  const { data: evermarkRewardsAddress } = useReadContract({
    contract,
    method: "evermarkRewards",
    params: [],
  });

  // ✅ CRITICAL FIX: Collect WETH trading fees using unified wallet provider
  const collectWethTradingFees = useCallback(async (amount: string) => {
    console.log('💰 Starting collect WETH fees process...');
    
    // ✅ Use unified connection check
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('💰 Collecting', amount, 'WETH trading fees using', walletType);
      
      const amountWei = toWei(amount);
      
      // ✅ CRITICAL FIX: Prepare transaction based on wallet type
      let transaction;
      
      if (walletType === 'farcaster') {
        // Use viem encoding for Farcaster frames
        const data = encodeFunctionData({
          abi: FEE_COLLECTOR_ABI,
          functionName: 'collectWethTradingFees',
          args: [amountWei]
        });
        
        transaction = {
          to: CONTRACTS.FEE_COLLECTOR as `0x${string}`,
          data,
        };
      } else {
        // Use thirdweb for desktop
        transaction = prepareContractCall({
          contract,
          method: "collectWethTradingFees",
          params: [amountWei],
        });
      }

      console.log('📡 Sending collect WETH fees transaction via unified provider...');
      
      // ✅ Use unified wallet provider's sendTransaction
      const result = await sendTransaction(transaction);
      
      if (result.success) {
        console.log("✅ WETH fee collection successful:", result.transactionHash);
        
        // Refetch relevant data
        setTimeout(() => {
          refetchWethDestinations();
        }, 2000);

        const successMsg = `Successfully collected ${amount} WETH trading fees`;
        setSuccess(successMsg);
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ WETH fee collection failed:", err);
      const errorMsg = err.message || "Failed to collect WETH fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, requireConnection, walletType, contract, sendTransaction, refetchWethDestinations]);

  // ✅ CRITICAL FIX: Deposit WETH fees using unified wallet provider
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

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const amountWei = toWei(amount);
      
      let transaction;
      
      if (walletType === 'farcaster') {
        const data = encodeFunctionData({
          abi: FEE_COLLECTOR_ABI,
          functionName: 'depositWethFees',
          args: [amountWei]
        });
        
        transaction = {
          to: CONTRACTS.FEE_COLLECTOR as `0x${string}`,
          data,
        };
      } else {
        transaction = prepareContractCall({
          contract,
          method: "depositWethFees",
          params: [amountWei],
        });
      }

      const result = await sendTransaction(transaction);
      
      if (result.success) {
        setTimeout(() => {
          refetchWethDestinations();
        }, 2000);

        const successMsg = `Successfully deposited ${amount} WETH fees`;
        setSuccess(successMsg);
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error("❌ WETH fee deposit failed:", err);
      const errorMsg = err.message || "Failed to deposit WETH fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, requireConnection, walletType, contract, sendTransaction, refetchWethDestinations]);

  // ✅ CRITICAL FIX: Collect ETH fees using unified wallet provider
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

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      let transaction;
      
      if (walletType === 'farcaster') {
        const data = encodeFunctionData({
          abi: FEE_COLLECTOR_ABI,
          functionName: 'collectETH',
          args: [source]
        });
        
        transaction = {
          to: CONTRACTS.FEE_COLLECTOR as `0x${string}`,
          data,
          value: BigInt(0), // Amount sent as msg.value
        };
      } else {
        transaction = prepareContractCall({
          contract,
          method: "collectETH",
          params: [source],
          value: BigInt(0),
        });
      }

      const result = await sendTransaction(transaction);
      
      if (result.success) {
        setTimeout(() => {
          refetchEthDestinations();
        }, 2000);

        const successMsg = `Successfully collected ETH fees with source: ${source}`;
        setSuccess(successMsg);
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error("❌ ETH fee collection failed:", err);
      const errorMsg = err.message || "Failed to collect ETH fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, requireConnection, walletType, contract, sendTransaction, refetchEthDestinations]);

  // ✅ CRITICAL FIX: Collect token fees using unified wallet provider
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

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const amountWei = toWei(amount);
      
      let transaction;
      
      if (walletType === 'farcaster') {
        const data = encodeFunctionData({
          abi: FEE_COLLECTOR_ABI,
          functionName: 'collectToken',
          args: [tokenSymbol, amountWei, source]
        });
        
        transaction = {
          to: CONTRACTS.FEE_COLLECTOR as `0x${string}`,
          data,
        };
      } else {
        transaction = prepareContractCall({
          contract,
          method: "collectToken",
          params: [tokenSymbol, amountWei, source],
        });
      }

      const result = await sendTransaction(transaction);
      
      if (result.success) {
        // Refetch appropriate destinations
        setTimeout(() => {
          if (tokenSymbol === "WETH") refetchWethDestinations();
          else if (tokenSymbol === "EMARK") refetchEmarkDestinations();
          else if (tokenSymbol === "ETH") refetchEthDestinations();
        }, 2000);

        const successMsg = `Successfully collected ${amount} ${tokenSymbol} fees`;
        setSuccess(successMsg);
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error(`❌ ${tokenSymbol} fee collection failed:`, err);
      const errorMsg = err.message || `Failed to collect ${tokenSymbol} fees`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, requireConnection, walletType, contract, sendTransaction, refetchWethDestinations, refetchEmarkDestinations, refetchEthDestinations]);

  // ✅ CRITICAL FIX: Setup 50/50 split using unified wallet provider
  const setup50_50Split = useCallback(async (tokenSymbol: string, devAddress: string, rewardsAddress: string) => {
    console.log('💰 Starting setup 50/50 split process...');
    
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet - admin required";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      let transaction;
      
      if (walletType === 'farcaster') {
        const data = encodeFunctionData({
          abi: FEE_COLLECTOR_ABI,
          functionName: 'setup50_50Split',
          args: [tokenSymbol, devAddress, rewardsAddress]
        });
        
        transaction = {
          to: CONTRACTS.FEE_COLLECTOR as `0x${string}`,
          data,
        };
      } else {
        transaction = prepareContractCall({
          contract,
          method: "setup50_50Split",
          params: [tokenSymbol, devAddress, rewardsAddress],
        });
      }

      const result = await sendTransaction(transaction);
      
      if (result.success) {
        // Refetch appropriate destinations
        setTimeout(() => {
          if (tokenSymbol === "WETH") refetchWethDestinations();
          else if (tokenSymbol === "EMARK") refetchEmarkDestinations();
          else if (tokenSymbol === "ETH") refetchEthDestinations();
        }, 2000);

        const successMsg = `Successfully configured 50/50 split for ${tokenSymbol}`;
        setSuccess(successMsg);
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error("❌ 50/50 split setup failed:", err);
      const errorMsg = err.message || "Failed to setup 50/50 split";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, requireConnection, walletType, contract, sendTransaction, refetchWethDestinations, refetchEmarkDestinations, refetchEthDestinations]);

  // ✅ CRITICAL FIX: Bootstrap configuration using unified wallet provider
  const bootstrapWethEmarkConfig = useCallback(async (
    wethTokenAddress: string, 
    emarkTokenAddress: string, 
    evermarkRewardsAddress: string, 
    devAddress: string
  ) => {
    console.log('💰 Starting bootstrap config process...');
    
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet - admin required";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      let transaction;
      
      if (walletType === 'farcaster') {
        const data = encodeFunctionData({
          abi: FEE_COLLECTOR_ABI,
          functionName: 'bootstrapWethEmarkConfig',
          args: [wethTokenAddress, emarkTokenAddress, evermarkRewardsAddress, devAddress]
        });
        
        transaction = {
          to: CONTRACTS.FEE_COLLECTOR as `0x${string}`,
          data,
        };
      } else {
        transaction = prepareContractCall({
          contract,
          method: "bootstrapWethEmarkConfig",
          params: [wethTokenAddress, emarkTokenAddress, evermarkRewardsAddress, devAddress],
        });
      }

      const result = await sendTransaction(transaction);
      
      if (result.success) {
        // Refetch all destinations
        setTimeout(() => {
          refetchEthDestinations();
          refetchWethDestinations();
          refetchEmarkDestinations();
        }, 2000);

        const successMsg = "Successfully bootstrapped WETH + EMARK configuration";
        setSuccess(successMsg);
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error("❌ Bootstrap configuration failed:", err);
      const errorMsg = err.message || "Failed to bootstrap configuration";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, requireConnection, walletType, contract, sendTransaction, refetchEthDestinations, refetchWethDestinations, refetchEmarkDestinations]);

  // Preview fee splits (read-only, works the same)
  const previewFeeSplit = useCallback(async (tokenSymbol: string, amount: string): Promise<FeePreview | null> => {
    try {
      const amountWei = toWei(amount);
      
      const preview = await readContract({
        contract,
        method: "previewFeeSplit",
        params: [tokenSymbol, amountWei],
      });
      
      return {
        destinations: preview[0],
        amounts: preview[1], 
        names: preview[2]
      };
    } catch (err) {
      console.error("Error previewing fee split:", err);
      return null;
    }
  }, [contract]);

  // Helper functions (no changes needed)
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
    
    // ✅ Fixed preview and configuration
    previewFeeSplit,
    setup50_50Split,
    bootstrapWethEmarkConfig,
    
    // Utilities
    getFeeDistribution,
    formatBalance,
    getTotalRevenue,
    
    // State
    isProcessing,
    error,
    success,
    isConnected, // ✅ From unified provider
    
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
    
    // ✅ Auth info for debugging
    authInfo: {
      isConnected,
      address,
      walletType
    }
  };
}