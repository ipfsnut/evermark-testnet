// src/utils/evermark-meta.ts - Generate meta tags for Evermark sharing
import React from 'react';
import { type FarcasterCast } from '../lib/farcaster-api';

export interface EvermarkMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  authorAddress?: string;
  category: string;
  tags: string[];
  createdAt: string;
  engagement?: {
    likes: number;
    collects: number;
    shares: number;
  };
  sourceData?: {
    type: 'farcaster_cast' | 'user_created';
    castHash?: string;
    richCastData?: any;
  };
}

export class EvermarkMetaGenerator {
  private baseUrl: string;

  constructor(baseUrl: string = window.location.origin) {
    this.baseUrl = baseUrl;
  }

  // Generate Farcaster Mini App embed meta tag
  generateFarcasterEmbed(evermark: EvermarkMetadata): string {
    const imageUrl = this.generateOGImageUrl(evermark);
    const evermarkUrl = `${this.baseUrl}/evermark/${evermark.id}`;
    
    const miniAppEmbed = {
      version: "1",
      imageUrl,
      button: {
        title: "📖 Read on Evermark",
        action: {
          type: "launch_miniapp",
          url: evermarkUrl,
          name: "Evermark",
          splashImageUrl: `${this.baseUrl}/logo.png`,
          splashBackgroundColor: "#7c3aed"
        }
      }
    };

    return JSON.stringify(miniAppEmbed);
  }

  // Generate all meta tags for an Evermark page
  generateMetaTags(evermark: EvermarkMetadata): string {
    const ogImageUrl = this.generateOGImageUrl(evermark);
    const evermarkUrl = `${this.baseUrl}/evermark/${evermark.id}`;
    const farcasterEmbed = this.generateFarcasterEmbed(evermark);
    
    const description = this.truncateDescription(evermark.description, 160);
    const title = `${evermark.title} by ${evermark.author} | Evermark`;

    return `
    <!-- Basic Meta Tags -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${evermark.tags.join(', ')}, evermark, farcaster, web3, blockchain" />
    <meta name="author" content="${evermark.author}" />
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:url" content="${evermarkUrl}" />
    <meta property="og:site_name" content="Evermark" />
    <meta property="article:author" content="${evermark.author}" />
    <meta property="article:published_time" content="${evermark.createdAt}" />
    <meta property="article:section" content="${evermark.category}" />
    ${evermark.tags.map(tag => `<meta property="article:tag" content="${tag}" />`).join('\n    ')}
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
    <meta name="twitter:creator" content="@evermarkapp" />
    <meta name="twitter:site" content="@evermarkapp" />
    
    <!-- Farcaster Mini App Meta Tags -->
    <meta name="fc:miniapp" content='${farcasterEmbed}' />
    <!-- For backward compatibility -->
    <meta name="fc:frame" content='${farcasterEmbed.replace('"launch_miniapp"', '"launch_frame"')}' />
    
    <!-- Additional Structured Data -->
    <script type="application/ld+json">
    ${this.generateStructuredData(evermark)}
    </script>
    `.trim();
  }

  // Generate OG image URL with parameters
  generateOGImageUrl(evermark: EvermarkMetadata): string {
    const params = new URLSearchParams({
      id: evermark.id,
      title: evermark.title.slice(0, 100),
      author: evermark.author,
      category: evermark.category,
      // Include engagement data if available
      ...(evermark.engagement && {
        likes: evermark.engagement.likes.toString(),
        collects: evermark.engagement.collects.toString()
      }),
      // Include source type for styling
      ...(evermark.sourceData?.type && {
        source: evermark.sourceData.type
      })
    });

    return `${this.baseUrl}/api/og/evermark?${params.toString()}`;
  }

  // Generate structured data for SEO
  private generateStructuredData(evermark: EvermarkMetadata): string {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": evermark.title,
      "description": this.truncateDescription(evermark.description, 200),
      "author": {
        "@type": "Person",
        "name": evermark.author,
        ...(evermark.authorAddress && {
          "identifier": evermark.authorAddress
        })
      },
      "dateCreated": evermark.createdAt,
      "category": evermark.category,
      "keywords": evermark.tags.join(', '),
      "url": `${this.baseUrl}/evermark/${evermark.id}`,
      "image": this.generateOGImageUrl(evermark),
      "publisher": {
        "@type": "Organization",
        "name": "Evermark",
        "url": this.baseUrl,
        "logo": `${this.baseUrl}/logo.png`
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${this.baseUrl}/evermark/${evermark.id}`
      },
      ...(evermark.engagement && {
        "interactionStatistic": [
          {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/LikeAction",
            "userInteractionCount": evermark.engagement.likes
          },
          {
            "@type": "InteractionCounter", 
            "interactionType": "https://schema.org/ShareAction",
            "userInteractionCount": evermark.engagement.shares
          }
        ]
      })
    };

    return JSON.stringify(structuredData, null, 2);
  }

  // Truncate description to specified length
  private truncateDescription(description: string, maxLength: number): string {
    if (description.length <= maxLength) return description;
    
    const truncated = description.slice(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
  }

  // Generate share text for social platforms
  generateShareText(evermark: EvermarkMetadata, platform: 'twitter' | 'farcaster' = 'farcaster'): string {
    const baseText = `Check out "${evermark.title}" by ${evermark.author} on Evermark`;
    const url = `${this.baseUrl}/evermark/${evermark.id}`;
    
    const hashtags = platform === 'twitter' 
      ? evermark.tags.slice(0, 3).map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ')
      : '';

    switch (platform) {
      case 'twitter':
        return `${baseText}\n\n${url} ${hashtags}`.trim();
      case 'farcaster':
        return `${baseText}\n\n${url}`;
      default:
        return `${baseText}\n\n${url}`;
    }
  }

  // Generate cast context for Farcaster sharing when created from cast
  generateCastContext(evermark: EvermarkMetadata): string | null {
    if (evermark.sourceData?.type === 'farcaster_cast' && evermark.sourceData.castHash) {
      const castHash = evermark.sourceData.castHash;
      const richData = evermark.sourceData.richCastData;
      
      let context = `This Evermark preserves a Farcaster cast (${castHash.slice(0, 8)}...)`;
      
      if (richData?.author) {
        context += ` by ${richData.author.displayName} (@${richData.author.username})`;
      }
      
      if (richData?.channel) {
        context += ` from /${richData.channel}`;
      }
      
      return context;
    }
    
    return null;
  }
}

// React component for injecting meta tags
export const EvermarkMetaTags: React.FC<{ evermark: EvermarkMetadata }> = ({ evermark }) => {
  const metaGenerator = new EvermarkMetaGenerator();
  
  React.useEffect(() => {
    // Update document title
    document.title = `${evermark.title} by ${evermark.author} | Evermark`;
    
    // Generate and inject meta tags
    const metaTags = metaGenerator.generateMetaTags(evermark);
    
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = metaTags;
    
    // Extract and inject meta tags
    const metaElements = tempDiv.querySelectorAll('meta, script');
    metaElements.forEach(element => {
      const clone = element.cloneNode(true) as HTMLElement;
      
      if (element.tagName === 'META') {
        const property = clone.getAttribute('property') || clone.getAttribute('name');
        if (property) {
          // Remove existing meta tag with same property/name
          const existing = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
          if (existing) {
            existing.remove();
          }
          // Add new meta tag
          document.head.appendChild(clone);
        }
      } else if (element.tagName === 'SCRIPT') {
        // Handle structured data
        const existing = document.querySelector('script[type="application/ld+json"]');
        if (existing) {
          existing.remove();
        }
        document.head.appendChild(clone);
      }
    });
    
    // Cleanup function to remove meta tags when component unmounts
    return () => {
      metaElements.forEach(element => {
        const property = element.getAttribute('property') || element.getAttribute('name');
        if (property) {
          const existing = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
          if (existing) {
            existing.remove();
          }
        }
      });
    };
  }, [evermark, metaGenerator]);
  
  return null; // This component doesn't render anything visible
};

// Hook for generating share URLs and text
export const useEvermarkSharing = (evermark: EvermarkMetadata) => {
  const metaGenerator = new EvermarkMetaGenerator();
  
  const shareUrls = React.useMemo(() => {
    const baseUrl = `${window.location.origin}/evermark/${evermark.id}`;
    const twitterText = encodeURIComponent(metaGenerator.generateShareText(evermark, 'twitter'));
    const farcasterText = encodeURIComponent(metaGenerator.generateShareText(evermark, 'farcaster'));
    
    return {
      direct: baseUrl,
      twitter: `https://twitter.com/intent/tweet?text=${twitterText}`,
      farcaster: `https://warpcast.com/~/compose?text=${farcasterText}`,
      universal: `https://farcaster.xyz/miniapps/evermark/${evermark.id}`
    };
  }, [evermark, metaGenerator]);
  
  const shareText = React.useMemo(() => ({
    twitter: metaGenerator.generateShareText(evermark, 'twitter'),
    farcaster: metaGenerator.generateShareText(evermark, 'farcaster'),
    context: metaGenerator.generateCastContext(evermark)
  }), [evermark, metaGenerator]);
  
  return { shareUrls, shareText };
};

// Export singleton instance
export const evermarkMeta = new EvermarkMetaGenerator();

// Utility functions
export const metaUtils = {
  generateShareText: (evermark: EvermarkMetadata, platform: 'twitter' | 'farcaster' = 'farcaster') => 
    new EvermarkMetaGenerator().generateShareText(evermark, platform),
  
  generateOGImageUrl: (evermark: EvermarkMetadata) => 
    new EvermarkMetaGenerator().generateOGImageUrl(evermark),
    
  generateFarcasterEmbed: (evermark: EvermarkMetadata) => 
    new EvermarkMetaGenerator().generateFarcasterEmbed(evermark),
    
  getCastContext: (evermark: EvermarkMetadata) => 
    new EvermarkMetaGenerator().generateCastContext(evermark)
};