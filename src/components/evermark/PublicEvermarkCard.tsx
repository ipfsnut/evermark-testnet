import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ImageIcon, 
  UserIcon, 
  BookmarkIcon, 
  ExternalLinkIcon,
  ClockIcon 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PublicEvermarkCardProps {
  evermark: any;
  viewMode?: 'grid' | 'list';
  showCreator?: boolean;
  category?: 'favorite' | 'reading' | 'created';
}

export const PublicEvermarkCard: React.FC<PublicEvermarkCardProps> = ({ 
  evermark, 
  viewMode = 'grid',
  showCreator = false,
  category 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const categoryConfig = {
    favorite: { icon: '❤️', label: 'Favorite', color: 'bg-red-100 text-red-600' },
    reading: { icon: '📖', label: 'Reading', color: 'bg-blue-100 text-blue-600' },
    created: { icon: '✨', label: 'Created', color: 'bg-green-100 text-green-600' }
  };

  if (viewMode === 'list') {
    return (
      <Link 
        to={`/evermark/${evermark.id}`} 
        className="flex bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group p-4"
      >
        {/* List view image */}
        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mr-4">
          {evermark.image && !imageError ? (
            <img
              src={evermark.image}
              alt={evermark.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* List view content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 mb-1 group-hover:text-purple-600 transition-colors truncate">
                {evermark.title}
              </h3>
              
              <div className="text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-3 w-3" />
                  <span>by {evermark.author}</span>
                  <span className="text-gray-400">•</span>
                  <ClockIcon className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(evermark.creationTime), { addSuffix: true })}</span>
                </div>
              </div>

              {evermark.description && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {evermark.description}
                </p>
              )}
            </div>

            {category && (
              <span className={`ml-4 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${categoryConfig[category].color}`}>
                {categoryConfig[category].icon} {categoryConfig[category].label}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Grid view (default)
  return (
    <Link 
      to={`/evermark/${evermark.id}`} 
      className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group relative"
    >
      {/* Category badge */}
      {category && (
        <div className="absolute top-2 right-2 z-10">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryConfig[category].color}`}>
            {categoryConfig[category].icon} {categoryConfig[category].label}
          </span>
        </div>
      )}

      {/* Grid view image */}
      <div className="w-full h-32 bg-gray-100 overflow-hidden relative">
        {evermark.image && !imageError ? (
          <div className="relative w-full h-full">
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
            )}
            <img
              src={evermark.image}
              alt={evermark.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Grid view content */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
          {evermark.title}
        </h3>
        
        <div className="text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-2">
            <UserIcon className="h-3 w-3" />
            <span>by {evermark.author}</span>
            <span className="text-gray-400">•</span>
            <span>{formatDistanceToNow(new Date(evermark.creationTime), { addSuffix: true })}</span>
          </div>
          {showCreator && evermark.creator && (
            <div className="flex items-center mt-1 text-xs">
              <span className="text-gray-500">
                Created by {evermark.creator.slice(0, 6)}...{evermark.creator.slice(-4)}
              </span>
            </div>
          )}
        </div>

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