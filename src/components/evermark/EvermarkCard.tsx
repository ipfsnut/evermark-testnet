import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkIcon, UserIcon, CalendarIcon, ImageIcon, MessageCircleIcon } from 'lucide-react';
import { Evermark } from '../../hooks/useEvermarks';
import { cn, useIsMobile, touchFriendly, textSizes, spacing } from '../../utils/responsive';

interface EvermarkCardProps {
  evermark: Evermark;
  isCompact?: boolean;
  showDescription?: boolean;
  showImage?: boolean;
}

// Helper function to fetch IPFS metadata (extracted from useEvermarks.ts)
const fetchIPFSMetadata = async (metadataURI: string) => {
  const defaultReturn = { 
    name: "", 
    description: "", 
    sourceUrl: "", 
    image: "", 
    farcaster_data: null 
  };
  
  if (!metadataURI || !metadataURI.startsWith('ipfs://')) {
    return defaultReturn;
  }

  try {
    const ipfsHash = metadataURI.replace('ipfs://', '');
    
    if (ipfsHash.length < 40) {
      return defaultReturn;
    }
    
    const ipfsGatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(ipfsGatewayUrl, { 
      signal: controller.signal,
      cache: 'force-cache',
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return defaultReturn;
    }
    
    const ipfsData = await response.json();
    
    return {
      name: ipfsData.name || "",
      description: ipfsData.description || "",
      sourceUrl: ipfsData.external_url || "",
      image: ipfsData.image 
        ? ipfsData.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') 
        : "",
      farcaster_data: ipfsData.farcaster_data || null
    };
  } catch (error) {
    return defaultReturn;
  }
};

export function EvermarkCard({ 
  evermark, 
  isCompact = false, 
  showDescription = true,
  showImage = true 
}: EvermarkCardProps) {
  const { id, title, author, description, creationTime } = evermark;
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [metadata, setMetadata] = useState<{
    name: string;
    description: string;
    sourceUrl: string;
    image: string;
    farcaster_data: any;
  } | null>(null);
  
  const isMobile = useIsMobile();
  
  // Fetch metadata from IPFS
  useEffect(() => {
    if (evermark.metadataURI) {
      fetchIPFSMetadata(evermark.metadataURI).then(setMetadata);
    }
  }, [evermark.metadataURI]);
  
  // Helper functions to replace the deleted hook
  const getImageUrl = () => {
    return metadata?.image || evermark.image || '';
  };
  
  const isFarcasterCast = () => {
    return !!(metadata?.farcaster_data || 
             evermark.sourceUrl?.includes('farcaster') || 
             evermark.description?.includes('Farcaster'));
  };
  
  // Use metadata if available, fallback to contract data
  const displayImage = getImageUrl();
  const displayDescription = metadata?.farcaster_data?.content || metadata?.description || description;
  const displayTitle = metadata?.name || title;
  
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
  
  // 🎯 MOBILE-OPTIMIZED: Compact view for mobile/list layouts
  if (isCompact || isMobile) {
    return (
      <Link to={`/evermark/${id}`} className={cn("block", touchFriendly.card)}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="flex">
            {/* Image section - responsive width */}
            {showImage && (
              <div className="w-20 sm:w-24 md:w-28 h-20 sm:h-24 md:h-28 bg-gray-100 flex-shrink-0 relative">
                {displayImage && !imageError ? (
                  <div className="relative w-full h-full">
                    {imageLoading && (
                      <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-l-lg"></div>
                    )}
                    <img
                      src={displayImage}
                      alt={displayTitle}
                      className="w-full h-full object-cover rounded-l-lg"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-l-lg">
                    {isFarcasterCast() ? (
                      <MessageCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
                    ) : (
                      <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                    )}
                  </div>
                )}
                
                {/* Platform badge */}
                {isFarcasterCast() && (
                  <div className="absolute top-1 right-1 bg-purple-600 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                    🎯
                  </div>
                )}
              </div>
            )}
            
            {/* Content section - responsive padding */}
            <div className={cn("flex-1", spacing.responsive['sm-md-lg'])}>
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <h3 className={cn(
                  "font-medium text-gray-900 truncate pr-2",
                  textSizes.responsive['sm-base-lg']
                )} title={displayTitle}>
                  {displayTitle}
                </h3>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {getRelativeTime(creationTime)}
                </span>
              </div>
              
              <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-1">
                <UserIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{author}</span>
              </div>
              
              {/* Show cast content preview for Farcaster - only if there's space */}
              {showDescription && isFarcasterCast() && metadata?.farcaster_data?.content && (
                <div className="mt-1 text-xs text-gray-600 italic line-clamp-2">
                  "{metadata.farcaster_data.content}"
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }
  
  // 🎯 MOBILE-OPTIMIZED: Full card view for desktop/grid layouts
  return (
    <div className={cn(
      "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-purple-300",
      touchFriendly.card
    )}>
      {/* Image section - responsive height */}
      {showImage && (
        <div className="w-full h-32 sm:h-40 md:h-48 bg-gray-100 relative">
          {displayImage && !imageError ? (
            <>
              {imageLoading && (
                <div className="w-full h-full bg-gray-200 animate-pulse"></div>
              )}
              <img
                src={displayImage}
                alt={displayTitle}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-200 hover:scale-105",
                  imageLoading ? 'hidden' : 'block'
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              {isFarcasterCast() ? (
                <MessageCircleIcon className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-purple-400" />
              ) : (
                <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400" />
              )}
            </div>
          )}
          
          {/* Platform badge */}
          {isFarcasterCast() && (
            <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
              <MessageCircleIcon className="h-3 w-3 mr-1" />
              Farcaster
            </div>
          )}
        </div>
      )}
      
      {/* Content section - responsive padding */}
      <div className={spacing.responsive['md-lg-xl']}>
        <div className="flex items-start justify-between mb-3">
          <h3 className={cn(
            "font-serif font-semibold text-gray-900 mb-2 flex-1",
            textSizes.responsive['lg-xl-2xl']
          )}>
            <Link 
              to={`/evermark/${id}`} 
              className="hover:text-purple-600 transition-colors"
            >
              {displayTitle}
            </Link>
          </h3>
          <div className="bg-purple-100 rounded-full p-2 ml-3 flex-shrink-0">
            <BookmarkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
          </div>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 mb-3 flex-wrap gap-2 sm:gap-4">
          <div className="flex items-center">
            <UserIcon className="h-4 w-4 mr-1" />
            <span>{author}</span>
          </div>
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span>{getRelativeTime(creationTime)}</span>
          </div>
        </div>
        
        {/* Description or cast content - responsive visibility */}
        {showDescription && displayDescription && (
          <div className="mb-4">
            {isFarcasterCast() ? (
              <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-400">
                <p className="text-gray-700 line-clamp-3 italic text-sm sm:text-base">
                  "{displayDescription}"
                </p>
              </div>
            ) : (
              <p className="text-gray-700 line-clamp-3 text-sm sm:text-base">
                {displayDescription}
              </p>
            )}
          </div>
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