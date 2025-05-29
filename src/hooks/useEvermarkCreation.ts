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

// Create metadata JSON and upload to Pinata
const uploadMetadataToPinata = async (metadata: EvermarkMetadata, imageUrl?: string): Promise<string> => {
  const metadataObject = {
    name: metadata.title,
    description: metadata.description,
    image: imageUrl || '',
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
      }
    ]
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

      // Check if contract is paused
      console.log("🔍 Checking contract state...");
      try {
        const isPaused = await readContract({
          contract,
          method: "paused",
          params: []
        });
        
        if (isPaused) {
          throw new Error("Contract is currently paused");
        }
      } catch (stateError: any) {
        console.warn("Could not check contract state:", stateError.message);
        // Continue anyway - state check is not critical
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

      // Upload metadata to Pinata
      console.log("📝 Uploading metadata to Pinata...");
      try {
        metadataURI = await uploadMetadataToPinata(metadata, imageUrl);
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
        value: "70000000000000"
      });

      // Use mintEvermarkWithReferral with developer address
      const transaction = prepareContractCall({
        contract,
        method: "mintEvermarkWithReferral",
        params: [
          metadataURI,           // string metadataURI
          metadata.title,       // string title  
          metadata.author,      // string creator
          DEVELOPER_REFERRER    // address referrer
        ],
        value: BigInt("70000000000000"), // MINTING_FEE
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
        if (error.message.includes("ReentrancyGuard")) {
          errorMessage = "Transaction failed due to timing conflict. Please wait a moment and try again.";
          console.error("🔒 Reentrancy guard triggered - this suggests the contract is processing another transaction");
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
