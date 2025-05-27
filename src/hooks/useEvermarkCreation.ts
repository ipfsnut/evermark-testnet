import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { upload } from "thirdweb/storage";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";
import { getContract } from "thirdweb";

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

  const createEvermark = async (
    metadata: EvermarkMetadata
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    txHash?: string;
  }> => {
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      if (!account) {
        throw new Error("Please connect your wallet.");
      }

      // Upload image to IPFS if it exists
      let metadataURI: string = "";
      if (metadata.imageFile) {
        try {
          // Create metadata object for IPFS
          const metadataObject = {
            name: metadata.title,
            description: metadata.description,
            external_url: metadata.sourceUrl,
            creator: metadata.author,
          };

          // Upload image first
          const imageUploadResult = await upload({
            client,
            files: [metadata.imageFile],
          });

          // Add image to metadata
          const metadataWithImage = {
            ...metadataObject,
            image: imageUploadResult,
          };

          // Upload complete metadata
          const metadataUploadResult = await upload({
            client,
            files: [new File([JSON.stringify(metadataWithImage)], "metadata.json", { type: "application/json" })],
          });

          metadataURI = metadataUploadResult;
        } catch (uploadError: any) {
          console.error("Failed to upload to IPFS:", uploadError);
          setError(`Upload failed: ${uploadError.message || "Unknown error"}`);
          setIsCreating(false);
          return {
            success: false,
            error: `Upload failed: ${uploadError.message || "Unknown error"}`,
          };
        }
      } else {
        // Create metadata without image
        const metadataObject = {
          name: metadata.title,
          description: metadata.description,
          external_url: metadata.sourceUrl,
          creator: metadata.author,
        };

        try {
          const metadataUploadResult = await upload({
            client,
            files: [new File([JSON.stringify(metadataObject)], "metadata.json", { type: "application/json" })],
          });
          metadataURI = metadataUploadResult;
        } catch (uploadError: any) {
          console.error("Failed to upload metadata to IPFS:", uploadError);
          setError(`Metadata upload failed: ${uploadError.message || "Unknown error"}`);
          setIsCreating(false);
          return {
            success: false,
            error: `Metadata upload failed: ${uploadError.message || "Unknown error"}`,
          };
        }
      }

      // Get contract instance using our centralized source of truth
      const contract = getContract({
        client,
        chain: CHAIN,
        address: CONTRACTS.EVERMARK_NFT,
        abi: EVERMARK_NFT_ABI,
      });

      // Prepare the contract call using the correct method name from ABI
      const transaction = prepareContractCall({
        contract,
        method: "mintEvermark",
        params: [
          metadataURI,
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
      };
    } catch (contractError: any) {
      console.error("Failed to create Evermark:", contractError);
      setError(`Contract interaction failed: ${contractError.message || "Unknown error"}`);
      setIsCreating(false);
      return {
        success: false,
        error: `Contract interaction failed: ${contractError.message || "Unknown error"}`,
      };
    }
  };

  return { createEvermark, isCreating, error, success, clearMessages };
};
