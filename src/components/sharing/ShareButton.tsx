// src/components/sharing/ShareButton.tsx - Enhanced with EvermarkMetadata Support
import React, { useState } from 'react';
import { 
  ShareIcon, 
  TwitterIcon, 
  CopyIcon, 
  MessageCircleIcon,
  ExternalLinkIcon,
  CheckIcon,
  XIcon,
  SmartphoneIcon
} from 'lucide-react';
import { cn, useIsMobile, touchFriendly } from '../../utils/responsive';
import type { EvermarkMetadata } from '../../utils/evermark-meta';
import { EvermarkMetaGenerator } from '../../utils/evermark-meta';
// Environment variables for Farcaster Universal Links
const FARCASTER_APP_ID = import.meta.env.VITE_FARCASTER_MINI_APP_ID;
const FARCASTER_APP_SLUG = import.meta.env.VITE_FARCASTER_MINI_APP_SLUG;

// Updated interface with evermarkData support
export interface ShareButtonProps {
  evermarkId: string;
  title: string;
  description?: string;
  author: string;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  // New prop for enhanced sharing
  evermarkData?: EvermarkMetadata;
}

// Main ShareButton component
export const ShareButton: React.FC<ShareButtonProps> = ({
  evermarkId,
  title,
  description,
  author,
  variant = 'button',
  size = 'md',
  className = '',
  evermarkData
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const baseUrl = window.location.origin;
  const evermarkUrl = `${baseUrl}/evermark/${evermarkId}`;
  
  // Use enhanced share text if metadata available
  const getShareText = (platform: 'twitter' | 'farcaster' | 'generic' = 'generic') => {
    if (evermarkData) {
      const metaGenerator = new EvermarkMetaGenerator();
      return metaGenerator.generateShareText(evermarkData, platform);
    }
    // Fallback to simple share text
    return `Check out "${title}" by ${author} on Evermark\n\n${evermarkUrl}`;
  };
  
  // Generate Universal Link for Farcaster
  const generateFarcasterUniversalLink = () => {
    console.log('🔍 Farcaster env vars:', { FARCASTER_APP_ID, FARCASTER_APP_SLUG });
    
    // Generate direct mini-app URL with Farcaster context
    // This should open your mini-app directly in Farcaster, not a compose window
    const miniAppParams = new URLSearchParams({
      inFeed: 'true',
      action_type: 'share',
      action_sub_type: 'default'
    });
    
    const miniAppUrl = `${evermarkUrl}?${miniAppParams.toString()}`;
    console.log('✅ Generated Mini-App URL:', miniAppUrl);
    return miniAppUrl;
  };
  
  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 'h-6 w-6 p-1',
      iconSize: 'h-3 w-3',
      menuWidth: 'w-64'
    },
    md: {
      button: 'px-3 py-2 text-sm',
      icon: 'h-8 w-8 p-2',
      iconSize: 'h-4 w-4',
      menuWidth: 'w-72'
    },
    lg: {
      button: 'px-4 py-2 text-base',
      icon: 'h-10 w-10 p-2',
      iconSize: 'h-5 w-5',
      menuWidth: 'w-80'
    }
  };
  
  const config = sizeConfig[size];
  
  // Enhanced share platforms with Universal Links and rich metadata
  const sharePlatforms = [
    ...(FARCASTER_APP_ID ? [{
      name: 'Share to Farcaster',
      icon: SmartphoneIcon,
      action: () => {
        const universalLink = generateFarcasterUniversalLink();
        window.open(universalLink, '_blank');
        trackShare('farcaster_universal');
      },
      color: 'hover:bg-purple-900/30 hover:text-purple-400 hover:border-purple-500/30',
      recommended: true,
      description: 'Opens directly in Farcaster app'
    }] : []),
    {
      name: 'Cast with Embed',
      icon: MessageCircleIcon,
      action: () => {
        const shareText = getShareText('farcaster');
        const params = new URLSearchParams({
          text: shareText,
          'embeds[]': evermarkUrl
        });
        window.open(`https://warpcast.com/~/compose?${params.toString()}`, '_blank');
        trackShare('farcaster_embed');
      },
      color: 'hover:bg-purple-900/30 hover:text-purple-400 hover:border-purple-500/30',
      description: 'Share with rich preview'
    },
    {
      name: 'Twitter',
      icon: TwitterIcon,
      action: () => {
        const tweetText = encodeURIComponent(getShareText('twitter'));
        window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
        trackShare('twitter');
      },
      color: 'hover:bg-blue-900/30 hover:text-blue-400 hover:border-blue-500/30'
    },
    {
      name: 'Copy Universal Link',
      icon: copySuccess === 'universal' ? CheckIcon : CopyIcon,
      action: () => {
        const universalLink = generateFarcasterUniversalLink();
        copyToClipboard(universalLink, 'universal');
      },
      color: 'hover:bg-green-900/30 hover:text-green-400 hover:border-green-500/30',
      description: 'Best for Farcaster sharing'
    },
    {
      name: 'Copy Direct Link',
      icon: copySuccess === 'link' ? CheckIcon : CopyIcon,
      action: () => copyToClipboard(evermarkUrl, 'link'),
      color: 'hover:bg-gray-600/30 hover:text-gray-300 hover:border-gray-500/30'
    }
  ];
  
  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
      trackShare(`copy_${type}`);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };
  
  // Track share analytics with enhanced metadata
  const trackShare = async (platform: string) => {
    try {
      await fetch('/.netlify/functions/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evermarkId,
          platform,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          metadata: {
            title,
            author,
            hasDescription: !!description,
            hasEvermarkData: !!evermarkData,
            isFarcasterCast: !!evermarkData?.farcasterData,
            category: evermarkData?.category,
            qualityScore: evermarkData?.farcasterData?.qualityScore
          }
        })
      });
    } catch (error) {
      console.log('Analytics tracking failed:', error);
    }
    
    setIsOpen(false);
  };
  
  // Enhanced native share with metadata
  const handleNativeShare = async () => {
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        const shareData = {
          title: `${title} by ${author} | Evermark`,
          text: description || getShareText('generic'),
          url: FARCASTER_APP_ID ? generateFarcasterUniversalLink() : evermarkUrl
        };
        
        await navigator.share(shareData);
        trackShare('native');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Native share failed:', err);
          setIsOpen(true);
        }
      }
    } else {
      setIsOpen(true);
    }
  };
  
  // Button variant
  if (variant === 'button') {
    return (
      <div className="relative">
        <button
          onClick={navigator.share && typeof navigator.share === 'function' && isMobile ? handleNativeShare : () => setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center font-medium rounded-lg transition-all duration-200 backdrop-blur-sm",
            "bg-gray-700/30 border border-gray-600/50 text-gray-300",
            "hover:bg-cyan-600/20 hover:border-cyan-500/30 hover:text-cyan-300",
            config.button,
            touchFriendly.button,
            className
          )}
        >
          <ShareIcon className={cn("mr-2", config.iconSize)} />
          Share
        </button>
        
        {/* Enhanced share menu */}
        {isOpen && !isMobile && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className={cn(
              "absolute top-full right-0 mt-2 bg-gray-800/95 border border-gray-600/50 rounded-lg shadow-xl z-20 py-2 backdrop-blur-sm",
              config.menuWidth
            )}>
              <EnhancedShareMenu 
                platforms={sharePlatforms} 
                config={config}
                title={title}
                author={author}
                evermarkData={evermarkData}
                onClose={() => setIsOpen(false)}
              />
            </div>
          </>
        )}
      </div>
    );
  }
  
  // Icon variant
  return (
    <div className="relative">
      <button
        onClick={navigator.share && typeof navigator.share === 'function' && isMobile ? handleNativeShare : () => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full transition-all border backdrop-blur-sm",
          "bg-gray-700/30 border-gray-600/50 text-gray-400",
          "hover:bg-cyan-600/20 hover:border-cyan-500/30 hover:text-cyan-300",
          config.icon,
          touchFriendly.button,
          className
        )}
        title="Share this Evermark"
      >
        <ShareIcon className={config.iconSize} />
      </button>
      
      {isOpen && !isMobile && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "absolute top-full right-0 mt-2 bg-gray-800/95 border border-gray-600/50 rounded-lg shadow-xl z-20 py-2 backdrop-blur-sm",
            config.menuWidth
          )}>
            <EnhancedShareMenu 
              platforms={sharePlatforms} 
              config={config}
              title={title}
              author={author}
              evermarkData={evermarkData}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
};

// Enhanced share menu component with metadata support
const EnhancedShareMenu: React.FC<{
  platforms: Array<{
    name: string;
    icon: React.ComponentType<any>;
    action: () => void;
    color: string;
    recommended?: boolean;
    description?: string;
  }>;
  config: any;
  title: string;
  author: string;
  evermarkData?: EvermarkMetadata;
  onClose: () => void;
}> = ({ platforms, config, title, author, evermarkData, onClose }) => {
  return (
    <>
      <div className="px-4 py-2 border-b border-gray-700">
        <h3 className="text-sm font-medium text-white">Share Evermark</h3>
        <p className="text-xs text-gray-400 mt-1">{title}</p>
        {evermarkData?.farcasterData && (
          <div className="text-xs text-purple-400 mt-1">
            📤 Originally from Farcaster
          </div>
        )}
      </div>
      
      {/* Recommended options first */}
      {platforms.filter(p => p.recommended).map((platform) => {
        const IconComponent = platform.icon;
        return (
          <button
            key={platform.name}
            onClick={() => {
              platform.action();
              onClose();
            }}
            className={cn(
              "w-full text-left px-4 py-3 text-sm text-gray-300 transition-all flex items-center border border-transparent relative",
              platform.color
            )}
          >
            <IconComponent className={cn("mr-3", config.iconSize)} />
            <div className="flex-1">
              <div className="font-medium">{platform.name}</div>
              {platform.description && (
                <div className="text-xs text-gray-500">{platform.description}</div>
              )}
            </div>
            <div className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded">⭐</div>
          </button>
        );
      })}
      
      {/* Separator */}
      {platforms.some(p => p.recommended) && (
        <div className="border-t border-gray-700 my-1"></div>
      )}
      
      {/* Other options */}
      {platforms.filter(p => !p.recommended).map((platform) => {
        const IconComponent = platform.icon;
        return (
          <button
            key={platform.name}
            onClick={() => {
              platform.action();
              onClose();
            }}
            className={cn(
              "w-full text-left px-4 py-3 text-sm text-gray-300 transition-all flex items-center border border-transparent",
              platform.color
            )}
          >
            <IconComponent className={cn("mr-3", config.iconSize)} />
            <div className="flex-1">
              <div>{platform.name}</div>
              {platform.description && (
                <div className="text-xs text-gray-500">{platform.description}</div>
              )}
            </div>
          </button>
        );
      })}
      
      {/* Enhanced preview section with metadata */}
      <div className="border-t border-gray-700 mt-2 p-4">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Share Preview</h4>
        <div className="bg-gray-900/50 rounded p-2">
          <div className="text-xs text-gray-300 mb-1">{title}</div>
          <div className="text-xs text-gray-500 mb-1">by {author}</div>
          
          {evermarkData && (
            <div className="flex flex-wrap gap-1 mt-2">
              {evermarkData.category && (
                <span className="text-xs bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded">
                  {evermarkData.category}
                </span>
              )}
              {evermarkData.farcasterData && (
                <span className="text-xs bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded">
                  Farcaster Cast
                </span>
              )}
              {evermarkData.tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="text-xs bg-gray-600/20 text-gray-400 px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {evermarkData?.farcasterData && (
          <div className="mt-2 text-xs text-gray-500">
            Original engagement: {evermarkData.farcasterData.engagement.likes} likes, {evermarkData.farcasterData.engagement.recasts} recasts
          </div>
        )}
      </div>
    </>
  );
};

// Keep existing ShareRedirect component
export const ShareRedirect: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const evermarkId = urlParams.get('id');
  
  React.useEffect(() => {
    if (evermarkId) {
      fetch('/.netlify/functions/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evermarkId,
          platform: 'direct_link',
          timestamp: new Date().toISOString(),
          type: 'view'
        })
      }).catch(() => {});
      
      window.location.href = `/evermark/${evermarkId}`;
    }
  }, [evermarkId]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
    </div>
  );
};