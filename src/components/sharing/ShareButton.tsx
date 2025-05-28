import React, { useState } from 'react';
import { 
  ShareIcon, 
  LinkIcon, 
  CheckIcon,
  TwitterIcon,
  FacebookIcon,
  LinkedinIcon,
  MessageCircleIcon 
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

// Hook for share tracking
function useShareTracking(evermarkId: string) {
  const [shareStats, setShareStats] = useState<ShareStats[]>([]);
  
  const trackShare = async (platform: string) => {
    // Track share event
    console.log(`📤 Shared Evermark ${evermarkId} via ${platform}`);
    
    // Update local stats
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
    
    // In production, send to API
    // await fetch('/api/shares/track', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ evermarkId, platform, timestamp: new Date() })
    // });
  };
  
  return { shareStats, trackShare };
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
  const { trackShare } = useShareTracking(evermarkId);
  
  // Generate trackable share URL
  const getShareUrl = (platform?: string) => {
    const baseUrl = `${window.location.origin}/share/${evermarkId}`;
    const params = new URLSearchParams();
    
    if (platform) params.set('utm_source', platform);
    params.set('utm_medium', 'social');
    params.set('utm_campaign', 'evermark_share');
    
    return `${baseUrl}?${params.toString()}`;
  };
  
  // Generate platform-specific share URLs
  const getTwitterUrl = () => {
    const url = getShareUrl('twitter');
    const text = `Check out "${title}" ${author ? `by ${author} ` : ''}on Evermark`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
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
  
  const handlePlatformShare = async (platform: string, url: string) => {
    await trackShare(platform);
    window.open(url, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Share Evermark"
      >
        <ShareIcon className="h-4 w-4 mr-2" />
        <span className="text-sm">Share</span>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Share menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Share this Evermark</h3>
              
              <div className="space-y-2">
                {/* Copy Link */}
                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
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
                
                {/* Twitter */}
                <button
                  onClick={() => handlePlatformShare('twitter', getTwitterUrl())}
                  className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <TwitterIcon className="h-4 w-4 mr-3 text-blue-500" />
                  <span className="text-sm">Share on Twitter</span>
                </button>
                
                {/* Facebook */}
                <button
                  onClick={() => handlePlatformShare('facebook', getFacebookUrl())}
                  className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <FacebookIcon className="h-4 w-4 mr-3 text-blue-600" />
                  <span className="text-sm">Share on Facebook</span>
                </button>
                
                {/* LinkedIn */}
                <button
                  onClick={() => handlePlatformShare('linkedin', getLinkedInUrl())}
                  className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <LinkedinIcon className="h-4 w-4 mr-3 text-blue-700" />
                  <span className="text-sm">Share on LinkedIn</span>
                </button>
                
                {/* Farcaster */}
                <button
                  onClick={() => {
                    const url = getShareUrl('farcaster');
                    const text = `Check out "${title}" on Evermark`;
                    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
                    handlePlatformShare('farcaster', farcasterUrl);
                  }}
                  className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <MessageCircleIcon className="h-4 w-4 mr-3 text-purple-600" />
                  <span className="text-sm">Share on Farcaster</span>
                </button>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Share links help track the reach of this Evermark
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
  
  useEffect(() => {
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