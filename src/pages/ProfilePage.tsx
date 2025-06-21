// src/pages/ProfilePage.tsx - Complete updated file with delegation integration
import React, { useState } from 'react';
import { DelegationHistory } from '../components/voting/DelegationHistory';
import { useDelegationHistory } from '../hooks/useDelegationHistory';
import { useProfile } from '../hooks/useProfile';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { useBookshelf } from '../hooks/useBookshelf';
import { toEther } from 'thirdweb/utils';

type ProfileTab = 'created' | 'favorites' | 'reading' | 'delegation';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('created');
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border p-8 text-center max-w-md">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
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
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          {/* User Info */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {avatar ? (
                <img src={avatar} alt={displayName} className="w-20 h-20 rounded-full" />
              ) : (
                displayName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <p className="text-gray-600">Evermark Collector</p>
              {handle && (
                <p className="text-purple-600 text-sm">{handle}</p>
              )}
              <a 
                href={`https://basescan.org/address/${primaryAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline"
              >
                🔗 View on BaseScan
              </a>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {isLoadingEvermarks ? '...' : userEvermarks.length}
              </div>
              <div className="text-sm text-gray-600">Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {isLoadingBookshelf ? '...' : bookshelfData.favorites.length}
              </div>
              <div className="text-sm text-gray-600">Favorites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {isLoadingBookshelf ? '...' : bookshelfData.currentReading.length}
              </div>
              <div className="text-sm text-gray-600">Reading</div>
            </div>
            {/* NEW: Delegation stats */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {delegationStats.delegationPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Delegated</div>
            </div>
          </div>

          {/* Delegation Summary Card */}
          {delegationStats.totalDelegated > BigInt(0) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-purple-900">Active Delegation</h3>
                  <p className="text-sm text-purple-700">
                    {parseFloat(toEther(delegationStats.totalDelegated)).toFixed(2)} wEMARK delegated
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">
                    {delegationStats.rewardMultiplier.toFixed(2)}x
                  </div>
                  <div className="text-sm text-purple-600">Reward Multiplier</div>
                </div>
              </div>
            </div>
          )}

          {/* Authentication Info */}
          <div className="text-xs text-gray-500">
            Connected via {authMethod} • {primaryAddress?.slice(0, 6)}...{primaryAddress?.slice(-4)}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('created')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'created'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              + Recently Created
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'favorites'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ❤️ Favorites
            </button>
            <button
              onClick={() => setActiveTab('reading')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'reading'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📚 Reading
            </button>
            {/* NEW: Delegation tab */}
            <button
              onClick={() => setActiveTab('delegation')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'delegation'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🗳️ Delegation
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'created' && (
          <div>
            {isLoadingEvermarks ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your Evermarks...</p>
              </div>
            ) : userEvermarks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userEvermarks.map((evermark) => (
                  <div key={evermark.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-gray-900 mb-2">{evermark.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{evermark.author}</p>
                    {evermark.description && (
                      <p className="text-sm text-gray-700 mb-4 line-clamp-3">{evermark.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Created {new Date(evermark.creationTime).toLocaleDateString()}
                      </span>
                      <a 
                        href={`/evermark/${evermark.id}`}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">+</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Evermarks Created</h3>
                <p className="text-gray-600 mb-6">You haven't created any Evermarks yet.</p>
                <a 
                  href="/create"
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your favorites...</p>
              </div>
            ) : bookshelfData.favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookshelfData.favorites.map((item) => (
                  <div key={item.evermarkId} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Evermark #{item.evermarkId}</h3>
                      <span className="text-red-500">❤️</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-700 mb-4">{item.notes}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                      <a 
                        href={`/evermark/${item.evermarkId}`}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">❤️</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Favorites Yet</h3>
                <p className="text-gray-600 mb-6">You haven't favorited any Evermarks yet.</p>
                <a 
                  href="/leaderboard"
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your reading list...</p>
              </div>
            ) : bookshelfData.currentReading.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookshelfData.currentReading.map((item) => (
                  <div key={item.evermarkId} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Evermark #{item.evermarkId}</h3>
                      <span className="text-blue-500">📚</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-700 mb-4">{item.notes}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                      <a 
                        href={`/evermark/${item.evermarkId}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Read →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📚</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Reading List</h3>
                <p className="text-gray-600 mb-6">You haven't added any Evermarks to your reading list yet.</p>
                <a 
                  href="/leaderboard"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Find Something to Read
                </a>
              </div>
            )}
          </div>
        )}

        {/* NEW: Delegation tab content */}
        {activeTab === 'delegation' && (
          <div>
            {/* Quick Stats */}
            <div className="bg-white rounded-lg border p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {parseFloat(toEther(delegationStats.totalDelegated)).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">wEMARK Delegated</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {delegationStats.rewardMultiplier.toFixed(2)}x
                  </div>
                  <div className="text-sm text-gray-600">Reward Multiplier</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {delegationStats.consistencyWeeks}
                  </div>
                  <div className="text-sm text-gray-600">Consistency Weeks</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">
                    {delegationStats.consistencyBonus > 0 ? `+${(delegationStats.consistencyBonus * 100).toFixed(0)}%` : '0%'}
                  </div>
                  <div className="text-sm text-gray-600">Bonus</div>
                </div>
              </div>
            </div>

            {/* Delegation History Component */}
            <DelegationHistory className="border-0 shadow-none bg-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}