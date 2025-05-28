// src/hooks/useWalletLinking.ts - FIXED VERSION
import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount, useConnect, useDisconnect } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { useFarcasterUser } from '../lib/farcaster';

export interface LinkedWallet {
  address: string;
  type: 'connected' | 'farcaster-verified' | 'manually-added';
  label?: string;
  connectorId?: string;
  chainId?: number;
  lastUsed?: number;
}

export interface WalletLinkingState {
  linkedWallets: LinkedWallet[];
  primaryWallet: string | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'evermark_linked_wallets';

// Available wallet options for linking
const WALLET_OPTIONS = [
  { id: 'metamask', name: 'MetaMask', wallet: () => createWallet("io.metamask") },
  { id: 'coinbase', name: 'Coinbase Wallet', wallet: () => createWallet("com.coinbase.wallet") },
  { id: 'rainbow', name: 'Rainbow', wallet: () => createWallet("me.rainbow") },
  { 
    id: 'inapp', 
    name: 'Email/Phone', 
    wallet: () => inAppWallet({
      auth: { options: ["email", "phone"] }
    })
  },
];

export function useWalletLinking() {
  const account = useActiveAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { getVerifiedAddresses, isAuthenticated: isFarcasterAuth } = useFarcasterUser();
  
  const [state, setState] = useState<WalletLinkingState>({
    linkedWallets: [],
    primaryWallet: null,
    isLoading: true,
    error: null,
  });

  // Load linked wallets from storage and sync with current state
  const loadLinkedWallets = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedWallets: LinkedWallet[] = stored ? JSON.parse(stored) : [];
      let linkedWallets = [...storedWallets];
      
      // FIXED: Add currently connected wallet if it exists and isn't already linked
      if (account?.address) {
        const existingIndex = linkedWallets.findIndex(
          w => w.address.toLowerCase() === account.address.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          // Update existing wallet to mark as connected
          linkedWallets[existingIndex] = {
            ...linkedWallets[existingIndex],
            type: 'connected',
            lastUsed: Date.now(),
          };
        } else {
          // Add new connected wallet
          linkedWallets.unshift({
            address: account.address,
            type: 'connected',
            label: 'Connected Wallet',
            lastUsed: Date.now(),
          });
        }
      }
      
      // Add Farcaster verified addresses
      if (isFarcasterAuth) {
        const verifiedAddresses = getVerifiedAddresses() || [];
        verifiedAddresses.forEach(address => {
          const existingIndex = linkedWallets.findIndex(
            w => w.address.toLowerCase() === address.toLowerCase()
          );
          
          if (existingIndex >= 0) {
            // Update existing wallet to include Farcaster verification
            if (linkedWallets[existingIndex].type !== 'connected') {
              linkedWallets[existingIndex].type = 'farcaster-verified';
            }
          } else {
            linkedWallets.push({
              address,
              type: 'farcaster-verified',
              label: 'Farcaster Verified',
              lastUsed: 0,
            });
          }
        });
      }
      
      // Clean up disconnected wallets
      linkedWallets = linkedWallets.map(wallet => {
        if (wallet.type === 'connected' && wallet.address.toLowerCase() !== account?.address?.toLowerCase()) {
          // Wallet was connected but is no longer the active wallet
          return {
            ...wallet,
            type: wallet.address.toLowerCase() === (getVerifiedAddresses()?.[0]?.toLowerCase()) 
              ? 'farcaster-verified' 
              : 'manually-added'
          };
        }
        return wallet;
      });
      
      // Determine primary wallet - prefer connected, then first available
      const primaryWallet = account?.address || linkedWallets[0]?.address || null;
      
      setState({
        linkedWallets,
        primaryWallet,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error loading linked wallets:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load linked wallets',
      }));
    }
  }, [account?.address, isFarcasterAuth, getVerifiedAddresses]);

  // Save only persistent wallets to storage (not temporary connected state)
  const saveLinkedWallets = useCallback((wallets: LinkedWallet[]) => {
    try {
      // Only save manually-added and labeled wallets to localStorage
      // Connected and Farcaster wallets are reconstructed dynamically
      const walletsToSave = wallets.filter(w => 
        w.type === 'manually-added' || 
        (w.label && w.label !== 'Connected Wallet' && w.label !== 'Farcaster Verified')
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(walletsToSave));
    } catch (error) {
      console.error('Error saving linked wallets:', error);
    }
  }, []);

  // FIXED: Link a new wallet by connecting it
  const linkWallet = useCallback(async (walletId: string, label?: string) => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const walletOption = WALLET_OPTIONS.find(w => w.id === walletId);
      if (!walletOption) {
        throw new Error('Wallet type not supported');
      }

      const wallet = walletOption.wallet();
      
      // FIXED: Thirdweb v5 connect returns void, account is available via useActiveAccount
      await connect(wallet);
      
      // Wait a bit for the account to be available
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // The account should now be available via useActiveAccount hook
      // loadLinkedWallets will be called via useEffect and will handle the new wallet
      
      return { success: true, message: 'Wallet connected successfully' };
      
    } catch (error: any) {
      console.error('Error linking wallet:', error);
      const errorMessage = error.message || 'Failed to link wallet';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [connect]);

  // Manually add a wallet address (for watch-only)
  const addWalletAddress = useCallback((address: string, label: string) => {
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setState(prev => ({ ...prev, error: 'Invalid wallet address' }));
      return { success: false, error: 'Invalid wallet address' };
    }

    const normalizedAddress = address.toLowerCase();
    const existingWallet = state.linkedWallets.find(
      w => w.address.toLowerCase() === normalizedAddress
    );

    if (existingWallet) {
      setState(prev => ({ ...prev, error: 'Wallet already linked' }));
      return { success: false, error: 'Wallet already linked' };
    }

    const newWallet: LinkedWallet = {
      address,
      type: 'manually-added',
      label,
      lastUsed: Date.now(),
    };

    const updatedWallets = [...state.linkedWallets, newWallet];
    setState(prev => ({
      ...prev,
      linkedWallets: updatedWallets,
      error: null,
    }));

    saveLinkedWallets(updatedWallets);
    return { success: true, address };
  }, [state.linkedWallets, saveLinkedWallets]);

  // Remove a linked wallet
  const unlinkWallet = useCallback(async (address: string) => {
    const isCurrentlyConnected = account?.address?.toLowerCase() === address.toLowerCase();
    
    // If removing the currently connected wallet, disconnect it first
    if (isCurrentlyConnected) {
      try {
        await disconnect();
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }

    const updatedWallets = state.linkedWallets.filter(
      w => w.address.toLowerCase() !== address.toLowerCase()
    );

    // If removing the primary wallet, select a new one
    let newPrimaryWallet = state.primaryWallet;
    if (state.primaryWallet?.toLowerCase() === address.toLowerCase()) {
      newPrimaryWallet = updatedWallets.length > 0 ? updatedWallets[0].address : null;
    }

    setState(prev => ({
      ...prev,
      linkedWallets: updatedWallets,
      primaryWallet: newPrimaryWallet,
    }));

    saveLinkedWallets(updatedWallets);
    return { success: true };
  }, [state.linkedWallets, state.primaryWallet, saveLinkedWallets, account?.address, disconnect]);

  // Set primary wallet for transactions
  const setPrimaryWallet = useCallback((address: string) => {
    const wallet = state.linkedWallets.find(
      w => w.address.toLowerCase() === address.toLowerCase()
    );
    
    if (!wallet) {
      setState(prev => ({ ...prev, error: 'Wallet not found in linked wallets' }));
      return { success: false, error: 'Wallet not found' };
    }

    // Update last used timestamp
    const updatedWallets = state.linkedWallets.map(w =>
      w.address.toLowerCase() === address.toLowerCase()
        ? { ...w, lastUsed: Date.now() }
        : w
    );

    setState(prev => ({
      ...prev,
      linkedWallets: updatedWallets,
      primaryWallet: address,
      error: null,
    }));

    saveLinkedWallets(updatedWallets);
    return { success: true };
  }, [state.linkedWallets, saveLinkedWallets]);

  // Update wallet label
  const updateWalletLabel = useCallback((address: string, label: string) => {
    const updatedWallets = state.linkedWallets.map(w =>
      w.address.toLowerCase() === address.toLowerCase()
        ? { ...w, label }
        : w
    );

    setState(prev => ({
      ...prev,
      linkedWallets: updatedWallets,
    }));

    saveLinkedWallets(updatedWallets);
    return { success: true };
  }, [state.linkedWallets, saveLinkedWallets]);

  // Get wallet display info
  const getWalletDisplayInfo = useCallback((address: string) => {
    const wallet = state.linkedWallets.find(
      w => w.address.toLowerCase() === address.toLowerCase()
    );
    
    const isConnected = account?.address?.toLowerCase() === address.toLowerCase();
    const isPrimary = state.primaryWallet?.toLowerCase() === address.toLowerCase();
    
    return {
      address,
      label: wallet?.label || `${address.slice(0, 6)}...${address.slice(-4)}`,
      type: wallet?.type || 'unknown',
      isConnected,
      isPrimary,
      canRemove: wallet?.type !== 'farcaster-verified' || !isConnected,
    };
  }, [state.linkedWallets, state.primaryWallet, account?.address]);

  // FIXED: Reload wallets when account or Farcaster state changes
  useEffect(() => {
    loadLinkedWallets();
  }, [account?.address, isFarcasterAuth]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  return {
    // State
    linkedWallets: state.linkedWallets,
    primaryWallet: state.primaryWallet,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    linkWallet,
    addWalletAddress,
    unlinkWallet,
    setPrimaryWallet,
    updateWalletLabel,
    
    // Utilities
    getWalletDisplayInfo,
    getAvailableWalletTypes: () => WALLET_OPTIONS,
    getAllAddresses: () => state.linkedWallets.map(w => w.address),
    refresh: loadLinkedWallets,
    
    // Clear error
    clearError: () => setState(prev => ({ ...prev, error: null })),
  };
}