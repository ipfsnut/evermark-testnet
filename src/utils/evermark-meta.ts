// src/utils/evermark-meta.ts - Enhanced metadata generation for Evermarks
import React from 'react';
import type { FarcasterCast } from '../lib/farcaster-api';

export interface EvermarkMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  creator: string;
  creationTime: number;
  image?: string;
  sourceUrl?: string;
  tags: string[];
  category?: string;
  farcasterData?: {
    castHash: string;
    authorFid: number;
    authorUsername: string;
    engagement: {
      likes: number;
      recasts: number;
      replies: number;
    };
    qualityScore: number;
  };
}

export interface MetaTagConfig {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: string;
  siteName?: string;
}

export class EvermarkMetaGenerator {
  private baseUrl: string;
  private defaultImage: string;
  private siteName: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || window.location.origin;
    this.defaultImage = `${this.baseUrl}/og-default.png`;
    this.siteName = 'Evermark';
  }

  /**
   * Generate comprehensive meta tags for an Evermark
   */
  generateMetaTags(evermark: EvermarkMetadata): string {
    const config: MetaTagConfig = {
      title: `${evermark.title} | ${this.siteName}`,
      description: this.generateMetaDescription(evermark),
      image: this.generateOGImageUrl(evermark),
      url: `${this.baseUrl}/evermark/${evermark.id}`,
      type: 'article',
      siteName: this.siteName
    };

    return this.buildMetaTagsHTML(config, evermark);
  }

  /**
   * Generate meta description with rich context
   */
  generateMetaDescription(evermark: EvermarkMetadata): string {
    const baseDescription = evermark.description?.slice(0, 120) || 
                           `An Evermark by ${evermark.author}`;
    
    const contextParts: string[] = [baseDescription];
    
    // Add Farcaster context
    if (evermark.farcasterData) {
      contextParts.push(`Originally shared on Farcaster by @${evermark.farcasterData.authorUsername}`);
      
      // Add engagement if significant
      const totalEngagement = evermark.farcasterData.engagement.likes + 
                             evermark.farcasterData.engagement.recasts + 
                             evermark.farcasterData.engagement.replies;
      
      if (totalEngagement > 10) {
        contextParts.push(`${totalEngagement} engagements`);
      }
    }
    
    // Add category context
    if (evermark.category && evermark.category !== 'other') {
      contextParts.push(`#${evermark.category}`);
    }
    
    return contextParts.join(' • ').slice(0, 155);
  }

  /**
   * Generate dynamic OG image URL with parameters
   */
  generateOGImageUrl(evermark: EvermarkMetadata): string {
    if (evermark.image) {
      return evermark.image;
    }

    const params = new URLSearchParams({
      title: evermark.title.slice(0, 60),
      author: evermark.author,
      type: evermark.farcasterData ? 'farcaster' : 'evermark',
      category: evermark.category || 'general'
    });

    // Add engagement data for Farcaster casts
    if (evermark.farcasterData) {
      params.set('likes', evermark.farcasterData.engagement.likes.toString());
      params.set('recasts', evermark.farcasterData.engagement.recasts.toString());
      params.set('quality', Math.round(evermark.farcasterData.qualityScore).toString());
    }

    return `${this.baseUrl}/.netlify/functions/og-image?${params.toString()}`;
  }

  /**
   * Generate Farcaster-specific embed tags
   */
  generateFarcasterEmbed(evermark: EvermarkMetadata): string {
    const frameUrl = `${this.baseUrl}/evermark/${evermark.id}`;
    
    return `
    <!-- Farcaster Frame/Mini App Tags -->
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${this.generateOGImageUrl(evermark)}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="View Evermark" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${frameUrl}" />
    
    <!-- Farcaster Mini App Integration -->
    <meta property="fc:miniapp:manifest" content="${this.baseUrl}/.well-known/farcaster.json" />
    <meta property="fc:miniapp:url" content="${frameUrl}" />
    <meta property="fc:miniapp:name" content="${this.siteName}" />
    `;
  }

  /**
   * Generate share text for different platforms
   */
  generateShareText(evermark: EvermarkMetadata, platform: 'twitter' | 'farcaster' | 'generic' = 'generic'): string {
    const baseText = `"${evermark.title}" by ${evermark.author}`;
    const url = `${this.baseUrl}/evermark/${evermark.id}`;
    
    switch (platform) {
      case 'twitter':
        const hashtags = ['#Evermark', '#Web3'];
        if (evermark.farcasterData) hashtags.push('#Farcaster');
        if (evermark.category) hashtags.push(`#${evermark.category}`);
        
        return `${baseText}\n\n${url}\n\n${hashtags.join(' ')}`;
        
      case 'farcaster':
        const castText = evermark.farcasterData 
          ? `Check out this preserved cast: ${baseText}`
          : `Discover: ${baseText}`;
          
        return `${castText}\n\n${url}`;
        
      default:
        return `${baseText}\n\n${url}`;
    }
  }

  /**
   * Generate structured data for SEO
   */
  generateStructuredData(evermark: EvermarkMetadata): string {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": evermark.title,
      "description": evermark.description,
      "author": {
        "@type": "Person",
        "name": evermark.author
      },
      "creator": {
        "@type": "Person",
        "name": evermark.creator
      },
      "dateCreated": new Date(evermark.creationTime).toISOString(),
      "url": `${this.baseUrl}/evermark/${evermark.id}`,
      "image": this.generateOGImageUrl(evermark),
      "publisher": {
        "@type": "Organization",
        "name": this.siteName,
        "url": this.baseUrl
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${this.baseUrl}/evermark/${evermark.id}`
      }
    };

    // Add category/genre if available
    if (evermark.category) {
      (structuredData as any).genre = evermark.category;
    }

    // Add Farcaster-specific data
    if (evermark.farcasterData) {
      (structuredData as any).isBasedOn = {
        "@type": "SocialMediaPosting",
        "identifier": evermark.farcasterData.castHash,
        "author": {
          "@type": "Person",
          "identifier": evermark.farcasterData.authorFid.toString(),
          "alternateName": evermark.farcasterData.authorUsername
        }
      };
    }

    return `<script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>`;
  }

  /**
   * Build complete HTML meta tags
   */
  private buildMetaTagsHTML(config: MetaTagConfig, evermark: EvermarkMetadata): string {
    return `
    <!-- Basic Meta Tags -->
    <title>${config.title}</title>
    <meta name="description" content="${config.description}" />
    <meta name="author" content="${evermark.author}" />
    <meta name="creator" content="${evermark.creator}" />
    <link rel="canonical" href="${config.url}" />
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="${config.type}" />
    <meta property="og:title" content="${config.title}" />
    <meta property="og:description" content="${config.description}" />
    <meta property="og:image" content="${config.image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${evermark.title} - ${this.siteName}" />
    <meta property="og:url" content="${config.url}" />
    <meta property="og:site_name" content="${config.siteName}" />
    <meta property="article:author" content="${evermark.author}" />
    <meta property="article:published_time" content="${new Date(evermark.creationTime).toISOString()}" />
    ${evermark.category ? `<meta property="article:section" content="${evermark.category}" />` : ''}
    ${evermark.tags.map(tag => `<meta property="article:tag" content="${tag}" />`).join('\n    ')}
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${config.title}" />
    <meta name="twitter:description" content="${config.description}" />
    <meta name="twitter:image" content="${config.image}" />
    <meta name="twitter:image:alt" content="${evermark.title} - ${this.siteName}" />
    <meta name="twitter:creator" content="@evermark_app" />
    <meta name="twitter:site" content="@evermark_app" />
    
    ${this.generateFarcasterEmbed(evermark)}
    
    <!-- Additional Meta -->
    <meta name="robots" content="index, follow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#8B5CF6" />
    
    ${this.generateStructuredData(evermark)}
    `;
  }

  /**
   * Extract enhanced metadata from a Farcaster cast
   */
  static fromFarcasterCast(
    cast: FarcasterCast, 
    evermarkId: string, 
    creator: string,
    creationTime: number,
    userTitle?: string,
    userDescription?: string,
    userTags?: string[]
  ): EvermarkMetadata {
    const engagement = {
      likes: cast.reactions.likes_count,
      recasts: cast.reactions.recasts_count,
      replies: cast.replies.count
    };

    // Calculate quality score
    const qualityScore = (engagement.likes * 1) + (engagement.recasts * 3) + (engagement.replies * 2);

    return {
      id: evermarkId,
      title: userTitle || `"${cast.text.slice(0, 50)}..." by ${cast.author.display_name}`,
      description: userDescription || 
                  `Evermark preserving a Farcaster cast by ${cast.author.display_name} (@${cast.author.username}): "${cast.text}"`,
      author: cast.author.display_name,
      creator,
      creationTime,
      sourceUrl: `https://warpcast.com/~/conversations/${cast.hash}`,
      tags: userTags || ['farcaster', 'cast', 'social', cast.channel?.name].filter((tag): tag is string => Boolean(tag)),
      category: cast.channel?.name || 'social',
      farcasterData: {
        castHash: cast.hash,
        authorFid: cast.author.fid,
        authorUsername: cast.author.username,
        engagement,
        qualityScore
      }
    };
  }
}

// React hook for generating Evermark metadata
export function useEvermarkSharing(evermark: EvermarkMetadata | null) {
  const [metaGenerator] = React.useState(() => new EvermarkMetaGenerator());
  
  const metaTags = React.useMemo(() => {
    return evermark ? metaGenerator.generateMetaTags(evermark) : null;
  }, [evermark, metaGenerator]);
  
  const shareText = React.useCallback((platform: 'twitter' | 'farcaster' | 'generic' = 'generic') => {
    return evermark ? metaGenerator.generateShareText(evermark, platform) : '';
  }, [evermark, metaGenerator]);
  
  const ogImageUrl = React.useMemo(() => {
    return evermark ? metaGenerator.generateOGImageUrl(evermark) : null;
  }, [evermark, metaGenerator]);

  return {
    metaTags,
    shareText,
    ogImageUrl,
    generator: metaGenerator
  };
}

export default EvermarkMetaGenerator;