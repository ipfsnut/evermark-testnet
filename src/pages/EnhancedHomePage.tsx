import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActiveAccount } from "thirdweb/react";
import { PlusIcon, BookOpenIcon, TrendingUpIcon, ExternalLinkIcon, ImageIcon, UserIcon } from 'lucide-react';
import { useEvermarks } from '../hooks/useEvermarks';
import { formatDistanceToNow, format } from 'date-fns';
import PageContainer from '../components/layout/PageContainer';

// Component for individual evermark with image
const EvermarkListItem: React.FC<{ evermark: any }> = ({ evermark }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  return (
    <Link 
      to={`/evermark/${evermark.id}`}
      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center">
        {/* Image section - 1/3 of the content area */}
        <div className="w-20 h-20 bg-gray-100 rounded-lg mr-4 flex-shrink-0 overflow-hidden">
          {evermark.image && !imageError ? (
            <div className="relative w-full h-full">
              {imageLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg"></div>
              )}
              <img
                src={evermark.image}
                alt={evermark.title}
                className="w-full h-full object-cover rounded-lg"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Content section - 2/3 of the content area */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{evermark.title}</h3>
          <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
            <UserIcon className="h-3 w-3" />
            <span>by {evermark.author}</span>
            <span className="text-gray-400">•</span>
            <span>{formatDistanceToNow(new Date(evermark.creationTime), { addSuffix: true })}</span>
          </div>
          {evermark.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{evermark.description}</p>
          )}
        </div>
        
        {/* Actions section */}
        <div className="flex items-center gap-2 ml-4">
          {evermark.metadataURI && evermark.metadataURI.startsWith('ipfs://') && (
            <a 
              href={evermark.metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          )}
          <BookOpenIcon className="h-5 w-5 text-purple-600" />
        </div>
      </div>
    </Link>
  );
};

const EnhancedHomePage: React.FC = () => {
  const account = useActiveAccount();
  const isConnected = !!account;
  const { evermarks, isLoading } = useEvermarks();

  // Static stats to prevent constant refetching
  const stats = useMemo(() => ({
    totalEvermarks: evermarks.length,
    currentCycle: 1, // Static for now to prevent auto-refresh
    activeAuctions: 0, // Static for now to prevent auto-refresh
  }), [evermarks.length]);

  // Memoize recent evermarks to prevent recalculation
  const recentEvermarks = useMemo(() => {
    return evermarks.slice(0, 5);
  }, [evermarks]);

  return (
    <PageContainer fullWidth>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <BookOpenIcon className="mx-auto h-16 w-16 text-purple-600 mb-6" />
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Welcome to Evermark
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Preserve and curate your favorite content on the blockchain
          </p>
          
          {isConnected ? (
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/create"
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Evermark
              </Link>
              <Link
                to="/my-evermarks"
                className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <BookOpenIcon className="w-5 h-5 mr-2" />
                My Collection
              </Link>
            </div>
          ) : (
            <div className="text-gray-500">
              Connect your wallet to get started
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Evermarks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : stats.totalEvermarks}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <TrendingUpIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Current Cycle</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.currentCycle}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-purple-600 font-bold">$</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Auctions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.activeAuctions}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Evermarks */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-serif font-bold text-gray-900 mb-4">Recent Evermarks</h2>
          
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center p-4 border border-gray-200 rounded-lg">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg mr-4"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : evermarks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No Evermarks yet. Create your first one to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEvermarks.map(evermark => (
                <EvermarkListItem key={evermark.id} evermark={evermark} />
              ))}
              
              {evermarks.length > 5 && (
                <div className="text-center pt-2">
                  <Link 
                    to="/my-evermarks" 
                    className="inline-flex items-center text-purple-600 hover:text-purple-700"
                  >
                    View All
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default EnhancedHomePage;