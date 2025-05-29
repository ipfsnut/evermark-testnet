import { useState, useRef } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";

export interface EvermarkMetadata {
  title: string;
  description: string;
  sourceUrl: string;
  author: string;
  imageFile?: File | null;
}

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
    // Prevent reentrancy at the hook level
    if (isProcessingRef.current) {
      console.warn("Transaction already in progress");
      return { success: false, error: "Transaction already in progress" };
    }

    if (!account) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    // Set processing flag immediately
    isProcessingRef.current = true;
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      let imageUrl = "";
      let metadataURI = "";

      // Upload image to Pinata if it exists
      if (metadata.imageFile) {
        try {
          console.log("Uploading image to Pinata...");
          imageUrl = await uploadToPinata(metadata.imageFile);
          console.log("Image uploaded successfully:", imageUrl);
        } catch (uploadError: any) {
          console.error("Failed to upload image:", uploadError);
          setError(`Image upload failed: ${uploadError.message}`);
          return { success: false, error: `Image upload failed: ${uploadError.message}` };
        }
      }

      // Upload metadata to Pinata
      try {
        console.log("Uploading metadata to Pinata...");
        metadataURI = await uploadMetadataToPinata(metadata, imageUrl);
        console.log("Metadata uploaded successfully:", metadataURI);
      } catch (metadataError: any) {
        console.error("Failed to upload metadata:", metadataError);
        setError(`Metadata upload failed: ${metadataError.message}`);
        return { success: false, error: `Metadata upload failed: ${metadataError.message}` };
      }

      // Get contract with ABI
      const contract = getContract({
        client,
        chain: CHAIN,
        address: CONTRACTS.EVERMARK_NFT,
        abi: EVERMARK_NFT_ABI,
      });

      // Prepare transaction using the correct function name and parameters
      const transaction = prepareContractCall({
        contract,
        method: "mintEvermark",
        params: [
          metadataURI,           // string metadataURI
          metadata.title,       // string title  
          metadata.author,      // string creator
        ],
        value: BigInt("70000000000000"), // MINTING_FEE from contract (0.001 ETH)
      });

      console.log("Sending transaction to contract...");
      // Send transaction
      const result = await sendTransaction({
        transaction,
        account,
      });

      setSuccess("Evermark created successfully!");
      
      return { 
        success: true, 
        message: "Evermark created successfully!", 
        txHash: result.transactionHash,
        metadataURI,
        imageUrl
      };

    } catch (error: any) {
      console.error("Failed to create Evermark:", error);
      
      // More specific error handling
      let errorMessage = "Unknown error";
      if (error.message) {
        if (error.message.includes("ReentrancyGuard")) {
          errorMessage = "Transaction already in progress. Please wait and try again.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for transaction.";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(`Failed to create Evermark: ${errorMessage}`);
      return { success: false, error: errorMessage };
      
    } finally {
      // Always reset states in finally block
      setIsCreating(false);
      isProcessingRef.current = false;
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
