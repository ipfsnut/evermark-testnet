import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ FIXED: Interface that matches your new evermarks table schema exactly
export interface EvermarkRow {
  // Primary key and core fields (matching your schema)
  token_id: number;                    // INTEGER PRIMARY KEY
  title: string;                       // TEXT NOT NULL
  author: string;                      // TEXT NOT NULL
  description?: string;                // TEXT (nullable)
  
  // Optional core fields
  owner?: string;                      // TEXT (ethereum address)
  content_type?: string;               // TEXT
  source_url?: string;                 // TEXT
  token_uri?: string;                  // TEXT
  metadata_fetched?: boolean;          // BOOLEAN
  
  // Timestamps
  created_at: string;                  // TIMESTAMPTZ NOT NULL
  updated_at?: string;                 // TIMESTAMPTZ
  sync_timestamp?: string;             // TIMESTAMPTZ
  
  // Optional app fields
  user_id?: string;                    // UUID (nullable)
  verified?: boolean;                  // BOOLEAN (defaults to false)
  last_synced_at?: string;            // TIMESTAMPTZ
  tx_hash?: string;                   // TEXT
  block_number?: number;              // BIGINT
  
  // Image processing fields
  processed_image_url?: string;        // TEXT
  image_processing_status?: 'pending' | 'processing' | 'completed' | 'failed'; // TEXT
  image_processed_at?: string;        // TIMESTAMP WITHOUT TIME ZONE
  
  // JSON metadata fields
  metadata?: any;                     // JSONB
  metadata_json?: any;                // JSONB
  ipfs_metadata?: any;                // JSONB
}

export interface StakeRow {
  id: string;
  user_id: string;
  evermark_id: string;
  amount: string;
  created_at: string;
  updated_at: string;
  tx_hash?: string;
  status: 'pending' | 'confirmed';
}

export interface LeaderboardRow {
  evermark_id: string;
  total_votes: string;
  rank: number;
  cycle_id: number;
  updated_at: string;
}

export class SupabaseService {
  
  /**
   * ✅ FIXED: Updated to use token_id as primary key
   */
  static async getEvermarks(options: {
    page?: number;
    pageSize?: number;
    sortBy?: 'created_at' | 'title' | 'author';
    sortOrder?: 'asc' | 'desc';
    search?: string;
    author?: string;
    verified?: boolean;
  } = {}) {
    const {
      page = 1,
      pageSize = 12,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search,
      author,
      verified
    } = options;

    let query = supabase
      .from('evermarks')
      .select(`
        token_id,
        title,
        author,
        description,
        owner,
        content_type,
        source_url,
        created_at,
        token_uri,
        metadata_fetched,
        sync_timestamp,
        verified,
        processed_image_url,
        image_processing_status,
        metadata,
        metadata_json,
        ipfs_metadata
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    if (author) {
      query = query.eq('author', author);
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
      throw new Error(`Failed to fetch evermarks: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  }

  /**
   * ✅ FIXED: Get recent evermarks using token_id
   */
  static async getRecentEvermarks(limit = 10) {
    const { data, error } = await supabase
      .from('evermarks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent evermarks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * ✅ FIXED: Get evermark by token_id (handles both string and number input)
   */
  static async getEvermarkById(tokenId: string | number) {
    const { data, error } = await supabase
      .from('evermarks')
      .select('*')
      .eq('token_id', parseInt(tokenId.toString()))
      .single();

    if (error) {
      throw new Error(`Failed to fetch evermark: ${error.message}`);
    }

    return data;
  }

  /**
   * ✅ FIXED: Get leaderboard using token_id references
   */
  static async getLeaderboard(cycleId?: number, limit = 10) {
    let query = supabase
      .from('stakes')
      .select(`
        evermark_id,
        evermarks!inner(token_id, title, author, description, metadata, processed_image_url, image_processing_status),
        amount
      `)
      .eq('status', 'confirmed')
      .order('amount', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch leaderboard: ${error.message}`);
    }

    // Transform to leaderboard format
    const leaderboard = data?.map((entry: any, index: number) => ({
      evermark: {
        id: entry.evermarks.token_id.toString(), // Convert to string for compatibility
        title: entry.evermarks.title,
        author: entry.evermarks.author,
        description: entry.evermarks.description,
        creator: entry.evermarks.metadata?.creator || entry.evermarks.author,
        sourceUrl: entry.evermarks.metadata?.sourceUrl,
        image: entry.evermarks.processed_image_url || 
               entry.evermarks.metadata?.originalMetadata?.image || 
               entry.evermarks.metadata?.image,
        metadataURI: entry.evermarks.metadata?.metadataURI || '',
        creationTime: entry.evermarks.metadata?.creationTime || new Date(entry.evermarks.created_at).getTime() / 1000,
      },
      votes: BigInt(entry.amount || '0'),
      rank: index + 1
    })) || [];

    return leaderboard;
  }

  /**
   * ✅ FIXED: Upsert using token_id as the conflict resolution
   */
  static async upsertEvermark(evermark: Partial<EvermarkRow>) {
    const { data, error } = await supabase
      .from('evermarks')
      .upsert(evermark, { onConflict: 'token_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert evermark: ${error.message}`);
    }

    return data;
  }

  /**
   * ✅ FIXED: Upsert stake using token_id
   */
  static async upsertStake(stake: Partial<StakeRow>) {
    const { data, error } = await supabase
      .from('stakes')
      .upsert(stake, { onConflict: 'user_id,evermark_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert stake: ${error.message}`);
    }

    return data;
  }

  /**
   * ✅ NEW: Helper to convert token_id to string id for compatibility
   */
  static getStringId(tokenId: number): string {
    return tokenId.toString();
  }

  /**
   * ✅ NEW: Helper to get token_id from string id
   */
  static getTokenId(id: string): number {
    return parseInt(id);
  }

  // IPFS and sync methods remain the same
  static async getCachedIPFS(hash: string) {
    const { data, error } = await supabase
      .from('ipfs_cache')
      .select('content')
      .eq('hash', hash)
      .single();

    if (error || !data) {
      return null;
    }

    return data.content;
  }

  static async cacheIPFS(hash: string, content: any, contentType = 'metadata') {
    const { error } = await supabase
      .from('ipfs_cache')
      .upsert({
        hash,
        content,
        content_type: contentType
      }, { onConflict: 'hash' });

    if (error) {
      console.warn('Failed to cache IPFS data:', error.message);
    }
  }

  static async getSyncStatus() {
    const { data, error } = await supabase
      .from('sync_status')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return { last_block: 0, updated_at: new Date().toISOString() };
    }

    return data;
  }

  static async updateSyncStatus(lastBlock: number) {
    const { error } = await supabase
      .from('sync_status')
      .upsert({
        id: 1,
        last_block: lastBlock,
        updated_at: new Date().toISOString(),
        last_successful_sync: new Date().toISOString()
      });

    if (error) {
      console.warn('Failed to update sync status:', error.message);
    }
  }
}