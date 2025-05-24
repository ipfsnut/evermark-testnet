import { useState } from "react";
import { useSendTransaction, useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { toEther, toWei } from "thirdweb/utils";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, CARD_CATALOG_ABI, EMARK_TOKEN_ABI } from "../lib/contracts";

export interface UnbondingRequest {
  amount: bigint;
  releaseTime: bigint;
  active: boolean;
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

  const emarkContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  });
  
  // Get total staked amount (wrapped EMARK tokens = WEMARK)
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
  
  // Get available voting power (in WEMARK)
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
  
  // Get unbonding amount
  const unbondingAmountQuery = useReadContract({
    contract: catalogContract,
    method: "getUnbondingAmount",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  // Get unbonding period for calculations
  const unbondingPeriodQuery = useReadContract({
    contract: catalogContract,
    method: "UNBONDING_PERIOD",
    params: [],
  });
  
  // Create simplified unbonding requests from the amount
  const unbondingRequests: UnbondingRequest[] = unbondingAmountQuery.data && unbondingAmountQuery.data > BigInt(0) ? [
    {
      amount: unbondingAmountQuery.data,
      releaseTime: BigInt(Math.floor(Date.now() / 1000) + Number(unbondingPeriodQuery.data || 7 * 24 * 60 * 60)),
      active: true
    }
  ] : [];
  
  const isLoadingUnbondingRequests = unbondingAmountQuery.isLoading;
  
  const { mutate: sendTransaction } = useSendTransaction();

  const approveTokens = async (amount: string) => {
    if (!userAddress) {
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const amountWei = toWei(amount);
      
      const approveTransaction = prepareContractCall({
        contract: emarkContract,
        method: "approve",
        params: [CONTRACTS.CARD_CATALOG, amountWei] as const,
      });

      console.log("📝 Sending approval transaction...");
      
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        sendTransaction(approveTransaction as any, {
          onSuccess: (result: any) => {
            console.log("✅ Approval successful:", result);
            setIsProcessing(false);
            resolve({ success: true });
          },
          onError: (error: any) => {
            console.error("❌ Approval failed:", error);
            const errorMsg = error.message || "Failed to approve tokens";
            setError(errorMsg);
            setIsProcessing(false);
            resolve({ success: false, error: errorMsg });
          }
        });
      });

    } catch (err: any) {
      console.error("Error approving tokens:", err);
      const errorMsg = err.message || "Failed to approve tokens";
      setError(errorMsg);
      setIsProcessing(false);
      return { success: false, error: errorMsg };
    }
  };
  
  // Function to stake EMARK tokens (wrap them into WEMARK)
  const stakeTokens = async (amount: string) => {
    if (!userAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return { success: false, error: "Please enter a valid amount" };
    }
    
    try {
      // Step 1: Approve tokens
      console.log("🔐 Step 1: Approving tokens...");
      const approvalResult = await approveTokens(amount);
      
      if (!approvalResult.success) {
        return approvalResult;
      }
      
      // Step 2: Stake tokens (your existing code)
      console.log("🏦 Step 2: Staking tokens...");
      setIsProcessing(true);
      setError(null);
      setSuccess(null);
      
      const amountWei = toWei(amount);
      
      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "wrap",
        params: [amountWei] as const,
      });
      
      console.log("📤 Sending staking transaction...");
      
      return new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: (result: any) => {
            console.log("✅ Staking transaction successful:", result);
            
            setTimeout(() => {
              totalStakedQuery.refetch();
              votingPowerQuery.refetch();
            }, 2000);
            
            const successMsg = `Successfully staked ${amount} EMARK (converted to WEMARK)`;
            setSuccess(successMsg);
            setIsProcessing(false);
            resolve({ success: true, message: successMsg });
          },
          onError: (error: any) => {
            console.error("❌ Staking transaction failed:", error);
            const errorMsg = error.message || "Failed to stake EMARK tokens";
            setError(errorMsg);
            setIsProcessing(false);
            resolve({ success: false, error: errorMsg });
          }
        });
      });
      
    } catch (err: any) {
      console.error("Error in staking flow:", err);
      const errorMsg = err.message || "Failed to stake EMARK tokens";
      setError(errorMsg);
      setIsProcessing(false);
      return { success: false, error: errorMsg };
    }
  };  // Function to request unstaking (unwrap WEMARK back to EMARK)
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
      setError(`Insufficient staked balance. Available: ${toEther(totalStaked || BigInt(0))} WEMARK`);
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
        unbondingAmountQuery.refetch();
      }, 2000);
      
      const successMsg = `Successfully requested unstaking of ${amount} WEMARK. Please wait for the unbonding period to complete before claiming your EMARK.`;
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
  
  // Function to complete unstaking (claim EMARK from unbonded WEMARK)
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
        unbondingAmountQuery.refetch();
        votingPowerQuery.refetch();
      }, 2000);
      
      const successMsg = `Successfully unstaked and received your EMARK tokens!`;
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
        unbondingAmountQuery.refetch();
      }, 2000);
      
      const successMsg = `Successfully cancelled unbonding request and restored your WEMARK!`;
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
    totalStaked, // WEMARK balance
    availableVotingPower, // Available WEMARK for voting
    unbondingRequests, // WEMARK being unbonded
    isLoadingTotalStaked,
    isLoadingVotingPower,
    isLoadingUnbondingRequests,
    isProcessing,
    error,
    success,
    stakeTokens, // Stake EMARK → get WEMARK
    requestUnstake, // Request to unbond WEMARK
    completeUnstake, // Complete unbonding → get EMARK back
    cancelUnbonding, // Cancel unbonding → restore WEMARK
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    }
  };
}

// Enhanced hook for staking stats
export function useStakingStats() {
  const catalogContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CARD_CATALOG_ABI,
  });
  
  // Get total supply of wrapped tokens (total WEMARK in circulation)
  const { data: totalSupply, isLoading: isLoadingTotalSupply } = useReadContract({
    contract: catalogContract,
    method: "totalSupply",
    params: [],
  });
  
  // Get unbonding period constant
  const { data: unbondingPeriod } = useReadContract({
    contract: catalogContract,
    method: "UNBONDING_PERIOD",
    params: [],
  });
  
  return {
    totalStaked: totalSupply || BigInt(0), // Total WEMARK staked
    unbondingPeriodSeconds: unbondingPeriod ? Number(unbondingPeriod) : 7 * 24 * 60 * 60,
    isLoading: isLoadingTotalSupply,
    
    formatUnbondingPeriod: () => {
      const days = unbondingPeriod ? Number(unbondingPeriod) / (24 * 60 * 60) : 7;
      return `${days} day${days !== 1 ? 's' : ''}`;
    },
    
    calculateAPY: (rewardsPerWeek: bigint) => {
      if (!totalSupply || totalSupply === BigInt(0)) return 0;
      const weeklyRate = Number(rewardsPerWeek) / Number(totalSupply);
      const yearlyRate = weeklyRate * 52;
      return (yearlyRate * 100);
    }
  };
}