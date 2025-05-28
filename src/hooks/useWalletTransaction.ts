// src/hooks/useWalletTransaction.ts - NEW FILE for proper transaction integration
import { useState, useCallback } from 'react';
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { useWalletLinking } from './useWalletLinking';

export interface TransactionOptions {
  walletAddress?: string; // Specific wallet to use for transaction
  requireConnection?: boolean; // Whether wallet must be actively connected
}

export function useWalletTransaction() {
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();
  const { linkedWallets, getWalletDisplayInfo } = useWalletLinking();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeTransaction = useCallback(async (
    transaction: any,
    options: TransactionOptions = {}
  ) => {
    const { walletAddress, requireConnection = true } = options;
    
    setIsProcessing(true);
    setError(null);

    try {
      // Determine which wallet to use
      const targetWallet = walletAddress || account?.address;
      
      if (!targetWallet) {
        throw new Error('No wallet specified for transaction');
      }

      // Get wallet info
      const walletInfo = getWalletDisplayInfo(targetWallet);
      
      // Check if wallet is available for transactions
      if (requireConnection && !walletInfo.isConnected) {
        if (walletInfo.type === 'manually-added') {
          throw new Error('Cannot execute transactions with watch-only addresses. Please connect the wallet first.');
        } else {
          throw new Error('Selected wallet is not connected. Please connect it first.');
        }
      }

      // Check if we need to switch to a different wallet
      if (walletAddress && walletAddress.toLowerCase() !== account?.address?.toLowerCase()) {
        throw new Error('Please switch to the selected wallet in your wallet app to execute this transaction');
      }

      // Execute the transaction
      return new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result: any) => {
            setIsProcessing(false);
            resolve({
              success: true,
              result,
              transactionHash: result.transactionHash,
              usedWallet: targetWallet
            });
          },
          onError: (error: any) => {
            setIsProcessing(false);
            const errorMessage = error.message || 'Transaction failed';
            setError(errorMessage);
            reject({ success: false, error: errorMessage });
          }
        });
      });

    } catch (err: any) {
      setIsProcessing(false);
      const errorMessage = err.message || 'Failed to execute transaction';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [account?.address, sendTransaction, getWalletDisplayInfo]);

  const canExecuteTransaction = useCallback((walletAddress?: string) => {
    const targetWallet = walletAddress || account?.address;
    if (!targetWallet) return { canExecute: false, reason: 'No wallet available' };

    const walletInfo = getWalletDisplayInfo(targetWallet);
    
    if (walletInfo.type === 'manually-added') {
      return { canExecute: false, reason: 'Watch-only addresses cannot execute transactions' };
    }
    
    if (!walletInfo.isConnected) {
      return { canExecute: false, reason: 'Wallet is not connected' };
    }

    return { canExecute: true };
  }, [account?.address, getWalletDisplayInfo]);

  return {
    executeTransaction,
    canExecuteTransaction,
    isProcessing,
    error,
    clearError: () => setError(null),
    
    // Helper to get suitable wallets for transactions
    getTransactionWallets: () => linkedWallets.filter(w => w.type !== 'manually-added'),
  };
}