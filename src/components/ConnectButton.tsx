// src/components/ConnectButton.tsx - UPDATED with wallet linking integration
import { useState } from "react";
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "../lib/thirdweb";
import { base } from "thirdweb/chains";
import { useProfile } from "../hooks/useProfile";
import { useWalletLinking } from "../hooks/useWalletLinking";
import { WalletSelector } from "./wallet/WalletSelector";
import { ChevronDownIcon, WalletIcon, PlusIcon, UserIcon } from "lucide-react";

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
  const profile = useProfile();
  const { linkedWallets, linkWallet } = useWalletLinking();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // If user has multiple wallets, show wallet selector
  if (profile.hasMultipleWallets) {
    return (
      <div className="flex items-center space-x-2">
        <WalletSelector
          showLabel={false}
          size="sm"
          className="min-w-[200px]"
        />
        
        <button
          onClick={() => setShowWalletOptions(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Add another wallet"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
        
        {/* Add Wallet Dropdown */}
        {showWalletOptions && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowWalletOptions(false)}
            />
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px]">
              <div className="p-2">
                <div className="text-sm font-medium text-gray-700 mb-2">Add Wallet</div>
                {[
                  { id: 'metamask', name: 'MetaMask' },
                  { id: 'coinbase', name: 'Coinbase Wallet' },
                  { id: 'rainbow', name: 'Rainbow' },
                  { id: 'inapp', name: 'Email/Phone' },
                ].map(wallet => (
                  <button
                    key={wallet.id}
                    onClick={async () => {
                      setIsLinking(true);
                      await linkWallet(wallet.id);
                      setIsLinking(false);
                      setShowWalletOptions(false);
                    }}
                    disabled={isLinking}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm transition-colors disabled:opacity-50"
                  >
                    {wallet.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // If in Farcaster with authenticated user, show minimal UI
  if (profile.isInFarcaster && profile.isFarcasterAuthenticated && profile.farcasterUser) {
    return (
      <div className="flex items-center space-x-2">
        {/* Show Farcaster user info */}
        <div className="flex items-center space-x-2">
          {profile.avatar && (
            <img 
              src={profile.avatar} 
              alt={profile.displayName} 
              className="w-8 h-8 rounded-full border-2 border-purple-200"
            />
          )}
          <div className="hidden sm:block">
            <span className="text-sm font-medium text-gray-700">
              {profile.displayName}
            </span>
            {!profile.canInteractWithContracts && (
              <div className="text-xs text-amber-600">Link wallet for transactions</div>
            )}
          </div>
        </div>
        
        {/* Add wallet button for blockchain interactions */}
        {!profile.canInteractWithContracts && (
          <button
            onClick={() => setShowWalletOptions(true)}
            className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <WalletIcon className="w-4 h-4 mr-1" />
            Link Wallet
          </button>
        )}
        
        {/* Connection status indicator */}
        {profile.canInteractWithContracts && (
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Ready for transactions" />
        )}
        
        {/* Wallet options dropdown */}
        {showWalletOptions && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowWalletOptions(false)}
            />
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[250px]">
              <div className="p-4">
                <div className="text-sm font-medium text-gray-900 mb-3">
                  Link a wallet for blockchain interactions
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'metamask', name: 'MetaMask', desc: 'Browser extension' },
                    { id: 'coinbase', name: 'Coinbase Wallet', desc: 'Mobile & browser' },
                    { id: 'rainbow', name: 'Rainbow', desc: 'Mobile wallet' },
                    { id: 'inapp', name: 'Email/Phone', desc: 'Built-in wallet' },
                  ].map(wallet => (
                    <button
                      key={wallet.id}
                      onClick={async () => {
                        setIsLinking(true);
                        await linkWallet(wallet.id);
                        setIsLinking(false);
                        setShowWalletOptions(false);
                      }}
                      disabled={isLinking}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
                    >
                      <div className="font-medium text-gray-900">{wallet.name}</div>
                      <div className="text-sm text-gray-600">{wallet.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Default wallet connection for non-Farcaster users or when no wallets linked
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
        onConnect={(wallet) => {
          // When wallet connects via the ConnectButton, it should automatically
          // be picked up by the wallet linking system via the useEffect in useWalletLinking
          console.log('Wallet connected:', wallet);
        }}
      />
      
      {profile.isWalletConnected && (
        <div className="ml-2 w-2 h-2 bg-green-500 rounded-full" title="Wallet Connected" />
      )}
    </div>
  );
}