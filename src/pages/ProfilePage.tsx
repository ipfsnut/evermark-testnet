// src/pages/ProfilePage.tsx - Updated to include RewardsPanel
import React, { useState } from 'react';
import { useProfile, useContractAuth } from '../hooks/useProfile';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { Link } from 'react-router-dom';
import { WrappingDashboard } from '../components/wrapping/WrappingDashboard';
import { RewardsPanel } from '../components/rewards/RewardsPanel'; // ✅ ADD: Import RewardsPanel
import { AuthGuard, AuthStatusBadge } from '../components/auth/AuthGuard';
import { 
  UserIcon, 
  WalletIcon, 
  BookmarkIcon, 
  CoinsIcon, 
  ExternalLinkIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  TabletIcon,
  ChevronRightIcon,
  GiftIcon // ✅ ADD: Gift icon for rewards tab
} from 'lucide-react';

const ProfilePage: React.FC = () => {
  const profile = useProfile();
  const contractAuth = useContractAuth();
  const { evermarks, isLoading: isLoadingEvermarks } = useUserEvermarks(profile.primaryAddress);
  // ✅ UPDATED: Add rewards tab option
  const [activeTab, setActiveTab] = useState<'overview' | 'wrapping' | 'rewards'>('overview');

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account and view your activity</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 border border-gray-200">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <UserIcon className="h-4 w-4" />
                <span>Profile Overview</span>
              </div>
            </button>
            
            {contractAuth.canInteract && (
              <button
                onClick={() => setActiveTab('wrapping')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'wrapping'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <CoinsIcon className="h-4 w-4" />
                  <span>Wrapping & Staking</span>
                </div>
              </button>
            )}

            {/* ✅ ADD: Rewards Tab */}
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'rewards'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <GiftIcon className="h-4 w-4" />
                <span>Rewards</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Profile Header */}
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
                
                {/* Auth status - purely informational */}
                <div className="text-right">
                  <AuthStatusBadge />
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
                    className="text-sm text-purple-600 hover:underline mt-1 inline-flex items-center"
                  >
                    View collection
                    <ChevronRightIcon className="w-3 h-3 ml-1" />
                  </Link>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CoinsIcon className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Account Status</h3>
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
                    <TrendingUpIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Capabilities</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {contractAuth.canInteract ? (
                      <span className="text-green-600 font-medium">Full Platform Access</span>
                    ) : (
                      <span className="text-amber-600 font-medium">Limited Access</span>
                    )}
                  </p>
                  {contractAuth.canInteract && (
                    <button
                      onClick={() => setActiveTab('wrapping')}
                      className="text-sm text-blue-600 hover:underline mt-1 inline-flex items-center"
                    >
                      Manage Wrapping
                      <ChevronRightIcon className="w-3 h-3 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Farcaster User Info (if available) */}
            {profile.farcasterUser && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <div className="w-5 h-5 bg-purple-600 rounded mr-2"></div>
                  Farcaster Profile
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {profile.farcasterUser.fid && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-600 font-medium block">FID</span>
                      <span className="font-mono text-gray-900">{profile.farcasterUser.fid}</span>
                    </div>
                  )}
                  {profile.farcasterUser.followerCount !== undefined && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-600 font-medium block">Followers</span>
                      <span className="text-gray-900">{profile.farcasterUser.followerCount.toLocaleString()}</span>
                    </div>
                  )}
                  {profile.farcasterUser.followingCount !== undefined && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-600 font-medium block">Following</span>
                      <span className="text-gray-900">{profile.farcasterUser.followingCount.toLocaleString()}</span>
                    </div>
                  )}
                  {profile.farcasterUser.verifiedAddresses && profile.farcasterUser.verifiedAddresses.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-600 font-medium block">Verified</span>
                      <span className="text-gray-900">{profile.farcasterUser.verifiedAddresses.length} address(es)</span>
                    </div>
                  )}
                </div>
                {profile.farcasterUser.bio && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Bio</h4>
                    <p className="text-sm text-gray-900">{profile.farcasterUser.bio}</p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  to="/create"
                  className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3 group-hover:bg-purple-200">
                      <BookmarkIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Create Evermark</h4>
                      <p className="text-sm text-gray-600">Preserve new content</p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/my-evermarks"
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3 group-hover:bg-blue-200">
                      <TabletIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">My Collection</h4>
                      <p className="text-sm text-gray-600">View your NFTs</p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/bookshelf"
                  className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-3 group-hover:bg-green-200">
                      <BookmarkIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">My Bookshelf</h4>
                      <p className="text-sm text-gray-600">Curated content</p>
                    </div>
                  </div>
                </Link>

                {/* ✅ UPDATED: Change to rewards instead of wrapping */}
                <button
                  onClick={() => setActiveTab('rewards')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors group text-left"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-amber-100 rounded-lg mr-3 group-hover:bg-amber-200">
                      <GiftIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Rewards Hub</h4>
                      <p className="text-sm text-gray-600">Claim dual-token rewards</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wrapping Tab */}
        {activeTab === 'wrapping' && contractAuth.canInteract && profile.primaryAddress && (
          <div className="space-y-6">
            <WrappingDashboard 
              userAddress={profile.primaryAddress}
              className="w-full"
            />
          </div>
        )}

        {/* ✅ ADD: Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <RewardsPanel />
          </div>
        )}

        {/* Show message if trying to access wrapping without proper auth */}
        {activeTab === 'wrapping' && !contractAuth.canInteract && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-center py-8">
              <CoinsIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Wrapping Not Available</h3>
              <p className="text-gray-600 mb-4">
                Connect your wallet to access wrapping and rewards features
              </p>
              <AuthStatusBadge />
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default ProfilePage;