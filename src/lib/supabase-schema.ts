// src/lib/supabase-schema.ts - Complete schema integration layer
import { supabase } from './supabase';

// ===================================================================
// 🗂️ COMPLETE DATABASE SCHEMA DEFINITIONS
// ===================================================================

/**
 * Raw database row structure (matches your Supabase table exactly)
 */
export interface EvermarkDBRow {
  // Primary identifiers
  token_id: number;                    // Primary key
  title: string;                       // NOT NULL
  author: string;                      // NOT NULL
  owner?: string;                      // Ethereum address
  
  // Content fields
  description?: string;                // Nullable text
  content_type?: string;               // e.g., "Custom Content", "Farcaster Cast"
  source_url?: string;                 // External URL
  token_uri?: string;                  // IPFS metadata URI
  
  // Timestamps
  created_at: string;                  // ISO string - NOT NULL
  sync_timestamp?: string;             // Last blockchain sync
  updated_at?: string;                 // Last database update
  last_synced_at?: string;            // App-level sync tracking
  image_processed_at?: string;        // Image processing timestamp
  
  // Status flags
  metadata_fetched?: boolean;          // Has IPFS metadata been fetched?
  verified?: boolean;                  // Content verification status
  
  // Image processing
  processed_image_url?: string;        // Processed/optimized image URL
  image_processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  
  // JSON metadata fields
  metadata?: Record<string, any>;      // General metadata JSONB
  metadata_json?: Record<string, any>; // Alternative metadata storage
  ipfs_metadata?: Record<string, any>; // Cached IPFS content
  
  // Blockchain tracking
  tx_hash?: string;                    // Transaction hash
  block_number?: number;               // Block number
  
  // User association
  user_id?: string;                    // UUID reference to users table
}

/**
 * Frontend-compatible Evermark structure (what components expect)
 */
export interface StandardizedEvermark {
  // Core identifiers
  id: string;                          // String version of token_id
  tokenId: number;                     // Numeric token_id
  
  // Content
  title: string;
  author: string;
  creator: string;                     // Derived from owner or author
  description: string;
  sourceUrl?: string;
  image?: string;                      // Resolved image URL
  metadataURI: string;
  
  // Metadata
  contentType: 'DOI' | 'ISBN' | 'Cast' | 'URL' | 'Custom';
  tags: string[];
  verified: boolean;
  
  // Timestamps (Unix seconds for compatibility)
  creationTime: number;                // Unix timestamp
  createdAt: string;                   // ISO string
  updatedAt: string;                   // ISO string
  lastSyncedAt?: string;              // ISO string
  
  // Image processing
  imageStatus: 'processed' | 'processing' | 'failed' | 'none';
  
  // Extended metadata for rich content
  extendedMetadata: {
    processedImageUrl: any;
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
  
  // Optional analytics
  votes?: number;
  viewCount?: number;
}

// ===================================================================
// 🔄 SCHEMA TRANSFORMATION ENGINE
// ===================================================================

export class EvermarkSchemaTransformer {
  /**
   * Transform database row to standardized format
   */
  static toStandardized(row: EvermarkDBRow): StandardizedEvermark {
    return {
      // Core identifiers
      id: row.token_id.toString(),
      tokenId: row.token_id,
      
      // Content
      title: row.title || 'Untitled',
      author: row.author || 'Unknown Author',
      creator: this.resolveCreator(row),
      description: row.description || '',
      sourceUrl: row.source_url,
      image: this.resolveImageUrl(row),
      metadataURI: row.token_uri || '',
      
      // Metadata
      contentType: this.resolveContentType(row),
      tags: this.extractTags(row),
      verified: row.verified || false,
      
      // Timestamps
      creationTime: this.toUnixTimestamp(row.created_at),
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      lastSyncedAt: row.last_synced_at,
      
      // Image processing
      imageStatus: this.mapImageStatus(row.image_processing_status),
      
      // Extended metadata
      extendedMetadata: this.extractExtendedMetadata(row),
    };
  }

  /**
   * Transform standardized format back to database row
   */
  static toDatabase(evermark: StandardizedEvermark): Partial<EvermarkDBRow> {
    return {
      token_id: evermark.tokenId,
      title: evermark.title,
      author: evermark.author,
      owner: evermark.creator,
      description: evermark.description,
      content_type: this.mapContentTypeToDatabase(evermark.contentType),
      source_url: evermark.sourceUrl,
      token_uri: evermark.metadataURI,
      verified: evermark.verified,
      metadata: {
        ...evermark.extendedMetadata,
        standardizedVersion: '2.0',
        transformedAt: new Date().toISOString()
      }
    };
  }

  // ===================================================================
  // 🔧 PRIVATE TRANSFORMATION HELPERS
  // ===================================================================

  private static resolveCreator(row: EvermarkDBRow): string {
    return row.owner || row.author || 'Unknown Creator';
  }

  private static resolveImageUrl(row: EvermarkDBRow): string | undefined {
    // Priority: processed URL > metadata > IPFS > none
    if (row.processed_image_url) {
      return row.processed_image_url;
    }
    
    // Try to extract from metadata
    const metadata = row.metadata || row.metadata_json || row.ipfs_metadata;
    if (metadata) {
      const imageUrl = metadata.image || 
                      metadata.originalMetadata?.image ||
                      metadata.evermark?.image;
      
      if (imageUrl) {
        return this.resolveIPFSUrl(imageUrl);
      }
    }
    
    return undefined;
  }

  private static resolveIPFSUrl(url: string): string {
    if (!url) return url;
    
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      return `https://gateway.pinata.cloud/ipfs/${hash}`;
    }
    
    return url;
  }

  private static resolveContentType(row: EvermarkDBRow): StandardizedEvermark['contentType'] {
    const contentType = row.content_type?.toLowerCase() || '';
    const sourceUrl = row.source_url?.toLowerCase() || '';
    
    // Check explicit content type first
    if (contentType.includes('farcaster') || contentType.includes('cast')) return 'Cast';
    if (contentType.includes('doi')) return 'DOI';
    if (contentType.includes('isbn')) return 'ISBN';
    if (contentType.includes('url') || contentType.includes('web')) return 'URL';
    
    // Check source URL patterns
    if (sourceUrl.includes('farcaster') || sourceUrl.includes('warpcast')) return 'Cast';
    if (sourceUrl.includes('doi.org') || sourceUrl.includes('dx.doi.org')) return 'DOI';
    
    // Check metadata for type hints
    const metadata = row.metadata || row.metadata_json || row.ipfs_metadata;
    if (metadata) {
      if (metadata.doi || metadata.originalMetadata?.doi) return 'DOI';
      if (metadata.isbn || metadata.originalMetadata?.isbn) return 'ISBN';
      if (metadata.farcasterData || metadata.originalMetadata?.farcasterData) return 'Cast';
    }
    
    return 'Custom';
  }

  private static extractTags(row: EvermarkDBRow): string[] {
    const tags: string[] = [];
    
    // Extract from description
    if (row.description) {
      const tagMatches = row.description.match(/Tags:\s*([^|]+)/i);
      if (tagMatches) {
        const extractedTags = tagMatches[1].split(',').map(tag => tag.trim());
        tags.push(...extractedTags);
      }
    }
    
    // Extract from metadata
    const metadata = row.metadata || row.metadata_json || row.ipfs_metadata;
    if (metadata?.tags && Array.isArray(metadata.tags)) {
      tags.push(...metadata.tags);
    }
    
    // Add content type as tag
    if (row.content_type) {
      tags.push(row.content_type.toLowerCase().replace(' ', '-'));
    }
    
    // Deduplicate and clean
    return [...new Set(tags.filter(tag => tag && tag.length > 0))];
  }

  private static mapImageStatus(status?: string): StandardizedEvermark['imageStatus'] {
    switch (status) {
      case 'completed': return 'processed';
      case 'processing': return 'processing';
      case 'failed': return 'failed';
      case 'pending': return 'processing';
      default: return 'none';
    }
  }

  private static mapContentTypeToDatabase(contentType: StandardizedEvermark['contentType']): string {
    switch (contentType) {
      case 'Cast': return 'Farcaster Cast';
      case 'DOI': return 'Academic Paper';
      case 'ISBN': return 'Book';
      case 'URL': return 'Web Content';
      case 'Custom': return 'Custom Content';
      default: return 'Custom Content';
    }
  }

  private static extractExtendedMetadata(row: EvermarkDBRow): StandardizedEvermark['extendedMetadata'] {
    const metadata = row.metadata || row.metadata_json || row.ipfs_metadata || {};
    
    return {
  doi: metadata.doi || metadata.originalMetadata?.doi,
  isbn: metadata.isbn || metadata.originalMetadata?.isbn,
  castData: this.extractCastData(metadata),
  tags: this.extractTags(row),
  customFields: metadata.customFields || metadata.originalMetadata?.customFields || [],
  processedImageUrl: undefined
};
  }

  private static extractCastData(metadata: any): StandardizedEvermark['extendedMetadata']['castData'] {
    const farcasterData = metadata.farcasterData || metadata.originalMetadata?.farcasterData;
    
    if (!farcasterData) return undefined;
    
    return {
      castHash: farcasterData.castHash,
      author: farcasterData.author,
      username: farcasterData.username,
      content: farcasterData.content,
      timestamp: farcasterData.timestamp,
      engagement: farcasterData.engagement
    };
  }

  private static toUnixTimestamp(dateString: string): number {
    try {
      return Math.floor(new Date(dateString).getTime() / 1000);
    } catch {
      return Math.floor(Date.now() / 1000);
    }
  }
}

// ===================================================================
// 📊 DATABASE QUERY SERVICE
// ===================================================================

export class EvermarkQueryService {
  /**
   * Fetch single Evermark by token ID
   */
  static async getById(tokenId: number): Promise<StandardizedEvermark | null> {
    try {
      const { data, error } = await supabase
        .from('evermarks')
        .select('*')
        .eq('token_id', tokenId)
        .single();

      if (error) {
        console.error('Database query error:', error);
        return null;
      }

      return data ? EvermarkSchemaTransformer.toStandardized(data) : null;
    } catch (error) {
      console.error('Error fetching Evermark:', error);
      return null;
    }
  }

  /**
   * Fetch multiple Evermarks with pagination
   */
  static async getMany(options: {
    page?: number;
    pageSize?: number;
    sortBy?: 'created_at' | 'title' | 'author';
    sortOrder?: 'asc' | 'desc';
    search?: string;
    author?: string;
    contentType?: string;
    verified?: boolean;
    tokenIds?: number[];
  } = {}): Promise<{
    evermarks: StandardizedEvermark[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        pageSize = 12,
        sortBy = 'created_at',
        sortOrder = 'desc',
        search,
        author,
        contentType,
        verified,
        tokenIds
      } = options;

      let query = supabase
        .from('evermarks')
        .select('*', { count: 'exact' });

      // Apply filters
      if (tokenIds && tokenIds.length > 0) {
        query = query.in('token_id', tokenIds);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (author) {
        query = query.eq('author', author);
      }

      if (contentType) {
        query = query.ilike('content_type', `%${contentType}%`);
      }

      if (verified !== undefined) {
        query = query.eq('verified', verified);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Database query error:', error);
        return { evermarks: [], totalCount: 0, page, totalPages: 0 };
      }

      const evermarks = (data || []).map(EvermarkSchemaTransformer.toStandardized);
      const totalPages = Math.ceil((count || 0) / pageSize);

      return {
        evermarks,
        totalCount: count || 0,
        page,
        totalPages
      };
    } catch (error) {
      console.error('Error fetching Evermarks:', error);
      return { evermarks: [], totalCount: 0, page: 1, totalPages: 0 };
    }
  }

  /**
   * Create or update Evermark
   */
  static async upsert(evermark: StandardizedEvermark): Promise<StandardizedEvermark | null> {
    try {
      const dbRow = EvermarkSchemaTransformer.toDatabase(evermark);
      
      const { data, error } = await supabase
        .from('evermarks')
        .upsert({
          ...dbRow,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'token_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('Database upsert error:', error);
        return null;
      }

      return data ? EvermarkSchemaTransformer.toStandardized(data) : null;
    } catch (error) {
      console.error('Error upserting Evermark:', error);
      return null;
    }
  }

  /**
   * Get recent Evermarks
   */
  static async getRecent(limit = 10): Promise<StandardizedEvermark[]> {
    const result = await this.getMany({
      page: 1,
      pageSize: limit,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    return result.evermarks;
  }

  /**
   * Search Evermarks
   */
  static async search(query: string, limit = 20): Promise<StandardizedEvermark[]> {
    const result = await this.getMany({
      page: 1,
      pageSize: limit,
      search: query,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    return result.evermarks;
  }

  /**
   * Get Evermarks by author
   */
  static async getByAuthor(author: string, limit = 20): Promise<StandardizedEvermark[]> {
    const result = await this.getMany({
      page: 1,
      pageSize: limit,
      author,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    return result.evermarks;
  }

  /**
   * Batch fetch by token IDs (efficient for bookshelf/delegation)
   */
  static async getBatch(tokenIds: number[]): Promise<StandardizedEvermark[]> {
    if (tokenIds.length === 0) return [];
    
    const result = await this.getMany({
      tokenIds,
      pageSize: tokenIds.length,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    return result.evermarks;
  }
}

// ===================================================================
// 🔄 MIGRATION AND SYNC UTILITIES
// ===================================================================

export class EvermarkSyncService {
  /**
   * Sync single Evermark from blockchain
   */
  static async syncFromBlockchain(tokenId: number, blockchainData: any): Promise<StandardizedEvermark | null> {
    try {
      // Transform blockchain data to database format
      const dbRow: Partial<EvermarkDBRow> = {
        token_id: tokenId,
        title: blockchainData.title || `Evermark #${tokenId}`,
        author: blockchainData.creator || 'Unknown Author',
        owner: blockchainData.minter,
        token_uri: blockchainData.metadataURI,
        tx_hash: blockchainData.transactionHash,
        block_number: blockchainData.blockNumber,
        sync_timestamp: new Date().toISOString(),
        metadata_fetched: false
      };

      const { data, error } = await supabase
        .from('evermarks')
        .upsert(dbRow, { onConflict: 'token_id' })
        .select()
        .single();

      if (error) {
        console.error('Sync error:', error);
        return null;
      }

      return data ? EvermarkSchemaTransformer.toStandardized(data) : null;
    } catch (error) {
      console.error('Error syncing from blockchain:', error);
      return null;
    }
  }

  /**
   * Update IPFS metadata for an Evermark
   */
  static async updateIPFSMetadata(tokenId: number, ipfsData: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('evermarks')
        .update({
          ipfs_metadata: ipfsData,
          metadata_fetched: true,
          updated_at: new Date().toISOString()
        })
        .eq('token_id', tokenId);

      if (error) {
        console.error('IPFS metadata update error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating IPFS metadata:', error);
      return false;
    }
  }

  /**
   * Update image processing status
   */
  static async updateImageStatus(
    tokenId: number, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    imageUrl?: string
  ): Promise<boolean> {
    try {
      const updateData: Partial<EvermarkDBRow> = {
        image_processing_status: status,
        image_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (imageUrl && status === 'completed') {
        updateData.processed_image_url = imageUrl;
      }

      const { error } = await supabase
        .from('evermarks')
        .update(updateData)
        .eq('token_id', tokenId);

      if (error) {
        console.error('Image status update error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating image status:', error);
      return false;
    }
  }
}

// ===================================================================
// 📊 ANALYTICS AND STATS
// ===================================================================

export class EvermarkAnalytics {
  /**
   * Get content type distribution
   */
  static async getContentTypeStats(): Promise<Array<{ type: string; count: number }>> {
    try {
      const { data, error } = await supabase
        .from('evermarks')
        .select('content_type')
        .not('content_type', 'is', null);

      if (error) return [];

      const stats = data.reduce((acc, row) => {
        const type = row.content_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(stats).map(([type, count]) => ({ type, count }));
    } catch {
      return [];
    }
  }

  /**
   * Get processing status distribution
   */
  static async getProcessingStats(): Promise<{
    total: number;
    processed: number;
    processing: number;
    failed: number;
    pending: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('evermarks')
        .select('image_processing_status');

      if (error) return { total: 0, processed: 0, processing: 0, failed: 0, pending: 0 };

      const stats = data.reduce((acc, row) => {
        const status = row.image_processing_status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: data.length,
        processed: stats.completed || 0,
        processing: stats.processing || 0,
        failed: stats.failed || 0,
        pending: stats.pending || 0
      };
    } catch {
      return { total: 0, processed: 0, processing: 0, failed: 0, pending: 0 };
    }
  }
}

// ===================================================================
// 🔧 VALIDATION AND HEALTH CHECK
// ===================================================================

export class EvermarkValidation {
  /**
   * Validate database schema consistency
   */
  static async validateSchema(): Promise<{
    isValid: boolean;
    issues: string[];
    stats: {
      totalRecords: number;
      missingTitles: number;
      missingAuthors: number;
      invalidTimestamps: number;
    };
  }> {
    try {
      const { data, error } = await supabase
        .from('evermarks')
        .select('token_id, title, author, created_at');

      if (error) {
        return {
          isValid: false,
          issues: [`Database query failed: ${error.message}`],
          stats: { totalRecords: 0, missingTitles: 0, missingAuthors: 0, invalidTimestamps: 0 }
        };
      }

      const issues: string[] = [];
      let missingTitles = 0;
      let missingAuthors = 0;
      let invalidTimestamps = 0;

      data.forEach(row => {
        if (!row.title || row.title.trim() === '') missingTitles++;
        if (!row.author || row.author.trim() === '') missingAuthors++;
        if (!row.created_at || isNaN(new Date(row.created_at).getTime())) invalidTimestamps++;
      });

      if (missingTitles > 0) issues.push(`${missingTitles} records missing titles`);
      if (missingAuthors > 0) issues.push(`${missingAuthors} records missing authors`);
      if (invalidTimestamps > 0) issues.push(`${invalidTimestamps} records have invalid timestamps`);

      return {
        isValid: issues.length === 0,
        issues,
        stats: {
          totalRecords: data.length,
          missingTitles,
          missingAuthors,
          invalidTimestamps
        }
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Validation failed: ${error}`],
        stats: { totalRecords: 0, missingTitles: 0, missingAuthors: 0, invalidTimestamps: 0 }
      };
    }
  }
}

// Export everything
export {
  EvermarkSchemaTransformer as SchemaTransformer,
  EvermarkQueryService as QueryService,
  EvermarkSyncService as SyncService,
  EvermarkAnalytics as Analytics,
  EvermarkValidation as Validation
};