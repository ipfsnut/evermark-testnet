// src/components/bookshelf/FloatingBookshelfWidget.tsx
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
import { useUserEvermarks } from '../../hooks/useEvermarks';
import { formatDistanceToNow } from 'date-fns';

interface FloatingBookshelfWidgetProps {
  userAddress?: string;
  className?: string;
}

export const FloatingBookshelfWidget: React.FC<FloatingBookshelfWidgetProps> = ({ 
  userAddress, 
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { bookshelfData, getStats } = useBookshelf(userAddress);
  const { evermarks } = useUserEvermarks(userAddress);
  const stats = getStats();

  if (!userAddress) return null;

  // Get recent favorites and current reading with evermark details
  const recentFavorites = bookshelfData.favorites
    .slice(-2)
    .map(item => ({
      ...item,
      evermark: evermarks.find(e => e.id === item.evermarkId)
    }))
    .filter(item => item.evermark);

  const recentCurrentReading = bookshelfData.currentReading
    .slice(-2)
    .map(item => ({
      ...item,
      evermark: evermarks.find(e => e.id === item.evermarkId)
    }))
    .filter(item => item.evermark);

  const totalItems = stats.totalFavorites + stats.totalCurrentReading;

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

// Bookshelf Status Badge Component for individual Evermark pages
export const BookshelfStatusBadge: React.FC<{ 
  evermarkId: string; 
  userAddress?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ evermarkId, userAddress, size = 'md' }) => {
  const { getBookshelfStatus } = useBookshelf(userAddress);
  const status = getBookshelfStatus(evermarkId);

  if (!userAddress || (!status.isFavorite && !status.isCurrentReading)) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className="flex gap-1">
      {status.isFavorite && (
        <div className={`bg-red-100 text-red-700 rounded-full font-medium flex items-center gap-1 ${sizeClasses[size]}`}>
          <HeartIcon className={iconSizes[size]} />
          <span>Favorite</span>
        </div>
      )}
      {status.isCurrentReading && (
        <div className={`bg-blue-100 text-blue-700 rounded-full font-medium flex items-center gap-1 ${sizeClasses[size]}`}>
          <BookOpenIcon className={iconSizes[size]} />
          <span>Reading</span>
        </div>
      )}
    </div>
  );
};

// Quick Add to Bookshelf Button Component
export const QuickBookshelfButton: React.FC<{
  evermarkId: string;
  userAddress?: string;
  onSuccess?: (category: 'favorite' | 'currentReading') => void;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  evermarkId, 
  userAddress, 
  onSuccess,
  variant = 'icon',
  size = 'md'
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const { getBookshelfStatus, addToFavorites, addToCurrentReading, removeFromBookshelf, getStats } = useBookshelf(userAddress);
  const status = getBookshelfStatus(evermarkId);
  const stats = getStats();

  if (!userAddress) return null;

  const handleAddToFavorites = () => {
    const result = addToFavorites(evermarkId);
    if (result.success) {
      onSuccess?.('favorite');
    }
    setShowMenu(false);
  };

  const handleAddToCurrentReading = () => {
    const result = addToCurrentReading(evermarkId);
    if (result.success) {
      onSuccess?.('currentReading');
    }
    setShowMenu(false);
  };

  const handleRemove = () => {
    removeFromBookshelf(evermarkId);
    setShowMenu(false);
  };

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
            status.isFavorite || status.isCurrentReading
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-gray-300'
          }`}
        >
          <StarIcon className={iconSizes[size]} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="p-2">
                {status.isFavorite || status.isCurrentReading ? (
                  <button
                    onClick={handleRemove}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove from Bookshelf
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleAddToFavorites}
                      disabled={!stats.canAddFavorite}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 rounded flex items-center gap-2 disabled:opacity-50"
                    >
                      <HeartIcon className="h-4 w-4 text-red-500" />
                      Add to Favorites
                    </button>
                    <button
                      onClick={handleAddToCurrentReading}
                      disabled={!stats.canAddCurrentReading}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded flex items-center gap-2 disabled:opacity-50"
                    >
                      <BookOpenIcon className="h-4 w-4 text-blue-500" />
                      Add to Reading
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowMenu(!showMenu)}
      className={`inline-flex items-center px-3 py-2 rounded-lg transition-all ${
        status.isFavorite || status.isCurrentReading
          ? 'bg-purple-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-600'
      }`}
    >
      <StarIcon className="h-4 w-4 mr-2" />
      <span>
        {status.isFavorite ? 'In Favorites' : 
         status.isCurrentReading ? 'Currently Reading' : 
         'Add to Bookshelf'}
      </span>
    </button>
  );
};