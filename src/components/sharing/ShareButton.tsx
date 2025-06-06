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
  HashIcon
} from 'lucide-react';

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
  
  const trackShare = async (platform: string) => {
    setIsTracking(true);
    
    try {
      // Track locally first (immediate feedback)
      console.log(`📤 Shared Evermark ${evermarkId} via ${platform}`);
      
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
      await sendToAPI(platform);
      
    } catch (error) {
      console.error('Failed to track share:', error);
    } finally {
      setIsTracking(false);
    }
  };
  
  const sendToAPI = async (platform: string, retries = 3): Promise<void> => {
    const shareData = {
      evermarkId,
      platform,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
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
    // Use Farcaster's new dynamic URL capabilities
    const frameUrl = getFarcasterFrameUrl();
    const text = `Check out "${title}" on Evermark`;
    
    // Create a Farcaster cast with embedded frame
    return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(frameUrl)}`;
  };
  
  const getFarcasterDirectUrl = () => {
    // Alternative: Direct Farcaster Mini App URL
    const miniAppUrl = `https://evermark-mini.vercel.app/evermark/${evermarkId}`;
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
      await trackShare('copy');
      
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
      await trackShare('farcaster_frame_copy');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy frame URL:', err);
    }
  };
  
  const handlePlatformShare = async (platform: string, url: string) => {
    await trackShare(platform);
    window.open(url, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };
  
  const handleMastodonShare = async () => {
    await trackShare('mastodon');
    const url = getShareUrl('mastodon');
    const text = `Check out "${title}" ${author ? `by ${author} ` : ''}on Evermark`;
    
    // For Mastodon, we'll open a modal to let users choose their instance
    const instance = prompt('Enter your Mastodon instance (e.g., mastodon.social):') || 'mastodon.social';
    const mastodonUrl = `https://${instance}/share?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    
    window.open(mastodonUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
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
                
                {/* Dweb/Web3 Social Platforms */}
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-gray-500 mb-2">🌐 Decentralized Social</p>
                  
                  {/* Farcaster with Frame */}
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
                  
                  {/* Farcaster Frame URL Copy */}
                  <button
                    onClick={copyFarcasterFrame}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <LinkIcon className="h-4 w-4 mr-3 text-purple-400" />
                    <div className="flex-1 text-left">
                      <div className="text-sm">Copy Frame URL</div>
                      <div className="text-xs text-gray-500">For custom Farcaster posts</div>
                    </div>
                  </button>
                  
                  {/* Farcaster Mini App */}
                  <button
                    onClick={() => handlePlatformShare('farcaster_miniapp', getFarcasterDirectUrl())}
                    disabled={isTracking}
                    className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ZapIcon className="h-4 w-4 mr-3 text-purple-500" />
                    <div className="flex-1 text-left">
                      <div className="text-sm">Open in Farcaster Mini App</div>
                      <div className="text-xs text-gray-500">Direct mini app experience</div>
                    </div>
                  </button>
                  
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
              
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Share links help track the reach of this Evermark across all platforms
                </p>
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
      </div>
    </div>
  );
};
