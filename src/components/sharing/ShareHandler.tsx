// src/components/sharing/ShareHandler.tsx - Enhanced with Neynar API
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFarcasterUser } from '../../lib/farcaster';
import { farcasterAPI, castUtils, useCastData, type FarcasterCast } from '../../lib/farcaster-api';
import { Heart, MessageCircle, Repeat, ExternalLink, Calendar, Hash } from 'lucide-react';
import sdk from '@farcaster/frame-sdk';

// Enhanced cast display component
const RichCastDisplay: React.FC<{ cast: FarcasterCast; onCreateEvermark: () => void }> = ({ 
  cast, 
  onCreateEvermark 
}) => {
  const formattedCast = castUtils.formatForDisplay(cast);
  const qualityScore = castUtils.getQualityScore(cast);
  const hashtags = castUtils.extractHashtags(cast.text);
  const urls = castUtils.extractUrls(cast.text);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Cast Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start space-x-4">
          <img 
            src={formattedCast.author.pfpUrl} 
            alt={formattedCast.author.displayName}
            className="w-12 h-12 rounded-full flex-shrink-0 bg-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${formattedCast.author.username}`;
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {formattedCast.author.displayName}
              </h3>
              <span className="text-gray-500">@{formattedCast.author.username}</span>
              {formattedCast.author.isVerified && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
              <span className="text-sm text-gray-400">FID: {formattedCast.author.fid}</span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{formattedCast.metadata.timestamp.toLocaleDateString()}</span>
              </div>
              
              {formattedCast.metadata.channel && (
                <div className="flex items-center space-x-1">
                  <Hash className="w-4 h-4" />
                  <span>/{formattedCast.metadata.channel}</span>
                </div>
              )}
              
              {formattedCast.metadata.isReply && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                  Reply
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cast Content */}
      <div className="p-6">
        <div className="prose prose-sm max-w-none mb-4">
          <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
            {formattedCast.content.mentionsFormatted}
          </p>
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {hashtags.map((tag) => (
              <span 
                key={tag} 
                className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* URLs */}
        {urls.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-gray-700">Links:</p>
            {urls.map((url, index) => (
              <a 
                key={index}
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>
        )}

        {/* Embeds */}
        {formattedCast.content.hasEmbeds && (
          <div className="space-y-3 mb-4">
            <p className="text-sm font-medium text-gray-700">
              {formattedCast.content.embedCount} embed(s)
            </p>
            {cast.embeds.map((embed, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                {embed.url && (
                  <a 
                    href={embed.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="truncate">{embed.url}</span>
                  </a>
                )}
                {embed.cast_id && (
                  <div className="text-sm text-gray-600">
                    Referenced cast: {embed.cast_id.hash.slice(0, 8)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-1">
            <Heart className="w-4 h-4" />
            <span>{formattedCast.engagement.likes.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Repeat className="w-4 h-4" />
            <span>{formattedCast.engagement.recasts.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <MessageCircle className="w-4 h-4" />
            <span>{formattedCast.engagement.replies.toLocaleString()}</span>
          </div>

          <div className="ml-auto">
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
              Quality Score: {Math.round(qualityScore)}
            </span>
          </div>
        </div>

        {/* Technical Details */}
        <details className="mb-4">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            Technical Details
          </summary>
          <div className="mt-2 space-y-1 text-xs text-gray-500 font-mono bg-gray-50 p-3 rounded">
            <p>Hash: {cast.hash}</p>
            <p>Thread: {cast.thread_hash}</p>
            {cast.parent_hash && <p>Parent: {cast.parent_hash}</p>}
            <p>Timestamp: {cast.timestamp}</p>
          </div>
        </details>

        {/* Action Button */}
        <button 
          onClick={onCreateEvermark}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
        >
          <span>🎯</span>
          <span>Create Evermark from this Cast</span>
        </button>
      </div>
    </div>
  );
};

// Loading placeholder for cast
const CastLoadingPlaceholder: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="animate-pulse">
      <div className="flex items-start space-x-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

// Error display for cast loading
const CastErrorDisplay: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
    <div className="text-center">
      <div className="text-red-600 mb-4">
        <p className="font-medium">Failed to load cast</p>
        <p className="text-sm">{error}</p>
      </div>
      <button 
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  </div>
);

// Your existing ShareHandler component with enhancements
export const ShareHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useFarcasterUser();
  
  // Get cast parameters from URL
  const castHash = searchParams.get('castHash');
  const castFid = searchParams.get('castFid');
  const viewerFid = searchParams.get('viewerFid');
  
  // Use the new API hook to fetch rich cast data
  const { cast, isLoading: isCastLoading, error: castError } = useCastData(castHash);
  
  const [sdkCast, setSdkCast] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeShareContext = async () => {
      try {
        if (sdk && sdk.context) {
          const context = await sdk.context;
          console.log('🔍 SDK Context:', context);
          
          if (context.location) {
            const castData = (context.location as any).cast || 
                            (context as any).cast ||
                            (context as any).sharedCast;
            
            if (castData) {
              setSdkCast(castData);
              console.log('📤 SDK cast data:', castData);
            }
          }
        }

        // Track share event
        if (castHash) {
          try {
            await fetch('/.netlify/functions/shares', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                evermarkId: `cast-${castHash}`,
                platform: 'farcaster_inbound',
                timestamp: new Date().toISOString(),
                castHash,
                castFid,
                viewerFid
              })
            });
          } catch (trackingError) {
            console.warn('Failed to track share:', trackingError);
          }
        }
      } catch (err) {
        console.error('Failed to initialize share context:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeShareContext();
  }, [castHash, castFid, viewerFid]);

  const handleCreateEvermark = () => {
    const params = new URLSearchParams();
    if (castHash) params.set('castHash', castHash);
    if (castFid) params.set('castFid', castFid);
    if (viewerFid) params.set('viewerFid', viewerFid);
    
    // Add rich cast data if available
    if (cast) {
      const formatted = castUtils.formatForDisplay(cast);
      params.set('title', `${formatted.content.text.slice(0, 50)}...`);
      params.set('author', formatted.author.displayName);
      params.set('authorUsername', formatted.author.username);
      params.set('channel', formatted.metadata.channel || '');
      params.set('engagement', JSON.stringify(formatted.engagement));
    }
    
    navigate(`/share/create?${params.toString()}`);
  };

  const handleGoHome = () => navigate('/');
  const handleRetry = () => window.location.reload();

  if (isInitializing || isCastLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Loading Cast...
            </h1>
            <p className="text-gray-600">
              Fetching cast details from Farcaster
            </p>
          </div>
          <CastLoadingPlaceholder />
        </div>
      </div>
    );
  }

  if (castError && !cast) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Cast Not Found
            </h1>
            <p className="text-gray-600">
              Unable to load the shared cast
            </p>
          </div>
          <CastErrorDisplay error={castError} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Evermark from Cast
          </h1>
          <p className="text-gray-600">
            Transform this Farcaster cast into a permanent Evermark
          </p>
        </div>

        {/* Rich cast display if we have API data */}
        {cast && (
          <RichCastDisplay cast={cast} onCreateEvermark={handleCreateEvermark} />
        )}

        {/* Fallback display for SDK data or URL params only */}
        {!cast && (sdkCast || castHash) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-900 mb-2">Cast Information</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  {castHash && (
                    <p><strong>Cast Hash:</strong> <code className="bg-blue-100 px-1 rounded">{castHash.slice(0, 16)}...</code></p>
                  )}
                  {castFid && (
                    <p><strong>Author FID:</strong> {castFid}</p>
                  )}
                  {viewerFid && (
                    <p><strong>Shared by FID:</strong> {viewerFid}</p>
                  )}
                  {sdkCast && (
                    <>
                      <p><strong>SDK Data Available:</strong> ✅</p>
                      {sdkCast.author && (
                        <p><strong>Author:</strong> {sdkCast.author.username || `FID:${sdkCast.author.fid}`}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <button 
                onClick={handleCreateEvermark}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                🎯 Create Evermark from Cast
              </button>
            </div>
          </div>
        )}

        {/* No cast data available */}
        {!cast && !sdkCast && !castHash && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-gray-500 mb-4">
              <p className="text-lg mb-2">🤔 No cast information found</p>
              <p className="text-sm">
                This page is designed to handle casts shared from Farcaster.
              </p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={handleGoHome}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to Evermark Home
              </button>
              
              <button 
                onClick={() => navigate('/create')}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Create New Evermark
              </button>
            </div>
          </div>
        )}
        
        {/* Help section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">💡 How it works</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Share any Farcaster cast to Evermark from the share menu</p>
            <p>• We'll extract the cast content and author information</p>
            <p>• You can then create a permanent Evermark to preserve it forever</p>
            <p>• Evermarks are stored on-chain and can be collected by others</p>
          </div>
        </div>
      </div>
    </div>
  );
};