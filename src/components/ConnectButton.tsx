// src/components/ConnectButton.tsx - Dark Cyber Theme
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { client } from "../lib/thirdweb";
import { base } from "thirdweb/chains";
import { useFarcasterUser } from "../lib/farcaster";
import { useActiveAccount } from "thirdweb/react";
import { cn } from "../utils/responsive";

// Try to import your WalletProvider hooks (with fallback if they don't exist yet)
let useWalletConnection: any = null;
try {
  const walletProvider = require('../providers/WalletProvider');
  useWalletConnection = walletProvider.useWalletConnection;
} catch (e) {
  console.log('WalletProvider not available yet, using direct hooks');
}

const wallets = [
  inAppWallet({
    auth: {
      options: ["farcaster", "email", "phone"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
];

export function WalletConnect() {
  const { isInFarcaster, isAuthenticated: isFarcasterAuth } = useFarcasterUser();
  
  // Try to use WalletProvider if available
  const walletProviderState = useWalletConnection ? useWalletConnection() : null;
  
  // Fallback to direct hooks if WalletProvider not available
  const thirdwebAccount = useActiveAccount();
  const { 
    isConnected: isWagmiConnected, 
    address: wagmiAddress,
  } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Use WalletProvider state if available, otherwise use direct hooks
  const isConnected = walletProviderState?.isConnected ?? (thirdwebAccount ? true : isWagmiConnected);
  const address = walletProviderState?.address ?? (thirdwebAccount?.address || wagmiAddress);
  const displayAddress = walletProviderState?.displayAddress ?? 
    (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '');

  // 🎯 SIMPLIFIED: In Farcaster, show minimal wallet connection status only with cyber styling
  if (isInFarcaster && isFarcasterAuth) {
    return (
      <div className="flex items-center space-x-2">
        {/* Simple connection indicator with cyber styling */}
        <div className="flex items-center space-x-2">
          <div 
            className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isConnected ? 'bg-green-400 shadow-sm shadow-green-400' : 'bg-amber-400 shadow-sm shadow-amber-400'
            )} 
            title={isConnected ? `Wallet Connected: ${displayAddress}` : 'Wallet not connected'}
          />
          
          {/* Desktop: Show connection status */}
          <span className="hidden sm:block text-xs text-gray-300">
            {isConnected ? 'Connected' : 'No Wallet'}
          </span>
          
          {/* Action button based on connection state */}
          {!isConnected && connectors.length > 0 && (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className={cn(
                "text-xs bg-purple-600/20 border border-purple-500/30 text-purple-300 px-2 py-1 rounded",
                "hover:bg-purple-600/30 hover:border-purple-400/50 hover:text-purple-200 transition-colors backdrop-blur-sm"
              )}
            >
              Link Wallet
            </button>
          )}
          
          {isConnected && (
            <button
              onClick={() => disconnect()}
              className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default wallet connection for non-Farcaster users (webapp) with cyber styling
  return (
    <div className="flex items-center">
      <ConnectButton
        client={client}
        wallets={wallets}
        chains={[base]}
        theme="dark"
        connectButton={{
          label: "Connect Wallet",
          style: {
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
            color: '#00ffff',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            fontWeight: '500',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)',
          }
        }}
        detailsButton={{
          style: {
            background: 'rgba(31, 41, 55, 0.5)',
            color: '#00ffff',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 5px rgba(6, 182, 212, 0.1)',
          }
        }}
      />
      {isConnected && (
        <div className="ml-2 flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400" title="Wallet Connected" />
          {displayAddress && (
            <span className="hidden sm:inline text-xs text-cyan-300 font-mono">{displayAddress}</span>
          )}
        </div>
      )}
    </div>
  );
}