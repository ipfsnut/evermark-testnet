import React, { useState } from 'react';
import { DelegationHistory } from '../components/voting/DelegationHistory';
import { useDelegationHistory } from '../hooks/useDelegationHistory';
import { useProfile } from '../hooks/useProfile';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { useBookshelf } from '../hooks/useBookshelf';
import { toEther } from 'thirdweb/utils';
import { 
  UserIcon,
  TrophyIcon,
  HeartIcon,
  BookOpenIcon,
  ZapIcon,
  ExternalLinkIcon,
  VoteIcon,
  CoinsIcon,
  ActivityIcon,
  CopyIcon
} from 'lucide-react';
import { cn, useIsMobile } from '../utils/responsive';

type ProfileTab = 'created' | 'favorites' | 'reading' | 'delegation';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('created');
  const isMobile = useIsMobile();
  
  const { 
    displayName, 
    isAuthenticated, 
    primaryAddress, 
    avatar, 
    handle,
    authMethod 
  } = useProfile();
  
  const { evermarks: userEvermarks, isLoading: isLoadingEvermarks } = useUserEvermarks(primaryAddress);
  const { bookshelfData, isLoading: isLoadingBookshelf } = useBookshelf(primaryAddress);
  const { delegationStats } = useDelegationHistory(primaryAddress);

  const copyAddress = async () => {
    if (primaryAddress) {
      await navigator.clipboard.writeText(primaryAddress);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon className="h-8 w-8 text-black" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to view your profile and delegation history.
          </p>
          <p className="text-sm text-gray-500">
            Use the wallet connection in the app header to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cyber Profile Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-cyan-400/30">
        <div className="container mx-auto px-4 py-8">
          {/* User Info */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-black text-2xl font-bold shadow-lg shadow-cyan-500/50">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="w-24 h-24 rounded-full border-2 border-cyan-400" />
                ) : (
                  displayName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center border-2 border-black">
                <ActivityIcon className="h-4 w-4 text-black" />
              </div>
            </div>
            
            {/* Profile Info */}
            <div className={cn("text-center md:text-left", isMobile && "space-y-2")}>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-purple-500 bg-clip-text text-transparent">
                {displayName}
              </h1>
              <p className="text-gray-300 text-lg mb-2">Evermark Collector</p>
              
              {handle && (
                <p className="text-purple-400 font-medium">@{handle}</p>
              )}
              
              {/* Address with copy function */}
              <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors group"
                >
                  <span className="font-mono text-sm">
                    {primaryAddress?.slice(0, 8)}...{primaryAddress?.slice(-6)}
                  </span>
                  <CopyIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <a 
                  href={`https://basescan.org/address/${primaryAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  <span>BaseScan</span>
                </a>
              </div>
              
              {/* Auth method */}
              <div className="text-xs text-gray-500 mt-2">
                Connected via {authMethod}
              </div>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-cyan-400/50 transition-colors">
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {isLoadingEvermarks ? '...' : userEvermarks.length}
              </div>
              <div className="text-gray-400 text-sm">Created</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-red-400/50 transition-colors">
              <div className="text-2xl font-bold text-red-400 mb-1">
                {isLoadingBookshelf ? '...' : bookshelfData.favorites.length}
              </div>
              <div className="text-gray-400 text-sm">Favorites</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-blue-400/50 transition-colors">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {isLoadingBookshelf ? '...' : bookshelfData.currentReading.length}
              </div>
              <div className="text-gray-400 text-sm">Reading</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-purple-400/50 transition-colors">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {delegationStats.delegationPercentage.toFixed(1)}%
              </div>
              <div className="text-gray-400 text-sm">Delegated</div>
            </div>
          </div>

          {/* Delegation Summary Card */}
          {delegationStats.totalDelegated > BigInt(0) && (
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="font-bold text-purple-400 mb-1 flex items-center justify-center md:justify-start gap-2">
                    <ZapIcon className="h-5 w-5" />
                    Active Delegation
                  </h3>
                  <p className="text-purple-300 text-sm">
                    {parseFloat(toEther(delegationStats.totalDelegated)).toFixed(2)} wEMARK delegated
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {delegationStats.rewardMultiplier.toFixed(2)}x
                  </div>
                  <div className="text-purple-300 text-sm">Reward Multiplier</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-900/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className={cn(
            "flex overflow-x-auto scrollbar-hide",
            isMobile ? "gap-2" : "gap-8"
          )}>
            {[
              { key: 'created', label: 'CREATED', icon: <ZapIcon className="h-4 w-4" />, color: 'cyan' },
              { key: 'favorites', label: 'FAVORITES', icon: <HeartIcon className="h-4 w-4" />, color: 'red' },
              { key: 'reading', label: 'READING', icon: <BookOpenIcon className="h-4 w-4" />, color: 'blue' },
              { key: 'delegation', label: 'DELEGATION', icon: <VoteIcon className="h-4 w-4" />, color: 'purple' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ProfileTab)}
                className={cn(
                  "py-4 px-4 border-b-2 font-bold text-sm transition-all duration-200 whitespace-nowrap flex items-center gap-2",
                  activeTab === tab.key
                    ? `border-${tab.color}-400 text-${tab.color}-400 bg-${tab.color}-400/10`
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600',
                  isMobile && "text-xs px-2"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'created' && (
          <div>
            {isLoadingEvermarks ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your Evermarks...</p>
              </div>
            ) : userEvermarks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userEvermarks.map((evermark) => (
                  <div key={evermark.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:shadow-lg hover:shadow-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300">
                    <h3 className="font-semibold text-white mb-2 hover:text-cyan-400 transition-colors">
                      {evermark.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">by {evermark.author}</p>
                    {evermark.description && (
                      <p className="text-sm text-gray-300 mb-4 line-clamp-3">{evermark.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Created {new Date(evermark.creationTime).toLocaleDateString()}
                      </span>
                      <a 
                        href={`/evermark/${evermark.id}`}
                        className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ZapIcon className="h-8 w-8 text-black" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No Evermarks Created</h3>
                <p className="text-gray-400 mb-6">You haven't created any Evermarks yet.</p>
                <a 
                  href="/create"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 text-black font-bold rounded-lg hover:from-cyan-300 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30"
                >
                  Create Your First Evermark
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            {isLoadingBookshelf ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your favorites...</p>
              </div>
            ) : bookshelfData.favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookshelfData.favorites.map((item) => (
                  <div key={item.evermarkId} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:shadow-lg hover:shadow-red-500/20 hover:border-red-400/50 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-white">Evermark #{item.evermarkId}</h3>
                      <HeartIcon className="h-5 w-5 text-red-400 fill-current" />
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-300 mb-4">{item.notes}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                      <a 
                        href={`/evermark/${item.evermarkId}`}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HeartIcon className="h-8 w-8 text-black" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No Favorites Yet</h3>
                <p className="text-gray-400 mb-6">You haven't favorited any Evermarks yet.</p>
                <a 
                  href="/leaderboard"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-400 to-red-600 text-black font-bold rounded-lg hover:from-red-300 hover:to-red-500 transition-all shadow-lg shadow-red-500/30"
                >
                  Discover Evermarks
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reading' && (
          <div>
            {isLoadingBookshelf ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your reading list...</p>
              </div>
            ) : bookshelfData.currentReading.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookshelfData.currentReading.map((item) => (
                  <div key={item.evermarkId} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:shadow-lg hover:shadow-blue-500/20 hover:border-blue-400/50 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-white">Evermark #{item.evermarkId}</h3>
                      <BookOpenIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-300 mb-4">{item.notes}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                      <a 
                        href={`/evermark/${item.evermarkId}`}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        Read →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpenIcon className="h-8 w-8 text-black" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No Reading List</h3>
                <p className="text-gray-400 mb-6">You haven't added any Evermarks to your reading list yet.</p>
                <a 
                  href="/leaderboard"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-black font-bold rounded-lg hover:from-blue-300 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/30"
                >
                  Find Something to Read
                </a>
              </div>
            )}
          </div>
        )}

        {/* Delegation tab content */}
        {activeTab === 'delegation' && (
          <div>
            {/* Quick Stats */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                <VoteIcon className="h-5 w-5" />
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400">
                    {parseFloat(toEther(delegationStats.totalDelegated)).toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-sm">wEMARK Delegated</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">
                    {delegationStats.rewardMultiplier.toFixed(2)}x
                  </div>
                  <div className="text-gray-400 text-sm">Reward Multiplier</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">
                    {delegationStats.consistencyWeeks}
                  </div>
                  <div className="text-gray-400 text-sm">Consistency Weeks</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-400">
                    {delegationStats.consistencyBonus > 0 ? `+${(delegationStats.consistencyBonus * 100).toFixed(0)}%` : '0%'}
                  </div>
                  <div className="text-gray-400 text-sm">Bonus</div>
                </div>
              </div>
            </div>

            {/* Delegation History Component */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <DelegationHistory className="border-0 shadow-none bg-transparent" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}