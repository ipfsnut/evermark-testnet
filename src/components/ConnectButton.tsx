import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { client } from "../lib/thirdweb";
import { base } from "thirdweb/chains";
import { useFarcasterUser } from "../lib/farcaster";
import { useActiveAccount } from "thirdweb/react";

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

  // 🎯 SIMPLIFIED: In Farcaster, show minimal wallet connection status only
  if (isInFarcaster && isFarcasterAuth) {
    return (
      <div className="flex items-center space-x-2">
        {/* Simple connection indicator */}
        <div className="flex items-center space-x-2">
          <div 
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500'}`} 
            title={isConnected ? `Wallet Connected: ${displayAddress}` : 'Wallet not connected'}
          />
          
          {/* Desktop: Show connection status */}
          <span className="hidden sm:block text-xs text-gray-600">
            {isConnected ? 'Connected' : 'No Wallet'}
          </span>
          
          {/* Action button based on connection state */}
          {!isConnected && connectors.length > 0 && (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors"
            >
              Link Wallet
            </button>
          )}
          
          {isConnected && (
            <button
              onClick={() => disconnect()}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default wallet connection for non-Farcaster users (webapp)
  return (
    <div className="flex items-center">
      <ConnectButton
        client={client}
        wallets={wallets}
        chains={[base]}
        theme="light"
        connectButton={{
          label: "Connect Wallet",
          style: {
            backgroundColor: '#7c3aed',
            color: 'white',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontFamily: 'serif',
            fontSize: '0.875rem', // Slightly smaller for mobile
          }
        }}
        detailsButton={{
          style: {
            backgroundColor: '#f3f4f6',
            color: '#374151',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontFamily: 'serif',
            fontSize: '0.875rem',
          }
        }}
      />
      {isConnected && (
        <div className="ml-2 flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Wallet Connected" />
          {displayAddress && (
            <span className="hidden sm:inline text-xs text-gray-600 font-mono">{displayAddress}</span>
          )}
        </div>
      )}
    </div>
  );
}