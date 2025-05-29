import { useState, useRef } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";

export interface EvermarkMetadata {
  title: string;
  description: string;
  sourceUrl: string;
  author: string;
  imageFile?: File | null;
}

// Developer referrer address
const DEVELOPER_REFERRER = "0x2B27EA7DaA8Bf1dE98407447b269Dfe280753fe3";

// Add Pinata upload function
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

// Add Farcaster cast fetching using Pinata's Hub API
const fetchCastDataFromPinata = async (castUrl: string) => {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  
  if (!jwt) {
    throw new Error("Pinata JWT token not found");
  }

  try {
    console.log("🎯 Fetching cast data via Pinata Hub API:", castUrl);
    
    // Extract cast hash from Warpcast URL
    // URL format: https://warpcast.com/username/0x12345...
    const urlParts = castUrl.split('/');
    const castHash = urlParts[urlParts.length - 1];
    
    if (!castHash.startsWith('0x')) {
      throw new Error("Invalid cast hash format");
    }

    // Use Pinata's Farcaster Hub API to get cast data
    const response = await fetch(`https://api.pinata.cloud/v3/farcaster/casts/${castHash}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Pinata Hub API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to fetch cast: ${response.status} ${response.statusText}`);
    }

    const castData = await response.json();
    console.log("✅ Cast data fetched from Pinata:", castData);

    // Extract relevant information from the cast
    return {
      title: castData.text ? `"${castData.text.substring(0, 50)}..."` : "Farcaster Cast",
      author: castData.author?.username || castData.author?.display_name || "Unknown Author",
      content: castData.text || "",
      timestamp: castData.timestamp,
      castHash: castHash,
      username: castData.author?.username,
      authorFid: castData.author?.fid,
      embeds: castData.embeds || [],
      mentions: castData.mentions || [],
      parentHash: castData.parent_hash,
      rootParentHash: castData.root_parent_hash
    };

  } catch (error: any) {
    console.error("❌ Failed to fetch cast data from Pinata:", error);
    // Return fallback data
    return {
      title: "Farcaster Cast",
      author: "Unknown Author",
      content: "Failed to fetch cast content",
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Create metadata JSON and upload to Pinata
const uploadMetadataToPinata = async (
  metadata: EvermarkMetadata, 
  imageUrl?: string, 
  castData?: any
): Promise<string> => {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  
  if (!jwt) {
    throw new Error("Pinata JWT token not found");
  }

  const metadataObject = {
    name: metadata.title,
    description: metadata.description,
    image: imageUrl || '',
    external_url: metadata.sourceUrl,
    attributes: [
      {
        trait_type: 'Author',
        value: metadata.author
      },
      {
        trait_type: 'Source URL',
        value: metadata.sourceUrl
      },
      {
        trait_type: 'Created',
        value: new Date().toISOString()
      },
      // Add rich cast data if available
      ...(castData && !castData.error ? [
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
          value: castData.authorFid?.toString()
        },
        {
          trait_type: 'Cast Timestamp',
          value: castData.timestamp
        }
      ] : [])
    ],
    // Include full cast data in metadata
    ...(castData && !castData.error && {
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
        root_parent_hash: castData.rootParentHash
      }
    })
  };

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadataObject,
        pinataMetadata: {
          name: `evermark-metadata-${Date.now()}`,
          keyvalues: {
            type: 'evermark-metadata',
            title: metadata.title
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
      let castData = null;
      
      // Check if it's a Farcaster cast URL and fetch data via Pinata
      if (metadata.sourceUrl && (metadata.sourceUrl.includes('warpcast.com') || metadata.sourceUrl.includes('farcaster'))) {
        console.log("🎯 Detected Farcaster cast URL, fetching via Pinata Hub API...");
        castData = await fetchCastDataFromPinata(metadata.sourceUrl);
        
        if (castData && !castData.error) {
          actualTitle = castData.title;
          actualAuthor = castData.author;
          console.log("✅ Using fetched cast data:", { title: actualTitle, author: actualAuthor });
        }
      }

      // Upload metadata to Pinata with the fetched cast data
      console.log("📝 Uploading metadata to Pinata...");
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
        title: metadata.title,
        author: metadata.author,
        referrer: DEVELOPER_REFERRER,
        value: mintingFee.toString()
      });

      // Use the actual minting fee from the contract
      const transaction = prepareContractCall({
        contract,
        method: "mintEvermarkWithReferral",
        params: [
          metadataURI,           // string metadataURI
          metadata.title,       // string title  
          metadata.author,      // string creator
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
      setSuccess("Evermark created successfully!");
      
      return { 
        success: true, 
        message: "Evermark created successfully!", 
        txHash: result.transactionHash,
        metadataURI,
        imageUrl
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

  return { 
    createEvermark, 
    isCreating, 
    error, 
    success, 
    clearMessages,
    // Expose the processing state for additional UI control
    isProcessing: isProcessingRef.current 
  };
};
