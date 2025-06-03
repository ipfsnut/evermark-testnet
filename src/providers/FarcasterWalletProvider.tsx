import React, { useState, useEffect, useCallback, ReactNode } from 'react';
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
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // Farcaster context
  const { 
    isInFarcaster,
    isAuthenticated: isFarcasterAuth, 
    isReady: farcasterReady,
    hasVerifiedAddress,
    getPrimaryAddress,
    getVerifiedAddresses,
    user
  } = useFarcasterUser();
  
  // Wagmi hooks for Farcaster wallet
  const { 
    isConnected: isWagmiConnected, 
    address: wagmiAddress,
    status: wagmiStatus
  } = useAccount();
  const { connect, connectors, isPending: isConnectPending, error: connectError } = useConnect();
  const { sendTransactionAsync: sendWagmiTx } = useSendTransaction();
  
  // Enhanced address resolution with priority order
  const primaryAddress = wagmiAddress || getPrimaryAddress();
  const verifiedAddresses = getVerifiedAddresses();
  
  // Enhanced connection detection
  const hasAnyAddress = hasVerifiedAddress() || !!wagmiAddress;
  const isConnected = hasAnyAddress; // ✅ User is "connected" if they have any address
  const canInteract = isWagmiConnected; // ✅ But can only transact if Wagmi is connected
  
  console.log('🔍 FARCASTER WALLET PROVIDER STATE:', {
    isInFarcaster,
    farcasterReady,
    isFarcasterAuth,
    hasVerifiedAddress: hasVerifiedAddress(),
    verifiedAddresses,
    wagmiAddress,
    wagmiStatus,
    isWagmiConnected,
    hasAnyAddress,
    isConnected,
    canInteract,
    connectionAttempts,
    user: user ? { fid: user.fid, username: user.username } : null
  });
  
  // Enhanced auto-connect logic with retry mechanism
  useEffect(() => {
    if (!farcasterReady || isWagmiConnected || isConnecting || connectionAttempts >= 3) return;
    
    // If user is authenticated and has verified addresses, try to connect Wagmi
    if (isFarcasterAuth && hasVerifiedAddress()) {
      console.log('🔌 Auto-connecting Farcaster wallet (attempt', connectionAttempts + 1, ')...');
      setIsConnecting(true);
      setConnectionAttempts(prev => prev + 1);
      
      const farcasterConnector = connectors.find(c => c.id === 'farcasterFrame');
      if (farcasterConnector) {
        try {
          console.log('✅ Found Farcaster connector, initiating connection...');
          connect({ connector: farcasterConnector });
          setError(undefined);
        } catch (err: unknown) {
          console.warn('⚠️ Auto-connect failed (attempt', connectionAttempts + 1, '):', err);
          // Don't set error immediately - user still has verified addresses
          if (connectionAttempts >= 2) {
            setError("Auto-connection failed, but you can still use your verified addresses");
          }
        }
      } else {
        console.log('⚠️ No Farcaster connector found, using verified addresses only');
        setError("Using verified addresses (full wallet features require connection)");
      }
      
      setTimeout(() => setIsConnecting(false), 2000);
    } else if (isFarcasterAuth && !hasVerifiedAddress()) {
      console.log('⚠️ User authenticated but no verified addresses found');
      setError("Please link a wallet to your Farcaster account to use Evermark");
    }
  }, [
    farcasterReady, 
    isWagmiConnected, 
    isConnecting, 
    isFarcasterAuth, 
    hasVerifiedAddress, 
    connectors, 
    connect, 
    connectionAttempts
  ]);
  
  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      console.error('❌ Wagmi connection error:', connectError);
      setError(`Connection failed: ${connectError.message}`);
    }
  }, [connectError]);
  
  // Manual connection with enhanced error handling
  const connectWallet = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isConnecting || isConnectPending) {
      return { success: false, error: "Connection already in progress" };
    }
    
    console.log('🔌 Manual wallet connection requested...');
    setIsConnecting(true);
    setError(undefined);
    
    try {
      // Check if user is authenticated in Farcaster
      if (!isFarcasterAuth) {
        throw new Error('Please authenticate with Farcaster first');
      }
      
      // Check for verified addresses
      if (!hasVerifiedAddress()) {
        throw new Error('Please link a wallet to your Farcaster account first');
      }
      
      const farcasterConnector = connectors.find(c => c.id === 'farcasterFrame');
      if (farcasterConnector) {
        console.log('✅ Initiating manual Farcaster wallet connection...');
        connect({ connector: farcasterConnector });
        
        // Wait a bit for connection to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ Manual Farcaster wallet connection initiated');
        return { success: true };
      } else {
        // Fallback: user has verified addresses but no connector
        if (hasVerifiedAddress()) {
          console.log('✅ Using Farcaster verified addresses (limited functionality)');
          setError("Using verified addresses (some features may be limited)");
          return { success: true };
        }
        throw new Error('No Farcaster wallet connector available');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet';
      console.error('❌ Manual connection failed:', errorMsg);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsConnecting(false);
    }
  }, [
    isConnecting, 
    isConnectPending, 
    isFarcasterAuth, 
    hasVerifiedAddress, 
    connectors, 
    connect
  ]);
  
  // Require connection with enhanced retry logic
  const requireConnection = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    console.log('🔍 Connection requirement check:', {
      isConnected,
      canInteract,
      hasVerifiedAddress: hasVerifiedAddress(),
      isWagmiConnected
    });
    
    // If we can interact (Wagmi connected), we're good
    if (canInteract) {
      return { success: true };
    }
    
    // If user has verified addresses but no Wagmi connection, try to connect
    if (hasVerifiedAddress() && !isWagmiConnected) {
      console.log('🔌 User has verified addresses, attempting Wagmi connection...');
      const result = await connectWallet();
      
      // Even if Wagmi connection fails, user can still use verified addresses for some features
      if (!result.success && hasVerifiedAddress()) {
        console.log('⚠️ Wagmi connection failed but user has verified addresses');
        return { 
          success: true, // ✅ Allow limited functionality
          error: "Limited functionality - some features may not work" 
        };
      }
      
      return result;
    }
    
    // No verified addresses at all
    return { 
      success: false, 
      error: "Please link a wallet to your Farcaster account" 
    };
  }, [isConnected, canInteract, hasVerifiedAddress, isWagmiConnected, connectWallet]);
  
  // Disconnect
  const disconnect = useCallback(async () => {
    console.log('🔌 Disconnecting Farcaster wallet...');
    setError(undefined);
    setLastTransactionHash(undefined);
    setIsTransactionPending(false);
    setConnectionAttempts(0);
    // Note: Can't actually disconnect from Farcaster, just reset our state
  }, []);
  
  // Enhanced transaction sending with better error handling
  const sendTransaction = useCallback(async (tx: any): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
    console.log('📡 Farcaster transaction requested:', { canInteract, isWagmiConnected, hasVerifiedAddress: hasVerifiedAddress() });
    
    // Must have Wagmi connection for transactions
    if (!canInteract) {
      console.log('🔌 No Wagmi connection, attempting to establish...');
      const connectResult = await requireConnection();
      if (!connectResult.success) {
        return {
          success: false,
          error: connectResult.error || "Cannot send transactions without wallet connection"
        };
      }
      
      // Give connection a moment to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      if (!isWagmiConnected) {
        return {
          success: false,
          error: "Wallet connection required for transactions"
        };
      }
    }
    
    setIsTransactionPending(true);
    setError(undefined);
    
    try {
      if (!sendWagmiTx) {
        throw new Error("Wagmi transaction method not available");
      }
      
      console.log('📡 Sending transaction via Wagmi...');
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
  }, [canInteract, isWagmiConnected, requireConnection, sendWagmiTx]);
  
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
  
  // Enhanced wallet connection value
  const value: UnifiedWalletConnection = {
    // Core state - ✅ Enhanced logic
    isConnected, // True if user has any address (verified or Wagmi)
    address: primaryAddress || undefined,
    displayAddress: primaryAddress ? `${primaryAddress.slice(0, 6)}...${primaryAddress.slice(-4)}` : undefined,
    
    // Environment
    walletType: 'farcaster',
    isInFarcaster: true,
    
    // Methods
    connectWallet,
    requireConnection,
    disconnect,
    
    // Capabilities - ✅ Clear distinction
    canInteract, // Only true when Wagmi is connected (can send transactions)
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
  
  // Enhanced debug logging for development
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 FARCASTER WALLET PROVIDER UPDATE:', {
        timestamp: new Date().toISOString(),
        state: {
          isConnected,
          canInteract,
          primaryAddress,
          verifiedAddresses: verifiedAddresses.length,
          wagmiStatus,
          connectionAttempts,
          error: error || 'none'
        },
        capabilities: {
          hasVerifiedAddress: hasVerifiedAddress(),
          isWagmiConnected,
          canSendTransactions: canInteract,
          hasTransactionMethod: !!sendWagmiTx
        }
      });
    }
  }, [
    isConnected, 
    canInteract, 
    primaryAddress, 
    verifiedAddresses.length, 
    wagmiStatus, 
    connectionAttempts, 
    error,
    hasVerifiedAddress,
    isWagmiConnected,
    sendWagmiTx
  ]);
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
