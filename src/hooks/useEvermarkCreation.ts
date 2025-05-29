import { useState, useRef } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";

// ADD THE TYPE DEFINITIONS RIGHT HERE - AFTER IMPORTS, BEFORE INTERFACES
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

// Type guard function
const isCastDataSuccess = (castData: CastData): castData is CastDataSuccess => {
  return !('error' in castData);
};

// NOW CONTINUE WITH EXISTING INTERFACES
export interface EvermarkMetadata {
  title: string;
  description: string;
  sourceUrl: string;
  author: string;
  imageFile?: File | null;
}

// Developer referrer address
const DEVELOPER_REFERRER = "0x2B27EA7DaA8Bf1dE98407447b269Dfe280753fe3";

// Pinata image upload function
const uploadToPinata = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const pinataMetadata = JSON.stringify({
    name: `evermark-image-${Date.now()}`,
    keyvalues: {
      type: 'evermark-image'
    }
  });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 0,
  });
  formData.append('pinataOptions', pinataOptions);

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw error;
  }
};

// Extract and normalize cast hash from various input formats
const extractCastHash = (input: string): string | null => {
  console.log("🔍 Extracting cast hash from input:", input);
  
  // If it's already just a hash
  if (input.startsWith('0x') && input.length >= 10) {
    console.log("✅ Input is already a hash:", input);
    return input;
  }
  
  // If it's a farcaster.xyz URL: https://farcaster.xyz/username/0x12345...
  if (input.includes('farcaster.xyz')) {
    const urlParts = input.split('/');
    const hash = urlParts[urlParts.length - 1];
    if (hash.startsWith('0x')) {
      console.log("✅ Extracted hash from farcaster.xyz URL:", hash);
      return hash;
    }
  }
  
  // If it's a warpcast URL: https://warpcast.com/username/0x12345...
  if (input.includes('warpcast.com')) {
    const urlParts = input.split('/');
    const hash = urlParts[urlParts.length - 1];
    if (hash.startsWith('0x')) {
      console.log("✅ Extracted hash from warpcast URL:", hash);
      return hash;
    }
  }
  
  // Try to find any 0x hash in the string
  const hashMatch = input.match(/0x[a-fA-F0-9]+/);
  if (hashMatch) {
    console.log("✅ Found hash in string:", hashMatch[0]);
    return hashMatch[0];
  }
  
  console.log("❌ No valid hash found in input");
  return null;
};

// Check if input is Farcaster-related
const isFarcasterInput = (input: string): boolean => {
  return (
    input.includes('farcaster.xyz') ||
    input.includes('warpcast.com') ||
    input.includes('farcaster') ||
    (input.startsWith('0x') && input.length >= 10) // Assume standalone hashes are Farcaster
  );
};

// Fetch cast data using Pinata's Farcaster Hub API
const fetchCastDataFromPinata = async (input: string): Promise<CastData> => {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  
  if (!jwt) {
    throw new Error("Pinata JWT token not found");
  }

  try {
    console.log("🎯 Processing Farcaster input:", input);
    
    // Extract the cast hash
    const castHash = extractCastHash(input);
    
    if (!castHash) {
      throw new Error("Could not extract valid cast hash from input");
    }
    
    console.log("🔍 Using cast hash:", castHash);

    // Use Pinata's Farcaster Hub API
    const apiUrl = `https://api.pinata.cloud/v3/farcaster/casts/${castHash}`;
    console.log("🌐 Making request to:", apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("📡 Response status:", response.status);
    console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Pinata Hub API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: apiUrl,
        hash: castHash
      });
      throw new Error(`Failed to fetch cast: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const castData = await response.json();
    console.log("✅ Raw cast data from Pinata:", JSON.stringify(castData, null, 2));

    // Check if we got valid data
    if (!castData || typeof castData !== 'object') {
      console.error("❌ Invalid cast data received:", castData);
      throw new Error("Invalid cast data received from API");
    }

    // Build the canonical farcaster.xyz URL
    const username = castData.author?.username || 'unknown';
    const canonicalUrl = `https://farcaster.xyz/${username}/${castHash}`;

    // Extract relevant information from the cast - return success type
    const extractedData: CastDataSuccess = {
      title: castData.text ? `"${castData.text.substring(0, 50)}${castData.text.length > 50 ? '...' : ''}` : "Farcaster Cast",
      author: castData.author?.username || castData.author?.display_name || "Unknown Author",
      content: castData.text || "",
      timestamp: castData.timestamp || new Date().toISOString(),
      castHash: castHash,
      username: castData.author?.username || "unknown",
      authorFid: castData.author?.fid || 0,
      embeds: castData.embeds || [],
      mentions: castData.mentions || [],
      parentHash: castData.parent_hash || "",
      rootParentHash: castData.root_parent_hash || "",
      canonicalUrl: canonicalUrl
    };

    console.log("✅ Extracted cast data:", extractedData);
    return extractedData;

  } catch (error: any) {
    console.error("❌ Failed to fetch cast data from Pinata:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      input: input
    });
    
    // Return fallback data with error info - return error type
    const errorData: CastDataError = {
      title: "Farcaster Cast",
      author: "Unknown Author",
      content: "Failed to fetch cast content",
      timestamp: new Date().toISOString(),
      error: error.message,
      canonicalUrl: input.includes('http') ? input : `https://farcaster.xyz/unknown/${input}`
    };
    
    return errorData;
  }
};

// Create metadata JSON and upload to Pinata
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
    external_url: castData?.canonicalUrl || metadata.sourceUrl,
    attributes: [
      {
        trait_type: 'Author',
        value: metadata.author
      },
      {
        trait_type: 'Source URL',
        value: castData?.canonicalUrl || metadata.sourceUrl
      },
      {
        trait_type: 'Created',
        value: new Date().toISOString()
      },
      // Add rich cast data if available and successful
      ...(castData && isCastDataSuccess(castData) ? [
        {
          trait_type: 'Cast Content',
          value: castData.content
        },
        {
          trait_type: 'Cast Hash',
          value: castData.castHash
        },
        {
          trait_type: 'Author Username',
          value: castData.username
        },
        {
          trait_type: 'Author FID',
          value: castData.authorFid.toString()
        },
        {
          trait_type: 'Cast Timestamp',
          value: castData.timestamp
        },
        {
          trait_type: 'Platform',
          value: 'Farcaster'
        }
      ] : [])
    ],
    // Include full cast data in metadata if successful
    ...(castData && isCastDataSuccess(castData) && {
      farcaster_data: {
        content: castData.content,
        author: {
          username: castData.username,
          fid: castData.authorFid
        },
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
            platform: castData && isCastDataSuccess(castData) ? 'farcaster' : 'general'
          }
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Metadata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
  } catch (error) {
    console.error('Metadata upload error:', error);
    throw error;
  }
};

export const useEvermarkCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Use ref to prevent multiple simultaneous calls
  const isProcessingRef = useRef(false);
  
  const account = useActiveAccount();

  const createEvermark = async (metadata: EvermarkMetadata) => {
    const accountAddress = account?.address;
    
    if (!accountAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    if (isProcessingRef.current) {
      console.warn("Transaction already in progress");
      return { success: false, error: "Transaction already in progress. Please wait." };
    }

    isProcessingRef.current = true;
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    console.log("🚀 Starting Evermark creation process...");
    console.log("🔍 Input metadata:", JSON.stringify(metadata, null, 2));

    try {
      // Get contract
      const contract = getContract({
        client,
        chain: CHAIN,
        address: CONTRACTS.EVERMARK_NFT,
        abi: EVERMARK_NFT_ABI,
      });

      // Check contract state and get the actual minting fee
      console.log("🔍 Checking contract state and minting fee...");
      let mintingFee: bigint;
      
      try {
        const isPaused = await readContract({
          contract,
          method: "paused",
          params: []
        });
        
        if (isPaused) {
          throw new Error("Contract is currently paused");
        }

        // Get the actual minting fee from the contract
        mintingFee = await readContract({
          contract,
          method: "MINTING_FEE",
          params: []
        });
        
        console.log("💰 Contract minting fee:", mintingFee.toString(), "wei");
        console.log("💰 Minting fee in ETH:", Number(mintingFee) / 1e18);
        
      } catch (stateError: any) {
        console.error("Contract state check failed:", stateError);
        // If we can't read the fee, use a fallback
        mintingFee = BigInt("1000000000000000"); // 0.001 ETH as fallback
        console.warn("Using fallback minting fee:", mintingFee.toString());
      }

      let imageUrl = "";
      let metadataURI = "";

      // Upload image to Pinata if it exists
      if (metadata.imageFile) {
        console.log("📸 Uploading image to Pinata...");
        try {
          imageUrl = await uploadToPinata(metadata.imageFile);
          console.log("✅ Image uploaded successfully:", imageUrl);
        } catch (uploadError: any) {
          console.error("❌ Failed to upload image:", uploadError);
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }
      }

      let actualTitle = metadata.title;
      let actualAuthor = metadata.author;
      let castData: CastData | undefined = undefined;
      
      // Check if it's Farcaster-related input and fetch data
      console.log("🔍 Checking if input is Farcaster-related...");
      console.log("🔍 Source URL/Input:", metadata.sourceUrl);
      
      if (metadata.sourceUrl && isFarcasterInput(metadata.sourceUrl)) {
        console.log("🎯 Detected Farcaster input, fetching cast data...");
        try {
          castData = await fetchCastDataFromPinata(metadata.sourceUrl);
          
          if (isCastDataSuccess(castData)) {
            actualTitle = castData.title;
            actualAuthor = castData.author;
            console.log("✅ Using fetched cast data:", { 
              title: actualTitle,
              author: actualAuthor,
              canonicalUrl: castData.canonicalUrl
            });
          } else {
            console.log("❌ Cast data fetch failed or returned error:", castData.error);
          }
        } catch (fetchError: any) {
          console.error("❌ Error fetching cast data:", fetchError);
          // Continue with original metadata if cast fetch fails
        }
      } else {
        console.log("❌ Input not recognized as Farcaster-related");
      }

      // Upload metadata to Pinata with the fetched cast data
      console.log("📝 Uploading metadata to Pinata...");
      console.log("📝 Final metadata before upload:", {
        title: actualTitle,
        author: actualAuthor,
        sourceUrl: metadata.sourceUrl,
        hasCastData: !!castData && isCastDataSuccess(castData)
      });
      
      try {
        metadataURI = await uploadMetadataToPinata({
          ...metadata,
          title: actualTitle,
          author: actualAuthor
        }, imageUrl, castData);
        console.log("✅ Metadata uploaded successfully:", metadataURI);
      } catch (metadataError: any) {
        console.error("❌ Failed to upload metadata:", metadataError);
        throw new Error(`Metadata upload failed: ${metadataError.message}`);
      }

      // Small delay to ensure uploads are fully processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("🔧 Preparing transaction with params:", {
        metadataURI,
        title: actualTitle,
        author: actualAuthor,
        referrer: DEVELOPER_REFERRER,
        value: mintingFee.toString()
      });

      // Use the actual minting fee from the contract
      const transaction = prepareContractCall({
        contract,
        method: "mintEvermarkWithReferral",
        params: [
          metadataURI,           // string metadataURI
          actualTitle,          // string title (use fetched title)
          actualAuthor,         // string creator (use fetched author)
          DEVELOPER_REFERRER    // address referrer
        ],
        value: mintingFee, // Use the actual fee from contract
      });

      console.log("📤 Sending transaction to blockchain...");
      
      const result = await sendTransaction({
        transaction,
        account,
      });

      console.log("✅ Transaction successful:", result.transactionHash);
      
      const successMessage = castData && isCastDataSuccess(castData)
        ? `Farcaster cast by @${castData.username} preserved successfully!`
        : "Evermark created successfully!";
      
      setSuccess(successMessage);
      
      return { 
        success: true, 
        message: successMessage,
        txHash: result.transactionHash,
        metadataURI,
        imageUrl,
        castData: castData && isCastDataSuccess(castData) ? castData : null
      };

    } catch (error: any) {
      console.error("❌ Transaction failed:", error);
      
      let errorMessage = "Unknown error";
      if (error.message) {
        if (error.message.includes("Insufficient minting fee")) {
          errorMessage = "Insufficient minting fee. Please check the required amount.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for transaction and gas fees.";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected by user.";
        } else if (error.message.includes("paused")) {
          errorMessage = "Contract is currently paused.";
        } else if (error.message.includes("Pinata")) {
          errorMessage = `Upload failed: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(`Failed to create Evermark: ${errorMessage}`);
      return { success: false, error: errorMessage };
      
    } finally {
      isProcessingRef.current = false;
      setIsCreating(false);
      console.log("🧹 Cleanup completed");
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Helper function to test if a string is a valid Farcaster input
  const validateFarcasterInput = (input: string): { isValid: boolean; type: string; hash?: string } => {
    if (!input) return { isValid: false, type: 'empty' };
    
    const hash = extractCastHash(input);
    
    if (hash) {
      if (input.includes('farcaster.xyz')) {
        return { isValid: true, type: 'farcaster.xyz URL', hash };
      } else if (input.includes('warpcast.com')) {
        return { isValid: true, type: 'warpcast URL', hash };
      } else if (input.startsWith('0x')) {
        return { isValid: true, type: 'cast hash', hash };
      }
    }
    
    return { isValid: false, type: 'invalid' };
  };

  return { 
    createEvermark, 
    isCreating, 
    error, 
    success, 
    clearMessages,
    validateFarcasterInput,
    // Expose the processing state for additional UI control
    isProcessing: isProcessingRef.current 
  };
};
