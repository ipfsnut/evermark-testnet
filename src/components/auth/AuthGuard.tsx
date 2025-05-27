// src/components/auth/AuthGuard.tsx - Handles different authentication requirements
import React from 'react';
import { useProfile, useContractAuth } from '../../hooks/useProfile';
import { WalletConnect } from '../ConnectButton';
import { UserIcon, LinkIcon, AlertCircleIcon } from 'lucide-react';

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
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <UserIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Wallet Required</h3>
          <p className="text-gray-600 mb-6">This feature requires a connected wallet</p>
          <WalletConnect />
        </div>
      </div>
    );
  }

  // If we require contract interaction capability
  if (requireContract && !contractAuth.canInteract) {
    return fallback || (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <LinkIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {contractAuth.getConnectionMessage()}
          </h3>
          <p className="text-gray-600 mb-6">
            Blockchain interactions require a connected wallet
          </p>
          
          {/* Show current Farcaster auth if available */}
          {profile.isFarcasterAuthenticated && showFarcasterAuth && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 mb-2">
                ✅ Authenticated as @{profile.farcasterUser?.username}
              </p>
              <p className="text-xs text-purple-600">
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
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <UserIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-6">
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
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-red-600">Not authenticated</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${contractAuth.canInteract ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
      <span className={contractAuth.canInteract ? 'text-green-600' : 'text-yellow-600'}>
        {profile.authMethod === 'both' ? 'Farcaster + Wallet' :
         profile.authMethod === 'farcaster' ? 'Farcaster only' :
         profile.authMethod === 'wallet' ? 'Wallet only' : 'Unknown'}
      </span>
      {profile.isInFarcaster && (
        <span className="text-purple-600">📱</span>
      )}
    </div>
  );
};