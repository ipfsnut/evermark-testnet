import { useActiveAccount, useConnect, useDisconnect } from "thirdweb/react";
import { useFarcasterUser } from "../lib/farcaster";

export function useWallet() {
  const account = useActiveAccount();
  const { connect, isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Add Farcaster support
  const { 
    isInFarcaster, 
    isAuthenticated: isFarcasterAuth, 
    hasVerifiedAddress, 
    getPrimaryAddress,
    user 
  } = useFarcasterUser();

  // Enhanced connection detection
  const hasWalletAccess = !!(
    account?.address || 
    (isInFarcaster && isFarcasterAuth && hasVerifiedAddress())
  );

  const effectiveAddress = account?.address || 
    (isInFarcaster && isFarcasterAuth && hasVerifiedAddress() ? getPrimaryAddress() : null);

  return {
    // Keep existing interface for backward compatibility
    account,
    address: effectiveAddress, // Enhanced to include Farcaster
    isConnected: hasWalletAccess, // Enhanced to include Farcaster
    isConnecting,
    isDisconnecting: false,
    connect,
    disconnect,
    displayAddress: effectiveAddress ? 
      `${effectiveAddress.substring(0, 6)}...${effectiveAddress.substring(effectiveAddress.length - 4)}` : 
      '',
    
    // New Farcaster-aware properties
    hasWalletAccess,
    isThirdwebConnected: !!account?.address,
    isFarcasterConnected: isInFarcaster && isFarcasterAuth && hasVerifiedAddress(),
    isInFarcaster,
    farcasterUser: user,
    getConnectionType: () => {
      if (account?.address) return 'wallet';
      if (isInFarcaster && isFarcasterAuth) return 'farcaster';
      return 'none';
    }
  };
}