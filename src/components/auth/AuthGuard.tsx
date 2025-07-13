// src/components/auth/AuthGuard.tsx - Dark Cyber Theme
import React from 'react';
import { useProfile, useContractAuth } from '../../hooks/useProfile';
import { WalletConnect } from '../ConnectButton';
import { UserIcon, LinkIcon } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireContract?: boolean; // Requires ability to interact with contracts
  requireWallet?: boolean;   // Specifically requires wallet connection
  fallback?: React.ReactNode; // Custom fallback UI
  showFarcasterAuth?: boolean; // Show Farcaster user info even without wallet
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireContract = false,
  requireWallet = false,
  fallback,
  showFarcasterAuth = true
}) => {
  const profile = useProfile();
  const contractAuth = useContractAuth();

  // If we specifically require wallet connection
  if (requireWallet && !profile.isWalletConnected) {
    return fallback || (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg shadow-gray-900/50 p-6 backdrop-blur-sm">
        <div className="text-center py-8">
          <UserIcon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Wallet Required</h3>
          <p className="text-gray-400 mb-6">This feature requires a connected wallet</p>
          <WalletConnect />
        </div>
      </div>
    );
  }

  // If we require contract interaction capability
  if (requireContract && !contractAuth.canInteract) {
    return fallback || (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg shadow-gray-900/50 p-6 backdrop-blur-sm">
        <div className="text-center py-8">
          <LinkIcon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {contractAuth.getConnectionMessage()}
          </h3>
          <p className="text-gray-400 mb-6">
            Blockchain interactions require a connected wallet
          </p>
          
          {/* Show current Farcaster auth if available */}
          {profile.isFarcasterAuthenticated && showFarcasterAuth && (
            <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg backdrop-blur-sm">
              <p className="text-sm text-purple-300 mb-2">
                ✅ Authenticated as @{profile.farcasterUser?.username}
              </p>
              <p className="text-xs text-purple-400">
                Link a wallet to make blockchain transactions
              </p>
            </div>
          )}
          
          <WalletConnect />
        </div>
      </div>
    );
  }

  // If no authentication at all
  if (!profile.isAuthenticated) {
    return fallback || (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg shadow-gray-900/50 p-6 backdrop-blur-sm">
        <div className="text-center py-8">
          <UserIcon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Authentication Required</h3>
          <p className="text-gray-400 mb-6">
            {profile.isInFarcaster ? 
              "Please authenticate to continue" : 
              "Connect your wallet to access this feature"
            }
          </p>
          <WalletConnect />
        </div>
      </div>
    );
  }

  // User is authenticated - show the protected content
  return <>{children}</>;
};

// Convenience components for common patterns
export const WalletRequired: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback }) => (
  <AuthGuard requireWallet={true} fallback={fallback}>
    {children}
  </AuthGuard>
);

export const ContractRequired: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback }) => (
  <AuthGuard requireContract={true} fallback={fallback}>
    {children}
  </AuthGuard>
);

export const AnyAuthRequired: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback }) => (
  <AuthGuard fallback={fallback}>
    {children}
  </AuthGuard>
);

// Component to show different auth states for debugging/info
export const AuthStatusBadge: React.FC = () => {
  const profile = useProfile();
  const contractAuth = useContractAuth();

  if (!profile.isAuthenticated) {
    return (
      <div className="flex items-center space-x-2 text-xs">
        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
        <span className="text-red-400">Not authenticated</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className={`w-2 h-2 rounded-full animate-pulse ${contractAuth.canInteract ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
      <span className={contractAuth.canInteract ? 'text-green-400' : 'text-yellow-400'}>
        {profile.authMethod === 'both' ? 'Farcaster + Wallet' :
         profile.authMethod === 'farcaster' ? 'Farcaster only' :
         profile.authMethod === 'wallet' ? 'Wallet only' : 'Unknown'}
      </span>
      {profile.isInFarcaster && (
        <span className="text-purple-400">📱</span>
      )}
    </div>
  );
};