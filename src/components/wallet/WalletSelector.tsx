// src/components/wallet/WalletSelector.tsx
import React, { useState } from 'react';
import { useWalletLinking } from '../../hooks/useWalletLinking';
import { useActiveAccount, useConnect } from "thirdweb/react";
import { 
  WalletIcon, 
  ChevronDownIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  StarIcon,
  ExternalLinkIcon,
  RefreshCwIcon
} from 'lucide-react';

interface WalletSelectorProps {
  onWalletSelected?: (address: string) => void;
  selectedWallet?: string;
  disabled?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  requireConnection?: boolean;
  className?: string;
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({
  onWalletSelected,
  selectedWallet,
  disabled = false,
  showLabel = true,
  size = 'md',
  requireConnection = true,
  className = ''
}) => {
  const account = useActiveAccount();
  const { connect } = useConnect();
  const {
    linkedWallets,
    primaryWallet,
    isLoading,
    setPrimaryWallet,
    getWalletDisplayInfo,
    refresh
  } = useWalletLinking();

  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Determine current selection
  const currentWallet = selectedWallet || primaryWallet || account?.address;
  const currentWalletInfo = currentWallet ? getWalletDisplayInfo(currentWallet) : null;

  // Filter wallets based on requirements
  const availableWallets = linkedWallets.filter(wallet => {
    if (!requireConnection) return true;
    // Only show connected wallets or wallets that can be connected
    return wallet.type === 'connected' || account?.address?.toLowerCase() === wallet.address.toLowerCase();
  });

  const handleWalletSelect = async (address: string) => {
    const walletInfo = getWalletDisplayInfo(address);
    
    // If wallet requires connection and isn't connected, try to connect
    if (requireConnection && !walletInfo.isConnected && walletInfo.type !== 'manually-added') {
      setIsConnecting(true);
      // Note: In a real implementation, you'd need to store wallet connection info
      // and use the appropriate connect method for each wallet type
      setIsConnecting(false);
    }
    
    // Set as primary wallet
    await setPrimaryWallet(address);
    
    // Notify parent component
    if (onWalletSelected) {
      onWalletSelected(address);
    }
    
    setIsOpen(false);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'px-2 py-1 text-sm',
          dropdown: 'text-sm',
          icon: 'h-3 w-3',
        };
      case 'lg':
        return {
          button: 'px-4 py-3 text-lg',
          dropdown: 'text-base',
          icon: 'h-5 w-5',
        };
      default:
        return {
          button: 'px-3 py-2 text-base',
          dropdown: 'text-sm',
          icon: 'h-4 w-4',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className={`bg-gray-200 rounded-lg ${sizeClasses.button} w-40 h-10`}></div>
      </div>
    );
  }

  if (availableWallets.length === 0) {
    return (
      <div className={`${className}`}>
        <div className={`flex items-center justify-center ${sizeClasses.button} bg-red-50 border border-red-200 rounded-lg text-red-700`}>
          <AlertCircleIcon className={`${sizeClasses.icon} mr-2`} />
          <span>No wallets available</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Transaction Wallet
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || isConnecting}
          className={`
            w-full flex items-center justify-between
            ${sizeClasses.button}
            bg-white border border-gray-300 rounded-lg
            hover:border-purple-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
        >
          <div className="flex items-center flex-1 min-w-0">
            <WalletIcon className={`${sizeClasses.icon} text-purple-600 mr-2 flex-shrink-0`} />
            
            {currentWalletInfo ? (
              <div className="flex items-center min-w-0">
                <span className="font-medium text-gray-900 truncate">
                  {currentWalletInfo.label}
                </span>
                
                <div className="flex items-center ml-2 gap-1">
                  {currentWalletInfo.isPrimary && (
                    <StarIcon className="h-3 w-3 text-yellow-500 fill-current" />
                  )}
                  {currentWalletInfo.isConnected && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                  {currentWalletInfo.type === 'manually-added' && (
                    <span className="text-orange-500 text-xs">👁️</span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-gray-500">Select wallet...</span>
            )}
          </div>
          
          {isConnecting ? (
            <RefreshCwIcon className={`${sizeClasses.icon} text-purple-600 animate-spin ml-2`} />
          ) : (
            <ChevronDownIcon className={`${sizeClasses.icon} text-gray-400 ml-2 ${isOpen ? 'rotate-180' : ''} transition-transform`} />
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown content */}
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
              <div className="p-1">
                {availableWallets.map(wallet => {
                  const displayInfo = getWalletDisplayInfo(wallet.address);
                  const isSelected = currentWallet?.toLowerCase() === wallet.address.toLowerCase();
                  
                  return (
                    <button
                      key={wallet.address}
                      onClick={() => handleWalletSelect(wallet.address)}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-md transition-colors
                        ${isSelected ? 'bg-purple-50 text-purple-700' : 'hover:bg-gray-50 text-gray-900'}
                        ${sizeClasses.dropdown}
                      `}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mr-3 flex-shrink-0">
                          <span className="text-sm">
                            {wallet.type === 'connected' ? '🔗' : 
                             wallet.type === 'farcaster-verified' ? '🟣' : '👁️'}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {displayInfo.label}
                            </span>
                            {displayInfo.isPrimary && (
                              <StarIcon className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 font-mono">
                              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                            </span>
                            
                            {displayInfo.isConnected && (
                              <div className="flex items-center">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1" />
                                <span className="text-xs text-green-600">Connected</span>
                              </div>
                            )}
                            
                            {displayInfo.type === 'manually-added' && requireConnection && (
                              <span className="text-xs text-orange-600">Watch-only</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <CheckCircleIcon className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
                
                {/* Refresh button */}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      refresh();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center p-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <RefreshCwIcon className="h-3 w-3 mr-2" />
                    Refresh Wallets
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Current wallet info */}
      {currentWalletInfo && size !== 'sm' && (
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span className="font-mono">
            {currentWallet?.slice(0, 8)}...{currentWallet?.slice(-6)}
          </span>
          
          <div className="flex items-center gap-2">
            {currentWalletInfo.type === 'manually-added' && requireConnection && (
              <span className="text-orange-600">Watch-only</span>
            )}
            {currentWalletInfo.isConnected && (
              <span className="text-green-600">Connected</span>
            )}
          </div>
        </div>
      )}
      
      {/* Warning for watch-only wallets when connection required */}
      {currentWalletInfo?.type === 'manually-added' && requireConnection && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircleIcon className="h-4 w-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-orange-800">
              This is a watch-only address. You cannot make transactions with it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};