import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  StarIcon, 
  HeartIcon, 
  BookOpenIcon, 
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon
} from 'lucide-react';
import { useBookshelf } from '../../hooks/useBookshelf';
// ✅ UPDATED: Use new efficient batch hook
import { useEvermarksBatch } from '../../hooks/useEvermarks';
import { formatDistanceToNow } from 'date-fns';

interface FloatingBookshelfWidgetProps {
  userAddress?: string;
  className?: string;
}

interface QuickBookshelfButtonProps {
  evermarkId: string;
  className?: string;
}

// ✅ FIXED: Add the missing QuickBookshelfButton component
export const QuickBookshelfButton: React.FC<QuickBookshelfButtonProps> = ({ 
  evermarkId, 
  className = '' 
}) => {
  const { addToFavorites, removeFromBookshelf, getBookshelfStatus } = useBookshelf();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ FIXED: Use the correct method from your hook
  const bookshelfStatus = getBookshelfStatus(evermarkId);
  const isCurrentlyFavorited = bookshelfStatus.isFavorite;

  const handleToggleFavorite = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (isCurrentlyFavorited) {
        // ✅ FIXED: Use removeFromBookshelf instead of removeFromFavorites
        removeFromBookshelf(evermarkId);
      } else {
        // ✅ FIXED: Use addToFavorites (this one was correct)
        const result = addToFavorites(evermarkId);
        if (!result.success) {
          console.error('Failed to add to favorites:', result.error);
          // Could show a toast or alert here
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isProcessing}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
        transition-all duration-200 disabled:opacity-50
        ${isCurrentlyFavorited 
          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
        ${className}
      `}
      title={isCurrentlyFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isProcessing ? (
        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <HeartIcon 
          className={`w-3 h-3 ${isCurrentlyFavorited ? 'fill-current' : ''}`} 
        />
      )}
      {isCurrentlyFavorited ? 'Favorited' : 'Favorite'}
    </button>
  );
};

export const FloatingBookshelfWidget: React.FC<FloatingBookshelfWidgetProps> = ({ 
  userAddress, 
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { bookshelfData, getStats } = useBookshelf(userAddress);
  const stats = getStats();

  // ✅ MAJOR PERFORMANCE WIN: Get all unique token IDs from bookshelf
  const allBookshelfTokenIds = React.useMemo(() => {
    const favoriteIds = bookshelfData.favorites.map(item => parseInt(item.evermarkId));
    const readingIds = bookshelfData.currentReading.map(item => parseInt(item.evermarkId));
    return [...new Set([...favoriteIds, ...readingIds])].filter(id => !isNaN(id));
  }, [bookshelfData.favorites, bookshelfData.currentReading]);

  // ✅ SINGLE EFFICIENT QUERY: Instead of individual fetches
  const { evermarks, isLoading } = useEvermarksBatch(allBookshelfTokenIds);

  if (!userAddress) return null;

  // ✅ IMPROVED: Create lookup map for O(1) access
  const evermarkMap = React.useMemo(() => {
    return evermarks.reduce((map, evermark) => {
      map[evermark.id] = evermark;
      return map;
    }, {} as Record<string, any>);
  }, [evermarks]);

  // Get recent favorites and current reading with evermark details
  const recentFavorites = bookshelfData.favorites
    .slice(-2)
    .map(item => ({
      ...item,
      evermark: evermarkMap[item.evermarkId] // O(1) lookup instead of .find()
    }))
    .filter(item => item.evermark);

  const recentCurrentReading = bookshelfData.currentReading
    .slice(-2)
    .map(item => ({
      ...item,
      evermark: evermarkMap[item.evermarkId] // O(1) lookup instead of .find()
    }))
    .filter(item => item.evermark);

  const totalItems = stats.totalFavorites + stats.totalCurrentReading;

  // ✅ LOADING STATE: Handle batch loading
  if (isLoading && allBookshelfTokenIds.length > 0) {
    return (
      <div className={`fixed bottom-6 right-6 z-40 ${className}`}>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-w-sm">
          <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            <span className="font-medium">Loading Bookshelf...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-40 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-w-sm">
        {/* Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between hover:from-purple-700 hover:to-indigo-700 transition-all"
        >
          <div className="flex items-center gap-2">
            <StarIcon className="h-5 w-5" />
            <span className="font-medium">My Bookshelf</span>
            <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
              {totalItems}
            </span>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronUpIcon className="h-4 w-4" />
          )}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4 max-h-80 overflow-y-auto">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <HeartIcon className="h-4 w-4 text-red-500" />
                  <span className="font-bold text-red-600">
                    {stats.totalFavorites}/{stats.maxFavorites}
                  </span>
                </div>
                <p className="text-xs text-red-600">Favorites</p>
              </div>
              
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <BookOpenIcon className="h-4 w-4 text-blue-500" />
                  <span className="font-bold text-blue-600">
                    {stats.totalCurrentReading}/{stats.maxCurrentReading}
                  </span>
                </div>
                <p className="text-xs text-blue-600">Reading</p>
              </div>
            </div>

            {/* Recent Items */}
            {totalItems === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <StarIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm mb-3">Your bookshelf is empty</p>
                <Link
                  to="/my-evermarks"
                  className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                >
                  <PlusIcon className="h-3 w-3 mr-1" />
                  Add Evermarks
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Recent Favorites */}
                {recentFavorites.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <HeartIcon className="h-3 w-3 text-red-500" />
                      Recent Favorites
                    </h4>
                    <div className="space-y-2">
                      {recentFavorites.map(({ evermark, addedAt }) => (
                        <Link
                          key={evermark!.id}
                          to={`/evermark/${evermark!.id}`}
                          className="block p-2 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {evermark!.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            Added {formatDistanceToNow(addedAt, { addSuffix: true })}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Current Reading */}
                {recentCurrentReading.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <BookOpenIcon className="h-3 w-3 text-blue-500" />
                      Currently Reading
                    </h4>
                    <div className="space-y-2">
                      {recentCurrentReading.map(({ evermark, addedAt }) => (
                        <Link
                          key={evermark!.id}
                          to={`/evermark/${evermark!.id}`}
                          className="block p-2 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {evermark!.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            Added {formatDistanceToNow(addedAt, { addSuffix: true })}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-4 pt-3 border-t border-gray-200 flex gap-2">
              <Link
                to="/bookshelf"
                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded text-xs text-center hover:bg-purple-700 transition-colors"
              >
                View Full Bookshelf
              </Link>
              <Link
                to="/my-evermarks"
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs text-center hover:bg-gray-200 transition-colors"
              >
                Manage Collection
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};