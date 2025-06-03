import React, { useState, useCallback, ReactNode } from 'react';
import { useActiveAccount, useSendTransaction as useThirdwebTx } from "thirdweb/react";
import { getContract, readContract } from "thirdweb";
import { encodeFunctionData, parseUnits } from "viem";
import { client } from "../lib/thirdweb";
import { CHAIN } from "../lib/contracts";
import { WalletContext, UnifiedWalletConnection } from './WalletProvider';

interface ThirdwebWalletProviderProps {
  children: ReactNode;
}

export function ThirdwebWalletProvider({ children }: ThirdwebWalletProviderProps) {
  const [error, setError] = useState<string>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [lastTransactionHash, setLastTransactionHash] = useState<string>();
  
  // Thirdweb hooks
  const thirdwebAccount = useActiveAccount();
  const { mutateAsync: sendThirdwebTx } = useThirdwebTx();
  
  // Connection state
  const isConnected = !!thirdwebAccount?.address;
  const canInteract = isConnected;
  const primaryAddress = thirdwebAccount?.address;
  
  // Manual connection (for desktop, user needs to use Connect Wallet button)
  const connectWallet = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isConnecting) {
      return { success: false, error: "Connection already in progress" };
    }
    
    setIsConnecting(true);
    setError(undefined);
    
    try {
      // For Thirdweb, connection is handled by the ConnectButton component
      // This is just a placeholder that tells users what to do
      if (!isConnected) {
        throw new Error('Please use the Connect Wallet button to connect your wallet');
      }
      
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting]);
  
  // Require connection
  const requireConnection = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isConnected) {
      return { success: true };
    }
    
    return await connectWallet();
  }, [isConnected, connectWallet]);
  
  // Disconnect
  const disconnect = useCallback(async () => {
    setError(undefined);
    setLastTransactionHash(undefined);
    setIsTransactionPending(false);
    // Note: Thirdweb disconnection is handled by the ConnectButton component
  }, []);
  
  // Send transaction
  const sendTransaction = useCallback(async (tx: any): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    if (!isConnected) {
      const connectResult = await requireConnection();
      if (!connectResult.success) {
        return {
          success: false,
          error: connectResult.error || "Not connected"
        };
      }
    }
    
    setIsTransactionPending(true);
    setError(undefined);
    
    try {
      if (!sendThirdwebTx) {
        throw new Error("Thirdweb transaction method not available");
      }
      
      const result = await sendThirdwebTx(tx);
      const txHash = result.transactionHash;
      
      setLastTransactionHash(txHash);
      console.log('✅ Thirdweb transaction successful:', txHash);
      
      return {
        success: true,
        transactionHash: txHash
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      console.error('❌ Thirdweb transaction failed:', err);
      
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setIsTransactionPending(false);
    }
  }, [isConnected, requireConnection, sendThirdwebTx]);
  
  // ERC-20 approval using Viem encoding + Thirdweb sending
  const approveERC20 = useCallback(async (
    tokenAddress: string, 
    spenderAddress: string, 
    amount: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    try {
      const amountWei = parseUnits(amount, 18);
      
      const approvalData = encodeFunctionData({
        abi: [
          {
            name: 'approve',
            type: 'function',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ],
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, amountWei]
      });
      
      const tx = {
        to: tokenAddress as `0x${string}`,
        data: approvalData,
      };
      
      return await sendTransaction(tx);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Approval failed';
      return {
        success: false,
        error: errorMsg
      };
    }
  }, [sendTransaction]);
  
  // Check allowance using Thirdweb
  const checkAllowance = useCallback(async (
    tokenAddress: string,
    ownerAddress: string, 
    spenderAddress: string
  ): Promise<bigint> => {
    try {
      const tokenContract = getContract({
        client,
        chain: CHAIN,
        address: tokenAddress,
      });
      
      const allowance = await readContract({
        contract: tokenContract,
        method: "function allowance(address owner, address spender) view returns (uint256)",
        params: [ownerAddress, spenderAddress]
      });
      
      return allowance as bigint;
    } catch (err: unknown) {
      console.error('Error checking allowance:', err);
      return BigInt(0);
    }
  }, []);
  
  // Batch transactions
  const batchTransactions = useCallback(async (transactions: any[]): Promise<Array<{ success: boolean; transactionHash?: string; error?: string }>> => {
    const results: Array<{ success: boolean; transactionHash?: string; error?: string }> = [];
    
    for (const tx of transactions) {
      const result = await sendTransaction(tx);
      results.push(result);
      
      if (!result.success) {
        break;
      }
      
      // Small delay between transactions to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }, [sendTransaction]);
  
  const value: UnifiedWalletConnection = {
    // Core state
    isConnected,
    address: primaryAddress,
    displayAddress: primaryAddress ? `${primaryAddress.slice(0, 6)}...${primaryAddress.slice(-4)}` : undefined,
    
    // Environment
    walletType: 'thirdweb',
    isInFarcaster: false,
    
    // Methods
    connectWallet,
    requireConnection,
    disconnect,
    
    // Capabilities
    canInteract,
    sendTransaction,
    
    // ERC-20 utilities
    approveERC20,
    checkAllowance,
    
    // Batch transactions
    batchTransactions,
    
    // Status
    isConnecting,
    isTransactionPending,
    error,
    lastTransactionHash,
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}