import { useActiveAccount } from "thirdweb/react";
import { useFarcasterUser } from '../lib/farcaster';

export interface UnifiedProfile {
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
  } | null;
  
  // Unified interface - the best available data
  displayName: string;
  avatar?: string;
  handle?: string;
  isAuthenticated: boolean;
  profileUrl?: string;
}

export function useProfile(): UnifiedProfile {
  // Get wallet data using Thirdweb v5
  const account = useActiveAccount();
  const isWalletConnected = !!account;
  const walletAddress = account?.address;
  const walletDisplayAddress = account?.address ? 
    `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : 
    undefined;
  
  // Get Farcaster data
  const {
    user: farcasterUser,
    isAuthenticated: isFarcasterAuthenticated,
    isInFarcaster,
    getDisplayName: getFarcasterDisplayName,
    getAvatarUrl,
    getUserHandle,
    getProfileUrl
  } = useFarcasterUser();
  
  // Determine the best display name
  const displayName = (() => {
    if (isFarcasterAuthenticated && getFarcasterDisplayName()) {
      return getFarcasterDisplayName()!;
    }
    if (isWalletConnected && walletDisplayAddress) {
      return walletDisplayAddress;
    }
    return 'User';
  })();
  
  // Determine the best avatar
  const avatar = (() => {
    if (isFarcasterAuthenticated) {
      return getAvatarUrl() || undefined;
    }
    return undefined; // Could add wallet-based avatars here (ENS, etc.)
  })();
  
  // Determine the best handle
  const handle = (() => {
    if (isFarcasterAuthenticated && getUserHandle) {
      return getUserHandle() || undefined;
    }
    return undefined;
  })();
  
  // Determine if user is authenticated via any method
  const isAuthenticated = isWalletConnected || isFarcasterAuthenticated;
  
  return {
    // Raw data
    isWalletConnected,
    walletAddress,
    walletDisplayAddress,
    isFarcasterAuthenticated,
    isInFarcaster,
    farcasterUser,
    
    // Unified interface - prioritizes Farcaster when available
    displayName,
    avatar,
    handle,
    isAuthenticated,
    profileUrl: getProfileUrl() || undefined, // Convert null to undefined
  };
}

// Convenience hook for just the display info
export function useDisplayProfile() {
  const { displayName, avatar, handle, isAuthenticated } = useProfile();
  return { displayName, avatar, handle, isAuthenticated };
}