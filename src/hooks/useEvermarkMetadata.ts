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
  console.log("🎯 useEvermarkMetadata called with:", metadataURI);
  
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

  const getImageUrl = () => {
    console.log("🔍 Raw metadata?.image:", metadata?.image);
    
    if (!metadata?.image) {
      console.log("❌ No image in metadata");
      return null;
    }
    
    const convertedUrl = metadata.image.startsWith('ipfs://') 
      ? metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
      : metadata.image;
    
    console.log("✅ Converted image URL:", convertedUrl);
    return convertedUrl;
  };

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
