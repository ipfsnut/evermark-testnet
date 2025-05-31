import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
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
  
  // Thirdweb hooks (for regular web app)
  const thirdwebAccount = useActiveAccount();
  
  // Wagmi hooks (for Farcaster Frame)
  const { 
    isConnected: isWagmiConnected, 
    address: wagmiAddress,
    connector: wagmiConnector 
  } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // In Farcaster mini-app with authenticated user
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
        
        {/* Wallet connection status for Farcaster */}
        {isWagmiConnected ? (
          <div className="flex items-center space-x-2">
            <div 
              className="w-2 h-2 rounded-full bg-green-500" 
              title={`Wallet Connected: ${wagmiAddress?.slice(0, 6)}...${wagmiAddress?.slice(-4)}`}
            />
            <button
              onClick={() => disconnect()}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div 
              className="w-2 h-2 rounded-full bg-yellow-500" 
              title="Wallet not connected"
            />
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
              >
                Connect Wallet
              </button>
            ))}
          </div>
        )}
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
      {thirdwebAccount && (
        <div className="ml-2 w-2 h-2 bg-green-500 rounded-full" title="Wallet Connected" />
      )}
    </div>
  );
}