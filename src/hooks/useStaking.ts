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
  
  // Get total staked amount (wrapped tokens) - Always call hook
  const totalStakedQuery = useReadContract({
    contract: catalogContract,
    method: "balanceOf",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  const totalStaked = totalStakedQuery.data;
  const isLoadingTotalStaked = totalStakedQuery.isLoading;
  
  // Get available voting power - Always call hook
  const votingPowerQuery = useReadContract({
    contract: catalogContract,
    method: "getAvailableVotingPower",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  const availableVotingPower = votingPowerQuery.data;
  const isLoadingVotingPower = votingPowerQuery.isLoading;
  
  // Get unbonding requests - Always call hook
  const unbondingRequestsQuery = useReadContract({
    contract: catalogContract,
    method: "getUnbondingRequests",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  const unbondingRequests = unbondingRequestsQuery.data;
  const isLoadingUnbondingRequests = unbondingRequestsQuery.isLoading;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Function to stake tokens (wrap)
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
      
      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "wrap",
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
  
  // Function to request unstaking (unwrap)
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
      
      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "requestUnwrap",
        params: [amountWei] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch data after successful transaction
      setTimeout(() => {
        totalStakedQuery.refetch();
        unbondingRequestsQuery.refetch();
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
  
  // Function to complete unstaking
  const completeUnstake = async (requestIndex: number) => {
    if (!userAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "completeUnwrap",
        params: [BigInt(requestIndex)] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch data after successful transaction
      setTimeout(() => {
        totalStakedQuery.refetch();
        unbondingRequestsQuery.refetch();
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
  
  // Function to cancel an unbonding request
  const cancelUnbonding = async (requestIndex: number) => {
    if (!userAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "cancelUnbonding",
        params: [BigInt(requestIndex)] as const,
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch data after successful transaction
      setTimeout(() => {
        totalStakedQuery.refetch();
        unbondingRequestsQuery.refetch();
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