import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { useBookshelf } from '../hooks/useBookshelf';
import { 
  BookOpenIcon, 
  PlusIcon, 
  FolderIcon, 
  LockIcon,
  GlobeIcon,
  EditIcon,
  TrashIcon,
  ChevronRightIcon,
  GridIcon,
  ListIcon,
  ShareIcon,
  DownloadIcon,
  HeartIcon,
  StarIcon,
  ClockIcon,
  ImageIcon,
  UserIcon,
  CalendarIcon,
  StickyNoteIcon,
  XIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import { formatDistanceToNow } from 'date-fns';

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
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Favorite'
    },
    currentReading: {
      icon: <BookOpenIcon className="h-4 w-4" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Currently Reading'
    }
  };

  const config = categoryConfig[category];

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 ${config.borderColor} overflow-hidden hover:shadow-md transition-all duration-200 group relative`}>
      {/* Category Badge */}
      <div className={`absolute top-3 right-3 z-10 px-2 py-1 ${config.bgColor} ${config.color} rounded-full text-xs font-medium flex items-center gap-1`}>
        {config.icon}
        <span>{config.label}</span>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="absolute top-3 left-3 z-10 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
      >
        <XIcon className="h-3 w-3" />
      </button>

      <Link to={`/evermark/${evermark.id}`} className="block">
        {/* Image section */}
        <div className="w-full h-40 bg-gray-100 overflow-hidden relative">
          {evermark.image && !imageError ? (
            <div className="relative w-full h-full">
              {imageLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
              )}
              <img
                src={evermark.image}
                alt={evermark.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              {/* Gradient overlay for better badge visibility */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20"></div>
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Content section */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
            {evermark.title}
          </h3>
          
          <div className="text-sm text-gray-600 mb-3">
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
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {evermark.description}
            </p>
          )}
        </div>
      </Link>

      {/* Notes section */}
      <div className="p-4 pt-0 border-t border-gray-100">
        {showNotesEdit ? (
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your personal notes..."
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNotesEdit(false)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
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
            <div className="flex items-start gap-2 text-xs text-gray-600 hover:text-gray-800">
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
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Quick Add Evermarks
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Add to Bookshelf</h3>
        <button
          onClick={() => setShowQuickAdd(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading your Evermarks...</div>
      ) : availableEvermarks.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          All your Evermarks are already on your bookshelf!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {availableEvermarks.map(evermark => (
            <div key={evermark.id} className="flex items-center p-3 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-gray-100 rounded mr-3 overflow-hidden flex-shrink-0">
                {evermark.image ? (
                  <img src={evermark.image} alt={evermark.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 mr-3">
                <h4 className="text-sm font-medium text-gray-900 truncate">{evermark.title}</h4>
                <p className="text-xs text-gray-500">by {evermark.author}</p>
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={() => handleQuickAdd(evermark.id, 'favorite')}
                  disabled={!stats.canAddFavorite}
                  className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add to Favorites"
                >
                  <HeartIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleQuickAdd(evermark.id, 'currentReading')}
                  disabled={!stats.canAddCurrentReading}
                  className="p-1 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
  const { address, isConnected } = useWallet();
  const { evermarks } = useUserEvermarks(address);
  const { bookshelfData, isLoading, removeFromBookshelf, updateNotes, getStats } = useBookshelf(address);
  
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

  // FIXED: Better evermark matching with debug logging
  const getFavoriteEvermarks = () => {
    console.log('📚 Debug Favorites:');
    console.log('- Bookshelf favorites:', bookshelfData.favorites);
    console.log('- Available evermarks:', evermarks.map(e => ({id: e.id, title: e.title})));
    
    return bookshelfData.favorites
      .map(item => {
        const evermark = evermarks.find(e => e.id === item.evermarkId);
        if (!evermark) {
          console.log(`❌ Could not find evermark with ID: ${item.evermarkId}`);
          return null;
        }
        console.log(`✅ Found favorite evermark: ${evermark.title}`);
        return { evermark, bookshelfItem: item };
      })
      .filter(Boolean) as { evermark: Evermark; bookshelfItem: any }[];
  };

  const getCurrentReadingEvermarks = () => {
    console.log('📖 Debug Current Reading:');
    console.log('- Bookshelf current reading:', bookshelfData.currentReading);
    
    return bookshelfData.currentReading
      .map(item => {
        const evermark = evermarks.find(e => e.id === item.evermarkId);
        if (!evermark) {
          console.log(`❌ Could not find evermark with ID: ${item.evermarkId}`);
          return null;
        }
        console.log(`✅ Found current reading evermark: ${evermark.title}`);
        return { evermark, bookshelfItem: item };
      })
      .filter(Boolean) as { evermark: Evermark; bookshelfItem: any }[];
  };

  const saveCollections = (updatedCollections: Collection[]) => {
    if (address) {
      localStorage.setItem(`collections_${address}`, JSON.stringify(updatedCollections));
      setCollections(updatedCollections);
    }
  };

  const createCollection = () => {
    if (!newCollectionName.trim()) return;
    
    const newCollection: Collection = {
      id: Date.now().toString(),
      name: newCollectionName,
      description: newCollectionDescription,
      evermarkIds: [],
      isPublic: newCollectionIsPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    saveCollections([...collections, newCollection]);
    setNewCollectionName('');
    setNewCollectionDescription('');
    setNewCollectionIsPublic(false);
    setShowCreateModal(false);
  };

  if (!isConnected) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-600">Connect your wallet to view your bookshelf</p>
        </div>
      </PageContainer>
    );
  }

  const favoriteEvermarks = getFavoriteEvermarks();
  const currentReadingEvermarks = getCurrentReadingEvermarks();

  // Debug logging
  console.log('📊 Bookshelf Debug Summary:');
  console.log('- Stats:', stats);
  console.log('- Favorite evermarks found:', favoriteEvermarks.length);
  console.log('- Current reading evermarks found:', currentReadingEvermarks.length);

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* FIXED: Single header without duplicate title */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">My Bookshelf</h1>
            <p className="text-gray-600">Curate your favorite content and current reading</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {viewMode === 'grid' ? <ListIcon className="h-5 w-5" /> : <GridIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <HeartIcon className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Favorites</p>
                <p className="text-lg font-bold">{stats.totalFavorites}/{stats.maxFavorites}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <BookOpenIcon className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Reading</p>
                <p className="text-lg font-bold">{stats.totalCurrentReading}/{stats.maxCurrentReading}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <FolderIcon className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Collections</p>
                <p className="text-lg font-bold">{collections.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <StarIcon className="h-5 w-5 text-yellow-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-lg font-bold">{evermarks.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Section */}
        <QuickAddSection userAddress={address!} />

        {/* Favorites Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <HeartIcon className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Favorites</h2>
                <p className="text-sm text-gray-600">Your most cherished Evermarks</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">{stats.totalFavorites}/{stats.maxFavorites}</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
              ))}
            </div>
          ) : favoriteEvermarks.length === 0 ? (
            <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-dashed border-red-200">
              <HeartIcon className="mx-auto h-12 w-12 text-red-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Favorites Yet</h3>
              <p className="text-gray-600 mb-4">Mark your most loved Evermarks as favorites</p>
              {evermarks.length > 0 ? (
                <p className="text-sm text-purple-600 mb-4">
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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BookOpenIcon className="h-6 w-6 text-blue-500 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Current Reading</h2>
                <p className="text-sm text-gray-600">What you're exploring right now</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">{stats.totalCurrentReading}/{stats.maxCurrentReading}</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
              ))}
            </div>
          ) : currentReadingEvermarks.length === 0 ? (
            <div className="text-center py-12 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
              <BookOpenIcon className="mx-auto h-12 w-12 text-blue-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nothing Currently Reading</h3>
              <p className="text-gray-600 mb-4">Add Evermarks you're actively exploring</p>
              {evermarks.length > 0 ? (
                <p className="text-sm text-purple-600 mb-4">
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

        {/* Create Collection Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Create New Collection</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="My Reading List"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCollectionDescription}
                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="A collection of articles about..."
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newCollectionIsPublic}
                    onChange={(e) => setNewCollectionIsPublic(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                    Make this collection public
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCollectionName('');
                    setNewCollectionDescription('');
                    setNewCollectionIsPublic(false);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createCollection}
                  disabled={!newCollectionName.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Collection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default EnhancedBookshelfPage;