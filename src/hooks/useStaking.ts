import { useState } from "react";
import { useSendTransaction, useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { toEther, toWei } from "thirdweb/utils";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, CARD_CATALOG_ABI, EMARK_TOKEN_ABI } from "../lib/contracts";
import { useFarcasterUser } from "../lib/farcaster";

export interface UnbondingRequest {
  amount: bigint;
  releaseTime: bigint;
  active: boolean;
}

export function useStaking(userAddress?: string) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // ADD FARCASTER USER HOOK
  const { isInFarcaster, isAuthenticated: isFarcasterAuth, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();

  // ENHANCED: Determine the effective user address
  const effectiveUserAddress = userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddress() ? getPrimaryAddress() : null);
  const hasWalletAccess = !!userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddress());

  console.log('🔍 Staking Auth Debug:', {
    userAddress,
    isInFarcaster,
    isFarcasterAuth,
    hasVerifiedAddress: hasVerifiedAddress(),
    primaryAddress: getPrimaryAddress(),
    effectiveUserAddress,
    hasWalletAccess
  });

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
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  const totalStaked = totalStakedQuery.data;
  const isLoadingTotalStaked = totalStakedQuery.isLoading;
  
  // Get available voting power (in WEMARK)
  const votingPowerQuery = useReadContract({
    contract: catalogContract,
    method: "getAvailableVotingPower",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  const availableVotingPower = votingPowerQuery.data;
  const isLoadingVotingPower = votingPowerQuery.isLoading;
  
  // Get unbonding amount
  const unbondingAmountQuery = useReadContract({
    contract: catalogContract,
    method: "getUnbondingAmount",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
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
    // UPDATE VALIDATION
    if (!hasWalletAccess) {
      const errorMessage = isInFarcaster ? 
        "Please authenticate in Farcaster or connect a wallet" : 
        "Please connect your wallet";
      return { success: false, error: errorMessage };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const amountWei = toWei(amount);
      
      console.log('🔍 Approval Debug:', {
        effectiveUserAddress,
        amount,
        amountWei: amountWei.toString(),
        emarkContractAddress: emarkContract.address,
        spenderAddress: CONTRACTS.CARD_CATALOG,
        chainId: CHAIN.id
      });

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
    // UPDATE VALIDATION
    if (!hasWalletAccess) {
      const errorMessage = isInFarcaster ? 
        "Please authenticate in Farcaster or connect a wallet" : 
        "Please connect your wallet";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return { success: false, error: "Please enter a valid amount" };
    }

    try {
      // Step 1: Approve tokens
      console.log("🔐 Step 1: Approving $EMARK tokens...");
      const approvalResult = await approveTokens(amount);
      if (!approvalResult.success) {
        return approvalResult;
      }

      // Step 2: Stake tokens with enhanced debugging
      console.log("🏦 Step 2: Staking $EMARK tokens...");
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      const amountWei = toWei(amount);

      // Debug the wrap transaction preparation
      console.log('🔍 Wrap Transaction Debug:', {
        catalogContractAddress: catalogContract.address,
        amount: amount,
        amountWei: amountWei.toString(),
        userAddress,
        chainId: CHAIN.id
      });

      // Check if the catalog contract has the wrap function
      const wrapFunction = CARD_CATALOG_ABI?.find?.((f: any) => f.name === 'wrap');
      console.log('🔍 Wrap Function Check:', {
        wrapFunctionExists: !!wrapFunction,
        wrapFunction: wrapFunction,
        catalogABI_length: CARD_CATALOG_ABI?.length
      });

      const transaction = prepareContractCall({
        contract: catalogContract,
        method: "wrap",
        params: [amountWei] as const,
      });

      // Resolve transaction properties if they're functions
      const transactionTo = typeof transaction.to === 'function' ? await transaction.to() : transaction.to;
      const transactionData = typeof transaction.data === 'function' ? await transaction.data() : transaction.data;

      // Debug the prepared wrap transaction
      console.log('🔍 Prepared Wrap Transaction:', {
        to: transactionTo,
        data: transactionData,
        value: transaction.value || '0x0',
        gas: transaction.gas,
        dataLength: transactionData?.length,
        functionSelector: transactionData?.slice(0, 10)
      });

      // Validate the wrap transaction
      if (!transactionTo || !transactionData) {
        throw new Error('Invalid wrap transaction prepared - missing to address or data');
      }

      if (transactionTo.toLowerCase() !== CONTRACTS.CARD_CATALOG.toLowerCase()) {
        throw new Error(`Wrap transaction target mismatch: expected ${CONTRACTS.CARD_CATALOG}, got ${transactionTo}`);
      }

      // Add a small delay to avoid rate limiting
      console.log("⏳ Waiting 2 seconds to avoid rate limiting...");
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log("📤 Sending staking transaction...");
      
      return new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: (result: any) => {
            console.log("✅ Staking transaction successful:", result);
            setTimeout(() => {
              totalStakedQuery.refetch();
              votingPowerQuery.refetch();
            }, 2000);
            const successMsg = `Successfully staked ${amount} $EMARK (converted to WEMARK)`;
            setSuccess(successMsg);
            setIsProcessing(false);
            resolve({ success: true, message: successMsg });
          },
          onError: (error: any) => {
            console.error("❌ Staking transaction failed:", error);
            
            // Enhanced error handling for rate limiting and other issues
            let errorMsg = "Failed to stake $EMARK tokens";
            
            if (error.code === -32603) {
              if (error.message?.includes('rate limited')) {
                errorMsg = "Request rate limited. Please wait a moment and try again.";
              } else {
                errorMsg = "Network error. Please check your connection and try again.";
              }
            } else if (error.code === 4001) {
              errorMsg = "Transaction was rejected by user.";
            } else if (error.message?.includes('insufficient funds')) {
              errorMsg = "Insufficient ETH for gas fees.";
            } else if (error.message?.includes('execution reverted')) {
              errorMsg = "Transaction reverted - check your EMARK balance and allowance.";
            } else if (error.message) {
              errorMsg = error.message;
            }
            
            setError(errorMsg);
            setIsProcessing(false);
            resolve({ success: false, error: errorMsg });
          }
        });
      });

    } catch (err: any) {
      console.error("Error in staking flow:", err);
      const errorMsg = err.message || "Failed to stake $EMARK tokens";
      setError(errorMsg);
      setIsProcessing(false);
      return { success: false, error: errorMsg };
    }
  };  // Function to request unstaking (unwrap WEMARK back to EMARK)
  const requestUnstake = async (amount: string) => {
    if (!hasWalletAccess) {
      const errorMessage = isInFarcaster ? 
        "Please authenticate in Farcaster or connect a wallet" : 
        "Please connect your wallet";
      setError(errorMessage);
      return { success: false, error: errorMessage };
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
    if (!hasWalletAccess) {
      const errorMessage = isInFarcaster ? 
        "Please authenticate in Farcaster or connect a wallet" : 
        "Please connect your wallet";
      setError(errorMessage);
      return { success: false, error: errorMessage };
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
    if (!hasWalletAccess) {
      const errorMessage = isInFarcaster ? 
        "Please authenticate in Farcaster or connect a wallet" : 
        "Please connect your wallet";
      setError(errorMessage);
      return { success: false, error: errorMessage };
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
    },
    // ADD THESE FOR DEBUGGING
    authInfo: {
      effectiveUserAddress,
      hasWalletAccess,
      isInFarcaster,
      isFarcasterAuth
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