// src/lib/supabase.ts - Updated EvermarkRow interface
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// FIXED: Updated database types to match your actual table structure
export interface EvermarkRow {
  id: string;
  title: string;
  author: string;
  description?: string;
  user_id?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
  metadata: {
    creator?: string;
    sourceUrl?: string;
    image?: string;
    metadataURI?: string;
    creationTime?: number;
    minter?: string;
    referrer?: string;
    // FIXED: Add the actual nested structure we see in the data
    source?: string;
    tokenId?: number;
    syncedAt?: string;
    tokenURI?: string;
    originalMetadata?: {
      name?: string;
      image?: string;
      description?: string;
      external_url?: string;
      attributes?: Array<{ trait_type: string; value: string; }>;
      evermark?: any;
    } | null;
  };
  last_synced_at?: string;
  tx_hash?: string;
  block_number?: bigint;
  // FIXED: Added the missing image processing columns
  processed_image_url?: string;
  image_processing_status?: string;
  image_processed_at?: string;
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

// Supabase data operations
export class SupabaseService {
  
  /**
   * Get evermarks with pagination and filtering
   * FIXED: Select the processed_image_url column
   */
  static async getEvermarks(options: {
    page?: number;
    pageSize?: number;
    sortBy?: 'created_at' | 'title' | 'votes';
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
      .select('*, processed_image_url, image_processing_status', { count: 'exact' });

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
   * Get recent evermarks (last N)
   * FIXED: Select the processed_image_url column
   */
  static async getRecentEvermarks(limit = 10) {
    const { data, error } = await supabase
      .from('evermarks')
      .select('*, processed_image_url, image_processing_status')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent evermarks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get evermark by ID
   * FIXED: Select the processed_image_url column
   */
  static async getEvermarkById(id: string) {
    const { data, error } = await supabase
      .from('evermarks')
      .select('*, processed_image_url, image_processing_status')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch evermark: ${error.message}`);
    }

    return data;
  }

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(cycleId?: number, limit = 10) {
    let query = supabase
      .from('stakes')
      .select(`
        evermark_id,
        evermarks!inner(id, title, author, description, metadata, processed_image_url, image_processing_status),
        amount
      `)
      .eq('status', 'confirmed')
      .order('amount', { ascending: false })
      .limit(limit);

    // If cycleId is provided, we could filter by cycle (would need cycle_id in stakes table)
    // For now, return overall leaderboard

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch leaderboard: ${error.message}`);
    }

    // Transform to leaderboard format
    const leaderboard = data?.map((entry: any, index: number) => ({
      evermark: {
        id: entry.evermarks.id,
        title: entry.evermarks.title,
        author: entry.evermarks.author,
        description: entry.evermarks.description,
        creator: entry.evermarks.metadata?.creator || entry.evermarks.author,
        sourceUrl: entry.evermarks.metadata?.sourceUrl,
        // FIXED: Use processed_image_url first, then check originalMetadata.image
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
   * Upsert evermark (for sync operations)
   */
  static async upsertEvermark(evermark: Partial<EvermarkRow>) {
    const { data, error } = await supabase
      .from('evermarks')
      .upsert(evermark, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert evermark: ${error.message}`);
    }

    return data;
  }

  /**
   * Upsert stake (for sync operations)
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
   * Get cached IPFS data
   */
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

  /**
   * Cache IPFS data
   */
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

  /**
   * Get sync status
   */
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

  /**
   * Update sync status
   */
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