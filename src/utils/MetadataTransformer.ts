// src/utils/MetadataTransformer.ts - Centralized metadata processing and validation
import type { EvermarkRow } from '../lib/supabase';

// 🎯 UNIFIED: Single source of truth for all Evermark metadata
export interface StandardizedEvermark {
  id: string;
  title: string;
  description: string;
  author: string;
  creator: string; // Contract address or verified creator
  
  // 🔧 FIXED: Consistent timestamp handling
  creationTime: number; // Always Unix timestamp in seconds
  createdAt: string; // Always ISO string
  updatedAt: string; // Always ISO string
  
  // 🔧 FIXED: Reliable image resolution
  image: string; // Processed, verified image URL
  imageStatus: 'processed' | 'processing' | 'failed' | 'none';
  
  // Content source info
  sourceUrl: string;
  contentType: 'DOI' | 'ISBN' | 'URL' | 'Cast' | 'Custom';
  
  // Blockchain data
  metadataURI: string;
  txHash: string;
  blockNumber: number;
  
  // Additional metadata
  tags: string[];
  category: string;
  verified: boolean;
  
  // 🔧 FIXED: Type-safe metadata instead of any
  extendedMetadata: EvermarkExtendedMetadata;
}

// 🎯 TYPED: Replace any types with proper interfaces
export interface EvermarkExtendedMetadata {
  // Source tracking
  source: 'blockchain' | 'api' | 'manual';
  syncedAt?: string;
  
  // Content-specific data
  doi?: string;
  isbn?: string;
  castData?: FarcasterCastMetadata;
  
  // Processing status
  imageProcessing?: {
    status: 'pending' | 'completed' | 'failed';
    processedAt?: string;
    originalUrl?: string;
    processingErrors?: string[];
  };
  
  // Creator verification
  creatorVerification?: {
    method: 'farcaster' | 'wallet' | 'ens' | 'manual';
    verified: boolean;
    verifiedAt?: string;
  };
  
  // Engagement data (if available)
  engagement?: {
    views: number;
    votes: string; // BigInt as string
    lastUpdated: string;
  };
}

export interface FarcasterCastMetadata {
  castHash: string;
  authorFid: number;
  authorUsername: string;
  authorDisplayName: string;
  originalText: string;
  timestamp: string;
  engagement: {
    likes: number;
    recasts: number;
    replies: number;
  };
  canonicalUrl: string;
}

// 🚨 CRITICAL FIX: Centralized timestamp handling
export class TimestampProcessor {
  /**
   * Convert any timestamp format to reliable Unix timestamp (seconds)
   */
  static toUnixTimestamp(input: any): number {
    if (!input) {
      console.warn('⚠️ No timestamp provided, using current time');
      return Math.floor(Date.now() / 1000);
    }

    try {
      // Already a number - validate range
      if (typeof input === 'number') {
        // If it looks like milliseconds, convert to seconds
        if (input > 1e12) {
          return Math.floor(input / 1000);
        }
        // If it's a reasonable Unix timestamp (after 2020)
        if (input > 1577836800) { // Jan 1, 2020
          return Math.floor(input);
        }
        // If it's too small, might be a mistake - use current time
        console.warn('⚠️ Suspicious timestamp value:', input);
        return Math.floor(Date.now() / 1000);
      }

      // String input - try parsing
      if (typeof input === 'string') {
        const parsed = new Date(input);
        if (isNaN(parsed.getTime())) {
          console.warn('⚠️ Invalid date string:', input);
          return Math.floor(Date.now() / 1000);
        }
        return Math.floor(parsed.getTime() / 1000);
      }

      // BigInt input (from blockchain)
      if (typeof input === 'bigint') {
        const num = Number(input);
        // Blockchain timestamps are usually in seconds
        if (num > 1577836800) {
          return num;
        }
      }

      console.warn('⚠️ Unrecognized timestamp format:', typeof input, input);
      return Math.floor(Date.now() / 1000);
    } catch (error) {
      console.error('❌ Timestamp processing error:', error, input);
      return Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Convert Unix timestamp to ISO string
   */
  static toISOString(unixTimestamp: number): string {
    try {
      return new Date(unixTimestamp * 1000).toISOString();
    } catch (error) {
      console.error('❌ ISO conversion error:', error);
      return new Date().toISOString();
    }
  }

  /**
   * Validate and normalize timestamp from multiple sources
   */
  static extractCreationTime(metadata: any): number {
    // 🔧 FIXED: Updated to match your actual database structure
    const sources = [
      // Direct metadata fields
      metadata?.creationTime,
      metadata?.created_at,
      metadata?.syncedAt,
      metadata?.timestamp,
      
      // From originalMetadata.evermark (if it exists)
      metadata?.originalMetadata?.evermark?.createdAt,
      metadata?.originalMetadata?.evermark?.creationTime,
      
      // 🔧 NEW: From attributes array (your actual data structure!)
      // Look for "Created" trait_type in attributes
      (() => {
        const attributes = metadata?.originalMetadata?.attributes;
        if (Array.isArray(attributes)) {
          const createdAttr = attributes.find(attr => 
            attr?.trait_type === 'Created' || 
            attr?.trait_type === 'created' ||
            attr?.trait_type === 'createdAt'
          );
          return createdAttr?.value;
        }
        return null;
      })(),
      
      // From top-level originalMetadata
      metadata?.originalMetadata?.createdAt,
      metadata?.originalMetadata?.created_at,
    ];

    for (const source of sources) {
      if (source) {
        const timestamp = this.toUnixTimestamp(source);
        // Sanity check - should be between 2020 and 2030
        if (timestamp > 1577836800 && timestamp < 1893456000) {
          console.log('✅ Found valid timestamp:', source, '→', timestamp);
          return timestamp;
        }
      }
    }

    console.warn('⚠️ No valid timestamp found in metadata, using current time. Sources checked:', sources.filter(Boolean));
    return Math.floor(Date.now() / 1000);
  }
}

// 🔥 HIGH: Standardized image resolution with clear fallback hierarchy
export class ImageResolver {
  // 🔧 FIXED: Make FALLBACK_IMAGE public so it can be accessed
  static readonly FALLBACK_IMAGE = '/images/evermark-placeholder.svg';
  private static readonly IPFS_GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/'
  ];

  /**
   * Resolve image URL with clear priority order and validation
   */
  static resolveImageUrl(data: Partial<EvermarkRow>): string {
    // Priority order for image sources
    const imageSources = [
      // 1. Processed image (highest priority)
      data.processed_image_url,
      
      // 2. Original metadata image
      data.metadata?.originalMetadata?.image,
      
      // 3. General metadata image
      data.metadata?.image,
      
      // 4. Legacy image field - safely access nested properties
      data.metadata && typeof data.metadata === 'object' && 'imageUrl' in data.metadata ? 
        (data.metadata as any).imageUrl : undefined,
      
      // 5. Fallback
      this.FALLBACK_IMAGE
    ];

    for (const source of imageSources) {
      if (source) {
        const resolved = this.processImageUrl(source);
        if (resolved) return resolved;
      }
    }

    return this.FALLBACK_IMAGE;
  }

  /**
   * Process individual image URL with IPFS handling
   */
  private static processImageUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    try {
      // Handle IPFS URLs
      if (url.startsWith('ipfs://')) {
        const hash = url.replace('ipfs://', '');
        // Use first gateway as primary
        return `${this.IPFS_GATEWAYS[0]}${hash}`;
      }

      // Validate HTTP URLs
      if (url.startsWith('http://') || url.startsWith('https://')) {
        new URL(url); // Throws if invalid
        return url;
      }

      // Handle relative URLs
      if (url.startsWith('/')) {
        return url;
      }

      // If it looks like an IPFS hash without prefix
      if (/^Qm[a-zA-Z0-9]{44}$/.test(url) || /^b[a-z2-7]{58}$/.test(url)) {
        return `${this.IPFS_GATEWAYS[0]}${url}`;
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Invalid image URL:', url, error);
      return null;
    }
  }

  /**
   * Get image processing status
   */
  static getImageStatus(data: Partial<EvermarkRow>): StandardizedEvermark['imageStatus'] {
    if (data.processed_image_url) return 'processed';
    if (data.image_processing_status === 'processing') return 'processing';
    if (data.image_processing_status === 'failed') return 'failed';
    return 'none';
  }

  /**
   * Generate multiple IPFS gateway URLs for redundancy
   */
  static getIpfsGatewayUrls(ipfsHash: string): string[] {
    const cleanHash = ipfsHash.replace('ipfs://', '');
    return this.IPFS_GATEWAYS.map(gateway => `${gateway}${cleanHash}`);
  }
}

// ⚠️ MEDIUM: Unified metadata transformation
export class MetadataTransformer {
  /**
   * Convert EvermarkRow to StandardizedEvermark with full validation
   */
  static transform(row: EvermarkRow): StandardizedEvermark {
    try {
      // 🔧 FIXED: Reliable timestamp processing
      const creationTime = TimestampProcessor.extractCreationTime(row.metadata);
      const createdAt = row.created_at || TimestampProcessor.toISOString(creationTime);
      const updatedAt = row.updated_at || createdAt;

      // 🔧 FIXED: Reliable image resolution
      const image = ImageResolver.resolveImageUrl(row);
      const imageStatus = ImageResolver.getImageStatus(row);

      // 🔧 FIXED: Author/Creator attribution consistency
      const { author, creator } = this.resolveAttribution(row);

      // 🔧 FIXED: Content type detection
      const contentType = this.detectContentType(row);

      // 🔧 FIXED: Type-safe metadata extraction
      const extendedMetadata = this.extractExtendedMetadata(row);

      return {
        id: row.id,
        title: row.title || `Evermark #${row.id}`,
        description: row.description || '',
        author,
        creator,
        
        creationTime,
        createdAt,
        updatedAt,
        
        image,
        imageStatus,
        
        sourceUrl: this.extractSourceUrl(row),
        contentType,
        
        metadataURI: row.metadata?.metadataURI || row.metadata?.tokenURI || '',
        txHash: row.tx_hash || '',
        blockNumber: Number(row.block_number) || 0,
        
        tags: this.extractTags(row),
        category: this.extractCategory(row),
        verified: row.verified || false,
        
        extendedMetadata
      };
    } catch (error) {
      console.error('❌ Metadata transformation error:', error, row);
      // Return safe fallback
      return this.createFallbackEvermark(row);
    }
  }

  /**
   * Resolve author vs creator attribution consistently
   */
  private static resolveAttribution(row: EvermarkRow): { author: string; creator: string } {
    // 🔧 FIXED: Handle your actual data structure with attributes
    
    // Extract author from attributes array
    const getFromAttributes = (traitType: string) => {
      const attributes = row.metadata?.originalMetadata?.attributes;
      if (Array.isArray(attributes)) {
        const attr = attributes.find(a => a?.trait_type === traitType);
        return attr?.value;
      }
      return null;
    };

    // Priority order for author
    const authorSources = [
      row.author, // Direct from table
      getFromAttributes('Author'), // From your attributes structure
      getFromAttributes('author'),
      row.metadata?.originalMetadata?.evermark?.author,
      row.metadata?.creator,
      row.metadata?.originalMetadata?.name, // Fallback to name
      'Unknown Author'
    ];

    // Priority order for creator (contract/blockchain creator)  
    const creatorSources = [
      row.metadata?.minter,
      row.metadata?.creator,
      getFromAttributes('Creator'),
      getFromAttributes('Minter'),
      row.user_id,
      'Unknown Creator'
    ];

    const author = authorSources.find(Boolean) || 'Unknown Author';
    const creator = creatorSources.find(Boolean) || 'Unknown Creator';

    return { author, creator };
  }

  /**
   * Detect content type from metadata
   */
  private static detectContentType(row: EvermarkRow): StandardizedEvermark['contentType'] {
    const metadata = row.metadata;
    
    // 🔧 FIXED: Check attributes for Content Type
    const getFromAttributes = (traitType: string) => {
      const attributes = metadata?.originalMetadata?.attributes;
      if (Array.isArray(attributes)) {
        const attr = attributes.find(a => a?.trait_type === traitType);
        return attr?.value;
      }
      return null;
    };

    const contentTypeFromAttributes = getFromAttributes('Content Type');
    
    // Map your attribute values to our types
    if (contentTypeFromAttributes) {
      if (contentTypeFromAttributes.includes('DOI')) return 'DOI';
      if (contentTypeFromAttributes.includes('ISBN')) return 'ISBN';
      if (contentTypeFromAttributes.includes('Cast') || contentTypeFromAttributes.includes('Farcaster')) return 'Cast';
      if (contentTypeFromAttributes.includes('URL') || contentTypeFromAttributes.includes('Web')) return 'URL';
      if (contentTypeFromAttributes.includes('Custom')) return 'Custom';
    }
    
    // Fallback to checking evermark data
    const evermarkData = metadata?.originalMetadata?.evermark;
    if (evermarkData?.doi || metadata?.doi) return 'DOI';
    if (evermarkData?.isbn || metadata?.isbn) return 'ISBN';
    if (evermarkData?.farcasterData || metadata?.farcasterData) return 'Cast';
    if (evermarkData?.sourceUrl || metadata?.originalMetadata?.external_url || metadata?.sourceUrl) return 'URL';
    
    return 'Custom';
  }

  /**
   * Extract source URL consistently
   */
  private static extractSourceUrl(row: EvermarkRow): string {
    const metadata = row.metadata;
    
    // 🔧 FIXED: Check attributes for Source URL
    const getFromAttributes = (traitType: string) => {
      const attributes = metadata?.originalMetadata?.attributes;
      if (Array.isArray(attributes)) {
        const attr = attributes.find(a => a?.trait_type === traitType);
        return attr?.value;
      }
      return null;
    };
    
    const sources = [
      getFromAttributes('Source URL'), // From your attributes structure
      getFromAttributes('source_url'),
      getFromAttributes('sourceUrl'),
      metadata?.originalMetadata?.external_url,
      metadata?.sourceUrl,
      metadata?.originalMetadata?.evermark?.sourceUrl,
      metadata?.originalMetadata?.evermark?.farcasterData?.canonicalUrl,
      metadata?.originalMetadata?.evermark?.castUrl,
      ''
    ];

    return sources.find(Boolean) || '';
  }

  /**
   * Extract tags with fallbacks
   */
  private static extractTags(row: EvermarkRow): string[] {
    const metadata = row.metadata;
    const evermarkData = metadata?.originalMetadata?.evermark;
    
    const tagSources = [
      evermarkData?.tags,
      metadata?.tags,
      // Safely access keywords if it exists
      metadata?.originalMetadata && typeof metadata.originalMetadata === 'object' && 'keywords' in metadata.originalMetadata ?
        (metadata.originalMetadata as any).keywords : undefined
    ];

    for (const source of tagSources) {
      if (Array.isArray(source)) {
        return source.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
      }
    }

    return [];
  }

  /**
   * Extract category with fallbacks
   */
  private static extractCategory(row: EvermarkRow): string {
    const metadata = row.metadata;
    const evermarkData = metadata?.originalMetadata?.evermark;
    
    const categorySources = [
      evermarkData?.contentType,
      metadata?.category,
      // Safely access genre if it exists
      metadata?.originalMetadata && typeof metadata.originalMetadata === 'object' && 'genre' in metadata.originalMetadata ?
        (metadata.originalMetadata as any).genre : undefined,
      'general'
    ];

    return categorySources.find(Boolean) || 'general';
  }

  /**
   * Extract extended metadata safely with proper type checking
   */
  private static extractExtendedMetadata(row: EvermarkRow): EvermarkExtendedMetadata {
    const metadata = row.metadata;
    const evermarkData = metadata?.originalMetadata?.evermark;
    
    // 🔧 FIXED: Ensure source is typed correctly
    let source: 'blockchain' | 'api' | 'manual' = 'manual';
    if (metadata?.source === 'blockchain' || metadata?.source === 'api' || metadata?.source === 'manual') {
      source = metadata.source;
    }
    
    const extended: EvermarkExtendedMetadata = {
      source,
      syncedAt: metadata?.syncedAt
    };

    // Content-specific data - check both locations
    if (evermarkData?.doi || metadata?.doi) {
      extended.doi = evermarkData?.doi || metadata?.doi;
    }
    if (evermarkData?.isbn || metadata?.isbn) {
      extended.isbn = evermarkData?.isbn || metadata?.isbn;
    }

    // Enhanced Farcaster cast data extraction
    const farcasterData = evermarkData?.farcasterData || metadata?.farcasterData;
    if (farcasterData) {
      extended.castData = {
        castHash: farcasterData.castHash || '',
        authorFid: farcasterData.authorFid || 0,
        authorUsername: farcasterData.username || '',
        authorDisplayName: farcasterData.author || '',
        originalText: farcasterData.content || '',
        timestamp: farcasterData.timestamp || '',
        engagement: {
          likes: farcasterData.likes || 0,
          recasts: farcasterData.recasts || 0,
          replies: farcasterData.replies || 0
        },
        canonicalUrl: farcasterData.canonicalUrl || ''
      };
    }

    // 🔧 FIXED: Handle image processing status type safely
    if (row.image_processing_status) {
      const status = row.image_processing_status;
      let processedStatus: 'pending' | 'completed' | 'failed';
      
      // 🔧 FIXED: Map the actual status values to our expected types
      if (status === 'completed') {
        processedStatus = 'completed';
      } else if (status === 'failed') {
        processedStatus = 'failed';
      } else {
        // 'processing' or 'pending' both map to 'pending'
        processedStatus = 'pending';
      }

      extended.imageProcessing = {
        status: processedStatus,
        processedAt: row.image_processed_at,
        originalUrl: metadata?.originalMetadata?.image || metadata?.image
      };
    }

    return extended;
  }

  /**
   * Create safe fallback Evermark
   */
  private static createFallbackEvermark(row: EvermarkRow): StandardizedEvermark {
    const now = Math.floor(Date.now() / 1000);
    
    return {
      id: row.id || 'unknown',
      title: row.title || `Evermark #${row.id}`,
      description: row.description || 'Failed to process metadata',
      author: row.author || 'Unknown Author',
      creator: 'Unknown Creator',
      
      creationTime: now,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      image: ImageResolver.FALLBACK_IMAGE,
      imageStatus: 'failed',
      
      sourceUrl: '',
      contentType: 'Custom',
      
      metadataURI: '',
      txHash: '',
      blockNumber: 0,
      
      tags: [],
      category: 'general',
      verified: false,
      
      extendedMetadata: {
        source: 'manual'
      }
    };
  }

  /**
   * Batch transform multiple rows efficiently
   */
  static transformBatch(rows: EvermarkRow[]): StandardizedEvermark[] {
    return rows.map(row => this.transform(row));
  }

  /**
   * Validate transformed Evermark
   */
  static validate(evermark: StandardizedEvermark): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!evermark.id) errors.push('Missing ID');
    if (!evermark.title) errors.push('Missing title');
    if (evermark.creationTime < 1577836800) errors.push('Invalid creation time');
    if (!evermark.image || evermark.image === '') errors.push('Missing image');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// 📋 LOW: Type-safe utilities
export class MetadataValidation {
  /**
   * Check if metadata contains required fields
   */
  static hasRequiredFields(metadata: any): boolean {
    return !!(
      metadata &&
      (metadata.title || metadata.name) &&
      (metadata.author || metadata.creator)
    );
  }

  /**
   * Sanitize metadata to prevent XSS
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove basic HTML
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate IPFS hash format
   */
  static isValidIpfsHash(hash: string): boolean {
    if (!hash || typeof hash !== 'string') return false;
    
    const cleanHash = hash.replace('ipfs://', '');
    return /^Qm[a-zA-Z0-9]{44}$/.test(cleanHash) || 
           /^b[a-z2-7]{58}$/.test(cleanHash);
  }
}

export default MetadataTransformer;