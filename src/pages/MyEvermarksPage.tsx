import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpenIcon, 
  PlusIcon, 
  GridIcon,
  ListIcon,
  HeartIcon,
  StarIcon,
  ImageIcon,
  UserIcon,
  CalendarIcon,
  TrophyIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  EyeIcon,
  ShareIcon,
  ZapIcon,
  CoinsIcon
} from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { useBookshelf } from '../hooks/useBookshelf';
import { formatDistanceToNow } from 'date-fns';
import { EvermarkCard } from '../components/evermark/EvermarkCard';
import { EnhancedEvermarkModal } from '../components/evermark/EnhancedEvermarkModal';
import { useModal } from '../hooks/useModal';
import { ContractRequired } from '../components/auth/AuthGuard';
import { cn, useIsMobile, textSizes, spacing } from '../utils/responsive';

type TabType = 'owned' | 'created' | 'bookshelf';

const MyEvermarksPage: React.FC = () => {
  const { primaryAddress, isAuthenticated, displayName, avatar } = useProfile();
  const { evermarks: ownedEvermarks, isLoading: isLoadingOwned } = useUserEvermarks(primaryAddress);
  const { bookshelfData, getStats } = useBookshelf(primaryAddress);
  const [activeTab, setActiveTab] = useState<TabType>('owned');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const isMobile = useIsMobile();
  
  const bookshelfStats = getStats();

  // Use the unified modal hook
  const { modalState, openModal, closeModal } = useModal();
  
  // Get evermarks that match bookshelf items
  const getBookshelfEvermarks = () => {
    const allBookshelfItems = [...bookshelfData.favorites, ...bookshelfData.currentReading];
    return allBookshelfItems
      .map(item => {
        const evermark = ownedEvermarks.find(e => e.id === item.evermarkId);
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

  const createdEvermarks = ownedEvermarks;
  const bookshelfEvermarks = getBookshelfEvermarks();

  const tabs = [
    {
      id: 'owned' as TabType,
      label: 'OWNED',
      icon: <CoinsIcon className="h-4 w-4" />,
      count: ownedEvermarks.length,
      description: 'Evermarks you own',
      color: 'cyan'
    },
    {
      id: 'created' as TabType,
      label: 'CREATED',
      icon: <ZapIcon className="h-4 w-4" />,
      count: createdEvermarks.length,
      description: 'Evermarks you created',
      color: 'green'
    },
    {
      id: 'bookshelf' as TabType,
      label: 'BOOKSHELF',
      icon: <BookmarkIcon className="h-4 w-4" />,
      count: bookshelfStats.totalFavorites + bookshelfStats.totalCurrentReading,
      description: 'Your curated showcase',
      color: 'purple'
    }
  ];

  const renderBookshelfShowcase = () => {
    if (bookshelfEvermarks.length === 0) {
      return (
        <div className="text-center py-12 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-lg border-2 border-dashed border-purple-500/30">
          <BookmarkIcon className="mx-auto h-16 w-16 text-purple-400 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">Showcase Your Favorites</h3>
          <p className="text-gray-300 mb-6 max-w-md mx-auto">
            Your bookshelf is your public showcase. Add your favorite Evermarks to share what inspires you.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/bookshelf"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-600 text-black font-bold rounded-lg hover:from-purple-300 hover:to-purple-500 transition-all shadow-lg shadow-purple-500/30"
            >
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Manage Bookshelf
            </Link>
            {ownedEvermarks.length > 0 && (
              <button
                onClick={() => setActiveTab('owned')}
                className="inline-flex items-center px-4 py-2 bg-gray-700 text-purple-400 border border-purple-500/50 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <BookOpenIcon className="h-4 w-4 mr-2" />
                View Owned
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Bookshelf Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg shadow-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {avatar && (
                <img src={avatar} alt={displayName} className="w-12 h-12 rounded-full border-2 border-white" />
              )}
              <div>
                <h2 className="text-xl font-bold">{displayName}'s Bookshelf</h2>
                <p className="text-purple-100">
                  {bookshelfStats.totalFavorites} favorites • {bookshelfStats.totalCurrentReading} currently reading
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                to="/bookshelf"
                className="inline-flex items-center px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                <BookmarkIcon className="h-4 w-4 mr-2" />
                Manage
              </Link>
              <Link
                to={`/${primaryAddress}/bookshelf`}
                className="inline-flex items-center px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                Public View
              </Link>
            </div>
          </div>
        </div>

        {/* Favorites Section */}
        {bookshelfData.favorites.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <HeartIcon className="h-5 w-5 text-red-400 mr-2" />
              <h3 className="text-lg font-semibold text-white">Favorites</h3>
              <span className="ml-auto text-sm text-gray-400">{bookshelfStats.totalFavorites}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookshelfEvermarks
                .filter(item => item.category === 'favorite')
                .slice(0, 6)
                .map(({ evermark, bookshelfItem }) => (
                  <div key={evermark.id} className="relative group">
                    <div className="absolute top-2 right-2 z-10 bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-medium flex items-center border border-red-400/30">
                      <HeartIcon className="h-3 w-3 mr-1" />
                      Favorite
                    </div>
                    <EvermarkCard 
                      evermark={evermark} 
                      variant="compact"
                      onOpenModal={openModal}
                      bookshelfCategory="favorite"
                      showQuickActions={false}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Currently Reading Section */}
        {bookshelfData.currentReading.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <BookOpenIcon className="h-5 w-5 text-blue-400 mr-2" />
              <h3 className="text-lg font-semibold text-white">Currently Reading</h3>
              <span className="ml-auto text-sm text-gray-400">{bookshelfStats.totalCurrentReading}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookshelfEvermarks
                .filter(item => item.category === 'currentReading')
                .slice(0, 4)
                .map(({ evermark, bookshelfItem }) => (
                  <div key={evermark.id} className="relative group">
                    <div className="absolute top-2 right-2 z-10 bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium flex items-center border border-blue-400/30">
                      <BookOpenIcon className="h-3 w-3 mr-1" />
                      Reading
                    </div>
                    <EvermarkCard 
                      evermark={evermark} 
                      variant="compact"
                      onOpenModal={openModal}
                      bookshelfCategory="currentReading"
                      showQuickActions={false}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEvermarkGrid = (evermarks: any[]) => {
    if (evermarks.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-600">
          <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpenIcon className="h-8 w-8 text-black" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {activeTab === 'owned' ? 'No Evermarks Owned' : 'No Evermarks Created'}
          </h3>
          <p className="text-gray-400 mb-4">
            {activeTab === 'owned' 
              ? 'You don\'t own any Evermarks yet. Create your first one!'
              : 'You haven\'t created any Evermarks yet. Share your first piece of content!'
            }
          </p>
          <Link
            to="/create"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 text-black font-bold rounded-lg hover:from-cyan-300 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Evermark
          </Link>
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div className="space-y-4">
          {evermarks.map(evermark => (
            <EvermarkCard 
              key={evermark.id} 
              evermark={evermark} 
              variant="list"
              showDescription={false}
              onOpenModal={openModal}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {evermarks.map(evermark => (
          <EvermarkCard 
            key={evermark.id} 
            evermark={evermark}
            showDescription={true}
            onOpenModal={openModal}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <ContractRequired fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center max-w-md mx-4">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpenIcon className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Connect Wallet to View Collection</h3>
            <p className="text-gray-400">Connect your wallet to see your Evermarks and manage your bookshelf</p>
          </div>
        </div>
      }>
        {/* Cyber Header */}
        <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-cyan-400/30">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-purple-500 bg-clip-text text-transparent mb-2">
                  MY COLLECTION
                </h1>
                <p className="text-gray-300">
                  Manage your Evermarks and showcase your favorites
                </p>
              </div>
              
              <div className="flex items-center justify-center sm:justify-end space-x-2">
                {/* View Mode Toggle */}
                {activeTab !== 'bookshelf' && (
                  <div className="flex items-center bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "p-2 transition-colors",
                        viewMode === 'grid' ? 'bg-cyan-600 text-black' : 'text-gray-400 hover:text-white'
                      )}
                    >
                      <GridIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "p-2 transition-colors",
                        viewMode === 'list' ? 'bg-cyan-600 text-black' : 'text-gray-400 hover:text-white'
                      )}
                    >
                      <ListIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {/* Create Button */}
                <Link
                  to="/create"
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-black font-bold rounded-lg hover:from-green-300 hover:to-green-500 transition-all shadow-lg shadow-green-500/30"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-900/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center space-x-2 py-4 px-6 border-b-2 font-bold text-sm transition-all duration-200",
                    activeTab === tab.id
                      ? `border-${tab.color}-400 text-${tab.color}-400 bg-${tab.color}-400/10`
                      : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600',
                    isMobile && "px-3 text-xs"
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span className={cn(
                    "px-2 py-1 text-xs rounded-full",
                    activeTab === tab.id 
                      ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-400/30`
                      : 'bg-gray-700 text-gray-400'
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="min-h-96">
            {isLoadingOwned ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your collection...</p>
              </div>
            ) : (
              <>
                {activeTab === 'owned' && renderEvermarkGrid(ownedEvermarks)}
                {activeTab === 'created' && renderEvermarkGrid(createdEvermarks)}
                {activeTab === 'bookshelf' && renderBookshelfShowcase()}
              </>
            )}
          </div>

          {/* Quick Stats */}
          {(ownedEvermarks.length > 0 || bookshelfStats.totalFavorites > 0) && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrophyIcon className="h-5 w-5 text-yellow-400" />
                Collection Stats
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{ownedEvermarks.length}</div>
                  <div className="text-sm text-gray-400">Total Owned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{bookshelfStats.totalFavorites}</div>
                  <div className="text-sm text-gray-400">Favorites</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{bookshelfStats.totalCurrentReading}</div>
                  <div className="text-sm text-gray-400">Reading</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {primaryAddress ? `${primaryAddress.slice(0, 4)}...${primaryAddress.slice(-4)}` : '0'}
                  </div>
                  <div className="text-sm text-gray-400">Address</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Evermark Modal */}
        {modalState.isOpen && (
          <EnhancedEvermarkModal
            evermarkId={modalState.evermarkId}
            isOpen={modalState.isOpen}
            onClose={closeModal}
            autoExpandDelegation={modalState.options.autoExpandDelegation}
            initialExpandedSection={modalState.options.initialExpandedSection}
          />
        )}
      </ContractRequired>
    </div>
  );
};

export default MyEvermarksPage;