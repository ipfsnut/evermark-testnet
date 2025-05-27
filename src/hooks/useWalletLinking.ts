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

  // Load linked wallets from storage
  const loadLinkedWallets = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const linkedWallets: LinkedWallet[] = stored ? JSON.parse(stored) : [];
      
      // Add currently connected wallet if it exists and isn't already linked
      if (account?.address && !linkedWallets.find(w => w.address.toLowerCase() === account.address.toLowerCase())) {
        linkedWallets.unshift({
          address: account.address,
          type: 'connected',
          label: 'Connected Wallet',
          lastUsed: Date.now(),
        });
      }
      
      // Add Farcaster verified addresses
      if (isFarcasterAuth) {
        const verifiedAddresses = getVerifiedAddresses() || [];
        verifiedAddresses.forEach(address => {
          if (!linkedWallets.find(w => w.address.toLowerCase() === address.toLowerCase())) {
            linkedWallets.push({
              address,
              type: 'farcaster-verified',
              label: 'Farcaster Verified',
              lastUsed: 0,
            });
          }
        });
      }
      
      // Determine primary wallet
      const primaryWallet = linkedWallets.length > 0 
        ? (account?.address || linkedWallets[0].address)
        : null;
      
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

  // Save linked wallets to storage
  const saveLinkedWallets = useCallback((wallets: LinkedWallet[]) => {
    try {
      // Only save manually-added and labeled wallets to localStorage
      // Connected and Farcaster wallets are dynamic
      const walletsToSave = wallets.filter(w => 
        w.type === 'manually-added' || 
        (w.label && w.label !== 'Connected Wallet')
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(walletsToSave));
    } catch (error) {
      console.error('Error saving linked wallets:', error);
    }
  }, []);

  // Link a new wallet by connecting it
  const linkWallet = useCallback(async (walletId: string, label?: string) => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const walletOption = WALLET_OPTIONS.find(w => w.id === walletId);
      if (!walletOption) {
        throw new Error('Wallet type not supported');
      }

      const wallet = walletOption.wallet();
      const result = await connect(wallet);
      
      if (result) {
  // Get the account from the connected wallet
  const account = result.getAccount();
  if (account) {
    const newWallet: LinkedWallet = {
      address: account.address,
          type: 'connected',
          label: label || walletOption.name,
          connectorId: walletId,
          lastUsed: Date.now(),
        };

        const updatedWallets = [...state.linkedWallets];
        const existingIndex = updatedWallets.findIndex(
          w => w.address.toLowerCase() === newWallet.address.toLowerCase()
        );

        if (existingIndex >= 0) {
          updatedWallets[existingIndex] = { ...updatedWallets[existingIndex], ...newWallet };
        } else {
          updatedWallets.unshift(newWallet);
        }

        setState(prev => ({
          ...prev,
          linkedWallets: updatedWallets,
          primaryWallet: newWallet.address,
        }));

        saveLinkedWallets(updatedWallets);
        return { success: true, address: newWallet.address };
      }
    } catch (error: any) {
      console.error('Error linking wallet:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to link wallet',
      }));
      return { success: false, error: error.message || 'Failed to link wallet' };
    }
  }, [connect, state.linkedWallets, saveLinkedWallets]);

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
  const unlinkWallet = useCallback((address: string) => {
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
  }, [state.linkedWallets, state.primaryWallet, saveLinkedWallets]);

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
    
    return {
      address,
      label: wallet?.label || `${address.slice(0, 6)}...${address.slice(-4)}`,
      type: wallet?.type || 'unknown',
      isConnected: account?.address?.toLowerCase() === address.toLowerCase(),
      isPrimary: state.primaryWallet?.toLowerCase() === address.toLowerCase(),
      canRemove: wallet?.type !== 'farcaster-verified',
    };
  }, [state.linkedWallets, state.primaryWallet, account?.address]);

  // Load wallets on mount and when dependencies change
  useEffect(() => {
    loadLinkedWallets();
  }, [loadLinkedWallets]);

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