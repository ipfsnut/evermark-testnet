// src/pages/ExplorePage.tsx - Main feed page with pagination and filtering
import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  TrendingUpIcon, 
  ClockIcon, 
  FilterIcon, 
  GridIcon,
  ListIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  SortAscIcon,
  SortDescIcon,
  XIcon,
  StarIcon,
  ImageIcon,
  CalendarIcon
} from 'lucide-react';
import { useEvermarkFeed, SortOption, FilterOption } from '../hooks/useEvermarkFeed';
import { EvermarkCard } from '../components/evermark/EvermarkCard';
import PageContainer from '../components/layout/PageContainer';

const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
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
  }, []); // Only run once on mount

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
    { value: 'recent', label: 'This Week', icon: <SortDescIcon className="h-4 w-4" /> },
    { value: 'popular', label: 'Popular', icon: <StarIcon className="h-4 w-4" /> },
  ];

  const hasActiveFilters = filters.search || filters.filter !== 'all' || filters.sort !== 'newest';

  return (
    <PageContainer title="Explore Evermarks" fullWidth>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                Explore Evermarks
              </h1>
              <p className="text-gray-600">
                Discover permanent content references from the community
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <GridIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
              
              <button
                onClick={refresh}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search evermarks, authors, or content..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center space-x-3">
              {/* Sort Dropdown */}
              <select
                value={filters.sort}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {filterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                >
                  <XIcon className="h-4 w-4 mr-1" />
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.search && (
                <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                  Search: "{filters.search}"
                  <button
                    onClick={() => handleSearch('')}
                    className="ml-1 p-0.5 hover:bg-purple-200 rounded-full"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.filter !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {filterOptions.find(f => f.value === filters.filter)?.label}
                  <button
                    onClick={() => handleFilterChange('all')}
                    className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.sort !== 'newest' && (
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  {sortOptions.find(s => s.value === filters.sort)?.label}
                  <button
                    onClick={() => handleSortChange('newest')}
                    className="ml-1 p-0.5 hover:bg-green-200 rounded-full"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} evermarks
          </div>
          <div>
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 mb-4">Error loading evermarks: {error}</p>
            <button 
              onClick={refresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="w-full h-48 bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : evermarks.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <BookOpenIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Evermarks Found</h3>
            <p className="text-gray-600 mb-6">
              {hasActiveFilters 
                ? 'Try adjusting your search or filters to find more content.'
                : 'Be the first to create an Evermark on the network!'
              }
            </p>
            <div className="flex gap-3 justify-center">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <Link
                to="/create"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Evermark
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Evermarks Grid/List */}
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }>
              {evermarks.map(evermark => (
                <EvermarkCard 
                  key={evermark.id} 
                  evermark={evermark}
                  isCompact={viewMode === 'list'}
                  showDescription={viewMode === 'grid'}
                  showActions={true}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
                            className={`px-3 py-2 rounded-lg ${
                              pageNum === pagination.page
                                ? 'bg-purple-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setPage(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {pagination.totalItems} total evermarks
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default ExplorePage;