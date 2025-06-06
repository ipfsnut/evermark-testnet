import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import sdk from '@farcaster/frame-sdk';

interface SharedCast {
  author: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  hash: string;
  parentHash?: string;
  parentFid?: number;
  timestamp?: number;
  mentions?: any[];
  embeds?: string[];
  channelKey?: string;
}

export const ShareHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sharedCast, setSharedCast] = useState<SharedCast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get URL parameters immediately (available during SSR)
  const castHash = searchParams.get('castHash');
  const castFid = searchParams.get('castFid');
  const viewerFid = searchParams.get('viewerFid');
  
  useEffect(() => {
    const initializeShareContext = async () => {
      try {
        // Check SDK context after initialization
        if (sdk && sdk.context) {
          // Await the context promise
          const context = await sdk.context;
          
          console.log('🔍 FULL SDK CONTEXT:', context);
          
          // Check if location exists and has cast data
          if (context.location) {
            const location = context.location;
            console.log('📍 LOCATION CONTEXT:', location);
            
            // Check for cast data in various possible locations
            const castData = (location as any).cast || 
                            (context as any).cast ||
                            (context as any).sharedCast;
            
            if (castData) {
              setSharedCast(castData);
              console.log('📤 Received shared cast via SDK:', castData);
            } else {
              console.log('ℹ️ No cast data found in SDK context');
            }
          } else {
            console.log('ℹ️ No location context in SDK');
          }
        }
        
        // Track the share reception from URL params (always available)
        if (castHash) {
          console.log('📈 Cast shared to Evermark via URL params:', {
            castHash,
            castFid,
            viewerFid,
            timestamp: new Date().toISOString()
          });
          
          // Track this event
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
            console.warn('Failed to track inbound share:', trackingError);
          }
        }
        

      } catch (err) {
        console.error('Failed to initialize share context:', err);
        setError('Failed to load shared cast information');
      } finally {
        setIsLoading(false);
      }
    };

    initializeShareContext();
  }, [castHash, castFid, viewerFid]);
  
  const handleCreateEvermark = () => {
    // Navigate to create page with cast context
    const params = new URLSearchParams();
    if (castHash) params.set('castHash', castHash);
    if (castFid) params.set('castFid', castFid);
    if (viewerFid) params.set('viewerFid', viewerFid);
    
    navigate(`/share/create?${params.toString()}`);
  };
  
  const handleGoHome = () => {
    navigate('/');
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing shared cast...</p>
          <p className="text-xs text-gray-500 mt-2">Loading cast information</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-lg font-semibold text-red-900 mb-2">
              Share Error
            </h1>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={handleGoHome}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go to Evermark Home
            </button>
          </div>
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
        
        {/* Rich cast display from SDK */}
        {sharedCast && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <div className="flex items-start space-x-4 mb-4">
              {sharedCast.author.pfpUrl && (
                <img 
                  src={sharedCast.author.pfpUrl} 
                  alt={sharedCast.author.displayName || sharedCast.author.username}
                  className="w-12 h-12 rounded-full flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {sharedCast.author.displayName || `@${sharedCast.author.username}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    FID: {sharedCast.author.fid}
                  </p>
                </div>
                
                {sharedCast.channelKey && (
                  <p className="text-sm text-purple-600 mb-2">
                    📺 /{sharedCast.channelKey}
                  </p>
                )}
                
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-600 font-mono">
                    Cast: {sharedCast.hash.slice(0, 16)}...
                  </p>
                  {sharedCast.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(sharedCast.timestamp * 1000).toLocaleString()}
                    </p>
                  )}
                </div>
                
                {sharedCast.embeds && sharedCast.embeds.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Embeds:</p>
                    <div className="space-y-1">
                      {sharedCast.embeds.map((embed, index) => (
                        <p key={index} className="text-xs text-blue-600 truncate">
                          🔗 {embed}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                {sharedCast.mentions && sharedCast.mentions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Mentions:</p>
                    <div className="flex flex-wrap gap-1">
                      {sharedCast.mentions.map((mention, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          @{mention.username || `FID:${mention.fid}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <button 
                onClick={handleCreateEvermark}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                🎯 Create Evermark from this Cast
              </button>
            </div>
          </div>
        )}
        
        {/* Fallback display for URL params only */}
        {!sharedCast && (castHash || castFid) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-900 mb-2">Cast Information</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  {castHash && (
                    <p><strong>Cast Hash:</strong> {castHash.slice(0, 16)}...</p>
                  )}
                  {castFid && (
                    <p><strong>Author FID:</strong> {castFid}</p>
                  )}
                  {viewerFid && (
                    <p><strong>Shared by FID:</strong> {viewerFid}</p>
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
        
        {/* No cast data */}
        {!sharedCast && !castHash && !castFid && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
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