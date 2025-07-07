// src/hooks/core/useMetadataUtils.ts - Shared IPFS and metadata utilities
import { useCallback } from 'react';
import { readContract } from "thirdweb";
import { useContracts } from './useContracts';

export interface IPFSMetadata {
  description: string;
  sourceUrl: string;
  image: string;
}

export interface EvermarkData {
  id: string;
  title: string;
  author: string;
  creator: string;
  description: string;
  sourceUrl: string;
  image: string;
  metadataURI: string;
  creationTime: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface EvermarkMetadata {
  title: string;
  description: string;
  sourceUrl: string;
  author: string;
  imageFile?: File | null;
  customFields?: Array<{ key: string; value: string }>;
  tags?: string[];
  contentType?: 'Cast' | 'DOI' | 'ISBN' | 'URL' | 'Custom';
  doi?: string;
  isbn?: string;
  url?: string;
  castUrl?: string;
  publisher?: string;
  publicationDate?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
}

/**
 * Shared metadata and IPFS utilities
 * Eliminates duplicate metadata fetching and validation logic
 */
export function useMetadataUtils() {
  const { evermarkNFT } = useContracts();

  /**
   * Fetch IPFS metadata with proper error handling and caching
   */
  const fetchIPFSMetadata = useCallback(async (metadataURI: string): Promise<IPFSMetadata> => {
    const defaultReturn: IPFSMetadata = { description: "", sourceUrl: "", image: "" };
    
    if (!metadataURI || !metadataURI.startsWith('ipfs://')) {
      return defaultReturn;
    }

    try {
      const ipfsHash = metadataURI.replace('ipfs://', '');
      
      // Basic validation - IPFS hashes should be at least 40 characters
      if (ipfsHash.length < 40) {
        console.log('Invalid IPFS hash format:', ipfsHash);
        return defaultReturn;
      }
      
      const ipfsGatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      // Add timeout and proper error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      console.log('Fetching IPFS metadata from:', ipfsGatewayUrl);
      
      const response = await fetch(ipfsGatewayUrl, { 
        signal: controller.signal,
        cache: 'force-cache', // Use browser cache to reduce requests
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`IPFS fetch failed with status ${response.status} for hash: ${ipfsHash}`);
        return defaultReturn;
      }
      
      const ipfsData = await response.json();
      console.log('IPFS data fetched successfully:', ipfsData);
      
      return {
        id: tokenId.toString(),
        title: title || `Evermark #${tokenId}`,
        author: creator || "Unknown",
        creator: minter,
        description,
        sourceUrl,
        image,
        metadataURI,
        creationTime: Number(creationTime) * 1000, // Convert to milliseconds
      };
    } catch (error) {
      console.error(`Error fetching Evermark data for token ${tokenId}:`, error);
      return null;
    }
  }, [evermarkNFT, fetchIPFSMetadata]);

  /**
   * Batch fetch multiple Evermark data
   */
  const fetchEvermarkDataBatch = useCallback(async (tokenIds: bigint[]): Promise<(EvermarkData | null)[]> => {
    const promises = tokenIds.map(tokenId => fetchEvermarkData(tokenId));
    return Promise.all(promises);
  }, [fetchEvermarkData]);

  /**
   * Upload file to Pinata IPFS
   */
  const uploadToPinata = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: `evermark-${file.name}-${Date.now()}`,
      keyvalues: { 
        type: file.type.startsWith('image/') ? 'evermark-image' : 'evermark-metadata',
        timestamp: Date.now().toString()
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({ cidVersion: 0 });
    formData.append('pinataOptions', pinataOptions);

    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      const ipfsUrl = `ipfs://${result.IpfsHash}`;
      
      console.log('✅ Successfully uploaded to Pinata:', ipfsUrl);
      return ipfsUrl;
    } catch (error) {
      console.error('❌ Pinata upload error:', error);
      throw error;
    }
  }, []);

  /**
   * Validate Evermark metadata
   */
  const validateMetadata = useCallback((metadata: EvermarkMetadata): ValidationResult => {
    const errors: string[] = [];
    
    // Required fields
    if (!metadata.title?.trim()) errors.push("Title is required");
    if (!metadata.description?.trim()) errors.push("Description is required");
    if (!metadata.author?.trim()) errors.push("Author is required");
    
    // Content-type specific validation
    if (metadata.contentType === 'DOI' && metadata.doi) {
      if (!/^10\.\d{4,}\//.test(metadata.doi)) {
        errors.push("Invalid DOI format (should start with 10.xxxx/)");
      }
    }
    
    if (metadata.contentType === 'ISBN' && metadata.isbn) {
      const cleanIsbn = metadata.isbn.replace(/-/g, '');
      if (!/^(?:\d{9}[\dX]|\d{13})$/.test(cleanIsbn)) {
        errors.push("Invalid ISBN format (should be 10 or 13 digits)");
      }
    }
    
    if (metadata.contentType === 'URL' && metadata.url) {
      try {
        new URL(metadata.url);
      } catch {
        errors.push("Invalid URL format");
      }
    }
    
    // Title length validation
    if (metadata.title && metadata.title.length > 100) {
      errors.push("Title must be 100 characters or less");
    }
    
    // Description length validation
    if (metadata.description && metadata.description.length > 1000) {
      errors.push("Description must be 1000 characters or less");
    }
    
    return { isValid: errors.length === 0, errors };
  }, []);

  /**
   * Check if input is a Farcaster cast URL or hash
   */
  const isFarcasterInput = useCallback((input: string): boolean => {
    return (
      input.includes('farcaster.xyz') ||
      input.includes('warpcast.com') ||
      input.includes('farcaster') ||
      (input.startsWith('0x') && input.length >= 10)
    );
  }, []);

  /**
   * Extract cast hash from Farcaster input
   */
  const extractCastHash = useCallback((input: string): string | null => {
    console.log("🔍 Extracting cast hash from input:", input);
    
    if (input.startsWith('0x') && input.length >= 10) {
      console.log("✅ Input is already a hash:", input);
      return input;
    }
    
    if (input.includes('farcaster.xyz')) {
      const urlParts = input.split('/');
      const hash = urlParts[urlParts.length - 1];
      if (hash.startsWith('0x')) {
        console.log("✅ Extracted hash from farcaster.xyz URL:", hash);
        return hash;
      }
    }
    
    if (input.includes('warpcast.com')) {
      const urlParts = input.split('/');
      const hash = urlParts[urlParts.length - 1];
      if (hash.startsWith('0x')) {
        console.log("✅ Extracted hash from warpcast URL:", hash);
        return hash;
      }
    }
    
    const hashMatch = input.match(/0x[a-fA-F0-9]+/);
    if (hashMatch) {
      console.log("✅ Found hash in string:", hashMatch[0]);
      return hashMatch[0];
    }
    
    console.log("❌ No valid hash found in input");
    return null;
  }, []);

  /**
   * Fetch Farcaster cast data from Pinata
   */
  const fetchCastDataFromPinata = useCallback(async (input: string): Promise<any> => {
    try {
      console.log("🎯 Processing Farcaster input:", input);
      
      const castHash = extractCastHash(input);
      if (!castHash) {
        throw new Error("Could not extract valid cast hash from input");
      }
      
      console.log("📡 Fetching cast data for hash:", castHash);
      
      const response = await fetch(`https://api.pinata.cloud/v3/farcaster/casts/${castHash}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cast data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("📦 Raw cast data from Pinata:", result);

      if (!result.data) {
        throw new Error("No cast data found");
      }

      const cast = result.data;
      const canonicalUrl = `https://warpcast.com/${cast.author?.username || 'unknown'}/${castHash}`;

      return {
        title: `Cast by @${cast.author?.username || 'unknown'}`,
        author: cast.author?.display_name || cast.author?.username || 'Unknown',
        content: cast.text || '',
        timestamp: cast.timestamp || new Date().toISOString(),
        castHash: castHash,
        username: cast.author?.username || 'unknown',
        authorFid: cast.author?.fid || 0,
        embeds: cast.embeds || [],
        mentions: cast.mentions || [],
        parentHash: cast.parent_hash || '',
        rootParentHash: cast.root_parent_hash || '',
        canonicalUrl: canonicalUrl,
      };

    } catch (error) {
      console.error("❌ Error fetching cast data:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        title: "Failed to load cast",
        author: "Unknown",
        content: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        error: errorMessage,
        canonicalUrl: input,
      };
    }
  }, [extractCastHash]);

  /**
   * Build comprehensive metadata for Evermark creation
   */
  const buildComprehensiveMetadata = useCallback(async (
    metadata: EvermarkMetadata,
    imageUrl?: string,
    castData?: any,
    creatorAddress?: string
  ) => {
    const comprehensiveMetadata = {
      name: metadata.title,
      description: metadata.description,
      image: imageUrl || "",
      external_url: metadata.sourceUrl,
      
      // Core attributes
      attributes: [
        { trait_type: "Author", value: metadata.author },
        { trait_type: "Source URL", value: metadata.sourceUrl },
        { trait_type: "Content Type", value: metadata.contentType || 'Custom' },
        { trait_type: "Created", value: new Date().toISOString() },
        ...(creatorAddress ? [{ trait_type: "Creator Address", value: creatorAddress }] : []),
      ],

      // Enhanced metadata
      evermark: {
        version: "2.0",
        sourceUrl: metadata.sourceUrl,
        author: metadata.author,
        contentType: metadata.contentType || 'Custom',
        customFields: metadata.customFields || [],
        tags: metadata.tags || [],
        
        // Type-specific fields
        ...(metadata.doi && { doi: metadata.doi }),
        ...(metadata.isbn && { isbn: metadata.isbn }),
        ...(metadata.url && { url: metadata.url }),
        ...(metadata.castUrl && { castUrl: metadata.castUrl }),
        ...(metadata.publisher && { publisher: metadata.publisher }),
        ...(metadata.publicationDate && { publicationDate: metadata.publicationDate }),
        ...(metadata.journal && { journal: metadata.journal }),
        ...(metadata.volume && { volume: metadata.volume }),
        ...(metadata.issue && { issue: metadata.issue }),
        ...(metadata.pages && { pages: metadata.pages }),
        
        // Cast data if available
        ...(castData && !castData.error && { 
          farcasterData: {
            castHash: castData.castHash,
            author: castData.author,
            username: castData.username,
            authorFid: castData.authorFid,
            content: castData.content,
            timestamp: castData.timestamp,
            canonicalUrl: castData.canonicalUrl,
            embeds: castData.embeds,
            mentions: castData.mentions,
            parentHash: castData.parentHash,
            rootParentHash: castData.rootParentHash,
          }
        }),
      }
    };

    // Add type-specific attributes
    if (metadata.contentType === 'DOI' && metadata.doi) {
      comprehensiveMetadata.attributes.push({ trait_type: "DOI", value: metadata.doi });
    }
    if (metadata.contentType === 'ISBN' && metadata.isbn) {
      comprehensiveMetadata.attributes.push({ trait_type: "ISBN", value: metadata.isbn });
    }
    if (castData && !castData.error) {
      comprehensiveMetadata.attributes.push(
        { trait_type: "Farcaster Author", value: castData.username },
        { trait_type: "Cast Hash", value: castData.castHash },
        { trait_type: "Author FID", value: castData.authorFid.toString() }
      );
    }

    return comprehensiveMetadata;
  }, []);

  return {
    // IPFS functions
    fetchIPFSMetadata,
    uploadToPinata,
    
    // Evermark data functions
    fetchEvermarkData,
    fetchEvermarkDataBatch,
    
    // Validation functions
    validateMetadata,
    
    // Farcaster functions
    isFarcasterInput,
    extractCastHash,
    fetchCastDataFromPinata,
    
    // Metadata building
    buildComprehensiveMetadata,
  };
}
        description: ipfsData.description || "",
        sourceUrl: ipfsData.external_url || "",
        image: ipfsData.image 
          ? ipfsData.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') 
          : ""
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      
      // Don't spam console with errors for expected failures
      if (errorName !== 'AbortError') {
        console.warn("Error fetching IPFS metadata:", errorMessage);
      }
      return defaultReturn;
    }
  }, []);

  /**
   * Fetch complete Evermark data including IPFS metadata
   */
  const fetchEvermarkData = useCallback(async (tokenId: bigint): Promise<EvermarkData | null> => {
    try {
      // Check if token exists
      const exists = await readContract({
        contract: evermarkNFT,
        method: "exists",
        params: [tokenId],
      });

      if (!exists) {
        console.log(`Evermark ${tokenId} does not exist`);
        return null;
      }

      // Get evermark data from contract
      const evermarkData = await readContract({
        contract: evermarkNFT,
        method: "evermarkData",
        params: [tokenId],
      });

      // Extract fields from evermarkData tuple
      const [title, creator, metadataURI, creationTime, minter, referrer] = evermarkData;

      // Fetch IPFS metadata
      const { description, sourceUrl, image } = await fetchIPFSMetadata(metadataURI);

      return {