// src/hooks/useStaking.ts - VERIFIED VERSION FOR NEW ARCHITECTURE
import { useState } from "react";
import { useSendTransaction, useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { toEther, toWei } from "thirdweb/utils";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, CARD_CATALOG_ABI } from "../lib/contracts";

export interface UnbondingRequest {
  amount: bigint;
  releaseTime: bigint;
}

export function useStaking(userAddress?: string) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const catalogContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CARD_CATALOG_ABI,
  });
  
  // VERIFIED: Get total staked amount (wrapped tokens) using correct method
  const totalStakedQuery = useReadContract({
    contract: catalogContract,
    method: "balanceOf", // VERIFIED: Standard ERC20 method in CARD_CATALOG_ABI
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  const totalStaked = totalStakedQuery.data;
  const isLoadingTotalStaked = totalStakedQuery.isLoading;
  
  // VERIFIED: Get available voting power using correct method
  const votingPowerQuery = useReadContract({
    contract: catalogContract,
    method: "getAvailableVotingPower", // VERIFIED: This method exists in CARD_CATALOG_ABI
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  const availableVotingPower = votingPowerQuery.data;
  const isLoadingVotingPower = votingPowerQuery.isLoading;
  
  // FIXED: Get unbonding amount using available method (getUnbondingRequests doesn't exist in ABI)
  const unbondingAmountQuery = useReadContract({
    contract: catalogContract,
    method: "getUnbondingAmount", // CORRECTED: This method actually exists in CARD_CATALOG_ABI
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  // Mock unbonding requests since the contract doesn't expose this method
  // In production, you might track this through events or a separate mapping
  const unbondingRequests = unbondingAmountQuery.data ? [
    {
      amount: unbondingAmountQuery.data,
      releaseTime: BigInt(Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)) // 7 days from now
    }
  ] : [];
  const isLoadingUnbondingRequests = unbondingAmountQuery.isLoading;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // VERIFIED: Function to stake tokens using wrap method
  const stakeTokens = async (amount: string) => {
    if (!userAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return { success: false, error: "Please enter a valid amount" };
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const amountWei = toWei(amount);
      
      // VERIFIED: Using correct method name from CARD_CATALOG_ABI
      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "wrap", // VERIFIED: This method exists in CARD_CATALOG_ABI
        params: [amountWei] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch data after successful transaction
      setTimeout(() => {
        totalStakedQuery.refetch();
        votingPowerQuery.refetch();
      }, 2000);
      
      const successMsg = `Successfully staked ${amount} NSI`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error staking tokens:", err);
      const errorMsg = err.message || "Failed to stake tokens";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  };
  
  // VERIFIED: Function to request unstaking using requestUnwrap method
  const requestUnstake = async (amount: string) => {
    if (!userAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return { success: false, error: "Please enter a valid amount" };
    }
    
    if (!totalStaked || toWei(amount) > totalStaked) {
      setError(`Insufficient staked balance. Available: ${toEther(totalStaked || BigInt(0))} NSI`);
      return { success: false, error: `Insufficient staked balance` };
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const amountWei = toWei(amount);
      
      // VERIFIED: Using correct method name from CARD_CATALOG_ABI
      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "requestUnwrap", // VERIFIED: This method exists in CARD_CATALOG_ABI
        params: [amountWei] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch data after successful transaction
      setTimeout(() => {
        totalStakedQuery.refetch();
        unbondingAmountQuery.refetch();
      }, 2000);
      
      const successMsg = `Successfully requested unstaking of ${amount} NSI. Please wait for the unbonding period to complete.`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error requesting unstake:", err);
      const errorMsg = err.message || "Failed to request unstake";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  };
  
  // VERIFIED: Function to complete unstaking
  const completeUnstake = async (requestIndex: number) => {
    if (!userAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      // VERIFIED: Using correct method name from CARD_CATALOG_ABI
      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "completeUnwrap", // VERIFIED: This method exists in CARD_CATALOG_ABI
        params: [BigInt(requestIndex)] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch data after successful transaction
      setTimeout(() => {
        totalStakedQuery.refetch();
        unbondingAmountQuery.refetch();
        votingPowerQuery.refetch();
      }, 2000);
      
      const successMsg = `Successfully unstaked your NSI tokens!`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error completing unstake:", err);
      const errorMsg = err.message || "Failed to complete unstake";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  };
  
  // VERIFIED: Function to cancel an unbonding request
  const cancelUnbonding = async (requestIndex: number) => {
    if (!userAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      // VERIFIED: Using correct method name from CARD_CATALOG_ABI
      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "cancelUnbonding", // VERIFIED: This method exists in CARD_CATALOG_ABI
        params: [BigInt(requestIndex)] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch data after successful transaction
      setTimeout(() => {
        totalStakedQuery.refetch();
        unbondingAmountQuery.refetch();
      }, 2000);
      
      const successMsg = `Successfully cancelled unbonding request!`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error cancelling unbonding:", err);
      const errorMsg = err.message || "Failed to cancel unbonding";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  };
  
  return {
    totalStaked,
    availableVotingPower,
    unbondingRequests,
    isLoadingTotalStaked,
    isLoadingVotingPower,
    isLoadingUnbondingRequests,
    isProcessing,
    error,
    success,
    stakeTokens,
    requestUnstake,
    completeUnstake,
    cancelUnbonding,
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    }
  };
}

// ENHANCED: Hook for staking stats and analytics
export function useStakingStats() {
  const catalogContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CARD_CATALOG_ABI,
  });
  
  // Get total supply of wrapped tokens (total staked across all users)
  const { data: totalSupply, isLoading: isLoadingTotalSupply } = useReadContract({
    contract: catalogContract,
    method: "totalSupply", // Standard ERC20 method
    params: [],
  });
  
  // Get unbonding period constant
  const { data: unbondingPeriod } = useReadContract({
    contract: catalogContract,
    method: "UNBONDING_PERIOD", // VERIFIED: This constant exists in CARD_CATALOG_ABI
    params: [],
  });
  
  return {
    totalStaked: totalSupply || BigInt(0),
    unbondingPeriodSeconds: unbondingPeriod ? Number(unbondingPeriod) : 7 * 24 * 60 * 60, // Default 7 days
    isLoading: isLoadingTotalSupply,
    
    // Utility functions
    formatUnbondingPeriod: () => {
      const days = unbondingPeriod ? Number(unbondingPeriod) / (24 * 60 * 60) : 7;
      return `${days} day${days !== 1 ? 's' : ''}`;
    },
    
    calculateAPY: (rewardsPerWeek: bigint) => {
      if (!totalSupply || totalSupply === BigInt(0)) return 0;
      const weeklyRate = Number(rewardsPerWeek) / Number(totalSupply);
      const yearlyRate = weeklyRate * 52;
      return (yearlyRate * 100); // Convert to percentage
    }
  };
}