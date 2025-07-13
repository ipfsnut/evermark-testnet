import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  SearchIcon, 
  FilterIcon, 
  GridIcon,
  ListIcon,
  XIcon,
  TrendingUpIcon,
  ClockIcon,
  SortAscIcon,
  CalendarIcon,
  ImageIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon
} from 'lucide-react';
import { useEvermarkFeed, SortOption, FilterOption } from '../hooks/useEvermarkFeed';
import { ExploreEvermarkCard } from '../components/evermark/EvermarkCard';
import { EnhancedEvermarkModal } from '../components/evermark/EnhancedEvermarkModal'; // ✅ CHANGED: Use unified modal
import { cn, useIsMobile } from '../utils/responsive';

// ✅ ADDED: Modal options interface
interface ModalOptions {
  autoExpandDelegation?: boolean;
  initialExpandedSection?: 'delegation' | 'rewards' | 'history';
}

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const isMobile = useIsMobile();
  
  // Initialize from URL params
  const initialSort = (searchParams.get('sort') as SortOption) || 'newest';
  const initialFilter = (searchParams.get('filter') as FilterOption) || 'all';
  const initialSearch = searchParams.get('search') || '';
  const initialPage = parseInt(searchParams.get('page') || '1');
  
  const {
    evermarks,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    setPage,
    refresh
  } = useEvermarkFeed();

  // ✅ CHANGED: Unified modal state management
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    evermarkId: string;
    options: ModalOptions;
  }>({
    isOpen: false,
    evermarkId: '',
    options: {}
  });

  // ✅ CHANGED: Unified modal handlers
  const handleOpenModal = (evermarkId: string, options: ModalOptions = {}) => {
    setModalState({
      isOpen: true,
      evermarkId,
      options
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      evermarkId: '',
      options: {}
    });
  };

  // ✅ REMOVED: Wemark handler no longer needed - delegation handled in modal

  // Update URL when filters change
  React.useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    
    if (filters.sort !== 'newest') newParams.set('sort', filters.sort);
    else newParams.delete('sort');
    
    if (filters.filter !== 'all') newParams.set('filter', filters.filter);
    else newParams.delete('filter');
    
    if (filters.search) newParams.set('search', filters.search);
    else newParams.delete('search');
    
    if (pagination.page > 1) newParams.set('page', pagination.page.toString());
    else newParams.delete('page');
    
    setSearchParams(newParams, { replace: true });
  }, [filters, pagination.page, searchParams, setSearchParams]);

  // Initialize filters from URL
  React.useEffect(() => {
    setFilters({
      sort: initialSort,
      filter: initialFilter,
      search: initialSearch
    });
    if (initialPage > 1) {
      setPage(initialPage);
    }
  }, []);

  const handleSearch = (searchTerm: string) => {
    setFilters({ search: searchTerm });
  };

  const handleSortChange = (sort: SortOption) => {
    setFilters({ sort });
  };

  const handleFilterChange = (filter: FilterOption) => {
    setFilters({ filter });
  };

  const clearFilters = () => {
    setFilters({
      sort: 'newest',
      filter: 'all',
      search: ''
    });
  };

  // Filter options configuration
  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'newest', label: 'Newest First', icon: <ClockIcon className="h-4 w-4" /> },
    { value: 'oldest', label: 'Oldest First', icon: <CalendarIcon className="h-4 w-4" /> },
    { value: 'mostVoted', label: 'Most Voted', icon: <TrendingUpIcon className="h-4 w-4" /> },
    { value: 'title', label: 'Title A-Z', icon: <SortAscIcon className="h-4 w-4" /> },
  ];

  const filterOptions: { value: FilterOption; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All Evermarks', icon: <BookOpenIcon className="h-4 w-4" /> },
    { value: 'hasImage', label: 'With Images', icon: <ImageIcon className="h-4 w-4" /> },
    { value: 'recent', label: 'This Week', icon: <StarIcon className="h-4 w-4" /> },
    { value: 'popular', label: 'Popular', icon: <TrendingUpIcon className="h-4 w-4" /> },
  ];

  const hasActiveFilters = filters.search || filters.filter !== 'all' || filters.sort !== 'newest';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cyber Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-cyan-400/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50">
                <GridIcon className="h-7 w-7 text-black" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-purple-500 bg-clip-text text-transparent">
                EXPLORE
              </h1>
            </div>
            
            <p className="text-gray-300 max-w-3xl mx-auto text-lg">
              Discover permanent content references from the community. Support creators with <span className="text-green-400 font-bold">$WEMARK</span> delegations.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-gray-900/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search evermarks, authors, or content..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Sort Dropdown */}
              <select
                value={filters.sort}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {/* Filter Dropdown */}
              <select
                value={filters.filter}
                onChange={(e) => handleFilterChange(e.target.value as FilterOption)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              >
                {filterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'grid' 
                      ? 'bg-cyan-600 text-black' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  )}
                >
                  <GridIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'list' 
                      ? 'bg-cyan-600 text-black' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  )}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <XIcon className="h-4 w-4" />
                  Clear
                </button>
              )}

              {/* Refresh */}
              <button
                onClick={refresh}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Refresh
              </button>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <span className="inline-flex items-center px-3 py-1 bg-purple-600/20 text-purple-400 text-sm rounded-full border border-purple-400/30">
                    Search: "{filters.search}"
                    <button
                      onClick={() => handleSearch('')}
                      className="ml-2 p-0.5 hover:bg-purple-500/30 rounded-full transition-colors"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.filter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded-full border border-blue-400/30">
                    {filterOptions.find(f => f.value === filters.filter)?.label}
                    <button
                      onClick={() => handleFilterChange('all')}
                      className="ml-2 p-0.5 hover:bg-blue-500/30 rounded-full transition-colors"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.sort !== 'newest' && (
                  <span className="inline-flex items-center px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded-full border border-green-400/30">
                    {sortOptions.find(s => s.value === filters.sort)?.label}
                    <button
                      onClick={() => handleSortChange('newest')}
                      className="ml-2 p-0.5 hover:bg-green-500/30 rounded-full transition-colors"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results and Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-400 mb-6">
          <div>
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} evermarks
          </div>
          <div>
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-8 text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-white mb-2">Error Loading Evermarks</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={refresh}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          )}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                <div className="w-full h-48 bg-gray-700 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-700 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : evermarks.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-16 text-center">
            <div className="text-6xl mb-6">🔍</div>
            <h3 className="text-xl font-medium text-white mb-4">No Evermarks Found</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              {hasActiveFilters 
                ? 'Try adjusting your search or filters to find more content.'
                : 'Be the first to create an Evermark on the network!'
              }
            </p>
            <div className="flex gap-4 justify-center">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <a
                href="/create"
                className="bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold px-6 py-3 rounded-lg hover:from-cyan-300 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/30"
              >
                Create Evermark
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Evermarks Grid/List */}
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            )}>
              {evermarks.map(evermark => (
                <ExploreEvermarkCard 
                  key={evermark.id} 
                  evermark={evermark}
                  compact={viewMode === 'list'}
                  onOpenModal={handleOpenModal} // ✅ CHANGED: Use unified modal handler only
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mt-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-white transition-colors"
                    >
                      <ChevronLeftIcon className="h-4 w-4 mr-1" />
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={cn(
                              "px-3 py-2 rounded-lg transition-colors",
                              pageNum === pagination.page
                                ? 'bg-cyan-600 text-black font-bold'
                                : 'bg-gray-700 border border-gray-600 hover:bg-gray-600 text-white'
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setPage(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-white transition-colors"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    {pagination.totalItems} total evermarks
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ✅ CHANGED: Use EnhancedEvermarkModal instead of EvermarkDetailModal */}
      {modalState.isOpen && (
        <EnhancedEvermarkModal
          evermarkId={modalState.evermarkId}
          isOpen={modalState.isOpen}
          onClose={handleCloseModal}
          autoExpandDelegation={modalState.options.autoExpandDelegation}
          initialExpandedSection={modalState.options.initialExpandedSection}
        />
      )}
    </div>
  );
}