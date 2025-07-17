import { StandardizedEvermark, useSupabaseEvermarks } from "./useSupabaseEvermarks";

// ✅ NEW: Efficient batch hook using tokenIds filter
export function useEvermarksBatch(tokenIds: number[]) {
  // Use the enhanced hook with tokenIds filter
  const { 
    evermarks: supabaseEvermarks, 
    isLoading, 
    error 
  } = useSupabaseEvermarks({
    tokenIds, // ✅ This now works efficiently at the database level!
    sortBy: 'created_at',
    sortOrder: 'desc',
    enableBlockchainFallback: false // Skip blockchain for performance
  });

  // Convert to legacy format for compatibility
  const convertToLegacyFormat = (evermark: StandardizedEvermark) => ({
    id: evermark.id,
    name: evermark.title,
    title: evermark.title,
    description: evermark.description || '',
    content: evermark.description || '',
    image: evermark.image,
    external_url: evermark.sourceUrl,
    author: evermark.author,
    creator: evermark.creator,
    timestamp: new Date(evermark.creationTime * 1000).toISOString(),
    created_at: evermark.createdAt,
    updated_at: evermark.updatedAt,
    creationTime: evermark.creationTime,
    tx_hash: undefined,
    block_number: undefined,
    metadataURI: evermark.metadataURI,
    evermark_type: 'standard',
    source_platform: evermark.sourceUrl?.includes('farcaster') ? 'farcaster' : 'web',
    sourceUrl: evermark.sourceUrl,
    voting_power: evermark.votes || 0,
    view_count: 0,
    tags: evermark.tags,
    category: 'general',
    metadata: {
      creator: evermark.creator,
      sourceUrl: evermark.sourceUrl,
      image: evermark.image,
      metadataURI: evermark.metadataURI,
      creationTime: evermark.creationTime,
      tokenId: evermark.tokenId,
      extendedMetadata: evermark.extendedMetadata
    }
  });

  return {
    evermarks: supabaseEvermarks.map(convertToLegacyFormat),
    isLoading,
    error
  };
}
