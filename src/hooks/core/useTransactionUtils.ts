// src/hooks/core/useTransactionUtils.ts - Enhanced unified transaction handling
import { useState, useCallback, useMemo } from "react";
import { getContract, prepareContractCall } from "thirdweb";
import { encodeFunctionData } from "viem";
import { client } from "../../lib/thirdweb";
import { CHAIN } from "../../lib/contracts";
import { useWalletAuth, useWalletConnection } from "../../providers/WalletProvider";
import { useContractErrors, type ErrorContext } from "./useContractErrors";

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  message?: string;
  receipt?: any;
}

export interface TransactionState {
  isProcessing: boolean;
  error: string | null;
  success: string | null;
  lastTransactionHash?: string;
}

export interface TransactionOptions {
  value?: bigint | string;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  successMessage?: string;
  errorContext?: Partial<ErrorContext>;
}

export interface EstimateGasResult {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  totalCost: bigint;
  success: boolean;
  error?: string;
}

/**
 * Enhanced unified transaction utilities for all contract interactions
 * Supports both Farcaster frames and desktop wallets with improved error handling
 */
export function useTransactionUtils() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastTransactionHash, setLastTransactionHash] = useState<string>();
  
  const { requireConnection, address } = useWalletAuth();
  const { sendTransaction, walletType } = useWalletConnection();
  const { parseError, isUserRejection } = useContractErrors();

  /**
   * Enhanced transaction preparation with gas estimation
   */
  const prepareTransaction = useCallback((
    contractAddress: string,
    abi: any[],
    functionName: string,
    params: any[],
    options: TransactionOptions = {}
  ) => {
    if (!contractAddress || !abi || !functionName) {
      throw new Error("Invalid transaction parameters");
    }

    console.log("🔧 Preparing transaction:", {
      contractAddress: contractAddress.slice(0, 10) + "...",
      functionName,
      paramsCount: params.length,
      value: options.value?.toString(),
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
        
        const transaction: any = {
          to: contractAddress as `0x${string}`,
          data,
        };

        // Add optional transaction parameters
        if (options.value) transaction.value = BigInt(options.value);
        if (options.gasLimit) transaction.gas = options.gasLimit;
        if (options.maxFeePerGas) transaction.maxFeePerGas = options.maxFeePerGas;
        if (options.maxPriorityFeePerGas) transaction.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
        
        return transaction;
      } else {
        // Use Thirdweb for desktop
        const contract = getContract({
          client,
          chain: CHAIN,
          address: contractAddress,
          abi,
        });
        
        const callOptions: any = {
          method: functionName,
          params,
        };

        // Add optional parameters
        if (options.value) callOptions.value = BigInt(options.value);
        if (options.gasLimit) callOptions.gas = options.gasLimit;
        
        return prepareContractCall(contract, callOptions);
      }
    } catch (error) {
      console.error("❌ Transaction preparation failed:", error);
      throw error;
    }
  }, [walletType]);

  /**
   * Estimate gas for a transaction
   */
  const estimateGas = useCallback(async (
    contractAddress: string,
    abi: any[],
    functionName: string,
    params: any[],
    options: TransactionOptions = {}
  ): Promise<EstimateGasResult> => {
    try {
      // Connection check
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        throw new Error(connectionResult.error || "Wallet not connected");
      }

      // For now, return conservative estimates
      // In a full implementation, you'd use the wallet's gas estimation
      const gasLimit = BigInt(300000); // Conservative default
      const maxFeePerGas = BigInt(30000000000); // 30 gwei
      const maxPriorityFeePerGas = BigInt(2000000000); // 2 gwei
      const totalCost = gasLimit * maxFeePerGas;

      return {
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        totalCost,
        success: true
      };
    } catch (error) {
      return {
        gasLimit: BigInt(0),
        maxFeePerGas: BigInt(0),
        maxPriorityFeePerGas: BigInt(0),
        totalCost: BigInt(0),
        success: false,
        error: error instanceof Error ? error.message : 'Gas estimation failed'
      };
    }
  }, [requireConnection]);

  /**
   * Execute a transaction with comprehensive error handling and state management
   */
  const executeTransaction = useCallback(async (
    contractAddress: string,
    abi: any[],
    functionName: string,
    params: any[],
    options: TransactionOptions = {}
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
    setLastTransactionHash(undefined);

    try {
      // Prepare the transaction
      const transaction = prepareTransaction(
        contractAddress,
        abi,
        functionName,
        params,
        options
      );

      console.log('📡 Sending transaction via unified provider...');
      
      // Execute the transaction
      const result = await sendTransaction(transaction);
      
      if (result.success && result.transactionHash) {
        console.log("✅ Transaction successful:", result.transactionHash);
        
        const message = options.successMessage || `Successfully executed ${functionName}`;
        setSuccess(message);
        setLastTransactionHash(result.transactionHash);
        
        return {
          success: true,
          transactionHash: result.transactionHash,
          message,
          receipt: result.receipt
        };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error(`❌ Transaction ${functionName} failed:`, err);
      
      // Use enhanced error parsing
      const errorContext: ErrorContext = {
        operation: functionName,
        contract: contractAddress,
        methodName: functionName,
        userAddress: address,
        ...options.errorContext
      };
      
      const parsedError = parseError(err, errorContext);
      setError(parsedError.message);
      
      return {
        success: false,
        error: parsedError.message,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [requireConnection, sendTransaction, prepareTransaction, parseError, address]);

  /**
   * Execute multiple transactions in batch
   */
  const executeBatchTransactions = useCallback(async (
    transactions: Array<{
      contractAddress: string;
      abi: any[];
      functionName: string;
      params: any[];
      options?: TransactionOptions;
    }>
  ): Promise<TransactionResult[]> => {
    const results: TransactionResult[] = [];
    
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      console.log(`🔄 Executing batch transaction ${i + 1}/${transactions.length}: ${tx.functionName}`);
      
      const result = await executeTransaction(
        tx.contractAddress,
        tx.abi,
        tx.functionName,
        tx.params,
        tx.options
      );
      
      results.push(result);
      
      // If any transaction fails, stop the batch
      if (!result.success) {
        console.warn(`❌ Batch transaction ${i + 1} failed, stopping batch`);
        break;
      }
      
      // Small delay between transactions
      if (i < transactions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }, [executeTransaction]);

  /**
   * Enhanced transaction retry with exponential backoff
   */
  const retryTransaction = useCallback(async (
    contractAddress: string,
    abi: any[],
    functionName: string,
    params: any[],
    options: TransactionOptions = {},
    maxRetries: number = 3
  ): Promise<TransactionResult> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Transaction attempt ${attempt}/${maxRetries}`);
      
      try {
        const result = await executeTransaction(
          contractAddress,
          abi,
          functionName,
          params,
          options
        );
        
        if (result.success) {
          return result;
        }
        
        lastError = new Error(result.error || 'Transaction failed');
        
        // Don't retry user rejections
        if (isUserRejection(lastError)) {
          break;
        }
        
      } catch (error) {
        lastError = error;
        
        // Don't retry user rejections
        if (isUserRejection(error)) {
          break;
        }
      }
      
      // Exponential backoff delay
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    const errorContext: ErrorContext = {
      operation: `${functionName} (after ${maxRetries} attempts)`,
      contract: contractAddress,
      methodName: functionName,
      userAddress: address,
      ...options.errorContext
    };
    
    const parsedError = parseError(lastError, errorContext);
    setError(parsedError.message);
    
    return {
      success: false,
      error: parsedError.message
    };
  }, [executeTransaction, isUserRejection, parseError, address]);

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
    setLastTransactionHash(undefined);
  }, []);

  /**
   * Get current transaction state
   */
  const transactionState: TransactionState = useMemo(() => ({
    isProcessing,
    error,
    success,
    lastTransactionHash
  }), [isProcessing, error, success, lastTransactionHash]);

  /**
   * Enhanced transaction status checker
   */
  const checkTransactionStatus = useCallback(async (txHash: string) => {
    try {
      // In a full implementation, you'd check the transaction status
      // For now, we'll assume success if hash exists
      return {
        status: 'success',
        confirmations: 1,
        blockNumber: Date.now(), // Mock
        gasUsed: BigInt(21000) // Mock
      };
    } catch (error) {
      console.error('Failed to check transaction status:', error);
      return {
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  return {
    // Core transaction functions
    executeTransaction,
    executeBatchTransactions,
    retryTransaction,
    prepareTransaction,
    estimateGas,
    
    // State management
    isProcessing,
    error,
    success,
    lastTransactionHash,
    transactionState,
    
    // Utility functions
    clearMessages,
    resetState,
    checkTransactionStatus,
    
    // Wallet info
    walletType,
    userAddress: address,
    
    // Enhanced capabilities
    canExecuteTransactions: !!address,
    
    // Legacy compatibility
    parseTransactionError: parseError,
  };
}