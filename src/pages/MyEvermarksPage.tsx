import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMultiWalletEvermarks } from '../hooks/useMultiWalletEvermarks';
import { useWalletLinking } from '../hooks/useWalletLinking';
import { WalletManagement } from '../components/wallet/WalletManagement';
import { EvermarkCard } from '../components/evermark/EvermarkCard';
import { 
  BookmarkIcon, 
  PlusIcon, 
  WalletIcon,
  SearchIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  UserIcon,
  CalendarIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  XIcon
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';

type ViewMode = 'grid' | 'list';
type GroupBy = 'none' | 'wallet' | 'creator' | 'time';
type FilterBy = 'all' | 'wallet' | 'creator';

const MyEvermarksPage: React.FC = () => {
  const { linkedWallets, hasMultipleWallets } = useWalletLinking();
  const {
    allEvermarks,
    walletCollections,
    totalCount,
    isLoading,
    hasErrors,
    errors,
    groupByWallet,
    groupByCreator,  
    groupByTimeframe,
    statistics,
    searchEvermarks,
    filterEvermarksByWallet,
    filterEvermarksByCreator,
    refresh,
    isEmpty,
    isFullyLoaded
  } = useMultiWalletEvermarks();

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [selectedCreator, setSelectedCreator] = useState<string>('');
  const [showWalletManagement, setShowWalletManagement] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filtered and grouped data
  const filteredEvermarks = useMemo(() => {
    let evermarks = allEvermarks;

    // Apply search
    if (searchQuery.trim()) {
      evermarks = searchEvermarks(searchQuery);
    }

    // Apply filters
    if (filterBy === 'wallet' && selectedWallet) {
      evermarks = filterEvermarksByWallet(selectedWallet);
    } else if (filterBy === 'creator' && selectedCreator) {
      evermarks = filterEvermarksByCreator(selectedCreator);
    }

    return evermarks;
  }, [allEvermarks, searchQuery, filterBy, selectedWallet, selectedCreator, searchEvermarks, filterEvermarksByWallet, filterEvermarksByCreator]);

  const groupedEvermarks = useMemo(() => {
    switch (groupBy) {
      case 'wallet':
        const walletGroups: Record<string, any[]> = {};
        filteredEvermarks.forEach(evermark => {
          const walletAddr = evermark.sourceWallet;
          if (!walletGroups[walletAddr]) {
            walletGroups[walletAddr] = [];
          }
          walletGroups[walletAddr].push(evermark);
        });
        return Object.entries(walletGroups).map(([address, evermarks]) => {
          const collection = walletCollections.find(c => c.walletAddress === address);
          return {
            key: address,
            title: collection?.walletLabel || `${address.slice(0, 6)}...${address.slice(-4)}`,
            subtitle: `${evermarks.length} Evermarks`,
            evermarks,
            icon: '💼'
          };
        });

      case 'creator':
        return Object.entries(groupByCreator)
          .filter(([creator, evermarks]) => 
            filteredEvermarks.some(e => e.creator === creator)
          )
          .map(([creator, allCreatorEvermarks]) => {
            const relevantEvermarks = allCreatorEvermarks.filter(e => 
              filteredEvermarks.includes(e)
            );
            const isYou = linkedWallets.some(w => 
              w.address.toLowerCase() === creator.toLowerCase()
            );
            return {
              key: creator,
              title: isYou ? 'You' : `${creator.slice(0, 6)}...${creator.slice(-4)}`,
              subtitle: `${relevantEvermarks.length} Evermarks`,
              evermarks: relevantEvermarks,
              icon: isYou ? '👤' : '👨‍💻'
            };
          });

      case 'time':
        const timeGroups = [
          { key: 'today', title: 'Today', evermarks: groupByTimeframe.today, icon: '📅' },
          { key: 'thisWeek', title: 'This Week', evermarks: groupByTimeframe.thisWeek, icon: '📆' },
          { key: 'thisMonth', title: 'This Month', evermarks: groupByTimeframe.thisMonth, icon: '🗓️' },
          { key: 'older', title: 'Older', evermarks: groupByTimeframe.older, icon: '📜' }
        ];
        return timeGroups
          .filter(group => group.evermarks.some(e => filteredEvermarks.includes(e)))
          .map(group => ({
            ...group,
            evermarks: group.evermarks.filter(e => filteredEvermarks.includes(e)),
            subtitle: `${group.evermarks.filter(e => filteredEvermarks.includes(e)).length} Evermarks`
          }));

      default:
        return [{
          key: 'all',
          title: 'All Evermarks',
          subtitle: `${filteredEvermarks.length} total`,
          evermarks: filteredEvermarks,
          icon: '📚'
        }];
    }
  }, [groupBy, filteredEvermarks, groupByCreator, groupByTimeframe, walletCollections, linkedWallets]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterBy('all');
    setSelectedWallet('');
    setSelectedCreator('');
    setGroupBy('none');
  };

  const hasActiveFilters = searchQuery || filterBy !== 'all' || groupBy !== 'none';

  if (linkedWallets.length === 0) {
    return (
      <PageContainer title="My Collection">
        <div className="text-center py-12">
          <WalletIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Wallets Connected</h2>
          <p className="text-gray-600 mb-6">Connect or add wallets to view your Evermark collection</p>
          <button
            onClick={() => setShowWalletManagement(true)}
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <WalletIcon className="w-5 h-5 mr-2" />
            Manage Wallets
          </button>
        </div>

        {/* Wallet Management Modal */}
        {showWalletManagement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <WalletManagement />
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowWalletManagement(false)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer title="My Collection">
      <div className="space-y-6">
        {/* Collection Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <BookmarkIcon className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Evermarks</p>
                <p className="text-xl font-bold text-gray-900">{totalCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <WalletIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Linked Wallets</p>
                <p className="text-xl font-bold text-gray-900">{statistics.totalWallets}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Creators</p>
                <p className="text-xl font-bold text-gray-900">{statistics.uniqueCreators}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <TrendingUpIcon className="h-5 w-5 text-amber-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Active Wallets</p>
                <p className="text-xl font-bold text-gray-900">{statistics.walletsWithContent}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: Search and Filters */}
            <div className="flex items-center gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search evermarks..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 rounded-lg border transition-colors ${
                  showFilters ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                Filters
                <ChevronDownIcon className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Wallet Management */}
              <button
                onClick={() => setShowWalletManagement(!showWalletManagement)}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <WalletIcon className="h-4 w-4 mr-2" />
                Wallets
              </button>
            </div>

            {/* Right: View Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCwIcon className="h-4 w-4" />
              </button>

              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <GridIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>

              <Link
                to="/create"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create
              </Link>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Group By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="none">No Grouping</option>
                    {hasMultipleWallets && <option value="wallet">By Wallet</option>}
                    <option value="creator">By Creator</option>
                    <option value="time">By Time</option>
                  </select>
                </div>

                {/* Filter By Wallet */}
                {hasMultipleWallets && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Wallet</label>
                    <select
                      value={selectedWallet}
                      onChange={(e) => {
                        setSelectedWallet(e.target.value);
                        setFilterBy(e.target.value ? 'wallet' : 'all');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All Wallets</option>
                      {walletCollections.map(collection => (
                        <option key={collection.walletAddress} value={collection.walletAddress}>
                          {collection.walletLabel} ({collection.evermarks.length})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Clear Filters */}
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <XIcon className="h-4 w-4 mr-2" />
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Messages */}
        {hasErrors && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircleIcon className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">Error loading some collections</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading && !isFullyLoaded ? (
          <div className="text-center py-12">
            <RefreshCwIcon className="mx-auto h-8 w-8 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading your collections...</p>
          </div>
        ) : isEmpty ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <BookmarkIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Evermarks Found</h3>
              <p className="text-gray-600 mb-6">
                {hasActiveFilters 
                  ? "No Evermarks match your current filters. Try adjusting your search."
                  : "Start building your collection by creating your first Evermark"
                }
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mr-3"
                >
                  <XIcon className="w-4 h-4 mr-2" />
                  Clear Filters
                </button>
              ) : null}
              <Link
                to="/create"
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Evermark
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedEvermarks.map(group => (
              <div key={group.key} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {groupBy !== 'none' && (
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{group.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{group.title}</h3>
                        <p className="text-sm text-gray-600">{group.subtitle}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-6">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.evermarks.map(evermark => (
                        <EvermarkCard key={evermark.id} evermark={evermark} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {group.evermarks.map(evermark => (
                        <EvermarkCard key={evermark.id} evermark={evermark} isCompact />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Wallet Management Panel */}
        {showWalletManagement && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <WalletManagement 
              showTitle={false}
              className="border-0 shadow-none"
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default MyEvermarksPage;