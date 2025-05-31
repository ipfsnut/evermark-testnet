// src/hooks/useWallet.ts - Now just a thin, backward-compatible wrapper
import { useWalletConnection } from "../providers/WalletProvider";
import { useFarcasterUser } from "../lib/farcaster";

export function useWallet() {
  // 🎉 SIMPLIFIED: Everything comes from the provider now
  const walletConnection = useWalletConnection();
  const { user: farcasterUser } = useFarcasterUser();
  
  // Debug logging to see the transformation
  console.log('🔍 useWallet Debug:', {
    thirdwebAddress: walletConnection.thirdwebAccount?.address,
    wagmiAddress: walletConnection.wagmiAddress,
    isInFarcaster: walletConnection.isInFarcaster,
    connectionType: walletConnection.connectionType,
    canInteract: walletConnection.canInteract
  });

  return {
    // ✅ Backward compatibility interface (existing code keeps working)
    account: walletConnection.thirdwebAccount,
    address: walletConnection.address,
    isConnected: walletConnection.isConnected,
    isConnecting: walletConnection.isConnecting,
    isDisconnecting: false, // Not implemented yet
    connect: walletConnection.connectWallet,
    disconnect: walletConnection.disconnect,
    displayAddress: walletConnection.displayAddress || '',
    
    // 🎉 Enhanced properties (new capabilities)
    hasWalletAccess: walletConnection.canInteract,
    isThirdwebConnected: walletConnection.useThirdweb,
    isFarcasterConnected: walletConnection.useWagmi && walletConnection.wagmiConnected,
    isInFarcaster: walletConnection.isInFarcaster,
    farcasterUser,
    getConnectionType: () => walletConnection.connectionType,
    
    // 🎉 Direct access to provider state (for advanced usage)
    walletProvider: walletConnection
  };
}