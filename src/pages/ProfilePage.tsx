import React from 'react';
import { useProfile, useContractAuth } from '../hooks/useProfile';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { Link } from 'react-router-dom';
import { StakingWidget } from '../components/staking/StakingWidget';
import { RewardsCalculator } from '../components/rewards/RewardsCalculator';
import { DelegationHistory } from '../components/voting/DelegationHistory';
import { NFTStakingPanel } from '../components/staking/NFTStakingPanel';
import { AuthGuard, AuthStatusBadge } from '../components/auth/AuthGuard';
import { 
  UserIcon, 
  WalletIcon, 
  BookmarkIcon, 
  CoinsIcon, 
  ExternalLinkIcon,
  LinkIcon,
  CheckCircleIcon
} from 'lucide-react';

const ProfilePage: React.FC = () => {
  const profile = useProfile();
  const contractAuth = useContractAuth();
  const { evermarks, isLoading: isLoadingEvermarks } = useUserEvermarks(profile.primaryAddress);

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account and view your activity</p>
        </div>

        {/* Profile Header - Shows different info based on auth method */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt={profile.displayName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-8 w-8 text-purple-600" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{profile.displayName}</h2>
                
                {/* Show different info based on what's available */}
                <div className="space-y-1 mt-1">
                  {profile.handle && (
                    <div className="flex items-center text-sm text-purple-600">
                      <span>{profile.handle}</span>
                      {profile.profileUrl && (
                        <a 
                          href={profile.profileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 hover:text-purple-700"
                        >
                          <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                  
                  {profile.walletAddress && (
                    <div className="flex items-center text-sm text-gray-600">
                      <WalletIcon className="w-3 h-3 mr-1" />
                      <span className="font-mono">{profile.walletDisplayAddress}</span>
                    </div>
                  )}
                  
                  {profile.primaryAddress && profile.primaryAddress !== profile.walletAddress && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="text-xs">Primary: </span>
                      <span className="font-mono ml-1">
                        {profile.primaryAddress.slice(0, 6)}...{profile.primaryAddress.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Auth status and actions */}
            <div className="text-right">
              <AuthStatusBadge />
              {!contractAuth.canInteract && (
                <div className="mt-2">
                  <button className="flex items-center px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Link Wallet
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <BookmarkIcon className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="font-medium text-gray-900">Your Evermarks</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {isLoadingEvermarks ? "..." : evermarks.length}
              </p>
              <Link 
                to="/my-evermarks"
                className="text-sm text-purple-600 hover:underline mt-1 inline-block"
              >
                View collection
              </Link>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <CoinsIcon className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="font-medium text-gray-900">Authentication</h3>
              </div>
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  {profile.isFarcasterAuthenticated && (
                    <div className="flex items-center text-sm text-purple-600">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      <span>Farcaster</span>
                    </div>
                  )}
                  {profile.isWalletConnected && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      <span>Wallet</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <span className="text-lg mr-2">🏆</span>
                <h3 className="font-medium text-gray-900">Rewards</h3>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {contractAuth.canInteract ? 
                  "Eligible for all rewards" : 
                  "Limited features available"
                }
              </p>
            </div>
          </div>
          
          {/* Farcaster User Info (if available) */}
          {profile.farcasterUser && (
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="text-sm font-medium text-purple-900 mb-2">Farcaster Profile</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {profile.farcasterUser.fid && (
                  <div>
                    <span className="text-purple-600">FID:</span>
                    <span className="ml-2 font-mono">{profile.farcasterUser.fid}</span>
                  </div>
                )}
                {profile.farcasterUser.followerCount !== undefined && (
                  <div>
                    <span className="text-purple-600">Followers:</span>
                    <span className="ml-2">{profile.farcasterUser.followerCount.toLocaleString()}</span>
                  </div>
                )}
                {profile.farcasterUser.followingCount !== undefined && (
                  <div>
                    <span className="text-purple-600">Following:</span>
                    <span className="ml-2">{profile.farcasterUser.followingCount.toLocaleString()}</span>
                  </div>
                )}
                {profile.farcasterUser.verifiedAddresses && profile.farcasterUser.verifiedAddresses.length > 0 && (
                  <div>
                    <span className="text-purple-600">Verified:</span>
                    <span className="ml-2">{profile.farcasterUser.verifiedAddresses.length} address(es)</span>
                  </div>
                )}
              </div>
              {profile.farcasterUser.bio && (
                <p className="mt-3 text-sm text-purple-800">{profile.farcasterUser.bio}</p>
              )}
            </div>
          )}
        </div>
        
        {/* Contract Interaction Features - Only show if user can interact */}
        {contractAuth.canInteract && profile.primaryAddress && (
          <>
            {/* Staking & Rewards Widget */}
            <StakingWidget userAddress={profile.primaryAddress} />
            
            {/* Rewards Calculator */}
            <RewardsCalculator />
            
            {/* Delegation History */}
            <DelegationHistory />
            
            {/* NFT Staking */}
            <NFTStakingPanel />
          </>
        )}
        
        {/* Upgrade Prompt for Farcaster-only users */}
        {profile.isFarcasterAuthenticated && !profile.isWalletConnected && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <LinkIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Link a Wallet for Full Features
                </h3>
                <p className="text-gray-600 mb-4">
                  You're authenticated with Farcaster! Link a wallet to access staking, voting, and reward features.
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>• Stake tokens for rewards</li>
                  <li>• Vote on content</li>
                  <li>• Create Evermarks on-chain</li>
                  <li>• Participate in auctions</li>
                </ul>
                <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Link Wallet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default ProfilePage;