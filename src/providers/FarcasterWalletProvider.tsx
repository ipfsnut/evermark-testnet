import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount, useConnect, useSendTransaction } from "wagmi";
import { encodeFunctionData, parseUnits, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { useFarcasterUser } from "../lib/farcaster";
import { WalletContext, UnifiedWalletConnection } from './WalletProvider';

interface FarcasterWalletProviderProps {
  children: ReactNode;
}

// Create a Viem public client for contract reads
const publicClient = createPublicClient({
  chain: base,
  transport: http(`https://${base.id}.rpc.thirdweb.com/${import.meta.env.VITE_THIRDWEB_CLIENT_ID}`)
});

export function FarcasterWalletProvider({ children }: FarcasterWalletProviderProps) {
  const [error, setError] = useState<string>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [lastTransactionHash, setLastTransactionHash] = useState<string>();
  
  // Farcaster context
  const { 
    isInFarcaster,
    isAuthenticated: isFarcasterAuth, 
    isReady: farcasterReady,
    hasVerifiedAddress,
    getPrimaryAddress
  } = useFarcasterUser();
  
  // Wagmi hooks for Farcaster wallet
  const { 
    isConnected: isWagmiConnected, 
    address: wagmiAddress 
  } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { sendTransactionAsync: sendWagmiTx } = useSendTransaction();
  
  // Enhanced address resolution
  const primaryAddress = wagmiAddress || getPrimaryAddress();
  
  // Enhanced connection detection
  const isConnected = isWagmiConnected; // ✅ Only Wagmi connection counts for transactions
  const canInteract = isWagmiConnected; // ✅ Only when Wagmi is actually connected
  
  // Auto-connect for Farcaster
  useEffect(() => {
    if (!farcasterReady || isWagmiConnected || isConnecting) return;
    
    // If we're in Farcaster but not connected via Wagmi, force connection
    if (isFarcasterAuth && hasVerifiedAddress()) {
      console.log('🔌 Forcing Wagmi connection for transactions...');
      setIsConnecting(true);
      
      const farcasterConnector = connectors.find(c => c.id === 'farcasterFrame');
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      }
      setIsConnecting(false);
    }
  }, [farcasterReady, isWagmiConnected, isConnecting, isFarcasterAuth, hasVerifiedAddress, connectors, connect]);
  
  // Manual connection
  const connectWallet = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isConnecting || isConnectPending) {
      return { success: false, error: "Connection already in progress" };
    }
    
    setIsConnecting(true);
    setError(undefined);
    
    try {
      const farcasterConnector = connectors.find(c => c.id === 'farcasterFrame');
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
        console.log('✅ Farcaster wallet connection initiated');
        return { success: true };
      } else {
        if (hasVerifiedAddress()) {
          console.log('✅ Using Farcaster verified addresses');
          return { success: true };
        }
        throw new Error('No Farcaster wallet available');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsConnecting(false);
    }
  }, [connectors, connect, hasVerifiedAddress, isConnecting, isConnectPending]);
  
  // Require connection with retry logic
  const requireConnection = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isConnected) {
      return { success: true };
    }
    
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      const result = await connectWallet();
      if (result.success) {
        return result;
      }
      attempts++;
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return { success: false, error: "Failed to connect after multiple attempts" };
  }, [isConnected, connectWallet]);
  
  // Disconnect
  const disconnect = useCallback(async () => {
    setError(undefined);
    setLastTransactionHash(undefined);
    setIsTransactionPending(false);
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
      if (!sendWagmiTx) {
        throw new Error("Wagmi transaction method not available");
      }
      
      const txHash = await sendWagmiTx(tx);
      setLastTransactionHash(txHash);
      console.log('✅ Farcaster transaction successful:', txHash);
      
      return {
        success: true,
        transactionHash: txHash
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      console.error('❌ Farcaster transaction failed:', err);
      
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setIsTransactionPending(false);
    }
  }, [isConnected, requireConnection, sendWagmiTx]);
  
  // ERC-20 approval using Viem
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
  
  // Check allowance using Viem
  const checkAllowance = useCallback(async (
    tokenAddress: string,
    ownerAddress: string, 
    spenderAddress: string
  ): Promise<bigint> => {
    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'allowance',
            type: 'function',
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' }
            ],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: 'allowance',
        args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`]
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
      
      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }, [sendTransaction]);
  
  const value: UnifiedWalletConnection = {
    // Core state
    isConnected,
    address: primaryAddress || undefined,
    displayAddress: primaryAddress ? `${primaryAddress.slice(0, 6)}...${primaryAddress.slice(-4)}` : undefined,
    
    // Environment
    walletType: 'farcaster',
    isInFarcaster: true,
    
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
    isConnecting: isConnecting || isConnectPending,
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