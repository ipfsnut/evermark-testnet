// src/providers/WalletProvider.tsx - All TypeScript errors fixed
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { useAccount, useConnect, useSendTransaction } from "wagmi";
import { useFarcasterUser } from "../lib/farcaster";

// Properly typed interface
export interface WalletConnection {
  // Core state - simplified and properly typed
  isConnected: boolean;
  address?: string;
  displayAddress?: string;
  
  // Environment context
  isInFarcaster: boolean;
  usesFarcasterWallet: boolean;
  
  // Connection methods
  connectWallet: () => Promise<{ success: boolean; error?: string }>;
  requireConnection: () => Promise<{ success: boolean; error?: string }>;
  
  // Transaction capabilities
  canInteract: boolean;
  sendTransaction: any; // Will be either Thirdweb or Wagmi based on context
  
  // Status
  isConnecting: boolean;
  error?: string;
}

const WalletContext = createContext<WalletConnection | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [error, setError] = useState<string>();
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Get Farcaster context with proper typing - removed unused farcasterUser
  const { 
    isInFarcaster, 
    isAuthenticated: isFarcasterAuth, 
    isReady: farcasterReady,
    hasVerifiedAddress,
    getPrimaryAddress
  } = useFarcasterUser();
  
  // Thirdweb (for desktop/web)
  const thirdwebAccount = useActiveAccount();
  
  // Wagmi (for Farcaster frames)
  const { 
    isConnected: isWagmiConnected, 
    address: wagmiAddress 
  } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { sendTransactionAsync: sendWagmiTx } = useSendTransaction();
  
  // Clean environment-based logic with proper typing
  const usesFarcasterWallet = isInFarcaster && farcasterReady;
  
  // Helper function to convert null to undefined
  const nullToUndefined = (value: string | null | undefined): string | undefined => {
    return value === null ? undefined : value;
  };
  
  // FIXED: Complete null filtering for all address sources
  const primaryAddress = usesFarcasterWallet 
    ? (nullToUndefined(wagmiAddress) || nullToUndefined(getPrimaryAddress())) 
    : nullToUndefined(thirdwebAccount?.address);
  
  // Better connection detection
  const isConnected = usesFarcasterWallet 
    ? (isWagmiConnected || hasVerifiedAddress()) 
    : !!thirdwebAccount?.address;
  
  const canInteract = isConnected;
  
  console.log('🔍 Wallet State (All Errors Fixed):', {
    isInFarcaster,
    farcasterReady,
    usesFarcasterWallet,
    isWagmiConnected,
    wagmiAddress,
    farcasterPrimaryAddress: getPrimaryAddress(),
    hasVerifiedAddress: hasVerifiedAddress(),
    thirdwebAddress: thirdwebAccount?.address,
    primaryAddress,
    isConnected,
    canInteract
  });
  
  // Auto-connect for Farcaster
  useEffect(() => {
    if (!usesFarcasterWallet || isConnected || isConnecting) return;
    
    // If user has verified addresses in Farcaster but Wagmi isn't connected, try to connect
    if (isFarcasterAuth && hasVerifiedAddress() && !isWagmiConnected) {
      console.log('🔌 Auto-connecting Farcaster wallet...');
      setIsConnecting(true);
      
      const farcasterConnector = connectors.find(c => c.id === 'farcasterFrame');
      if (farcasterConnector) {
        try {
          // FIXED: connect() is synchronous in wagmi v2, doesn't return a Promise
          connect({ connector: farcasterConnector });
          console.log('✅ Farcaster wallet auto-connect initiated');
          setError(undefined);
        } catch (err: unknown) {
          console.warn('⚠️ Auto-connect failed, but user has verified addresses:', err);
          // Don't set error - user still has verified addresses from Farcaster context
        }
        setIsConnecting(false);
      } else {
        setIsConnecting(false);
      }
    }
  }, [usesFarcasterWallet, isConnected, isConnecting, isFarcasterAuth, hasVerifiedAddress, isWagmiConnected, connectors, connect]);
  
  // Manual connection
  const connectWallet = useCallback(async () => {
    if (isConnecting || isConnectPending) {
      return { success: false, error: "Connection already in progress" };
    }
    
    setIsConnecting(true);
    setError(undefined);
    
    try {
      if (usesFarcasterWallet) {
        // In Farcaster: try to connect the frame wallet
        const farcasterConnector = connectors.find(c => c.id === 'farcasterFrame');
        if (farcasterConnector) {
          // FIXED: connect() is synchronous in wagmi v2, doesn't return a Promise
          connect({ connector: farcasterConnector });
          console.log('✅ Farcaster wallet connection initiated');
          return { success: true };
        } else {
          // If no connector but user has verified addresses, that's still success
          if (hasVerifiedAddress()) {
            console.log('✅ Using Farcaster verified addresses');
            return { success: true };
          }
          throw new Error('No Farcaster wallet available');
        }
      } else {
        // Desktop: user needs to use Thirdweb connect button
        throw new Error('Please use the Connect Wallet button for desktop');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsConnecting(false);
    }
  }, [usesFarcasterWallet, connectors, connect, hasVerifiedAddress, isConnecting, isConnectPending]);
  
  // Require connection (auto-connect if needed)
  const requireConnection = useCallback(async () => {
    if (isConnected) {
      return { success: true };
    }
    return await connectWallet();
  }, [isConnected, connectWallet]);
  
  const value: WalletConnection = {
    // Core state - primaryAddress is now guaranteed to be string | undefined
    isConnected,
    address: primaryAddress,
    displayAddress: primaryAddress ? `${primaryAddress.slice(0, 6)}...${primaryAddress.slice(-4)}` : undefined,
    
    // Environment
    isInFarcaster,
    usesFarcasterWallet,
    
    // Methods
    connectWallet,
    requireConnection,
    
    // Capabilities
    canInteract,
    sendTransaction: usesFarcasterWallet ? sendWagmiTx : null, // Thirdweb transactions handled per-hook
    
    // Status
    isConnecting: isConnecting || isConnectPending,
    error,
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// Main hook
export function useWalletConnection(): WalletConnection {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletConnection must be used within a WalletProvider');
  }
  return context;
}

// Auth hook with proper typing
export function useWalletAuth() {
  const { 
    isConnected, 
    address, 
    canInteract, 
    requireConnection, 
    connectWallet,
    error,
    isInFarcaster,
    usesFarcasterWallet 
  } = useWalletConnection();
  
  return {
    isConnected,
    address,
    canInteract,
    requireConnection,
    connectWallet,
    error,
    isInFarcaster,
    usesFarcasterWallet,
    // Helper for transaction hooks
    needsConnection: !isConnected
  };
}

// Transaction hook with proper typing
export function useTransactionWallet() {
  const { 
    usesFarcasterWallet,
    sendTransaction,
    canInteract,
    isConnected 
  } = useWalletConnection();
  
  return {
    useThirdweb: !usesFarcasterWallet && isConnected,
    useWagmi: usesFarcasterWallet && isConnected,
    sendWagmiTransaction: usesFarcasterWallet ? sendTransaction : null,
    canInteract,
    isTransactionPending: false, // Individual hooks manage their own pending state
  };
}