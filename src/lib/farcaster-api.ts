// src/lib/farcaster-api.ts - Enhanced Farcaster API integration
import { createClient } from '@supabase/supabase-js';
import React from 'react';

const NEYNAR_API_KEY = import.meta.env.VITE_NEYNAR_API_KEY;
const NEYNAR_CLIENT_ID = import.meta.env.VITE_NEYNAR_CLIENT_ID;
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

// Types for Farcaster data
export interface FarcasterUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
  };
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
}

export interface FarcasterCast {
  hash: string;
  thread_hash: string;
  parent_hash?: string;
  parent_url?: string;
  root_parent_url?: string;
  parent_author?: {
    fid: number;
  };
  author: FarcasterUser;
  text: string;
  timestamp: string;
  embeds: Array<{
    url?: string;
    cast_id?: {
      fid: number;
      hash: string;
    };
  }>;
  mentions: Array<{
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
  }>;
  mentions_positions: number[];
  channel?: {
    id: string;
    name: string;
    description: string;
    image_url: string;
    lead: FarcasterUser;
  };
  reactions: {
    likes_count: number;
    recasts_count: number;
    likes: Array<{
      fid: number;
      fname: string;
    }>;
    recasts: Array<{
      fid: number;
      fname: string;
    }>;
  };
  replies: {
    count: number;
  };
  tags?: Array<{
    type: string;
    id: string;
    name: string;
    image_url: string;
  }>;
}

export interface CastResponse {
  cast: FarcasterCast;
}

export interface CastsResponse {
  casts: FarcasterCast[];
  next?: {
    cursor: string;
  };
}

class FarcasterAPIService {
  private apiKey: string;
  private clientId: string;
  private baseURL: string;

  constructor() {
    this.apiKey = NEYNAR_API_KEY || '';
    this.clientId = NEYNAR_CLIENT_ID || '';
    this.baseURL = NEYNAR_BASE_URL;

    if (!this.apiKey) {
      console.warn('⚠️ Neynar API key not configured');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Neynar API key not configured');
    }

    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Neynar-Client-Id': this.clientId,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neynar API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Get cast by hash
  async getCast(hash: string): Promise<FarcasterCast> {
    const response = await this.makeRequest<CastResponse>('/farcaster/cast', {
      identifier: hash,
      type: 'hash'
    });
    return response.cast;
  }

  // Get casts by FID
  async getCastsByFid(fid: number, limit = 25, cursor?: string): Promise<CastsResponse> {
    return this.makeRequest<CastsResponse>('/farcaster/casts', {
      fid,
      limit,
      cursor
    });
  }

  // Get user by FID
  async getUserByFid(fid: number): Promise<FarcasterUser> {
    const response = await this.makeRequest<{ user: FarcasterUser }>('/farcaster/user/bulk', {
      fids: fid.toString()
    });
    return response.user;
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<FarcasterUser> {
    const response = await this.makeRequest<{ user: FarcasterUser }>('/farcaster/user/by_username', {
      username
    });
    return response.user;
  }

  // Search casts
  async searchCasts(query: string, limit = 25, cursor?: string): Promise<CastsResponse> {
    return this.makeRequest<CastsResponse>('/farcaster/cast/search', {
      q: query,
      limit,
      cursor
    });
  }

  // Get cast reactions
  async getCastReactions(hash: string, reaction_type: 'like' | 'recast' = 'like', limit = 25): Promise<any> {
    return this.makeRequest('/farcaster/cast/reactions', {
      hash,
      types: reaction_type,
      limit
    });
  }

  // Get cast conversations (replies)
  async getCastConversation(hash: string, reply_depth = 2, include_chronological_parent_casts = false): Promise<any> {
    return this.makeRequest('/farcaster/cast/conversation', {
      identifier: hash,
      type: 'hash',
      reply_depth,
      include_chronological_parent_casts
    });
  }

  // Get trending casts
  async getTrendingCasts(time_window: '1h' | '6h' | '24h' = '24h', limit = 25, cursor?: string): Promise<CastsResponse> {
    return this.makeRequest<CastsResponse>('/farcaster/feed/trending', {
      time_window,
      limit,
      cursor
    });
  }

  // Get channel casts
  async getChannelCasts(channel_id: string, limit = 25, cursor?: string): Promise<CastsResponse> {
    return this.makeRequest<CastsResponse>('/farcaster/feed/channels', {
      channel_ids: channel_id,
      limit,
      cursor
    });
  }

  // Validate cast hash format
  isValidCastHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(hash);
  }

  // Extract cast ID from URL
  extractCastFromUrl(url: string): { hash?: string; fid?: number } | null {
    // Handle various Farcaster URL formats
    const patterns = [
      /farcaster:\/\/casts\/([0-9a-fA-F]+)/,
      /warpcast\.com\/([^\/]+)\/([0-9a-fA-F]+)/,
      /supercast\.xyz\/([^\/]+)\/([0-9a-fA-F]+)/,
      /cast\/([0-9a-fA-F]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          hash: match[match.length - 1].startsWith('0x') ? match[match.length - 1] : `0x${match[match.length - 1]}`
        };
      }
    }

    return null;
  }

  // Generate cast embed URL for sharing
  generateCastEmbedUrl(hash: string): string {
    return `https://warpcast.com/~/conversations/${hash}`;
  }

  // Format cast for display
  formatCastForDisplay(cast: FarcasterCast): {
    id: string;
    author: {
      username: string;
      displayName: string;
      fid: number;
      pfpUrl: string;
      isVerified: boolean;
    };
    content: {
      text: string;
      mentionsFormatted: string;
      hasEmbeds: boolean;
      embedCount: number;
    };
    metadata: {
      timestamp: Date;
      channel?: string;
      parentHash?: string;
      isReply: boolean;
    };
    engagement: {
      likes: number;
      recasts: number;
      replies: number;
    };
  } {
    return {
      id: cast.hash,
      author: {
        username: cast.author.username,
        displayName: cast.author.display_name,
        fid: cast.author.fid,
        pfpUrl: cast.author.pfp_url,
        isVerified: cast.author.verifications.length > 0
      },
      content: {
        text: cast.text,
        mentionsFormatted: this.formatMentions(cast.text, cast.mentions, cast.mentions_positions),
        hasEmbeds: cast.embeds.length > 0,
        embedCount: cast.embeds.length
      },
      metadata: {
        timestamp: new Date(cast.timestamp),
        channel: cast.channel?.name,
        parentHash: cast.parent_hash,
        isReply: !!cast.parent_hash
      },
      engagement: {
        likes: cast.reactions.likes_count,
        recasts: cast.reactions.recasts_count,
        replies: cast.replies.count
      }
    };
  }

  // Format mentions in cast text
  private formatMentions(text: string, mentions: FarcasterCast['mentions'], positions: number[]): string {
    if (!mentions.length || !positions.length) return text;

    let formattedText = text;
    let offset = 0;

    // Sort by position to process from left to right
    const sortedMentions = mentions
      .map((mention, index) => ({ ...mention, position: positions[index] }))
      .sort((a, b) => a.position - b.position);

    for (const mention of sortedMentions) {
      const mentionText = `@${mention.username}`;
      const insertPosition = mention.position + offset;
      
      formattedText = 
        formattedText.slice(0, insertPosition) + 
        mentionText + 
        formattedText.slice(insertPosition);
      
      offset += mentionText.length;
    }

    return formattedText;
  }

  // Extract hashtags from cast text
  extractHashtags(text: string): string[] {
    const hashtagRegex = /#\w+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  }

  // Extract URLs from cast text
  extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  }

  // Check if cast contains specific keywords
  containsKeywords(cast: FarcasterCast, keywords: string[]): boolean {
    const text = cast.text.toLowerCase();
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  // Get cast quality score (engagement-based)
  getCastQualityScore(cast: FarcasterCast): number {
    const { likes_count, recasts_count } = cast.reactions;
    const replies_count = cast.replies.count;
    
    // Weighted scoring system
    const likeWeight = 1;
    const recastWeight = 3; // Recasts are more valuable
    const replyWeight = 2;
    
    const engagementScore = (likes_count * likeWeight) + (recasts_count * recastWeight) + (replies_count * replyWeight);
    
    // Factor in text quality (length, mentions, embeds)
    const textQualityScore = Math.min(cast.text.length / 280, 1) * 10; // Normalize to 0-10
    const mentionBonus = cast.mentions.length * 2;
    const embedBonus = cast.embeds.length * 5;
    
    return engagementScore + textQualityScore + mentionBonus + embedBonus;
  }
}

// Export singleton instance
export const farcasterAPI = new FarcasterAPIService();

// Export utility functions
export const castUtils = {
  isValidHash: (hash: string) => farcasterAPI.isValidCastHash(hash),
  extractFromUrl: (url: string) => farcasterAPI.extractCastFromUrl(url),
  generateEmbedUrl: (hash: string) => farcasterAPI.generateCastEmbedUrl(hash),
  formatForDisplay: (cast: FarcasterCast) => farcasterAPI.formatCastForDisplay(cast),
  extractHashtags: (text: string) => farcasterAPI.extractHashtags(text),
  extractUrls: (text: string) => farcasterAPI.extractUrls(text),
  containsKeywords: (cast: FarcasterCast, keywords: string[]) => farcasterAPI.containsKeywords(cast, keywords),
  getQualityScore: (cast: FarcasterCast) => farcasterAPI.getCastQualityScore(cast)
};

// React hook for fetching cast data
export function useCastData(hash: string | null) {
  const [cast, setCast] = React.useState<FarcasterCast | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!hash) {
      setCast(null);
      setError(null);
      return;
    }

    // Clean the hash if it's missing 0x prefix
    const cleanHash = hash.startsWith('0x') ? hash : `0x${hash}`;
    
    if (!farcasterAPI.isValidCastHash(cleanHash)) {
      setCast(null);
      setError('Invalid cast hash format');
      return;
    }

    const fetchCast = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const castData = await farcasterAPI.getCast(cleanHash);
        setCast(castData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cast');
        setCast(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCast();
  }, [hash]);

  return { cast, isLoading, error };
}

// Hook for fetching user data
export function useFarcasterUserData(fid: number | null) {
  const [user, setUser] = React.useState<FarcasterUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!fid) {
      setUser(null);
      setError(null);
      return;
    }

    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const userData = await farcasterAPI.getUserByFid(fid);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [fid]);

  return { user, isLoading, error };
}