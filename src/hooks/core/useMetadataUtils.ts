// src/hooks/core/useMetadataUtils.ts - Clean implementation optimized for ThirdWeb v5
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
 * Enhanced metadata and IPFS utilities optimized for ThirdWeb v5
 * Handles all Evermark metadata operations including IPFS fetching and validation
 */
export function useMetadataUtils() {
  const { evermarkNFT } = useContracts();

  /**
   * Fetch IPFS metadata with enhanced error handling and multiple gateways
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
      
      // Validate IPFS hash format
      if (ipfsHash.length < 40 || !/^[a-zA-Z0-9]+$/.test(ipfsHash)) {
        console.warn('Invalid IPFS hash format:', ipfsHash);
        return defaultReturn;
      }
      
      // Try multiple gateways for better reliability
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
        `https://dweb.link/ipfs/${ipfsHash}`,
      ];
      
      for (const gatewayUrl of gateways) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          console.log('🌐 Fetching IPFS metadata from:', gatewayUrl);
          
          const response = await fetch(gatewayUrl, { 
            signal: controller.signal,
            cache: 'force-cache',
            headers: { 'Accept': 'application/json' }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const ipfsData = await response.json();
          console.log('✅ IPFS data fetched successfully');
          
          // Process and normalize the data
          const processedData: IPFSMetadata = {
            description: ipfsData.description || ipfsData.desc || "",
            sourceUrl: ipfsData.external_url || ipfsData.sourceUrl || ipfsData.source_url || "",
            image: ipfsData.image 
              ? ipfsData.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') 
              : "",
            name: ipfsData.name || ipfsData.title || "",
            attributes: Array.isArray(ipfsData.attributes) ? ipfsData.attributes : []
          };
          
          return processedData;
          
        } catch (gatewayError) {
          console.warn(`❌ Gateway ${gatewayUrl} failed:`, gatewayError);
          continue; // Try next gateway
        }
      }
      
      // All gateways failed
      console.error('❌ All IPFS gateways failed for hash:', ipfsHash);
      return defaultReturn;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("❌ Error fetching IPFS metadata:", errorMessage);
      return defaultReturn;
    }
  }, []);

  /**
   * Fetch complete Evermark data from contract and IPFS
   */
  const fetchEvermarkData = useCallback(async (tokenId: bigint): Promise<EvermarkData | null> => {
    try {
      console.log(`🔍 Fetching Evermark data for token ${tokenId}`);

      // Check if token exists
      const exists = await readContract({
        contract: evermarkNFT,
        method: "function exists(uint256) view returns (bool)",
        params: [tokenId],
      });

      if (!exists) {
        console.log(`❌ Evermark ${tokenId} does not exist`);
        return null;
      }

      // Get evermark data from contract using the correct ABI method
      const evermarkData = await readContract({
        contract: evermarkNFT,
        method: "function evermarkData(uint256) view returns (string,string,string,uint256,address,address)",
        params: [tokenId],
      });

      if (!evermarkData || !Array.isArray(evermarkData)) {
        console.error('❌ Invalid evermarkData response:', evermarkData);
        return null;
      }

      // Extract fields from tuple: [title, creator, metadataURI, creationTime, minter, referrer]
      const [title, creator, metadataURI, creationTime, minter, referrer] = evermarkData;

      // Validate required fields
      if (!title || !metadataURI) {
        console.error('❌ Missing required evermark data fields');
        return null;
      }

      // Fetch IPFS metadata
      const { description, sourceUrl, image } = await fetchIPFSMetadata(metadataURI);

      // Return complete evermark data
      const result: EvermarkData = {
        id: tokenId.toString(),
        title: title || `Evermark #${tokenId}`,
        author: creator || "Unknown",
        creator: minter || "0x0",
        description,
        sourceUrl,
        image,
        metadataURI,
        creationTime: Number(creationTime) * 1000, // Convert to milliseconds
        minter: minter || "0x0",
        referrer: referrer || undefined
      };

      console.log(`✅ Successfully fetched Evermark data for token ${tokenId}`);
      return result;

    } catch (error) {
      console.error(`❌ Error fetching Evermark data for token ${tokenId}:`, error);
      return null;
    }
  }, [evermarkNFT, fetchIPFSMetadata]);

  /**
   * Batch fetch multiple Evermark data with concurrency control
   */
  const fetchEvermarkDataBatch = useCallback(async (
    tokenIds: bigint[], 
    maxConcurrency: number = 3
  ): Promise<(EvermarkData | null)[]> => {
    if (tokenIds.length === 0) return [];
    
    const results: (EvermarkData | null)[] = [];
    
    console.log(`🔄 Fetching ${tokenIds.length} Evermarks with concurrency ${maxConcurrency}`);
    
    // Process in batches to avoid overwhelming the network
    for (let i = 0; i < tokenIds.length; i += maxConcurrency) {
      const batch = tokenIds.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(tokenId => 
        fetchEvermarkData(tokenId).catch(error => {
          console.warn(`Failed to fetch token ${tokenId}:`, error);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + maxConcurrency < tokenIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`✅ Batch fetch completed: ${results.filter(r => r !== null).length}/${tokenIds.length} successful`);
    return results;
  }, [fetchEvermarkData]);

  /**
   * Upload file to Pinata IPFS with enhanced validation
   */
  const uploadToPinata = useCallback(async (file: File): Promise<string> => {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    // File validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit`);
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    // Validate image types
    if (file.type.startsWith('image/')) {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        throw new Error(`Unsupported image type: ${file.type}`);
      }
    }

    const formData = new FormData();
    formData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: `evermark-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      keyvalues: { 
        type: file.type.startsWith('image/') ? 'evermark-image' : 'evermark-metadata',
        timestamp: Date.now().toString(),
        originalName: file.name,
        size: file.size.toString(),
        source: 'evermark-app'
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({ 
      cidVersion: 0,
      wrapWithDirectory: false
    });
    formData.append('pinataOptions', pinataOptions);

    try {
      console.log(`📤 Uploading ${file.name} (${(file.size / 1024).toFixed(1)}KB) to Pinata...`);
      
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
      
      if (!result.IpfsHash) {
        throw new Error('No IPFS hash returned from Pinata');
      }
      
      const ipfsUrl = `ipfs://${result.IpfsHash}`;
      console.log('✅ Successfully uploaded to Pinata:', ipfsUrl);
      return ipfsUrl;
      
    } catch (error) {
      console.error('❌ Pinata upload error:', error);
      throw error instanceof Error ? error : new Error('Upload failed');
    }
  }, []);

  /**
   * Enhanced metadata validation with comprehensive checks
   */
  const validateMetadata = useCallback((metadata: EvermarkMetadata): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields validation
    if (!metadata.title?.trim()) {
      errors.push("Title is required");
    } else {
      if (metadata.title.length > 100) {
        errors.push("Title must be 100 characters or less");
      }
      if (metadata.title.length < 3) {
        warnings.push("Title should be at least 3 characters");
      }
    }
    
    if (!metadata.description?.trim()) {
      errors.push("Description is required");
    } else {
      if (metadata.description.length > 1000) {
        errors.push("Description must be 1000 characters or less");
      }
      if (metadata.description.length < 10) {
        warnings.push("Description should be at least 10 characters for better context");
      }
    }
    
    if (!metadata.author?.trim()) {
      errors.push("Author is required");
    } else if (metadata.author.length > 50) {
      errors.push("Author name must be 50 characters or less");
    }
    
    if (!metadata.sourceUrl?.trim()) {
      errors.push("Source URL is required");
    } else {
      try {
        new URL(metadata.sourceUrl);
      } catch {
        errors.push("Source URL must be a valid URL");
      }
    }
    
    // Content-type specific validation
    if (metadata.contentType === 'DOI' && metadata.doi) {
      if (!/^10\.\d{4,}\/[^\s]+$/.test(metadata.doi)) {
        errors.push("Invalid DOI format (should start with 10.xxxx/ and contain no spaces)");
      }
    }
    
    if (metadata.contentType === 'ISBN' && metadata.isbn) {
      const cleanIsbn = metadata.isbn.replace(/[-\s]/g, '');
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
      
      if (metadata.imageFile.size > 2 * 1024 * 1024) { // 2MB
        warnings.push("Consider compressing the image for faster loading");
      }
    }

    // Best practice warnings
    if (metadata.title && metadata.title.length < 10) {
      warnings.push("Consider using a more descriptive title (at least 10 characters)");
    }
    
    if (metadata.description && metadata.description.length < 50) {
      warnings.push("Consider adding more detail to the description");
    }
    
    return { 
      isValid: errors.length === 0, 
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }, []);

  /**
   * Check if input is a Farcaster cast URL or hash
   */
  const isFarcasterInput = useCallback((input: string): boolean => {
    if (!input?.trim()) return false;
    
    const lowerInput = input.toLowerCase();
    return (
      lowerInput.includes('farcaster.xyz') ||
      lowerInput.includes('warpcast.com') ||
      lowerInput.includes('supercast.xyz') ||
      lowerInput.includes('farcaster') ||
      (input.startsWith('0x') && input.length >= 10 && input.length <= 66)
    );
  }, []);

  /**
   * Extract cast hash from Farcaster input with enhanced parsing
   */
  const extractCastHash = useCallback((input: string): string | null => {
    console.log("🔍 Extracting cast hash from input:", input);
    
    if (!input?.trim()) return null;
    
    const cleanInput = input.trim();
    
    // Direct hash input
    if (cleanInput.startsWith('0x') && cleanInput.length >= 10) {
      console.log("✅ Input is already a hash:", cleanInput);
      return cleanInput;
    }
    
    // Farcaster.xyz URL patterns
    if (cleanInput.includes('farcaster.xyz')) {
      const match = cleanInput.match(/farcaster\.xyz\/[^\/]+\/([0-9a-fA-F]+)/);
      if (match && match[1]) {
        const hash = match[1].startsWith('0x') ? match[1] : `0x${match[1]}`;
        console.log("✅ Extracted hash from farcaster.xyz URL:", hash);
        return hash;
      }
    }
    
    // Warpcast URL patterns
    if (cleanInput.includes('warpcast.com')) {
      const match = cleanInput.match(/warpcast\.com\/[^\/]+\/(0x[0-9a-fA-F]+)/);
      if (match && match[1]) {
        console.log("✅ Extracted hash from warpcast URL:", match[1]);
        return match[1];
      }
    }
    
    // Generic hash extraction
    const hashMatch = cleanInput.match(/(0x[a-fA-F0-9]{8,})/);
    if (hashMatch && hashMatch[1].length >= 10) {
      console.log("✅ Found hash in string:", hashMatch[1]);
      return hashMatch[1];
    }
    
    console.log("❌ No valid hash found in input");
    return null;
  }, []);

  /**
   * Fetch Farcaster cast data from Pinata
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
        if (response.status === 404) {
          throw new Error('Cast not found - it may have been deleted or the hash is incorrect');
        }
        throw new Error(`Failed to fetch cast data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("📦 Raw cast data from Pinata:", result);

      if (!result.data) {
        throw new Error("No cast data found in response");
      }

      const cast = result.data;
      const username = cast.author?.username || 'unknown';
      const canonicalUrl = `https://warpcast.com/${username}/${castHash}`;

      return {
        title: `Cast by @${username}`,
        author: cast.author?.display_name || username,
        content: cast.text || '',
        timestamp: cast.timestamp || new Date().toISOString(),
        castHash: castHash,
        username: username,
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
    castData?: CastData,
    creatorAddress?: string
  ) => {
    const comprehensiveMetadata = {
      name: metadata.title,
      description: metadata.description,
      image: imageUrl || "",
      external_url: metadata.sourceUrl,
      
      // Enhanced attributes
      attributes: [
        { trait_type: "Author", value: metadata.author },
        { trait_type: "Source URL", value: metadata.sourceUrl },
        { trait_type: "Content Type", value: metadata.contentType || 'Custom' },
        { trait_type: "Created", value: new Date().toISOString().split('T')[0] },
        { trait_type: "Version", value: "2.1" },
        ...(creatorAddress ? [{ trait_type: "Creator Address", value: creatorAddress }] : []),
      ],

      // Evermark-specific metadata
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
        
        // Creation info
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
        { trait_type: "Cast Hash", value: castData.castHash || '' }
      );
    }

    // Add custom fields as attributes
    if (metadata.customFields && metadata.customFields.length > 0) {
      metadata.customFields.forEach(field => {
        if (field.key?.trim() && field.value?.trim()) {
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
        value: metadata.tags.filter(tag => tag?.trim()).join(", ")
      });
    }

    return comprehensiveMetadata;
  }, []);

  /**
   * Upload JSON metadata to IPFS
   */
  const uploadMetadataToIPFS = useCallback(async (metadata: any): Promise<string> => {
    try {
      const metadataJson = JSON.stringify(metadata, null, 2);
      const metadataBlob = new Blob([metadataJson], {
        type: 'application/json'
      });
      const metadataFile = new File([metadataBlob], 'metadata.json', { 
        type: 'application/json' 
      });

      return await uploadToPinata(metadataFile);
    } catch (error) {
      console.error('❌ Failed to upload metadata to IPFS:', error);
      throw error instanceof Error ? error : new Error('Metadata upload failed');
    }
  }, [uploadToPinata]);

  /**
   * Get IPFS gateway URLs for a hash
   */
  const getIPFSGatewayUrls = useCallback((ipfsHash: string): string[] => {
    if (!ipfsHash?.trim()) return [];
    
    const hash = ipfsHash.replace('ipfs://', '');
    return [
      `https://gateway.pinata.cloud/ipfs/${hash}`,
      `https://ipfs.io/ipfs/${hash}`,
      `https://cloudflare-ipfs.com/ipfs/${hash}`,
      `https://dweb.link/ipfs/${hash}`,
    ];
  }, []);

  /**
   * Validate IPFS hash format
   */
  const isValidIPFSHash = useCallback((hash: string): boolean => {
    if (!hash?.trim()) return false;
    
    const cleanHash = hash.replace('ipfs://', '').trim();
    
    // Basic validation for IPFS hash formats
    return (
      /^Qm[a-zA-Z0-9]{44}$/.test(cleanHash) || // CIDv0
      /^b[a-z2-7]{58}$/.test(cleanHash) ||     // CIDv1 base32
      /^[a-zA-Z0-9]{46,}$/.test(cleanHash)     // General fallback
    );
  }, []);

  /**
   * Get metadata summary for display
   */
  const getMetadataSummary = useCallback((metadata: EvermarkMetadata) => {
    const wordCount = metadata.description?.split(/\s+/).filter(word => word.length > 0).length || 0;
    const estimatedSize = new Blob([JSON.stringify(metadata)]).size;
    
    return {
      title: metadata.title || 'Untitled',
      author: metadata.author || 'Unknown',
      contentType: metadata.contentType || 'Custom',
      hasImage: !!metadata.imageFile,
      hasCustomFields: (metadata.customFields?.length || 0) > 0,
      hasTags: (metadata.tags?.length || 0) > 0,
      wordCount,
      estimatedSize,
      sizeFormatted: estimatedSize < 1024 
        ? `${estimatedSize} bytes`
        : estimatedSize < 1024 * 1024
        ? `${(estimatedSize / 1024).toFixed(1)} KB`
        : `${(estimatedSize / 1024 / 1024).toFixed(2)} MB`,
      customFieldCount: metadata.customFields?.length || 0,
      tagCount: metadata.tags?.length || 0,
      hasSourceUrl: !!metadata.sourceUrl?.trim(),
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

/**
 * Helper function to get user-friendly token name
 */
function getTokenName(contract?: string): string {
  switch (contract?.toUpperCase()) {
    case 'EMARK_TOKEN':
    case 'EMARK':
      return 'EMARK';
    case 'CARD_CATALOG':
    case 'WEMARK':
      return 'wEMARK';
    default:
      return 'tokens';
  }
}

/**
 * Enhanced error context builder
 */
export function createErrorContext(
  operation: string,
  contract: string,
  additionalContext?: Partial<any>
): any {
  return {
    operation,
    contract,
    ...additionalContext,
    timestamp: Date.now()
  };
}