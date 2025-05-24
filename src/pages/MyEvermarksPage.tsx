import React, { useState } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { BookmarkIcon, PlusIcon, ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import { useUserEvermarks } from '../hooks/useEvermarks';

// Individual Evermark Card Component
const EvermarkCard: React.FC<{ evermark: any }> = ({ evermark }) => {
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
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
    >
      {/* Image section - takes up about 1/3 of the card height */}
      <div className="w-full h-32 bg-gray-100 overflow-hidden">
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
          </div>
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Content section - 2/3 of the card */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
          {evermark.title}
        </h3>
        <p className="text-sm text-gray-600 mb-3">by {evermark.author}</p>
        
        {evermark.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {evermark.description}
          </p>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {new Date(evermark.creationTime).toLocaleDateString()}
          </span>
          <BookmarkIcon className="h-4 w-4 text-purple-600" />
        </div>
      </div>
    </Link>
  );
};

const MyEvermarksPage: React.FC = () => {
  const account = useActiveAccount();
  const { evermarks, isLoading, error } = useUserEvermarks(account?.address);

  return (
    <PageContainer title="My Collection">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Your personal library of Evermarks</p>
          <Link
            to="/create"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add New
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="w-full h-32 bg-gray-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
            <div className="text-center py-4">
              <p className="text-red-600">Error: {error}</p>
            </div>
          </div>
        ) : evermarks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <BookmarkIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Evermarks Yet</h3>
              <p className="text-gray-600 mb-6">Start building your collection by creating your first Evermark or by voting on someone else's</p>
              <Link
                to="/create"
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Your First Evermark
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                {evermarks.length} Evermark{evermarks.length !== 1 ? 's' : ''}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {evermarks.map(evermark => (
                <EvermarkCard key={evermark.id} evermark={evermark} />
              ))}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default MyEvermarksPage;