// src/hooks/useEvermarkCreation.ts - Simplified with unified WalletProvider
import { useState, useRef } from "react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";
import { useWalletConnection } from "../providers/WalletProvider";

// Enhanced metadata interface with all fields
export interface EvermarkMetadata {
  title: string;
  description: string;
  sourceUrl: string;
  author: string;
  imageFile?: File | null;
  
  // ✅ Enhanced metadata fields
  customFields?: Array<{ key: string; value: string }>;
  tags?: string[];
  contentType?: 'Cast' | 'DOI' | 'ISBN' | 'URL' | 'Custom';
  
  // Type-specific fields
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

// Cast data interfaces
interface CastDataSuccess {
  title: string;
  author: string;
  content: string;
  timestamp: string;
  castHash: string;
  username: string;
  authorFid: number;
  embeds: any[];
  mentions: any[];
  parentHash: string;
  rootParentHash: string;
  canonicalUrl: string;
}

interface CastDataError {
  title: string;
  author: string;
  content: string;
  timestamp: string;
  error: string;
  canonicalUrl: string;
}

type CastData = CastDataSuccess | CastDataError;

const isCastDataSuccess = (castData: CastData): castData is CastDataSuccess => {
  return !('error' in castData);
};

// Transaction result interface
interface CreateEvermarkResult {
  success: boolean;
  message?: string;
  error?: string;
  txHash?: string;
  metadataURI?: string;
  imageUrl?: string;
  castData?: CastDataSuccess | null;
}

const DEVELOPER_REFERRER = "0x2B27EA7DaA8Bf1dE98407447b269Dfe280753fe3";

// Validation function
const validateMetadata = (metadata: EvermarkMetadata): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!metadata.title?.trim()) errors.push("Title is required");
  if (!metadata.description?.trim()) errors.push("Description is required");
  
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
  
  return { isValid: errors.length === 0, errors };
};

// Image upload to Pinata
const uploadToPinata = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const pinataMetadata = JSON.stringify({
    name: `evermark-image-${Date.now()}`,
    keyvalues: { type: 'evermark-image' }
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
    return `ipfs://${result.IpfsHash}`;
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw error;
  }
};

// Farcaster cast processing
const extractCastHash = (input: string): string | null => {
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
};

const isFarcasterInput = (input: string): boolean => {
  return (
    input.includes('farcaster.xyz') ||
    input.includes('warpcast.com') ||
    input.includes('farcaster') ||
    (input.startsWith('0x') && input.length >= 10)
  );
};

const fetchCastDataFromPinata = async (input: string): Promise<CastData> => {
  try {
    console.log("🎯 Processing Farcaster input:", input);
    
    const castHash = extractCastHash(input);
    if (!castHash) {
      throw new Error("Could not extract valid cast hash from input");
    }

    let username = "unknown";
    let canonicalUrl = input;
    
    if (input.includes('farcaster.xyz/')) {
      const urlParts = input.split('/');
      const usernameIndex = urlParts.findIndex(part => part === 'farcaster.xyz') + 1;
      if (usernameIndex > 0 && urlParts[usernameIndex]) {
        username = urlParts[usernameIndex];
        canonicalUrl = input;
      }
    } else {
      canonicalUrl = `https://farcaster.xyz/unknown/${castHash}`;
    }

    console.log("✅ Using extracted info:", { username, castHash, canonicalUrl });

    const extractedData: CastDataSuccess = {
      title: `Cast by @${username}`,
      author: username,
      content: `Farcaster cast ${castHash}`,
      timestamp: new Date().toISOString(),
      castHash: castHash,
      username: username,
      authorFid: 0,
      embeds: [],
      mentions: [],
      parentHash: "",
      rootParentHash: "",
      canonicalUrl: canonicalUrl
    };

    console.log("✅ Created cast data from URL parsing:", extractedData);
    return extractedData;

  } catch (error: any) {
    console.error("❌ Failed to process cast:", error);
    
    const errorData: CastDataError = {
      title: "Farcaster Cast",
      author: "Unknown Author",
      content: "Failed to process cast",
      timestamp: new Date().toISOString(),
      error: error.message,
      canonicalUrl: input.includes('http') ? input : `https://farcaster.xyz/unknown/${input}`
    };
    
    return errorData;
  }
};

// Enhanced metadata upload to Pinata
const uploadMetadataToPinata = async (
  metadata: EvermarkMetadata, 
  imageUrl?: string, 
  castData?: CastData
): Promise<string> => {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  
  if (!jwt) {
    throw new Error("Pinata JWT token not found");
  }

  const metadataObject = {
    name: metadata.title,
    description: metadata.description,
    image: imageUrl || '',
    external_url: castData?.canonicalUrl || metadata.sourceUrl || '',
    
    // ✅ Enhanced attributes including custom fields
    attributes: [
      { trait_type: 'Author', value: metadata.author || 'Unknown Author' },
      { trait_type: 'Content Type', value: metadata.contentType || 'Custom' },
      { trait_type: 'Source URL', value: castData?.canonicalUrl || metadata.sourceUrl || 'Direct Upload' },
      { trait_type: 'Created', value: new Date().toISOString() },
      
      // ✅ Custom fields as attributes
      ...(metadata.customFields?.map(field => ({
        trait_type: field.key,
        value: field.value
      })) || []),
      
      // ✅ Type-specific attributes
      ...(metadata.doi ? [{ trait_type: 'DOI', value: metadata.doi }] : []),
      ...(metadata.isbn ? [{ trait_type: 'ISBN', value: metadata.isbn }] : []),
      ...(metadata.journal ? [{ trait_type: 'Journal', value: metadata.journal }] : []),
      ...(metadata.publisher ? [{ trait_type: 'Publisher', value: metadata.publisher }] : []),
      ...(metadata.publicationDate ? [{ trait_type: 'Publication Date', value: metadata.publicationDate }] : []),
      ...(metadata.volume ? [{ trait_type: 'Volume', value: metadata.volume }] : []),
      ...(metadata.issue ? [{ trait_type: 'Issue', value: metadata.issue }] : []),
      ...(metadata.pages ? [{ trait_type: 'Pages', value: metadata.pages }] : []),
      
      // ✅ Farcaster-specific attributes
      ...(castData && isCastDataSuccess(castData) ? [
        { trait_type: 'Cast Content', value: castData.content },
        { trait_type: 'Cast Hash', value: castData.castHash },
        { trait_type: 'Author Username', value: castData.username },
        { trait_type: 'Author FID', value: castData.authorFid.toString() },
        { trait_type: 'Cast Timestamp', value: castData.timestamp },
        { trait_type: 'Platform', value: 'Farcaster' }
      ] : [])
    ],
    
    // ✅ Tags
    ...(metadata.tags && metadata.tags.length > 0 && {
      tags: metadata.tags
    }),
    
    // ✅ Enhanced metadata section for rich data
    enhanced_metadata: {
      content_type: metadata.contentType,
      custom_fields: metadata.customFields || [],
      tags: metadata.tags || [],
      type_specific_data: {
        ...(metadata.contentType === 'DOI' && {
          doi: metadata.doi,
          journal: metadata.journal,
          volume: metadata.volume,
          issue: metadata.issue,
          pages: metadata.pages,
          publication_date: metadata.publicationDate
        }),
        ...(metadata.contentType === 'ISBN' && {
          isbn: metadata.isbn,
          publisher: metadata.publisher,
          publication_date: metadata.publicationDate
        }),
        ...(metadata.contentType === 'Cast' && {
          cast_url: metadata.castUrl
        }),
        ...(metadata.contentType === 'URL' && {
          url: metadata.url
        })
      }
    },
    
    // ✅ Farcaster data if available
    ...(castData && isCastDataSuccess(castData) && {
      farcaster_data: {
        content: castData.content,
        author: { username: castData.username, fid: castData.authorFid },
        cast_hash: castData.castHash,
        timestamp: castData.timestamp,
        embeds: castData.embeds,
        mentions: castData.mentions,
        parent_hash: castData.parentHash,
        root_parent_hash: castData.rootParentHash,
        canonical_url: castData.canonicalUrl
      }
    })
  };

  console.log("📝 Uploading enhanced metadata object:", JSON.stringify(metadataObject, null, 2));

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataContent: metadataObject,
        pinataMetadata: {
          name: `evermark-metadata-${Date.now()}`,
          keyvalues: {
            type: 'evermark-metadata',
            title: metadata.title,
            content_type: metadata.contentType || 'custom',
            platform: castData && isCastDataSuccess(castData) ? 'farcaster' : 'general'
          }
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Metadata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    const metadataURI = `ipfs://${result.IpfsHash}`;
    console.log("✅ Enhanced metadata uploaded with IPFS URI:", metadataURI);
    return metadataURI;
  } catch (error) {
    console.error('Enhanced metadata upload error:', error);
    throw error;
  }
};

export const useEvermarkCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const isProcessingRef = useRef(false);
  
  // ✅ SIMPLIFIED: Use unified wallet provider
  const { 
    isConnected, 
    canInteract, 
    requireConnection, 
    sendTransaction,
    isTransactionPending,
    error: walletError 
  } = useWalletConnection();

  const createEvermark = async (metadata: EvermarkMetadata): Promise<CreateEvermarkResult> => {
    // Prevent concurrent executions
    if (isProcessingRef.current) {
      console.log("⚠️ Creation already in progress, skipping");
      return { success: false, error: "Creation already in progress" };
    }

    isProcessingRef.current = true;
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("🚀 Starting Evermark creation with enhanced metadata:", metadata);

      // ✅ SIMPLIFIED: Use unified wallet connection
      if (!canInteract) {
        console.log("🔌 Wallet not connected, attempting connection...");
        const connectionResult = await requireConnection();
        if (!connectionResult.success) {
          throw new Error(connectionResult.error || "Failed to connect wallet");
        }
        // Give connection a moment to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Validate metadata
      const validation = validateMetadata(metadata);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Get contract instance
      const contract = getContract({
        client,
        chain: CHAIN,
        address: CONTRACTS.EVERMARK_NFT,
        abi: EVERMARK_NFT_ABI,
      });

      // Get minting fee
      console.log("💰 Getting minting fee...");
      const mintingFee = await readContract({
        contract,
        method: "mintingFee",
        params: [],
      });
      console.log("✅ Minting fee:", mintingFee.toString());

      let imageUrl = '';
      let castData: CastData | null = null;

      // Handle image upload
      if (metadata.imageFile) {
        console.log("🖼️ Uploading image to IPFS...");
        try {
          imageUrl = await uploadToPinata(metadata.imageFile);
          console.log("✅ Image uploaded:", imageUrl);
        } catch (imageError) {
          console.error("❌ Image upload failed:", imageError);
          // Continue without image rather than failing completely
          setError("Image upload failed, continuing without image");
        }
      }

      // Handle Farcaster cast processing
      const sourceUrl = metadata.sourceUrl || metadata.castUrl || '';
      if (sourceUrl && isFarcasterInput(sourceUrl)) {
        console.log("📱 Processing Farcaster cast...");
        try {
          castData = await fetchCastDataFromPinata(sourceUrl);
          console.log("✅ Cast data processed:", castData);
          
          // Update metadata with cast data if successful
          if (isCastDataSuccess(castData)) {
            // Enhance metadata with cast information
            metadata.title = metadata.title || castData.title;
            metadata.author = metadata.author || castData.author;
            metadata.description = metadata.description || castData.content;
            
            // Add cast-specific custom fields
            const castFields = [
              { key: 'cast_hash', value: castData.castHash },
              { key: 'cast_author', value: castData.username },
              { key: 'cast_timestamp', value: castData.timestamp },
              { key: 'platform', value: 'Farcaster' }
            ];
            
            metadata.customFields = [
              ...(metadata.customFields || []),
              ...castFields.filter(newField => 
                !metadata.customFields?.some(existing => existing.key === newField.key)
              )
            ];
          }
        } catch (castError) {
          console.error("❌ Cast processing failed:", castError);
          // Continue with original metadata
          setError("Cast processing failed, using provided metadata");
        }
      }

      // Upload enhanced metadata to IPFS
      console.log("📝 Uploading enhanced metadata to IPFS...");
      const metadataURI = await uploadMetadataToPinata(metadata, imageUrl, castData || undefined); // ✅ Convert null to undefined
      console.log("✅ Enhanced metadata uploaded:", metadataURI);
      // Prepare transaction
      const actualTitle = metadata.title || "Untitled Evermark";
      const actualAuthor = metadata.author || "Unknown Author";

      console.log("⛓️ Preparing blockchain transaction...");
      const transaction = prepareContractCall({
        contract,
        method: "mintEvermarkWithReferral",
        params: [metadataURI, actualTitle, actualAuthor, DEVELOPER_REFERRER],
        value: mintingFee,
      });

      console.log("📡 Sending transaction via unified wallet provider...");
      
      // ✅ SIMPLIFIED: Use unified transaction sending
      const result = await sendTransaction(transaction);
      
      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }

      const txHash = result.transactionHash!;
      console.log("✅ Evermark created successfully! Transaction:", txHash);

      const successMessage = `Evermark "${actualTitle}" created successfully!`;
      setSuccess(successMessage);

      return {
        success: true,
        message: successMessage,
        txHash,
        metadataURI,
        imageUrl: imageUrl || undefined,
        castData: castData && isCastDataSuccess(castData) ? castData : null
      };

    } catch (err: any) {
      console.error("❌ Evermark creation failed:", err);
      
      let errorMessage = "Failed to create Evermark";
      
      // Enhanced error handling
      if (err.message) {
        if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for minting fee and gas";
        } else if (err.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected by user";
        } else if (err.message.includes("network")) {
          errorMessage = "Network error - please try again";
        } else if (err.message.includes("Validation failed")) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }
      }

      // Include wallet errors if present
      if (walletError) {
        errorMessage += ` (Wallet: ${walletError})`;
      }

      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };

    } finally {
      setIsCreating(false);
      isProcessingRef.current = false;
    }
  };

  // Farcaster input validation helper
  const validateFarcasterInput = (input: string): { 
    isValid: boolean; 
    hash?: string; 
    error?: string 
  } => {
    if (!input) {
      return { isValid: false, error: "Input is required" };
    }

    if (!isFarcasterInput(input)) {
      return { isValid: false, error: "Not a valid Farcaster URL or hash" };
    }

    const hash = extractCastHash(input);
    if (!hash) {
      return { isValid: false, error: "Could not extract cast hash" };
    }

    return { isValid: true, hash };
  };

  // Clear messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Wallet info for debugging
  const walletInfo = {
    isConnected,
    canInteract,
    isTransactionPending,
    walletError
  };

  return {
    createEvermark,
    isCreating,
    error,
    success,
    validateFarcasterInput,
    clearMessages,
    walletInfo
  };
};
