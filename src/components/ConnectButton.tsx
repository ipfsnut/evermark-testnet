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

  // In Farcaster mini-app with authenticated user - no wallet connection needed!
  if (isInFarcaster && isFarcasterAuth && user) {
    return (
      <div className="flex items-center space-x-2">
        {/* Show Farcaster user info */}
        {user.pfpUrl && (
          <img 
            src={user.pfpUrl} 
            alt={user.displayName || user.username} 
            className="w-8 h-8 rounded-full border-2 border-purple-200"
          />
        )}
        <div className="hidden sm:block">
          <span className="text-sm font-medium text-gray-700">
            {user.displayName || `@${user.username}`}
          </span>
        </div>
        
        {/* Always show green for Farcaster authenticated users */}
        <div 
          className="w-2 h-2 rounded-full bg-green-500" 
          title="Farcaster Authenticated - Ready for Transactions"
        />
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