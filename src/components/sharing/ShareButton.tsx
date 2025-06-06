import React, { useState } from 'react';
import { 
  ShareIcon, 
  LinkIcon, 
  CheckIcon,
  TwitterIcon,
  FacebookIcon,
  LinkedinIcon,
  MessageCircleIcon,
  ZapIcon,
  AtSignIcon,
  HashIcon,
  ExternalLinkIcon
} from 'lucide-react';
import { useFarcasterUser } from '../../lib/farcaster';

interface ShareButtonProps {
  evermarkId: string;
  title: string;
  description?: string;
  author?: string;
  className?: string;
}

interface ShareStats {
  platform: string;
  count: number;
}

// Enhanced hook for share tracking with API integration
function useShareTracking(evermarkId: string) {
  const [shareStats, setShareStats] = useState<ShareStats[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  
  const trackShare = async (platform: string, additionalData?: any) => {
    setIsTracking(true);
    
    try {
      // Track locally first (immediate feedback)
      console.log(`📤 Shared Evermark ${evermarkId} via ${platform}`, additionalData);
      
      // Update local stats optimistically
      setShareStats(prev => {
        const existing = prev.find(s => s.platform === platform);
        if (existing) {
          return prev.map(s => 
            s.platform === platform 
              ? { ...s, count: s.count + 1 }
              : s
          );
        } else {
          return [...prev, { platform, count: 1 }];
        }
      });
      
      // Send to API with retry logic
      await sendToAPI(platform, additionalData);
      
    } catch (error) {
      console.error('Failed to track share:', error);
    } finally {
      setIsTracking(false);
    }
  };
  
  const sendToAPI = async (platform: string, additionalData?: any, retries = 3): Promise<void> => {
    const shareData = {
      evermarkId,
      platform,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
      ...additionalData
    };
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch('/.netlify/functions/shares', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(shareData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Share tracked successfully:', result);
        return;
        
      } catch (error) {
        console.warn(`❌ Share tracking attempt ${attempt}/${retries} failed:`, error);
        
        if (attempt === retries) {
          console.error('All share tracking attempts failed.');
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };
  
  return { shareStats, trackShare, isTracking };
}

export const ShareButton: React.FC<ShareButtonProps> = ({ 
  evermarkId, 
  title, 
  description, 
  author, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { trackShare, isTracking } = useShareTracking(evermarkId);
  const { isInFarcaster, isAuthenticated, user } = useFarcasterUser();
  
  // Helper function for proper native share detection
  const isNativeShareSupported = () => {
    return navigator.share && 
           typeof navigator.share === 'function' && 
           // Check if we're in a secure context (required for Web Share API)
           window.isSecureContext;
  };

  // Generate trackable share URL
  const getShareUrl = (platform?: string) => {
    // Use special /share/ URLs for social platforms that need meta tags
    const socialPlatforms = ['twitter', 'facebook', 'linkedin', 'farcaster', 'bluesky', 'lens'];
    
    if (platform && socialPlatforms.includes(platform)) {
      const baseUrl = `${window.location.origin}/share/evermark/${evermarkId}`;
      const params = new URLSearchParams();
      
      if (platform) params.set('utm_source', platform);
      params.set('utm_medium', 'social');
      params.set('utm_campaign', 'evermark_share');
      
      return `${baseUrl}?${params.toString()}`;
    } else {
      // Use direct URLs for copy/direct access
      const baseUrl = `${window.location.origin}/evermark/${evermarkId}`;
      const params = new URLSearchParams();
      
      if (platform) params.set('utm_source', platform);
      params.set('utm_medium', 'social');
      params.set('utm_campaign', 'evermark_share');
      
      return `${baseUrl}?${params.toString()}`;
    }
  };
  
  // Generate Farcaster Frame URL for dynamic content
  const getFarcasterFrameUrl = () => {
    const frameUrl = `${window.location.origin}/api/frames/evermark/${evermarkId}`;
    const params = new URLSearchParams({
      utm_source: 'farcaster',
      utm_medium: 'frame',
      utm_campaign: 'evermark_share'
    });
    return `${frameUrl}?${params.toString()}`;
  };
  
  // Generate platform-specific share URLs
  const getTwitterUrl = () => {
    const url = getShareUrl('twitter');
    const text = `Check out "${title}" ${author ? `by ${author} ` : ''}on Evermark`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  };
  
  const getBlueskyUrl = () => {
    const url = getShareUrl('bluesky');
    const text = `Check out "${title}" ${author ? `by ${author} ` : ''}on Evermark\n\n${url}`;
    return `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`;
  };
  
  const getLensUrl = () => {
    const url = getShareUrl('lens');
    const text = `Check out "${title}" ${author ? `by ${author} ` : ''}on Evermark\n\n${url}`;
    return `https://hey.xyz/?text=${encodeURIComponent(text)}`;
  };
  
  const getFarcasterUrl = () => {
    // Use Farcaster's compose URL with frame embed
    const frameUrl = getFarcasterFrameUrl();
    const text = `Check out "${title}" on Evermark`;
    
    // Create a Farcaster cast with embedded frame
    return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(frameUrl)}`;
  };
  
  const getFarcasterDirectUrl = () => {
    // Direct link to Evermark in Farcaster Mini App context
    const miniAppUrl = `${window.location.origin}/evermark/${evermarkId}`;
    const params = new URLSearchParams({
      utm_source: 'farcaster_miniapp',
      utm_medium: 'direct',
      utm_campaign: 'evermark_share'
    });
    return `${miniAppUrl}?${params.toString()}`;
  };
  
  const getFacebookUrl = () => {
    const url = getShareUrl('facebook');
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  };
  
  const getLinkedInUrl = () => {
    const url = getShareUrl('linkedin');
    const summary = description || `Check out this Evermark: ${title}`;
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(summary)}`;
  };
  
  const getThreadsUrl = () => {
    const url = getShareUrl('threads');
    const text = `Check out "${title}" ${author ? `by ${author} ` : ''}on Evermark`;
    return `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  };
  
  const copyToClipboard = async () => {
    try {
      const url = getShareUrl('copy');
      await navigator.clipboard.writeText(url);
      setCopied(true);
      await trackShare('copy', { url });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };
  
  const copyFarcasterFrame = async () => {
    try {
      const frameUrl = getFarcasterFrameUrl();
      await navigator.clipboard.writeText(frameUrl);
      setCopied(true);
      await trackShare('farcaster_frame_copy', { frameUrl });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy frame URL:', err);
    }
  };
  
  const handlePlatformShare = async (platform: string, url: string) => {
    await trackShare(platform, { 
      url, 
      isInFarcaster,
      userFid: user?.fid 
    });
    
    // For Farcaster Mini App, try to use native sharing if available
    if (isInFarcaster && platform === 'farcaster') {
      try {
        // Try to use Farcaster's native sharing
        if ((window as any).farcaster?.share) {
          await (window as any).farcaster.share({
            text: `Check out "${title}" on Evermark`,
            embeds: [getFarcasterFrameUrl()]
          });
          setIsOpen(false);
          return;
        }
      } catch (nativeError) {
        console.log('Native Farcaster sharing not available, falling back to web');
      }
    }
    
    // Fallback to opening URL
    window.open(url, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };
  
  const handleMastodonShare = async () => {
    await trackShare('mastodon', { isInFarcaster });
    const url = getShareUrl('mastodon');
    const text = `Check out "${title}" ${author ? `by ${author} ` : ''}on Evermark`;
    
    // For Mastodon, we'll open a modal to let users choose their instance
    const instance = prompt('Enter your Mastodon instance (e.g., mastodon.social):') || 'mastodon.social';
    const mastodonUrl = `https://${instance}/share?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    
    window.open(mastodonUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };
  
  // Native share API for mobile devices
  const handleNativeShare = async () => {
    if (!isNativeShareSupported()) {
      console.log('Native sharing not supported');
      return;
    }

    try {
      const shareData = {
        title: `Evermark: ${title}`,
        text: description || `Check out "${title}" on Evermark`,
        url: getShareUrl('native')
      };

      // Check if the data can be shared before attempting (if canShare is available)
      if (navigator.canShare && !navigator.canShare(shareData)) {
        console.log('Share data not supported');
        return;
      }

      await navigator.share(shareData);
      
      await trackShare('native_share', { 
        isInFarcaster,
        userAgent: navigator.userAgent,
        shareDataSupported: navigator.canShare ? navigator.canShare(shareData) : 'unknown'
      });
    } catch (err) {
      // User cancelled or sharing failed
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Native sharing cancelled by user');
      } else {
        console.log('Native sharing failed:', err);
      }
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTracking}
        className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        aria-label="Share Evermark"
      >
        <ShareIcon className="h-4 w-4 mr-2" />
        <span className="text-sm">Share</span>
        {isTracking && (
          <div className="ml-2 w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        )}
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Share menu - responsive positioning */}
          <div className="absolute mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20
                    w-80 sm:w-80 sm:right-0
                    max-sm:w-screen max-sm:left-1/2 max-sm:transform max-sm:-translate-x-1/2
                    max-sm:mx-4 max-sm:w-[calc(100vw-2rem)]">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Share this Evermark</h3>
              
              <div className="space-y-2">
                {/* Native Share (Mobile) */}
                {isNativeShareSupported() && (
                  <button
                    onClick={handleNativeShare}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ExternalLinkIcon className="h-4 w-4 mr-3 text-blue-600" />
                    <span className="text-sm">Share via device</span>
                  </button>
                )}
                
                {/* Copy Link */}
                <button
                  onClick={copyToClipboard}
                  disabled={isTracking}
                  className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4 mr-3 text-green-600" />
                  ) : (
                    <LinkIcon className="h-4 w-4 mr-3" />
                  )}
                  <span className="text-sm">
                    {copied ? 'Copied!' : 'Copy link'}
                  </span>
                </button>
                
                {/* Farcaster Section - Enhanced for Mini App */}
                {isInFarcaster && (
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-purple-600 mb-2">📱 Farcaster (You're here!)</p>
                    
                    {/* Native Farcaster Share */}
                    <button
                      onClick={() => handlePlatformShare('farcaster_native', getFarcasterUrl())}
                      disabled={isTracking}
                      className="w-full flex items-center px-3 py-2 text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 border border-purple-200"
                    >
                      <MessageCircleIcon className="h-4 w-4 mr-3 text-purple-600" />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">Cast this Evermark</div>
                        <div className="text-xs text-purple-600">Share with your followers</div>
                      </div>
                    </button>
                    
                    {/* Copy Frame URL for custom posts */}
                    <button
                      onClick={copyFarcasterFrame}
                      disabled={isTracking}
                      className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <LinkIcon className="h-4 w-4 mr-3 text-purple-400" />
                      <div className="flex-1 text-left">
                        <div className="text-sm">Copy Frame URL</div>
                        <div className="text-xs text-gray-500">For custom cast composition</div>
                      </div>
                    </button>
                  </div>
                )}
                
                {/* Dweb/Web3 Social Platforms */}
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-gray-500 mb-2">🌐 Decentralized Social</p>
                  
                  {/* Farcaster (for external users) */}
                  {!isInFarcaster && (
                    <>
                      <button
                        onClick={() => handlePlatformShare('farcaster', getFarcasterUrl())}
                        disabled={isTracking}
                        className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <MessageCircleIcon className="h-4 w-4 mr-3 text-purple-600" />
                        <div className="flex-1 text-left">
                          <div className="text-sm">Share on Farcaster</div>
                          <div className="text-xs text-gray-500">With interactive frame</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handlePlatformShare('farcaster_miniapp', getFarcasterDirectUrl())}
                        disabled={isTracking}
                        className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <ZapIcon className="h-4 w-4 mr-3 text-purple-500" />
                        <div className="flex-1 text-left">
                          <div className="text-sm">Open in Farcaster</div>
                          <div className="text-xs text-gray-500">Direct mini app link</div>
                        </div>
                      </button>
                    </>
                  )}
                  
                  {/* Bluesky */}
                  <button
                    onClick={() => handlePlatformShare('bluesky', getBlueskyUrl())}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <AtSignIcon className="h-4 w-4 mr-3 text-sky-500" />
                    <span className="text-sm">Share on Bluesky</span>
                  </button>
                  
                  {/* Lens */}
                  <button
                    onClick={() => handlePlatformShare('lens', getLensUrl())}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ZapIcon className="h-4 w-4 mr-3 text-green-500" />
                    <span className="text-sm">Share on Lens (Hey)</span>
                  </button>
                  
                  {/* Mastodon */}
                  <button
                    onClick={handleMastodonShare}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <HashIcon className="h-4 w-4 mr-3 text-indigo-600" />
                    <span className="text-sm">Share on Mastodon</span>
                  </button>
                </div>
                
                {/* Traditional Social Platforms */}
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-gray-500 mb-2">📱 Traditional Social</p>
                  
                  {/* Twitter/X */}
                  <button
                    onClick={() => handlePlatformShare('twitter', getTwitterUrl())}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <TwitterIcon className="h-4 w-4 mr-3 text-blue-500" />
                    <span className="text-sm">Share on X (Twitter)</span>
                  </button>
                  
                  {/* Threads */}
                  <button
                    onClick={() => handlePlatformShare('threads', getThreadsUrl())}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <AtSignIcon className="h-4 w-4 mr-3 text-black" />
                    <span className="text-sm">Share on Threads</span>
                  </button>
                  
                  {/* LinkedIn */}
                  <button
                    onClick={() => handlePlatformShare('linkedin', getLinkedInUrl())}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <LinkedinIcon className="h-4 w-4 mr-3 text-blue-700" />
                    <span className="text-sm">Share on LinkedIn</span>
                  </button>
                  
                  {/* Facebook */}
                  <button
                    onClick={() => handlePlatformShare('facebook', getFacebookUrl())}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FacebookIcon className="h-4 w-4 mr-3 text-blue-600" />
                    <span className="text-sm">Share on Facebook</span>
                  </button>
                </div>
              </div>
              
              {/* Footer with context info */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Share links track reach across platforms</span>
                  {isInFarcaster && (
                    <span className="text-purple-600 font-medium">📱 Farcaster Mode</span>
                  )}
                </div>
                
                {/* User context info */}
                {isInFarcaster && isAuthenticated && user && (
                  <div className="mt-2 text-xs text-purple-600">
                    Sharing as @{user.username || `FID:${user.fid}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Share page component for handling redirects
export const ShareRedirect: React.FC = () => {
  const [evermarkId, setEvermarkId] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  React.useEffect(() => {
    // Extract evermark ID from URL
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    if (id) {
      setEvermarkId(id);
      
      // Track the share click
      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get('utm_source') || 'direct';
      
      console.log(`📈 Share link accessed for Evermark ${id} from ${source}`);
      
      // Track the inbound share
      fetch('/.netlify/functions/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evermarkId: id,
          platform: 'inbound_share',
          timestamp: new Date().toISOString(),
          utm_source: source,
          referrer: document.referrer
        })
      }).catch(err => console.warn('Failed to track inbound share:', err));
      
      // Redirect to the actual Evermark page after brief delay
      setIsRedirecting(true);
      setTimeout(() => {
        window.location.href = `/evermark/${id}`;
      }, 1000);
    }
  }, []);
  
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Taking you to the Evermark...</p>
          <p className="text-xs text-gray-500 mt-2">Tracking share analytics</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Invalid Share Link
        </h1>
        <p className="text-gray-600">
          This share link appears to be broken.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Go to Evermark Home
        </button>
      </div>
    </div>
  );
};
