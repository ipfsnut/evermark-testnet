// src/hooks/useAuctions.ts - FIXED VERSION FOR NEW ARCHITECTURE
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, AUCTION_ABI } from "../lib/contracts";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toEther, toWei } from "thirdweb/utils";

// FIXED: Auction details interface matching the contract struct
export interface AuctionDetails {
  auctionId: string;
  tokenId: bigint;
  nftContract: string;
  seller: string;
  startingPrice: bigint;
  reservePrice: bigint;
  currentBid: bigint;
  highestBidder: string;
  startTime: bigint;
  endTime: bigint;
  finalized: boolean;
}

export function useAuctions() {
  const [auctions, setAuctions] = useState<AuctionDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Memoize the contract instance
  const auctionContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.AUCTION,
    abi: AUCTION_ABI,
  }), []);
  
  // FIXED: Get active auctions using correct method name
  const { 
    data: activeAuctionIds, 
    isLoading: isLoadingIds, 
    error: fetchError,
    refetch: refetchAuctions 
  } = useReadContract({
    contract: auctionContract,
    method: "getActiveAuctions", // VERIFIED: This method exists in AUCTION_ABI
    params: [],
  });
  
  // FIXED: Fetch details for each auction with better error handling
  useEffect(() => {
    let isMounted = true;

    const fetchAuctionDetails = async () => {
      if (isLoadingIds || !isMounted) {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Handle fetch errors
        if (fetchError) {
          throw new Error(`Failed to fetch auction IDs: ${fetchError.message}`);
        }
        
        // If no auctions are found from the contract
        if (!activeAuctionIds || activeAuctionIds.length === 0) {
          console.log("No active auctions found from contract");
          if (isMounted) {
            setAuctions([]);
            setIsLoading(false);
          }
          return;
        }
        
        const fetchedAuctions: AuctionDetails[] = [];
        
        // Process real auction data with better error handling
        for (const auctionId of activeAuctionIds) {
          if (!isMounted) break;
          
          try {
            // FIXED: Use correct method name and handle response structure
            const details = await readContract({
              contract: auctionContract,
              method: "getAuctionDetails", // VERIFIED: This method exists in AUCTION_ABI
              params: [auctionId],
            });
            
            // FIXED: Properly structure the auction data from contract response
            fetchedAuctions.push({
              auctionId: auctionId.toString(),
              tokenId: details.tokenId,
              nftContract: details.nftContract,
              seller: details.seller,
              startingPrice: details.startingPrice,
              reservePrice: details.reservePrice,
              currentBid: details.currentBid,
              highestBidder: details.highestBidder,
              startTime: details.startTime,
              endTime: details.endTime,
              finalized: details.finalized,
            });
          } catch (err: any) {
            console.error(`Error fetching auction ${auctionId}:`, err);
            // Continue with other auctions instead of failing completely
          }
        }
        
        if (isMounted) {
          setAuctions(fetchedAuctions);
        }
      } catch (err: any) {
        console.error("Error fetching auctions:", err);
        if (isMounted) {
          setError(err.message || "Failed to fetch auctions");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchAuctionDetails();

    return () => {
      isMounted = false;
    };
  }, [activeAuctionIds, isLoadingIds, auctionContract, fetchError]);
  
  return {
    auctions,
    isLoading,
    error,
    refetch: refetchAuctions,
  };
}

export function useAuctionDetails(auctionId: string) {
  const [auction, setAuction] = useState<AuctionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  
  // Memoize the contract instance
  const auctionContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.AUCTION,
    abi: AUCTION_ABI,
  }), []);
  
  // FIXED: Get auction details with proper validation
  const { 
    data: auctionData, 
    isLoading: isLoadingAuction, 
    error: fetchError,
    refetch: refetchAuction 
  } = useReadContract({
    contract: auctionContract,
    method: "getAuctionDetails", // VERIFIED: This method exists in AUCTION_ABI
    params: [BigInt(auctionId || "0")] as const,
    queryOptions: {
      enabled: !!auctionId && auctionId !== "0", // Only run when we have a valid auction ID
    },
  });
  
  // FIXED: Update auction data with proper error handling
  useEffect(() => {
    if (!isLoadingAuction) {
      if (fetchError) {
        setError(`Failed to fetch auction: ${fetchError.message}`);
        setAuction(null);
        setIsLoading(false);
      } else if (auctionData) {
        setAuction({
          auctionId,
          tokenId: auctionData.tokenId,
          nftContract: auctionData.nftContract,
          seller: auctionData.seller,
          startingPrice: auctionData.startingPrice,
          reservePrice: auctionData.reservePrice,
          currentBid: auctionData.currentBid,
          highestBidder: auctionData.highestBidder,
          startTime: auctionData.startTime,
          endTime: auctionData.endTime,
          finalized: auctionData.finalized,
        });
        setIsLoading(false);
        setError(null);
      } else {
        setError("Auction not found");
        setAuction(null);
        setIsLoading(false);
      }
    }
  }, [auctionData, isLoadingAuction, auctionId, fetchError]);
  
  // FIXED: Calculate time remaining with memoized update function
  const updateTimeRemaining = useCallback(() => {
    if (!auction) return;
    
    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(auction.endTime);
    const remaining = endTime - now;
    
    if (remaining <= 0) {
      setTimeRemaining("Auction ended");
      return;
    }
    
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h remaining`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m remaining`);
    } else {
      setTimeRemaining(`${minutes}m remaining`);
    }
  }, [auction]);

  useEffect(() => {
    if (!auction) return;
    
    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [auction, updateTimeRemaining]);
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // FIXED: Function to place bid with proper validation and error handling
  const placeBid = useCallback(async (bidAmount: string) => {
    if (!auction) {
      return { success: false, error: "Auction not found" };
    }
    
    try {
      const bidAmountWei = toWei(bidAmount);
      const minBid = auction.currentBid > BigInt(0) 
        ? auction.currentBid + toWei("0.01") // Minimum increment
        : auction.startingPrice;
      
      if (bidAmountWei < minBid) {
        return { success: false, error: `Bid must be at least ${toEther(minBid)} ETH` };
      }
      
      // Check if auction has ended
      const now = Math.floor(Date.now() / 1000);
      if (Number(auction.endTime) <= now) {
        return { success: false, error: "Auction has ended" };
      }
      
      // FIXED: Use correct method name and parameters
      const transaction = prepareContractCall({
        contract: auctionContract,
        method: "placeBid", // VERIFIED: This method exists in AUCTION_ABI
        params: [BigInt(auctionId)] as const,
        value: bidAmountWei, // ETH sent with transaction
      });
      
      await sendTransaction(transaction as any);
      
      // Refetch auction data after successful bid
      setTimeout(() => {
        refetchAuction();
      }, 2000);
      
      return { success: true, message: `Successfully placed bid of ${bidAmount} ETH!` };
    } catch (err: any) {
      console.error("Error placing bid:", err);
      return { success: false, error: err.message || "Failed to place bid" };
    }
  }, [auction, auctionContract, auctionId, sendTransaction, refetchAuction]);
  
  return {
    auction,
    isLoading,
    error,
    timeRemaining,
    placeBid,
    refetch: refetchAuction,
    isAuctionEnded: auction ? Math.floor(Date.now() / 1000) >= Number(auction.endTime) : false,
    hasActiveBid: auction ? auction.currentBid > BigInt(0) : false,
  };
}

// ENHANCED: Hook for creating auctions
export function useAuctionCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const auctionContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.AUCTION,
    abi: AUCTION_ABI,
  }), []);
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  const createAuction = useCallback(async (params: {
    nftContract: string;
    tokenId: string;
    startingPrice: string;
    reservePrice: string;
    duration: number; // in seconds
  }) => {
    setIsCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // FIXED: Use correct method name and parameter order
      const transaction = prepareContractCall({
        contract: auctionContract,
        method: "createAuction", // VERIFIED: This method exists in AUCTION_ABI
        params: [
          params.nftContract,
          BigInt(params.tokenId),
          toWei(params.startingPrice),
          toWei(params.reservePrice),
          BigInt(params.duration)
        ] as const,
      });
      
      await sendTransaction(transaction as any);
      
      const successMsg = "Auction created successfully!";
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error creating auction:", err);
      const errorMsg = err.message || "Failed to create auction";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsCreating(false);
    }
  }, [auctionContract, sendTransaction]);
  
  return {
    createAuction,
    isCreating,
    error,
    success,
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    }
  };
}