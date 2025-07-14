// src/components/sharing/ShareButton.tsx - Enhanced with Universal Links (Backward Compatible)
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

// Environment variables for Farcaster Universal Links
const FARCASTER_APP_ID = import.meta.env.VITE_FARCASTER_APP_ID;
const FARCASTER_APP_SLUG = import.meta.env.VITE_FARCASTER_APP_SLUG;

// Legacy interface for backward compatibility
export interface ShareButtonProps {
  evermarkId: string;
  title: string;
  description?: string;
  author: string;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// New enhanced interface
export interface EnhancedShareButtonProps {
  evermark: EvermarkMetadata;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Main ShareButton component (backward compatible)
export const ShareButton: React.FC<ShareButtonProps> = ({
  evermarkId,
  title,
  description,
  author,
  variant = 'button',
  size = 'md',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const baseUrl = window.location.origin;
  const evermarkUrl = `${baseUrl}/evermark/${evermarkId}`;
  const shareText = `Check out "${title}" by ${author} on Evermark`;
  
  // Generate Universal Link for Farcaster
  const generateFarcasterUniversalLink = () => {
    if (!FARCASTER_APP_ID || !FARCASTER_APP_SLUG) {
      // Fallback to web sharing
      return `https://warpcast.com/~/compose?text=${encodeURIComponent(`${shareText}\n\n${evermarkUrl}`)}`;
    }
    
    // Universal Link format
    const params = new URLSearchParams({
      text: `${shareText}\n\n${evermarkUrl}`,
      'embeds[]': evermarkUrl
    });
    
    return `https://warpcast.com/~/add-cast-intent?${params.toString()}`;
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
  
  // Enhanced share platforms with Universal Links
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
      recommended: true
    }] : []),
    {
      name: 'Twitter',
      icon: TwitterIcon,
      action: () => {
        const tweetText = encodeURIComponent(`${shareText}\n\n${evermarkUrl}`);
        window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
        trackShare('twitter');
      },
      color: 'hover:bg-blue-900/30 hover:text-blue-400 hover:border-blue-500/30'
    },
    {
      name: 'Farcaster',
      icon: MessageCircleIcon,
      action: () => {
        const castText = encodeURIComponent(`${shareText}\n\n${evermarkUrl}`);
        window.open(`https://warpcast.com/~/compose?text=${castText}`, '_blank');
        trackShare('farcaster_web');
      },
      color: 'hover:bg-purple-900/30 hover:text-purple-400 hover:border-purple-500/30'
    },
    {
      name: 'Copy Universal Link',
      icon: copySuccess === 'universal' ? CheckIcon : CopyIcon,
      action: () => {
        const universalLink = generateFarcasterUniversalLink();
        copyToClipboard(universalLink, 'universal');
      },
      color: 'hover:bg-green-900/30 hover:text-green-400 hover:border-green-500/30'
    },
    {
      name: 'Copy Link',
      icon: copySuccess === 'link' ? CheckIcon : CopyIcon,
      action: () => copyToClipboard(evermarkUrl, 'link'),
      color: 'hover:bg-green-900/30 hover:text-green-400 hover:border-green-500/30'
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
  
  // Track share analytics
  const trackShare = async (platform: string) => {
    try {
      // Track share analytics
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
            hasDescription: !!description
          }
        })
      });
    } catch (error) {
      console.log('Analytics tracking failed:', error);
      // Don't block the user experience for analytics failures
    }
    
    setIsOpen(false);
  };
  
  // Native share API for mobile
  const handleNativeShare = async () => {
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${title} by ${author}`,
          text: description || shareText,
          url: evermarkUrl
        });
        trackShare('native');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Native share failed:', err);
          setIsOpen(true); // Fallback to custom share menu
        }
      }
    } else {
      setIsOpen(true);
    }
  };
  
  // Button variant with cyber styling
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
        
        {/* Enhanced share menu with cyber styling */}
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
                onClose={() => setIsOpen(false)}
              />
            </div>
          </>
        )}
      </div>
    );
  }
  
  // Icon variant with cyber styling
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
      
      {/* Desktop share menu */}
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
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
};

// New component that takes EvermarkMetadata for richer sharing
export const ShareButtonWithMetadata: React.FC<EnhancedShareButtonProps> = ({
  evermark,
  variant = 'button',
  size = 'md',
  className = ''
}) => {
  return (
    <ShareButton
      evermarkId={evermark.id}
      title={evermark.title}
      description={evermark.description}
      author={evermark.author}
      variant={variant}
      size={size}
      className={className}
    />
  );
};

// Enhanced share menu component
const EnhancedShareMenu: React.FC<{
  platforms: Array<{
    name: string;
    icon: React.ComponentType<any>;
    action: () => void;
    color: string;
    recommended?: boolean;
  }>;
  config: any;
  title: string;
  author: string;
  onClose: () => void;
}> = ({ platforms, config, title, author, onClose }) => {
  return (
    <>
      <div className="px-4 py-2 border-b border-gray-700">
        <h3 className="text-sm font-medium text-white">Share Evermark</h3>
        <p className="text-xs text-gray-400 mt-1">{title}</p>
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
              <div className="text-xs text-gray-500">Recommended • Opens in Farcaster app</div>
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
            {platform.name}
          </button>
        );
      })}
      
      {/* Preview section */}
      <div className="border-t border-gray-700 mt-2 p-4">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Share Preview</h4>
        <div className="bg-gray-900/50 rounded p-2">
          <div className="text-xs text-gray-300 mb-1">{title}</div>
          <div className="text-xs text-gray-500">by {author}</div>
        </div>
      </div>
    </>
  );
};

// ShareRedirect component for handling shared links
export const ShareRedirect: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const evermarkId = urlParams.get('id');
  
  React.useEffect(() => {
    if (evermarkId) {
      // Track that someone accessed via share link
      fetch('/.netlify/functions/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evermarkId,
          platform: 'direct_link',
          timestamp: new Date().toISOString(),
          type: 'view'
        })
      }).catch(() => {
        // Ignore analytics failures
      });
      
      // Redirect to the actual Evermark
      window.location.href = `/evermark/${evermarkId}`;
    }
  }, [evermarkId]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
    </div>
  );
};