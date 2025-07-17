// src/utils/MetadataTransformer.ts - Fixed version with proper imports and types
import type { EvermarkRow } from '../lib/supabase'; // ✅ FIXED: Add the missing import

export interface StandardizedEvermark {
  id: string;                         // String version of token_id for component compatibility
  tokenId: number;                    // Actual numeric token_id
  title: string;
  author: string;
  description: string;
  sourceUrl?: string;
  image?: string;
  metadataURI: string;
  creator: string;
  creationTime: number;
  verified: boolean;
  imageStatus: 'processed' | 'processing' | 'failed' | 'none';
  extendedMetadata: {
    doi?: string;
    isbn?: string;
    castData?: {
      castHash?: string;
      author?: string;
      username?: string;
      content?: string;
      timestamp?: string;
      engagement?: {
        likes: number;
        recasts: number;
        replies: number;
      };
    };
    tags?: string[];
    customFields?: Array<{ key: string; value: string }>;
  };
  tags: string[];
  contentType: 'DOI' | 'ISBN' | 'Cast' | 'URL' | 'Custom';
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  votes?: number;
}

export interface MetadataValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class MetadataTransformer {
  /**
   * ✅ FIXED: Transform EvermarkRow to StandardizedEvermark for new schema
   */
  static transform(row: EvermarkRow): StandardizedEvermark {
    return {
      // ✅ FIXED: Create string id from token_id for component compatibility
      id: row.token_id.toString(),
      tokenId: row.token_id,
      
      // Core fields from your new schema
      title: row.title,
      author: row.author,
      description: row.description || '',
      sourceUrl: row.source_url || '',
      metadataURI: row.token_uri || '',
      creator: row.owner || row.author,
      creationTime: new Date(row.created_at).getTime() / 1000,
      verified: row.verified || false,
      
      // ✅ FIXED: Image processing from your new schema
      image: row.processed_image_url || this.extractImageFromMetadata(row.metadata),
      imageStatus: this.mapImageStatus(row.image_processing_status),
      
      // ✅ FIXED: Handle your schema's metadata structure
      extendedMetadata: this.extractExtendedMetadata(row),
      
      // Timestamps
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      lastSyncedAt: row.sync_timestamp,
      
      // Additional fields
      tags: this.extractTags(row.metadata),
      contentType: this.determineContentType(row)
    };
  }

  /**
   * ✅ FIXED: Map image processing status from new schema
   */
  private static mapImageStatus(status?: string): StandardizedEvermark['imageStatus'] {
    switch (status) {
      case 'completed': return 'processed';
      case 'processing': return 'processing';
      case 'failed': return 'failed';
      case 'pending': return 'processing';
      default: return 'none';
    }
  }

  /**
   * ✅ FIXED: Determine content type from new schema fields
   */
  private static determineContentType(row: EvermarkRow): StandardizedEvermark['contentType'] {
    // Check content_type field first
    if (row.content_type) {
      const type = row.content_type.toLowerCase();
      if (type.includes('cast')) return 'Cast';
      if (type.includes('doi')) return 'DOI';
      if (type.includes('isbn')) return 'ISBN';
      if (type.includes('url')) return 'URL';
    }

    // Check metadata for content type hints
    const metadata = row.metadata || row.metadata_json || row.ipfs_metadata;
    if (metadata) {
      if (metadata.doi || metadata.originalMetadata?.doi) return 'DOI';
      if (metadata.isbn || metadata.originalMetadata?.isbn) return 'ISBN';
      if (metadata.farcasterData || metadata.originalMetadata?.farcasterData) return 'Cast';
      if (metadata.sourceUrl || metadata.originalMetadata?.external_url) return 'URL';
    }

    return 'Custom';
  }

  /**
   * ✅ FIXED: Extract image from multiple metadata sources
   */
  private static extractImageFromMetadata(metadata: any): string | undefined {
    if (!metadata) return undefined;

    // Try different metadata structures
    return metadata.image ||
           metadata.originalMetadata?.image ||
           metadata.evermark?.image ||
           undefined;
  }

  /**
   * ✅ FIXED: Extract extended metadata from various sources
   */
  private static extractExtendedMetadata(row: EvermarkRow): StandardizedEvermark['extendedMetadata'] {
    const metadata = row.metadata || row.metadata_json || row.ipfs_metadata || {};
    const originalMetadata = metadata.originalMetadata || {};
    const evermarkMetadata = originalMetadata.evermark || {};

    return {
      doi: metadata.doi || originalMetadata.doi || evermarkMetadata.doi,
      isbn: metadata.isbn || originalMetadata.isbn || evermarkMetadata.isbn,
      castData: this.extractCastData(metadata, originalMetadata, evermarkMetadata),
      tags: this.extractTags(metadata),
      customFields: evermarkMetadata.customFields || []
    };
  }

  /**
   * ✅ FIXED: Extract Farcaster cast data from metadata
   */
  private static extractCastData(
    metadata: any, 
    originalMetadata: any, 
    evermarkMetadata: any
  ): StandardizedEvermark['extendedMetadata']['castData'] {
    const farcasterData = metadata.farcasterData || 
                         originalMetadata.farcasterData || 
                         evermarkMetadata.farcasterData;

    if (!farcasterData) return undefined;

    return {
      castHash: farcasterData.castHash,
      author: farcasterData.author,
      username: farcasterData.username,
      content: farcasterData.content,
      timestamp: farcasterData.timestamp,
      engagement: farcasterData.likes !== undefined ? {
        likes: farcasterData.likes || 0,
        recasts: farcasterData.recasts || 0,
        replies: farcasterData.replies || 0
      } : undefined
    };
  }

  /**
   * ✅ FIXED: Extract tags from metadata
   */
  private static extractTags(metadata: any): string[] {
    if (!metadata) return [];

    const tags = metadata.tags || 
                metadata.originalMetadata?.tags || 
                metadata.originalMetadata?.evermark?.tags || 
                [];

    return Array.isArray(tags) ? tags : [];
  }

  /**
   * Validate standardized evermark data
   */
  static validate(evermark: StandardizedEvermark): MetadataValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!evermark.id) errors.push('Missing id');
    if (!evermark.title) errors.push('Missing title');
    if (!evermark.author) errors.push('Missing author');
    if (!evermark.tokenId || evermark.tokenId < 1) errors.push('Invalid tokenId');

    // Data consistency checks
    if (evermark.id !== evermark.tokenId.toString()) {
      warnings.push('ID does not match tokenId');
    }

    // Image validation
    if (evermark.imageStatus === 'failed' && evermark.image) {
      warnings.push('Image processing failed but image URL exists');
    }

    // Content type validation
    if (evermark.contentType === 'DOI' && !evermark.extendedMetadata.doi) {
      warnings.push('Content type is DOI but no DOI found in metadata');
    }

    if (evermark.contentType === 'Cast' && !evermark.extendedMetadata.castData) {
      warnings.push('Content type is Cast but no cast data found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export class TimestampProcessor {
  static toUnixTimestamp(dateString: string | number | null | undefined): number {
    // ✅ FIXED: Handle various input types safely
    if (!dateString) return Math.floor(Date.now() / 1000);
    
    if (typeof dateString === 'number') {
      // If it's already a number, check if it's in milliseconds or seconds
      if (dateString > 1000000000000) {
        // Looks like milliseconds, convert to seconds
        return Math.floor(dateString / 1000);
      }
      // Already in seconds
      return dateString;
    }
    
    if (typeof dateString === 'string') {
      const parsed = new Date(dateString);
      if (isNaN(parsed.getTime())) {
        console.warn('Invalid date string:', dateString);
        return Math.floor(Date.now() / 1000);
      }
      return Math.floor(parsed.getTime() / 1000);
    }
    
    return Math.floor(Date.now() / 1000);
  }

  static toISOString(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString();
  }

  static formatForDisplay(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString();
  }
}

export class ImageResolver {
  private static readonly IPFS_GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/'
  ];

  static resolveImageUrl(image: string | undefined): string | undefined {
    if (!image) return undefined;

    // If already a processed URL, return as-is
    if (image.startsWith('http')) return image;

    // Convert IPFS URIs to gateway URLs
    if (image.startsWith('ipfs://')) {
      const hash = image.replace('ipfs://', '');
      return `${this.IPFS_GATEWAYS[0]}${hash}`;
    }

    return image;
  }

  static getImageStatusColor(status: StandardizedEvermark['imageStatus']): string {
    switch (status) {
      case 'processed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      case 'none': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  }
}

export const MetadataValidation = {
  validateEvermark: MetadataTransformer.validate
};

// ✅ NEW: Export utility functions for easy component use
export const MetadataUtils = {
  /**
   * Format display date consistently
   */
  formatDisplayDate: (evermark: StandardizedEvermark): string => {
    try {
      return new Date(evermark.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  },

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime: (evermark: StandardizedEvermark): string => {
    try {
      const now = Date.now();
      const created = new Date(evermark.createdAt).getTime();
      const diffMs = now - created;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 30) return `${diffDays}d ago`;
      
      return MetadataUtils.formatDisplayDate(evermark);
    } catch (error) {
      return 'Unknown';
    }
  },

  /**
   * Get content type display name
   */
  getContentTypeDisplay: (contentType: StandardizedEvermark['contentType']): string => {
    const displayNames = {
      'DOI': 'Academic Paper',
      'ISBN': 'Book',
      'Cast': 'Farcaster Cast',
      'URL': 'Web Content',
      'Custom': 'Custom Content'
    };
    return displayNames[contentType] || contentType;
  },

  /**
   * Get processing status display
   */
  getImageStatusDisplay: (imageStatus: StandardizedEvermark['imageStatus']): { 
    text: string; 
    color: 'green' | 'yellow' | 'red' | 'gray' 
  } => {
    const statusMap = {
      'processed': { text: 'Processed', color: 'green' as const },
      'processing': { text: 'Processing', color: 'yellow' as const },
      'failed': { text: 'Failed', color: 'red' as const },
      'none': { text: 'No Image', color: 'gray' as const }
    };
    return statusMap[imageStatus] || { text: 'Unknown', color: 'gray' };
  },

  /**
   * Check if Evermark has rich metadata
   */
  hasRichMetadata: (evermark: StandardizedEvermark): boolean => {
    return !!(
      evermark.extendedMetadata.castData ||
      evermark.extendedMetadata.doi ||
      evermark.extendedMetadata.isbn ||
      evermark.tags.length > 0
    );
  },

  /**
   * Extract primary tags for display
   */
  getPrimaryTags: (evermark: StandardizedEvermark, maxTags: number = 3): string[] => {
    return evermark.tags.slice(0, maxTags);
  },

  /**
   * Get engagement data if available
   */
  getEngagementData: (evermark: StandardizedEvermark): {
    hasEngagement: boolean;
    likes?: number;
    recasts?: number;
    replies?: number;
    total: number;
  } => {
    const castData = evermark.extendedMetadata.castData;
    if (castData?.engagement) {
      const { likes, recasts, replies } = castData.engagement;
      return {
        hasEngagement: true,
        likes,
        recasts,
        replies,
        total: likes + recasts + replies
      };
    }
    return { hasEngagement: false, total: 0 };
  }
};

export default MetadataTransformer;