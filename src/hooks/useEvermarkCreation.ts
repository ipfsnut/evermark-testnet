// src/hooks/useEvermarkCreation.ts - Fixed with unified WalletProvider patterns
import { useState, useRef, useCallback, useEffect } from "react";
import { useReadContract } from "thirdweb/react"; // ✅ For reading only
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { encodeFunctionData } from "viem"; // ✅ For Wagmi transactions
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";
import { useWalletAuth, useWalletConnection } from "../providers/WalletProvider"; // ✅ Use unified provider

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
};

export function useEvermarkCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ Use unified wallet provider
  const { address, requireConnection } = useWalletAuth();
  const { sendTransaction, walletType } = useWalletConnection();

  const contract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EVERMARK_NFT,
    abi: EVERMARK_NFT_ABI,
  });

  // ✅ FIXED: Minimal queryOptions to avoid TypeScript issues
  const { data: mintingFee, isLoading: isLoadingFee, error: feeError } = useReadContract({
    contract,
    method: "MINTING_FEE",
    params: [],
    queryOptions: {
      enabled: !!CONTRACTS.EVERMARK_NFT, // Only run if contract address exists
      retry: 1, // Don't retry on error
    },
  });

  // ✅ Add error logging
  useEffect(() => {
    if (feeError) {
      console.error("❌ Minting fee query error:", feeError);
    }
    if (mintingFee) {
      console.log("💰 Minting fee loaded successfully:", mintingFee.toString());
    }
  }, [feeError, mintingFee]);

  // ✅ FIXED: Safer prepareTransaction with validation
  const prepareTransaction = useCallback((
    contractAddress: string, 
    abi: any[], 
    functionName: string, 
    params: any[],
    value?: bigint | string
  ) => {
    // ✅ Add validation
    if (!contractAddress || !abi || !functionName || !params) {
      throw new Error("Invalid transaction parameters");
    }

    console.log("🔧 prepareTransaction debug:", {
      contractAddress,
      functionName,
      params,
      value: value?.toString(),
      walletType,
    });

    try {
      if (walletType === 'farcaster') {
        // Use Viem for Farcaster (Wagmi)
        const data = encodeFunctionData({
          abi,
          functionName,
          args: params,
        });
        
        const tx = {
          to: contractAddress as `0x${string}`,
          data,
          ...(value && { value: BigInt(value) })
        };
        
        return tx;
      } else {
        // Use Thirdweb for desktop
        const contract = getContract({
          client,
          chain: CHAIN,
          address: contractAddress,
          abi,
        });
        
        const tx = prepareContractCall({
          contract,
          method: functionName,
          params,
          ...(value && { value: BigInt(value) })
        });

        return tx;
      }
    } catch (error) {
      console.error("❌ prepareTransaction failed:", error);
      throw error;
    }
  }, [walletType]);

  const createEvermark = useCallback(async (metadata: EvermarkMetadata): Promise<CreateEvermarkResult> => {
    console.log("🚀 createEvermark called with metadata:", metadata);
    
    // ✅ FIXED: Better fee validation
    if (isLoadingFee) {
      const errorMsg = "Loading minting fee from contract...";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (feeError) {
      const errorMsg = `Failed to load minting fee: ${feeError.message}`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (!mintingFee) {
      const errorMsg = "Minting fee not available";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    // ✅ Connection check
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
      const errorMsg = "Please connect your wallet to create an Evermark";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    // Validate metadata
    const validation = validateMetadata(metadata);
    if (!validation.isValid) {
      const errorMsg = `Validation failed: ${validation.errors.join(', ')}`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
    setCurrentStep("Starting creation process...");

    abortControllerRef.current = new AbortController();

    try {
      console.log("🚀 Starting Evermark creation process...");
      console.log("🔧 Using wallet type:", walletType);
      console.log(" Minting fee:", mintingFee.toString(), "wei");

      let imageUrl = "";
      let castData: CastDataSuccess | null = null;

      // Step 1: Handle image upload if present
      if (metadata.imageFile) {
        setCurrentStep("Uploading image to IPFS...");
        setUploadProgress(10);
        
        try {
          imageUrl = await uploadToPinata(metadata.imageFile);
          console.log("✅ Image uploaded:", imageUrl);
          setUploadProgress(25);
        } catch (error) {
          console.error("❌ Image upload failed:", error);
          throw new Error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 2: Handle Farcaster cast data if needed
      if (isFarcasterInput(metadata.sourceUrl)) {
        setCurrentStep("Fetching Farcaster cast data...");
        setUploadProgress(35);
        
        try {
          const fetchedCastData = await fetchCastDataFromPinata(metadata.sourceUrl);
          
          if (isCastDataSuccess(fetchedCastData)) {
            castData = fetchedCastData;
            console.log("✅ Cast data fetched successfully:", castData);
          } else {
            console.warn("⚠️ Cast data fetch had errors:", fetchedCastData.error);
          }
          
          setUploadProgress(50);
        } catch (error) {
          console.error("❌ Cast data fetch failed:", error);
          // Don't throw here - we can still create the Evermark without cast data
        }
      }

      // Step 3: Build comprehensive metadata
      setCurrentStep("Building metadata...");
      setUploadProgress(60);

      const comprehensiveMetadata = {
        name: metadata.title,
        description: metadata.description,
        image: imageUrl,
        external_url: metadata.sourceUrl,
        
        // Core attributes
        attributes: [
          { trait_type: "Author", value: metadata.author },
          { trait_type: "Source URL", value: metadata.sourceUrl },
          { trait_type: "Content Type", value: metadata.contentType || 'Custom' },
          { trait_type: "Created", value: new Date().toISOString() },
          { trait_type: "Creator Address", value: address },
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
          ...(castData && { 
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
      if (castData) {
        comprehensiveMetadata.attributes.push(
          { trait_type: "Farcaster Author", value: castData.username },
          { trait_type: "Cast Hash", value: castData.castHash },
          { trait_type: "Author FID", value: castData.authorFid.toString() }
        );
      }

      console.log("📋 Comprehensive metadata built:", comprehensiveMetadata);

      // Step 4: Upload metadata to IPFS
      setCurrentStep("Uploading metadata to IPFS...");
      setUploadProgress(70);

      const metadataBlob = new Blob([JSON.stringify(comprehensiveMetadata, null, 2)], {
        type: 'application/json'
      });
      const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });

      let metadataURI: string;
      try {
        metadataURI = await uploadToPinata(metadataFile);
        console.log("✅ Metadata uploaded:", metadataURI);
        setUploadProgress(85);
      } catch (error) {
        console.error("❌ Metadata upload failed:", error);
        throw new Error(`Metadata upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 5: Get next token ID
      setCurrentStep("Getting next token ID...");
      
      let nextTokenId: bigint;
      try {
        nextTokenId = await readContract({
          contract,
          method: "nextTokenId",
          params: [],
        });
        console.log("🎯 Next token ID:", nextTokenId.toString());
      } catch (error) {
        console.error("❌ Failed to get next token ID:", error);
        throw new Error("Failed to get next token ID from contract");
      }

      // Step 6: Create the NFT transaction
      setCurrentStep("Creating Evermark NFT...");
      setUploadProgress(90);

      console.log("📡 Preparing mint transaction...");
      console.log("📋 Transaction params:", {
        metadataURI,
        title: metadata.title,
        creator: metadata.author,
        referrer: DEVELOPER_REFERRER,
        mintingFee: mintingFee.toString()
      });

      // ✅ FIXED: Use correct function name and parameters from ABI
      const transaction = prepareTransaction(
        CONTRACTS.EVERMARK_NFT,
        EVERMARK_NFT_ABI,
        "mintEvermarkWithReferral", // ✅ Correct function name
        [
          metadataURI,              // string metadataURI
          metadata.title,           // string title  
          metadata.author,          // string creator
          DEVELOPER_REFERRER        // address referrer
        ],
        mintingFee // ✅ Dynamic minting fee from contract
      );

      console.log("📡 Sending transaction via unified wallet provider...");

      // ✅ Transaction execution
      const result = await sendTransaction(transaction);

      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }

      const txHash = result.transactionHash!;
      console.log("✅ Evermark created successfully! Transaction:", txHash);

      setUploadProgress(100);
      setCurrentStep("Evermark created successfully!");
      
      const successMessage = `Evermark created successfully! Fee: ${mintingFee.toString()} wei. Transaction: ${txHash}`;
      setSuccess(successMessage);

      return {
        success: true,
        message: successMessage,
        txHash,
        metadataURI,
        imageUrl,
        castData,
      };

    } catch (err: any) {
      console.error("❌ Evermark creation failed:", err);
      
      const errorMessage = err.message || "Failed to create Evermark";
      setError(errorMessage);
      setCurrentStep("Creation failed");
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsCreating(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  }, [address, sendTransaction, requireConnection, walletType, prepareTransaction, contract, mintingFee, isLoadingFee]);

  const cancelCreation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsCreating(false);
      setCurrentStep("Creation cancelled");
      setError("Creation was cancelled by user");
    }
  }, []);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const validateFarcasterInput = useCallback((input: string) => {
    const isValid = isFarcasterInput(input);
    if (!isValid) return { isValid: false };
    
    // Extract hash from URL
    const hashMatch = input.match(/0x[a-fA-F0-9]+/);
    const hash = hashMatch ? hashMatch[0] : null;
    
    return {
      isValid: true,
      hash,
      url: input
    };
  }, []);

  return {
    // State
    isCreating,
    uploadProgress,
    currentStep,
    error,
    success,
    
    // ✅ FIXED: Better fee info
    mintingFee,
    isLoadingFee,
    feeError,
    
    // Actions
    createEvermark,
    cancelCreation,
    clearMessages,
    
    // Utilities
    validateMetadata,
    isFarcasterInput,
    
    // Auth info
    isConnected: !!address,
    userAddress: address,
    validateFarcasterInput,
  };
}
