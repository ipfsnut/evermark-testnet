// src/components/ConnectButton.tsx - Fixed for Farcaster mini-app environment
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "../lib/thirdweb";
import { base } from "thirdweb/chains";
import { useFarcasterUser } from "../lib/farcaster";
import { useActiveAccount } from "thirdweb/react";

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
  const { isInFarcaster, isAuthenticated: isFarcasterAuth, user } = useFarcasterUser();
  const account = useActiveAccount();
  const isWalletConnected = !!account;

  // In Farcaster environment with authenticated user, show different UI
  if (isInFarcaster && isFarcasterAuth && user) {
    return (
      <div className="flex items-center space-x-3">
        {/* Show Farcaster user info */}
        <div className="flex items-center space-x-2 bg-purple-50 px-3 py-2 rounded-lg">
          {user.pfpUrl && (
            <img 
              src={user.pfpUrl} 
              alt={user.displayName || user.username} 
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-sm font-medium text-purple-700">
            @{user.username}
          </span>
        </div>
        
        {/* Optional: Still allow wallet connection for on-chain actions */}
        {!isWalletConnected && (
          <ConnectButton
            client={client}
            wallets={[inAppWallet({ auth: { options: ["farcaster"] } })]}
            chains={[base]}
            theme="light"
            connectButton={{
              label: "Link Wallet",
              style: {
                backgroundColor: '#6b7280',
                color: 'white',
                borderRadius: '0.5rem',
                padding: '0.25rem 0.75rem',
                fontSize: '0.875rem',
                fontFamily: 'serif',
              }
            }}
            detailsButton={{
              style: {
                backgroundColor: '#f3f4f6',
                color: '#374151',
                borderRadius: '0.5rem',
                padding: '0.25rem 0.75rem',
                fontSize: '0.875rem',
                fontFamily: 'serif',
              }
            }}
          />
        )}
        
        {isWalletConnected && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Wallet Connected" />
            <span className="text-xs text-gray-600">
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default wallet connection for non-Farcaster or unauthenticated users
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
          }
        }}
        detailsButton={{
          style: {
            backgroundColor: '#f3f4f6',
            color: '#374151',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontFamily: 'serif',
          }
        }}
      />
      {account && (
        <div className="ml-2 w-2 h-2 bg-green-500 rounded-full" title="Wallet Connected" />
      )}
    </div>
  );
}