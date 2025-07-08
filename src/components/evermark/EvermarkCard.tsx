// src/components/evermark/EvermarkCard.tsx - ✅ ENHANCED with UniversalImage and improved styling
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkIcon, UserIcon, CalendarIcon, MessageCircleIcon, EyeIcon, ExternalLinkIcon } from 'lucide-react';
import { Evermark } from '../../hooks/useEvermarks';
import { useViewTracking, formatViewCount } from '../../hooks/useViewTracking';
import { cn, useIsMobile, touchFriendly, textSizes, spacing } from '../../utils/responsive';
import { ShareButton } from '../sharing/ShareButton';
import { QuickBookshelfButton } from '../bookshelf/FloatingBookshelfWidget';
import { useProfile } from '../../hooks/useProfile';
import { UniversalImage, EvermarkImage } from '../layout/UniversalImage';

interface EvermarkCardProps {
  evermark: Evermark;
  variant?: 'default' | 'compact' | 'featured' | 'minimal';
  showDescription?: boolean;
  showImage?: boolean;
  showActions?: boolean;
  showViews?: boolean;
  showMetadata?: boolean;
  priority?: boolean; // For above-the-fold images
  className?: string;
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
  variant = 'default',
  showDescription = true,
  showImage = true,
  showActions = true,
  showViews = true,
  showMetadata = true,
  priority = false,
  className = ''
}: EvermarkCardProps) {
  const { id, title, author, description, creationTime } = evermark;
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

  // Variant-specific configurations
  const variantConfig = {
    default: {
      container: 'flex flex-col h-full',
      imageAspect: 'video' as const,
      imageHeight: 'h-48 sm:h-56',
      showFullMetadata: true,
      padding: 'p-4 sm:p-5',
    },
    compact: {
      container: 'flex flex-row h-24 sm:h-28',
      imageAspect: 'square' as const,
      imageHeight: 'w-20 h-20 sm:w-24 sm:h-24',
      showFullMetadata: false,
      padding: 'p-3 sm:p-4',
    },
    featured: {
      container: 'flex flex-col h-full',
      imageAspect: 'wide' as const,
      imageHeight: 'h-64 sm:h-72 lg:h-80',
      showFullMetadata: true,
      padding: 'p-6 sm:p-8',
    },
    minimal: {
      container: 'flex flex-col h-full',
      imageAspect: 'photo' as const,
      imageHeight: 'h-40 sm:h-48',
      showFullMetadata: false,
      padding: 'p-3 sm:p-4',
    },
  };

  const config = variantConfig[variant];

  // ✅ COMPACT VIEW for mobile/list layouts
  if (variant === 'compact' || (isMobile && variant === 'default')) {
    return (
      <div className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 overflow-hidden group",
        touchFriendly.card,
        className
      )}>
        <div className={config.container}>
          {/* Image section */}
          {showImage && (
            <div className={cn("flex-shrink-0 relative", config.imageHeight)}>
              <EvermarkImage
                src={displayImage}
                alt={displayTitle}
                aspectRatio={config.imageAspect}
                rounded="none"
                priority={priority}
                className="group-hover:scale-105 transition-transform duration-300"
                containerClassName="rounded-l-lg"
              />
              
              {/* Platform badge */}
              {isFarcasterCast() && (
                <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-sm">
                  <MessageCircleIcon className="h-3 w-3 mr-1" />
                  Cast
                </div>
              )}
            </div>
          )}
          
          {/* Content section */}
          <div className={cn("flex-1 min-w-0 flex flex-col justify-between", config.padding)}>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <Link 
                  to={`/evermark/${id}`}
                  className={cn(
                    "font-semibold text-gray-900 hover:text-purple-600 transition-colors line-clamp-2 flex-1 pr-2",
                    textSizes.responsive['sm-base-lg']
                  )}
                  title={displayTitle}
                >
                  {displayTitle}
                </Link>
                
                {/* Actions */}
                {showActions && (
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <QuickBookshelfButton 
                      evermarkId={id} 
                      userAddress={primaryAddress}
                      size="sm"
                      variant="icon"
                    />
                    <ShareButton 
                      evermarkId={id}
                      title={displayTitle}
                      description={displayDescription}
                      author={author}
                      variant="icon"
                      size="sm"
                    />
                  </div>
                )}
              </div>
              
              {/* Metadata */}
              {showMetadata && (
                <div className="flex items-center text-xs text-gray-600 mb-1 space-x-3">
                  <div className="flex items-center min-w-0">
                    <UserIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{author}</span>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    <span>{getRelativeTime(creationTime)}</span>
                  </div>
                </div>
              )}
              
              {/* Views */}
              {showViews && viewStats && viewStats.totalViews > 0 && (
                <div className="flex items-center text-xs text-gray-500">
                  <EyeIcon className="h-3 w-3 mr-1" />
                  <span>{formatViewCount(viewStats.totalViews)} views</span>
                </div>
              )}
            </div>
            
            {/* Farcaster cast preview */}
            {showDescription && isFarcasterCast() && metadata?.farcaster_data?.content && (
              <div className="mt-2 text-xs text-gray-600 italic line-clamp-2 bg-purple-50 rounded px-2 py-1">
                "{metadata.farcaster_data.content}"
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // ✅ FULL CARD VIEW for desktop/grid layouts
  return (
    <div className={cn(
      "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-purple-300 group h-full flex flex-col",
      touchFriendly.card,
      className
    )}>
      {/* Image section */}
      {showImage && (
        <div className={cn("relative", config.imageHeight)}>
          <EvermarkImage
            src={displayImage}
            alt={displayTitle}
            aspectRatio={config.imageAspect}
            rounded="none"
            priority={priority}
            overlay={showActions}
            overlayContent={
              showActions ? (
                <div className="flex space-x-2">
                  <QuickBookshelfButton 
                    evermarkId={id} 
                    userAddress={primaryAddress}
                    variant="icon"
                  />
                  <ShareButton 
                    evermarkId={id}
                    title={displayTitle}
                    description={displayDescription}
                    author={author}
                    variant="icon"
                  />
                </div>
              ) : undefined
            }
            className="group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Platform badge */}
          {isFarcasterCast() && (
            <div className="absolute top-3 right-3 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center shadow-lg">
              <MessageCircleIcon className="h-4 w-4 mr-1" />
              Farcaster
            </div>
          )}
          
          {/* Views badge */}
          {showViews && viewStats && viewStats.totalViews > 0 && (
            <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
              <EyeIcon className="h-3 w-3 mr-1" />
              {formatViewCount(viewStats.totalViews)}
            </div>
          )}
        </div>
      )}
      
      {/* Content section */}
      <div className={cn("flex-1 flex flex-col", config.padding)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-serif font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors",
              textSizes.responsive['lg-xl-2xl']
            )}>
              <Link to={`/evermark/${id}`}>
                {displayTitle}
              </Link>
            </h3>
          </div>
          
          {!showImage && (
            <div className="bg-purple-100 rounded-full p-2 ml-3 flex-shrink-0">
              <BookmarkIcon className="h-5 w-5 text-purple-600" />
            </div>
          )}
        </div>
        
        {/* Metadata */}
        {showMetadata && config.showFullMetadata && (
          <div className="flex items-center text-sm text-gray-600 mb-3 flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center">
              <UserIcon className="h-4 w-4 mr-1" />
              <span className="font-medium">{author}</span>
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
        )}
        
        {/* Description or cast content */}
        {showDescription && displayDescription && (
          <div className="flex-1 mb-4">
            {isFarcasterCast() ? (
              <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-400">
                <p className="text-gray-700 line-clamp-3 italic text-sm">
                  "{displayDescription}"
                </p>
                {metadata?.farcaster_data?.author && (
                  <p className="text-xs text-purple-600 mt-2 font-medium">
                    — @{metadata.farcaster_data.author}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-700 line-clamp-3 text-sm leading-relaxed">
                {displayDescription}
              </p>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100">
          <Link 
            to={`/evermark/${id}`}
            className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            View Details
            <ExternalLinkIcon className="h-3 w-3 ml-1" />
          </Link>
          
          {showActions && !showImage && (
            <div className="flex items-center space-x-2">
              <QuickBookshelfButton 
                evermarkId={id} 
                userAddress={primaryAddress}
                size="sm"
                variant="icon"
              />
              <ShareButton 
                evermarkId={id}
                title={displayTitle}
                description={displayDescription}
                author={author}
                variant="icon"
                size="sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}