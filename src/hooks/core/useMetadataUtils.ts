// src/hooks/core/useMetadataUtils.ts - Fixed implementation with complete functionality
import { useCallback, useMemo } from 'react';
import { readContract } from "thirdweb";
import { useContracts } from './useContracts';

export interface IPFSMetadata {
  description: string;
  sourceUrl: string;
  image: string;
  name?: string;
  attributes?: any[];
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
  minter: string;
  referrer?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
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

export interface CastData {
  title: string;
  author: string;
  content: string;
  timestamp: string;
  castHash?: string;
  username?: string;
  authorFid?: number;
  embeds?: any[];
  mentions?: any[];
  parentHash?: string;
  rootParentHash?: string;
  canonicalUrl: string;
  error?: string;
}

/**
 * Enhanced metadata and IPFS utilities with complete implementations
 * Handles all Evermark metadata operations including IPFS fetching and validation
 */
export function useMetadataUtils() {
  const { evermarkNFT } = useContracts();

  /**
   * Fetch IPFS metadata with enhanced error handling and caching
   */
  const fetchIPFSMetadata = useCallback(async (metadataURI: string): Promise<IPFSMetadata> => {
    const defaultReturn: IPFSMetadata = { 
      description: "", 
      sourceUrl: "", 
      image: "",
      name: "",
      attributes: []
    };
    
    if (!metadataURI || !metadataURI.startsWith('ipfs://')) {
      console.warn('Invalid IPFS URI:', metadataURI);
      return defaultReturn;
    }

    try {
      const ipfsHash = metadataURI.replace('ipfs://', '');
      
      // Enhanced validation - IPFS hashes should be valid format
      if (ipfsHash.length < 40 || !/^[a-zA-Z0-9]+$/.test(ipfsHash)) {
        console.warn('Invalid IPFS hash format:', ipfsHash);
        return defaultReturn;
      }
      
      // Try multiple gateways for better reliability
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      ];
      
      for (const gatewayUrl of gateways) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
          
          console.log('Fetching IPFS metadata from:', gatewayUrl);
          
          const response = await fetch(gatewayUrl, { 
            signal: controller.signal,
            cache: 'force-cache',
            headers: {
              'Accept': 'application/json',
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn(`IPFS fetch failed with status ${response.status} for gateway: ${gatewayUrl}`);
            continue; // Try next gateway
          }
          
          const ipfsData = await response.json();
          console.log('IPFS data fetched successfully:', ipfsData);
          
          // Process and normalize the data
          const processedData: IPFSMetadata = {
            description: ipfsData.description || "",
            sourceUrl: ipfsData.external_url || ipfsData.sourceUrl || "",
            image: ipfsData.image 
              ? ipfsData.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') 
              : "",
            name: ipfsData.name || "",
            attributes: Array.isArray(ipfsData.attributes) ? ipfsData.attributes : []
          };
          
          return processedData;
          
        } catch (gatewayError) {
          console.warn(`Gateway ${gatewayUrl} failed:`, gatewayError);
          continue; // Try next gateway
        }
      }
      
      // All gateways failed
      console.error('All IPFS gateways failed for hash:', ipfsHash);
      return defaultReturn;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      
      if (errorName !== 'AbortError') {
        console.error("Error fetching IPFS metadata:", errorMessage);
      }
      return defaultReturn;
    }
  }, []);

  /**
   * FIXED: Complete Evermark data fetching implementation
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

      // Get evermark data from contract - using correct method name
      const evermarkData = await readContract({
        contract: evermarkNFT,
        method: "evermarkData",
        params: [tokenId],
      });

      if (!evermarkData || !Array.isArray(evermarkData)) {
        console.error('Invalid evermarkData response:', evermarkData);
        return null;
      }

      // Extract fields from evermarkData tuple: [title, creator, metadataURI, creationTime, minter, referrer]
      const [title, creator, metadataURI, creationTime, minter, referrer] = evermarkData;

      // Validate required fields
      if (!title || !metadataURI) {
        console.error('Missing required evermark data fields');
        return null;
      }

      // Fetch IPFS metadata
      const { description, sourceUrl, image } = await fetchIPFSMetadata(metadataURI);

      // Return complete evermark data
      const result: EvermarkData = {
        id: tokenId.toString(),
        title: title || `Evermark #${tokenId}`,
        author: creator || "Unknown",
        creator: minter || "0x0", // The wallet that minted
        description,
        sourceUrl,
        image,
        metadataURI,
        creationTime: Number(creationTime) * 1000, // Convert to milliseconds
        minter: minter || "0x0",
        referrer: referrer || undefined
      };

      return result;

    } catch (error) {
      console.error(`Error fetching Evermark data for token ${tokenId}:`, error);
      return null;
    }
  }, [evermarkNFT, fetchIPFSMetadata]);

  /**
   * Batch fetch multiple Evermark data with concurrency control
   */
  const fetchEvermarkDataBatch = useCallback(async (
    tokenIds: bigint[], 
    maxConcurrency: number = 5
  ): Promise<(EvermarkData | null)[]> => {
    const results: (EvermarkData | null)[] = [];
    
    // Process in batches to avoid overwhelming the network
    for (let i = 0; i < tokenIds.length; i += maxConcurrency) {
      const batch = tokenIds.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(tokenId => fetchEvermarkData(tokenId));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + maxConcurrency < tokenIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }, [fetchEvermarkData]);

  /**
   * Upload file to Pinata IPFS with enhanced error handling
   */
  const uploadToPinata = useCallback(async (file: File): Promise<string> => {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    const formData = new FormData();
    formData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: `evermark-${file.name}-${Date.now()}`,
      keyvalues: { 
        type: file.type.startsWith('image/') ? 'evermark-image' : 'evermark-metadata',
        timestamp: Date.now().toString(),
        originalName: file.name
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({ 
      cidVersion: 0,
      wrapWithDirectory: false
    });
    formData.append('pinataOptions', pinataOptions);

    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}` 
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata upload failed (${response.status}): ${errorText}`);
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
   * Enhanced metadata validation with detailed feedback
   */
  const validateMetadata = useCallback((metadata: EvermarkMetadata): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields validation
    if (!metadata.title?.trim()) {
      errors.push("Title is required");
    } else if (metadata.title.length > 100) {
      errors.push("Title must be 100 characters or less");
    }
    
    if (!metadata.description?.trim()) {
      errors.push("Description is required");
    } else if (metadata.description.length > 1000) {
      errors.push("Description must be 1000 characters or less");
    }
    
    if (!metadata.author?.trim()) {
      errors.push("Author is required");
    }
    
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

    // Image file validation
    if (metadata.imageFile) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(metadata.imageFile.type)) {
        errors.push("Image must be JPEG, PNG, GIF, or WebP format");
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (metadata.imageFile.size > maxSize) {
        errors.push("Image must be less than 5MB");
      }
    }

    // Warnings for best practices
    if (metadata.title && metadata.title.length < 10) {
      warnings.push("Consider using a more descriptive title (at least 10 characters)");
    }
    
    if (metadata.description && metadata.description.length < 50) {
      warnings.push("Consider adding more detail to the description");
    }
    
    return { 
      isValid: errors.length === 0, 
      errors,
      warnings 
    };
  }, []);

  /**
   * Check if input is a Farcaster cast URL or hash
   */
  const isFarcasterInput = useCallback((input: string): boolean => {
    if (!input) return false;
    
    return (
      input.includes('farcaster.xyz') ||
      input.includes('warpcast.com') ||
      input.includes('farcaster') ||
      (input.startsWith('0x') && input.length >= 10 && input.length <= 66)
    );
  }, []);

  /**
   * Extract cast hash from Farcaster input with enhanced parsing
   */
  const extractCastHash = useCallback((input: string): string | null => {
    console.log("🔍 Extracting cast hash from input:", input);
    
    if (!input) return null;
    
    // Direct hash input
    if (input.startsWith('0x') && input.length >= 10) {
      console.log("✅ Input is already a hash:", input);
      return input;
    }
    
    // Farcaster.xyz URL
    if (input.includes('farcaster.xyz')) {
      const match = input.match(/farcaster\.xyz\/[^\/]+\/([0-9a-fA-F]+)/);
      if (match && match[1]) {
        const hash = `0x${match[1]}`;
        console.log("✅ Extracted hash from farcaster.xyz URL:", hash);
        return hash;
      }
    }
    
    // Warpcast URL
    if (input.includes('warpcast.com')) {
      const match = input.match(/warpcast\.com\/[^\/]+\/(0x[0-9a-fA-F]+)/);
      if (match && match[1]) {
        console.log("✅ Extracted hash from warpcast URL:", match[1]);
        return match[1];
      }
    }
    
    // Generic hash extraction
    const hashMatch = input.match(/(0x[a-fA-F0-9]{8,})/);
    if (hashMatch) {
      console.log("✅ Found hash in string:", hashMatch[1]);
      return hashMatch[1];
    }
    
    console.log("❌ No valid hash found in input");
    return null;
  }, []);

  /**
   * Fetch Farcaster cast data from Pinata with enhanced error handling
   */
  const fetchCastDataFromPinata = useCallback(async (input: string): Promise<CastData> => {
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
   * Build comprehensive metadata for Evermark creation with enhanced structure
   */
  const buildComprehensiveMetadata = useCallback(async (
    metadata: EvermarkMetadata,
    imageUrl?: string,
    castData?: CastData,
    creatorAddress?: string
  ) => {
    const comprehensiveMetadata = {
      name: metadata.title,
      description: metadata.description,
      image: imageUrl || "",
      external_url: metadata.sourceUrl,
      
      // Enhanced attributes with better categorization
      attributes: [
        { trait_type: "Author", value: metadata.author },
        { trait_type: "Source URL", value: metadata.sourceUrl },
        { trait_type: "Content Type", value: metadata.contentType || 'Custom' },
        { trait_type: "Created", value: new Date().toISOString() },
        { trait_type: "Version", value: "2.1" },
        ...(creatorAddress ? [{ trait_type: "Creator Address", value: creatorAddress }] : []),
      ],

      // Enhanced Evermark-specific metadata
      evermark: {
        version: "2.1",
        schema: "https://evermark.xyz/schema/v2.1",
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
        
        // Enhanced cast data if available
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
        
        // Metadata creation info
        createdAt: new Date().toISOString(),
        createdBy: creatorAddress,
        platform: "Evermark",
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
        { trait_type: "Farcaster Author", value: castData.username || 'unknown' },
        { trait_type: "Cast Hash", value: castData.castHash || '' },
        { trait_type: "Author FID", value: (castData.authorFid || 0).toString() }
      );
    }

    // Add custom fields as attributes
    if (metadata.customFields && metadata.customFields.length > 0) {
      metadata.customFields.forEach(field => {
        if (field.key && field.value) {
          comprehensiveMetadata.attributes.push({
            trait_type: `Custom: ${field.key}`,
            value: field.value
          });
        }
      });
    }

    // Add tags as attributes
    if (metadata.tags && metadata.tags.length > 0) {
      comprehensiveMetadata.attributes.push({
        trait_type: "Tags",
        value: metadata.tags.join(", ")
      });
    }

    return comprehensiveMetadata;
  }, []);

  /**
   * Upload JSON metadata to IPFS
   */
  const uploadMetadataToIPFS = useCallback(async (metadata: any): Promise<string> => {
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json'
    });
    const metadataFile = new File([metadataBlob], 'metadata.json', { 
      type: 'application/json' 
    });

    return await uploadToPinata(metadataFile);
  }, [uploadToPinata]);

  /**
   * Get IPFS gateway URLs for a hash
   */
  const getIPFSGatewayUrls = useCallback((ipfsHash: string): string[] => {
    if (!ipfsHash) return [];
    
    const hash = ipfsHash.replace('ipfs://', '');
    return [
      `https://gateway.pinata.cloud/ipfs/${hash}`,
      `https://ipfs.io/ipfs/${hash}`,
      `https://cloudflare-ipfs.com/ipfs/${hash}`,
    ];
  }, []);

  /**
   * Validate IPFS hash format
   */
  const isValidIPFSHash = useCallback((hash: string): boolean => {
    if (!hash) return false;
    
    const cleanHash = hash.replace('ipfs://', '');
    
    // Basic validation for IPFS hash formats (CIDv0 and CIDv1)
    return /^[a-zA-Z0-9]{46,}$/.test(cleanHash) || /^[a-zA-Z2-7]{59}$/.test(cleanHash);
  }, []);

  /**
   * Get metadata summary for display
   */
  const getMetadataSummary = useCallback((metadata: EvermarkMetadata) => {
    return {
      title: metadata.title,
      author: metadata.author,
      contentType: metadata.contentType || 'Custom',
      hasImage: !!metadata.imageFile,
      hasCustomFields: (metadata.customFields?.length || 0) > 0,
      hasTags: (metadata.tags?.length || 0) > 0,
      wordCount: metadata.description.split(/\s+/).length,
      estimatedSize: new Blob([JSON.stringify(metadata)]).size,
    };
  }, []);

  // Memoized return object for better performance
  return useMemo(() => ({
    // IPFS functions
    fetchIPFSMetadata,
    uploadToPinata,
    uploadMetadataToIPFS,
    getIPFSGatewayUrls,
    isValidIPFSHash,
    
    // Evermark data functions
    fetchEvermarkData,
    fetchEvermarkDataBatch,
    
    // Validation functions
    validateMetadata,
    getMetadataSummary,
    
    // Farcaster functions
    isFarcasterInput,
    extractCastHash,
    fetchCastDataFromPinata,
    
    // Metadata building
    buildComprehensiveMetadata,
  }), [
    fetchIPFSMetadata,
    uploadToPinata,
    uploadMetadataToIPFS,
    getIPFSGatewayUrls,
    isValidIPFSHash,
    fetchEvermarkData,
    fetchEvermarkDataBatch,
    validateMetadata,
    getMetadataSummary,
    isFarcasterInput,
    extractCastHash,
    fetchCastDataFromPinata,
    buildComprehensiveMetadata,
  ]);
}