import { useState, useRef } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useAccount, useConnect, useSendTransaction } from "wagmi";
import { getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";
import { useFarcasterUser } from "../lib/farcaster";

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

export interface EvermarkMetadata {
  title: string;
  description: string;
  sourceUrl: string;
  author: string;
  imageFile?: File | null;
}

// Developer referrer address
const DEVELOPER_REFERRER = "0x2B27EA7DaA8Bf1dE98407447b269Dfe280753fe3";

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
    return `ipfs://${result.IpfsHash}`;
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw error;
  }
};

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
    attributes: [
      {
        trait_type: 'Author',
        value: metadata.author || 'Unknown Author'
      },
      {
        trait_type: 'Source URL',
        value: castData?.canonicalUrl || metadata.sourceUrl || 'Direct Upload'
      },
      {
        trait_type: 'Created',
        value: new Date().toISOString()
      },
      {
        trait_type: 'Content Type',
        value: castData && isCastDataSuccess(castData) ? 'Farcaster Cast' : 'Custom Content'
      },
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

  console.log("📝 Uploading metadata object:", JSON.stringify(metadataObject, null, 2));

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
    const metadataURI = `ipfs://${result.IpfsHash}`;
    console.log("✅ Metadata uploaded with IPFS URI:", metadataURI);
    return metadataURI;
  } catch (error) {
    console.error('Metadata upload error:', error);
    throw error;
  }
};

export const useEvermarkCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsWalletConnection, setNeedsWalletConnection] = useState(false);
  
  const isProcessingRef = useRef(false);
  
  // Thirdweb hooks (for regular web app)
  const thirdwebAccount = useActiveAccount();
  
  // Wagmi hooks (for Farcaster Frame)
  const { 
    isConnected: isWagmiConnected, 
    address: wagmiAddress,
    connector: wagmiConnector 
  } = useAccount();
  const { connect, connectors } = useConnect();
  const { 
    sendTransactionAsync: sendWagmiTransaction, 
    isPending: isWagmiPending,
    error: wagmiError 
  } = useSendTransaction();
  
  const { isInFarcaster, isAuthenticated: isFarcasterAuth } = useFarcasterUser();

  const createEvermark = async (metadata: EvermarkMetadata) => {
    // Determine which wallet system to use
    const useThirdweb = !isInFarcaster && thirdwebAccount?.address;
    const useWagmi = isInFarcaster && isWagmiConnected && wagmiAddress;
    
    console.log("🔍 Wallet detection:", {
      isInFarcaster,
      useThirdweb,
      useWagmi,
      thirdwebAddress: thirdwebAccount?.address,
      wagmiAddress,
      isWagmiConnected
    });

    // Check if we have wallet access
    if (!useThirdweb && !useWagmi) {
      if (isInFarcaster) {
        // Try to connect Farcaster wallet
        if (connectors.length > 0) {
          setNeedsWalletConnection(true);
          try {
            console.log("🔌 Attempting to connect Farcaster wallet...");
            connect({ connector: connectors[0] });
            setError("Connecting to your Farcaster wallet...");
            return { success: false, error: "Connecting wallet...", needsWalletConnection: true };
          } catch (connectError) {
            console.error("Auto-connect failed:", connectError);
            setError("Failed to connect Farcaster wallet. Please try again.");
            return { success: false, error: "Connection failed", needsWalletConnection: true };
          }
        } else {
          setError("No Farcaster wallet connector available.");
          return { success: false, error: "No connector available" };
        }
      } else {
        setError("Please connect your wallet to create Evermarks.");
        return { success: false, error: "Wallet connection required" };
      }
    }

    if (isProcessingRef.current) {
      console.warn("Transaction already in progress");
      return { success: false, error: "Transaction already in progress. Please wait." };
    }

    isProcessingRef.current = true;
    setIsCreating(true);
    setError(null);
    setSuccess(null);
    setNeedsWalletConnection(false);

    console.log("🚀 Starting Evermark creation process...");
    console.log("🔍 Using wallet system:", useThirdweb ? "Thirdweb" : "Wagmi");

    // Validate required fields
    if (!metadata.title?.trim()) {
      const error = "Title is required";
      setError(error);
      isProcessingRef.current = false;
      setIsCreating(false);
      return { success: false, error };
    }

    if (!metadata.description?.trim()) {
      const error = "Description is required";
      setError(error);
      isProcessingRef.current = false;
      setIsCreating(false);
      return { success: false, error };
    }

    const providedAuthor = metadata.author?.trim();
    if (!providedAuthor) {
      console.log("⚠️ No author provided, using fallback");
    }

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
      console.log("🔍 Contract address:", CONTRACTS.EVERMARK_NFT);
      console.log("🔍 Chain:", CHAIN);
      
      let mintingFee: bigint;
      
      try {
        console.log("🔍 Checking if contract is paused...");
        const isPaused = await readContract({
          contract,
          method: "paused",
          params: []
        });
        console.log("🔍 Contract paused status:", isPaused);
        
        if (isPaused) {
          throw new Error("Contract is currently paused");
        }

        console.log("🔍 Reading MINTING_FEE from contract...");
        mintingFee = await readContract({
          contract,
          method: "MINTING_FEE",
          params: []
        });
        
        console.log("💰 Contract minting fee:", mintingFee.toString(), "wei");
        console.log("💰 Minting fee in ETH:", Number(mintingFee) / 1e18);
        
      } catch (stateError: any) {
        console.error("❌ Contract state check failed:", stateError);
        console.error("❌ Error details:", stateError.message);
        console.error("❌ Error stack:", stateError.stack);
        mintingFee = BigInt("1000000000000000"); // 0.001 ETH as fallback
        console.warn("⚠️ Using fallback minting fee:", mintingFee.toString());
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
      let actualAuthor = providedAuthor || "Unknown Author";
      let castData: CastData | undefined = undefined;
      
      // Check if it's Farcaster-related input and fetch data
      console.log("🔍 Checking if input is Farcaster-related...");
      console.log("🔍 Source URL/Input:", metadata.sourceUrl);
      console.log("🔍 Provided Author:", providedAuthor);
      
      if (metadata.sourceUrl && isFarcasterInput(metadata.sourceUrl)) {
        console.log("🎯 Detected Farcaster input, fetching cast data...");
        try {
          castData = await fetchCastDataFromPinata(metadata.sourceUrl);
          
          if (isCastDataSuccess(castData)) {
            actualTitle = castData.title;
            // Only override author if none was provided
            if (!providedAuthor) {
              actualAuthor = castData.author;
              console.log("✅ Using fetched author (no manual author provided):", actualAuthor);
            } else {
              console.log("✅ Keeping manually provided author:", actualAuthor);
            }
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
        console.log("❌ Input not recognized as Farcaster-related, using provided data");
      }

      // Upload metadata to Pinata with the processed data
      console.log("📝 Uploading metadata to Pinata...");
      console.log("📝 Final metadata before upload:", {
        title: actualTitle,
        author: actualAuthor,
        sourceUrl: metadata.sourceUrl,
        description: metadata.description,
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

      console.log("📤 Sending transaction to blockchain...");
      
      let result: { transactionHash: string };
      
      if (useThirdweb) {
        // Thirdweb flow for regular web app
        console.log("💳 Using Thirdweb for transaction");
        
        const transaction = prepareContractCall({
          contract,
          method: "mintEvermarkWithReferral",
          params: [
            metadataURI,
            actualTitle,
            actualAuthor,
            DEVELOPER_REFERRER
          ],
          value: mintingFee,
        });

        const thirdwebResult = await sendTransaction({
          transaction,
          account: thirdwebAccount,
        });
        
        result = { transactionHash: thirdwebResult.transactionHash };
        
      } else if (useWagmi) {
        // Wagmi flow for Farcaster Frame
        console.log("📱 Using Wagmi for Farcaster transaction");
        
        // Prepare contract call data
        const transaction = prepareContractCall({
          contract,
          method: "mintEvermarkWithReferral",
          params: [
            metadataURI,
            actualTitle,
            actualAuthor,
            DEVELOPER_REFERRER
          ],
          value: mintingFee,
        });

        try {
          // Resolve the data field if it's a function
          let transactionData: `0x${string}`;
          
          if (!transaction.data) {
            throw new Error("Transaction data is missing");
          }
          
          if (typeof transaction.data === 'function') {
            const resolvedData = await transaction.data();
            if (!resolvedData) {
              throw new Error("Failed to resolve transaction data");
            }
            transactionData = resolvedData as `0x${string}`;
          } else {
            transactionData = transaction.data as `0x${string}`;
          }

          console.log("🔧 Wagmi transaction params:", {
            to: transaction.to,
            data: transactionData,
            value: mintingFee.toString(),
            gas: transaction.gas?.toString()
          });

          const wagmiTxHash = await sendWagmiTransaction({
            to: transaction.to as `0x${string}`,
            data: transactionData,
            value: mintingFee,
            gas: transaction.gas ? BigInt(transaction.gas.toString()) : undefined,
          });
          
          result = { transactionHash: wagmiTxHash };
          console.log("✅ Wagmi transaction successful:", wagmiTxHash);
          
        } catch (wagmiTxError: any) {
          console.error("Wagmi transaction failed:", wagmiTxError);
          throw new Error(`Farcaster transaction failed: ${wagmiTxError.message}`);
        }
      } else {
        // This should never happen due to our earlier checks, but just in case
        throw new Error("No transaction method available. Please connect a wallet.");
      }

      console.log("✅ Transaction successful:", result.transactionHash);
      
      const successMessage = castData && isCastDataSuccess(castData)
        ? `Farcaster cast by @${castData.username} preserved successfully!`
        : `Evermark "${actualTitle}" by ${actualAuthor} created successfully!`;
      
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
    setNeedsWalletConnection(false);
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
    isCreating: isCreating || isWagmiPending, // Include Wagmi pending state
    error: error || wagmiError?.message || null, // Include Wagmi errors
    success, 
    needsWalletConnection,
    clearMessages,
    validateFarcasterInput,
    // Expose the processing state for additional UI control
    isProcessing: isProcessingRef.current,
    // Expose wallet connection info
    walletInfo: {
      isInFarcaster,
      thirdwebConnected: !!thirdwebAccount?.address,
      wagmiConnected: isWagmiConnected,
      activeAddress: thirdwebAccount?.address || wagmiAddress,
      connector: wagmiConnector?.name
    }
  };
};
