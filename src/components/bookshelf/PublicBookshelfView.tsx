// src/components/profile/PublicBookshelfView.tsx - ✅ Public trophy case view
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  BookmarkIcon, 
  HeartIcon, 
  BookOpenIcon, 
  UserIcon,
  CalendarIcon,
  ArrowLeftIcon,
  ShareIcon,
  TrophyIcon,
  PlusIcon
} from 'lucide-react';
import { useBookshelf } from '../../hooks/useBookshelf';
import { useUserEvermarks } from '../../hooks/useEvermarks';
import { formatDistanceToNow } from 'date-fns';
import { EvermarkCard } from '../evermark/EvermarkCard';
import PageContainer from '../layout/PageContainer';
import { cn, textSizes, spacing } from '../../utils/responsive';

interface PublicBookshelfViewProps {
  userAddress?: string;
  showBackButton?: boolean;
}

export const PublicBookshelfView: React.FC<PublicBookshelfViewProps> = ({ 
  userAddress: propUserAddress,
  showBackButton = true 
}) => {
  const params = useParams();
  const userAddress = propUserAddress || params.address;
  
  const { bookshelfData, isLoading, getStats } = useBookshelf(userAddress);
  const { evermarks } = useUserEvermarks(userAddress);
  const stats = getStats();
  
  // Get evermarks that match bookshelf items
  const getBookshelfEvermarks = () => {
    const allBookshelfItems = [...bookshelfData.favorites, ...bookshelfData.currentReading];
    return allBookshelfItems
      .map(item => {
        const evermark = evermarks.find(e => e.id === item.evermarkId);
        if (!evermark) return null;
        return {
          evermark,
          bookshelfItem: item,
          category: bookshelfData.favorites.find(f => f.evermarkId === item.evermarkId) ? 'favorite' : 'currentReading'
        };
      })
      .filter((item): item is { evermark: any; bookshelfItem: any; category: string } => item !== null)
      .sort((a, b) => new Date(b.bookshelfItem.addedAt).getTime() - new Date(a.bookshelfItem.addedAt).getTime());
  };

  const bookshelfEvermarks = getBookshelfEvermarks();
  const favoriteEvermarks = bookshelfEvermarks.filter(item => item.category === 'favorite');
  const currentReadingEvermarks = bookshelfEvermarks.filter(item => item.category === 'currentReading');

  if (isLoading) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bookshelf...</p>
        </div>
      </PageContainer>
    );
  }

  if (bookshelfEvermarks.length === 0) {
    return (
      <PageContainer>
        {showBackButton && (
          <div className="mb-6">
            <Link 
              to={`/${userAddress}`}
              className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back to Profile
            </Link>
          </div>
        )}
        
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <BookmarkIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">No Public Bookshelf</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            This user hasn't curated their public bookshelf yet. Check back later to see their favorite Evermarks!
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {showBackButton && (
        <div className="mb-6">
          <Link 
            to={`/${userAddress}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Profile
          </Link>
        </div>
      )}

      <div className="space-y-8">
        {/* Bookshelf Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <TrophyIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className={cn("font-bold text-white", textSizes.responsive['xl-2xl-3xl'])}>
                  Public Bookshelf
                </h1>
                <p className="text-purple-100 mt-1">
                  Curated collection of {stats.totalFavorites + stats.totalCurrentReading} Evermarks
                </p>
                <div className="flex items-center mt-2 text-sm text-purple-200">
                  <UserIcon className="h-4 w-4 mr-1" />
                  <span className="font-mono">{userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalFavorites}</div>
                  <div className="text-purple-200">Favorites</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalCurrentReading}</div>
                  <div className="text-purple-200">Reading</div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Check out this Evermark bookshelf!',
                      text: 'Discover curated Evermarks from this collector',
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="inline-flex items-center px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                <ShareIcon className="h-4 w-4 mr-2" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Favorites Section */}
        {favoriteEvermarks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center">
                <HeartIcon className="h-6 w-6 text-red-500 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Favorites</h2>
                  <p className="text-sm text-red-700">The collector's most cherished Evermarks</p>
                </div>
                <span className="ml-auto bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                  {favoriteEvermarks.length}
                </span>
              </div>
            </div>
            
            <div className={cn("grid gap-6", spacing.responsive['md-lg-xl'])}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteEvermarks.map(({ evermark, bookshelfItem }) => (
                  <div key={evermark.id} className="relative group">
                    {/* Favorite Badge */}
                    <div className="absolute top-4 right-4 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-lg">
                      <HeartIcon className="h-3 w-3 mr-1 fill-current" />
                      Favorite
                    </div>
                    
                    {/* Added Date */}
                    <div className="absolute bottom-4 left-4 z-10 bg-black/60 text-white px-2 py-1 rounded text-xs">
                      Added {formatDistanceToNow(bookshelfItem.addedAt, { addSuffix: true })}
                    </div>
                    
                    <EvermarkCard 
                      evermark={evermark} 
                      showActions={false}
                      showViews={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Currently Reading Section */}
        {currentReadingEvermarks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
              <div className="flex items-center">
                <BookOpenIcon className="h-6 w-6 text-blue-500 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Currently Reading</h2>
                  <p className="text-sm text-blue-700">What the collector is exploring right now</p>
                </div>
                <span className="ml-auto bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  {currentReadingEvermarks.length}
                </span>
              </div>
            </div>
            
            <div className={cn("grid gap-6", spacing.responsive['md-lg-xl'])}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentReadingEvermarks.map(({ evermark, bookshelfItem }) => (
                  <div key={evermark.id} className="relative group">
                    {/* Reading Badge */}
                    <div className="absolute top-4 right-4 z-10 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-lg">
                      <BookOpenIcon className="h-3 w-3 mr-1" />
                      Reading
                    </div>
                    
                    {/* Added Date */}
                    <div className="absolute bottom-4 left-4 z-10 bg-black/60 text-white px-2 py-1 rounded text-xs">
                      Added {formatDistanceToNow(bookshelfItem.addedAt, { addSuffix: true })}
                    </div>
                    
                    <EvermarkCard 
                      evermark={evermark} 
                      showActions={false}
                      showViews={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Call to Action for Visitors */}
        <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg p-8 text-center border border-gray-200">
          <BookmarkIcon className="mx-auto h-12 w-12 text-purple-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your Own Bookshelf</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Build your own public showcase of favorite Evermarks and share your interests with the world.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Evermark
            </Link>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <BookOpenIcon className="h-4 w-4 mr-2" />
              Explore More
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};