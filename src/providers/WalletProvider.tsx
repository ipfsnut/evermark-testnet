import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { useAccount, useConnect, useSendTransaction, type Connector } from "wagmi";
import { useFarcasterUser } from "../lib/farcaster";

export interface WalletConnection {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionType: 'thirdweb' | 'wagmi' | 'none';
  
  // Addresses
  address?: string;
  displayAddress?: string;
  
  // Thirdweb specific
  thirdwebAccount: any;
  useThirdweb: boolean;
  
  // Wagmi specific (for Farcaster)
  wagmiAddress?: string;
  wagmiConnected: boolean;
  useWagmi: boolean;
  connectors: readonly Connector[];
  
  // Farcaster context
  isInFarcaster: boolean;
  isFarcasterAuth: boolean;
  
  // Actions
  connectWallet: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
  
  // Transaction methods
  sendThirdwebTransaction: any;
  sendWagmiTransaction: any;
  isTransactionPending: boolean;
  transactionError?: string;
  
  // Status
  error?: string;
  needsConnection: boolean;
  canInteract: boolean;
}

const WalletContext = createContext<WalletConnection | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [error, setError] = useState<string>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);
  
  // Thirdweb hooks (for regular web app)
  const thirdwebAccount = useActiveAccount();
  
  // Wagmi hooks (for Farcaster Frame)
  const { 
    isConnected: isWagmiConnected, 
    address: wagmiAddress,
    connector: wagmiConnector 
  } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { 
    sendTransactionAsync: sendWagmiTransaction, 
    isPending: isWagmiPending,
    error: wagmiError 
  } = useSendTransaction();
  
  const { isInFarcaster, isAuthenticated: isFarcasterAuth } = useFarcasterUser();
  
  // Determine which wallet system to use
  const useThirdweb = !isInFarcaster && !!thirdwebAccount?.address;
  const useWagmi = isInFarcaster && isWagmiConnected && !!wagmiAddress;
  
  // Connection state
  const isConnected = useThirdweb || useWagmi;
  const address = thirdwebAccount?.address || wagmiAddress;
  const displayAddress = address ? 
    `${address.slice(0, 6)}...${address.slice(-4)}` : 
    undefined;
  
  const connectionType: 'thirdweb' | 'wagmi' | 'none' = 
    useThirdweb ? 'thirdweb' : 
    useWagmi ? 'wagmi' : 
    'none';
  
  const needsConnection = !isConnected;
  const canInteract = isConnected;
  
  // Auto-connect logic with better error handling
  const attemptAutoConnect = useCallback(async () => {
    if (hasAttemptedAutoConnect || isConnecting || isConnected) {
      return;
    }
    
    console.log("🔍 Checking auto-connect conditions:", {
      isInFarcaster,
      isFarcasterAuth,
      isWagmiConnected,
      connectorsLength: connectors.length,
      hasAttemptedAutoConnect
    });
    
    if (isInFarcaster && isFarcasterAuth && !isWagmiConnected && connectors.length > 0) {
      console.log("🔌 Auto-connecting Farcaster wallet...");
      setHasAttemptedAutoConnect(true);
      setIsConnecting(true);
      
      try {
        const connector = connectors[0];
        console.log("🔌 Using connector:", connector.name, connector.id);
        
        await connect({ connector });
        console.log("✅ Auto-connection successful");
      } catch (error: any) {
        console.error("❌ Auto-connection failed:", error);
        setError(`Auto-connection failed: ${error.message}`);
      } finally {
        setIsConnecting(false);
      }
    } else {
      setHasAttemptedAutoConnect(true);
    }
  }, [
    isInFarcaster, 
    isFarcasterAuth, 
    isWagmiConnected, 
    connectors, 
    connect, 
    hasAttemptedAutoConnect, 
    isConnecting, 
    isConnected
  ]);
  
  // Auto-connect effect with delay for mobile
  useEffect(() => {
    // Add a small delay to ensure all hooks are initialized
    const timer = setTimeout(() => {
      attemptAutoConnect();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [attemptAutoConnect]);
  
  // Reset auto-connect attempt when context changes
  useEffect(() => {
    if (!isInFarcaster || !isFarcasterAuth) {
      setHasAttemptedAutoConnect(false);
    }
  }, [isInFarcaster, isFarcasterAuth]);
  
  const connectWallet = useCallback(async () => {
    if (isConnecting || isConnectPending) {
      return { success: false, error: "Connection already in progress" };
    }
    
    setIsConnecting(true);
    setError(undefined);
    
    try {
      if (isInFarcaster) {
        // Try to connect Farcaster wallet
        if (connectors.length > 0) {
          console.log("🔌 Manual Farcaster wallet connection...");
          const connector = connectors[0];
          console.log("🔌 Using connector:", connector.name, connector.id);
          
          await connect({ connector });
          console.log("✅ Manual Farcaster wallet connected successfully");
          return { success: true };
        } else {
          const errorMsg = "No Farcaster wallet connector available";
          console.error("❌", errorMsg);
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      } else {
        // For regular web app, user needs to manually connect via Thirdweb UI
        const errorMsg = "Please use the Connect Wallet button to connect";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (connectError: any) {
      console.error("❌ Manual wallet connection failed:", connectError);
      const errorMsg = `Failed to connect wallet: ${connectError.message}`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsConnecting(false);
    }
  }, [isInFarcaster, connectors, connect, isConnecting, isConnectPending]);
  
  const disconnect = useCallback(() => {
    // Handle disconnection based on connection type
    if (useThirdweb) {
      // Thirdweb disconnect would go here
      console.log("Disconnecting Thirdweb wallet");
    } else if (useWagmi) {
      // Wagmi disconnect would go here  
      console.log("Disconnecting Wagmi wallet");
    }
    setError(undefined);
    setHasAttemptedAutoConnect(false);
  }, [useThirdweb, useWagmi]);
  
  // Enhanced debug logging
  console.log("🔍 WalletProvider state:", {
    isInFarcaster,
    isFarcasterAuth,
    useThirdweb,
    useWagmi,
    thirdwebAddress: thirdwebAccount?.address,
    wagmiAddress,
    isWagmiConnected,
    isConnected,
    connectionType,
    canInteract,
    connectorsAvailable: connectors.length,
    connectorNames: connectors.map(c => c.name),
    hasAttemptedAutoConnect,
    isConnecting: isConnecting || isConnectPending,
    error
  });
  
  const value: WalletConnection = {
    // Connection state
    isConnected,
    isConnecting: isConnecting || isConnectPending,
    connectionType,
    
    // Addresses
    address,
    displayAddress,
    
    // Thirdweb specific
    thirdwebAccount,
    useThirdweb,
    
    // Wagmi specific
    wagmiAddress,
    wagmiConnected: isWagmiConnected,
    useWagmi,
    connectors,
    
    // Farcaster context
    isInFarcaster,
    isFarcasterAuth,
    
    // Actions
    connectWallet,
    disconnect,
    
    // Transaction methods (pass through the actual hooks)
    sendThirdwebTransaction: null, // Will be handled in individual hooks
    sendWagmiTransaction,
    isTransactionPending: isWagmiPending,
    transactionError: wagmiError?.message,
    
    // Status
    error,
    needsConnection,
    canInteract,
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletConnection(): WalletConnection {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletConnection must be used within a WalletProvider');
  }
  return context;
}

// Convenience hooks for specific use cases
export function useWalletAuth() {
  const { isConnected, address, needsConnection, connectWallet, error, canInteract } = useWalletConnection();
  return {
    isConnected,
    address,
    needsConnection,
    connectWallet,
    error,
    canInteract,
    requireConnection: async () => {
      if (!isConnected) {
        return await connectWallet();
      }
      return { success: true };
    }
  };
}

export function useTransactionWallet() {
  const { 
    useThirdweb, 
    useWagmi, 
    thirdwebAccount, 
    sendWagmiTransaction,
    isTransactionPending,
    transactionError,
    canInteract 
  } = useWalletConnection();
  
  return {
    useThirdweb,
    useWagmi,
    thirdwebAccount,
    sendWagmiTransaction,
    isTransactionPending,
    transactionError,
    canInteract,
    hasTransactionCapability: canInteract
  };
}