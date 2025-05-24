import { useReadContract, useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, FEE_COLLECTOR_ABI } from "../lib/contracts";
import { useState, useCallback } from "react";
import { toEther } from "thirdweb/utils";

export interface FeeDistribution {
  treasuryPercentage: number;
  developmentPercentage: number;
  rewardPoolPercentage: number;
}

export interface FeeStats {
  treasuryBalance: bigint;
  rewardPoolBalance: bigint;
  totalCollected: bigint;
  lastDistribution: number;
}

export function useFeeCollector() {
  const account = useActiveAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const contract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.FEE_COLLECTOR,
    abi: FEE_COLLECTOR_ABI,
  });

  // Get treasury balance
  const { data: treasuryBalance, isLoading: treasuryLoading, refetch: refetchTreasury } = useReadContract({
    contract,
    method: "getTreasuryBalance",
    params: [],
  });

  // Get reward pool balance
  const { data: rewardPoolBalance, isLoading: rewardPoolLoading, refetch: refetchRewardPool } = useReadContract({
    contract,
    method: "getRewardPoolBalance", 
    params: [],
  });

  const { mutate: sendTransaction } = useSendTransaction();

  // Distribute collected fees (admin function)
  const distributeFees = useCallback(async (amount: string) => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const amountWei = BigInt(amount);
      
      const transaction = prepareContractCall({
        contract,
        method: "distributeFees",
        params: [amountWei],
      });

      await sendTransaction(transaction as any);

      // Refetch balances after distribution
      setTimeout(() => {
        refetchTreasury();
        refetchRewardPool();
      }, 2000);

      const successMsg = `Successfully distributed ${toEther(amountWei)} ETH in fees`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error distributing fees:", err);
      const errorMsg = err.message || "Failed to distribute fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction, refetchTreasury, refetchRewardPool]);

  // Collect fees from a specific token (admin function)
  const collectFees = useCallback(async (tokenAddress: string, amount: string) => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const amountWei = BigInt(amount);
      
      const transaction = prepareContractCall({
        contract,
        method: "collectFees",
        params: [tokenAddress, amountWei],
      });

      await sendTransaction(transaction as any);

      const successMsg = `Successfully collected fees from ${tokenAddress}`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error collecting fees:", err);
      const errorMsg = err.message || "Failed to collect fees";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction]);

  // Get fee distribution breakdown (static for now, could be contract-based)
  const getFeeDistribution = (): FeeDistribution => ({
    treasuryPercentage: 30,
    developmentPercentage: 10,
    rewardPoolPercentage: 60,
  });

  // Get aggregated fee stats
  const getFeeStats = (): FeeStats => ({
    treasuryBalance: treasuryBalance || 0n,
    rewardPoolBalance: rewardPoolBalance || 0n,
    totalCollected: (treasuryBalance || 0n) + (rewardPoolBalance || 0n),
    lastDistribution: Date.now() - (24 * 60 * 60 * 1000), // Mock: 24 hours ago
  });

  // Format balance for display
  const formatBalance = (balance: bigint): string => {
    return parseFloat(toEther(balance)).toFixed(4);
  };

  // Calculate total protocol revenue
  const getTotalRevenue = (): string => {
    const total = (treasuryBalance || 0n) + (rewardPoolBalance || 0n);
    return formatBalance(total);
  };

  return {
    // Data
    treasuryBalance: treasuryBalance || 0n,
    rewardPoolBalance: rewardPoolBalance || 0n,
    treasuryLoading,
    rewardPoolLoading,
    
    // Actions (admin functions)
    distributeFees,
    collectFees,
    
    // Utilities
    getFeeDistribution,
    getFeeStats,
    formatBalance,
    getTotalRevenue,
    
    // State
    isProcessing,
    error,
    success,
    isConnected: !!account,
    
    // Refresh functions
    refetchTreasury,
    refetchRewardPool,
    
    // Clear messages
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    },
  };
}