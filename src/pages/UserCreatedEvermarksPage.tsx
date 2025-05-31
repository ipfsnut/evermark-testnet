import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, GridIcon, ListIcon, UserIcon } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { PublicEvermarkCard } from '../components/evermark/PublicEvermarkCard'; // We'll create this

const UserCreatedEvermarksPage: React.FC = () => {
  const { address: profileAddress } = useParams<{ address: string }>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  
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

  if (!profileAddress) {
    return (
      <PageContainer title="User Not Found">
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">User Not Found</h3>
          <p className="text-gray-600">The user address is invalid.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Evermarks by ${profileAddress.slice(0, 6)}...${profileAddress.slice(-4)}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                to={`/${profileAddress}`}
                className="inline-flex items-center text-purple-600 hover:text-purple-700 mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to Profile
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  All Evermarks by {profileAddress.slice(0, 6)}...{profileAddress.slice(-4)}
                </h1>
                <p className="text-gray-600">
                  {userCreatedEvermarks.length} Evermark{userCreatedEvermarks.length !== 1 ? 's' : ''} created
                </p>
              </div>
            </div>
            
            {/* View Controls */}
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title A-Z</option>
              </select>
              
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <GridIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Evermarks Grid/List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
              ))}
            </div>
          ) : sortedEvermarks.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Evermarks Found</h3>
              <p className="text-gray-600">This user hasn't created any Evermarks yet.</p>
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
    </PageContainer>
  );
};

export default UserCreatedEvermarksPage;