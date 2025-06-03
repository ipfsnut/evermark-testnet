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
  
  // FIXED: Proper variable initialization and error handling
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
    console.log('🔄 Starting wrap process for amount:', amount.toString());
    
    // Step 1: Approve EMARK spending
    console.log('📝 Step 1: Preparing approval transaction...');
    const approveTransaction = prepareContractCall({
      contract: emarkContract,
      method: "approve",
      params: [CONTRACTS.CARD_CATALOG, amount],
    });
    
    // ✅ FIXED: Properly await approval transaction
    console.log('⏳ Sending approval transaction...');
    await new Promise<void>((resolve, reject) => {
      sendTransaction(approveTransaction as any, {
        onSuccess: (result) => {
          console.log('✅ Approval transaction confirmed:', result.transactionHash);
          resolve();
        },
        onError: (error) => {
          console.error('❌ Approval transaction failed:', error);
          reject(new Error(`Approval failed: ${error.message}`));
        }
      });
    });
    
    // Step 2: Wait a moment for approval to be processed
    console.log('⏳ Waiting for approval to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Wrap the tokens
    console.log('📝 Step 2: Preparing wrap transaction...');
    const wrapTransaction = prepareContractCall({
      contract: wrappingContract,
      method: "wrap",
      params: [amount],
    });
    
    // ✅ FIXED: Properly await wrap transaction with proper variable handling
    console.log('⏳ Sending wrap transaction...');
    const wrapTxHash = await new Promise<string>((resolve, reject) => {
      sendTransaction(wrapTransaction as any, {
        onSuccess: (result) => {
          console.log('✅ Wrap transaction confirmed:', result.transactionHash);
          resolve(result.transactionHash);
        },
        onError: (error) => {
          console.error('❌ Wrap transaction failed:', error);
          reject(new Error(`Wrap failed: ${error.message}`));
        }
      });
    });
    
    // ✅ FIXED: Now wrapTxHash is guaranteed to be assigned
    setSuccess(`Successfully wrapped ${amount.toString()} $EMARK → wEMARK! TX: ${wrapTxHash}`);
    console.log('🎉 Wrap process completed successfully');
    
    // Refresh data after successful transactions
    refetchAllData();
    
    return { success: true, transactionHash: wrapTxHash };
    
  } catch (err: any) {
    console.error('❌ Wrap process failed:', err);
    const errorMessage = err.message || "Failed to wrap tokens";
    setError(errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    setIsWrapping(false);
  }
}, [effectiveUserAddress, emarkContract, wrappingContract, sendTransaction, requireConnection, refetchAllData]);

  // ✅ FIXED: Similar pattern for requestUnwrap
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
      console.log('🔄 Starting unwrap request for amount:', amount.toString());
      
      const transaction = prepareContractCall({
        contract: wrappingContract,
        method: "requestUnwrap",
        params: [amount],
      });
      
      // ✅ FIXED: Properly await transaction confirmation with proper variable handling
      const txHash = await new Promise<string>((resolve, reject) => {
        sendTransaction(transaction as any, {
          onSuccess: (result) => {
            console.log('✅ Unwrap request transaction confirmed:', result.transactionHash);
            resolve(result.transactionHash);
          },
          onError: (error) => {
            console.error('❌ Unwrap request failed:', error);
            reject(new Error(`Unwrap request failed: ${error.message}`));
          }
        });
      });
      
      // ✅ FIXED: Now txHash is guaranteed to be assigned
      setSuccess(`Successfully requested unwrap of ${amount.toString()} wEMARK. Unbonding period started. TX: ${txHash}`);
      console.log('🎉 Unwrap request completed successfully');
      
      refetchAllData();
      return { success: true, transactionHash: txHash };
      
    } catch (err: any) {
      console.error('❌ Unwrap request failed:', err);
      const errorMessage = err.message || "Failed to request unwrap";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUnwrapping(false);
    }
  }, [effectiveUserAddress, wrappingContract, sendTransaction, requireConnection, refetchAllData]);
  
  // ✅ FIXED: Similar pattern for completeUnwrap
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
      console.log('🔄 Starting complete unwrap...');
      
      const transaction = prepareContractCall({
        contract: wrappingContract,
        method: "completeUnwrap",
        params: [],
      });
      
      // ✅ FIXED: Properly await transaction confirmation with proper variable handling
      const txHash = await new Promise<string>((resolve, reject) => {
        sendTransaction(transaction as any, {
          onSuccess: (result) => {
            console.log('✅ Complete unwrap transaction confirmed:', result.transactionHash);
            resolve(result.transactionHash);
          },
          onError: (error) => {
            console.error('❌ Complete unwrap failed:', error);
            reject(new Error(`Complete unwrap failed: ${error.message}`));
          }
        });
      });
      
      // ✅ FIXED: Now txHash is guaranteed to be assigned
      setSuccess(`Successfully completed unwrap! wEMARK → $EMARK conversion complete. TX: ${txHash}`);
      console.log('🎉 Complete unwrap completed successfully');
      
      refetchAllData();
      return { success: true, transactionHash: txHash };
      
    } catch (err: any) {
      console.error('❌ Complete unwrap failed:', err);
      const errorMessage = err.message || "Failed to complete unwrap";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUnwrapping(false);
    }
  }, [effectiveUserAddress, wrappingContract, sendTransaction, requireConnection, refetchAllData]);
  
  // ✅ FIXED: Similar pattern for cancelUnbonding
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
      console.log('🔄 Starting cancel unbonding...');
      
      const transaction = prepareContractCall({
        contract: wrappingContract,
        method: "cancelUnbonding",
        params: [],
      });
      
      // ✅ FIXED: Properly await transaction confirmation with proper variable handling
      const txHash = await new Promise<string>((resolve, reject) => {
        sendTransaction(transaction as any, {
          onSuccess: (result) => {
            console.log('✅ Cancel unbonding transaction confirmed:', result.transactionHash);
            resolve(result.transactionHash);
          },
          onError: (error) => {
            console.error('❌ Cancel unbonding failed:', error);
            reject(new Error(`Cancel unbonding failed: ${error.message}`));
          }
        });
      });
      
      // ✅ FIXED: Now txHash is guaranteed to be assigned
      setSuccess(`Successfully cancelled unbonding! TX: ${txHash}`);
      console.log('🎉 Cancel unbonding completed successfully');
      
      refetchAllData();
      return { success: true, transactionHash: txHash };
      
    } catch (err: any) {
      console.error('❌ Cancel unbonding failed:', err);
      const errorMessage = err.message || "Failed to cancel unbonding";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUnwrapping(false);
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
