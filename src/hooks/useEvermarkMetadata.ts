import { useState, useEffect } from 'react';

export interface EvermarkMetadata {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  farcaster_data?: {
    content: string;
    author: {
      username: string;
      fid: number;
    };
    cast_hash: string;
    timestamp: string;
    canonical_url: string;
  };
}

export const useEvermarkMetadata = (metadataURI?: string) => {
  const [metadata, setMetadata] = useState<EvermarkMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metadataURI) {
      setMetadata(null);
      return;
    }

    const fetchMetadata = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("📥 Fetching metadata from:", metadataURI);
        
        // Convert ipfs:// to gateway URL if needed
        const fetchUrl = metadataURI.startsWith('ipfs://') 
          ? metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
          : metadataURI;
        
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("✅ Metadata fetched:", data);
        
        setMetadata(data);
      } catch (err: any) {
        console.error("❌ Failed to fetch metadata:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [metadataURI]);

  // Helper to get display image URL
  const getImageUrl = () => {
    if (!metadata?.image) return null;
    
    return metadata.image.startsWith('ipfs://') 
      ? metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
      : metadata.image;
  };

  // Helper to check if it's a Farcaster cast
  const isFarcasterCast = () => {
    return !!(metadata?.farcaster_data || 
      metadata?.attributes?.some(attr => attr.trait_type === 'Platform' && attr.value === 'Farcaster'));
  };

  return { 
    metadata, 
    isLoading, 
    error, 
    getImageUrl, 
    isFarcasterCast 
  };
};