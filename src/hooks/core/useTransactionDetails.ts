// src/hooks/core/useTransactionUtils.ts - Unified transaction handling
import { useState, useCallback } from "react";
import { getContract, prepareContractCall } from "thirdweb";
import { encodeFunctionData } from "viem";
import { client } from "../../lib/thirdweb";
import { CHAIN } from "../../lib/contracts";
import { useWalletAuth, useWalletConnection } from "../../providers/WalletProvider";

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  message?: string;
}

export interface TransactionState {
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}

/**
 * Unified transaction utilities for all hooks
 * Eliminates redundant transaction preparation and state management
 */
export function useTransactionUtils() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { requireConnection } = useWalletAuth();
  const { sendTransaction, walletType } = useWalletConnection();

  /**
   * Prepare a transaction based on wallet type
   */
  const prepareTransaction = useCallback((
    contractAddress: string,
    abi: any[],
    functionName: string,
    params: any[],
    value?: bigint | string
  ) => {
    if (!contractAddress || !abi || !functionName) {
      throw new Error("Invalid transaction parameters");
    }

    console.log("🔧 Preparing transaction:", {
      contractAddress: contractAddress.slice(0, 10) + "...",
      functionName,
      paramsCount: params.length,
      value: value?.toString(),
      walletType,
    });

    try {
      if (walletType === 'farcaster') {
        // Use Viem for Farcaster (Wagmi)
        const data = encodeFunctionData({
          abi,
          functionName,
          args: params,
        });
        
        return {
          to: contractAddress as `0x${string}`,
          data,
          ...(value && { value: BigInt(value) })
        };
      } else {
        // Use Thirdweb for desktop
        const contract = getContract({
          client,
          chain: CHAIN,
          address: contractAddress,
          abi,
        });
        
        return prepareContractCall({
          contract,
          method: functionName,
          params,
          ...(value && { value: BigInt(value) })
        });
      }
    } catch (error) {
      console.error("❌ Transaction preparation failed:", error);
      throw error;
    }
  }, [walletType]);

  /**
   * Execute a transaction with full error handling and state management
   */
  const executeTransaction = useCallback(async (
    contractAddress: string,
    abi: any[],
    functionName: string,
    params: any[],
    value?: bigint | string,
    successMessage?: string
  ): Promise<TransactionResult> => {
    console.log(`🚀 Executing transaction: ${functionName}`);
    
    // Ensure wallet is connected
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
      const errorMsg = connectionResult.error || "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare the transaction
      const transaction = prepareTransaction(
        contractAddress,
        abi,
        functionName,
        params,
        value
      );

      console.log('📡 Sending transaction via unified provider...');
      
      // Execute the transaction
      const result = await sendTransaction(transaction);
      
      if (result.success) {
        console.log("✅ Transaction successful:", result.transactionHash);
        
        const message = successMessage || `Successfully executed ${functionName}`;
        setSuccess(message);
        
        return {
          success: true,
          transactionHash: result.transactionHash,
          message,
        };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error(`❌ Transaction ${functionName} failed:`, err);
      
      const errorMessage = parseTransactionError(err, functionName);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [requireConnection, sendTransaction, prepareTransaction]);

  /**
   * Parse transaction errors into user-friendly messages
   */
  const parseTransactionError = useCallback((error: any, context?: string): string => {
    const message = error.message || error.toString();
    
    // User rejection
    if (message.includes('user rejected') || message.includes('User rejected')) {
      return "Transaction was rejected by user";
    }
    
    // Insufficient funds
    if (message.includes('insufficient funds') || message.includes('InsufficientFunds')) {
      return "Insufficient funds for transaction and gas fees";
    }
    
    // Gas estimation failed
    if (message.includes('gas') && message.includes('estimation failed')) {
      return "Transaction would fail - please check your inputs";
    }
    
    // Contract-specific errors (basic parsing)
    if (message.includes('ERC20InsufficientBalance')) {
      return "Insufficient token balance for this transaction";
    }
    
    if (message.includes('ERC20InsufficientAllowance')) {
      return "Please approve more tokens for this contract";
    }
    
    if (message.includes('ERC721NonexistentToken')) {
      return "This token does not exist";
    }
    
    if (message.includes('execution reverted')) {
      const revertReason = message.split('execution reverted: ')[1];
      return revertReason || "Transaction reverted - please check your inputs";
    }
    
    // Fallback with context
    return context 
      ? `Failed to ${context}: ${message}`
      : `Transaction failed: ${message}`;
  }, []);

  /**
   * Clear error and success messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  /**
   * Reset all transaction state
   */
  const resetState = useCallback(() => {
    setIsProcessing(false);
    setError(null);
    setSuccess(null);
  }, []);

  /**
   * Check if user rejected the transaction
   */
  const isUserRejection = useCallback((error: any): boolean => {
    const message = error.message || error.toString();
    return message.includes('user rejected') || message.includes('User rejected');
  }, []);

  /**
   * Check if error is due to insufficient funds
   */
  const isInsufficientFunds = useCallback((error: any): boolean => {
    const message = error.message || error.toString();
    return message.includes('insufficient funds') || message.includes('InsufficientFunds');
  }, []);

  return {
    // Core transaction functions
    executeTransaction,
    prepareTransaction,
    
    // Error parsing
    parseTransactionError,
    isUserRejection,
    isInsufficientFunds,
    
    // State management
    isProcessing,
    error,
    success,
    
    // Utility functions
    clearMessages,
    resetState,
    
    // State object for destructuring
    transactionState: {
      isProcessing,
      error,
      success,
    } as TransactionState,
    
    // Debug info
    walletType,
  };
}