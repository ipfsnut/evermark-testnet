// src/hooks/useProfile.ts - Simplified with WalletProvider
import { useFarcasterUser } from '../lib/farcaster';
import { useWalletConnection } from '../providers/WalletProvider';

export interface UnifiedProfile {
  // Authentication state
  isAuthenticated: boolean;
  authMethod: 'farcaster' | 'wallet' | 'both' | 'none';
  
  // Wallet data
  isWalletConnected: boolean;
  walletAddress?: string;
  walletDisplayAddress?: string;
  
  // Farcaster data
  isFarcasterAuthenticated: boolean;
  isInFarcaster: boolean;
  farcasterUser?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    bio?: string;
    followerCount?: number;
    followingCount?: number;
    verifiedAddresses?: string[];
  } | null;
  
  // Unified interface - the best available data
  displayName: string;
  avatar?: string;
  handle?: string;
  profileUrl?: string;
  
  // For contract interactions
  canInteractWithContracts: boolean;
  primaryAddress?: string; // Best address for contract interactions
}

export function useProfile(): UnifiedProfile {
  // 🎉 SIMPLIFIED: Get wallet data from provider
  const { 
    isConnected: isWalletConnected, 
    address: walletAddress, 
    displayAddress: walletDisplayAddress,
    canInteract: canInteractWithContracts,
    isInFarcaster
  } = useWalletConnection();
  
  // Get Farcaster data
  const {
    user: farcasterUser,
    isAuthenticated: isFarcasterAuthenticated,
    getDisplayName: getFarcasterDisplayName,
    getAvatarUrl,
    getUserHandle,
    getProfileUrl,
    getVerifiedAddresses
  } = useFarcasterUser();
  
  // Determine authentication method and state
  const authMethod: UnifiedProfile['authMethod'] = (() => {
    if (isFarcasterAuthenticated && isWalletConnected) return 'both';
    if (isFarcasterAuthenticated) return 'farcaster';
    if (isWalletConnected) return 'wallet';
    return 'none';
  })();
  
  const isAuthenticated = isFarcasterAuthenticated || isWalletConnected;
  
  // FIXED: Trust that Farcaster users can interact with contracts
  // Frame SDK doesn't always expose verified addresses even though they exist
  const verifiedAddresses = getVerifiedAddresses();
  
  // FIXED: For Farcaster users without exposed verified addresses,
  // we'll handle the actual signing when needed (prompt to link wallet)
  const primaryAddress = walletAddress || 
    (verifiedAddresses && verifiedAddresses.length > 0 
      ? verifiedAddresses[0] 
      : undefined);
  
  // Determine the best display name (prioritize Farcaster in Farcaster environment)
  const displayName = (() => {
    if (isInFarcaster && isFarcasterAuthenticated && getFarcasterDisplayName()) {
      return getFarcasterDisplayName()!;
    }
    if (isFarcasterAuthenticated && getFarcasterDisplayName()) {
      return getFarcasterDisplayName()!;
    }
    if (isWalletConnected && walletDisplayAddress) {
      return walletDisplayAddress;
    }
    return 'User';
  })();
  
  // Determine the best avatar (prioritize Farcaster)
  const avatar = (() => {
    if (isFarcasterAuthenticated) {
      return getAvatarUrl() || undefined;
    }
    return undefined; // Could add wallet-based avatars here (ENS, etc.)
  })();
  
  // Determine the best handle (Farcaster only for now)
  const handle = (() => {
    if (isFarcasterAuthenticated && getUserHandle) {
      return getUserHandle() || undefined;
    }
    return undefined;
  })();
  
  return {
    // Authentication state
    isAuthenticated,
    authMethod,
    
    // Raw data
    isWalletConnected,
    walletAddress,
    walletDisplayAddress,
    isFarcasterAuthenticated,
    isInFarcaster,
    farcasterUser: farcasterUser ? {
      fid: farcasterUser.fid,
      username: farcasterUser.username,
      displayName: farcasterUser.displayName,
      pfpUrl: farcasterUser.pfpUrl,
      bio: farcasterUser.bio,
      followerCount: farcasterUser.followerCount,
      followingCount: farcasterUser.followingCount,
      verifiedAddresses: verifiedAddresses || [],
    } : null,
    
    // Unified interface
    displayName,
    avatar,
    handle,
    profileUrl: getProfileUrl() || undefined,
    
    // Contract interaction capability (🎉 SIMPLIFIED: From provider)
    canInteractWithContracts,
    primaryAddress,
  };
}

// Convenience hook for just the display info
export function useDisplayProfile() {
  const { displayName, avatar, handle, isAuthenticated, authMethod } = useProfile();
  return { displayName, avatar, handle, isAuthenticated, authMethod };
}

// Hook specifically for checking if user can interact with contracts
export function useContractAuth() {
  const { canInteractWithContracts, primaryAddress, authMethod, isInFarcaster } = useProfile();
  
  return {
    canInteract: canInteractWithContracts,
    address: primaryAddress,
    authMethod,
    needsWalletConnection: !canInteractWithContracts,
    isInFarcaster,
    // Helper message for users who need to connect
    getConnectionMessage: () => {
      if (isInFarcaster) {
        return "Link a wallet to interact with the blockchain";
      }
      return "Connect your wallet to continue";
    }
  };
}