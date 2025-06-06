import { useReadContract, useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, FEE_COLLECTOR_ABI } from "../lib/contracts";
import { useState, useCallback, useMemo } from "react";
import { toEther, toWei } from "thirdweb/utils";

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
  const account = useActiveAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const contract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.FEE_COLLECTOR,
    abi: FEE_COLLECTOR_ABI,
  }), []);

  // ✅ NEW: Get fee destinations for different tokens
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

  // ✅ NEW: Get supported tokens info  
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

  // ✅ NEW: Get total ETH collected
  const { data: totalEthCollected } = useReadContract({
    contract,
    method: "totalEthCollected",
    params: [],
  });

  // ✅ NEW: Get EvermarkRewards contract address
  const { data: evermarkRewardsAddress } = useReadContract({
    contract,
    method: "evermarkRewards",
    params: [],
  });

  const { mutate: sendTransaction } = useSendTransaction();

  // ✅ NEW: Collect WETH trading fees (main Clanker integration)
  const collectWethTradingFees = useCallback(async (amount: string) => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const amountWei = toWei(amount);
      
      const transaction = prepareContractCall({
        contract,
        method: "collectWethTradingFees", // ✅ New method for Clanker fees
        params: [amountWei],
      });

      await sendTransaction(transaction as any);

      // Refetch relevant data
      setTimeout(() => {
        refetchWethDestinations();
      }, 2000);

      const successMsg = `Successfully collected ${amount} WETH trading fees`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error collecting WETH fees:", err);
      const errorMsg = err.message || "Failed to collect WETH fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction, refetchWethDestinations]);

  // ✅ NEW: Deposit WETH fees directly
  const depositWethFees = useCallback(async (amount: string) => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const amountWei = toWei(amount);
      
      const transaction = prepareContractCall({
        contract,
        method: "depositWethFees", // ✅ New method for direct deposits
        params: [amountWei],
      });

      await sendTransaction(transaction as any);

      setTimeout(() => {
        refetchWethDestinations();
      }, 2000);

      const successMsg = `Successfully deposited ${amount} WETH fees`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error depositing WETH fees:", err);
      const errorMsg = err.message || "Failed to deposit WETH fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction, refetchWethDestinations]);

  // ✅ NEW: Collect ETH fees with source tracking
  const collectEthFees = useCallback(async (source: string = "MANUAL") => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const transaction = prepareContractCall({
        contract,
        method: "collectETH", // ✅ New method with source tracking
        params: [source],
        value: BigInt(0), // Amount sent as msg.value
      });

      await sendTransaction(transaction as any);

      setTimeout(() => {
        refetchEthDestinations();
      }, 2000);

      const successMsg = `Successfully collected ETH fees with source: ${source}`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error collecting ETH fees:", err);
      const errorMsg = err.message || "Failed to collect ETH fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction, refetchEthDestinations]);

  // ✅ NEW: Collect any ERC20 token fees
  const collectTokenFees = useCallback(async (tokenSymbol: string, amount: string, source: string = "MANUAL") => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const amountWei = toWei(amount);
      
      const transaction = prepareContractCall({
        contract,
        method: "collectToken", // ✅ Generic token collection method
        params: [tokenSymbol, amountWei, source],
      });

      await sendTransaction(transaction as any);

      // Refetch appropriate destinations
      setTimeout(() => {
        if (tokenSymbol === "WETH") refetchWethDestinations();
        else if (tokenSymbol === "EMARK") refetchEmarkDestinations();
        else if (tokenSymbol === "ETH") refetchEthDestinations();
      }, 2000);

      const successMsg = `Successfully collected ${amount} ${tokenSymbol} fees`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error(`Error collecting ${tokenSymbol} fees:`, err);
      const errorMsg = err.message || `Failed to collect ${tokenSymbol} fees`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction, refetchWethDestinations, refetchEmarkDestinations, refetchEthDestinations]);

  // ✅ NEW: Preview fee splits before executing
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

  // ✅ NEW: Setup 50/50 split (admin function)
  const setup50_50Split = useCallback(async (tokenSymbol: string, devAddress: string, rewardsAddress: string) => {
    if (!account?.address) {
      setError("Please connect your wallet - admin required");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const transaction = prepareContractCall({
        contract,
        method: "setup50_50Split", // ✅ Convenience method for 50/50 splits
        params: [tokenSymbol, devAddress, rewardsAddress],
      });

      await sendTransaction(transaction as any);

      // Refetch appropriate destinations
      setTimeout(() => {
        if (tokenSymbol === "WETH") refetchWethDestinations();
        else if (tokenSymbol === "EMARK") refetchEmarkDestinations();
        else if (tokenSymbol === "ETH") refetchEthDestinations();
      }, 2000);

      const successMsg = `Successfully configured 50/50 split for ${tokenSymbol}`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error setting up 50/50 split:", err);
      const errorMsg = err.message || "Failed to setup 50/50 split";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction, refetchWethDestinations, refetchEmarkDestinations, refetchEthDestinations]);

  // ✅ NEW: Bootstrap full WETH + EMARK configuration (admin function)
  const bootstrapWethEmarkConfig = useCallback(async (
    wethTokenAddress: string, 
    emarkTokenAddress: string, 
    evermarkRewardsAddress: string, 
    devAddress: string
  ) => {
    if (!account?.address) {
      setError("Please connect your wallet - admin required");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const transaction = prepareContractCall({
        contract,
        method: "bootstrapWethEmarkConfig", // ✅ Full bootstrap method
        params: [wethTokenAddress, emarkTokenAddress, evermarkRewardsAddress, devAddress],
      });

      await sendTransaction(transaction as any);

      // Refetch all destinations
      setTimeout(() => {
        refetchEthDestinations();
        refetchWethDestinations();
        refetchEmarkDestinations();
      }, 2000);

      const successMsg = "Successfully bootstrapped WETH + EMARK configuration";
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error bootstrapping configuration:", err);
      const errorMsg = err.message || "Failed to bootstrap configuration";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction, refetchEthDestinations, refetchWethDestinations, refetchEmarkDestinations]);

  // Helper functions
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
    
    // Core collection actions
    collectWethTradingFees, // ✅ Main Clanker integration
    depositWethFees, // ✅ Direct WETH deposits
    collectEthFees, // ✅ ETH collection with source tracking
    collectTokenFees, // ✅ Generic token collection
    
    // Preview and configuration
    previewFeeSplit, // ✅ Preview before executing
    setup50_50Split, // ✅ Quick 50/50 setup
    bootstrapWethEmarkConfig, // ✅ Full bootstrap
    
    // Utilities
    getFeeDistribution,
    formatBalance,
    getTotalRevenue,
    
    // State
    isProcessing,
    error,
    success,
    isConnected: !!account,
    
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
    version: "2.2.0", // From contract
  };
}