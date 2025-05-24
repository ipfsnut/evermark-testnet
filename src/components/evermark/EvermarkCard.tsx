import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkIcon, UserIcon, CalendarIcon, ImageIcon } from 'lucide-react';
import { Evermark } from '../../hooks/useEvermarks';

interface EvermarkCardProps {
  evermark: Evermark;
  isCompact?: boolean;
}

export function EvermarkCard({ evermark, isCompact = false }: EvermarkCardProps) {
  const { id, title, author, description, image, creator, creationTime } = evermark;
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Format relative time
  const getRelativeTime = (timestamp: number) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDiff = Math.round((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
    return rtf.format(daysDiff, 'day');
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };
  
  if (isCompact) {
    return (
      <Link to={`/evermark/${id}`} className="block">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-purple-300 transition-colors overflow-hidden">
          <div className="flex">
            {/* Image section - 1/3 width */}
            <div className="w-1/3 h-24 bg-gray-100 flex-shrink-0">
              {image && !imageError ? (
                <div className="relative w-full h-full">
                  {imageLoading && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-l-lg"></div>
                  )}
                  <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover rounded-l-lg"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-l-lg">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Content section - 2/3 width */}
            <div className="flex-1 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 truncate pr-2" title={title}>
                  {title}
                </h3>
                <span className="text-xs text-gray-500 flex-shrink-0">{getRelativeTime(creationTime)}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <UserIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{author}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Image section */}
      {image && !imageError && (
        <div className="w-full h-48 bg-gray-100">
          {imageLoading && (
            <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
          )}
          <img
            src={image}
            alt={title}
            className={`w-full h-48 object-cover ${imageLoading ? 'hidden' : 'block'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      )}
      
      {/* Content section */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-serif font-semibold text-gray-900 mb-2 flex-1">
            <Link to={`/evermark/${id}`} className="hover:text-purple-600 transition-colors">
              {title}
            </Link>
          </h3>
          <div className="bg-purple-100 rounded-full p-2 ml-3 flex-shrink-0">
            <BookmarkIcon className="h-5 w-5 text-purple-600" />
          </div>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <UserIcon className="h-4 w-4 mr-1" />
          <span className="mr-4">{author}</span>
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span>{getRelativeTime(creationTime)}</span>
        </div>
        
        {description && (
          <p className="text-gray-700 mb-4 line-clamp-3">
            {description}
          </p>
        )}
        
        <div className="flex justify-between items-center">
          <Link 
            to={`/evermark/${id}`}
            className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            View Details
          </Link>
          
          <div className="text-xs text-gray-500 flex items-center">
            <span className="hidden sm:inline">ID: {id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}