import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, GridIcon, ListIcon, UserIcon, ZapIcon, SortAscIcon, ClockIcon, CalendarIcon } from 'lucide-react';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { PublicEvermarkCard } from '../components/evermark/PublicEvermarkCard';
import { cn, useIsMobile } from '../utils/responsive';

const UserCreatedEvermarksPage: React.FC = () => {
  const { address: profileAddress } = useParams<{ address: string }>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const isMobile = useIsMobile();
  
  const { evermarks: allEvermarks, isLoading } = useUserEvermarks(profileAddress);
  
  // Filter to only evermarks created by this user
  const userCreatedEvermarks = useMemo(() => {
    return allEvermarks.filter(evermark => 
      evermark.creator?.toLowerCase() === profileAddress?.toLowerCase()
    );
  }, [allEvermarks, profileAddress]);
  
  // Sort evermarks
  const sortedEvermarks = useMemo(() => {
    const sorted = [...userCreatedEvermarks];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.creationTime).getTime() - new Date(b.creationTime).getTime());
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  }, [userCreatedEvermarks, sortBy]);

  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: <ClockIcon className="h-4 w-4" /> },
    { value: 'oldest', label: 'Oldest First', icon: <CalendarIcon className="h-4 w-4" /> },
    { value: 'title', label: 'Title A-Z', icon: <SortAscIcon className="h-4 w-4" /> },
  ];

  if (!profileAddress) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center max-w-md mx-4">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">User Not Found</h3>
          <p className="text-gray-400">The user address is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cyber Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-green-400/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <ZapIcon className="h-8 w-8 text-green-400" />
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent">
                CREATED EVERMARKS
              </h1>
            </div>
            <p className="text-gray-300">
              All Evermarks created by {profileAddress.slice(0, 8)}...{profileAddress.slice(-6)}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header with controls */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center">
                <Link
                  to={`/${profileAddress}`}
                  className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mr-4 transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-1" />
                  Back to Profile
                </Link>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {userCreatedEvermarks.length} Evermark{userCreatedEvermarks.length !== 1 ? 's' : ''} Created
                  </h2>
                  <p className="text-gray-400 text-sm">
                    By {profileAddress.slice(0, 8)}...{profileAddress.slice(-6)}
                  </p>
                </div>
              </div>
              
              {/* View Controls */}
              <div className="flex items-center space-x-4">
                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                {/* View Mode Toggle */}
                <div className="flex bg-gray-700 border border-gray-600 rounded-lg overflow-hidden">
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
              </div>
            </div>
          </div>

          {/* Evermarks Grid/List */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-700 rounded-lg h-64 animate-pulse"></div>
                ))}
              </div>
            ) : sortedEvermarks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Evermarks Found</h3>
                <p className="text-gray-400">This user hasn't created any Evermarks yet.</p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {sortedEvermarks.map(evermark => (
                  <PublicEvermarkCard
                    key={evermark.id}
                    evermark={evermark}
                    viewMode={viewMode}
                    showCreator={false}
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

export default UserCreatedEvermarksPage;