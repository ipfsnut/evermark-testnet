import { useCallback } from "react";
import { CONTRACTS, EMARK_TOKEN_ABI } from "../lib/contracts";
import { toWei } from "thirdweb/utils";
import { useTransactionUtils } from './core/useTransactionUtils';
import { useUserData } from './core/useUserData';

export function useEmarkToken(userAddress?: string) {
  const { executeTransaction, isProcessing, error, success, clearMessages } = useTransactionUtils();
  const { balances, refetchBalances, hasWallet } = useUserData(userAddress);
  
  const approveStaking = useCallback(async (amount: string) => {
    return await executeTransaction(
      CONTRACTS.EMARK_TOKEN,
      EMARK_TOKEN_ABI,
      "approve",
      [CONTRACTS.CARD_CATALOG, toWei(amount)],
      {
        successMessage: `Successfully approved ${amount} EMARK for staking`,
        errorContext: {
          operation: 'approve',
          contract: 'EMARK_TOKEN',
          amount,
          methodName: 'approve'
        }
      }
    );
  }, [executeTransaction]);

  const transfer = useCallback(async (to: string, amount: string) => {
    return await executeTransaction(
      CONTRACTS.EMARK_TOKEN,
      EMARK_TOKEN_ABI,
      "transfer",
      [to, toWei(amount)],
      {
        successMessage: `Successfully transferred ${amount} EMARK`,
        errorContext: {
          operation: 'transfer',
          contract: 'EMARK_TOKEN',
          amount,
          methodName: 'transfer'
        }
      }
    );
  }, [executeTransaction]);

  return {
    balance: balances.emarkBalance,
    stakingAllowance: balances.stakingAllowance,
    
    approveStaking,
    transfer,
    
    isTransacting: isProcessing,
    error,
    success,
    clearMessages,
    
    isConnected: hasWallet,
    
    refetch: refetchBalances,
    
    name: "EMARK",
    symbol: "EMARK",
    decimals: 18,
  };
}
