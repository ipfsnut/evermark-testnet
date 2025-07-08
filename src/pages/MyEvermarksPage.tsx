// src/pages/MyEvermarksPage.tsx - ✅ ENHANCED with Owned/Created tabs and Bookshelf showcase
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
  ShareIcon
} from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { useBookshelf } from '../hooks/useBookshelf';
import { formatDistanceToNow } from 'date-fns';
import PageContainer from '../components/layout/PageContainer';
import { EvermarkCard } from '../components/evermark/EvermarkCard';
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

  // For now, "created" is the same as "owned" since we track ownership
  // In the future, this could be enhanced to track actual creation vs acquisition
  const createdEvermarks = ownedEvermarks;
  const bookshelfEvermarks = getBookshelfEvermarks();

  const tabs = [
    {
      id: 'owned' as TabType,
      label: 'Owned',
      icon: <BookOpenIcon className="h-4 w-4" />,
      count: ownedEvermarks.length,
      description: 'Evermarks you own'
    },
    {
      id: 'created' as TabType,
      label: 'Created',
      icon: <PlusIcon className="h-4 w-4" />,
      count: createdEvermarks.length,
      description: 'Evermarks you created'
    },
    {
      id: 'bookshelf' as TabType,
      label: 'Bookshelf',
      icon: <BookmarkIcon className="h-4 w-4" />,
      count: bookshelfStats.totalFavorites + bookshelfStats.totalCurrentReading,
      description: 'Your curated showcase'
    }
  ];

  const renderBookshelfShowcase = () => {
    if (bookshelfEvermarks.length === 0) {
      return (
        <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border-2 border-dashed border-purple-200">
          <BookmarkIcon className="mx-auto h-16 w-16 text-purple-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Showcase Your Favorites</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your bookshelf is your public showcase. Add your favorite Evermarks to share what inspires you.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/bookshelf"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Manage Bookshelf
            </Link>
            {ownedEvermarks.length > 0 && (
              <button
                onClick={() => setActiveTab('owned')}
                className="inline-flex items-center px-4 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
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
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <HeartIcon className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Favorites</h3>
              <span className="ml-auto text-sm text-gray-500">{bookshelfStats.totalFavorites}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookshelfEvermarks
                .filter(item => item.category === 'favorite')
                .slice(0, 6)
                .map(({ evermark, bookshelfItem }) => (
                  <div key={evermark.id} className="relative group">
                    <div className="absolute top-2 right-2 z-10 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      <HeartIcon className="h-3 w-3 mr-1" />
                      Favorite
                    </div>
                    <EvermarkCard 
                      evermark={evermark} 
                      isCompact={true}
                      showActions={false}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Currently Reading Section */}
        {bookshelfData.currentReading.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <BookOpenIcon className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Currently Reading</h3>
              <span className="ml-auto text-sm text-gray-500">{bookshelfStats.totalCurrentReading}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookshelfEvermarks
                .filter(item => item.category === 'currentReading')
                .slice(0, 4)
                .map(({ evermark, bookshelfItem }) => (
                  <div key={evermark.id} className="relative group">
                    <div className="absolute top-2 right-2 z-10 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      <BookOpenIcon className="h-3 w-3 mr-1" />
                      Reading
                    </div>
                    <EvermarkCard 
                      evermark={evermark} 
                      isCompact={true}
                      showActions={false}
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
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'owned' ? 'No Evermarks Owned' : 'No Evermarks Created'}
          </h3>
          <p className="text-gray-600 mb-4">
            {activeTab === 'owned' 
              ? 'You don\'t own any Evermarks yet. Create your first one!'
              : 'You haven\'t created any Evermarks yet. Share your first piece of content!'
            }
          </p>
          <Link
            to="/create"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
              isCompact={true}
              showDescription={false}
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
          />
        ))}
      </div>
    );
  };

  return (
    <PageContainer>
      <ContractRequired fallback={
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet to View Collection</h3>
          <p className="text-gray-600">Connect your wallet to see your Evermarks and manage your bookshelf</p>
        </div>
      }>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={cn("font-serif font-bold text-gray-900", textSizes.responsive['xl-2xl-3xl'])}>
                My Collection
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your Evermarks and showcase your favorites
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              {activeTab !== 'bookshelf' && (
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded transition-colors",
                      viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <GridIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded transition-colors",
                      viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <ListIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              {/* Create Button */}
              <Link
                to="/create"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span className={cn(
                    "px-2 py-1 text-xs rounded-full",
                    activeTab === tab.id 
                      ? 'bg-purple-100 text-purple-600' 
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-96">
            {isLoadingOwned ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your collection...</p>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{ownedEvermarks.length}</div>
                  <div className="text-sm text-gray-600">Total Owned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{bookshelfStats.totalFavorites}</div>
                  <div className="text-sm text-gray-600">Favorites</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{bookshelfStats.totalCurrentReading}</div>
                  <div className="text-sm text-gray-600">Reading</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {primaryAddress ? `${primaryAddress.slice(0, 4)}...${primaryAddress.slice(-4)}` : '0'}
                  </div>
                  <div className="text-sm text-gray-600">Address</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ContractRequired>
    </PageContainer>
  );
};

export default MyEvermarksPage;