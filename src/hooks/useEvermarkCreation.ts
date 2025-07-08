// src/hooks/useEvermarkCreation.ts - ✅ FIXED with proper imports
import { useState, useRef, useCallback } from "react";
import { useReadContract } from "thirdweb/react"; 
import { getContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";
import { useTransactionUtils } from './core/useTransactionUtils';
import { useMetadataUtils } from './core/useMetadataUtils';
import { useWalletAuth } from "../providers/WalletProvider";

// ✅ Re-export types from core for convenience
export type { EvermarkMetadata, CastData } from './core/useMetadataUtils';

interface CreateEvermarkResult {
  success: boolean;
  message?: string;
  error?: string;
  txHash?: string;
  metadataURI?: string;
  imageUrl?: string;
  castData?: any;
}

const DEVELOPER_REFERRER = "0x2B27EA7DaA8Bf1dE98407447b269Dfe280753fe3";

/**
 * ✅ SIMPLIFIED: Evermark creation using core infrastructure
 * Eliminates 400+ lines of duplicate transaction, metadata, and state management
 */
export function useEvermarkCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ Use core infrastructure instead of duplicating
  const { executeTransaction, error, success, clearMessages } = useTransactionUtils();
  const { 
    uploadToPinata, 
    buildComprehensiveMetadata, 
    validateMetadata,
    isFarcasterInput,
    fetchCastDataFromPinata,
    uploadMetadataToIPFS
  } = useMetadataUtils();
  const { address, requireConnection } = useWalletAuth();

  // ✅ Create contract for fee query
  const evermarkContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EVERMARK_NFT,
    abi: EVERMARK_NFT_ABI,
  });

  // ✅ Get minting fee using existing core pattern
  const { data: mintingFee, isLoading: isLoadingFee, error: feeError } = useReadContract({
    contract: evermarkContract,
    method: "function MINTING_FEE() view returns (uint256)",
    params: [],
    queryOptions: {
      enabled: !!CONTRACTS.EVERMARK_NFT,
      retry: 1,
    },
  });

  // ✅ SIMPLIFIED: Create Evermark using core utilities
  const createEvermark = useCallback(async (metadata: any): Promise<CreateEvermarkResult> => {
    // ✅ Better fee validation using core patterns
    if (isLoadingFee) {
      throw new Error("Loading minting fee from contract...");
    }

    if (feeError) {
      throw new Error(`Failed to load minting fee: ${feeError.message}`);
    }

    if (!mintingFee) {
      throw new Error("Minting fee not available");
    }

    // ✅ Connection check using core
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
      throw new Error("Please connect your wallet to create an Evermark");
    }

    // ✅ Use core validation
    const validation = validateMetadata(metadata);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    setIsCreating(true);
    setUploadProgress(0);
    setCurrentStep("Starting creation process...");
    abortControllerRef.current = new AbortController();

    try {
      let imageUrl = "";
      let castData: any = null;

      // Step 1: Handle image upload using core utility
      if (metadata.imageFile) {
        setCurrentStep("Uploading image to IPFS...");
        setUploadProgress(25);
        imageUrl = await uploadToPinata(metadata.imageFile);
      }

      // Step 2: Handle Farcaster cast data using core utility
      if (isFarcasterInput(metadata.sourceUrl)) {
        setCurrentStep("Fetching Farcaster cast data...");
        setUploadProgress(50);
        castData = await fetchCastDataFromPinata(metadata.sourceUrl);
      }

      // Step 3: Build comprehensive metadata using core utility
      setCurrentStep("Building metadata...");
      setUploadProgress(70);
      const comprehensiveMetadata = await buildComprehensiveMetadata(
        metadata,
        imageUrl,
        castData,
        address
      );

      // Step 4: Upload metadata using core utility
      setCurrentStep("Uploading metadata to IPFS...");
      setUploadProgress(85);
      const metadataURI = await uploadMetadataToIPFS(comprehensiveMetadata);

      // Step 5: Execute mint transaction using core utility
      setCurrentStep("Creating Evermark NFT...");
      setUploadProgress(90);

      const result = await executeTransaction(
        CONTRACTS.EVERMARK_NFT,
        EVERMARK_NFT_ABI,
        "mintEvermarkWithReferral",
        [metadataURI, metadata.title, metadata.author, DEVELOPER_REFERRER],
        {
          value: mintingFee,
          successMessage: `Evermark created successfully! Fee: ${mintingFee.toString()} wei`,
          errorContext: {
            operation: 'mintEvermarkWithReferral',
            contract: 'EVERMARK_NFT',
            methodName: 'mintEvermarkWithReferral',
            userAddress: address
          }
        }
      );

      setUploadProgress(100);
      setCurrentStep("Evermark created successfully!");

      return {
        success: result.success,
        message: result.message,
        error: result.error,
        txHash: result.transactionHash,
        metadataURI,
        imageUrl,
        castData,
      };

    } catch (err: any) {
      const errorMessage = err.message || "Failed to create Evermark";
      setCurrentStep("Creation failed");
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsCreating(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  }, [
    address, 
    executeTransaction, 
    requireConnection, 
    mintingFee, 
    isLoadingFee,
    feeError,
    uploadToPinata,
    buildComprehensiveMetadata,
    validateMetadata,
    isFarcasterInput,
    fetchCastDataFromPinata,
    uploadMetadataToIPFS
  ]);

  const cancelCreation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsCreating(false);
      setCurrentStep("Creation cancelled");
    }
  }, []);

  const validateFarcasterInput = useCallback((input: string) => {
    return {
      isValid: isFarcasterInput(input),
    };
  }, [isFarcasterInput]);

  return {
    // State
    isCreating,
    uploadProgress,
    currentStep,
    
    // ✅ Use core error/success state
    error,
    success,
    
    // Fee info
    mintingFee,
    isLoadingFee,
    feeError,
    
    // Actions
    createEvermark,
    cancelCreation,
    clearMessages,
    
    // ✅ Use core validation utilities
    validateMetadata,
    validateFarcasterInput,
    isFarcasterInput,
    
    // Auth info
    isConnected: !!address,
    userAddress: address,
  };
}