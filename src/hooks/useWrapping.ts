
import { useCallback } from "react";
import { CONTRACTS, EMARK_TOKEN_ABI, CARD_CATALOG_ABI } from "../lib/contracts"; // ✅ FIXED: Use contracts export
import { useTransactionUtils } from './core/useTransactionUtils';
import { useUserData } from './core/useUserData';

export function useWrapping(userAddress?: string) {
  const { executeTransaction, executeBatchTransactions, isProcessing } = useTransactionUtils();
  const { 
    balances, 
    voting, 
    unbonding, 
    refetch: refetchUserData, // ✅ FIXED: This should work based on useUserData
    hasWallet 
  } = useUserData(userAddress);
  
  // ✅ FIXED: Proper batch transaction handling
  const wrapTokens = useCallback(async (amount: bigint) => {
    const results = await executeBatchTransactions([
      {
        contractAddress: CONTRACTS.EMARK_TOKEN,
        abi: EMARK_TOKEN_ABI,
        functionName: "approve",
        params: [CONTRACTS.CARD_CATALOG, amount],
        options: {
          errorContext: { operation: 'approve-for-wrap', amount: amount.toString() }
        }
      },
      {
        contractAddress: CONTRACTS.CARD_CATALOG,
        abi: CARD_CATALOG_ABI, // ✅ FIXED: Import from contracts
        functionName: "wrap",
        params: [amount],
        options: {
          successMessage: `Successfully wrapped ${amount.toString()} EMARK → wEMARK!`,
          errorContext: { operation: 'wrap', amount: amount.toString() }
        }
      }
    ]);

    // ✅ FIXED: Proper type handling - results is TransactionResult[]
    const allSuccessful = results.every(result => result.success);
    if (allSuccessful) {
      console.log("🔄 Refreshing user data cache after successful wrap");
      setTimeout(() => {
        refetchUserData();
      }, 2000);
    }

    return results;
  }, [executeBatchTransactions, refetchUserData]);

  const requestUnwrap = useCallback(async (amount: bigint) => {
    const result = await executeTransaction(
      CONTRACTS.CARD_CATALOG,
      CARD_CATALOG_ABI, // ✅ FIXED: Import from contracts
      "requestUnwrap",
      [amount],
      {
        successMessage: `Successfully requested unwrap of ${amount.toString()} wEMARK. Unbonding period started.`,
        errorContext: {
          operation: 'requestUnwrap',
          amount: amount.toString()
        }
      }
    );

    if (result.success) {
      console.log("🔄 Refreshing user data cache after successful unwrap request");
      setTimeout(() => {
        refetchUserData();
      }, 2000);
    }

    return result;
  }, [executeTransaction, refetchUserData]);

  const completeUnwrap = useCallback(async () => {
    const result = await executeTransaction(
      CONTRACTS.CARD_CATALOG,
      CARD_CATALOG_ABI, // ✅ FIXED: Import from contracts
      "completeUnwrap",
      [],
      {
        successMessage: "Successfully completed unwrap! wEMARK → EMARK conversion complete.",
        errorContext: { operation: 'completeUnwrap' }
      }
    );

    if (result.success) {
      console.log("🔄 Refreshing user data cache after successful unwrap completion");
      setTimeout(() => {
        refetchUserData();
      }, 2000);
    }

    return result;
  }, [executeTransaction, refetchUserData]);

  const cancelUnbonding = useCallback(async () => {
    const result = await executeTransaction(
      CONTRACTS.CARD_CATALOG,
      CARD_CATALOG_ABI, // ✅ FIXED: Import from contracts
      "cancelUnbonding",
      [],
      {
        successMessage: "Successfully cancelled unbonding!",
        errorContext: { operation: 'cancelUnbonding' }
      }
    );

    if (result.success) {
      console.log("🔄 Refreshing user data cache after successful cancel unbonding");
      setTimeout(() => {
        refetchUserData();
      }, 2000);
    }

    return result;
  }, [executeTransaction, refetchUserData]);

  const refetch = useCallback(async () => {
    console.log("🔄 Manually refreshing all wrapping-related data");
    await refetchUserData();
  }, [refetchUserData]);

  return {
    emarkBalance: balances.emarkBalance,
    wEmarkBalance: balances.wEmarkBalance,
    totalWrapped: balances.totalStaked,
    availableVotingPower: voting.availableVotingPower,
    
    unbondingAmount: unbonding.unbondingAmount,
    unbondingReleaseTime: unbonding.unbondingReleaseTime,
    canClaimUnbonding: unbonding.canClaimUnbonding,
    timeUntilRelease: unbonding.timeUntilRelease,
    isUnbonding: unbonding.isUnbonding,
    
    delegatedPower: voting.delegatedPower,
    reservedPower: voting.reservedPower,
    
    wrapTokens,
    requestUnwrap,
    completeUnwrap,
    cancelUnbonding,
    
    stakeTokens: wrapTokens,
    unstakeTokens: requestUnwrap,
    
    isWrapping: isProcessing,
    isUnwrapping: isProcessing,
    hasWalletAccess: hasWallet,
    
    refetch,
    
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

