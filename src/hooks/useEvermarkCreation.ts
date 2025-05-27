import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { upload } from "thirdweb/storage";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS } from "../lib/contracts";
import { EVERMARK_NFT_ABI } from "../lib/abis/";

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

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const createEvermark = async (metadata: EvermarkMetadata): Promise<{ 
    success: boolean; 
    message?: string; 
    error?: string; 
    txHash?: string; 
    evermarkId?: string;
  }> => {
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      if (!account) {
        throw new Error("Please connect your wallet.");
      }

      // Upload image to IPFS if it exists
      let imageUrl: string = "";
      if (metadata.imageFile) {
        try {
          const uploadResult = await upload({
            client,
            files: [metadata.imageFile],
          });
          imageUrl = uploadResult;
        } catch (uploadError: any) {
          console.error("Failed to upload image to IPFS:", uploadError);
          setError(`Image upload failed: ${uploadError.message || "Unknown error"}`);
          setIsCreating(false);
          return { success: false, error: `Image upload failed: ${uploadError.message || "Unknown error"}` };
        }
      }

      // Get contract instance
      const contract = getContract({
        client,
        chain: CHAIN,
        address: CONTRACTS.EVERMARK_NFT,
        abi: EVERMARK_NFT_ABI,
      });

      // Prepare the transaction
      const transaction = prepareContractCall({
        contract,
        method: "mintEvermark",
        params: [
          JSON.stringify({
            title: metadata.title,
            description: metadata.description,
            sourceUrl: metadata.sourceUrl,
            author: metadata.author,
            image: imageUrl,
          }),
          metadata.title,
          metadata.author,
        ],
      });

      // Send the transaction
      const result = await sendTransaction({
        transaction,
        account,
      });

      setIsCreating(false);
      setSuccess("Evermark created successfully!");

      return { 
        success: true, 
        message: "Evermark created successfully!", 
        txHash: result.transactionHash,
        evermarkId: result.transactionHash // You might want to parse this from logs
      };

    } catch (contractError: any) {
      console.error("Failed to create Evermark:", contractError);
      setError(`Contract interaction failed: ${contractError.message || "Unknown error"}`);
      setIsCreating(false);
      return { success: false, error: `Contract interaction failed: ${contractError.message || "Unknown error"}` };
    }
  };

  return { createEvermark, isCreating, error, success, clearMessages };
};
