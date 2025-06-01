import { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction as useThirdwebSendTransaction } from "thirdweb/react";
import { useSendTransaction as useWagmiSendTransaction } from "wagmi";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EMARK_TOKEN_ABI } from "../lib/contracts";
import { useWalletAuth } from "../providers/WalletProvider";

// Import the CardCatalog ABI
import CardCatalogABI from "../lib/abis/CardCatalog.json";

// Define the return type for transaction functions
interface TransactionResult {
  success: boolean;
  error?: string;
  txHash?: string;
}

export function useWrapping(userAddress?: string) {
  const [isWrapping, setIsWrapping] = useState(false);
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { address: walletAddress, isConnected } = useWalletAuth();
  const effectiveUserAddress = userAddress || walletAddress;
  
  // Get transaction methods from WalletProvider
  const { mutate: sendThirdwebTransaction } = useThirdwebSendTransaction();
  const { sendTransactionAsync: sendWagmiTransaction } = useWagmiSendTransaction();
  
  const emarkContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  }), []);
  
  // Use CardCatalog contract (this is the wrapping contract)
  const wrappingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CardCatalogABI as any,
  }), []);
  
  // Get user's liquid EMARK balance
  const { data: emarkBalance, isLoading: isLoadingBalance } = useReadContract({
    contract: emarkContract,
    method: "balanceOf",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get user's wEMARK (wrapped) balance
  const { data: wEmarkBalance, isLoading: isLoadingWrapped } = useReadContract({
    contract: wrappingContract,
    method: "balanceOf",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get user summary
  const { data: userSummary, isLoading: isLoadingUserSummary } = useReadContract({
    contract: wrappingContract,
    method: "getUserSummary",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get unbonding info
  const { data: unbondingInfo, isLoading: isLoadingUnbonding } = useReadContract({
    contract: wrappingContract,
    method: "getUnbondingInfo",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get available voting power
  const { data: availableVotingPower, isLoading: isLoadingVotingPower } = useReadContract({
    contract: wrappingContract,
    method: "getAvailableVotingPower",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Helper function to send transactions (same pattern as VotingPanel)
  const sendTransaction = useCallback((transaction: any) => {
    return new Promise<any>((resolve, reject) => {
      // For Farcaster, we might need to use Wagmi
      // For regular web, use Thirdweb
      // Let's try Thirdweb first and fallback to Wagmi if needed
      
      sendThirdwebTransaction(transaction, {
        onSuccess: (result: any) => {
          resolve(result);
        },
        onError: (error: any) => {
          console.error("Thirdweb transaction failed:", error);
          // If Thirdweb fails, could try Wagmi here
          reject(error);
        }
      });
    });
  }, [sendThirdwebTransaction]);
  
  // Wrap EMARK tokens (convert to wEMARK)
  const wrapTokens = useCallback(async (amount: bigint): Promise<TransactionResult> => {
    if (!effectiveUserAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsWrapping(true);
    setError(null);
    setSuccess(null);
    
    try {
      // First approve the wrapping contract to spend EMARK tokens
      const approveTransaction = prepareContractCall({
        contract: emarkContract,
        method: "approve",
        params: [CONTRACTS.CARD_CATALOG, amount],
      });
      
      console.log("🔄 Sending approval transaction...");
      await sendTransaction(approveTransaction);
      console.log("✅ Approval successful, now wrapping...");
      
      // Then wrap the tokens
      const wrapTransaction = prepareContractCall({
        contract: wrappingContract,
        method: "wrap",
        params: [amount],
      });
      
      const result = await sendTransaction(wrapTransaction);
      console.log("✅ Wrap successful:", result);
      
      setSuccess(`Successfully wrapped ${amount.toString()} $EMARK → wEMARK!`);
      setIsWrapping(false);
      return { success: true, txHash: result.transactionHash };
      
    } catch (err: any) {
      console.error("❌ Wrap transaction failed:", err);
      setError(err.message || "Failed to wrap tokens");
      setIsWrapping(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, emarkContract, wrappingContract, sendTransaction]);
  
  // Request unwrap (starts unbonding period)
  const requestUnwrap = useCallback(async (amount: bigint): Promise<TransactionResult> => {
    if (!effectiveUserAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsUnwrapping(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: wrappingContract,
        method: "requestUnwrap",
        params: [amount],
      });
      
      console.log("🔄 Requesting unwrap...");
      const result = await sendTransaction(transaction);
      console.log("✅ Unwrap request successful:", result);
      
      setSuccess(`Successfully requested unwrap of ${amount.toString()} wEMARK. Unbonding period started.`);
      setIsUnwrapping(false);
      return { success: true, txHash: result.transactionHash };
      
    } catch (err: any) {
      console.error("❌ Unwrap request failed:", err);
      setError(err.message || "Failed to request unwrap");
      setIsUnwrapping(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, wrappingContract, sendTransaction]);
  
  // Complete unwrap (after unbonding period)
  const completeUnwrap = useCallback(async (): Promise<TransactionResult> => {
    if (!effectiveUserAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsUnwrapping(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: wrappingContract,
        method: "completeUnwrap",
        params: [],
      });
      
      console.log("🔄 Completing unwrap...");
      const result = await sendTransaction(transaction);
      console.log("✅ Complete unwrap successful:", result);
      
      setSuccess(`Successfully completed unwrap! wEMARK → $EMARK conversion complete.`);
      setIsUnwrapping(false);
      return { success: true, txHash: result.transactionHash };
      
    } catch (err: any) {
      console.error("❌ Complete unwrap failed:", err);
      setError(err.message || "Failed to complete unwrap");
      setIsUnwrapping(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, wrappingContract, sendTransaction]);
  
  // Cancel unbonding
  const cancelUnbonding = useCallback(async (): Promise<TransactionResult> => {
    if (!effectiveUserAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsUnwrapping(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: wrappingContract,
        method: "cancelUnbonding",
        params: [],
      });
      
      console.log("🔄 Cancelling unbonding...");
      const result = await sendTransaction(transaction);
      console.log("✅ Cancel unbonding successful:", result);
      
      setSuccess(`Successfully cancelled unbonding!`);
      setIsUnwrapping(false);
      return { success: true, txHash: result.transactionHash };
      
    } catch (err: any) {
      console.error("❌ Cancel unbonding failed:", err);
      setError(err.message || "Failed to cancel unbonding");
      setIsUnwrapping(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, wrappingContract, sendTransaction]);
  
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  
  // Use the correct wrapped balance
  const actualWrappedBalance = wEmarkBalance || userSummary?.stakedBalance || BigInt(0);
  const actualVotingPower = availableVotingPower || userSummary?.availableVotingPower || actualWrappedBalance;
  
  // Parse unbonding info
  const unbondingAmount = unbondingInfo?.[0] || userSummary?.unbondingAmount_ || BigInt(0);
  const unbondingReleaseTime = unbondingInfo?.[1] || userSummary?.unbondingReleaseTime_ || BigInt(0);
  const canClaimUnbonding = unbondingInfo?.[2] || userSummary?.canClaimUnbonding || false;
  
  return {
    // Balances
    emarkBalance: emarkBalance || BigInt(0),
    wEmarkBalance: actualWrappedBalance,
    totalWrapped: actualWrappedBalance,
    availableVotingPower: actualVotingPower,
    
    // Unbonding info
    unbondingAmount,
    unbondingReleaseTime,
    canClaimUnbonding,
    
    // User summary data
    delegatedPower: userSummary?.delegatedPower || BigInt(0),
    
    // Loading states
    isLoadingBalance,
    isLoadingWrapped: isLoadingWrapped || isLoadingUserSummary,
    isLoadingUserSummary,
    isLoadingUnbonding,
    isLoadingVotingPower,
    
    // Transaction states
    isWrapping,
    isUnwrapping,
    
    // Actions
    wrapTokens,
    requestUnwrap,
    completeUnwrap,
    cancelUnbonding,
    
    // Legacy action names for compatibility
    stakeTokens: wrapTokens,
    unstakeTokens: requestUnwrap,
    
    // Messages
    error,
    success,
    clearMessages,
    
    // Auth info
    effectiveUserAddress,
    hasWalletAccess: !!effectiveUserAddress,
    isConnected,
    
    // Token type helpers
    tokenTypes: {
      liquid: 'EMARK',
      wrapped: 'wEMARK',
      description: {
        EMARK: 'Liquid token for transactions and trading',
        wEMARK: 'Wrapped EMARK with voting power (may have unbonding period)'
      }
    }
  };
}
