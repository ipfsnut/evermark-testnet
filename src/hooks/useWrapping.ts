import { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EMARK_TOKEN_ABI } from "../lib/contracts";
import { useWalletAuth } from "../providers/WalletProvider";

// Import the CardCatalog ABI
import CardCatalogABI from "../lib/abis/CardCatalog.json";

export function useWrapping(userAddress?: string) {
  const [isWrapping, setIsWrapping] = useState(false);
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { address: walletAddress, requireConnection } = useWalletAuth();
  const effectiveUserAddress = userAddress || walletAddress;
  
  const emarkContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  }), []);
  
  const wrappingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CardCatalogABI as any,
  }), []);
  
  // Get user's liquid EMARK balance
  const { data: emarkBalance, isLoading: isLoadingBalance, refetch: refetchEmarkBalance } = useReadContract({
    contract: emarkContract,
    method: "balanceOf",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get user's wEMARK (wrapped) balance
  const { data: wEmarkBalance, isLoading: isLoadingWrapped, refetch: refetchWEmarkBalance } = useReadContract({
    contract: wrappingContract,
    method: "balanceOf",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get user summary
  const { data: userSummary, isLoading: isLoadingUserSummary, refetch: refetchUserSummary } = useReadContract({
    contract: wrappingContract,
    method: "getUserSummary",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get unbonding info
  const { data: unbondingInfo, isLoading: isLoadingUnbonding, refetch: refetchUnbondingInfo } = useReadContract({
    contract: wrappingContract,
    method: "getUnbondingInfo",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get available voting power
  const { data: availableVotingPower, isLoading: isLoadingVotingPower, refetch: refetchVotingPower } = useReadContract({
    contract: wrappingContract,
    method: "getAvailableVotingPower",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Use the EXACT SAME transaction pattern as VotingPanel
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Refetch all data after successful transactions
  const refetchAllData = useCallback(() => {
    setTimeout(() => {
      refetchEmarkBalance?.();
      refetchWEmarkBalance?.();
      refetchUserSummary?.();
      refetchUnbondingInfo?.();
      refetchVotingPower?.();
    }, 2000);
  }, [refetchEmarkBalance, refetchWEmarkBalance, refetchUserSummary, refetchUnbondingInfo, refetchVotingPower]);
  
  // Wrap EMARK tokens - EXACT SAME PATTERN AS VOTING PANEL
  const wrapTokens = useCallback(async (amount: bigint) => {
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
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
      
      return new Promise<void>((resolve, reject) => {
        sendTransaction(approveTransaction as any, {
          onSuccess: () => {
            // Then wrap the tokens
            const wrapTransaction = prepareContractCall({
              contract: wrappingContract,
              method: "wrap",
              params: [amount],
            });
            
            sendTransaction(wrapTransaction as any, {
              onSuccess: () => {
                setSuccess(`Successfully wrapped ${amount.toString()} $EMARK → wEMARK!`);
                setIsWrapping(false);
                refetchAllData();
                resolve();
              },
              onError: (error) => {
                setError(`Wrapping failed: ${error.message}`);
                setIsWrapping(false);
                reject(error);
              }
            });
          },
          onError: (error) => {
            setError(`Approval failed: ${error.message}`);
            setIsWrapping(false);
            reject(error);
          }
        });
      });
      
    } catch (err: any) {
      setError(err.message || "Failed to wrap tokens");
      setIsWrapping(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, emarkContract, wrappingContract, sendTransaction, requireConnection, refetchAllData]);
  
  // Request unwrap - EXACT SAME PATTERN AS VOTING PANEL
  const requestUnwrap = useCallback(async (amount: bigint) => {
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
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
      
      return new Promise<void>((resolve, reject) => {
        sendTransaction(transaction as any, {
          onSuccess: () => {
            setSuccess(`Successfully requested unwrap of ${amount.toString()} wEMARK. Unbonding period started.`);
            setIsUnwrapping(false);
            refetchAllData();
            resolve();
          },
          onError: (error) => {
            setError(`Unwrap request failed: ${error.message}`);
            setIsUnwrapping(false);
            reject(error);
          }
        });
      });
      
    } catch (err: any) {
      setError(err.message || "Failed to request unwrap");
      setIsUnwrapping(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, wrappingContract, sendTransaction, requireConnection, refetchAllData]);
  
  // Complete unwrap
  const completeUnwrap = useCallback(async () => {
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
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
      
      return new Promise<void>((resolve, reject) => {
        sendTransaction(transaction as any, {
          onSuccess: () => {
            setSuccess(`Successfully completed unwrap! wEMARK → $EMARK conversion complete.`);
            setIsUnwrapping(false);
            refetchAllData();
            resolve();
          },
          onError: (error) => {
            setError(`Complete unwrap failed: ${error.message}`);
            setIsUnwrapping(false);
            reject(error);
          }
        });
      });
      
    } catch (err: any) {
      setError(err.message || "Failed to complete unwrap");
      setIsUnwrapping(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, wrappingContract, sendTransaction, requireConnection, refetchAllData]);
  
  // Cancel unbonding
  const cancelUnbonding = useCallback(async () => {
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
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
      
      return new Promise<void>((resolve, reject) => {
        sendTransaction(transaction as any, {
          onSuccess: () => {
            setSuccess(`Successfully cancelled unbonding!`);
            setIsUnwrapping(false);
            refetchAllData();
            resolve();
          },
          onError: (error) => {
            setError(`Cancel unbonding failed: ${error.message}`);
            setIsUnwrapping(false);
            reject(error);
          }
        });
      });
      
    } catch (err: any) {
      setError(err.message || "Failed to cancel unbonding");
      setIsUnwrapping(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, wrappingContract, sendTransaction, requireConnection, refetchAllData]);
  
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
    isConnected: !!effectiveUserAddress,
    
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
