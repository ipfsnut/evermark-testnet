import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  UserIcon,
  HeartIcon,
  BookOpenIcon,
  PlusIcon,
  ExternalLinkIcon,
  ImageIcon,
  BookmarkIcon,
  TrophyIcon,
  CoinsIcon,
  ZapIcon
} from 'lucide-react';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { useBookshelf } from '../hooks/useBookshelf';
import { useWalletAuth } from '../providers/WalletProvider';
import { formatDistanceToNow } from 'date-fns';
import { cn, useIsMobile } from '../utils/responsive';

// Simple Evermark card for public profiles
const PublicEvermarkCard: React.FC<{
  evermark: any;
  showCreator?: boolean;
  category?: string;
}> = ({ evermark, showCreator = false, category }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const categoryConfig = {
    favorite: { icon: '❤️', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-400/30' },
    reading: { icon: '📖', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-400/30' },
    created: { icon: '✨', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-400/30' }
  };

  const config = category ? categoryConfig[category as keyof typeof categoryConfig] : null;

  return (
    <Link 
      to={`/evermark/${evermark.id}`} 
      className="block bg-gray-800/50 border border-gray-700 rounded-lg hover:shadow-lg hover:shadow-cyan-500/20 hover:border-cyan-400/50 transition-all duration-200 overflow-hidden group relative"
    >
      {/* Category badge */}
      {category && config && (
        <div className="absolute top-2 right-2 z-10">
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-medium border",
            config.color, config.bg, config.border
          )}>
            {config.icon} {category === 'favorite' ? 'Favorite' : 
                         category === 'reading' ? 'Reading' : 
                         'Created'}
          </span>
        </div>
      )}

      {/* Image section */}
      <div className="w-full h-32 bg-gray-700 overflow-hidden relative">
        {evermark.image && !imageError ? (
          <div className="relative w-full h-full">
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-600 animate-pulse"></div>
            )}
            <img
              src={evermark.image}
              alt={evermark.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-500" />
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-4">
        <h3 className="font-medium text-white mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
          {evermark.title}
        </h3>
        
        <div className="text-sm text-gray-400 mb-3">
          <div className="flex items-center gap-2">
            <UserIcon className="h-3 w-3" />
            <span>by {evermark.author}</span>
            <span className="text-gray-500">•</span>
            <span>{formatDistanceToNow(new Date(evermark.creationTime), { addSuffix: true })}</span>
          </div>
          {showCreator && evermark.creator && (
            <div className="flex items-center mt-1 text-xs">
              <span className="text-gray-500">
                Created by {evermark.creator.slice(0, 6)}...{evermark.creator.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {evermark.description && (
          <p className="text-sm text-gray-300 mb-3 line-clamp-2">
            {evermark.description}
          </p>
        )}

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {new Date(evermark.creationTime).toLocaleDateString()}
          </span>
          <BookmarkIcon className="h-4 w-4 text-cyan-400" />
        </div>
      </div>
    </Link>
  );
};

// Profile header component
const ProfileHeader: React.FC<{ 
  address: string; 
  isOwnProfile: boolean;
  createdCount: number;
  bookshelfStats: any;
}> = ({ address, isOwnProfile, createdCount, bookshelfStats }) => {
  const isMobile = useIsMobile();

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center text-black text-2xl font-bold shadow-lg shadow-cyan-500/50">
            {address.slice(2, 4).toUpperCase()}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              {address.slice(0, 8)}...{address.slice(-6)}
            </h1>
            <p className="text-gray-400 mb-2">Evermark Collector</p>
            <a
              href={`https://basescan.org/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLinkIcon className="h-3 w-3 mr-1" />
              View on BaseScan
            </a>
          </div>
        </div>
        
        {isOwnProfile && (
          <Link
            to="/profile"
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-cyan-600 text-black font-bold rounded-lg hover:from-cyan-300 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30"
          >
            My Profile
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-400">{createdCount}</div>
          <div className="text-sm text-gray-400">Created</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{bookshelfStats.totalFavorites}</div>
          <div className="text-sm text-gray-400">Favorites</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{bookshelfStats.totalCurrentReading}</div>
          <div className="text-sm text-gray-400">Reading</div>
        </div>
      </div>
    </div>
  );
};

const PublicProfilePage: React.FC = () => {
  const { address: profileAddress } = useParams<{ address: string }>();
  const { address: currentUserAddress } = useWalletAuth();
  const isMobile = useIsMobile();
  
  const isOwnProfile = currentUserAddress?.toLowerCase() === profileAddress?.toLowerCase();
  
  // Hooks for profile data
  const { evermarks: userCreatedEvermarks, isLoading: isLoadingCreated } = useUserEvermarks(profileAddress);
  const { bookshelfData, getStats } = useBookshelf(profileAddress || '');
  
  // Get bookshelf stats
  const bookshelfStats = getStats();
  
  // Get evermarks for bookshelf sections
  const { evermarks: allEvermarks } = useUserEvermarks();
  
  const favoriteEvermarks = useMemo(() => {
    return allEvermarks.filter(evermark => 
      bookshelfData.favorites.some(fav => fav.evermarkId === evermark.id)
    );
  }, [allEvermarks, bookshelfData.favorites]);
  
  const currentReadingEvermarks = useMemo(() => {
    return allEvermarks.filter(evermark => 
      bookshelfData.currentReading.some(reading => reading.evermarkId === evermark.id)
    );
  }, [allEvermarks, bookshelfData.currentReading]);
  
  // Recent created evermarks (limit to 6)
  const recentCreatedEvermarks = useMemo(() => {
    return userCreatedEvermarks
      .filter(evermark => evermark.creator?.toLowerCase() === profileAddress?.toLowerCase())
      .slice(0, 6);
  }, [userCreatedEvermarks, profileAddress]);

  if (!profileAddress) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center max-w-md mx-4">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Profile Not Found</h3>
          <p className="text-gray-400">The profile address is invalid.</p>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingCreated;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cyber Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-cyan-400/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <UserIcon className="h-8 w-8 text-cyan-400" />
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                PUBLIC PROFILE
              </h1>
            </div>
            <p className="text-gray-300">
              {isOwnProfile ? 'Your public Evermark collection' : 'Community member profile'}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <ProfileHeader 
            address={profileAddress}
            isOwnProfile={isOwnProfile}
            createdCount={userCreatedEvermarks.filter(e => 
              e.creator?.toLowerCase() === profileAddress.toLowerCase()
            ).length}
            bookshelfStats={bookshelfStats}
          />

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <div className="h-6 bg-gray-700 rounded animate-pulse mb-4"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="bg-gray-700 rounded-lg h-64 animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Favorites Section */}
              {favoriteEvermarks.length > 0 && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center">
                      <HeartIcon className="h-5 w-5 text-red-400 mr-2" />
                      Favorite Evermarks
                    </h2>
                    <span className="text-sm text-gray-500">
                      {favoriteEvermarks.length}/3
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteEvermarks.map(evermark => (
                      <PublicEvermarkCard
                        key={evermark.id}
                        evermark={evermark}
                        showCreator={true}
                        category="favorite"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Current Reading Section */}
              {currentReadingEvermarks.length > 0 && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center">
                      <BookOpenIcon className="h-5 w-5 text-blue-400 mr-2" />
                      Currently Reading
                    </h2>
                    <span className="text-sm text-gray-500">
                      {currentReadingEvermarks.length}/10
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentReadingEvermarks.slice(0, 6).map(evermark => (
                      <PublicEvermarkCard
                        key={evermark.id}
                        evermark={evermark}
                        showCreator={true}
                        category="reading"
                      />
                    ))}
                  </div>
                  {currentReadingEvermarks.length > 6 && (
                    <div className="text-center mt-4">
                      <span className="text-sm text-gray-500">
                        +{currentReadingEvermarks.length - 6} more in reading list
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Recently Created Section */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <ZapIcon className="h-5 w-5 text-green-400 mr-2" />
                    Recently Created
                  </h2>
                  {userCreatedEvermarks.length > 6 && (
                    <Link
                      to={`/${profileAddress}/created`}
                      className="text-cyan-400 hover:text-cyan-300 font-medium text-sm transition-colors"
                    >
                      View All ({userCreatedEvermarks.filter(e => 
                        e.creator?.toLowerCase() === profileAddress.toLowerCase()
                      ).length}) →
                    </Link>
                  )}
                </div>
                
                {recentCreatedEvermarks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-16 h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PlusIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-300 mb-2">No Evermarks Created</p>
                    <p className="text-gray-500">
                      {isOwnProfile 
                        ? "You haven't created any Evermarks yet." 
                        : "This user hasn't created any Evermarks yet."}
                    </p>
                    {isOwnProfile && (
                      <Link 
                        to="/create"
                        className="inline-flex items-center mt-4 px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-black font-bold rounded-lg hover:from-green-300 hover:to-green-500 transition-all shadow-lg shadow-green-500/30"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Create Your First Evermark
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentCreatedEvermarks.map(evermark => (
                      <PublicEvermarkCard
                        key={evermark.id}
                        evermark={evermark}
                        showCreator={false}
                        category="created"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Empty State for New Users */}
              {favoriteEvermarks.length === 0 && 
               currentReadingEvermarks.length === 0 && 
               recentCreatedEvermarks.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    {isOwnProfile ? "Welcome to Evermark!" : "New to Evermark"}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {isOwnProfile 
                      ? "Start building your collection by creating or bookmarking Evermarks." 
                      : "This user is just getting started with their Evermark journey."}
                  </p>
                  {isOwnProfile && (
                    <div className="flex gap-4 justify-center">
                      <Link
                        to="/create"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 text-black font-bold rounded-lg hover:from-cyan-300 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30"
                      >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Create Evermark
                      </Link>
                      <Link
                        to="/"
                        className="inline-flex items-center px-6 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <BookOpenIcon className="w-5 h-5 mr-2" />
                        Explore Evermarks
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;