import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "../lib/thirdweb";
import { base } from "thirdweb/chains";
import { useFarcasterUser } from "../lib/farcaster";
import { useActiveAccount, useConnect } from "thirdweb/react";
import { useEffect } from "react";

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
  const { connect } = useConnect();

  // Auto-connect Farcaster wallet
  useEffect(() => {
    if (isInFarcaster && isFarcasterAuth && !isWalletConnected) {
      console.log('🔗 Auto-connecting Farcaster wallet...');
      
      const autoConnect = async () => {
        try {
          const wallet = inAppWallet({
            auth: {
              options: ["farcaster"],
            },
          });
          
          const connectedAccount = await wallet.connect({
            client,
            strategy: "farcaster",
          });
          
          console.log('✅ Farcaster wallet connected:', connectedAccount.address);
        } catch (error) {
          console.warn('⚠️ Auto-connect failed (this is often normal):', error);
          // Don't show error to user - auto-connect failure is expected in many Farcaster contexts
        }
      };
      
      // Small delay to ensure Frame SDK is ready
      const timer = setTimeout(autoConnect, 1000);
      return () => clearTimeout(timer);
    }
  }, [isInFarcaster, isFarcasterAuth, isWalletConnected]);

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
        
        {/* Show connect button if wallet not connected */}
        {!isWalletConnected && (
          <button
            onClick={async () => {
              console.log('🔗 Manual connect attempted...');
              try {
                const wallet = inAppWallet({ 
                  auth: { 
                    options: ["farcaster"] 
                  } 
                });
                
                const connectedAccount = await wallet.connect({ 
                  client, 
                  strategy: "farcaster" 
                });
                
                console.log('✅ Manual connect successful:', connectedAccount.address);
              } catch (error) {
                console.warn('⚠️ Manual connect failed:', error);
                // In production, you might want to show a user-friendly message
              }
            }}
            className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
          >
            Enable Wallet
          </button>
        )}
        
        {/* Connection status indicator */}
        <div 
          className={`w-2 h-2 rounded-full ${isWalletConnected ? 'bg-green-500' : 'bg-yellow-500'}`} 
          title={isWalletConnected ? "Wallet Connected" : "Farcaster Authenticated"}
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