import { useState } from "react";
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

export const useEvermarkCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const account = useActiveAccount();

  const createEvermark = async (metadata: EvermarkMetadata) => {
    if (!account) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      // Upload image to IPFS if it exists
      let metadataURI = "";
      if (metadata.imageFile) {
        try {
          // Upload to IPFS - you'll need to implement this
          // metadataURI = await uploadToIPFS(metadata.imageFile);
          console.log("Image upload not implemented yet");
        } catch (uploadError: any) {
          console.error("Failed to upload image:", uploadError);
          setError(`Image upload failed: ${uploadError.message}`);
          setIsCreating(false);
          return { success: false, error: `Image upload failed: ${uploadError.message}` };
        }
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

      // Send transaction
      const result = await sendTransaction({
        transaction,
        account,
      });

      setSuccess("Evermark created successfully!");
      setIsCreating(false);
      
      return { 
        success: true, 
        message: "Evermark created successfully!", 
        txHash: result.transactionHash 
      };

    } catch (error: any) {
      console.error("Failed to create Evermark:", error);
      setError(`Failed to create Evermark: ${error.message || "Unknown error"}`);
      setIsCreating(false);
      return { success: false, error: error.message || "Unknown error" };
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return { createEvermark, isCreating, error, success, clearMessages };
};
