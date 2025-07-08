// src/components/evermark/EvermarkDetail.tsx - ✅ COMPLETE from scratch
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  BookmarkIcon, 
  UserIcon, 
  CalendarIcon, 
  ExternalLinkIcon, 
  ArrowLeftIcon, 
  ShieldIcon, 
  EyeIcon,
  MessageCircleIcon,
  ImageIcon,
  TagIcon,
  LinkIcon,
  FileTextIcon,
  ClockIcon,
  HeartIcon,
  VoteIcon
} from 'lucide-react';
import { useEvermarkDetail } from '../../hooks/useEvermarks';
import { useViewTracking, formatViewCount } from '../../hooks/useViewTracking';
import { ShareButton } from '../sharing/ShareButton';
import { VotingPanel } from '../voting/VotingPanel';
import { QuickBookshelfButton, BookshelfStatusBadge } from '../bookshelf/FloatingBookshelfWidget';
import { useProfile } from '../../hooks/useProfile';
import { cn, useIsMobile, textSizes, spacing } from '../../utils/responsive';
import PageContainer from '../layout/PageContainer';
import { ContractRequired } from '../auth/AuthGuard';

interface EvermarkDetailProps {
  id?: string;
}

interface EnhancedMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  farcaster_data?: {
    content?: string;
    author?: string;
    timestamp?: number;
    platform?: string;
  };
  tags?: string[];
  contentType?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export function EvermarkDetail({ id: propId }: EvermarkDetailProps) {
  const params = useParams();
  const id = propId || params.id || '';
  const { evermark, isLoading, error } = useEvermarkDetail(id);
  const { primaryAddress, isAuthenticated } = useProfile();
  const isMobile = useIsMobile();
  
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [enhancedMetadata, setEnhancedMetadata] = useState<EnhancedMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  
  // Track views for this Evermark
  const { viewStats, isLoading: isLoadingViews } = useViewTracking(id);
  
  // Fetch enhanced metadata from IPFS
  useEffect(() => {
    let isMounted = true;
    
    const fetchEnhancedMetadata = async () => {
      if (!evermark?.metadataURI?.startsWith('ipfs://')) {
        setMetadataLoading(false);
        return;
      }
      
      try {
        const ipfsHash = evermark.metadataURI.replace('ipfs://', '');
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, {
          cache: 'force-cache',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to fetch metadata');
        
        const metadata = await response.json();
        if (isMounted) {
          setEnhancedMetadata(metadata);
        }
      } catch (error) {
        console.error('Error fetching enhanced metadata:', error);
      } finally {
        if (isMounted) {
          setMetadataLoading(false);
        }
      }
    };
    
    fetchEnhancedMetadata();
    return () => { isMounted = false; };
  }, [evermark?.metadataURI]);
  
  // Format date helper
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp: number) => {
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
  
  // Get enhanced display data
  const displayImage = enhancedMetadata?.image || evermark?.image || '';
  const displayTitle = enhancedMetadata?.name || evermark?.title || 'Untitled Evermark';
  const displayDescription = enhancedMetadata?.farcaster_data?.content || 
                             enhancedMetadata?.description || 
                             evermark?.description || '';
  const displaySourceUrl = enhancedMetadata?.external_url || evermark?.sourceUrl || '';
  
  const isFarcasterCast = () => !!(enhancedMetadata?.farcaster_data || 
    displaySourceUrl?.includes('farcaster') || 
    displayDescription?.includes('Farcaster'));
    
  if (isLoading) {
    return (
      <PageContainer>
        <div className="mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <div className="animate-pulse space-y-6">
          <div className="w-full h-48 md:h-64 lg:h-80 bg-gray-200 rounded-lg"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </PageContainer>
    );
  }
  
  if (error || !evermark) {
    return (
      <PageContainer>
        <div className="mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <BookmarkIcon className="mx-auto h-12 w-12 text-red-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Error Loading Evermark</h2>
          <p className="text-gray-600">{error || "This Evermark could not be found"}</p>
        </div>
      </PageContainer>
    );
  }
  
  const isOwner = Boolean(primaryAddress && primaryAddress.toLowerCase() === evermark.creator.toLowerCase());
  
  return (
    <PageContainer>
      {/* Navigation */}
      <div className="mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
      </div>
      
      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        {/* Hero Image Section */}
        {displayImage && !imageError && (
          <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96 bg-gray-100 relative overflow-hidden">
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
            )}
            <img
              src={displayImage}
              alt={displayTitle}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                imageLoading ? 'opacity-0' : 'opacity-100'
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            
            {/* Title overlay */}
            <div className={cn("absolute bottom-4 left-4 right-4 text-white", spacing.responsive['sm-md-lg'])}>
              <h1 className={cn(
                "font-serif font-bold mb-2 drop-shadow-lg",
                textSizes.responsive['xl-2xl-3xl']
              )}>
                {displayTitle}
              </h1>
              <div className="flex items-center text-sm md:text-base">
                <UserIcon className="h-4 w-4 mr-1" />
                <span>by {evermark.author}</span>
                <span className="mx-2">•</span>
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>{formatRelativeTime(evermark.creationTime)}</span>
              </div>
            </div>
            
            {/* Platform indicator */}
            {isFarcasterCast() && (
              <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <MessageCircleIcon className="h-4 w-4 mr-1" />
                Farcaster
              </div>
            )}
          </div>
        )}
        
        {/* Content Section */}
        <div className={spacing.responsive['md-lg-xl']}>
          {/* Title and meta info (if no image) */}
          {(!displayImage || imageError) && (
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className={cn(
                    "font-serif font-bold text-gray-900 mb-3",
                    textSizes.responsive['xl-2xl-3xl']
                  )}>
                    {displayTitle}
                  </h1>
                  <div className="flex flex-wrap items-center text-sm text-gray-600 gap-4">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      <span>{evermark.author}</span>
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span>{formatRelativeTime(evermark.creationTime)}</span>
                    </div>
                    {isFarcasterCast() && (
                      <div className="flex items-center">
                        <MessageCircleIcon className="h-4 w-4 mr-1 text-purple-600" />
                        <span className="text-purple-600 font-medium">Farcaster Cast</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-purple-100 rounded-full p-3 ml-4">
                  <BookmarkIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          )}
          
          {/* Meta Information Bar */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span>{formatDate(evermark.creationTime)}</span>
                </div>
                
                {/* View Counter */}
                <div className="flex items-center">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  <span>
                    {isLoadingViews ? "..." : viewStats ? formatViewCount(viewStats.totalViews) : "0"} views
                  </span>
                </div>
                
                {evermark.metadataURI && (
                  <div className="flex items-center">
                    <FileTextIcon className="h-4 w-4 mr-1" />
                    <a 
                      href={evermark.metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline"
                    >
                      Metadata
                    </a>
                  </div>
                )}
                
                {displaySourceUrl && (
                  <div className="flex items-center">
                    <LinkIcon className="h-4 w-4 mr-1" />
                    <a 
                      href={displaySourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline truncate max-w-xs"
                    >
                      Source
                    </a>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {isAuthenticated && (
                  <QuickBookshelfButton 
                    evermarkId={evermark.id}
                    userAddress={primaryAddress}
                    variant="button"
                  />
                )}
                <ShareButton 
                  evermarkId={evermark.id}
                  title={displayTitle}
                  description={displayDescription}
                  author={evermark.author}
                />
              </div>
            </div>
          </div>
          
          {/* Bookshelf Status Badge */}
          {isAuthenticated && (
            <div className="mb-6">
              <BookshelfStatusBadge 
                evermarkId={evermark.id}
                userAddress={primaryAddress}
              />
            </div>
          )}
          
          {/* View Stats */}
          {viewStats && viewStats.totalViews > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center mb-3">
                <EyeIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-sm font-medium text-blue-800">📊 Engagement Stats</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="text-center sm:text-left">
                  <div className="text-2xl font-bold text-blue-700">{formatViewCount(viewStats.totalViews)}</div>
                  <div className="text-blue-600">Total Views</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-2xl font-bold text-blue-700">{formatViewCount(viewStats.viewsToday)}</div>
                  <div className="text-blue-600">Today</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-2xl font-bold text-blue-700">{formatViewCount(viewStats.viewsThisWeek)}</div>
                  <div className="text-blue-600">This Week</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Content Display */}
          {displayDescription && (
            <div className="mb-6">
              {isFarcasterCast() ? (
                <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400">
                  <div className="flex items-center mb-3">
                    <MessageCircleIcon className="h-5 w-5 text-purple-600 mr-2" />
                    <h3 className="text-lg font-medium text-purple-900">Farcaster Cast Content</h3>
                  </div>
                  <blockquote className="text-gray-800 italic text-base leading-relaxed">
                    "{displayDescription}"
                  </blockquote>
                  {enhancedMetadata?.farcaster_data?.author && (
                    <div className="mt-3 text-sm text-purple-700">
                      — @{enhancedMetadata.farcaster_data.author}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <p className="whitespace-pre-line leading-relaxed">
                      {displayDescription}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Enhanced Metadata Display */}
          {enhancedMetadata && (
            <div className="mb-6 space-y-4">
              {/* Tags */}
              {enhancedMetadata.tags && enhancedMetadata.tags.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <TagIcon className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">Tags</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {enhancedMetadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Content Type and Attributes */}
              {(enhancedMetadata.contentType || enhancedMetadata.attributes) && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Metadata</h3>
                  <div className="space-y-2 text-sm">
                    {enhancedMetadata.contentType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Content Type:</span>
                        <span className="font-medium">{enhancedMetadata.contentType}</span>
                      </div>
                    )}
                    {enhancedMetadata.attributes?.map((attr, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{attr.trait_type}:</span>
                        <span className="font-medium">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Blockchain Verification */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center mb-3">
              <ShieldIcon className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-green-800">Blockchain Verification</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-600">Token ID:</span>
                <span className="font-mono font-medium">{evermark.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">Creator:</span>
                <span className="font-mono text-xs break-all">{evermark.creator}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">Created:</span>
                <span className="font-medium">{formatDate(evermark.creationTime)}</span>
              </div>
              {isOwner && (
                <div className="mt-3 p-2 bg-green-100 rounded border border-green-300">
                  <div className="flex items-center">
                    <HeartIcon className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-green-700 font-medium">You are the creator of this Evermark</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* IPFS Storage Info */}
          {evermark.metadataURI && evermark.metadataURI.startsWith('ipfs://') && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center mb-3">
                <FileTextIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-blue-800">Decentralized Storage</h4>
              </div>
              <p className="text-blue-700 text-sm mb-3">
                This content is permanently stored on IPFS (InterPlanetary File System) and referenced on the blockchain, 
                ensuring it remains accessible and tamper-proof forever.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={evermark.metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <ExternalLinkIcon className="h-4 w-4 mr-1" />
                  View Raw Metadata
                </a>
                <a
                  href={`https://ipfs.io/ipfs/${evermark.metadataURI.replace('ipfs://', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <ExternalLinkIcon className="h-4 w-4 mr-1" />
                  IPFS Gateway
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Voting Panel */}
      <div className="mb-6">
        <ContractRequired fallback={
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <VoteIcon className="mx-auto h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="text-yellow-800 font-medium mb-2">Connect Wallet to Vote</h3>
            <p className="text-yellow-700 text-sm">
              Support this Evermark by connecting your wallet and delegating voting power to earn rewards.
            </p>
          </div>
        }>
          <VotingPanel evermarkId={id} isOwner={isOwner} />
        </ContractRequired>
      </div>
    </PageContainer>
  );
}