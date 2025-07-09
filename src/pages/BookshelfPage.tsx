import React, { useState } from 'react';
import { useWalletAuth } from '../providers/WalletProvider';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { useBookshelf } from '../hooks/useBookshelf';
import { 
  BookOpenIcon, 
  PlusIcon, 
  FolderIcon, 
  GridIcon,
  ListIcon,
  HeartIcon,
  StarIcon,
  ImageIcon,
  UserIcon,
  CalendarIcon,
  StickyNoteIcon,
  XIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  ZapIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn, useIsMobile } from '../utils/responsive';

interface Collection {
  id: string;
  name: string;
  description?: string;
  evermarkIds: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Evermark {
  id: string;
  title: string;
  author: string;
  description?: string;
  image?: string;
  creationTime: number;
}

// Enhanced Evermark Card for Bookshelf
const BookshelfEvermarkCard: React.FC<{ 
  evermark: Evermark; 
  bookshelfItem: any;
  onRemove: () => void;
  onUpdateNotes: (notes: string) => void;
  category: 'favorite' | 'currentReading';
}> = ({ evermark, bookshelfItem, onRemove, onUpdateNotes, category }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showNotesEdit, setShowNotesEdit] = useState(false);
  const [notes, setNotes] = useState(bookshelfItem?.notes || '');

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(notes);
    setShowNotesEdit(false);
  };

  const categoryConfig = {
    favorite: {
      icon: <HeartIcon className="h-4 w-4" />,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-400/30',
      label: 'Favorite'
    },
    currentReading: {
      icon: <BookOpenIcon className="h-4 w-4" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-400/30',
      label: 'Currently Reading'
    }
  };

  const config = categoryConfig[category];

  return (
    <div className={cn(
      "bg-gray-800/50 border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 group relative",
      config.borderColor,
      "hover:border-opacity-60"
    )}>
      {/* Category Badge */}
      <div className={cn(
        "absolute top-3 right-3 z-10 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
        config.bgColor,
        config.color,
        "border",
        config.borderColor
      )}>
        {config.icon}
        <span>{config.label}</span>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="absolute top-3 left-3 z-10 p-1 bg-gray-800/80 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/20 hover:text-red-400"
      >
        <XIcon className="h-3 w-3" />
      </button>

      <Link to={`/evermark/${evermark.id}`} className="block">
        {/* Image section */}
        <div className="w-full h-40 bg-gray-700 overflow-hidden relative">
          {evermark.image && !imageError ? (
            <div className="relative w-full h-full">
              {imageLoading && (
                <div className="absolute inset-0 bg-gray-600 animate-pulse"></div>
              )}
              <img
                src={evermark.image}
                alt={evermark.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20"></div>
            </div>
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-gray-500" />
            </div>
          )}
        </div>
        
        {/* Content section */}
        <div className="p-4">
          <h3 className="font-medium text-white mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
            {evermark.title}
          </h3>
          
          <div className="text-sm text-gray-400 mb-3">
            <div className="flex items-center mb-1">
              <UserIcon className="h-3 w-3 mr-1" />
              <span>by {evermark.author}</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <CalendarIcon className="h-3 w-3 mr-1" />
              <span>Added {formatDistanceToNow(bookshelfItem.addedAt, { addSuffix: true })}</span>
            </div>
          </div>
          
          {evermark.description && (
            <p className="text-sm text-gray-300 mb-3 line-clamp-2">
              {evermark.description}
            </p>
          )}
        </div>
      </Link>

      {/* Notes section */}
      <div className="p-4 pt-0 border-t border-gray-700">
        {showNotesEdit ? (
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your personal notes..."
              className="w-full px-2 py-1 text-xs border border-gray-600 bg-gray-700 text-white rounded resize-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNotesEdit(false)}
                className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-2 py-1 text-xs bg-cyan-600 text-black rounded hover:bg-cyan-500 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNotesEdit(true)}
            className="w-full text-left"
          >
            <div className="flex items-start gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors">
              <StickyNoteIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">
                {bookshelfItem.notes || 'Add personal notes...'}
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

// Quick Add Section
const QuickAddSection: React.FC<{ userAddress: string }> = ({ userAddress }) => {
  const { evermarks, isLoading } = useUserEvermarks(userAddress);
  const { addToFavorites, addToCurrentReading, getBookshelfStatus, getStats } = useBookshelf(userAddress);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const stats = getStats();

  const availableEvermarks = evermarks.filter(evermark => {
    const status = getBookshelfStatus(evermark.id);
    return !status.isFavorite && !status.isCurrentReading;
  });

  const handleQuickAdd = (evermarkId: string, category: 'favorite' | 'currentReading') => {
    if (category === 'favorite') {
      const result = addToFavorites(evermarkId);
      if (!result.success) {
        alert(result.error);
      }
    } else {
      const result = addToCurrentReading(evermarkId);
      if (!result.success) {
        alert(result.error);
      }
    }
  };

  if (!showQuickAdd) {
    return (
      <div className="text-center">
        <button
          onClick={() => setShowQuickAdd(true)}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-black font-bold rounded-lg hover:from-green-300 hover:to-green-500 transition-all shadow-lg shadow-green-500/30"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Quick Add Evermarks
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">Quick Add to Bookshelf</h3>
        <button
          onClick={() => setShowQuickAdd(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-gray-400">Loading your Evermarks...</div>
      ) : availableEvermarks.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          All your Evermarks are already on your bookshelf!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {availableEvermarks.map(evermark => (
            <div key={evermark.id} className="flex items-center p-3 border border-gray-600 bg-gray-700/50 rounded-lg">
              <div className="w-12 h-12 bg-gray-600 rounded mr-3 overflow-hidden flex-shrink-0">
                {evermark.image ? (
                  <img src={evermark.image} alt={evermark.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 mr-3">
                <h4 className="text-sm font-medium text-white truncate">{evermark.title}</h4>
                <p className="text-xs text-gray-400">by {evermark.author}</p>
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={() => handleQuickAdd(evermark.id, 'favorite')}
                  disabled={!stats.canAddFavorite}
                  className="p-1 text-red-400 hover:bg-red-500/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Add to Favorites"
                >
                  <HeartIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleQuickAdd(evermark.id, 'currentReading')}
                  disabled={!stats.canAddCurrentReading}
                  className="p-1 text-blue-400 hover:bg-blue-500/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Add to Current Reading"
                >
                  <BookOpenIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EnhancedBookshelfPage: React.FC = () => {
  const { address, isConnected } = useWalletAuth();
  const { evermarks } = useUserEvermarks(address);
  const { bookshelfData, isLoading, removeFromBookshelf, updateNotes, getStats } = useBookshelf(address);
  const isMobile = useIsMobile();
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionIsPublic, setNewCollectionIsPublic] = useState(false);

  // Load collections from localStorage
  React.useEffect(() => {
    if (address) {
      const savedCollections = localStorage.getItem(`collections_${address}`);
      if (savedCollections) {
        try {
          const parsed = JSON.parse(savedCollections);
          setCollections(parsed);
        } catch (error) {
          console.error('Error loading collections:', error);
        }
      }
    }
  }, [address]);

  const stats = getStats();

  const getFavoriteEvermarks = () => {
    return bookshelfData.favorites
      .map(item => {
        const evermark = evermarks.find(e => e.id === item.evermarkId);
        if (!evermark) return null;
        return { evermark, bookshelfItem: item };
      })
      .filter(Boolean) as { evermark: Evermark; bookshelfItem: any }[];
  };

  const getCurrentReadingEvermarks = () => {
    return bookshelfData.currentReading
      .map(item => {
        const evermark = evermarks.find(e => e.id === item.evermarkId);
        if (!evermark) return null;
        return { evermark, bookshelfItem: item };
      })
      .filter(Boolean) as { evermark: Evermark; bookshelfItem: any }[];
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpenIcon className="h-8 w-8 text-black" />
          </div>
          <p className="text-gray-400">Connect your wallet to view your bookshelf</p>
        </div>
      </div>
    );
  }

  const favoriteEvermarks = getFavoriteEvermarks();
  const currentReadingEvermarks = getCurrentReadingEvermarks();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cyber Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-purple-400/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <BookmarkIcon className="h-7 w-7 text-black" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
                  MY BOOKSHELF
                </h1>
              </div>
              <p className="text-gray-300">Curate your favorite content and current reading</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 text-gray-400 hover:text-white bg-gray-800 border border-gray-600 rounded-lg transition-colors"
              >
                {viewMode === 'grid' ? <ListIcon className="h-5 w-5" /> : <GridIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-red-400/50 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <HeartIcon className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <p className="text-sm text-gray-400">Favorites</p>
                <p className="text-lg font-bold text-red-400">{stats.totalFavorites}/{stats.maxFavorites}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-blue-400/50 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <BookOpenIcon className="h-5 w-5 text-blue-400 mr-2" />
              <div>
                <p className="text-sm text-gray-400">Reading</p>
                <p className="text-lg font-bold text-blue-400">{stats.totalCurrentReading}/{stats.maxCurrentReading}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-purple-400/50 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <FolderIcon className="h-5 w-5 text-purple-400 mr-2" />
              <div>
                <p className="text-sm text-gray-400">Collections</p>
                <p className="text-lg font-bold text-purple-400">{collections.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-yellow-400/50 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <StarIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <div>
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-lg font-bold text-yellow-400">{evermarks.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-8">
        <div className="space-y-8">
          {/* Quick Add Section */}
          <QuickAddSection userAddress={address!} />

          {/* Favorites Section */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <HeartIcon className="h-6 w-6 text-red-400 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Favorites</h2>
                  <p className="text-sm text-gray-400">Your most cherished Evermarks</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">{stats.totalFavorites}/{stats.maxFavorites}</span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-700 rounded-lg h-64 animate-pulse"></div>
                ))}
              </div>
            ) : favoriteEvermarks.length === 0 ? (
              <div className="text-center py-12 bg-red-900/10 rounded-lg border-2 border-dashed border-red-500/30">
                <HeartIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Favorites Yet</h3>
                <p className="text-gray-400 mb-4">Mark your most loved Evermarks as favorites</p>
                {evermarks.length > 0 ? (
                  <p className="text-sm text-purple-400 mb-4">
                    Use the "Quick Add Evermarks" button above to add your Evermarks to favorites!
                  </p>
                ) : (
                  <Link
                    to="/my-evermarks"
                    className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Browse Your Evermarks
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteEvermarks.map(({ evermark, bookshelfItem }) => (
                  <BookshelfEvermarkCard
                    key={evermark.id}
                    evermark={evermark}
                    bookshelfItem={bookshelfItem}
                    category="favorite"
                    onRemove={() => removeFromBookshelf(evermark.id)}
                    onUpdateNotes={(notes) => updateNotes(evermark.id, notes)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Current Reading Section */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <BookOpenIcon className="h-6 w-6 text-blue-400 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Current Reading</h2>
                  <p className="text-sm text-gray-400">What you're exploring right now</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">{stats.totalCurrentReading}/{stats.maxCurrentReading}</span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-gray-700 rounded-lg h-64 animate-pulse"></div>
                ))}
              </div>
            ) : currentReadingEvermarks.length === 0 ? (
              <div className="text-center py-12 bg-blue-900/10 rounded-lg border-2 border-dashed border-blue-500/30">
                <BookOpenIcon className="mx-auto h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Nothing Currently Reading</h3>
                <p className="text-gray-400 mb-4">Add Evermarks you're actively exploring</p>
                {evermarks.length > 0 ? (
                  <p className="text-sm text-purple-400 mb-4">
                    Use the "Quick Add Evermarks" button above to add your Evermarks to current reading!
                  </p>
                ) : (
                  <Link
                    to="/my-evermarks"
                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Browse Your Evermarks
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentReadingEvermarks.map(({ evermark, bookshelfItem }) => (
                  <BookshelfEvermarkCard
                    key={evermark.id}
                    evermark={evermark}
                    bookshelfItem={bookshelfItem}
                    category="currentReading"
                    onRemove={() => removeFromBookshelf(evermark.id)}
                    onUpdateNotes={(notes) => updateNotes(evermark.id, notes)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedBookshelfPage;
