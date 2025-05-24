import { useState } from "react";
import { useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";

export interface EvermarkMetadata {
  title: string;
  description: string;
  sourceUrl?: string;
  author?: string;
  imageFile?: File | null;
}

export function useEvermarkCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdEvermarkId, setCreatedEvermarkId] = useState<string | null>(null);
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  const contract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EVERMARK_NFT,
    abi: EVERMARK_NFT_ABI,
  });
  
  // Check if we have valid Pinata API keys
  const hasValidPinataKeys = () => {
    const apiKey = import.meta.env.VITE_PINATA_API_KEY;
    const secretKey = import.meta.env.VITE_PINATA_SECRET_KEY;
    return apiKey && secretKey && apiKey.length > 10 && secretKey.length > 10;
  };
  
  // Upload image to IPFS via Pinata
  const uploadImageToIPFS = async (imageFile: File): Promise<string> => {
    console.log("Uploading image to IPFS:", imageFile.name);
    
    if (!hasValidPinataKeys()) {
      console.warn("Pinata API keys not configured - creating metadata without image");
      return ""; // Return empty string instead of mock hash
    }
    
    try {
      // Create form data for Pinata API
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('pinataMetadata', JSON.stringify({
        name: `Evermark-Image-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          fileType: imageFile.type,
        }
      }));
      
      console.log("Uploading image to Pinata...");
      
      // Make API request to Pinata
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
          'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY,
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Pinata image upload failed:", response.status, errorText);
        throw new Error(`Failed to upload image to IPFS: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Image upload successful:", data);
      
      if (!data.IpfsHash) {
        throw new Error("No IPFS hash returned from Pinata");
      }
      
      return `ipfs://${data.IpfsHash}`;
    } catch (error) {
      console.error("Image upload error:", error);
      // Instead of returning a mock hash, just return empty string
      // This prevents 400 errors when trying to fetch invalid hashes
      return "";
    }
  };
  
  // Upload metadata to IPFS
  const uploadMetadataToIPFS = async (metadata: any): Promise<string> => {
    console.log("Preparing to upload metadata to IPFS:", metadata);
    
    if (!hasValidPinataKeys()) {
      console.warn("Pinata API keys not configured - creating simple metadata URI");
      // Instead of creating a mock IPFS hash, create a data URI or use empty string
      const metadataString = JSON.stringify(metadata);
      const encodedMetadata = encodeURIComponent(metadataString);
      return `data:application/json,${encodedMetadata}`;
    }
    
    try {
      // Convert metadata to JSON string
      const jsonString = JSON.stringify(metadata, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create form data for Pinata API
      const formData = new FormData();
      formData.append('file', blob, 'metadata.json');
      formData.append('pinataMetadata', JSON.stringify({
        name: `Evermark-Metadata-${metadata.name ? metadata.name.slice(0, 30).replace(/[^a-zA-Z0-9.-]/g, '_') : 'unnamed'}`,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          title: metadata.name || 'Untitled',
        }
      }));
      
      console.log("Uploading metadata to Pinata...");
      
      // Make API request to Pinata
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
          'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY,
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Pinata metadata upload failed:", response.status, errorText);
        throw new Error(`Failed to upload metadata to IPFS: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Metadata upload successful:", data);
      
      if (!data.IpfsHash) {
        throw new Error("No IPFS hash returned from Pinata");
      }
      
      return `ipfs://${data.IpfsHash}`;
    } catch (error) {
      console.error("Metadata upload error:", error);
      
      // Fallback to data URI instead of mock IPFS hash
      const metadataString = JSON.stringify(metadata);
      const encodedMetadata = encodeURIComponent(metadataString);
      return `data:application/json,${encodedMetadata}`;
    }
  };
  
  const createEvermark = async (metadata: EvermarkMetadata) => {
    setIsCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log("Creating Evermark with metadata:", metadata);
      
      let imageIPFSUrl = "";
      
      // Upload image first if provided
      if (metadata.imageFile) {
        console.log("Uploading image to IPFS...");
        imageIPFSUrl = await uploadImageToIPFS(metadata.imageFile);
        if (imageIPFSUrl) {
          console.log("Image uploaded, IPFS URL:", imageIPFSUrl);
        } else {
          console.log("Image upload skipped or failed - continuing without image");
        }
      }
      
      // Prepare metadata object for IPFS
      const ipfsMetadata = {
        name: metadata.title,
        description: metadata.description || "",
        external_url: metadata.sourceUrl || "",
        ...(imageIPFSUrl && { image: imageIPFSUrl }), // Only include image if we have a valid URL
        attributes: [
          {
            trait_type: "Content Type",
            value: "Website"
          },
          {
            trait_type: "Creator",
            value: metadata.author || "Unknown"
          },
          {
            trait_type: "Created",
            value: new Date().toISOString()
          },
          ...(imageIPFSUrl ? [{
            trait_type: "Has Image",
            value: "Yes"
          }] : [{
            trait_type: "Has Image", 
            value: "No"
          }])
        ]
      };
      
      // Upload metadata to IPFS
      console.log("Uploading metadata to IPFS...");
      const metadataURI = await uploadMetadataToIPFS(ipfsMetadata);
      console.log("Metadata uploaded, URI:", metadataURI);
      
      // Prepare contract call
      console.log("Preparing mintBookmark transaction...");
      const transaction = prepareContractCall({
        contract,
        method: "mintBookmark",
        params: [
          metadataURI,
          metadata.title,
          metadata.author || "Unknown"
        ] as const,
      });
      
      // Send transaction
      console.log("Sending transaction...");
      const result = await sendTransaction(transaction as any);
      console.log("Transaction sent:", result);
      
      // Success
      setCreatedEvermarkId("new");
      setSuccess("Your Evermark was created successfully! Check your collection to view it.");
      
      return { 
        success: true, 
        evermarkId: "new",
        transactionHash: result 
      };
      
    } catch (err: any) {
      console.error("Error creating evermark:", err);
      setError(err.message || "Failed to create Evermark");
      return { success: false, error: err.message };
    } finally {
      setIsCreating(false);
    }
  };
  
  return {
    createEvermark,
    isCreating,
    error,
    success,
    createdEvermarkId,
    hasValidPinataKeys: hasValidPinataKeys(),
  };
}