import { useCallback } from "react";
import { CONTRACTS, EMARK_TOKEN_ABI } from "../lib/contracts";
import CardCatalogABI from "../lib/abis/CardCatalog.json";
import { useTransactionUtils } from './core/useTransactionUtils';
import { useUserData } from './core/useUserData';

export function useWrapping(userAddress?: string) {
  const { executeTransaction, executeBatchTransactions, isProcessing } = useTransactionUtils();
  const { balances, voting, unbonding, refetch, hasWallet } = useUserData(userAddress);
  
  const wrapTokens = useCallback(async (amount: bigint) => {
    return await executeBatchTransactions([
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
        abi: CardCatalogABI,
        functionName: "wrap",
        params: [amount],
        options: {
          successMessage: `Successfully wrapped ${amount.toString()} EMARK → wEMARK!`,
          errorContext: { operation: 'wrap', amount: amount.toString() }
        }
      }
    ]);
  }, [executeBatchTransactions]);

  const requestUnwrap = useCallback(async (amount: bigint) => {
    return await executeTransaction(
      CONTRACTS.CARD_CATALOG,
      CardCatalogABI,
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
  }, [executeTransaction]);

  const completeUnwrap = useCallback(async () => {
    return await executeTransaction(
      CONTRACTS.CARD_CATALOG,
      CardCatalogABI,
      "completeUnwrap",
      [],
      {
        successMessage: "Successfully completed unwrap! wEMARK → EMARK conversion complete.",
        errorContext: { operation: 'completeUnwrap' }
      }
    );
  }, [executeTransaction]);

  const cancelUnbonding = useCallback(async () => {
    return await executeTransaction(
      CONTRACTS.CARD_CATALOG,
      CardCatalogABI,
      "cancelUnbonding",
      [],
      {
        successMessage: "Successfully cancelled unbonding!",
        errorContext: { operation: 'cancelUnbonding' }
      }
    );
  }, [executeTransaction]);

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
