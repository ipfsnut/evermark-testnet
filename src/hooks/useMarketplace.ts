import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { 
  useActiveAccount, 
  useActiveWalletChain, 
  useReadContract, 
  useSendTransaction
} from "thirdweb/react";
import { 
  getContract, 
  createThirdwebClient, 
  NATIVE_TOKEN_ADDRESS
} from "thirdweb";
import { 
  getAllListings,
  createListing as createMarketplaceListing,
  buyFromListing,
  makeOffer as makeMarketplaceOffer,
  cancelListing as cancelMarketplaceListing 
} from "thirdweb/extensions/marketplace";

// Type definitions for marketplace operations
export type Listing = {
  id: string;
  seller: string;
  tokenId: string;
  assetContractAddress: string;
  currencyContractAddress: string;
  buyoutPrice: string; // In wei as string for precision
  buyoutCurrencyValuePerToken: {
    value: string;
    displayValue: string;
  };
  quantity: string;
  startTimeInSeconds: number;
  endTimeInSeconds: number;
  asset: {
    id: string;
    name: string;
    description: string;
    image: string;
  };
};

export type ListingParams = {
  assetContractAddress: string;
  tokenId: string;
  price: string; // In ETH (e.g., "0.1")
  currencyAddress?: string;
  quantity?: number;
  startTime?: Date;
  secondsUntilEnd?: number;
};

export type OfferParams = {
  listingId: string;
  price: string; // In ETH (e.g., "0.1")
  quantity?: number;
  currencyAddress?: string;
  // Required in v5 for making offers:
  assetContractAddress: string;
  tokenId: string;
};

// You'll need to provide your client configuration
const client = createThirdwebClient({ 
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "your-client-id" 
});

// Custom hook for marketplace operations
export const useMarketplace = (marketplaceContractAddress: string) => {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [listings, setListings] = useState<Listing[]>([]);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the marketplace contract
  const contract = getContract({
    client,
    chain: activeChain!,
    address: marketplaceContractAddress,
  });

  // Send transaction hook for write operations
  const { mutateAsync: sendTransaction } = useSendTransaction();

  // Fetch all active listings using useReadContract
  const { 
    data: allListingsData, 
    isLoading: isLoadingListings, 
    error: listingsError,
    refetch: refetchListings 
  } = useReadContract(getAllListings, {
    contract,
    count: 100n, // bigint as expected by the type definition
    start: 0, // number as expected by the type definition
  });

  // Format raw listing data
  const formatListing = useCallback((listing: any): Listing => ({
    id: listing.id?.toString() || "",
    seller: listing.creator || "",
    tokenId: listing.asset?.id?.toString() || "",
    assetContractAddress: listing.assetContract || "",
    currencyContractAddress: listing.currency || "",
    buyoutPrice: listing.pricePerToken?.toString() || "0",
    buyoutCurrencyValuePerToken: {
      value: listing.pricePerToken?.toString() || "0",
      displayValue: listing.pricePerToken?.toString() || "0" // You might want to format this
    },
    quantity: listing.quantity?.toString() || "1",
    startTimeInSeconds: listing.startTimestamp || 0,
    endTimeInSeconds: listing.endTimestamp || 0,
    asset: {
      id: listing.asset?.id?.toString() || "",
      name: listing.asset?.name || "",
      description: listing.asset?.description || "",
      image: listing.asset?.image || ""
    }
  }), []);

  // Process listings data
  useEffect(() => {
    if (allListingsData) {
      const formattedListings = allListingsData.map(formatListing);
      setListings(formattedListings);
      
      // Filter user listings
      if (account?.address) {
        const userOwnedListings = formattedListings.filter(
          (listing) => listing.seller.toLowerCase() === account.address.toLowerCase()
        );
        setUserListings(userOwnedListings);
      }
    }
  }, [allListingsData, account?.address, formatListing]);

  // Handle loading and error states
  useEffect(() => {
    setIsLoading(isLoadingListings);
    setError(listingsError ? "Failed to load marketplace data" : null);
  }, [isLoadingListings, listingsError]);

  // Create a new listing
  const createListing = async (params: ListingParams) => {
    if (!account?.address) {
      throw new Error("Wallet not connected");
    }

    try {
      const transaction = createMarketplaceListing({
        contract,
        assetContractAddress: params.assetContractAddress,
        tokenId: BigInt(params.tokenId),
        quantity: BigInt(params.quantity || 1),
        currencyContractAddress: params.currencyAddress || NATIVE_TOKEN_ADDRESS,
        pricePerToken: params.price, // String in Ether (e.g., "0.1")
        startTimestamp: params.startTime || new Date(),
        endTimestamp: new Date(Date.now() + (params.secondsUntilEnd || 60 * 60 * 24 * 7) * 1000), // 1 week default
      });

      const result = await sendTransaction(transaction);
      await refetchListings();
      return { success: true, result };
    } catch (err) {
      console.error("Listing creation failed:", err);
      throw new Error("Failed to create listing");
    }
  };

  // Buy an item
  const buyItem = async (listingId: string, quantity: number = 1) => {
    if (!account?.address) {
      throw new Error("Wallet not connected");
    }

    try {
      const transaction = buyFromListing({
        contract,
        listingId: BigInt(listingId),
        quantity: BigInt(quantity),
        recipient: account.address,
      });

      const result = await sendTransaction(transaction);
      await refetchListings();
      return { success: true, result };
    } catch (err) {
      console.error("Purchase failed:", err);
      throw new Error("Failed to complete purchase");
    }
  };

  // Make an offer on a listing
  const makeOffer = async (params: OfferParams) => {
    if (!account?.address) {
      throw new Error("Wallet not connected");
    }

    try {
      const transaction = makeMarketplaceOffer({
        contract,
        assetContractAddress: params.assetContractAddress,
        tokenId: BigInt(params.tokenId),
        quantity: BigInt(params.quantity || 1),
        currencyContractAddress: params.currencyAddress || NATIVE_TOKEN_ADDRESS,
        totalOffer: params.price, // String in Ether (e.g., "0.1")
        offerExpiresAt: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000), // 1 week
      });

      const result = await sendTransaction(transaction);
      return { success: true, result };
    } catch (err) {
      console.error("Offer failed:", err);
      throw new Error("Failed to make offer");
    }
  };

  // Cancel a listing
  const cancelListing = async (listingId: string) => {
    if (!account?.address) {
      throw new Error("Wallet not connected");
    }

    try {
      const transaction = cancelMarketplaceListing({
        contract,
        listingId: BigInt(listingId),
      });

      const result = await sendTransaction(transaction);
      await refetchListings();
      return { success: true, result };
    } catch (err) {
      console.error("Cancel listing failed:", err);
      throw new Error("Failed to cancel listing");
    }
  };

  return {
    listings,
    userListings,
    isLoading,
    error,
    createListing,
    buyItem,
    makeOffer,
    cancelListing,
    refetchListings,
    isSupported: !!contract,
    address: account?.address,
    chainId: activeChain?.id
  };
};

export function MarketplaceButton({ 
  contractAddress, 
  transaction, 
  className, 
  style,
  children, 
  onSuccess 
}: {
  contractAddress: string;
  transaction: () => any;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onSuccess?: () => void;
}) {
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();
  
  const handleClick = async () => {
    try {
      const tx = transaction();
      const result = await sendTransaction(tx);
      console.log("Transaction sent:", result.transactionHash);
      onSuccess?.();
    } catch (error) {
      console.error("Marketplace action failed:", error);
    }
  };

  return React.createElement(
    "button",
    {
      onClick: handleClick,
      disabled: isPending,
      className: className,
    },
    isPending ? "Processing..." : children
  );
}