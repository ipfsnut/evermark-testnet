// src/hooks/useProfile.ts - UPDATED VERSION with proper wallet linking integration
import { useActiveAccount } from "thirdweb/react";
import { useFarcasterUser } from '../lib/farcaster';
import { useWalletLinking } from './useWalletLinking';

export interface UnifiedProfile {
  // Authentication state
  isAuthenticated: boolean;
  authMethod: 'farcaster' | 'wallet' | 'both' | 'none';
  
  // Wallet data
  isWalletConnected: boolean;
  walletAddress?: string;
  walletDisplayAddress?: string;
  
  // Multi-wallet support
  linkedWallets: Array<{
    address: string;
    label: string;
    type: string;
    isConnected: boolean;
    isPrimary: boolean;
  }>;
  primaryWallet?: string;
  hasMultipleWallets: boolean;
  
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
  allAddresses: string[];  // All available addresses
}

export function useProfile(): UnifiedProfile {
  // Get wallet data using Thirdweb v5
  const account = useActiveAccount();
  const isWalletConnected = !!account;
  const walletAddress = account?.address;
  const walletDisplayAddress = account?.address ? 
    `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : 
    undefined;
  
  // Get wallet linking data
  const {
    linkedWallets,
    primaryWallet,
    getWalletDisplayInfo,
    getAllAddresses
  } = useWalletLinking();
  
  // Get Farcaster data
  const {
    user: farcasterUser,
    isAuthenticated: isFarcasterAuthenticated,
    isInFarcaster,
    getDisplayName: getFarcasterDisplayName,
    getAvatarUrl,
    getUserHandle,
    getProfileUrl,
    getVerifiedAddresses
  } = useFarcasterUser();
  
  // Process linked wallets for display
  const processedLinkedWallets = linkedWallets.map(wallet => ({
    address: wallet.address,
    label: getWalletDisplayInfo(wallet.address).label,
    type: wallet.type,
    isConnected: getWalletDisplayInfo(wallet.address).isConnected,
    isPrimary: getWalletDisplayInfo(wallet.address).isPrimary,
  }));
  
  // Determine authentication method and state
  const authMethod: UnifiedProfile['authMethod'] = (() => {
    if (isFarcasterAuthenticated && isWalletConnected) return 'both';
    if (isFarcasterAuthenticated) return 'farcaster';
    if (isWalletConnected) return 'wallet';
    return 'none';
  })();
  
  const isAuthenticated = isFarcasterAuthenticated || isWalletConnected || linkedWallets.length > 0;
  
  // For contract interactions, prioritize connected wallet, then primary, then first available
  const allAddresses = getAllAddresses();
  const verifiedAddresses = getVerifiedAddresses() || [];
  
  // Determine best address for contract interactions
  const contractAddress = (() => {
    // 1. Currently connected wallet (can execute transactions immediately)
    if (walletAddress) return walletAddress;
    
    // 2. Primary wallet if it's connected or can be connected
    if (primaryWallet) {
      const primaryInfo = getWalletDisplayInfo(primaryWallet);
      if (primaryInfo.type !== 'manually-added') {
        return primaryWallet;
      }
    }
    
    // 3. First verified Farcaster address (can be connected via Farcaster)
    if (verifiedAddresses.length > 0) {
      return verifiedAddresses[0];
    }
    
    // 4. First non-watch-only wallet
    const connectableWallet = linkedWallets.find(w => w.type !== 'manually-added');
    if (connectableWallet) {
      return connectableWallet.address;
    }
    
    return undefined;
  })();
  
  const canInteractWithContracts = !!contractAddress;
  
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
    if (primaryWallet) {
      const primaryInfo = getWalletDisplayInfo(primaryWallet);
      return primaryInfo.label;
    }
    if (linkedWallets.length > 0) {
      return getWalletDisplayInfo(linkedWallets[0].address).label;
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
    
    // Single wallet data (for backward compatibility)
    isWalletConnected,
    walletAddress,
    walletDisplayAddress,
    
    // Multi-wallet data
    linkedWallets: processedLinkedWallets,
    primaryWallet,
    hasMultipleWallets: linkedWallets.length > 1,
    
    // Farcaster data
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
    
    // Contract interaction capability
    canInteractWithContracts,
    primaryAddress: contractAddress,
    allAddresses,
  };
}

// Enhanced contract auth hook
export function useContractAuth() {
  const { 
    canInteractWithContracts, 
    primaryAddress, 
    authMethod, 
    isInFarcaster,
    linkedWallets,
    isWalletConnected 
  } = useProfile();
  
  return {
    canInteract: canInteractWithContracts,
    address: primaryAddress,
    authMethod,
    needsWalletConnection: !canInteractWithContracts,
    isInFarcaster,
    hasMultipleOptions: linkedWallets.length > 1,
    
    // Helper message for users who need to connect
    getConnectionMessage: () => {
      if (linkedWallets.length > 0 && !isWalletConnected) {
        return "Connect one of your linked wallets to continue";
      }
      if (isInFarcaster) {
        return "Link a wallet to interact with the blockchain";
      }
      return "Connect your wallet to continue";
    },
    
    // Get recommended action
    getRecommendedAction: () => {
      if (!canInteractWithContracts) {
        if (linkedWallets.length === 0) {
          return { action: 'connect', message: 'Connect a wallet' };
        } else {
          return { action: 'activate', message: 'Activate a linked wallet' };
        }
      }
      return { action: 'ready', message: 'Ready for transactions' };
    }
  };
}