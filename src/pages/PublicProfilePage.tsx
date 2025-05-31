import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  UserIcon,
  HeartIcon,
  BookOpenIcon,
  PlusIcon,
  ExternalLinkIcon,
  ImageIcon,
  BookmarkIcon
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { useBookshelf } from '../hooks/useBookshelf';
import { useWalletAuth } from '../providers/WalletProvider'; // 🎉 SIMPLIFIED IMPORT
import { formatDistanceToNow } from 'date-fns';

// Simple Evermark card for public profiles
const PublicEvermarkCard: React.FC<{
  evermark: any;
  showCreator?: boolean;
  category?: string;
}> = ({ evermark, showCreator = false, category }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <Link 
      to={`/evermark/${evermark.id}`} 
      className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
    >
      {/* Category badge */}
      {category && (
        <div className="absolute top-2 right-2 z-10">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            category === 'favorite' 
              ? 'bg-red-100 text-red-600' 
              : category === 'reading'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {category === 'favorite' ? '❤️ Favorite' : 
             category === 'reading' ? '📖 Reading' : 
             '✨ Created'}
          </span>
        </div>
      )}

      {/* Image section */}
      <div className="w-full h-32 bg-gray-100 overflow-hidden relative">
        {evermark.image && !imageError ? (
          <div className="relative w-full h-full">
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
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
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
          {evermark.title}
        </h3>
        
        <div className="text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-2">
            <UserIcon className="h-3 w-3" />
            <span>by {evermark.author}</span>
            <span className="text-gray-400">•</span>
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
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {evermark.description}
          </p>
        )}

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {new Date(evermark.creationTime).toLocaleDateString()}
          </span>
          <BookmarkIcon className="h-4 w-4 text-purple-600" />
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
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mr-4">
            {address.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {address.slice(0, 6)}...{address.slice(-4)}
            </h1>
            <p className="text-gray-600">Evermark Collector</p>
            <a
              href={`https://basescan.org/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800 mt-1"
            >
              <ExternalLinkIcon className="h-3 w-3 mr-1" />
              View on BaseScan
            </a>
          </div>
        </div>
        
        {isOwnProfile && (
          <Link
            to="/profile"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            My Evermark
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{createdCount}</div>
          <div className="text-sm text-gray-600">Created</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{bookshelfStats.totalFavorites}</div>
          <div className="text-sm text-gray-600">Favorites</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{bookshelfStats.totalCurrentReading}</div>
          <div className="text-sm text-gray-600">Reading</div>
        </div>
      </div>
    </div>
  );
};

const PublicProfilePage: React.FC = () => {
  const { address: profileAddress } = useParams<{ address: string }>();
  
  // 🎉 SIMPLIFIED: Single line replaces 6 lines of complex manual detection
  const { address: currentUserAddress } = useWalletAuth();
  
  console.log("🔍 PublicProfile wallet detection (SIMPLIFIED):", {
    profileAddress,
    currentUserAddress: currentUserAddress ? `${currentUserAddress.slice(0, 6)}...${currentUserAddress.slice(-4)}` : null,
    isOwnProfile: currentUserAddress?.toLowerCase() === profileAddress?.toLowerCase()
  });
  
  // Check if this is the user's own profile
  const isOwnProfile = currentUserAddress?.toLowerCase() === profileAddress?.toLowerCase();
  
  // Hooks for profile data
  const { evermarks: userCreatedEvermarks, isLoading: isLoadingCreated } = useUserEvermarks(profileAddress);
  const { bookshelfData, getStats } = useBookshelf(profileAddress || '');
  
  // Get bookshelf stats
  const bookshelfStats = getStats();
  
  // Get evermarks for bookshelf sections
  const { evermarks: allEvermarks } = useUserEvermarks(); // Get all evermarks to filter favorites/reading
  
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
      <PageContainer title="Profile Not Found">
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600">The profile address is invalid.</p>
        </div>
      </PageContainer>
    );
  }

  const isLoading = isLoadingCreated;

  return (
    <PageContainer title={`${profileAddress.slice(0, 6)}...${profileAddress.slice(-4)}'s Profile`}>
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
              <div key={i} className="bg-white rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Favorites Section */}
            {favoriteEvermarks.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <HeartIcon className="h-5 w-5 text-red-500 mr-2" />
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <BookOpenIcon className="h-5 w-5 text-blue-500 mr-2" />
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <PlusIcon className="h-5 w-5 text-green-500 mr-2" />
                  Recently Created
                </h2>
                {userCreatedEvermarks.length > 6 && (
                  <Link
                    to={`/${profileAddress}/created`}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                  >
                    View All ({userCreatedEvermarks.filter(e => 
                      e.creator?.toLowerCase() === profileAddress.toLowerCase()
                    ).length}) →
                  </Link>
                )}
              </div>
              
              {recentCreatedEvermarks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PlusIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">No Evermarks Created</p>
                  <p className="text-gray-500">
                    {isOwnProfile 
                      ? "You haven't created any Evermarks yet." 
                      : "This user hasn't created any Evermarks yet."}
                  </p>
                  {isOwnProfile && (
                    <Link 
                      to="/create"
                      className="inline-flex items-center mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
                <UserIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {isOwnProfile ? "Welcome to Evermark!" : "New to Evermark"}
                </h3>
                <p className="text-gray-600 mb-6">
                  {isOwnProfile 
                    ? "Start building your collection by creating or bookmarking Evermarks." 
                    : "This user is just getting started with their Evermark journey."}
                </p>
                {isOwnProfile && (
                  <div className="flex gap-4 justify-center">
                    <Link
                      to="/create"
                      className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Create Evermark
                    </Link>
                    <Link
                      to="/"
                      className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
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
    </PageContainer>
  );
};

export default PublicProfilePage;