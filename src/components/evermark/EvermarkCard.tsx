// src/components/evermark/EvermarkCard.tsx - ✅ ENHANCED with mobile optimization
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkIcon, UserIcon, CalendarIcon, ImageIcon, MessageCircleIcon, EyeIcon } from 'lucide-react';
import { Evermark } from '../../hooks/useEvermarks';
import { useViewTracking, formatViewCount } from '../../hooks/useViewTracking';
import { cn, useIsMobile, touchFriendly, textSizes, spacing } from '../../utils/responsive';
import { ShareButton } from '../sharing/ShareButton';
import { QuickBookshelfButton } from '../bookshelf/FloatingBookshelfWidget';
import { useProfile } from '../../hooks/useProfile';

interface EvermarkCardProps {
  evermark: Evermark;
  isCompact?: boolean;
  showDescription?: boolean;
  showImage?: boolean;
  showActions?: boolean;
  showViews?: boolean;
}

// Enhanced metadata fetching with caching
const metadataCache = new Map<string, any>();

const fetchIPFSMetadata = async (metadataURI: string) => {
  const defaultReturn = { 
    name: "", 
    description: "", 
    sourceUrl: "", 
    image: "", 
    farcaster_data: null 
  };
  
  if (!metadataURI?.startsWith('ipfs://')) return defaultReturn;
  
  // Check cache first
  if (metadataCache.has(metadataURI)) {
    return metadataCache.get(metadataURI);
  }

  try {
    const ipfsHash = metadataURI.replace('ipfs://', '');
    if (ipfsHash.length < 40) return defaultReturn;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, { 
      signal: controller.signal,
      cache: 'force-cache',
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return defaultReturn;
    const data = await response.json();
    
    const result = {
      name: data.name || "",
      description: data.description || "",
      sourceUrl: data.external_url || "",
      image: data.image?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') || "",
      farcaster_data: data.farcaster_data || null
    };
    
    // Cache the result
    metadataCache.set(metadataURI, result);
    return result;
  } catch (error) {
    metadataCache.set(metadataURI, defaultReturn);
    return defaultReturn;
  }
};

export function EvermarkCard({ 
  evermark, 
  isCompact = false, 
  showDescription = true,
  showImage = true,
  showActions = true,
  showViews = true
}: EvermarkCardProps) {
  const { id, title, author, description, creationTime } = evermark;
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  
  const isMobile = useIsMobile();
  const { primaryAddress } = useProfile();
  const { viewStats } = useViewTracking(id);
  
  // Fetch metadata from IPFS
  useEffect(() => {
    let isMounted = true;
    
    const loadMetadata = async () => {
      if (evermark.metadataURI) {
        const data = await fetchIPFSMetadata(evermark.metadataURI);
        if (isMounted) {
          setMetadata(data);
          setMetadataLoading(false);
        }
      } else {
        if (isMounted) {
          setMetadataLoading(false);
        }
      }
    };
    
    loadMetadata();
    return () => { isMounted = false; };
  }, [evermark.metadataURI]);
  
  // Enhanced helper functions
  const getImageUrl = () => metadata?.image || evermark.image || '';
  const isFarcasterCast = () => !!(metadata?.farcaster_data || 
    evermark.sourceUrl?.includes('farcaster') || 
    evermark.description?.includes('Farcaster'));
  
  const displayImage = getImageUrl();
  const displayDescription = metadata?.farcaster_data?.content || metadata?.description || description;
  const displayTitle = metadata?.name || title;
  
  // Format relative time
  const getRelativeTime = (timestamp: number) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDiff = Math.round((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (Math.abs(daysDiff) < 1) return 'Today';
    if (Math.abs(daysDiff) < 7) return rtf.format(daysDiff, 'day');
    if (Math.abs(daysDiff) < 30) return rtf.format(Math.round(daysDiff / 7), 'week');
    return rtf.format(Math.round(daysDiff / 30), 'month');
  };

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };
  
  // ✅ MOBILE-OPTIMIZED: Compact view for mobile/list layouts
  if (isCompact || isMobile) {
    return (
      <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 overflow-hidden group", touchFriendly.card)}>
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
                    className="w-full h-full object-cover rounded-l-lg group-hover:scale-105 transition-transform duration-300"
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
          <div className={cn("flex-1 min-w-0", spacing.responsive['sm-md-lg'])}>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <Link 
                to={`/evermark/${id}`}
                className={cn(
                  "font-medium text-gray-900 hover:text-purple-600 transition-colors truncate pr-2 flex-1",
                  textSizes.responsive['sm-base-lg']
                )}
                title={displayTitle}
              >
                {displayTitle}
              </Link>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* View count */}
                {showViews && viewStats && (
                  <div className="flex items-center text-xs text-gray-500">
                    <EyeIcon className="h-3 w-3 mr-1" />
                    <span>{formatViewCount(viewStats.totalViews)}</span>
                  </div>
                )}
                
                {/* Actions */}
                {showActions && (
                  <div className="flex items-center space-x-1">
                    <QuickBookshelfButton 
                      evermarkId={id} 
                      userAddress={primaryAddress}
                      size="sm"
                    />
                    <ShareButton 
                      evermarkId={id}
                      title={displayTitle}
                      description={displayDescription}
                      author={author}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-1">
              <UserIcon className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate mr-2">{author}</span>
              <span className="text-gray-400">•</span>
              <span className="ml-1 flex-shrink-0">{getRelativeTime(creationTime)}</span>
            </div>
            
            {/* Show cast content preview for Farcaster */}
            {showDescription && isFarcasterCast() && metadata?.farcaster_data?.content && (
              <div className="mt-1 text-xs text-gray-600 italic line-clamp-2">
                "{metadata.farcaster_data.content}"
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // ✅ MOBILE-OPTIMIZED: Full card view for desktop/grid layouts
  return (
    <div className={cn(
      "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-purple-300 group",
      touchFriendly.card
    )}>
      {/* Image section - responsive height */}
      {showImage && (
        <div className="w-full h-32 sm:h-40 md:h-48 bg-gray-100 relative overflow-hidden">
          {displayImage && !imageError ? (
            <>
              {imageLoading && (
                <div className="w-full h-full bg-gray-200 animate-pulse"></div>
              )}
              <img
                src={displayImage}
                alt={displayTitle}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105",
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
          
          {/* Action overlay on hover */}
          {showActions && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
              <QuickBookshelfButton 
                evermarkId={id} 
                userAddress={primaryAddress}
              />
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
          {showViews && viewStats && viewStats.totalViews > 0 && (
            <div className="flex items-center">
              <EyeIcon className="h-4 w-4 mr-1" />
              <span>{formatViewCount(viewStats.totalViews)} views</span>
            </div>
          )}
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
          
          {showActions && (
            <div className="flex items-center space-x-2">
              <ShareButton 
                evermarkId={id}
                title={displayTitle}
                description={displayDescription}
                author={author}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}