import { useState, useCallback, useRef } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { toWei, toEther } from "thirdweb/utils";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";

export interface EvermarkMetadata {
  title: string;
  description: string;
  sourceUrl: string;
  author: string;
  imageFile?: File;
}

// Add the helper function we need
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
};

export function useEvermarkCreation() {
  const account = useActiveAccount();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Use ref to track if operation is in progress to prevent reentrancy
  const operationInProgress = useRef(false);
  const lastTransactionTime = useRef<number>(0);

  const evermarkContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EVERMARK_NFT,
    abi: EVERMARK_NFT_ABI,
  });

  const { mutate: sendTransaction } = useSendTransaction();

  // Function to get minting fee from contract
  const getMintingFee = async (): Promise<bigint> => {
    try {
      const fee = await readContract({
        contract: evermarkContract,
        method: "MINTING_FEE",
        params: [],
      });
      console.log(`✅ Minting fee from contract:`, toEther(fee), "ETH");
      return fee;
    } catch (error) {
      console.error("Error getting minting fee from contract:", error);
      throw new Error("Could not get minting fee from contract");
    }
  };

  // Check contract state before minting
  const checkContractState = async (): Promise<void> => {
    try {
      console.log("🔍 Checking contract state...");
      
      // Check if contract is paused
      const isPaused = await readContract({
        contract: evermarkContract,
        method: "paused",
        params: [],
      });
      console.log("⏸️ Contract paused:", isPaused);
      
      if (isPaused) {
        throw new Error("Contract is currently paused");
      }
      
      // Check total supply
      const totalSupply = await readContract({
        contract: evermarkContract,
        method: "totalSupply",
        params: [],
      });
      console.log("📊 Current total supply:", totalSupply.toString());
      
      // Check user's balance
      const userBalance = await readContract({
        contract: evermarkContract,
        method: "balanceOf",
        params: [account!.address],
      });
      console.log("👤 User balance:", userBalance.toString());
      
      // Add a delay to ensure contract state is clean
      const timeSinceLastTx = Date.now() - lastTransactionTime.current;
      const MIN_TIME_BETWEEN_TX = 10000; // 10 seconds
      
      if (timeSinceLastTx < MIN_TIME_BETWEEN_TX && lastTransactionTime.current > 0) {
        const waitTime = Math.ceil((MIN_TIME_BETWEEN_TX - timeSinceLastTx) / 1000);
        console.warn(`⏳ Waiting ${waitTime} seconds before next transaction...`);
        throw new Error(`Please wait ${waitTime} seconds before creating another Evermark`);
      }
      
    } catch (error) {
      console.error("❌ Contract state check failed:", error);
      throw error;
    }
  };

  // Your existing IPFS upload functions (keep them as they are)
  const uploadImageToIPFS = async (file: File): Promise<string> => {
    console.log("Uploading image to IPFS:", file.name);
    
    if (!import.meta.env.VITE_PINATA_API_KEY || !import.meta.env.VITE_PINATA_SECRET_KEY) {
      throw new Error("Pinata API credentials not configured");
    }

    const formData = new FormData();
    formData.append('file', file);
    
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    formData.append('pinataMetadata', JSON.stringify({
      name: `Evermark-Image-${sanitizedFileName}`,
      keyvalues: {
        type: 'evermark-image',
        uploadedAt: new Date().toISOString()
      }
    }));

    formData.append('pinataOptions', JSON.stringify({
      cidVersion: 1,
      wrapWithDirectory: false
    }));

    console.log("Uploading image to Pinata...");
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
        'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata upload failed:", errorText);
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Image upload successful:", result);
    
    return `ipfs://${result.IpfsHash}`;
  };

  const uploadMetadataToIPFS = async (metadata: any): Promise<string> => {
    const metadataObject = {
      name: metadata.title,
      description: metadata.description,
      external_url: metadata.sourceUrl,
      image: metadata.image,
      attributes: [
        {
          trait_type: "Author",
          value: metadata.author
        },
        {
          trait_type: "Source URL",
          value: metadata.sourceUrl
        },
        {
          trait_type: "Created",
          value: new Date().toISOString()
        },
        {
          trait_type: "Type",
          value: "Evermark"
        }
      ]
    };

    console.log("Preparing to upload metadata to IPFS:", metadataObject);

    if (!import.meta.env.VITE_PINATA_API_KEY || !import.meta.env.VITE_PINATA_SECRET_KEY) {
      throw new Error("Pinata API credentials not configured");
    }

    const sanitizedTitle = metadata.title.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_');
    
    const pinataMetadata = {
      name: `Evermark-Metadata-${sanitizedTitle}`,
      keyvalues: {
        type: 'evermark-metadata',
        title: metadata.title,
        author: metadata.author,
        uploadedAt: new Date().toISOString()
      }
    };

    const pinataOptions = {
      cidVersion: 1,
      wrapWithDirectory: false
    };

    console.log("Uploading metadata to Pinata...");

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
        'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY,
      },
      body: JSON.stringify({
        pinataContent: metadataObject,
        pinataMetadata,
        pinataOptions
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata metadata upload failed:", errorText);
      throw new Error(`Failed to upload metadata: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Metadata upload successful:", result);
    
    return `ipfs://${result.IpfsHash}`;
  };

  const createEvermark = useCallback(async (metadata: EvermarkMetadata) => {
    // Prevent reentrancy at the hook level
    if (operationInProgress.current || isCreating) {
      console.warn("Creation already in progress, ignoring duplicate call");
      return { success: false, error: "Operation already in progress" };
    }

    if (!account) {
      const errorMsg = "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    // Set both flags to prevent reentrancy
    operationInProgress.current = true;
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("🚀 Creating Evermark with metadata:", metadata);

      // Check contract state and timing
      await checkContractState();

      // STEP 1: Get the minting fee from contract
      console.log("💰 Getting minting fee from contract...");
      const mintingFee = await getMintingFee();
      console.log(`💰 Minting fee: ${toEther(mintingFee)} ETH`);

      // STEP 2: Upload content to IPFS
      let imageUrl = "";
      if (metadata.imageFile) {
        console.log("📸 Uploading image to IPFS...");
        try {
          imageUrl = await uploadImageToIPFS(metadata.imageFile);
          console.log("✅ Image uploaded, IPFS URL:", imageUrl);
        } catch (imageError) {
          console.error("❌ Image upload failed:", imageError);
          throw new Error(`Failed to upload image: ${getErrorMessage(imageError)}`);
        }
      }

      console.log("📄 Uploading metadata to IPFS...");
      let metadataUri: string;
      try {
        metadataUri = await uploadMetadataToIPFS({
          ...metadata,
          image: imageUrl
        });
        console.log("✅ Metadata uploaded, URI:", metadataUri);
      } catch (metadataError) {
        console.error("❌ Metadata upload failed:", metadataError);
        throw new Error(`Failed to upload metadata: ${getErrorMessage(metadataError)}`);
      }

      // STEP 3: Prepare and send transaction using mintEvermarkWithReferral
      console.log("⚙️ Preparing mintEvermarkWithReferral transaction with fee:", toEther(mintingFee), "ETH");
      console.log("🎯 Using REWARDS contract as referrer:", CONTRACTS.REWARDS);
      console.log("📋 Transaction params:", {
        metadataUri,
        title: metadata.title,
        author: metadata.author,
        referrer: CONTRACTS.REWARDS,
        fee: toEther(mintingFee) + " ETH"
      });
      
      // Add a delay before preparing the transaction
      console.log("⏳ Waiting 2 seconds before transaction preparation...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const transaction = prepareContractCall({
        contract: evermarkContract,
        method: "mintEvermarkWithReferral",
        params: [
          metadataUri,
          metadata.title,
          metadata.author,
          CONTRACTS.REWARDS // Use REWARDS contract as referrer
        ] as const,
        value: mintingFee,
      });

      console.log("📤 Sending transaction...");
      
      // Update last transaction time
      lastTransactionTime.current = Date.now();
      
      return new Promise<{ success: boolean; message?: string; error?: string; txHash?: string }>((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: (result: any) => {
            console.log("✅ Transaction successful:", result);
            const successMsg = `Successfully created Evermark: ${metadata.title}`;
            setSuccess(successMsg);
            
            // Reset flags on success
            setIsCreating(false);
            operationInProgress.current = false;
            
            resolve({ success: true, message: successMsg, txHash: result.transactionHash });
          },
          onError: (error: any) => {
            console.error("❌ Transaction failed:", error);
            
            // Log more details about the error
            console.error("❌ Error details:", {
              message: error.message,
              code: error.code,
              data: error.data,
              stack: error.stack
            });
            
            const errorMsg = getErrorMessage(error);
            setError(errorMsg);
            
            // Reset flags on error
            setIsCreating(false);
            operationInProgress.current = false;
            
            resolve({ success: false, error: errorMsg });
          }
        });
      });

    } catch (err: unknown) {
      console.error("❌ Error creating Evermark:", err);
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      
      // Reset flags on catch
      setIsCreating(false);
      operationInProgress.current = false;
      
      return { success: false, error: errorMsg };
    }
  }, [account, evermarkContract, sendTransaction, isCreating]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    createEvermark,
    isCreating,
    error,
    success,
    clearMessages
  };
}
