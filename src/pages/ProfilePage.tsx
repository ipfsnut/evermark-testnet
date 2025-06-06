// src/pages/ProfilePage.tsx - Enhanced with mobile-first design and better UX
import React, { useState } from 'react';
import { useProfile, useContractAuth } from '../hooks/useProfile';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { Link } from 'react-router-dom';
import { WrappingDashboard } from '../components/wrapping/WrappingDashboard';
import { RewardsPanel } from '../components/rewards/RewardsPanel';
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
  GiftIcon,
  CopyIcon,
  HeartIcon,
  BookOpenIcon,
  PlusIcon
} from 'lucide-react';
import { cn, useIsMobile, touchFriendly, spacing, textSizes } from '../utils/responsive';

const ProfilePage: React.FC = () => {
  const profile = useProfile();
  const contractAuth = useContractAuth();
  const { evermarks, isLoading: isLoadingEvermarks } = useUserEvermarks(profile.primaryAddress);
  const [activeTab, setActiveTab] = useState<'overview' | 'wrapping' | 'rewards'>('overview');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const isMobile = useIsMobile();

  // Copy address helper
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Calculate profile stats
  const profileStats = [
    {
      label: 'Total Evermarks',
      value: isLoadingEvermarks ? '...' : evermarks.length,
      icon: <BookmarkIcon className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-600',
      href: '/my-evermarks'
    },
    {
      label: 'Created by You',
      value: isLoadingEvermarks ? '...' : evermarks.filter(e => 
        e.creator?.toLowerCase() === profile.primaryAddress?.toLowerCase()
      ).length,
      icon: <PlusIcon className="h-5 w-5" />,
      color: 'bg-green-100 text-green-600',
      href: `/${profile.primaryAddress}/created`
    },
    {
      label: 'Account Status',
      value: profile.isAuthenticated ? 'Active' : 'Limited',
      icon: <TrendingUpIcon className="h-5 w-5" />,
      color: profile.isAuthenticated ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
    }
  ];

  return (
    <AuthGuard>
      <div className="max-w-none sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Enhanced Mobile-First Page Header */}
        <div className={spacing.responsive['sm-md-lg']}>
          <h1 className={cn('font-serif font-bold text-gray-900', textSizes.responsive['xl-2xl-3xl'])}>
            Profile
          </h1>
          <p className={cn('text-gray-600 mt-1', textSizes.responsive['sm-base-lg'])}>
            Manage your account and view your activity
          </p>
        </div>

        {/* Mobile-Optimized Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 border border-gray-200">
          <div className={cn(
            'flex',
            isMobile ? 'space-x-1' : 'space-x-1'
          )}>
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'flex-1 rounded-md transition-colors',
                spacing.responsive['sm-md-lg'],
                textSizes.responsive['sm-base-lg'],
                'font-medium',
                touchFriendly.button,
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center justify-center space-x-2">
                <UserIcon className="h-4 w-4" />
                <span className={isMobile ? 'hidden xs:inline' : ''}>Profile</span>
              </div>
            </button>
            
            {contractAuth.canInteract && (
              <button
                onClick={() => setActiveTab('wrapping')}
                className={cn(
                  'flex-1 rounded-md transition-colors',
                  spacing.responsive['sm-md-lg'],
                  textSizes.responsive['sm-base-lg'],
                  'font-medium',
                  touchFriendly.button,
                  activeTab === 'wrapping'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-center space-x-2">
                  <CoinsIcon className="h-4 w-4" />
                  <span className={isMobile ? 'hidden xs:inline' : ''}>wEMARK</span>
                </div>
              </button>
            )}

            <button
              onClick={() => setActiveTab('rewards')}
              className={cn(
                'flex-1 rounded-md transition-colors',
                spacing.responsive['sm-md-lg'],
                textSizes.responsive['sm-base-lg'],
                'font-medium',
                touchFriendly.button,
                activeTab === 'rewards'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center justify-center space-x-2">
                <GiftIcon className="h-4 w-4" />
                <span className={isMobile ? 'hidden xs:inline' : ''}>Rewards</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Enhanced Mobile-First Profile Header */}
            <div className={cn(
              'bg-white rounded-lg shadow-sm border border-gray-200',
              spacing.responsive['md-lg-xl']
            )}>
              <div className={cn(
                'flex items-start justify-between mb-4 sm:mb-6',
                isMobile ? 'flex-col space-y-4' : ''
              )}>
                <div className={cn(
                  'flex items-center',
                  isMobile ? 'w-full' : ''
                )}>
                  {/* Enhanced Avatar */}
                  <div className={cn(
                    'bg-purple-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0',
                    isMobile ? 'w-16 h-16 mr-4' : 'w-20 h-20 mr-6'
                  )}>
                    {profile.avatar ? (
                      <img 
                        src={profile.avatar} 
                        alt={profile.displayName} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className={cn(
                        'text-purple-600',
                        isMobile ? 'h-8 w-8' : 'h-10 w-10'
                      )} />
                    )}
                  </div>
                  
                  {/* Enhanced Profile Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className={cn(
                      'font-semibold text-gray-900 truncate',
                      textSizes.responsive['lg-xl-2xl']
                    )}>
                      {profile.displayName}
                    </h2>
                    
                    {/* Mobile-Optimized Info Display */}
                    <div className="space-y-1 mt-1">
                      {/* Farcaster Handle */}
                      {profile.handle && (
                        <div className="flex items-center text-purple-600">
                          <span className={textSizes.responsive['sm-base-lg']}>
                            {profile.handle}
                          </span>
                          {profile.profileUrl && (
                            <a 
                              href={profile.profileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 hover:text-purple-700"
                            >
                              <ExternalLinkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Enhanced Wallet Address Display */}
                      {profile.walletAddress && (
                        <button
                          onClick={() => copyAddress(profile.walletAddress!)}
                          className={cn(
                            'flex items-center text-gray-600 hover:text-purple-600 transition-colors cursor-pointer group',
                            textSizes.responsive['sm-base-lg'],
                            touchFriendly.minimal
                          )}
                          title="Click to copy wallet address"
                        >
                          <WalletIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                          <span className="font-mono truncate">{profile.walletDisplayAddress}</span>
                          <CopyIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          {copiedAddress && (
                            <span className="text-green-600 text-xs ml-1 flex-shrink-0">Copied!</span>
                          )}
                        </button>
                      )}
                      
                      {/* Primary Address (if different) */}
                      {profile.primaryAddress && profile.primaryAddress !== profile.walletAddress && (
                        <div className="flex items-center text-gray-600 text-xs sm:text-sm">
                          <span className="mr-1">Primary:</span>
                          <span className="font-mono">
                            {profile.primaryAddress.slice(0, 6)}...{profile.primaryAddress.slice(-4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Auth Status Badge - Mobile Optimized */}
                <div className={cn(
                  'text-right',
                  isMobile ? 'w-full flex justify-center' : ''
                )}>
                  <AuthStatusBadge />
                </div>
              </div>

              {/* Enhanced Mobile-First Profile Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {profileStats.map((stat, index) => {
                  const StatContent = (
                    <div className={cn(
                      'p-3 sm:p-4 rounded-lg transition-all duration-200',
                      stat.href ? 'hover:bg-gray-50 cursor-pointer' : '',
                      touchFriendly.card
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className={cn('p-2 rounded-lg', stat.color)}>
                          {stat.icon}
                        </div>
                      </div>
                      <div className={cn(
                        'font-bold text-gray-900',
                        textSizes.responsive['lg-xl-2xl']
                      )}>
                        {stat.value}
                      </div>
                      <div className={cn(
                        'text-gray-600 mt-1',
                        textSizes.responsive['sm-base-lg']
                      )}>
                        {stat.label}
                      </div>
                    </div>
                  );
                  
                  return stat.href ? (
                    <Link key={index} to={stat.href}>
                      {StatContent}
                    </Link>
                  ) : (
                    <div key={index}>{StatContent}</div>
                  );
                })}
              </div>
            </div>
            
            {/* Enhanced Farcaster User Info */}
            {profile.farcasterUser && (
              <div className={cn(
                'bg-white rounded-lg shadow-sm border border-gray-200',
                spacing.responsive['md-lg-xl']
              )}>
                <h3 className={cn(
                  'font-medium text-gray-900 mb-4 flex items-center',
                  textSizes.responsive['base-lg-xl']
                )}>
                  <div className="w-5 h-5 bg-purple-600 rounded mr-2"></div>
                  Farcaster Profile
                </h3>
                
                {/* Mobile-Optimized Farcaster Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {profile.farcasterUser.fid && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-600 font-medium block text-xs sm:text-sm">FID</span>
                      <span className="font-mono text-gray-900 text-sm sm:text-base">{profile.farcasterUser.fid}</span>
                    </div>
                  )}
                  {profile.farcasterUser.followerCount !== undefined && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-600 font-medium block text-xs sm:text-sm">Followers</span>
                      <span className="text-gray-900 text-sm sm:text-base">{profile.farcasterUser.followerCount.toLocaleString()}</span>
                    </div>
                  )}
                  {profile.farcasterUser.followingCount !== undefined && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-600 font-medium block text-xs sm:text-sm">Following</span>
                      <span className="text-gray-900 text-sm sm:text-base">{profile.farcasterUser.followingCount.toLocaleString()}</span>
                    </div>
                  )}
                  {profile.farcasterUser.verifiedAddresses && profile.farcasterUser.verifiedAddresses.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-600 font-medium block text-xs sm:text-sm">Verified</span>
                      <span className="text-gray-900 text-sm sm:text-base">{profile.farcasterUser.verifiedAddresses.length} address(es)</span>
                    </div>
                  )}
                </div>
                
                {/* Bio */}
                {profile.farcasterUser.bio && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Bio</h4>
                    <p className="text-sm text-gray-900">{profile.farcasterUser.bio}</p>
                  </div>
                )}
              </div>
            )}

            {/* Mobile-Optimized Quick Actions Grid */}
            <div className={cn(
              'bg-white rounded-lg shadow-sm border border-gray-200',
              spacing.responsive['md-lg-xl']
            )}>
              <h3 className={cn(
                'font-medium text-gray-900 mb-4',
                textSizes.responsive['base-lg-xl']
              )}>
                Quick Actions
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Link
                  to="/create"
                  className={cn(
                    'p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group',
                    touchFriendly.card
                  )}
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
                  className={cn(
                    'p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group',
                    touchFriendly.card
                  )}
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

                <button
                  onClick={() => setActiveTab('rewards')}
                  className={cn(
                    'p-4 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors group text-left w-full',
                    touchFriendly.card
                  )}
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-amber-100 rounded-lg mr-3 group-hover:bg-amber-200">
                      <GiftIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Rewards Hub</h4>
                      <p className="text-sm text-gray-600">Claim rewards</p>
                    </div>
                  </div>
                </button>

                {contractAuth.canInteract && (
                  <button
                    onClick={() => setActiveTab('wrapping')}
                    className={cn(
                      'p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group text-left w-full',
                      touchFriendly.card
                    )}
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg mr-3 group-hover:bg-green-200">
                        <CoinsIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Token Wrapping</h4>
                        <p className="text-sm text-gray-600">Manage wEMARK</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wrapping Tab */}
        {activeTab === 'wrapping' && contractAuth.canInteract && profile.primaryAddress && (
          <div className="space-y-4 sm:space-y-6">
            <WrappingDashboard 
              userAddress={profile.primaryAddress}
              className="w-full"
            />
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="space-y-4 sm:space-y-6">
            <RewardsPanel />
          </div>
        )}

        {/* Enhanced No Access Message */}
        {activeTab === 'wrapping' && !contractAuth.canInteract && (
          <div className={cn(
            'bg-white rounded-lg shadow-sm border border-gray-200',
            spacing.responsive['md-lg-xl']
          )}>
            <div className="text-center py-8 sm:py-12">
              <CoinsIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className={cn(
                'font-medium text-gray-900 mb-2',
                textSizes.responsive['base-lg-xl']
              )}>
                Wrapping Not Available
              </h3>
              <p className={cn(
                'text-gray-600 mb-4',
                textSizes.responsive['sm-base-lg']
              )}>
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