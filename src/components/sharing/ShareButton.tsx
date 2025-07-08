// src/components/sharing/ShareButton.tsx - ✅ ENHANCED with variants and mobile optimization
import React, { useState } from 'react';
import { 
  ShareIcon, 
  TwitterIcon, 
  CopyIcon, 
  MessageCircleIcon,
  ExternalLinkIcon,
  CheckIcon,
  XIcon
} from 'lucide-react';
import { cn, useIsMobile, touchFriendly } from '../../utils/responsive';

export interface ShareButtonProps {
  evermarkId: string;
  title: string;
  description?: string;
  author: string;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

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
  
  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 'h-6 w-6 p-1',
      iconSize: 'h-3 w-3',
      menuWidth: 'w-48'
    },
    md: {
      button: 'px-3 py-2 text-sm',
      icon: 'h-8 w-8 p-2',
      iconSize: 'h-4 w-4',
      menuWidth: 'w-56'
    },
    lg: {
      button: 'px-4 py-2 text-base',
      icon: 'h-10 w-10 p-2',
      iconSize: 'h-5 w-5',
      menuWidth: 'w-64'
    }
  };
  
  const config = sizeConfig[size];
  
  // Share platforms
  const sharePlatforms = [
    {
      name: 'Twitter',
      icon: TwitterIcon,
      action: () => {
        const tweetText = encodeURIComponent(`${shareText}\n\n${evermarkUrl}`);
        window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
        trackShare('twitter');
      },
      color: 'hover:bg-blue-50 hover:text-blue-600'
    },
    {
      name: 'Farcaster',
      icon: MessageCircleIcon,
      action: () => {
        const castText = encodeURIComponent(`${shareText}\n\n${evermarkUrl}`);
        window.open(`https://farcaster.xyz/~/compose?text=${castText}`, '_blank');
        trackShare('farcaster');
      },
      color: 'hover:bg-purple-50 hover:text-purple-600'
    },
    {
      name: 'Copy Link',
      icon: copySuccess === 'link' ? CheckIcon : CopyIcon,
      action: () => copyToClipboard(evermarkUrl, 'link'),
      color: 'hover:bg-green-50 hover:text-green-600'
    }
  ];
  
  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
      trackShare('copy');
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
      await fetch('/.netlify/functions/track-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evermarkId,
          platform,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer
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
  
  // Button variant
  if (variant === 'button') {
    return (
      <div className="relative">
        <button
          onClick={navigator.share && typeof navigator.share === 'function' && isMobile ? handleNativeShare : () => setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors rounded-lg font-medium",
            config.button,
            touchFriendly.button,
            className
          )}
        >
          <ShareIcon className={cn("mr-2", config.iconSize)} />
          Share
        </button>
        
        {/* Desktop share menu */}
        {isOpen && !isMobile && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className={cn(
              "absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-2",
              config.menuWidth
            )}>
              <ShareMenu 
                platforms={sharePlatforms} 
                config={config}
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
          "rounded-full bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-gray-300 transition-all shadow-sm",
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
            "absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-2",
            config.menuWidth
          )}>
            <ShareMenu 
              platforms={sharePlatforms} 
              config={config}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
};

// Share menu component
const ShareMenu: React.FC<{
  platforms: Array<{
    name: string;
    icon: React.ComponentType<any>;
    action: () => void;
    color: string;
  }>;
  config: any;
  onClose: () => void;
}> = ({ platforms, config, onClose }) => {
  return (
    <>
      <div className="px-4 py-2 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-900">Share Evermark</h3>
      </div>
      {platforms.map((platform) => {
        const IconComponent = platform.icon;
        return (
          <button
            key={platform.name}
            onClick={() => {
              platform.action();
              onClose();
            }}
            className={cn(
              "w-full text-left px-4 py-3 text-sm text-gray-700 transition-colors flex items-center",
              platform.color
            )}
          >
            <IconComponent className={cn("mr-3", config.iconSize)} />
            {platform.name}
          </button>
        );
      })}
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
      fetch('/.netlify/functions/track-share', {
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );
};